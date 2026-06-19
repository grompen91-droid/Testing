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

// ---- player keyframe animation (sprites.js not yet loaded here, so define inline) ----
// yOff: fraction of size for vertical body translation (+ve = down in canvas = character sinks)
const _PL_WALK = [
  {ph:0.00, body: 0.03, yOff: 0.02, armL: 0.62, armR:-0.62, legL:-0.58, legR: 0.58}, // contact A
  {ph:0.12, body: 0.06, yOff: 0.06, armL: 0.26, armR:-0.26, legL:-0.20, legR: 0.26}, // down A (lowest)
  {ph:0.25, body: 0.00, yOff:-0.05, armL: 0.00, armR: 0.00, legL: 0.10, legR:-0.10}, // passing A (highest)
  {ph:0.38, body: 0.03, yOff:-0.02, armL:-0.26, armR: 0.26, legL: 0.26, legR:-0.20}, // up A
  {ph:0.50, body: 0.03, yOff: 0.02, armL:-0.62, armR: 0.62, legL: 0.58, legR:-0.58}, // contact B
  {ph:0.62, body: 0.06, yOff: 0.06, armL:-0.26, armR: 0.26, legL: 0.26, legR:-0.20}, // down B (lowest)
  {ph:0.75, body: 0.00, yOff:-0.05, armL: 0.00, armR: 0.00, legL:-0.10, legR: 0.10}, // passing B (highest)
  {ph:0.88, body: 0.03, yOff:-0.02, armL: 0.26, armR:-0.26, legL:-0.20, legR: 0.26}, // up B
  {ph:1.00, body: 0.03, yOff: 0.02, armL: 0.62, armR:-0.62, legL:-0.58, legR: 0.58},
];
const _PL_ATTACK = [
  {ph:0.00, body: 0.00, yOff: 0.00, armL: 0.00, armR: 0.00, legL: 0.00, legR: 0.00},
  {ph:0.20, body:-0.22, yOff:-0.03, armL:-1.40, armR: 0.40, legL: 0.28, legR:-0.18},
  {ph:0.22, body:-0.22, yOff:-0.03, armL:-1.40, armR: 0.40, legL: 0.28, legR:-0.18},
  {ph:0.38, body: 0.30, yOff: 0.04, armL: 1.10, armR:-0.32, legL:-0.22, legR: 0.15},
  {ph:0.60, body: 0.15, yOff: 0.02, armL: 0.60, armR:-0.12, legL:-0.08, legR: 0.05},
  {ph:1.00, body: 0.00, yOff: 0.00, armL: 0.00, armR: 0.00, legL: 0.00, legR: 0.00},
];
const _PL_HIT = [
  {ph:0.00, body: 0.00, yOff: 0.00, armL: 0.00, armR: 0.00, legL: 0.00, legR: 0.00},
  {ph:0.12, body:-0.28, yOff:-0.06, armL:-0.65, armR: 0.62, legL:-0.35, legR: 0.24},
  {ph:0.40, body:-0.10, yOff:-0.02, armL:-0.22, armR: 0.20, legL:-0.10, legR: 0.06},
  {ph:1.00, body: 0.00, yOff: 0.00, armL: 0.00, armR: 0.00, legL: 0.00, legR: 0.00},
];
function _charAnimLerp(frames, phase) {
  phase = ((phase % 1) + 1) % 1;
  let lo = frames[0], hi = frames[frames.length-1];
  for(let i=0; i<frames.length-1; i++){
    if(phase >= frames[i].ph && phase < frames[i+1].ph){ lo=frames[i]; hi=frames[i+1]; break; }
  }
  const t = hi.ph===lo.ph ? 0 : (phase-lo.ph)/(hi.ph-lo.ph);
  const e = t*t*(3-2*t);
  const L = (a,b) => (a||0)+((b||0)-(a||0))*e;
  return { body:L(lo.body,hi.body), yOff:L(lo.yOff,hi.yOff),
           armL:L(lo.armL,hi.armL), armR:L(lo.armR,hi.armR),
           legL:L(lo.legL,hi.legL), legR:L(lo.legR,hi.legR) };
}

// Returns the vertical body offset (pixels, +ve = down) for the current anim state.
// Call before drawing anything, wrap all draws in ctx.translate(0, _charBodyY(...)).
function _charBodyY(anim, size, walkMul) {
  anim = anim || {};
  walkMul = walkMul === undefined ? 1 : walkMul;
  const fp = anim.firePulse || 0;
  const hp = anim.hitPulse || 0;
  const t  = anim.t || 0;
  const wp = (((anim.walkPhase || 0) * walkMul) % (Math.PI * 2)) / (Math.PI * 2);
  let yOff = 0;
  if      (hp > 0.05)   yOff = (_charAnimLerp(_PL_HIT,    1 - hp).yOff || 0);
  else if (fp > 0.05)   yOff = (_charAnimLerp(_PL_ATTACK,  1 - fp).yOff || 0);
  else if (anim.moving) yOff = (_charAnimLerp(_PL_WALK,    wp).yOff || 0);
  else                  yOff = Math.sin(t * 1.8) * 0.014; // idle breathing
  return yOff * size;
}

// Humanoid Gianni-style base: pivot-rotate limbs driven by keyframe poses.
// Caller must apply ctx.translate(0, _charBodyY(...)) BEFORE calling this so the whole
// character (base + accessories) bobs together.
function _humanBase(ctx, size, legCol, bodyCol, armCol, skinCol, anim, walkMul) {
  anim = anim || {};
  walkMul = walkMul === undefined ? 1 : walkMul;
  const fp = anim.firePulse || 0;
  const hp = anim.hitPulse || 0;
  const wp = (((anim.walkPhase || 0) * walkMul) % (Math.PI * 2)) / (Math.PI * 2);

  let p;
  if      (hp > 0.05)   p = _charAnimLerp(_PL_HIT,    1 - hp);
  else if (fp > 0.05)   p = _charAnimLerp(_PL_ATTACK,  1 - fp);
  else if (anim.moving) p = _charAnimLerp(_PL_WALK,    wp);
  else                  p = {body:0, yOff:0, armL:0, armR:0, legL:0, legR:0};
  const {body, armL, armR, legL, legR} = p;

  const hipLX = -size*0.075, hipRX = size*0.075, hipY = size*0.16;
  const shouLX = -size*0.185, shouRX = size*0.185, shouY = -size*0.02;
  const lw = size*0.09, lh = size*0.20, lr = size*0.03;
  const aw = size*0.09, ah = size*0.18, ar = size*0.04;

  // Dynamic Z: leg with higher angle is the leading leg → draw it in front
  const legLFront = legL > legR;
  function _drawLegL() {
    ctx.save(); ctx.translate(hipLX, hipY); ctx.rotate(legL);
    _fillR(ctx, size, legCol, -lw*0.5, 0, lw, lh, lr);
    ctx.restore();
  }
  function _drawLegR() {
    ctx.save(); ctx.translate(hipRX, hipY); ctx.rotate(legR);
    _fillR(ctx, size, legCol, -lw*0.5, 0, lw, lh, lr);
    ctx.restore();
  }

  // back leg (the non-leading one)
  if (legLFront) _drawLegR(); else _drawLegL();
  // torso
  ctx.save(); ctx.rotate(body * 0.5);
  _fillR(ctx, size, bodyCol, -size*0.16, -size*0.08, size*0.32, size*0.28, size*0.10);
  ctx.restore();
  // Dynamic Z for arms too
  const armLFront = armL > armR;
  function _drawArmL() {
    ctx.save(); ctx.translate(shouLX, shouY); ctx.rotate(armL);
    _fillR(ctx, size, armCol, -aw*0.5, 0, aw, ah, ar);
    ctx.restore();
  }
  function _drawArmR() {
    ctx.save(); ctx.translate(shouRX, shouY); ctx.rotate(armR);
    _fillR(ctx, size, armCol, -aw*0.5, 0, aw, ah, ar);
    ctx.restore();
  }
  // back arm
  if (armLFront) _drawArmR(); else _drawArmL();
  // front leg (the leading one)
  if (legLFront) _drawLegL(); else _drawLegR();
  // head
  _fillE(ctx, size, skinCol, 0, -size*0.24, size*0.16, size*0.15);
  // front arm
  if (armLFront) _drawArmL(); else _drawArmR();
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

function _drawGianni(ctx, size, t, anim) {
  t = t||0; anim = anim||{};
  const by = _charBodyY(anim, size);
  ctx.save(); ctx.translate(0, by);
  _humanBase(ctx, size, '#3f6fae', '#e8e3d6', '#e0c39a', '#f0c9a0', anim);
  _eyes(ctx, size);
  ctx.strokeStyle='#2a1c10'; ctx.lineWidth=Math.max(1,size*0.025); ctx.lineCap='round';
  ctx.beginPath(); ctx.arc(0,-size*0.18,size*0.05,0.2,Math.PI-0.2); ctx.stroke();
  ctx.lineCap='butt';
  ctx.beginPath(); ctx.ellipse(0,-size*0.30,size*0.155,size*0.085,0,Math.PI,Math.PI*2);
  ctx.fillStyle='#3a2d22'; ctx.fill();
  _fillR(ctx,size,'#3a2d22',-size*0.155,-size*0.285,size*0.31,size*0.05,size*0.01);
  ctx.restore();
}

function _drawFortunato(ctx, size, t, anim) {
  t = t||0; anim = anim||{};
  const lw=Math.max(1.5,size*0.038);
  const by = _charBodyY(anim, size);
  ctx.save(); ctx.translate(0, by);
  _humanBase(ctx, size, '#1a1a22', '#3a9a3a', '#f0c860', '#f0c860', anim);
  const flap = (anim.firePulse||0)*0.5 + Math.sin(anim.walkPhase||0)*0.06;
  ctx.save(); ctx.translate(size*0.16,size*0.08); ctx.rotate(flap);
  _fillR(ctx,size,'#2a8a2a',-size*0.02,-size*0.02,size*0.07,size*0.16,size*0.02);
  ctx.restore();
  ctx.beginPath(); ctx.roundRect(-size*0.06,-size*0.07,size*0.12,size*0.24,size*0.05);
  ctx.fillStyle='#f0f0e0'; ctx.fill();
  _eyes(ctx, size);
  _fillE(ctx,size,'#1a1a1a', 0,-size*0.37, size*0.20, size*0.048);
  _fillR(ctx,size,'#1a1a1a', -size*0.13,-size*0.56,size*0.26,size*0.21,size*0.04);
  ctx.fillStyle='#ffd24a'; ctx.font='bold '+Math.round(size*0.13)+'px sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('?',0,-size*0.475);
  const sa=Math.sin(t*4)*0.6 + (anim.firePulse||0)*1.4;
  ctx.save(); ctx.translate(size*0.26,-size*0.26); ctx.rotate(sa);
  ctx.strokeStyle='#2a1c10'; ctx.lineWidth=Math.max(1,size*0.025);
  for(let i=0;i<4;i++){ ctx.beginPath(); const a=i*Math.PI/2; ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*size*0.07,Math.sin(a)*size*0.07); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(0,0,size*0.025,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
  ctx.restore();
  ctx.restore();
}

function _drawZioSchermo(ctx, size, t, anim) {
  t = t||0; anim = anim||{};
  const lw=Math.max(1.5,size*0.038);
  const shake = (anim.hitPulse||0)*size*0.025;
  const by = _charBodyY(anim, size);
  ctx.save(); ctx.translate((Math.random()-0.5)*shake, (Math.random()-0.5)*shake + by);
  _humanBase(ctx, size, '#3a4450', '#5a6672', '#5a6672', '#6a7880', anim);
  ctx.strokeStyle = anim.hitPulse>0.3 ? '#ff7050' : '#2a3440'; ctx.lineWidth=Math.max(1,size*0.022)*(1+(anim.hitPulse||0));
  const hexR=size*0.052;
  for(const [hx,hy] of [[0,size*0.02],[size*0.10,size*0.13],[-size*0.10,size*0.13]]){
    ctx.beginPath();
    for(let i=0;i<6;i++){ const a=i*Math.PI/3-Math.PI/6; i===0?ctx.moveTo(hx+Math.cos(a)*hexR,hy+Math.sin(a)*hexR):ctx.lineTo(hx+Math.cos(a)*hexR,hy+Math.sin(a)*hexR); }
    ctx.closePath(); ctx.stroke();
  }
  _fillE(ctx,size,'#5a6672', 0,-size*0.24, size*0.19, size*0.17);
  ctx.beginPath(); ctx.roundRect(-size*0.14,-size*0.27,size*0.28,size*0.09,size*0.03);
  ctx.fillStyle='#1a2430'; ctx.fill(); ctx.strokeStyle='#2a1c10'; ctx.lineWidth=lw; ctx.stroke();
  ctx.fillStyle='rgba(80,180,255,'+(0.18+0.12*Math.sin(t*3)+(anim.firePulse||0)*0.4)+')'; ctx.beginPath(); ctx.roundRect(-size*0.14,-size*0.27,size*0.28,size*0.09,size*0.03); ctx.fill();
  ctx.restore();
}

function _drawSoldier(ctx, size, t, anim) {
  t = t||0; anim = anim||{};
  const lw = Math.max(1.5, size*0.038);
  const by = _charBodyY(anim, size, 1.6);
  ctx.save(); ctx.translate(0, by);
  _humanBase(ctx, size, '#3a4a22', '#4a5e28', '#4a5e28', '#c8a47a', anim, 1.6);
  if(anim.firePulse>0){
    ctx.save(); ctx.translate(size*0.18,-size*0.02); ctx.rotate(-anim.firePulse*0.5);
    _fillR(ctx,size,'#2a2a2a',-size*0.02,0,size*0.07,size*0.15,size*0.02);
    ctx.restore();
  }
  _fillR(ctx,size,'#2a1c10',-size*0.17,size*0.10,size*0.34,size*0.05,size*0.01);
  _fillR(ctx,size,'#a08030',-size*0.04,size*0.09,size*0.08,size*0.055,size*0.01);
  ctx.strokeStyle='#2a1c10'; ctx.lineWidth=Math.max(2,size*0.042); ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-size*0.12,-size*0.29); ctx.lineTo(-size*0.04,-size*0.26); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( size*0.12,-size*0.29); ctx.lineTo( size*0.04,-size*0.26); ctx.stroke();
  ctx.lineCap='butt';
  _eyes(ctx, size, -0.22);
  ctx.beginPath(); ctx.ellipse(0,-size*0.26,size*0.17,size*0.15,0,0,Math.PI*2);
  ctx.fillStyle='#3d4e22'; ctx.fill(); ctx.strokeStyle='#2a1c10'; ctx.lineWidth=lw; ctx.stroke();
  _fillR(ctx,size,'#2e3a18',-size*0.22,-size*0.185,size*0.44,size*0.07,size*0.02);
  ctx.strokeStyle='#2a3618'; ctx.lineWidth=Math.max(1.5,size*0.03);
  ctx.beginPath(); ctx.moveTo(-size*0.16,-size*0.22); ctx.lineTo(-size*0.16,-size*0.11); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( size*0.16,-size*0.22); ctx.lineTo( size*0.16,-size*0.11); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,'+(0.10+0.08*Math.sin(t*2.4))+')';
  ctx.beginPath(); ctx.ellipse(-size*0.05,-size*0.30,size*0.05,size*0.025,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function _drawIlSaggio(ctx, size, t, anim) {
  t = t||0; anim = anim||{};
  const lw=Math.max(1.5,size*0.038);
  const by = _charBodyY(anim, size, 0.33);
  ctx.save(); ctx.translate(0, by);
  _humanBase(ctx, size, '#1a2640', '#243a66', '#243a66', '#e0c0a0', anim, 0.33);
  _eyes(ctx, size);
  ctx.strokeStyle='#2a1c10'; ctx.lineWidth=Math.max(1.2,size*0.03);
  for(const sx of [-0.075,0.075]){ ctx.beginPath(); ctx.arc(size*sx,-size*0.24,size*0.055,0,Math.PI*2); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(size*-0.02,-size*0.24); ctx.lineTo(size*0.02,-size*0.24); ctx.stroke();
  _fillR(ctx,size,'#e0b03a',-size*0.16,-size*0.02,size*0.32,size*0.06,size*0.02);
  const tap = (anim.firePulse||0)*size*0.05;
  _fillR(ctx,size,'#a02828',size*0.14,size*0.04+tap,size*0.13,size*0.10,size*0.015);
  ctx.fillStyle='rgba(224,176,58,'+(0.4+0.3*Math.sin(t*2.6)+(anim.firePulse||0)*0.4)+')';
  ctx.beginPath(); ctx.arc(size*0.18,size*0.02+tap+Math.sin(t*2.6)*size*0.03,size*0.025,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function _drawIlProfessore(ctx, size, t, anim) {
  t = t||0; anim = anim||{};
  const lw=Math.max(1.5,size*0.038);
  const by = _charBodyY(anim, size);
  ctx.save(); ctx.translate(0, by);
  _humanBase(ctx, size, '#2a2a1a', '#c8983a', '#d4a860', '#f0c890', anim);
  _eyes(ctx, size);
  ctx.strokeStyle='#2a1c10'; ctx.lineWidth=Math.max(1.5,size*0.03);
  const gr=size*0.062;
  for(const gx of [-size*0.082,size*0.082]){ ctx.beginPath(); ctx.arc(gx,-size*0.225,gr,0,Math.PI*2); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-size*0.02,-size*0.225); ctx.lineTo(size*0.02,-size*0.225); ctx.stroke();
  _fillE(ctx,size,'#1a1a1a', 0,-size*0.36, size*0.19,size*0.05);
  _fillR(ctx,size,'#1a1a1a', -size*0.19,-size*0.42,size*0.38,size*0.08,size*0.01);
  const flutter = anim.moving ? Math.sin((anim.walkPhase||0)*2)*size*0.025 : 0;
  ctx.strokeStyle='#e0a92e'; ctx.lineWidth=Math.max(1.5,size*0.025);
  ctx.beginPath(); ctx.moveTo(size*0.19,-size*0.39); ctx.lineTo(size*0.19+flutter,-size*0.29); ctx.stroke();
  ctx.beginPath(); ctx.arc(size*0.19+flutter,-size*0.29,size*0.025,0,Math.PI*2); ctx.fillStyle='#e0a92e'; ctx.fill();
  const orbY=-size*0.39+Math.sin(t*3)*size*0.04;
  ctx.save(); ctx.shadowColor='#7af0e0'; ctx.shadowBlur=size*0.12;
  ctx.beginPath(); ctx.arc(size*0.27,orbY,size*0.04,0,Math.PI*2); ctx.fillStyle='#aaffee'; ctx.fill(); ctx.restore();
  ctx.strokeStyle='#2a1c10'; ctx.lineWidth=Math.max(1,size*0.025);
  ctx.beginPath(); ctx.arc(size*0.27,orbY,size*0.04,0,Math.PI*2); ctx.stroke();
  ctx.restore();
}

function _drawFantasma(ctx, size, t, anim) {
  t = t||0; anim = anim||{};
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

function _drawIlCampione(ctx, size, t, anim) {
  t = t||0; anim = anim||{};
  const lw=Math.max(1.5,size*0.038);
  const by = _charBodyY(anim, size);
  ctx.save(); ctx.translate(0, by);
  // Laurel wreath behind head — moves with character
  ctx.strokeStyle='#5a8820'; ctx.lineWidth=Math.max(2.5,size*0.04);
  ctx.beginPath(); ctx.arc(-size*0.18,-size*0.24,size*0.22,-Math.PI*0.85,-Math.PI*0.15,false); ctx.stroke();
  ctx.beginPath(); ctx.arc( size*0.18,-size*0.24,size*0.22,Math.PI+Math.PI*0.15,Math.PI+Math.PI*0.85,false); ctx.stroke();
  _humanBase(ctx, size, '#6a4800', '#d4a820', '#e8c060', '#f5d060', anim);
  ctx.save(); ctx.shadowColor='#ffe27a'; ctx.shadowBlur=size*(0.06+0.04*Math.sin(t*3));
  _fillE(ctx,size,'#e0a92e', 0,size*0.08,size*0.06,size*0.06);
  ctx.restore();
  ctx.fillStyle='#fff'; ctx.font='bold '+Math.round(size*0.08)+'px sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('★',0,size*0.08);
  _eyes(ctx, size);
  const cY=-size*0.36;
  _fillR(ctx,size,'#e0a92e', -size*0.16,cY,size*0.32,size*0.06,size*0.02);
  ctx.fillStyle='#e0a92e'; ctx.strokeStyle='#2a1c10'; ctx.lineWidth=lw;
  for(const [ox,h] of [[-size*0.12,size*0.11],[0,size*0.15],[size*0.12,size*0.11]]){
    ctx.beginPath(); ctx.moveTo(ox,cY); ctx.lineTo(ox-size*0.05,cY-h); ctx.lineTo(ox+size*0.05,cY-h); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

function _drawIlCecchino(ctx, size, t, anim) {
  t = t||0; anim = anim||{};
  const lw=Math.max(1.5,size*0.038);
  const by = _charBodyY(anim, size);
  ctx.save(); ctx.translate(0, by);
  _humanBase(ctx, size, '#2a3820', '#3a5030', '#4a6040', '#d4a870', anim);
  _eyes(ctx, size);
  _fillE(ctx,size,'#4a5828', 0,-size*0.35, size*0.22,size*0.05);
  _fillR(ctx,size,'#4a5828', -size*0.13,-size*0.52,size*0.26,size*0.18,size*0.04);
  ctx.fillStyle='#2a3010';
  for(const [hx,hy,hr] of [[-size*0.06,-size*0.45,size*0.03],[size*0.04,-size*0.49,size*0.025],[0,-size*0.40,size*0.02]]){
    ctx.beginPath(); ctx.ellipse(hx,hy,hr,hr*0.7,0,0,Math.PI*2); ctx.fill();
  }
  ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=Math.max(2,size*0.045); ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(size*0.18,-size*0.01); ctx.lineTo(size*0.55,-size*0.22); ctx.stroke();
  ctx.lineWidth=Math.max(1.5,size*0.03);
  ctx.beginPath(); ctx.moveTo(size*0.50,-size*0.20); ctx.lineTo(size*0.57,-size*0.23); ctx.stroke();
  ctx.fillStyle='#2a2a2a'; ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=Math.max(1,size*0.025);
  ctx.beginPath(); ctx.rect(size*0.28,-size*0.17,size*0.12,size*0.04); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(100,200,255,'+(0.5+0.3*Math.sin(t*3))+')';
  ctx.beginPath(); ctx.arc(size*0.34,-size*0.15,size*0.018,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function _drawEngineer(ctx, size, t, anim) {
  t = t||0; anim = anim||{};
  const lw=Math.max(1.5,size*0.038);
  const by = _charBodyY(anim, size);
  ctx.save(); ctx.translate(0, by);
  _humanBase(ctx, size, '#3a4248', '#2f8fa0', '#475a60', '#d4a870', anim);
  _fillR(ctx,size,'#2a1c10',-size*0.17,size*0.10,size*0.34,size*0.05,size*0.01);
  _fillR(ctx,size,'#9aa3af',-size*0.04,size*0.085,size*0.08,size*0.06,size*0.01);
  _eyes(ctx, size);
  ctx.strokeStyle='#2a1c10'; ctx.lineWidth=Math.max(1.2,size*0.03);
  for(const sx of [-0.075,0.075]){ ctx.beginPath(); ctx.arc(size*sx,-size*0.24,size*0.058,0,Math.PI*2); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(size*-0.017,-size*0.24); ctx.lineTo(size*0.017,-size*0.24); ctx.stroke();
  ctx.fillStyle='rgba(95,224,255,'+(0.30+0.18*Math.sin(t*3))+')';
  for(const sx of [-0.075,0.075]){ ctx.beginPath(); ctx.arc(size*sx,-size*0.24,size*0.046,0,Math.PI*2); ctx.fill(); }
  _fillE(ctx,size,'#e0b03a', 0,-size*0.36, size*0.20,size*0.05);
  ctx.beginPath(); ctx.ellipse(0,-size*0.38,size*0.17,size*0.14,0,Math.PI,Math.PI*2);
  ctx.fillStyle='#e0b03a'; ctx.fill(); ctx.strokeStyle='#2a1c10'; ctx.lineWidth=lw; ctx.stroke();
  ctx.save();
  ctx.translate(size*0.21,size*0.05); ctx.rotate(0.5+Math.sin(t*2)*0.08);
  ctx.fillStyle='#9aa3af'; ctx.strokeStyle='#2a1c10'; ctx.lineWidth=Math.max(1,size*0.025);
  ctx.beginPath(); ctx.roundRect(-size*0.025,-size*0.02,size*0.05,size*0.20,size*0.015); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0,-size*0.03,size*0.045,0.3,Math.PI*2-0.3); ctx.stroke();
  ctx.restore();
  ctx.fillStyle='rgba(255,255,255,'+(0.15+0.12*Math.sin(t*4))+')';
  ctx.beginPath(); ctx.arc(size*0.24,size*0.02,size*0.018,0,Math.PI*2); ctx.fill();
  ctx.restore();
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
    draw(ctx, size, t, anim) { _drawGianni(ctx, size, t, anim); }
  },
  {
    id: 'fortunato',
    name: 'Fortunato',
    desc: 'More lucky blocks, more RNG. Can one-tap any lucky block. Starts with 2 projectiles, can\'t take Splinter Shot.',
    rarity: 'epic',
    worldUnlock: null,
    gemPrice: 25,     // Character Shop only — no progression unlock
    baseStats: { maxHp:70, speed:270, fireRate:0.46, dmg:12, gearDmgMul:1.0 },
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
    draw(ctx, size, t, anim) { _drawFortunato(ctx, size, t, anim); }
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
    draw(ctx, size, t, anim) { _drawZioSchermo(ctx, size, t, anim); }
  },
  {
    id: 'il_professore',
    name: 'Il Professore',
    desc: 'XP range x2. Start each wave 20% full. Draw 4 cards at level-up.',
    rarity: 'world',
    worldUnlock: 8,   // World 9
    baseStats: { magnet:180 },
    register() {
      onHook('waveStart', () => {
        if(typeof P!=='undefined') P.xp+=P.xpNext*0.20;
      });
    },
    draw(ctx, size, t, anim) { _drawIlProfessore(ctx, size, t, anim); }
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
    draw(ctx, size, t, anim) { _drawFantasma(ctx, size, t, anim); }
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
    draw(ctx, size, t, anim) { _drawIlCecchino(ctx, size, t, anim); }
  },
  {
    id: 'soldier',
    name: 'Soldier',
    desc: 'Fast, solid bullets, can\'t aim while moving.',
    rarity: 'challenger',
    chalWorldUnlock: 1,   // unlocked by beating Challenger World 1
    baseStats: { speed: 320 },   // base 260 + soldier's flat speed bonus
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
    draw(ctx, size, t, anim) { _drawSoldier(ctx, size, t, anim); }
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
    draw(ctx, size, t, anim) { _drawIlSaggio(ctx, size, t, anim); }
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
    draw(ctx, size, t, anim) { _drawIlCampione(ctx, size, t, anim); }
  },
  {
    id: 'engineer',
    name: 'Engineer',
    desc: 'Fires no bullets of his own. Starts with 2 turrets that share all his stats. Dash places a stationary turret instead.',
    rarity: 'epic',
    worldUnlock: null,
    gemPrice: 15,     // Character Shop only — no progression unlock
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
    draw(ctx, size, t, anim) { _drawEngineer(ctx, size, t, anim); }
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

// Builds the small per-frame animation-state object passed to character draw() functions:
// walkPhase (leg/arm swing), moving, firePulse (recoil right after a shot), hitPulse (stagger
// right after taking damage) — derived from live player state so every character can react to
// the same events without each draw() needing to know about P's internals.
function _playerAnim() {
  if(typeof P==='undefined') return {walkPhase:0, moving:false, firePulse:0, hitPulse:0, t:0};
  let firePulse=0;
  if(P.fireRate>0 && P.fireCd!=null){
    const cd=P.fireRate, R=Math.min(0.12,cd*0.3);
    if(cd-P.fireCd<=R) firePulse = 1-(cd-P.fireCd)/R;
  }
  const hitPulse = P.hitT>0 ? P.hitT/0.25 : 0;
  const t = typeof elapsed!=='undefined' ? elapsed : 0;
  return { walkPhase:P.walk||0, moving:!!P.moving, firePulse, hitPulse, t };
}

function drawCharacter(charId, x, y, size, bob, flip) {
  const char = CHARACTERS.find(c=>c.id===charId);
  const anim = _playerAnim();
  if(!char||!char.draw){
    if(typeof drawSprite==='function') drawSprite('player',x,y,size,bob,0,0,flip,null,anim.firePulse-anim.hitPulse*0.6);
    return;
  }
  const ctx = typeof cx!=='undefined' ? cx : null;
  if(!ctx) return;
  ctx.save();
  ctx.translate(x,y);
  if(flip) ctx.scale(-1,1);
  ctx.rotate(bob||0);
  const elapsed_ = typeof elapsed!=='undefined' ? elapsed : 0;
  char.draw(ctx, size, elapsed_, anim);
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
