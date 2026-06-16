'use strict';
// ============ CHARACTERS: selection, drawing, hooks ============
// Loads before game.js. All draw functions render at (0,0) with ctx already translated.

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

function _drawBombardella(ctx, size, t) {
  t = t||0;
  const lw=Math.max(1.5,size*0.038);
  // Humanoid base: dark red pants, red armored chest, red arms, reddish skin
  _humanBase(ctx, size, '#6a1515', '#c03838', '#cc4040', '#d85858');
  // Angry brows
  ctx.strokeStyle='#2a1c10'; ctx.lineWidth=Math.max(2,size*0.045);
  ctx.beginPath(); ctx.moveTo(-size*0.14,-size*0.30); ctx.lineTo(-size*0.04,-size*0.26); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( size*0.14,-size*0.30); ctx.lineTo( size*0.04,-size*0.26); ctx.stroke();
  _eyes(ctx, size);
  // Fire spikes on head (outer)
  ctx.fillStyle='#ff6a00'; ctx.strokeStyle='#2a1c10'; ctx.lineWidth=Math.max(1.5,size*0.032);
  for(const ox of [-size*0.10, 0, size*0.10]){
    ctx.beginPath(); ctx.moveTo(ox,-size*0.46); ctx.lineTo(ox-size*0.055,-size*0.34); ctx.lineTo(ox+size*0.055,-size*0.34); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  // Inner yellow flame tips
  ctx.fillStyle='#ffd24a';
  for(const ox of [-size*0.10, 0, size*0.10]){
    ctx.beginPath(); ctx.moveTo(ox,-size*0.43); ctx.lineTo(ox-size*0.024,-size*0.37); ctx.lineTo(ox+size*0.024,-size*0.37); ctx.closePath(); ctx.fill();
  }
}

function _drawSorellaVeloce(ctx, size, t) {
  t = t||0;
  const lw=Math.max(1.5,size*0.038);
  // Ponytail behind head (draw first so head covers the base)
  ctx.beginPath(); ctx.moveTo(-size*0.06,-size*0.22);
  ctx.bezierCurveTo(-size*0.22,-size*0.28,-size*0.28,-size*0.10,-size*0.20,-size*0.02);
  ctx.strokeStyle='#7a4a20'; ctx.lineWidth=Math.max(3,size*0.055); ctx.lineCap='round'; ctx.stroke(); ctx.lineCap='butt';
  // Humanoid base: blue jeans, cyan racing jacket, cyan arms, light skin
  _humanBase(ctx, size, '#1e3f7a', '#2a8adf', '#5ab8e8', '#f0d0b0');
  // White speed stripe on jacket
  ctx.beginPath(); ctx.moveTo(-size*0.15,size*0.04); ctx.lineTo(size*0.15,size*0.00);
  ctx.strokeStyle='rgba(255,255,255,0.65)'; ctx.lineWidth=Math.max(2,size*0.03); ctx.stroke();
  _eyes(ctx, size);
  // Speed lines trailing left
  ctx.lineCap='round';
  for(let i=0;i<3;i++){
    const y=-size*0.04+i*size*0.12; const len=(i===1?0.26:0.17)*size;
    ctx.beginPath(); ctx.moveTo(-size*0.24,y); ctx.lineTo(-size*0.24-len,y);
    ctx.strokeStyle='#7ae8ff'; ctx.lineWidth=Math.max(1.5,size*0.025); ctx.globalAlpha=0.7-i*0.15; ctx.stroke(); ctx.globalAlpha=1;
  }
  ctx.lineCap='butt';
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
  ctx.fillStyle='rgba(80,180,255,0.25)'; ctx.beginPath(); ctx.roundRect(-size*0.14,-size*0.27,size*0.28,size*0.09,size*0.03); ctx.fill();
}

function _drawDoppione(ctx, size, t) {
  t = t||0;
  const lw=Math.max(1.5,size*0.038);
  // Left half (white) humanoid
  ctx.save(); ctx.beginPath(); ctx.rect(-size,-size,size,size*2); ctx.clip();
  _humanBase(ctx, size, '#e0e0e0', '#f0f0f0', '#f0f0f0', '#f0f0f0');
  ctx.restore();
  // Right half (black) humanoid
  ctx.save(); ctx.beginPath(); ctx.rect(0,-size,size,size*2); ctx.clip();
  _humanBase(ctx, size, '#1a1a1a', '#222222', '#222222', '#1a1a1a');
  ctx.restore();
  // Re-stroke outlines (clipping strips them)
  ctx.strokeStyle='#2a1c10'; ctx.lineWidth=lw;
  for(const [x,y,w,h,r] of [
    [-size*0.12,size*0.16,size*0.09,size*0.20,size*0.03],
    [ size*0.03,size*0.16,size*0.09,size*0.20,size*0.03],
    [-size*0.16,-size*0.08,size*0.32,size*0.28,size*0.10],
    [-size*0.23,-size*0.02,size*0.09,size*0.18,size*0.04],
    [ size*0.14,-size*0.02,size*0.09,size*0.18,size*0.04],
  ]){ ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(0,-size*0.24,size*0.16,size*0.15,0,0,Math.PI*2); ctx.stroke();
  // Center dividing line
  ctx.beginPath(); ctx.moveTo(0,-size*0.5); ctx.lineTo(0,size*0.5); ctx.lineWidth=Math.max(2,size*0.04); ctx.stroke();
  // Contrasting eyes
  ctx.fillStyle='#1a1a1a'; ctx.beginPath(); ctx.arc(-size*0.07,-size*0.24,size*0.035,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#f0f0f0'; ctx.beginPath(); ctx.arc( size*0.07,-size*0.24,size*0.035,0,Math.PI*2); ctx.fill();
}

function _drawLaStrega(ctx, size, t) {
  t = t||0;
  const lw=Math.max(1.5,size*0.038);
  // Cape wings drawn first (behind body)
  const capeCol='#1a0830';
  for(const side of [-1,1]){
    ctx.beginPath();
    ctx.moveTo(side*size*0.16,size*0.10);
    ctx.bezierCurveTo(side*size*0.48,-size*0.04,side*size*0.52,-size*0.17,side*size*0.24,-size*0.27);
    ctx.bezierCurveTo(side*size*0.15,-size*0.22,side*size*0.08,-size*0.08,0,-size*0.04);
    ctx.closePath(); ctx.fillStyle=capeCol; ctx.fill(); ctx.strokeStyle='#2a1c10'; ctx.lineWidth=lw; ctx.stroke();
  }
  // Humanoid base: dark purple robe-legs, purple body, purple arms, pale purple skin
  _humanBase(ctx, size, '#2a1040', '#7030a0', '#a060c8', '#c87ace');
  // Thin slit pupils
  ctx.fillStyle='#2a1c10';
  for(const sx of [-0.07,0.07]){ ctx.beginPath(); ctx.ellipse(size*sx,-size*0.24,size*0.045,size*0.015,0,0,Math.PI*2); ctx.fill(); }
  // Pointed hat cone
  ctx.beginPath(); ctx.moveTo(0,-size*0.54); ctx.lineTo(-size*0.17,-size*0.30); ctx.lineTo(size*0.17,-size*0.30); ctx.closePath();
  ctx.fillStyle=capeCol; ctx.fill(); ctx.strokeStyle='#2a1c10'; ctx.lineWidth=lw; ctx.stroke();
  // Hat brim
  _fillE(ctx,size,capeCol, 0,-size*0.30, size*0.22,size*0.05);
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
  // Medal on chest
  _fillE(ctx,size,'#e0a92e', 0,size*0.08,size*0.06,size*0.06);
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
    desc: 'More lucky blocks, more RNG.',
    rarity: 'world',
    worldUnlock: 3,
    baseStats: { maxHp:70, speed:230, fireRate:0.46, dmg:7 },
    register() {
      onHook('getLuckyCap', () => 4);
      onHook('onLuckySpawn', (lb) => { if(Math.random()<0.10) lb.heavy=true; });
      P.luckyBullets = true;
      P.noCrit = true;
      P.luckyXpOnly = true;
    },
    draw(ctx, size, t) { _drawFortunato(ctx, size, t); }
  },
  {
    id: 'bombardella',
    name: 'Bombardella',
    desc: '+40% dmg, -35 HP. Every 10 kills per wave: +1 temp projectile.',
    rarity: 'rare',
    worldUnlock: null,
    baseStats: { dmg:14, maxHp:65 },
    register() {
      onHook('waveStart', () => { if(typeof P!=='undefined'){ P.waveKills=0; P.bonusShots=0; } });
      onHook('onKill', () => {
        if(typeof P==='undefined') return;
        P.waveKills=(P.waveKills||0)+1;
        if(P.waveKills%10===0){ P.bonusShots=(P.bonusShots||0)+1; }
      });
    },
    draw(ctx, size, t) { _drawBombardella(ctx, size, t); }
  },
  {
    id: 'sorella_veloce',
    name: 'Sorella Veloce',
    desc: '+35% speed. Dash has 2 charges. Kill within 0.5s of dash = +15% dmg for 3s (stacks x3).',
    rarity: 'rare',
    worldUnlock: null,
    baseStats: { speed:270 },
    register() {
      onHook('onDash', () => { if(typeof P!=='undefined') P.dashCharges=2; });
    },
    draw(ctx, size, t) { _drawSorellaVeloce(ctx, size, t); }
  },
  {
    id: 'zio_schermo',
    name: 'Zio Schermo',
    desc: 'Starts each wave with a 1-hit shield. Shield recharges 8s after breaking. +15% armor.',
    rarity: 'epic',
    worldUnlock: null,
    baseStats: { armor:0.85 },
    register() {
      onHook('waveStart', () => {
        if(typeof P!=='undefined') P.shield=Math.max(P.shield||0,1);
      });
    },
    draw(ctx, size, t) { _drawZioSchermo(ctx, size, t); }
  },
  {
    id: 'doppione',
    name: 'Doppione',
    desc: 'Each upgrade card picked creates a ghost copy at 40% value.',
    rarity: 'epic',
    worldUnlock: null,
    baseStats: {},
    register() {
      onHook('onCardPick', () => {
        if(typeof P!=='undefined') P.ghostCopyChance=0.40;
      });
    },
    draw(ctx, size, t) { _drawDoppione(ctx, size, t); }
  },
  {
    id: 'la_strega',
    name: 'La Strega',
    desc: '10% of enemy projectiles become XP orbs. Enemies within 80px deal 20% less damage.',
    rarity: 'legendary',
    worldUnlock: null,
    baseStats: {},
    register() {
      onHook('onEnemyShoot', () => {
        if(Math.random()<0.10 && typeof convertBulletToOrb==='function') convertBulletToOrb();
      });
    },
    draw(ctx, size, t) { _drawLaStrega(ctx, size, t); }
  },
  {
    id: 'il_professore',
    name: 'Il Professore',
    desc: 'XP range x2. Start each wave 20% full. Draw 4 cards at level-up.',
    rarity: 'world',
    worldUnlock: 7,
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
    desc: 'Dash replaced with Phase Shift: invincible 0.8s, slows time to 30%.',
    rarity: 'world',
    worldUnlock: 9,
    baseStats: {},
    register() {
      onHook('onDash', () => {
        if(typeof P==='undefined') return;
        P.phaseShift=true;
        P.phaseT=0.80;
        if(typeof setTimeScale==='function') setTimeScale(0.30);
      });
    },
    draw(ctx, size, t) { _drawFantasma(ctx, size, t); }
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
      offCtx.drawImage(sp, -size/2, -size/2, size, size);
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
  if(char.rarity==='world'){
    const unlocked = parseInt(localStorage.getItem('br_unlocked')||'0');
    return char.worldUnlock<=unlocked;
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
  // Overlay gear if available
  if(typeof GEAR_CATS!=='undefined' && typeof gearEquip!=='undefined'){
    for(const cat of GEAR_CATS){
      const id=gearEquip[cat]; if(!id) continue;
      if(typeof tintedSprite==='function' && typeof RAR!=='undefined'){
        const spr = tintedSprite('gear_'+cat, RAR[typeof itemRar==='function'?itemRar(id):'common'].color);
        if(spr) g.drawImage(spr,0,0,size,size);
      }
    }
  }
  return c.toDataURL();
}
