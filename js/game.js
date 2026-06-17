'use strict';
// ============ GAME STATE ============
let shake = 0, hitFlash = 0, hitstop = 0, tPrev = 0, elapsed = 0;
let deathShakeOn = localStorage.getItem('br_deathshake')!=='0';   // screen shake on enemy kill (off = boss telegraphs/hits still shake)

const P = {}; // player
let bullets=[], ebullets=[], petBullets=[], enemies=[], gems=[], parts=[], texts=[], zones=[], holes=[], luckies=[];
let skibidiBullets=[], skibidiTimers=[];   // Skibidi Toilet card: edge-bouncing persistent bullets, own lifecycle
let turrets=[];   // Walking Turret card: chain-follows behind the pet, each {x,y,cd,face}
let timeScale=1.0;
let _vis=[];   // reused per-frame scratch list of visible enemies (depth sort) — avoids GC churn
let wave=1, kills=0, spawnTimer=0, waveEnemiesLeft=0, betweenWaves=false, boss=null;
let worldCoins=0;   // coins collected during the CURRENT world run (in-game HUD display; total still banked in `gold`)
let _lastSec=-1;    // throttles the survival-timer DOM update to once per second
const MMH = window.MINIMAP_HELPERS;
// ===== CHALLENGER MODE STATE =====
let gameMode = 'story';     // 'story' | 'challenger' | 'practice'
let chalElapsed = 0;        // challenger timer — pauses during boss fights
let chalBossIdx = 0;        // index of next boss milestone (0-3 → 5/10/15/20 min)
let chalBossActive = false; // true while a challenger boss is alive
let chalLuckyT = 0;         // countdown to next lucky block batch in challenger
const CHAL_BOSS_TIMES = [300, 600, 900, 1200];  // seconds: 5/10/15/20 min

// ===== PRACTICE MODE STATE =====
// Sandbox gamemode: no rewards, single customizable "world", reuses the challenger
// engine (continuous spawn / elapsed-time boss milestones / infinite map) when toggled on.
let practiceCfg = { infiniteWaves:true, timerBased:false, infiniteMap:false, bossIntervalSec:300, foes:null, bosses:null, _foeSet:null, _bossSet:null };
function timerMode(){ return gameMode==='challenger' || (gameMode==='practice' && practiceCfg.timerBased); }
function infiniteMapMode(){ return gameMode==='challenger' || (gameMode==='practice' && practiceCfg.infiniteMap); }
function nextBossTimeSec(){ return gameMode==='practice' ? practiceCfg.bossIntervalSec*(chalBossIdx+1) : (CHAL_BOSS_TIMES[chalBossIdx]||300); }
function hasMoreMilestones(){ return gameMode==='practice' ? true : chalBossIdx<CHAL_BOSS_TIMES.length; }
// Challenger needs story world 3 cleared; its own progression is independent after that
const _storyP = +(localStorage.getItem('br_unlocked')||0);
let chalUnlocked = _storyP >= 3
  ? Math.max(0, Math.min(10, +(localStorage.getItem('br_ch_unlocked')||0)))
  : -1;   // -1 = fully locked (need story world 3 first)
function setCoinHUD(){ const c=$('coincount'); if(c){ const s=c.querySelector('span'); if(s) s.textContent=worldCoins; } }
function setKillHUD(){ const k=$('killtag'); if(k && k.lastElementChild) k.lastElementChild.textContent=kills; }
function fmtTime(s){ s=Math.max(0,Math.floor(s)); const m=Math.floor(s/60), q=s%60; return (m<10?'0':'')+m+':'+(q<10?'0':'')+q; }
// re-sync the whole in-game HUD to current state (called on start so nothing shows a stale value)
function refreshHUD(){
  const lb=$('lvbadge'); if(lb) lb.textContent=P.lv;
  const tt=$('timetag'); if(tt) tt.textContent=fmtTime(elapsed);
  _lastSec=-1; setKillHUD(); setCoinHUD();
}
let waveGapT=0;   // countdown between a cleared wave and the next
// One-time coin reset (2026-06-12): wipe every existing player's gold exactly once.
if(!localStorage.getItem('br_reset_20260612')){ localStorage.setItem('br_gold','0'); localStorage.setItem('br_reset_20260612','1'); }
// Lightweight hash used for save integrity checks
function _saveHash(v){ let h=0x811c9dc5; const s=String(v)+'brrumble'; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=(h*0x1000193)>>>0; } return h.toString(36); }
// Load gold with signature check; accept legacy saves (no sig yet) so existing players keep progress
(function(){
  const raw=+(localStorage.getItem('br_gold')||0), sig=localStorage.getItem('br_gold_sig');
  const valid = sig===null ? true : sig===_saveHash(Math.floor(raw));   // first run = no sig = trusted
  const safeGold = valid ? Math.max(0, Math.floor(raw)) : 0;
  if(sig===null) localStorage.setItem('br_gold_sig', _saveHash(safeGold));  // stamp new install
  // evaluated via let initialiser below; store result on window so the IIFE can pass it out
  window.__initGold = safeGold;
})();
let gold = window.__initGold||0;   // persistent currency (saved)
function saveGold(){ localStorage.setItem('br_gold', gold); localStorage.setItem('br_gold_sig', _saveHash(gold)); }
// boss arena: the field locks to a small bounded square a few seconds before the boss arrives
let arena=null, bossPending=0;
const ARENA_SIZE=1000, ARENA_LEAD=4, ARENA_ZOOM=1.3;
const STEALTH_RADIUS=260;   // Fantasma: enemies only notice him within this range (or once shot)
const CHAL_ARENA_MUL=1.6;                          // challenger boss arenas are roomier than story mode
const FINAL_ARENA_GROW=1.5, CHAL_FINAL_ARENA_GROW=2.2;   // phase-3 arena growth factor; challenger gets an even bigger blowout
const FINAL_CHARGE=2.6;   // seconds a final boss spends invincible & still before its phase-3 onslaught
const BOSS_WIND=0.9;      // boss attack wind-up: how long the telegraph shows before the move fires
// XP orb tiers (index = tier). Enemies drop one orb; tier scales with their xp value.
// Tier 4 is the gold "lucky" gem — only dropped by lucky blocks, never rolled by orbTier().
const ORB = [null, {spr:'orbS',v:1,sz:28}, {spr:'orbM',v:4,sz:34}, {spr:'orbL',v:10,sz:44}, {spr:'orbGold',v:6,sz:40}];
function orbTier(xp){ return xp<=1 ? 1 : xp<=3 ? 2 : 3; }
// ---- lucky blocks: stationary, shootable ? blocks that spawn around the map and drop a reward ----
const LUCKY_CAP = 2;                 // most live at once (overworld spawns 2 at the start of each wave)
let luckyTimer = 0;                  // countdown to the next spawn batch
let bossLuckyT = 0;                  // countdown to the next boss-fight lucky batch
// boss fights normally clear lucky blocks; this drops fresh ones inside the arena for sustain
function spawnBossLucky(n, heal){   // heal = fixed HP each block drops when popped (25 final, 15 emergency)
  const ax0 = arena ? arena.x+60 : WALL+80, ax1 = arena ? arena.x+arena.w-60 : WORLD.w-WALL-80;
  const ay0 = arena ? arena.y+60 : WALL+80, ay1 = arena ? arena.y+arena.h-60 : WORLD.h-WALL-80;
  const hp = 4*HP_MULT*(1+(wave-1)*0.07);   // softer than world blocks so they're breakable mid-fight
  for(let k=0;k<n;k++){
    if(luckies.length>=6) break;
    let x,y,tries=0;
    do { x=rand(ax0,ax1); y=rand(ay0,ay1); tries++; } while(dist2(x,y,P.x,P.y) < 240*240 && tries<10);
    luckies.push({ x,y, r:26, hp, maxHp:hp, t:rand(0,TAU), hitT:0, sq:0, heal:heal||25 });
  }
}
function spawnLuckyBatch(n=2){           // up to n blocks, capped at n
  for(let k=0;k<n;k++){
    if(luckies.length>=n) break;
    let x,y,tries=0;
    do { x=rand(WALL+80,WORLD.w-WALL-80); y=rand(WALL+80,WORLD.h-WALL-80); tries++; }
    while(dist2(x,y,P.x,P.y) < 360*360 && tries<8);   // not right on top of the player
    const hp = 6*HP_MULT*(1+(wave-1)*0.12);
    const lb = { x,y, r:26, hp, maxHp:hp, t:rand(0,TAU), hitT:0, sq:0 };
    if(typeof fireHook==='function') fireHook('onLuckySpawn', lb);
    if(!lb.heavy && Math.random()<0.01) lb.heavy=true;
    luckies.push(lb);
  }
}
function damageLucky(lb,dmg,fx,fy,crit){
  lb.hp -= dmg; lb.hitT=0.12; lb.sq=1; sfx.hit();
}
// burst the block open and scatter its reward: heal heart / magnet / 3 gold gems
function popLucky(lb){
  burst(lb.x,lb.y,'#ffd23a',26,260); shake=Math.max(shake,6); sfx.evolve();
  parts.push({x:lb.x,y:lb.y,vx:0,vy:0,life:0.4,max:0.4,color:'#fff0b0',r:lb.r,ring:true,gr:420});
  if(lb.heal){   // boss-fight block: drops a fixed-heal heart only (no magnet/gold/50-heart)
    const a=rand(0,TAU), s=rand(40,90); gems.push({x:lb.x,y:lb.y,heart:true,heal:lb.heal,t:0,vx:Math.cos(a)*s,vy:Math.sin(a)*s});
    floatText(lb.x,lb.y-lb.r-10,'LUCKY!','#ffd23a',18);
    return;
  }
  if(P.luckyXpOnly){  // Fortunato: XP only, scales with wave
    const w=typeof wave!=='undefined'?wave:1;
    let tier,n;
    if(w<=5){    // waves 1-5: small green orbs, 4-8
      tier=1; n=4+Math.floor(Math.random()*5);
    } else if(w<=9){  // waves 6-9: large orbs, 3-4
      tier=3; n=Math.random()<0.5?3:4;
    } else if(w<=14){ // waves 10-14: gold orbs, 1-5 weighted low
      tier=4; const _r=Math.random(); n=_r<0.40?1:_r<0.70?2:_r<0.88?3:_r<0.96?4:5;
    } else {          // waves 15+: gold orbs, 3-8
      tier=4; n=3+Math.floor(Math.random()*6);
    }
    if(lb.heavy) n=Math.min(n*2, 16);   // heavy block: double orbs for Fortunato
    for(let g=0;g<n;g++){ const a=rand(0,TAU),s=rand(100,260); gems.push({x:lb.x,y:lb.y,tier,v:ORB[tier].v,t:rand(0,6),vx:Math.cos(a)*s,vy:Math.sin(a)*s}); }
    floatText(lb.x,lb.y-lb.r-10,(lb.heavy?'HEAVY ':'')+'+ '+n+' XP!',lb.heavy?'#ff9c1a':'#ffd23a',lb.heavy?20:18);
    return;
  }
  if(lb.heavy){  // heavy block: big heal + double gold XP orbs
    const a=rand(0,TAU), s=rand(40,90);
    gems.push({x:lb.x,y:lb.y,heart:true,big:true,t:0,vx:Math.cos(a)*s,vy:Math.sin(a)*s});
    for(let g=0;g<6;g++){ const ag=rand(0,TAU), sg=rand(120,280); gems.push({x:lb.x,y:lb.y,tier:4,v:ORB[4].v,t:rand(0,6),vx:Math.cos(ag)*sg,vy:Math.sin(ag)*sg}); }
    floatText(lb.x,lb.y-lb.r-10,'HEAVY LUCKY!','#ff9c1a',22);
    return;
  }
  const roll = (Math.random()*3)|0;
  if(roll===0){            // big heart, heals 50
    const a=rand(0,TAU), s=rand(40,90); gems.push({x:lb.x,y:lb.y,heart:true,big:true,t:0,vx:Math.cos(a)*s,vy:Math.sin(a)*s});
  } else if(roll===1 && !P.hasMagnetPet){  // magnet — skip if player has magnet pet
    const a=rand(0,TAU), s=rand(40,90); gems.push({x:lb.x,y:lb.y,magnet:true,t:0,vx:Math.cos(a)*s,vy:Math.sin(a)*s});
  } else {                 // 3 medium gold gems
    for(let g=0;g<3;g++){ const a=rand(0,TAU), s=rand(120,260); gems.push({x:lb.x,y:lb.y,tier:4,v:ORB[4].v,t:rand(0,6),vx:Math.cos(a)*s,vy:Math.sin(a)*s}); }
  }
  floatText(lb.x,lb.y-lb.r-10,'LUCKY!','#ffd23a',18);
}
// spawn one xp orb of the given tier with a little scatter velocity
function dropOrb(x,y,tier,smin=90,smax=210){
  const a=rand(0,TAU), s=rand(smin,smax);
  gems.push({x,y,tier,v:ORB[tier].v,t:rand(0,6),vx:Math.cos(a)*s,vy:Math.sin(a)*s});
}

// global HP scale: enemies have 10x HP and the player does 10x damage, so the
// numbers are big enough that % upgrades (e.g. +25%) visibly change the damage.
const HP_MULT = 10;
// ---- concurrency caps (perf + readability): keep specials few but make them buffy ----
const MAX_ENEMIES  = IS_TOUCH ? 55 : 90;   // global hard cap on live actors (bosses are few, so this is ~enemies)
const MAX_SHOOTERS = 14;                    // foes with any `shoot` attack
const MAX_HAZARD   = 4;                     // "earthquake" types: ground AoE / geyser / debris
const MAX_BURST    = 4;                     // burst shooters: ring volleys or 3+ aimed shots
const SPECIAL_HP_BUFF = 1.6, SPECIAL_DMG_BUFF = 1.3;   // hazard/burst foes are rarer, so tankier & hit harder
const MAXPARTS = 280, MAXEB = 350;   // hard caps on particles / enemy bullets (bound worst-case render + GC)
function foeIsShooter(d){ return !!d.shoot; }
function foeIsHazard(d){ return !!d.aoe || (d.cast && (d.cast.kind==='geyser'||d.cast.kind==='debris')); }
function foeIsBurst(d){ return !!d.shoot && (d.shoot.type==='ring' || (d.shoot.n||1)>=3); }
function foeIsSpecial(d){ return foeIsHazard(d) || foeIsBurst(d); }
function worldBand(){ return curWorld().band||0; }       // 0-indexed difficulty band (drives macro scaling)
function worldDmgMul(){ return (curWorld().dmgMul||1) * (1 + worldBand()*0.12); }   // per-world enemy damage (band ramp)
function worldHpBand(){ return 1 + worldBand()*0.42; }   // enemy HP multiplier per world band
function worldCoinMul(){ return 1 + worldBand()*0.22; }   // later worlds pay out more (gentle ramp, ~3x by W10 — funds the gear grind)
// coins are scarce early; from wave 20 on they pay out a little more (capped at 3x)
function coinMult(){ return Math.min(3, wave < 20 ? 1 : 1 + (wave-19)*0.1); }
// ---- enemy archetypes: the Italian Brainrot bestiary (ordered easy -> hard) ----
const FOES_GRASS = [
  // Tier I — fodder
  { spr:'pigeon',   name:'Spijuniro',     hp:3,  sp:80, r:15, xp:1, score:10 },
  { spr:'chimp',    name:'Chimpanzini',   hp:3,  sp:86, r:16, xp:1, score:12 },
  { spr:'penguin',  name:'Penguino',      hp:4,  sp:56, r:16, xp:1, score:12, dash:true },
  { spr:'flamingo', name:'Flamingulli',   hp:3,  sp:82, r:16, xp:1, score:12 },
  { spr:'duck',     name:'Quacodillo',    hp:3,  sp:72, r:15, xp:1, score:14, death:{type:'ring',n:4} },
  // Tier II — infantry
  { spr:'cappuccino',name:'Cappuccino Assassino', hp:5, sp:90, r:15, xp:2, score:18, range:300, shoot:{type:'aim',n:1,cd:2.6,spd:175,col:'#d8e0ea'} },
  { spr:'ballerina', name:'Ballerina Cappuccina', hp:5, sp:64, r:16, xp:2, score:18, range:260, shoot:{type:'ring',n:6,cd:3.2,spd:120,col:'#c98a4f',move:true} },
  { spr:'candypig',  name:'Svinino',       hp:6,  sp:70, r:16, xp:2, score:18, range:300, shoot:{type:'aim',n:1,cd:2.8,spd:130,col:'#f06fa8'} },
  { spr:'beaver',    name:'Castori Gangsteri', hp:7, sp:62, r:17, xp:2, score:22, range:340, shoot:{type:'aim',n:3,cd:2.4,spd:175,col:'#caa12f'} },
  { spr:'lirili',    name:'Lirili Larila', hp:13, sp:40, r:22, xp:3, score:30, range:320, shoot:{type:'aim',n:3,cd:3.0,spd:130,col:'#6b9233'} },
  { spr:'patapim',   name:'Brr Brr Patapim', hp:12, sp:44, r:21, xp:3, score:28, range:300, shoot:{type:'aim',n:2,cd:3.2,spd:120,col:'#9c6b3f'} },
  // Tier III — casters
  { spr:'pinecroc',  name:'Crocodillo Ananasinno', hp:8, sp:66, r:19, xp:3, score:28, range:320, shoot:{type:'aim',n:3,cd:2.8,spd:150,col:'#e0b400'} },
  { spr:'goose',     name:'Bombombini',    hp:8,  sp:74, r:18, xp:3, score:30, range:320, shoot:{type:'aim',n:3,cd:2.6,spd:150,col:'#e58a3a'} },
  { spr:'octopus',   name:'Blueberrinni',  hp:9,  sp:50, r:19, xp:3, score:30, range:300, shoot:{type:'ring',n:8,cd:3.0,spd:120,col:'#5b6cf0'} },
  { spr:'jelly',     name:'Graipussi Medussi', hp:8, sp:46, r:19, xp:3, score:30, range:280, shoot:{type:'ring',n:6,cd:2.8,spd:95,col:'#d36fb0'} },
  { spr:'espresso',  name:'Espressona Signora', hp:9, sp:58, r:17, xp:3, score:32, range:300, shoot:{type:'ring',n:5,cd:2.2,spd:130,col:'#a16a3c'} },
  { spr:'orangutan', name:'Orangutini',    hp:10, sp:54, r:20, xp:4, score:34, range:320, shoot:{type:'aim',n:1,cd:2.4,spd:140,col:'#e07a2a'} },
  // Tier IV — heavies
  { spr:'rhino',     name:'Rhino Toasterino', hp:18, sp:42, r:23, xp:4, score:45, range:340, shoot:{type:'aim',n:2,cd:3.0,spd:140,col:'#e8b96a'}, aoe:{r:42,dps:14,life:1.3,tele:0.7,col:'#e8a93a',cd:3.6} },
  { spr:'camel',     name:'Frigo Camelo',  hp:20, sp:38, r:24, xp:5, score:50, aoe:{r:52,dps:9,life:1.6,tele:0.6,slow:true,col:'#9fd0ff',cd:3.4} },
  { spr:'hippo',     name:'Il Cacto Hipopotamo', hp:22, sp:34, r:25, xp:5, score:55, range:320, shoot:{type:'ring',n:8,cd:3.6,spd:120,col:'#6b9233'}, aoe:{r:46,dps:15,life:1.1,tele:0.6,col:'#6b9233',cd:4.0} },
  { spr:'turtle',    name:'Torrtuginni',   hp:26, sp:30, r:24, xp:5, score:55, shell:true },
  // Tier V — elites
  { spr:'panda',     name:'Pandaccini',    hp:14, sp:58, r:20, xp:4, score:40, aoe:{r:42,dps:4,life:1.6,tele:0.5,slow:true,col:'#f7d24a',cd:3.0} },
  { spr:'tiger',     name:'Tigrrullini',   hp:14, sp:76, r:20, xp:4, score:44, dash:true, range:360, shoot:{type:'aim',n:5,cd:3.4,spd:155,col:'#e54d4d',move:true} },
  { spr:'capy',      name:'Capybarelli',   hp:16, sp:46, r:21, xp:5, score:48, support:true },
];
const BOSSES_GRASS = [
  { spr:'tralalero', name:'TRALALERO TRALALA',        hp:150, r:54, pattern:'spiral' },
  { spr:'crocodilo', name:'BOMBARDIRO CROCODILO',     hp:230, r:56, pattern:'rings'  },
  { spr:'sahur',     name:'TUNG TUNG TUNG SAHUR',     hp:300, r:58, pattern:'chaos'  },
  { spr:'vaca',      name:'LA VACA SATURNO',          hp:440, r:58, pattern:'rings'  },
  { spr:'gorillo',   name:'GORILLO WATERMELLONDRILLO',hp:560, r:62, pattern:'chaos',  phased:true },
  { spr:'trippi',    name:'TRIPPI TROPPI',            hp:680, r:56, pattern:'spiral', phased:true },
];
// ============ WORLD 2 — DIRT DEPTHS roster ============
const FOES_DIRT = [
  // Tier I — fodder
  { spr:'golubiro',  name:'Spijuniro Golubiro', hp:3, sp:84, r:15, xp:1, score:10 },
  { spr:'bananini',  name:'Chimpanzini Bananini', hp:3, sp:86, r:16, xp:1, score:12 },
  { spr:'dolfinita', name:'Bananita Dolfinita',  hp:4, sp:56, r:16, xp:1, score:12, dash:true },
  { spr:'frula',     name:'Fruli Frula',         hp:3, sp:50, r:15, xp:1, score:14, death:{type:'split',n:2} },
  { spr:'baraboom',  name:'Tric Trac Baraboom',  hp:3, sp:72, r:15, xp:1, score:14, death:{type:'ring',n:4} },
  // Tier II — infantry
  { spr:'cappuccino',name:'Cappuccino Assassino 2.0', hp:5, sp:70, r:15, xp:2, score:18, front:0.35 },
  { spr:'ballerina', name:'Ballerina Cappuccina 2.0', hp:5, sp:64, r:16, xp:2, score:18, range:300, shoot:{type:'aim',n:1,cd:2.8,spd:130,col:'#c98a4f',arc:true} },
  { spr:'bobrito',   name:'Bobrito Bandito',     hp:6, sp:62, r:17, xp:2, score:22, range:340, shoot:{type:'aim',n:3,cd:2.4,spd:175,col:'#caa12f'} },
  { spr:'trulimero', name:'Trulimero Trulichina', hp:7, sp:64, r:16, xp:2, score:18, range:260, shoot:{type:'ring',n:6,cd:3.2,spd:120,col:'#3fa6a0',move:true} },
  { spr:'lirili',    name:'Lirili Larila 2.0',   hp:13, sp:40, r:22, xp:3, score:30, range:320, shoot:{type:'aim',n:3,cd:3.0,spd:130,col:'#6b9233'} },
  { spr:'patapim',   name:'Brr Brr Patapim 2.0', hp:12, sp:44, r:21, xp:3, score:28, range:300, shoot:{type:'aim',n:2,cd:3.2,spd:120,col:'#9c6b3f'} },
  // Tier III — casters
  { spr:'ananasini', name:'Orangutini Ananasini', hp:8, sp:54, r:20, xp:4, score:34, range:340, shoot:{type:'aim',n:2,cd:2.8,spd:150,col:'#e3a13a',arc:true} },
  { spr:'glorbo',    name:'Glorbo Fruttodrillo', hp:8, sp:50, r:19, xp:3, score:30, cast:{kind:'geyser',cd:3.2,range:380,n:5,col:'#5a9e3f'} },
  { spr:'octopus',   name:'Blueberrinni Octopussini 2.0', hp:9, sp:50, r:19, xp:3, score:30, cast:{kind:'debris',cd:3.0,n:3,col:'#5b6cf0'} },
  { spr:'jelly',     name:'Graipussi Medussi 2.0', hp:8, sp:46, r:19, xp:3, score:30, cast:{kind:'sweep',cd:3.6,dur:1.6,col:'#d36fb0'} },
  { spr:'espresso',  name:'Espressona Signora 2.0', hp:9, sp:58, r:17, xp:3, score:32, range:300, shoot:{type:'ring',n:5,cd:2.2,spd:130,col:'#a16a3c'} },
  { spr:'zibra',     name:'Zibra Zubra Zibralini', hp:10, sp:54, r:20, xp:4, score:34, range:340, shoot:{type:'aim',n:2,cd:2.6,spd:150,col:'#cfcfd8',split:true} },
  // Tier IV — heavies
  { spr:'rhino',     name:'Rhino Toasterino 2.0', hp:18, sp:42, r:23, xp:4, score:45, range:340, shoot:{type:'aim',n:2,cd:3.0,spd:140,col:'#e8b96a'}, death:{type:'split',n:2} },
  { spr:'burbaloni', name:'Burbaloni Luliloli',  hp:20, sp:36, r:24, xp:5, score:50, aoe:{r:52,dps:9,life:1.6,tele:0.6,slow:true,col:'#9fd0ff',cd:3.4} },
  { spr:'cocofanto', name:'Cocofanto Elefanto',  hp:22, sp:32, r:25, xp:5, score:55, pullAura:60, trail:{cd:0.5,r:34,life:1.6,dps:7,col:'#3a2616'} },
  { spr:'girafa',    name:'Girafa Celeste',      hp:26, sp:30, r:26, xp:5, score:55, dash:true, kb:true },
  // Tier V — elites
  { spr:'bicus',     name:'Brri Brri Bicus Dicus Bombicus', hp:14, sp:50, r:20, xp:4, score:44, cast:{kind:'summon',cd:5,spr:'golubiro',n:3,cap:4} },
  { spr:'ambalabu',  name:'Boneca Ambalabu',     hp:14, sp:44, r:20, xp:4, score:44, cast:{kind:'geyser',cd:3.4,range:420,n:5,lines:3,col:'#5a9e3f'} },
  { spr:'dindin',    name:'U Din Din Din Din Dun Ma Din Din Din Dun', hp:16, sp:38, r:22, xp:5, score:48, death:{type:'split',n:2} },
];
const BOSSES_DIRT = [
  { spr:'tatasahur', name:'TA TA TA TA SAHUR',        hp:150, r:54, pattern:'chaos',  phased:true },
  { spr:'hotspot',   name:'POT HOTSPOT',              hp:230, r:60, pattern:'rings',  phased:true },
  { spr:'saturnita', name:'LA VACA SATURNO SATURNITA',hp:300, r:58, pattern:'chaos',  phased:true },
  { spr:'tralalero', name:'TRALALERO TRALALA 2.0',    hp:380, r:56, pattern:'spiral', phased:true, moveKey:'tralala2' },
  { spr:'orcalero', name:'ORCALERO ORCALA',           hp:560, r:58, pattern:'rings',  phased:true, moveKey:'croco2' },
  { spr:'madudung',  name:'MADUDUNGDUNG',             hp:680, r:62, pattern:'chaos',  bars:2, hp2:480, duo:'garamaraman' },
];
// ============ WORLD 2 — CITRUS COAST roster (real OG Italian Brainrots, recreated). band 1: easy, mostly chasers. ============
const FOES_W2 = [
  // Tier I — fodder
  { spr:'tralalerito', name:'Tralaleritos',          hp:3, sp:92, r:14, xp:1, score:10 },
  { spr:'pipikiwi',    name:'Pi Pi Kiwi',            hp:3, sp:80, r:14, xp:1, score:10 },
  { spr:'tukanno',     name:'Tukanno Bananno',       hp:4, sp:74, r:16, xp:1, score:12 },
  { spr:'raccooni',    name:'Raccooni Watermelunni', hp:4, sp:70, r:16, xp:1, score:12 },
  // Tier II — infantry (one light shooter, one dasher, one death-pop — kept gentle)
  { spr:'svinino',     name:'Svinino Bombondino',    hp:6, sp:66, r:16, xp:2, score:16, death:{type:'ring',n:4} },
  { spr:'avoantilope', name:'Avocadini Antilopini',  hp:7, sp:88, r:17, xp:2, score:20, dash:true },
  { spr:'avoguffo',    name:'Avocadini Guffo',       hp:6, sp:58, r:17, xp:2, score:18, range:300, shoot:{type:'aim',n:1,cd:2.8,spd:150,col:'#7cae3e'} },
  // Tier III — heavy
  { spr:'perochello',  name:'Perochello Lemonchello',hp:13, sp:42, r:21, xp:3, score:30, front:0.5 },
];
const BOSSES_W2 = [   // each uses its own original moveset (keyed on spr in bossMoves), unique per phase
  { spr:'eccocavallo',  name:'ECCO CAVALLO VIRTUOSO',         hp:130, r:54, phased:true },
  { spr:'tigrwater',    name:'TIGRULLINI WATERMELLINI',       hp:200, r:55, phased:true },
  { spr:'avocadorilla', name:'AVOCADORILLA',                  hp:300, r:58, phased:true },
  { spr:'tracotucotulu',name:'TRACOTUCOTULU DELAPELADUSTUZ',  hp:420, r:60, phased:true },
];
// ---- World 3: FORESTA FRUTOSA ----
const FOES_W3 = [
  // Tier I — fodder
  { spr:'bobritto',      name:'Bobritto Bandito',    hp:5,  sp:90, r:19, xp:1, score:11,
    range:260, shoot:{type:'aim',n:1,cd:2.2,spd:170,col:'#c0392b'}, dash:true,
    death:{type:'ring',n:5} },                                       // bandit pops on death
  { spr:'garamaraman',   name:'Garamaraman',          hp:4,  sp:100,r:16, xp:1, score:10,
    range:180, shoot:{type:'aim',n:2,cd:2.8,spd:130,col:'#ff5a40'}, // shoots while alive before splitting
    death:{type:'split'} },
  // Tier II — infantry
  { spr:'burbaloni',     name:'Burbaloni Luliloli',   hp:8,  sp:58, r:22, xp:2, score:18,
    range:320, shoot:{type:'aim',n:1,cd:3.0,spd:95,col:'#b48adf'},
    pullAura:30 },                                                    // weak gravity pulls player in
  { spr:'bonecaambalabu',name:'Boneca Ambalabu',       hp:10, sp:68, r:24, xp:2, score:22,
    dash:true, range:240, shoot:{type:'aim',n:2,cd:3.5,spd:138,col:'#2e7d32'},
    death:{type:'ring',n:4} },                                       // ambush explosion
  // Tier III — casters
  { spr:'girafassassina',name:'Girafa Assassina',     hp:9,  sp:38, r:28, xp:3, score:28,
    range:500, front:0.6, shoot:{type:'aim',n:3,cd:2.5,spd:180,col:'#d4ac0d'},
    cast:{kind:'debris',cd:4.2,n:2,col:'#d4ac0d'} },                // rains debris when in range
  { spr:'glorbo',        name:'Glorbo Frutabaga',     hp:9,  sp:52, r:23, xp:2, score:20,
    range:350, shoot:{type:'aim',n:1,cd:2.8,spd:110,col:'#8e44ad'},
    cast:{kind:'geyser',cd:4.5,range:380,n:3,col:'#8e44ad'},        // vine eruptions
    aoe:{r:44,tele:0.1,life:1.2,dps:7,slow:true,cd:4.0} },
  // Tier IV — heavy
  { spr:'cocofanto',     name:'Cocofanto Elephanto',  hp:30, sp:34, r:40, xp:5, score:60,
    front:0.55, dash:true, death:{type:'ring',n:4},
    trail:{cd:0.4,r:36,life:1.8,dps:7,col:'#3a2616'} },             // leaves coconut-debris trail
  // Tier V — elite (support)
  { spr:'kikkurimi',     name:'Kikkurimi Kikkurone',  hp:20, sp:56, r:26, xp:4, score:55,
    support:true,
    aoe:{r:34,tele:0,life:0.4,dps:0,slow:true,cd:4.2},
    range:260, shoot:{type:'aim',n:1,cd:4.5,spd:125,col:'#27ae60'},
    cast:{kind:'summon',cd:8,spr:'bobritto',n:2,cap:4} },           // calls in bandit reinforcements
];
const BOSSES_W3 = [
  { spr:'subrosa',       name:'SUBROSA CAMBRIANA',           hp:140, r:52, phased:true },
  { spr:'bobritoboss',   name:'BOBRITTO BANDOLERO',          hp:200, r:54, phased:true },
  { spr:'frullone',      name:'FRULLONE VIBRASSONE',         hp:290, r:57, phased:true },
  { spr:'cocofantoboss', name:'COCOFANTO MASTODONTE',        hp:420, r:62, phased:true },
];
// ============ WORLD 4 — GELATO GLACIER roster (frozen-dessert OG brainrots). band 2: gentle, a few light specials. ============
const FOES_W4 = [
  // Tier I — fodder (fast, weak, swarm)
  { spr:'gelatogattino',     name:'Gelato Gattino',       hp:4,  sp:96,  r:15, xp:1, score:11 },
  { spr:'pinguinocaramelino',name:'Pinguino Caramelino',  hp:5,  sp:78,  r:17, xp:1, score:12 },
  { spr:'trulimero',         name:'Trulimero Trulicina',  hp:4,  sp:104, r:15, xp:1, score:11 },
  // Tier II — infantry (one dasher that explodes, one ice-debris caster)
  { spr:'americanopenguino', name:'Americano Penguino',   hp:8,  sp:84,  r:18, xp:2, score:18, dash:true,
    death:{type:'ring',n:5} },                                       // cannonball penguin detonates on death
  { spr:'ghiacciolospaziale',name:'Ghiacciolo Spaziale',  hp:7,  sp:60,  r:17, xp:2, score:18,
    range:300, shoot:{type:'aim',n:1,cd:2.8,spd:150,col:'#7ec8ff'},
    cast:{kind:'debris',cd:3.5,n:2,col:'#7ec8ff'} },                // drops ice shards from orbit
  // Tier III — caster (mobile dasher + twin shot that leaves cold patches)
  { spr:'frullifrulla',      name:'Frulli Frulla',        hp:10, sp:66,  r:19, xp:3, score:26, dash:true,
    range:320, shoot:{type:'aim',n:2,cd:3.2,spd:140,col:'#4aa3df'},
    aoe:{r:36,dps:5,life:1.2,tele:0.5,slow:true,cd:3.8,col:'#9fd0ff'} }, // leaves ice patch on cooldown
  // Tier IV — heavy (armored, leaves a cold slow-zone, pops a death ring)
  { spr:'sorbettoleonino',   name:'Sorbetto Leonino',     hp:30, sp:36,  r:38, xp:5, score:60, front:0.55, death:{type:'ring',n:5},
    aoe:{r:44,tele:0.5,life:1.6,dps:8,slow:true,cd:4.2} },
  // Tier V — elite (support: heals nearby foes + wing sweep -> priority kill)
  { spr:'granitagabbiano',   name:'Granita Gabbiano',     hp:20, sp:62,  r:24, xp:4, score:55, support:true,
    range:280, shoot:{type:'aim',n:1,cd:4.0,spd:120,col:'#9fd0ff'},
    cast:{kind:'sweep',cd:4.2,dur:1.2,col:'#9fd0ff'} },             // icy wing-sweep attack
];
const BOSSES_W4 = [   // original frozen-dessert movesets (keyed on spr in bossMoves); telegraphed melee/zone (band 2, forgiving)
  { spr:'tiramisubmarini', name:'TIRAMISUBMARINI',                 hp:135, r:54, phased:true },
  { spr:'frigocamello',    name:'FRIGO CAMELLO',                   hp:205, r:56, phased:true },
  { spr:'magotiramisu',    name:'IL MAGO TIRAMISÙ',                hp:300, r:56, phased:true },
  { spr:'icebearlini',     name:'ICE ICE BEARLINI POLARI ORANGINI',hp:430, r:62, phased:true },
];
// ============ WORLD 5 — CIRCO BRAINROTTO roster (house-built carnival hybrids). band 3: tankier, first bounce/teleport gimmicks. ============
const FOES_W5 = [
  // Tier I — fodder
  { spr:'burbalonidog',   name:'Burbaloni Dogolini',  hp:4,  sp:88,  r:17, xp:1, score:12, death:{type:'ring',n:3} },
  { spr:'popcorrino',     name:'Popcorrino Bucketto',  hp:5,  sp:74,  r:17, xp:1, score:12,
    death:{type:'ring',n:5} },                                       // pops like kernels instead of splitting
  { spr:'zuccherofilino', name:'Zucchero Filino',      hp:4,  sp:108, r:15, xp:1, score:12,
    death:{type:'split',n:2} },                                      // cotton candy tears in two
  // Tier II — infantry (clown explodes on death, cannonino leaves a crater ring)
  { spr:'clownino',       name:'Clownino Honkhonk',    hp:8,  sp:80,  r:18, xp:2, score:20, dash:true,
    death:{type:'ring',n:6} },                                       // clown-car confetti explosion
  { spr:'cannonino',      name:'Cannonino Umano',      hp:10, sp:64,  r:18, xp:2, score:22, dash:true, kb:true,
    death:{type:'ring',n:4} },                                       // human cannonball detonates on death
  // Tier III — caster (juggler lobs 5 arcing balls, drops them all on death)
  { spr:'giocoliere',     name:'Giocoliere Scimmino',  hp:11, sp:58,  r:19, xp:3, score:28,
    range:340, shoot:{type:'aim',n:5,cd:3.0,arc:true,col:'#ffd24a'},
    death:{type:'ring',n:5} },
  // Tier IV — heavy (armored strongman with gravitational pull + slam zone + death ring)
  { spr:'forzutoorsino',  name:'Forzuto Orsino',       hp:34, sp:34,  r:40, xp:5, score:64, front:0.5, death:{type:'ring',n:5},
    aoe:{r:46,tele:0.55,life:0.7,dps:18,cd:4.0},
    pullAura:40 },                                                    // strongman draws you in
  // Tier V — elite (ringmaster: heals + summons clowns + whistle shot)
  { spr:'maestrofoccino', name:'Maestro Foccino',      hp:22, sp:60,  r:24, xp:4, score:58, support:true,
    range:300, shoot:{type:'aim',n:2,cd:3.8,spd:130,col:'#e8463c'},
    cast:{kind:'summon',cd:7,spr:'clownino',n:2,cap:4} },           // ringmaster calls in backup clowns
];
const BOSSES_W5 = [   // original carnival movesets; telegraphed melee/zone with bounce/teleport flourishes (band 3)
  { spr:'trapezino',     name:'TRAPEZINO VOLANTINO',  hp:150, r:54, phased:true },
  { spr:'giostra',       name:'GIOSTRA VORTICOSA',    hp:215, r:56, phased:true },
  { spr:'mangiafuoco',   name:'MANGIAFUOCO DRAGHINO', hp:310, r:56, phased:true },
  { spr:'granpagliaccio',name:'IL GRAN PAGLIACCIO',   hp:450, r:62, phased:true },
];
// ---- worlds: each = theme + roster + boss list + wave target (boss wave). ----
// ---- 10 worlds: gradual difficulty bands (0..9), distinct map shapes, per-world enemy tints. ----
// Phase 1 reuses the grass roster (W1-5) and dirt roster (W6-10) recolored via enemyTint; dedicated
// original sprites + unique boss movesets arrive in later content phases. World 10 = the dirt roster
// unchanged. See docs/specs/2026-06-14-worlds-expansion-design.md.
const WORLDS = [
  { id:'grass', name:'GRASSLANDS', band:0, waveTarget:20, endless:false, map:{w:2600,h:2600}, enemyTint:null,
    theme:{ void:'#5b7d33', tile1:'#86c64a', tile2:'#7cbd43', tuft:'rgba(60,110,40,0.35)',
            wall:null, post:null, bg:'#6fae3d', tint:null, music:'game' },
    foes:FOES_GRASS, bosses:BOSSES_GRASS },
  { id:'citrus', name:'CITRUS COAST', band:1, waveTarget:20, endless:false, map:{w:3200,h:2000}, enemyTint:null,
    theme:{ void:'#c89a3a', tile1:'#f0d878', tile2:'#e8cd63', tuft:'rgba(180,140,50,0.28)',
            wall:null, post:null, bg:'#ecd070', tint:'#f0c850', music:'game' },
    foes:FOES_W2, bosses:BOSSES_W2 },
  { id:'forest', name:'FORESTA FRUTOSA', band:1, waveTarget:20, endless:false,
    map:{w:2800,h:2600}, enemyTint:null,
    theme:{ void:'#2a5c1a', tile1:'#5aaa3c', tile2:'#4d9633',
            tuft:'rgba(30,80,20,0.40)', wall:'#5c3a1e', post:'#7a4e28',
            bg:'#478a2e', tint:null, music:'game' },
    foes:FOES_W3, bosses:BOSSES_W3 },
  { id:'glacier', name:'GELATO GLACIER', band:2, waveTarget:20, endless:false, map:{w:3000,h:2800}, enemyTint:null,
    theme:{ void:'#7fb8b0', tile1:'#e2f6ef', tile2:'#cfeae2', tuft:'rgba(120,180,170,0.28)',
            wall:'#a6d6cc', post:'#d6f0e8', postDark:'#6f9f96', bg:'#cfeae2', tint:'#e0fff5', music:'game' },
    foes:FOES_W4, bosses:BOSSES_W4 },
  { id:'circo', name:'CIRCO BRAINROTTO', band:3, waveTarget:20, endless:false, map:{w:3200,h:2600}, enemyTint:null,
    theme:{ void:'#9a3b2e', tile1:'#f3e3c0', tile2:'#e7d2a4', tuft:'rgba(150,60,40,0.22)',
            wall:'#b03a2e', post:'#e8c24a', postDark:'#8a2a20', bg:'#e7d2a4', tint:'#ffcf6b', music:'boss1' },
    foes:FOES_W5, bosses:BOSSES_W5 },
  { id:'autumn', name:'AUTUMN WOODS', band:4, waveTarget:20, endless:false, map:{w:3000,h:3000}, enemyTint:'#e0792c',
    theme:{ void:'#8a4f22', tile1:'#d98a44', tile2:'#cf7e3a', tuft:'rgba(120,60,20,0.32)',
            wall:null, post:null, bg:'#c97a36', tint:'#e0792c', music:'game' },
    foes:FOES_GRASS, bosses:BOSSES_GRASS },
  { id:'swamp', name:'SWAMP', band:5, waveTarget:20, endless:false, map:{w:3800,h:1600}, enemyTint:'#6a8a3a',
    theme:{ void:'#38502a', tile1:'#5f7a45', tile2:'#56713e', tuft:'rgba(30,50,20,0.35)',
            wall:'#3a4d28', post:'#5a7038', postDark:'#28361c', bg:'#55703c', tint:'#6a8a3a', music:'dirt',
            debris:0.7 },
    foes:FOES_DIRT, bosses:BOSSES_DIRT },
  { id:'sky', name:'SKYLAND', band:6, waveTarget:20, endless:false, map:{w:3600,h:3600}, enemyTint:'#bfe0ff',
    theme:{ void:'#8fb6cf', tile1:'#cfe6f5', tile2:'#c0dcef', tuft:'rgba(140,180,210,0.28)',
            wall:null, post:null, bg:'#c2def0', tint:'#bfe0ff', music:'boss1' },
    foes:FOES_DIRT, bosses:BOSSES_DIRT },
  { id:'crystal', name:'CRYSTAL CAVES', band:7, waveTarget:20, endless:false, map:{w:1300,h:3600}, enemyTint:'#b08fe0',
    theme:{ void:'#3a2a52', tile1:'#6a4f8a', tile2:'#5e4578', tuft:'rgba(150,120,200,0.28)',
            wall:'#2f2247', post:'#5a4078', postDark:'#1e1530', bg:'#5a4078', tint:'#b08fe0', music:'boss2' },
    foes:FOES_DIRT, bosses:BOSSES_DIRT },
  { id:'volcano', name:'VOLCANO', band:8, waveTarget:20, endless:false, map:{w:2800,h:2800}, enemyTint:'#e0502c',
    theme:{ void:'#3a1810', tile1:'#7a3a2a', tile2:'#6e3020', tuft:'rgba(60,24,12,0.35)',
            wall:'#2a120a', post:'#6e3424', postDark:'#1c0c06', bg:'#6b2e1e', tint:'#e0502c', music:'boss0',
            debris:0.8 },
    foes:FOES_DIRT, bosses:BOSSES_DIRT },
  { id:'dirt', name:'DIRT DEPTHS', band:9, waveTarget:20, endless:false, map:{w:1200,h:4000}, enemyTint:null,
    theme:{ void:'#5a3d28', tile1:'#7a5333', tile2:'#6f4a2c', tuft:'rgba(40,26,14,0.35)',
            wall:'#4a3320', post:'#7a5a38', postDark:'#3a2616', bg:'#6b4a30', tint:'#8a5a2c', music:'dirt',
            debris:0.8, edgeDark:0.15 },
    foes:FOES_DIRT, bosses:BOSSES_DIRT },
];
let worldIdx = 0;
// Practice's single "world" — a mutable stand-in whose foes/bosses get overwritten by the
// customize popup right before each run, and whose theme/map are just Grasslands' (cosmetic only).
const TRAINING_WORLD = {
  id:'training', name:'TRAINING GROUNDS', band:0, endless:true, waveTarget:20,
  map:{w:2600,h:2600}, theme:WORLDS[0].theme,
  foes:WORLDS[0].foes, bosses:WORLDS[0].bosses,
};
function curWorld(){ return gameMode==='practice' ? TRAINING_WORLD : WORLDS[worldIdx]; }
let curFoes   = WORLDS[0].foes;
let curBosses = WORLDS[0].bosses;
let curTheme  = WORLDS[0].theme;
let unlockedMax = clamp(Math.floor(+(localStorage.getItem('br_unlocked')||0)), 0, WORLDS.length-1);
let selWorld = Math.min(unlockedMax, WORLDS.length-1);
function loadWorld(idx){
  worldIdx = clamp(idx,0,WORLDS.length-1);
  const w = curWorld(); curFoes = w.foes; curBosses = w.bosses; curTheme = w.theme;
  if(w.map){   // per-world field dimensions (shape). Cap by area so the ground canvas stays memory-safe.
    let mw=w.map.w, mh=w.map.h; const MAXAREA=13e6;
    if(mw*mh>MAXAREA){ const k=Math.sqrt(MAXAREA/(mw*mh)); mw=Math.round(mw*k); mh=Math.round(mh*k); }
    WORLD.w=mw; WORLD.h=mh;
  }
  document.body.style.background = curTheme.bg;
  // Free tinted-sprite cache between worlds (significant memory win across world changes)
  for(const k of Object.keys(TINTED)) delete TINTED[k];
  buildGround();   // pre-render this world's ground once (avoids per-frame tile loops)
}
let cut = null;   // cutscene state
let _clearData = null;
function worldCleared(boss){
  const isPractice = gameMode==='practice';
  let gemsEarned=0, newChars=[];
  if(!isPractice){   // practice grants no persistent progress at all
    const prevUnlocked = unlockedMax;
    unlockedMax = Math.min(WORLDS.length-1, Math.max(unlockedMax, worldIdx+1));
    localStorage.setItem('br_unlocked', unlockedMax); if(window.markDirty) window.markDirty();
    selWorld = Math.min(WORLDS.length-1, worldIdx+1);
    // One-time 5-gem reward per world cleared
    const gwKey='br_gem_w'+worldIdx;
    if(!localStorage.getItem(gwKey) && typeof addGems==='function'){
      gemsEarned=5; addGems(5); localStorage.setItem(gwKey,'1');
      bigText('+5 ◆ GEMS','#b06ff0');
    }
    newChars = typeof CHARACTERS!=='undefined'
      ? CHARACTERS.filter(c => {
          if(c.rarity!=='world' || c.worldUnlock==null) return false;
          const hadBefore = c.worldUnlock<=prevUnlocked || (typeof isCharOwned==='function' && isCharOwned(c.id));
          return !hadBefore && c.worldUnlock<=unlockedMax;
        })
      : [];
  }
  _clearData = { worldNum:worldIdx+1, coins:worldCoins, gems:gemsEarned, newChars, isPractice };
  if(newChars.length && typeof updateCharBadge==='function') updateCharBadge();
  state = ST.CUTSCENE;
  cut = { t:0, boss:boss, alpha:1, fade:0, name:curWorld().name };
  boss.cut = true; boss.deathScale = 1;
  enemies.length=0; enemies.push(boss);   // keep only the dying boss on screen
  ebullets=[]; bullets=[]; petBullets=[]; zones=[]; skibidiBullets.length=0; skibidiTimers.length=0;
  hitstop=0.25; shake=Math.max(shake,16);
  stopMusic(); sfx.win();
  bigText(isPractice ? 'TRAINING COMPLETE' : 'WORLD CLEARED', '#ffd24a');
}
function cutsceneUpdate(dt){
  computeCamera();
  if(!cut) return;
  cut.t += dt;
  const b=cut.boss;
  b.sq = 0.6;
  if(cut.t < 1.4 && Math.random()<0.5) burst(b.x+rand(-b.r,b.r), b.y+rand(-b.r,b.r), '#ffd24a', 10, 260);
  b.deathScale = 1 + cut.t*0.5;
  cut.alpha = Math.max(0, 1 - (cut.t-1.0)/0.8);           // boss fades out 1.0..1.8s
  if(cut.t > 1.6) cut.fade = Math.min(1, (cut.t-1.6)/0.7); // screen fades to theme color
  for(let i=parts.length-1;i>=0;i--){ const p=parts[i]; p.t=(p.t||0)+dt; p.x+=(p.vx||0)*dt; p.y+=(p.vy||0)*dt; p.life-=dt; if(p.life<=0) parts.splice(i,1); }
  for(let i=texts.length-1;i>=0;i--){ const tx=texts[i]; tx.t=(tx.t||0)+dt; tx.x+=(tx.vx||0)*dt; tx.y+=(tx.vy||0)*dt; tx.life-=dt; if(tx.life<=0) texts.splice(i,1); }
  if(cut.t > 2.5){ cut=null; toMenuFromClear(); }
}
function toMenuFromClear(){
  if(!_clearData){ quitToMenu(); triggerUnlockReveal(); return; }
  const d=_clearData; _clearData=null;
  $('wc-title').textContent = d.isPractice ? 'TRAINING COMPLETE' : d.isChallenger ? 'WORLD '+d.worldNum+' CHALLENGER!' : 'WORLD '+d.worldNum+' CLEARED!';
  $('wc-coins').textContent = d.coins;
  // Set coin icon from sprite (no emoji)
  const coinIco=$('wc-coinico');
  if(coinIco && typeof SP!=='undefined' && SP['coin']) coinIco.src=SP['coin'].toDataURL();
  // Set star icon from sprite (no emoji)
  const starIco=$('wc-starico');
  if(starIco && typeof SP!=='undefined' && SP['ic_char']) starIco.src=SP['ic_char'].toDataURL();
  const gemRow=$('wc-gem-row');
  if(d.gems>0){ $('wc-gems').textContent='+'+d.gems; gemRow.classList.remove('hidden'); }
  else { gemRow.classList.add('hidden'); }
  const unlockEl=$('wc-unlock');
  if(d.newChars.length>0){
    $('wc-char-name').textContent = d.newChars.map(c=>c.name).join(', ');
    unlockEl.classList.remove('hidden');
  } else { unlockEl.classList.add('hidden'); }
  $('world-cleared').classList.remove('hidden');
}

// ============================================================
// INTRO CUTSCENE — plays once, before the very first World 1 run.
// Pure screen-space drawing (no world/camera), driven by a fixed stage timeline.
// ============================================================
const INTRO_DUR = 15;
let introT = 0, introDone = null;
const INTRO_HUMANS = [
  {x:0.28,y:0.62,p:0}, {x:0.42,y:0.74,p:1.4}, {x:0.58,y:0.58,p:2.6},
  {x:0.66,y:0.72,p:0.7}, {x:0.36,y:0.5,p:3.3}, {x:0.5,y:0.66,p:2.0},
];
const INTRO_ARMY = ['pigeon','chimp','penguin','flamingo','duck','pigeon'];
function easeOut(t){ return 1-(1-t)*(1-t); }
function startIntro(onDone){
  introT=0; introDone=onDone; state=ST.INTRO;
  $('menu').classList.add('hidden');
  $('introskip').classList.remove('hidden');
  playMusic('boss0'); shake=0;
}
function finishIntro(){
  $('introskip').classList.add('hidden');
  localStorage.setItem('br_seen_intro','1');
  const cb=introDone; introDone=null;
  if(cb) cb();
}
function introUpdate(dt){ introT+=dt; if(introT>=INTRO_DUR) finishIntro(); }
// caption alpha: fades in over 0.4s, holds, fades out 0.4s before the window ends
function introCaptionAlpha(t,t0,t1){
  if(t<t0||t>t1) return 0;
  return Math.min(1,(t-t0)/0.4,(t1-t)/0.4);
}
function introCaption(str,t,t0,t1,y){
  const a=introCaptionAlpha(t,t0,t1); if(a<=0) return;
  let fs=Math.round(Math.min(W,H)*0.045);
  cx.textAlign='center'; cx.font='900 '+fs+'px sans-serif';
  const maxW=W*0.92;
  if(cx.measureText(str).width>maxW){ fs=Math.max(11,Math.floor(fs*maxW/cx.measureText(str).width)); cx.font='900 '+fs+'px sans-serif'; }
  cx.globalAlpha=a;
  cx.lineWidth=5; cx.strokeStyle='#000'; cx.strokeText(str,W/2,y);
  cx.fillStyle='#fff'; cx.fillText(str,W/2,y);
  cx.globalAlpha=1;
}
function introRender(){
  const t=introT;
  // local screen-shake (NOT the shared `shake` global — that's decayed by update(), which never
  // runs during ST.INTRO, so writing to it here would leak a stuck shake into the real game after)
  const introShakeAmt = (t>7 && t<11) ? Math.max(0,(t-7)/3)*10 : 0;
  cx.save();
  if(introShakeAmt>0) cx.translate(rand(-introShakeAmt,introShakeAmt), rand(-introShakeAmt,introShakeAmt));
  // sky/ground backdrop (grass tones, screen-space, no world dependency)
  cx.fillStyle='#6fae3d'; cx.fillRect(0,0,W,H);
  cx.fillStyle='#86c64a';
  for(let gy=0; gy<H; gy+=64) for(let gx=0; gx<W; gx+=64) if(((gx/64+gy/64)&1)) cx.fillRect(gx,gy,64,64);

  // --- stage 1 (0-3s): peaceful humans wandering ---
  if(t<8){
    const fleeT=Math.max(0,t-7);   // they start bolting for the exits once the army gets close
    for(const h of INTRO_HUMANS){
      const wob=Math.sin((t+h.p)*1.6)*10;
      const fx=fleeT>0 ? -fleeT*fleeT*260 : 0;
      const hx=h.x*W+wob+fx, hy=h.y*H;
      cx.fillStyle='#e0c39a'; cx.beginPath(); cx.arc(hx,hy,7,0,TAU); cx.fill();
      cx.fillStyle='#3a2d22'; cx.beginPath(); cx.arc(hx,hy-9,5,0,TAU); cx.fill();
    }
  }
  introCaption('THE WORLD WAS AT PEACE...', t, 0.3, 3.2, H*0.18);

  // --- stage 2 (2.5-9s): Sahur marches in with his army ---
  if(t>2.5 && t<11){
    const e=easeOut(Math.min(1,(t-2.5)/5.5));
    const bossX = W*1.15 - e*(W*0.65), bossY=H*0.56;
    const closeness=Math.max(0,(t-7)/3);
    for(let i=0;i<INTRO_ARMY.length;i++){
      const lag=0.5+i*0.18, e2=easeOut(Math.min(1,Math.max(0,(t-2.5-lag*0.4))/5.5));
      const ax=W*1.25-e2*(W*0.6)+Math.sin(i*1.7)*30, ay=bossY+70+(i%3)*26-26;
      if(typeof SP!=='undefined' && SP[INTRO_ARMY[i]]) drawSprite(INTRO_ARMY[i], ax, ay, 46, Math.sin(t*4+i)*0.15, 0,0,false,null);
    }
    if(typeof SP!=='undefined' && SP['sahur']) drawSprite('sahur', bossX, bossY, 130+closeness*30, Math.sin(t*3)*0.05, 0,0,false,null);
  }
  introCaption('...UNTIL TUNG TUNG TUNG SAHUR\'S ARMY INVADED.', t, 3.6, 8.6, H*0.86);

  // --- stage 3 (9-11.5s): chaos flash ---
  if(t>9 && t<11.5){
    cx.globalAlpha=0.16+0.1*Math.sin(t*16); cx.fillStyle='#ff2020'; cx.fillRect(0,0,W,H); cx.globalAlpha=1;
  }
  introCaption('BRAINROT IS SPREADING FAST.', t, 9.0, 11.3, H*0.5);

  // --- stage 4 (11.5-15s): hero rises ---
  if(t>11.5){
    const a=Math.min(1,(t-11.5)/0.6);
    cx.globalAlpha=0.5*a*(0.6+0.4*Math.sin(t*5)); cx.strokeStyle='#9fe0ff'; cx.lineWidth=4;
    cx.beginPath(); cx.arc(W/2,H*0.58,60,0,TAU); cx.stroke(); cx.globalAlpha=1;
    if(typeof drawCharacter==='function') drawCharacter((typeof activeCharId!=='undefined'?activeCharId:'gianni'), W/2, H*0.58, 90, 0, false);
  }
  introCaption('ONE HERO RISES TO STOP THEM.', t, 11.8, 14.2, H*0.86);
  introCaption('MISSION START', t, 14.0, 15.0, H*0.5);

  // fade to black at the very end, into the real game
  if(t>14.3){ cx.globalAlpha=Math.min(1,(t-14.3)/0.7); cx.fillStyle='#000'; cx.fillRect(0,0,W,H); cx.globalAlpha=1; }
  cx.restore();
}

// ---- world-select carousel (menu) ----
function worldLabel(i){
  if(gameMode==='practice') return 'TRAINING GROUNDS';
  if(gameMode==='challenger') return 'CHALLENGER · WORLD '+(i+1);
  return 'WORLD '+(i+1)+' · '+(i<=unlockedMax ? WORLDS[i].name : '??? LOCKED');
}
// per-world preview emblem shown on the Battle stage: world ground tones + its end-boss silhouette
const _emblemURL = {};
function worldEmblemURL(i){
  if(_emblemURL[i]) return _emblemURL[i];
  const w=WORLDS[i], sz=220, c=document.createElement('canvas'); c.width=c.height=sz;
  const g=c.getContext('2d'), th=w.theme;
  g.fillStyle=th.tile2; g.fillRect(0,0,sz,sz);
  g.fillStyle=th.tile1; const T=28;                                   // checker ground
  for(let y=0;y<sz;y+=T) for(let x=0;x<sz;x+=T) if(((x/T+y/T)&1)) g.fillRect(x,y,T,T);
  const bdef = w.bosses[w.bosses.length-1];                           // headliner = the world's end-boss
  const spr = bdef && SP[bdef.spr];
  if(spr){ const pad=spr._nom?spr.width/spr._nom:1, s=sz*0.72*pad, im=(w.enemyTint && tintedSprite(bdef.spr,w.enemyTint))||spr;
    g.drawImage(im, (sz-s)/2, (sz-s)/2+8, s, s); }
  const u=c.toDataURL(); _emblemURL[i]=u; return u;
}
let _trainingEmblemURL=null;
function trainingEmblemURL(){
  if(_trainingEmblemURL) return _trainingEmblemURL;
  const sz=220, c=document.createElement('canvas'); c.width=c.height=sz;
  const g=c.getContext('2d'), th=TRAINING_WORLD.theme;
  g.fillStyle=th.tile2; g.fillRect(0,0,sz,sz);
  g.fillStyle=th.tile1; const T=28;
  for(let y=0;y<sz;y+=T) for(let x=0;x<sz;x+=T) if(((x/T+y/T)&1)) g.fillRect(x,y,T,T);
  _trainingEmblemURL=c.toDataURL(); return _trainingEmblemURL;
}
function setStageEmblem(i){
  const img=$('charimg'); if(!img) return;
  img.src = gameMode==='practice' ? trainingEmblemURL() : worldEmblemURL(clamp(i,0,WORLDS.length-1));
}
function refreshWorldSel(){
  $('wname').textContent = worldLabel(selWorld);
  const ws=$('worldsub'); if(ws) ws.textContent = gameMode==='practice' ? 'sandbox · no rewards' : 'the italian invasion';
  $('wprev').disabled = selWorld<=0 || gameMode==='practice';
  $('wnext').disabled = gameMode==='practice' || selWorld>=(gameMode==='challenger' ? chalUnlocked : unlockedMax);
  setStageEmblem(selWorld);
}
function triggerUnlockReveal(){
  refreshWorldSel();
  const el=$('worldsel'); if(el){ el.classList.remove('reveal'); void el.offsetWidth; el.classList.add('reveal'); }
  bigText('NEW WORLD UNLOCKED','#ffd24a');
}

// ---- rarity tiers: lower weight = rarer in the level-up draw (appearance-only) ----
const RARITY = {
  common:    { w:100, label:'COMMON' },
  uncommon:  { w:88,  label:'UNCOMMON' },
  rare:      { w:70,  label:'RARE' },
  epic:      { w:50,  label:'EPIC' },
  legendary: { w:34,  label:'LEGENDARY' },
  mythic:    { w:18,  label:'MYTHIC' },
};
// ---- card pool: passives level to a cap; abilities take 4 levels, then EVOLVE on the 5th pick ----
// rarity: tier (appearance + draw odds). req:[ids] = synergy card, hidden until those cards are owned.
const UPGRADES = [
  // passives
  { id:'dmg',    name:'Brute Force',     icon:'coin',     rarity:'common', cap:5, steps:[{desc:'+25% damage.',          f:()=>P.dmg*=1.25}] },
  { id:'rate',   name:'Adrenaline Rush', icon:'gem',      rarity:'common', cap:5, steps:[{desc:'+18% attack speed.',    f:()=>P.fireRate*=0.82}] },
  { id:'static', name:'Static Charge',  icon:'gem',      rarity:'common', cap:5, minWorld:1, steps:[{desc:'+10% attack speed.',    f:()=>P.fireRate*=0.90}] },
  { id:'speed',  name:'Fleet Footed',    icon:'heart',    rarity:'common', cap:5, steps:[{desc:'+12% movement speed.',  f:()=>P.speed*=1.12}] },
  { id:'hp',     name:'Vitality Essence',icon:'heart',    rarity:'common', cap:5, steps:[{desc:'+25 max HP, full heal.',f:()=>{P.maxHp+=25;P.hp=P.maxHp;}}] },
  { id:'magnet', name:'Magnetic Pulse',  icon:'gem',      rarity:'common', cap:5, steps:[{desc:'+40% item pickup radius.',f:()=>P.magnet*=1.4}] },
  { id:'armor',  name:'Iron Skin',       icon:'turtle',   rarity:'common', cap:5, steps:[{desc:'-7% damage taken.',     f:()=>P.armor*=0.93}] },
  { id:'regen',  name:'Regeneration',    icon:'heart',    rarity:'common', cap:5, steps:[{desc:'recover +1 HP / second.',f:()=>P.regen+=1}] },
  { id:'heavy',  name:'Heavy Rounds',    icon:'coin',     rarity:'common', cap:5, steps:[{desc:'+15% bullet size & +8% projectile speed.',f:()=>{P.bulletR*=1.15;P.bulletSpd*=1.08;}}] },
  { id:'thick',  name:'Thick Skin',      icon:'heart',    rarity:'common', cap:5, steps:[{desc:'+15 max HP.',           f:()=>P.maxHp+=15}] },
  { id:'luckycharm', name:'Lucky Charm', icon:'coin',     rarity:'common', cap:5, minWorld:0, steps:[{desc:'+5% crit chance (3x dmg).',f:()=>P.crit=Math.min(0.8,P.crit+0.05)}] },
  { id:'crit',   name:'Critical Strike', icon:'coin',     rarity:'uncommon',cap:5,steps:[{desc:'+10% crit chance (3x dmg).',f:()=>P.crit=Math.min(0.8,P.crit+0.10)}] },
  { id:'dashcd', name:'Quick Reflexes',  icon:'tralalero',rarity:'uncommon',cap:5,steps:[{desc:'dash cooldown -20%.',   f:()=>P.dashMax*=0.8}] },
  { id:'critdmg',name:'Killer Instinct', icon:'coin',     rarity:'uncommon',cap:5,steps:[{desc:'+0.5x critical damage.',f:()=>P.critMul+=0.5}] },
  { id:'gold',   name:'Treasure Hunter', icon:'coin',     rarity:'uncommon',cap:5,steps:[{desc:'+20% gold & +12% XP.',  f:()=>{P.goldMul*=1.2;P.xpMul*=1.12;}}] },
  { id:'steady', name:'Steady Hands',    icon:'gem',      rarity:'uncommon',cap:5,steps:[{desc:'-15% bullet spread & +6% damage.',f:()=>{P.spread*=0.85;P.dmg*=1.06;}}] },
  { id:'frenzy', name:'Killing Frenzy',  icon:'tiger',    rarity:'rare',   cap:5, steps:[{desc:'each kill: +0.2% damage & fire rate, up to 100 stacks. Fades when you stop killing.',f:()=>{P.frenzyGain+=1;P.frenzyMax=Math.max(P.frenzyMax,100);}}] },
  { id:'glass',  name:'Glass Cannon',    icon:'cappuccino',rarity:'epic',  cap:3, steps:[{desc:'+35% damage, but -15 max HP.',f:()=>{P.dmg*=1.35;if(!P.glassSafe){P.maxHp=Math.max(20,P.maxHp-15);P.hp=Math.min(P.hp,P.maxHp);}}}] },

  // 🔮 abilities — 4 levels, then EVOLVE
  { id:'multi', name:'Splinter Shot', icon:'gembig', rarity:'rare',
    steps:[{desc:'+1 projectile.',f:()=>P.shots+=1},{desc:'+1 projectile.',f:()=>P.shots+=1},{desc:'+1 projectile.',f:()=>P.shots+=1},{desc:'+1 projectile.',f:()=>P.shots+=1}],
    evo:{name:'Omni-Barrage', icon:'gembig', desc:'EVOLVE — fires a full 360° ring of projectiles.', f:()=>{P.shots+=2;P.radial=true;}} },
  { id:'pierce', name:'Piercing Rounds', icon:'crocodilo', rarity:'rare',
    steps:[{desc:'pierce +1 enemy.',f:()=>P.pierce+=1},{desc:'pierce +1 enemy.',f:()=>P.pierce+=1},{desc:'pierce +1 enemy.',f:()=>P.pierce+=1},{desc:'pierce +1 enemy.',f:()=>P.pierce+=1}],
    evo:{name:'Hyper-Velocity Core', icon:'crocodilo', desc:'EVOLVE — infinite pierce, faster & larger cyan shots.', f:()=>{P.pierce=999;P.railgun=true;}} },
  { id:'turret', name:'Walking Turret', icon:'gembig', rarity:'epic',
    steps:[
      {desc:'Deploy a walking turret that follows behind your pet: fires the closest enemy for 10% of your damage, at default range & fire rate.', f:()=>{ P.turretCount=Math.max(1,P.turretCount||0); P.turretDmgBase=P.dmg*0.10; }},
      {desc:'Turret fires 20% faster and hits 30% harder.', f:()=>{ P.turretFireMul=(P.turretFireMul||1)*1.2; P.turretDmgMul=(P.turretDmgMul||1)*1.3; }},
      {desc:'+1 turret.', f:()=>{ P.turretCount=(P.turretCount||1)+1; }},
    ],
    evo:{name:'Turret Network', icon:'gembig', desc:'EVOLVE — +range, and turrets now scale with your current damage & range upgrades.', f:()=>{ P.turretRangeBonus=(P.turretRangeBonus||0)+130; P.turretAdaptive=true; }} },
  { id:'range', name:'Focal Lens', icon:'gem', rarity:'uncommon',
    steps:[{desc:'+20% attack range.',f:()=>P.range*=1.2},{desc:'+20% attack range.',f:()=>P.range*=1.2},{desc:'+20% attack range.',f:()=>P.range*=1.2},{desc:'+20% attack range.',f:()=>P.range*=1.2}],
    evo:{name:'Farsight Sniper', icon:'coin', desc:'EVOLVE — maximum range and +50% damage.', f:()=>{P.range*=1.8;P.dmg*=1.5;}} },
  { id:'orbit', name:'Orbiting Barrier', icon:'gembig', rarity:'epic',
    steps:[{desc:'+1 orbiting projectile.',f:()=>P.orbs+=1},{desc:'+1 orbiting projectile.',f:()=>P.orbs+=1},{desc:'+1 orbiting projectile.',f:()=>P.orbs+=1},{desc:'+1 orbiting projectile.',f:()=>P.orbs+=1}],
    evo:{name:'Guardian Shield', icon:'gembig', desc:'EVOLVE — extra orb that destroys incoming bullets.', f:()=>{P.orbs+=1;P.orbShield=true;}} },
  { id:'nova', name:'Pulse Wave', icon:'gembig', rarity:'legendary',
    steps:[{desc:'every 5s, a shockwave hits nearby enemies.',f:()=>{P.nova=true;}},{desc:'shockwave: faster + stronger.',f:()=>{P.novaCdBase=Math.max(3.5,P.novaCdBase-0.6);P.novaPow*=1.35;}},{desc:'shockwave: faster + stronger.',f:()=>{P.novaCdBase=Math.max(3.2,P.novaCdBase-0.6);P.novaPow*=1.35;}},{desc:'shockwave: faster + stronger.',f:()=>{P.novaCdBase=Math.max(3.0,P.novaCdBase-0.6);P.novaPow*=1.35;}}],
    evo:{name:'Nova Cataclysm', icon:'gembig', desc:'EVOLVE — massive fast shockwave that clears nearby bullets.', f:()=>{P.nova=true;P.novaEvo=true;P.novaCdBase=3;P.novaPow*=1.5;}} },
  { id:'vamp', name:'Soul Harvest', icon:'heart', rarity:'epic',
    steps:[{desc:'heal +1 HP per kill.',f:()=>P.vamp+=1},{desc:'heal +1 HP per kill.',f:()=>P.vamp+=1},{desc:'heal +1 HP per kill.',f:()=>P.vamp+=1},{desc:'heal +1 HP per kill.',f:()=>P.vamp+=1}],
    evo:{name:'Vampiric Feast', icon:'heart', desc:'EVOLVE — restore a massive chunk of HP per kill.', f:()=>{P.vamp+=4;}} },
  { id:'slow', name:'Stasis Field', icon:'gem', rarity:'rare',
    steps:[{desc:'enemy projectiles 12% slower.',f:()=>P.bslow*=0.88},{desc:'enemy projectiles 12% slower.',f:()=>P.bslow*=0.88},{desc:'enemy projectiles 12% slower.',f:()=>P.bslow*=0.88},{desc:'enemy projectiles 12% slower.',f:()=>P.bslow*=0.88}],
    evo:{name:'Glacial Freeze', icon:'gem', desc:'EVOLVE — enemies you hit freeze solid.', f:()=>{P.bslow*=0.7;P.freeze=true;}} },
  { id:'aegis', name:'Aegis Bubble', icon:'gembig', rarity:'epic',
    steps:[{desc:'gain a shield that blocks a hit, recharging over time.',f:()=>{P.shieldMax+=1;P.shield=P.shieldMax;}},
           {desc:'shield recharges faster.',f:()=>{P.shieldCdBase=Math.max(5,P.shieldCdBase-2);}},
           {desc:'+1 shield charge.',f:()=>{P.shieldMax+=1;P.shield=P.shieldMax;}},
           {desc:'shield recharges faster.',f:()=>{P.shieldCdBase=Math.max(3.5,P.shieldCdBase-1.5);}}],
    evo:{name:'Aegis Fortress', icon:'gembig', desc:'EVOLVE — blocking erupts in a shockwave; +permanent damage reduction.', f:()=>{P.shieldMax+=1;P.shield=P.shieldMax;P.aegisEvo=true;P.shieldDR=0.85;}} },
  { id:'blackhole', name:'Black Hole', icon:'octopus', rarity:'legendary', minWorld:1,
    steps:[{desc:'periodically spawn a black hole that pulls & grinds enemies.',f:()=>{P.bhole=true;}},
           {desc:'black hole strikes more often & hits harder.',f:()=>{P.bholeCdBase=Math.max(4,P.bholeCdBase-1.5);P.bholeDmg+=8;}},
           {desc:'black hole grows larger & stronger.',f:()=>{P.bholeR+=40;P.bholeDmg+=8;}},
           {desc:'black hole strikes more often & lingers.',f:()=>{P.bholeCdBase=Math.max(3,P.bholeCdBase-1.5);P.bholeLife+=0.6;}}],
    evo:{name:'Singularity', icon:'octopus', desc:'EVOLVE — bigger, longer, and devours enemy bullets.', f:()=>{P.bhole=true;P.bholeEvo=true;P.bholeR+=50;P.bholeDmg+=14;P.bholeLife+=0.8;}} },
  { id:'phoenix', name:'Phoenix Heart', icon:'flamingo', rarity:'legendary', minWorld:1,
    steps:[{desc:'revive once on death in an explosive rebirth (recharges slowly).',f:()=>{P.phoenixMax+=1;P.phoenix=P.phoenixMax;}},
           {desc:'revive heals more & recharges faster.',f:()=>{P.phoenixHeal+=0.2;P.phoenixCdBase=Math.max(30,P.phoenixCdBase-10);}},
           {desc:'gain a burning aura that scorches nearby foes.',f:()=>{P.burnAura+=8;}},
           {desc:'revive recharges faster.',f:()=>{P.phoenixCdBase=Math.max(20,P.phoenixCdBase-10);}}],
    evo:{name:'Eternal Phoenix', icon:'flamingo', desc:'EVOLVE — full-HP rebirth, a huge nuke, and a permanent burn aura.', f:()=>{P.phoenixMax+=1;P.phoenix=P.phoenixMax;P.phoenixEvo=true;P.phoenixHeal=1;P.burnAura+=14;P.phoenixCdBase=Math.max(15,P.phoenixCdBase-8);}} },

  // 🆕 World 1 additions — more early-game variety
  { id:'seeker', name:'Seeker Rounds', icon:'gembig', rarity:'uncommon', cap:4, minWorld:0,
    steps:[{desc:'your shots curve toward enemies. (+homing per level)',f:()=>P.seeker=(P.seeker||0)+1}] },
  { id:'laststand', name:'Last Stand', icon:'tiger', rarity:'uncommon', cap:5, minWorld:0,
    steps:[{desc:'+14% damage while below 40% HP. (+14% per level)',f:()=>P.laststand=(P.laststand||0)+1}] },

  // 🆕 World 5 additions — more late-game variety
  { id:'daredevil', name:'Daredevil', icon:'tiger', rarity:'rare', cap:5, minWorld:4,
    steps:[{desc:'+9% crit chance while a foe is point-blank. (+9% per level)',f:()=>P.daredevil=(P.daredevil||0)+1}] },
  { id:'knives', name:'Knife Circus', icon:'crocodilo', rarity:'epic', minWorld:4,
    steps:[
      {desc:'every 3.5s, fling a spinning ring of knives outward.',f:()=>{P.knives=true;P.knifeCdBase=3.5;P.knifeN=(P.knifeN||0)+8;}},
      {desc:'more knives, thrown more often.',                     f:()=>{P.knifeN=(P.knifeN||8)+4;P.knifeCdBase=3.0;}},
      {desc:'more knives, thrown more often.',                     f:()=>{P.knifeN=(P.knifeN||12)+4;P.knifeCdBase=2.5;}},
      {desc:'more knives, larger.',                                f:()=>{P.knifeN=(P.knifeN||16)+4;P.knifeBig=true;}},
    ],
    evo:{name:'Blade Tornado', icon:'crocodilo',
         desc:'EVOLVE — a constant whirl of knives that pierces everything.',
         f:()=>{P.knives=true;P.knifeEvo=true;P.knifeN=(P.knifeN||20)+8;P.knifeCdBase=1.2;P.knifeBig=true;}} },

  // 🌍 WORLD-EXCLUSIVE abilities — only enter the draw from a given world onward (minWorld, 0-indexed)
  { id:'tremor', name:'Tremor Rounds', icon:'crocodilo', rarity:'rare', cap:5, minWorld:1,
    steps:[{desc:'your bullet hits send out a small ground shock (+more per level).',f:()=>{P.tremor=(P.tremor||0)+1;}}] },
  { id:'aftershock', name:'Aftershock', icon:'rhino', rarity:'epic', cap:5, minWorld:1,
    steps:[{desc:'kills have a chance to erupt a damaging quake zone (+chance per level).',f:()=>{P.aftershock=(P.aftershock||0)+1;}}] },
  { id:'gravcrush', name:'Gravity Crush', icon:'octopus', rarity:'legendary', minWorld:2,
    steps:[{desc:'periodically implode a gravity well that yanks & grinds enemies.',f:()=>{P.gravcrush=true;}},
           {desc:'crush strikes more often & hits harder.',f:()=>{P.gravCdBase=Math.max(4,P.gravCdBase-1.5);P.gravDmg+=10;}},
           {desc:'crush grows larger & lingers.',f:()=>{P.gravR+=50;P.gravLife+=0.6;}},
           {desc:'crush strikes more often.',f:()=>{P.gravCdBase=Math.max(3,P.gravCdBase-1);}}],
    evo:{name:'Event Singularity', icon:'octopus', desc:'EVOLVE — huge crush that also devours enemy bullets.', f:()=>{P.gravcrush=true;P.gravEvo=true;P.gravR+=60;P.gravDmg+=18;P.gravLife+=0.8;}} },
  { id:'abyssal', name:'Abyssal Pact', icon:'gembig', rarity:'epic', cap:5, minWorld:2,
    steps:[{desc:'+6% damage for every enemy near you (caps high). The swarm feeds you.',f:()=>{P.abyssal=(P.abyssal||0)+1;}}] },
  // 🍊 World 2 (CITRUS COAST) cards
  { id:'thorns', name:'Spiky Peel', icon:'turtle', rarity:'uncommon', cap:5, minWorld:1,
    steps:[{desc:'enemies that touch you take damage.',f:()=>P.thorns+=6}] },
  { id:'ricochet', name:'Ricochet', icon:'gembig', rarity:'rare', minWorld:1,
    steps:[{desc:'your shots ricochet to a nearby enemy.',f:()=>P.ricochet+=1},
           {desc:'+1 ricochet bounce.',f:()=>P.ricochet+=1},
           {desc:'+1 ricochet bounce.',f:()=>P.ricochet+=1},
           {desc:'+1 ricochet bounce.',f:()=>P.ricochet+=1}],
    evo:{name:'Chain Reaction', icon:'gembig', desc:'EVOLVE — ricochets reach far and hit much harder.', f:()=>{P.ricochet+=2;P.ricochetEvo=true;}} },

  // 🌿 World 3 (FORESTA FRUTOSA) cards
  { id:'chain', name:'Explosive Shot', icon:'gembig', rarity:'rare', minWorld:2,
    steps:[
      {desc:'Ignites enemies on hit (3s fire, 10% dmg/tick).',  f:()=>{P.chain=(P.chain||0)+1;}},
      {desc:'Fire spreads to 1 nearby enemy on ignition.',       f:()=>{P.chain=(P.chain||0)+1;}},
      {desc:'Fire spreads to 2 nearby enemies.',                 f:()=>{P.chain=(P.chain||0)+1;}},
      {desc:'Fire spreads to 3 nearby enemies.',                 f:()=>{P.chain=(P.chain||0)+1;}},
    ],
    evo:{name:'Wildfire', icon:'gembig',
         desc:'EVOLVE — fire spreads to ALL nearby enemies and burns for 5s.',
         f:()=>{P.chain=(P.chain||0)+2; P.chainEvo=true;}} },

  { id:'boomerang', name:'Boomerang Croc', icon:'crocodilo', rarity:'epic', minWorld:2,
    steps:[
      {desc:'every 7s, a croc flies out and returns, piercing all.',f:()=>{P.boomerang=true;P.boomCd=7;P.boomCdBase=7;P.boomN=(P.boomN||0)+1;}},
      {desc:'2 crocs; 6s cooldown.',                               f:()=>{P.boomN=(P.boomN||1)+1;P.boomCdBase=6;}},
      {desc:'3 crocs; 5s cooldown.',                               f:()=>{P.boomN=(P.boomN||2)+1;P.boomCdBase=5;}},
      {desc:'3 crocs; 4s cooldown, larger.',                       f:()=>{P.boomCdBase=4;P.boomR=(P.boomR||8)*1.2;}},
    ],
    evo:{name:'Croc Pack', icon:'crocodilo',
         desc:'EVOLVE — 4 crocs orbit you permanently, auto-attacking the nearest foe every 1s.',
         f:()=>{P.boomEvo=true;P.boomN=4;}} },

  { id:'execute', name:'Executioner', icon:'coin', rarity:'uncommon', cap:5, minWorld:2,
    steps:[{desc:'enemies below 15% HP die instantly on your hits. (+3% per level)',
            f:()=>P.execute=(P.execute||0.12)+0.03}] },

  { id:'secondwind', name:'Second Wind', icon:'heart', rarity:'legendary', cap:3, minWorld:2,
    steps:[
      {desc:'once (60s recharge): a killing blow leaves you at 1 HP + 2.5s invuln + bullet clear.',
       f:()=>{P.secondWind=(P.secondWind||0)+1;P.swCdBase=60;P.swCd=0;}},
      {desc:'2 charges; recharges faster (45s).',f:()=>{P.secondWind=(P.secondWind||0)+1;P.swCdBase=45;}},
      {desc:'3 charges; 35s recharge.',          f:()=>{P.secondWind=(P.secondWind||0)+1;P.swCdBase=35;}},
    ]},

  // ✨ W3 synergy
  { id:'chainstorm', name:'Chain Storm', icon:'gembig', rarity:'epic', cap:1, req:['chain','nova'],
    steps:[{desc:'SYNERGY — each Explosive Shot ignition also detonates a fire ring burst.',
            f:()=>P.chainNova=true}] },

  // ❄️ World 4 (GELATO GLACIER) cards
  { id:'permafrost', name:'Permafrost', icon:'gem', rarity:'uncommon', cap:5, minWorld:3,
    steps:[{desc:'your hits chill enemies, slowing them. (+duration per level)',f:()=>P.chillHit=(P.chillHit||0)+1}] },
  { id:'coldblood', name:'Cold Blooded', icon:'coin', rarity:'uncommon', cap:5, minWorld:3,
    steps:[{desc:'+12% damage to chilled or frozen enemies. (+12% per level)',f:()=>P.coldBlood=(P.coldBlood||0)+1}] },
  { id:'frostbloom', name:'Frost Bloom', icon:'gembig', rarity:'rare', minWorld:3,
    steps:[
      {desc:'every 6s, bloom a frost field that slows & damages nearby foes.',f:()=>{P.frostBloom=true;}},
      {desc:'frost field: larger & blooms more often.',                       f:()=>{P.fbR+=30;P.fbCdBase=Math.max(4.5,P.fbCdBase-0.7);}},
      {desc:'frost field: stronger.',                                         f:()=>{P.fbDps+=6;P.fbR+=20;}},
      {desc:'frost field: larger & blooms more often.',                       f:()=>{P.fbR+=30;P.fbCdBase=Math.max(3.5,P.fbCdBase-0.7);P.fbDps+=4;}},
    ],
    evo:{name:'Eternal Winter', icon:'gembig',
         desc:'EVOLVE — a huge, lasting blizzard that freezes foes solid.',
         f:()=>{P.frostBloom=true;P.frostBloomEvo=true;P.fbR+=50;P.fbDps+=10;P.fbCdBase=Math.max(3,P.fbCdBase-1);}} },
  { id:'glacierheart', name:'Glacier Heart', icon:'gem', rarity:'epic', cap:1, req:['frostbloom','permafrost'],
    steps:[{desc:'SYNERGY — your frost fields freeze enemies solid, not just slow them.',f:()=>P.glacierHeart=true}] },

  // 🎪 World 5 (CIRCO BRAINROTTO) cards
  { id:'luckyspin', name:'Lucky Spin', icon:'coin', rarity:'uncommon', cap:5, minWorld:4,
    steps:[{desc:'+6% chance per level for a JACKPOT hit (double damage).',f:()=>P.jackpot=(P.jackpot||0)+0.06}] },
  { id:'bouncy', name:'Bouncy Shot', icon:'gembig', rarity:'rare', minWorld:4,
    steps:[
      {desc:'your shots bounce off walls once.',f:()=>{P.bounce=Math.max(P.bounce||0,1);}},
      {desc:'+1 wall bounce.',                  f:()=>{P.bounce=(P.bounce||0)+1;}},
      {desc:'+1 wall bounce.',                  f:()=>{P.bounce=(P.bounce||0)+1;}},
      {desc:'+1 wall bounce & larger shots.',   f:()=>{P.bounce=(P.bounce||0)+1;P.bulletR*=1.15;}},
    ],
    evo:{name:'Pinball Wizard', icon:'gembig',
         desc:'EVOLVE — shots ricochet many times around the arena, hitting again each bounce.',
         f:()=>{P.bounce=(P.bounce||0)+4;P.bulletR*=1.2;P.pinball=true;}} },
  { id:'showstopper', name:'Showstopper', icon:'coin', rarity:'epic', cap:1, req:['luckyspin','crit'],
    steps:[{desc:'SYNERGY — JACKPOT hits also critically strike.',f:()=>P.showstopper=true}] },

  { id:'auramonster', name:'Aura Monster', icon:'gembig', rarity:'rare', minWorld:1, cap:3,
    steps:[
      {desc:'gain a green damage aura around you.', f:()=>{P.auraR=70; P.auraDmg=8;}},
      {desc:'aura grows bigger.',                   f:()=>{P.auraR+=30;}},
      {desc:'aura grows bigger and hits harder.',   f:()=>{P.auraR+=30; P.auraDmg+=10;}},
    ] },
  { id:'skibidi', name:'Skibidi Toilet', icon:'gembig', rarity:'epic', minWorld:3,
    steps:[
      {desc:'summons toilets that bounce off the map edges 6 times before vanishing, reappearing after 10s.', f:()=>{P.skibidiCount=1; P.skibidiBounces=6;}},
      {desc:'bounces more before vanishing.',         f:()=>{P.skibidiBounces+=4;}},
      {desc:'+1 Skibidi Toilet.',                      f:()=>{P.skibidiCount+=1;}},
      {desc:'+1 Skibidi Toilet.',                      f:()=>{P.skibidiCount+=1;}},
    ],
    evo:{name:'Eternal Skibidi', icon:'gembig', desc:'EVOLVE — Skibidi Toilets never disappear.', f:()=>{P.skibidiNeverDie=true;}} },

  // ✨ SYNERGY cards — hidden until you own the prerequisite cards (req)
  { id:'frostfire', name:'Frostfire Core', icon:'gem', rarity:'epic', cap:1, req:['slow','nova'],
    steps:[{desc:'SYNERGY — Nova does +120% to frozen foes, who shatter into shards on death.',f:()=>P.frostfire=true}] },
  { id:'eventhz', name:'Event Horizon', icon:'octopus', rarity:'legendary', cap:1, req:['blackhole','nova'],
    steps:[{desc:'SYNERGY — black holes detonate in a Nova blast when they collapse.',f:()=>P.holeNova=true}] },
  { id:'bloodcrit', name:'Blood Crit', icon:'heart', rarity:'epic', cap:1, req:['vamp','crit'],
    steps:[{desc:'SYNERGY — critical hits also heal you for +2 HP.',f:()=>P.critHeal+=2}] },
  { id:'glassphx', name:'Glass Phoenix', icon:'flamingo', rarity:'legendary', cap:1, req:['glass','phoenix'],
    steps:[{desc:'SYNERGY — Glass Cannon stops costing max HP, and revivals restore full HP.',f:()=>{P.glassSafe=true;P.phoenixHeal=1;}}] },
  { id:'orbstorm', name:'Orbital Storm', icon:'gembig', rarity:'epic', cap:1, req:['orbit','multi'],
    steps:[{desc:'SYNERGY — your orbiting barriers periodically fire shots outward.',f:()=>P.orbShoot=true}] },
  { id:'overdrive', name:'Overdrive', icon:'tiger', rarity:'epic', cap:1, req:['rate','frenzy'],
    steps:[{desc:'SYNERGY — +50% Frenzy stack cap, and each stack adds crit chance.',f:()=>{P.overdrive=true;P.frenzyMax=Math.round(P.frenzyMax*1.5);}}] },
  { id:'aegisnova', name:'Aegis Nova', icon:'gembig', rarity:'epic', cap:1, req:['aegis','nova'],
    steps:[{desc:'SYNERGY — blocking a hit also unleashes your Nova.',f:()=>P.aegisNova=true}] },
];
// give every upgrade (and its evolved form) its own custom icon sprite (ab_<id>)
for(const u of UPGRADES){ const ic='ab_'+u.id; if(SP[ic]){ u.icon=ic; if(u.evo) u.evo.icon=ic; } }
// ---- card unlock schedule: each world introduces new options (0-indexed world). ----
// Synergy cards (frostfire/eventhz/...) keep their req-gating and stay available from W1.
const CARD_MINWORLD = {
  dmg:0, rate:0, speed:0, hp:0, magnet:0, armor:0,
  multi:1, range:1, orbit:0, crit:0, seeker:0, laststand:0, turret:0,   // World 1 now offers far more variety
  heavy:2, regen:2, gold:2, dashcd:2,
  pierce:3, slow:3, critdmg:3, steady:3,
  vamp:4,
  nova:5, thick:5, frenzy:5,
  aegis:6, tremor:6, glass:6,
  blackhole:7, aftershock:7,
  phoenix:8, gravcrush:8,
  abyssal:9,
  // World 3
  chain:2, boomerang:2, execute:2, secondwind:2, chainstorm:2,
  // World 4
  permafrost:3, coldblood:3, frostbloom:3, glacierheart:3,
  // World 5
  luckyspin:4, bouncy:4, showstopper:4, daredevil:4, knives:4,
};
for(const u of UPGRADES){ if(CARD_MINWORLD[u.id]!=null) u.minWorld = CARD_MINWORLD[u.id]; }
// returns the next card "move" for an upgrade, or null if exhausted
function nextMove(u){
  const lvl = P.up[u.id]||0;
  if(u.evo){
    const n = u.steps.length;
    if(lvl < n) return { apply:u.steps[lvl].f, name:u.name, icon:u.icon, desc:u.steps[lvl].desc, label:'Lv '+(lvl+1), evolve:false, rare:u.rare };
    if(lvl === n) return { apply:u.evo.f, name:u.evo.name, icon:u.evo.icon||u.icon, desc:u.evo.desc, label:'EVOLVE', evolve:true, rare:u.rare };
    return null;
  }
  if(lvl >= (u.cap||5)) return null;
  const si = Math.min(lvl, u.steps.length-1);   // supports cards with several distinct non-evolving steps, not just one repeated step
  return { apply:u.steps[si].f, name:u.name, icon:u.icon, desc:u.steps[si].desc, label:'Lv '+(lvl+1), evolve:false, rare:u.rare };
}

function resetPlayer(){
  Object.assign(P, {
    x:WORLD.w/2, y:WORLD.h/2, r:18, hp:100, maxHp:100, speed:200,
    dmg:10, fireRate:0.32, fireCd:0, shots:1, pierce:0, range:330,
    magnet:90, crit:0.05, orbs:0, orbA:0, orbR:96, nova:false, novaCd:5, novaCdBase:5, novaPow:1,
    vamp:0, bslow:1, lv:1, xp:0, xpNext:4, inv:0, up:{}, slowT:0,
    face:0, walk:0, dashCd:0, dashMax:2.2, dashT:0, dvx:0, dvy:0,
    radial:false, railgun:false, orbShield:false, novaEvo:false, freeze:false,
    critMul:3, frenzy:0, frenzyGain:0, frenzyMax:0,
    shield:0, shieldMax:0, shieldCd:0, shieldCdBase:8, shieldDR:1, aegisEvo:false,
    bhole:false, bholeCd:0, bholeCdBase:7, bholeR:120, bholeDmg:18, bholeLife:2, bholeEvo:false,
    phoenix:0, phoenixMax:0, phoenixCd:0, phoenixCdBase:45, phoenixHeal:0.5, phoenixEvo:false, burnAura:0,
    armor:1, regen:0, bulletR:1, bulletSpd:1, goldMul:1, xpMul:1, spread:1,
    frostfire:false, holeNova:false, critHeal:0, glassSafe:false, orbShoot:false, orbShootCd:0, overdrive:false, aegisNova:false,
    // world-exclusive abilities
    tremor:0, aftershock:0, abyssal:0, abyssalMul:1,
    thorns:0, ricochet:0, ricochetEvo:false,   // World 2: Spiky Peel / Ricochet
    gravcrush:false, gravCd:0, gravCdBase:7, gravR:130, gravDmg:20, gravLife:2, gravEvo:false,
    // World 3: FORESTA FRUTOSA
    chain:0, chainEvo:false, chainHeal:0, chainNova:false,
    boomerang:false, boomCd:0, boomCdBase:7, boomN:0, boomR:8, boomEvo:false, boomT:0,
    execute:0,
    secondWind:0, swCdBase:60, swCd:0,
    // World 4: GELATO GLACIER
    chillHit:0, coldBlood:0,
    frostBloom:false, frostBloomEvo:false, fbCd:0, fbCdBase:6, fbR:120, fbDps:10, glacierHeart:false,
    // World 5: CIRCO BRAINROTTO
    jackpot:0, bounce:0, pinball:false, showstopper:false,
    daredevil:0, knives:false, knifeCd:0, knifeCdBase:3.5, knifeN:0, knifeBig:false, knifeEvo:false,
    // World 1 additions
    seeker:0, laststand:0,
    turretCount:0, turretDmgBase:0, turretDmgMul:1, turretFireMul:1, turretRangeBase:330, turretRangeBonus:0, turretAdaptive:false,
    // Character / pet system
    charId:(typeof activeCharId!=='undefined'?activeCharId:'gianni'),
    petId:(typeof activePetId!=='undefined'?activePetId:null),
    petX:WORLD.w/2-36, petY:WORLD.h/2, petWalk:0,
    // Fortunato flags — must be reset so switching away clears them
    luckyBullets:false, noCrit:false, luckyXpOnly:false, luckyBlockDmgMul:1, gearDmgMul:1,
    hasMagnetPet:false,
    bannedCards:null,
    fortunatoLuckyCap:5,
    trueDmg:false,
    soldierStill:false, soldierBullets:false,
    noCards:false, whiteBullets:false, stealthAggro:false, ghostBullets:false,
    auraR:0, auraDmg:0,
    skibidiCount:0, skibidiBounces:6, skibidiNeverDie:false
  });
  skibidiBullets.length=0; skibidiTimers.length=0;
  turrets.length=0;
}

function startGame(idx){
  const wi = Number.isInteger(idx) ? idx : selWorld;
  const wl=$('worldload'), wlt=$('worldloadtxt');
  if(wl){
    if(wlt) wlt.textContent = 'entering ' + (WORLDS[wi]?.name||'world').toLowerCase() + '…';
    wl.classList.remove('hidden');
    setTimeout(()=>{ _doStartGame(wi); wl.classList.add('hidden'); }, 550);
  } else { _doStartGame(wi); }
}
function _doStartGame(wi){
  loadWorld(wi);
  if(infiniteMapMode()){ WORLD.w=999999; WORLD.h=999999; }   // effectively infinite; ground drawn per-frame
  initAudio();
  playMusic(curTheme.music);
  resetPlayer();
  // Character base stats first — so gear builds on top of the character's foundation
  if(typeof clearHooks==='function') clearHooks();
  if(typeof applyCharBase==='function') applyCharBase(P.charId);
  // Gear applies on top; gearDmgMul lets characters reduce gear's dmg contribution
  if(typeof equippedFlatDmg==='function')   P.dmg   += equippedFlatDmg() * (P.gearDmgMul||1);
  if(typeof equippedHp==='function'){ const h=equippedHp(); P.maxHp += h; P.hp = P.maxHp; }
  if(typeof equippedSpeedMult==='function') P.speed *= equippedSpeedMult();
  if(typeof equippedRangeMult==='function') P.range *= equippedRangeMult();
  if(typeof registerActiveChar==='function') registerActiveChar();
  if(typeof registerActivePet==='function') registerActivePet();
  timeScale=1.0;
  bullets=[]; ebullets=[]; petBullets=[]; enemies=[]; gems=[]; parts=[]; texts=[]; zones=[]; holes=[]; luckies=[];
  wave=1; kills=0; elapsed=0; boss=null; waveGapT=0; arena=null; bossPending=0;
  luckyTimer=rand(18,30);
  worldCoins=0;
  chalElapsed=0; chalBossIdx=0; chalBossActive=false; chalLuckyT=5;
  { const ci=$('coincount'); if(ci){ const img=ci.querySelector('img'); if(img && !img.getAttribute('src')) img.src=SP['coin'].toDataURL(); } }
  refreshHUD();   // reset level badge / kills / timer / coins so nothing shows last run's value
  state=ST.PLAY;
  $('menu').classList.add('hidden');
  $('gameover').classList.add('hidden');
  $('bossbar').classList.add('hidden');
  $('hud').classList.remove('hidden');
  $('zoomctl').classList.remove('hidden');
  if(IS_TOUCH) $('dashbtn').classList.remove('hidden');   // mobile-only on-screen dash
  if(timerMode()) startChallengerSpawn(); else startWave();
}

function startWave(){
  betweenWaves=false;
  $('wavetag').textContent = 'WAVE '+wave;
  if(typeof fireHook==='function') fireHook('waveStart');
  if(wave % 5 === 0){ startBossArena(); waveEnemiesLeft = 0; }
  else { waveEnemiesLeft = Math.max(4, Math.round((7 + wave*3) * (curWorld().enemyMul||1))); spawnTimer = 0; sfx.wave();
    const luckyCap = Math.max(2, ...(typeof queryHook==='function' ? queryHook('getLuckyCap') : [2]));
    spawnLuckyBatch(luckyCap);
  }
  bigText(wave%5===0 ? 'BOSS WAVE' : 'WAVE '+wave, wave%5===0?'#e54d4d':'#ffe08a');
}

function startChallengerSpawn(){
  betweenWaves=false;
  waveEnemiesLeft=9999;
  spawnTimer=0;
  const nextSec=nextBossTimeSec();
  const nm=Math.floor(nextSec/60), ns=nextSec%60;
  $('wavetag').textContent='BOSS IN '+(nm>0?nm+':'+(ns<10?'0':'')+ns:ns+'s');
  sfx.wave();
  bigText(gameMode==='practice' ? 'TRAINING' : 'CHALLENGER', gameMode==='practice' ? '#4ad0c0' : '#ff5a70');
}

function chalWorldCleared(e){
  const prevChalUnlocked=chalUnlocked;
  chalUnlocked=Math.min(WORLDS.length-1, Math.max(chalUnlocked, worldIdx+1));
  localStorage.setItem('br_ch_unlocked', chalUnlocked); if(window.markDirty) window.markDirty();
  selWorld=Math.min(WORLDS.length-1, worldIdx+1);
  const gwKey='br_ch_gem_w'+worldIdx;
  let gemsEarned=0;
  if(!localStorage.getItem(gwKey) && typeof addGems==='function'){
    gemsEarned=15; addGems(15); localStorage.setItem(gwKey,'1');
    bigText('+15 ◆ GEMS','#b06ff0');
  }
  const newChars = typeof CHARACTERS!=='undefined'
    ? CHARACTERS.filter(c=>{
        if(c.rarity!=='world' && c.rarity!=='challenger') return false;
        const owned = typeof isCharOwned==='function' && isCharOwned(c.id);
        const hadStory  = c.worldUnlock!=null    && c.worldUnlock<=prevChalUnlocked;
        const hadChal   = c.chalWorldUnlock!=null && c.chalWorldUnlock<=prevChalUnlocked;
        if(owned||hadStory||hadChal) return false;
        const nowStory  = c.worldUnlock!=null    && c.worldUnlock<=chalUnlocked;
        const nowChal   = c.chalWorldUnlock!=null && c.chalWorldUnlock<=chalUnlocked;
        return nowStory || nowChal;
      })
    : [];
  _clearData={ worldNum:worldIdx+1, coins:worldCoins, gems:gemsEarned, newChars, isChallenger:true };
  if(newChars.length && typeof updateCharBadge==='function') updateCharBadge();
  state=ST.CUTSCENE;
  cut={ t:0, boss:e, alpha:1, fade:0, name:curWorld().name+' CHALLENGER' };
  e.cut=true; e.deathScale=1;
  enemies.length=0; enemies.push(e);
  ebullets=[]; bullets=[]; petBullets=[]; zones=[]; skibidiBullets.length=0; skibidiTimers.length=0;
  hitstop=0.25; shake=Math.max(shake,16);
  stopMusic(); sfx.win();
  bigText('CHALLENGER CLEARED','#ff5a70');
}

// lock the field into a small bounded arena around the player; boss arrives after a delay
function startBossArena(){
  // arena fits inside the world even in thin corridors (clamped to map width/height)
  const arenaSize = ARENA_SIZE * (gameMode==='challenger' ? CHAL_ARENA_MUL : 1);
  const aw = Math.min(arenaSize, WORLD.w-2*WALL), ah = Math.min(arenaSize, WORLD.h-2*WALL);
  const cxw = clamp(P.x, WALL+aw/2, WORLD.w-WALL-aw/2);
  const cyw = clamp(P.y, WALL+ah/2, WORLD.h-WALL-ah/2);
  arena = { x:cxw-aw/2, y:cyw-ah/2, w:aw, h:ah };
  luckies=[];                                // clear lucky blocks: they'd be stranded outside the arena
  bossPending = ARENA_LEAD;                  // no auto zoom-in on boss arrival — keep the player's current zoom
  const bw=$('bosswarn'); bw.textContent='BOSS INCOMING'; bw.classList.remove('hidden');
  sfx.warn();
}

function spawnRingDist(){ return Math.max(W,H)/Math.max(zoom,0.0001)*0.62 + 80; }   // world-space ring radius; scales with viewport so it stays off-screen on wide/zoomed-out monitors
function ringPos(){ // spawn point on a ring around player, clamped to world
  const a = rand(0,TAU), d = spawnRingDist();
  return { x: clamp(P.x+Math.cos(a)*d, WALL+30, WORLD.w-WALL-30),
           y: clamp(P.y+Math.sin(a)*d, WALL+30, WORLD.h-WALL-30) };
}

function spawnBoss(){
  const def = gameMode==='practice'
    ? curBosses[Math.floor(Math.random()*curBosses.length)]
    : curBosses[(Math.floor(wave/5)-1) % curBosses.length];
  const chalMul = gameMode==='challenger' ? 3.5 : 1;
  const mult = (1 + (wave-5)*0.12) * (curWorld().hpMul||1) * (1 + worldBand()*0.42) * chalMul;
  const p = arena ? { x:arena.x+arena.w/2, y:arena.y+arena.h*0.28 } : ringPos();
  const bar1 = def.hp*HP_MULT*mult, bar2 = (def.hp2||0)*HP_MULT*mult;
  const baseTotal = bar1+bar2;
  // each world's last boss = its FINAL boss: a beefed phase 3 whose HP alone tops phases 1+2 combined
  const bossIdx = ((Math.floor(wave/5)-1) % curBosses.length + curBosses.length) % curBosses.length;
  const isFinal = bossIdx === curBosses.length-1;
  const p3pool = isFinal ? baseTotal*1.5 : 0;     // phase 3 = 1.5x of phases 1+2 → "more than 1 and 2 combined"
  const total  = baseTotal + p3pool;
  boss = {
    spr:def.spr, name:def.name, pattern:def.pattern, mk:def.moveKey||def.spr,
    phased:def.phased, bars:isFinal?1:(def.bars||1), bar1, bar2,
    finalPhase:isFinal, ph2at:isFinal?(p3pool+baseTotal*0.5):0, ph3at:isFinal?p3pool:0, charging:0,
    gimmick:GIMMICK[def.moveKey||def.spr]||null, gT:1.5, gT2:2.5, gA:0,
    x:p.x, y:p.y, r:def.r,
    hp:total, maxHp:total,
    t:0, phase:0, isBoss:true, sp:46, xp:0, score:500, hitT:0, sq:0,
    mst:'recover', mt:1.0, mv:null, lastMv:null, vph:1, pull:0, spin:0, dst:'idle', iv:0,
    rollSpray:0, warpT:0, wd:null, gsweep:null, carpet:0, cbT:0, tether:0
  };
  if(boss.gimmick==='flank') boss.front=0.5;   // Pit Armor: front hits softened, so you must flank
  enemies.push(boss);
  if(def.duo){   // final-boss partner: own body + move cycle, shares the lead's HP pool
    const mate = {
      spr:def.duo, name:def.duo.toUpperCase(), mk:def.duo, partner:true, lead:boss,
      x:clamp(p.x+200,WALL+def.r,WORLD.w-WALL-def.r), y:p.y, r:def.r,
      hp:1, maxHp:1, t:0, phase:0, isBoss:true, sp:46, xp:0, score:0, hitT:0, sq:0, charging:0,
      gimmick:GIMMICK[def.duo]||null, gT:1.5, gT2:2.5, gA:0,
      mst:'recover', mt:1.6, mv:null, lastMv:null, vph:1, pull:0, spin:0, dst:'idle', iv:0,
      rollSpray:0, warpT:0, wd:null, gsweep:null, carpet:0, cbT:0, tether:0
    };
    enemies.push(mate); boss.mate=mate;
  }
  bossLuckyT = 20;                              // first periodic lucky batch ~20s into the fight
  if(isFinal) spawnBossLucky(1);               // final bosses: a lucky block at the start of phase 1
  // Challenger: much more aggressive — faster attacks, higher speed, hits harder
  if(gameMode==='challenger'){
    boss.gT  = (boss.gT  || 1.5) * 0.32;
    boss.gT2 = (boss.gT2 || 2.5) * 0.32;
    boss.sp  = (boss.sp  || 46)  * 1.5;
    boss.dmgBuff = 1.6;   // 60% more contact damage
    if(boss.mate){
      boss.mate.gT=(boss.mate.gT||1.5)*0.32; boss.mate.gT2=(boss.mate.gT2||2.5)*0.32;
      boss.mate.sp=(boss.mate.sp||46)*1.5; boss.mate.dmgBuff=1.6;
    }
  }
  sfx.boss();
  playMusic('boss'+(((Math.floor(wave/5)-1)%3+3)%3));   // a different loop per boss
  $('bossname').textContent = boss.name;
  $('bossfill').style.width = '100%';
  $('bossfill').style.background = '';   // reset to the default red (a prior final boss may have left it magenta)
  $('bossfill2').style.width = '100%';
  $('bossbar2').classList.toggle('hidden', boss.bars!==2);
  $('bossbar').classList.remove('hidden');
  const bw=$('bosswarn'); bw.textContent='BOSS!'; bw.classList.remove('hidden');
  setTimeout(()=>bw.classList.add('hidden'), 1700);
}

// returns false when the global cap is hit (so the caller keeps the wave's spawn budget for later)
function spawnEnemy(){
  const eCap = timerMode() ? (IS_TOUCH ? 90 : 150) : MAX_ENEMIES;
  if(enemies.length >= eCap) return false;     // global hard cap; challenger allows many more
  const maxIdx = Math.min(curFoes.length-1, Math.floor(wave/2));
  // count live specials so we can keep them few (earthquake + burst shooters especially)
  let nShoot=0, nHaz=0, nBurst=0;
  for(const o of enemies){ if(o.isBoss) continue; if(o._shooter)nShoot++; if(o._hazard)nHaz++; if(o._burst)nBurst++; }
  // hazard/burst/shooter caps stay the same in challenger so they don't overwhelm
  // 60% of spawns are the world's basic chasers (tier-I: low HP, melee, just follow you)
  const fodderMax = Math.min(maxIdx, 4);
  let def=null;
  for(let tries=0; tries<6; tries++){
    const c = (Math.random() < 0.6) ? curFoes[Math.floor(Math.random()*(fodderMax+1))]
                                    : curFoes[Math.floor(Math.random()*(maxIdx+1))];
    if(foeIsHazard(c)  && nHaz   >= MAX_HAZARD)   continue;
    if(foeIsBurst(c)   && nBurst >= MAX_BURST)    continue;
    if(foeIsShooter(c) && nShoot >= MAX_SHOOTERS) continue;
    def=c; break;
  }
  if(!def){                                            // all rolls were capped -> fall back to tier-I fodder
    def = curFoes[Math.floor(Math.random()*Math.min(5,curFoes.length))];
    if(foeIsShooter(def)) def = curFoes[0];
  }
  const p = ringPos();
  const special = foeIsSpecial(def);
  const hpMult = (1 + (wave-1)*0.07) * worldHpBand() * (curWorld().hpMul||1) * (special?SPECIAL_HP_BUFF:1);   // gentle per-wave growth + per-world band
  enemies.push({
    spr:def.spr, name:def.name, x:p.x, y:p.y, r:def.r,
    hp:def.hp*HP_MULT*hpMult, maxHp:def.hp*HP_MULT*hpMult,
    _shooter:foeIsShooter(def), _hazard:foeIsHazard(def), _burst:foeIsBurst(def),
    dmgBuff: special?SPECIAL_DMG_BUFF:1,                // buffy specials also hit harder on contact
    sp:def.sp*(1+wave*0.02), xp:def.xp, score:def.score, range:def.range, shoot:def.shoot, death:def.death,
    aoe:def.aoe, aoeCd:rand(1.5,3),
    dash:def.dash, dst:'idle', dcd:rand(2,4), da:0, dwin:0, ddur:0,
    shell:def.shell, shellCd:rand(3,5), iv:0,
    support:def.support, supCd:rand(2,3.5),
    // ---- World 2 (DIRT DEPTHS) fields ----
    front:def.front, kb:def.kb, pullAura:def.pullAura, trail:def.trail, trailT:0,
    cast:def.cast, castCd: def.cast ? rand(1.4,2.8) : 0,
    under: !!def.burrow, digT: def.burrow ? rand(0.7,1.3) : 0, spin:0,
    t:rand(0,TAU), wob:rand(2,4), shootCd:rand(1.5,4), frz:0, isBoss:false, hitT:0, sq:0, face:1
  });
}

// ============ FX ============
function burst(x,y,color,n=10,spd=160){
  for(let i=0;i<n;i++){
    const a=rand(0,TAU), s=rand(spd*0.3,spd);
    parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(0.25,0.6),max:0.6,color,r:rand(2,5)});
  }
}
// satisfying impact: quick expanding ring + round sparks + white flash core
function hitSpark(x,y,color,crit){
  parts.push({x,y,vx:0,vy:0,life:0.16,max:0.16,color,r:crit?6:4,ring:true,gr:crit?190:130,lw:crit?2.5:2});
  const n=crit?5:3;
  for(let i=0;i<n;i++){ const a=rand(0,TAU), s=rand(35,crit?170:100);
    parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(0.1,0.26),max:0.26,color,r:rand(1.2,crit?3:2)}); }
  parts.push({x,y,vx:0,vy:0,life:0.09,max:0.09,color:'#ffffff',r:crit?4.5:3});
}
// muzzle flash: short colored burst at the shooter so its projectiles are easy to trace back
function muzzleFlash(x,y,color){
  parts.push({x,y,vx:0,vy:0,life:0.18,max:0.18,color,r:9,ring:true,gr:150,lw:3});
  for(let i=0;i<5;i++){ const a=rand(0,TAU), s=rand(40,120);
    parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(0.12,0.28),max:0.28,color,r:rand(1.5,3)}); }
}
// Pulse Wave radius/damage — radius buffed to actually match how big the shockwave looks; damage nerfed and now scales off both radius and P.dmg instead of a flat number
function novaStats(){
  const R = P.novaEvo ? 340 : 230;
  const dmg = R*0.10*P.dmg*P.novaPow;
  return {R, dmg};
}
// shared shockwave used by Nova synergies (Aegis Nova, Event Horizon)
function novaBlast(x,y,R,dmg){
  burst(x,y,'#9fd0ff',24,400); shake=Math.max(shake,8);
  parts.push({x,y,vx:0,vy:0,life:0.4,max:0.4,color:'#cfeaff',r:R,ring:true,gr:480});
  for(const e of enemies){ if(dist2(x,y,e.x,e.y) < R*R) damageEnemy(e,dmg,x,y,false); }
  ebullets = ebullets.filter(b => dist2(x,y,b.x,b.y) > R*R);
  sfx.boss();
}
function floatText(x,y,str,color='#fff',size=14){
  texts.push({x,y,str,color,size,life:0.9,max:0.9,vy:-55});
}
function bigText(str,color){
  texts.push({x:P.x,y:P.y-90,str,color,size:34,life:1.6,max:1.6,vy:-12,big:true});
}
// telegraphed ground hazard: warns (tele), then deals DoT for (life)
// Boomerang Croc projectile: a spinning green croc-boomerang with a friendly white halo so it reads as YOURS
function drawBoomerangCroc(b){
  const s=b.r*1.7, ang=b.spin||0;
  cx.save(); cx.translate(b.x,b.y);
  // friendly halo ring (cyan/white) — distinct from hostile dark-rimmed enemy bullets
  cx.globalAlpha=0.5; cx.strokeStyle='#eafff4'; cx.lineWidth=3;
  cx.beginPath(); cx.arc(0,0,s*1.25,0,TAU); cx.stroke();
  cx.globalAlpha=1; cx.rotate(ang);
  // boomerang body: a fat green crescent
  cx.fillStyle='#27ae60'; cx.strokeStyle='#0d3b22'; cx.lineWidth=2.5;
  cx.beginPath();
  cx.arc(0,0,s,-0.5,Math.PI*0.9,false);
  cx.arc(0,0,s*0.42,Math.PI*0.9,-0.5,true);
  cx.closePath(); cx.fill(); cx.stroke();
  // croc snout + jaw at the leading tip
  cx.fillStyle='#2ecc71';
  cx.beginPath(); cx.ellipse(s*0.82,0,s*0.38,s*0.26,0,0,TAU); cx.fill(); cx.stroke();
  // teeth
  cx.fillStyle='#fff';
  for(let k=-1;k<=1;k++){ cx.beginPath(); cx.moveTo(s*0.66+k*0.001,0); cx.lineTo(s*1.12,k*s*0.12); cx.lineTo(s*1.12,k*s*0.12+s*0.08); cx.closePath(); cx.fill(); }
  // eye
  cx.fillStyle='#fff'; cx.beginPath(); cx.arc(s*0.7,-s*0.18,s*0.12,0,TAU); cx.fill();
  cx.fillStyle='#0d3b22'; cx.beginPath(); cx.arc(s*0.72,-s*0.18,s*0.06,0,TAU); cx.fill();
  cx.restore();
}

function drawKnifeBullet(b){
  const r=b.r, ang=Math.atan2(b.vy,b.vx);
  cx.save(); cx.translate(b.x,b.y);
  cx.globalAlpha=0.45; cx.strokeStyle='#fff6bf'; cx.lineWidth=2.5;
  cx.beginPath(); cx.arc(0,0,r*1.6,0,TAU); cx.stroke();
  cx.globalAlpha=1; cx.rotate(ang);
  // blade, tip leads in direction of travel (outward)
  cx.fillStyle='#e8eaf0'; cx.strokeStyle='#5a5f6b'; cx.lineWidth=1.6;
  cx.beginPath(); cx.moveTo(r*2.1,0); cx.lineTo(r*0.5,r*0.5); cx.lineTo(r*0.5,-r*0.5); cx.closePath();
  cx.fill(); cx.stroke();
  cx.strokeStyle='#aeb4c0'; cx.lineWidth=1; cx.beginPath(); cx.moveTo(r*1.8,0); cx.lineTo(r*0.6,0); cx.stroke();
  // crossguard
  cx.fillStyle='#caa12f'; cx.strokeStyle='#5a4313'; cx.lineWidth=1.4;
  cx.beginPath(); cx.rect(r*0.3,-r*0.55,r*0.25,r*1.1); cx.fill(); cx.stroke();
  // hilt
  cx.fillStyle='#8a5d2c'; cx.beginPath(); cx.rect(-r*0.9,-r*0.22,r*1.0,r*0.44); cx.fill(); cx.stroke();
  cx.restore();
}

function drawSkibidiToilet(b){
  const s=18;
  cx.save(); cx.translate(b.x,b.y); cx.rotate(b.spin);
  // friendly halo — distinct icy-blue so it's clearly the player's own bouncing hazard
  cx.globalAlpha=0.4; cx.strokeStyle='#cfe8ff'; cx.lineWidth=2.5;
  cx.beginPath(); cx.arc(0,0,s*1.3,0,TAU); cx.stroke(); cx.globalAlpha=1;
  // tank (back box)
  cx.fillStyle='#e8eaf0'; cx.strokeStyle='#33272a'; cx.lineWidth=1.8;
  cx.beginPath(); cx.roundRect(-s*0.55,-s*0.95,s*1.1,s*0.55,3); cx.fill(); cx.stroke();
  // bowl base
  cx.beginPath(); cx.roundRect(-s*0.75,-s*0.35,s*1.5,s*0.95,6); cx.fill(); cx.stroke();
  // seat ring
  cx.fillStyle='#2a2a2e';
  cx.beginPath(); cx.ellipse(0,-s*0.05,s*0.55,s*0.32,0,0,TAU); cx.fill();
  // water
  cx.fillStyle='#5fc7ff';
  cx.beginPath(); cx.ellipse(0,-s*0.05,s*0.38,s*0.2,0,0,TAU); cx.fill();
  cx.restore();
}

function addZone(x,y,r,o){
  zones.push({ x,y,r, t:0, tele:o.tele||0.6, life:o.life||1.4, dps:o.dps||10, slow:!!o.slow, col:o.col||'#e8a93a', friendly:!!o.friendly });
}

// ============ LEVEL UP ============
function gainXp(n){
  P.xp += n*(P.xpMul||1);
  while(P.xp >= P.xpNext){
    P.xp -= P.xpNext;
    P.lv++;
    P.xpNext = Math.floor(4 + P.lv*2.6 + P.lv*P.lv*0.4);
    if(typeof fireHook==='function') fireHook('onLevelUp');
    if(P.noCards){ sfx.level(); floatText(P.x,P.y-40,'LEVEL '+P.lv,'#9fe0ff',16); }   // stat-only level up, no card picker
    else openLevelUp();
  }
  const lb=$('lvbadge'); if(lb) lb.textContent = P.lv;
}

function openLevelUp(){
  state = ST.LEVELUP;
  sfx.level();
  // candidates = every card with a remaining move whose synergy gate (req) is satisfied
  const cands = [];
  for(const u of UPGRADES){
    if((u.minWorld||0) > worldIdx) continue;                      // world-locked ability (e.g. World 2/3 only)
    if(u.req && !u.req.every(id => (P.up[id]||0) > 0)) continue;   // synergy card still locked
    if(P.bannedCards && P.bannedCards.includes(u.id)) continue;   // character-specific card ban
    const m = nextMove(u); if(m) cands.push({u,m});
  }
  // weighted draw of 3 distinct by rarity (rarer = lower weight); evolve-ready cards stay prioritised
  const hasAbility = UPGRADES.some(u => u.evo && (P.up[u.id]||0) > 0);   // owns at least one ability card already
  const opts = []; const bag = cands.slice();
  while(opts.length<3 && bag.length){
    const w = bag.map(x => {
      const base = (RARITY[x.u.rarity||'common']||RARITY.common).w;
      // 8× if this pick triggers evolution; 3× if player has already invested in this evo path
      let evoMul = x.m.evolve ? 8 : (x.u.evo && (P.up[x.u.id]||0) > 0 ? 3 : 1);
      if(x.u.evo && !hasAbility) evoMul *= 2.5;   // boost ability-card odds while the player has none yet
      return base * evoMul;
    });
    let total=0; for(const v of w) total+=v;
    let r = Math.random()*total, idx=0;
    while(idx<w.length-1 && (r-=w[idx])>0) idx++;
    opts.push(bag.splice(idx,1)[0]);
  }
  // owned-skills strip: icons of upgrades already taken (filled slots), padded with empties
  const strip = $('skillstrip');
  if(strip){
    const ownedUps = UPGRADES.filter(u => (P.up[u.id]||0) > 0);
    const slots = Math.max(8, ownedUps.length);
    let sh='';
    for(let i=0;i<slots;i++){
      const u = ownedUps[i];
      if(u){ const ic = SP[u.icon] ? SP[u.icon].toDataURL() : ''; sh += `<div class="sslot"><img draggable="false" src="${ic}"></div>`; }
      else sh += `<div class="sslot empty"></div>`;
    }
    strip.innerHTML = sh;
  }

  const wrap = $('cards'); wrap.innerHTML='';
  opts.forEach(({u,m})=>{
    const d=document.createElement('button');
    const tier = u.rarity||'common';
    d.className = 'card r-'+tier + (m.evolve ? ' evolve' : '') + (u.req ? ' synergy' : '');
    const ic = SP[m.icon] ? SP[m.icon].toDataURL() : '';
    const owned = P.up[u.id]||0;
    // 5-star rating row (filled = the level you currently have, before this pick)
    const total = u.evo ? 5 : (u.cap||5);
    let stars=''; for(let i=0;i<total;i++) stars += `<span class="cstar${i < owned ? ' on' : ''}">★</span>`;
    const tag = m.evolve ? 'EVO!' : (owned===0 ? 'New!' : m.label);
    d.innerHTML = `<div class="chead"><span class="cnew">${tag}</span>${m.name}</div>`+
                  `<div class="cmid"><img class="cicon" draggable="false" src="${ic}"><div class="cdesc">${m.desc}</div></div>`+
                  `<div class="cstars">${stars}</div>`;
    d.onclick = ()=>{
      m.evolve ? sfx.evolve() : sfx.pick();
      m.apply(); P.up[u.id] = (P.up[u.id]||0)+1;
      $('levelup').classList.add('hidden');
      state = ST.PLAY;
      tPrev = performance.now();
    };
    wrap.appendChild(d);
  });
  $('levelup').classList.remove('hidden');
}

// ============ DEATH ============
function gameOver(){
  state = ST.OVER;
  arena=null; bossPending=0;
  stopMusic();
  sfx.die();
  shake = 22; hitstop = 0.12;
  $('fwave').textContent = timerMode() ? 'time '+fmtTime(chalElapsed) : 'wave '+wave;
  $('fcoins').textContent = worldCoins;
  $('fkills').textContent = kills;
  $('hud').classList.add('hidden');
  $('dashbtn').classList.add('hidden');
  $('zoomctl').classList.add('hidden');
  $('bossbar').classList.add('hidden');
  setTimeout(()=>$('gameover').classList.remove('hidden'), 600);
}

// ============ DASH ============
function tryDash(){
  if(state!==ST.PLAY || P.dashCd>0) return;
  if(typeof fireHook==='function') fireHook('onDash');
  let mx=joy.dx, my=joy.dy;
  if(keys['w']||keys['arrowup']) my-=1;
  if(keys['s']||keys['arrowdown']) my+=1;
  if(keys['a']||keys['arrowleft']) mx-=1;
  if(keys['d']||keys['arrowright']) mx+=1;
  const ml=Math.hypot(mx,my);
  if(ml<0.1){ mx=Math.cos(P.face); my=Math.sin(P.face); }
  else { mx/=ml; my/=ml; }
  P.dvx=mx; P.dvy=my; P.dashT=0.18; P.dashCd=P.dashMax; P.inv=Math.max(P.inv,0.25);
  sfx.dash();
  if(navigator.vibrate) navigator.vibrate(20);
}

// ============ SPATIAL HASH GRID (enemy separation + fast collision queries) ============
const CELL = 64, GW = 8192;           // 64px cells; GW packs (cx,cy) into a single int key
let egrid = new Map();
let _cellPool = [];   // reused per-cell arrays so the grid rebuild allocates ~nothing each frame
function cellKey(cx,cy){ return cx*GW + cy; }
// rebuild once per frame from current enemy positions (burrowed foes are untargetable -> skipped)
function buildEnemyGrid(){
  egrid.clear(); let pi=0;
  for(const e of enemies){ if(e.under) continue;
    const k=cellKey(Math.floor(e.x/CELL), Math.floor(e.y/CELL));
    let a=egrid.get(k);
    if(!a){ a=_cellPool[pi] || (_cellPool[pi]=[]); a.length=0; pi++; egrid.set(k,a); }
    a.push(e);
  }
}
// visit every enemy in a cell-block covering radius R around (x,y); cb does the exact hit test
function forEnemiesNear(x,y,R,cb){
  const span=Math.min(8, (R>0?Math.ceil(R/CELL):0)+1);
  const gx=Math.floor(x/CELL), gy=Math.floor(y/CELL);
  for(let ix=-span;ix<=span;ix++) for(let iy=-span;iy<=span;iy++){
    const a=egrid.get(cellKey(gx+ix,gy+iy)); if(!a) continue;
    for(const e of a) cb(e);
  }
}
// push an enemy out of overlapping neighbours so the swarm flows around itself instead of stacking
function separate(e){
  if(e.isBoss || e.under || e.iv>0) return;
  const gx=Math.floor(e.x/CELL), gy=Math.floor(e.y/CELL);
  let sx=0, sy=0;
  for(let ix=-1;ix<=1;ix++) for(let iy=-1;iy<=1;iy++){
    const a=egrid.get(cellKey(gx+ix,gy+iy)); if(!a) continue;
    for(const o of a){
      if(o===e || o.under) continue;
      let dx=e.x-o.x, dy=e.y-o.y; const rr=e.r+o.r, d2=dx*dx+dy*dy;
      if(d2>=rr*rr) continue;
      if(d2<0.01){ dx=rand(-1,1); dy=rand(-1,1); }     // perfectly stacked -> jitter apart
      const d=Math.sqrt(dx*dx+dy*dy)||1, push=(rr-d)/d * (o.isBoss?0.9:0.5);  // bosses don't budge
      sx+=dx*push; sy+=dy*push;
    }
  }
  if(sx||sy){ e.x+=clamp(sx,-12,12); e.y+=clamp(sy,-12,12); }   // capped so nothing teleports
}

// ============ UPDATE ============

function update(dt){
  elapsed += dt;
  // Challenger/practice-timer-based: advance separate timer (paused during boss), trigger milestones
  if(timerMode() && state===ST.PLAY){
    if(!chalBossActive) chalElapsed += dt;
    if(!chalBossActive && !boss && hasMoreMilestones() && chalElapsed>=nextBossTimeSec()){
      chalBossActive=true;
      wave=(chalBossIdx+1)*5;
      enemies.length=0; luckies=[]; ebullets=[];
      waveEnemiesLeft=0; betweenWaves=false;
      bigText('BOSS WAVE','#e54d4d');
      $('wavetag').textContent='BOSS WAVE';
      const bw=$('bosswarn'); bw.textContent='BOSS INCOMING'; bw.classList.remove('hidden');
      sfx.warn();
      bossPending=ARENA_LEAD;  // slight delay before boss spawns (no arena walls)
    }
    // Keep enemies spawning continuously between bosses
    if(!chalBossActive && waveEnemiesLeft<50){ waveEnemiesLeft=9999; }
    // Scale virtual wave with time for enemy variety
    if(!chalBossActive){ const vw=Math.min(Math.floor(chalElapsed/75)+1, chalBossIdx*5+4); if(vw>wave) wave=vw; }
  }
  if(typeof fireHook==='function') fireHook('petTick', dt);
  // Anti-cheat: per-frame sanity clamp — values beyond legitimate upgrade caps indicate console tampering
  if(state===ST.PLAY){
    if(P.dmg>18000||P.maxHp>4000||P.speed>2800||P.shots>32){ quitToMenu(); return; }
    if(P.hp>P.maxHp) P.hp=P.maxHp;
    if(boss && boss.hp > boss.maxHp) boss.hp = boss.maxHp;   // reject console-up of boss HP
  }
  if(bossPending>0){ bossPending-=dt; if(bossPending<=0){ bossPending=0; spawnBoss(); } }

  // --- player move ---
  let mx=joy.dx, my=joy.dy;
  if(keys['w']||keys['arrowup']) my-=1;
  if(keys['s']||keys['arrowdown']) my+=1;
  if(keys['a']||keys['arrowleft']) mx-=1;
  if(keys['d']||keys['arrowright']) mx+=1;
  const ml=Math.hypot(mx,my); if(ml>1){ mx/=ml; my/=ml; }
  if(ml>0.05){ P.face=Math.atan2(my,mx); P.walk+=dt*10; } else P.walk*=0.9;

  if(P.dashT>0){
    P.dashT-=dt;
    P.x += P.dvx*640*dt; P.y += P.dvy*640*dt;
    if(Math.random()<0.6) parts.push({x:P.x,y:P.y,vx:0,vy:0,life:0.25,max:0.25,color:'#bfe3ff',r:6});
  } else {
    const spd = P.speed * (P.slowT>0 ? 0.5 : 1);   // chilled by cold zones
    P.x += mx*spd*dt; P.y += my*spd*dt;
  }
  P.x = clamp(P.x, WALL+P.r, WORLD.w-WALL-P.r);
  P.y = clamp(P.y, WALL+P.r, WORLD.h-WALL-P.r);
  if(arena){ P.x=clamp(P.x, arena.x+P.r, arena.x+arena.w-P.r); P.y=clamp(P.y, arena.y+P.r, arena.y+arena.h-P.r); }
  if(P.petId){
    const ml2=Math.hypot(mx,my);
    const fdx = ml2>0.05 ? -mx/ml2 : -Math.cos(P.face);
    const fdy = ml2>0.05 ? -my/ml2 : -Math.sin(P.face);
    const ptx = P.x + fdx*38, pty = P.y + fdy*38;
    P.petX += (ptx-P.petX)*Math.min(1,dt*9);
    P.petY += (pty-P.petY)*Math.min(1,dt*9);
    if(ml2>0.05) P.petWalk += dt*10;
  }
  if(P.inv>0) P.inv-=dt;
  if(P.slowT>0) P.slowT-=dt;
  if(P.dashCd>0){ P.dashCd-=dt; $('dashbtn').classList.toggle('cool', P.dashCd>0); }

  // camera follows, clamped to world (zoom-aware)
  computeCamera();

  // spatial grid for this frame: powers enemy separation + bullet/orb/aura collision
  buildEnemyGrid();
  // Walking Turret(s): chain-follow behind the pet (or directly behind the player if no pet active)
  if(P.turretCount>0){
    while(turrets.length < P.turretCount) turrets.push({x:(P.petId?P.petX:P.x), y:(P.petId?P.petY:P.y), cd:0, face:0});
    if(turrets.length > P.turretCount) turrets.length = P.turretCount;
    const tml = Math.hypot(mx,my);
    const tfdx = tml>0.05 ? -mx/tml : -Math.cos(P.face);
    const tfdy = tml>0.05 ? -my/tml : -Math.sin(P.face);
    const turretRange = P.turretAdaptive ? P.range : (P.turretRangeBase + P.turretRangeBonus);
    const turretFireCd = 0.32 / (P.turretFireMul||1);
    let chx = P.petId ? P.petX : P.x, chy = P.petId ? P.petY : P.y;
    for(const tu of turrets){
      const tx = chx + tfdx*34, ty = chy + tfdy*34;
      tu.x += (tx-tu.x)*Math.min(1,dt*9);
      tu.y += (ty-tu.y)*Math.min(1,dt*9);
      chx = tu.x; chy = tu.y;   // next turret in the chain trails behind this one
      tu.cd -= dt;
      if(tu.cd<=0){
        let target=null, bd=turretRange*turretRange;
        forEnemiesNear(tu.x,tu.y,turretRange,(e)=>{ if(e.under) return; const d=dist2(tu.x,tu.y,e.x,e.y); if(d<=bd){ bd=d; target=e; } });
        if(target){
          tu.face = Math.atan2(target.y-tu.y, target.x-tu.x);
          const dmgBase = P.turretAdaptive ? P.dmg*0.10 : P.turretDmgBase;
          if(typeof petBullets!=='undefined') petBullets.push({x:tu.x,y:tu.y,tx:target.x,ty:target.y,target,dmg:dmgBase*(P.turretDmgMul||1)});
          tu.cd = turretFireCd;
        } else tu.cd = 0.1;   // nothing in range yet — retry soon
      }
    }
  }
  // Daredevil: is a foe point-blank this frame? (drives a crit bonus)
  P.foeClose = P.daredevil>0 && enemies.some(e=>!e.under && !e.lead && dist2(P.x,P.y,e.x,e.y) < 120*120);
  // Knife Circus: periodically fling a spinning ring of knives outward
  if(P.knives){
    P.knifeCd -= dt;
    if(P.knifeCd<=0){ P.knifeCd = P.knifeCdBase;
      const n=P.knifeN||8, off=elapsed*2.2, br=(P.knifeBig?9:6)*(P.bulletR||1), spd=480*(P.bulletSpd||1);
      for(let i=0;i<n;i++){ const a=off+i*TAU/n;
        bullets.push({x:P.x,y:P.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:br,pierce:P.knifeEvo?999:(P.pierce+1),hit:new Set(),dist:P.range*0.9,dmgMul:0.7,knife:true}); }
      sfx.shoot();
    }
  }

  // --- auto-fire at nearest enemy within range ---
  P.fireCd -= dt;
  if(P.fireCd<=0 && (enemies.length || luckies.length)){
    let best=null, bd=Infinity;
    for(const e of enemies){ const d=dist2(P.x,P.y,e.x,e.y); if(d<bd){bd=d;best=e;} }
    for(const lb of luckies){ const d=dist2(P.x,P.y,lb.x,lb.y); if(d<bd){bd=d;best=lb;} }   // lucky blocks are auto-targeted too
    if(best && bd <= P.range*P.range){   // only shoot what's in range
      P.fireCd = P.fireRate / (1 + (P.frenzy||0)*0.002);   // Killing Frenzy speeds up fire (+0.2%/stack)
      const spd = (P.railgun ? 760 : 560) * (P.bulletSpd||1);
      const br  = (P.railgun ? 9 : 6) * (P.bulletR||1);
      // always fire the aimed volley at the nearest enemy
      const base = Math.atan2(best.y-P.y, best.x-P.x), spread = 0.16*(P.spread||1);
      const perpA = base + Math.PI/2;  // perpendicular for positional spread of homing bullets
      for(let i=0;i<P.shots;i++){
        const a = base + (i-(P.shots-1)/2)*spread;
        const po = (P.seeker && P.shots>1) ? (i-(P.shots-1)/2)*15 : 0;  // 15px apart so homing shots are visually distinct
        let lkCrit=false;
        if(P.luckyBullets){ const cc=P.crit+(P.overdrive?(P.frenzy||0)*0.001:0)+(P.foeClose?0.09*(P.daredevil||0):0); lkCrit=Math.random()<cc; }
        bullets.push({x:P.x+Math.cos(perpA)*po,y:P.y+Math.sin(perpA)*po,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:br,pierce:P.pierce,hit:new Set(),dist:P.range,bounce:P.bounce||0,homing:P.seeker||0,lucky:P.luckyBullets||false,luckyCrit:lkCrit});
      }
      if(P.radial){                       // Omni-Barrage: 360 ring IN ADDITION (reduced dmg so it stays fair vs crowds)
        const n = clamp(P.shots*2, 8, 20);
        for(let i=0;i<n;i++){
          const a = (i/n)*TAU + elapsed*1.5;
          bullets.push({x:P.x,y:P.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:br,pierce:P.pierce,hit:new Set(),dist:P.range,dmgMul:0.6,bounce:P.bounce||0});
        }
      }
      sfx.shoot();
      if(typeof fireHook==='function') fireHook('playerShoot', best);
    }
  }

  // --- orbs ---
  if(P.orbs>0){
    P.orbA += dt*3.2;
    for(let i=0;i<P.orbs;i++){
      const a = P.orbA + i*(TAU/P.orbs);
      const ox = P.x + Math.cos(a)*P.orbR, oy = P.y + Math.sin(a)*P.orbR;
      forEnemiesNear(ox,oy,40,(e)=>{
        if(e.iv>0 || e.lead) return;          // e.lead = duo partner: only bullets (routed) may hurt it
        if(dist2(ox,oy,e.x,e.y) < (e.r+10)*(e.r+10)){ e.hp -= 9*dt*P.dmg; e.hitT=Math.max(e.hitT,0.06); }
      });
      if(P.orbShield){                    // Sigma Squad: orbs eat enemy bullets
        for(let bi=ebullets.length-1;bi>=0;bi--){
          if(dist2(ox,oy,ebullets[bi].x,ebullets[bi].y) < 14*14) ebullets.splice(bi,1);
        }
      }
    }
    if(P.orbShoot){                       // Orbital Storm: orbs fire shots outward
      P.orbShootCd -= dt;
      if(P.orbShootCd<=0){ P.orbShootCd=1.2;
        for(let i=0;i<P.orbs;i++){ const a=P.orbA+i*(TAU/P.orbs), ox=P.x+Math.cos(a)*P.orbR, oy=P.y+Math.sin(a)*P.orbR;
          bullets.push({x:ox,y:oy,vx:Math.cos(a)*560,vy:Math.sin(a)*560,r:6,pierce:P.pierce,hit:new Set(),dist:P.range}); }
        sfx.shoot();
      }
    }
  }

  // --- nova ---
  if(P.nova){
    P.novaCd -= dt;
    if(P.novaCd<=0){
      P.novaCd = P.novaCdBase; shake = Math.max(shake, P.novaEvo?12:8);
      const {R,dmg} = novaStats();
      burst(P.x,P.y,'#9fd0ff',P.novaEvo?40:26,420); sfx.boss();
      for(let k=0;k<3;k++) parts.push({x:P.x,y:P.y,vx:0,vy:0,life:0.4,max:0.4,color:'#cfeaff',r:R,ring:true});
      for(const e of enemies){
        if(dist2(P.x,P.y,e.x,e.y) < R*R){
          const fb = (P.freeze && e.frz>0) ? (P.frostfire?2.2:1.6) : 1;   // Frostfire Core amps the shatter
          damageEnemy(e,dmg*fb,P.x,P.y,false);
        }
      }
      ebullets = ebullets.filter(b => dist2(P.x,P.y,b.x,b.y) > R*R);  // Skibidi Nuke clears bullets
    }
  }

  // --- Frost Bloom: periodic frost field that slows (or freezes) & damages nearby foes ---
  if(P.frostBloom){
    P.fbCd -= dt;
    if(P.fbCd<=0){
      P.fbCd = P.fbCdBase;
      addZone(P.x,P.y,P.fbR,{tele:0.1, life:P.frostBloomEvo?2.6:1.8, dps:P.fbDps, slow:true, col:'#bfe6ff', friendly:true});
      forEnemiesNear(P.x,P.y,P.fbR,(e)=>{
        if(e.isBoss || e.lead) return;
        if(dist2(P.x,P.y,e.x,e.y) < P.fbR*P.fbR){
          if(P.glacierHeart) e.frz = Math.max(e.frz, 1.0);   // Glacier Heart: freeze solid
          else e.chillT = Math.max(e.chillT||0, 1.4);
        }
      });
      for(let k=0;k<3;k++) parts.push({x:P.x,y:P.y,vx:0,vy:0,life:0.4,max:0.4,color:'#cfeaff',r:P.fbR,ring:true});
      burst(P.x,P.y,'#bfe6ff',P.frostBloomEvo?22:14,300); sfx.boss();
    }
  }

  // --- Killing Frenzy stacks decay when you stop killing ---
  if(P.frenzy>0) P.frenzy = Math.max(0, P.frenzy - dt*2);

  // --- Regeneration ---
  if(P.regen>0 && P.hp<P.maxHp) P.hp = Math.min(P.maxHp, P.hp + P.regen*dt);

  // --- Aegis Bubble recharge ---
  if(P.shieldMax>0 && P.shield<P.shieldMax){
    P.shieldCd -= dt;
    if(P.shieldCd<=0){ P.shield++; P.shieldCd=P.shieldCdBase; floatText(P.x,P.y-P.r-10,'+shield','#7ecbff',12); }
  }

  // --- Phoenix recharge ---
  if(P.phoenixMax>0 && P.phoenix<P.phoenixMax){
    P.phoenixCd -= dt;
    if(P.phoenixCd<=0){ P.phoenix++; P.phoenixCd=P.phoenixCdBase; floatText(P.x,P.y-P.r-10,'phoenix ready','#ff7a3a',12); }
  }

  // --- Phoenix burn aura: enemies near you smoulder ---
  if(P.burnAura>0){
    forEnemiesNear(P.x,P.y,80,(e)=>{
      if(e.iv>0 || e.lead) return;
      if(dist2(P.x,P.y,e.x,e.y) < 80*80){ e.hp -= P.burnAura*dt; e.hitT=Math.max(e.hitT,0.05);
        if(Math.random()<0.18) parts.push({x:e.x+rand(-8,8),y:e.y+rand(-8,8),vx:0,vy:-rand(20,50),life:0.4,max:0.4,color:'#ff8a3a',r:rand(2,4)}); }
    });
  }

  // --- Aura Monster: green damage aura around the player ---
  if(P.auraR>0){
    forEnemiesNear(P.x,P.y,P.auraR,(e)=>{
      if(e.iv>0 || e.lead) return;
      if(dist2(P.x,P.y,e.x,e.y) < P.auraR*P.auraR){ e.hp -= P.auraDmg*dt; e.hitT=Math.max(e.hitT,0.05);
        if(Math.random()<0.1) parts.push({x:e.x+rand(-8,8),y:e.y+rand(-8,8),vx:0,vy:-rand(20,50),life:0.4,max:0.4,color:'#5fe66a',r:rand(2,4)}); }
    });
  }

  // --- Skibidi Toilet: edge-bouncing persistent bullets, own spawn/respawn cycle ---
  if(P.skibidiCount>0){
    while(skibidiTimers.length<P.skibidiCount) skibidiTimers.push(0);
    for(let i=0;i<P.skibidiCount;i++){
      if(!skibidiBullets[i] || skibidiBullets[i].dead){
        if(skibidiTimers[i]>0){ skibidiTimers[i]-=dt; continue; }
        const a=rand(0,TAU), spd=300;
        skibidiBullets[i]={x:P.x,y:P.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,bounces:0,spin:0,dead:false};
      }
    }
  }
  for(let i=0;i<skibidiBullets.length;i++){
    const b=skibidiBullets[i]; if(!b||b.dead) continue;
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.spin+=dt*7;
    let bounced=false;
    if(b.x<WALL){ b.x=WALL; b.vx=Math.abs(b.vx); bounced=true; }
    else if(b.x>WORLD.w-WALL){ b.x=WORLD.w-WALL; b.vx=-Math.abs(b.vx); bounced=true; }
    if(b.y<WALL){ b.y=WALL; b.vy=Math.abs(b.vy); bounced=true; }
    else if(b.y>WORLD.h-WALL){ b.y=WORLD.h-WALL; b.vy=-Math.abs(b.vy); bounced=true; }
    if(bounced){
      b.bounces++; burst(b.x,b.y,'#cfe8ff',6,140); sfx.hit();
      if(b.bounces>=P.skibidiBounces){
        if(P.skibidiNeverDie) b.bounces=0;   // evolved: keep bouncing forever instead of dying
        else { b.dead=true; skibidiTimers[i]=10; continue; }
      }
    }
    forEnemiesNear(b.x,b.y,24,(e)=>{
      if(e.iv>0 || e.lead) return;
      if(dist2(b.x,b.y,e.x,e.y) < 24*24){ e.hp -= P.dmg*1.1*dt; e.hitT=Math.max(e.hitT,0.05); }
    });
  }

  // --- Black Hole: spawn on cooldown, then pull + grind enemies ---
  if(P.bhole){
    P.bholeCd -= dt;
    if(P.bholeCd<=0){
      P.bholeCd = P.bholeCdBase;
      let tx=P.x, ty=P.y, bd=Infinity;
      for(const e of enemies){ const d=dist2(P.x,P.y,e.x,e.y); if(d<bd){bd=d;tx=e.x;ty=e.y;} }
      if(bd===Infinity){ tx=P.x+Math.cos(P.face)*180; ty=P.y+Math.sin(P.face)*180; }
      holes.push({x:tx,y:ty,r:P.bholeR,life:P.bholeLife,t:0,dmg:P.bholeDmg,evo:P.bholeEvo});
      sfx.boss();
    }
  }
  // --- Gravity Crush (World 3+): a black-hole-style implosion on its own cooldown ---
  if(P.gravcrush){
    P.gravCd -= dt;
    if(P.gravCd<=0){
      P.gravCd = P.gravCdBase;
      let tx=P.x, ty=P.y, bd=Infinity;
      for(const e of enemies){ if(e.lead) continue; const d=dist2(P.x,P.y,e.x,e.y); if(d<bd){bd=d;tx=e.x;ty=e.y;} }
      if(bd===Infinity){ tx=P.x+Math.cos(P.face)*200; ty=P.y+Math.sin(P.face)*200; }
      holes.push({x:tx,y:ty,r:P.gravR,life:P.gravLife,t:0,dmg:P.gravDmg,evo:P.gravEvo});
      sfx.boss();
    }
  }
  // --- Second Wind cooldown tick ---
  if(P.swCd>0) P.swCd-=dt;

  // --- Boomerang Croc ---
  if(P.boomerang){
    if(P.boomEvo){
      P.boomT=(P.boomT||0)+dt;
      if(P.boomT>1.0){
        P.boomT=0;
        let best=null, bestD=Infinity;
        for(const e of enemies){ const d=dist2(P.x,P.y,e.x,e.y); if(d<bestD){bestD=d;best=e;} }
        if(best){
          const a=Math.atan2(best.y-P.y,best.x-P.x), br=P.boomR||8;
          bullets.push({x:P.x,y:P.y,vx:Math.cos(a)*380,vy:Math.sin(a)*380,r:br,pierce:3,hit:new Set(),dist:500,dmgMul:1.4,col:'#27ae60',boom:true,spin:0});
        }
      }
    } else {
      P.boomCd=(P.boomCd||0)-dt;
      if(P.boomCd<=0){
        P.boomCd=P.boomCdBase||7;
        const n=P.boomN||1, br=P.boomR||8;
        let bestA=0; let bd=Infinity;
        for(const e of enemies){ const d=dist2(P.x,P.y,e.x,e.y); if(d<bd){bd=d;bestA=Math.atan2(e.y-P.y,e.x-P.x);} }
        for(let i=0;i<n;i++){
          const spread=(i-(n-1)/2)*0.22, a=bestA+spread;
          bullets.push({x:P.x,y:P.y,vx:Math.cos(a)*340,vy:Math.sin(a)*340,
                        r:br,pierce:99,hit:new Set(),dist:480,dmgMul:1.2,boomerang:true,boomSpd:340,col:'#27ae60',boom:true,spin:0});
        }
        sfx.hit();
      }
    }
  }

  // --- Abyssal Pact (World 3+): damage scales with the size of the swarm around you ---
  if(P.abyssal){
    let c=0; forEnemiesNear(P.x,P.y,240,(o)=>{ if(!o.isBoss && !o.under && dist2(P.x,P.y,o.x,o.y)<240*240) c++; });
    P.abyssalMul = 1 + Math.min(1.2, c*0.06*P.abyssal);
  } else P.abyssalMul = 1;

  for(let i=holes.length-1;i>=0;i--){
    const h=holes[i]; h.t+=dt;
    for(const e of enemies){
      if(e.iv>0 || e.lead) continue;   // never grind the duo partner (hp:1) directly -> it routes via bullets only
      const d=Math.sqrt(dist2(h.x,h.y,e.x,e.y))||1;
      if(d<h.r){
        const a=Math.atan2(h.y-e.y,h.x-e.x);
        if(!e.isBoss){ e.x+=Math.cos(a)*Math.min(150,d)*dt*1.4; e.y+=Math.sin(a)*Math.min(150,d)*dt*1.4; }
        e.hp -= h.dmg*P.dmg*0.12*dt; e.hitT=Math.max(e.hitT,0.05);
      }
    }
    if(h.evo){ for(let bi=ebullets.length-1;bi>=0;bi--){ if(dist2(h.x,h.y,ebullets[bi].x,ebullets[bi].y)<h.r*h.r) ebullets.splice(bi,1); } }
    if(h.t>=h.life){ if(P.holeNova) novaBlast(h.x,h.y,h.r*1.1,30*P.dmg); holes.splice(i,1); }
  }

  // --- player bullets ---
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    if(b.homing){                           // Seeker Rounds: curve toward the nearest foe
      let best=null,bd=420*420; for(const e of enemies){ if(e.iv>0||e.under||e.lead) continue; const d=dist2(b.x,b.y,e.x,e.y); if(d<bd){bd=d;best=e;} }
      if(best){ const cur=Math.atan2(b.vy,b.vx), want=Math.atan2(best.y-b.y,best.x-b.x);
        let da=((want-cur+Math.PI)%TAU+TAU)%TAU-Math.PI; const turn=clamp(da,-(2.4+b.homing*1.3)*dt,(2.4+b.homing*1.3)*dt);
        const sp=Math.hypot(b.vx,b.vy), na=cur+turn; b.vx=Math.cos(na)*sp; b.vy=Math.sin(na)*sp; } }
    b.dist -= Math.hypot(b.vx,b.vy)*dt;     // range limit
    b.x+=b.vx*dt; b.y+=b.vy*dt;
    if(b.boom){ b.spin=(b.spin||0)+dt*18; if(Math.random()<0.5) parts.push({x:b.x,y:b.y,vx:0,vy:0,life:0.18,max:0.18,color:'#7ef0a8',r:b.r*0.7}); }   // spin + green trail
    if(b.bounce>0){                          // Bouncy Shot: ricochet off the world walls, re-arming the hit set
      let bb=false;
      if(b.x<WALL){ b.x=WALL; b.vx=Math.abs(b.vx); bb=true; }
      else if(b.x>WORLD.w-WALL){ b.x=WORLD.w-WALL; b.vx=-Math.abs(b.vx); bb=true; }
      if(b.y<WALL){ b.y=WALL; b.vy=Math.abs(b.vy); bb=true; }
      else if(b.y>WORLD.h-WALL){ b.y=WORLD.h-WALL; b.vy=-Math.abs(b.vy); bb=true; }
      if(bb){ b.bounce--; b.dist=Math.max(b.dist,160); if(b.hit) b.hit.clear(); burst(b.x,b.y,'#ffd24a',3,80); }
    }
    // Boomerang Croc: reverse toward player when range runs out
    if(b.boomerang && b.dist<=0){
      const a=Math.atan2(P.y-b.y,P.x-b.x), spd=b.boomSpd||340;
      b.vx=Math.cos(a)*spd; b.vy=Math.sin(a)*spd;
      b.boomerang=false; b.dist=600; b.hit=new Set();   // can hit again on return
      continue;
    }
    if(b.dist<=0){ burst(b.x,b.y,'#fff6bf',3,55); bullets.splice(i,1); continue; }
    if(b.x<-20||b.x>WORLD.w+20||b.y<-20||b.y>WORLD.h+20){ bullets.splice(i,1); continue; }
    // grid-accelerated hit test: only check enemies in the bullet's cell block, one hit per frame
    let hitDone=false;
    const bgx=Math.floor(b.x/CELL), bgy=Math.floor(b.y/CELL);
    for(let ix=-1;ix<=1 && !hitDone;ix++) for(let iy=-1;iy<=1 && !hitDone;iy++){
      const arr=egrid.get(cellKey(bgx+ix,bgy+iy)); if(!arr) continue;
      for(const e of arr){
        if(b.hit.has(e) || e.iv>0) continue;
        if(dist2(b.x,b.y,e.x,e.y) < (e.r+b.r)*(e.r+b.r)){
          const critC = P.crit + (P.overdrive ? (P.frenzy||0)*0.001 : 0) + (P.foeClose ? 0.09*(P.daredevil||0) : 0);
          const isCrit = b.luckyCrit ? true : (P.noCrit ? false : Math.random()<critC);
          const rngMul = P.noCrit ? (0.5+Math.random()*0.75) : 1;
          const dmg = P.dmg * (b.dmgMul||1) * (P.abyssalMul||1) * (1 + (P.frenzy||0)*0.002) * (isCrit?(P.critMul||3):1) * rngMul;
          b.hit.add(e);
          hitSpark(b.x,b.y,isCrit?'#ffe14d':'#ff9f3a',isCrit);
          damageEnemy(e,dmg,b.x,b.y,isCrit);
          if(isCrit && P.critHeal>0) P.hp=Math.min(P.maxHp,P.hp+P.critHeal);   // Blood Crit
          if(P.ricochet>0 && !b.ric){   // Ricochet: fling weaker bolts at nearby foes (don't ricochet a ricochet)
            const R=P.ricochetEvo?220:140, mul=P.ricochetEvo?0.7:0.5; let n=0;
            forEnemiesNear(b.x,b.y,R,(o)=>{ if(n>=P.ricochet||o===e||o.iv>0||o.under||o.lead||b.hit.has(o)) return;
              if(dist2(b.x,b.y,o.x,o.y)>R*R) return;   // strict range check (forEnemiesNear only filters by grid cell)
              const a=Math.atan2(o.y-b.y,o.x-b.x);
              bullets.push({x:b.x,y:b.y,vx:Math.cos(a)*540,vy:Math.sin(a)*540,r:b.r*0.85,pierce:0,hit:new Set([e]),dist:R+40,dmgMul:(b.dmgMul||1)*mul,ric:true});
              n++; });
            for(const lb of luckies){   // also bounce to lucky blocks (not in egrid)
              if(n>=P.ricochet) break;
              if(b.hit.has(lb)||dist2(b.x,b.y,lb.x,lb.y)>R*R) continue;
              const a=Math.atan2(lb.y-b.y,lb.x-b.x);
              bullets.push({x:b.x,y:b.y,vx:Math.cos(a)*540,vy:Math.sin(a)*540,r:b.r*0.85,pierce:0,hit:new Set([e]),dist:R+40,dmgMul:(b.dmgMul||1)*mul,ric:true});
              n++;
            }
          }
          if(P.tremor && Math.random() < 0.22+P.tremor*0.05){   // Tremor Rounds: ground shock splashes nearby foes
            const R=34+P.tremor*7, sd=P.dmg*(0.3+P.tremor*0.12)*(P.abyssalMul||1);
            forEnemiesNear(b.x,b.y,R,(o)=>{ if(o===e||o.iv>0||o.under||o.lead) return; if(dist2(b.x,b.y,o.x,o.y)<R*R){ o.hp-=sd; o.hitT=Math.max(o.hitT,0.05); } });
            parts.push({x:b.x,y:b.y,vx:0,vy:0,life:0.18,max:0.18,color:'#caa15a',r:R,ring:true,gr:R*2.4});
          }
          // Explosive Shot: ignite on hit, spread to nearby enemies
          if(P.chain>0 && !b.ric && !e.fire && !(e.fireImmune>0)){
            const fireDmg = P.dmg*(b.dmgMul||1)*0.10;
            const fireDur = P.chainEvo?5:3;
            e.fire={dur:fireDur,dmg:fireDmg,tickCd:0.5};
            burst(e.x,e.y,'#ff6a00',10,180);
            if(P.chainNova) parts.push({x:e.x,y:e.y,vx:0,vy:0,life:0.3,max:0.3,color:'#ff6a00',r:60,ring:true,gr:320});
            const spreadN=P.chainEvo?999:P.chain-1;
            let sp=0;
            for(const o of enemies){
              if(sp>=spreadN||o===e||o.iv>0||o.under||o.fire||(o.fireImmune>0)) continue;
              if(dist2(e.x,e.y,o.x,o.y)<200*200){
                o.fire={dur:fireDur*0.8,dmg:fireDmg*0.8,tickCd:0.5};
                burst(o.x,o.y,'#ff6a00',5,120);
                sp++;
              }
            }
          }
          if(b.pierce>0){ b.pierce--; } else { bullets.splice(i,1); }
          hitDone=true; break;   // one enemy per frame (pierced bullets hit the next on later frames)
        }
      }
    }
    if(!hitDone){   // lucky blocks aren't in the enemy grid — test them directly (there are only a few)
      for(const lb of luckies){
        if(b.hit.has(lb)) continue;
        if(dist2(b.x,b.y,lb.x,lb.y) < (lb.r+b.r)*(lb.r+b.r)){
          b.hit.add(lb);
          if(P.luckyXpOnly){
            hitSpark(b.x,b.y,'#ffe14d',false);
            damageLucky(lb,lb.hp,b.x,b.y,false);
          } else {
            const isCrit = b.luckyCrit ? true : (P.noCrit ? false : Math.random()<(P.crit+(P.overdrive?(P.frenzy||0)*0.001:0)));
            const rngMul = P.noCrit ? (0.5+Math.random()*0.75) : 1;
            const dmg = P.dmg * (b.dmgMul||1) * (P.abyssalMul||1) * (1 + (P.frenzy||0)*0.002) * (isCrit?(P.critMul||3):1) * rngMul * (P.luckyBlockDmgMul||1);
            hitSpark(b.x,b.y,isCrit?'#ffe14d':'#ff9f3a',isCrit);
            damageLucky(lb,dmg,b.x,b.y,isCrit);
          }
          if(b.pierce>0){ b.pierce--; } else { bullets.splice(i,1); }
          break;
        }
      }
    }
  }

  // --- pet bullets (visual projectiles, deal damage on arrival) ---
  for(let i=petBullets.length-1;i>=0;i--){
    const pb=petBullets[i];
    const dx=pb.tx-pb.x, dy=pb.ty-pb.y, dist=Math.hypot(dx,dy);
    if(dist<12){
      if(pb.target && pb.target.hp>0 && pb.target.iv<=0){
        pb.target.hp-=pb.dmg; pb.target.hitT=Math.max(pb.target.hitT||0,0.1);
        texts.push({x:pb.target.x,y:pb.target.y-(pb.target.r||16)-4,str:String(Math.round(pb.dmg)),color:'#6be8ff',size:13,life:0.9,max:0.9,vy:-55,vx:(Math.random()-0.5)*120});
        burst(pb.x,pb.y,'#6be8ff',5,60);
      }
      petBullets.splice(i,1); continue;
    }
    const spd=620, scale=spd*dt/dist;
    pb.x+=dx*scale; pb.y+=dy*scale;
    pb.tx=pb.target.x; pb.ty=pb.target.y;   // track moving target
  }

  // --- spawn during wave ---
  spawnTimer -= dt;
  if(!betweenWaves && waveEnemiesLeft>0 && spawnTimer<=0){
    spawnTimer = Math.max(0.14, 0.85 - wave*0.04);
    if(spawnEnemy() !== false) waveEnemiesLeft--;   // at the cap? keep the budget and retry next tick
  }

  // --- enemies ---
  // Infinite-map modes: cull enemies that wandered too far — they respawn around the player via normal spawn budget
  if(infiniteMapMode() && !chalBossActive){
    const cullD = spawnRingDist()+400, CULL_DSQ = cullD*cullD;   // must stay well beyond the spawn ring or wide/zoomed-out screens cull enemies the instant they spawn
    for(let i=enemies.length-1;i>=0;i--){
      const e=enemies[i];
      if(e && !e.isBoss && dist2(e.x,e.y,P.x,P.y)>CULL_DSQ) enemies.splice(i,1);
    }
  }
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    if(!e) continue;   // worldCleared() can shrink the array mid-loop (boss dies while adds are alive)
    e.t += dt;
    if(e.hitT>0) e.hitT-=dt;
    if(e.sq>0) e.sq-=dt*4;
    if(e.frz>0) e.frz-=dt;
    if(e.chillT>0) e.chillT-=dt;
    if((e.fireImmune||0)>0) e.fireImmune-=dt;
    if(e.fire){
      e.fire.dur-=dt; e.fire.tickCd-=dt;
      if(e.fire.tickCd<=0){
        e.fire.tickCd=0.5;
        e.hp-=e.fire.dmg; e.hitT=Math.max(e.hitT,0.06);
        floatText(e.x,e.y-e.r-4,Math.round(e.fire.dmg),'#ff6a00',11);
        if(P.chainHeal>0) P.hp=Math.min(P.maxHp,P.hp+P.chainHeal);
      }
      if(Math.random()<dt*10) parts.push({x:e.x+rand(-e.r*.5,e.r*.5),y:e.y-e.r*.2,vx:rand(-18,18),vy:rand(-90,-35),life:.38,max:.38,color:Math.random()<.5?'#ff6a00':'#ffcc00',r:rand(2,5)});
      if(e.fire.dur<=0){ e.fire=null; e.fireImmune=1; }
    }

    if(e.isBoss){
      updateBoss(e,dt);
    } else if(e.under){
      // burrowed: travel toward the player underground (untargetable), then surface with a pop
      e.digT-=dt;
      const a=Math.atan2(P.y-e.y,P.x-e.x);
      e.x=clamp(e.x+Math.cos(a)*e.sp*1.35*dt,WALL,WORLD.w-WALL); e.y=clamp(e.y+Math.sin(a)*e.sp*1.35*dt,WALL,WORLD.h-WALL);
      if(e.digT<=0){ e.under=false; e.iv=0.2; burst(e.x,e.y,'#7a5a30',16,220); }
    } else {
      if(e.iv>0) e.iv-=dt;
      // sweep spoke (sweep cast) — rotating dual bullet arm
      if(e.spin>0){ e.spin-=dt; e.spinT=(e.spinT||0)-dt; if(e.spinT<=0){ e.spinT=0.12; e.sphase=(e.sphase||0)+0.5; const col=e.spinCol||'#b06ff0'; fireEB(e.x,e.y,e.sphase,150,col); fireEB(e.x,e.y,e.sphase+Math.PI,150,col); } }
      // sinkhole pull aura — drags the player toward this enemy every frame
      if(e.pullAura){ const a=Math.atan2(e.y-P.y,e.x-P.x); P.x=clamp(P.x+Math.cos(a)*e.pullAura*dt,WALL+P.r,WORLD.w-WALL-P.r); P.y=clamp(P.y+Math.sin(a)*e.pullAura*dt,WALL+P.r,WORLD.h-WALL-P.r); }
      // hazard trail — leaves cracked, damaging ground behind it as it moves
      if(e.trail){ e.trailT-=dt; if(e.trailT<=0){ e.trailT=e.trail.cd||0.5; addZone(e.x,e.y,e.trail.r||34,{tele:0.15,life:e.trail.life||1.5,dps:e.trail.dps||7,slow:e.trail.slow,col:e.trail.col||'#5a3d28'}); } }
      // turtle: periodically pull into an invulnerable shell and hold still
      if(e.shell && e.iv<=0){ e.shellCd-=dt; if(e.shellCd<=0){ e.iv=1.6; e.shellCd=4.5; } }
      // charge-dash state machine (Penguino slide, Tigrrullini pounce, ...)
      let dashing=false;
      if(e.dash){
        if(e.dst==='wind'){ e.dwin-=dt; dashing=true; if(e.dwin<=0){ e.dst='dash'; e.ddur=0.32; } }
        else if(e.dst==='dash'){ e.ddur-=dt; dashing=true; e.x+=Math.cos(e.da)*460*dt; e.y+=Math.sin(e.da)*460*dt; if(e.ddur<=0){ e.dst='idle'; e.dcd=rand(2.6,4.6); } }
        else { e.dcd-=dt; if(e.dcd<=0 && e.iv<=0 && dist2(e.x,e.y,P.x,P.y)<380*380){ e.dst='wind'; e.dwin=0.5; e.da=Math.atan2(P.y-e.y,P.x-e.x); dashing=true; } }
      }
      // Fantasma's stealth: enemies stay put (and hold fire) unless he's close or they've been shot recently
      let awake=true;
      if(P.stealthAggro && !e.isBoss){
        e.aggroT=Math.max(0,(e.aggroT||0)-dt);
        awake = e.aggroT>0 || dist2(e.x,e.y,P.x,P.y) <= STEALTH_RADIUS*STEALTH_RADIUS;
      }
      if(!dashing && e.iv<=0){
        const fs = e.frz>0 ? 0.2 : (e.chillT>0 ? 0.55 : 1);     // frozen (0.2x) / Permafrost chill (0.55x)
        if(awake){
          const toP = Math.atan2(P.y-e.y, P.x-e.x);
          const d2  = dist2(e.x,e.y,P.x,P.y);
          const rng = e.range||0;           // 0 = melee: always chase
          let a = toP + Math.sin(e.t*e.wob)*0.4;
          let move = true;
          if(rng>0){
            if(d2 > rng*rng){ /* out of range: approach (move already true) */ }
            else if(d2 < (rng*0.55)*(rng*0.55)){ move=true; a = toP+Math.PI + Math.sin(e.t*e.wob)*0.4; } // too close: back off
            else if(e.shoot && e.shoot.move){ a = toP + Math.PI/2; } // in range + mobile: strafe
            else { move=false; }                                  // in range + stationary: hold
          }
          if(move){ e.x += Math.cos(a)*e.sp*fs*dt; e.y += Math.sin(a)*e.sp*fs*dt; }
          e.face = Math.cos(toP)>=0 ? 1 : -1;
        } else {
          // asleep to Fantasma: slow drifting wander instead of chasing
          const wa = e.t*0.6 + e.wob*7;
          e.x += Math.cos(wa)*e.sp*0.3*fs*dt; e.y += Math.sin(wa)*e.sp*0.3*fs*dt;
          e.face = Math.cos(wa)>=0 ? 1 : -1;
        }
      }
      separate(e);   // resolve overlaps with nearby foes so the pack spreads + flows around
      e.x = clamp(e.x, WALL, WORLD.w-WALL); e.y = clamp(e.y, WALL, WORLD.h-WALL);
      if(arena){ e.x=clamp(e.x, arena.x+e.r, arena.x+arena.w-e.r); e.y=clamp(e.y, arena.y+e.r, arena.y+arena.h-e.r); }
      if(wave>=3 && e.iv<=0 && awake){
        if(e.shoot && (!e.range || dist2(e.x,e.y,P.x,P.y) <= e.range*e.range)){
          e.shootCd -= dt;
          if(e.shootCd<=0){
            e.shootCd = e.shoot.cd || rand(2.5,4.5);
            const spd = e.shoot.spd||140, col = e.shoot.col||'#e23b3b';
            muzzleFlash(e.x, e.y, col);   // colored puff = "this enemy fired these bullets"
            const opts = e.shoot.split ? {split:true, splitT:0.55} : undefined;
            if(e.shoot.arc){               // lobbed shot: telegraphed landing zone instead of a bullet line
              const n=e.shoot.n||1; for(let k=0;k<n;k++) addZone(P.x+rand(-30,30)+ (k-(n-1)/2)*40, P.y+rand(-30,30), 40, {tele:0.85, life:0.5, dps:15, col});
            }
            else if(e.shoot.type==='ring'){ const n=e.shoot.n||8, off=rand(0,TAU); for(let k=0;k<n;k++) fireEB(e.x,e.y, off+k*TAU/n, spd, col, opts); }
            else { const n=e.shoot.n||1, aim=Math.atan2(P.y-e.y,P.x-e.x); for(let k=0;k<n;k++) fireEB(e.x,e.y, aim+(k-(n-1)/2)*0.18, spd, col, opts); }
          }
        }
        if(e.cast){                        // generic dirt-caster ability (geyser / debris / sweep / summon)
          e.castCd -= dt;
          const cRng = e.cast.range || 420;      // cap casts that had no range so they can't fire from across the map
          const inRange = dist2(e.x,e.y,P.x,P.y) <= cRng*cRng;
          if(e.castCd<=0 && inRange){
            const c=e.cast; e.castCd = c.cd||3.5;
            if(c.kind==='geyser'){ const a=Math.atan2(P.y-e.y,P.x-e.x), lines=c.lines||1; for(let l=0;l<lines;l++) geyserLine(e.x,e.y, a + (l-(lines-1)/2)*0.5, c.col, c.n||5); muzzleFlash(e.x,e.y,c.col||'#e0503f'); }
            else if(c.kind==='debris'){ debrisDrop(c.n||3, c.col); }
            else if(c.kind==='sweep'){ e.spin=c.dur||1.4; e.spinCol=c.col||'#b06ff0'; e.sphase=Math.atan2(P.y-e.y,P.x-e.x); muzzleFlash(e.x,e.y,c.col||'#b06ff0'); }
            else if(c.kind==='summon'){ summonAdds(e, c.spr||'golubiro', c.n||3, c.cap||4); floatText(e.x,e.y-e.r-6,'summon!','#d2a0ff',12); }
          }
        }
        if(e.aoe){
          e.aoeCd -= dt;
          const aoeRng = e.aoe.range || 360;     // no more infinite-range slows/earthquakes
          if(e.aoeCd<=0 && dist2(e.x,e.y,P.x,P.y) <= aoeRng*aoeRng){
            e.aoeCd = e.aoe.cd||3.5;
            const z = Object.assign({}, e.aoe, { tele: Math.max(e.aoe.tele||0, 1.0) });   // forewarning: >=1s before it slows/hurts
            addZone(P.x+rand(-24,24), P.y+rand(-24,24), e.aoe.r, z);
          }
        }
        if(e.support){     // Capybarelli heals nearby foes -> priority kill
          e.supCd -= dt;
          if(e.supCd<=0){ e.supCd=2.6; let healed=false;
            for(const o of enemies){ if(o!==e && !o.isBoss && o.hp<o.maxHp && dist2(e.x,e.y,o.x,o.y)<150*150){ o.hp=Math.min(o.maxHp,o.hp+o.maxHp*0.10); healed=true; } }
            if(healed) floatText(e.x,e.y-e.r-6,'+heal','#7ed957',13);
          }
        }
      }
    }

    if(!e.under && dist2(e.x,e.y,P.x,P.y) < (e.r+P.r)*(e.r+P.r)){
      const hitLands = P.inv<=0 && P.dashT<=0 && P.shield<=0;   // the contact actually deals damage this frame
      hurtPlayer((e.isBoss?20:10)*(e.dmgBuff||1), e);
      if(P.thorns>0 && hitLands && !e.isBoss) damageEnemy(e, P.thorns, P.x, P.y, false);   // Spiky Peel
      if(e.kb && e.dst==='dash'){   // charging boulder bowls the player back
        const a=Math.atan2(P.y-e.y,P.x-e.x);
        P.x=clamp(P.x+Math.cos(a)*120, WALL+P.r, WORLD.w-WALL-P.r); P.y=clamp(P.y+Math.sin(a)*120, WALL+P.r, WORLD.h-WALL-P.r);
        shake=Math.max(shake,7);
      }
    }

    // Executioner: instant kill below threshold
    if(P.execute>0 && e.hp>0 && !e.isBoss && !e.lead && e.hp/e.maxHp < P.execute) e.hp=0;
    if(e.hp<=0 && !e.lead){   // duo partner (e.lead) is never killed on its own -> damage routes to the lead
      enemies.splice(i,1);
      kills++; setKillHUD();
      if(typeof fireHook==='function') fireHook('onKill', e);
      sfx.hit();
      if(deathShakeOn) shake=Math.max(shake,e.isBoss?16:5); hitstop=Math.max(hitstop,e.isBoss?0.08:0.03);
      burst(e.x,e.y,'#ff9f3a',e.isBoss?60:14,e.isBoss?420:200);
      if(P.aftershock && Math.random() < 0.12+P.aftershock*0.06){   // Aftershock: kills erupt a quake that damages nearby foes
        const R=70+P.aftershock*10, qd=P.dmg*(2+P.aftershock)*(P.abyssalMul||1);
        forEnemiesNear(e.x,e.y,R,(o)=>{ if(o.iv>0||o.under||o.lead) return; if(dist2(e.x,e.y,o.x,o.y)<R*R){ o.hp-=qd; o.hitT=Math.max(o.hitT,0.08); } });
        parts.push({x:e.x,y:e.y,vx:0,vy:0,life:0.3,max:0.3,color:'#caa15a',r:R,ring:true,gr:R*2.5});
        shake=Math.max(shake,4);
      }
      if(P.vamp>0){ P.hp=Math.min(P.maxHp,P.hp+P.vamp); }
      if(P.frenzyGain>0) P.frenzy=Math.min(P.frenzyMax, P.frenzy+P.frenzyGain);
      if(P.frostfire && e.frz>0){          // Frostfire Core: frozen foes shatter into shards
        for(let s=0;s<4;s++){ const a=s*(TAU/4)+rand(0,0.6);
          bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*420,vy:Math.sin(a)*420,r:6,pierce:1,hit:new Set(),dist:300,dmgMul:0.5}); }
        burst(e.x,e.y,'#bfe6ff',8,180);
      }
      if(e.isBoss && timerMode()){
        // Challenger/practice-timer-based boss kill
        boss=null; arena=null;
        $('bossbar').classList.add('hidden');
        ebullets=[];
        enemies=enemies.filter(o=>o.isBoss);
        zones=[];
        if(gameMode==='challenger' && chalBossIdx>=CHAL_BOSS_TIMES.length-1){
          chalWorldCleared(e);   // final challenger boss → world clear (practice never reaches this — hasMoreMilestones() is always true)
        } else {
          chalBossIdx++;
          chalBossActive=false;
          playMusic(curTheme.music); sfx.win();
          bigText('BOSS DOWN','#4aa3df');
          const bossNum=chalBossIdx;
          const nLarge=8+(bossNum-1)*3, nCoin=2+(bossNum-1);
          for(let g=0;g<nLarge;g++) dropOrb(e.x,e.y,3,120,300);
          for(let g=0;g<nCoin;g++){ const a=rand(0,TAU),s=rand(120,300); gems.push({x:e.x,y:e.y,coin:true,t:rand(0,6),vx:Math.cos(a)*s,vy:Math.sin(a)*s}); }
          if(!P.hasMagnetPet){ const a=rand(0,TAU),s=rand(60,120); gems.push({x:e.x,y:e.y,magnet:true,t:0,vx:Math.cos(a)*s,vy:Math.sin(a)*s}); }
          // Resume continuous spawning
          waveEnemiesLeft=9999; spawnTimer=0; betweenWaves=false;
          sfx.wave();
        }
      } else if(e.isBoss && !curWorld().endless && wave === curWorld().waveTarget){
        boss=null; arena=null;
        $('bossbar').classList.add('hidden');
        ebullets=[];
        worldCleared(e);            // cutscene path (later task); skip normal drops/reopen
      } else if(e.isBoss){
        boss=null; arena=null;       // open the field back up
        $('bossbar').classList.add('hidden');
        playMusic(curTheme.music); sfx.win();
        bigText('BOSS DOWN','#4aa3df');
        const bossNum=Math.max(1,Math.floor(wave/5));          // 1st boss=1, 2nd=2, ...
        const nLarge=8+(bossNum-1)*3, nCoin=2+(bossNum-1);     // coins now scarce; escalate slowly per boss
        for(let g=0; g<nLarge; g++) dropOrb(e.x, e.y, 3, 120, 300);
        for(let g=0; g<nCoin; g++){ const a=rand(0,TAU), s=rand(120,300); gems.push({x:e.x,y:e.y,coin:true,t:rand(0,6),vx:Math.cos(a)*s,vy:Math.sin(a)*s}); }
        if(!P.hasMagnetPet){ const a=rand(0,TAU), s=rand(60,120); gems.push({x:e.x,y:e.y,magnet:true,t:0,vx:Math.cos(a)*s,vy:Math.sin(a)*s}); }
        ebullets=[];
        enemies = enemies.filter(o=>o.isBoss);   // clear summoned adds so the boss wave can clear (else it stalls)
        zones=[];                                 // drop lingering boss hazard zones
      } else {
        if(e.death && e.death.type==='ring'){ const n=e.death.n||4; for(let k=0;k<n;k++) fireEB(e.x,e.y,k*TAU/n,150,'#e58a3a'); }
        if(e.death && e.death.type==='split') spawnSplit(e);
        dropOrb(e.x, e.y, orbTier(e.xp));
        if(Math.random()<0.03){ const a=rand(0,TAU), s=rand(90,210); gems.push({x:e.x,y:e.y,coin:true,t:0,vx:Math.cos(a)*s,vy:Math.sin(a)*s}); }
        if(Math.random()<0.025){ const a=rand(0,TAU), s=rand(90,210); gems.push({x:e.x,y:e.y,heart:true,t:0,vx:Math.cos(a)*s,vy:Math.sin(a)*s}); }
      }
    }
  }

  // advance after the cleared-gap. In-update countdown (NOT a wall-clock setTimeout) so it
  // pauses with the game and can never be dropped by a pause/blur firing during the gap.
  if(betweenWaves && waveGapT>0 && !timerMode()){ waveGapT-=dt; if(waveGapT<=0){ waveGapT=0; wave++; startWave(); } }

  // wave cleared? (not while the boss is still incoming; skip in timer-mode — enemies spawn endlessly)
  if(!betweenWaves && bossPending<=0 && waveEnemiesLeft===0 && enemies.length===0 && !timerMode()){
    betweenWaves=true; waveGapT=2.2;
    bigText('WAVE CLEARED','#5fbf52');
    if(typeof fireHook==='function') fireHook('waveEnd');
  }

  // --- enemy bullets ---
  if(ebullets.length>MAXEB) ebullets.splice(0, ebullets.length-MAXEB);   // bound bullet-hell worst case (drop oldest)
  for(let i=ebullets.length-1;i>=0;i--){
    const b=ebullets[i];
    if(b.orbit){   // Saturn ring: revolve around a fixed center while spiralling outward
      b.orbit.ang += b.orbit.angV*dt; b.orbit.rad += b.orbit.radV*dt;
      b.x = b.orbit.cx + Math.cos(b.orbit.ang)*b.orbit.rad;
      b.y = b.orbit.cy + Math.sin(b.orbit.ang)*b.orbit.rad;
    } else { b.x += b.vx*dt*P.bslow; b.y += b.vy*dt*P.bslow; }
    b.t = (b.t||0)+dt;
    if(b.x<-30||b.x>WORLD.w+30||b.y<-30||b.y>WORLD.h+30||b.t>9){ ebullets.splice(i,1); continue; }
    if(b.split && b.t>=b.splitT){    // shard bursts into a 3-way fan mid-flight
      const base=Math.atan2(b.vy,b.vx), sp=Math.hypot(b.vx,b.vy);
      for(let s=-1;s<=1;s++) fireEB(b.x,b.y, base+s*0.32, sp, b.color);
      ebullets.splice(i,1); continue;
    }
    if(dist2(b.x,b.y,P.x,P.y) < (b.r+P.r-3)*(b.r+P.r-3)){ ebullets.splice(i,1); hurtPlayer(8); }
  }

  // --- lucky blocks ---
  if(infiniteMapMode() && !chalBossActive && state===ST.PLAY){
    // Infinite-map modes: periodic lucky block spawns around the player; Fortunato gets double cap
    chalLuckyT -= dt;
    const chalLuckyCap = P.luckyXpOnly ? 6 : 3;
    if(chalLuckyT<=0){
      chalLuckyT = P.luckyXpOnly ? 7 : 12;   // Fortunato: every 7s; others every 12s
      if(luckies.length < chalLuckyCap){
        const n = chalLuckyCap - luckies.length;
        const offEdge = Math.hypot(W,H)/(2*zoom);   // world units to the viewport edge diagonal
        for(let k=0;k<n;k++){
          const a=rand(0,TAU), d=offEdge+rand(60,220);   // just off screen in all cases
          const x=P.x+Math.cos(a)*d, y=P.y+Math.sin(a)*d;
          const hp=5*HP_MULT*(1+(wave-1)*0.10);
          const lb={x,y,r:26,hp,maxHp:hp,t:rand(0,TAU),hitT:0,sq:0};
          if(typeof fireHook==='function') fireHook('onLuckySpawn', lb);
          if(!lb.heavy && Math.random()<0.02) lb.heavy=true;
          luckies.push(lb);
        }
      }
    }
    // Despawn lucky blocks too far away; they'll respawn near player next tick
    const LUCKY_CULL = 1400*1400;
    for(let i=luckies.length-1;i>=0;i--){
      if(dist2(luckies[i].x,luckies[i].y,P.x,P.y)>LUCKY_CULL) luckies.splice(i,1);
    }
  } else if(boss && boss.finalPhase && state===ST.PLAY){
    bossLuckyT -= dt;
    if(bossLuckyT<=0){ bossLuckyT = 20; spawnBossLucky(2); }
  } else if(boss && state===ST.PLAY){
    if(P.hp/P.maxHp < 0.25 && luckies.length===0) spawnBossLucky(2, 15);
  }
  for(let i=luckies.length-1;i>=0;i--){
    const lb=luckies[i];
    lb.t+=dt; if(lb.hitT>0) lb.hitT-=dt; if(lb.sq>0) lb.sq-=dt*4;
    if(lb.hp<=0){ luckies.splice(i,1); popLucky(lb); }
  }

  // --- gems ---
  for(let i=gems.length-1;i>=0;i--){
    const g=gems[i];
    g.t+=dt;
    if(g.vx||g.vy){ g.x += g.vx*dt; g.y += g.vy*dt; const damp = Math.pow(0.0008, dt); g.vx *= damp; g.vy *= damp; }
    const d = dist2(g.x,g.y,P.x,P.y);
    if(g.vac){   // magnet active: home in fast from anywhere on the map
      const dd=Math.sqrt(d)||1; const sp=900;
      g.x += (P.x-g.x)/dd*sp*dt; g.y += (P.y-g.y)/dd*sp*dt;
    } else if(d < P.magnet*P.magnet){
      const dd=Math.sqrt(d)||1;
      const pull = 460*(1 - dd/P.magnet) + 130;
      g.x += (P.x-g.x)/dd*pull*dt; g.y += (P.y-g.y)/dd*pull*dt;
    }
    if(d < (P.r+12)*(P.r+12)){
      gems.splice(i,1);
      if(g.heart){ const h=g.heal||(g.big?50:25); P.hp=Math.min(P.maxHp,P.hp+h); floatText(P.x,P.y-24,'+'+h,'#e8556a',g.big?20:16); burst(P.x,P.y,'#ff97a6',g.big?14:8,140); sfx.coin(); }
      else if(g.coin){ const v=Math.round(5*(P.goldMul||1)*coinMult()*worldCoinMul()*(gameMode==='challenger'?Math.min(3.5,1.3+worldIdx*0.3):1)); worldCoins+=v; if(gameMode!=='practice'){ gold+=v; saveGold(); if(window.markDirty) window.markDirty(); } setCoinHUD(); floatText(g.x,g.y,'+'+v,'#f5c542',13); sfx.coin(); }
      else if(g.magnet){ for(const o of gems) o.vac=true; floatText(P.x,P.y-24,'MAGNET','#9fe0ff',16); burst(P.x,P.y,'#9fe0ff',12,160); sfx.level(); }   // pull in every pickup on the map
      else { gainXp(g.v); sfx.gem(2); }
    }
  }

  // --- ground hazard zones ---
  for(let i=zones.length-1;i>=0;i--){
    const z=zones[i]; z.t+=dt;
    const active = z.t>=z.tele && z.t<z.tele+z.life;
    if(z.friendly){
      // player-owned field: damages enemies, never the player
      if(active){
        forEnemiesNear(z.x,z.y,z.r,(e)=>{
          if(e.iv>0 || e.under || e.lead) return;
          if(dist2(z.x,z.y,e.x,e.y) < z.r*z.r){
            e.hp -= z.dps*dt; e.hitT=Math.max(e.hitT,0.05);
            if(z.slow) e.chillT=Math.max(e.chillT||0, 0.4);
          }
        });
      }
    } else if(active && P.dashT<=0 && P.inv<=0 && dist2(z.x,z.y,P.x,P.y)<z.r*z.r){
      P.hp -= z.dps*dt*worldDmgMul(); hitFlash=Math.max(hitFlash,0.3);
      if(z.slow) P.slowT=Math.max(P.slowT,0.4);
      if(P.hp<=0){ gameOver(); }
    }
    if(z.t>z.tele+z.life) zones.splice(i,1);
  }

  // --- particles & texts ---
  if(parts.length>MAXPARTS) parts.splice(0, parts.length-MAXPARTS);   // cap particle count (drop oldest)
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];
    if(p.ring){
      p.r+=(p.gr||600)*dt; p.life-=dt;
      if(p.life<=0 || p.r>1400) { parts.splice(i,1); continue; }  // cull huge off-screen rings
      continue;
    }
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.9; p.vy*=0.9; p.life-=dt;
    if(p.life<=0) parts.splice(i,1);
  }
  for(let i=texts.length-1;i>=0;i--){
    const t=texts[i]; t.x+=(t.vx||0)*dt; t.y+=t.vy*dt; t.life-=dt;
    if(t.life<=0) texts.splice(i,1);
  }

  if(shake>0) shake = Math.max(0, shake - dt*40);
  if(hitFlash>0) hitFlash -= dt*3;

  $('xpfill').style.width = (P.xp/P.xpNext)*100+'%';
  { const displayTime=timerMode()?chalElapsed:elapsed;
    const sec=Math.floor(displayTime);
    if(sec!==_lastSec){ _lastSec=sec;
      const tt=$('timetag'); if(tt) tt.textContent=fmtTime(displayTime);
      if(timerMode() && !chalBossActive && hasMoreMilestones()){
        const rem=Math.max(0, Math.ceil(nextBossTimeSec()-chalElapsed));
        const rm=Math.floor(rem/60), rs=rem%60;
        const wt=$('wavetag'); if(wt) wt.textContent='BOSS IN '+(rm>0?rm+':'+(rs<10?'0':'')+rs:rs+'s');
      } else if(timerMode() && chalBossActive){
        const wt=$('wavetag'); if(wt) wt.textContent='BOSS FIGHT';
      }
    }
  }
  if(boss){
    if(boss.finalPhase){
      // ONE bar that means phases 1+2; on entering phase 3 it REFILLS during the charge-up, then is phase 3's own bar
      let w;
      if(boss.charging>0)      w = 1 - boss.charging/FINAL_CHARGE;          // power-up: empty -> full
      else if(boss.vph>=3)     w = boss.hp/boss.ph3at;                       // phase 3 bar
      else                     w = (boss.hp-boss.ph3at)/(boss.maxHp-boss.ph3at);  // phases 1+2 bar
      $('bossfill').style.width = clamp(w,0,1)*100+'%';
      const fin = boss.charging>0 || boss.vph>=3;                            // magenta once phase 3 has begun
      $('bossfill').style.background = fin ? 'linear-gradient(#ff7ae0,#c01e9c)' : 'linear-gradient(#ff5a5a,#d63030)';
    } else if(boss.bars===2){
      $('bossfill').style.width  = clamp((boss.hp-boss.bar2)/boss.bar1,0,1)*100+'%';
      $('bossfill2').style.width = clamp(boss.hp/boss.bar2,0,1)*100+'%';
    } else $('bossfill').style.width = Math.max(0,(boss.hp/boss.maxHp)*100)+'%';
  }
}

function damageEnemy(e,dmg,fx,fy,crit){
  if(e.iv>0 || e.under){
    // scripted stages can allow partial damage via vulnMul (0 = immune, 0.3 = 30% damage etc.)
    if(!(e.scriptVulnMul > 0)) return;
    dmg *= e.scriptVulnMul;
  }
  if(e.lead){ damageEnemy(e.lead,dmg,fx,fy,crit); e.hitT=0.12; e.sq=1; return; }  // duo partner routes to the lead's shared HP
  if(!P.trueDmg && e.front!=null && fx!=null){     // frontal armor: hits from the player-facing arc are softened
    const toSrc=Math.atan2(fy-e.y,fx-e.x), toP=Math.atan2(P.y-e.y,P.x-e.x);
    let d=Math.abs(((toSrc-toP+Math.PI)%TAU+TAU)%TAU-Math.PI);
    if(d<1.2) dmg*=e.front;
  }
  if(P.coldBlood && (e.frz>0 || e.chillT>0)) dmg *= (1 + 0.12*P.coldBlood);   // Cold Blooded: bonus vs chilled/frozen
  if(P.laststand && P.hp/P.maxHp < 0.4) dmg *= (1 + 0.14*P.laststand);          // Last Stand: rally while wounded
  if(P.jackpot && Math.random()<P.jackpot){                                   // Lucky Spin: jackpot double-damage
    dmg *= 2;
    if(P.showstopper && !crit){ dmg *= P.critMul; crit=true; }                // Showstopper: jackpots also crit
    floatText(e.x,e.y-e.r-20,'JACKPOT!','#ffd24a',16);
  }
  e.hp -= dmg; e.hitT=0.12; e.sq=1;
  if(P.stealthAggro && !e.isBoss) e.aggroT=Math.max(e.aggroT||0,3);   // getting shot wakes the enemy up
  if(P.freeze && !e.isBoss) e.frz=1.2;
  if(P.chillHit && !e.isBoss && e.frz<=0) e.chillT = Math.max(e.chillT||0, 0.8 + 0.25*P.chillHit);   // Permafrost: chill-on-hit
  sfx.hit();
  const _dvx=(Math.random()-0.5)*120;
  // spread simultaneous hits (piercing/multishot) apart from spawn so they don't stack into illegible overlap
  const _jx=rand(-14,14), _jy=rand(-6,6);
  texts.push({x:e.x+_jx,y:e.y-e.r-4+_jy,str:(crit?'':'')+Math.round(dmg),color:crit?'#ffd23a':'#fff',size:crit?18:13,life:0.9,max:0.9,vy:-55,vx:_dvx});
  if(crit) texts.push({x:e.x+_jx,y:e.y-e.r-40+_jy,str:'CRIT',color:'#ffd23a',size:15,life:0.9,max:0.9,vy:-55,vx:_dvx});
}

function fireEB(x,y,a,sp,color,opts){
  const b={x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:7,color};
  if(opts) Object.assign(b,opts);
  ebullets.push(b);
}

// ---- boss move primitives (finite bursts) ----
function mRing(e,n,spd,col){ const off=rand(0,TAU); for(let i=0;i<n;i++) fireEB(e.x,e.y,off+i*TAU/n,spd,col); muzzleFlash(e.x,e.y,col); }
function mAimed(e,n,spread,spd,col){ const aim=Math.atan2(P.y-e.y,P.x-e.x); for(let i=0;i<n;i++) fireEB(e.x,e.y,aim+(i-(n-1)/2)*spread,spd,col); muzzleFlash(e.x,e.y,col); }
// a ring with a wide MISSING arc (a "safe hole") — looks dense but you just walk through the gap. gapFrac = fraction of the circle left open.
function mRingGap(e,n,spd,col,gapFrac,gapAt){
  const off=rand(0,TAU), gs=(gapAt==null?rand(0,TAU):gapAt), gw=TAU*(gapFrac||0.28);
  for(let i=0;i<n;i++){ const a=off+i*TAU/n;
    const d=Math.abs(((a-gs+Math.PI)%TAU+TAU)%TAU-Math.PI);   // angular distance to gap center
    if(d<gw/2) continue;
    fireEB(e.x,e.y,a,spd,col); }
  muzzleFlash(e.x,e.y,col);
}

// ---- World 2 shared hazard helpers (used by dirt enemies AND bosses) ----
// a marching row of telegraphed zones erupting from (x,y) along angle a
function geyserLine(x,y,a,col,n=5,step=46){
  for(let k=1;k<=n;k++) addZone(x+Math.cos(a)*step*k, y+Math.sin(a)*step*k, 34, {tele:0.35+k*0.12, life:0.45, dps:15, col:col||'#e0503f'});
}
// a full WALL of bullets sweeping across the arena from one edge, with a single moving gap to slip through.
// the gap is the telegraph: you see the hole coming and walk into it. (scripted-finale bullet-hell pattern)
function mWall(side, spd, col, gapAt, gapW, n){
  if(!arena) return; const a=arena;
  if(side==='left'||side==='right'){
    const x=side==='left'?a.x+12:a.x+a.w-12, vx=side==='left'?spd:-spd;
    for(let i=0;i<n;i++){ const y=a.y+(i+0.5)*a.h/n; if(Math.abs(y-gapAt)<gapW) continue; ebullets.push({x,y,vx,vy:0,r:7,color:col}); }
  } else {
    const y=side==='top'?a.y+12:a.y+a.h-12, vy=side==='top'?spd:-spd;
    for(let i=0;i<n;i++){ const x=a.x+(i+0.5)*a.w/n; if(Math.abs(x-gapAt)<gapW) continue; ebullets.push({x,y,vx:0,vy,r:7,color:col}); }
  }
  sfx.warn();
}
// a telegraphed LINE of hazard zones spanning the arena with one safe gap (a "wall you step through" on the ground)
function zoneLine(horizontal, pos, gapAt, gapW, col, n, tele){
  if(!arena) return; const a=arena;
  for(let i=0;i<n;i++){
    if(horizontal){ const x=a.x+(i+0.5)*a.w/n; if(Math.abs(x-gapAt)<gapW) continue; addZone(x,pos,46,{tele:tele||0.8,life:0.5,dps:15,col}); }
    else { const y=a.y+(i+0.5)*a.h/n; if(Math.abs(y-gapAt)<gapW) continue; addZone(pos,y,46,{tele:tele||0.8,life:0.5,dps:15,col}); }
  }
}
// shortest distance from point (px,py) to the segment (ax,ay)-(bx,by) — used by the duo tether beam
function segDist(px,py,ax,ay,bx,by){
  const dx=bx-ax, dy=by-ay, l2=dx*dx+dy*dy || 1;
  let t=((px-ax)*dx+(py-ay)*dy)/l2; t=clamp(t,0,1);
  const cxp=ax+t*dx, cyp=ay+t*dy;
  return Math.hypot(px-cxp,py-cyp);
}
// overhead rocks dropping near the player
function debrisDrop(n=3,col){
  for(let k=0;k<n;k++) addZone(P.x+rand(-100,100), P.y+rand(-100,100), 40, {tele:0.9, life:0.5, dps:16, col:col||'#9a7a52'});
}
// spawn a lightweight minion of the given sprite, tagged to its summoner for the cap count
function spawnMini(spr,x,y,summoner){
  const def = curFoes.find(f=>f.spr===spr) || {spr, hp:3, sp:84, r:15, xp:1, score:8};
  enemies.push({ spr:def.spr, name:def.name||'', x:clamp(x,WALL,WORLD.w-WALL), y:clamp(y,WALL,WORLD.h-WALL),
    r:def.r||15, hp:(def.hp||3)*HP_MULT, maxHp:(def.hp||3)*HP_MULT, sp:def.sp||84, xp:def.xp||1, score:def.score||8,
    t:rand(0,TAU), wob:rand(2,4), shootCd:99, frz:0, iv:0, isBoss:false, hitT:0, sq:0, face:1, summoner });
}
function summonAdds(e,spr,n,cap){
  const live = enemies.filter(o=>o.summoner===e).length;
  for(let k=0;k<n && live+k<cap; k++){ const a=rand(0,TAU), d=rand(46,82); spawnMini(spr, e.x+Math.cos(a)*d, e.y+Math.sin(a)*d, e); }
  burst(e.x,e.y,'#d2a0ff',12,180);
}
// burst a dying enemy into smaller, non-splitting copies
function spawnSplit(e){
  const n=(e.death&&e.death.n)||2, hp=Math.max(1,Math.round(e.maxHp*0.34));
  for(let k=0;k<n;k++){ const a=k/n*TAU+rand(0,1);
    enemies.push({ spr:e.spr, name:e.name, x:e.x+Math.cos(a)*16, y:e.y+Math.sin(a)*16,
      r:Math.max(10,e.r*0.62), hp, maxHp:hp, sp:e.sp*1.18, xp:1, score:Math.round((e.score||10)*0.4),
      t:rand(0,TAU), wob:rand(2,4), shootCd:99, frz:0, iv:0, isBoss:false, hitT:0, sq:0, face:1 }); }
  burst(e.x,e.y,'#d8504a',10,180);
}
// move pool for the current boss / Vaca phase
function bossMoves(e){
  switch(e.mk||e.spr){
    // ---- World 1 ----
    case 'tralalero': return ['dash','spiral','aimed3'];
    case 'crocodilo': return ['carpet','ring16'];
    case 'sahur':     return ['slam','aimed5','dblslam'];
    case 'gorillo':
      if(e.vph>=3) return ['roll','SPIRAL_STORM','seedsmash','RING_VOLLEY','ring12'];
      if(e.vph>=2) return ['roll','seedsmash','ring12','RING_VOLLEY'];
      return ['roll','seedsmash','ring12'];
    case 'trippi':
      if(e.vph>=3) return ['warp','TWIN_STORM','RING_VOLLEY','spiral'];
      if(e.vph>=2) return ['warp','spiral','ring16','SPIRAL_STORM'];
      return ['warp','spiral','ring16'];
    case 'vaca':
      if(e.vph>=3) return ['ring2x','pullspiral','aimed5','SPIRAL_STORM'];
      if(e.vph>=2) return ['ring2','spiral','aimed5','pull','RING_VOLLEY'];
      return ['ring16','pull'];
    // ---- World 2 (CITRUS COAST) — original movesets, unique per phase. Flashy but forgiving. ----
    case 'eccocavallo':                    // B1: echo / music bruiser
      if(e.vph>=3) return ['NOTE_SPIRAL','ECHO_RINGS','GALLOP','HOOF_STOMP','NOTE_VOLLEY'];
      if(e.vph>=2) return ['ECHO_RINGS','GALLOP','HOOF_STOMP','NOTE_VOLLEY'];
      return ['NOTE_VOLLEY','HOOF_STOMP','ECHO_RINGS'];
    case 'tigrwater':                      // B2: watermelon pounce predator
      if(e.vph>=3) return ['RIND_SPIRAL','POUNCE','MELON_BURST','SEED_FAN'];
      if(e.vph>=2) return ['POUNCE','MELON_BURST','SEED_FAN','RIND_SPIRAL'];
      return ['SEED_FAN','POUNCE','MELON_BURST'];
    case 'avocadorilla':                   // B3: armored heavy
      if(e.vph>=3) return ['PIT_PINWHEEL','BOULDER_ROLL','CHEST_POUND','AVO_SMASH','GUAC_RAIN'];
      if(e.vph>=2) return ['AVO_SMASH','BOULDER_ROLL','CHEST_POUND','GUAC_RAIN'];
      return ['CHEST_POUND','AVO_SMASH','GUAC_RAIN'];
    case 'tracotucotulu':                  // B4: aerial toucan finale — spectacle bullet-hell, forgiving
      if(e.vph>=3) return ['RAINBOW_SPIRAL','DIVE_BOMB','BEAK_BARRAGE','FRUIT_RAIN','FEATHER_FAN'];
      if(e.vph>=2) return ['DIVE_BOMB','FEATHER_FAN','BEAK_BARRAGE','FRUIT_RAIN'];
      return ['BEAK_BARRAGE','DIVE_BOMB','FRUIT_RAIN'];
    // ---- World 3 (FORESTA FRUTOSA) — telegraphed melee/zone fights ----
    case 'subrosa':                        // B1: thorn garden
      if(e.vph>=3) return ['ROSE_LUNGE','THORN_RING','PETAL_FAN','BLOOM_STORM','THORN_RING'];
      if(e.vph>=2) return ['ROSE_LUNGE','THORN_RING','PETAL_FAN','BLOOM_STORM'];
      return ['ROSE_LUNGE','THORN_RING','PETAL_FAN','ROSE_LUNGE'];   // extra ROSE_LUNGE to vary p1 loop
    case 'bobritoboss':                    // B2: blades perpetually orbit it (gimmick) — ranged fan + dashes
      if(e.vph>=3) return ['BLADE_FAN','KNIFE_VOLLEY','MACHETE_DASH','DOUBLE_DASH'];
      if(e.vph>=2) return ['BLADE_FAN','KNIFE_VOLLEY','MACHETE_DASH','DOUBLE_DASH'];
      return ['BLADE_FAN','MACHETE_DASH','KNIFE_VOLLEY','BLADE_FAN']; // extra BLADE_FAN weight keeps pressure up
    case 'frullone':                       // B3: centrifuge
      if(e.vph>=3) return ['BLENDER_CHARGE','GRIND_ZONE','VORTEX_PULL','BLENDER_CHARGE'];
      if(e.vph>=2) return ['BLENDER_CHARGE','GRIND_ZONE','BLENDER_CHARGE'];
      return ['BLENDER_CHARGE','GRIND_ZONE','BLENDER_CHARGE'];       // removed meaningless ring spray
    case 'cocofantoboss':                  // B4 FINAL: armoured colossus w/ arena quake gimmick + coconut bullet-hell
      if(e.vph>=3) return ['COCONUT_STORM','QUAKE_RING','STAMPEDE','TREMOR_STOMP','COCONUT_BARRAGE'];
      if(e.vph>=2) return ['STOMP_QUAKE','QUAKE_RING','COCONUT_BARRAGE','TUSK_SWEEP'];
      return ['STOMP_QUAKE','COCONUT_BARRAGE','TUSK_SWEEP'];
    // ---- World 4 (GELATO GLACIER) — original frozen-dessert movesets, telegraphed & forgiving ----
    case 'tiramisubmarini':                // B1: submerging coffee sub-train (gimmick: dives & surfaces)
      if(e.vph>=3) return ['STEAM_RING','DEPTH_CHARGE','BUBBLE_VOLLEY','TORPEDO_DASH','DEPTH_CHARGE'];
      if(e.vph>=2) return ['DEPTH_CHARGE','BUBBLE_VOLLEY','TORPEDO_DASH'];
      return ['BUBBLE_VOLLEY','STEAM_RING','TORPEDO_DASH'];
    case 'frigocamello':                   // B2: ice-fridge camel
      if(e.vph>=3) return ['FROST_CONE','ICE_FAN','BODY_SLAM','ICE_SUMMON','ICE_FAN'];
      if(e.vph>=2) return ['FROST_CONE','ICE_FAN','BODY_SLAM'];
      return ['ICE_FAN','BODY_SLAM','FROST_CONE'];                   // p1 now has 3 moves
    case 'magotiramisu':                   // B3: tiramisu frost-wizard
      if(e.vph>=3) return ['ARCANE_SPIRAL','FROST_BOLTS','HEX_FIELD','CONJURE','ARCANE_RING'];
      if(e.vph>=2) return ['FROST_BOLTS','HEX_FIELD','ARCANE_RING','CONJURE'];
      return ['FROST_BOLTS','ARCANE_RING','HEX_FIELD'];
    case 'icebearlini':                    // B4: polar-bear colossus (W4 finale)
      if(e.vph>=3) return ['FROST_SPIRAL','AVALANCHE_CHARGE','ORANGE_BURST','GLACIER_SLAM','PERMA_RING'];
      if(e.vph>=2) return ['AVALANCHE_CHARGE','ORANGE_BURST','GLACIER_SLAM','PERMA_RING'];
      return ['GLACIER_SLAM','ORANGE_BURST','AVALANCHE_CHARGE'];
    // ---- World 5 (CIRCO BRAINROTTO) — carnival movesets w/ bounce/teleport flourishes (band 3) ----
    case 'trapezino':                      // B1: acrobat (gimmick: swings across the arena)
      if(e.vph>=3) return ['RING_TOSS','HOOP_RING','CONFETTI_TOSS','TRAPEZE_SWING'];
      if(e.vph>=2) return ['RING_TOSS','HOOP_RING','CONFETTI_TOSS','TRAPEZE_SWING'];
      return ['RING_TOSS','HOOP_RING','CONFETTI_TOSS','TRAPEZE_SWING']; // full acrobatic kit from p1
    case 'giostra':                        // B2: living carousel (gimmick: orbits the arena firing spokes)
      if(e.vph>=3) return ['CALLIOPE_RING','HORSE_CHARGE','CALLIOPE_ZONE','CAROUSEL_SPIN'];
      if(e.vph>=2) return ['CALLIOPE_RING','HORSE_CHARGE','CALLIOPE_ZONE'];
      return ['CALLIOPE_RING','CALLIOPE_ZONE','HORSE_CHARGE'];        // p1 now has 3 moves
    case 'mangiafuoco':                    // B3: fire-eater (gimmick: embers orbit it)
      if(e.vph>=3) return ['EMBER_JUGGLE','FIRE_JUGGLE','FIRE_BREATH','EMBER_RING'];
      if(e.vph>=2) return ['FIRE_BREATH','EMBER_RING','EMBER_JUGGLE','FIRE_JUGGLE'];
      return ['FIRE_BREATH','EMBER_RING','EMBER_JUGGLE'];             // p1 now has 3 moves
    case 'granpagliaccio':                 // B4 FINAL: the Great Ringmaster (gimmick: blinks + summons acts)
      if(e.vph>=3) return ['CONFETTI_SPIRAL','BALLOON_RING','SUMMON_ACT','CONFETTI_SPIRAL'];
      if(e.vph>=2) return ['BALLOON_RING','CONFETTI_SPIRAL','SUMMON_ACT'];
      return ['BALLOON_RING','SUMMON_ACT'];
    // ---- World 2 (DIRT DEPTHS) ----
    case 'tatasahur':                      // burrow-slam + marching drum beat
      if(e.vph>=3) return ['DRUM_MARCH','BURROW_DOUBLE','DEBRIS3','aimed5','AIMED_WALL'];
      if(e.vph>=2) return ['DRUM_MARCH','BURROW_SLAM','DEBRIS3','ring2'];
      return ['BURROW_SLAM','aimed3','ring16'];
    case 'hotspot':                        // geyser ground-denial + rotating sweep
      if(e.vph>=3) return ['GEYSER_SWEEP','QUAKE_RADIAL','dblslam','RING_VOLLEY'];
      if(e.vph>=2) return ['GEYSER_SWEEP','QUAKE_CROSS','aimed5','SPIRAL_STORM'];
      return ['QUAKE_LINE','slam','ring16'];
    case 'saturnita':                      // lava floor + Saturn orbital rings
      if(e.vph>=3) return ['SATURN_RING','MELTDOWN','spiral','SPIRAL_STORM'];
      if(e.vph>=2) return ['SATURN_RING','LAVA_POOL','EMBER_RAIN','aimed5'];
      return ['LAVA_POOL','ring16','aimed3'];
    case 'tralala2':                       // the BOUNCE boss — ricochets off the walls
      if(e.vph>=3) return ['RICOCHET','SWEEP_DUAL','ring2','TWIN_STORM'];
      if(e.vph>=2) return ['RICOCHET','PRISM_SPLIT','ring2','RING_VOLLEY'];
      return ['SWEEP','ring16','aimed3'];
    case 'croco2':                         // brood / adds + carpet bombing run
      if(e.vph>=3) return ['CARPET_RUN','BROOD_BURST','SPORE_FIELD','RING_VOLLEY'];
      if(e.vph>=2) return ['CARPET_RUN','SUMMON','spiral','SPIRAL_STORM'];
      return ['SUMMON','ring16','aimed5'];
    case 'madudung':                       // final boss — lead (tether links the duo)
      if(e.vph>=3) return ['TETHER','DEVOUR','MELTDOWN','SUMMON','SPIRAL_STORM'];
      if(e.vph>=2) return ['TETHER','LAVA_POOL','SWEEP_DUAL','BURROW_DOUBLE','RING_VOLLEY'];
      return ['BURROW_SLAM','QUAKE_LINE','aimed5','ring16'];
    case 'garamaraman':                    // final boss — duo partner (complementary)
      if(e.vph>=3) return ['QUAKE_RADIAL','EMBER_RAIN','spiral','TWIN_STORM'];
      if(e.vph>=2) return ['QUAKE_CROSS','PRISM_SPLIT','aimed5','RING_VOLLEY'];
      return ['QUAKE_LINE','aimed5','ring12'];
  }
  return ['ring16'];
}
const MOVE_COL = { dash:'#e54d4d', spiral:'#e54d4d', aimed3:'#e23b3b', aimed5:'#e23b3b',
  ring16:'#4aa3df', ring12:'#3f7d33', ring2:'#7ec8ff', ring2x:'#d2a0ff', carpet:'#ff2e2e',
  slam:'#a9763e', dblslam:'#a9763e', seedsmash:'#e0503f', pull:'#d2a0ff', pullspiral:'#d2a0ff',
  roll:'#e0503f', warp:'#c77dff',
  // World 2
  BURROW_SLAM:'#7a5a30', BURROW_DOUBLE:'#7a5a30', DEBRIS3:'#9a7a52',
  QUAKE_LINE:'#e0503f', QUAKE_CROSS:'#e0503f', QUAKE_RADIAL:'#e0503f',
  LAVA_POOL:'#e0503f', EMBER_RAIN:'#ff7a2a', MELTDOWN:'#ff7a2a',
  SWEEP:'#b06ff0', SWEEP_DUAL:'#d2a0ff', PRISM_SPLIT:'#7ec8ff',
  EXPAND_IMPLODE:'#d2a0ff', SUMMON:'#d2a0ff', SPORE_FIELD:'#7ab955',
  BROOD_BURST:'#d2a0ff', DEVOUR:'#d2a0ff',
  RICOCHET:'#7ec8ff', DRUM_MARCH:'#a9763e', GEYSER_SWEEP:'#e0503f',
  SATURN_RING:'#ffd24a', CARPET_RUN:'#ff7a2a', TETHER:'#ff5acd',
  // bullet-hell phase moves
  SPIRAL_STORM:'#ff5acd', TWIN_STORM:'#c77dff', RING_VOLLEY:'#7ec8ff', AIMED_WALL:'#e23b3b',
  // World 2 (Citrus Coast) originals
  NOTE_VOLLEY:'#ffd24a', HOOF_STOMP:'#c9923f', ECHO_RINGS:'#ffe08a', GALLOP:'#ffd24a', NOTE_SPIRAL:'#ffd24a',
  SEED_FAN:'#3f7d33', POUNCE:'#e0503f', MELON_BURST:'#e0503f', RIND_SPIRAL:'#e0503f',
  CHEST_POUND:'#6b8e23', AVO_SMASH:'#5c7a2e', GUAC_RAIN:'#7ab955', BOULDER_ROLL:'#7ab955', PIT_PINWHEEL:'#5c7a2e',
  BEAK_BARRAGE:'#ff7a2a', DIVE_BOMB:'#ff7a2a', FRUIT_RAIN:'#ff5acd', FEATHER_FAN:'#9fe0ff', RAINBOW_SPIRAL:'#ff5acd',
  // World 3 (FORESTA FRUTOSA)
  ROSE_LUNGE:'#e91e63', THORN_RING:'#c62828', PETAL_FAN:'#e91e63', BLOOM_STORM:'#e91e63',
  MACHETE_DASH:'#c0392b', KNIFE_VOLLEY:'#c0392b', BLADE_ORBIT:'#9e9e9e', DOUBLE_DASH:'#c0392b',
  BLADE_SPRAY:'#9e9e9e', BLENDER_CHARGE:'#e0e0e0', GRIND_ZONE:'#bdbdbd', VORTEX_PULL:'#e0e0e0',
  STOMP_QUAKE:'#8d6e63', TUSK_SWEEP:'#8d6e63', COCONUT_BARRAGE:'#8d6e63', STAMPEDE:'#8d6e63', TREMOR_STOMP:'#6d4c41',
  // World 4 (GELATO GLACIER)
  TORPEDO_DASH:'#9fd0ff', DEPTH_CHARGE:'#7ec8ff', STEAM_RING:'#cfeaff', BUBBLE_VOLLEY:'#9fd0ff',
  FROST_CONE:'#bfe6ff', ICE_FAN:'#7ec8ff', BODY_SLAM:'#a9d6ef', ICE_SUMMON:'#cfeaff',
  ARCANE_RING:'#b388ff', FROST_BOLTS:'#7ec8ff', HEX_FIELD:'#b388ff', CONJURE:'#b388ff', ARCANE_SPIRAL:'#b388ff',
  GLACIER_SLAM:'#a9d6ef', ORANGE_BURST:'#ff8f2e', AVALANCHE_CHARGE:'#bfe6ff', PERMA_RING:'#7ec8ff', FROST_SPIRAL:'#9fd0ff',
  // World 5 (CIRCO BRAINROTTO)
  TRAPEZE_SWING:'#ffd24a', RING_TOSS:'#ffd24a', HOOP_RING:'#ff5ea8',
  CAROUSEL_SPIN:'#ffd24a', HORSE_CHARGE:'#e8463c', CALLIOPE_ZONE:'#e8463c',
  FIRE_BREATH:'#ff7a2a', FIRE_JUGGLE:'#ff7a2a', EMBER_RING:'#ff7a2a',
  SUMMON_ACT:'#ff5ea8', BALLOON_RING:'#ff5ea8', BLINK:'#ff5ea8', CONFETTI_SPIRAL:'#ffd24a',
  MEGA_STORM:'#ff5acd', CROSS_STORM:'#ff9be0', SPIRAL_LITE:'#ffd24a',
  BLADE_FAN:'#e0e0e0', COCONUT_STORM:'#8d6e63', QUAKE_RING:'#8d6e63',
  CONFETTI_TOSS:'#ff5ea8', CALLIOPE_RING:'#ffd24a', EMBER_JUGGLE:'#ff7a2a' };
function pickMove(e){
  let pool=bossMoves(e);
  // bullet-hell injection: a LOT more for final-boss phase 3, a moderate bit for mid-bosses past phase 1
  if(e.finalPhase && e.vph>=3)        pool = pool.concat('MEGA_STORM','RING_VOLLEY');
  else if(!e.finalPhase && !e.partner && e.vph>=2) pool = pool.concat('SPIRAL_LITE','RING_VOLLEY');
  let m; do{ m=pick(pool); }while(pool.length>1 && m===e.lastMv); e.lastMv=m; return m;
}
// run one move; returns how long the boss stays in the "fire" state before recovering
function execMove(e){
  switch(e.mv){
    case 'dash': e.dst='wind'; e.dwin=e.enraged?0.25:0.4; e.da=Math.atan2(P.y-e.y,P.x-e.x); return 0.9;
    case 'spiral': e.spin=0.7; e.spinCol='#e54d4d'; return 0.75;
    case 'aimed3': mAimed(e,3,0.20,180,'#e23b3b'); return 0.2;
    case 'aimed5': mAimed(e,5,0.18,180,'#e23b3b'); return 0.2;
    case 'ring16': mRing(e,16,150,'#4aa3df'); return 0.2;
    case 'ring12': mRing(e,12,150,'#3f7d33'); return 0.2;
    case 'ring2':  mRing(e,16,140,'#4aa3df'); mRing(e,12,90,'#7ec8ff'); return 0.25;
    case 'ring2x': mRing(e,20,160,'#d2a0ff'); mRing(e,20,110,'#b06ff0'); return 0.25;
    case 'carpet': for(let k=0;k<3;k++) addZone(P.x+rand(-130,130),P.y+rand(-130,130),46,{tele:0.7,life:1.0,dps:16,col:'#ff2e2e'}); return 0.3;
    case 'slam':   addZone(P.x,P.y,76,{tele:0.5,life:0.7,dps:20,col:'#a9763e'}); shake=Math.max(shake,8); sfx.hit(); return 0.3;
    case 'dblslam':addZone(P.x,P.y,72,{tele:0.5,life:0.7,dps:20,col:'#a9763e'}); addZone(P.x+rand(-100,100),P.y+rand(-100,100),60,{tele:0.85,life:0.7,dps:18,col:'#a9763e'}); shake=Math.max(shake,9); sfx.hit(); return 0.45;
    case 'seedsmash': addZone(P.x,P.y,62,{tele:0.7,life:1.0,dps:18,col:'#3f7d33'}); { const off=rand(0,TAU); for(let k=0;k<12;k++) fireEB(e.x,e.y,off+k*TAU/12,130,'#e0503f'); } muzzleFlash(e.x,e.y,'#e0503f'); return 0.3;
    case 'pull':   e.pull=1.2; e.pullStr=110; return 1.2;
    case 'pullspiral': e.pull=1.4; e.pullStr=130; e.spin=1.0; e.spinCol='#d2a0ff'; return 1.0;
    case 'roll':   // Gorillo: rolling-melon charge (reuses dash fields) + seed spray + trail zones
      e.dst='wind'; e.dwin=e.enraged?0.3:0.5; e.da=Math.atan2(P.y-e.y,P.x-e.x);
      e.rollSpray=0.4; return 0.9;   // spray spans the 0.4s dash; fire window matches 'dash'
    case 'warp':   // Trippi: blink near player, then disorienting double-spiral
      e.warpT=0.45; burst(e.x,e.y,'#c77dff',18,240);   // departure tell at old position
      return 0.9;
    // ---- World 2 moves ----
    case 'BURROW_SLAM':   addZone(P.x,P.y,84,{tele:0.7,life:0.6,dps:22,col:'#7a5a30'}); shake=Math.max(shake,6); return 0.4;
    case 'BURROW_DOUBLE': addZone(P.x,P.y,76,{tele:0.6,life:0.6,dps:22,col:'#7a5a30'}); addZone(P.x+rand(-120,120),P.y+rand(-120,120),70,{tele:0.95,life:0.6,dps:20,col:'#7a5a30'}); shake=Math.max(shake,7); return 0.6;
    case 'DEBRIS3':       debrisDrop(4,'#9a7a52'); return 0.3;
    case 'QUAKE_LINE':    geyserLine(e.x,e.y,Math.atan2(P.y-e.y,P.x-e.x),'#e0503f',7,52); return 0.3;
    case 'QUAKE_CROSS':   { const a=Math.atan2(P.y-e.y,P.x-e.x); for(let q=0;q<4;q++) geyserLine(e.x,e.y,a+q*Math.PI/2,'#e0503f',6,52); return 0.35; }
    case 'QUAKE_RADIAL':  { const off=rand(0,TAU); for(let q=0;q<6;q++) geyserLine(e.x,e.y,off+q*TAU/6,'#e0503f',6,50); return 0.4; }
    case 'LAVA_POOL':     addZone(P.x,P.y,70,{tele:0.6,life:2.2,dps:16,col:'#e0503f'}); return 0.3;
    case 'EMBER_RAIN':    debrisDrop(5,'#ff7a2a'); return 0.35;
    case 'MELTDOWN':      for(let k=0;k<4;k++) addZone(rand(WALL+80,WORLD.w-WALL-80),rand(WALL+80,WORLD.h-WALL-80),66,{tele:0.7,life:2.6,dps:16,col:'#e0503f'}); mRing(e,20,150,'#ff7a2a'); return 0.4;
    case 'SWEEP':         e.spin=1.4; e.spinCol='#b06ff0'; return 1.0;
    case 'SWEEP_DUAL':    e.spin=1.6; e.spinCol='#d2a0ff'; return 1.1;
    case 'PRISM_SPLIT':   { const aim=Math.atan2(P.y-e.y,P.x-e.x); for(let k=-2;k<=2;k++) fireEB(e.x,e.y,aim+k*0.18,150,'#7ec8ff',{split:true,splitT:0.5}); muzzleFlash(e.x,e.y,'#7ec8ff'); return 0.25; }
    case 'EXPAND_IMPLODE':mRing(e,22,160,'#d2a0ff'); e.pull=1.2; e.pullStr=120; return 1.2;
    case 'SUMMON':        summonAdds(e,'golubiro',3,6); return 0.4;
    case 'SPORE_FIELD':   for(let k=0;k<4;k++) addZone(P.x+rand(-160,160),P.y+rand(-160,160),60,{tele:0.6,life:2.4,dps:8,slow:true,col:'#7ab955'}); return 0.4;
    case 'BROOD_BURST':   summonAdds(e,'golubiro',4,8); mRing(e,20,160,'#d2a0ff'); mRing(e,16,110,'#b06ff0'); return 0.4;
    case 'DEVOUR':        e.pull=1.4; e.pullStr=150; mRing(e,20,160,'#d2a0ff'); mRing(e,20,110,'#b06ff0'); return 1.2;
    // ---- original signature attacks ----
    case 'RICOCHET':      e.wd={ n:3, ang:Math.atan2(P.y-e.y,P.x-e.x), spd:e.enraged?500:430, tT:0, life:2.4 }; sfx.warn(); burst(e.x,e.y,'#7ec8ff',20,320); return 2.4;
    case 'DRUM_MARCH':    { const a=Math.atan2(P.y-e.y,P.x-e.x); for(let k=1;k<=5;k++) addZone(e.x+Math.cos(a)*92*k, e.y+Math.sin(a)*92*k, 70, {tele:0.3+k*0.22, life:0.45, dps:20, col:'#a9763e'}); sfx.hit(); return 0.7; }
    case 'GEYSER_SWEEP':  e.gsweep={ t:1.8, ang:Math.atan2(P.y-e.y,P.x-e.x), dir:Math.random()<0.5?1:-1, dropT:0 }; return 1.8;
    case 'SATURN_RING':   { const N=18, off=rand(0,TAU), dir=Math.random()<0.5?1:-1; for(let k=0;k<N;k++) fireEB(e.x,e.y,0,0,'#ffd24a',{orbit:{cx:e.x,cy:e.y,ang:off+k*TAU/N,rad:42,angV:dir*1.8,radV:58}}); muzzleFlash(e.x,e.y,'#ffd24a'); return 0.4; }
    case 'CARPET_RUN':    e.dst='wind'; e.dwin=e.enraged?0.3:0.45; e.da=Math.atan2(P.y-e.y,P.x-e.x); e.carpet=0.62; e.cbT=0; return 0.9;
    case 'TETHER':        e.tether=2.2; return 2.2;
    // ---- World 2 (Citrus Coast) signature moves: slow bullets + wide gaps = looks hard, plays easy ----
    // B1 · Ecco Cavallo Virtuoso (echo / music)
    case 'NOTE_VOLLEY':  mAimed(e,5,0.20,150,'#ffd24a'); return 0.2;
    case 'HOOF_STOMP':   { addZone(P.x,P.y,80,{tele:0.6,life:0.6,dps:18,col:'#c9923f'}); const a=rand(0,TAU); for(let q=0;q<4;q++) geyserLine(e.x,e.y,a+q*Math.PI/2,'#c9923f',5,54); shake=Math.max(shake,7); sfx.hit(); return 0.45; }
    case 'ECHO_RINGS':   e.echo={ t:1.5, ivT:0, n:18, spd:110, col:'#ffe08a', gap:0.34, at:rand(0,TAU) }; sfx.warn(); return 1.5;
    case 'GALLOP':       e.dst='wind'; e.dwin=e.enraged?0.3:0.45; e.da=Math.atan2(P.y-e.y,P.x-e.x); e.dashTrail={kind:'note',col:'#ffd24a'}; return 0.9;
    case 'NOTE_SPIRAL':  e.storm=2.0; e.stormN=6; e.stormSpd=120; e.stormStep=0.30; e.stormDir=Math.random()<0.5?1:-1; e.stormCol='#ffd24a'; e.stormCd=0.14; e.stormTwin=false; e.stormRainbow=false; sfx.warn(); return 2.0;
    // B2 · Tigrullini Watermellini (watermelon pounce)
    case 'SEED_FAN':     mAimed(e,7,0.16,150,'#3f7d33'); return 0.2;
    case 'POUNCE':       e.dst='wind'; e.dwin=e.enraged?0.3:0.5; e.da=Math.atan2(P.y-e.y,P.x-e.x); e.landFx={type:'pounce'}; sfx.warn(); return 0.9;
    case 'MELON_BURST':  { for(let k=0;k<3;k++) addZone(P.x+rand(-150,150),P.y+rand(-150,150),50,{tele:0.7,life:0.5,dps:15,col:'#e0503f'}); mRingGap(e,16,120,'#3f7d33',0.32); return 0.3; }
    case 'RIND_SPIRAL':  e.storm=2.0; e.stormN=5; e.stormSpd=120; e.stormStep=0.31; e.stormDir=Math.random()<0.5?1:-1; e.stormCol='#e0503f'; e.stormCd=0.15; e.stormTwin=(e.vph>=3); e.stormRainbow=false; sfx.warn(); return 2.0;
    // B3 · Avocadorilla (armored heavy)
    case 'CHEST_POUND':  mRingGap(e,18,120,'#6b8e23',0.28); shake=Math.max(shake,7); sfx.hit(); return 0.3;
    case 'AVO_SMASH':    { addZone(P.x,P.y,90,{tele:0.7,life:0.7,dps:20,col:'#5c7a2e'}); const a=rand(0,TAU); for(let q=0;q<6;q++) geyserLine(e.x,e.y,a+q*TAU/6,'#5c7a2e',5,52); shake=Math.max(shake,9); sfx.hit(); return 0.45; }
    case 'GUAC_RAIN':    { for(let k=0;k<4;k++) addZone(P.x+rand(-170,170),P.y+rand(-170,170),56,{tele:0.7,life:2.0,dps:8,slow:true,col:'#7ab955'}); return 0.4; }
    case 'BOULDER_ROLL': e.dst='wind'; e.dwin=e.enraged?0.35:0.55; e.da=Math.atan2(P.y-e.y,P.x-e.x); e.dashTrail={kind:'guac',col:'#7ab955'}; return 0.9;
    case 'PIT_PINWHEEL': e.storm=2.0; e.stormN=4; e.stormSpd=120; e.stormStep=0.34; e.stormDir=Math.random()<0.5?1:-1; e.stormCol='#5c7a2e'; e.stormCd=0.13; e.stormTwin=true; e.stormRainbow=false; sfx.warn(); return 2.0;
    // B4 · Tracotucotulu (aerial toucan — W2 finale, full spectacle)
    case 'BEAK_BARRAGE': mAimed(e,7,0.13,170,'#ff7a2a'); return 0.25;
    case 'DIVE_BOMB':    e.dst='wind'; e.dwin=e.enraged?0.3:0.45; e.da=Math.atan2(P.y-e.y,P.x-e.x); e.landFx={type:'dive'}; e.dashTrail={kind:'feather',col:'#9fe0ff'}; sfx.warn(); return 0.9;
    case 'FRUIT_RAIN':   { const fc=['#ff5acd','#ffd24a','#7ab955','#ff7a2a']; for(let k=0;k<6;k++) addZone(P.x+rand(-200,200),P.y+rand(-200,200),46,{tele:0.75,life:0.5,dps:14,col:fc[k%fc.length]}); return 0.4; }
    case 'FEATHER_FAN':  mAimed(e,11,0.14,135,'#9fe0ff'); return 0.3;
    case 'RAINBOW_SPIRAL': e.storm=2.4; e.stormN=6; e.stormSpd=120; e.stormStep=0.28; e.stormDir=Math.random()<0.5?1:-1; e.stormCol='#ff5acd'; e.stormCd=0.12; e.stormTwin=true; e.stormRainbow=true; sfx.warn(); return 2.4;
    // ---- bullet-hell phase moves ----
    case 'SPIRAL_STORM':  e.storm=2.4; e.stormN=9;  e.stormSpd=150; e.stormStep=0.30; e.stormDir=Math.random()<0.5?1:-1; e.stormCol='#ff5acd'; e.stormCd=0.10; e.stormTwin=false; sfx.warn(); return 2.4;
    case 'TWIN_STORM':    e.storm=2.6; e.stormN=8;  e.stormSpd=145; e.stormStep=0.26; e.stormDir=1; e.stormCol='#c77dff'; e.stormCd=0.11; e.stormTwin=true; sfx.warn(); return 2.6;
    case 'RING_VOLLEY':   mRing(e,22,180,'#4aa3df'); mRing(e,18,130,'#7ec8ff'); mRing(e,14,85,'#d2a0ff'); shake=Math.max(shake,5); return 0.4;
    case 'AIMED_WALL':    mAimed(e,9,0.12,200,'#e23b3b'); mRing(e,14,120,'#e23b3b'); return 0.3;
    // ---- moderate bullet-hell (mid-bosses, phase 2+): a short sparse rotating spiral ----
    case 'SPIRAL_LITE':   e.storm=1.4; e.stormN=5; e.stormSpd=130; e.stormStep=0.33; e.stormDir=Math.random()<0.5?1:-1; e.stormCol=e.tellCol||'#ffd24a'; e.stormCd=0.16; e.stormTwin=false; e.stormRainbow=false; sfx.warn(); return 1.4;
    // ---- heavy bullet-hell (final boss, phase 3 only) ----
    case 'MEGA_STORM':    e.storm=3.0; e.stormN=12; e.stormSpd=160; e.stormStep=0.22; e.stormDir=Math.random()<0.5?1:-1; e.stormCol='#ff5acd'; e.stormCd=0.09; e.stormTwin=true; e.stormRainbow=true; sfx.warn(); return 3.0;
    case 'CROSS_STORM':   mRing(e,30,210,'#ff5acd'); mRing(e,24,155,'#c77dff'); mRingGap(e,22,100,'#ff9be0',0.16); shake=Math.max(shake,7); sfx.hit(); return 0.5;
    // ---- per-boss signature ranged moves (added with the W2-5 gimmick pass) ----
    case 'BLADE_FAN':     mAimed(e,5,0.18,150,'#e0e0e0'); return 0.2;                                   // bobrito: a non-dash blade fan
    case 'COCONUT_STORM': e.storm=2.2; e.stormN=7; e.stormSpd=140; e.stormStep=0.27; e.stormDir=Math.random()<0.5?1:-1; e.stormCol='#8d6e63'; e.stormCd=0.12; e.stormTwin=(e.vph>=3); e.stormRainbow=false; sfx.warn(); return 2.2;
    case 'QUAKE_RING':    addZone(e.x,e.y,90,{tele:0.4,life:0.7,dps:18,col:'#8d6e63'}); mRingGap(e,18,120,'#8d6e63',0.30); shake=Math.max(shake,8); sfx.hit(); return 0.4;
    case 'CONFETTI_TOSS': mAimed(e,5,0.20,140,'#ff5ea8'); return 0.2;                                   // trapezino: ranged confetti
    case 'CALLIOPE_RING': mRingGap(e,16,130,'#ffd24a',0.28); mRingGap(e,12,90,'#e8463c',0.32); return 0.3;  // giostra: organ-pipe rings (both gapped — readable)
    case 'EMBER_JUGGLE':  { const off=rand(0,TAU); for(let k=0;k<5;k++) fireEB(e.x,e.y,off+k*TAU/5,130,'#ff7a2a'); muzzleFlash(e.x,e.y,'#ff7a2a'); return 0.25; }  // mangiafuoco: fling the juggled embers
    // ---- W3 moves ----
    case 'ROSE_LUNGE':
      e.dst='wind'; e.dwin=e.enraged?0.35:0.5; e.da=Math.atan2(P.y-e.y,P.x-e.x);
      e.landFx={type:'pounce'}; sfx.warn(); return 0.9;
    case 'THORN_RING':
      { const off=rand(0,TAU);
        for(let k=0;k<6;k++) addZone(e.x+Math.cos(off+k*TAU/6)*130, e.y+Math.sin(off+k*TAU/6)*130,
          38, {tele:0.6,life:2.0,dps:10,col:'#c62828'});
        sfx.hit(); return 0.5; }
    case 'PETAL_FAN':
      mAimed(e,5,0.22,142,'#e91e63'); return 0.25;
    case 'BLOOM_STORM':
      e.storm=1.6; e.stormN=4; e.stormSpd=108; e.stormStep=0.38;
      e.stormDir=Math.random()<0.5?1:-1; e.stormCol='#e91e63';
      e.stormCd=0.18; e.stormTwin=false; e.stormRainbow=false; sfx.warn(); return 1.6;
    case 'MACHETE_DASH':
      e.dst='wind'; e.dwin=e.enraged?0.3:0.45; e.da=Math.atan2(P.y-e.y,P.x-e.x);
      e.landFx={type:'pounce'}; sfx.warn(); return 0.9;
    case 'KNIFE_VOLLEY':
      mAimed(e,3,0.28,162,'#c0392b'); return 0.2;
    case 'BLADE_ORBIT':
      { const off=Math.atan2(P.y-e.y,P.x-e.x);
        for(let k=0;k<2;k++) fireEB(e.x,e.y,0,0,'#e0e0e0',{orbit:{cx:e.x,cy:e.y,ang:off+k*Math.PI,rad:96,angV:2.4,radV:0}});
        sfx.warn(); return 0.3; }
    case 'DOUBLE_DASH':
      e.dst='wind'; e.dwin=e.enraged?0.25:0.38; e.da=Math.atan2(P.y-e.y,P.x-e.x);
      e.landFx={type:'pounce'}; e.dashRepeat=(e.dashRepeat||0)+1; sfx.warn(); return 0.7;
    case 'BLADE_SPRAY':
      mRing(e,8,138,'#9e9e9e'); mRingGap(e,8,82,'#757575',0.40); return 0.35;
    case 'BLENDER_CHARGE':
      e.wd={n:e.vph>=3?3:1, ang:Math.atan2(P.y-e.y,P.x-e.x), spd:e.enraged?490:440, tT:0, life:2.2};
      sfx.warn(); burst(e.x,e.y,'#9e9e9e',18,300); return 2.2;
    case 'GRIND_ZONE':
      addZone(P.x,P.y,78,{tele:0.55,life:2.2,dps:13,slow:true,col:'#bdbdbd'}); return 0.35;
    case 'VORTEX_PULL':
      e.pull=1.2; e.pullStr=138; mRingGap(e,16,152,'#e0e0e0',0.30); return 1.2;
    case 'STOMP_QUAKE':
      addZone(e.x,e.y,100,{tele:0.3,life:0.6,dps:18,col:'#8d6e63'});
      { const a=rand(0,TAU); for(let q=0;q<4;q++) geyserLine(e.x,e.y,a+q*Math.PI/2,'#8d6e63',5,56); }
      shake=Math.max(shake,9); sfx.hit(); return 0.5;
    case 'TUSK_SWEEP':
      e.dst='wind'; e.dwin=e.enraged?0.4:0.58; e.da=Math.atan2(P.y-e.y,P.x-e.x);
      e.kb=true; e.landFx={type:'pounce'}; sfx.warn(); return 1.0;
    case 'COCONUT_BARRAGE':
      mAimed(e,4,0.30,142,'#8d6e63'); return 0.25;
    case 'STAMPEDE':
      e.dst='wind'; e.dwin=e.enraged?0.3:0.44; e.da=Math.atan2(P.y-e.y,P.x-e.x);
      e.kb=true; e.landFx={type:'pounce'}; e.dashRepeat=2; sfx.warn(); return 1.2;
    case 'TREMOR_STOMP':
      addZone(e.x,e.y,110,{tele:0.45,life:0.9,dps:20,col:'#6d4c41'});
      mAimed(e,5,0.24,148,'#8d6e63'); shake=Math.max(shake,10); sfx.hit(); return 0.5;
    // ---- W4 moves (GELATO GLACIER) ----
    // B1 · Tiramisubmarini (coffee sub-train)
    case 'TORPEDO_DASH':
      e.dst='wind'; e.dwin=e.enraged?0.3:0.45; e.da=Math.atan2(P.y-e.y,P.x-e.x);
      e.landFx={type:'dive'}; e.dashTrail={kind:'guac',col:'#9fd0ff'}; sfx.warn(); return 0.9;
    case 'DEPTH_CHARGE':
      for(let k=0;k<4;k++) addZone(P.x+rand(-150,150),P.y+rand(-150,150),52,{tele:0.7,life:0.6,dps:16,col:'#7ec8ff'}); return 0.35;
    case 'STEAM_RING':
      mRingGap(e,18,120,'#cfeaff',0.30); return 0.3;
    case 'BUBBLE_VOLLEY':
      mAimed(e,5,0.20,140,'#9fd0ff'); return 0.2;
    // B2 · Frigo Camello (ice-fridge camel)
    case 'FROST_CONE':
      { const a=Math.atan2(P.y-e.y,P.x-e.x);
        for(let l=-1;l<=1;l++){ const aa=a+l*0.4; for(let k=1;k<=4;k++) addZone(e.x+Math.cos(aa)*70*k, e.y+Math.sin(aa)*70*k, 46, {tele:0.4+k*0.12,life:1.4,dps:9,slow:true,col:'#bfe6ff'}); }
        sfx.warn(); return 0.5; }
    case 'ICE_FAN':
      mAimed(e, e.vph>=3?7:5, 0.16, 150, '#7ec8ff'); return 0.2;
    case 'BODY_SLAM':
      addZone(e.x,e.y,96,{tele:0.5,life:0.7,dps:20,col:'#a9d6ef'});
      { const a=rand(0,TAU); for(let q=0;q<5;q++) geyserLine(e.x,e.y,a+q*TAU/5,'#a9d6ef',5,54); }
      shake=Math.max(shake,9); sfx.hit(); return 0.45;
    case 'ICE_SUMMON':
      summonAdds(e,'gelatogattino',3,6); return 0.4;
    // B3 · Il Mago Tiramisù (frost-wizard)
    case 'ARCANE_RING':
      mRingGap(e,18,130,'#b388ff',0.28); return 0.3;
    case 'FROST_BOLTS':
      { const aim=Math.atan2(P.y-e.y,P.x-e.x); for(let k=-2;k<=2;k++) fireEB(e.x,e.y,aim+k*0.18,150,'#7ec8ff',{split:true,splitT:0.5}); muzzleFlash(e.x,e.y,'#7ec8ff'); return 0.25; }
    case 'HEX_FIELD':
      for(let k=0;k<4;k++) addZone(P.x+rand(-160,160),P.y+rand(-160,160),58,{tele:0.6,life:2.2,dps:8,slow:true,col:'#b388ff'}); return 0.4;
    case 'CONJURE':
      summonAdds(e,'ghiacciolospaziale',3,6); return 0.4;
    case 'ARCANE_SPIRAL':
      e.storm=2.0; e.stormN=6; e.stormSpd=120; e.stormStep=0.30; e.stormDir=Math.random()<0.5?1:-1; e.stormCol='#b388ff'; e.stormCd=0.13; e.stormTwin=(e.vph>=3); e.stormRainbow=false; sfx.warn(); return 2.0;
    // B4 · Ice Ice Bearlini (polar colossus)
    case 'GLACIER_SLAM':
      addZone(e.x,e.y,104,{tele:0.45,life:0.8,dps:20,col:'#a9d6ef'});
      { const a=rand(0,TAU); for(let q=0;q<6;q++) geyserLine(e.x,e.y,a+q*TAU/6,'#a9d6ef',6,56); }
      shake=Math.max(shake,11); sfx.hit(); return 0.5;
    case 'ORANGE_BURST':
      { for(let k=0;k<3;k++) addZone(P.x+rand(-150,150),P.y+rand(-150,150),50,{tele:0.7,life:0.5,dps:15,col:'#ff8f2e'}); mRingGap(e, e.vph>=3?20:16, 130, '#ff8f2e', 0.30); return 0.3; }
    case 'AVALANCHE_CHARGE':
      e.dst='wind'; e.dwin=e.enraged?0.32:0.5; e.da=Math.atan2(P.y-e.y,P.x-e.x);
      e.kb=true; e.landFx={type:'pounce'}; e.dashTrail={kind:'guac',col:'#bfe6ff'}; sfx.warn(); return 1.0;
    case 'PERMA_RING':
      mRing(e,18,150,'#7ec8ff'); mRingGap(e,14,100,'#9fd0ff',0.30); return 0.3;
    case 'FROST_SPIRAL':
      e.storm=2.2; e.stormN=7; e.stormSpd=120; e.stormStep=0.29; e.stormDir=Math.random()<0.5?1:-1; e.stormCol='#9fd0ff'; e.stormCd=0.13; e.stormTwin=(e.vph>=3); e.stormRainbow=false; sfx.warn(); return 2.2;
    // ---- W5 moves (CIRCO BRAINROTTO) ----
    // B1 · Trapezino Volantino (acrobat)
    case 'TRAPEZE_SWING':
      e.dst='wind'; e.dwin=e.enraged?0.32:0.48; e.da=Math.atan2(P.y-e.y,P.x-e.x);
      e.landFx={type:'pounce'}; e.dashTrail={kind:'note',col:'#ffd24a'}; sfx.warn(); return 0.9;
    case 'RING_TOSS':
      mAimed(e,5,0.18,150,'#ffd24a'); return 0.2;
    case 'HOOP_RING':
      mRingGap(e,16,130,'#ff5ea8',0.30); return 0.3;
    // B2 · Giostra Vorticosa (carousel)
    case 'CAROUSEL_SPIN':
      e.spin=e.vph>=3?1.8:1.4; e.spinCol='#ffd24a'; return e.vph>=3?1.4:1.1;
    case 'HORSE_CHARGE':
      e.dst='wind'; e.dwin=e.enraged?0.3:0.5; e.da=Math.atan2(P.y-e.y,P.x-e.x); e.kb=true; e.landFx={type:'pounce'}; sfx.warn(); return 1.0;
    case 'CALLIOPE_ZONE':
      for(let k=0;k<4;k++) addZone(P.x+rand(-150,150),P.y+rand(-150,150),52,{tele:0.65,life:0.7,dps:16,col:'#e8463c'}); return 0.4;
    // B3 · Mangiafuoco Draghino (fire-eater)
    case 'FIRE_BREATH':
      { const a=Math.atan2(P.y-e.y,P.x-e.x); for(let l=-1;l<=1;l++) geyserLine(e.x,e.y,a+l*0.32,'#ff7a2a',6,52); sfx.warn(); return 0.45; }
    case 'FIRE_JUGGLE':
      e.wd={ n:e.vph>=3?3:2, ang:Math.atan2(P.y-e.y,P.x-e.x), spd:e.enraged?470:410, tT:0, life:2.4 }; sfx.warn(); burst(e.x,e.y,'#ff7a2a',18,300); return 2.4;
    case 'EMBER_RING':
      mRingGap(e,18,130,'#ff7a2a',0.28); return 0.3;
    // B4 · Il Gran Pagliaccio (ringmaster finale)
    case 'SUMMON_ACT':
      summonAdds(e,'clownino',3,6); return 0.4;
    case 'BALLOON_RING':
      mRing(e,18,150,'#ff5ea8'); mRingGap(e,14,100,'#4aa3df',0.30); return 0.35;
    case 'BLINK':
      e.warpT=0.45; burst(e.x,e.y,'#ff5ea8',18,240); return 0.9;
    case 'CONFETTI_SPIRAL':
      e.storm=2.2; e.stormN=7; e.stormSpd=125; e.stormStep=0.28; e.stormDir=Math.random()<0.5?1:-1; e.stormCol='#ffd24a'; e.stormCd=0.12; e.stormTwin=(e.vph>=3); e.stormRainbow=true; sfx.warn(); return 2.2;
  }
  return 0.2;
}

// ---- per-boss signature gimmicks (World 2-5). keyed on boss move-key (e.mk) ----
const GIMMICK = {
  // W2 CITRUS COAST
  eccocavallo:'metronome', tigrwater:'seedgarden', avocadorilla:'flank', tracotucotulu:'aerial',
  // W3 FORESTA FRUTOSA
  subrosa:'thorns', bobritoboss:'bladeorbit', frullone:'centrifuge', cocofantoboss:'quake',
  // W4 GELATO GLACIER
  tiramisubmarini:'submerge', frigocamello:'coldaura', magotiramisu:'blinkconjure', icebearlini:'avalanche',
  // W5 CIRCO BRAINROTTO
  trapezino:'swing', giostra:'carousel', mangiafuoco:'juggle', granpagliaccio:'showtime',
};
// a persistent, telegraphed mechanic that gives each boss an identity beyond its move list.
// runs every frame alongside the move cycle; escalates with e.vph. kept forgiving (slow, wide gaps).
function updateGimmick(e,dt){
  if(!e.gimmick || e.scriptPause) return;
  const ph=e.vph||1;
  const gm = (e.finalPhase||e.partner) ? 1 : 1.4;   // non-final bosses fire their signature gimmick a bit less often (but often enough to feel unique)
  switch(e.gimmick){
    case 'metronome':                                   // steady off-beat ring on a quickening tempo
      e.gT-=dt; if(e.gT<=0){ e.gT = (ph>=3?1.0:ph>=2?1.3:1.6)*gm;
        mRingGap(e,12,100,'#ffe08a',0.36); parts.push({x:e.x,y:e.y,vx:0,vy:0,life:0.3,max:0.3,color:'#ffe08a',r:e.r+8,ring:true,gr:120}); }
      break;
    case 'seedgarden':                                  // plant seeds that telegraph, then burst into a small ring
      if(!e.seeds) e.seeds=[];
      e.gT-=dt; if(e.gT<=0){ e.gT = (ph>=3?1.5:ph>=2?2.0:2.6)*gm;
        const plant=(x,y)=>{ const tl=0.85; addZone(x,y,42,{tele:tl,life:0.5,dps:14,col:'#3f7d33'}); e.seeds.push({x,y,t:tl}); };
        const n=ph>=3?2:1; for(let k=0;k<n;k++) plant(P.x+rand(-120,120),P.y+rand(-120,120)); }
      for(let s=e.seeds.length-1;s>=0;s--){ const sd=e.seeds[s]; sd.t-=dt;
        if(sd.t<=0){ const off=rand(0,TAU); for(let k=0;k<6;k++) fireEB(sd.x,sd.y,off+k*TAU/6,120,'#7ab955'); muzzleFlash(sd.x,sd.y,'#7ab955'); e.seeds.splice(s,1); } }
      break;
    case 'flank':                                       // frontal armor (set at spawn) + periodic ground-pound shock ring
      e.gT-=dt; if(e.gT<=0){ e.gT = (ph>=3?2.4:3.2)*gm;
        mRingGap(e,ph>=3?18:14,118,'#6b8e23',0.30); shake=Math.max(shake,5); }
      break;
    case 'aerial':                                      // flits up out of reach, telegraphs a landing spot, rains feathers
      e.gT-=dt; if(e.gT<=0 && e.mst==='recover' && e.dst==='idle' && !(e.stun>0) && !(e.warpT>0)){ e.gT = ph>=3?3.0:4.0;
        e.iv=Math.max(e.iv,0.95); burst(e.x,e.y,'#9fe0ff',16,260);
        e.wdx=clamp(P.x+rand(-120,120),WALL+e.r,WORLD.w-WALL-e.r); e.wdy=clamp(P.y-rand(150,230),WALL+e.r,WORLD.h-WALL-e.r);
        e.warpT=0.6; e.warpCol='#9fe0ff'; e.warpFeather=(ph>=3?12:9); }   // teleport handler draws the marker + lands
      break;
    case 'thorns':                                      // slowly plants lingering thorn patches around the field
      e.gT-=dt; if(e.gT<=0){ e.gT = (ph>=3?1.6:ph>=2?2.2:2.8)*gm;
        if(arena){ const x=rand(arena.x+50,arena.x+arena.w-50), y=rand(arena.y+50,arena.y+arena.h-50);
          addZone(x,y,44,{tele:0.6,life:ph>=3?3.4:2.6,dps:8,slow:true,col:'#c62828'}); } }
      break;
    case 'bladeorbit':                                  // blades perpetually circle the boss — melee is risky
      e.gT-=dt; if(e.gT<=0){ e.gT=1.5*gm; const n=1+Math.min(ph,2);
        const off=Math.atan2(P.y-e.y,P.x-e.x); for(let k=0;k<n;k++)
          fireEB(e.x,e.y,0,0,'#e0e0e0',{orbit:{cx:e.x,cy:e.y,ang:off+k*TAU/n,rad:92,angV:2.2,radV:42}}); }
      break;
    case 'centrifuge':{                                 // constant gentle drag toward the blender + periodic blade ring
      const a=Math.atan2(e.y-P.y,e.x-P.x), str=(ph>=3?70:ph>=2?52:38);
      P.x=clamp(P.x+Math.cos(a)*str*dt,WALL+P.r,WORLD.w-WALL-P.r); P.y=clamp(P.y+Math.sin(a)*str*dt,WALL+P.r,WORLD.h-WALL-P.r);
      if(Math.random()<0.25) parts.push({x:P.x,y:P.y,vx:0,vy:0,life:0.2,max:0.2,color:'#bdbdbd',r:3});
      e.gT-=dt; if(e.gT<=0){ e.gT=(ph>=3?1.8:ph>=2?2.4:3.0)*gm;
        mRingGap(e, ph>=3?10:8, 120, '#bdbdbd', 0.35); }
      break; }
    case 'quake':                                       // arena-wide ground cracks erupting outward (final)
      e.gT-=dt; if(e.gT<=0){ e.gT = ph>=3?3.2:4.0; const off=rand(0,TAU), arms=ph>=3?8:6;
        for(let q=0;q<arms;q++) geyserLine(e.x,e.y,off+q*TAU/arms,'#8d6e63',7,58); shake=Math.max(shake,8); sfx.hit(); }
      break;
    case 'submerge':                                    // dives untargetable, slides under the player, surfaces with steam
      if(e.diving){ e.iv=Math.max(e.iv,0.2); e.stun=Math.max(e.stun||0,0.12); e.subT-=dt; const a=Math.atan2(P.y-e.y,P.x-e.x);
        e.x=clamp(e.x+Math.cos(a)*180*dt,WALL+e.r,WORLD.w-WALL-e.r); e.y=clamp(e.y+Math.sin(a)*180*dt,WALL+e.r,WORLD.h-WALL-e.r);
        if(Math.random()<0.4) parts.push({x:e.x+rand(-10,10),y:e.y+rand(-10,10),vx:0,vy:-30,life:0.4,max:0.4,color:'#9fd0ff',r:rand(2,4)});
        if(e.subT<=0){ e.diving=false; burst(e.x,e.y,'#cfeaff',22,260); mRingGap(e,18,120,'#cfeaff',0.30); shake=Math.max(shake,6); } }
      else { e.gT-=dt; if(e.gT<=0 && e.mst==='recover' && e.dst==='idle' && !(e.stun>0)){ e.gT = (ph>=3?3.6:4.6)*gm; e.diving=true; e.subT=1.1; burst(e.x,e.y,'#7ec8ff',16,200); } }
      break;
    case 'coldaura':{                                   // standing near the fridge-camel chills you
      const R=ph>=3?150:128; if(dist2(e.x,e.y,P.x,P.y)<R*R){ P.slowT=Math.max(P.slowT,0.35); }
      if(Math.random()<0.5){ const a=rand(0,TAU); parts.push({x:e.x+Math.cos(a)*R,y:e.y+Math.sin(a)*R,vx:0,vy:0,life:0.3,max:0.3,color:'#bfe6ff',r:3}); }
      break; }
    case 'blinkconjure':                                // wizard blinks about + keeps minions on the field
      e.gT-=dt; if(e.gT<=0 && e.mst==='recover' && !(e.warpT>0) && !(e.stun>0)){ e.gT = (ph>=3?3.4:4.4)*gm; e.warpT=0.45; burst(e.x,e.y,'#b388ff',16,220); }
      e.gT2-=dt; if(e.gT2<=0){ e.gT2 = (ph>=3?5.0:7.0)*gm; summonAdds(e,'ghiacciolospaziale',2,ph>=3?6:4); }
      break;
    case 'avalanche':                                   // arena-wide ice falls between charges (final)
      e.gT-=dt; if(e.gT<=0){ e.gT = ph>=3?2.6:3.4; const n=ph>=3?6:4;
        if(arena) for(let k=0;k<n;k++) addZone(rand(arena.x+40,arena.x+arena.w-40),rand(arena.y+40,arena.y+arena.h-40),48,{tele:0.85,life:0.5,dps:15,col:'#bfe6ff'}); }
      break;
    case 'swing':                                       // periodically swings across the arena (graceful ricochet)
      e.gT-=dt; if(e.gT<=0 && e.mst==='recover' && e.dst==='idle' && !e.wd && !(e.stun>0)){ e.gT = (ph>=3?3.4:4.4)*gm;
        e.wd={n:ph>=3?2:1, ang:Math.atan2(P.y-e.y,P.x-e.x), spd:430, tT:0, life:2.0}; sfx.warn(); burst(e.x,e.y,'#ffd24a',16,260); }
      break;
    case 'carousel':{                                   // continuously rotates around the arena, firing spokes
      if(e.dst==='dash'||e.dst==='wind') break;          // let HORSE_CHARGE take over cleanly
      if(arena){ const cxw=arena.x+arena.w/2, cyw=arena.y+arena.h/2, rad=Math.min(arena.w,arena.h)*0.30;
        e.gA=(e.gA||0)+(ph>=3?0.85:0.6)*dt;
        e.x=clamp(cxw+Math.cos(e.gA)*rad,WALL+e.r,WORLD.w-WALL-e.r); e.y=clamp(cyw+Math.sin(e.gA)*rad,WALL+e.r,WORLD.h-WALL-e.r); }
      e.gT-=dt; if(e.gT<=0){ e.gT=0.5*gm; const spokes=ph>=3?6:4, base=(e.gA||0)*2;
        for(let k=0;k<spokes;k++) fireEB(e.x,e.y,base+k*TAU/spokes,120,'#ffd24a'); }
      break; }
    case 'juggle':                                      // fire-eater keeps embers orbiting it (quickens with phase)
      e.gT-=dt; if(e.gT<=0){ e.gT=(ph>=3?0.9:ph>=2?1.1:1.4)*gm; const n=ph>=3?3:2, off=rand(0,TAU);
        for(let k=0;k<n;k++) fireEB(e.x,e.y,0,0,'#ff7a2a',{orbit:{cx:e.x,cy:e.y,ang:off+k*TAU/n,rad:70,angV:2.6,radV:30}}); }
      break;
    case 'showtime':                                    // ringmaster blinks + keeps a rotating cast of clowns (final)
      e.gT-=dt; if(e.gT<=0 && e.mst==='recover' && !(e.warpT>0) && !(e.stun>0)){ e.gT = ph>=3?3.0:4.0; e.warpT=0.45; burst(e.x,e.y,'#ff5ea8',16,240); }
      e.gT2-=dt; if(e.gT2<=0){ e.gT2 = ph>=3?4.5:6.5; summonAdds(e,'clownino',2,ph>=3?6:4); }
      break;
  }
}

// final boss enters phase 3: lock invincible, halt all attacks, grow the arena, begin the charge-up
function startFinalCharge(e){
  e.vph=3; e.charging=FINAL_CHARGE; e.iv=FINAL_CHARGE+0.3;
  // wipe every sustained attack so the boss truly stands down while charging
  e.storm=0; e.spin=0; e.pull=0; e.echo=null; e.gsweep=null; e.wd=null; e.warpT=0;
  e.carpet=0; e.tether=0; e.stun=0; e.dst='idle'; e.rollSpray=0; e.dashRepeat=0;
  e.mst='recover'; e.mt=FINAL_CHARGE;
  ebullets=[];
  bigText('FINAL PHASE!','#ff5acd'); shake=Math.max(shake,14); sfx.boss();
  const scr=FINAL_SCRIPT[e.mk];                 // bespoke staged finale (W3/W4) instead of the random move pool
  if(scr){ e.script=scr; e.si=0; e.sNew=true; e.sT=scr[0].dur; e.loop=0; e.scriptPause=false; }
  expandFinalArena(e);
  if(e.mate){ const m=e.mate; m.charging=FINAL_CHARGE; m.iv=FINAL_CHARGE+0.3;
    m.storm=0; m.spin=0; m.pull=0; m.echo=null; m.gsweep=null; m.wd=null; m.warpT=0;
    m.carpet=0; m.tether=0; m.stun=0; m.dst='idle'; m.mst='recover'; m.mt=FINAL_CHARGE; }
}
// grow the boss arena (the "border") for the bigger phase-3 bullet-hell, keeping it inside the world
function expandFinalArena(e){
  if(!arena) return;
  const cx0=arena.x+arena.w/2, cy0=arena.y+arena.h/2;
  const grow = gameMode==='challenger' ? CHAL_FINAL_ARENA_GROW : FINAL_ARENA_GROW;
  const naw=Math.min(arena.w*grow, WORLD.w-2*WALL), nah=Math.min(arena.h*grow, WORLD.h-2*WALL);
  const ncx=clamp(cx0,WALL+naw/2,WORLD.w-WALL-naw/2), ncy=clamp(cy0,WALL+nah/2,WORLD.h-WALL-nah/2);
  arena={x:ncx-naw/2,y:ncy-nah/2,w:naw,h:nah};
}

// ============================================================
// BESPOKE PHASE-3 FINALES (World 3 & 4)
// Instead of the random move-pool every other boss uses, these two finals run a hand-authored
// SEQUENCE of stages: invulnerable bullet-hell waves, each followed by a vulnerable DPS "pause"
// window (boss drops its guard, screen clears, big banner "STRIKE NOW"). It loops and escalates
// (e.loop). Each boss's stages are wholly distinct from each other and from every other fight.
// ============================================================
const FINAL_SCRIPT = {
  // ===== WORLD 3 · COCOFANTO MASTODONTE — "TERREMOTO FINALE" : a seismic, ground-control colossus =====
  cocofantoboss: [
    { name:'SEISMIC WALTZ', col:'#8d6e63', dur:7.5, iv:true, hold:'center',
      enter(e){ e.gsweep={ t:7.5, ang:rand(0,TAU), dir:Math.random()<0.5?1:-1, dropT:0 };
        if(e.loop>0){ e.gsweep.dir2=-e.gsweep.dir; e.gsweep.ang2=e.gsweep.ang+Math.PI; }   // a 2nd counter-rotating hand after looping
        e.sCd=0.8; },
      tick(e,dt){
        if(e.gsweep && e.gsweep.dir2!=null){ e.gsweep.ang2+=e.gsweep.dir2*1.5*dt;
          e.gsweep.d2T=(e.gsweep.d2T||0)-dt; if(e.gsweep.d2T<=0){ e.gsweep.d2T=0.16; geyserLine(e.x,e.y,e.gsweep.ang2,'#6d4c41',6,52); } }
        e.sCd-=dt; if(e.sCd<=0){ e.sCd=Math.max(0.55,0.9-e.loop*0.1);
          addZone(P.x,P.y,60,{tele:0.7,life:0.5,dps:16,col:'#8d6e63'});      // a coconut lobbed at your feet
          mRingGap(e,12+e.loop*2,120,'#8d6e63',0.34); } },
    },
    { name:'AFTERSHOCK — STRIKE NOW!', col:'#7ed957', dur:8.0, iv:false },
    { name:'COCONUT MONSOON', col:'#8d6e63', dur:7.5, iv:true, vulnMul:0.35, hold:'center',
      enter(e){ e.sCd=0.5; e.sk=0; },
      tick(e,dt){ e.sCd-=dt; if(e.sCd<=0){ e.sCd=0.95; e.sk++;
        const band=(arena?arena.y:0)+((e.sk*0.21)%1)*(arena?arena.h:600);   // a drifting row of falling coconuts
        const gx=arena?rand(arena.x+90,arena.x+arena.w-90):P.x;
        zoneLine(true, band, gx, 70, '#8d6e63', 9, 0.8);
        mRingGap(e,16+e.loop*2,130,'#a06a4a',0.30); } },
    },
    { name:'AFTERSHOCK — STRIKE NOW!', col:'#7ed957', dur:8.0, iv:false },
    { name:'STAMPEDE GAUNTLET', col:'#6d4c41', dur:7.0, iv:true, vulnMul:0.45,
      enter(e){ e.dst='wind'; e.dwin=0.45; e.da=Math.atan2(P.y-e.y,P.x-e.x); e.kb=true;
        e.landFx={type:'pounce'}; e.dashTrail={kind:'guac',col:'#8d6e63'}; e.dashRepeat=4+e.loop; sfx.warn(); },
      tick(e,dt){ if(e.dst==='idle' && (e.dashRepeat||0)<=0 && e.sT>1.4){   // re-charge if it finishes the set early
        e.dst='wind'; e.dwin=0.4; e.da=Math.atan2(P.y-e.y,P.x-e.x); e.kb=true;
        e.landFx={type:'pounce'}; e.dashTrail={kind:'guac',col:'#8d6e63'}; e.dashRepeat=2; } },
    },
    { name:'AFTERSHOCK — STRIKE NOW!', col:'#7ed957', dur:8.0, iv:false },
  ],
  // ===== WORLD 4 · ICE ICE BEARLINI — "ZERO ASSOLUTO" : a frost-storm colossus =====
  icebearlini: [
    { name:'BLIZZARD', col:'#9fd0ff', dur:7.5, iv:true, hold:'center',
      enter(e){ e.storm=7.5; e.stormN=7+e.loop; e.stormSpd=120; e.stormStep=0.26; e.stormDir=Math.random()<0.5?1:-1;
        e.stormCol='#9fd0ff'; e.stormCd=0.12; e.stormTwin=true; e.stormRainbow=false; e.sCd=1.0; sfx.warn(); },
      tick(e,dt){ e.sCd-=dt; if(e.sCd<=0){ e.sCd=1.2;   // frost drifts settle as slowing patches
        if(arena) for(let k=0;k<2;k++) addZone(rand(arena.x+50,arena.x+arena.w-50),rand(arena.y+50,arena.y+arena.h-50),56,{tele:0.7,life:2.4,dps:8,slow:true,col:'#bfe6ff'}); } },
    },
    { name:'THAW — STRIKE NOW!', col:'#7ed957', dur:8.0, iv:false },
    { name:'AVALANCHE WALLS', col:'#bfe6ff', dur:8.0, iv:true, vulnMul:0.4,
      enter(e){ e.sCd=0.4; e.sk=0; },
      tick(e,dt){ e.sCd-=dt; if(e.sCd<=0){ e.sCd=Math.max(1.3,1.8-e.loop*0.15); e.sk++;
        const a=arena; if(!a) return;
        const horiz=(e.sk%2===0);
        const side= horiz ? (e.sk%4<2?'left':'right') : (e.sk%4<2?'top':'bottom');
        const gapAt= horiz ? rand(a.y+90,a.y+a.h-90) : rand(a.x+90,a.x+a.w-90);
        mWall(side,150+e.loop*15,'#9fd0ff',gapAt,64,14); } },
    },
    { name:'THAW — STRIKE NOW!', col:'#7ed957', dur:8.0, iv:false },
    { name:'ORANGE SUPERNOVA', col:'#ff8f2e', dur:5.5, iv:true, hold:'center',
      enter(e){ e.sk=0; e.sCd=1.0; burst(e.x,e.y,'#ff8f2e',30,360); shake=Math.max(shake,10); },
      tick(e,dt){ e.sCd-=dt; if(e.sCd<=0 && e.sk<3){ e.sCd=1.4; e.sk++;   // three huge nested orange shockwaves, each with a gap
        mRing(e,26,200,'#ff8f2e'); mRingGap(e,22,150,'#ffb15a',0.20); mRingGap(e,18,100,'#ff8f2e',0.24);
        shake=Math.max(shake,8); sfx.hit(); } },
    },
    { name:'THAW — STRIKE NOW!', col:'#7ed957', dur:8.0, iv:false },
  ],
  // ===== WORLD 5 · IL GRAN PAGLIACCIO — "GRAN FINALE" : the ringmaster's three-act spectacle =====
  granpagliaccio: [
    { name:'CONFETTI CYCLONE', col:'#ff5ea8', dur:7.0, iv:true, hold:'center',
      enter(e){ e.storm=7.0; e.stormN=6+e.loop; e.stormSpd=120; e.stormStep=0.27; e.stormDir=Math.random()<0.5?1:-1;
        e.stormCol='#ff5ea8'; e.stormCd=0.13; e.stormTwin=true; e.stormRainbow=false; e.sCd=1.1; sfx.warn(); },
      tick(e,dt){ e.sCd-=dt; if(e.sCd<=0){ e.sCd=1.1; mRingGap(e,14,110,'#ffd24a',0.32); } },
    },
    { name:'INTERMISSION — STRIKE NOW!', col:'#7ed957', dur:8.0, iv:false },
    { name:'BALLOON BARRAGE', col:'#ff5ea8', dur:7.5, iv:true, vulnMul:0.35,
      enter(e){ e.sCd=0.4; e.sk=0; },
      tick(e,dt){ e.sCd-=dt; if(e.sCd<=0){ e.sCd=Math.max(1.4,1.9-e.loop*0.15); e.sk++;
        const a=arena; if(!a) return;
        const horiz=(e.sk%2===0);
        const side= horiz ? (e.sk%4<2?'left':'right') : (e.sk%4<2?'top':'bottom');
        const gapAt= horiz ? rand(a.y+90,a.y+a.h-90) : rand(a.x+90,a.x+a.w-90);
        mWall(side,140+e.loop*15,'#ff5ea8',gapAt,68,12);
        if(e.sk%2===0) summonAdds(e,'clownino',1,4); } },
    },
    { name:'INTERMISSION — STRIKE NOW!', col:'#7ed957', dur:8.0, iv:false },
    { name:'THE GRAND FINALE', col:'#ffd24a', dur:6.0, iv:true, hold:'center',
      enter(e){ e.sk=0; e.sCd=0.8; burst(e.x,e.y,'#ffd24a',30,360); shake=Math.max(shake,10); summonAdds(e,'clownino',3,6); },
      tick(e,dt){ e.sCd-=dt; if(e.sCd<=0){ e.sCd=1.0; e.sk++;
        mRingGap(e,18,160,'#ff5ea8',0.24); mRingGap(e,14,105,'#ffd24a',0.28);
        shake=Math.max(shake,6); sfx.hit(); } },
    },
    { name:'INTERMISSION — STRIKE NOW!', col:'#7ed957', dur:8.0, iv:false },
  ],
};
// drive one scripted-finale stage; advances + loops + escalates when the stage timer runs out
function runFinalScript(e,dt){
  const stages=e.script; if(!stages) return;
  if(e.sNew){ e.sNew=false; const st=stages[e.si];
    // clean slate between stages: kill every sustained attack so each beat reads clearly
    e.storm=0; e.spin=0; e.pull=0; e.gsweep=null; e.echo=null; e.wd=null; e.carpet=0;
    e.dst='idle'; e.dashRepeat=0; e.landFx=null; e.dashTrail=null; e.warpT=0;
    e.scriptPause = !st.iv;                            // pause the persistent gimmick during DPS windows
    e.scriptVulnMul = st.vulnMul != null ? st.vulnMul : (st.iv ? 0 : 1);
    if(st.iv){ e.iv=Math.max(e.iv, st.dur+0.3); }
    else { ebullets=[]; burst(e.x,e.y,'#7ed957',22,220); }   // DPS window: wipe the screen, drop the guard
    bigText(st.name, st.col); sfx.boss();
    if(st.enter) st.enter(e);
  }
  const st=stages[e.si];
  if(st.iv){ e.iv=Math.max(e.iv,0.25); e.scriptVulnMul = st.vulnMul != null ? st.vulnMul : 0; }
  if(st.hold==='center' && arena){ const cxw=arena.x+arena.w/2, cyw=arena.y+arena.h/2;
    e.x += (cxw-e.x)*2.4*dt; e.y += (cyw-e.y)*2.4*dt; }
  if(st.tick) st.tick(e,dt);
  e.sT-=dt;
  if(e.sT<=0){ e.si++; if(e.si>=stages.length){ e.si=0; e.loop=(e.loop||0)+1; } e.sNew=true; e.sT=stages[e.si].dur; }
}

function updateBoss(e,dt){
  if(e.iv>0) e.iv-=dt;
  if(!e.enraged && e.hp/e.maxHp < 0.4){ e.enraged=true; bigText('ENRAGED!','#e54d4d'); shake=Math.max(shake,12); }

  // HP-gated phases. Two-bar bosses split phase 2 at the first bar's midpoint; phase 3 = second bar.
  if(e.partner){
    e.vph = e.lead ? e.lead.vph : 1;          // duo partner mirrors the lead's phase
  } else if(e.finalPhase){
    // FINAL boss: phase 3 is a long, beefy bar (>phases 1+2). Entering it triggers a charge-up.
    const ph = e.hp>e.ph2at ? 1 : e.hp>e.ph3at ? 2 : 3;
    if(ph>e.vph){
      if(ph===3){ startFinalCharge(e); }
      else { e.vph=ph; bigText('PHASE '+ph+'!','#d2a0ff'); shake=Math.max(shake,12); e.iv=0.6; ebullets=[]; sfx.boss(); if(e.mate) e.mate.iv=0.6;
        spawnBossLucky(1); }   // final bosses: a lucky block at the start of phase 2
    }
  } else if(e.bars===2 || e.phased || e.spr==='vaca'){
    let ph;
    if(e.bars===2){ ph = e.hp > e.bar2 + e.bar1*0.5 ? 1 : e.hp > e.bar2 ? 2 : 3; }
    else { const frac=e.hp/e.maxHp; ph = frac<0.33?3 : frac<0.66?2 : 1; }
    if(ph>e.vph){ e.vph=ph; bigText(e.bars===2 && ph===3 ? 'FINAL PHASE!' : 'PHASE '+ph+'!','#d2a0ff');
      shake=Math.max(shake,12); e.iv=0.6; ebullets=[]; sfx.boss(); if(e.mate) e.mate.iv=0.6; }
  }

  // FINAL-PHASE CHARGE-UP: boss is invincible, stands still and stops attacking while powering up
  if(e.charging>0){
    e.charging-=dt; e.iv=Math.max(e.iv,0.2);
    e.sq=0.35+0.3*Math.sin(e.t*22);                       // throbbing wind-up
    if(Math.random()<0.7){ const a=rand(0,TAU), d=e.r*2.4;   // energy spiralling inward
      parts.push({x:e.x+Math.cos(a)*d,y:e.y+Math.sin(a)*d,vx:-Math.cos(a)*200,vy:-Math.sin(a)*200,life:0.45,max:0.45,color:'#ff5acd',r:rand(3,6)}); }
    shake=Math.max(shake, 3 + (1-e.charging/FINAL_CHARGE)*7);
    if(e.charging<=0){                                     // UNLEASH: big opening salvo, attacks resume
      e.charging=0; burst(e.x,e.y,'#ff5acd',44,440); shake=Math.max(shake,18); sfx.boss();
      mRing(e,30,210,'#ff5acd'); mRing(e,24,140,'#ff9be0');
      e.mst='recover'; e.mt=0.5;
    }
    return;   // no movement, no move cycle while charging
  }

  updateGimmick(e,dt);   // boss's signature persistent mechanic

  // sustained sub-attacks (run independent of the move state machine)
  let dashing=false;
  if(e.pull>0){ e.pull-=dt; const a=Math.atan2(e.y-P.y,e.x-P.x), str=e.pullStr||100;
    P.x=clamp(P.x+Math.cos(a)*str*dt,WALL+P.r,WORLD.w-WALL-P.r); P.y=clamp(P.y+Math.sin(a)*str*dt,WALL+P.r,WORLD.h-WALL-P.r); }
  if(e.dst==='wind'){ dashing=true; e.dwin-=dt; if(e.dwin<=0){ e.dst='dash'; e.ddur=0.4; } }
  else if(e.dst==='dash'){ dashing=true; e.ddur-=dt; e.x+=Math.cos(e.da)*520*dt; e.y+=Math.sin(e.da)*520*dt;
    if(e.dashTrail){ e.dtT=(e.dtT||0)-dt; if(e.dtT<=0){ e.dtT=0.06; const k=e.dashTrail;   // W2: charge moves leave a themed wake
      if(k.kind==='note'){ fireEB(e.x,e.y,e.da+Math.PI/2,120,k.col); fireEB(e.x,e.y,e.da-Math.PI/2,120,k.col); }
      else if(k.kind==='guac'){ addZone(e.x,e.y,42,{tele:0.25,life:1.6,dps:8,slow:true,col:k.col}); }
      else if(k.kind==='feather'){ parts.push({x:e.x,y:e.y,vx:0,vy:0,life:0.4,max:0.4,color:k.col,r:e.r*0.7}); fireEB(e.x,e.y,e.da+Math.PI,110,k.col); } } }
    if(e.ddur<=0){
      // W3: DOUBLE_DASH / STAMPEDE repeat — re-trigger a second charge immediately
      if(e.dashRepeat>0){
        e.dashRepeat--;
        e.dst='wind'; e.dwin=e.enraged?0.28:0.38; e.da=Math.atan2(P.y-e.y,P.x-e.x);
        if(!e.landFx) e.landFx={type:'pounce'};
      } else {
        e.dst='idle'; e.dashTrail=null;
        if(e.landFx){ const f=e.landFx; e.landFx=null;   // pounce/dive impact: telegraphed slam + a gapped ring you step out of
          if(f.type==='pounce'){ addZone(e.x,e.y,84,{tele:0.2,life:0.5,dps:20,col:'#3f7d33'}); mRingGap(e,14,120,'#e0503f',0.32); shake=Math.max(shake,8); sfx.hit(); }
          else if(f.type==='dive'){ addZone(e.x,e.y,80,{tele:0.2,life:0.5,dps:20,col:'#ff7a2a'}); mRingGap(e,16,125,'#ff7a2a',0.32); shake=Math.max(shake,8); sfx.hit(); } }
      }
    } }
  if(e.spin>0){ e.spin-=dt; e.spinT=(e.spinT||0)-dt; if(e.spinT<=0){ e.spinT=0.1; e.phase=(e.phase||0)+0.42;
    const col=e.spinCol||'#e54d4d'; fireEB(e.x,e.y,e.phase,170,col); fireEB(e.x,e.y,e.phase+Math.PI,170,col); } }
  // sustained bullet-hell storm: a rotating multi-arm spiral (optionally a counter-rotating twin)
  if(e.storm>0){ e.storm-=dt; e.stormT=(e.stormT||0)-dt;
    if(e.stormT<=0){ e.stormT=e.stormCd||0.12; e.stormA=(e.stormA||0)+(e.stormStep||0.28)*(e.stormDir||1);
      const rainbow = e.stormRainbow && worldIdx===0;          // rainbow spiral is a World 1 thing only
      let n=e.stormN||10; if(rainbow) n=Math.max(4,Math.round(n*0.5));   // and it fires far fewer bullets
      const sp=e.stormSpd||150;
      let col=e.stormCol||'#ff5acd';
      if(rainbow){ const h=((e.stormA*90)%360+360)%360; col='hsl('+h.toFixed(0)+',88%,62%)'; }   // cycles hue
      for(let k=0;k<n;k++) fireEB(e.x,e.y, e.stormA + k*TAU/n, sp, col);
      if(e.stormTwin && !rainbow) for(let k=0;k<n;k++) fireEB(e.x,e.y, -e.stormA + k*TAU/n + 0.3, sp, col);
    }
  }
  // ECHO_RINGS (Ecco Cavallo): slow expanding rings, each with a wide gap that drifts — busy-looking, easy to step through
  if(e.echo){ e.echo.t-=dt; e.echo.ivT-=dt;
    if(e.echo.ivT<=0){ e.echo.ivT=0.42; mRingGap(e,e.echo.n,e.echo.spd,e.echo.col,e.echo.gap,e.echo.at); e.echo.at+=0.6; }
    if(e.echo.t<=0) e.echo=null;
  }
  // Gorillo rolling-melon: while dashing from a 'roll', spray seeds sideways + drop trail
  if(e.rollSpray>0 && e.dst==='dash'){
    e.rollSpray-=dt; e.spT=(e.spT||0)-dt;
    if(e.spT<=0){ e.spT=0.09;
      fireEB(e.x,e.y,e.da+Math.PI/2,150,'#e0503f'); fireEB(e.x,e.y,e.da-Math.PI/2,150,'#e0503f');
      addZone(e.x,e.y,40,{tele:0.3,life:0.8,dps:14,col:'#3f7d33'}); }
  }
  // blink/teleport: pick + telegraph the destination, count down, then warp there
  if(e.warpT>0){
    if(e.wdx==null){   // commit to a landing spot on the first tick so it can be telegraphed (drawn in render)
      const a=rand(0,TAU);
      e.wdx=clamp(P.x+Math.cos(a)*180,WALL+e.r,WORLD.w-WALL-e.r);
      e.wdy=clamp(P.y+Math.sin(a)*180,WALL+e.r,WORLD.h-WALL-e.r);
    }
    e.warpT-=dt;
    if(e.warpT<=0){
      e.x=e.wdx; e.y=e.wdy; e.wdx=null; e.wdy=null;
      burst(e.x,e.y,e.warpCol||'#c77dff',22,260); e.iv=Math.max(e.iv,0.2);
      if(e.warpFeather){ const off=rand(0,TAU), n=e.warpFeather; for(let k=0;k<n;k++) fireEB(e.x,e.y,off+k*TAU/n,120,e.warpCol||'#9fe0ff'); e.warpFeather=0; }
      else { e.spin=0.7; e.spinCol=e.warpCol||'#c77dff'; }
      e.warpCol=null;
    }
  }
  // RICOCHET (Tralalero 2.0 only): rockets across the arena bouncing off the walls, trailing wake
  if(e.wd){
    dashing=true;
    e.wd.life-=dt;
    e.x += Math.cos(e.wd.ang)*e.wd.spd*dt; e.y += Math.sin(e.wd.ang)*e.wd.spd*dt;
    const minX=(arena?arena.x:WALL)+e.r, maxX=(arena?arena.x+arena.w:WORLD.w-WALL)-e.r;
    const minY=(arena?arena.y:WALL)+e.r, maxY=(arena?arena.y+arena.h:WORLD.h-WALL)-e.r;
    let bounced=false;
    if(e.x<minX){ e.x=minX; e.wd.ang=Math.PI-e.wd.ang; bounced=true; }
    else if(e.x>maxX){ e.x=maxX; e.wd.ang=Math.PI-e.wd.ang; bounced=true; }
    if(e.y<minY){ e.y=minY; e.wd.ang=-e.wd.ang; bounced=true; }
    else if(e.y>maxY){ e.y=maxY; e.wd.ang=-e.wd.ang; bounced=true; }
    if(bounced){ e.wd.n--; shake=Math.max(shake,9); sfx.hit(); burst(e.x,e.y,'#7ec8ff',16,300); mRing(e,10,150,'#7ec8ff'); }
    e.wd.tT-=dt; if(e.wd.tT<=0){ e.wd.tT=0.04; parts.push({x:e.x,y:e.y,vx:0,vy:0,life:0.4,max:0.4,color:'#7ec8ff',r:e.r*0.85}); }
    if(e.wd.n<=0 || e.wd.life<=0){   // done bouncing -> stand still & vulnerable for a beat
      e.wd=null; e.stun=2.6; e.mst='recover'; e.mt=2.6;
      burst(e.x,e.y,'#7ec8ff',24,260); shake=Math.max(shake,6); sfx.hit();
    }
  }
  // GEYSER_SWEEP (Pot Hotspot): a rotating clock-hand of erupting geyser lines
  if(e.gsweep){
    e.gsweep.t-=dt; e.gsweep.ang += e.gsweep.dir*1.7*dt; e.gsweep.dropT-=dt;
    if(e.gsweep.dropT<=0){ e.gsweep.dropT=0.13; geyserLine(e.x,e.y,e.gsweep.ang,'#e0503f',6,52); }
    if(e.gsweep.t<=0) e.gsweep=null;
  }
  // CARPET_RUN (Bombardiro 2.0): lays a carpet of delayed bombs along its bombing run
  if(e.carpet>0 && e.dst==='dash'){ e.carpet-=dt; e.cbT-=dt;
    if(e.cbT<=0){ e.cbT=0.1; addZone(e.x,e.y,58,{tele:0.5,life:0.55,dps:18,col:'#ff7a2a'}); } }
  // TETHER (final duo): a damaging beam strung between the two titans that sweeps as they move
  if(e.tether>0 && e.mate){ e.tether-=dt;
    if(P.inv<=0 && P.dashT<=0 && segDist(P.x,P.y,e.x,e.y,e.mate.x,e.mate.y) < 28) hurtPlayer(14);
  }

  // ---- telegraphed move cycle: recover -> wind -> fire -> recover ----
  if(e.stun>0) e.stun-=dt;                 // post-ricochet standstill: vulnerable, no new attacks
  const enr = e.enraged?0.65:1;
  if(e.script){                            // bespoke staged finale drives its own attacks; skip the random pool
    runFinalScript(e,dt);
  } else {
  e.mt -= dt;
  if(e.mt<=0 && !(e.stun>0)){
    if(e.mst==='recover'){ e.mst='wind'; e.mt=BOSS_WIND; e.mv=pickMove(e); e.tellCol=MOVE_COL[e.mv]||'#fff'; sfx.warn(); }
    else if(e.mst==='wind'){ e.mst='fire'; e.mt=execMove(e); }
    else { let rec=(e.spr==='vaca'&&e.vph>=3?0.7:1.1);
      if(!e.finalPhase && !e.partner) rec*=1.6;   // non-final bosses still pause between attacks, but stay lively (not sluggish)
      e.mst='recover'; e.mt=rec*enr; }
  }
  }

  // anchor drift toward the player (unless mid-dash or standing stunned, or riding its own carousel path)
  if(!dashing && !(e.stun>0) && e.gimmick!=='carousel' && !e.script){
    const tx = clamp(P.x + Math.sin(e.t*0.5)*260, WALL+e.r, WORLD.w-WALL-e.r);
    const ty = clamp(P.y - 220 + Math.cos(e.t*0.4)*60, WALL+e.r, WORLD.h-WALL-e.r);
    e.x += (tx-e.x)*0.9*dt; e.y += (ty-e.y)*0.9*dt;
  }
  if(e.mate){   // duo: keep the two titans from drifting into the same spot
    const m=e.mate, min=e.r+m.r+20; let dx=e.x-m.x, dy=e.y-m.y, d=Math.hypot(dx,dy);
    if(d<min){ if(d<0.01){ dx=1; dy=0; d=1; } const push=(min-d)/2; e.x+=dx/d*push; m.x-=dx/d*push; e.y+=dy/d*push; m.y-=dy/d*push; }
  }
  e.x = clamp(e.x, WALL+e.r, WORLD.w-WALL-e.r); e.y = clamp(e.y, WALL+e.r, WORLD.h-WALL-e.r);
  if(arena){ e.x=clamp(e.x, arena.x+e.r, arena.x+arena.w-e.r); e.y=clamp(e.y, arena.y+e.r, arena.y+arena.h-e.r); }
}

function hurtPlayer(dmg, src){
  if(P.inv>0 || P.dashT>0) return;
  // Aegis Bubble: a charge blocks the hit entirely
  if(P.shield>0){
    P.shield--; P.inv=0.8; P.shieldCd=P.shieldCdBase;
    sfx.dash(); burst(P.x,P.y,'#7ecbff',16,260);
    parts.push({x:P.x,y:P.y,vx:0,vy:0,life:0.35,max:0.35,color:'#aee4ff',r:P.r+18,ring:true,gr:260});
    if(P.aegisEvo){   // Aegis Fortress: blocking emits a damaging, bullet-clearing shockwave
      const R=170; shake=Math.max(shake,10);
      for(const e of enemies){ if(dist2(P.x,P.y,e.x,e.y)<R*R) damageEnemy(e,40*P.dmg,P.x,P.y,false); }
      ebullets = ebullets.filter(b=>dist2(P.x,P.y,b.x,b.y)>R*R);
    }
    if(P.aegisNova){ const {R,dmg}=novaStats(); novaBlast(P.x,P.y,R,dmg); }   // Aegis Nova synergy
    return;
  }
  P.hp -= dmg*(P.shieldDR||1)*(P.armor||1)*worldDmgMul(); P.inv = 0.8;
  shake = Math.max(shake,10); hitFlash = 1; hitstop=Math.max(hitstop,0.04);
  sfx.hurt(); burst(P.x,P.y,'#e54d4d',12,200);
  if(navigator.vibrate) navigator.vibrate(60);
  if(src){
    const a=Math.atan2(P.y-src.y,P.x-src.x);
    P.x = clamp(P.x+Math.cos(a)*30, WALL+P.r, WORLD.w-WALL-P.r);
    P.y = clamp(P.y+Math.sin(a)*30, WALL+P.r, WORLD.h-WALL-P.r);
  }
  if(P.hp<=0){
    if(typeof fireHook==='function') fireHook('onHpZero');
    if(P.phoenix>0){   // Phoenix: rise from the ashes instead of dying
      P.phoenix--; P.phoenixCd=P.phoenixCdBase;
      P.hp=Math.max(1,Math.round(P.maxHp*P.phoenixHeal)); P.inv=2;
      bigText('REBORN','#ff7a3a'); shake=Math.max(shake,16);
      const R=P.phoenixEvo?320:230; burst(P.x,P.y,'#ff7a3a',46,440); sfx.win();
      parts.push({x:P.x,y:P.y,vx:0,vy:0,life:0.5,max:0.5,color:'#ffd0a0',r:R,ring:true,gr:520});
      for(const e of enemies){ if(dist2(P.x,P.y,e.x,e.y)<R*R) damageEnemy(e,(P.phoenixEvo?80:50)*P.dmg,P.x,P.y,false); }
      ebullets = ebullets.filter(b=>dist2(P.x,P.y,b.x,b.y)>R*R);
      return;
    }
    // Second Wind: survive a killing blow once per charge
    if(P.secondWind>0 && P.swCd<=0){
      P.hp=1; P.inv=2.5; P.secondWind--; P.swCd=P.swCdBase;
      ebullets=[]; burst(P.x,P.y,'#4aa3df',20,280); sfx.win();
      bigText('SECOND WIND','#4aa3df'); return;
    }
    gameOver();
  }
}

// ============ RENDER ============
const TILE = 80;
function drawSprite(name, x, y, size, rot, sq, hitT, flip, tint){
  const img = SP[name]; if(!img) return;
  cx.save();
  cx.translate(x,y);
  if(rot) cx.rotate(rot);
  if(flip) cx.scale(-1,1);
  // squash & stretch
  let sxk=1, syk=1;
  if(sq>0){ const k=Math.sin(sq*Math.PI)*0.22; sxk=1+k; syk=1-k; }
  cx.scale(sxk,syk);
  // compensate for canvas padding added in makeSprite (img._nom stores nominal pre-pad size)
  const dsz = img._nom ? size * img.width / img._nom : size;
  const drawImg = (tint && tintedSprite(name,tint)) || img;
  cx.drawImage(drawImg, -dsz/2, -dsz/2, dsz, dsz);
  if(hitT>0.012){ cx.globalAlpha=Math.min(1,hitT/0.12); cx.drawImage(SPW[name], -dsz/2, -dsz/2, dsz, dsz); cx.globalAlpha=1; }   // skip the imperceptible tail of the flash to save a full extra drawImage
  cx.restore();
}

// scattered ground debris — stable per tile (hashes the tile coords, no per-frame flicker)
function drawDebris(g,gx0,gy0,gx1,gy1){
  const D = curTheme.debris||0.8;
  for(let gy=gy0; gy<gy1; gy+=TILE){
    for(let gx=gx0; gx<gx1; gx+=TILE){
      let n = ((gx*73856093) ^ (gy*19349663)) >>> 0;
      const rnd = ()=>{ n = (n*1664525 + 1013904223) >>> 0; return n/4294967296; };
      if(rnd() > 0.46*D) continue;                 // most tiles stay clear
      const px = gx + rnd()*TILE, py = gy + rnd()*TILE, t = rnd();
      if(t<0.52){                                   // rock with shadow + highlight
        const s = 4 + rnd()*7;
        g.fillStyle='#5e4d39'; g.beginPath(); g.ellipse(px, py+s*0.45, s*1.25, s*0.62, 0,0,TAU); g.fill();
        g.fillStyle='#8a7558'; g.beginPath(); g.ellipse(px, py, s*1.12, s*0.84, rnd()*TAU, 0,TAU); g.fill();
        g.fillStyle='rgba(255,240,210,0.16)'; g.beginPath(); g.ellipse(px-s*0.3, py-s*0.3, s*0.4, s*0.26, 0,0,TAU); g.fill();
      } else if(t<0.78){                            // pebble cluster
        g.fillStyle='#6b5a42';
        for(let k=0;k<3;k++){ g.beginPath(); g.arc(px+(rnd()-0.5)*14, py+(rnd()-0.5)*14, 1.6+rnd()*2.1, 0,TAU); g.fill(); }
      } else if(t<0.92){                            // hairline crack
        g.strokeStyle='rgba(26,17,9,0.5)'; g.lineWidth=1.6;
        let cxp=px, cyp=py, a=rnd()*TAU; g.beginPath(); g.moveTo(cxp,cyp);
        for(let k=0;k<3;k++){ a += (rnd()-0.5)*1.2; cxp+=Math.cos(a)*10; cyp+=Math.sin(a)*10; g.lineTo(cxp,cyp); } g.stroke();
      } else {                                      // bone shard
        g.save(); g.translate(px,py); g.rotate(rnd()*TAU); g.fillStyle='#cabfa6';
        g.fillRect(-5,-1.2,10,2.4); g.beginPath(); g.arc(-5,0,2,0,TAU); g.arc(5,0,2,0,TAU); g.fill(); g.restore();
      }
    }
  }
}

// Pre-render the whole-world ground (tiles + tufts + debris) to one offscreen canvas, ONCE per theme.
// Per frame the renderer just blits this instead of re-looping every tile — a big win in DIRT DEPTHS.
let groundCanvas=null, groundFor=null;
let infiniteGroundCanvas=null, infiniteGroundFor=null;
const INFINITE_GROUND_SPAN = TILE * 12;   // 960px: repeats checker + tuft offset cleanly
function buildGround(){
  if(!groundCanvas){ groundCanvas=document.createElement('canvas'); }
  groundCanvas.width=WORLD.w; groundCanvas.height=WORLD.h;
  const g=groundCanvas.getContext('2d');
  for(let gy=0; gy<WORLD.h; gy+=TILE){
    for(let gx=0; gx<WORLD.w; gx+=TILE){
      const odd=((gx/TILE)+(gy/TILE))&1;
      g.fillStyle = odd ? curTheme.tile1 : curTheme.tile2;
      g.fillRect(gx, gy, TILE, TILE);
    }
  }
  g.fillStyle=curTheme.tuft;
  for(let gy=0; gy<WORLD.h; gy+=TILE){
    for(let gx=0; gx<WORLD.w; gx+=TILE){
      const h=((gx*31+gy*17)%97)/97;
      if(h<0.3){ g.fillRect((gx+ (gx>>3)%60)+10, (gy+(gy>>2)%60)+12, 3, 7); }
    }
  }
  if(curTheme.debris) drawDebris(g, 0,0, WORLD.w, WORLD.h);
  groundFor=curTheme;
}
function buildInfiniteGround(){
  if(!infiniteGroundCanvas){ infiniteGroundCanvas=document.createElement('canvas'); }
  const span = INFINITE_GROUND_SPAN;
  infiniteGroundCanvas.width=span; infiniteGroundCanvas.height=span;
  const g=infiniteGroundCanvas.getContext('2d');
  for(let gy=0; gy<span; gy+=TILE){
    for(let gx=0; gx<span; gx+=TILE){
      g.fillStyle=((((gx/TILE)|0)+((gy/TILE)|0))&1)?curTheme.tile1:curTheme.tile2;
      g.fillRect(gx,gy,TILE,TILE);
    }
  }
  g.fillStyle=curTheme.tuft;
  for(let gy=0; gy<span; gy+=TILE){
    for(let gx=0; gx<span; gx+=TILE){
      const h=((gx*31+gy*17)%97)/97;
      if(h<0.3){ g.fillRect((gx+((gx>>>3)%60))+10,(gy+((gy>>>2)%60))+12,3,7); }
    }
  }
  infiniteGroundFor=curTheme;
}
function renderInfiniteGround(vx0,vy0,vx1,vy1){
  if(!infiniteGroundCanvas || infiniteGroundFor!==curTheme) buildInfiniteGround();
  const span = INFINITE_GROUND_SPAN;
  const gx0=Math.floor(vx0/span)*span, gy0=Math.floor(vy0/span)*span;
  for(let gy=gy0; gy<=vy1; gy+=span){
    for(let gx=gx0; gx<=vx1; gx+=span){
      cx.drawImage(infiniteGroundCanvas, gx, gy);
    }
  }
}

function render(){
  cx.save();
  let sx=0, sy=0;
  if(shake>0){ sx=rand(-shake,shake); sy=rand(-shake,shake); cx.translate(sx,sy); }
  cx.scale(zoom, zoom);
  cx.translate(-camera.x, -camera.y);

  const vw=W/zoom, vh=H/zoom;
  const vx0=camera.x, vy0=camera.y, vx1=vx0+vw, vy1=vy0+vh;

  // --- ground ---
  cx.fillStyle=curTheme.void;
  cx.fillRect(vx0-40, vy0-40, vw+80, vh+80);
  if(infiniteMapMode()){
    renderInfiniteGround(vx0-40, vy0-40, vx1+40, vy1+40);
  } else {
    if(!groundCanvas || groundFor!==curTheme) buildGround();
    const sx0=clamp(vx0-2,0,WORLD.w), sy0=clamp(vy0-2,0,WORLD.h);
    const sx1=clamp(vx1+2,0,WORLD.w), sy1=clamp(vy1+2,0,WORLD.h);
    if(sx1>sx0 && sy1>sy0) cx.drawImage(groundCanvas, sx0,sy0,sx1-sx0,sy1-sy0, sx0,sy0,sx1-sx0,sy1-sy0);
    drawBorder(vx0,vy0,vx1,vy1);
  }

  // --- ground hazard zones (telegraph + active) ---
  renderZones();

  // --- black holes ---
  for(const h of holes){
    if(h.x<vx0-h.r||h.x>vx1+h.r||h.y<vy0-h.r||h.y>vy1+h.r) continue;
    const k=Math.max(0,1-h.t/h.life), pr=h.r*(0.85+0.15*Math.sin(h.t*8));
    cx.globalAlpha=0.5*k; cx.fillStyle='#2a0d3a'; cx.beginPath(); cx.arc(h.x,h.y,pr,0,TAU); cx.fill();
    cx.globalAlpha=0.85*k; cx.strokeStyle='#b06ff0'; cx.lineWidth=3; cx.beginPath(); cx.arc(h.x,h.y,pr,0,TAU); cx.stroke();
    cx.globalAlpha=0.5*k; cx.strokeStyle='#d2a0ff'; cx.lineWidth=2;
    for(let s=0;s<3;s++){ const a0=h.t*4+s*TAU/3; cx.beginPath();
      for(let t=0;t<=1.001;t+=0.12){ const rr=pr*t, aa=a0+t*5, xx=h.x+Math.cos(aa)*rr, yy=h.y+Math.sin(aa)*rr; t===0?cx.moveTo(xx,yy):cx.lineTo(xx,yy);} cx.stroke(); }
    cx.globalAlpha=0.9*k; cx.fillStyle='#110018'; cx.beginPath(); cx.arc(h.x,h.y,pr*0.4,0,TAU); cx.fill();
    cx.globalAlpha=1;
  }

  // --- lucky blocks (drawn under pickups/enemies; gentle hover + hit flash) ---
  for(const lb of luckies){
    if(lb.x<vx0-60||lb.x>vx1+60||lb.y<vy0-60||lb.y>vy1+60) continue;
    const bob=Math.sin(lb.t*3)*4, wob=Math.sin(lb.t*2)*0.05;
    cx.fillStyle=lb.heavy?'rgba(10,10,10,0.35)':'rgba(40,60,25,0.28)'; cx.beginPath(); cx.ellipse(lb.x,lb.y+lb.r*0.9,lb.r*0.8,lb.r*0.3,0,0,TAU); cx.fill();
    cx.globalAlpha=0.5; cx.strokeStyle=lb.heavy?'#e0e0e0':'#ffe88a'; cx.lineWidth=lb.heavy?3:2; cx.setLineDash([6,6]);
    cx.beginPath(); cx.arc(lb.x,lb.y+bob,lb.r+(lb.heavy?12:8),0,TAU); cx.stroke(); cx.setLineDash([]); cx.globalAlpha=1;
    if(lb.heavy) cx.filter='grayscale(1) contrast(1.1)';
    drawSprite('luckyblock', lb.x, lb.y+bob, lb.r*(lb.heavy?3.4:2.6), wob, lb.sq, lb.hitT, false, null);
    if(lb.heavy) cx.filter='none';
    if(lb.hp<lb.maxHp){
      const w=lb.r*1.9;
      cx.fillStyle='rgba(0,0,0,0.45)'; cx.fillRect(lb.x-w/2,lb.y-lb.r-12,w,5);
      cx.fillStyle='#ffd23a'; cx.fillRect(lb.x-w/2,lb.y-lb.r-12,w*Math.max(0,lb.hp/lb.maxHp),5);
    }
  }

  // --- gems / pickups ---
  for(const gm of gems){
    if(gm.x<vx0-40||gm.x>vx1+40||gm.y<vy0-40||gm.y>vy1+40) continue;
    const bob=Math.sin(gm.t*5)*3;
    const orb = ORB[gm.tier] || ORB[1];
    const name = gm.magnet?'magnet':(gm.heart?'heart':(gm.coin?'coin':orb.spr));
    const psz = gm.magnet?38 : (gm.heart?(gm.big?46:32) : (gm.coin?32 : orb.sz));
    drawSprite(name, gm.x, gm.y+bob, psz, 0,0,0,false);
  }

  // --- player bullets: bright gold with a white halo = YOURS ---
  const bcore = P.railgun ? '#5fe6ff' : P.soldierBullets ? '#1a1a22' : P.whiteBullets ? '#ffffff' : '#ffd21f';
  const bhi   = P.railgun ? '#dafcff' : P.soldierBullets ? '#44444e' : P.whiteBullets ? '#bcdcff' : '#fff6bf';
  if(P.ghostBullets) cx.globalAlpha=0.6;   // Fantasma: slightly translucent shots
  for(const b of bullets){
    if(b.x<vx0-30||b.x>vx1+30||b.y<vy0-30||b.y>vy1+30) continue;
    if(b.boom){ drawBoomerangCroc(b); continue; }
    if(b.knife){ drawKnifeBullet(b); continue; }
    if(b.lucky){
      if(b.luckyCrit){ cx.filter='grayscale(1) contrast(1.1)'; drawSprite('luckyblock',b.x,b.y,b.r*7,0,0,0,false,null); cx.filter='none'; }
      else drawSprite('luckyblock',b.x,b.y,b.r*5,0,0,0,false,null);
      continue;
    }
    cx.fillStyle='#fff'; cx.beginPath(); cx.arc(b.x,b.y,b.r+2,0,TAU); cx.fill();
    cx.fillStyle=bcore; cx.beginPath(); cx.arc(b.x,b.y,b.r,0,TAU); cx.fill();
    cx.fillStyle=bhi; cx.beginPath(); cx.arc(b.x-b.r*0.3,b.y-b.r*0.3,b.r*0.4,0,TAU); cx.fill();
  }
  if(P.ghostBullets) cx.globalAlpha=1;

  // --- pet bullets: small cyan dot ---
  for(const pb of petBullets){
    if(pb.x<vx0-20||pb.x>vx1+20||pb.y<vy0-20||pb.y>vy1+20) continue;
    cx.fillStyle='#fff'; cx.beginPath(); cx.arc(pb.x,pb.y,6,0,TAU); cx.fill();
    cx.fillStyle='#6be8ff'; cx.beginPath(); cx.arc(pb.x,pb.y,4,0,TAU); cx.fill();
  }

  // --- Skibidi Toilet bullets: spinning toilets bouncing off the map edges ---
  for(const b of skibidiBullets){
    if(!b || b.dead) continue;
    if(b.x<vx0-30||b.x>vx1+30||b.y<vy0-30||b.y>vy1+30) continue;
    drawSkibidiToilet(b);
  }

  // --- orbs ---
  if(P.orbs>0 && state!==ST.MENU){
    for(let i=0;i<P.orbs;i++){
      const a=P.orbA+i*(TAU/P.orbs);
      const ox=P.x+Math.cos(a)*P.orbR, oy=P.y+Math.sin(a)*P.orbR;
      cx.fillStyle='#9fe0ff'; cx.beginPath(); cx.arc(ox,oy,9,0,TAU); cx.fill();
      cx.strokeStyle=OUT; cx.lineWidth=2.5; cx.stroke();
    }
  }

  // --- enemies (sorted by y for depth) ---
  _vis.length=0;   // reuse a scratch array instead of allocating filter()+sort() every frame
  for(const e of enemies){ if(e.x>vx0-60&&e.x<vx1+60&&e.y>vy0-60&&e.y<vy1+60) _vis.push(e); }
  _vis.sort((a,b)=>a.y-b.y);
  // idle sprite wobble forces every drawImage onto canvas's slower rotated-blit path (any non-zero
  // rotation does); skip it once there are enough visible enemies that the blit cost actually matters
  const skipWob = _vis.length > 40;
  for(const e of _vis){
    if(e.under){   // burrowed: just a heaving dirt mound that tracks the player
        const w=e.r*1.1+Math.sin(e.t*10)*3;
        cx.fillStyle='#5a3d28'; cx.beginPath(); cx.ellipse(e.x,e.y,w,w*0.5,0,Math.PI,TAU); cx.fill();
        cx.fillStyle='#6e4d34'; cx.beginPath(); cx.ellipse(e.x,e.y-2,w*0.7,w*0.32,0,Math.PI,TAU); cx.fill();
        continue;
    }
    // shadow
    cx.fillStyle='rgba(40,60,25,0.28)';
    cx.beginPath(); cx.ellipse(e.x, e.y+e.r*0.85, e.r*0.8, e.r*0.32, 0,0,TAU); cx.fill();
    if(e.dst==='wind'){   // charge-dash wind-up: shows WHERE it will charge (bosses get a long bright arrow)
      const len=e.isBoss?260:150, lw=e.isBoss?6:4;
      const ex=e.x+Math.cos(e.da)*len, ey=e.y+Math.sin(e.da)*len;
      cx.globalAlpha=0.5; cx.strokeStyle='#ff4d4d'; cx.lineWidth=lw; cx.setLineDash([12,9]); cx.lineDashOffset=-elapsed*120;
      cx.beginPath(); cx.moveTo(e.x,e.y); cx.lineTo(ex,ey); cx.stroke(); cx.setLineDash([]);
      if(e.isBoss){   // arrowhead at the target so the charge path is unmistakable
        const aw=16; cx.globalAlpha=0.8; cx.fillStyle='#ff4d4d';
        cx.beginPath(); cx.moveTo(ex,ey);
        cx.lineTo(ex-Math.cos(e.da-0.5)*aw, ey-Math.sin(e.da-0.5)*aw);
        cx.lineTo(ex-Math.cos(e.da+0.5)*aw, ey-Math.sin(e.da+0.5)*aw); cx.closePath(); cx.fill();
      }
      cx.globalAlpha=1;
    }
    if(e.isBoss && e.mst==='wind'){   // boss attack wind-up: color = WHAT is coming, contracting ring = WHEN it lands
      const pulse=0.5+0.5*Math.sin(e.t*22), col=e.tellCol||'#fff';
      const k=clamp(1-(e.mt/BOSS_WIND),0,1);   // 0 at wind start -> 1 at fire
      cx.globalAlpha=0.4+0.4*pulse; cx.strokeStyle=col; cx.lineWidth=5+3*pulse; cx.setLineDash([9,7]); cx.lineDashOffset=-elapsed*90;
      cx.beginPath(); cx.arc(e.x,e.y,e.r+18+pulse*10,0,TAU); cx.stroke(); cx.setLineDash([]);
      cx.globalAlpha=0.7; cx.lineWidth=3.5; cx.beginPath(); cx.arc(e.x,e.y,e.r+8+(1-k)*48,0,TAU); cx.stroke();   // shrinks in as the attack nears
      cx.globalAlpha=1;
    }
    const wob = skipWob ? 0 : (e.isBoss ? Math.sin(e.t*2)*0.06 : Math.sin(e.t*6)*0.12);
    if(e.cut && cut){ cx.globalAlpha = cut.alpha; }
    drawSprite(e.spr, e.x, e.y, e.r*2.5*(e.deathScale||1), wob, e.sq, e.hitT, e.face===-1, e.isBoss?null:curWorld().enemyTint);   // per-world enemy recolor
    if(e.cut){ cx.globalAlpha = 1; }
    if(e.frz>0){ cx.globalAlpha=0.4; cx.fillStyle='#bfe6ff'; cx.beginPath(); cx.arc(e.x,e.y,e.r*1.05,0,TAU); cx.fill(); cx.globalAlpha=1; }
    else if(e.chillT>0){ cx.globalAlpha=0.22; cx.fillStyle='#bfe6ff'; cx.beginPath(); cx.arc(e.x,e.y,e.r*1.05,0,TAU); cx.fill(); cx.globalAlpha=1; }
    if(e.fire){ cx.globalAlpha=0.38; cx.fillStyle='#ff6a00'; cx.beginPath(); cx.arc(e.x,e.y,e.r*1.08,0,TAU); cx.fill(); cx.globalAlpha=1; }
    if(e.iv>0){ const partVuln=e.scriptVulnMul>0; cx.strokeStyle=partVuln?'#e07030':'#d8b46a'; cx.lineWidth=4; cx.globalAlpha=0.85; cx.beginPath(); cx.arc(e.x,e.y,e.r+6,0,TAU); cx.stroke(); cx.globalAlpha=1; }
    if(e.hp<e.maxHp){
      const w=e.r*1.9;
      cx.fillStyle='rgba(0,0,0,0.45)'; cx.fillRect(e.x-w/2,e.y-e.r-12,w,5);
      cx.fillStyle=e.isBoss?'#e54d4d':'#7ed957';
      cx.fillRect(e.x-w/2,e.y-e.r-12,w*Math.max(0,e.hp/e.maxHp),5);
    }
    if(e.isBoss){
      cx.font='900 13px sans-serif'; cx.textAlign='center';
      const nameW=cx.measureText(e.name).width;
      cx.fillStyle='rgba(20,14,8,0.55)';
      cx.fillRect(e.x-nameW/2-6, e.y-e.r-34, nameW+12, 18);
      cx.fillStyle='#fff';
      cx.strokeStyle=OUT; cx.lineWidth=3; cx.strokeText(e.name, e.x, e.y-e.r-22); cx.fillText(e.name, e.x, e.y-e.r-22);
    }
  }

  // --- teleport telegraph: show WHERE a blinking boss will reappear (ghost + pulsing ring) ---
  for(const e of enemies){
    if(!(e.isBoss && e.warpT>0 && e.wdx!=null)) continue;
    const col=e.warpCol||'#c77dff', pulse=0.5+0.5*Math.sin(elapsed*20);
    cx.save();
    cx.globalAlpha=0.28; drawSprite(e.spr, e.wdx, e.wdy, e.r*2.4, 0,0,0,false, null);   // faint ghost at the landing spot
    cx.globalAlpha=0.55+0.4*pulse; cx.strokeStyle=col; cx.lineWidth=4; cx.setLineDash([11,8]); cx.lineDashOffset=-elapsed*130;
    cx.beginPath(); cx.arc(e.wdx,e.wdy,e.r+10,0,TAU); cx.stroke(); cx.setLineDash([]);
    cx.lineWidth=2.5; cx.globalAlpha=0.6; cx.strokeStyle='rgba(0,0,0,0.5)'; cx.beginPath(); cx.arc(e.wdx,e.wdy,e.r+12,0,TAU); cx.stroke();
    cx.globalAlpha=1; cx.restore();
  }

  // --- enemy bullets: thick dark rim + dark core = HOSTILE ---
  // glow pass (one globalAlpha change for all bullets)
  cx.globalAlpha=0.28;
  for(const b of ebullets){
    if(b.x<vx0-30||b.x>vx1+30||b.y<vy0-30||b.y>vy1+30) continue;
    cx.fillStyle=b.color||'#e54d4d'; cx.beginPath(); cx.arc(b.x,b.y,b.r*1.8,0,TAU); cx.fill();
  }
  // core + rim + highlight pass
  cx.globalAlpha=1; cx.lineWidth=3.2; cx.strokeStyle=OUT;
  for(const b of ebullets){
    if(b.x<vx0-30||b.x>vx1+30||b.y<vy0-30||b.y>vy1+30) continue;
    const bc=b.color||'#e54d4d';
    cx.fillStyle=bc; cx.beginPath(); cx.arc(b.x,b.y,b.r,0,TAU); cx.fill(); cx.stroke();
    cx.fillStyle='rgba(255,255,255,0.55)'; cx.beginPath(); cx.arc(b.x-b.r*0.3,b.y-b.r*0.3,b.r*0.34,0,TAU); cx.fill();
  }

  // --- active pet (trails directly behind player) ---
  if(state!==ST.MENU && P.petId && typeof PETS!=='undefined'){
    const _pet=PETS.find(p=>p.id===P.petId);
    if(_pet&&_pet.draw){
      const ps=P.r*1.8, pb=Math.sin(P.petWalk)*0.07;
      const pf=Math.cos(Math.atan2(P.y-P.petY, P.x-P.petX))<0;
      cx.fillStyle='rgba(40,60,25,0.18)';
      cx.beginPath(); cx.ellipse(P.petX,P.petY+ps*0.38,ps*0.34,ps*0.12,0,0,TAU); cx.fill();
      cx.save(); cx.translate(P.petX,P.petY); if(pf) cx.scale(-1,1); cx.rotate(pb);
      _pet.draw(cx,ps,elapsed);
      cx.restore();
    }
  }

  // --- walking turret(s) (Walking Turret card) ---
  if(state!==ST.MENU && P.turretCount>0){
    for(const tu of turrets){
      const ts=P.r*1.3;
      cx.fillStyle='rgba(40,60,25,0.18)';
      cx.beginPath(); cx.ellipse(tu.x,tu.y+ts*0.4,ts*0.34,ts*0.12,0,0,TAU); cx.fill();
      cx.save(); cx.translate(tu.x,tu.y); cx.rotate(tu.face||0);
      cx.fillStyle='#6b7280'; cx.strokeStyle=OUT; cx.lineWidth=2.4;
      cx.beginPath(); cx.arc(0,0,ts*0.55,0,TAU); cx.fill(); cx.stroke();
      cx.fillStyle='#3a4250'; cx.fillRect(0,-ts*0.12,ts*0.85,ts*0.24);
      cx.restore();
    }
  }

  // --- player ---
  if(state!==ST.MENU){
    // faint range indicator
    cx.globalAlpha=0.09; cx.strokeStyle='#ffffff'; cx.lineWidth=2; cx.setLineDash([9,11]);
    cx.beginPath(); cx.arc(P.x,P.y,P.range,0,TAU); cx.stroke();
    cx.setLineDash([]); cx.globalAlpha=1;
    cx.fillStyle='rgba(40,60,25,0.3)';
    cx.beginPath(); cx.ellipse(P.x, P.y+P.r*0.9, P.r*0.85, P.r*0.34, 0,0,TAU); cx.fill();
    const blink = P.inv>0 && P.dashT<=0 && Math.floor(P.inv*12)%2===0;
    if(!blink){
      const bob=Math.sin(P.walk)*0.06;
      const flip = Math.cos(P.face)<0;
      if(typeof drawCharacter==='function') drawCharacter(P.charId||'gianni', P.x, P.y, P.r*2.6, bob, flip);
      else drawSprite('player', P.x, P.y, P.r*2.6, bob, 0, 0, flip);
      cx.globalAlpha=1;
      if(typeof drawPlayerGear==='function' && gearShouldShow(P.charId)) drawPlayerGear(P.x, P.y, P.r*2.6, bob, flip);   // equipped gear overlay (hidden by default on non-default characters)
    }
    // Phoenix burn aura
    if(P.burnAura>0){
      cx.globalAlpha=0.12+0.05*Math.sin(elapsed*8); cx.fillStyle='#ff7a3a';
      cx.beginPath(); cx.arc(P.x,P.y,80,0,TAU); cx.fill(); cx.globalAlpha=1;
    }
    // Aura Monster: clearly-green damage aura, fill + bright ring so it always reads as "yours"
    if(P.auraR>0){
      cx.globalAlpha=0.16+0.05*Math.sin(elapsed*6); cx.fillStyle='#39d953';
      cx.beginPath(); cx.arc(P.x,P.y,P.auraR,0,TAU); cx.fill();
      cx.globalAlpha=0.55; cx.strokeStyle='#2ecc40'; cx.lineWidth=2.5;
      cx.beginPath(); cx.arc(P.x,P.y,P.auraR,0,TAU); cx.stroke();
      cx.globalAlpha=1;
    }
    // Soldier stand-still boost indicator — pulsing red ring
    if(P.soldierBullets && P.soldierStill){
      const pulse=0.5+0.5*Math.sin(elapsed*9);
      cx.globalAlpha=0.22+0.18*pulse;
      const rg=cx.createRadialGradient(P.x,P.y,P.r*0.4,P.x,P.y,P.r+18+pulse*5);
      rg.addColorStop(0,'rgba(255,40,40,0)'); rg.addColorStop(0.55,'rgba(255,40,40,0.65)'); rg.addColorStop(1,'rgba(255,40,40,0)');
      cx.fillStyle=rg; cx.beginPath(); cx.arc(P.x,P.y,P.r+24+pulse*5,0,TAU); cx.fill();
      cx.globalAlpha=0.85; cx.strokeStyle='#ff2020'; cx.lineWidth=2+pulse;
      cx.setLineDash([7,5]); cx.lineDashOffset=-elapsed*42;
      cx.beginPath(); cx.arc(P.x,P.y,P.r+13,0,TAU); cx.stroke();
      cx.setLineDash([]); cx.globalAlpha=1;
    }
    // Aegis shield bubble (one ring per remaining charge)
    if(P.shield>0){
      for(let s=0;s<P.shield;s++){
        cx.globalAlpha=0.5-s*0.12; cx.strokeStyle=P.aegisEvo?'#aee4ff':'#7ecbff'; cx.lineWidth=3;
        cx.beginPath(); cx.arc(P.x,P.y,P.r+12+s*5,0,TAU); cx.stroke();
      }
      cx.globalAlpha=1;
    }
    // player HP bar under the character (HP lives on the player now, not the top HUD)
    { const frac=Math.max(0,P.hp/P.maxHp), w=P.r*2.0, hx=P.x-w/2, hy=P.y+P.r*1.15;
      cx.fillStyle='rgba(0,0,0,0.5)'; cx.fillRect(hx-1.5,hy-1.5,w+3,7);
      cx.fillStyle = '#e54d4d';   // HP bar is always red
      cx.fillRect(hx,hy,w*frac,4); }
  }

  // --- particles ---
  for(const p of parts){
    if(p.x<vx0-p.r-4||p.x>vx1+p.r+4||p.y<vy0-p.r-4||p.y>vy1+p.r+4) continue;
    const a = Math.max(0, p.life/p.max);
    if(p.ring){ cx.globalAlpha=a*0.6; cx.strokeStyle=p.color; cx.lineWidth=(p.lw||5)*a+1; cx.beginPath(); cx.arc(p.x,p.y,p.r,0,TAU); cx.stroke(); continue; }
    cx.globalAlpha = a; cx.fillStyle = p.color;
    cx.beginPath(); cx.arc(p.x, p.y, p.r*(0.45+0.55*a), 0, TAU); cx.fill();
  }
  cx.globalAlpha=1;

  // --- floating text ---
  cx.textAlign='center';
  for(const t of texts){
    cx.globalAlpha = Math.min(1, t.life/t.max*2);
    cx.font = '900 '+t.size+'px sans-serif';
    cx.lineWidth = t.big?4:3; cx.strokeStyle=OUT; cx.strokeText(t.str,t.x,t.y);
    cx.fillStyle = t.color; cx.fillText(t.str, t.x, t.y);
  }
  cx.globalAlpha=1;

  renderArena(vx0,vy0,vx1,vy1);

  cx.restore(); // back to screen space

  // depth edge-darkening (theme vignette, e.g. DIRT DEPTHS)
  if(curTheme.edgeDark>0 && state!==ST.MENU){
    const g=cx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.34, W/2,H/2,Math.max(W,H)*0.62);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,'+(0.72*curTheme.edgeDark)+')');
    cx.fillStyle=g; cx.fillRect(0,0,W,H);
  }

  // joystick (screen space)
  if(joy.active && state===ST.PLAY){
    cx.globalAlpha=0.3; cx.strokeStyle='#fff'; cx.lineWidth=3;
    cx.beginPath(); cx.arc(joy.ox,joy.oy,58,0,TAU); cx.stroke();
    cx.fillStyle='#4aa3df';
    cx.beginPath(); cx.arc(joy.ox+joy.dx*58, joy.oy+joy.dy*58, 22,0,TAU); cx.fill();
    cx.globalAlpha=1;
  }

  // minimap (screen space)
  if(shouldShowMinimap()) drawMinimap();

  // hurt vignette
  if(hitFlash>0){ cx.fillStyle=`rgba(220,40,40,${hitFlash*0.22})`; cx.fillRect(0,0,W,H); }
  if(state===ST.CUTSCENE && cut && cut.fade>0){
    cx.save(); cx.globalAlpha=cut.fade; cx.fillStyle=curTheme.bg; cx.fillRect(0,0,W,H); cx.restore();
  }
}

function drawBorder(vx0,vy0,vx1,vy1){
  // dark band just inside the world edge + posts
  cx.fillStyle=curTheme.wall||'#7a5230';
  if(vy0 < WALL) cx.fillRect(Math.max(0,vx0-40), 0, Math.min(WORLD.w,vx1)-Math.max(0,vx0-40)+40, WALL);
  if(vy1 > WORLD.h-WALL) cx.fillRect(Math.max(0,vx0-40), WORLD.h-WALL, Math.min(WORLD.w,vx1)-Math.max(0,vx0-40)+40, WALL);
  if(vx0 < WALL) cx.fillRect(0, Math.max(0,vy0-40), WALL, Math.min(WORLD.h,vy1)-Math.max(0,vy0-40)+40);
  if(vx1 > WORLD.w-WALL) cx.fillRect(WORLD.w-WALL, Math.max(0,vy0-40), WALL, Math.min(WORLD.h,vy1)-Math.max(0,vy0-40)+40);
  // fence posts/rail along inner edge
  cx.strokeStyle=curTheme.postDark||'#5a3a20'; cx.lineWidth=6;
  cx.fillStyle=curTheme.post||'#9a6b3d';
  const postEvery=80;
  if(vy0 < WALL+10){ for(let x=Math.max(WALL,Math.floor(vx0/postEvery)*postEvery); x<Math.min(WORLD.w-WALL,vx1); x+=postEvery){ post(x,WALL-6); } cx.beginPath(); cx.moveTo(Math.max(0,vx0),WALL-4); cx.lineTo(Math.min(WORLD.w,vx1),WALL-4); cx.stroke(); }
  if(vy1 > WORLD.h-WALL-10){ for(let x=Math.max(WALL,Math.floor(vx0/postEvery)*postEvery); x<Math.min(WORLD.w-WALL,vx1); x+=postEvery){ post(x,WORLD.h-WALL+6); } cx.beginPath(); cx.moveTo(Math.max(0,vx0),WORLD.h-WALL+4); cx.lineTo(Math.min(WORLD.w,vx1),WORLD.h-WALL+4); cx.stroke(); }
  if(vx0 < WALL+10){ for(let y=Math.max(WALL,Math.floor(vy0/postEvery)*postEvery); y<Math.min(WORLD.h-WALL,vy1); y+=postEvery){ post(WALL-6,y); } cx.beginPath(); cx.moveTo(WALL-4,Math.max(0,vy0)); cx.lineTo(WALL-4,Math.min(WORLD.h,vy1)); cx.stroke(); }
  if(vx1 > WORLD.w-WALL-10){ for(let y=Math.max(WALL,Math.floor(vy0/postEvery)*postEvery); y<Math.min(WORLD.h-WALL,vy1); y+=postEvery){ post(WORLD.w-WALL+6,y); } cx.beginPath(); cx.moveTo(WORLD.w-WALL+4,Math.max(0,vy0)); cx.lineTo(WORLD.w-WALL+4,Math.min(WORLD.h,vy1)); cx.stroke(); }
}
function post(x,y){ cx.fillStyle=curTheme.post||'#9a6b3d'; cx.fillRect(x-5,y-14,10,28); cx.strokeStyle=curTheme.postDark||'#5a3a20'; cx.lineWidth=2.5; cx.strokeRect(x-5,y-14,10,28); }

function renderArena(vx0,vy0,vx1,vy1){
  if(!arena) return;
  const a=arena;
  // dim the locked-out area outside the arena
  cx.fillStyle='rgba(24,6,6,0.5)';
  if(vx0 < a.x)       cx.fillRect(vx0-40, vy0-40, a.x-(vx0-40), (vy1-vy0)+80);
  if(vx1 > a.x+a.w)   cx.fillRect(a.x+a.w, vy0-40, (vx1+40)-(a.x+a.w), (vy1-vy0)+80);
  const ix0=Math.max(vx0-40,a.x), iw=Math.min(vx1+40,a.x+a.w)-ix0;
  if(iw>0){
    if(vy0 < a.y)     cx.fillRect(ix0, vy0-40, iw, a.y-(vy0-40));
    if(vy1 > a.y+a.h) cx.fillRect(ix0, a.y+a.h, iw, (vy1+40)-(a.y+a.h));
  }
  // animated striped (dashed) border — turns magenta once a final boss hits its expanded phase-3 arena
  const fin = boss && boss.finalPhase && boss.vph>=3;
  cx.save();
  cx.lineWidth=7; cx.setLineDash([24,16]); cx.lineDashOffset=-elapsed*60;
  cx.strokeStyle=fin?'#ff2ad6':'#ff2a2a'; cx.strokeRect(a.x, a.y, a.w, a.h);
  cx.setLineDash([]); cx.lineWidth=2; cx.strokeStyle=fin?'rgba(255,120,230,0.6)':'rgba(255,90,90,0.6)'; cx.strokeRect(a.x, a.y, a.w, a.h);
  cx.restore();
}

function renderZones(){
  for(const z of zones){
    const danger = z.col||'#e8a93a';
    if(z.friendly){                       // player-owned field: soft, no danger telegraph — clearly yours & safe
      const k=Math.max(0,1-(z.t-z.tele)/z.life);
      const fill=z.col||'#bfe6ff';
      cx.globalAlpha=0.16*k+0.06; cx.fillStyle=fill; cx.beginPath(); cx.arc(z.x,z.y,z.r,0,TAU); cx.fill();
      cx.globalAlpha=0.7*k; cx.lineWidth=3; cx.strokeStyle=fill;
      cx.setLineDash([4,8]); cx.lineDashOffset=elapsed*60;   // gentle drifting dotted ring, distinct from enemy hazards
      cx.beginPath(); cx.arc(z.x,z.y,z.r,0,TAU); cx.stroke(); cx.setLineDash([]);
      cx.globalAlpha=1; continue;
    }
    if(z.t<z.tele){                       // telegraph: clearly shows WHERE + WHEN it lands
      const k=z.t/z.tele;                 // 0..1 charge
      const imminent = k>0.62;
      // dark base disc so the hazard reads on any ground color
      cx.globalAlpha=0.34; cx.fillStyle='#000'; cx.beginPath(); cx.arc(z.x,z.y,z.r,0,TAU); cx.fill();
      // danger fill grows to full exactly at impact = a visible countdown
      cx.globalAlpha=0.30+0.34*k; cx.fillStyle=danger; cx.beginPath(); cx.arc(z.x,z.y,z.r*k,0,TAU); cx.fill();
      // bold rotating warning ring (turns white the instant before it fires)
      cx.globalAlpha=1; cx.lineWidth=imminent?8:5; cx.strokeStyle=imminent?'#fff':danger;
      cx.setLineDash([11,7]); cx.lineDashOffset=-elapsed*140;
      cx.beginPath(); cx.arc(z.x,z.y,z.r,0,TAU); cx.stroke(); cx.setLineDash([]);
      // dark contrast outline
      cx.lineWidth=2.5; cx.strokeStyle='rgba(0,0,0,0.55)'; cx.beginPath(); cx.arc(z.x,z.y,z.r+2,0,TAU); cx.stroke();
      // pulsing center marker so the exact spot is unmistakable
      const ps=0.5+0.5*Math.sin(z.t*26);
      cx.globalAlpha=0.75+0.25*ps; cx.fillStyle=imminent?'#fff':danger;
      cx.beginPath(); cx.arc(z.x,z.y,4+3*ps,0,TAU); cx.fill();
    } else {                              // active: bright fill + a white impact flash
      const k=Math.max(0,1-(z.t-z.tele)/z.life);
      cx.globalAlpha=0.5*k+0.18; cx.fillStyle=danger; cx.beginPath(); cx.arc(z.x,z.y,z.r,0,TAU); cx.fill();
      cx.globalAlpha=0.9*k; cx.lineWidth=6; cx.strokeStyle=danger; cx.beginPath(); cx.arc(z.x,z.y,z.r,0,TAU); cx.stroke();
      const f=(z.t-z.tele)/0.12;
      if(f<1){ cx.globalAlpha=0.8*(1-f); cx.fillStyle='#fff'; cx.beginPath(); cx.arc(z.x,z.y,z.r*0.7,0,TAU); cx.fill(); }
    }
  }
  // duo tether beam: bright energy line between the two final-boss titans
  if(boss && boss.tether>0 && boss.mate){
    const m=boss.mate, pulse=0.6+0.4*Math.sin(elapsed*30);
    cx.globalAlpha=0.85; cx.lineCap='round';
    cx.strokeStyle='rgba(0,0,0,0.5)'; cx.lineWidth=20; cx.beginPath(); cx.moveTo(boss.x,boss.y); cx.lineTo(m.x,m.y); cx.stroke();
    cx.strokeStyle='#ff5acd'; cx.lineWidth=10+4*pulse; cx.beginPath(); cx.moveTo(boss.x,boss.y); cx.lineTo(m.x,m.y); cx.stroke();
    cx.strokeStyle='#fff'; cx.lineWidth=3; cx.globalAlpha=0.9*pulse; cx.beginPath(); cx.moveTo(boss.x,boss.y); cx.lineTo(m.x,m.y); cx.stroke();
    cx.lineCap='butt';
  }
  cx.globalAlpha=1;
}

function shouldShowMinimap(){
  return !!MMH && state!==ST.MENU && state!==ST.OVER && !IS_TOUCH && (gameMode==='challenger' || !infiniteMapMode());
}
function minimapSize(){ return Math.round(clamp(Math.min(W,H)*0.2, 150, 240)); }
function minimapGeom(){
  const ms = minimapSize(), pad = 18;
  return { ms, pad, mx:pad, my:H-ms-pad };
}
function miniDisc(x,y,r,fill,stroke,lw){
  cx.fillStyle=fill; cx.beginPath(); cx.arc(x,y,r,0,TAU); cx.fill();
  if(stroke){ cx.strokeStyle=stroke; cx.lineWidth=lw||2; cx.stroke(); }
}
function miniDiamond(x,y,r,fill,stroke,lw){
  cx.fillStyle=fill; cx.beginPath(); cx.moveTo(x,y-r); cx.lineTo(x+r,y); cx.lineTo(x,y+r); cx.lineTo(x-r,y); cx.closePath(); cx.fill();
  if(stroke){ cx.strokeStyle=stroke; cx.lineWidth=lw||2; cx.stroke(); }
}
function miniRoundRect(x,y,w,h,r,fill,stroke,lw){
  cx.beginPath(); cx.roundRect(x,y,w,h,r);
  if(fill){ cx.fillStyle=fill; cx.fill(); }
  if(stroke){ cx.strokeStyle=stroke; cx.lineWidth=lw||2; cx.stroke(); }
}
function miniProject(view, x, y, mx, my){
  const p=MMH.projectPoint(view,x,y);
  p.x+=mx; p.y+=my;
  return p;
}
function miniCardEnemyIcon(x,y,boss,tint){
  const r=boss?6.4:3.6;
  miniDisc(x,y,r,boss?'#d92b2b':'#e54d4d','#2a1c10',boss?2.3:1.4);
  if(boss){ miniDisc(x,y,3.2,'#ffb0a8',null,0); }
}
function miniCardBossIcon(x,y){
  miniDisc(x,y,7.4,'#d92b2b','#2a1c10',2.4);
  cx.strokeStyle='#fff'; cx.lineWidth=1.5; cx.beginPath(); cx.arc(x,y,10.4,0,TAU); cx.stroke();
  cx.fillStyle='#2a1c10';
  cx.beginPath(); cx.moveTo(x-4,y-2); cx.lineTo(x,y-6); cx.lineTo(x+4,y-2); cx.lineTo(x+2.5,y+4); cx.lineTo(x-2.5,y+4); cx.closePath(); cx.fill();
}
function miniCardHeartIcon(x,y,big){
  const s=big?4.4:3.4;
  cx.fillStyle='#e8556a';
  cx.beginPath();
  cx.moveTo(x,y+s);
  cx.bezierCurveTo(x-s*1.7,y-s*.2,x-s*.9,y-s*1.7,x,y-s*.7);
  cx.bezierCurveTo(x+s*.9,y-s*1.7,x+s*1.7,y-s*.2,x,y+s);
  cx.fill();
  cx.strokeStyle='#2a1c10'; cx.lineWidth=1.1; cx.stroke();
}
function miniCardMagnetIcon(x,y){
  cx.lineCap='round';
  cx.strokeStyle='#2a1c10'; cx.lineWidth=4;
  cx.beginPath(); cx.arc(x,y-1,4.2,Math.PI,TAU); cx.stroke();
  cx.beginPath(); cx.moveTo(x-4.2,y-1); cx.lineTo(x-4.2,y+4.4); cx.moveTo(x+4.2,y-1); cx.lineTo(x+4.2,y+4.4); cx.stroke();
  cx.strokeStyle='#e0392e'; cx.lineWidth=2.3;
  cx.beginPath(); cx.arc(x,y-1,4.2,Math.PI,TAU); cx.stroke();
  cx.beginPath(); cx.moveTo(x-4.2,y-1); cx.lineTo(x-4.2,y+4.4); cx.moveTo(x+4.2,y-1); cx.lineTo(x+4.2,y+4.4); cx.stroke();
  cx.lineCap='butt';
  cx.fillStyle='#d7dde6';
  cx.fillRect(x-5.6,y+2.8,2.8,2.5);
  cx.fillRect(x+2.8,y+2.8,2.8,2.5);
}
function miniCardOrbIcon(x,y,tier){
  const col = tier>=3 ? 'rgba(255,207,58,.76)' : tier===2 ? 'rgba(70,217,138,.64)' : 'rgba(191,230,255,.56)';
  const border = tier>=3 ? 'rgba(150,92,12,.62)' : 'rgba(42,28,16,.34)';
  miniDiamond(x,y,tier>=3?3.1:2.6,col,border,.7);
  if(tier>=3){ cx.fillStyle='rgba(255,255,255,.55)'; cx.fillRect(x-.8,y-1.8,1.2,1.2); }
}
function miniCardLuckyIcon(x,y,heavy){
  const s=heavy?15:10, r=heavy?4:3;
  if(heavy){
    cx.strokeStyle='rgba(255,255,255,.65)'; cx.lineWidth=1.5; cx.setLineDash([4,4]);
    cx.beginPath(); cx.arc(x,y,s*.86,0,TAU); cx.stroke(); cx.setLineDash([]);
  }
  miniRoundRect(x-s/2,y-s/2,s,s,r,heavy?'#dce0e4':'#ffd24a','#2a1c10',heavy?1.9:1.7);
  if(heavy){ miniRoundRect(x-s/2+2,y-s/2+2,s-4,(s-4)*.42,2,'rgba(255,255,255,.55)',null,0); }
  cx.fillStyle=heavy?'#555b62':'#2a1c10'; cx.font='900 '+(heavy?10:8)+'px sans-serif'; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText('?',x,y+.2);
}
function drawMiniCamera(view,mx,my,clipCircle){
  const x=mx+(camera.x-view.ox)*view.sx, y=my+(camera.y-view.oy)*view.sy;
  const w=(W/zoom)*view.sx, h=(H/zoom)*view.sy;
  if(clipCircle){
    const cx0=mx+view.size/2, cy0=my+view.size/2, r=view.size/2-5;
    const corners=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([px,py])=>{
      const dx=px-cx0, dy=py-cy0, d=Math.max(1,Math.hypot(dx,dy));
      return d>r ? [cx0+dx/d*r, cy0+dy/d*r] : [px,py];
    });
    cx.beginPath(); cx.moveTo(corners[0][0],corners[0][1]);
    for(let i=1;i<corners.length;i++) cx.lineTo(corners[i][0],corners[i][1]);
    cx.closePath(); cx.strokeStyle='rgba(255,255,255,.75)'; cx.lineWidth=2; cx.stroke();
    return;
  }
  cx.strokeStyle='rgba(255,255,255,.82)'; cx.lineWidth=2; cx.strokeRect(x,y,w,h);
}
function drawMiniEntities(view,mx,my,mode){
  const circleClip = mode==='radar', rClip=view.size/2-5, cx0=mx+view.size/2, cy0=my+view.size/2;
  const visible=p=>p.visible && (!circleClip || Math.hypot(p.x-cx0,p.y-cy0)<=rClip);
  const radarAlpha=p=>circleClip ? clamp(1 - (Math.hypot(p.x-cx0,p.y-cy0)/rClip)*0.45, 0.55, 1) : 1;
  for(const g of gems){
    if(g.coin) continue;
    const p=miniProject(view,g.x,g.y,mx,my); if(!visible(p)) continue;
    cx.globalAlpha=radarAlpha(p);
    if(mode==='card'){
      if(g.heart) miniCardHeartIcon(p.x,p.y,!!g.big);
      else if(g.magnet) miniCardMagnetIcon(p.x,p.y);
      else miniCardOrbIcon(p.x,p.y,g.tier||1);
    }
    else if(g.heart) miniCardHeartIcon(p.x,p.y,!!g.big);
    else if(g.magnet) miniCardMagnetIcon(p.x,p.y);
    else miniDisc(p.x,p.y,mode==='radar'?2.4:2.2,'#62dfff','#081018',1.2);
  }
  for(const lb of luckies){
    const p=miniProject(view,lb.x,lb.y,mx,my); if(!visible(p)) continue;
    cx.globalAlpha=radarAlpha(p);
    if(mode==='card') miniCardLuckyIcon(p.x,p.y,!!lb.heavy);
    else miniDiamond(p.x,p.y,mode==='radar'?4:4.5,'#ffd24a','#2a1c10');
  }
  for(const e of enemies){
    const p=miniProject(view,e.x,e.y,mx,my); if(!visible(p)) continue;
    cx.globalAlpha=radarAlpha(p);
    if(mode==='card'){
      if(e.isBoss) miniCardBossIcon(p.x,p.y);
      else miniCardEnemyIcon(p.x,p.y,false,curWorld().enemyTint);
    } else if(e.isBoss){
      miniDisc(p.x,p.y,mode==='radar'?6:6.5,'#ff4bd8','#fff',2);
      cx.strokeStyle='#2a061f'; cx.lineWidth=2; cx.beginPath(); cx.arc(p.x,p.y,(mode==='radar'?9:10),0,TAU); cx.stroke();
    } else {
      miniDisc(p.x,p.y,mode==='radar'?3.2:3,'#ff5b4a','#140606',1.5);
    }
  }
  cx.globalAlpha=1;
  if(mode!=='card'){
    const pp = view.challenger ? {x:mx+view.size/2,y:my+view.size/2,visible:true} : miniProject(view,P.x,P.y,mx,my);
    miniDisc(pp.x,pp.y,7,'#fff','#2a1c10',2.4); miniDisc(pp.x,pp.y,3.2,'#5fbf52',null,0);
  }
}
function drawMiniArena(view,mx,my){
  if(!arena || view.challenger) return;
  cx.strokeStyle='rgba(255,42,42,.9)'; cx.lineWidth=2.5; cx.setLineDash([6,5]);
  cx.strokeRect(mx+arena.x*view.sx, my+arena.y*view.sy, arena.w*view.sx, arena.h*view.sy);
  cx.setLineDash([]);
}
function drawMinimap(){
  const g=minimapGeom(), ms=g.ms, mx=g.mx, my=g.my;
  const view=MMH.buildMinimapView({ gameMode, world:WORLD, player:P, size:ms });
  cx.save(); cx.globalAlpha=1;
  drawMinimapCard(view,mx,my,ms);
  cx.restore();
}
function drawMinimapCard(view,mx,my,ms){
  miniRoundRect(mx-4,my-4,ms+8,ms+8,15,'#2a1c10',null,0);
  miniRoundRect(mx,my,ms,ms,11,curTheme.tile1||'#76bf42',null,0);
  cx.save();
  cx.beginPath(); cx.roundRect(mx,my,ms,ms,11); cx.clip();
  const tile=Math.max(22,Math.round(ms/6));
  for(let y=0;y<ms;y+=tile){
    for(let x=0;x<ms;x+=tile){
      cx.fillStyle=((x/tile+y/tile)&1) ? (curTheme.tile2||'#82c84a') : (curTheme.tile1||'#76bf42');
      cx.fillRect(mx+x,my+y,Math.min(tile,ms-x),Math.min(tile,ms-y));
    }
  }
  drawMiniArena(view,mx,my);
  drawMiniCamera(view,mx,my,false);
  drawMiniEntities(view,mx,my,'card');
  cx.restore();
  miniRoundRect(mx-4,my-4,ms+8,ms+8,15,null,'#2a1c10',3.2);
}

// ============ MAIN LOOP ============
function loop(t){
  requestAnimationFrame(loop);
  let dt = Math.min(0.033, (t-tPrev)/1000 || 0.016);
  tPrev = t;
  if(hitstop>0){ hitstop-=dt; dt=0; }
  if(state===ST.PLAY){
    update(dt*timeScale);
  } else if(state===ST.MENU) menuUpdate(dt);
  else if(state===ST.CUTSCENE) cutsceneUpdate(dt);
  else if(state===ST.INTRO) introUpdate(dt);
  if(state===ST.INTRO) introRender(); else render();
}

// menu: gentle drifting enemies around the player anchor for vibes
function menuUpdate(dt){
  computeCamera();
  for(const e of enemies){ e.t=(e.t||0)+dt; e.x+=Math.cos(e.t*0.6)*0.5; e.y+=Math.sin(e.t*0.5)*0.5; if(e.hitT>0)e.hitT-=dt; if(e.sq>0)e.sq-=dt*4; }
}

// ============ INIT ============
resetPlayer(); state=ST.MENU;
computeCamera();
document.body.style.background = curTheme.bg;
// populate the main menu (world emblem on the Battle stage + saved gold)
setStageEmblem(selWorld);
$('goldicon').src = SP['coin'].toDataURL();
$('goldtxt').textContent = gold;
// top resource bar: a "player level" badge from worlds unlocked + a progress fill + gold
function refreshTopbar(){
  const lv=$('topLvl'); if(lv) lv.textContent = unlockedMax+1;
  const xf=$('topxpfill'); if(xf) xf.style.width = Math.round(((unlockedMax+1)/WORLDS.length)*100)+'%';
  const gt=$('goldtxt'); if(gt) gt.textContent = gold;
}
refreshTopbar();
// wire house-drawn icons into static markup (tab bar, kill counter, ...)
document.querySelectorAll('img[data-ic]').forEach(im=>{ const s=SP[im.dataset.ic]; if(s) im.src=s.toDataURL(); });
// ---- music mute (SFX always on); shared by the menu + pause buttons ----
function currentTrack(){
  if(state===ST.MENU) return 'menu';
  if(boss) return 'boss'+(((Math.floor(wave/5)-1)%3+3)%3);
  return curTheme.music || 'game';
}
function refreshMute(){
  const sm=$('sdrop-music');
  if(sm){ sm.textContent = muted ? 'Music: Off' : 'Music: On'; sm.classList.toggle('off', muted); }
  const ss=$('sdrop-sfx');
  if(ss){ ss.textContent = sfxMuted ? 'SFX: Off' : 'SFX: On'; ss.classList.toggle('off', sfxMuted); }
  const pm=$('pausemute'); if(pm) pm.textContent = muted ? 'Music: Off' : 'Music: On';
  const ps=$('pausesfx'); if(ps) ps.textContent = sfxMuted ? 'SFX: Off' : 'SFX: On';
}
function setMusicMuted(v){
  initAudio();
  muted = v; localStorage.setItem('br_muted', muted?'1':'0');
  if(muted){ stopMusic(); }
  else { if(AC) AC.resume(); playMusic(currentTrack()); }
  refreshMute();
}
function setSfxMuted(v){
  initAudio();
  sfxMuted = v; localStorage.setItem('br_sfxmuted', sfxMuted?'1':'0');
  if(!sfxMuted && AC) AC.resume();
  refreshMute();
}
function setDeathShake(v){
  deathShakeOn = v; localStorage.setItem('br_deathshake', deathShakeOn?'1':'0');
  const dsb=$('sdrop-deathshake'); if(dsb){ dsb.textContent='Death Shake: '+(deathShakeOn?'On':'Off'); dsb.classList.toggle('off', !deathShakeOn); }
}
// Settings modal toggle
(function(){
  const btn=$('settingsbtn'), drop=$('settingsdrop'), closeBtn=$('sdrop-close');
  if(!btn||!drop) return;
  const open=()=>drop.classList.remove('hidden');
  const close=()=>drop.classList.add('hidden');
  btn.addEventListener('click', open);
  if(closeBtn) closeBtn.addEventListener('click', close);
  drop.addEventListener('click', e=>{ if(e.target===drop) close(); });
})();
// Update Log modal
(function(){
  const openBtn=$('sdrop-changelog'), drop=$('changelogdrop'), closeBtn=$('changelog-close'), list=$('changelog-list');
  if(!openBtn||!drop) return;
  if(list && typeof CHANGELOG!=='undefined'){
    list.innerHTML = CHANGELOG.map(e=>
      `<div class="changelog-row"><span class="changelog-v">v${e.v}</span><span class="changelog-notes">${e.notes}</span></div>`
    ).join('');
  }
  openBtn.addEventListener('click', ()=>{ $('settingsdrop').classList.add('hidden'); drop.classList.remove('hidden'); });
  if(closeBtn) closeBtn.addEventListener('click', ()=>drop.classList.add('hidden'));
  drop.addEventListener('click', e=>{ if(e.target===drop) drop.classList.add('hidden'); });
})();
const _dm=$('sdrop-music'); if(_dm) _dm.addEventListener('click',()=>setMusicMuted(!muted));
const _ds=$('sdrop-sfx'); if(_ds) _ds.addEventListener('click',()=>setSfxMuted(!sfxMuted));
const _dds=$('sdrop-deathshake'); if(_dds) _dds.addEventListener('click',()=>setDeathShake(!deathShakeOn));
$('pausemute').addEventListener('click', ()=>setMusicMuted(!muted));
$('pausesfx').addEventListener('click', ()=>setSfxMuted(!sfxMuted));
refreshMute();
setDeathShake(deathShakeOn);

// ---- pause / resume / quit ----
function pauseGame(){ if(state!==ST.PLAY) return; state=ST.PAUSE; $('pause').classList.remove('hidden'); }
function resumeGame(){ if(state!==ST.PAUSE) return; state=ST.PLAY; $('pause').classList.add('hidden'); }
function togglePause(){ if(state===ST.PLAY) pauseGame(); else if(state===ST.PAUSE) resumeGame(); }
function quitToMenu(){
  state=ST.MENU; arena=null; bossPending=0; boss=null;
  bullets=[]; ebullets=[]; petBullets=[]; enemies=[]; gems=[]; parts=[]; texts=[]; zones=[]; holes=[]; luckies=[];
  resetPlayer(); computeCamera();
  $('pause').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('dashbtn').classList.add('hidden');
  $('zoomctl').classList.add('hidden');
  $('bossbar').classList.add('hidden');
  $('menu').classList.remove('hidden');
  refreshTopbar();
  playMusic(muted ? null : 'menu');
}
$('pausebtn').addEventListener('click', pauseGame);
$('resumebtn').addEventListener('click', resumeGame);
$('quitbtn').addEventListener('click', quitToMenu);
// when the page is tabbed away / minimized: stop music + pause; resume on return
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden){
    stopMusic(); if(AC){ try{ AC.suspend(); }catch(e){} }
    if(state===ST.PLAY) pauseGame();
  } else {
    if(AC){ try{ AC.resume(); }catch(e){} }
    if(!muted) playMusic(currentTrack());
    tPrev = performance.now();   // avoid a huge dt spike on the first frame back
  }
});
setInterval(()=>{
  if(state===ST.MENU && enemies.length<6){ spawnEnemy(); const e=enemies[enemies.length-1]; e.sp=0; }
}, 700);

// ---- Anti-cheat: disable console in production (blocks the most common "open devtools, type cheat" attacks) ----
(function(){
  const dev = location.protocol==='file:' || location.hostname==='localhost' || location.hostname==='127.0.0.1';
  if(dev) return;
  const noop=()=>{};
  ['log','warn','error','info','debug','dir','table','group','groupEnd','groupCollapsed','time','timeEnd','trace','assert','count'].forEach(k=>{
    try{ Object.defineProperty(console,k,{value:noop,writable:false,configurable:false}); }catch(_){}
  });
})();

requestAnimationFrame(loop);

$('startbtn').addEventListener('click', ()=>{
  if(gameMode==='practice'){ openPracticeSetup(); return; }
  const m=$('menu'); m.classList.add('leaving');
  const wantsIntro = gameMode==='story' && selWorld===0 && !localStorage.getItem('br_seen_intro');
  setTimeout(()=>{
    m.classList.remove('leaving');
    if(wantsIntro) startIntro(()=>startGame(0));
    else startGame(selWorld);
  }, 190);
});
$('introskip').addEventListener('click', finishIntro);

// ===== GAMEMODE POPUP =====
(function(){
  const pop=$('gamemode-popup');
  function openPop(){
    const chalBtn=$('gm-challenger');
    if(chalBtn){
      const locked=chalUnlocked<0;
      chalBtn.classList.toggle('gmpop-locked', locked);
      const lb=$('gmpop-lockbadge');
      if(lb) lb.textContent=locked?'LOCKED — clear Story World 3 first':'';
    }
    if(pop) pop.classList.remove('hidden');
  }
  function closePop(){ if(pop) pop.classList.add('hidden'); }
  const gmBtn=$('gamemodebtn');
  if(gmBtn) gmBtn.addEventListener('click', openPop);
  const closeBtn=$('gmpop-close');
  if(closeBtn) closeBtn.addEventListener('click', closePop);
  if(pop) pop.addEventListener('click', e=>{ if(e.target===pop) closePop(); });
  const storyBtn=$('gm-story');
  if(storyBtn) storyBtn.addEventListener('click', ()=>{
    gameMode='story'; refreshWorldSel(); closePop(); sfx.pick();
  });
  const chalBtn=$('gm-challenger');
  if(chalBtn) chalBtn.addEventListener('click', ()=>{
    if(chalUnlocked<0){ sfx.pick(); return; }   // locked — need story world 3
    gameMode='challenger';
    selWorld=Math.min(chalUnlocked, WORLDS.length-1);
    refreshWorldSel();
    closePop(); sfx.pick();
  });
  const practiceBtn=$('gm-practice');
  if(practiceBtn) practiceBtn.addEventListener('click', ()=>{
    closePop(); sfx.pick();
    const cp=$('practice-confirm-popup'); if(cp) cp.classList.remove('hidden');
  });
})();

// ===== PRACTICE MODE: confirm popup + customize popup + enemy/boss pickers =====
(function(){
  const confirmPop=$('practice-confirm-popup');
  function closeConfirm(){ if(confirmPop) confirmPop.classList.add('hidden'); }
  const okBtn=$('practice-confirm-ok');
  if(okBtn) okBtn.addEventListener('click', ()=>{
    gameMode='practice'; refreshWorldSel(); closeConfirm(); sfx.pick();
  });
  const cancelBtn=$('practice-confirm-cancel');
  if(cancelBtn) cancelBtn.addEventListener('click', closeConfirm);
  if(confirmPop) confirmPop.addEventListener('click', e=>{ if(e.target===confirmPop) closeConfirm(); });

  // ---- foe/boss table grouping: many WORLDS entries share the same table reference
  // (e.g. FOES_DIRT is reused by 5 worlds) — group by reference so each enemy/boss shows once. ----
  function groupedTables(key){   // key: 'foes' or 'bosses'
    const groups=[]; const byRef=new Map();
    for(let i=0;i<=unlockedMax && i<WORLDS.length;i++){
      const w=WORLDS[i], table=w[key];
      if(byRef.has(table)) byRef.get(table).names.push(w.name);
      else { const g={names:[w.name], list:table}; byRef.set(table,g); groups.push(g); }
    }
    return groups;
  }

  function setupPracticeDefaults(){
    // nothing selected by default — the player opts in explicitly (confirm requires >=1 of each)
    if(!practiceCfg._foeSet)  practiceCfg._foeSet = new Set();
    if(!practiceCfg._bossSet) practiceCfg._bossSet = new Set();
  }

  function buildPickList(listEl, key, set){
    let html='';
    for(const g of groupedTables(key)){
      html += '<div class="banner"><span>'+g.names.join(' / ')+'</span></div>';
      for(let idx=0; idx<g.list.length; idx++){
        const def=g.list[idx], on=set.has(def);
        const ic = SP[def.spr] ? SP[def.spr].toDataURL() : '';
        html += '<div class="pickrow'+(on?' on':'')+'" data-gi="'+(listEl._groups.push(g)-1)+'" data-idx="'+idx+'">'+
          (ic?'<img src="'+ic+'" alt="">':'')+'<span class="pickname">'+def.name+'</span><span class="pickmark">'+(on?'✓':'')+'</span></div>';
      }
    }
    listEl.innerHTML=html;
  }

  // delegated click handler shared by both picker lists: toggle membership in the live Set
  function wirePickList(listEl, getSet){
    listEl.addEventListener('click', e=>{
      const row=e.target.closest('.pickrow'); if(!row) return;
      const g=listEl._groups[+row.dataset.gi], def=g.list[+row.dataset.idx], set=getSet();
      if(set.has(def)) set.delete(def); else set.add(def);
      row.classList.toggle('on'); row.querySelector('.pickmark').textContent=set.has(def)?'✓':'';
      sfx.pick();
    });
  }

  const enemyPop=$('practice-enemy-popup'), enemyList=$('pcfg-enemy-list');
  const bossPop=$('practice-boss-popup'),   bossList=$('pcfg-boss-list');
  const enemyCountEl=$('pcfg-enemy-count'), bossCountEl=$('pcfg-boss-count');
  enemyList._groups=[]; bossList._groups=[];
  wirePickList(enemyList, ()=>practiceCfg._foeSet);
  wirePickList(bossList,  ()=>practiceCfg._bossSet);

  function openEnemyPicker(){
    setupPracticeDefaults();
    enemyList._groups=[];
    buildPickList(enemyList, 'foes', practiceCfg._foeSet);
    enemyPop.classList.remove('hidden');
  }
  function openBossPicker(){
    setupPracticeDefaults();
    bossList._groups=[];
    buildPickList(bossList, 'bosses', practiceCfg._bossSet);
    bossPop.classList.remove('hidden');
  }

  const ecBtn=$('pcfg-enemies-btn'); if(ecBtn) ecBtn.addEventListener('click', openEnemyPicker);
  const bcBtn=$('pcfg-bosses-btn');  if(bcBtn) bcBtn.addEventListener('click', openBossPicker);
  function closeEnemyPicker(){ enemyPop.classList.add('hidden'); if(enemyCountEl) enemyCountEl.textContent=practiceCfg._foeSet.size; }
  function closeBossPicker(){ bossPop.classList.add('hidden'); if(bossCountEl) bossCountEl.textContent=practiceCfg._bossSet.size; }
  const ecClose=$('pcfg-enemy-close'); if(ecClose) ecClose.addEventListener('click', closeEnemyPicker);
  const ecDone=$('pcfg-enemy-done');   if(ecDone) ecDone.addEventListener('click', closeEnemyPicker);
  const bcClose=$('pcfg-boss-close');  if(bcClose) bcClose.addEventListener('click', closeBossPicker);
  const bcDone=$('pcfg-boss-done');    if(bcDone) bcDone.addEventListener('click', closeBossPicker);
  enemyPop.addEventListener('click', e=>{ if(e.target===enemyPop) closeEnemyPicker(); });
  bossPop.addEventListener('click', e=>{ if(e.target===bossPop) closeBossPicker(); });

  // ---- toggles ----
  function wireToggle(id, label, getVal, setVal){
    const btn=$(id); if(!btn) return;
    function refresh(){ const v=getVal(); btn.textContent=label+': '+(v?'On':'Off'); btn.classList.toggle('off', !v); }
    btn.addEventListener('click', ()=>{ setVal(!getVal()); refresh(); sfx.pick(); onChange(); });
    refresh();
  }
  const mapNote=$('pcfg-mapnote');
  function onChange(){ if(mapNote) mapNote.textContent = practiceCfg.infiniteMap ? 'Infinite map disables the minimap.' : ''; }
  wireToggle('pcfg-infwaves','Infinite Waves', ()=>practiceCfg.infiniteWaves, v=>practiceCfg.infiniteWaves=v);
  wireToggle('pcfg-timer','Timer-Based', ()=>practiceCfg.timerBased, v=>practiceCfg.timerBased=v);
  wireToggle('pcfg-infmap','Infinite Map', ()=>practiceCfg.infiniteMap, v=>practiceCfg.infiniteMap=v);
  onChange();

  const setupPop=$('practice-setup-popup');
  window.openPracticeSetup = function(){
    setupPracticeDefaults();
    if(enemyCountEl) enemyCountEl.textContent=practiceCfg._foeSet.size;
    if(bossCountEl) bossCountEl.textContent=practiceCfg._bossSet.size;
    setupPop.classList.remove('hidden');
  };
  function closeSetup(){ setupPop.classList.add('hidden'); }
  const setupClose=$('practice-setup-close'); if(setupClose) setupClose.addEventListener('click', closeSetup);
  setupPop.addEventListener('click', e=>{ if(e.target===setupPop) closeSetup(); });

  const confirmBtn=$('pcfg-confirm');
  if(confirmBtn) confirmBtn.addEventListener('click', ()=>{
    if(practiceCfg._foeSet.size===0 || practiceCfg._bossSet.size===0){ shake=Math.max(shake,6); sfx.pick(); return; }
    practiceCfg.foes=[...practiceCfg._foeSet];
    practiceCfg.bosses=[...practiceCfg._bossSet];
    TRAINING_WORLD.foes=practiceCfg.foes;
    TRAINING_WORLD.bosses=practiceCfg.bosses;
    TRAINING_WORLD.endless=practiceCfg.infiniteWaves;
    closeSetup(); sfx.pick();
    const m=$('menu'); m.classList.add('leaving');
    setTimeout(()=>{ m.classList.remove('leaving'); startGame(selWorld); }, 190);
  });
})();
$('wprev').addEventListener('click', ()=>{ if(selWorld>0){ selWorld--; refreshWorldSel(); sfx.pick(); } });
$('wnext').addEventListener('click', ()=>{
  const maxW=gameMode==='challenger'?chalUnlocked:unlockedMax;
  if(selWorld<maxW){ selWorld++; refreshWorldSel(); sfx.pick(); }
});
refreshWorldSel();
$('retrybtn').addEventListener('click', startGame);
$('wc-continue').addEventListener('click', ()=>{
  $('world-cleared').classList.add('hidden');
  const wasChal = gameMode==='challenger', wasPractice = gameMode==='practice';
  gameMode='story';
  quitToMenu();
  if(wasChal || wasPractice){ refreshWorldSel(); } else { triggerUnlockReveal(); }
});
