'use strict';
// ============ GAME STATE ============
let shake = 0, hitFlash = 0, hitstop = 0, tPrev = 0, elapsed = 0;

const P = {}; // player
let bullets=[], ebullets=[], enemies=[], gems=[], parts=[], texts=[];
let wave=1, score=0, kills=0, spawnTimer=0, waveEnemiesLeft=0, betweenWaves=false, boss=null;
let combo=0, comboT=0;

// ---- enemy archetypes: the Italian Brainrot bestiary (ordered easy -> hard) ----
const FOES = [
  // Tier I — fodder
  { spr:'pigeon',   name:'Spijuniro',     hp:3,  sp:80, r:15, xp:1, score:10 },
  { spr:'chimp',    name:'Chimpanzini',   hp:3,  sp:86, r:16, xp:1, score:12 },
  { spr:'penguin',  name:'Penguino',      hp:4,  sp:60, r:16, xp:1, score:12 },
  { spr:'flamingo', name:'Flamingulli',   hp:3,  sp:82, r:16, xp:1, score:12 },
  { spr:'duck',     name:'Quacodillo',    hp:3,  sp:72, r:15, xp:1, score:14, death:{type:'ring',n:4} },
  // Tier II — infantry
  { spr:'cappuccino',name:'Cappuccino Assassino', hp:5, sp:90, r:15, xp:2, score:18, shoot:{type:'aim',n:1,cd:2.6,spd:175} },
  { spr:'ballerina', name:'Ballerina Cappuccina', hp:5, sp:64, r:16, xp:2, score:18, shoot:{type:'ring',n:6,cd:3.2,spd:120,col:'#c98a4f'} },
  { spr:'candypig',  name:'Svinino',       hp:6,  sp:70, r:16, xp:2, score:18, shoot:{type:'aim',n:1,cd:2.8,spd:130,col:'#f06fa8'} },
  { spr:'beaver',    name:'Castori Gangsteri', hp:7, sp:62, r:17, xp:2, score:22, shoot:{type:'aim',n:3,cd:2.4,spd:175,col:'#caa12f'} },
  { spr:'lirili',    name:'Lirili Larila', hp:13, sp:40, r:22, xp:3, score:30, shoot:{type:'aim',n:3,cd:3.0,spd:130,col:'#6b9233'} },
  { spr:'patapim',   name:'Brr Brr Patapim', hp:12, sp:44, r:21, xp:3, score:28, shoot:{type:'aim',n:2,cd:3.2,spd:120,col:'#9c6b3f'} },
  // Tier III — casters
  { spr:'pinecroc',  name:'Crocodillo Ananasinno', hp:8, sp:66, r:19, xp:3, score:28, shoot:{type:'aim',n:3,cd:2.8,spd:150,col:'#e0b400'} },
  { spr:'goose',     name:'Bombombini',    hp:8,  sp:74, r:18, xp:3, score:30, shoot:{type:'aim',n:3,cd:2.6,spd:150,col:'#e58a3a'} },
  { spr:'octopus',   name:'Blueberrinni',  hp:9,  sp:50, r:19, xp:3, score:30, shoot:{type:'ring',n:8,cd:3.0,spd:120,col:'#5b6cf0'} },
  { spr:'jelly',     name:'Graipussi Medussi', hp:8, sp:46, r:19, xp:3, score:30, shoot:{type:'ring',n:6,cd:2.8,spd:95,col:'#d36fb0'} },
  { spr:'espresso',  name:'Espressona Signora', hp:9, sp:58, r:17, xp:3, score:32, shoot:{type:'ring',n:5,cd:2.2,spd:130,col:'#5b3a22'} },
  { spr:'orangutan', name:'Orangutini',    hp:10, sp:54, r:20, xp:4, score:34, shoot:{type:'aim',n:1,cd:2.4,spd:140,col:'#e0b400'} },
  // Tier IV — heavies
  { spr:'rhino',     name:'Rhino Toasterino', hp:18, sp:42, r:23, xp:4, score:45, shoot:{type:'aim',n:2,cd:3.0,spd:140,col:'#caa12f'} },
  { spr:'camel',     name:'Frigo Camelo',  hp:20, sp:38, r:24, xp:5, score:50, shoot:{type:'aim',n:5,cd:3.4,spd:120,col:'#9fd0ff'} },
  { spr:'hippo',     name:'Il Cacto Hipopotamo', hp:22, sp:34, r:25, xp:5, score:55, shoot:{type:'ring',n:8,cd:3.4,spd:120,col:'#6b9233'} },
  { spr:'turtle',    name:'Torrtuginni',   hp:26, sp:30, r:24, xp:5, score:55 },
  // Tier V — elites
  { spr:'panda',     name:'Pandaccini',    hp:14, sp:58, r:20, xp:4, score:40 },
  { spr:'tiger',     name:'Tigrrullini',   hp:14, sp:76, r:20, xp:4, score:44, shoot:{type:'aim',n:5,cd:3.0,spd:155,col:'#e54d4d'} },
  { spr:'capy',      name:'Capybarelli',   hp:16, sp:46, r:21, xp:5, score:48 },
];
const BOSSES = [
  { spr:'tralalero', name:'TRALALERO TRALALA',        hp:150, r:54, pattern:'spiral' },
  { spr:'crocodilo', name:'BOMBARDIRO CROCODILO',     hp:230, r:56, pattern:'rings'  },
  { spr:'sahur',     name:'TUNG TUNG TUNG SAHUR',     hp:300, r:58, pattern:'chaos'  },
  { spr:'vaca',      name:'LA VACA SATURNO',          hp:380, r:58, pattern:'rings'  },
  { spr:'gorillo',   name:'GORILLO WATERMELLONDRILLO',hp:460, r:62, pattern:'chaos'  },
  { spr:'trippi',    name:'TRIPPI TROPPI',            hp:560, r:56, pattern:'spiral' },
];

// ---- upgrade pool (icon = sprite used as little asset) ----
const UPGRADES = [
  { id:'dmg',    name:'Power Up',     desc:'+30% damage.',                  icon:'coin',     f:()=>P.dmg*=1.3 },
  { id:'rate',   name:'Quick Hands',  desc:'+25% fire rate.',               icon:'gem',      f:()=>P.fireRate*=0.78 },
  { id:'speed',  name:'Fleet Foot',   desc:'+18% move speed.',              icon:'heart',    f:()=>P.speed*=1.18 },
  { id:'multi',  name:'Split Shot',   desc:'+1 projectile.',                icon:'gembig',   f:()=>P.shots+=1 },
  { id:'pierce', name:'Drill Rounds', desc:'bullets pierce +1 enemy.',      icon:'crocodilo',f:()=>P.pierce+=1 },
  { id:'range',  name:'Long Shot',    desc:'+25% shot range.',              icon:'gembig',   f:()=>P.range*=1.25 },
  { id:'hp',     name:'Big Heart',    desc:'+30 max HP and full heal.',     icon:'heart',    f:()=>{ P.maxHp+=30; P.hp=P.maxHp; } },
  { id:'magnet', name:'Magnet',       desc:'+60% pickup range.',            icon:'gem',      f:()=>P.magnet*=1.6 },
  { id:'crit',   name:'Sharpshooter', desc:'+15% crit (crits hit 3x).',     icon:'coin',     f:()=>P.crit+=0.15 },
  { id:'dash',   name:'Quick Dash',   desc:'dash recharges 30% faster.',    icon:'tralalero',f:()=>P.dashMax*=0.7 },
  { id:'orbit',  name:'Support Orb',  desc:'+1 orbiting orb, damages on touch.', icon:'gembig', f:()=>P.orbs+=1, rare:true },
  { id:'nova',   name:'Skibidi Blast', desc:'every 5s: blast nearby enemies.',icon:'gembig', f:()=>P.nova=true, once:true, rare:true },
  { id:'vamp',   name:'Lifesteal',    desc:'heal 1 HP per kill.',           icon:'heart',    f:()=>P.vamp+=1, rare:true },
  { id:'slow',   name:'Frost Field',  desc:'enemy bullets 20% slower.',     icon:'gem',      f:()=>P.bslow*=0.8, rare:true },
];

function resetPlayer(){
  Object.assign(P, {
    x:WORLD.w/2, y:WORLD.h/2, r:18, hp:100, maxHp:100, speed:200,
    dmg:1, fireRate:0.32, fireCd:0, shots:1, pierce:0, range:330,
    magnet:90, crit:0.05, orbs:0, orbA:0, nova:false, novaCd:5,
    vamp:0, bslow:1, lv:1, xp:0, xpNext:5, inv:0, taken:{},
    face:0, walk:0, dashCd:0, dashMax:2.2, dashT:0, dvx:0, dvy:0
  });
}

function startGame(){
  initAudio();
  resetPlayer();
  bullets=[]; ebullets=[]; enemies=[]; gems=[]; parts=[]; texts=[];
  wave=1; score=0; kills=0; elapsed=0; boss=null; combo=0; comboT=0;
  state=ST.PLAY;
  $('menu').classList.add('hidden');
  $('gameover').classList.add('hidden');
  $('hud').classList.remove('hidden');
  $('zoomctl').classList.remove('hidden');
  if(IS_TOUCH) $('dashbtn').classList.remove('hidden');   // mobile-only on-screen dash
  startWave();
}

function startWave(){
  betweenWaves=false;
  $('wavetag').textContent = 'WAVE '+wave;
  if(wave % 5 === 0){ spawnBoss(); waveEnemiesLeft = 0; }
  else { waveEnemiesLeft = 7 + wave*3; spawnTimer = 0; }
  bigText(wave%5===0 ? 'BOSS WAVE' : 'WAVE '+wave, wave%5===0?'#e54d4d':'#ffe08a');
}

function ringPos(){ // spawn point on a ring around player, clamped to world
  const a = rand(0,TAU), d = Math.max(W,H)*0.62 + 80;
  return { x: clamp(P.x+Math.cos(a)*d, WALL+30, WORLD.w-WALL-30),
           y: clamp(P.y+Math.sin(a)*d, WALL+30, WORLD.h-WALL-30) };
}

function spawnBoss(){
  const def = BOSSES[(Math.floor(wave/5)-1) % BOSSES.length];
  const mult = 1 + (wave-5)*0.22;
  const p = ringPos();
  boss = {
    spr:def.spr, name:def.name, pattern:def.pattern,
    x:p.x, y:p.y, r:def.r,
    hp:def.hp*mult, maxHp:def.hp*mult,
    t:0, phase:0, isBoss:true, sp:46, xp:0, score:500, hitT:0, sq:0
  };
  enemies.push(boss);
  sfx.boss();
  const bw=$('bosswarn'); bw.classList.remove('hidden');
  setTimeout(()=>bw.classList.add('hidden'), 1700);
}

function spawnEnemy(){
  const maxIdx = Math.min(FOES.length-1, Math.floor(wave/2));
  const def = FOES[Math.floor(Math.random()*(maxIdx+1))];
  const p = ringPos();
  const hpMult = 1 + (wave-1)*0.16;
  enemies.push({
    spr:def.spr, name:def.name, x:p.x, y:p.y, r:def.r,
    hp:def.hp*hpMult, maxHp:def.hp*hpMult,
    sp:def.sp*(1+wave*0.02), xp:def.xp, score:def.score, shoot:def.shoot, death:def.death,
    t:rand(0,TAU), wob:rand(2,4), shootCd:rand(1.5,4), isBoss:false, hitT:0, sq:0, face:1
  });
}

// ============ FX ============
function burst(x,y,color,n=10,spd=160){
  for(let i=0;i<n;i++){
    const a=rand(0,TAU), s=rand(spd*0.3,spd);
    parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(0.25,0.6),max:0.6,color,r:rand(2,5)});
  }
}
function floatText(x,y,str,color='#fff',size=14){
  texts.push({x,y,str,color,size,life:0.9,max:0.9,vy:-55});
}
function bigText(str,color){
  texts.push({x:P.x,y:P.y-90,str,color,size:34,life:1.6,max:1.6,vy:-12,big:true});
}

// ============ LEVEL UP ============
function gainXp(n){
  P.xp += n;
  while(P.xp >= P.xpNext){
    P.xp -= P.xpNext;
    P.lv++;
    P.xpNext = Math.floor(5 + P.lv*4 + P.lv*P.lv*0.6);
    openLevelUp();
  }
  $('leveltag').textContent = 'LV '+P.lv;
}

function openLevelUp(){
  state = ST.LEVELUP;
  sfx.level();
  const pool = UPGRADES.filter(u => !(u.once && P.taken[u.id]));
  const opts = []; const bag = pool.slice();
  while(opts.length<3 && bag.length){
    let i = Math.floor(Math.random()*bag.length);
    if(bag[i].rare && Math.random()<0.5){ const j=bag.findIndex(u=>!u.rare); if(j>=0) i=j; }
    opts.push(bag.splice(i,1)[0]);
  }
  const wrap = $('cards'); wrap.innerHTML='';
  opts.forEach(u=>{
    const d=document.createElement('button');
    d.className='card'+(u.rare?' rare':'');
    const ic = SP[u.icon] ? SP[u.icon].toDataURL() : '';
    d.innerHTML = `<img class="cicon" draggable="false" src="${ic}"><div class="cbody"><div class="cname">${u.name}${u.rare?' ★':''}</div><div class="cdesc">${u.desc}</div></div>`;
    d.onclick = ()=>{
      u.f(); P.taken[u.id]=true;
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
    P.x += mx*P.speed*dt; P.y += my*P.speed*dt;
  }
  P.x = clamp(P.x, WALL+P.r, WORLD.w-WALL-P.r);
  P.y = clamp(P.y, WALL+P.r, WORLD.h-WALL-P.r);
  if(P.inv>0) P.inv-=dt;
  if(P.dashCd>0){ P.dashCd-=dt; $('dashbtn').classList.toggle('cool', P.dashCd>0); }

  // camera follows, clamped to world (zoom-aware)
  computeCamera();

  // --- auto-fire at nearest enemy within range ---
  P.fireCd -= dt;
  if(P.fireCd<=0 && enemies.length){
    let best=null, bd=Infinity;
    for(const e of enemies){ const d=dist2(P.x,P.y,e.x,e.y); if(d<bd){bd=d;best=e;} }
    if(best && bd <= P.range*P.range){   // only shoot what's in range
      P.fireCd = P.fireRate;
      const base = Math.atan2(best.y-P.y, best.x-P.x);
      const spread = 0.16;
      for(let i=0;i<P.shots;i++){
        const a = base + (i-(P.shots-1)/2)*spread;
        bullets.push({x:P.x,y:P.y,vx:Math.cos(a)*560,vy:Math.sin(a)*560,r:6,pierce:P.pierce,hit:new Set(),dist:P.range});
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
        if(dist2(ox,oy,e.x,e.y) < (e.r+10)*(e.r+10)){
          e.hp -= 9*dt*P.dmg; e.hitT=Math.max(e.hitT,0.06);
        }
      }
    }
  }

  // --- nova ---
  if(P.nova){
    P.novaCd -= dt;
    if(P.novaCd<=0){
      P.novaCd = 5; shake = Math.max(shake,8);
      burst(P.x,P.y,'#9fd0ff',26,400); sfx.boss();
      for(let k=0;k<3;k++) parts.push({x:P.x,y:P.y,vx:0,vy:0,life:0.4,max:0.4,color:'#cfeaff',r:200,ring:true});
      for(const e of enemies){
        if(dist2(P.x,P.y,e.x,e.y) < 190*190){ damageEnemy(e,28*P.dmg,P.x,P.y,false); }
      }
      ebullets = ebullets.filter(b => dist2(P.x,P.y,b.x,b.y) > 190*190);
    }
  }

  // --- player bullets ---
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    b.dist -= Math.hypot(b.vx,b.vy)*dt;     // range limit
    b.x+=b.vx*dt; b.y+=b.vy*dt;
    if(b.dist<=0){ burst(b.x,b.y,'#fff6bf',3,55); bullets.splice(i,1); continue; }
    if(b.x<-20||b.x>WORLD.w+20||b.y<-20||b.y>WORLD.h+20){ bullets.splice(i,1); continue; }
    for(const e of enemies){
      if(b.hit.has(e)) continue;
      if(dist2(b.x,b.y,e.x,e.y) < (e.r+b.r)*(e.r+b.r)){
        const isCrit = Math.random()<P.crit;
        const dmg = P.dmg * (isCrit?3:1);
        b.hit.add(e);
        burst(b.x,b.y,isCrit?'#ffd23a':'#ff9f3a',4,90);
        damageEnemy(e,dmg,b.x,b.y,isCrit);
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

    if(e.isBoss){
      updateBoss(e,dt);
    } else {
      const a = Math.atan2(P.y-e.y, P.x-e.x) + Math.sin(e.t*e.wob)*0.4;
      e.x += Math.cos(a)*e.sp*dt;
      e.y += Math.sin(a)*e.sp*dt;
      e.face = Math.cos(a)>=0 ? 1 : -1;
      e.x = clamp(e.x, WALL, WORLD.w-WALL); e.y = clamp(e.y, WALL, WORLD.h-WALL);
      if(wave>=3 && e.shoot){
        e.shootCd -= dt;
        if(e.shootCd<=0){
          e.shootCd = e.shoot.cd || rand(2.5,4.5);
          const spd = e.shoot.spd||140, col = e.shoot.col||'#e23b3b';
          if(e.shoot.type==='ring'){
            const n=e.shoot.n||8, off=rand(0,TAU);
            for(let k=0;k<n;k++) fireEB(e.x,e.y, off+k*TAU/n, spd, col);
          } else { // aimed fan
            const n=e.shoot.n||1, aim=Math.atan2(P.y-e.y,P.x-e.x);
            for(let k=0;k<n;k++) fireEB(e.x,e.y, aim+(k-(n-1)/2)*0.18, spd, col);
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
      if(e.isBoss){
        boss=null;
        bigText('BOSS DOWN','#4aa3df');
        for(let g=0; g<14; g++) gems.push({x:e.x+rand(-40,40),y:e.y+rand(-40,40),v:3,t:rand(0,6)});
        for(let g=0; g<8; g++) gems.push({x:e.x+rand(-50,50),y:e.y+rand(-50,50),coin:true,t:rand(0,6)});
        ebullets=[];
      } else {
        if(e.death && e.death.type==='ring'){ const n=e.death.n||4; for(let k=0;k<n;k++) fireEB(e.x,e.y,k*TAU/n,150,'#e58a3a'); }
        for(let g=0; g<e.xp; g++) gems.push({x:e.x+rand(-10,10),y:e.y+rand(-10,10),v:1,t:rand(0,6)});
        if(Math.random()<0.12) gems.push({x:e.x,y:e.y,coin:true,t:0});
        if(Math.random()<0.025) gems.push({x:e.x,y:e.y,heart:true,t:0});
      }
      $('scoretag').textContent = '★ '+score;
    }
  }

  // wave cleared?
  if(!betweenWaves && waveEnemiesLeft===0 && enemies.length===0){
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
    const d = dist2(g.x,g.y,P.x,P.y);
    if(d < P.magnet*P.magnet){
      const dd=Math.sqrt(d)||1;
      const pull = 460*(1 - dd/P.magnet) + 130;
      g.x += (P.x-g.x)/dd*pull*dt; g.y += (P.y-g.y)/dd*pull*dt;
    }
    if(d < (P.r+12)*(P.r+12)){
      gems.splice(i,1);
      if(g.heart){ P.hp=Math.min(P.maxHp,P.hp+25); floatText(P.x,P.y-24,'+25','#e8556a',16); burst(P.x,P.y,'#ff97a6',8,120); sfx.coin(); }
      else if(g.coin){ const v=Math.round(20*comboMult()); score+=v; $('scoretag').textContent='★ '+score; floatText(g.x,g.y,'+'+v,'#f5c542',13); sfx.coin(); }
      else { gainXp(g.v); sfx.gem(Math.min(combo,8)); }
    }
  }

  // --- particles & texts ---
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];
    if(p.ring){ p.r+=600*dt; p.life-=dt; if(p.life<=0) parts.splice(i,1); continue; }
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.92; p.vy*=0.92; p.life-=dt;
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
}

function damageEnemy(e,dmg,fx,fy,crit){
  e.hp -= dmg; e.hitT=0.12; e.sq=1;
  sfx.hit();
  floatText(e.x,e.y-e.r-4, (crit?'':'')+Math.round(dmg), crit?'#ffd23a':'#fff', crit?18:13);
  if(crit) floatText(e.x,e.y-e.r-20,'CRIT','#ffd23a',15);
}

function fireEB(x,y,a,sp,color){
  ebullets.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:7,color});
}

function updateBoss(e,dt){
  const tx = clamp(P.x + Math.sin(e.t*0.5)*260, WALL+e.r, WORLD.w-WALL-e.r);
  const ty = clamp(P.y - 220 + Math.cos(e.t*0.4)*60, WALL+e.r, WORLD.h-WALL-e.r);
  e.x += (tx-e.x)*0.9*dt; e.y += (ty-e.y)*0.9*dt;
  e.atk = (e.atk||0)+dt;
  const rage = e.hp/e.maxHp < 0.4 ? 0.6 : 1;
  if(e.pattern==='spiral'){
    if(e.atk > 0.13*rage){ e.atk=0; e.phase+=0.42;
      fireEB(e.x,e.y,e.phase,160,'#e54d4d'); fireEB(e.x,e.y,e.phase+Math.PI,160,'#e54d4d'); }
  } else if(e.pattern==='rings'){
    if(e.atk > 1.6*rage){ e.atk=0; const n=16, off=rand(0,TAU);
      for(let i=0;i<n;i++) fireEB(e.x,e.y,off+i*TAU/n,140,'#4aa3df'); }
  } else {
    if(e.atk > 0.5*rage){ e.atk=0; e.phase+=0.9;
      const aim=Math.atan2(P.y-e.y,P.x-e.x);
      for(let i=-2;i<=2;i++) fireEB(e.x,e.y,aim+i*0.22,180,'#e23b3b');
      fireEB(e.x,e.y,e.phase,130,'#b14de5'); fireEB(e.x,e.y,-e.phase,130,'#b14de5'); }
  }
}

function hurtPlayer(dmg, src){
  if(P.inv>0 || P.dashT>0) return;
  P.hp -= dmg; P.inv = 0.8;
  shake = Math.max(shake,10); hitFlash = 1; hitstop=Math.max(hitstop,0.04);
  sfx.hurt(); burst(P.x,P.y,'#e54d4d',12,200);
  if(navigator.vibrate) navigator.vibrate(60);
  if(src){
    const a=Math.atan2(P.y-src.y,P.x-src.x);
    P.x = clamp(P.x+Math.cos(a)*30, WALL+P.r, WORLD.w-WALL-P.r);
    P.y = clamp(P.y+Math.sin(a)*30, WALL+P.r, WORLD.h-WALL-P.r);
  }
  if(P.hp<=0) gameOver();
}

// ============ RENDER ============
const TILE = 80;
function drawSprite(name, x, y, size, rot, sq, hitT, flip){
  const img = SP[name]; if(!img) return;
  cx.save();
  cx.translate(x,y);
  if(rot) cx.rotate(rot);
  if(flip) cx.scale(-1,1);
  // squash & stretch
  let sxk=1, syk=1;
  if(sq>0){ const k=Math.sin(sq*Math.PI)*0.22; sxk=1+k; syk=1-k; }
  cx.scale(sxk,syk);
  cx.drawImage(img, -size/2, -size/2, size, size);
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
  cx.fillStyle='#5b7d33';
  cx.fillRect(vx0-40, vy0-40, vw+80, vh+80);

  // --- grass field (checkerboard tiles, only visible region) ---
  const gx0=Math.max(0,Math.floor(vx0/TILE)*TILE), gx1=Math.min(WORLD.w,vx1);
  const gy0=Math.max(0,Math.floor(vy0/TILE)*TILE), gy1=Math.min(WORLD.h,vy1);
  for(let gy=gy0; gy<gy1; gy+=TILE){
    for(let gx=gx0; gx<gx1; gx+=TILE){
      const odd=((gx/TILE)+(gy/TILE))&1;
      cx.fillStyle = odd ? '#86c64a' : '#7cbd43';
      cx.fillRect(gx, gy, TILE, TILE);
    }
  }
  // subtle grass tufts (deterministic per tile)
  cx.fillStyle='rgba(60,110,40,0.35)';
  for(let gy=gy0; gy<gy1; gy+=TILE){
    for(let gx=gx0; gx<gx1; gx+=TILE){
      const h=((gx*31+gy*17)%97)/97;
      if(h<0.3){ cx.fillRect((gx+ (gx>>3)%60)+10, (gy+(gy>>2)%60)+12, 3, 7); }
    }
  }

  // --- fence border (wooden wall) ---
  drawBorder(vx0,vy0,vx1,vy1);

  // --- gems / pickups ---
  for(const gm of gems){
    if(gm.x<vx0-40||gm.x>vx1+40||gm.y<vy0-40||gm.y>vy1+40) continue;
    const bob=Math.sin(gm.t*5)*3;
    const name = gm.heart?'heart':(gm.coin?'coin':(gm.v>=3?'gembig':'gem'));
    const psz = gm.v>=3 ? 40 : (gm.heart?32 : (gm.coin?32 : 31));
    drawSprite(name, gm.x, gm.y+bob, psz, 0,0,0,false);
  }

  // --- player bullets: bright gold with a white halo = YOURS ---
  for(const b of bullets){
    if(b.x<vx0-20||b.x>vx1+20||b.y<vy0-20||b.y>vy1+20) continue;
    cx.fillStyle='#fff'; cx.beginPath(); cx.arc(b.x,b.y,b.r+2,0,TAU); cx.fill();        // white rim
    cx.fillStyle='#ffd21f'; cx.beginPath(); cx.arc(b.x,b.y,b.r,0,TAU); cx.fill();        // gold core
    cx.fillStyle='#fff6bf'; cx.beginPath(); cx.arc(b.x-b.r*0.3,b.y-b.r*0.3,b.r*0.4,0,TAU); cx.fill(); // highlight
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
    const wob = e.isBoss ? Math.sin(e.t*2)*0.06 : Math.sin(e.t*6)*0.12;
    drawSprite(e.spr, e.x, e.y, e.r*2.5, wob, e.sq, e.hitT, e.face===-1);
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
    cx.fillStyle=b.color||'#e54d4d'; cx.beginPath(); cx.arc(b.x,b.y,b.r,0,TAU); cx.fill();
    cx.lineWidth=3.2; cx.strokeStyle=OUT; cx.stroke();
    cx.fillStyle='rgba(0,0,0,0.42)'; cx.beginPath(); cx.arc(b.x,b.y,b.r*0.42,0,TAU); cx.fill();
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
  }

  // --- particles ---
  for(const p of parts){
    if(p.ring){ cx.globalAlpha=Math.max(0,p.life/p.max)*0.5; cx.strokeStyle=p.color; cx.lineWidth=6; cx.beginPath(); cx.arc(p.x,p.y,p.r,0,TAU); cx.stroke(); continue; }
    cx.globalAlpha = p.life/p.max; cx.fillStyle = p.color;
    cx.fillRect(p.x-p.r/2, p.y-p.r/2, p.r, p.r);
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
}

function drawBorder(vx0,vy0,vx1,vy1){
  // dark band just inside the world edge + posts
  cx.fillStyle='#7a5230';
  if(vy0 < WALL) cx.fillRect(Math.max(0,vx0-40), 0, Math.min(WORLD.w,vx1)-Math.max(0,vx0-40)+40, WALL);
  if(vy1 > WORLD.h-WALL) cx.fillRect(Math.max(0,vx0-40), WORLD.h-WALL, Math.min(WORLD.w,vx1)-Math.max(0,vx0-40)+40, WALL);
  if(vx0 < WALL) cx.fillRect(0, Math.max(0,vy0-40), WALL, Math.min(WORLD.h,vy1)-Math.max(0,vy0-40)+40);
  if(vx1 > WORLD.w-WALL) cx.fillRect(WORLD.w-WALL, Math.max(0,vy0-40), WALL, Math.min(WORLD.h,vy1)-Math.max(0,vy0-40)+40);
  // fence posts/rail along inner edge
  cx.strokeStyle='#5a3a20'; cx.lineWidth=6;
  cx.fillStyle='#9a6b3d';
  const postEvery=80;
  if(vy0 < WALL+10){ for(let x=Math.max(WALL,Math.floor(vx0/postEvery)*postEvery); x<Math.min(WORLD.w-WALL,vx1); x+=postEvery){ post(x,WALL-6); } cx.beginPath(); cx.moveTo(Math.max(0,vx0),WALL-4); cx.lineTo(Math.min(WORLD.w,vx1),WALL-4); cx.stroke(); }
  if(vy1 > WORLD.h-WALL-10){ for(let x=Math.max(WALL,Math.floor(vx0/postEvery)*postEvery); x<Math.min(WORLD.w-WALL,vx1); x+=postEvery){ post(x,WORLD.h-WALL+6); } cx.beginPath(); cx.moveTo(Math.max(0,vx0),WORLD.h-WALL+4); cx.lineTo(Math.min(WORLD.w,vx1),WORLD.h-WALL+4); cx.stroke(); }
  if(vx0 < WALL+10){ for(let y=Math.max(WALL,Math.floor(vy0/postEvery)*postEvery); y<Math.min(WORLD.h-WALL,vy1); y+=postEvery){ post(WALL-6,y); } cx.beginPath(); cx.moveTo(WALL-4,Math.max(0,vy0)); cx.lineTo(WALL-4,Math.min(WORLD.h,vy1)); cx.stroke(); }
  if(vx1 > WORLD.w-WALL-10){ for(let y=Math.max(WALL,Math.floor(vy0/postEvery)*postEvery); y<Math.min(WORLD.h-WALL,vy1); y+=postEvery){ post(WORLD.w-WALL+6,y); } cx.beginPath(); cx.moveTo(WORLD.w-WALL+4,Math.max(0,vy0)); cx.lineTo(WORLD.w-WALL+4,Math.min(WORLD.h,vy1)); cx.stroke(); }
}
function post(x,y){ cx.fillStyle='#9a6b3d'; cx.fillRect(x-5,y-14,10,28); cx.strokeStyle='#5a3a20'; cx.lineWidth=2.5; cx.strokeRect(x-5,y-14,10,28); }

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
setInterval(()=>{
  if(state===ST.MENU && enemies.length<6){ spawnEnemy(); const e=enemies[enemies.length-1]; e.sp=0; }
}, 700);

requestAnimationFrame(loop);

$('startbtn').addEventListener('click', startGame);
$('retrybtn').addEventListener('click', startGame);
