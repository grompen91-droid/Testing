'use strict';
// ============ PETS: draw, hooks, utilities ============
// Loads after characters.js, before game.js.

// ---- per-pet draw functions ----

function _drawGattino(ctx, size, t) {
  t = t||0;
  // Orange cat body (round ellipse)
  ctx.beginPath();
  ctx.ellipse(0, size*0.12, size*0.28, size*0.22, 0, 0, Math.PI*2);
  ctx.fillStyle='#e88030';
  ctx.fill();
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.035);
  ctx.stroke();
  // Tail
  ctx.beginPath();
  ctx.moveTo(size*0.22, size*0.22);
  ctx.bezierCurveTo(size*0.42,size*0.10, size*0.46,-size*0.08, size*0.32,-size*0.12);
  ctx.strokeStyle='#e88030';
  ctx.lineWidth=Math.max(3,size*0.07);
  ctx.stroke();
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.030);
  ctx.stroke();
  // Round orange cat face/head
  ctx.beginPath();
  ctx.arc(0, -size*0.12, size*0.24, 0, Math.PI*2);
  ctx.fillStyle='#f09040';
  ctx.fill();
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.035);
  ctx.stroke();
  // Triangle ears
  ctx.fillStyle='#e88030';
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.03);
  for(const sx of [-1,1]){
    ctx.beginPath();
    ctx.moveTo(sx*size*0.08, -size*0.30);
    ctx.lineTo(sx*size*0.20, -size*0.12);
    ctx.lineTo(sx*size*(-0.01), -size*0.12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // Small nose
  ctx.beginPath();
  ctx.arc(0, -size*0.10, size*0.025, 0, Math.PI*2);
  ctx.fillStyle='#e04070';
  ctx.fill();
  // Eyes
  ctx.fillStyle='#2a1c10';
  for(const sx of [-0.085,0.085]){
    ctx.beginPath();
    ctx.arc(size*sx, -size*0.155, size*0.038, 0, Math.PI*2);
    ctx.fill();
  }
  // Whisker lines
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1,size*0.018);
  const whiskers=[[-0.12,-0.09,-0.30,-0.08],[-0.12,-0.10,-0.30,-0.13],
                   [0.12,-0.09,0.30,-0.08],[0.12,-0.10,0.30,-0.13]];
  for(const [x1,y1,x2,y2] of whiskers){
    ctx.beginPath();
    ctx.moveTo(size*x1,size*y1);
    ctx.lineTo(size*x2,size*y2);
    ctx.stroke();
  }
}

function _drawUccellino(ctx, size, t) {
  t = t||0;
  // Small yellow bird body
  ctx.beginPath();
  ctx.ellipse(0, size*0.05, size*0.22, size*0.18, 0, 0, Math.PI*2);
  ctx.fillStyle='#f5d030';
  ctx.fill();
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.035);
  ctx.stroke();
  // Round head
  ctx.beginPath();
  ctx.arc(0, -size*0.16, size*0.18, 0, Math.PI*2);
  ctx.fillStyle='#f5d030';
  ctx.fill();
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.035);
  ctx.stroke();
  // Beak triangle
  ctx.beginPath();
  ctx.moveTo(size*0.17, -size*0.17);
  ctx.lineTo(size*0.30, -size*0.14);
  ctx.lineTo(size*0.17, -size*0.10);
  ctx.closePath();
  ctx.fillStyle='#e07020';
  ctx.fill();
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1,size*0.025);
  ctx.stroke();
  // Eye
  ctx.fillStyle='#2a1c10';
  ctx.beginPath();
  ctx.arc(size*0.07,-size*0.19,size*0.032,0,Math.PI*2);
  ctx.fill();
  // Wing arc (left)
  ctx.beginPath();
  ctx.moveTo(-size*0.10, size*0.02);
  ctx.quadraticCurveTo(-size*0.34,-size*0.06,-size*0.18,-size*0.18);
  ctx.fillStyle='#e8c020';
  ctx.fill();
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.03);
  ctx.stroke();
}

function _drawOrbino(ctx, size, t) {
  t = t||0;
  // Glowing teal orb
  ctx.save();
  ctx.shadowColor='#40f0d0';
  ctx.shadowBlur=size*0.18;
  ctx.beginPath();
  ctx.arc(0, 0, size*0.28, 0, Math.PI*2);
  ctx.fillStyle='#30d0c0';
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.03);
  ctx.beginPath();
  ctx.arc(0, 0, size*0.28, 0, Math.PI*2);
  ctx.stroke();
  // Sparkle lines
  const sparkCount=6;
  for(let i=0;i<sparkCount;i++){
    const a=i*Math.PI*2/sparkCount + t*1.5;
    const r1=size*0.30, r2=size*0.38;
    ctx.strokeStyle='#80f0e8';
    ctx.lineWidth=Math.max(1.5,size*0.025);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a)*r1,Math.sin(a)*r1);
    ctx.lineTo(Math.cos(a)*r2,Math.sin(a)*r2);
    ctx.stroke();
  }
  // Inner lighter circle
  ctx.beginPath();
  ctx.arc(-size*0.08,-size*0.09,size*0.10,0,Math.PI*2);
  ctx.fillStyle='rgba(200,255,250,0.5)';
  ctx.fill();
}

function _drawScudetto(ctx, size, t) {
  t = t||0;
  // Turtle shell body (hexagon)
  const r=size*0.28;
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3-Math.PI/6;
    i===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
  }
  ctx.closePath();
  ctx.fillStyle='#60a850';
  ctx.fill();
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(2,size*0.04);
  ctx.stroke();
  // Hex pattern lines inside
  ctx.strokeStyle='#3a7830';
  ctx.lineWidth=Math.max(1,size*0.022);
  const innerR=size*0.18;
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3-Math.PI/6;
    ctx.moveTo(0,0);
    ctx.lineTo(Math.cos(a)*innerR,Math.sin(a)*innerR);
  }
  ctx.stroke();
  // Center hexagon
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3-Math.PI/6;
    i===0?ctx.moveTo(Math.cos(a)*innerR,Math.sin(a)*innerR):ctx.lineTo(Math.cos(a)*innerR,Math.sin(a)*innerR);
  }
  ctx.closePath();
  ctx.strokeStyle='#2a5820';
  ctx.lineWidth=Math.max(1,size*0.02);
  ctx.stroke();
}

function _drawCalamita(ctx, size, t) {
  t = t||0;
  // Horseshoe magnet shape
  const sw=size*0.12, sh=size*0.28, cr=size*0.14;
  // Left arm
  ctx.beginPath();
  ctx.rect(-cr-sw/2, -sh, sw, sh);
  ctx.fillStyle='#cc2020';
  ctx.fill();
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.03);
  ctx.stroke();
  // Right arm
  ctx.beginPath();
  ctx.rect(cr-sw/2, -sh, sw, sh);
  ctx.fillStyle='#cc2020';
  ctx.fill();
  ctx.stroke();
  // Curved top (arc connecting the two arms)
  ctx.beginPath();
  ctx.arc(0,-sh,cr+sw/2,Math.PI,0,false);
  ctx.arc(0,-sh,cr-sw/2,0,Math.PI,true);
  ctx.closePath();
  ctx.fillStyle='#888888';
  ctx.fill();
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.03);
  ctx.stroke();
  // Magnet poles (tips)
  for(const sx of [-1,1]){
    ctx.beginPath();
    ctx.rect(sx*cr-sw/2, 0, sw, size*0.06);
    ctx.fillStyle=sx<0?'#cc2020':'#e8e8e8';
    ctx.fill();
    ctx.stroke();
  }
  // Attraction lines
  ctx.strokeStyle='rgba(80,150,255,0.6)';
  ctx.lineWidth=Math.max(1,size*0.02);
  for(let i=0;i<3;i++){
    const off=i*size*0.08+size*0.08;
    ctx.beginPath();
    ctx.arc(0,-sh,cr+off,0,Math.PI,false);
    ctx.stroke();
  }
}

function _drawDraghetto(ctx, size, t) {
  t = t||0;
  // Tiny dragon round body
  ctx.beginPath();
  ctx.ellipse(0, size*0.08, size*0.26, size*0.22, 0, 0, Math.PI*2);
  ctx.fillStyle='#2a8840';
  ctx.fill();
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.035);
  ctx.stroke();
  // Wings
  ctx.fillStyle='#1a6030';
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.03);
  for(const sx of [-1,1]){
    ctx.save();
    ctx.scale(sx,1);
    ctx.beginPath();
    ctx.moveTo(size*0.18, -size*0.05);
    ctx.bezierCurveTo(size*0.42,-size*0.22,size*0.44,-size*0.40,size*0.28,-size*0.36);
    ctx.bezierCurveTo(size*0.14,-size*0.30,size*0.10,-size*0.10,size*0.10,-size*0.05);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // Round head
  ctx.beginPath();
  ctx.arc(0,-size*0.18,size*0.18,0,Math.PI*2);
  ctx.fillStyle='#3aaa50';
  ctx.fill();
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.035);
  ctx.stroke();
  // Eyes
  ctx.fillStyle='#ffd000';
  for(const sx of [-0.07,0.07]){
    ctx.beginPath();
    ctx.arc(size*sx,-size*0.20,size*0.035,0,Math.PI*2);
    ctx.fill();
  }
  ctx.fillStyle='#2a1c10';
  for(const sx of [-0.07,0.07]){
    ctx.beginPath();
    ctx.arc(size*sx,-size*0.20,size*0.018,0,Math.PI*2);
    ctx.fill();
  }
  // Small flame
  const fx=0, fy=size*0.32;
  ctx.save();
  ctx.translate(fx,fy);
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.bezierCurveTo(-size*0.08,-size*0.12, -size*0.04,-size*0.20, 0,-size*0.24);
  ctx.bezierCurveTo(size*0.04,-size*0.20, size*0.08,-size*0.12, 0,0);
  ctx.fillStyle='#ff8020';
  ctx.fill();
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1,size*0.022);
  ctx.stroke();
  // Inner flame
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.bezierCurveTo(-size*0.04,-size*0.08, -size*0.02,-size*0.14, 0,-size*0.18);
  ctx.bezierCurveTo(size*0.02,-size*0.14, size*0.04,-size*0.08, 0,0);
  ctx.fillStyle='#ffe060';
  ctx.fill();
  ctx.restore();
}

function _drawStellina(ctx, size, t) {
  t = t||0;
  // 5-point star, gold
  const outerR=size*0.32, innerR=size*0.14;
  const points=5;
  // Glow
  ctx.save();
  ctx.shadowColor='#ffd24a';
  ctx.shadowBlur=size*0.20;
  ctx.beginPath();
  for(let i=0;i<points*2;i++){
    const a=i*Math.PI/points - Math.PI/2;
    const r=i%2===0?outerR:innerR;
    i===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
  }
  ctx.closePath();
  ctx.fillStyle='#f5d060';
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  for(let i=0;i<points*2;i++){
    const a=i*Math.PI/points - Math.PI/2;
    const r=i%2===0?outerR:innerR;
    i===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
  }
  ctx.closePath();
  ctx.fillStyle='#f5d060';
  ctx.fill();
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.035);
  ctx.stroke();
  // Inner highlight
  const hiR=size*0.10;
  ctx.beginPath();
  for(let i=0;i<points*2;i++){
    const a=i*Math.PI/points - Math.PI/2;
    const r=i%2===0?hiR:hiR*0.44;
    i===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
  }
  ctx.closePath();
  ctx.fillStyle='rgba(255,255,200,0.6)';
  ctx.fill();
}

function _drawAnimaGemella(ctx, size, t) {
  t = t||0;
  // Ghost-like twin silhouette, translucent blue
  ctx.globalAlpha=0.80;
  // Main ghost
  ctx.beginPath();
  ctx.arc(-size*0.06, -size*0.10, size*0.22, Math.PI, 0, false);
  ctx.lineTo(size*0.16, size*0.22);
  // 3 bottom bumps
  for(let i=0;i<3;i++){
    const bx=size*0.16-i*size*0.10-(size*0.05);
    ctx.quadraticCurveTo(bx, size*0.28+size*0.04*(i%2?1:-1), bx-size*0.10, size*0.22);
  }
  ctx.closePath();
  ctx.fillStyle='#5090d8';
  ctx.fill();
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1.5,size*0.03);
  ctx.stroke();
  // Twin (offset right)
  ctx.globalAlpha=0.55;
  ctx.beginPath();
  ctx.arc(size*0.10, -size*0.08, size*0.18, Math.PI, 0, false);
  ctx.lineTo(size*0.28, size*0.20);
  ctx.lineTo(size*0.04, size*0.20);
  ctx.closePath();
  ctx.fillStyle='#88c0ff';
  ctx.fill();
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1,size*0.025);
  ctx.stroke();
  ctx.globalAlpha=1.0;
  // Hollow eyes on main ghost
  ctx.strokeStyle='#2a1c10';
  ctx.lineWidth=Math.max(1,size*0.025);
  for(const sx of [-0.12,0.02]){
    ctx.beginPath();
    ctx.arc(size*sx,-size*0.12,size*0.038,0,Math.PI*2);
    ctx.stroke();
  }
}

// ============ PETS ARRAY ============
const PETS = [
  {
    id: 'gattino',
    name: 'Gattino',
    desc: 'Drops a heart (+25 HP) at every wave start. Every 20 kills: drops another heart.',
    rarity: 'common',
    register() {
      function _dropSmallHeart(){
        if(typeof gems==='undefined'||typeof P==='undefined'||typeof rand==='undefined') return;
        const a=rand(0,Math.PI*2), s=rand(60,110);
        gems.push({x:P.x,y:P.y,heart:true,heal:25,t:0,vx:Math.cos(a)*s,vy:Math.sin(a)*s});
      }
      let gKills=0;
      onHook('waveStart', () => { gKills=0; _dropSmallHeart(); });
      onHook('onKill', () => { gKills++; if(gKills%20===0) _dropSmallHeart(); });
    },
    draw(ctx, size, t) { _drawGattino(ctx, size, t); }
  },
  {
    id: 'uccellino',
    name: 'Uccellino',
    desc: 'Drops 3 XP orbs at every wave start. Boss waves drop 8 bonus XP orbs.',
    rarity: 'common',
    register() {
      onHook('waveStart', () => {
        if(typeof dropOrb==='undefined'||typeof P==='undefined') return;
        const isBoss = typeof wave!=='undefined' && wave%5===0;
        const n = isBoss ? 8 : 3;
        for(let i=0;i<n;i++) dropOrb(P.x+(i%3-1)*28, P.y, 2);
      });
    },
    draw(ctx, size, t) { _drawUccellino(ctx, size, t); }
  },
  {
    id: 'orbino',
    name: 'Orbino',
    desc: 'Every 3 kills: stores 1 XP orb. Releases all stored orbs visibly at wave end.',
    rarity: 'rare',
    register() {
      let stored=0;
      onHook('waveStart', () => { stored=0; });
      onHook('onKill', () => { stored++; });
      onHook('waveEnd', () => {
        if(typeof dropOrb==='undefined'||typeof P==='undefined') return;
        const n=Math.min(Math.floor(stored/3), 20);
        for(let i=0;i<n;i++) dropOrb(P.x, P.y, 3);
        if(n>0 && typeof floatText==='function') floatText(P.x,P.y-50,'+'+n+' XP','#9fe0ff',18);
      });
    },
    draw(ctx, size, t) { _drawOrbino(ctx, size, t); }
  },
  {
    id: 'scudetto',
    name: 'Scudetto',
    desc: 'Fires at the same enemy you\'re shooting at for 25% of your damage.',
    rarity: 'rare',
    register() {
      onHook('playerShoot', (target) => {
        if(typeof P==='undefined'||!target||target.hp<=0) return;
        if(typeof petBullets!=='undefined')
          petBullets.push({x:P.petX, y:P.petY, tx:target.x, ty:target.y, target, dmg:P.dmg*0.25});
      });
    },
    draw(ctx, size, t) { _drawScudetto(ctx, size, t); }
  },
  {
    id: 'calamita',
    name: 'Calamita',
    desc: 'At wave start: vacuums all pickups toward you for 3s.',
    rarity: 'rare',
    register() {
      if(typeof P!=='undefined') P.hasMagnetPet=true;
      let pullT=0;
      onHook('waveStart', () => { pullT=3; });
      onHook('petTick', (dt) => {
        if(pullT<=0||typeof gems==='undefined') return;
        pullT-=dt;
        for(const g of gems) g.vac=true;
      });
    },
    draw(ctx, size, t) { _drawCalamita(ctx, size, t); }
  },
  {
    id: 'draghetto',
    name: 'Draghetto',
    desc: 'Every 3s: breathes fire at nearest enemy (120% dmg), spreading to 2 nearby foes (60% dmg).',
    rarity: 'epic',
    register() {
      let cd=3;
      onHook('petTick', (dt) => {
        if(typeof P==='undefined'||typeof enemies==='undefined') return;
        cd-=dt;
        if(cd<=0){
          cd=3;
          let near=null, nd=Infinity;
          for(const e of enemies){ if(e.iv>0||e.under) continue; const d=(e.x-P.x)**2+(e.y-P.y)**2; if(d<nd){nd=d;near=e;} }
          if(near){
            const dmg=P.dmg*1.2;
            near.hp-=dmg; near.hitT=Math.max(near.hitT||0,0.15);
            if(typeof burst==='function') burst(near.x,near.y,'#ff5010',12,200);
            if(typeof floatText==='function') floatText(near.x,near.y-near.r-4,Math.round(dmg),'#ff6020',15);
            let spread=0;
            for(const o of enemies){
              if(o===near||o.iv>0||o.under) continue;
              if((o.x-near.x)**2+(o.y-near.y)**2<180*180){
                o.hp-=P.dmg*0.6; o.hitT=Math.max(o.hitT||0,0.1);
                if(typeof burst==='function') burst(o.x,o.y,'#ff5010',6,130);
                if(++spread>=2) break;
              }
            }
          }
        }
      });
    },
    draw(ctx, size, t) { _drawDraghetto(ctx, size, t); }
  },
  {
    id: 'stellina',
    name: 'Stellina',
    desc: 'Every 8s: fires a starburst of 8 shots in all directions. Every 5 kills: drops a small heal.',
    rarity: 'epic',
    register() {
      let cd=8, killCount=0;
      onHook('petTick', (dt) => {
        if(typeof P==='undefined') return;
        cd-=dt;
        if(cd<=0){
          cd=8;
          if(typeof bullets!=='undefined'){
            for(let i=0;i<8;i++){
              const a=(i/8)*Math.PI*2;
              bullets.push({x:P.x,y:P.y,vx:Math.cos(a)*440,vy:Math.sin(a)*440,r:7,pierce:2,hit:new Set(),dist:420,dmgMul:0.65,lucky:false,luckyCrit:false});
            }
          }
          if(typeof burst==='function') burst(P.x,P.y,'#ffe14d',14,200);
        }
      });
      onHook('onKill', () => {
        killCount++;
        if(killCount%5===0 && typeof gems!=='undefined'&&typeof P!=='undefined'&&typeof rand!=='undefined'){
          const a=rand(0,Math.PI*2), s=rand(50,100);
          gems.push({x:P.x,y:P.y,heart:true,heal:15,t:0,vx:Math.cos(a)*s,vy:Math.sin(a)*s});
        }
      });
    },
    draw(ctx, size, t) { _drawStellina(ctx, size, t); }
  },
  {
    id: 'anima_gemella',
    name: 'Anima Gemella',
    desc: 'After each dash: shockwave hits nearby enemies (280px, 50% dmg).',
    rarity: 'legendary',
    register() {
      onHook('onDash', () => {
        if(typeof P==='undefined') return;
        if(typeof novaBlast==='function') novaBlast(P.x,P.y,280,P.dmg*0.5);
        if(typeof floatText==='function') floatText(P.x,P.y-50,'SOUL DASH!','#ff97ff',18);
      });
    },
    draw(ctx, size, t) { _drawAnimaGemella(ctx, size, t); }
  }
];

// ============ PET UTILITIES ============

function isPetOwned(id) {
  return JSON.parse(localStorage.getItem('br_owned_pets')||'[]').includes(id);
}

function grantPet(id) {
  const owned = JSON.parse(localStorage.getItem('br_owned_pets')||'[]');
  if(!owned.includes(id)){
    owned.push(id);
    localStorage.setItem('br_owned_pets', JSON.stringify(owned));
    if(window.markDirty) window.markDirty();
  }
  if(typeof updatePetBadge==='function') updatePetBadge();
}

function petThumbURL(petId, size) {
  size = size||80;
  const pet = PETS.find(p=>p.id===petId);
  if(!pet||!pet.draw) return '';
  const c = document.createElement('canvas');
  c.width=size; c.height=size;
  const g = c.getContext('2d');
  g.save();
  g.translate(size/2, size/2);
  pet.draw(g, size, 0);
  g.restore();
  return c.toDataURL();
}
