'use strict';
// ============ GAME STATE ============
let shake = 0, hitFlash = 0, hitstop = 0, tPrev = 0, elapsed = 0;

const P = {}; // player
let bullets=[], ebullets=[], enemies=[], gems=[], parts=[], texts=[], zones=[], holes=[];
let wave=1, score=0, kills=0, spawnTimer=0, waveEnemiesLeft=0, betweenWaves=false, boss=null;
let combo=0, comboT=0;
let gold = +(localStorage.getItem('br_gold')||0);   // persistent currency (saved)
// boss arena: the field locks to a small bounded square a few seconds before the boss arrives
let arena=null, bossPending=0;
const ARENA_SIZE=1000, ARENA_LEAD=4, ARENA_ZOOM=1.3;
// XP orb tiers (index = tier). Enemies drop one orb; tier scales with their xp value.
const ORB = [null, {spr:'orbS',v:1,sz:28}, {spr:'orbM',v:4,sz:34}, {spr:'orbL',v:10,sz:44}];
function orbTier(xp){ return xp<=1 ? 1 : xp<=3 ? 2 : 3; }
// spawn one xp orb of the given tier with a little scatter velocity
function dropOrb(x,y,tier,smin=90,smax=210){
  const a=rand(0,TAU), s=rand(smin,smax);
  gems.push({x,y,tier,v:ORB[tier].v,t:rand(0,6),vx:Math.cos(a)*s,vy:Math.sin(a)*s});
}

// global HP scale: enemies have 10x HP and the player does 10x damage, so the
// numbers are big enough that % upgrades (e.g. +25%) visibly change the damage.
const HP_MULT = 10;
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
  { spr:'vaca',      name:'LA VACA SATURNO',          hp:380, r:58, pattern:'rings'  },
  { spr:'gorillo',   name:'GORILLO WATERMELLONDRILLO',hp:460, r:62, pattern:'chaos'  },
  { spr:'trippi',    name:'TRIPPI TROPPI',            hp:560, r:56, pattern:'spiral' },
];
// ---- worlds: each = theme + roster + boss list + wave target (boss wave). ----
const WORLDS = [
  { id:'grass', name:'GRASSLANDS', waveTarget:20, endless:false,
    theme:{ void:'#5b7d33', tile1:'#86c64a', tile2:'#7cbd43', tuft:'rgba(60,110,40,0.35)',
            wall:null, post:null, bg:'#6fae3d', tint:null, music:'game' },
    foes:FOES_GRASS, bosses:BOSSES_GRASS },
  { id:'dirt', name:'DIRT DEPTHS', waveTarget:30, endless:false,
    theme:{ void:'#5a3d28', tile1:'#7a5333', tile2:'#6f4a2c', tuft:'rgba(40,26,14,0.35)',
            wall:'#4a3320', post:'#7a5a38', postDark:'#3a2616', bg:'#6b4a30', tint:'#8a5a2c', music:'game' },
    foes:FOES_GRASS, bosses:BOSSES_GRASS },
  { id:'under', name:'THE UNDERGROUND', waveTarget:0, endless:true,
    theme:{ void:'#1c1622', tile1:'#33293f', tile2:'#2c2336', tuft:'rgba(120,90,160,0.25)',
            wall:'#241a30', post:'#4a3a60', postDark:'#160f1e', bg:'#241a30', tint:'#6a4f8a', music:'boss2' },
    foes:FOES_GRASS, bosses:BOSSES_GRASS },
];
let worldIdx = 0;
function curWorld(){ return WORLDS[worldIdx]; }
let curFoes   = WORLDS[0].foes;
let curBosses = WORLDS[0].bosses;
let curTheme  = WORLDS[0].theme;
let unlockedMax = +(localStorage.getItem('br_unlocked')||0);
let selWorld = Math.min(unlockedMax, WORLDS.length-1);
function loadWorld(idx){
  worldIdx = clamp(idx,0,WORLDS.length-1);
  const w = curWorld(); curFoes = w.foes; curBosses = w.bosses; curTheme = w.theme;
  document.body.style.background = curTheme.bg;
}
let cut = null;   // cutscene state
function worldCleared(boss){
  unlockedMax = Math.min(WORLDS.length-1, Math.max(unlockedMax, worldIdx+1));
  localStorage.setItem('br_unlocked', unlockedMax);
  selWorld = Math.min(WORLDS.length-1, worldIdx+1);
  state = ST.CUTSCENE;
  cut = { t:0, boss:boss, alpha:1, fade:0, name:curWorld().name };
  boss.cut = true; boss.deathScale = 1;
  enemies.length=0; enemies.push(boss);   // keep only the dying boss on screen
  ebullets=[]; bullets=[]; zones=[];
  hitstop=0.25; shake=Math.max(shake,16);
  stopMusic(); sfx.win();
  bigText('WORLD CLEARED', '#ffd24a');
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
  for(let i=texts.length-1;i>=0;i--){ const tx=texts[i]; tx.t=(tx.t||0)+dt; tx.y+=(tx.vy||0)*dt; tx.life-=dt; if(tx.life<=0) texts.splice(i,1); }
  if(cut.t > 2.5){ cut=null; toMenuFromClear(); }
}
function toMenuFromClear(){
  quitToMenu();           // existing teardown -> menu (full reset)
  triggerUnlockReveal();  // defined in a later task; stub for now
}
// ---- world-select carousel (menu) ----
function worldLabel(i){ return 'WORLD '+(i+1)+' · '+(i<=unlockedMax ? WORLDS[i].name : '??? 🔒'); }
function refreshWorldSel(){
  $('wname').textContent = worldLabel(selWorld);
  $('wprev').disabled = selWorld<=0;
  $('wnext').disabled = selWorld>=unlockedMax;   // can't pick locked worlds
}
function triggerUnlockReveal(){
  refreshWorldSel();
  const el=$('worldsel'); if(el){ el.classList.remove('reveal'); void el.offsetWidth; el.classList.add('reveal'); }
  bigText('NEW WORLD UNLOCKED','#ffd24a');
}

// ---- rarity tiers: lower weight = rarer in the level-up draw (appearance-only) ----
const RARITY = {
  common:    { w:100, label:'COMMON' },
  uncommon:  { w:52,  label:'UNCOMMON' },
  rare:      { w:24,  label:'RARE' },
  epic:      { w:9,   label:'EPIC' },
  legendary: { w:3,   label:'LEGENDARY' },
};
// ---- card pool: passives level to a cap; abilities take 4 levels, then EVOLVE on the 5th pick ----
// rarity: tier (appearance + draw odds). req:[ids] = synergy card, hidden until those cards are owned.
const UPGRADES = [
  // ⚔️ passives
  { id:'dmg',    name:'Brute Force',     icon:'coin',     rarity:'common', cap:5, steps:[{desc:'+25% damage.',          f:()=>P.dmg*=1.25}] },
  { id:'rate',   name:'Adrenaline Rush', icon:'gem',      rarity:'common', cap:5, steps:[{desc:'+18% attack speed.',    f:()=>P.fireRate*=0.82}] },
  { id:'speed',  name:'Fleet Footed',    icon:'heart',    rarity:'common', cap:5, steps:[{desc:'+12% movement speed.',  f:()=>P.speed*=1.12}] },
  { id:'hp',     name:'Vitality Essence',icon:'heart',    rarity:'common', cap:5, steps:[{desc:'+25 max HP, full heal.',f:()=>{P.maxHp+=25;P.hp=P.maxHp;}}] },
  { id:'magnet', name:'Magnetic Pulse',  icon:'gem',      rarity:'common', cap:5, steps:[{desc:'+40% item pickup radius.',f:()=>P.magnet*=1.4}] },
  { id:'armor',  name:'Iron Skin',       icon:'turtle',   rarity:'common', cap:5, steps:[{desc:'-7% damage taken.',     f:()=>P.armor*=0.93}] },
  { id:'regen',  name:'Regeneration',    icon:'heart',    rarity:'common', cap:5, steps:[{desc:'recover +1 HP / second.',f:()=>P.regen+=1}] },
  { id:'heavy',  name:'Heavy Rounds',    icon:'coin',     rarity:'common', cap:5, steps:[{desc:'+15% bullet size & +8% projectile speed.',f:()=>{P.bulletR*=1.15;P.bulletSpd*=1.08;}}] },
  { id:'thick',  name:'Thick Skin',      icon:'heart',    rarity:'common', cap:5, steps:[{desc:'+15 max HP.',           f:()=>P.maxHp+=15}] },
  { id:'crit',   name:'Critical Strike', icon:'coin',     rarity:'uncommon',cap:5,steps:[{desc:'+10% crit chance (3x dmg).',f:()=>P.crit=Math.min(0.8,P.crit+0.10)}] },
  { id:'dashcd', name:'Quick Reflexes',  icon:'tralalero',rarity:'uncommon',cap:5,steps:[{desc:'dash cooldown -20%.',   f:()=>P.dashMax*=0.8}] },
  { id:'critdmg',name:'Killer Instinct', icon:'coin',     rarity:'uncommon',cap:5,steps:[{desc:'+0.5x critical damage.',f:()=>P.critMul+=0.5}] },
  { id:'gold',   name:'Treasure Hunter', icon:'coin',     rarity:'uncommon',cap:5,steps:[{desc:'+20% gold & +12% XP.',  f:()=>{P.goldMul*=1.2;P.xpMul*=1.12;}}] },
  { id:'steady', name:'Steady Hands',    icon:'gem',      rarity:'uncommon',cap:5,steps:[{desc:'-15% bullet spread & +6% damage.',f:()=>{P.spread*=0.85;P.dmg*=1.06;}}] },
  { id:'frenzy', name:'Killing Frenzy',  icon:'tiger',    rarity:'rare',   cap:5, steps:[{desc:'kills build stacks: +3% damage & fire rate each.',f:()=>{P.frenzyGain+=1;P.frenzyMax+=3;}}] },
  { id:'glass',  name:'Glass Cannon',    icon:'cappuccino',rarity:'epic',  cap:3, steps:[{desc:'+35% damage, but -15 max HP.',f:()=>{P.dmg*=1.35;if(!P.glassSafe){P.maxHp=Math.max(20,P.maxHp-15);P.hp=Math.min(P.hp,P.maxHp);}}}] },

  // 🔮 abilities — 4 levels, then EVOLVE
  { id:'multi', name:'Splinter Shot', icon:'gembig', rarity:'rare',
    steps:[{desc:'+1 projectile.',f:()=>P.shots+=1},{desc:'+1 projectile.',f:()=>P.shots+=1},{desc:'+1 projectile.',f:()=>P.shots+=1},{desc:'+1 projectile.',f:()=>P.shots+=1}],
    evo:{name:'Omni-Barrage', icon:'gembig', desc:'EVOLVE — fires a full 360° ring of projectiles.', f:()=>{P.shots+=2;P.radial=true;}} },
  { id:'pierce', name:'Piercing Rounds', icon:'crocodilo', rarity:'rare',
    steps:[{desc:'pierce +1 enemy.',f:()=>P.pierce+=1},{desc:'pierce +1 enemy.',f:()=>P.pierce+=1},{desc:'pierce +1 enemy.',f:()=>P.pierce+=1},{desc:'pierce +1 enemy.',f:()=>P.pierce+=1}],
    evo:{name:'Hyper-Velocity Core', icon:'crocodilo', desc:'EVOLVE — infinite pierce, faster & larger cyan shots.', f:()=>{P.pierce=999;P.railgun=true;}} },
  { id:'range', name:'Focal Lens', icon:'gem', rarity:'uncommon',
    steps:[{desc:'+20% attack range.',f:()=>P.range*=1.2},{desc:'+20% attack range.',f:()=>P.range*=1.2},{desc:'+20% attack range.',f:()=>P.range*=1.2},{desc:'+20% attack range.',f:()=>P.range*=1.2}],
    evo:{name:'Farsight Sniper', icon:'coin', desc:'EVOLVE — maximum range and +50% damage.', f:()=>{P.range*=1.8;P.dmg*=1.5;}} },
  { id:'orbit', name:'Orbiting Barrier', icon:'gembig', rarity:'epic',
    steps:[{desc:'+1 orbiting projectile.',f:()=>P.orbs+=1},{desc:'+1 orbiting projectile.',f:()=>P.orbs+=1},{desc:'+1 orbiting projectile.',f:()=>P.orbs+=1},{desc:'+1 orbiting projectile.',f:()=>P.orbs+=1}],
    evo:{name:'Guardian Shield', icon:'gembig', desc:'EVOLVE — extra orb that destroys incoming bullets.', f:()=>{P.orbs+=1;P.orbShield=true;}} },
  { id:'nova', name:'Pulse Wave', icon:'gembig', rarity:'epic',
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
  { id:'blackhole', name:'Black Hole', icon:'octopus', rarity:'legendary',
    steps:[{desc:'periodically spawn a black hole that pulls & grinds enemies.',f:()=>{P.bhole=true;}},
           {desc:'black hole strikes more often & hits harder.',f:()=>{P.bholeCdBase=Math.max(4,P.bholeCdBase-1.5);P.bholeDmg+=8;}},
           {desc:'black hole grows larger & stronger.',f:()=>{P.bholeR+=40;P.bholeDmg+=8;}},
           {desc:'black hole strikes more often & lingers.',f:()=>{P.bholeCdBase=Math.max(3,P.bholeCdBase-1.5);P.bholeLife+=0.6;}}],
    evo:{name:'Singularity', icon:'octopus', desc:'EVOLVE — bigger, longer, and devours enemy bullets.', f:()=>{P.bhole=true;P.bholeEvo=true;P.bholeR+=50;P.bholeDmg+=14;P.bholeLife+=0.8;}} },
  { id:'phoenix', name:'Phoenix Heart', icon:'flamingo', rarity:'legendary',
    steps:[{desc:'revive once on death in an explosive rebirth (recharges slowly).',f:()=>{P.phoenixMax+=1;P.phoenix=P.phoenixMax;}},
           {desc:'revive heals more & recharges faster.',f:()=>{P.phoenixHeal+=0.2;P.phoenixCdBase=Math.max(30,P.phoenixCdBase-10);}},
           {desc:'gain a burning aura that scorches nearby foes.',f:()=>{P.burnAura+=8;}},
           {desc:'revive recharges faster.',f:()=>{P.phoenixCdBase=Math.max(20,P.phoenixCdBase-10);}}],
    evo:{name:'Eternal Phoenix', icon:'flamingo', desc:'EVOLVE — full-HP rebirth, a huge nuke, and a permanent burn aura.', f:()=>{P.phoenixMax+=1;P.phoenix=P.phoenixMax;P.phoenixEvo=true;P.phoenixHeal=1;P.burnAura+=14;P.phoenixCdBase=Math.max(15,P.phoenixCdBase-8);}} },

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
  return { apply:u.steps[0].f, name:u.name, icon:u.icon, desc:u.steps[0].desc, label:'Lv '+(lvl+1), evolve:false, rare:u.rare };
}

function resetPlayer(){
  Object.assign(P, {
    x:WORLD.w/2, y:WORLD.h/2, r:18, hp:100, maxHp:100, speed:200,
    dmg:10, fireRate:0.32, fireCd:0, shots:1, pierce:0, range:330,
    magnet:90, crit:0.05, orbs:0, orbA:0, nova:false, novaCd:5, novaCdBase:5, novaPow:1,
    vamp:0, bslow:1, lv:1, xp:0, xpNext:4, inv:0, up:{}, slowT:0,
    face:0, walk:0, dashCd:0, dashMax:2.2, dashT:0, dvx:0, dvy:0,
    radial:false, railgun:false, orbShield:false, novaEvo:false, freeze:false,
    critMul:3, frenzy:0, frenzyGain:0, frenzyMax:0,
    shield:0, shieldMax:0, shieldCd:0, shieldCdBase:8, shieldDR:1, aegisEvo:false,
    bhole:false, bholeCd:0, bholeCdBase:7, bholeR:120, bholeDmg:18, bholeLife:2, bholeEvo:false,
    phoenix:0, phoenixMax:0, phoenixCd:0, phoenixCdBase:45, phoenixHeal:0.5, phoenixEvo:false, burnAura:0,
    armor:1, regen:0, bulletR:1, bulletSpd:1, goldMul:1, xpMul:1, spread:1,
    frostfire:false, holeNova:false, critHeal:0, glassSafe:false, orbShoot:false, orbShootCd:0, overdrive:false, aegisNova:false
  });
}

function startGame(idx){
  loadWorld(Number.isInteger(idx) ? idx : selWorld);
  initAudio();
  playMusic(curTheme.music);
  resetPlayer();
  bullets=[]; ebullets=[]; enemies=[]; gems=[]; parts=[]; texts=[]; zones=[]; holes=[];
  wave=1; score=0; kills=0; elapsed=0; boss=null; combo=0; comboT=0; arena=null; bossPending=0;
  state=ST.PLAY;
  $('menu').classList.add('hidden');
  $('gameover').classList.add('hidden');
  $('bossbar').classList.add('hidden');
  $('hud').classList.remove('hidden');
  $('zoomctl').classList.remove('hidden');
  if(IS_TOUCH) $('dashbtn').classList.remove('hidden');   // mobile-only on-screen dash
  startWave();
}

function startWave(){
  betweenWaves=false;
  $('wavetag').textContent = 'WAVE '+wave;
  if(wave % 5 === 0){ startBossArena(); waveEnemiesLeft = 0; }
  else { waveEnemiesLeft = 7 + wave*3; spawnTimer = 0; sfx.wave(); }
  bigText(wave%5===0 ? 'BOSS WAVE' : 'WAVE '+wave, wave%5===0?'#e54d4d':'#ffe08a');
}

// lock the field into a small bounded arena around the player; boss arrives after a delay
function startBossArena(){
  const half = ARENA_SIZE/2;
  const cxw = clamp(P.x, WALL+half, WORLD.w-WALL-half);
  const cyw = clamp(P.y, WALL+half, WORLD.h-WALL-half);
  arena = { x:cxw-half, y:cyw-half, w:ARENA_SIZE, h:ARENA_SIZE };
  setZoom(clamp(ARENA_ZOOM, ZMIN, ZMAX));   // auto zoom-in (player can still re-zoom)
  bossPending = ARENA_LEAD;
  const bw=$('bosswarn'); bw.textContent='⚠ BOSS INCOMING ⚠'; bw.classList.remove('hidden');
  sfx.warn();
}

function ringPos(){ // spawn point on a ring around player, clamped to world
  const a = rand(0,TAU), d = Math.max(W,H)*0.62 + 80;
  return { x: clamp(P.x+Math.cos(a)*d, WALL+30, WORLD.w-WALL-30),
           y: clamp(P.y+Math.sin(a)*d, WALL+30, WORLD.h-WALL-30) };
}

function spawnBoss(){
  const def = curBosses[(Math.floor(wave/5)-1) % curBosses.length];
  const mult = 1 + (wave-5)*0.22;
  const p = arena ? { x:arena.x+arena.w/2, y:arena.y+arena.h*0.28 } : ringPos();
  boss = {
    spr:def.spr, name:def.name, pattern:def.pattern,
    x:p.x, y:p.y, r:def.r,
    hp:def.hp*HP_MULT*mult, maxHp:def.hp*HP_MULT*mult,
    t:0, phase:0, isBoss:true, sp:46, xp:0, score:500, hitT:0, sq:0,
    mst:'recover', mt:1.0, mv:null, lastMv:null, vph:1, pull:0, spin:0, dst:'idle', iv:0,
    rollSpray:0, warpT:0
  };
  enemies.push(boss);
  sfx.boss();
  playMusic('boss'+(((Math.floor(wave/5)-1)%3+3)%3));   // a different loop per boss
  $('bossname').textContent = boss.name;
  $('bossfill').style.width = '100%';
  $('bossbar').classList.remove('hidden');
  const bw=$('bosswarn'); bw.textContent='⚠ BOSS ⚠'; bw.classList.remove('hidden');
  setTimeout(()=>bw.classList.add('hidden'), 1700);
}

function spawnEnemy(){
  const maxIdx = Math.min(curFoes.length-1, Math.floor(wave/2));
  const def = curFoes[Math.floor(Math.random()*(maxIdx+1))];
  const p = ringPos();
  const hpMult = 1 + (wave-1)*0.16;
  enemies.push({
    spr:def.spr, name:def.name, x:p.x, y:p.y, r:def.r,
    hp:def.hp*HP_MULT*hpMult, maxHp:def.hp*HP_MULT*hpMult,
    sp:def.sp*(1+wave*0.02), xp:def.xp, score:def.score, range:def.range, shoot:def.shoot, death:def.death,
    aoe:def.aoe, aoeCd:rand(1.5,3),
    dash:def.dash, dst:'idle', dcd:rand(2,4), da:0, dwin:0, ddur:0,
    shell:def.shell, shellCd:rand(3,5), iv:0,
    support:def.support, supCd:rand(2,3.5),
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
function addZone(x,y,r,o){
  zones.push({ x,y,r, t:0, tele:o.tele||0.6, life:o.life||1.4, dps:o.dps||10, slow:!!o.slow, col:o.col||'#e8a93a' });
}

// ============ LEVEL UP ============
function gainXp(n){
  P.xp += n*(P.xpMul||1);
  while(P.xp >= P.xpNext){
    P.xp -= P.xpNext;
    P.lv++;
    P.xpNext = Math.floor(4 + P.lv*2.6 + P.lv*P.lv*0.4);
    openLevelUp();
  }
  $('leveltag').textContent = 'LV '+P.lv;
}

function openLevelUp(){
  state = ST.LEVELUP;
  sfx.level();
  // candidates = every card with a remaining move whose synergy gate (req) is satisfied
  const cands = [];
  for(const u of UPGRADES){
    if(u.req && !u.req.every(id => (P.up[id]||0) > 0)) continue;   // synergy card still locked
    const m = nextMove(u); if(m) cands.push({u,m});
  }
  // weighted draw of 3 distinct by rarity (rarer = lower weight); evolve-ready cards stay prioritised
  const opts = []; const bag = cands.slice();
  while(opts.length<3 && bag.length){
    const w = bag.map(x => (RARITY[x.u.rarity||'common']||RARITY.common).w * (x.m.evolve ? 8 : 1));
    let total=0; for(const v of w) total+=v;
    let r = Math.random()*total, idx=0;
    while(idx<w.length-1 && (r-=w[idx])>0) idx++;
    opts.push(bag.splice(idx,1)[0]);
  }
  const wrap = $('cards'); wrap.innerHTML='';
  opts.forEach(({u,m})=>{
    const d=document.createElement('button');
    const tier = u.rarity||'common';
    d.className = 'card r-'+tier + (m.evolve ? ' evolve' : '') + (u.req ? ' synergy' : '');
    const ic = SP[m.icon] ? SP[m.icon].toDataURL() : '';
    const rtag = u.req ? '<span class="rtag syn">SYNERGY</span>' : '<span class="rtag r-'+tier+'">'+(RARITY[tier]||RARITY.common).label+'</span>';
    const badge = m.evolve ? '<span class="evobadge">EVOLVE!</span>' : '<span class="lvtag">'+m.label+'</span>';
    // evolution progress (Survivor.io-style pips + "N more to evolve")
    const owned = P.up[u.id]||0;
    let pips='', ptxt='', pevo='';
    if(u.evo){
      const slots = u.steps.length;
      for(let i=0;i<slots;i++) pips += `<span class="pip ${i<owned?'on':(i===owned?'next':'')}"></span>`;
      pips += `<span class="pip evo ${owned>=slots?'on':(owned===slots?'next':'')}"></span>`;
      if(m.evolve){ ptxt='EVOLUTION READY!'; pevo='evo'; } else ptxt=(slots-owned)+' more to evolve';
    } else {
      const cap = u.cap||5;
      for(let i=0;i<cap;i++) pips += `<span class="pip ${i<owned?'on':(i===owned?'next':'')}"></span>`;
      ptxt = 'Lv '+(owned+1)+' / '+cap;
    }
    d.innerHTML = `<img class="cicon" draggable="false" src="${ic}"><div class="cbody">${rtag}<div class="cname">${m.name}${badge}</div><div class="cdesc">${m.desc}</div><div class="cprog">${pips}<span class="ptxt ${pevo}">${ptxt}</span></div></div>`;
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
  const best = Math.max(score, +(localStorage.getItem('brainrot_best')||0));
  localStorage.setItem('brainrot_best', best);
  $('fwave').textContent = 'wave '+wave;
  $('fscore').textContent = score;
  $('fkills').textContent = kills;
  $('fbest').textContent = best;
  $('hud').classList.add('hidden');
  $('dashbtn').classList.add('hidden');
  $('zoomctl').classList.add('hidden');
  $('bossbar').classList.add('hidden');
  setTimeout(()=>$('gameover').classList.remove('hidden'), 600);
}

// ============ DASH ============
function tryDash(){
  if(state!==ST.PLAY || P.dashCd>0) return;
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

// ============ UPDATE ============
function addCombo(){
  combo++; comboT=2.6;
  if(combo>=3){
    const ct=$('combotag'); ct.textContent='COMBO x'+combo; ct.style.opacity='1';
  }
}
function comboMult(){ return 1 + Math.floor(combo/5)*0.5; }

function update(dt){
  elapsed += dt;
  if(comboT>0){ comboT-=dt; if(comboT<=0){ combo=0; $('combotag').style.opacity='0'; } }
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
  if(P.inv>0) P.inv-=dt;
  if(P.slowT>0) P.slowT-=dt;
  if(P.dashCd>0){ P.dashCd-=dt; $('dashbtn').classList.toggle('cool', P.dashCd>0); }

  // camera follows, clamped to world (zoom-aware)
  computeCamera();

  // --- auto-fire at nearest enemy within range ---
  P.fireCd -= dt;
  if(P.fireCd<=0 && enemies.length){
    let best=null, bd=Infinity;
    for(const e of enemies){ const d=dist2(P.x,P.y,e.x,e.y); if(d<bd){bd=d;best=e;} }
    if(best && bd <= P.range*P.range){   // only shoot what's in range
      P.fireCd = P.fireRate / (1 + (P.frenzy||0)*0.03);   // Killing Frenzy speeds up fire
      const spd = (P.railgun ? 760 : 560) * (P.bulletSpd||1);
      const br  = (P.railgun ? 9 : 6) * (P.bulletR||1);
      // always fire the aimed volley at the nearest enemy
      const base = Math.atan2(best.y-P.y, best.x-P.x), spread = 0.16*(P.spread||1);
      for(let i=0;i<P.shots;i++){
        const a = base + (i-(P.shots-1)/2)*spread;
        bullets.push({x:P.x,y:P.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:br,pierce:P.pierce,hit:new Set(),dist:P.range});
      }
      if(P.radial){                       // Omni-Barrage: 360 ring IN ADDITION (reduced dmg so it stays fair vs crowds)
        const n = clamp(P.shots*2, 8, 20);
        for(let i=0;i<n;i++){
          const a = (i/n)*TAU + elapsed*1.5;
          bullets.push({x:P.x,y:P.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:br,pierce:P.pierce,hit:new Set(),dist:P.range,dmgMul:0.6});
        }
      }
      sfx.shoot();
    }
  }

  // --- orbs ---
  if(P.orbs>0){
    P.orbA += dt*3.2;
    for(let i=0;i<P.orbs;i++){
      const a = P.orbA + i*(TAU/P.orbs);
      const ox = P.x + Math.cos(a)*58, oy = P.y + Math.sin(a)*58;
      for(const e of enemies){
        if(e.iv>0) continue;
        if(dist2(ox,oy,e.x,e.y) < (e.r+10)*(e.r+10)){
          e.hp -= 9*dt*P.dmg; e.hitT=Math.max(e.hitT,0.06);
        }
      }
      if(P.orbShield){                    // Sigma Squad: orbs eat enemy bullets
        for(let bi=ebullets.length-1;bi>=0;bi--){
          if(dist2(ox,oy,ebullets[bi].x,ebullets[bi].y) < 14*14) ebullets.splice(bi,1);
        }
      }
    }
    if(P.orbShoot){                       // Orbital Storm: orbs fire shots outward
      P.orbShootCd -= dt;
      if(P.orbShootCd<=0){ P.orbShootCd=1.2;
        for(let i=0;i<P.orbs;i++){ const a=P.orbA+i*(TAU/P.orbs), ox=P.x+Math.cos(a)*58, oy=P.y+Math.sin(a)*58;
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
      const R = P.novaEvo ? 280 : 190;
      burst(P.x,P.y,'#9fd0ff',P.novaEvo?40:26,420); sfx.boss();
      for(let k=0;k<3;k++) parts.push({x:P.x,y:P.y,vx:0,vy:0,life:0.4,max:0.4,color:'#cfeaff',r:R,ring:true});
      for(const e of enemies){
        if(dist2(P.x,P.y,e.x,e.y) < R*R){
          const fb = (P.freeze && e.frz>0) ? (P.frostfire?2.2:1.6) : 1;   // Frostfire Core amps the shatter
          damageEnemy(e,(P.novaEvo?40:28)*P.dmg*P.novaPow*fb,P.x,P.y,false);
        }
      }
      ebullets = ebullets.filter(b => dist2(P.x,P.y,b.x,b.y) > R*R);  // Skibidi Nuke clears bullets
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
    for(const e of enemies){
      if(e.iv>0) continue;
      if(dist2(P.x,P.y,e.x,e.y) < 80*80){ e.hp -= P.burnAura*dt; e.hitT=Math.max(e.hitT,0.05);
        if(Math.random()<0.18) parts.push({x:e.x+rand(-8,8),y:e.y+rand(-8,8),vx:0,vy:-rand(20,50),life:0.4,max:0.4,color:'#ff8a3a',r:rand(2,4)}); }
    }
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
  for(let i=holes.length-1;i>=0;i--){
    const h=holes[i]; h.t+=dt;
    for(const e of enemies){
      if(e.iv>0) continue;
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
    b.dist -= Math.hypot(b.vx,b.vy)*dt;     // range limit
    b.x+=b.vx*dt; b.y+=b.vy*dt;
    if(b.dist<=0){ burst(b.x,b.y,'#fff6bf',3,55); bullets.splice(i,1); continue; }
    if(b.x<-20||b.x>WORLD.w+20||b.y<-20||b.y>WORLD.h+20){ bullets.splice(i,1); continue; }
    for(const e of enemies){
      if(b.hit.has(e) || e.iv>0) continue;
      if(dist2(b.x,b.y,e.x,e.y) < (e.r+b.r)*(e.r+b.r)){
        const critC = P.crit + (P.overdrive ? (P.frenzy||0)*0.004 : 0);   // Overdrive: frenzy stacks add crit
        const isCrit = Math.random()<critC;
        const dmg = P.dmg * (b.dmgMul||1) * (1 + (P.frenzy||0)*0.03) * (isCrit?(P.critMul||3):1);
        b.hit.add(e);
        hitSpark(b.x,b.y,isCrit?'#ffe14d':'#ff9f3a',isCrit);
        damageEnemy(e,dmg,b.x,b.y,isCrit);
        if(isCrit && P.critHeal>0) P.hp=Math.min(P.maxHp,P.hp+P.critHeal);   // Blood Crit
        if(b.pierce>0){ b.pierce--; } else { bullets.splice(i,1); }
        break;
      }
    }
  }

  // --- spawn during wave ---
  spawnTimer -= dt;
  if(!betweenWaves && waveEnemiesLeft>0 && spawnTimer<=0){
    spawnTimer = Math.max(0.14, 0.85 - wave*0.04);
    spawnEnemy(); waveEnemiesLeft--;
  }

  // --- enemies ---
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    e.t += dt;
    if(e.hitT>0) e.hitT-=dt;
    if(e.sq>0) e.sq-=dt*4;
    if(e.frz>0) e.frz-=dt;

    if(e.isBoss){
      updateBoss(e,dt);
    } else {
      if(e.iv>0) e.iv-=dt;
      // turtle: periodically pull into an invulnerable shell and hold still
      if(e.shell && e.iv<=0){ e.shellCd-=dt; if(e.shellCd<=0){ e.iv=1.6; e.shellCd=4.5; } }
      // charge-dash state machine (Penguino slide, Tigrrullini pounce, ...)
      let dashing=false;
      if(e.dash){
        if(e.dst==='wind'){ e.dwin-=dt; dashing=true; if(e.dwin<=0){ e.dst='dash'; e.ddur=0.32; } }
        else if(e.dst==='dash'){ e.ddur-=dt; dashing=true; e.x+=Math.cos(e.da)*460*dt; e.y+=Math.sin(e.da)*460*dt; if(e.ddur<=0){ e.dst='idle'; e.dcd=rand(2.6,4.6); } }
        else { e.dcd-=dt; if(e.dcd<=0 && e.iv<=0 && dist2(e.x,e.y,P.x,P.y)<380*380){ e.dst='wind'; e.dwin=0.5; e.da=Math.atan2(P.y-e.y,P.x-e.x); dashing=true; } }
      }
      if(!dashing && e.iv<=0){
        const fs = e.frz>0 ? 0.2 : 1;     // Absolute Ohio freeze
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
      }
      e.x = clamp(e.x, WALL, WORLD.w-WALL); e.y = clamp(e.y, WALL, WORLD.h-WALL);
      if(arena){ e.x=clamp(e.x, arena.x+e.r, arena.x+arena.w-e.r); e.y=clamp(e.y, arena.y+e.r, arena.y+arena.h-e.r); }
      if(wave>=3 && e.iv<=0){
        if(e.shoot && (!e.range || dist2(e.x,e.y,P.x,P.y) <= e.range*e.range)){
          e.shootCd -= dt;
          if(e.shootCd<=0){
            e.shootCd = e.shoot.cd || rand(2.5,4.5);
            const spd = e.shoot.spd||140, col = e.shoot.col||'#e23b3b';
            muzzleFlash(e.x, e.y, col);   // colored puff = "this enemy fired these bullets"
            if(e.shoot.type==='ring'){ const n=e.shoot.n||8, off=rand(0,TAU); for(let k=0;k<n;k++) fireEB(e.x,e.y, off+k*TAU/n, spd, col); }
            else { const n=e.shoot.n||1, aim=Math.atan2(P.y-e.y,P.x-e.x); for(let k=0;k<n;k++) fireEB(e.x,e.y, aim+(k-(n-1)/2)*0.18, spd, col); }
          }
        }
        if(e.aoe){
          e.aoeCd -= dt;
          if(e.aoeCd<=0){ e.aoeCd = e.aoe.cd||3.5; addZone(P.x+rand(-24,24), P.y+rand(-24,24), e.aoe.r, e.aoe); }
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

    if(dist2(e.x,e.y,P.x,P.y) < (e.r+P.r)*(e.r+P.r)) hurtPlayer(e.isBoss?20:10, e);

    if(e.hp<=0){
      enemies.splice(i,1);
      kills++; addCombo();
      const gain = Math.round(e.score*comboMult());
      score += gain;
      sfx.hit();
      shake=Math.max(shake,e.isBoss?16:5); hitstop=Math.max(hitstop,e.isBoss?0.08:0.03);
      burst(e.x,e.y,'#ff9f3a',e.isBoss?60:14,e.isBoss?420:200);
      if(P.vamp>0){ P.hp=Math.min(P.maxHp,P.hp+P.vamp); }
      if(P.frenzyGain>0) P.frenzy=Math.min(P.frenzyMax, P.frenzy+P.frenzyGain);
      if(P.frostfire && e.frz>0){          // Frostfire Core: frozen foes shatter into shards
        for(let s=0;s<4;s++){ const a=s*(TAU/4)+rand(0,0.6);
          bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*420,vy:Math.sin(a)*420,r:6,pierce:1,hit:new Set(),dist:300,dmgMul:0.5}); }
        burst(e.x,e.y,'#bfe6ff',8,180);
      }
      if(e.isBoss && !curWorld().endless && wave === curWorld().waveTarget){
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
        const nLarge=8+(bossNum-1)*3, nCoin=8+(bossNum-1)*2;    // drops escalate per boss
        for(let g=0; g<nLarge; g++) dropOrb(e.x, e.y, 3, 120, 300);
        for(let g=0; g<nCoin; g++){ const a=rand(0,TAU), s=rand(120,300); gems.push({x:e.x,y:e.y,coin:true,t:rand(0,6),vx:Math.cos(a)*s,vy:Math.sin(a)*s}); }
        ebullets=[];
      } else {
        if(e.death && e.death.type==='ring'){ const n=e.death.n||4; for(let k=0;k<n;k++) fireEB(e.x,e.y,k*TAU/n,150,'#e58a3a'); }
        dropOrb(e.x, e.y, orbTier(e.xp));
        if(Math.random()<0.12){ const a=rand(0,TAU), s=rand(90,210); gems.push({x:e.x,y:e.y,coin:true,t:0,vx:Math.cos(a)*s,vy:Math.sin(a)*s}); }
        if(Math.random()<0.025){ const a=rand(0,TAU), s=rand(90,210); gems.push({x:e.x,y:e.y,heart:true,t:0,vx:Math.cos(a)*s,vy:Math.sin(a)*s}); }
      }
      $('scoretag').textContent = '★ '+score;
    }
  }

  // wave cleared? (not while the boss is still incoming)
  if(!betweenWaves && bossPending<=0 && waveEnemiesLeft===0 && enemies.length===0){
    betweenWaves=true;
    const bonus=wave*50; score+=bonus;
    bigText('WAVE CLEARED +'+bonus,'#5fbf52');
    $('scoretag').textContent='★ '+score;
    setTimeout(()=>{ if(state===ST.PLAY||state===ST.LEVELUP){ wave++; startWave(); } }, 2200);
  }

  // --- enemy bullets ---
  for(let i=ebullets.length-1;i>=0;i--){
    const b=ebullets[i];
    b.x += b.vx*dt*P.bslow; b.y += b.vy*dt*P.bslow;
    b.t = (b.t||0)+dt;
    if(b.x<-30||b.x>WORLD.w+30||b.y<-30||b.y>WORLD.h+30||b.t>9){ ebullets.splice(i,1); continue; }
    if(dist2(b.x,b.y,P.x,P.y) < (b.r+P.r-3)*(b.r+P.r-3)){ ebullets.splice(i,1); hurtPlayer(8); }
  }

  // --- gems ---
  for(let i=gems.length-1;i>=0;i--){
    const g=gems[i];
    g.t+=dt;
    if(g.vx||g.vy){ g.x += g.vx*dt; g.y += g.vy*dt; const damp = Math.pow(0.0008, dt); g.vx *= damp; g.vy *= damp; }
    const d = dist2(g.x,g.y,P.x,P.y);
    if(d < P.magnet*P.magnet){
      const dd=Math.sqrt(d)||1;
      const pull = 460*(1 - dd/P.magnet) + 130;
      g.x += (P.x-g.x)/dd*pull*dt; g.y += (P.y-g.y)/dd*pull*dt;
    }
    if(d < (P.r+12)*(P.r+12)){
      gems.splice(i,1);
      if(g.heart){ P.hp=Math.min(P.maxHp,P.hp+25); floatText(P.x,P.y-24,'+25','#e8556a',16); burst(P.x,P.y,'#ff97a6',8,120); sfx.coin(); }
      else if(g.coin){ const v=Math.round(20*comboMult()*(P.goldMul||1)); score+=v; gold+=v; localStorage.setItem('br_gold',gold); $('scoretag').textContent='★ '+score; floatText(g.x,g.y,'+'+v,'#f5c542',13); sfx.coin(); }
      else { gainXp(g.v); sfx.gem(Math.min(combo,8)); }
    }
  }

  // --- ground hazard zones ---
  for(let i=zones.length-1;i>=0;i--){
    const z=zones[i]; z.t+=dt;
    if(z.t>=z.tele && z.t<z.tele+z.life && P.dashT<=0 && P.inv<=0 && dist2(z.x,z.y,P.x,P.y)<z.r*z.r){
      P.hp -= z.dps*dt; hitFlash=Math.max(hitFlash,0.3);
      if(z.slow) P.slowT=Math.max(P.slowT,0.4);
      if(P.hp<=0){ gameOver(); }
    }
    if(z.t>z.tele+z.life) zones.splice(i,1);
  }

  // --- particles & texts ---
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];
    if(p.ring){ p.r+=(p.gr||600)*dt; p.life-=dt; if(p.life<=0) parts.splice(i,1); continue; }
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.9; p.vy*=0.9; p.life-=dt;
    if(p.life<=0) parts.splice(i,1);
  }
  for(let i=texts.length-1;i>=0;i--){
    const t=texts[i]; t.y+=t.vy*dt; t.life-=dt;
    if(t.life<=0) texts.splice(i,1);
  }

  if(shake>0) shake = Math.max(0, shake - dt*40);
  if(hitFlash>0) hitFlash -= dt*3;

  $('hpfill').style.width = Math.max(0,(P.hp/P.maxHp)*100)+'%';
  $('xpfill').style.width = (P.xp/P.xpNext)*100+'%';
  if(boss) $('bossfill').style.width = Math.max(0,(boss.hp/boss.maxHp)*100)+'%';
}

function damageEnemy(e,dmg,fx,fy,crit){
  if(e.iv>0) return;                 // shelled / invulnerable
  e.hp -= dmg; e.hitT=0.12; e.sq=1;
  if(P.freeze && !e.isBoss) e.frz=1.2;
  sfx.hit();
  floatText(e.x,e.y-e.r-4, (crit?'':'')+Math.round(dmg), crit?'#ffd23a':'#fff', crit?18:13);
  if(crit) floatText(e.x,e.y-e.r-20,'CRIT','#ffd23a',15);
}

function fireEB(x,y,a,sp,color){
  ebullets.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:7,color});
}

// ---- boss move primitives (finite bursts) ----
function mRing(e,n,spd,col){ const off=rand(0,TAU); for(let i=0;i<n;i++) fireEB(e.x,e.y,off+i*TAU/n,spd,col); muzzleFlash(e.x,e.y,col); }
function mAimed(e,n,spread,spd,col){ const aim=Math.atan2(P.y-e.y,P.x-e.x); for(let i=0;i<n;i++) fireEB(e.x,e.y,aim+(i-(n-1)/2)*spread,spd,col); muzzleFlash(e.x,e.y,col); }
// move pool for the current boss / Vaca phase
function bossMoves(e){
  switch(e.spr){
    case 'tralalero': return ['dash','spiral','aimed3'];
    case 'crocodilo': return ['carpet','ring16'];
    case 'sahur':     return ['slam','aimed5','dblslam'];
    case 'gorillo':   return ['roll','seedsmash','ring12'];
    case 'trippi':    return ['warp','spiral','ring16'];
    case 'vaca':
      if(e.vph>=3) return ['ring2x','pullspiral','aimed5'];
      if(e.vph>=2) return ['ring2','spiral','aimed5','pull'];
      return ['ring16','pull'];
  }
  return ['ring16'];
}
const MOVE_COL = { dash:'#e54d4d', spiral:'#e54d4d', aimed3:'#e23b3b', aimed5:'#e23b3b',
  ring16:'#4aa3df', ring12:'#3f7d33', ring2:'#7ec8ff', ring2x:'#d2a0ff', carpet:'#ff2e2e',
  slam:'#a9763e', dblslam:'#a9763e', seedsmash:'#e0503f', pull:'#d2a0ff', pullspiral:'#d2a0ff',
  roll:'#e0503f', warp:'#c77dff' };
function pickMove(e){ const pool=bossMoves(e); let m; do{ m=pick(pool); }while(pool.length>1 && m===e.lastMv); e.lastMv=m; return m; }
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
  }
  return 0.2;
}

function updateBoss(e,dt){
  if(e.iv>0) e.iv-=dt;
  if(!e.enraged && e.hp/e.maxHp < 0.4){ e.enraged=true; bigText('ENRAGED!','#e54d4d'); shake=Math.max(shake,12); }

  // La Vaca Saturno climbs HP-gated phases
  if(e.spr==='vaca'){
    const frac=e.hp/e.maxHp, ph = frac<0.33?3 : frac<0.66?2 : 1;
    if(ph>e.vph){ e.vph=ph; bigText('PHASE '+ph+'!','#d2a0ff'); shake=Math.max(shake,12); e.iv=0.6; ebullets=[]; sfx.boss(); }
  }

  // sustained sub-attacks (run independent of the move state machine)
  let dashing=false;
  if(e.pull>0){ e.pull-=dt; const a=Math.atan2(e.y-P.y,e.x-P.x), str=e.pullStr||100;
    P.x=clamp(P.x+Math.cos(a)*str*dt,WALL+P.r,WORLD.w-WALL-P.r); P.y=clamp(P.y+Math.sin(a)*str*dt,WALL+P.r,WORLD.h-WALL-P.r); }
  if(e.dst==='wind'){ dashing=true; e.dwin-=dt; if(e.dwin<=0){ e.dst='dash'; e.ddur=0.4; } }
  else if(e.dst==='dash'){ dashing=true; e.ddur-=dt; e.x+=Math.cos(e.da)*520*dt; e.y+=Math.sin(e.da)*520*dt; if(e.ddur<=0) e.dst='idle'; }
  if(e.spin>0){ e.spin-=dt; e.spinT=(e.spinT||0)-dt; if(e.spinT<=0){ e.spinT=0.1; e.phase=(e.phase||0)+0.42;
    const col=e.spinCol||'#e54d4d'; fireEB(e.x,e.y,e.phase,170,col); fireEB(e.x,e.y,e.phase+Math.PI,170,col); } }
  // Gorillo rolling-melon: while dashing from a 'roll', spray seeds sideways + drop trail
  if(e.rollSpray>0 && e.dst==='dash'){
    e.rollSpray-=dt; e.spT=(e.spT||0)-dt;
    if(e.spT<=0){ e.spT=0.09;
      fireEB(e.x,e.y,e.da+Math.PI/2,150,'#e0503f'); fireEB(e.x,e.y,e.da-Math.PI/2,150,'#e0503f');
      addZone(e.x,e.y,40,{tele:0.3,life:0.8,dps:14,col:'#3f7d33'}); }
  }
  // Trippi warp: count down the blink tell, then teleport beside the player and burst
  if(e.warpT>0){ e.warpT-=dt;
    if(e.warpT<=0){
      const a=rand(0,TAU); e.x=clamp(P.x+Math.cos(a)*180,WALL+e.r,WORLD.w-WALL-e.r); e.y=clamp(P.y+Math.sin(a)*180,WALL+e.r,WORLD.h-WALL-e.r);
      burst(e.x,e.y,'#c77dff',22,260); e.spin=0.7; e.spinCol='#c77dff'; e.iv=0.2; }
  }

  // ---- telegraphed move cycle: recover -> wind -> fire -> recover ----
  const enr = e.enraged?0.65:1;
  e.mt -= dt;
  if(e.mt<=0){
    if(e.mst==='recover'){ e.mst='wind'; e.mt=0.5; e.mv=pickMove(e); e.tellCol=MOVE_COL[e.mv]||'#fff'; sfx.warn(); }
    else if(e.mst==='wind'){ e.mst='fire'; e.mt=execMove(e); }
    else { e.mst='recover'; e.mt=(e.spr==='vaca'&&e.vph>=3?0.7:1.1)*enr; }
  }

  // anchor drift toward the player (unless mid-dash)
  if(!dashing){
    const tx = clamp(P.x + Math.sin(e.t*0.5)*260, WALL+e.r, WORLD.w-WALL-e.r);
    const ty = clamp(P.y - 220 + Math.cos(e.t*0.4)*60, WALL+e.r, WORLD.h-WALL-e.r);
    e.x += (tx-e.x)*0.9*dt; e.y += (ty-e.y)*0.9*dt;
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
    if(P.aegisNova) novaBlast(P.x,P.y,P.novaEvo?280:190,(P.novaEvo?40:28)*P.dmg*P.novaPow);   // Aegis Nova synergy
    return;
  }
  P.hp -= dmg*(P.shieldDR||1)*(P.armor||1); P.inv = 0.8;
  shake = Math.max(shake,10); hitFlash = 1; hitstop=Math.max(hitstop,0.04);
  sfx.hurt(); burst(P.x,P.y,'#e54d4d',12,200);
  if(navigator.vibrate) navigator.vibrate(60);
  if(src){
    const a=Math.atan2(P.y-src.y,P.x-src.x);
    P.x = clamp(P.x+Math.cos(a)*30, WALL+P.r, WORLD.w-WALL-P.r);
    P.y = clamp(P.y+Math.sin(a)*30, WALL+P.r, WORLD.h-WALL-P.r);
  }
  if(P.hp<=0){
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
  const drawImg = (tint && tintedSprite(name,tint)) || img;
  cx.drawImage(drawImg, -size/2, -size/2, size, size);
  if(hitT>0){ cx.globalAlpha=Math.min(1,hitT/0.12); cx.drawImage(SPW[name], -size/2, -size/2, size, size); cx.globalAlpha=1; }
  cx.restore();
}

function render(){
  cx.save();
  let sx=0, sy=0;
  if(shake>0){ sx=rand(-shake,shake); sy=rand(-shake,shake); cx.translate(sx,sy); }
  cx.scale(zoom, zoom);
  cx.translate(-camera.x, -camera.y);

  const vw=W/zoom, vh=H/zoom;
  const vx0=camera.x, vy0=camera.y, vx1=vx0+vw, vy1=vy0+vh;

  // --- ground: outside-world void ---
  cx.fillStyle=curTheme.void;
  cx.fillRect(vx0-40, vy0-40, vw+80, vh+80);

  // --- grass field (checkerboard tiles, only visible region) ---
  const gx0=Math.max(0,Math.floor(vx0/TILE)*TILE), gx1=Math.min(WORLD.w,vx1);
  const gy0=Math.max(0,Math.floor(vy0/TILE)*TILE), gy1=Math.min(WORLD.h,vy1);
  for(let gy=gy0; gy<gy1; gy+=TILE){
    for(let gx=gx0; gx<gx1; gx+=TILE){
      const odd=((gx/TILE)+(gy/TILE))&1;
      cx.fillStyle = odd ? curTheme.tile1 : curTheme.tile2;
      cx.fillRect(gx, gy, TILE, TILE);
    }
  }
  // subtle grass tufts (deterministic per tile)
  cx.fillStyle=curTheme.tuft;
  for(let gy=gy0; gy<gy1; gy+=TILE){
    for(let gx=gx0; gx<gx1; gx+=TILE){
      const h=((gx*31+gy*17)%97)/97;
      if(h<0.3){ cx.fillRect((gx+ (gx>>3)%60)+10, (gy+(gy>>2)%60)+12, 3, 7); }
    }
  }

  // --- fence border (wooden wall) ---
  drawBorder(vx0,vy0,vx1,vy1);

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

  // --- gems / pickups ---
  for(const gm of gems){
    if(gm.x<vx0-40||gm.x>vx1+40||gm.y<vy0-40||gm.y>vy1+40) continue;
    const bob=Math.sin(gm.t*5)*3;
    const orb = ORB[gm.tier] || ORB[1];
    const name = gm.heart?'heart':(gm.coin?'coin':orb.spr);
    const psz = gm.heart?32 : (gm.coin?32 : orb.sz);
    drawSprite(name, gm.x, gm.y+bob, psz, 0,0,0,false);
  }

  // --- player bullets: bright gold with a white halo = YOURS ---
  const bcore = P.railgun ? '#5fe6ff' : '#ffd21f';      // evolved Railgun shots glow cyan
  const bhi   = P.railgun ? '#dafcff' : '#fff6bf';
  for(const b of bullets){
    if(b.x<vx0-20||b.x>vx1+20||b.y<vy0-20||b.y>vy1+20) continue;
    cx.fillStyle='#fff'; cx.beginPath(); cx.arc(b.x,b.y,b.r+2,0,TAU); cx.fill();        // white rim
    cx.fillStyle=bcore; cx.beginPath(); cx.arc(b.x,b.y,b.r,0,TAU); cx.fill();           // core
    cx.fillStyle=bhi; cx.beginPath(); cx.arc(b.x-b.r*0.3,b.y-b.r*0.3,b.r*0.4,0,TAU); cx.fill(); // highlight
  }

  // --- orbs ---
  if(P.orbs>0 && state!==ST.MENU){
    for(let i=0;i<P.orbs;i++){
      const a=P.orbA+i*(TAU/P.orbs);
      const ox=P.x+Math.cos(a)*58, oy=P.y+Math.sin(a)*58;
      cx.fillStyle='#9fe0ff'; cx.beginPath(); cx.arc(ox,oy,9,0,TAU); cx.fill();
      cx.strokeStyle=OUT; cx.lineWidth=2.5; cx.stroke();
    }
  }

  // --- enemies (sorted by y for depth) ---
  const vis = enemies.filter(e=> e.x>vx0-60&&e.x<vx1+60&&e.y>vy0-60&&e.y<vy1+60).sort((a,b)=>a.y-b.y);
  for(const e of vis){
    // shadow
    cx.fillStyle='rgba(40,60,25,0.28)';
    cx.beginPath(); cx.ellipse(e.x, e.y+e.r*0.85, e.r*0.8, e.r*0.32, 0,0,TAU); cx.fill();
    if(e.dst==='wind'){   // charge-dash wind-up telegraph line
      cx.globalAlpha=0.45; cx.strokeStyle='#ff5a5a'; cx.lineWidth=4; cx.setLineDash([10,8]);
      cx.beginPath(); cx.moveTo(e.x,e.y); cx.lineTo(e.x+Math.cos(e.da)*150, e.y+Math.sin(e.da)*150); cx.stroke();
      cx.setLineDash([]); cx.globalAlpha=1;
    }
    if(e.isBoss && e.mst==='wind'){   // boss attack wind-up: pulsing charge ring in the move's color
      const pulse=0.5+0.5*Math.sin(e.t*26), col=e.tellCol||'#fff';
      cx.globalAlpha=0.35+0.4*pulse; cx.strokeStyle=col; cx.lineWidth=4+3*pulse; cx.setLineDash([8,7]);
      cx.beginPath(); cx.arc(e.x,e.y,e.r+14+pulse*8,0,TAU); cx.stroke();
      cx.setLineDash([]); cx.globalAlpha=1;
    }
    const wob = e.isBoss ? Math.sin(e.t*2)*0.06 : Math.sin(e.t*6)*0.12;
    if(e.cut && cut){ cx.globalAlpha = cut.alpha; }
    drawSprite(e.spr, e.x, e.y, e.r*2.5*(e.deathScale||1), wob, e.sq, e.hitT, e.face===-1, curTheme.tint);
    if(e.cut){ cx.globalAlpha = 1; }
    if(e.frz>0){ cx.globalAlpha=0.4; cx.fillStyle='#bfe6ff'; cx.beginPath(); cx.arc(e.x,e.y,e.r*1.05,0,TAU); cx.fill(); cx.globalAlpha=1; }
    if(e.iv>0){ cx.strokeStyle='#d8b46a'; cx.lineWidth=4; cx.globalAlpha=0.85; cx.beginPath(); cx.arc(e.x,e.y,e.r+6,0,TAU); cx.stroke(); cx.globalAlpha=1; }
    if(e.hp<e.maxHp){
      const w=e.r*1.9;
      cx.fillStyle='rgba(0,0,0,0.45)'; cx.fillRect(e.x-w/2,e.y-e.r-12,w,5);
      cx.fillStyle=e.isBoss?'#e54d4d':'#7ed957';
      cx.fillRect(e.x-w/2,e.y-e.r-12,w*Math.max(0,e.hp/e.maxHp),5);
    }
    if(e.isBoss){
      cx.font='900 13px sans-serif'; cx.fillStyle='#fff'; cx.textAlign='center';
      cx.strokeStyle=OUT; cx.lineWidth=3; cx.strokeText(e.name, e.x, e.y-e.r-22); cx.fillText(e.name, e.x, e.y-e.r-22);
    }
  }

  // --- enemy bullets: thick dark rim + dark core = HOSTILE ---
  for(const b of ebullets){
    if(b.x<vx0-30||b.x>vx1+30||b.y<vy0-30||b.y>vy1+30) continue;
    const bc=b.color||'#e54d4d';
    cx.globalAlpha=0.3; cx.fillStyle=bc; cx.beginPath(); cx.arc(b.x,b.y,b.r*1.8,0,TAU); cx.fill(); cx.globalAlpha=1; // colored glow = shooter's tint
    cx.fillStyle=bc; cx.beginPath(); cx.arc(b.x,b.y,b.r,0,TAU); cx.fill();
    cx.lineWidth=3.2; cx.strokeStyle=OUT; cx.stroke();                                                            // dark rim = hostile
    cx.fillStyle='rgba(255,255,255,0.55)'; cx.beginPath(); cx.arc(b.x-b.r*0.3,b.y-b.r*0.3,b.r*0.34,0,TAU); cx.fill(); // glossy highlight
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
      drawSprite('player', P.x, P.y, P.r*2.6, bob, 0, 0, flip);
    }
    // Phoenix burn aura
    if(P.burnAura>0){
      cx.globalAlpha=0.12+0.05*Math.sin(elapsed*8); cx.fillStyle='#ff7a3a';
      cx.beginPath(); cx.arc(P.x,P.y,80,0,TAU); cx.fill(); cx.globalAlpha=1;
    }
    // Aegis shield bubble (one ring per remaining charge)
    if(P.shield>0){
      for(let s=0;s<P.shield;s++){
        cx.globalAlpha=0.5-s*0.12; cx.strokeStyle=P.aegisEvo?'#aee4ff':'#7ecbff'; cx.lineWidth=3;
        cx.beginPath(); cx.arc(P.x,P.y,P.r+12+s*5,0,TAU); cx.stroke();
      }
      cx.globalAlpha=1;
    }
  }

  // --- particles ---
  for(const p of parts){
    const a = Math.max(0, p.life/p.max);
    if(p.ring){ cx.globalAlpha=a*0.6; cx.strokeStyle=p.color; cx.lineWidth=(p.lw||5)*a+1; cx.beginPath(); cx.arc(p.x,p.y,p.r,0,TAU); cx.stroke(); continue; }
    cx.globalAlpha = a; cx.fillStyle = p.color;            // round sparks that shrink as they fade
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

  // joystick (screen space)
  if(joy.active && state===ST.PLAY){
    cx.globalAlpha=0.3; cx.strokeStyle='#fff'; cx.lineWidth=3;
    cx.beginPath(); cx.arc(joy.ox,joy.oy,58,0,TAU); cx.stroke();
    cx.fillStyle='#4aa3df';
    cx.beginPath(); cx.arc(joy.ox+joy.dx*58, joy.oy+joy.dy*58, 22,0,TAU); cx.fill();
    cx.globalAlpha=1;
  }

  // minimap (screen space)
  if(state!==ST.MENU) drawMinimap();

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
  // bright-red striped (dashed) border, animated
  cx.save();
  cx.lineWidth=7; cx.setLineDash([24,16]); cx.lineDashOffset=-elapsed*60;
  cx.strokeStyle='#ff2a2a'; cx.strokeRect(a.x, a.y, a.w, a.h);
  cx.setLineDash([]); cx.lineWidth=2; cx.strokeStyle='rgba(255,90,90,0.6)'; cx.strokeRect(a.x, a.y, a.w, a.h);
  cx.restore();
}

function renderZones(){
  for(const z of zones){
    if(z.t<z.tele){                       // telegraph: pulsing dashed ring + filling
      const k=z.t/z.tele;
      cx.globalAlpha=0.7+0.3*Math.sin(z.t*22);
      cx.strokeStyle=z.col; cx.lineWidth=5; cx.setLineDash([9,8]);
      cx.beginPath(); cx.arc(z.x,z.y,z.r,0,TAU); cx.stroke(); cx.setLineDash([]);
      cx.globalAlpha=0.30; cx.fillStyle=z.col; cx.beginPath(); cx.arc(z.x,z.y,z.r*k,0,TAU); cx.fill();
    } else {                              // active: fades over its life
      const k=Math.max(0,1-(z.t-z.tele)/z.life);
      cx.globalAlpha=0.45*k+0.14; cx.fillStyle=z.col; cx.beginPath(); cx.arc(z.x,z.y,z.r,0,TAU); cx.fill();
      cx.globalAlpha=0.85*k; cx.strokeStyle=z.col; cx.lineWidth=5; cx.beginPath(); cx.arc(z.x,z.y,z.r,0,TAU); cx.stroke();
    }
  }
  cx.globalAlpha=1;
}

function drawMinimap(){
  // mobile keeps the compact map; PC scales it up and stays responsive to window size
  const ms = IS_TOUCH ? 104 : Math.round(clamp(Math.min(W,H)*0.2, 150, 240));
  const pad = IS_TOUCH ? 12 : 18;
  const mx=pad, my=H-ms-pad;
  cx.globalAlpha=0.9;
  cx.fillStyle='#3a2d22'; cx.fillRect(mx-3,my-3,ms+6,ms+6);
  cx.fillStyle='#6fae3d'; cx.fillRect(mx,my,ms,ms);
  const sxk=ms/WORLD.w, syk=ms/WORLD.h;
  cx.fillStyle='#e54d4d';
  for(const e of enemies){ cx.fillRect(mx+e.x*sxk-1, my+e.y*syk-1, e.isBoss?4:2, e.isBoss?4:2); }
  cx.fillStyle='#fff'; cx.fillRect(mx+P.x*sxk-2, my+P.y*syk-2, 4,4);
  cx.strokeStyle='#fff'; cx.lineWidth=2; cx.strokeRect(mx+camera.x*sxk, my+camera.y*syk, (W/zoom)*sxk, (H/zoom)*syk);
  cx.globalAlpha=1;
}

// ============ MAIN LOOP ============
function loop(t){
  requestAnimationFrame(loop);
  let dt = Math.min(0.033, (t-tPrev)/1000 || 0.016);
  tPrev = t;
  if(hitstop>0){ hitstop-=dt; dt=0; }
  if(state===ST.PLAY) update(dt);
  else if(state===ST.MENU) menuUpdate(dt);
  else if(state===ST.CUTSCENE) cutsceneUpdate(dt);
  render();
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
// populate the main menu (character + saved gold + best)
$('charimg').src = SP['player'].toDataURL();
$('goldicon').src = SP['coin'].toDataURL();
$('goldtxt').textContent = gold;
$('besttxt').textContent = +(localStorage.getItem('brainrot_best')||0);
// ---- music mute (SFX always on); shared by the menu + pause buttons ----
function currentTrack(){
  if(state===ST.MENU) return 'menu';
  if(boss) return 'boss'+(((Math.floor(wave/5)-1)%3+3)%3);
  return 'game';
}
function refreshMute(){
  $('mutebtn').textContent  = muted ? '🔇' : '🎵';
  $('pausemute').textContent = muted ? '🔇 Music Off' : '🎵 Music On';
}
function setMusicMuted(v){
  initAudio();
  muted = v; localStorage.setItem('br_muted', muted?'1':'0');
  if(muted){ stopMusic(); }
  else { if(AC) AC.resume(); playMusic(currentTrack()); }
  refreshMute();
}
$('mutebtn').addEventListener('click', ()=>setMusicMuted(!muted));
$('pausemute').addEventListener('click', ()=>setMusicMuted(!muted));
refreshMute();

// ---- pause / resume / quit ----
function pauseGame(){ if(state!==ST.PLAY) return; state=ST.PAUSE; $('pause').classList.remove('hidden'); }
function resumeGame(){ if(state!==ST.PAUSE) return; state=ST.PLAY; $('pause').classList.add('hidden'); }
function togglePause(){ if(state===ST.PLAY) pauseGame(); else if(state===ST.PAUSE) resumeGame(); }
function quitToMenu(){
  state=ST.MENU; arena=null; bossPending=0; boss=null;
  bullets=[]; ebullets=[]; enemies=[]; gems=[]; parts=[]; texts=[]; zones=[]; holes=[];
  resetPlayer(); computeCamera();
  $('pause').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('dashbtn').classList.add('hidden');
  $('zoomctl').classList.add('hidden');
  $('bossbar').classList.add('hidden');
  $('menu').classList.remove('hidden');
  $('goldtxt').textContent = gold;
  $('besttxt').textContent = +(localStorage.getItem('brainrot_best')||0);
  playMusic(muted ? null : 'menu');
}
$('pausebtn').addEventListener('click', pauseGame);
$('resumebtn').addEventListener('click', resumeGame);
$('quitbtn').addEventListener('click', quitToMenu);
setInterval(()=>{
  if(state===ST.MENU && enemies.length<6){ spawnEnemy(); const e=enemies[enemies.length-1]; e.sp=0; }
}, 700);

requestAnimationFrame(loop);

$('startbtn').addEventListener('click', ()=>startGame(selWorld));
$('wprev').addEventListener('click', ()=>{ if(selWorld>0){ selWorld--; refreshWorldSel(); sfx.pick(); } });
$('wnext').addEventListener('click', ()=>{ if(selWorld<unlockedMax){ selWorld++; refreshWorldSel(); sfx.pick(); } });
refreshWorldSel();
$('retrybtn').addEventListener('click', startGame);
