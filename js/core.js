'use strict';
// ============ CANVAS SETUP & SHARED HELPERS ============
const cv = document.getElementById('game');
const cx = cv.getContext('2d');
let W=0, H=0, DPR=1;
function resize(){
  DPR = Math.min(window.devicePixelRatio||1, 2);
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
const ZMIN = 0.7, ZMAX = 2.2;    // max zoom-out (0.7 = only slightly out, keeps character big) / max zoom-in
function setZoom(z){ zoom = clamp(z, ZMIN, ZMAX); }
function zoomBy(d){ setZoom(+(zoom + d).toFixed(3)); }
function computeCamera(){
  const vw = W/zoom, vh = H/zoom;
  camera.x = WORLD.w<=vw ? (WORLD.w-vw)/2 : clamp(P.x - vw/2, 0, WORLD.w-vw);
  camera.y = WORLD.h<=vh ? (WORLD.h-vh)/2 : clamp(P.y - vh/2, 0, WORLD.h-vh);
}

// ============ GLOBAL GAME-STATE FLAG ============
const ST = { MENU:0, PLAY:1, LEVELUP:2, OVER:3, PAUSE:4, CUTSCENE:5 };
let state = ST.MENU;
