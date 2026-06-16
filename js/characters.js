'use strict';
// ============ CHARACTERS: selection, drawing, hooks ============
// Loads before game.js. All draw functions render at (0,0) with ctx already translated.

// ---- shared drawing helpers ----
function _stroke(ctx, size) {
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5, size*0.038);
  ctx.stroke();
}
function _stdHead(ctx, size, color) {
  ctx.beginPath();
  ctx.arc(0, -size*0.12, size*0.26, 0, Math.PI*2);
  ctx.fillStyle=color;
  ctx.fill();
  _stroke(ctx,size);
}
function _stdBody(ctx, size, color, wFrac, hFrac, yFrac) {
  wFrac = wFrac===undefined ? 0.38 : wFrac;
  hFrac = hFrac===undefined ? 0.28 : hFrac;
  yFrac = yFrac===undefined ? 0.24 : yFrac;
  ctx.beginPath();
  ctx.ellipse(0, size*yFrac, size*wFrac/2, size*hFrac/2, 0, 0, Math.PI*2);
  ctx.fillStyle=color;
  ctx.fill();
  _stroke(ctx,size);
}
function _eyes(ctx, size, yFrac, spread, hollow) {
  yFrac  = yFrac===undefined  ? -0.12 : yFrac;
  spread = spread===undefined ? 0.085 : spread;
  hollow = !!hollow;
  const r=size*0.042;
  if(hollow){
    ctx.strokeStyle='#2a1c10';
    ctx.lineWidth=Math.max(1,size*0.03);
    for(const sx of [-spread,spread]){
      ctx.beginPath();
      ctx.arc(size*sx, size*yFrac, r, 0, Math.PI*2);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle='#2a1c10';
    for(const sx of [-spread,spread]){
      ctx.beginPath();
      ctx.arc(size*sx, size*yFrac, r, 0, Math.PI*2);
      ctx.fill();
    }
  }
}

// ---- per-character draw functions (defined before CHARACTERS array) ----

function _drawFortunato(ctx, size, t) {
  t = t||0;
  // Gold skin body
  _stdBody(ctx, size, '#e8c030', 0.42, 0.30, 0.25);
  // Green waistcoat overlay
  ctx.beginPath();
  ctx.ellipse(0, size*0.25, size*0.28/2, size*0.22/2, 0, 0, Math.PI*2);
  ctx.fillStyle='#3a9a3a';
  ctx.fill();
  _stroke(ctx, size);
  // Gold head
  _stdHead(ctx, size, '#f5d060');
  _eyes(ctx, size);
  // Black top hat
  const hx = 0, hy = -size*0.36;
  // hat brim
  ctx.beginPath();
  ctx.ellipse(hx, hy+size*0.02, size*0.28, size*0.05, 0, 0, Math.PI*2);
  ctx.fillStyle='#1a1a1a';
  ctx.fill();
  _stroke(ctx, size);
  // hat body
  ctx.beginPath();
  ctx.rect(hx-size*0.17, hy-size*0.20, size*0.34, size*0.22);
  ctx.fillStyle='#1a1a1a';
  ctx.fill();
  _stroke(ctx, size);
  // "?" on hat
  ctx.fillStyle='#ffd24a';
  ctx.font='bold '+Math.round(size*0.14)+'px sans-serif';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText('?', hx, hy-size*0.09);
  // Star sparkle (animated)
  const sparkA = Math.sin(t*4)*0.6;
  const sx = size*0.28, sy = -size*0.28;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(sparkA);
  ctx.fillStyle='#ffe060';
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1,size*0.025);
  for(let i=0;i<4;i++){
    ctx.beginPath();
    ctx.moveTo(0,0);
    const a=i*Math.PI/2;
    ctx.lineTo(Math.cos(a)*size*0.07, Math.sin(a)*size*0.07);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0,0,size*0.025,0,Math.PI*2);
  ctx.fillStyle='#fff';
  ctx.fill();
  ctx.restore();
}

function _drawBombardella(ctx, size, t) {
  t = t||0;
  // Rough reddish body
  _stdBody(ctx, size, '#c05050', 0.40, 0.28, 0.24);
  // Reddish skin head
  _stdHead(ctx, size, '#e07070');
  // Angled brow lines (angry)
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(2, size*0.045);
  // left brow (angled inward-down)
  ctx.beginPath();
  ctx.moveTo(-size*0.14, -size*0.22);
  ctx.lineTo(-size*0.04, -size*0.17);
  ctx.stroke();
  // right brow (angled inward-down)
  ctx.beginPath();
  ctx.moveTo(size*0.14, -size*0.22);
  ctx.lineTo(size*0.04, -size*0.17);
  ctx.stroke();
  _eyes(ctx, size);
  // 3 triangle spikes on top of head
  ctx.fillStyle='#cc3030';
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.032);
  const spikeOffsets = [-size*0.12, 0, size*0.12];
  for(const ox of spikeOffsets){
    ctx.beginPath();
    ctx.moveTo(ox, -size*0.36);
    ctx.lineTo(ox-size*0.06, -size*0.22);
    ctx.lineTo(ox+size*0.06, -size*0.22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function _drawSorellaVeloce(ctx, size, t) {
  t = t||0;
  // Cyan body
  _stdBody(ctx, size, '#5ab4c8', 0.38, 0.26, 0.24);
  // Cyan slightly-oval head
  ctx.beginPath();
  ctx.ellipse(0, -size*0.12, size*0.27, size*0.24, 0, 0, Math.PI*2);
  ctx.fillStyle='#7fd4e8';
  ctx.fill();
  _stroke(ctx, size);
  _eyes(ctx, size);
  // Speed lines trailing left (horizontal)
  ctx.strokeStyle='#a0e8f8';
  ctx.lineWidth=Math.max(1.5, size*0.025);
  const lineY = [0.05, 0.18, 0.30];
  for(let i=0;i<3;i++){
    const len = (i===1 ? 0.32 : 0.22) * size;
    const y = size*lineY[i];
    ctx.beginPath();
    ctx.moveTo(-size*0.22, y);
    ctx.lineTo(-size*0.22-len, y);
    ctx.globalAlpha = 0.7 - i*0.15;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function _drawZioSchermo(ctx, size, t) {
  t = t||0;
  // Wide gunmetal grey body with hex pattern
  _stdBody(ctx, size, '#5a6672', 0.46, 0.32, 0.24);
  // Hex pattern on body
  ctx.strokeStyle='#2a3440';
  ctx.lineWidth=Math.max(1, size*0.022);
  const hexR = size*0.06;
  const hexCenters = [[0,-size*0.04],[size*0.14,size*0.18],[-size*0.14,size*0.18]];
  for(const [hx,hy] of hexCenters){
    ctx.beginPath();
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3 - Math.PI/6;
      const px=hx+Math.cos(a)*hexR, py=hy+Math.sin(a)*hexR;
      i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
    }
    ctx.closePath();
    ctx.stroke();
  }
  // Gunmetal head
  _stdHead(ctx, size, '#7a8896');
  // Wide dark visor across eyes
  const vx = -size*0.21, vy = -size*0.155;
  const vw = size*0.42, vh = size*0.09;
  ctx.beginPath();
  ctx.rect(vx, vy, vw, vh);
  ctx.fillStyle='#1a2430';
  ctx.fill();
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.03);
  ctx.stroke();
  // Visor tint/glint
  ctx.fillStyle='rgba(80,180,255,0.25)';
  ctx.fillRect(vx, vy, vw, vh);
}

function _drawDoppione(ctx, size, t) {
  t = t||0;
  // Left half white, right half black — use clip
  // Body
  ctx.save();
  // Left half
  ctx.beginPath();
  ctx.rect(-size, -size, size, size*2);
  ctx.clip();
  _stdBody(ctx, size, '#f0f0f0', 0.38, 0.28, 0.24);
  _stdHead(ctx, size, '#f0f0f0');
  ctx.restore();
  ctx.save();
  // Right half
  ctx.beginPath();
  ctx.rect(0, -size, size, size*2);
  ctx.clip();
  _stdBody(ctx, size, '#1a1a1a', 0.38, 0.28, 0.24);
  _stdHead(ctx, size, '#1a1a1a');
  ctx.restore();
  // Outline stroke over both halves
  ctx.beginPath();
  ctx.arc(0, -size*0.12, size*0.26, 0, Math.PI*2);
  _stroke(ctx, size);
  ctx.beginPath();
  ctx.ellipse(0, size*0.24, size*0.19, size*0.14, 0, 0, Math.PI*2);
  _stroke(ctx, size);
  // Center dividing line
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.03);
  ctx.beginPath();
  ctx.moveTo(0,-size*0.5);
  ctx.lineTo(0,size*0.5);
  ctx.stroke();
  // Eyes offset outward (left eye closer to left, right eye closer to right)
  ctx.fillStyle='#9a9a9a';
  // left eye (on white half, dark)
  ctx.fillStyle='#2a1c10';
  ctx.beginPath();
  ctx.arc(-size*0.12, -size*0.12, size*0.042, 0, Math.PI*2);
  ctx.fill();
  // right eye (on black half, light)
  ctx.fillStyle='#f0f0f0';
  ctx.beginPath();
  ctx.arc(size*0.12, -size*0.12, size*0.042, 0, Math.PI*2);
  ctx.fill();
}

function _drawLaStrega(ctx, size, t) {
  t = t||0;
  // Purple skin body
  _stdBody(ctx, size, '#a060b0', 0.38, 0.26, 0.24);
  // Cape wings (bezier arcs from shoulders)
  ctx.beginPath();
  ctx.moveTo(-size*0.19, size*0.12);
  ctx.bezierCurveTo(-size*0.55,-size*0.05, -size*0.60,-size*0.22, -size*0.30,-size*0.32);
  ctx.bezierCurveTo(-size*0.18,-size*0.28, -size*0.10,-size*0.10, 0,-size*0.05);
  ctx.closePath();
  ctx.fillStyle='#2a1040';
  ctx.fill();
  _stroke(ctx, size);
  ctx.beginPath();
  ctx.moveTo(size*0.19, size*0.12);
  ctx.bezierCurveTo(size*0.55,-size*0.05, size*0.60,-size*0.22, size*0.30,-size*0.32);
  ctx.bezierCurveTo(size*0.18,-size*0.28, size*0.10,-size*0.10, 0,-size*0.05);
  ctx.closePath();
  ctx.fillStyle='#2a1040';
  ctx.fill();
  _stroke(ctx, size);
  // Purple head
  _stdHead(ctx, size, '#c87ace');
  // Thin horizontal pupils
  ctx.fillStyle='#2a1c10';
  for(const sx of [-0.085, 0.085]){
    ctx.beginPath();
    ctx.ellipse(size*sx, -size*0.12, size*0.052, size*0.018, 0, 0, Math.PI*2);
    ctx.fill();
  }
  // Tall pointed triangle hat
  ctx.beginPath();
  ctx.moveTo(0, -size*0.56);
  ctx.lineTo(-size*0.20, -size*0.30);
  ctx.lineTo(size*0.20, -size*0.30);
  ctx.closePath();
  ctx.fillStyle='#2a1040';
  ctx.fill();
  _stroke(ctx, size);
  // Hat brim
  ctx.beginPath();
  ctx.ellipse(0, -size*0.30, size*0.24, size*0.05, 0, 0, Math.PI*2);
  ctx.fillStyle='#2a1040';
  ctx.fill();
  _stroke(ctx, size);
}

function _drawIlProfessore(ctx, size, t) {
  t = t||0;
  // Beige body
  _stdBody(ctx, size, '#d4a860', 0.38, 0.26, 0.24);
  // Beige head
  _stdHead(ctx, size, '#f0c890');
  _eyes(ctx, size);
  // Two small stroked circle glasses
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.03);
  const gr=size*0.07;
  for(const gx of [-size*0.095, size*0.095]){
    ctx.beginPath();
    ctx.arc(gx,-size*0.105,gr,0,Math.PI*2);
    ctx.stroke();
  }
  // Bridge of glasses
  ctx.beginPath();
  ctx.moveTo(-size*0.025,-size*0.105);
  ctx.lineTo(size*0.025,-size*0.105);
  ctx.stroke();
  // Flat mortarboard cap
  // Cap base
  ctx.beginPath();
  ctx.ellipse(0,-size*0.34,size*0.22,size*0.055,0,0,Math.PI*2);
  ctx.fillStyle='#2a1c10';
  ctx.fill();
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.03);
  ctx.stroke();
  // Cap flat top board
  ctx.beginPath();
  ctx.rect(-size*0.22,-size*0.40,size*0.44,size*0.08);
  ctx.fillStyle='#2a1c10';
  ctx.fill();
  ctx.stroke();
  // Tassel
  ctx.strokeStyle='#e0a92e';
  ctx.lineWidth=Math.max(1.5,size*0.025);
  ctx.beginPath();
  ctx.moveTo(size*0.22,-size*0.38);
  ctx.lineTo(size*0.22,-size*0.28);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(size*0.22,-size*0.28,size*0.025,0,Math.PI*2);
  ctx.fillStyle='#e0a92e';
  ctx.fill();
  // Glowing orb (oscillates with sin)
  const orbY = -size*0.42 + Math.sin(t*3)*size*0.04;
  const orbX = size*0.30;
  const orbR = size*0.04;
  ctx.save();
  ctx.shadowColor='#7af0e0';
  ctx.shadowBlur=size*0.12;
  ctx.beginPath();
  ctx.arc(orbX, orbY, orbR, 0, Math.PI*2);
  ctx.fillStyle='#aaffee';
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1,size*0.025);
  ctx.beginPath();
  ctx.arc(orbX, orbY, orbR, 0, Math.PI*2);
  ctx.stroke();
}

function _drawFantasma(ctx, size, t) {
  t = t||0;
  // Pale blue head
  _stdHead(ctx, size, '#c8e4ff');
  // Hollow stroked eyes (no fill)
  _eyes(ctx, size, -0.12, 0.085, true);
  // Body: pale blue upper half
  ctx.beginPath();
  ctx.ellipse(0, size*0.14, size*0.22, size*0.18, 0, 0, Math.PI*2);
  ctx.fillStyle='#c8e4ff';
  ctx.fill();
  _stroke(ctx, size);
  // 3 ghost tails at the bottom (sine-wave animated)
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.03);
  for(let i=0;i<3;i++){
    const ox = (i-1)*size*0.12;
    const phase = t*2+i;
    const waveAmp = size*0.06;
    ctx.beginPath();
    ctx.moveTo(ox, size*0.28);
    // Draw sinusoidal tail going downward
    const steps=12;
    for(let s=1;s<=steps;s++){
      const prog=s/steps;
      const ty=size*0.28+prog*size*0.22;
      const tx=ox+Math.sin(phase+prog*Math.PI*2)*waveAmp;
      ctx.lineTo(tx,ty);
    }
    ctx.fillStyle='rgba(200,228,255,0.7)';
    // Make a closed shape
    ctx.lineTo(ox+size*0.05, size*0.50);
    ctx.lineTo(ox-size*0.05, size*0.50);
    ctx.closePath();
    ctx.fillStyle='rgba(200,228,255,0.55)';
    ctx.fill();
    ctx.stroke();
  }
}

function _drawIlCampione(ctx, size, t) {
  t = t||0;
  // Gold body
  _stdBody(ctx, size, '#d4a820', 0.40, 0.28, 0.24);
  // Medal/chest star
  ctx.beginPath();
  ctx.arc(0, size*0.20, size*0.07, 0, Math.PI*2);
  ctx.fillStyle='#e0a92e';
  ctx.fill();
  _stroke(ctx, size);
  // Star on medal
  ctx.fillStyle='#fff';
  ctx.font='bold '+Math.round(size*0.09)+'px sans-serif';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText('★', 0, size*0.20);
  // Laurel wreath arcs behind head
  ctx.strokeStyle='#5a8820';
  ctx.lineWidth=Math.max(2,size*0.04);
  ctx.beginPath();
  ctx.arc(-size*0.20,-size*0.12,size*0.28,-Math.PI*0.85,-Math.PI*0.15,false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(size*0.20,-size*0.12,size*0.28,Math.PI+Math.PI*0.15,Math.PI+Math.PI*0.85,false);
  ctx.stroke();
  // Gold head
  _stdHead(ctx, size, '#f5d060');
  _eyes(ctx, size);
  // 3-point crown (3 upward triangles)
  const crownY = -size*0.36;
  const crownW = size*0.38;
  ctx.fillStyle='#e0a92e';
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.03);
  // Crown base
  ctx.beginPath();
  ctx.rect(-crownW/2, crownY, crownW, size*0.08);
  ctx.fill();
  ctx.stroke();
  // Three points
  const pts = [-size*0.14, 0, size*0.14];
  const heights = [size*0.14, size*0.18, size*0.14];
  for(let i=0;i<3;i++){
    ctx.beginPath();
    ctx.moveTo(pts[i], crownY);
    ctx.lineTo(pts[i]-size*0.06, crownY-heights[i]);
    ctx.lineTo(pts[i]+size*0.06, crownY-heights[i]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
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
    desc: 'Lucky blocks spawn 4 per wave. 30% chance each pop also drops a bonus upgrade card.',
    rarity: 'world',
    worldUnlock: 3,
    baseStats: {},
    register() {
      onHook('getLuckyCap', () => 4);
      onHook('onLuckyPop', () => {
        if(Math.random()<0.30){
          if(typeof offerBonusCard==='function') offerBonusCard();
        }
      });
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
  if(typeof refreshEquipTab==='function') refreshEquipTab();
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
