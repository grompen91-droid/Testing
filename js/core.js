'use strict';
// ============ CANVAS SETUP & SHARED HELPERS ============
const cv = document.getElementById('game');
const cx = cv.getContext('2d');
let W=0, H=0, DPR=1;
function resize(){
  // Capped well below the real DPR: profiling showed ~85% of active CPU time inside
  // CanvasRenderingContext2D.drawImage's pixel-copy path, which scales with DPR^2 (a 2x
  // cap on a 1920x1080 screen means a 3840x2160 backing buffer for every blit). This is a
  // chunky cartoon art style, not pixel-art needing retina sharpness, so 1.5 trades a small
  // amount of crispness for a big cut in per-frame pixel volume.
  DPR = Math.min(window.devicePixelRatio||1, 1.5);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = W*DPR; cv.height = H*DPR;
  cv.style.width = W+'px'; cv.style.height = H+'px';
  cx.setTransform(DPR,0,0,DPR,0,0);
}
window.addEventListener('resize', resize); resize();

const $ = id => document.getElementById(id);
const rand = (a,b) => a + Math.random()*(b-a);
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const dist2 = (ax,ay,bx,by) => { const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy; };
const clamp = (v,a,b) => v<a?a:(v>b?b:v);
const TAU = Math.PI*2;

// ============ WORLD & CAMERA ============
const WORLD = { w:2600, h:2600 };
const WALL = 46;                 // fence thickness
const camera = { x:0, y:0 };
// camera zoom: <1 = zoomed out (see more), >1 = zoomed in
let zoom = 1;
const ZMIN = 0.85, ZMAX = 2.2;   // max zoom-out (0.85 = a small step out) / max zoom-in
function setZoom(z){ zoom = clamp(z, ZMIN, ZMAX); }
function zoomBy(d){ setZoom(+(zoom + d).toFixed(3)); }
function computeCamera(){
  // always keep the player dead-centre — follow them at every zoom level, never lock to world edges/centre
  const vw = W/zoom, vh = H/zoom;
  camera.x = P.x - vw/2;
  camera.y = P.y - vh/2;
}

// ============ GLOBAL GAME-STATE FLAG ============
const ST = { MENU:0, PLAY:1, LEVELUP:2, OVER:3, PAUSE:4, CUTSCENE:5 };
let state = ST.MENU;
