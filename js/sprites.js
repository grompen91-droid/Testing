'use strict';
// ============ SPRITE FACTORY (pre-rendered vector assets) ============
const OUT = '#33272a';           // outline color used across all sprites
const SP = {};                   // sprite canvases
const SPW = {};                  // white flash versions
function makeSprite(name, size, draw){
  const PAD = 1.3; // 30% padding on each side so drawings up to ±65u don't get clipped
  const full = Math.round(size * PAD);
  const c = document.createElement('canvas'); c.width=full; c.height=full;
  c._nom = size;                // nominal size for drawSprite to compensate
  const g = c.getContext('2d');
  g.translate(full/2, full/2); g.lineJoin='round'; g.lineCap='round';
  draw(g, size/100);            // u = size/100 unit scale (unchanged)
  SP[name] = c;
  const w = document.createElement('canvas'); w.width=full; w.height=full;
  const wg = w.getContext('2d');
  wg.drawImage(c,0,0); wg.globalCompositeOperation='source-in'; wg.fillStyle='#fff'; wg.fillRect(0,0,full,full);
  SPW[name] = w;
  return c;
}
function sh(g, fill, lw, path){
  g.beginPath(); path(g);
  if(fill){ g.fillStyle=fill; g.fill(); }
  if(lw){ g.strokeStyle=OUT; g.lineWidth=lw; g.stroke(); }
}
function dot(g,x,y,r,c){ g.fillStyle=c; g.beginPath(); g.arc(x,y,r,0,TAU); g.fill(); }
function eyes(g,u,sx,sy,sp,rr){
  for(const s of [-1,1]){
    dot(g, sx+s*sp, sy, rr, '#fff');
    g.strokeStyle=OUT; g.lineWidth=1.4*u; g.beginPath(); g.arc(sx+s*sp,sy,rr,0,TAU); g.stroke();
    dot(g, sx+s*sp+rr*0.2, sy+rr*0.1, rr*0.5, OUT);
  }
}

const TINTED = {};
function tintedSprite(name, tint){
  const key=name+'|'+tint; if(TINTED[key]) return TINTED[key];
  const src=SP[name]; if(!src) return null;
  const c=document.createElement('canvas'); c.width=src.width; c.height=src.height;
  c._nom=src._nom;              // propagate nominal size so drawSprite can compensate
  const g=c.getContext('2d'); g.drawImage(src,0,0);
  g.globalCompositeOperation='source-atop'; g.globalAlpha=0.42; g.fillStyle=tint;
  g.fillRect(0,0,c.width,c.height);
  TINTED[key]=c; return c;
}

// ---- Player: cool cartoon survivor with shades ----
makeSprite('player', 128, (g,u)=>{
  sh(g,'#3f6fae',3*u,(g)=>{ g.roundRect(-12*u,16*u,9*u,20*u,4*u); });
  sh(g,'#3f6fae',3*u,(g)=>{ g.roundRect(3*u,16*u,9*u,20*u,4*u); });
  sh(g,'#e8e3d6',3.4*u,(g)=>{ g.roundRect(-16*u,-8*u,32*u,30*u,12*u); });
  sh(g,'#e0c39a',3*u,(g)=>{ g.roundRect(-22*u,-2*u,9*u,18*u,4*u); });
  sh(g,'#e0c39a',3*u,(g)=>{ g.roundRect(13*u,-2*u,9*u,18*u,4*u); });
  sh(g,'#f0c9a0',3.4*u,(g)=>{ g.ellipse(0,-24*u,16*u,15*u,0,0,TAU); });
  sh(g,'#3a2d22',0,(g)=>{ g.ellipse(0,-33*u,15*u,8*u,0,Math.PI,TAU); });
  sh(g,'#3a2d22',0,(g)=>{ g.rect(-15*u,-34*u,30*u,6*u); });
  sh(g,OUT,0,(g)=>{ g.roundRect(-13*u,-27*u,11*u,8*u,2*u); });
  sh(g,OUT,0,(g)=>{ g.roundRect(2*u,-27*u,11*u,8*u,2*u); });
  sh(g,OUT,2*u,(g)=>{ g.moveTo(-2*u,-23*u); g.lineTo(2*u,-23*u); });
  dot(g,-9*u,-24*u,1.6*u,'#9fd0ff');
  g.strokeStyle=OUT; g.lineWidth=2.2*u; g.beginPath(); g.arc(0,-18*u,5*u,0.15,Math.PI-0.15); g.stroke();
});

// ---- Gear silhouettes: drawn in player-canvas space so they overlay the survivor.
//      Base is light gray; tintedSprite() recolors them per rarity at draw time. ----
const GEARBASE='#cdd2d9';
// Helmet: dome over the head (head center ~0,-24u) + brim + crest stud.
makeSprite('gear_helmet', 128, (g,u)=>{
  sh(g,GEARBASE,3*u,(g)=>{ g.moveTo(-18*u,-24*u); g.arc(0,-24*u,18*u,Math.PI,0,true); g.closePath(); });
  sh(g,'#b7bdc6',2.6*u,(g)=>{ g.roundRect(-20*u,-25*u,40*u,6*u,3*u); });   // brim
  dot(g,0,-40*u,2.6*u,'#eef1f5');                                          // crest stud
});
// Chestplate: plate over the torso (torso ~ -16u..16u x, -8u..22u y) + shoulders + seam.
makeSprite('gear_chest', 128, (g,u)=>{
  sh(g,GEARBASE,3.2*u,(g)=>{ g.roundRect(-18*u,-9*u,36*u,31*u,10*u); });
  sh(g,'#b7bdc6',2.8*u,(g)=>{ g.ellipse(-16*u,-6*u,7*u,6*u,0,0,TAU); });   // L shoulder
  sh(g,'#b7bdc6',2.8*u,(g)=>{ g.ellipse(16*u,-6*u,7*u,6*u,0,0,TAU); });    // R shoulder
  g.strokeStyle=OUT; g.lineWidth=2*u; g.beginPath(); g.moveTo(0,-6*u); g.lineTo(0,20*u); g.stroke();
});
// Pants: cover the two legs (legs ~ y16u..36u) + belt across the top.
makeSprite('gear_pants', 128, (g,u)=>{
  sh(g,'#b7bdc6',3*u,(g)=>{ g.roundRect(-15*u,13*u,30*u,7*u,3*u); });      // belt
  sh(g,GEARBASE,3*u,(g)=>{ g.roundRect(-14*u,17*u,11*u,17*u,4*u); });
  sh(g,GEARBASE,3*u,(g)=>{ g.roundRect(3*u,17*u,11*u,17*u,4*u); });
});
// Shoes: chunky boots at the feet (~ y30u..40u).
makeSprite('gear_shoes', 128, (g,u)=>{
  sh(g,GEARBASE,3*u,(g)=>{ g.roundRect(-15*u,31*u,13*u,9*u,3*u); });
  sh(g,GEARBASE,3*u,(g)=>{ g.roundRect(2*u,31*u,13*u,9*u,3*u); });
  sh(g,'#b7bdc6',2.4*u,(g)=>{ g.rect(-15*u,37*u,13*u,3*u); });            // L sole
  sh(g,'#b7bdc6',2.4*u,(g)=>{ g.rect(2*u,37*u,13*u,3*u); });             // R sole
});

// ============================================================
// BOSSES (iconic)
// ============================================================

// ---- Tralalero Tralala: three-legged blue shark in Nike sneakers ----
makeSprite('tralalero', 120, (g,u)=>{
  sh(g,'#2f7fb8',3.6*u,(g)=>{ g.moveTo(34*u,-2*u); g.lineTo(48*u,-14*u); g.lineTo(46*u,8*u); g.closePath(); });
  sh(g,'#3f9bd6',3.6*u,(g)=>{ g.ellipse(2*u,-2*u,34*u,20*u,0,0,TAU); });
  sh(g,'#dfeef7',0,(g)=>{ g.ellipse(0,6*u,26*u,11*u,0,0,Math.PI); });
  sh(g,'#2f7fb8',3*u,(g)=>{ g.moveTo(-4*u,-20*u); g.lineTo(6*u,-34*u); g.lineTo(14*u,-20*u); g.closePath(); });
  sh(g,'#23435a',2.6*u,(g)=>{ g.moveTo(-34*u,2*u); g.lineTo(-12*u,2*u); g.lineTo(-14*u,12*u); g.lineTo(-32*u,10*u); g.closePath(); });
  for(let i=0;i<4;i++){ sh(g,'#fff',1*u,(g)=>{ g.moveTo(-32*u+i*5*u,3*u); g.lineTo(-29*u+i*5*u,8*u); g.lineTo(-26*u+i*5*u,3*u); g.closePath(); }); }
  eyes(g,u,-16*u,-9*u,7*u,4*u);
  for(const lx of [-8,8,24]){ sh(g,'#fff',2.4*u,(g)=>{ g.roundRect((lx-6)*u,16*u,14*u,8*u,4*u); }); sh(g,'#e54d4d',1.6*u,(g)=>{ g.rect((lx-6)*u,21*u,14*u,3*u); }); }
});

// ---- Bombardiro Crocodilo: croc-headed bomber plane ----
makeSprite('crocodilo', 120, (g,u)=>{
  sh(g,'#6a7a52',3.4*u,(g)=>{ g.moveTo(-6*u,-4*u); g.lineTo(-30*u,-22*u); g.lineTo(-26*u,-2*u); g.closePath(); });
  sh(g,'#6a7a52',3.4*u,(g)=>{ g.moveTo(-6*u,4*u); g.lineTo(-30*u,22*u); g.lineTo(-26*u,2*u); g.closePath(); });
  sh(g,'#4f5d3c',3.6*u,(g)=>{ g.ellipse(-2*u,0,30*u,15*u,0,0,TAU); });
  sh(g,'#3a4530',2.6*u,(g)=>{ g.ellipse(-26*u,0,4*u,8*u,0,0,TAU); });
  sh(g,'#5f9e4a',3.4*u,(g)=>{ g.ellipse(26*u,-3*u,16*u,13*u,0,0,TAU); });
  sh(g,'#5f9e4a',3*u,(g)=>{ g.moveTo(34*u,-4*u); g.lineTo(50*u,-1*u); g.lineTo(50*u,7*u); g.lineTo(34*u,8*u); g.closePath(); });
  sh(g,'#fff',0,(g)=>{ g.rect(36*u,4*u,13*u,3*u); });
  for(let i=0;i<5;i++){ sh(g,OUT,0.8*u,(g)=>{ g.moveTo(37*u+i*2.6*u,4*u); g.lineTo(38*u+i*2.6*u,7*u); }); }
  eyes(g,u,26*u,-12*u,5*u,3.4*u);
});

// ---- Tung Tung Tung Sahur: wooden mallet creature with a bat ----
makeSprite('sahur', 130, (g,u)=>{
  // legs
  sh(g,'#7a5230',3*u,(g)=>{ g.roundRect(-12*u,26*u,8*u,16*u,3*u); });
  sh(g,'#7a5230',3*u,(g)=>{ g.roundRect(4*u,26*u,8*u,16*u,3*u); });
  // wooden mallet body
  sh(g,'#a9763e',3.6*u,(g)=>{ g.roundRect(-16*u,-10*u,32*u,38*u,8*u); });
  sh(g,'#8a5d2c',2*u,(g)=>{ g.moveTo(-10*u,-6*u); g.lineTo(-10*u,24*u); });
  sh(g,'#8a5d2c',2*u,(g)=>{ g.moveTo(8*u,-6*u); g.lineTo(8*u,24*u); });
  // mallet head (top block)
  sh(g,'#b98248',3.6*u,(g)=>{ g.roundRect(-20*u,-30*u,40*u,22*u,5*u); });
  eyes(g,u,0,-20*u,9*u,4.5*u);
  g.strokeStyle=OUT; g.lineWidth=2.2*u; g.beginPath(); g.moveTo(-6*u,-12*u); g.lineTo(6*u,-12*u); g.stroke();
  // arm + baseball bat
  sh(g,'#a9763e',2.8*u,(g)=>{ g.roundRect(14*u,-4*u,8*u,16*u,3*u); });
  sh(g,'#c79a5a',3*u,(g)=>{ g.roundRect(20*u,-34*u,8*u,30*u,4*u); });
});

// ---- La Vaca Saturno Saturnita: cosmic cow with Saturn rings ----
makeSprite('vaca', 134, (g,u)=>{
  // Saturn ring (behind)
  g.save(); g.rotate(-0.35);
  sh(g,null,4*u,(g)=>{ g.ellipse(0,0,46*u,16*u,0,0,TAU); });
  g.strokeStyle='#d8b46a'; g.lineWidth=4*u; g.beginPath(); g.ellipse(0,0,46*u,16*u,0,0,TAU); g.stroke();
  g.restore();
  // cow body
  sh(g,'#f4f4f4',3.6*u,(g)=>{ g.ellipse(0,6*u,28*u,22*u,0,0,TAU); });
  sh(g,'#2b2b2b',0,(g)=>{ g.ellipse(-12*u,2*u,8*u,6*u,0.3,0,TAU); });
  sh(g,'#2b2b2b',0,(g)=>{ g.ellipse(13*u,12*u,7*u,5*u,-0.2,0,TAU); });
  // pink udder
  sh(g,'#f3a6bd',2.4*u,(g)=>{ g.ellipse(0,24*u,9*u,6*u,0,0,TAU); });
  // head + helmet dome
  sh(g,'#f4f4f4',3.4*u,(g)=>{ g.ellipse(0,-16*u,15*u,13*u,0,0,TAU); });
  sh(g,'#f3a6bd',2*u,(g)=>{ g.ellipse(0,-9*u,9*u,5*u,0,0,TAU); });   // snout
  dot(g,-4*u,-9*u,1.6*u,OUT); dot(g,4*u,-9*u,1.6*u,OUT);
  eyes(g,u,0,-19*u,5*u,3*u);
  sh(g,'#2b2b2b',0,(g)=>{ g.moveTo(-12*u,-26*u); g.lineTo(-16*u,-32*u); g.lineTo(-8*u,-27*u); g.closePath(); }); // horn
  sh(g,'#2b2b2b',0,(g)=>{ g.moveTo(12*u,-26*u); g.lineTo(16*u,-32*u); g.lineTo(8*u,-27*u); g.closePath(); });
  g.strokeStyle='rgba(180,220,255,0.8)'; g.lineWidth=2.4*u; g.beginPath(); g.arc(0,-16*u,20*u,Math.PI*1.05,Math.PI*1.95); g.stroke(); // glass dome
});

// ---- Gorillo Watermellondrillo: gorilla fused with watermelon ----
makeSprite('gorillo', 138, (g,u)=>{
  // arms
  sh(g,'#4a4a52',3.4*u,(g)=>{ g.roundRect(-40*u,-2*u,14*u,30*u,7*u); });
  sh(g,'#4a4a52',3.4*u,(g)=>{ g.roundRect(26*u,-2*u,14*u,30*u,7*u); });
  // watermelon belly
  sh(g,'#3f7d33',3.6*u,(g)=>{ g.ellipse(0,10*u,30*u,28*u,0,0,TAU); });
  for(let i=-2;i<=2;i++){ sh(g,'#2e5d24',1.6*u,(g)=>{ g.moveTo(i*9*u,-16*u); g.quadraticCurveTo(i*12*u,10*u,i*9*u,36*u); }); }
  // gorilla head + shoulders
  sh(g,'#4a4a52',3.6*u,(g)=>{ g.ellipse(0,-22*u,24*u,20*u,0,0,TAU); });
  sh(g,'#caa98f',2.6*u,(g)=>{ g.ellipse(0,-16*u,15*u,13*u,0,0,TAU); }); // face
  sh(g,'#caa98f',0,(g)=>{ g.ellipse(-22*u,-22*u,6*u,7*u,0,0,TAU); });   // ears
  sh(g,'#caa98f',0,(g)=>{ g.ellipse(22*u,-22*u,6*u,7*u,0,0,TAU); });
  eyes(g,u,0,-20*u,6*u,3.6*u);
  sh(g,'#7a5a48',2*u,(g)=>{ g.ellipse(-4*u,-11*u,2.4*u,3*u,0,0,TAU); });
  sh(g,'#7a5a48',2*u,(g)=>{ g.ellipse(4*u,-11*u,2.4*u,3*u,0,0,TAU); });
});

// ---- Trippi Troppi: glitched cat head on a shrimp body ----
makeSprite('trippi', 124, (g,u)=>{
  // glitch shards
  sh(g,'#5be0d0',0,(g)=>{ g.rect(-34*u,-30*u,10*u,5*u); });
  sh(g,'#ff5bd0',0,(g)=>{ g.rect(24*u,18*u,12*u,5*u); });
  // shrimp tail/body
  sh(g,'#f0824a',3.4*u,(g)=>{ g.moveTo(-6*u,8*u); g.quadraticCurveTo(34*u,4*u,30*u,30*u); g.quadraticCurveTo(20*u,30*u,18*u,22*u); g.quadraticCurveTo(8*u,26*u,-6*u,20*u); g.closePath(); });
  for(let i=0;i<4;i++){ sh(g,'#d96a36',1.4*u,(g)=>{ g.moveTo(4*u+i*7*u,10*u); g.lineTo(8*u+i*7*u,24*u); }); }
  for(const lx of [0,8,16]){ sh(g,'#f0824a',1.8*u,(g)=>{ g.moveTo(lx*u,18*u); g.lineTo(lx*u,30*u); }); }
  // cat head
  sh(g,'#cfa06a',3.2*u,(g)=>{ g.ellipse(-10*u,-12*u,17*u,15*u,0,0,TAU); });
  sh(g,'#cfa06a',0,(g)=>{ g.moveTo(-24*u,-22*u); g.lineTo(-26*u,-34*u); g.lineTo(-16*u,-24*u); g.closePath(); });
  sh(g,'#cfa06a',0,(g)=>{ g.moveTo(-2*u,-24*u); g.lineTo(0,-34*u); g.lineTo(6*u,-22*u); g.closePath(); });
  eyes(g,u,-10*u,-13*u,5*u,3.4*u);
  sh(g,'#e88aa0',0,(g)=>{ g.moveTo(-12*u,-7*u); g.lineTo(-8*u,-7*u); g.lineTo(-10*u,-4*u); g.closePath(); });
  g.strokeStyle=OUT; g.lineWidth=1.2*u;
  g.beginPath(); g.moveTo(-24*u,-9*u); g.lineTo(-16*u,-8*u); g.moveTo(-24*u,-5*u); g.lineTo(-16*u,-5*u); g.stroke();
});

// ============================================================
// ENEMIES
// ============================================================

// ---- Spijuniro Golubiro: spy pigeon with shades + earpiece ----
makeSprite('pigeon', 100, (g,u)=>{
  sh(g,'#9aa3b0',3*u,(g)=>{ g.moveTo(-30*u,-4*u); g.lineTo(-10*u,-12*u); g.lineTo(-12*u,6*u); g.closePath(); }); // wing
  sh(g,'#b6bdc7',3.2*u,(g)=>{ g.ellipse(2*u,4*u,24*u,16*u,0,0,TAU); });
  sh(g,'#c7ccd4',3*u,(g)=>{ g.ellipse(16*u,-12*u,13*u,12*u,0,0,TAU); }); // head
  sh(g,'#6fce6f',0,(g)=>{ g.ellipse(12*u,-16*u,6*u,4*u,0,0,TAU); }); // neck sheen
  sh(g,OUT,0,(g)=>{ g.roundRect(8*u,-15*u,16*u,7*u,2*u); }); // shades
  dot(g,21*u,-12*u,1.4*u,'#9fd0ff');
  sh(g,'#f0a23a',0,(g)=>{ g.moveTo(28*u,-12*u); g.lineTo(36*u,-10*u); g.lineTo(28*u,-7*u); g.closePath(); }); // beak
  dot(g,7*u,-9*u,2.4*u,'#222'); // earpiece
  sh(g,'#f0a23a',2*u,(g)=>{ g.moveTo(-2*u,18*u); g.lineTo(-2*u,26*u); }); sh(g,'#f0a23a',2*u,(g)=>{ g.moveTo(8*u,18*u); g.lineTo(8*u,26*u); });
});

// ---- Quacodillo Bombardiro: rubber duck bomber jet ----
makeSprite('duck', 100, (g,u)=>{
  sh(g,'#7d8a93',3*u,(g)=>{ g.moveTo(-6*u,2*u); g.lineTo(-30*u,-14*u); g.lineTo(-24*u,4*u); g.closePath(); }); // jet wing
  sh(g,'#7d8a93',3*u,(g)=>{ g.moveTo(-6*u,8*u); g.lineTo(-30*u,22*u); g.lineTo(-24*u,8*u); g.closePath(); });
  sh(g,'#f7d23a',3.4*u,(g)=>{ g.ellipse(-2*u,6*u,24*u,17*u,0,0,TAU); }); // body
  sh(g,'#f7d23a',3.2*u,(g)=>{ g.ellipse(16*u,-12*u,13*u,12*u,0,0,TAU); }); // head
  sh(g,'#f0922a',0,(g)=>{ g.moveTo(26*u,-10*u); g.lineTo(38*u,-9*u); g.lineTo(26*u,-4*u); g.closePath(); }); // beak
  eyes(g,u,17*u,-14*u,5*u,3*u);
  sh(g,'#4f5d3c',2.4*u,(g)=>{ g.ellipse(-22*u,12*u,6*u,9*u,0,0,TAU); }); // bomb tail
});

// ---- Chimpanzini Bananini: chimp + banana ----
makeSprite('chimp', 104, (g,u)=>{
  sh(g,'#f4d24a',3.4*u,(g)=>{ g.moveTo(-14*u,-18*u); g.quadraticCurveTo(28*u,-6*u,16*u,34*u); g.quadraticCurveTo(2*u,30*u,-8*u,18*u); g.quadraticCurveTo(-22*u,0,-14*u,-18*u); g.closePath(); }); // banana body
  sh(g,'#7a5a44',3*u,(g)=>{ g.roundRect(-20*u,6*u,9*u,20*u,4*u); }); // arm
  sh(g,'#7a5a44',3.2*u,(g)=>{ g.ellipse(-2*u,-20*u,15*u,13*u,0,0,TAU); }); // head
  sh(g,'#7a5a44',0,(g)=>{ g.ellipse(-16*u,-22*u,5*u,6*u,0,0,TAU); }); sh(g,'#7a5a44',0,(g)=>{ g.ellipse(12*u,-22*u,5*u,6*u,0,0,TAU); });
  sh(g,'#e3c9a8',0,(g)=>{ g.ellipse(-2*u,-16*u,9*u,8*u,0,0,TAU); }); // muzzle
  eyes(g,u,-2*u,-24*u,5*u,3.2*u);
  dot(g,-5*u,-13*u,1.4*u,OUT); dot(g,1*u,-13*u,1.4*u,OUT);
});

// ---- Penguino Cocosino: coconut-shell penguin ----
makeSprite('penguin', 102, (g,u)=>{
  sh(g,'#8a5a32',3.4*u,(g)=>{ g.ellipse(0,8*u,22*u,24*u,0,0,TAU); }); // coconut body
  dot(g,-8*u,6*u,2.4*u,'#5e3b1e'); dot(g,8*u,6*u,2.4*u,'#5e3b1e'); dot(g,0,16*u,2.4*u,'#5e3b1e');
  sh(g,'#2b2b32',3.2*u,(g)=>{ g.ellipse(0,-16*u,15*u,14*u,0,0,TAU); }); // head
  sh(g,'#f4f4f4',0,(g)=>{ g.ellipse(0,-12*u,10*u,9*u,0,0,TAU); }); // face white
  sh(g,'#f0a23a',0,(g)=>{ g.moveTo(-4*u,-10*u); g.lineTo(4*u,-10*u); g.lineTo(0,-5*u); g.closePath(); }); // beak
  eyes(g,u,0,-15*u,4.5*u,3*u);
  sh(g,'#2b2b32',2.4*u,(g)=>{ g.ellipse(-22*u,6*u,5*u,12*u,0.3,0,TAU); }); sh(g,'#2b2b32',2.4*u,(g)=>{ g.ellipse(22*u,6*u,5*u,12*u,-0.3,0,TAU); });
});

// ---- Flamingulli-gulli-gulli: loopy-neck flamingo ----
makeSprite('flamingo', 108, (g,u)=>{
  sh(g,'#f58fb5',3.2*u,(g)=>{ g.ellipse(-4*u,12*u,18*u,15*u,0,0,TAU); }); // body
  g.strokeStyle='#f58fb5'; g.lineWidth=7*u; g.beginPath(); // loopy neck
  g.moveTo(6*u,4*u); g.bezierCurveTo(30*u,-6*u,-6*u,-14*u,12*u,-26*u); g.stroke();
  g.strokeStyle=OUT; g.lineWidth=2*u; g.stroke();
  sh(g,'#f58fb5',2.6*u,(g)=>{ g.ellipse(14*u,-30*u,8*u,7*u,0,0,TAU); }); // head
  sh(g,'#222',0,(g)=>{ g.moveTo(20*u,-30*u); g.lineTo(30*u,-27*u); g.lineTo(20*u,-25*u); g.closePath(); }); // beak
  eyes(g,u,15*u,-31*u,3.4*u,2.4*u);
  sh(g,'#e07aa0',2*u,(g)=>{ g.moveTo(-6*u,26*u); g.lineTo(-6*u,38*u); }); sh(g,'#e07aa0',2*u,(g)=>{ g.moveTo(4*u,26*u); g.lineTo(4*u,38*u); });
});

// ---- Cappuccino Assassino: coffee-mug ninja with knife limbs ----
makeSprite('cappuccino', 106, (g,u)=>{
  sh(g,'#cfd2d8',2.2*u,(g)=>{ g.moveTo(-18*u,4*u); g.lineTo(-30*u,16*u); }); // knife arm
  sh(g,'#cfd2d8',2.2*u,(g)=>{ g.moveTo(18*u,4*u); g.lineTo(30*u,16*u); });
  sh(g,'#cfd2d8',2.2*u,(g)=>{ g.moveTo(-8*u,22*u); g.lineTo(-12*u,36*u); }); // knife legs
  sh(g,'#cfd2d8',2.2*u,(g)=>{ g.moveTo(8*u,22*u); g.lineTo(12*u,36*u); });
  sh(g,'#f3ece0',3.6*u,(g)=>{ g.moveTo(-18*u,-8*u); g.lineTo(18*u,-8*u); g.lineTo(14*u,20*u); g.lineTo(-14*u,20*u); g.closePath(); }); // cup
  sh(g,'#f3ece0',3*u,(g)=>{ g.arc(20*u,4*u,8*u,-1.2,1.2); }); // handle
  sh(g,'#5b3a22',2.6*u,(g)=>{ g.ellipse(0,-9*u,18*u,6*u,0,0,TAU); });
  sh(g,'#222',0,(g)=>{ g.rect(-14*u,-4*u,28*u,7*u); }); // ninja mask band
  eyes(g,u,0,0,6*u,3.2*u);
});

// ---- Ballerina Cappuccina: cappuccino-head ballerina ----
makeSprite('ballerina', 110, (g,u)=>{
  sh(g,'#f0c9a0',2.6*u,(g)=>{ g.roundRect(-3*u,6*u,6*u,16*u,3*u); }); // torso/legs
  sh(g,'#f58fb5',3*u,(g)=>{ g.moveTo(-18*u,20*u); g.lineTo(18*u,20*u); g.lineTo(10*u,8*u); g.lineTo(-10*u,8*u); g.closePath(); }); // tutu
  sh(g,'#f0c9a0',2.4*u,(g)=>{ g.moveTo(-4*u,28*u); g.lineTo(-7*u,40*u); }); sh(g,'#f0c9a0',2.4*u,(g)=>{ g.moveTo(4*u,28*u); g.lineTo(7*u,40*u); });
  sh(g,'#f3ece0',3.4*u,(g)=>{ g.moveTo(-16*u,-22*u); g.lineTo(16*u,-22*u); g.lineTo(12*u,2*u); g.lineTo(-12*u,2*u); g.closePath(); }); // cup head
  sh(g,'#f3ece0',2.6*u,(g)=>{ g.arc(18*u,-10*u,7*u,-1.2,1.2); });
  sh(g,'#5b3a22',2.4*u,(g)=>{ g.ellipse(0,-22*u,16*u,5*u,0,0,TAU); });
  sh(g,'#e8d8c0',0,(g)=>{ g.ellipse(-4*u,-23*u,7*u,3*u,0,0,TAU); });
  eyes(g,u,0,-10*u,6*u,3.4*u);
});

// ---- Svinino Bombondino: hard-candy pig ----
makeSprite('candypig', 104, (g,u)=>{
  sh(g,'#f49ad0',0,(g)=>{ g.moveTo(-22*u,-8*u); g.lineTo(-34*u,-16*u); g.lineTo(-32*u,2*u); g.closePath(); }); // wrapper twist
  sh(g,'#f49ad0',0,(g)=>{ g.moveTo(22*u,-8*u); g.lineTo(34*u,-16*u); g.lineTo(32*u,2*u); g.closePath(); });
  sh(g,'#f7a8d6',3.6*u,(g)=>{ g.ellipse(0,2*u,24*u,20*u,0,0,TAU); }); // candy body
  sh(g,'#ffd0ea',0,(g)=>{ g.ellipse(-7*u,-5*u,7*u,5*u,0,0,TAU); }); // shine
  sh(g,'#e87ab0',0,(g)=>{ g.ellipse(0,8*u,9*u,7*u,0,0,TAU); }); // snout
  dot(g,-3*u,8*u,1.6*u,OUT); dot(g,3*u,8*u,1.6*u,OUT);
  sh(g,'#f7a8d6',0,(g)=>{ g.moveTo(-16*u,-14*u); g.lineTo(-20*u,-24*u); g.lineTo(-10*u,-18*u); g.closePath(); }); // ears
  sh(g,'#f7a8d6',0,(g)=>{ g.moveTo(16*u,-14*u); g.lineTo(20*u,-24*u); g.lineTo(10*u,-18*u); g.closePath(); });
  eyes(g,u,0,-6*u,7*u,3.6*u);
});

// ---- Castori Gangsteri: mobster beaver ----
makeSprite('beaver', 108, (g,u)=>{
  sh(g,'#7a5230',3.2*u,(g)=>{ g.ellipse(-26*u,16*u,16*u,8*u,0.3,0,TAU); }); // flat tail
  sh(g,'#8a5f38',3.4*u,(g)=>{ g.roundRect(-16*u,-6*u,32*u,30*u,8*u); }); // body
  sh(g,'#3a3a44',0,(g)=>{ g.rect(-16*u,-6*u,32*u,12*u); }); // pinstripe vest
  for(let i=-2;i<=2;i++) sh(g,'#cfcfd8',0.8*u,(g)=>{ g.moveTo(i*6*u,-6*u); g.lineTo(i*6*u,6*u); });
  sh(g,'#9a6b40',3.2*u,(g)=>{ g.ellipse(0,-18*u,15*u,13*u,0,0,TAU); }); // head
  sh(g,'#2b2b32',0,(g)=>{ g.ellipse(0,-30*u,16*u,5*u,0,0,TAU); }); // fedora brim
  sh(g,'#2b2b32',0,(g)=>{ g.roundRect(-9*u,-40*u,18*u,12*u,3*u); }); // fedora top
  eyes(g,u,0,-19*u,5*u,3*u);
  sh(g,'#fff',1*u,(g)=>{ g.rect(-4*u,-10*u,8*u,5*u); }); // buck teeth
});

// ---- Crocodillo Ananasinno: pineapple croc ----
makeSprite('pinecroc', 110, (g,u)=>{
  sh(g,'#5f9e4a',0,(g)=>{ g.moveTo(-6*u,-18*u); g.lineTo(-12*u,-34*u); g.lineTo(-2*u,-22*u); g.closePath(); }); // leaves
  sh(g,'#5f9e4a',0,(g)=>{ g.moveTo(6*u,-18*u); g.lineTo(12*u,-34*u); g.lineTo(2*u,-22*u); g.closePath(); });
  sh(g,'#5f9e4a',0,(g)=>{ g.moveTo(0,-18*u); g.lineTo(0,-38*u); g.lineTo(6*u,-22*u); g.closePath(); });
  sh(g,'#e9b73a',3.6*u,(g)=>{ g.ellipse(0,4*u,24*u,26*u,0,0,TAU); }); // pineapple body
  g.strokeStyle='#b8882a'; g.lineWidth=1.4*u;
  for(let i=-2;i<=2;i++){ g.beginPath(); g.moveTo(-22*u,i*7*u); g.lineTo(22*u,i*7*u+6*u); g.stroke(); g.beginPath(); g.moveTo(i*8*u-6*u,-18*u); g.lineTo(i*8*u+6*u,26*u); g.stroke(); }
  sh(g,'#5f9e4a',2.8*u,(g)=>{ g.ellipse(0,-12*u,14*u,9*u,0,0,TAU); }); // croc snout
  sh(g,'#fff',0,(g)=>{ g.rect(-10*u,-9*u,20*u,3*u); });
  eyes(g,u,0,-18*u,5*u,3*u);
});

// ---- Blueberrinni Octopussini: blueberry octopus ----
makeSprite('octopus', 108, (g,u)=>{
  for(let i=-3;i<=3;i++){ sh(g,'#4350c8',2.2*u,(g)=>{ g.moveTo(i*6*u,12*u); g.quadraticCurveTo(i*9*u,30*u,i*7*u,34*u); }); }
  sh(g,'#5566e0',3.4*u,(g)=>{ g.ellipse(0,-4*u,24*u,22*u,0,0,TAU); }); // head
  for(const [x,y] of [[-12,-10],[10,-12],[-6,6],[12,4],[0,-2]]) sh(g,'#6f7df0',0,(g)=>{ g.ellipse(x*u,y*u,6*u,6*u,0,0,TAU); }); // berry bumps
  eyes(g,u,0,-4*u,8*u,4.4*u);
});

// ---- Graipussi Medussi: grapefruit jellyfish ----
makeSprite('jelly', 106, (g,u)=>{
  for(let i=-3;i<=3;i++){ g.strokeStyle='#c777b0'; g.lineWidth=2.4*u; g.beginPath(); g.moveTo(i*6*u,8*u); g.quadraticCurveTo(i*6*u+4*u,26*u,i*6*u,34*u); g.stroke(); }
  sh(g,'#d97fc0',3.4*u,(g)=>{ g.arc(0,4*u,24*u,Math.PI,TAU); g.lineTo(-24*u,8*u); g.lineTo(24*u,8*u); }); // grapefruit dome
  sh(g,'#f0a8d8',0,(g)=>{ g.ellipse(-7*u,-6*u,7*u,4*u,0,0,TAU); });
  eyes(g,u,0,-4*u,7*u,4*u);
});

// ---- Bombombini Gusini: bomber goose ----
makeSprite('goose', 108, (g,u)=>{
  sh(g,'#8a96a0',3*u,(g)=>{ g.moveTo(-6*u,2*u); g.lineTo(-32*u,-12*u); g.lineTo(-26*u,4*u); g.closePath(); }); // jet wings
  sh(g,'#8a96a0',3*u,(g)=>{ g.moveTo(-6*u,8*u); g.lineTo(-32*u,22*u); g.lineTo(-26*u,8*u); g.closePath(); });
  sh(g,'#f4f4f4',3.4*u,(g)=>{ g.ellipse(-2*u,6*u,24*u,16*u,0,0,TAU); }); // body
  g.strokeStyle='#f4f4f4'; g.lineWidth=8*u; g.beginPath(); g.moveTo(12*u,-2*u); g.quadraticCurveTo(26*u,-10*u,18*u,-22*u); g.stroke();
  g.strokeStyle=OUT; g.lineWidth=2*u; g.stroke();
  sh(g,'#f4f4f4',2.6*u,(g)=>{ g.ellipse(20*u,-24*u,8*u,7*u,0,0,TAU); }); // head
  sh(g,'#f0922a',0,(g)=>{ g.moveTo(26*u,-24*u); g.lineTo(36*u,-22*u); g.lineTo(26*u,-19*u); g.closePath(); });
  eyes(g,u,21*u,-25*u,3.4*u,2.4*u);
  sh(g,'#4f5d3c',2.2*u,(g)=>{ g.ellipse(-4*u,16*u,7*u,9*u,0,0,TAU); }); // bomb
});

// ---- Espressona Signora: espresso-cup ballerina (dark sister) ----
makeSprite('espresso', 110, (g,u)=>{
  sh(g,'#5b3a22',2.6*u,(g)=>{ g.roundRect(-3*u,6*u,6*u,16*u,3*u); });
  sh(g,'#c77da0',3*u,(g)=>{ g.moveTo(-16*u,20*u); g.lineTo(16*u,20*u); g.lineTo(9*u,8*u); g.lineTo(-9*u,8*u); g.closePath(); });
  sh(g,'#5b3a22',2.4*u,(g)=>{ g.moveTo(-4*u,28*u); g.lineTo(-7*u,40*u); }); sh(g,'#5b3a22',2.4*u,(g)=>{ g.moveTo(4*u,28*u); g.lineTo(7*u,40*u); });
  sh(g,'#d8c2a0',3.4*u,(g)=>{ g.moveTo(-14*u,-22*u); g.lineTo(14*u,-22*u); g.lineTo(11*u,2*u); g.lineTo(-11*u,2*u); g.closePath(); }); // small espresso cup
  sh(g,'#d8c2a0',2.4*u,(g)=>{ g.arc(16*u,-10*u,6*u,-1.2,1.2); });
  sh(g,'#3a2414',2.4*u,(g)=>{ g.ellipse(0,-22*u,14*u,5*u,0,0,TAU); });
  eyes(g,u,0,-10*u,6*u,3.4*u);
});

// ---- Orangutini Ananasini: pineapple orangutan ----
makeSprite('orangutan', 116, (g,u)=>{
  sh(g,'#d36a2a',3.2*u,(g)=>{ g.roundRect(-34*u,-8*u,12*u,32*u,6*u); }); // long arm
  sh(g,'#d36a2a',3.2*u,(g)=>{ g.roundRect(22*u,-8*u,12*u,32*u,6*u); });
  sh(g,'#5f9e4a',0,(g)=>{ g.moveTo(-4*u,-16*u); g.lineTo(-10*u,-32*u); g.lineTo(0,-20*u); g.closePath(); }); // pineapple leaves
  sh(g,'#5f9e4a',0,(g)=>{ g.moveTo(4*u,-16*u); g.lineTo(10*u,-32*u); g.lineTo(0,-20*u); g.closePath(); });
  sh(g,'#e9b73a',3.6*u,(g)=>{ g.ellipse(0,8*u,22*u,22*u,0,0,TAU); }); // pineapple torso
  g.strokeStyle='#b8882a'; g.lineWidth=1.2*u;
  for(let i=-2;i<=2;i++){ g.beginPath(); g.moveTo(-20*u,i*7*u+4*u); g.lineTo(20*u,i*7*u+10*u); g.stroke(); }
  sh(g,'#d36a2a',3*u,(g)=>{ g.ellipse(0,-14*u,15*u,12*u,0,0,TAU); }); // face
  sh(g,'#f0d8b8',0,(g)=>{ g.ellipse(0,-11*u,9*u,8*u,0,0,TAU); });
  eyes(g,u,0,-16*u,5*u,3*u);
});

// ---- Rhino Toasterino: rhino with toaster torso ----
makeSprite('rhino', 116, (g,u)=>{
  sh(g,'#9a9aa6',3*u,(g)=>{ g.roundRect(-16*u,24*u,9*u,14*u,3*u); }); sh(g,'#9a9aa6',3*u,(g)=>{ g.roundRect(7*u,24*u,9*u,14*u,3*u); });
  sh(g,'#c7ccd4',3.6*u,(g)=>{ g.roundRect(-22*u,-6*u,44*u,32*u,6*u); }); // chrome toaster
  sh(g,'#9aa0aa',0,(g)=>{ g.roundRect(-14*u,-4*u,10*u,5*u,2*u); }); sh(g,'#9aa0aa',0,(g)=>{ g.roundRect(4*u,-4*u,10*u,5*u,2*u); }); // slots
  sh(g,'#e8b96a',2.4*u,(g)=>{ g.roundRect(-12*u,-16*u,8*u,12*u,2*u); }); sh(g,'#e8b96a',2.4*u,(g)=>{ g.roundRect(6*u,-16*u,8*u,12*u,2*u); }); // toast
  sh(g,'#9a9aa6',3.2*u,(g)=>{ g.ellipse(20*u,-2*u,15*u,13*u,0,0,TAU); }); // rhino head
  sh(g,'#cfcfd8',0,(g)=>{ g.moveTo(30*u,-6*u); g.lineTo(40*u,-14*u); g.lineTo(33*u,-2*u); g.closePath(); }); // horn
  eyes(g,u,18*u,-4*u,5*u,3*u);
});

// ---- Il Cacto Hipopotamo: cactus-needle hippo ----
makeSprite('hippo', 120, (g,u)=>{
  sh(g,'#6fa84a',3.6*u,(g)=>{ g.ellipse(0,4*u,30*u,24*u,0,0,TAU); }); // body
  g.strokeStyle='#3f6d28'; g.lineWidth=1.6*u;
  for(let a=0;a<TAU;a+=TAU/16){ const x=Math.cos(a)*30*u, y=4*u+Math.sin(a)*24*u; g.beginPath(); g.moveTo(x*0.85,y*0.92); g.lineTo(x*1.12,(y-4*u)*1.05+4*u*0.0); g.stroke(); }
  sh(g,'#7ab955',3*u,(g)=>{ g.ellipse(-18*u,8*u,12*u,9*u,0,0,TAU); }); // snout
  dot(g,-22*u,8*u,1.8*u,OUT); dot(g,-15*u,8*u,1.8*u,OUT);
  sh(g,'#7ab955',0,(g)=>{ g.ellipse(8*u,-18*u,6*u,5*u,0,0,TAU); }); sh(g,'#7ab955',0,(g)=>{ g.ellipse(-2*u,-20*u,6*u,5*u,0,0,TAU); }); // ears
  eyes(g,u,3*u,-12*u,8*u,4*u);
});

// ---- Frigo Camelo: camel with a fridge for a hump/body ----
makeSprite('camel', 118, (g,u)=>{
  sh(g,'#c79a5a',3*u,(g)=>{ g.roundRect(-16*u,22*u,8*u,16*u,3*u); }); sh(g,'#c79a5a',3*u,(g)=>{ g.roundRect(8*u,22*u,8*u,16*u,3*u); });
  sh(g,'#eef0f2',3.6*u,(g)=>{ g.roundRect(-20*u,-18*u,38*u,42*u,5*u); }); // fridge
  sh(g,OUT,2*u,(g)=>{ g.moveTo(-20*u,0); g.lineTo(18*u,0); }); // door split
  sh(g,'#bfc4ca',0,(g)=>{ g.roundRect(10*u,-14*u,4*u,10*u,2*u); }); sh(g,'#bfc4ca',0,(g)=>{ g.roundRect(10*u,4*u,4*u,10*u,2*u); }); // handles
  sh(g,'#c79a5a',3.2*u,(g)=>{ g.ellipse(26*u,-16*u,12*u,10*u,0,0,TAU); }); // camel head
  sh(g,'#c79a5a',3*u,(g)=>{ g.moveTo(20*u,-22*u); g.quadraticCurveTo(24*u,-34*u,30*u,-30*u); }); // neck
  eyes(g,u,26*u,-18*u,4.5*u,3*u);
});

// ---- Torrtuginni Dragonfrutinni: dragonfruit-shell turtle ----
makeSprite('turtle', 118, (g,u)=>{
  sh(g,'#5fae5a',3*u,(g)=>{ g.roundRect(-30*u,16*u,10*u,8*u,3*u); }); sh(g,'#5fae5a',3*u,(g)=>{ g.roundRect(20*u,16*u,10*u,8*u,3*u); }); // legs
  sh(g,'#5fae5a',3.2*u,(g)=>{ g.ellipse(28*u,-2*u,11*u,9*u,0,0,TAU); }); // head
  eyes(g,u,30*u,-3*u,4*u,2.8*u);
  sh(g,'#e84d97',3.6*u,(g)=>{ g.ellipse(-2*u,2*u,28*u,22*u,0,0,TAU); }); // dragonfruit shell
  for(const [x,y] of [[-14,-8],[6,-12],[-6,8],[14,4],[-2,-2],[16,-8]]) sh(g,'#7fe05a',0,(g)=>{ g.moveTo(x*u,y*u-5*u); g.lineTo(x*u+5*u,y*u); g.lineTo(x*u,y*u+5*u); g.lineTo(x*u-5*u,y*u); g.closePath(); }); // green scales
});

// ---- Pandaccini Bananini: panda with banana-peel limbs ----
makeSprite('panda', 112, (g,u)=>{
  sh(g,'#f7d24a',3*u,(g)=>{ g.roundRect(-26*u,2*u,11*u,24*u,5*u); }); sh(g,'#f7d24a',3*u,(g)=>{ g.roundRect(15*u,2*u,11*u,24*u,5*u); }); // banana arms
  sh(g,'#f7d24a',3*u,(g)=>{ g.roundRect(-12*u,22*u,10*u,16*u,4*u); }); sh(g,'#f7d24a',3*u,(g)=>{ g.roundRect(2*u,22*u,10*u,16*u,4*u); }); // banana legs
  sh(g,'#f4f4f4',3.6*u,(g)=>{ g.ellipse(0,4*u,22*u,20*u,0,0,TAU); }); // body
  sh(g,'#f4f4f4',3.2*u,(g)=>{ g.ellipse(0,-18*u,15*u,13*u,0,0,TAU); }); // head
  sh(g,'#2b2b2b',0,(g)=>{ g.ellipse(-14*u,-26*u,6*u,6*u,0,0,TAU); }); sh(g,'#2b2b2b',0,(g)=>{ g.ellipse(14*u,-26*u,6*u,6*u,0,0,TAU); }); // ears
  sh(g,'#2b2b2b',0,(g)=>{ g.ellipse(-6*u,-18*u,4*u,5*u,0.4,0,TAU); }); sh(g,'#2b2b2b',0,(g)=>{ g.ellipse(6*u,-18*u,4*u,5*u,-0.4,0,TAU); }); // eye patches
  dot(g,-6*u,-18*u,1.8*u,'#fff'); dot(g,6*u,-18*u,1.8*u,'#fff');
});

// ---- Tigrrullini Watermellini: watermelon-skin tiger ----
makeSprite('tiger', 114, (g,u)=>{
  sh(g,'#3f7d33',3.6*u,(g)=>{ g.ellipse(0,4*u,26*u,22*u,0,0,TAU); }); // watermelon body
  sh(g,'#e0503f',0,(g)=>{ g.ellipse(0,6*u,17*u,13*u,0,0,TAU); }); // red inner
  g.strokeStyle=OUT; g.lineWidth=2*u;
  for(let i=-2;i<=2;i++){ g.beginPath(); g.moveTo(i*9*u,-14*u); g.lineTo(i*9*u+2*u,22*u); g.stroke(); } // stripes
  sh(g,'#3f7d33',3.2*u,(g)=>{ g.ellipse(0,-18*u,15*u,13*u,0,0,TAU); }); // head
  sh(g,'#3f7d33',0,(g)=>{ g.moveTo(-13*u,-26*u); g.lineTo(-16*u,-34*u); g.lineTo(-7*u,-27*u); g.closePath(); }); sh(g,'#3f7d33',0,(g)=>{ g.moveTo(13*u,-26*u); g.lineTo(16*u,-34*u); g.lineTo(7*u,-27*u); g.closePath(); }); // ears
  eyes(g,u,0,-19*u,5*u,3.2*u);
  g.strokeStyle=OUT; g.lineWidth=1.2*u; g.beginPath(); g.moveTo(-12*u,-13*u); g.lineTo(-4*u,-12*u); g.moveTo(12*u,-13*u); g.lineTo(4*u,-12*u); g.stroke();
});

// ---- Capybarelli Bananalelli: chill capybara with back-bananas ----
makeSprite('capy', 116, (g,u)=>{
  sh(g,'#f7d24a',3*u,(g)=>{ g.roundRect(-14*u,-26*u,9*u,18*u,4*u); }); sh(g,'#f7d24a',3*u,(g)=>{ g.roundRect(-2*u,-30*u,9*u,18*u,4*u); }); sh(g,'#f7d24a',3*u,(g)=>{ g.roundRect(10*u,-26*u,9*u,18*u,4*u); }); // back bananas
  sh(g,'#9a6e44',3.6*u,(g)=>{ g.roundRect(-26*u,-8*u,52*u,30*u,12*u); }); // big chill body
  sh(g,'#7a5634',0,(g)=>{ g.ellipse(-18*u,-2*u,7*u,6*u,0,0,TAU); }); // brow
  sh(g,'#7a5634',0,(g)=>{ g.ellipse(-26*u,4*u,5*u,4*u,0,0,TAU); }); sh(g,'#7a5634',0,(g)=>{ g.ellipse(-12*u,2*u,5*u,4*u,0,0,TAU); }); // ears
  // chill half-closed eyes
  g.strokeStyle=OUT; g.lineWidth=2.4*u; g.beginPath(); g.moveTo(-24*u,-2*u); g.lineTo(-18*u,-2*u); g.moveTo(-14*u,-2*u); g.lineTo(-8*u,-2*u); g.stroke();
  sh(g,'#7a5634',2*u,(g)=>{ g.roundRect(-26*u,6*u,8*u,5*u,2*u); }); // nose/snout end
});

// ---- Lirili Larila: cactus elephant in slippers ----
makeSprite('lirili', 122, (g,u)=>{
  sh(g,'#7ab955',3.8*u,(g)=>{ g.ellipse(0,2*u,30*u,28*u,0,0,TAU); });
  sh(g,'#5f9e44',0,(g)=>{ g.ellipse(0,12*u,22*u,16*u,0,0,Math.PI); });
  g.strokeStyle='#4f8a36'; g.lineWidth=1.4*u;
  for(let a=0.4;a<TAU;a+=TAU/14){ const x=Math.cos(a)*30*u, y=2*u+Math.sin(a)*28*u; g.beginPath(); g.moveTo(x*0.88,y*0.9); g.lineTo(x*1.12,y*1.02); g.stroke(); }
  sh(g,'#7ab955',3.4*u,(g)=>{ g.moveTo(-26*u,-6*u); g.quadraticCurveTo(-44*u,6*u,-34*u,22*u); g.quadraticCurveTo(-30*u,10*u,-22*u,6*u); g.closePath(); }); // trunk
  sh(g,'#9ace7a',3*u,(g)=>{ g.ellipse(-22*u,-20*u,12*u,9*u,0,0,TAU); }); sh(g,'#9ace7a',3*u,(g)=>{ g.ellipse(22*u,-20*u,12*u,9*u,0,0,TAU); }); // ears
  eyes(g,u,0,-6*u,9*u,5*u);
  sh(g,'#f4a6c0',2*u,(g)=>{ g.roundRect(-22*u,28*u,16*u,7*u,3*u); }); sh(g,'#f4a6c0',2*u,(g)=>{ g.roundRect(6*u,28*u,16*u,7*u,3*u); }); // slippers
});

// ---- Brr Brr Patapim: proboscis-monkey tree creature ----
makeSprite('patapim', 130, (g,u)=>{
  sh(g,'#7faa3e',0,(g)=>{ g.ellipse(0,-26*u,24*u,14*u,0,0,TAU); });
  sh(g,'#6b9233',2*u,(g)=>{ g.ellipse(-12*u,-22*u,9*u,7*u,0,0,TAU); }); sh(g,'#6b9233',2*u,(g)=>{ g.ellipse(12*u,-22*u,9*u,7*u,0,0,TAU); });
  sh(g,'#9c6b3f',3.8*u,(g)=>{ g.roundRect(-20*u,-16*u,40*u,40*u,12*u); });
  sh(g,'#85572f',2*u,(g)=>{ g.ellipse(-8*u,8*u,4*u,6*u,0,0,TAU); }); sh(g,'#85572f',2*u,(g)=>{ g.ellipse(9*u,2*u,3*u,5*u,0,0,TAU); });
  eyes(g,u,0,-4*u,8*u,5*u);
  sh(g,'#c98a4f',3*u,(g)=>{ g.moveTo(-4*u,4*u); g.lineTo(4*u,4*u); g.lineTo(2*u,22*u); g.lineTo(-2*u,22*u); g.closePath(); });
  sh(g,'#6b4a2b',2.6*u,(g)=>{ g.roundRect(-14*u,22*u,8*u,12*u,3*u); }); sh(g,'#6b4a2b',2.6*u,(g)=>{ g.roundRect(6*u,22*u,8*u,12*u,3*u); });
});

// ============ WORLD 2 — DIRT DEPTHS ENEMIES ============
// Tier I
makeSprite('golubiro', 100, (g,u)=>{   // Spijuniro Golubiro: burrowing pigeon-mole
  sh(g,'#6b5544',0,(g)=>{ g.ellipse(0,24*u,26*u,8*u,0,0,Math.PI); }); // dirt mound
  sh(g,'#8a96a4',3.2*u,(g)=>{ g.ellipse(0,2*u,22*u,17*u,0,0,TAU); }); // body
  sh(g,'#9aa6b4',3*u,(g)=>{ g.ellipse(0,-14*u,13*u,12*u,0,0,TAU); }); // head
  sh(g,'#f0a23a',0,(g)=>{ g.moveTo(0,-14*u); g.lineTo(14*u,-12*u); g.lineTo(0,-8*u); g.closePath(); }); // beak/snout
  eyes(g,u,-2*u,-15*u,5*u,3*u);
  sh(g,'#c9b39a',2.4*u,(g)=>{ g.moveTo(-16*u,8*u); g.lineTo(-24*u,2*u); }); sh(g,'#c9b39a',2.4*u,(g)=>{ g.moveTo(16*u,8*u); g.lineTo(24*u,2*u); }); // claws
});
makeSprite('bananini', 104, (g,u)=>{   // Chimpanzini Bananini: brown chimp w/ banana
  sh(g,'#6e4a30',3.4*u,(g)=>{ g.ellipse(0,4*u,20*u,22*u,0,0,TAU); }); // body
  sh(g,'#6e4a30',3.2*u,(g)=>{ g.ellipse(0,-18*u,15*u,13*u,0,0,TAU); }); // head
  sh(g,'#d8b48a',0,(g)=>{ g.ellipse(0,-13*u,9*u,8*u,0,0,TAU); }); // muzzle
  sh(g,'#6e4a30',0,(g)=>{ g.ellipse(-15*u,-20*u,5*u,6*u,0,0,TAU); }); sh(g,'#6e4a30',0,(g)=>{ g.ellipse(15*u,-20*u,5*u,6*u,0,0,TAU); }); // ears
  eyes(g,u,0,-20*u,5*u,3*u);
  sh(g,'#f4d24a',3*u,(g)=>{ g.moveTo(16*u,-2*u); g.quadraticCurveTo(34*u,8*u,24*u,26*u); g.quadraticCurveTo(20*u,12*u,12*u,8*u); g.closePath(); }); // banana
});
makeSprite('dolfinita', 104, (g,u)=>{  // Bananita Dolfinita: banana-dolphin
  sh(g,'#f4d24a',3.6*u,(g)=>{ g.moveTo(-22*u,-14*u); g.quadraticCurveTo(30*u,-18*u,28*u,12*u); g.quadraticCurveTo(0,28*u,-22*u,14*u); g.quadraticCurveTo(-30*u,0,-22*u,-14*u); g.closePath(); }); // banana body
  sh(g,'#7fb0c8',0,(g)=>{ g.moveTo(20*u,-4*u); g.lineTo(36*u,-10*u); g.lineTo(28*u,6*u); g.closePath(); }); // dorsal fin/snout
  sh(g,'#5a8aa0',0,(g)=>{ g.moveTo(-22*u,-10*u); g.lineTo(-34*u,-18*u); g.lineTo(-26*u,0); g.closePath(); }); // tail
  eyes(g,u,8*u,-4*u,5*u,3*u);
});
makeSprite('frula', 100, (g,u)=>{      // Fruli Frula: splitting fruit blob
  sh(g,'#d8504a',3.6*u,(g)=>{ g.ellipse(0,4*u,22*u,21*u,0,0,TAU); }); // fruit body
  sh(g,'#7ab955',0,(g)=>{ g.moveTo(-4*u,-18*u); g.lineTo(2*u,-30*u); g.lineTo(8*u,-18*u); g.closePath(); }); // leaf
  sh(g,'#ffd0c0',0,(g)=>{ g.ellipse(-8*u,-4*u,6*u,5*u,0,0,TAU); }); // shine
  eyes(g,u,0,2*u,7*u,4*u);
  sh(g,OUT,2*u,(g)=>{ g.moveTo(-10*u,16*u); g.lineTo(0,12*u); g.lineTo(10*u,16*u); }); // mouth
});
makeSprite('baraboom', 100, (g,u)=>{   // Tric Trac Baraboom: bomb (ring death)
  sh(g,'#3a3a44',3.6*u,(g)=>{ g.ellipse(0,6*u,22*u,21*u,0,0,TAU); }); // bomb sphere
  sh(g,'#5a5a66',0,(g)=>{ g.ellipse(-8*u,-2*u,6*u,5*u,0,0,TAU); }); // shine
  sh(g,'#6b4a2b',0,(g)=>{ g.rect(-4*u,-22*u,8*u,8*u); }); // fuse cap
  sh(g,'#caa12f',2.4*u,(g)=>{ g.moveTo(0,-22*u); g.quadraticCurveTo(12*u,-32*u,6*u,-40*u); }); // fuse
  dot(g,6*u,-40*u,4*u,'#ff7a2a'); dot(g,6*u,-40*u,2*u,'#ffe08a'); // spark
  eyes(g,u,0,6*u,6*u,3.4*u);
});
// Tier II
makeSprite('bobrito', 108, (g,u)=>{    // Bobrito Bandito: bandit beaver
  sh(g,'#7a5230',3.2*u,(g)=>{ g.ellipse(-24*u,18*u,15*u,8*u,0.3,0,TAU); }); // tail
  sh(g,'#8a5f38',3.6*u,(g)=>{ g.roundRect(-16*u,-4*u,32*u,28*u,8*u); }); // body
  sh(g,'#9a6b40',3.2*u,(g)=>{ g.ellipse(0,-16*u,15*u,13*u,0,0,TAU); }); // head
  sh(g,'#b03a3a',0,(g)=>{ g.rect(-15*u,-18*u,30*u,8*u); }); // bandana mask
  eyes(g,u,0,-15*u,5*u,3*u);
  sh(g,'#fff',1*u,(g)=>{ g.rect(-4*u,-7*u,8*u,5*u); }); // teeth
  sh(g,'#d8b46a',0,(g)=>{ g.moveTo(-14*u,-26*u); g.lineTo(0,-34*u); g.lineTo(14*u,-26*u); g.closePath(); }); // sombrero
});
makeSprite('trulimero', 108, (g,u)=>{  // Trulimero Trulichina: fish w/ legs
  sh(g,'#3fa6a0',3.4*u,(g)=>{ g.ellipse(-2*u,-4*u,22*u,16*u,0,0,TAU); }); // fish body
  sh(g,'#2f8a84',0,(g)=>{ g.moveTo(18*u,-4*u); g.lineTo(34*u,-14*u); g.lineTo(34*u,6*u); g.closePath(); }); // tail
  sh(g,'#2f8a84',0,(g)=>{ g.moveTo(-2*u,-18*u); g.lineTo(4*u,-30*u); g.lineTo(10*u,-18*u); g.closePath(); }); // fin
  eyes(g,u,-10*u,-6*u,5*u,3*u);
  sh(g,'#e0c39a',2.4*u,(g)=>{ g.moveTo(-8*u,12*u); g.lineTo(-10*u,26*u); }); sh(g,'#e0c39a',2.4*u,(g)=>{ g.moveTo(6*u,12*u); g.lineTo(8*u,26*u); }); // human legs
});
// Tier III
makeSprite('ananasini', 116, (g,u)=>{  // Orangutini Ananasini: orangutan-pineapple
  sh(g,'#d9b441',0,(g)=>{ for(let k=-1;k<=1;k++){ g.moveTo(k*8*u,-22*u); g.lineTo(k*8*u-3*u,-38*u); g.lineTo(k*8*u+4*u,-24*u);} }); // crown leaves
  sh(g,'#e3a13a',3.8*u,(g)=>{ g.ellipse(0,2*u,24*u,26*u,0,0,TAU); }); // pineapple body
  g.strokeStyle='#b07a22'; g.lineWidth=1.4*u;
  for(let a=-2;a<=2;a++){ g.beginPath(); g.moveTo(-22*u,a*8*u); g.lineTo(22*u,a*8*u+6*u); g.stroke(); }
  sh(g,'#c97a2a',2.4*u,(g)=>{ g.roundRect(-26*u,-2*u,9*u,20*u,4*u); }); sh(g,'#c97a2a',2.4*u,(g)=>{ g.roundRect(17*u,-2*u,9*u,20*u,4*u); }); // long arms
  eyes(g,u,0,0,8*u,4.4*u);
});
makeSprite('glorbo', 110, (g,u)=>{     // Glorbo Fruttodrillo: fruit crocodile
  sh(g,'#5a9e3f',3.6*u,(g)=>{ g.ellipse(-4*u,4*u,24*u,16*u,0,0,TAU); }); // body
  sh(g,'#4f8a36',0,(g)=>{ for(let k=-2;k<=2;k++) { g.moveTo(k*8*u,-12*u); g.lineTo(k*8*u+4*u,-22*u); g.lineTo(k*8*u+8*u,-12*u);} }); // back ridges
  sh(g,'#5a9e3f',3.2*u,(g)=>{ g.moveTo(14*u,-4*u); g.lineTo(40*u,-8*u); g.lineTo(40*u,8*u); g.lineTo(14*u,10*u); g.closePath(); }); // snout
  sh(g,'#fff',1*u,(g)=>{ for(let k=0;k<5;k++){ g.moveTo((16+k*4)*u,2*u); g.lineTo((18+k*4)*u,7*u);} }); // teeth
  sh(g,'#e0503f',0,(g)=>{ g.ellipse(-18*u,-12*u,7*u,7*u,0,0,TAU); }); // fruit on back
  eyes(g,u,6*u,-12*u,5*u,3*u);
});
makeSprite('zibra', 110, (g,u)=>{      // Zibra Zubra Zibralini: zebra
  sh(g,'#e8e4dc',3.6*u,(g)=>{ g.ellipse(0,6*u,22*u,20*u,0,0,TAU); }); // body
  sh(g,'#e8e4dc',3.2*u,(g)=>{ g.ellipse(2*u,-16*u,13*u,14*u,0,0,TAU); }); // head
  g.strokeStyle=OUT; g.lineWidth=2.2*u;
  for(let k=-2;k<=2;k++){ g.beginPath(); g.moveTo(k*7*u,-12*u); g.lineTo(k*7*u+2*u,22*u); g.stroke(); } // body stripes
  sh(g,'#2b2b32',0,(g)=>{ g.ellipse(-4*u,-26*u,4*u,7*u,0,0,TAU); }); sh(g,'#2b2b32',0,(g)=>{ g.ellipse(8*u,-26*u,4*u,7*u,0,0,TAU); }); // ears
  eyes(g,u,2*u,-16*u,5*u,3*u);
});
// Tier IV
makeSprite('burbaloni', 116, (g,u)=>{  // Burbaloni Luliloli: bubbly capybara
  sh(g,'#9aa6c4',0,(g)=>{ g.ellipse(20*u,-16*u,12*u,12*u,0,0,TAU); }); g.globalAlpha=1; // bubble
  sh(g,'#a07a52',3.8*u,(g)=>{ g.roundRect(-24*u,-6*u,46*u,34*u,14*u); }); // body
  sh(g,'#b08a60',3.4*u,(g)=>{ g.ellipse(-18*u,-12*u,15*u,13*u,0,0,TAU); }); // head
  sh(g,'#6b4a2b',0,(g)=>{ g.ellipse(-30*u,-14*u,4*u,5*u,0,0,TAU); }); // ear
  eyes(g,u,-18*u,-12*u,6*u,3.4*u);
  sh(g,'#5a3d28',0,(g)=>{ g.ellipse(-30*u,-8*u,5*u,4*u,0,0,TAU); }); // nose
});
makeSprite('cocofanto', 120, (g,u)=>{  // Cocofanto Elefanto: coconut elephant
  sh(g,'#7d8a93',3.8*u,(g)=>{ g.ellipse(0,6*u,28*u,24*u,0,0,TAU); }); // body
  sh(g,'#6e7a82',0,(g)=>{ g.ellipse(-22*u,-2*u,12*u,14*u,0,0,TAU); }); sh(g,'#6e7a82',0,(g)=>{ g.ellipse(22*u,-2*u,12*u,14*u,0,0,TAU); }); // ears
  sh(g,'#8a5a32',3*u,(g)=>{ g.ellipse(0,-10*u,15*u,13*u,0,0,TAU); }); // coconut head
  dot(g,-5*u,-12*u,2*u,'#5e3b1e'); dot(g,5*u,-12*u,2*u,'#5e3b1e');
  sh(g,'#7d8a93',3.2*u,(g)=>{ g.moveTo(-2*u,2*u); g.quadraticCurveTo(-2*u,28*u,12*u,30*u); }); // trunk
  eyes(g,u,0,-12*u,5*u,3*u);
});
makeSprite('girafa', 124, (g,u)=>{     // Girafa Celeste: celestial giraffe
  sh(g,'#f2c84a',5*u,(g)=>{ g.moveTo(-4*u,28*u); g.lineTo(2*u,-20*u); }); // long neck
  sh(g,'#f2c84a',3.4*u,(g)=>{ g.ellipse(-2*u,30*u,18*u,12*u,0,0,TAU); }); // body
  sh(g,'#f2c84a',3*u,(g)=>{ g.ellipse(6*u,-26*u,12*u,10*u,0,0,TAU); }); // head
  sh(g,'#c89a2a',0,(g)=>{ g.ellipse(-6*u,18*u,4*u,4*u,0,0,TAU); }); dot(g,4*u,4*u,3*u,'#c89a2a'); dot(g,-2*u,-8*u,3*u,'#c89a2a'); // celestial spots
  sh(g,'#6b9bd8',0,(g)=>{ g.moveTo(2*u,-34*u); g.lineTo(4*u,-44*u); g.lineTo(8*u,-36*u); g.closePath(); }); // star ossicone
  eyes(g,u,6*u,-26*u,4*u,2.6*u);
});
// Tier V
makeSprite('bicus', 110, (g,u)=>{      // Brri Brri Bicus Dicus Bombicus: roman bird
  sh(g,'#b6bdc7',3.4*u,(g)=>{ g.ellipse(0,6*u,20*u,18*u,0,0,TAU); }); // body
  sh(g,'#c7ccd4',3*u,(g)=>{ g.ellipse(0,-14*u,13*u,12*u,0,0,TAU); }); // head
  sh(g,'#b03a3a',0,(g)=>{ g.moveTo(-10*u,-24*u); g.quadraticCurveTo(0,-38*u,10*u,-24*u); g.closePath(); }); // roman helmet crest
  sh(g,'#caa12f',0,(g)=>{ g.arc(0,-18*u,12*u,Math.PI,TAU); }); // helmet
  sh(g,'#f0a23a',0,(g)=>{ g.moveTo(10*u,-12*u); g.lineTo(22*u,-10*u); g.lineTo(10*u,-7*u); g.closePath(); }); // beak
  eyes(g,u,-1*u,-13*u,4.4*u,2.8*u);
  dot(g,-16*u,16*u,5*u,'#3a3a44'); dot(g,16*u,16*u,5*u,'#3a3a44'); // little bombs
});
makeSprite('ambalabu', 110, (g,u)=>{   // Boneca Ambalabu: frog-tire creature
  sh(g,'#2b2b32',4*u,(g)=>{ g.ellipse(0,16*u,24*u,12*u,0,0,TAU); }); // tire
  sh(g,'#5a5a66',0,(g)=>{ g.ellipse(0,16*u,12*u,6*u,0,0,TAU); }); // hub
  sh(g,'#5a9e3f',3.4*u,(g)=>{ g.ellipse(0,-10*u,18*u,15*u,0,0,TAU); }); // frog head
  sh(g,'#6fb050',3*u,(g)=>{ g.ellipse(-12*u,-22*u,8*u,8*u,0,0,TAU); }); sh(g,'#6fb050',3*u,(g)=>{ g.ellipse(12*u,-22*u,8*u,8*u,0,0,TAU); }); // eye bulges
  dot(g,-12*u,-22*u,3*u,OUT); dot(g,12*u,-22*u,3*u,OUT);
  sh(g,OUT,2*u,(g)=>{ g.moveTo(-12*u,-4*u); g.quadraticCurveTo(0,2*u,12*u,-4*u); }); // mouth
});
makeSprite('dindin', 116, (g,u)=>{     // U Din Din...: bell-tower titan
  sh(g,'#9a7a52',3.6*u,(g)=>{ g.moveTo(-16*u,28*u); g.lineTo(-12*u,-18*u); g.lineTo(12*u,-18*u); g.lineTo(16*u,28*u); g.closePath(); }); // tower body
  sh(g,'#caa96a',3*u,(g)=>{ g.moveTo(-16*u,-18*u); g.lineTo(0,-34*u); g.lineTo(16*u,-18*u); g.closePath(); }); // roof
  sh(g,'#caa12f',3*u,(g)=>{ g.moveTo(-9*u,-2*u); g.quadraticCurveTo(-11*u,14*u,0,16*u); g.quadraticCurveTo(11*u,14*u,9*u,-2*u); g.closePath(); }); // bell
  dot(g,0,18*u,3*u,OUT); // clapper
  eyes(g,u,0,4*u,5*u,3*u);
});
// ============ WORLD 2 — DIRT DEPTHS BOSSES ============
makeSprite('tatasahur', 132, (g,u)=>{  // TA TA TA TA SAHUR: burrowing wooden drummer
  sh(g,'#8a6a3a',2.6*u,(g)=>{ g.roundRect(26*u,-30*u,8*u,40*u,3*u); }); // bat handle
  sh(g,'#a9844a',3*u,(g)=>{ g.roundRect(22*u,-46*u,16*u,22*u,5*u); }); // bat head
  sh(g,'#b5894e',4*u,(g)=>{ g.roundRect(-18*u,-20*u,36*u,50*u,10*u); }); // wooden body
  sh(g,'#7a5a30',0,(g)=>{ g.ellipse(0,4*u,10*u,16*u,0,0,TAU); }); // wood grain
  sh(g,'#caa96a',3.4*u,(g)=>{ g.ellipse(0,-30*u,16*u,15*u,0,0,TAU); }); // head
  sh(g,'#2b2b32',0,(g)=>{ g.rect(-16*u,-34*u,32*u,8*u); }); // brow
  eyes(g,u,0,-28*u,6*u,3.4*u);
  sh(g,OUT,2.4*u,(g)=>{ g.moveTo(-10*u,-18*u); g.lineTo(0,-22*u); g.lineTo(10*u,-18*u); }); // grimace
});
makeSprite('hotspot', 130, (g,u)=>{    // POT HOTSPOT: cracked geyser pot
  sh(g,'#7a4a2c',4*u,(g)=>{ g.moveTo(-28*u,-12*u); g.quadraticCurveTo(-34*u,28*u,0,30*u); g.quadraticCurveTo(34*u,28*u,28*u,-12*u); g.closePath(); }); // pot
  sh(g,'#8a5a34',3*u,(g)=>{ g.ellipse(0,-12*u,28*u,9*u,0,0,TAU); }); // rim
  sh(g,'#e0503f',0,(g)=>{ g.ellipse(0,-12*u,22*u,6*u,0,0,TAU); }); // lava surface
  sh(g,'#ff9f3a',0,(g)=>{ g.ellipse(-6*u,-14*u,6*u,3*u,0,0,TAU); }); // glow
  g.strokeStyle='#3a2616'; g.lineWidth=1.6*u;
  g.beginPath(); g.moveTo(-10*u,2*u); g.lineTo(-4*u,14*u); g.lineTo(-12*u,22*u); g.stroke(); // crack
  eyes(g,u,0,8*u,7*u,4*u);
});
makeSprite('saturnita', 134, (g,u)=>{  // LA VACA SATURNO SATURNITA: molten ringed cow
  g.save(); g.rotate(-0.4); sh(g,'#caa96a',3*u,(g)=>{ g.ellipse(0,0,46*u,12*u,0,0,TAU); }); g.restore(); // saturn ring (behind via draw order ok)
  sh(g,'#e6e0d4',4*u,(g)=>{ g.ellipse(0,4*u,26*u,23*u,0,0,TAU); }); // body
  sh(g,'#e0503f',0,(g)=>{ g.ellipse(-8*u,8*u,8*u,6*u,0,0,TAU); }); sh(g,'#e0503f',0,(g)=>{ g.ellipse(10*u,-2*u,7*u,6*u,0,0,TAU); }); // molten patches
  sh(g,'#e6e0d4',3.2*u,(g)=>{ g.ellipse(0,-16*u,16*u,13*u,0,0,TAU); }); // head
  sh(g,'#caa96a',0,(g)=>{ g.moveTo(-14*u,-26*u); g.lineTo(-22*u,-34*u); }); sh(g,'#caa96a',0,(g)=>{ g.moveTo(14*u,-26*u); g.lineTo(22*u,-34*u); }); // horns
  sh(g,'#f4a6c0',0,(g)=>{ g.ellipse(0,-10*u,9*u,7*u,0,0,TAU); }); // snout
  eyes(g,u,0,-18*u,5*u,3*u);
});
makeSprite('madudung', 138, (g,u)=>{   // MADUDUNGDUNG: rock golem titan
  sh(g,'#6b5a48',4.4*u,(g)=>{ g.moveTo(-28*u,-18*u); g.lineTo(-22*u,30*u); g.lineTo(22*u,30*u); g.lineTo(28*u,-18*u); g.lineTo(16*u,-30*u); g.lineTo(-16*u,-30*u); g.closePath(); }); // boulder body
  sh(g,'#7d6a54',0,(g)=>{ g.moveTo(-20*u,-8*u); g.lineTo(-6*u,-4*u); g.lineTo(-14*u,8*u); g.closePath(); }); // facet
  sh(g,'#7d6a54',0,(g)=>{ g.moveTo(8*u,2*u); g.lineTo(22*u,6*u); g.lineTo(12*u,18*u); g.closePath(); });
  dot(g,-10*u,-16*u,4*u,'#ffd23a'); dot(g,10*u,-16*u,4*u,'#ffd23a'); // glowing eyes
  sh(g,OUT,3*u,(g)=>{ g.moveTo(-12*u,-4*u); g.lineTo(0,-8*u); g.lineTo(12*u,-4*u); }); // brow
  sh(g,'#3a2e22',0,(g)=>{ g.rect(-12*u,8*u,24*u,5*u); }); // mouth slit
});
makeSprite('garamaraman', 138, (g,u)=>{ // GARAMARAMAN: horned magma titan
  sh(g,'#3a2a26',4.4*u,(g)=>{ g.ellipse(0,6*u,28*u,26*u,0,0,TAU); }); // dark body
  sh(g,'#e0503f',0,(g)=>{ g.moveTo(-14*u,-6*u); g.lineTo(0,-2*u); g.lineTo(-8*u,12*u); g.closePath(); }); // magma crack
  sh(g,'#ff9f3a',0,(g)=>{ g.moveTo(6*u,-2*u); g.lineTo(18*u,4*u); g.lineTo(8*u,16*u); g.closePath(); });
  sh(g,'#caa96a',3.4*u,(g)=>{ g.moveTo(-26*u,-18*u); g.lineTo(-40*u,-36*u); g.lineTo(-20*u,-28*u); g.closePath(); }); // horn L
  sh(g,'#caa96a',3.4*u,(g)=>{ g.moveTo(26*u,-18*u); g.lineTo(40*u,-36*u); g.lineTo(20*u,-28*u); g.closePath(); }); // horn R
  dot(g,-9*u,-6*u,4.4*u,'#ffe08a'); dot(g,9*u,-6*u,4.4*u,'#ffe08a'); // eyes
  sh(g,'#ff7a2a',2.6*u,(g)=>{ g.moveTo(-12*u,12*u); g.lineTo(-6*u,18*u); g.lineTo(0,12*u); g.lineTo(6*u,18*u); g.lineTo(12*u,12*u); }); // fiery grin
});
makeSprite('orcalero', 120, (g,u)=>{   // ORCALERO ORCALA: armoured killer-whale brute
  sh(g,'#1f2a33',3*u,(g)=>{ g.moveTo(-30*u,-2*u); g.lineTo(-46*u,-14*u); g.lineTo(-40*u,2*u); g.lineTo(-46*u,16*u); g.closePath(); }); // tail fluke
  sh(g,'#1f2a33',3*u,(g)=>{ g.moveTo(-6*u,-18*u); g.lineTo(2*u,-34*u); g.lineTo(12*u,-18*u); g.closePath(); }); // dorsal fin
  sh(g,'#222d36',3.6*u,(g)=>{ g.ellipse(0,0,34*u,21*u,0,0,TAU); }); // body
  sh(g,'#eef4f7',0,(g)=>{ g.ellipse(2*u,9*u,26*u,9*u,0,0,Math.PI); }); // white belly
  sh(g,'#eef4f7',0,(g)=>{ g.ellipse(-18*u,4*u,8*u,6*u,0,0,TAU); }); // flank patch
  sh(g,'#1f2a33',2.4*u,(g)=>{ g.moveTo(6*u,12*u); g.lineTo(2*u,26*u); g.lineTo(16*u,16*u); g.closePath(); }); // pectoral fin
  sh(g,'#eef4f7',0,(g)=>{ g.ellipse(20*u,-8*u,7*u,5*u,0.2,0,TAU); }); // eye patch
  sh(g,'#222d36',2.6*u,(g)=>{ g.moveTo(30*u,-2*u); g.lineTo(40*u,2*u); }); // snout tip
  g.strokeStyle=OUT; g.lineWidth=2*u; g.beginPath(); g.moveTo(22*u,6*u); g.lineTo(38*u,6*u); g.stroke(); // mouth line
  for(let i=0;i<4;i++){ sh(g,'#fff',0,(g)=>{ g.moveTo(24*u+i*4*u,6*u); g.lineTo(26*u+i*4*u,10*u); g.lineTo(28*u+i*4*u,6*u); g.closePath(); }); } // teeth
  eyes(g,u,20*u,-8*u,4.5*u,2.8*u);
});

// ============ WORLD 2 — CITRUS COAST roster (real OG Italian Brainrots, recreated in house style) ============
// Tralaleritos — baby blue shark in blue sneakers
makeSprite('tralalerito', 96, (g,u)=>{
  sh(g,'#5aa9e0',3.2*u,(g)=>{ g.moveTo(-30*u,2*u); g.quadraticCurveTo(0,-18*u,28*u,-4*u); g.quadraticCurveTo(18*u,8*u,28*u,16*u); g.quadraticCurveTo(0,16*u,-30*u,2*u); g.closePath(); });
  sh(g,'#dff0fb',0,(g)=>{ g.ellipse(0,8*u,15*u,6*u,0,0,TAU); });
  sh(g,'#5aa9e0',2.4*u,(g)=>{ g.moveTo(-2*u,-12*u); g.lineTo(6*u,-28*u); g.lineTo(13*u,-10*u); g.closePath(); });
  g.strokeStyle=OUT; g.lineWidth=1.6*u; for(let i=0;i<3;i++){ g.beginPath(); g.moveTo((13+i*4)*u,-2*u); g.lineTo((13+i*4)*u,7*u); g.stroke(); }
  sh(g,'#fff',0,(g)=>{ g.moveTo(20*u,2*u); g.lineTo(28*u,0); g.lineTo(20*u,6*u); g.closePath(); });
  eyes(g,u,15*u,-5*u,4*u,2.6*u);
  sh(g,'#3a6fd0',2*u,(g)=>{ g.roundRect(-15*u,15*u,12*u,7*u,3*u); }); sh(g,'#3a6fd0',2*u,(g)=>{ g.roundRect(1*u,15*u,12*u,7*u,3*u); });
});
// Pi Pi Kiwi — fuzzy kiwi
makeSprite('pipikiwi', 92, (g,u)=>{
  sh(g,'#8a6a3a',3.2*u,(g)=>{ g.ellipse(0,4*u,18*u,19*u,0,0,TAU); });
  sh(g,'#9ad36a',0,(g)=>{ g.ellipse(0,6*u,12*u,13*u,0,0,TAU); });
  sh(g,'#f4f4e8',0,(g)=>{ g.ellipse(0,6*u,5*u,6*u,0,0,TAU); });
  for(let i=0;i<8;i++){ const a=i/8*TAU; dot(g,Math.cos(a)*9*u,6*u+Math.sin(a)*10*u,0.9*u,OUT); }
  sh(g,'#caa12f',0,(g)=>{ g.moveTo(-2*u,-13*u); g.lineTo(0,-24*u); g.lineTo(3*u,-13*u); g.closePath(); });
  eyes(g,u,0,-2*u,5*u,2.6*u);
  sh(g,'#8a5a2c',2*u,(g)=>{ g.moveTo(-6*u,22*u); g.lineTo(-6*u,28*u); }); sh(g,'#8a5a2c',2*u,(g)=>{ g.moveTo(6*u,22*u); g.lineTo(6*u,28*u); });
});
// Tukanno Bananno — toucan with a banana beak
makeSprite('tukanno', 100, (g,u)=>{
  sh(g,'#2b2b32',3.2*u,(g)=>{ g.ellipse(-4*u,6*u,18*u,16*u,0,0,TAU); });
  sh(g,'#f4f4f4',0,(g)=>{ g.ellipse(-2*u,2*u,11*u,9*u,0,0,TAU); });
  sh(g,'#2b2b32',3*u,(g)=>{ g.ellipse(2*u,-14*u,13*u,12*u,0,0,TAU); });
  sh(g,'#f5c542',2.6*u,(g)=>{ g.moveTo(11*u,-19*u); g.quadraticCurveTo(40*u,-16*u,33*u,-3*u); g.quadraticCurveTo(22*u,-6*u,11*u,-10*u); g.closePath(); });
  g.strokeStyle=OUT; g.lineWidth=1.5*u; g.beginPath(); g.moveTo(13*u,-12*u); g.lineTo(32*u,-9*u); g.stroke();
  eyes(g,u,4*u,-16*u,5*u,3*u);
  sh(g,'#f0a23a',2*u,(g)=>{ g.moveTo(-8*u,21*u); g.lineTo(-8*u,29*u); }); sh(g,'#f0a23a',2*u,(g)=>{ g.moveTo(2*u,21*u); g.lineTo(2*u,29*u); });
});
// Raccooni Watermelunni — raccoon with a watermelon belly
makeSprite('raccooni', 100, (g,u)=>{
  sh(g,'#4e9a3e',3.2*u,(g)=>{ g.ellipse(0,8*u,22*u,20*u,0,0,TAU); });
  sh(g,'#e0506a',0,(g)=>{ g.ellipse(0,9*u,16*u,14*u,0,0,TAU); });
  for(let i=0;i<5;i++){ dot(g,(-10+i*5)*u,(4+(i%2)*8)*u,1.2*u,OUT); }
  sh(g,'#9aa0a8',3*u,(g)=>{ g.ellipse(0,-16*u,15*u,13*u,0,0,TAU); });
  sh(g,'#9aa0a8',0,(g)=>{ g.moveTo(-15*u,-22*u); g.lineTo(-9*u,-32*u); g.lineTo(-4*u,-22*u); g.closePath(); }); sh(g,'#9aa0a8',0,(g)=>{ g.moveTo(15*u,-22*u); g.lineTo(9*u,-32*u); g.lineTo(4*u,-22*u); g.closePath(); });
  sh(g,OUT,0,(g)=>{ g.ellipse(0,-15*u,12*u,4.5*u,0,0,TAU); });
  sh(g,'#f4f4f4',0,(g)=>{ g.ellipse(0,-10*u,7*u,4*u,0,0,TAU); });
  eyes(g,u,0,-15*u,5*u,2.8*u);
});
// Avocadini Guffo — avocado-slice owl
makeSprite('avoguffo', 100, (g,u)=>{
  sh(g,'#7cae3e',3.4*u,(g)=>{ g.ellipse(0,4*u,22*u,26*u,0,0,TAU); });
  sh(g,'#c8e08a',0,(g)=>{ g.ellipse(0,4*u,15*u,19*u,0,0,TAU); });
  sh(g,'#8a5a2c',0,(g)=>{ g.ellipse(0,11*u,8*u,9*u,0,0,TAU); });
  sh(g,'#6d9c34',0,(g)=>{ g.moveTo(-15*u,-15*u); g.lineTo(-9*u,-28*u); g.lineTo(-5*u,-15*u); g.closePath(); }); sh(g,'#6d9c34',0,(g)=>{ g.moveTo(15*u,-15*u); g.lineTo(9*u,-28*u); g.lineTo(5*u,-15*u); g.closePath(); });
  sh(g,'#6d9c34',2.4*u,(g)=>{ g.ellipse(-22*u,2*u,6*u,13*u,0.2,0,TAU); }); sh(g,'#6d9c34',2.4*u,(g)=>{ g.ellipse(22*u,2*u,6*u,13*u,-0.2,0,TAU); });
  sh(g,'#f0a23a',0,(g)=>{ g.moveTo(-3*u,-6*u); g.lineTo(3*u,-6*u); g.lineTo(0,0); g.closePath(); });
  eyes(g,u,0,-10*u,6*u,4*u);
  sh(g,'#8a5a2c',2*u,(g)=>{ g.moveTo(-7*u,28*u); g.lineTo(-7*u,34*u); }); sh(g,'#8a5a2c',2*u,(g)=>{ g.moveTo(7*u,28*u); g.lineTo(7*u,34*u); });
});
// Svinino Bombondino — candy-wrapped pig
makeSprite('svinino', 96, (g,u)=>{
  sh(g,'#f06fa8',0,(g)=>{ g.moveTo(-20*u,2*u); g.lineTo(-32*u,-6*u); g.lineTo(-30*u,10*u); g.closePath(); }); sh(g,'#f06fa8',0,(g)=>{ g.moveTo(20*u,2*u); g.lineTo(32*u,-6*u); g.lineTo(30*u,10*u); g.closePath(); });
  sh(g,'#f59ac4',3.2*u,(g)=>{ g.ellipse(0,4*u,20*u,17*u,0,0,TAU); });
  sh(g,'#f59ac4',0,(g)=>{ g.moveTo(-14*u,-12*u); g.lineTo(-18*u,-22*u); g.lineTo(-6*u,-15*u); g.closePath(); }); sh(g,'#f59ac4',0,(g)=>{ g.moveTo(14*u,-12*u); g.lineTo(18*u,-22*u); g.lineTo(6*u,-15*u); g.closePath(); });
  g.strokeStyle='#fff'; g.lineWidth=3*u; g.beginPath(); g.moveTo(-12*u,-5*u); g.lineTo(12*u,12*u); g.stroke();
  sh(g,'#e07aa0',0,(g)=>{ g.ellipse(0,8*u,7*u,5*u,0,0,TAU); });
  dot(g,-2*u,8*u,1.3*u,OUT); dot(g,2*u,8*u,1.3*u,OUT);
  eyes(g,u,0,-2*u,5*u,3*u);
});
// Avocadini Antilopini — avocado antelope (dasher)
makeSprite('avoantilope', 100, (g,u)=>{
  sh(g,'#7cae3e',3.2*u,(g)=>{ g.ellipse(0,8*u,18*u,21*u,0,0,TAU); });
  sh(g,'#c8e08a',0,(g)=>{ g.ellipse(0,8*u,12*u,15*u,0,0,TAU); });
  sh(g,'#8a5a2c',0,(g)=>{ g.ellipse(0,14*u,7*u,8*u,0,0,TAU); });
  sh(g,'#caa06a',2.8*u,(g)=>{ g.ellipse(0,-16*u,10*u,9*u,0,0,TAU); });
  g.strokeStyle='#6e4a28'; g.lineWidth=2.6*u; g.beginPath(); g.moveTo(-5*u,-22*u); g.quadraticCurveTo(-12*u,-32*u,-6*u,-38*u); g.stroke(); g.beginPath(); g.moveTo(5*u,-22*u); g.quadraticCurveTo(12*u,-32*u,6*u,-38*u); g.stroke();
  eyes(g,u,0,-16*u,4.5*u,2.6*u);
  sh(g,'#6e4a28',2.2*u,(g)=>{ g.moveTo(-8*u,27*u); g.lineTo(-8*u,33*u); }); sh(g,'#6e4a28',2.2*u,(g)=>{ g.moveTo(8*u,27*u); g.lineTo(8*u,33*u); });
});
// Perochello Lemonchello — pear/lemon two-tone (slow tank)
makeSprite('perochello', 96, (g,u)=>{
  sh(g,'#cfe05a',3.2*u,(g)=>{ g.ellipse(0,6*u,19*u,22*u,0,0,TAU); });
  g.fillStyle='#f4d83a'; g.beginPath(); g.ellipse(0,6*u,19*u,22*u,0,-Math.PI/2,Math.PI/2); g.closePath(); g.fill();
  g.strokeStyle=OUT; g.lineWidth=2*u; g.beginPath(); g.moveTo(0,-16*u); g.lineTo(0,28*u); g.stroke();
  sh(g,'#6d9c34',0,(g)=>{ g.ellipse(2*u,-20*u,5*u,3*u,0.6,0,TAU); });
  eyes(g,u,0,0,6*u,3*u);
  g.strokeStyle=OUT; g.lineWidth=1.8*u; g.beginPath(); g.arc(0,8*u,5*u,0.15,Math.PI-0.15); g.stroke();
});
// ---- World 2 BOSSES ----
// Ecco Cavallo Virtuoso — horse head on a wooden violin body, black boots
makeSprite('eccocavallo', 120, (g,u)=>{
  sh(g,'#b07a3a',3.4*u,(g)=>{ g.ellipse(0,8*u,20*u,26*u,0,0,TAU); });
  sh(g,'#8a5a28',0,(g)=>{ g.ellipse(-9*u,4*u,3*u,7*u,0,0,TAU); }); sh(g,'#8a5a28',0,(g)=>{ g.ellipse(9*u,4*u,3*u,7*u,0,0,TAU); });
  g.strokeStyle='#f0e0b0'; g.lineWidth=1.2*u; for(let i=-1;i<=1;i++){ g.beginPath(); g.moveTo(i*5*u,-12*u); g.lineTo(i*5*u,28*u); g.stroke(); }
  sh(g,'#7a5a3a',3*u,(g)=>{ g.ellipse(0,-22*u,12*u,14*u,0,0,TAU); });
  sh(g,'#7a5a3a',0,(g)=>{ g.moveTo(-6*u,-32*u); g.lineTo(-9*u,-42*u); g.lineTo(-2*u,-34*u); g.closePath(); }); sh(g,'#7a5a3a',0,(g)=>{ g.moveTo(6*u,-32*u); g.lineTo(9*u,-42*u); g.lineTo(2*u,-34*u); g.closePath(); });
  sh(g,'#5a3f28',0,(g)=>{ g.ellipse(0,-15*u,7*u,5*u,0,0,TAU); });
  eyes(g,u,0,-24*u,5*u,3*u);
  sh(g,'#2b2b32',2.6*u,(g)=>{ g.roundRect(-16*u,30*u,12*u,9*u,3*u); }); sh(g,'#2b2b32',2.6*u,(g)=>{ g.roundRect(4*u,30*u,12*u,9*u,3*u); });
});
// Tigrullini Watermellini — tiger head on a watermelon torso
makeSprite('tigrwater', 120, (g,u)=>{
  sh(g,'#e0506a',3.4*u,(g)=>{ g.ellipse(0,12*u,24*u,22*u,0,0,TAU); });
  g.lineWidth=4*u; g.strokeStyle='#3c7a30'; g.beginPath(); g.arc(0,12*u,23*u,0.35,Math.PI-0.35); g.stroke();
  for(let i=0;i<6;i++){ dot(g,(-12+i*5)*u,(10+(i%2)*6)*u,1.4*u,OUT); }
  sh(g,'#ef9a3a',3*u,(g)=>{ g.ellipse(0,-18*u,15*u,13*u,0,0,TAU); });
  sh(g,'#ef9a3a',0,(g)=>{ g.moveTo(-14*u,-24*u); g.lineTo(-12*u,-34*u); g.lineTo(-5*u,-26*u); g.closePath(); }); sh(g,'#ef9a3a',0,(g)=>{ g.moveTo(14*u,-24*u); g.lineTo(12*u,-34*u); g.lineTo(5*u,-26*u); g.closePath(); });
  g.strokeStyle=OUT; g.lineWidth=2*u; for(const s of [-1,1]){ g.beginPath(); g.moveTo(s*6*u,-23*u); g.lineTo(s*13*u,-21*u); g.stroke(); g.beginPath(); g.moveTo(s*6*u,-17*u); g.lineTo(s*14*u,-16*u); g.stroke(); }
  sh(g,'#fff',0,(g)=>{ g.ellipse(0,-13*u,7*u,5*u,0,0,TAU); });
  eyes(g,u,0,-20*u,5*u,3*u);
});
// Avocadorilla — avocado gorilla
makeSprite('avocadorilla', 124, (g,u)=>{
  sh(g,'#3a3a42',3.2*u,(g)=>{ g.ellipse(-24*u,10*u,8*u,18*u,0.2,0,TAU); }); sh(g,'#3a3a42',3.2*u,(g)=>{ g.ellipse(24*u,10*u,8*u,18*u,-0.2,0,TAU); });
  sh(g,'#6d9c34',3.6*u,(g)=>{ g.ellipse(0,6*u,24*u,28*u,0,0,TAU); });
  sh(g,'#b6d96a',0,(g)=>{ g.ellipse(0,8*u,16*u,20*u,0,0,TAU); });
  sh(g,'#8a5a2c',0,(g)=>{ g.ellipse(0,14*u,10*u,11*u,0,0,TAU); });
  sh(g,'#3a3a42',3*u,(g)=>{ g.ellipse(0,-20*u,15*u,13*u,0,0,TAU); });
  sh(g,'#5a4a4a',0,(g)=>{ g.ellipse(0,-16*u,10*u,8*u,0,0,TAU); });
  eyes(g,u,0,-21*u,5*u,3*u);
  dot(g,-3*u,-12*u,1.4*u,OUT); dot(g,3*u,-12*u,1.4*u,OUT);
});
// Tracotucotulu Delapeladustuz — light-blue VW Beetle camel with legs for wheels
makeSprite('tracotucotulu', 130, (g,u)=>{
  sh(g,'#9fcfe0',3.6*u,(g)=>{ g.moveTo(-34*u,12*u); g.quadraticCurveTo(-30*u,-14*u,-6*u,-18*u); g.quadraticCurveTo(20*u,-20*u,32*u,2*u); g.quadraticCurveTo(34*u,12*u,32*u,15*u); g.lineTo(-32*u,15*u); g.closePath(); });
  sh(g,'#2b3038',0,(g)=>{ g.moveTo(-22*u,-2*u); g.quadraticCurveTo(-18*u,-14*u,-4*u,-15*u); g.quadraticCurveTo(8*u,-15*u,12*u,-3*u); g.closePath(); });
  dot(g,26*u,2*u,4*u,'#fff7c0'); g.strokeStyle=OUT; g.lineWidth=1.6*u; g.beginPath(); g.arc(26*u,2*u,4*u,0,TAU); g.stroke();
  sh(g,'#cda86a',2.8*u,(g)=>{ g.ellipse(33*u,-7*u,9*u,8*u,0,0,TAU); });
  sh(g,'#cda86a',0,(g)=>{ g.ellipse(40*u,-3*u,5*u,4*u,0,0,TAU); });
  eyes(g,u,34*u,-9*u,3.4*u,2.2*u);
  g.lineCap='round'; for(const lx of [-22,-8,8,22]){ g.strokeStyle='#b08a4a'; g.lineWidth=4*u; g.beginPath(); g.moveTo(lx*u,13*u); g.lineTo(lx*u,29*u); g.stroke(); g.strokeStyle=OUT; g.lineWidth=1.4*u; g.beginPath(); g.moveTo(lx*u,13*u); g.lineTo(lx*u,29*u); g.stroke(); }
});

// ---- pickups ----
makeSprite('gem', 56, (g,u)=>{
  sh(g,'#4fc3f7',3*u,(g)=>{ g.moveTo(0,-22*u); g.lineTo(16*u,-4*u); g.lineTo(0,22*u); g.lineTo(-16*u,-4*u); g.closePath(); });
  sh(g,'#bdeaff',0,(g)=>{ g.moveTo(0,-22*u); g.lineTo(16*u,-4*u); g.lineTo(0,-4*u); g.closePath(); });
});
makeSprite('gembig', 64, (g,u)=>{
  sh(g,'#7c5cff',3.4*u,(g)=>{ g.moveTo(0,-24*u); g.lineTo(18*u,-4*u); g.lineTo(0,24*u); g.lineTo(-18*u,-4*u); g.closePath(); });
  sh(g,'#d6c9ff',0,(g)=>{ g.moveTo(0,-24*u); g.lineTo(18*u,-4*u); g.lineTo(0,-4*u); g.closePath(); });
});
// ---- XP orb tiers: small light-blue / medium emerald / large gold (w/ shine) ----
makeSprite('orbS', 48, (g,u)=>{
  sh(g,'#bfe6ff',3*u,(g)=>{ g.moveTo(0,-20*u); g.lineTo(14*u,-3*u); g.lineTo(0,20*u); g.lineTo(-14*u,-3*u); g.closePath(); });
  sh(g,'#eaf7ff',0,(g)=>{ g.moveTo(0,-20*u); g.lineTo(14*u,-3*u); g.lineTo(0,-3*u); g.closePath(); });
});
makeSprite('orbM', 56, (g,u)=>{
  sh(g,'#46d98a',3.2*u,(g)=>{ g.moveTo(0,-22*u); g.lineTo(16*u,-3*u); g.lineTo(0,22*u); g.lineTo(-16*u,-3*u); g.closePath(); });
  sh(g,'#b8f5d6',0,(g)=>{ g.moveTo(0,-22*u); g.lineTo(16*u,-3*u); g.lineTo(0,-3*u); g.closePath(); });
});
makeSprite('orbL', 64, (g,u)=>{
  sh(g,'#ffc23a',3.6*u,(g)=>{ g.moveTo(0,-26*u); g.lineTo(19*u,-3*u); g.lineTo(0,26*u); g.lineTo(-19*u,-3*u); g.closePath(); });
  sh(g,'#fff0c0',0,(g)=>{ g.moveTo(0,-26*u); g.lineTo(19*u,-3*u); g.lineTo(0,-3*u); g.closePath(); });
  sh(g,'#ffffff',0,(g)=>{ g.moveTo(0,-12*u); g.lineTo(3.5*u,-3*u); g.lineTo(0,6*u); g.lineTo(-3.5*u,-3*u); g.closePath(); });
});
makeSprite('coin', 52, (g,u)=>{
  sh(g,'#f5c542',3.4*u,(g)=>{ g.arc(0,0,20*u,0,TAU); });
  sh(g,'#ffe39a',0,(g)=>{ g.arc(0,0,13*u,0,TAU); });
  g.strokeStyle='#caa12f'; g.lineWidth=2.4*u; g.beginPath(); g.arc(0,0,9*u,0,TAU); g.stroke();   // minted ring (coin face)
  sh(g,'#fff7d8',0,(g)=>{ g.ellipse(-6*u,-7*u,4*u,2.6*u,-0.6,0,TAU); });                          // shine
});
makeSprite('heart', 52, (g,u)=>{
  sh(g,'#e8556a',3*u,(g)=>{ g.moveTo(0,18*u); g.bezierCurveTo(-22*u,2*u,-14*u,-18*u,0,-6*u); g.bezierCurveTo(14*u,-18*u,22*u,2*u,0,18*u); });
  sh(g,'#ff97a6',0,(g)=>{ g.ellipse(-7*u,-4*u,4*u,5*u,-0.5,0,TAU); });
});
// ---- gold "lucky" XP gem: medium size, dropped by lucky blocks ----
makeSprite('orbGold', 56, (g,u)=>{
  sh(g,'#ffcf3a',3.2*u,(g)=>{ g.moveTo(0,-22*u); g.lineTo(16*u,-3*u); g.lineTo(0,22*u); g.lineTo(-16*u,-3*u); g.closePath(); });
  sh(g,'#ffeeb0',0,(g)=>{ g.moveTo(0,-22*u); g.lineTo(16*u,-3*u); g.lineTo(0,-3*u); g.closePath(); });
  sh(g,'#ffffff',0,(g)=>{ g.moveTo(0,-11*u); g.lineTo(3*u,-3*u); g.lineTo(0,5*u); g.lineTo(-3*u,-3*u); g.closePath(); });
});
// ---- lucky block: gold "?" block in the house style (a standing, shootable target) ----
makeSprite('luckyblock', 72, (g,u)=>{
  sh(g,'#f0901e',4*u,(g)=>{ g.roundRect(-28*u,-28*u,56*u,56*u,9*u); });   // orange frame
  sh(g,'#ffd23a',0,(g)=>{ g.roundRect(-21*u,-21*u,42*u,42*u,5*u); });     // gold panel
  sh(g,'#ffe88a',0,(g)=>{ g.roundRect(-21*u,-21*u,42*u,18*u,5*u); });     // top sheen
  for(const sx of [-1,1]) for(const sy of [-1,1]){ dot(g, sx*21*u, sy*21*u, 3*u, '#fff3c4'); g.strokeStyle=OUT; g.lineWidth=1.4*u; g.beginPath(); g.arc(sx*21*u, sy*21*u, 3*u, 0, TAU); g.stroke(); }   // corner studs
  g.font='900 '+Math.round(44*u)+'px sans-serif'; g.textAlign='center'; g.textBaseline='middle';
  g.lineJoin='round'; g.strokeStyle=OUT; g.lineWidth=4*u; g.strokeText('?',0,3*u);
  g.fillStyle='#fff'; g.fillText('?',0,3*u);
});
// ---- magnet pickup icon: red horseshoe magnet with steel tips ----
makeSprite('magnet', 56, (g,u)=>{
  const R=15*u, legY=18*u;
  function horse(col,w){ g.strokeStyle=col; g.lineWidth=w; g.lineCap='butt';
    g.beginPath(); g.arc(0,-3*u,R,Math.PI,TAU); g.stroke();
    g.beginPath(); g.moveTo(-R,-3*u); g.lineTo(-R,legY); g.stroke();
    g.beginPath(); g.moveTo( R,-3*u); g.lineTo( R,legY); g.stroke(); }
  horse(OUT, 15*u);        // dark outline
  horse('#e0392e', 10*u);  // red body
  g.strokeStyle='#d7dde6'; g.lineWidth=10*u;   // steel tips
  g.beginPath(); g.moveTo(-R,legY-7*u); g.lineTo(-R,legY); g.stroke();
  g.beginPath(); g.moveTo( R,legY-7*u); g.lineTo( R,legY); g.stroke();
  g.fillStyle='#ffffff'; g.globalAlpha=0.5; g.beginPath(); g.arc(-2*u,-15*u,3*u,0,TAU); g.fill(); g.globalAlpha=1;   // sheen
});

// ============ UI ICONS (house-drawn, replace emojis) ============
function _sword(g,u,blade){
  sh(g,blade,3*u,(g)=>{ g.moveTo(0,-32*u); g.lineTo(7*u,-22*u); g.lineTo(5*u,15*u); g.lineTo(-5*u,15*u); g.lineTo(-7*u,-22*u); g.closePath(); }); // blade
  sh(g,'#caa12f',3*u,(g)=>{ g.rect(-13*u,14*u,26*u,6*u); });   // guard
  sh(g,'#8a5d2c',3*u,(g)=>{ g.rect(-4*u,20*u,8*u,15*u); });    // grip
  dot(g,0,37*u,4*u,'#caa12f');                                  // pommel
}
makeSprite('ic_dmg', 64, (g,u)=>{ g.rotate(0.5); _sword(g,u,'#d7dde6'); });
makeSprite('ic_battle', 64, (g,u)=>{
  g.save(); g.rotate(-0.78); g.translate(0,2*u); _sword(g,u*0.92,'#d7dde6'); g.restore();
  g.save(); g.rotate( 0.78); g.translate(0,2*u); _sword(g,u*0.92,'#cdd4de'); g.restore();
});
makeSprite('ic_shop', 64, (g,u)=>{
  sh(g,'#f0a23a',3.4*u,(g)=>{ g.moveTo(-23*u,-4*u); g.lineTo(23*u,-4*u); g.lineTo(18*u,30*u); g.lineTo(-18*u,30*u); g.closePath(); }); // bag
  g.strokeStyle=OUT; g.lineWidth=3.2*u; g.beginPath(); g.arc(-9*u,-6*u,9*u,Math.PI,TAU); g.stroke();
  g.beginPath(); g.arc(9*u,-6*u,9*u,Math.PI,TAU); g.stroke();
  sh(g,'#fff',0,(g)=>{ g.ellipse(-2*u,12*u,9*u,11*u,0,0,TAU); }); sh(g,'#f0a23a',2*u,(g)=>{ g.moveTo(-2*u,4*u); g.lineTo(-2*u,20*u); });
});
makeSprite('ic_bag', 64, (g,u)=>{
  sh(g,'#5fae4a',3.6*u,(g)=>{ g.roundRect(-21*u,-14*u,42*u,46*u,11*u); }); // body
  sh(g,'#4a8f3a',3*u,(g)=>{ g.roundRect(-14*u,4*u,28*u,20*u,6*u); });      // pocket
  sh(g,OUT,3*u,(g)=>{ g.moveTo(-9*u,-14*u); g.lineTo(-9*u,-22*u); g.lineTo(9*u,-22*u); g.lineTo(9*u,-14*u); }); // top loop
  dot(g,0,13*u,3.2*u,'#fff');
});
makeSprite('ic_skull', 64, (g,u)=>{
  sh(g,'#eef0f2',3.4*u,(g)=>{ g.arc(0,-4*u,21*u,Math.PI,TAU); g.lineTo(13*u,16*u); g.lineTo(-13*u,16*u); g.closePath(); }); // cranium
  sh(g,'#eef0f2',3*u,(g)=>{ g.roundRect(-13*u,10*u,26*u,13*u,4*u); }); // jaw
  dot(g,-9*u,-2*u,6.5*u,OUT); dot(g,9*u,-2*u,6.5*u,OUT);               // eyes
  sh(g,OUT,0,(g)=>{ g.moveTo(0,6*u); g.lineTo(-4*u,13*u); g.lineTo(4*u,13*u); g.closePath(); }); // nose
  g.strokeStyle=OUT; g.lineWidth=2*u; for(const x of [-7,0,7]){ g.beginPath(); g.moveTo(x*u,14*u); g.lineTo(x*u,23*u); g.stroke(); }
});
makeSprite('ic_spd', 64, (g,u)=>{
  sh(g,'#4aa3df',3.4*u,(g)=>{ g.moveTo(-14*u,-20*u); g.lineTo(0,-20*u); g.lineTo(4*u,6*u); g.lineTo(26*u,8*u); g.lineTo(26*u,20*u); g.lineTo(-14*u,20*u); g.closePath(); }); // boot
  sh(g,'#2f7fb8',0,(g)=>{ g.rect(-14*u,15*u,40*u,6*u); }); // sole
  g.strokeStyle=OUT; g.lineWidth=2.6*u; for(let i=0;i<3;i++){ g.beginPath(); g.moveTo(-32*u,-12*u+i*11*u); g.lineTo(-21*u,-12*u+i*11*u); g.stroke(); }
});
makeSprite('ic_rng', 64, (g,u)=>{
  sh(g,'#fff',3*u,(g)=>{ g.arc(0,0,23*u,0,TAU); });
  sh(g,'#5fbf52',0,(g)=>{ g.arc(0,0,16*u,0,TAU); });
  sh(g,'#fff',0,(g)=>{ g.arc(0,0,8*u,0,TAU); });
  dot(g,0,0,4*u,'#e0392e');
  g.strokeStyle=OUT; g.lineWidth=2.8*u; for(const a of [0,Math.PI/2,Math.PI,-Math.PI/2]){ g.beginPath(); g.moveTo(Math.cos(a)*21*u,Math.sin(a)*21*u); g.lineTo(Math.cos(a)*31*u,Math.sin(a)*31*u); g.stroke(); }
});
makeSprite('ic_hp', 64, (g,u)=>{   // heart with a white cross = bonus max HP
  sh(g,'#e23b5a',2.8*u,(g)=>{
    g.moveTo(0,-9*u);
    g.bezierCurveTo(-3*u,-21*u,-22*u,-19*u,-22*u,-5*u);
    g.bezierCurveTo(-22*u,7*u,-5*u,16*u,0,23*u);
    g.bezierCurveTo(5*u,16*u,22*u,7*u,22*u,-5*u);
    g.bezierCurveTo(22*u,-19*u,3*u,-21*u,0,-9*u);
    g.closePath();
  });
  g.fillStyle='#fff'; g.fillRect(-2.6*u,-7*u,5.2*u,15*u); g.fillRect(-8*u,-1.4*u,16*u,5.2*u);
});
makeSprite('ic_crate', 64, (g,u)=>{
  sh(g,'#b98248',3.6*u,(g)=>{ g.rect(-25*u,-20*u,50*u,44*u); });
  g.strokeStyle='#8a5d2c'; g.lineWidth=3*u;
  g.beginPath(); g.moveTo(-25*u,-20*u); g.lineTo(25*u,24*u); g.moveTo(25*u,-20*u); g.lineTo(-25*u,24*u); g.stroke();
  sh(g,'#a06f38',0,(g)=>{ g.rect(-25*u,-20*u,50*u,8*u); });
  sh(g,'#a06f38',0,(g)=>{ g.rect(-25*u,16*u,50*u,8*u); });
});
makeSprite('ic_bolt', 64, (g,u)=>{
  sh(g,'#ffd24a',3.4*u,(g)=>{ g.moveTo(7*u,-30*u); g.lineTo(-17*u,7*u); g.lineTo(-1*u,7*u); g.lineTo(-8*u,30*u); g.lineTo(18*u,-8*u); g.lineTo(2*u,-8*u); g.closePath(); });
});
makeSprite('ic_char', 64, (g,u)=>{
  sh(g,'#5fbf52',3.2*u,(g)=>{ g.roundRect(-15*u,-2*u,30*u,28*u,5*u); }); // body
  sh(g,'#f0c890',3.4*u,(g)=>{ g.arc(0,-16*u,13*u,0,TAU); });            // head
  dot(g,-5*u,-18*u,2.8*u,OUT); dot(g,5*u,-18*u,2.8*u,OUT);              // eyes
});
makeSprite('ic_pet', 64, (g,u)=>{
  sh(g,'#e88030',3*u,(g)=>{ g.ellipse(0,10*u,15*u,12*u,0,0,TAU); }); // main pad
  for(const [tx,ty] of [[-13*u,-4*u],[13*u,-4*u],[-5*u,-16*u],[5*u,-16*u]]){
    sh(g,'#e88030',2.6*u,(g)=>{ g.arc(tx,ty,6*u,0,TAU); }); // toe pads
  }
});
function _spk(g,u){ sh(g,'#fbf3df',3*u,(g)=>{ g.moveTo(-20*u,-9*u); g.lineTo(-7*u,-9*u); g.lineTo(7*u,-22*u); g.lineTo(7*u,22*u); g.lineTo(-7*u,9*u); g.lineTo(-20*u,9*u); g.closePath(); }); }
makeSprite('ic_snd', 64, (g,u)=>{
  g.translate(-7*u,0);   // content spans -20..33 -> shift left so it sits centred in the canvas
  _spk(g,u); g.strokeStyle=OUT; g.lineWidth=3*u; g.lineCap='round';
  g.beginPath(); g.arc(8*u,0,15*u,-0.7,0.7); g.stroke();
  g.beginPath(); g.arc(8*u,0,25*u,-0.7,0.7); g.stroke(); g.lineCap='butt';
});
makeSprite('ic_mute', 64, (g,u)=>{
  g.translate(-7*u,0);
  _spk(g,u); g.strokeStyle='#e0392e'; g.lineWidth=3.6*u; g.lineCap='round';
  g.beginPath(); g.moveTo(16*u,-12*u); g.lineTo(31*u,12*u); g.moveTo(31*u,-12*u); g.lineTo(16*u,12*u); g.stroke(); g.lineCap='butt';
});

// ============ ABILITY ICONS (one per upgrade, keyed ab_<id>) ============
function _heart(g,u,c){ sh(g,c,3*u,(g)=>{ g.moveTo(0,18*u); g.bezierCurveTo(-22*u,2*u,-14*u,-18*u,0,-6*u); g.bezierCurveTo(14*u,-18*u,22*u,2*u,0,18*u); }); }
function _flame(g,u,c1,c2){ sh(g,c1,3*u,(g)=>{ g.moveTo(0,24*u); g.bezierCurveTo(-20*u,10*u,-8*u,-6*u,-2*u,-22*u); g.bezierCurveTo(2*u,-10*u,14*u,-10*u,8*u,2*u); g.bezierCurveTo(20*u,8*u,16*u,22*u,0,24*u); }); if(c2) sh(g,c2,0,(g)=>{ g.ellipse(0,12*u,7*u,10*u,0,0,TAU); }); }
function _shield(g,u,c){ sh(g,c,3.4*u,(g)=>{ g.moveTo(0,-26*u); g.lineTo(20*u,-17*u); g.lineTo(20*u,4*u); g.bezierCurveTo(20*u,20*u,0,28*u,0,28*u); g.bezierCurveTo(0,28*u,-20*u,20*u,-20*u,4*u); g.lineTo(-20*u,-17*u); g.closePath(); }); }
function _burst(g,u,c,n){ g.beginPath(); for(let i=0;i<n*2;i++){ const a=i/(n*2)*TAU-Math.PI/2, r=(i%2?13:30)*u; i?g.lineTo(Math.cos(a)*r,Math.sin(a)*r):g.moveTo(Math.cos(a)*r,Math.sin(a)*r);} g.closePath(); g.fillStyle=c; g.fill(); g.strokeStyle=OUT; g.lineWidth=3*u; g.stroke(); }
function _bolt(g,u,c){ sh(g,c,3*u,(g)=>{ g.moveTo(6*u,-26*u); g.lineTo(-14*u,6*u); g.lineTo(-1*u,6*u); g.lineTo(-7*u,26*u); g.lineTo(15*u,-7*u); g.lineTo(2*u,-7*u); g.closePath(); }); }
function _rings(g,u,c,cx,cy,a0,a1){ for(const r of [11,19,27]){ g.strokeStyle=c; g.lineWidth=3*u; g.beginPath(); g.arc(cx,cy,r*u,a0,a1); g.stroke(); } }

makeSprite('ab_dmg',64,(g,u)=>{ _burst(g,u,'#e8552d',8); dot(g,0,0,8*u,'#ffd24a'); });
makeSprite('ab_rate',64,(g,u)=>{ for(let i=-1;i<=1;i++){ sh(g,'#caa12f',0,(g)=>{ g.rect(-20*u,i*13*u-2.5*u,22*u,5*u); }); sh(g,'#ffd24a',2.4*u,(g)=>{ g.moveTo(20*u,i*13*u); g.lineTo(4*u,i*13*u-8*u); g.lineTo(4*u,i*13*u+8*u); g.closePath(); }); } });
makeSprite('ab_speed',64,(g,u)=>{ sh(g,'#4aa3df',3.4*u,(g)=>{ g.moveTo(-12*u,-16*u); g.lineTo(2*u,-16*u); g.lineTo(6*u,6*u); g.lineTo(24*u,8*u); g.lineTo(24*u,20*u); g.lineTo(-12*u,20*u); g.closePath(); }); sh(g,'#2f7fb8',0,(g)=>{ g.rect(-12*u,15*u,38*u,6*u); }); sh(g,'#bfe3ff',2.2*u,(g)=>{ g.moveTo(-12*u,-2*u); g.lineTo(-30*u,-7*u); g.lineTo(-12*u,-11*u); g.closePath(); }); });
makeSprite('ab_hp',64,(g,u)=>{ _heart(g,u,'#e8556a'); sh(g,'#fff',0,(g)=>{ g.rect(-3*u,-7*u,6*u,15*u); }); sh(g,'#fff',0,(g)=>{ g.rect(-9*u,-2.5*u,18*u,6*u); }); });
makeSprite('ab_magnet',64,(g,u)=>{ g.lineCap='butt'; g.strokeStyle='#e0392e'; g.lineWidth=11*u; g.beginPath(); g.arc(0,-2*u,16*u,Math.PI,0,true); g.stroke(); g.beginPath(); g.moveTo(-16*u,-2*u); g.lineTo(-16*u,16*u); g.moveTo(16*u,-2*u); g.lineTo(16*u,16*u); g.stroke(); g.strokeStyle='#cfd6df'; g.beginPath(); g.moveTo(-16*u,11*u); g.lineTo(-16*u,18*u); g.moveTo(16*u,11*u); g.lineTo(16*u,18*u); g.stroke(); });
makeSprite('ab_armor',64,(g,u)=>{ _shield(g,u,'#9aa3af'); for(const p of [[-8,-6],[8,-6],[-8,8],[8,8]]) dot(g,p[0]*u,p[1]*u,2.4*u,'#5a6577'); });
makeSprite('ab_regen',64,(g,u)=>{ _heart(g,u,'#5fbf52'); sh(g,'#fff',0,(g)=>{ g.rect(-3*u,-7*u,6*u,15*u); }); sh(g,'#fff',0,(g)=>{ g.rect(-9*u,-2.5*u,18*u,6*u); }); });
makeSprite('ab_heavy',64,(g,u)=>{ sh(g,'#ffd24a',3.4*u,(g)=>{ g.moveTo(0,-24*u); g.bezierCurveTo(14*u,-24*u,14*u,-10*u,14*u,-10*u); g.lineTo(14*u,18*u); g.lineTo(-14*u,18*u); g.lineTo(-14*u,-10*u); g.bezierCurveTo(-14*u,-24*u,0,-24*u,0,-24*u); }); sh(g,'#caa12f',0,(g)=>{ g.rect(-14*u,8*u,28*u,10*u); }); sh(g,'#fff6bf',0,(g)=>{ g.ellipse(-5*u,-8*u,3*u,6*u,0,0,TAU); }); });
makeSprite('ab_thick',64,(g,u)=>{ sh(g,'#9aa3af',3.6*u,(g)=>{ g.roundRect(-20*u,-22*u,40*u,44*u,10*u); }); sh(g,'#7a8696',2.6*u,(g)=>{ g.roundRect(-12*u,-14*u,24*u,28*u,6*u); }); });
makeSprite('ab_crit',64,(g,u)=>{ _rings(g,u,'#e0392e',0,0,0,TAU); dot(g,0,0,5*u,'#e0392e'); g.strokeStyle=OUT; g.lineWidth=2.6*u; for(const a of [0,Math.PI/2,Math.PI,-Math.PI/2]){ g.beginPath(); g.moveTo(Math.cos(a)*19*u,Math.sin(a)*19*u); g.lineTo(Math.cos(a)*30*u,Math.sin(a)*30*u); g.stroke(); } });
makeSprite('ab_dashcd',64,(g,u)=>{ sh(g,'#4aa3df',3*u,(g)=>{ g.arc(0,0,23*u,0,TAU); }); _bolt(g,u,'#ffd24a'); });
makeSprite('ab_critdmg',64,(g,u)=>{ g.rotate(0.5); sh(g,'#e0392e',3*u,(g)=>{ g.moveTo(0,-26*u); g.lineTo(5*u,-16*u); g.lineTo(3*u,14*u); g.lineTo(-3*u,14*u); g.lineTo(-5*u,-16*u); g.closePath(); }); sh(g,'#caa12f',3*u,(g)=>{ g.rect(-9*u,13*u,18*u,5*u); }); sh(g,'#8a5d2c',3*u,(g)=>{ g.rect(-3*u,18*u,6*u,13*u); }); });
makeSprite('ab_gold',64,(g,u)=>{ for(let i=0;i<3;i++){ sh(g,'#f5c542',3*u,(g)=>{ g.ellipse(0,13*u-i*11*u,18*u,8*u,0,0,TAU); }); sh(g,'#ffe39a',0,(g)=>{ g.ellipse(0,11*u-i*11*u,12*u,4.5*u,0,0,TAU); }); } });
makeSprite('ab_steady',64,(g,u)=>{ g.strokeStyle='#5fbf52'; g.lineWidth=3.4*u; g.beginPath(); g.arc(0,0,22*u,0,TAU); g.stroke(); dot(g,0,0,4*u,'#5fbf52'); g.strokeStyle=OUT; g.lineWidth=2.6*u; for(const a of [0,Math.PI/2,Math.PI,-Math.PI/2]){ g.beginPath(); g.moveTo(Math.cos(a)*8*u,Math.sin(a)*8*u); g.lineTo(Math.cos(a)*22*u,Math.sin(a)*22*u); g.stroke(); } });
makeSprite('ab_frenzy',64,(g,u)=>{ _flame(g,u,'#e8552d','#ffd24a'); });
makeSprite('ab_glass',64,(g,u)=>{ g.rotate(-0.5); sh(g,'#7a8696',3.4*u,(g)=>{ g.roundRect(-12*u,-7*u,34*u,16*u,4*u); }); sh(g,'#2a2030',0,(g)=>{ g.ellipse(22*u,1*u,5*u,8*u,0,0,TAU); }); sh(g,'#cfd6df',3*u,(g)=>{ g.arc(-12*u,1*u,11*u,0,TAU); }); dot(g,-12*u,1*u,3*u,'#5a6577'); });
makeSprite('ab_multi',64,(g,u)=>{ for(const a of [-0.42,0,0.42]){ g.save(); g.rotate(a); sh(g,'#5fe6ff',0,(g)=>{ g.rect(-2.5*u,-14*u,5*u,30*u); }); sh(g,'#5fe6ff',2.4*u,(g)=>{ g.moveTo(0,-26*u); g.lineTo(8*u,-14*u); g.lineTo(-8*u,-14*u); g.closePath(); }); g.restore(); } });
makeSprite('ab_pierce',64,(g,u)=>{ sh(g,'#9aa3af',2.6*u,(g)=>{ g.rect(-5*u,-16*u,10*u,32*u); }); sh(g,'#5fe6ff',0,(g)=>{ g.rect(-28*u,-4*u,46*u,8*u); }); sh(g,'#5fe6ff',2.6*u,(g)=>{ g.moveTo(30*u,0); g.lineTo(16*u,-13*u); g.lineTo(16*u,13*u); g.closePath(); }); });
makeSprite('ab_range',64,(g,u)=>{ sh(g,'#4aa3df',3.4*u,(g)=>{ g.arc(0,0,22*u,0,TAU); }); sh(g,'#bfe3ff',0,(g)=>{ g.arc(0,0,14*u,0,TAU); }); g.strokeStyle=OUT; g.lineWidth=2.6*u; g.beginPath(); g.moveTo(-22*u,0); g.lineTo(22*u,0); g.moveTo(0,-22*u); g.lineTo(0,22*u); g.stroke(); dot(g,-6*u,-6*u,4*u,'#fff'); });
makeSprite('ab_orbit',64,(g,u)=>{ dot(g,0,0,7*u,'#4aa3df'); g.strokeStyle=OUT; g.lineWidth=1.6*u; g.beginPath(); g.arc(0,0,7*u,0,TAU); g.stroke(); g.strokeStyle='#5fe6ff'; g.lineWidth=2.4*u; g.setLineDash([6*u,5*u]); g.beginPath(); g.arc(0,0,22*u,0,TAU); g.stroke(); g.setLineDash([]); dot(g,22*u,0,6*u,'#5fe6ff'); g.strokeStyle=OUT; g.beginPath(); g.arc(22*u,0,6*u,0,TAU); g.stroke(); });
makeSprite('ab_nova',64,(g,u)=>{ _rings(g,u,'#7ecbff',0,0,0,TAU); dot(g,0,0,7*u,'#cfeaff'); g.strokeStyle=OUT; g.lineWidth=1.4*u; g.beginPath(); g.arc(0,0,7*u,0,TAU); g.stroke(); });
makeSprite('ab_vamp',64,(g,u)=>{ _heart(g,u,'#a02838'); sh(g,'#fff',0,(g)=>{ g.moveTo(-6*u,3*u); g.lineTo(-3*u,11*u); g.lineTo(0,3*u); g.closePath(); }); sh(g,'#fff',0,(g)=>{ g.moveTo(6*u,3*u); g.lineTo(3*u,11*u); g.lineTo(0,3*u); g.closePath(); }); });
makeSprite('ab_slow',64,(g,u)=>{ g.strokeStyle='#7ecbff'; g.lineWidth=3*u; g.lineCap='round'; for(let i=0;i<6;i++){ g.save(); g.rotate(i*Math.PI/3); g.beginPath(); g.moveTo(0,0); g.lineTo(0,-26*u); g.moveTo(0,-15*u); g.lineTo(-7*u,-21*u); g.moveTo(0,-15*u); g.lineTo(7*u,-21*u); g.stroke(); g.restore(); } g.lineCap='butt'; dot(g,0,0,4*u,'#bfe3ff'); });
makeSprite('ab_aegis',64,(g,u)=>{ g.globalAlpha=0.45; dot(g,0,0,24*u,'#7ecbff'); g.globalAlpha=1; g.strokeStyle='#5fe6ff'; g.lineWidth=4*u; g.beginPath(); g.arc(0,0,24*u,0,TAU); g.stroke(); sh(g,'#fff',0,(g)=>{ g.ellipse(-8*u,-9*u,5*u,9*u,-0.5,0,TAU); }); });
makeSprite('ab_blackhole',64,(g,u)=>{ dot(g,0,0,24*u,'#2a0d3a'); g.strokeStyle='#b06ff0'; g.lineWidth=3*u; for(let s=0;s<3;s++){ const a0=s*TAU/3; g.beginPath(); for(let t=0;t<=1.001;t+=0.1){ const rr=23*u*t, aa=a0+t*4.5, xx=Math.cos(aa)*rr, yy=Math.sin(aa)*rr; t?g.lineTo(xx,yy):g.moveTo(xx,yy);} g.stroke(); } dot(g,0,0,6*u,'#110018'); });
makeSprite('ab_phoenix',64,(g,u)=>{ _flame(g,u,'#ff7a3a','#ffd24a'); sh(g,'#ffd24a',2.2*u,(g)=>{ g.moveTo(-4*u,6*u); g.lineTo(-22*u,0); g.lineTo(-6*u,13*u); }); sh(g,'#ffd24a',2.2*u,(g)=>{ g.moveTo(4*u,6*u); g.lineTo(22*u,0); g.lineTo(6*u,13*u); }); });
makeSprite('ab_tremor',64,(g,u)=>{ sh(g,'#8a5d2c',0,(g)=>{ g.rect(-26*u,8*u,52*u,18*u); }); g.strokeStyle='#3a2616'; g.lineWidth=3*u; g.beginPath(); g.moveTo(-2*u,8*u); g.lineTo(-7*u,-4*u); g.lineTo(2*u,-13*u); g.lineTo(-3*u,-24*u); g.moveTo(2*u,8*u); g.lineTo(9*u,-2*u); g.lineTo(5*u,-12*u); g.stroke(); });
makeSprite('ab_aftershock',64,(g,u)=>{ sh(g,'#caa15a',0,(g)=>{ g.rect(-28*u,16*u,56*u,12*u); }); for(const r of [10,18,26]){ g.strokeStyle='#e8552d'; g.lineWidth=3*u; g.beginPath(); g.arc(0,16*u,r*u,Math.PI,TAU); g.stroke(); } dot(g,0,16*u,4*u,'#ffd24a'); });
makeSprite('ab_gravcrush',64,(g,u)=>{ dot(g,0,0,8*u,'#b06ff0'); g.strokeStyle=OUT; g.lineWidth=1.6*u; g.beginPath(); g.arc(0,0,8*u,0,TAU); g.stroke(); for(let i=0;i<4;i++){ g.save(); g.rotate(i*Math.PI/2); sh(g,'#d2a0ff',2.4*u,(g)=>{ g.moveTo(0,-13*u); g.lineTo(-6*u,-24*u); g.lineTo(6*u,-24*u); g.closePath(); }); g.restore(); } });
makeSprite('ab_abyssal',64,(g,u)=>{ dot(g,0,0,24*u,'#2a0d3a'); g.strokeStyle='#6a4f8a'; g.lineWidth=3*u; g.beginPath(); g.arc(0,0,24*u,0,TAU); g.stroke(); sh(g,'#d2a0ff',0,(g)=>{ g.ellipse(0,0,15*u,9*u,0,0,TAU); }); dot(g,0,0,5*u,'#2a0d3a'); });
makeSprite('ab_frostfire',64,(g,u)=>{ g.save(); g.beginPath(); g.rect(-32*u,-32*u,32*u,64*u); g.clip(); dot(g,0,0,22*u,'#7ecbff'); g.restore(); g.save(); g.beginPath(); g.rect(0,-32*u,32*u,64*u); g.clip(); dot(g,0,0,22*u,'#e8552d'); g.restore(); g.strokeStyle=OUT; g.lineWidth=3*u; g.beginPath(); g.arc(0,0,22*u,0,TAU); g.stroke(); });
makeSprite('ab_eventhz',64,(g,u)=>{ dot(g,0,0,15*u,'#2a0d3a'); g.strokeStyle='#b06ff0'; g.lineWidth=2.6*u; g.beginPath(); g.arc(0,0,15*u,0,TAU); g.stroke(); g.strokeStyle='#7ecbff'; g.lineWidth=3*u; g.beginPath(); g.arc(0,0,26*u,0,TAU); g.stroke(); dot(g,0,0,5*u,'#110018'); });
makeSprite('ab_bloodcrit',64,(g,u)=>{ sh(g,'#c2342e',3*u,(g)=>{ g.moveTo(0,-24*u); g.bezierCurveTo(16*u,2*u,12*u,22*u,0,22*u); g.bezierCurveTo(-12*u,22*u,-16*u,2*u,0,-24*u); }); g.fillStyle='#ffd24a'; g.beginPath(); for(let i=0;i<10;i++){ const a=i/10*TAU-Math.PI/2, r=(i%2?3:7)*u; i?g.lineTo(Math.cos(a)*r,Math.sin(a)*r+5*u):g.moveTo(Math.cos(a)*r,Math.sin(a)*r+5*u);} g.closePath(); g.fill(); });
makeSprite('ab_glassphx',64,(g,u)=>{ _flame(g,u,'#ff7a3a','#ffd24a'); sh(g,'#bfe3ff',2*u,(g)=>{ g.moveTo(0,4*u); g.lineTo(7*u,12*u); g.lineTo(0,20*u); g.lineTo(-7*u,12*u); g.closePath(); }); });
makeSprite('ab_orbstorm',64,(g,u)=>{ for(let i=0;i<4;i++){ g.save(); g.rotate(i*Math.PI/2+Math.PI/4); g.translate(0,-20*u); _bolt(g,u*0.45,'#ffd24a'); g.restore(); } dot(g,0,0,12*u,'#5fe6ff'); g.strokeStyle=OUT; g.lineWidth=2*u; g.beginPath(); g.arc(0,0,12*u,0,TAU); g.stroke(); });
makeSprite('ab_overdrive',64,(g,u)=>{ g.lineCap='round'; g.strokeStyle='#46566f'; g.lineWidth=5*u; g.beginPath(); g.arc(0,8*u,22*u,Math.PI,0); g.stroke(); g.strokeStyle='#e0392e'; g.beginPath(); g.arc(0,8*u,22*u,Math.PI*0.62,0); g.stroke(); g.lineCap='butt'; g.strokeStyle=OUT; g.lineWidth=3*u; g.beginPath(); g.moveTo(0,8*u); g.lineTo(15*u,-9*u); g.stroke(); dot(g,0,8*u,4*u,OUT); });
makeSprite('ab_aegisnova',64,(g,u)=>{ _shield(g,u,'#7ecbff'); g.strokeStyle='#fff'; g.lineWidth=2.4*u; for(const r of [26,31]){ g.beginPath(); g.arc(0,0,r*u,-0.55,0.55); g.stroke(); } });
makeSprite('ab_knives',64,(g,u)=>{
  for(const s of [1,-1]){
    g.save(); g.rotate(s*0.48);
    sh(g,'#bfc5cf',2.8*u,(g)=>{ g.moveTo(0,-28*u); g.lineTo(4*u,-18*u); g.lineTo(3*u,14*u); g.lineTo(-3*u,14*u); g.lineTo(-4*u,-18*u); g.closePath(); });
    sh(g,'#caa12f',2.6*u,(g)=>{ g.roundRect(-5.5*u,13*u,11*u,7*u,2*u); });
    sh(g,'#8a5d2c',2.4*u,(g)=>{ g.roundRect(-4*u,19*u,8*u,10*u,2*u); });
    g.restore();
  }
});
makeSprite('ab_secondwind',64,(g,u)=>{
  _heart(g,u,'#e07a30');
  sh(g,'#ffd24a',2.8*u,(g)=>{ g.moveTo(0,6*u); g.lineTo(0,-10*u); g.moveTo(-7*u,-4*u); g.lineTo(0,-10*u); g.lineTo(7*u,-4*u); });
});

// ============================================================
// WORLD 3 — FORESTA FRUTOSA sprites
// ============================================================

// ---- Bobritto Bandito: beaver bandit with knives and bandana ----
makeSprite('bobritto', 120, (g,u)=>{
  sh(g,'#5C3A1E',2*u,(p)=>{ p.ellipse(0,28*u,12*u,6*u,0,0,TAU); }); // tail
  sh(g,'#8B5E3C',3*u,(p)=>{ p.ellipse(0,4*u,18*u,22*u,0,0,TAU); }); // body
  sh(g,'#A0724A',3*u,(p)=>{ p.ellipse(0,-18*u,14*u,14*u,0,0,TAU); }); // head
  sh(g,'#c0392b',2*u,(p)=>{ p.rect(-14*u,-24*u,28*u,8*u); }); // red bandana
  g.save(); g.translate(-14*u,2*u); g.rotate(-0.7);
  sh(g,'#d0d0d0',1.5*u,(p)=>{ p.rect(-2*u,-8*u,4*u,14*u); }); g.restore();
  g.save(); g.translate(14*u,2*u); g.rotate(0.7);
  sh(g,'#d0d0d0',1.5*u,(p)=>{ p.rect(-2*u,-8*u,4*u,14*u); }); g.restore();
  eyes(g,u,0,-20*u,5*u,3.5*u);
});

// ---- Garamaraman: wiry fast creature with long flailing arms ----
makeSprite('garamaraman', 120, (g,u)=>{
  sh(g,'#a8c840',3*u,(p)=>{ p.ellipse(0,6*u,10*u,18*u,0,0,TAU); }); // body
  sh(g,'#e67e22',3*u,(p)=>{ p.ellipse(0,-18*u,12*u,11*u,0,0,TAU); }); // head
  sh(g,'#a8c840',2.5*u,(p)=>{ p.moveTo(-10*u,-2*u); p.quadraticCurveTo(-30*u,-10*u,-28*u,10*u); p.lineTo(-24*u,10*u); p.quadraticCurveTo(-26*u,-8*u,-8*u,-2*u); p.closePath(); }); // left arm
  sh(g,'#a8c840',2.5*u,(p)=>{ p.moveTo(10*u,-2*u); p.quadraticCurveTo(30*u,-10*u,28*u,10*u); p.lineTo(24*u,10*u); p.quadraticCurveTo(26*u,-8*u,8*u,-2*u); p.closePath(); }); // right arm
  g.strokeStyle=OUT; g.lineWidth=2*u; g.beginPath(); g.arc(0,-18*u,6*u,0.2,Math.PI-0.2); g.stroke(); // grin
  dot(g,-4*u,-20*u,2*u,OUT); dot(g,4*u,-20*u,2*u,OUT);
});

// ---- Burbaloni Luliloli: round puffy lavender creature ----
makeSprite('burbaloni', 120, (g,u)=>{
  sh(g,'#b48adf',3*u,(p)=>{ p.ellipse(0,2*u,22*u,22*u,0,0,TAU); }); // body
  sh(g,'#9b6ec7',0,(p)=>{ p.ellipse(4*u,8*u,12*u,10*u,0,0,TAU); }); // shading
  dot(g,-11*u,-4*u,5*u,'#f4a7c3'); dot(g,11*u,-4*u,5*u,'#f4a7c3'); // cheeks
  sh(g,'#b48adf',2*u,(p)=>{ p.ellipse(-20*u,4*u,6*u,4*u,0.3,0,TAU); }); // left arm
  sh(g,'#b48adf',2*u,(p)=>{ p.ellipse(20*u,4*u,6*u,4*u,-0.3,0,TAU); }); // right arm
  g.save();
  g.beginPath(); g.ellipse(-7*u,-6*u,4*u,3.5*u,0,0,TAU); g.fillStyle='#fff'; g.fill(); g.strokeStyle=OUT; g.lineWidth=1.5*u; g.stroke();
  g.fillStyle='#2a1a3a'; g.beginPath(); g.ellipse(-7*u,-5*u,2.5*u,2*u,0,0,TAU); g.fill();
  g.beginPath(); g.ellipse(7*u,-6*u,4*u,3.5*u,0,0,TAU); g.fillStyle='#fff'; g.fill(); g.strokeStyle=OUT; g.lineWidth=1.5*u; g.stroke();
  g.fillStyle='#2a1a3a'; g.beginPath(); g.ellipse(7*u,-5*u,2.5*u,2*u,0,0,TAU); g.fill();
  g.restore();
  g.beginPath(); g.moveTo(-11*u,-6*u); g.lineTo(-3*u,-7*u); g.moveTo(3*u,-6*u); g.lineTo(11*u,-7*u); g.strokeStyle=OUT; g.lineWidth=1.5*u; g.stroke();
});

// ---- Boneca Ambalabu: split croc-doll with straw hat ----
makeSprite('bonecaambalabu', 120, (g,u)=>{
  sh(g,'#2e7d32',2.5*u,(p)=>{ p.rect(-22*u,-12*u,22*u,32*u); }); // left croc half
  dot(g,-16*u,-4*u,3*u,'#1b5e20'); dot(g,-10*u,2*u,3*u,'#1b5e20'); dot(g,-16*u,8*u,3*u,'#1b5e20'); // croc scales
  sh(g,'#fad9c1',2.5*u,(p)=>{ p.rect(0,-12*u,22*u,32*u); }); // right doll half
  g.strokeStyle=OUT; g.lineWidth=2*u; g.beginPath(); g.moveTo(0,-12*u); g.lineTo(0,20*u); g.stroke(); // seam
  sh(g,'#d4ac0d',2*u,(p)=>{ p.ellipse(0,-20*u,18*u,5*u,0,0,TAU); }); // hat brim
  sh(g,'#c9a00d',2*u,(p)=>{ p.rect(-8*u,-34*u,16*u,15*u); }); // hat crown
  dot(g,-12*u,-16*u,4*u,'#fffde7'); dot(g,-12*u,-16*u,2*u,'#1b5e20'); // croc eye
  dot(g,12*u,-16*u,4*u,'#f4f4f4'); dot(g,12*u,-16*u,1.5*u,OUT); // doll button eye
  g.strokeStyle=OUT; g.lineWidth=1.2*u;
  for(let i=0;i<4;i++){ const a=i*Math.PI/2; g.beginPath(); g.moveTo(12*u+Math.cos(a)*4*u,-16*u+Math.sin(a)*4*u); g.lineTo(12*u+Math.cos(a)*6*u,-16*u+Math.sin(a)*6*u); g.stroke(); }
  sh(g,'#fff9c4',1.5*u,(p)=>{ for(let i=0;i<3;i++){ p.rect(-20*u+i*5*u,18*u,3*u,5*u); } }); // croc teeth
});

// ---- Girafa Assassina: giraffe with long neck and dark cloak ----
makeSprite('girafassassina', 144, (g,u)=>{
  sh(g,'#d4ac0d',2.5*u,(p)=>{ p.rect(-6*u,-42*u,12*u,38*u); }); // neck
  dot(g,-2*u,-35*u,3*u,'#5d4037'); dot(g,3*u,-22*u,4*u,'#5d4037'); dot(g,-3*u,-10*u,3.5*u,'#5d4037'); // neck spots
  sh(g,'#d4ac0d',3*u,(p)=>{ p.ellipse(0,10*u,16*u,18*u,0,0,TAU); }); // body
  dot(g,-8*u,6*u,4*u,'#5d4037'); dot(g,6*u,14*u,5*u,'#5d4037'); // body spots
  sh(g,'rgba(20,10,10,0.85)',2*u,(p)=>{ p.moveTo(-20*u,-4*u); p.lineTo(-14*u,24*u); p.lineTo(14*u,24*u); p.lineTo(20*u,-4*u); p.closePath(); }); // cloak
  sh(g,'#d4ac0d',2.5*u,(p)=>{ p.ellipse(0,-50*u,8*u,7*u,0,0,TAU); }); // small head
  sh(g,'#a0752a',2*u,(p)=>{ p.rect(-5*u,-60*u,2.5*u,8*u); p.rect(2.5*u,-60*u,2.5*u,8*u); }); // ossicones
  g.fillStyle='#ff1744'; g.fillRect(-5*u,-52*u,3*u,2*u); g.fillRect(2*u,-52*u,3*u,2*u); // glaring eyes
  sh(g,'#c49a11',2*u,(p)=>{ for(const x of [-10,-4,4,10]) p.rect(x*u,26*u,4*u,18*u); }); // 4 legs
});

// ---- Glorbo Frutabaga: owl with frutabaga head ----
makeSprite('glorbo', 120, (g,u)=>{
  sh(g,'#7b1fa2',3*u,(p)=>{ p.ellipse(0,-14*u,18*u,20*u,0,0,TAU); }); // frutabaga head
  sh(g,'rgba(255,255,255,0.3)',0,(p)=>{ p.ellipse(-6*u,-18*u,4*u,10*u,0.3,0,TAU); }); // white streaks
  sh(g,'#2e7d32',2*u,(p)=>{ p.rect(-3*u,-36*u,6*u,4*u); }); // stem
  sh(g,'#2e7d32',2*u,(p)=>{ p.moveTo(-3*u,-34*u); p.lineTo(-10*u,-40*u); p.moveTo(3*u,-34*u); p.lineTo(10*u,-40*u); }); // leaves
  sh(g,'#6a4c93',3*u,(p)=>{ p.ellipse(0,10*u,12*u,14*u,0,0,TAU); }); // owl body
  sh(g,'#4a3470',2.5*u,(p)=>{ p.ellipse(-14*u,10*u,8*u,6*u,0.4,0,TAU); }); // left wing
  sh(g,'#4a3470',2.5*u,(p)=>{ p.ellipse(14*u,10*u,8*u,6*u,-0.4,0,TAU); }); // right wing
  g.strokeStyle='#f9a825'; g.lineWidth=1.5*u; g.beginPath(); g.moveTo(-4*u,24*u); g.lineTo(-8*u,30*u); g.moveTo(0,24*u); g.lineTo(0,30*u); g.moveTo(4*u,24*u); g.lineTo(8*u,30*u); g.stroke(); // talons
  eyes(g,u,0,-14*u,7*u,4*u);
});

// ---- Cocofanto Elephanto: round elephant with coconut pattern ----
makeSprite('cocofanto', 144, (g,u)=>{
  sh(g,'#9e9e9e',2.5*u,(p)=>{ p.ellipse(-30*u,4*u,12*u,16*u,0,0,TAU); }); // left ear
  sh(g,'#9e9e9e',2.5*u,(p)=>{ p.ellipse(30*u,4*u,12*u,16*u,0,0,TAU); }); // right ear
  sh(g,'#bdbdbd',3.5*u,(p)=>{ p.ellipse(0,8*u,30*u,28*u,0,0,TAU); }); // body
  g.strokeStyle='#5d4037'; g.lineWidth=2.5*u;
  g.beginPath(); g.arc(0,8*u,20*u,-0.8,0.8); g.stroke();
  g.beginPath(); g.arc(0,8*u,20*u,Math.PI-0.8,Math.PI+0.8); g.stroke();
  g.beginPath(); g.arc(0,8*u,20*u,0.5,Math.PI-0.5); g.stroke();
  sh(g,'#c5c5c5',3*u,(p)=>{ p.ellipse(0,-20*u,18*u,16*u,0,0,TAU); }); // head
  sh(g,'#bdbdbd',2.5*u,(p)=>{ p.moveTo(-4*u,-8*u); p.quadraticCurveTo(-12*u,4*u,-6*u,10*u); p.lineTo(-2*u,10*u); p.quadraticCurveTo(-8*u,4*u,0,-8*u); p.closePath(); }); // trunk
  sh(g,'#fff9c4',2*u,(p)=>{ p.ellipse(-8*u,-6*u,3*u,6*u,0.3,0,TAU); p.ellipse(8*u,-6*u,3*u,6*u,-0.3,0,TAU); }); // tusks
  eyes(g,u,0,-22*u,6*u,3.5*u);
  sh(g,'#bdbdbd',2.5*u,(p)=>{ p.roundRect(-22*u,32*u,10*u,14*u,4*u); p.roundRect(-8*u,34*u,10*u,12*u,4*u); p.roundRect(6*u,34*u,10*u,12*u,4*u); p.roundRect(18*u,32*u,10*u,14*u,4*u); }); // legs
});

// ---- Kikkurimi Kikkurone: wide flat frog with enormous mouth ----
makeSprite('kikkurimi', 120, (g,u)=>{
  sh(g,'#4caf50',3*u,(p)=>{ p.ellipse(0,6*u,22*u,18*u,0,0,TAU); }); // body
  sh(g,'#a5d6a7',0,(p)=>{ p.ellipse(0,10*u,14*u,11*u,0,0,TAU); }); // belly
  sh(g,'#388e3c',3*u,(p)=>{ p.ellipse(0,-12*u,20*u,14*u,0,0,TAU); }); // head
  sh(g,'#c62828',2*u,(p)=>{ p.arc(0,-12*u,18*u,0.1,Math.PI-0.1); p.closePath(); }); // massive mouth
  sh(g,'#ef9a9a',0,(p)=>{ p.ellipse(0,-6*u,10*u,4*u,0,0,TAU); }); // tongue
  // bulging eyes
  dot(g,-10*u,-24*u,6*u,'#fff'); dot(g,-10*u,-24*u,3.5*u,'#ffd600'); dot(g,-10*u,-24*u,1.5*u,OUT);
  dot(g,10*u,-24*u,6*u,'#fff'); dot(g,10*u,-24*u,3.5*u,'#ffd600'); dot(g,10*u,-24*u,1.5*u,OUT);
  g.strokeStyle=OUT; g.lineWidth=2*u; g.beginPath(); g.arc(-10*u,-24*u,6*u,0,TAU); g.arc(10*u,-24*u,6*u,0,TAU); g.stroke();
  sh(g,'#4caf50',2*u,(p)=>{ p.ellipse(-18*u,20*u,7*u,4*u,0,0,TAU); p.ellipse(18*u,20*u,7*u,4*u,0,0,TAU); }); // feet
});

// ============================================================
// WORLD 3 — BOSS sprites (size 256)
// ============================================================

// ---- Subrosa Cambriana: rose-bear with petal mane and thorn legs ----
makeSprite('subrosa', 256, (g,u)=>{
  for(let i=0;i<8;i++){
    const a=i*TAU/8, px=Math.cos(a)*34*u, py=Math.sin(a)*34*u;
    g.save(); g.translate(px,py); g.rotate(a);
    sh(g,'#c62828',2*u,(p)=>{ p.ellipse(0,0,8*u,14*u,0,0,TAU); }); g.restore();
  }
  dot(g,0,0,8*u,'#e53935'); // rose center
  sh(g,'#f8bbd0',4*u,(p)=>{ p.ellipse(0,14*u,30*u,28*u,0,0,TAU); }); // bear body
  sh(g,'#f8bbd0',4*u,(p)=>{ p.ellipse(0,-14*u,24*u,22*u,0,0,TAU); }); // bear head
  dot(g,-18*u,-30*u,8*u,'#f8bbd0'); dot(g,18*u,-30*u,8*u,'#f8bbd0'); // ears
  g.strokeStyle=OUT; g.lineWidth=3*u; g.beginPath(); g.arc(-18*u,-30*u,8*u,0,TAU); g.arc(18*u,-30*u,8*u,0,TAU); g.stroke();
  dot(g,-18*u,-30*u,4*u,'#ff80ab'); dot(g,18*u,-30*u,4*u,'#ff80ab'); // inner ear
  sh(g,'#ad1457',0,(p)=>{ p.ellipse(0,-8*u,7*u,5*u,0,0,TAU); }); // nose
  eyes(g,u,0,-18*u,9*u,5*u);
  g.strokeStyle=OUT; g.lineWidth=2.5*u; g.beginPath(); g.moveTo(-14*u,-26*u); g.lineTo(-8*u,-24*u); g.moveTo(8*u,-24*u); g.lineTo(14*u,-26*u); g.stroke(); // worried brows
  sh(g,'#2e7d32',3*u,(p)=>{ p.rect(-18*u,38*u,10*u,22*u); p.rect(8*u,38*u,10*u,22*u); }); // legs
  sh(g,'#1b5e20',2*u,(p)=>{ p.moveTo(-18*u,44*u); p.lineTo(-26*u,42*u); p.lineTo(-18*u,48*u); p.moveTo(18*u,44*u); p.lineTo(26*u,42*u); p.lineTo(18*u,48*u); }); // thorns
  sh(g,'#880e4f',2*u,(p)=>{ for(const x of [-10,0,10]){ p.moveTo(x*u,60*u); p.lineTo((x-3)*u,68*u); p.moveTo(x*u,60*u); p.lineTo((x+3)*u,68*u); } }); // claws
});

// ---- Bobritto Bandolero: boss beaver with gold bandana and machetes ----
makeSprite('bobritoboss', 256, (g,u)=>{
  sh(g,'#5c3a1e',3*u,(p)=>{ p.ellipse(0,46*u,20*u,8*u,0,0,TAU); }); // tail
  sh(g,'#7a4f2e',4*u,(p)=>{ p.ellipse(0,10*u,30*u,32*u,0,0,TAU); }); // body
  g.save(); g.translate(-28*u,4*u); g.rotate(-0.5);
  sh(g,'#9a6040',3*u,(p)=>{ p.rect(-6*u,-10*u,12*u,20*u); });
  sh(g,'#e0e0e0',2.5*u,(p)=>{ p.rect(-3*u,-42*u,6*u,34*u); });
  sh(g,'#9e9e9e',2.5*u,(p)=>{ p.rect(-3*u,-10*u,6*u,6*u); });
  sh(g,'#5d4037',2*u,(p)=>{ p.rect(-2.5*u,-8*u,5*u,10*u); }); g.restore();
  g.save(); g.translate(28*u,4*u); g.rotate(0.5);
  sh(g,'#9a6040',3*u,(p)=>{ p.rect(-6*u,-10*u,12*u,20*u); });
  sh(g,'#e0e0e0',2.5*u,(p)=>{ p.rect(-3*u,-42*u,6*u,34*u); });
  sh(g,'#9e9e9e',2.5*u,(p)=>{ p.rect(-3*u,-10*u,6*u,6*u); });
  sh(g,'#5d4037',2*u,(p)=>{ p.rect(-2.5*u,-8*u,5*u,10*u); }); g.restore();
  sh(g,'#9a6040',4*u,(p)=>{ p.ellipse(0,-22*u,22*u,20*u,0,0,TAU); }); // head
  sh(g,'#f9a825',3*u,(p)=>{ p.rect(-22*u,-28*u,44*u,10*u); }); // gold bandana
  dot(g,18*u,-24*u,5*u,'#f57f17'); // bandana knot
  sh(g,'#fff9c4',2*u,(p)=>{ p.rect(-8*u,-12*u,7*u,6*u); p.rect(1*u,-12*u,7*u,6*u); }); // buck teeth
  eyes(g,u,0,-24*u,8*u,5*u);
  g.strokeStyle=OUT; g.lineWidth=3*u; g.beginPath(); g.moveTo(-16*u,-32*u); g.lineTo(-6*u,-28*u); g.moveTo(6*u,-28*u); g.lineTo(16*u,-32*u); g.stroke(); // angry brows
});

// ---- Frullone Vibrassone: blender-on-legs boss ----
makeSprite('frullone', 256, (g,u)=>{
  sh(g,'#424242',4*u,(p)=>{ p.roundRect(-20*u,46*u,16*u,28*u,6*u); p.roundRect(4*u,46*u,16*u,28*u,6*u); }); // legs
  sh(g,'#e0e0e0',4*u,(p)=>{ p.roundRect(-24*u,-10*u,48*u,56*u,8*u); }); // chrome body
  sh(g,'rgba(255,255,255,0.4)',0,(p)=>{ p.roundRect(-18*u,-6*u,16*u,48*u,4*u); }); // chrome sheen
  sh(g,'rgba(180,220,255,0.5)',2*u,(p)=>{ p.roundRect(-14*u,-2*u,28*u,40*u,6*u); }); // glass window
  g.save(); g.strokeStyle='#9e9e9e'; g.lineWidth=2.5*u;
  for(let b=0;b<3;b++){
    const by=8*u+b*12*u;
    g.beginPath(); g.moveTo(-10*u,by); g.lineTo(10*u,by+4*u); g.stroke();
    g.beginPath(); g.moveTo(10*u,by); g.lineTo(-10*u,by+4*u); g.stroke();
  }
  g.restore();
  sh(g,'#c62828',3*u,(p)=>{ p.ellipse(0,-12*u,26*u,8*u,0,0,TAU); }); // red lid
  dot(g,0,-18*u,5*u,'#b71c1c'); // lid knob
  g.strokeStyle='#bdbdbd'; g.lineWidth=2*u;
  for(let v=-1;v<=1;v++){
    const vy=-2*u+v*14*u;
    g.beginPath(); g.moveTo(-30*u,vy); g.quadraticCurveTo(-34*u,vy+3*u,-30*u,vy+6*u); g.stroke();
    g.beginPath(); g.moveTo(30*u,vy); g.quadraticCurveTo(34*u,vy+3*u,30*u,vy+6*u); g.stroke();
  }
  dot(g,-16*u,-12*u,3*u,'#ffeb3b'); dot(g,16*u,-12*u,3*u,'#ffeb3b'); // indicator lights
});

// ---- Cocofanto Mastodonte: massive ancient elephant boss ----
makeSprite('cocofantoboss', 256, (g,u)=>{
  sh(g,'#8d8d8d',3.5*u,(p)=>{ p.ellipse(-48*u,6*u,18*u,24*u,0,0,TAU); p.ellipse(48*u,6*u,18*u,24*u,0,0,TAU); }); // ears
  sh(g,'#9e9e9e',5*u,(p)=>{ p.ellipse(0,12*u,46*u,42*u,0,0,TAU); }); // body
  g.strokeStyle='#4e342e'; g.lineWidth=3.5*u;
  g.beginPath(); g.arc(0,12*u,34*u,-0.9,0.9); g.stroke();
  g.beginPath(); g.arc(0,12*u,34*u,Math.PI-0.9,Math.PI+0.9); g.stroke();
  g.beginPath(); g.arc(0,12*u,34*u,0.4,Math.PI-0.4); g.stroke();
  g.strokeStyle='#212121'; g.lineWidth=1.5*u;
  g.beginPath(); g.moveTo(10*u,-4*u); g.lineTo(16*u,8*u); g.lineTo(12*u,16*u); g.stroke();
  g.beginPath(); g.moveTo(-12*u,6*u); g.lineTo(-8*u,18*u); g.stroke();
  sh(g,'#7b1fa2',0,(p)=>{ p.rect(-38*u,-8*u,10*u,4*u); p.rect(28*u,-8*u,10*u,4*u); p.rect(-8*u,-36*u,4*u,10*u); }); // war paint body
  sh(g,'#aaaaaa',4.5*u,(p)=>{ p.ellipse(0,-28*u,28*u,24*u,0,0,TAU); }); // head
  sh(g,'#7b1fa2',0,(p)=>{ p.rect(-20*u,-28*u,8*u,3*u); p.rect(12*u,-28*u,8*u,3*u); }); // war paint face
  sh(g,'#9e9e9e',3.5*u,(p)=>{ p.moveTo(-6*u,-10*u); p.quadraticCurveTo(-18*u,6*u,-10*u,16*u); p.lineTo(-4*u,16*u); p.quadraticCurveTo(-12*u,6*u,0,-10*u); p.closePath(); }); // trunk
  sh(g,'#558b2f',3*u,(p)=>{ p.ellipse(-12*u,-8*u,5*u,10*u,0.4,0,TAU); p.ellipse(12*u,-8*u,5*u,10*u,-0.4,0,TAU); }); // mossy tusks
  eyes(g,u,0,-32*u,9*u,5.5*u);
  g.strokeStyle=OUT; g.lineWidth=3*u; g.beginPath(); g.moveTo(-18*u,-40*u); g.lineTo(-8*u,-36*u); g.moveTo(8*u,-36*u); g.lineTo(18*u,-40*u); g.stroke(); // angry brows
  sh(g,'#9e9e9e',3.5*u,(p)=>{ p.roundRect(-38*u,50*u,16*u,22*u,5*u); p.roundRect(-16*u,52*u,16*u,20*u,5*u); p.roundRect(0,52*u,16*u,20*u,5*u); p.roundRect(22*u,50*u,16*u,22*u,5*u); }); // 4 massive legs
});

// ============================================================
// WORLD 4 — GELATO GLACIER : enemy sprites (frozen-dessert OG brainrots)
// ============================================================

// ---- Gelato Gattino: cat head on a scoop-and-cone body ----
makeSprite('gelatogattino', 120, (g,u)=>{
  sh(g,'#e0a85a',3*u,(p)=>{ p.moveTo(-14*u,6*u); p.lineTo(14*u,6*u); p.lineTo(0,40*u); p.closePath(); }); // cone
  g.strokeStyle='#b9823c'; g.lineWidth=1.5*u; // waffle lines
  g.beginPath(); g.moveTo(-9*u,14*u); g.lineTo(9*u,14*u); g.moveTo(-6*u,24*u); g.lineTo(6*u,24*u); g.stroke();
  sh(g,'#ffd9e6',3*u,(p)=>{ p.ellipse(0,-2*u,18*u,16*u,0,0,TAU); }); // strawberry scoop
  sh(g,'#ffeef4',0,(p)=>{ p.ellipse(-5*u,-6*u,7*u,5*u,0,0,TAU); }); // scoop sheen
  dot(g,-12*u,-14*u,5*u,'#ffd9e6'); dot(g,12*u,-14*u,5*u,'#ffd9e6'); // ears
  g.strokeStyle=OUT; g.lineWidth=2*u; g.beginPath(); g.arc(-12*u,-14*u,5*u,0,TAU); g.arc(12*u,-14*u,5*u,0,TAU); g.stroke();
  dot(g,-12*u,-14*u,2.4*u,'#f48fb1'); dot(g,12*u,-14*u,2.4*u,'#f48fb1'); // inner ear
  eyes(g,u,0,-4*u,7*u,4*u);
  dot(g,0,3*u,2*u,'#f48fb1'); // nose
  g.strokeStyle=OUT; g.lineWidth=1.3*u; for(const s of [-1,1]){ g.beginPath(); g.moveTo(s*5*u,4*u); g.lineTo(s*18*u,2*u); g.moveTo(s*5*u,6*u); g.lineTo(s*18*u,8*u); g.stroke(); } // whiskers
});

// ---- Pinguino Caramelino: little penguin with a caramel box on its belly ----
makeSprite('pinguinocaramelino', 120, (g,u)=>{
  sh(g,'#2b3a55',3*u,(p)=>{ p.ellipse(0,4*u,20*u,24*u,0,0,TAU); }); // body
  sh(g,'#f3ead7',0,(p)=>{ p.ellipse(0,8*u,13*u,17*u,0,0,TAU); }); // white belly
  sh(g,'#2b3a55',2.5*u,(p)=>{ p.ellipse(-20*u,4*u,5*u,12*u,0.3,0,TAU); p.ellipse(20*u,4*u,5*u,12*u,-0.3,0,TAU); }); // flippers
  sh(g,'#c98a3a',2*u,(p)=>{ p.roundRect(-9*u,8*u,18*u,14*u,3*u); }); // caramel box
  g.strokeStyle='#8a5a22'; g.lineWidth=1.5*u; g.beginPath(); g.moveTo(0,8*u); g.lineTo(0,22*u); g.moveTo(-9*u,15*u); g.lineTo(9*u,15*u); g.stroke();
  sh(g,'#f5a623',2*u,(p)=>{ p.moveTo(-4*u,-6*u); p.lineTo(4*u,-6*u); p.lineTo(0,0); p.closePath(); }); // beak
  sh(g,'#f5a623',2*u,(p)=>{ p.ellipse(-7*u,28*u,6*u,3*u,0,0,TAU); p.ellipse(7*u,28*u,6*u,3*u,0,0,TAU); }); // feet
  eyes(g,u,0,-12*u,6*u,4*u);
});

// ---- Trulimero Trulicina: icy fish with a kitten face ----
makeSprite('trulimero', 110, (g,u)=>{
  sh(g,'#6fc7e6',3*u,(p)=>{ p.moveTo(18*u,2*u); p.lineTo(34*u,-12*u); p.lineTo(30*u,2*u); p.lineTo(34*u,16*u); p.closePath(); }); // tail fin
  sh(g,'#7fd4f0',3*u,(p)=>{ p.ellipse(0,2*u,22*u,16*u,0,0,TAU); }); // fish body
  sh(g,'#aee6f7',0,(p)=>{ p.ellipse(-4*u,6*u,12*u,8*u,0,0,TAU); }); // belly sheen
  sh(g,'#5bb4d6',2*u,(p)=>{ p.moveTo(-2*u,-14*u); p.lineTo(6*u,-24*u); p.lineTo(10*u,-13*u); p.closePath(); }); // dorsal fin
  dot(g,-16*u,-12*u,5*u,'#7fd4f0'); dot(g,-8*u,-14*u,5*u,'#7fd4f0'); // cat ears
  g.strokeStyle=OUT; g.lineWidth=2*u; g.beginPath(); g.arc(-16*u,-12*u,5*u,0,TAU); g.arc(-8*u,-14*u,5*u,0,TAU); g.stroke();
  eyes(g,u,-12*u,-2*u,6*u,3.6*u);
  g.strokeStyle=OUT; g.lineWidth=1.2*u; for(const s of [-1,1]){ g.beginPath(); g.moveTo(-14*u,4*u); g.lineTo(-26*u,2*u+s*4*u); g.stroke(); } // whiskers
});

// ---- Americano Penguino: confident penguin with shades and a coffee cup ----
makeSprite('americanopenguino', 120, (g,u)=>{
  sh(g,'#34404f',3*u,(p)=>{ p.ellipse(0,6*u,19*u,26*u,0,0,TAU); }); // body
  sh(g,'#f1ece1',0,(p)=>{ p.ellipse(0,10*u,12*u,18*u,0,0,TAU); }); // belly
  sh(g,'#34404f',2.5*u,(p)=>{ p.ellipse(-19*u,8*u,5*u,13*u,0.3,0,TAU); }); // left flipper
  sh(g,'#34404f',2.5*u,(p)=>{ p.ellipse(21*u,2*u,5*u,12*u,-0.7,0,TAU); }); // right flipper raised
  sh(g,'#f5a623',2*u,(p)=>{ p.moveTo(-4*u,-8*u); p.lineTo(4*u,-8*u); p.lineTo(0,-2*u); p.closePath(); }); // beak
  sh(g,'#1a1a1a',1.5*u,(p)=>{ p.roundRect(-12*u,-18*u,24*u,7*u,2*u); }); // shades
  g.strokeStyle='#1a1a1a'; g.lineWidth=1.5*u; g.beginPath(); g.moveTo(0,-15*u); g.lineTo(0,-15*u); g.stroke();
  sh(g,'#d7c4a6',2*u,(p)=>{ p.roundRect(20*u,-6*u,12*u,14*u,2*u); }); // coffee cup
  sh(g,'#5a3a22',0,(p)=>{ p.ellipse(26*u,-4*u,5*u,2*u,0,0,TAU); }); // coffee
  sh(g,'#f5a623',2*u,(p)=>{ p.ellipse(-7*u,32*u,6*u,3*u,0,0,TAU); p.ellipse(7*u,32*u,6*u,3*u,0,0,TAU); }); // feet
});

// ---- Ghiacciolo Spaziale: galaxy popsicle on a stick with big eyes ----
makeSprite('ghiacciolospaziale', 120, (g,u)=>{
  sh(g,'#c79a5b',3*u,(p)=>{ p.roundRect(-4*u,22*u,8*u,18*u,2*u); }); // stick
  sh(g,'#3a2a6a',3*u,(p)=>{ p.roundRect(-16*u,-26*u,32*u,50*u,12*u); }); // popsicle
  sh(g,'#6a4fb0',0,(p)=>{ p.roundRect(-12*u,-12*u,24*u,34*u,8*u); }); // inner glow
  // stars
  g.fillStyle='#ffe9a8'; for(const [sx,sy] of [[-8,-16],[7,-6],[-4,6],[9,12],[2,-20]]) { g.beginPath(); g.arc(sx*u,sy*u,1.6*u,0,TAU); g.fill(); }
  dot(g,-9*u,18*u,2.2*u,'#ff8fd0'); dot(g,8*u,16*u,2.2*u,'#7fe0ff'); // nebula dots
  eyes(g,u,0,-4*u,7*u,4.5*u);
  g.strokeStyle=OUT; g.lineWidth=1.6*u; g.beginPath(); g.arc(0,8*u,5*u,0.15,Math.PI-0.15); g.stroke(); // smile
});

// ---- Frulli Frulla: penguin in swim goggles holding a frosty cup ----
makeSprite('frullifrulla', 120, (g,u)=>{
  sh(g,'#2f4858',3*u,(p)=>{ p.ellipse(0,6*u,20*u,25*u,0,0,TAU); }); // body
  sh(g,'#eaf2f0',0,(p)=>{ p.ellipse(0,10*u,13*u,17*u,0,0,TAU); }); // belly
  sh(g,'#2f4858',2.5*u,(p)=>{ p.ellipse(-20*u,6*u,5*u,12*u,0.3,0,TAU); p.ellipse(20*u,6*u,5*u,12*u,-0.3,0,TAU); }); // flippers
  sh(g,'#f5a623',2*u,(p)=>{ p.moveTo(-4*u,-8*u); p.lineTo(4*u,-8*u); p.lineTo(0,-2*u); p.closePath(); }); // beak
  // goggles
  g.fillStyle='#7fe0ff'; g.strokeStyle=OUT; g.lineWidth=2*u;
  for(const s of [-1,1]){ g.beginPath(); g.arc(s*7*u,-15*u,6*u,0,TAU); g.fill(); g.stroke(); }
  g.beginPath(); g.moveTo(-1*u,-15*u); g.lineTo(1*u,-15*u); g.stroke();
  g.beginPath(); g.moveTo(-13*u,-15*u); g.lineTo(-20*u,-17*u); g.moveTo(13*u,-15*u); g.lineTo(20*u,-17*u); g.stroke(); // strap
  sh(g,'#bfe6ff',2*u,(p)=>{ p.roundRect(19*u,-4*u,13*u,16*u,2*u); }); // frosty cup
  sh(g,'#7fbfe0',0,(p)=>{ p.ellipse(25*u,-1*u,5*u,2*u,0,0,TAU); });
  sh(g,'#f5a623',2*u,(p)=>{ p.ellipse(-7*u,31*u,6*u,3*u,0,0,TAU); p.ellipse(7*u,31*u,6*u,3*u,0,0,TAU); }); // feet
});

// ---- Sorbetto Leonino: sherbet-scoop lion (heavy) ----
makeSprite('sorbettoleonino', 132, (g,u)=>{
  // pastel scoop mane
  const mane=['#ffd1dc','#cdeccd','#fff1c1','#d6e8ff','#ffe0c0'];
  for(let i=0;i<10;i++){ const a=i*TAU/10; dot(g, Math.cos(a)*30*u, Math.sin(a)*30*u, 11*u, mane[i%mane.length]); }
  for(let i=0;i<10;i++){ const a=i*TAU/10; g.strokeStyle=OUT; g.lineWidth=2*u; g.beginPath(); g.arc(Math.cos(a)*30*u, Math.sin(a)*30*u, 11*u, 0, TAU); g.stroke(); }
  sh(g,'#f6c27a',3.5*u,(p)=>{ p.ellipse(0,2*u,24*u,22*u,0,0,TAU); }); // face
  sh(g,'#ffe2b8',0,(p)=>{ p.ellipse(0,8*u,14*u,11*u,0,0,TAU); }); // muzzle
  dot(g,-7*u,-18*u,5*u,'#f6c27a'); dot(g,7*u,-18*u,5*u,'#f6c27a'); // ears
  g.strokeStyle=OUT; g.lineWidth=2.4*u; g.beginPath(); g.arc(-7*u,-18*u,5*u,0,TAU); g.arc(7*u,-18*u,5*u,0,TAU); g.stroke();
  eyes(g,u,0,-2*u,8*u,4.5*u);
  dot(g,0,6*u,3*u,OUT); // nose
  g.strokeStyle=OUT; g.lineWidth=2*u; g.beginPath(); g.moveTo(0,9*u); g.lineTo(0,13*u); g.moveTo(0,13*u); g.arc(0,13*u,4*u,0,Math.PI); g.stroke(); // mouth
});

// ---- Granita Gabbiano: seagull with an icy granita cup (support) ----
makeSprite('granitagabbiano', 120, (g,u)=>{
  sh(g,'#f2f4f6',3*u,(p)=>{ p.ellipse(0,6*u,20*u,18*u,0,0,TAU); }); // body
  sh(g,'#cdd6dd',3*u,(p)=>{ p.ellipse(0,-14*u,12*u,11*u,0,0,TAU); }); // head
  sh(g,'#c4ccd2',2.5*u,(p)=>{ p.moveTo(-18*u,0); p.quadraticCurveTo(-40*u,-6*u,-30*u,12*u); p.lineTo(-16*u,8*u); p.closePath(); }); // left wing
  sh(g,'#c4ccd2',2.5*u,(p)=>{ p.moveTo(18*u,0); p.quadraticCurveTo(40*u,-6*u,30*u,12*u); p.lineTo(16*u,8*u); p.closePath(); }); // right wing
  sh(g,'#f5a623',2*u,(p)=>{ p.moveTo(-2*u,-12*u); p.lineTo(12*u,-10*u); p.lineTo(-2*u,-7*u); p.closePath(); }); // beak
  // granita cup on belly
  sh(g,'#d8ecff',2*u,(p)=>{ p.moveTo(-9*u,8*u); p.lineTo(9*u,8*u); p.lineTo(6*u,24*u); p.lineTo(-6*u,24*u); p.closePath(); });
  sh(g,'#74b9ff',0,(p)=>{ p.ellipse(0,9*u,8*u,3*u,0,0,TAU); }); // blue ice
  dot(g,-3*u,11*u,1.4*u,'#fff'); dot(g,4*u,13*u,1.4*u,'#fff'); // ice flecks
  eyes(g,u,0,-16*u,5*u,3.2*u);
  sh(g,'#f5a623',2*u,(p)=>{ p.moveTo(-5*u,24*u); p.lineTo(-7*u,30*u); p.moveTo(5*u,24*u); p.lineTo(7*u,30*u); }); // legs
});

// ============================================================
// WORLD 4 — GELATO GLACIER : boss sprites (size 256)
// ============================================================

// ---- Tiramisubmarini: coffee-brown train-submarine with a mug conning tower ----
makeSprite('tiramisubmarini', 256, (g,u)=>{
  sh(g,'#5b3a22',5*u,(p)=>{ p.roundRect(-46*u,-14*u,90*u,46*u,20*u); }); // sub-train hull
  sh(g,'#7a5234',0,(p)=>{ p.roundRect(-40*u,-8*u,78*u,16*u,8*u); }); // cocoa sheen
  for(const px of [-30,-12,8,28]){ dot(g,px*u,6*u,7*u,'#bfe6ff'); g.strokeStyle=OUT; g.lineWidth=2.5*u; g.beginPath(); g.arc(px*u,6*u,7*u,0,TAU); g.stroke(); } // portholes
  sh(g,'#3a2414',3*u,(p)=>{ p.moveTo(44*u,-9*u); p.lineTo(50*u,2*u); p.lineTo(44*u,13*u); p.closePath(); }); // nose
  sh(g,'#9e9e9e',2.5*u,(p)=>{ p.roundRect(-46*u,-4*u,9*u,12*u,3*u); }); // rear jet
  sh(g,'#caa46a',4*u,(p)=>{ p.roundRect(-16*u,-40*u,34*u,30*u,6*u); }); // mug conning tower
  sh(g,'#3a2414',0,(p)=>{ p.ellipse(1*u,-37*u,14*u,5*u,0,0,TAU); }); // coffee top
  sh(g,'#caa46a',3*u,(p)=>{ p.arc(22*u,-26*u,9*u,-1.2,1.2); }); // mug handle
  g.strokeStyle='#f4f4f4'; g.lineWidth=3*u; g.beginPath(); g.moveTo(-4*u,-44*u); g.lineTo(4*u,-48*u); g.stroke(); // straw
  eyes(g,u,16*u,0,11*u,6*u);
  g.strokeStyle=OUT; g.lineWidth=3.5*u; g.beginPath(); g.arc(6*u,20*u,16*u,0.15,Math.PI-0.15); g.stroke(); // big grin
  sh(g,'#caa46a',3*u,(p)=>{ p.roundRect(-40*u,30*u,16*u,12*u,3*u); p.roundRect(24*u,30*u,16*u,12*u,3*u); }); // wheels/fins
});

// ---- Frigo Camello: camel with a refrigerator torso, frosty ----
makeSprite('frigocamello', 256, (g,u)=>{
  // legs
  sh(g,'#b98a5e',4*u,(p)=>{ p.roundRect(-34*u,40*u,13*u,30*u,4*u); p.roundRect(-6*u,40*u,13*u,30*u,4*u); p.roundRect(20*u,40*u,13*u,30*u,4*u); });
  // camel neck + head rising at top (drawn first so the fridge overlaps its base)
  sh(g,'#d2a679',4*u,(p)=>{ p.moveTo(12*u,-14*u); p.lineTo(6*u,-34*u); p.lineTo(20*u,-34*u); p.lineTo(28*u,-14*u); p.closePath(); }); // neck
  sh(g,'#d2a679',4*u,(p)=>{ p.ellipse(20*u,-38*u,14*u,11*u,0,0,TAU); }); // head
  sh(g,'#c3946a',3*u,(p)=>{ p.roundRect(28*u,-40*u,12*u,11*u,4*u); }); // snout
  dot(g,42*u,-36*u,2*u,OUT); // nostril
  dot(g,12*u,-45*u,4*u,'#d2a679'); dot(g,24*u,-46*u,4*u,'#d2a679'); // ears
  g.strokeStyle=OUT; g.lineWidth=2.5*u; g.beginPath(); g.arc(12*u,-45*u,4*u,0,TAU); g.arc(24*u,-46*u,4*u,0,TAU); g.stroke();
  eyes(g,u,18*u,-39*u,7*u,4*u);
  // fridge torso
  sh(g,'#cfe8ee',5*u,(p)=>{ p.roundRect(-40*u,-16*u,76*u,58*u,10*u); }); // x -40..36
  g.strokeStyle='#9fc3cf'; g.lineWidth=3*u; g.beginPath(); g.moveTo(-40*u,8*u); g.lineTo(36*u,8*u); g.stroke(); // door split
  sh(g,'#b6d8e0',3*u,(p)=>{ p.roundRect(24*u,-10*u,6*u,16*u,2*u); p.roundRect(24*u,16*u,6*u,16*u,2*u); }); // handles
  g.fillStyle='rgba(255,255,255,0.6)'; for(const [fx,fy] of [[-26,-6],[-12,24],[4,2],[12,30]]){ g.beginPath(); g.arc(fx*u,fy*u,3*u,0,TAU); g.fill(); } // frost
  sh(g,'#e8f6fa',2.5*u,(p)=>{ p.moveTo(-38*u,-16*u); p.lineTo(-30*u,-28*u); p.lineTo(-22*u,-16*u); p.closePath(); }); // ice crystal corner
});

// ---- Il Mago Tiramisù: tiramisu cake wizard with hat and staff ----
makeSprite('magotiramisu', 256, (g,u)=>{
  // staff
  g.save(); g.translate(40*u,4*u); g.rotate(0.22);
  sh(g,'#7a5234',3*u,(p)=>{ p.roundRect(-3*u,-26*u,6*u,60*u,3*u); });
  dot(g,0,-30*u,8*u,'#9fd0ff'); g.strokeStyle=OUT; g.lineWidth=2.5*u; g.beginPath(); g.arc(0,-30*u,8*u,0,TAU); g.stroke();
  g.restore();
  // cake layers
  sh(g,'#caa46a',4.5*u,(p)=>{ p.roundRect(-42*u,14*u,84*u,32*u,8*u); }); // sponge base
  sh(g,'#f3ead7',4*u,(p)=>{ p.roundRect(-44*u,-4*u,88*u,22*u,8*u); }); // mascarpone layer
  sh(g,'#caa46a',4*u,(p)=>{ p.roundRect(-40*u,-18*u,80*u,18*u,7*u); }); // top sponge
  g.fillStyle='#5b3a22'; for(let i=0;i<14;i++){ g.beginPath(); g.arc(rand(-36,36)*u,rand(-15,-4)*u,1.6*u,0,TAU); g.fill(); } // cocoa dust
  // wizard hat (compact)
  sh(g,'#3f2a6a',4*u,(p)=>{ p.moveTo(-24*u,-18*u); p.lineTo(2*u,-47*u); p.lineTo(24*u,-18*u); p.closePath(); });
  sh(g,'#5a3fa0',0,(p)=>{ p.moveTo(-9*u,-28*u); p.lineTo(2*u,-42*u); p.lineTo(7*u,-26*u); p.closePath(); }); // hat fold
  g.fillStyle='#ffe9a8'; for(const [sx,sy] of [[-7,-24],[5,-32],[0,-40]]){ g.beginPath(); for(let k=0;k<10;k++){ const a=k/10*TAU, rr=(k%2?2:4.5)*u; const X=sx*u+Math.cos(a)*rr, Y=sy*u+Math.sin(a)*rr; k?g.lineTo(X,Y):g.moveTo(X,Y);} g.closePath(); g.fill(); } // stars
  eyes(g,u,0,4*u,10*u,5.5*u);
  g.strokeStyle=OUT; g.lineWidth=3*u; g.beginPath(); g.arc(0,18*u,8*u,0.2,Math.PI-0.2); g.stroke(); // mouth
});

// ---- Ice Ice Bearlini Polari Orangini: polar bear with orange-slice markings ----
makeSprite('icebearlini', 256, (g,u)=>{
  g.scale(0.74,0.74); g.translate(0,-4*u);   // colossus is tall+wide: shrink-to-fit so no part (incl. outlines) is clipped by the canvas
  // ears
  dot(g,-34*u,-46*u,13*u,'#f3f7fa'); dot(g,34*u,-46*u,13*u,'#f3f7fa');
  g.strokeStyle=OUT; g.lineWidth=3.5*u; g.beginPath(); g.arc(-34*u,-46*u,13*u,0,TAU); g.arc(34*u,-46*u,13*u,0,TAU); g.stroke();
  dot(g,-34*u,-46*u,6*u,'#ff9f43'); dot(g,34*u,-46*u,6*u,'#ff9f43'); // orange inner ear
  sh(g,'#f3f7fa',5*u,(p)=>{ p.ellipse(0,22*u,48*u,44*u,0,0,TAU); }); // body
  sh(g,'#f7fbfe',5*u,(p)=>{ p.ellipse(0,-22*u,40*u,36*u,0,0,TAU); }); // head
  // orange-slice marking on belly
  sh(g,'#ff9f43',3*u,(p)=>{ p.arc(0,30*u,26*u,Math.PI,TAU); p.closePath(); });
  g.strokeStyle='#e07a1f'; g.lineWidth=2*u; for(let k=0;k<5;k++){ const a=Math.PI+ (k+0.5)*Math.PI/5; g.beginPath(); g.moveTo(0,30*u); g.lineTo(Math.cos(a)*24*u, 30*u+Math.sin(a)*24*u); g.stroke(); }
  // frosty breath puffs
  g.fillStyle='rgba(190,230,255,0.7)'; for(const [fx,fy] of [[-44,-30],[46,-34],[40,8]]){ g.beginPath(); g.arc(fx*u,fy*u,7*u,0,TAU); g.fill(); }
  sh(g,'#ffe8d0',4*u,(p)=>{ p.ellipse(0,-10*u,20*u,15*u,0,0,TAU); }); // muzzle
  dot(g,0,-18*u,6*u,OUT); // nose
  eyes(g,u,0,-30*u,12*u,6.5*u);
  g.strokeStyle=OUT; g.lineWidth=4*u; g.beginPath(); g.moveTo(-24*u,-46*u); g.lineTo(-10*u,-40*u); g.moveTo(10*u,-40*u); g.lineTo(24*u,-46*u); g.stroke(); // brows
  // arms
  sh(g,'#f3f7fa',4*u,(p)=>{ p.ellipse(-40*u,20*u,11*u,18*u,0.3,0,TAU); p.ellipse(40*u,20*u,11*u,18*u,-0.3,0,TAU); });
});

// ============================================================
// WORLD 5 — CIRCO BRAINROTTO : enemy sprites (house-built carnival hybrids)
// ============================================================

// ---- Burbaloni Dogolini: living balloon dog with a lollipop ----
makeSprite('burbalonidog', 120, (g,u)=>{
  // lollipop
  g.save(); g.translate(28*u,6*u);
  sh(g,'#c9923f',2*u,(p)=>{ p.rect(-1.5*u,0,3*u,20*u); }); // stick
  dot(g,0,-2*u,9*u,'#ff5ea8'); g.strokeStyle=OUT; g.lineWidth=2*u; g.beginPath(); g.arc(0,-2*u,9*u,0,TAU); g.stroke();
  g.strokeStyle='#fff'; g.lineWidth=1.6*u; g.beginPath(); for(let a=0;a<7;a++){ g.arc(0,-2*u,a*1.4*u, a*0.6, a*0.6+1.4); } g.stroke();
  g.restore();
  const R='#e8463c';
  sh(g,R,3*u,(p)=>{ p.ellipse(0,10*u,17*u,12*u,0,0,TAU); }); // body balloon
  sh(g,R,3*u,(p)=>{ p.ellipse(-2*u,-12*u,12*u,12*u,0,0,TAU); }); // head balloon
  sh(g,R,2.5*u,(p)=>{ p.ellipse(-15*u,-16*u,5*u,9*u,0.5,0,TAU); p.ellipse(11*u,-18*u,5*u,9*u,-0.5,0,TAU); }); // ear balloons
  sh(g,R,2.5*u,(p)=>{ for(const lx of [-12,-3,6,14]) p.ellipse(lx*u,22*u,4*u,6*u,0,0,TAU); }); // leg-balloon nubs
  sh(g,'rgba(255,255,255,0.55)',0,(p)=>{ p.ellipse(-6*u,-16*u,3*u,5*u,0.4,0,TAU); }); // shine
  eyes(g,u,-2*u,-12*u,5*u,3.4*u);
  dot(g,-2*u,-6*u,2*u,OUT); // nose
});

// ---- Popcorrino Bucketto: striped popcorn bucket popping kernels ----
makeSprite('popcorrino', 120, (g,u)=>{
  sh(g,'#fff4e0',2.5*u,(p)=>{ for(const kx of [-14,-4,7,15,2,-9]) dot(g,kx*u,(-20-Math.abs(kx)*0.3)*u,5*u,'#fff0c2'); }); // popcorn cloud
  for(const [kx,ky] of [[-14,-22],[-4,-26],[7,-25],[15,-21],[2,-30],[-9,-24]]) { dot(g,kx*u,ky*u,5*u,'#fff0c2'); g.strokeStyle='#e8c98a'; g.lineWidth=1.4*u; g.beginPath(); g.arc(kx*u,ky*u,5*u,0,TAU); g.stroke(); }
  sh(g,'#f4f4f4',3*u,(p)=>{ p.moveTo(-16*u,-12*u); p.lineTo(16*u,-12*u); p.lineTo(12*u,26*u); p.lineTo(-12*u,26*u); p.closePath(); }); // bucket
  g.fillStyle='#e8463c'; for(const sx of [-12,-4,4,12]){ g.beginPath(); g.moveTo(sx*u,-12*u); g.lineTo((sx-2.5)*u,26*u); g.lineTo((sx+1.5)*u,26*u); g.lineTo((sx+3.5)*u,-12*u); g.closePath(); g.fill(); } // red stripes
  eyes(g,u,0,2*u,7*u,4*u);
  g.strokeStyle=OUT; g.lineWidth=2*u; g.beginPath(); g.arc(0,12*u,5*u,0.15,Math.PI-0.15); g.stroke(); // smile
});

// ---- Zucchero Filino: cotton-candy wisp on a paper cone ----
makeSprite('zuccherofilino', 110, (g,u)=>{
  sh(g,'#e0a85a',2.5*u,(p)=>{ p.moveTo(-7*u,8*u); p.lineTo(7*u,8*u); p.lineTo(0,30*u); p.closePath(); }); // cone
  const P='#ff9fd6';
  for(const [cx,cy,r] of [[-10,-8,11],[9,-8,11],[0,-16,12],[-6,2,9],[7,2,9],[0,-2,11]]) dot(g,cx*u,cy*u,r*u,P);
  for(const [cx,cy,r] of [[-12,-12,7],[11,-12,7],[0,-22,7]]) dot(g,cx*u,cy*u,r*u,'#ffc1e6'); // fluffy highlights
  eyes(g,u,0,-6*u,6*u,3.6*u);
  g.strokeStyle=OUT; g.lineWidth=1.8*u; g.beginPath(); g.arc(0,2*u,4*u,0.15,Math.PI-0.15); g.stroke();
});

// ---- Clownino Honkhonk: goofy little clown (kid-friendly) ----
makeSprite('clownino', 120, (g,u)=>{
  sh(g,'#5aa0e0',2.5*u,(p)=>{ p.ellipse(0,18*u,16*u,12*u,0,0,TAU); }); // body
  // ruffle collar
  g.fillStyle='#ffd24a'; for(let i=0;i<9;i++){ const a=Math.PI+ i*Math.PI/8; g.beginPath(); g.arc(Math.cos(a)*16*u,6*u+Math.sin(a)*5*u,5*u,0,TAU); g.fill(); }
  sh(g,'#fdeede',3*u,(p)=>{ p.ellipse(0,-12*u,15*u,14*u,0,0,TAU); }); // face
  dot(g,-15*u,-14*u,6*u,'#ff7a3a'); dot(g,15*u,-14*u,6*u,'#ff7a3a'); // hair tufts
  g.strokeStyle=OUT; g.lineWidth=2*u; g.beginPath(); g.arc(-15*u,-14*u,6*u,0,TAU); g.arc(15*u,-14*u,6*u,0,TAU); g.stroke();
  dot(g,0,-8*u,4*u,'#e8463c'); // red nose
  eyes(g,u,0,-16*u,6*u,3.6*u);
  g.strokeStyle='#e8463c'; g.lineWidth=2.2*u; g.beginPath(); g.arc(0,-6*u,7*u,0.1,Math.PI-0.1); g.stroke(); // big smile
  sh(g,'#3a78c0',2*u,(p)=>{ p.moveTo(-8*u,-26*u); p.lineTo(0,-40*u); p.lineTo(8*u,-26*u); p.closePath(); }); dot(g,0,-40*u,3*u,'#ffd24a'); // tiny hat
});

// ---- Cannonino Umano: human-cannonball in a wheeled cannon ----
makeSprite('cannonino', 120, (g,u)=>{
  dot(g,-12*u,26*u,7*u,'#3a2a22'); dot(g,12*u,26*u,7*u,'#3a2a22'); // wheels
  g.save(); g.rotate(-0.5);
  sh(g,'#4a4f57',3*u,(p)=>{ p.roundRect(-12*u,-6*u,40*u,22*u,8*u); }); // barrel
  sh(g,'#2f343a',0,(p)=>{ p.ellipse(28*u,5*u,5*u,10*u,0,0,TAU); }); // muzzle hole
  g.restore();
  sh(g,'#f0c9a0',3*u,(p)=>{ p.ellipse(8*u,-16*u,11*u,11*u,0,0,TAU); }); // head poking out
  sh(g,'#e8463c',2.5*u,(p)=>{ p.arc(8*u,-20*u,11*u,Math.PI,TAU); p.closePath(); }); // helmet
  eyes(g,u,8*u,-15*u,5*u,3.2*u);
  g.strokeStyle='#ffae42'; g.lineWidth=2*u; g.beginPath(); g.moveTo(-20*u,-2*u); g.lineTo(-26*u,-8*u); g.stroke(); dot(g,-27*u,-9*u,3*u,'#ff7a2a'); // fuse spark
});

// ---- Giocoliere Scimmino: juggling monkey ----
makeSprite('giocoliere', 120, (g,u)=>{
  sh(g,'#8d6240',3*u,(p)=>{ p.ellipse(0,12*u,15*u,16*u,0,0,TAU); }); // body
  sh(g,'#b98a5e',0,(p)=>{ p.ellipse(0,16*u,9*u,10*u,0,0,TAU); }); // belly
  sh(g,'#8d6240',2.5*u,(p)=>{ p.moveTo(-12*u,4*u); p.quadraticCurveTo(-24*u,-14*u,-16*u,-22*u); p.lineTo(-12*u,-18*u); p.quadraticCurveTo(-18*u,-10*u,-8*u,2*u); p.closePath(); }); // left arm up
  sh(g,'#8d6240',2.5*u,(p)=>{ p.moveTo(12*u,4*u); p.quadraticCurveTo(24*u,-14*u,16*u,-22*u); p.lineTo(12*u,-18*u); p.quadraticCurveTo(18*u,-10*u,8*u,2*u); p.closePath(); }); // right arm up
  sh(g,'#8d6240',3*u,(p)=>{ p.ellipse(0,-14*u,12*u,11*u,0,0,TAU); }); // head
  sh(g,'#e8c9a0',0,(p)=>{ p.ellipse(0,-11*u,8*u,7*u,0,0,TAU); }); // face
  dot(g,-12*u,-16*u,4*u,'#8d6240'); dot(g,12*u,-16*u,4*u,'#8d6240'); // ears
  eyes(g,u,0,-14*u,5*u,3*u);
  // juggling balls
  dot(g,-16*u,-28*u,5*u,'#e8463c'); dot(g,0,-34*u,5*u,'#ffd24a'); dot(g,16*u,-28*u,5*u,'#4aa3df');
  g.strokeStyle=OUT; g.lineWidth=1.6*u; for(const [bx,by] of [[-16,-28],[0,-34],[16,-28]]){ g.beginPath(); g.arc(bx*u,by*u,5*u,0,TAU); g.stroke(); }
});

// ---- Forzuto Orsino: strongman bear with a barbell ----
makeSprite('forzutoorsino', 132, (g,u)=>{
  sh(g,'#8d5a32',3.5*u,(p)=>{ p.ellipse(0,14*u,22*u,20*u,0,0,TAU); }); // body
  sh(g,'#e8463c',0,(p)=>{ p.moveTo(-10*u,0); p.lineTo(10*u,0); p.lineTo(7*u,28*u); p.lineTo(-7*u,28*u); p.closePath(); }); // singlet
  sh(g,'#8d5a32',3*u,(p)=>{ p.ellipse(-22*u,6*u,8*u,11*u,0.3,0,TAU); p.ellipse(22*u,6*u,8*u,11*u,-0.3,0,TAU); }); // beefy arms
  sh(g,'#a06a3c',3.5*u,(p)=>{ p.ellipse(0,-16*u,16*u,14*u,0,0,TAU); }); // head
  dot(g,-13*u,-26*u,5*u,'#8d5a32'); dot(g,13*u,-26*u,5*u,'#8d5a32'); // ears
  g.strokeStyle=OUT; g.lineWidth=2.5*u; g.beginPath(); g.arc(-13*u,-26*u,5*u,0,TAU); g.arc(13*u,-26*u,5*u,0,TAU); g.stroke();
  dot(g,0,-12*u,3*u,OUT); // snout
  eyes(g,u,0,-20*u,7*u,4*u);
  g.strokeStyle=OUT; g.lineWidth=2.5*u; g.beginPath(); g.moveTo(-9*u,-9*u); g.quadraticCurveTo(0,-5*u,9*u,-9*u); g.stroke(); // mustache
  // barbell overhead
  sh(g,'#5a5f66',3*u,(p)=>{ p.rect(-40*u,-40*u,80*u,5*u); }); // bar
  sh(g,'#3a3f46',3*u,(p)=>{ p.roundRect(-44*u,-46*u,10*u,18*u,2*u); p.roundRect(34*u,-46*u,10*u,18*u,2*u); }); // weights
});

// ---- Maestro Foccino: ringmaster seal ----
makeSprite('maestrofoccino', 120, (g,u)=>{
  sh(g,'#7d8893',3*u,(p)=>{ p.ellipse(0,12*u,15*u,22*u,0,0,TAU); }); // body upright
  sh(g,'#9aa6b0',0,(p)=>{ p.ellipse(0,16*u,9*u,15*u,0,0,TAU); }); // belly
  sh(g,'#7d8893',2.5*u,(p)=>{ p.ellipse(-15*u,12*u,5*u,11*u,0.4,0,TAU); p.ellipse(15*u,12*u,5*u,11*u,-0.4,0,TAU); }); // flippers
  sh(g,'#7d8893',3*u,(p)=>{ p.ellipse(0,-12*u,12*u,11*u,0,0,TAU); }); // head
  sh(g,'#5a6470',2*u,(p)=>{ p.moveTo(-3*u,-6*u); p.lineTo(3*u,-6*u); p.lineTo(0,-1*u); p.closePath(); }); // nose
  g.strokeStyle=OUT; g.lineWidth=1.2*u; for(const s of [-1,1]){ g.beginPath(); g.moveTo(s*3*u,-3*u); g.lineTo(s*14*u,-5*u); g.moveTo(s*3*u,-1*u); g.lineTo(s*14*u,1*u); g.stroke(); } // whiskers
  eyes(g,u,0,-15*u,5*u,3.4*u);
  // ringmaster top hat + bowtie
  sh(g,'#2a2f36',2.5*u,(p)=>{ p.ellipse(0,-22*u,15*u,4*u,0,0,TAU); }); sh(g,'#e8463c',2.5*u,(p)=>{ p.rect(-9*u,-38*u,18*u,16*u); });
  sh(g,'#2a2f36',0,(p)=>{ p.rect(-9*u,-26*u,18*u,4*u); }); // hat band
  sh(g,'#ffd24a',2*u,(p)=>{ p.moveTo(0,4*u); p.lineTo(-7*u,0); p.lineTo(-7*u,8*u); p.closePath(); p.moveTo(0,4*u); p.lineTo(7*u,0); p.lineTo(7*u,8*u); p.closePath(); }); // bowtie
});

// ============================================================
// WORLD 5 — CIRCO BRAINROTTO : boss sprites (size 256)
// ============================================================

// ---- Trapezino Volantino: acrobat on a trapeze ----
makeSprite('trapezino', 256, (g,u)=>{
  g.strokeStyle='#7a5234'; g.lineWidth=3*u; g.beginPath(); g.moveTo(-30*u,-46*u); g.lineTo(-22*u,-6*u); g.moveTo(30*u,-46*u); g.lineTo(22*u,-6*u); g.stroke(); // ropes
  sh(g,'#5a3f22',4*u,(p)=>{ p.roundRect(-26*u,-6*u,52*u,6*u,3*u); }); // trapeze bar
  // acrobat hanging, arms up to bar
  sh(g,'#f0c9a0',3.5*u,(p)=>{ p.ellipse(0,-14*u,12*u,12*u,0,0,TAU); }); // head
  sh(g,'#e8463c',4*u,(p)=>{ p.roundRect(-13*u,-2*u,26*u,30*u,8*u); }); // striped torso
  g.fillStyle='#fdeede'; for(const sy of [4,12,20]){ g.fillRect(-13*u,sy*u,26*u,3*u); } // white stripes
  sh(g,'#e8463c',3*u,(p)=>{ p.moveTo(-10*u,0); p.lineTo(-22*u,-4*u); p.lineTo(-20*u,2*u); p.closePath(); p.moveTo(10*u,0); p.lineTo(22*u,-4*u); p.lineTo(20*u,2*u); p.closePath(); }); // arms to bar
  sh(g,'#3a3f6a',3*u,(p)=>{ p.moveTo(-10*u,28*u); p.lineTo(-16*u,46*u); p.lineTo(-8*u,30*u); p.closePath(); p.moveTo(10*u,28*u); p.lineTo(16*u,46*u); p.lineTo(8*u,30*u); p.closePath(); }); // legs/tights pointed
  eyes(g,u,0,-14*u,8*u,4.5*u);
  g.strokeStyle=OUT; g.lineWidth=2.5*u; g.beginPath(); g.arc(0,-8*u,5*u,0.15,Math.PI-0.15); g.stroke();
  dot(g,0,-26*u,4*u,'#ffd24a'); // headband gem
});

// ---- Giostra Vorticosa: living carousel with a horse ----
makeSprite('giostra', 256, (g,u)=>{
  sh(g,'#caa46a',4*u,(p)=>{ p.roundRect(-40*u,34*u,80*u,12*u,4*u); }); // platform
  g.save(); // striped roof
  sh(g,'#e8463c',4*u,(p)=>{ p.moveTo(-42*u,-18*u); p.lineTo(0,-48*u); p.lineTo(42*u,-18*u); p.closePath(); });
  g.fillStyle='#fdeede'; for(let i=-2;i<=2;i++){ g.beginPath(); g.moveTo(i*15*u,-18*u); g.lineTo(i*15*u+6*u,-18*u); g.lineTo(3*u,-46*u); g.lineTo(0,-46*u); g.closePath(); g.fill(); }
  g.restore();
  dot(g,0,-50*u,5*u,'#ffd24a'); // finial
  sh(g,'#ffd24a',3*u,(p)=>{ p.rect(-2.5*u,-18*u,5*u,52*u); }); // center pole
  // carousel horse
  g.save(); g.translate(2*u,8*u);
  sh(g,'#f4f4f4',3.5*u,(p)=>{ p.ellipse(0,4*u,22*u,14*u,0,0,TAU); }); // horse body
  sh(g,'#f4f4f4',3*u,(p)=>{ p.moveTo(16*u,-2*u); p.quadraticCurveTo(30*u,-8*u,26*u,-20*u); p.lineTo(18*u,-18*u); p.quadraticCurveTo(22*u,-8*u,12*u,-2*u); p.closePath(); }); // neck/head
  sh(g,'#ff9fd6',2.5*u,(p)=>{ p.moveTo(22*u,-18*u); p.lineTo(14*u,-22*u); p.lineTo(20*u,-10*u); p.closePath(); }); // pink mane
  sh(g,'#f4f4f4',2.5*u,(p)=>{ for(const lx of [-16,-6,6,14]) p.roundRect(lx*u,14*u,5*u,16*u,2*u); }); // legs
  dot(g,24*u,-15*u,2.5*u,OUT); // eye
  g.strokeStyle=OUT; g.lineWidth=2.5*u; g.beginPath(); g.moveTo(2*u,-30*u); g.lineTo(2*u,12*u); g.stroke(); // pole through horse
  g.restore();
});

// ---- Mangiafuoco Draghino: fire-eater breathing flame ----
makeSprite('mangiafuoco', 256, (g,u)=>{
  sh(g,'#7a4a2a',5*u,(p)=>{ p.ellipse(0,28*u,40*u,30*u,0,0,TAU); }); // burly torso
  sh(g,'#e8463c',0,(p)=>{ p.roundRect(-10*u,4*u,20*u,40*u,5*u); }); // sash
  sh(g,'#caa46a',4*u,(p)=>{ p.ellipse(-34*u,18*u,12*u,16*u,0.3,0,TAU); p.ellipse(34*u,18*u,12*u,16*u,-0.3,0,TAU); }); // arms
  sh(g,'#e0a878',4.5*u,(p)=>{ p.ellipse(0,-14*u,22*u,20*u,0,0,TAU); }); // head
  // big black beard
  sh(g,'#2a2420',3*u,(p)=>{ p.moveTo(-20*u,-12*u); p.quadraticCurveTo(-16*u,18*u,0,16*u); p.quadraticCurveTo(16*u,18*u,20*u,-12*u); p.quadraticCurveTo(0,-2*u,-20*u,-12*u); p.closePath(); });
  eyes(g,u,0,-22*u,8*u,4.5*u);
  g.strokeStyle=OUT; g.lineWidth=3*u; g.beginPath(); g.moveTo(-18*u,-30*u); g.lineTo(-6*u,-26*u); g.moveTo(6*u,-26*u); g.lineTo(18*u,-30*u); g.stroke(); // brows
  // flame plume from mouth (upward, within bounds)
  sh(g,'#ff7a2a',3*u,(p)=>{ p.moveTo(-10*u,-6*u); p.quadraticCurveTo(-14*u,-30*u,0,-46*u); p.quadraticCurveTo(14*u,-30*u,10*u,-6*u); p.closePath(); });
  sh(g,'#ffd24a',0,(p)=>{ p.moveTo(-5*u,-8*u); p.quadraticCurveTo(-7*u,-26*u,0,-38*u); p.quadraticCurveTo(7*u,-26*u,5*u,-8*u); p.closePath(); });
  // torch in hand
  g.save(); g.translate(-40*u,18*u); sh(g,'#7a5234',2.5*u,(p)=>{ p.rect(-2*u,0,4*u,20*u); }); _flame(g,u*0.7,'#ff7a2a','#ffd24a'); g.restore();
});

// ---- Il Gran Pagliaccio: the Great Ringmaster clown (W5 finale) ----
makeSprite('granpagliaccio', 256, (g,u)=>{
  // huge ruffle collar
  g.fillStyle='#ffd24a'; for(let i=0;i<16;i++){ const a=i*TAU/16; dot(g, Math.cos(a)*30*u, 12*u+Math.sin(a)*16*u, 9*u, i%2?'#ffd24a':'#ff5ea8'); }
  for(let i=0;i<16;i++){ const a=i*TAU/16; g.strokeStyle=OUT; g.lineWidth=1.6*u; g.beginPath(); g.arc(Math.cos(a)*30*u, 12*u+Math.sin(a)*16*u, 9*u,0,TAU); g.stroke(); }
  sh(g,'#3a78c0',5*u,(p)=>{ p.ellipse(0,30*u,30*u,24*u,0,0,TAU); }); // coat body
  sh(g,'#fdeede',5*u,(p)=>{ p.ellipse(0,-16*u,30*u,28*u,0,0,TAU); }); // big face
  dot(g,-30*u,-18*u,9*u,'#ff7a3a'); dot(g,30*u,-18*u,9*u,'#ff7a3a'); // hair tufts
  g.strokeStyle=OUT; g.lineWidth=3*u; g.beginPath(); g.arc(-30*u,-18*u,9*u,0,TAU); g.arc(30*u,-18*u,9*u,0,TAU); g.stroke();
  dot(g,0,-6*u,7*u,'#e8463c'); // red nose
  eyes(g,u,0,-22*u,12*u,6*u);
  g.strokeStyle='#e8463c'; g.lineWidth=3.5*u; g.beginPath(); g.arc(0,-8*u,13*u,0.12,Math.PI-0.12); g.stroke(); // grand grin
  // top hat
  sh(g,'#2a2f36',4*u,(p)=>{ p.ellipse(0,-40*u,26*u,6*u,0,0,TAU); }); sh(g,'#e8463c',4*u,(p)=>{ p.rect(-16*u,-47*u,32*u,9*u); });
  sh(g,'#2a2f36',0,(p)=>{ p.rect(-16*u,-40*u,32*u,4*u); }); // hat band
});
