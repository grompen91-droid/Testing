'use strict';
// ============ SPRITE FACTORY (pre-rendered vector assets) ============
const OUT = '#33272a';           // outline color used across all sprites
const SP = {};                   // sprite canvases
const SPW = {};                  // white flash versions
function makeSprite(name, size, draw){
  const c = document.createElement('canvas'); c.width=size; c.height=size;
  const g = c.getContext('2d');
  g.translate(size/2, size/2); g.lineJoin='round'; g.lineCap='round';
  draw(g, size/100);            // u = size/100 unit scale
  SP[name] = c;
  const w = document.createElement('canvas'); w.width=size; w.height=size;
  const wg = w.getContext('2d');
  wg.drawImage(c,0,0); wg.globalCompositeOperation='source-in'; wg.fillStyle='#fff'; wg.fillRect(0,0,size,size);
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
