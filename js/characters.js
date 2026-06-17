'use strict';
// ============ CHARACTERS: selection, drawing, hooks ============
// Loads before game.js. All draw functions render at (0,0) with ctx already translated.

// ---- gear visibility: hidden by default on any non-default character, can be forced back on ----
let gearForceVisible = localStorage.getItem('br_gear_force_visible')==='1';
function gearShouldShow(charId){ return (charId||'gianni')==='gianni' || gearForceVisible; }
function setGearForceVisible(v){ gearForceVisible=!!v; localStorage.setItem('br_gear_force_visible', gearForceVisible?'1':'0'); }

// ---- shared drawing helpers ----
function _stroke(ctx, size) {
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5, size*0.038);
  ctx.stroke();
}
function _fillR(ctx, size, col, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r||0);
  ctx.fillStyle=col; ctx.fill();
  ctx.strokeStyle='#2a1c10'; ctx.lineWidth=Math.max(1.5,size*0.038); ctx.stroke();
}
function _fillE(ctx, size, col, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI*2);
  ctx.fillStyle=col; ctx.fill();
  ctx.strokeStyle='#2a1c10'; ctx.lineWidth=Math.max(1.5,size*0.038); ctx.stroke();
}
// Humanoid Gianni-style base: two legs, torso, two arms, round head
function _humanBase(ctx, size, legCol, bodyCol, armCol, skinCol) {
  _fillR(ctx,size,legCol, -size*0.12, size*0.16, size*0.09, size*0.20, size*0.03);  // left leg
  _fillR(ctx,size,legCol,  size*0.03, size*0.16, size*0.09, size*0.20, size*0.03);  // right leg
  _fillR(ctx,size,bodyCol,-size*0.16,-size*0.08, size*0.32, size*0.28, size*0.10);  // torso
  _fillR(ctx,size,armCol, -size*0.23,-size*0.02, size*0.09, size*0.18, size*0.04);  // left arm
  _fillR(ctx,size,armCol,  size*0.14,-size*0.02, size*0.09, size*0.18, size*0.04);  // right arm
  _fillE(ctx,size,skinCol, 0,-size*0.24, size*0.16, size*0.15);  // head
}
function _stdHead(ctx, size, color) {
  _fillE(ctx, size, color, 0, -size*0.24, size*0.16, size*0.15);
}
function _stdBody(ctx, size, color, wFrac, hFrac, yFrac) {
  wFrac = wFrac===undefined ? 0.38 : wFrac;
  hFrac = hFrac===undefined ? 0.28 : hFrac;
  yFrac = yFrac===undefined ? 0.24 : yFrac;
  ctx.beginPath();
  ctx.ellipse(0, size*yFrac, size*wFrac/2, size*hFrac/2, 0, 0, Math.PI*2);
  ctx.fillStyle=color; ctx.fill(); _stroke(ctx,size);
}
function _eyes(ctx, size, yFrac, spread, hollow) {
  yFrac  = yFrac===undefined  ? -0.24 : yFrac;
  spread = spread===undefined ? 0.075 : spread;
  hollow = !!hollow;
  const r=size*0.038;
  if(hollow){
    ctx.strokeStyle='#2a1c10'; ctx.lineWidth=Math.max(1,size*0.03);
    for(const sx of [-spread,spread]){ ctx.beginPath(); ctx.arc(size*sx,size*yFrac,r,0,Math.PI*2); ctx.stroke(); }
  } else {
    ctx.fillStyle='#2a1c10';
    for(const sx of [-spread,spread]){ ctx.beginPath(); ctx.arc(size*sx,size*yFrac,r,0,Math.PI*2); ctx.fill(); }
  }
}

// ---- per-character draw functions (defined before CHARACTERS array) ----

function _drawFortunato(ctx, size, t) {
  t = t||0;
  const lw=Math.max(1.5,size*0.038);
  // Humanoid base: black fancy trousers, green waistcoat, gold skin
  _humanBase(ctx, size, '#1a1a22', '#3a9a3a', '#f0c860', '#f0c860');
  // White shirt stripe peeking through waistcoat
  ctx.beginPath(); ctx.roundRect(-size*0.06,-size*0.07,size*0.12,size*0.24,size*0.05);
  ctx.fillStyle='#f0f0e0'; ctx.fill();
  _eyes(ctx, size);
  // Hat brim
  _fillE(ctx,size,'#1a1a1a', 0,-size*0.37, size*0.20, size*0.048);
  // Hat body
  _fillR(ctx,size,'#1a1a1a', -size*0.13,-size*0.56,size*0.26,size*0.21,size*0.04);
  // "?" on hat
  ctx.fillStyle='#ffd24a'; ctx.font='bold '+Math.round(size*0.13)+'px sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('?',0,-size*0.475);
  // Animated sparkle
  const sa=Math.sin(t*4)*0.6;
  ctx.save(); ctx.translate(size*0.26,-size*0.26); ctx.rotate(sa);
  ctx.strokeStyle='#2a1c10'; ctx.lineWidth=Math.max(1,size*0.025);
  for(let i=0;i<4;i++){ ctx.beginPath(); const a=i*Math.PI/2; ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*size*0.07,Math.sin(a)*size*0.07); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(0,0,size*0.025,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
  ctx.restore();
}

function _drawZioSchermo(ctx, size, t) {
  t = t||0;
  const lw=Math.max(1.5,size*0.038);
  // Humanoid base: dark armor pants, gunmetal chest, grey arms, grey helmet head
  _humanBase(ctx, size, '#3a4450', '#5a6672', '#5a6672', '#6a7880');
  // Hex pattern on torso
  ctx.strokeStyle='#2a3440'; ctx.lineWidth=Math.max(1,size*0.022);
  const hexR=size*0.052;
  for(const [hx,hy] of [[0,size*0.02],[size*0.10,size*0.13],[-size*0.10,size*0.13]]){
    ctx.beginPath();
    for(let i=0;i<6;i++){ const a=i*Math.PI/3-Math.PI/6; i===0?ctx.moveTo(hx+Math.cos(a)*hexR,hy+Math.sin(a)*hexR):ctx.lineTo(hx+Math.cos(a)*hexR,hy+Math.sin(a)*hexR); }
    ctx.closePath(); ctx.stroke();
  }
  // Helmet dome over head
  _fillE(ctx,size,'#5a6672', 0,-size*0.24, size*0.19, size*0.17);
  // Dark visor
  ctx.beginPath(); ctx.roundRect(-size*0.14,-size*0.27,size*0.28,size*0.09,size*0.03);
  ctx.fillStyle='#1a2430'; ctx.fill(); ctx.strokeStyle='#2a1c10'; ctx.lineWidth=lw; ctx.stroke();
  ctx.fillStyle='rgba(80,180,255,'+(0.18+0.12*Math.sin(t*3))+')'; ctx.beginPath(); ctx.roundRect(-size*0.14,-size*0.27,size*0.28,size*0.09,size*0.03); ctx.fill();
}

function _drawSoldier(ctx, size, t) {
  t = t||0;
  const lw = Math.max(1.5, size*0.038);
  // Humanoid base: dark olive pants, army vest, olive arms, tan skin
  _humanBase(ctx, size, '#3a4a22', '#4a5e28', '#4a5e28', '#c8a47a');
  // Belt
  _fillR(ctx,size,'#2a1c10',-size*0.17,size*0.10,size*0.34,size*0.05,size*0.01);
  _fillR(ctx,size,'#a08030',-size*0.04,size*0.09,size*0.08,size*0.055,size*0.01);  // buckle
  // Stern angled brows
  ctx.strokeStyle='#2a1c10'; ctx.lineWidth=Math.max(2,size*0.042); ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-size*0.12,-size*0.29); ctx.lineTo(-size*0.04,-size*0.26); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( size*0.12,-size*0.29); ctx.lineTo( size*0.04,-size*0.26); ctx.stroke();
  ctx.lineCap='butt';
  _eyes(ctx, size, -0.22);
  // Helmet dome
  ctx.beginPath(); ctx.ellipse(0,-size*0.26,size*0.17,size*0.15,0,0,Math.PI*2);
  ctx.fillStyle='#3d4e22'; ctx.fill(); ctx.strokeStyle='#2a1c10'; ctx.lineWidth=lw; ctx.stroke();
  // Helmet brim strip
  _fillR(ctx,size,'#2e3a18',-size*0.22,-size*0.185,size*0.44,size*0.07,size*0.02);
  // Chin strap
  ctx.strokeStyle='#2a3618'; ctx.lineWidth=Math.max(1.5,size*0.03);
  ctx.beginPath(); ctx.moveTo(-size*0.16,-size*0.22); ctx.lineTo(-size*0.16,-size*0.11); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( size*0.16,-size*0.22); ctx.lineTo( size*0.16,-size*0.11); ctx.stroke();
  // Idle helmet sheen
  ctx.fillStyle='rgba(255,255,255,'+(0.10+0.08*Math.sin(t*2.4))+')';
  ctx.beginPath(); ctx.ellipse(-size*0.05,-size*0.30,size*0.05,size*0.025,0,0,Math.PI*2); ctx.fill();
}

function _drawIlSaggio(ctx, size, t) {
  t = t||0;
  const lw=Math.max(1.5,size*0.038);
  // Humanoid base: navy robe-legs, navy body, navy arms, pale skin
  _humanBase(ctx, size, '#1a2640', '#243a66', '#243a66', '#e0c0a0');
  _eyes(ctx, size);
  // Round glasses
  ctx.strokeStyle='#2a1c10'; ctx.lineWidth=Math.max(1.2,size*0.03);
  for(const sx of [-0.075,0.075]){ ctx.beginPath(); ctx.arc(size*sx,-size*0.24,size*0.055,0,Math.PI*2); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(size*-0.02,-size*0.24); ctx.lineTo(size*0.02,-size*0.24); ctx.stroke();
  // Gold trim sash
  _fillR(ctx,size,'#e0b03a',-size*0.16,-size*0.02,size*0.32,size*0.06,size*0.02);
  // Held book
  _fillR(ctx,size,'#a02828',size*0.14,size*0.04,size*0.13,size*0.10,size*0.015);
  // Idle page-glow sparkle above the book
  ctx.fillStyle='rgba(224,176,58,'+(0.4+0.3*Math.sin(t*2.6))+')';
  ctx.beginPath(); ctx.arc(size*0.18,size*0.02+Math.sin(t*2.6)*size*0.03,size*0.025,0,Math.PI*2); ctx.fill();
}

function _drawIlProfessore(ctx, size, t) {
  t = t||0;
  const lw=Math.max(1.5,size*0.038);
  // Humanoid base: dark grey pants, beige/brown jacket, beige arms, light skin
  _humanBase(ctx, size, '#2a2a1a', '#c8983a', '#d4a860', '#f0c890');
  _eyes(ctx, size);
  // Round glasses
  ctx.strokeStyle='#2a1c10'; ctx.lineWidth=Math.max(1.5,size*0.03);
  const gr=size*0.062;
  for(const gx of [-size*0.082,size*0.082]){ ctx.beginPath(); ctx.arc(gx,-size*0.225,gr,0,Math.PI*2); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-size*0.02,-size*0.225); ctx.lineTo(size*0.02,-size*0.225); ctx.stroke();
  // Mortarboard base ring
  _fillE(ctx,size,'#1a1a1a', 0,-size*0.36, size*0.19,size*0.05);
  // Mortarboard flat top
  _fillR(ctx,size,'#1a1a1a', -size*0.19,-size*0.42,size*0.38,size*0.08,size*0.01);
  // Tassel
  ctx.strokeStyle='#e0a92e'; ctx.lineWidth=Math.max(1.5,size*0.025);
  ctx.beginPath(); ctx.moveTo(size*0.19,-size*0.39); ctx.lineTo(size*0.19,-size*0.29); ctx.stroke();
  ctx.beginPath(); ctx.arc(size*0.19,-size*0.29,size*0.025,0,Math.PI*2); ctx.fillStyle='#e0a92e'; ctx.fill();
  // Glowing orb in hand
  const orbY=-size*0.39+Math.sin(t*3)*size*0.04;
  ctx.save(); ctx.shadowColor='#7af0e0'; ctx.shadowBlur=size*0.12;
  ctx.beginPath(); ctx.arc(size*0.27,orbY,size*0.04,0,Math.PI*2); ctx.fillStyle='#aaffee'; ctx.fill(); ctx.restore();
  ctx.strokeStyle='#2a1c10'; ctx.lineWidth=Math.max(1,size*0.025);
  ctx.beginPath(); ctx.arc(size*0.27,orbY,size*0.04,0,Math.PI*2); ctx.stroke();
}

function _drawFantasma(ctx, size, t) {
  t = t||0;
  const lw=Math.max(1.5,size*0.038);
  // Ghost tails (animated wavy wisps instead of legs — drawn first)
  for(let i=0;i<2;i++){
    const ox=i===0?-size*0.07:size*0.07, ph=t*2+i*Math.PI;
    ctx.beginPath(); ctx.moveTo(ox,size*0.16);
    for(let s=1;s<=8;s++){ const p=s/8; ctx.lineTo(ox+Math.sin(ph+p*Math.PI)*size*0.04,size*0.16+p*size*0.18); }
    ctx.strokeStyle='rgba(200,228,255,0.85)'; ctx.lineWidth=size*0.08; ctx.lineCap='round'; ctx.stroke();
    ctx.strokeStyle='rgba(42,28,16,0.5)'; ctx.lineWidth=Math.max(1.5,size*0.025); ctx.stroke(); ctx.lineCap='butt';
  }
  // Ghostly humanoid body (pale blue, slightly translucent)
  ctx.globalAlpha=0.88;
  _fillR(ctx,size,'#b0ccee', -size*0.16,-size*0.08,size*0.32,size*0.28,size*0.10);  // torso
  _fillR(ctx,size,'#b8d4f8', -size*0.23,-size*0.02,size*0.09,size*0.18,size*0.04);  // left arm
  _fillR(ctx,size,'#b8d4f8',  size*0.14,-size*0.02,size*0.09,size*0.18,size*0.04);  // right arm
  _fillE(ctx,size,'#c8e4ff', 0,-size*0.24,size*0.16,size*0.15);  // head
  ctx.globalAlpha=1;
  // Hollow eyes
  _eyes(ctx, size, -0.24, 0.075, true);
  // Soft glow
  ctx.save(); ctx.shadowColor='#90c8ff'; ctx.shadowBlur=size*0.2;
  ctx.beginPath(); ctx.ellipse(0,-size*0.24,size*0.14,size*0.13,0,0,Math.PI*2);
  ctx.fillStyle='rgba(200,230,255,0.18)'; ctx.fill(); ctx.restore();
}

function _drawIlCampione(ctx, size, t) {
  t = t||0;
  const lw=Math.max(1.5,size*0.038);
  // Laurel wreath drawn behind head (before _humanBase)
  ctx.strokeStyle='#5a8820'; ctx.lineWidth=Math.max(2.5,size*0.04);
  ctx.beginPath(); ctx.arc(-size*0.18,-size*0.24,size*0.22,-Math.PI*0.85,-Math.PI*0.15,false); ctx.stroke();
  ctx.beginPath(); ctx.arc( size*0.18,-size*0.24,size*0.22,Math.PI+Math.PI*0.15,Math.PI+Math.PI*0.85,false); ctx.stroke();
  // Humanoid base: gold/dark pants, gold outfit, golden arms, golden skin
  _humanBase(ctx, size, '#6a4800', '#d4a820', '#e8c060', '#f5d060');
  // Medal on chest (idle glow pulse)
  ctx.save(); ctx.shadowColor='#ffe27a'; ctx.shadowBlur=size*(0.06+0.04*Math.sin(t*3));
  _fillE(ctx,size,'#e0a92e', 0,size*0.08,size*0.06,size*0.06);
  ctx.restore();
  ctx.fillStyle='#fff'; ctx.font='bold '+Math.round(size*0.08)+'px sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('★',0,size*0.08);
  _eyes(ctx, size);
  // Crown base
  const cY=-size*0.36;
  _fillR(ctx,size,'#e0a92e', -size*0.16,cY,size*0.32,size*0.06,size*0.02);
  // Three crown points
  ctx.fillStyle='#e0a92e'; ctx.strokeStyle='#2a1c10'; ctx.lineWidth=lw;
  for(const [ox,h] of [[-size*0.12,size*0.11],[0,size*0.15],[size*0.12,size*0.11]]){
    ctx.beginPath(); ctx.moveTo(ox,cY); ctx.lineTo(ox-size*0.05,cY-h); ctx.lineTo(ox+size*0.05,cY-h); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
}

function _drawIlCecchino(ctx, size, t) {
  t = t||0;
  const lw=Math.max(1.5,size*0.038);
  // Humanoid base: dark camo pants, dark green jacket, dark arms, tan skin
  _humanBase(ctx, size, '#2a3820', '#3a5030', '#4a6040', '#d4a870');
  _eyes(ctx, size);
  // Boonie hat brim
  _fillE(ctx,size,'#4a5828', 0,-size*0.35, size*0.22,size*0.05);
  // Hat crown
  _fillR(ctx,size,'#4a5828', -size*0.13,-size*0.52,size*0.26,size*0.18,size*0.04);
  // Camo spots on hat
  ctx.fillStyle='#2a3010';
  for(const [hx,hy,hr] of [[-size*0.06,-size*0.45,size*0.03],[size*0.04,-size*0.49,size*0.025],[0,-size*0.40,size*0.02]]){
    ctx.beginPath(); ctx.ellipse(hx,hy,hr,hr*0.7,0,0,Math.PI*2); ctx.fill();
  }
  // Rifle (long barrel extending from right arm)
  ctx.save();
  ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=Math.max(2,size*0.045); ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(size*0.18,-size*0.01); ctx.lineTo(size*0.55,-size*0.22); ctx.stroke();
  // Barrel tip
  ctx.lineWidth=Math.max(1.5,size*0.03);
  ctx.beginPath(); ctx.moveTo(size*0.50,-size*0.20); ctx.lineTo(size*0.57,-size*0.23); ctx.stroke();
  // Scope
  ctx.fillStyle='#2a2a2a'; ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=Math.max(1,size*0.025);
  ctx.beginPath(); ctx.rect(size*0.28,-size*0.17,size*0.12,size*0.04); ctx.fill(); ctx.stroke();
  // Scope lens glint (animated)
  ctx.fillStyle='rgba(100,200,255,'+(0.5+0.3*Math.sin(t*3))+')';
  ctx.beginPath(); ctx.arc(size*0.34,-size*0.15,size*0.018,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function _drawEngineer(ctx, size, t) {
  t = t||0;
  const lw=Math.max(1.5,size*0.038);
  // Humanoid base: dark grey work pants, teal jumpsuit, grey arms, tan skin
  _humanBase(ctx, size, '#3a4248', '#2f8fa0', '#475a60', '#d4a870');
  // Tool belt
  _fillR(ctx,size,'#2a1c10',-size*0.17,size*0.10,size*0.34,size*0.05,size*0.01);
  _fillR(ctx,size,'#9aa3af',-size*0.04,size*0.085,size*0.08,size*0.06,size*0.01); // buckle
  _eyes(ctx, size);
  // Welding goggles
  ctx.strokeStyle='#2a1c10'; ctx.lineWidth=Math.max(1.2,size*0.03);
  for(const sx of [-0.075,0.075]){ ctx.beginPath(); ctx.arc(size*sx,-size*0.24,size*0.058,0,Math.PI*2); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(size*-0.017,-size*0.24); ctx.lineTo(size*0.017,-size*0.24); ctx.stroke();
  ctx.fillStyle='rgba(95,224,255,'+(0.30+0.18*Math.sin(t*3))+')';
  for(const sx of [-0.075,0.075]){ ctx.beginPath(); ctx.arc(size*sx,-size*0.24,size*0.046,0,Math.PI*2); ctx.fill(); }
  // Hardhat brim
  _fillE(ctx,size,'#e0b03a', 0,-size*0.36, size*0.20,size*0.05);
  // Hardhat dome
  ctx.beginPath(); ctx.ellipse(0,-size*0.38,size*0.17,size*0.14,0,Math.PI,Math.PI*2);
  ctx.fillStyle='#e0b03a'; ctx.fill(); ctx.strokeStyle='#2a1c10'; ctx.lineWidth=lw; ctx.stroke();
  // Held wrench
  ctx.save();
  ctx.translate(size*0.21,size*0.05); ctx.rotate(0.5+Math.sin(t*2)*0.08);
  ctx.fillStyle='#9aa3af'; ctx.strokeStyle='#2a1c10'; ctx.lineWidth=Math.max(1,size*0.025);
  ctx.beginPath(); ctx.roundRect(-size*0.025,-size*0.02,size*0.05,size*0.20,size*0.015); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0,-size*0.03,size*0.045,0.3,Math.PI*2-0.3); ctx.stroke();
  ctx.restore();
  // Idle wrench glint
  ctx.fillStyle='rgba(255,255,255,'+(0.15+0.12*Math.sin(t*4))+')';
  ctx.beginPath(); ctx.arc(size*0.24,size*0.02,size*0.018,0,Math.PI*2); ctx.fill();
}

// ============ CHARACTERS ARRAY ============
const CHARACTERS = [
  {
    id: 'gianni',
    name: 'Gianni',
    desc: 'The classic hero. Balanced stats, no special tricks.',
    rarity: 'world',
    worldUnlock: 0,
    baseStats: {},
    register() {},
    draw: null
  },
  {
    id: 'fortunato',
    name: 'Fortunato',
    desc: 'More lucky blocks, more RNG. Can one-tap any lucky block. Starts with 2 projectiles, can\'t take Splinter Shot.',
    rarity: 'epic',
    worldUnlock: null,
    gemPrice: 25,     // Character Shop only — no progression unlock
    baseStats: { maxHp:70, speed:230, fireRate:0.46, dmg:12, gearDmgMul:1.0 },
    register() {
      P.fortunatoLuckyCap = 5 + Math.floor(Math.random()*4); // 5-8, fixed for the run
      onHook('getLuckyCap', () => P.fortunatoLuckyCap);
      onHook('onLuckySpawn', (lb) => { if(Math.random()<0.25) lb.heavy=true; }); // 25% heavy chance
      P.luckyBullets = true;
      P.noCrit = true;
      P.luckyXpOnly = true;
      P.luckyBlockDmgMul = 2.5;
      P.shots = 2;                              // starts with 2 projectiles
      P.bannedCards = (P.bannedCards||[]).concat(['multi']); // can't stack more via Splinter Shot
    },
    draw(ctx, size, t) { _drawFortunato(ctx, size, t); }
  },
  {
    id: 'zio_schermo',
    name: 'Zio Schermo',
    desc: 'Way higher stats, one HP.',
    rarity: 'epic',
    worldUnlock: null,
    gemPrice: 10,
    baseStats: { maxHp:1, dmg:20, fireRate:0.24 },
    register() {
      if(typeof P!=='undefined'){
        P.whiteBullets = true;
        P.bannedCards = ['hp','thick','regen'];   // no max-HP or healing cards — stays at 1 HP
        P.maxHp = 1; P.hp = 1;   // hard clamp — gear HP bonuses apply before register(), so re-clamp here
      }
    },
    draw(ctx, size, t) { _drawZioSchermo(ctx, size, t); }
  },
  {
    id: 'il_professore',
    name: 'Il Professore',
    desc: 'XP range x2. Start each wave 20% full. Draw 4 cards at level-up.',
    rarity: 'epic',
    worldUnlock: null,
    gemPrice: 25,     // Character Shop only — no progression unlock
    baseStats: { magnet:180 },
    register() {
      onHook('waveStart', () => {
        if(typeof P!=='undefined') P.xp+=P.xpNext*0.20;
      });
    },
    draw(ctx, size, t) { _drawIlProfessore(ctx, size, t); }
  },
  {
    id: 'fantasma',
    name: 'Fantasma',
    desc: 'Infinite piercing, translucent shots. Enemies ignore him until he\'s close or shoots them.',
    rarity: 'legendary',
    worldUnlock: null,
    baseStats: { pierce:999 },
    register() {
      if(typeof P!=='undefined'){
        P.ghostBullets = true;
        P.stealthAggro = true;
      }
    },
    draw(ctx, size, t) { _drawFantasma(ctx, size, t); }
  },
  {
    id: 'il_cecchino',
    name: 'Il Cecchino',
    desc: 'Sniper, low firerate, high damage.',
    rarity: 'world',
    worldUnlock: 3,
    baseStats: { dmg:75, fireRate:1.6, maxHp:60, range:480, gearDmgMul:1.5 },
    register() {
      P.bannedCards = (P.bannedCards||[]).concat(['shots']);
      P.trueDmg = true;
      onHook('onLevelUp', () => { if(typeof P!=='undefined') P.shots=1; });
    },
    draw(ctx, size, t) { _drawIlCecchino(ctx, size, t); }
  },
  {
    id: 'soldier',
    name: 'Soldier',
    desc: 'Fast, solid bullets, can\'t aim while moving.',
    rarity: 'challenger',
    chalWorldUnlock: 1,   // unlocked by beating Challenger World 1
    baseStats: { speed: 280 },   // 200 * 1.4
    register() {
      P.soldierBullets = true;
      let wasStill = true;
      let lx = P.x, ly = P.y;
      onHook('petTick', () => {
        const moved = Math.abs(P.x - lx) > 0.8 || Math.abs(P.y - ly) > 0.8;
        lx = P.x; ly = P.y;
        const nowStill = !moved;
        if(nowStill !== wasStill){
          if(nowStill){ P.fireRate /= 1.95; P.dmg *= 1.25; }   // standing still: 95% faster (50% base + 30% buff), +25% damage
          else        { P.fireRate *= 1.95; P.dmg /= 1.25; }   // moving: restore rate/damage
          wasStill = nowStill;
        }
        P.soldierStill = nowStill;
        if(!nowStill) P.fireCd = Math.max(P.fireCd, 0.4);   // block shooting while moving
      });
    },
    draw(ctx, size, t) { _drawSoldier(ctx, size, t); }
  },
  {
    id: 'il_saggio',
    name: 'Il Saggio',
    desc: 'Level up no longer grants cards, only power ups.',
    rarity: 'challenger',
    chalWorldUnlock: 2,   // unlocked by beating Challenger World 2
    baseStats: {},
    register() {
      P.noCards = true;
      onHook('onLevelUp', () => { P.fireRate *= 0.95; P.dmg *= 1.05; });
    },
    draw(ctx, size, t) { _drawIlSaggio(ctx, size, t); }
  },
  {
    id: 'il_campione',
    name: 'Il Campione',
    desc: '12% enemy death = mini lucky block. Each boss killed permanently +2 base dmg.',
    rarity: 'world',
    worldUnlock: 10,
    baseStats: {},
    register() {
      onHook('onKill', () => {
        if(Math.random()<0.12 && typeof spawnMiniLucky==='function') spawnMiniLucky();
      });
      onHook('onBossKill', () => {
        if(typeof P!=='undefined') P.dmg+=2;
      });
    },
    draw(ctx, size, t) { _drawIlCampione(ctx, size, t); }
  },
  {
    id: 'engineer',
    name: 'Engineer',
    desc: 'Fires no bullets of his own. Starts with 2 turrets that share all his stats. Dash places a stationary turret instead.',
    rarity: 'world',
    worldUnlock: 1,   // World 2 — temporary early unlock
    baseStats: {},
    register() {
      P.noPlayerShots = true;
      P.engineerPlace = true;
      P.turretCount = Math.max(P.turretCount||0, 2);
      P.turretDmgFrac = 0.5;
      P.turretAdaptive = true;
      P.turretFireFromPlayer = true;
      P.bannedCards = ['multi','pierce','orbit','nova','vamp','slow','aegis','blackhole','phoenix','knives','ricochet','chain','boomerang','frostbloom','bouncy','skibidi','gravcrush','auramonster','secondwind'];
    },
    draw(ctx, size, t) { _drawEngineer(ctx, size, t); }
  }
];

// ============ UTILITY FUNCTIONS ============

function applyCharBase(charId) {
  const char = CHARACTERS.find(c=>c.id===charId);
  if(!char||!char.baseStats) return;
  const hadMaxHp = typeof P!=='undefined' ? P.maxHp : null;
  if(typeof P!=='undefined'){
    Object.assign(P, char.baseStats);
    if(char.baseStats.maxHp!==undefined && hadMaxHp!==char.baseStats.maxHp){
      P.hp = P.maxHp;
    }
  }
}

function registerActiveChar() {
  const id = typeof activeCharId!=='undefined' ? activeCharId : 'gianni';
  const char = CHARACTERS.find(c=>c.id===id);
  if(char && typeof char.register==='function') char.register();
}

function registerActivePet() {
  const id = typeof activePetId!=='undefined' ? activePetId : null;
  if(!id) return;
  const pet = typeof PETS!=='undefined' ? PETS.find(p=>p.id===id) : null;
  if(pet && typeof pet.register==='function') pet.register();
}

function drawCharacter(charId, x, y, size, bob, flip) {
  const char = CHARACTERS.find(c=>c.id===charId);
  if(!char||!char.draw){
    if(typeof drawSprite==='function') drawSprite('player',x,y,size,bob,0,0,flip);
    return;
  }
  const ctx = typeof cx!=='undefined' ? cx : null;
  if(!ctx) return;
  ctx.save();
  ctx.translate(x,y);
  if(flip) ctx.scale(-1,1);
  ctx.rotate(bob||0);
  const elapsed_ = typeof elapsed!=='undefined' ? elapsed : 0;
  char.draw(ctx, size, elapsed_);
  ctx.restore();
}

function renderCharThumb(offCtx, charId, size) {
  const char = CHARACTERS.find(c=>c.id===charId);
  offCtx.save();
  offCtx.translate(size/2, size/2);
  if(!char||!char.draw){
    // Draw a simple placeholder silhouette using the player sprite
    const sp = typeof SP!=='undefined' ? SP['player'] : null;
    if(sp){
      const dsz=sp._nom?size*sp.width/sp._nom:size; offCtx.drawImage(sp, -dsz/2, -dsz/2, dsz, dsz);
    } else {
      offCtx.fillStyle='#7a8896';
      offCtx.beginPath();
      offCtx.arc(0,-size*0.12,size*0.26,0,Math.PI*2);
      offCtx.fill();
    }
  } else {
    char.draw(offCtx, size, 0);
  }
  offCtx.restore();
}

function charIsUnlocked(charId) {
  const char = CHARACTERS.find(c=>c.id===charId);
  if(!char) return false;
  // gating is decided by which threshold field is set, not by the cosmetic rarity tag —
  // lets a character carry a real rarity (e.g. Fortunato is 'epic') while still being a world/challenger unlock
  if(char.worldUnlock!=null){
    const unlocked = parseInt(localStorage.getItem('br_unlocked')||'0');
    return char.worldUnlock<=unlocked;
  }
  if(char.chalWorldUnlock!=null){
    const ch = parseInt(localStorage.getItem('br_ch_unlocked')||'0');
    return ch >= char.chalWorldUnlock;
  }
  return isCharOwned(charId);
}

function isCharOwned(id) {
  return JSON.parse(localStorage.getItem('br_owned_chars')||'[]').includes(id);
}

function grantChar(id) {
  const owned = JSON.parse(localStorage.getItem('br_owned_chars')||'[]');
  if(!owned.includes(id)){
    owned.push(id);
    localStorage.setItem('br_owned_chars', JSON.stringify(owned));
    if(window.markDirty) window.markDirty();
  }
  if(typeof updateCharBadge==='function') updateCharBadge();
}

let activeCharId = localStorage.getItem('br_active_char')||'gianni';
let activePetId  = localStorage.getItem('br_active_pet')||null;

function setActiveChar(id) {
  activeCharId = id;
  localStorage.setItem('br_active_char', id);
  if(window.markDirty) window.markDirty();
  if(typeof refreshCharTab==='function') refreshCharTab();
}

function setActivePet(id) {
  activePetId = id;
  if(id) localStorage.setItem('br_active_pet', id);
  else localStorage.removeItem('br_active_pet');
  if(window.markDirty) window.markDirty();
  if(typeof renderPetsTab==='function') renderPetsTab();
}

function compositeCharCanvasURL(size) {
  size = size||200;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  // Draw character portrait centered
  renderCharThumb(g, activeCharId, size);
  // Overlay gear if available (hidden by default on non-default characters)
  if(gearShouldShow(activeCharId) && typeof GEAR_CATS!=='undefined' && typeof gearEquip!=='undefined'){
    for(const cat of GEAR_CATS){
      const uid=gearEquip[cat];
      const id=(uid && typeof gearInstanceItem==='function') ? gearInstanceItem(uid) : uid;
      if(!id) continue;
      if(typeof tintedSprite==='function' && typeof RAR!=='undefined'){
        const spr = tintedSprite('gear_'+cat, RAR[typeof itemRar==='function'?itemRar(id):'common'].color);
        if(spr) g.drawImage(spr,0,0,size,size);
      }
    }
  }
  return c.toDataURL();
}
