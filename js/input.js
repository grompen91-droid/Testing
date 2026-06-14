'use strict';
// ============ INPUT: drag joystick, dash, zoom ============
// primary-input check: a PC (even a touchscreen laptop, which also has a mouse) reports
// hover:hover/pointer:fine, so it stays on the PC HUD. Only true touch-first devices match.
const IS_TOUCH = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
document.body.classList.toggle('is-touch', IS_TOUCH);   // drives touch-only / PC-only HUD layout in CSS
// block image dragging / right-click "save image" / copy-image
window.addEventListener('contextmenu', e=>e.preventDefault());
window.addEventListener('dragstart', e=>e.preventDefault());
document.addEventListener('dblclick', e=>e.preventDefault());

const joy = { active:false, id:-1, ox:0, oy:0, dx:0, dy:0 };
function joyStart(x,y){ joy.active=true; joy.ox=x; joy.oy=y; joy.dx=0; joy.dy=0; }
function joyMove(x,y){
  if(!joy.active) return;
  let dx=x-joy.ox, dy=y-joy.oy;
  const len=Math.hypot(dx,dy), max=58;
  if(len>max){ dx = dx/len*max; dy = dy/len*max; }   // clamp the KNOB to the ring; base stays put (no relocation)
  joy.dx = dx/max; joy.dy = dy/max;
}
function joyEnd(){ joy.active=false; joy.dx=0; joy.dy=0; }
cv.addEventListener('touchstart', e=>{ e.preventDefault(); const t=e.changedTouches[0]; joyStart(t.clientX,t.clientY); }, {passive:false});
cv.addEventListener('touchmove',  e=>{ e.preventDefault(); const t=e.changedTouches[0]; joyMove(t.clientX,t.clientY); }, {passive:false});
cv.addEventListener('touchend',   e=>{ e.preventDefault(); joyEnd(); }, {passive:false});
cv.addEventListener('touchcancel',e=>{ joyEnd(); }, {passive:false});
// mouse-drag movement is a touch-style control: only on touch devices (e.g. touch laptops), never on plain PC
if(IS_TOUCH){
  cv.addEventListener('mousedown', e=>joyStart(e.clientX,e.clientY));
  cv.addEventListener('mousemove', e=>joyMove(e.clientX,e.clientY));
  window.addEventListener('mouseup', joyEnd);
}
const keys={};
window.addEventListener('keydown',e=>{ keys[e.key.toLowerCase()]=true; if(e.key===' '||e.key==='Shift') tryDash(); if(e.key==='Escape') togglePause(); });
window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
$('dashbtn').addEventListener('touchstart', e=>{ e.preventDefault(); tryDash(); }, {passive:false});
$('dashbtn').addEventListener('mousedown', e=>{ e.preventDefault(); tryDash(); });

// start audio + menu music on the first user interaction (browsers block autoplay)
function _firstAudio(){
  initAudio();
  if(state===ST.MENU) playMusic('menu');
  window.removeEventListener('pointerdown', _firstAudio);
  window.removeEventListener('keydown', _firstAudio);
}
window.addEventListener('pointerdown', _firstAudio);
window.addEventListener('keydown', _firstAudio);

// ---- zoom controls: buttons + scroll wheel ----
$('zoomin').addEventListener('click', ()=>zoomBy(0.2));
$('zoomout').addEventListener('click', ()=>zoomBy(-0.2));
window.addEventListener('wheel', e=>{
  if(state===ST.MENU) return;
  e.preventDefault();
  zoomBy(e.deltaY<0 ? 0.12 : -0.12);
}, {passive:false});
