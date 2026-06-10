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
  // white silhouette for hit-flash
  const w = document.createElement('canvas'); w.width=size; w.height=size;
  const wg = w.getContext('2d');
  wg.drawImage(c,0,0); wg.globalCompositeOperation='source-in'; wg.fillStyle='#fff'; wg.fillRect(0,0,size,size);
  SPW[name] = w;
  return c;
}
// shape helper: fill + outline
function sh(g, fill, lw, path){
  g.beginPath(); path(g);
  if(fill){ g.fillStyle=fill; g.fill(); }
  if(lw){ g.strokeStyle=OUT; g.lineWidth=lw; g.stroke(); }
}
function dot(g,x,y,r,c){ g.fillStyle=c; g.beginPath(); g.arc(x,y,r,0,TAU); g.fill(); }
function eyes(g,u,sx,sy,sp,rr){ // simple cartoon eyes (white + pupil)
  for(const s of [-1,1]){
    dot(g, s*sp, sy, rr, '#fff');
    g.strokeStyle=OUT; g.lineWidth=1.4*u; g.beginPath(); g.arc(s*sp,sy,rr,0,TAU); g.stroke();
    dot(g, s*sp+rr*0.2, sy+rr*0.1, rr*0.5, OUT);
  }
}

// ---- Player: a cool cartoon survivor with shades ----
makeSprite('player', 128, (g,u)=>{
  // legs
  sh(g,'#3f6fae',3*u,(g)=>{ g.roundRect(-12*u,16*u,9*u,20*u,4*u); });
  sh(g,'#3f6fae',3*u,(g)=>{ g.roundRect(3*u,16*u,9*u,20*u,4*u); });
  // body
  sh(g,'#e8e3d6',3.4*u,(g)=>{ g.roundRect(-16*u,-8*u,32*u,30*u,12*u); });
  // arms
  sh(g,'#e0c39a',3*u,(g)=>{ g.roundRect(-22*u,-2*u,9*u,18*u,4*u); });
  sh(g,'#e0c39a',3*u,(g)=>{ g.roundRect(13*u,-2*u,9*u,18*u,4*u); });
  // head
  sh(g,'#f0c9a0',3.4*u,(g)=>{ g.ellipse(0,-24*u,16*u,15*u,0,0,TAU); });
  // hair
  sh(g,'#3a2d22',0,(g)=>{ g.ellipse(0,-33*u,15*u,8*u,0,Math.PI,TAU); });
  sh(g,'#3a2d22',0,(g)=>{ g.rect(-15*u,-34*u,30*u,6*u); });
  // sunglasses
  sh(g,OUT,0,(g)=>{ g.roundRect(-13*u,-27*u,11*u,8*u,2*u); });
  sh(g,OUT,0,(g)=>{ g.roundRect(2*u,-27*u,11*u,8*u,2*u); });
  sh(g,OUT,2*u,(g)=>{ g.moveTo(-2*u,-23*u); g.lineTo(2*u,-23*u); });
  dot(g,-9*u,-24*u,1.6*u,'#9fd0ff');
  // smile
  g.strokeStyle=OUT; g.lineWidth=2.2*u; g.beginPath(); g.arc(0,-18*u,5*u,0.15,Math.PI-0.15); g.stroke();
});

// ---- Skibidi Toilet ----
makeSprite('skibidi', 110, (g,u)=>{
  sh(g,'#e7e8ee',3.6*u,(g)=>{ g.moveTo(-16*u,30*u); g.lineTo(16*u,30*u); g.lineTo(12*u,44*u); g.lineTo(-12*u,44*u); g.closePath(); });
  sh(g,'#f4f5f9',3.6*u,(g)=>{ g.ellipse(0,18*u,27*u,21*u,0,0,TAU); });        // bowl
  sh(g,'#ffffff',3.6*u,(g)=>{ g.ellipse(0,3*u,26*u,12*u,0,0,TAU); });          // seat
  sh(g,'#c8cad6',0,(g)=>{ g.ellipse(0,3*u,16*u,7*u,0,0,TAU); });               // hole
  sh(g,'#f0c197',3.4*u,(g)=>{ g.ellipse(0,-14*u,14*u,15*u,0,0,TAU); });        // head
  sh(g,'#3a2d22',0,(g)=>{ g.ellipse(0,-24*u,13*u,7*u,0,Math.PI,TAU); });       // hair
  eyes(g,u,0,-15*u,5*u,3*u);
  g.strokeStyle=OUT; g.lineWidth=2.4*u; g.beginPath(); g.arc(0,-9*u,6*u,0.1,Math.PI-0.1); g.stroke();
  // teeth grin
  sh(g,'#fff',1.4*u,(g)=>{ g.rect(-5*u,-9*u,10*u,3*u); });
});

// ---- Tralalero Tralala: blue shark in sneakers ----
makeSprite('tralalero', 120, (g,u)=>{
  sh(g,'#2f7fb8',3.6*u,(g)=>{ g.moveTo(34*u,-2*u); g.lineTo(48*u,-14*u); g.lineTo(46*u,8*u); g.closePath(); }); // tail
  sh(g,'#3f9bd6',3.6*u,(g)=>{ g.ellipse(2*u,-2*u,34*u,20*u,0,0,TAU); });       // body
  sh(g,'#dfeef7',0,(g)=>{ g.ellipse(0,6*u,26*u,11*u,0,0,Math.PI); });          // belly
  sh(g,'#2f7fb8',3*u,(g)=>{ g.moveTo(-4*u,-20*u); g.lineTo(6*u,-34*u); g.lineTo(14*u,-20*u); g.closePath(); }); // dorsal
  // mouth + teeth
  sh(g,'#23435a',2.6*u,(g)=>{ g.moveTo(-34*u,2*u); g.lineTo(-12*u,2*u); g.lineTo(-14*u,12*u); g.lineTo(-32*u,10*u); g.closePath(); });
  for(let i=0;i<4;i++){ sh(g,'#fff',1*u,(g)=>{ g.moveTo(-32*u+i*5*u,3*u); g.lineTo(-29*u+i*5*u,8*u); g.lineTo(-26*u+i*5*u,3*u); g.closePath(); }); }
  eyes(g,u,-16*u,-9*u,7*u,4*u);
  // sneakers (legs)
  for(const lx of [-8,8,24]){ sh(g,'#fff',2.4*u,(g)=>{ g.roundRect((lx-6)*u,16*u,14*u,8*u,4*u); }); sh(g,'#e54d4d',1.6*u,(g)=>{ g.rect((lx-6)*u,21*u,14*u,3*u); }); }
});

// ---- Bombardiro Crocodilo: croc-headed bomber ----
makeSprite('crocodilo', 120, (g,u)=>{
  sh(g,'#6a7a52',3.4*u,(g)=>{ g.moveTo(-6*u,-4*u); g.lineTo(-30*u,-22*u); g.lineTo(-26*u,-2*u); g.closePath(); }); // wing
  sh(g,'#6a7a52',3.4*u,(g)=>{ g.moveTo(-6*u,4*u); g.lineTo(-30*u,22*u); g.lineTo(-26*u,2*u); g.closePath(); });
  sh(g,'#4f5d3c',3.6*u,(g)=>{ g.ellipse(-2*u,0,30*u,15*u,0,0,TAU); });         // bomb body
  sh(g,'#3a4530',2.6*u,(g)=>{ g.ellipse(-26*u,0,4*u,8*u,0,0,TAU); });          // tail fins
  // croc head
  sh(g,'#5f9e4a',3.4*u,(g)=>{ g.ellipse(26*u,-3*u,16*u,13*u,0,0,TAU); });
  sh(g,'#5f9e4a',3*u,(g)=>{ g.moveTo(34*u,-4*u); g.lineTo(50*u,-1*u); g.lineTo(50*u,7*u); g.lineTo(34*u,8*u); g.closePath(); }); // snout
  sh(g,'#fff',0,(g)=>{ g.rect(36*u,4*u,13*u,3*u); });                          // teeth
  for(let i=0;i<5;i++){ sh(g,OUT,0.8*u,(g)=>{ g.moveTo(37*u+i*2.6*u,4*u); g.lineTo(38*u+i*2.6*u,7*u); }); }
  eyes(g,u,26*u,-12*u,5*u,3.4*u);
});

// ---- Cappuccino Assassino: coffee cup ----
makeSprite('cappuccino', 104, (g,u)=>{
  sh(g,'#d8c2a0',3*u,(g)=>{ g.roundRect(-22*u,16*u,44*u,8*u,4*u); });          // saucer
  sh(g,'#f3ece0',3.6*u,(g)=>{ g.moveTo(-20*u,-6*u); g.lineTo(20*u,-6*u); g.lineTo(15*u,18*u); g.lineTo(-15*u,18*u); g.closePath(); }); // cup
  sh(g,'#f3ece0',3*u,(g)=>{ g.arc(22*u,4*u,9*u,-1.2,1.2); });                  // handle
  sh(g,'#5b3a22',2.6*u,(g)=>{ g.ellipse(0,-7*u,20*u,7*u,0,0,TAU); });          // coffee
  sh(g,'#e8d8c0',0,(g)=>{ g.ellipse(-4*u,-9*u,9*u,4*u,0,0,TAU); });            // foam
  eyes(g,u,0,2*u,6*u,3.6*u);
  g.strokeStyle=OUT; g.lineWidth=2*u; g.beginPath(); g.arc(0,8*u,5*u,0.1,Math.PI-0.1); g.stroke();
});

// ---- Brr Brr Patapim: tree-trunk creature with long nose ----
makeSprite('patapim', 132, (g,u)=>{
  sh(g,'#7faa3e',0,(g)=>{ g.ellipse(0,-26*u,24*u,14*u,0,0,TAU); });            // leaf crown
  sh(g,'#6b9233',2*u,(g)=>{ g.ellipse(-12*u,-22*u,9*u,7*u,0,0,TAU); });
  sh(g,'#6b9233',2*u,(g)=>{ g.ellipse(12*u,-22*u,9*u,7*u,0,0,TAU); });
  sh(g,'#9c6b3f',3.8*u,(g)=>{ g.roundRect(-20*u,-16*u,40*u,40*u,12*u); });     // trunk body
  sh(g,'#85572f',2*u,(g)=>{ g.ellipse(-8*u,8*u,4*u,6*u,0,0,TAU); });           // bark knots
  sh(g,'#85572f',2*u,(g)=>{ g.ellipse(9*u,2*u,3*u,5*u,0,0,TAU); });
  eyes(g,u,0,-4*u,8*u,5*u);
  // long nose
  sh(g,'#c98a4f',3*u,(g)=>{ g.moveTo(-4*u,4*u); g.lineTo(4*u,4*u); g.lineTo(2*u,22*u); g.lineTo(-2*u,22*u); g.closePath(); });
  // legs
  sh(g,'#6b4a2b',2.6*u,(g)=>{ g.roundRect(-14*u,22*u,8*u,12*u,3*u); });
  sh(g,'#6b4a2b',2.6*u,(g)=>{ g.roundRect(6*u,22*u,8*u,12*u,3*u); });
});

// ---- Lirili Larila: little grey elephant-cactus ----
makeSprite('lirili', 138, (g,u)=>{
  sh(g,'#b6b2bd',3.8*u,(g)=>{ g.ellipse(0,2*u,30*u,28*u,0,0,TAU); });          // body
  sh(g,'#9b97a6',0,(g)=>{ g.ellipse(0,12*u,22*u,16*u,0,0,Math.PI); });         // shade
  sh(g,'#b6b2bd',3.4*u,(g)=>{ g.moveTo(-26*u,-6*u); g.quadraticCurveTo(-44*u,6*u,-34*u,22*u); g.quadraticCurveTo(-30*u,10*u,-22*u,6*u); g.closePath(); }); // trunk
  sh(g,'#c9c5d0',3*u,(g)=>{ g.ellipse(-22*u,-20*u,12*u,9*u,0,0,TAU); });       // ears
  sh(g,'#c9c5d0',3*u,(g)=>{ g.ellipse(22*u,-20*u,12*u,9*u,0,0,TAU); });
  eyes(g,u,0,-6*u,9*u,5*u);
  // tusks
  sh(g,'#fff',1.6*u,(g)=>{ g.moveTo(-10*u,16*u); g.lineTo(-14*u,24*u); g.lineTo(-7*u,20*u); g.closePath(); });
  sh(g,'#fff',1.6*u,(g)=>{ g.moveTo(10*u,16*u); g.lineTo(14*u,24*u); g.lineTo(7*u,20*u); g.closePath(); });
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
makeSprite('coin', 52, (g,u)=>{
  sh(g,'#f5c542',3.4*u,(g)=>{ g.arc(0,0,20*u,0,TAU); });
  sh(g,'#ffe39a',0,(g)=>{ g.arc(0,0,13*u,0,TAU); });
  g.fillStyle='#caa12f'; g.font='900 '+(22*u)+'px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('★',0,1*u);
});
makeSprite('heart', 52, (g,u)=>{
  sh(g,'#e8556a',3*u,(g)=>{ g.moveTo(0,18*u); g.bezierCurveTo(-22*u,2*u,-14*u,-18*u,0,-6*u); g.bezierCurveTo(14*u,-18*u,22*u,2*u,0,18*u); });
  sh(g,'#ff97a6',0,(g)=>{ g.ellipse(-7*u,-4*u,4*u,5*u,-0.5,0,TAU); });
});
