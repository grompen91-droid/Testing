'use strict';
// ============ CANVAS SETUP & SHARED HELPERS ============
const cv = document.getElementById('game');
// alpha:false -- the canvas is always fully repainted (void fill covers the whole viewport every
// frame), so the browser can skip alpha-compositing this layer entirely. Costs nothing visually,
// helps most on software-rendered canvases (common on Linux when GPU accel isn't available).
const cx = cv.getContext('2d', { alpha:false });
let W=0, H=0, DPR=1;

// ============ GRAPHICS / PERFORMANCE SETTINGS ============
// One knob set, persisted to localStorage, read by the resize + render + loop paths.
//   dpr      = backing-resolution cap. Pixel-copy cost scales DPR^2, so this is the single
//              biggest lever on low-end / software-rendered devices.
//   frameMin = min ms between rendered frames (fps cap). 0 = uncapped.
//   particles= multiplier on the particle hard-cap (0 = off, 0.5 = low, 1 = full).
//   shake    = master toggle for camera shake (separate from death-shake).
// frameMin default 0 = render every animation frame (vsync). A skip-cap that sits between the
// display's refresh multiples renders unevenly (e.g. ~48fps with judder on a 144Hz panel), which
// reads as "not smooth". Vsync is the smoothest pacing; weak devices cut cost via dpr/particles.
const GFX = { dpr:1.5, frameMin:0, particles:1, shake:true };
function saveGfx(){ try{ localStorage.setItem('br_gfx', JSON.stringify(GFX)); }catch(e){} }
(function loadGfx(){
  const raw = (()=>{ try{ return localStorage.getItem('br_gfx'); }catch(e){ return null; } })();
  if(raw===null){
    // First boot: pick safe defaults for the device so weak hardware starts smooth (lower
    // resolution + fewer particles), but keep vsync pacing — never the juddery frame-skip cap.
    const cores = navigator.hardwareConcurrency || 4;
    const coarse = !!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches);
    if(cores <= 4 || coarse){ GFX.dpr = 0.85; GFX.particles = 0.5; }
    saveGfx();
    return;
  }
  try{
    const s = JSON.parse(raw) || {};
    if(typeof s.dpr==='number')       GFX.dpr = s.dpr;
    if(typeof s.frameMin==='number')  GFX.frameMin = s.frameMin;
    if(typeof s.particles==='number') GFX.particles = s.particles;
    if(typeof s.shake==='boolean')    GFX.shake = s.shake;
    // Migrate the old ~69fps skip-cap default (14.5) to vsync — it was the source of the judder.
    if(s.frameMin===14.5){ GFX.frameMin = 0; saveGfx(); }
  }catch(e){}
})();

function resize(){
  // DPR capped at the user's quality setting: profiling showed ~85% of active CPU time inside
  // CanvasRenderingContext2D.drawImage's pixel-copy path, which scales with DPR^2. This is a
  // chunky cartoon art style, not pixel-art needing retina sharpness, so capping low trades a
  // small amount of crispness for a big cut in per-frame pixel volume.
  DPR = Math.min(window.devicePixelRatio||1, GFX.dpr);
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
const ST = { MENU:0, PLAY:1, LEVELUP:2, OVER:3, PAUSE:4, CUTSCENE:5, INTRO:6, OUTRO:7 };
let state = ST.MENU;
