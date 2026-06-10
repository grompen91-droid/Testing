'use strict';
// ============ AUDIO (tiny synth, no assets) ============
let AC = null;
function initAudio(){ if(!AC){ try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(AC && AC.state==='suspended') AC.resume(); }
function beep(freq, dur, type='square', vol=0.05, slide=0){
  if(!AC) return;
  try{
    const o=AC.createOscillator(), g=AC.createGain();
    o.type=type; o.frequency.value=freq;
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(40,freq+slide), AC.currentTime+dur);
    g.gain.value=vol; g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime+dur);
    o.connect(g); g.connect(AC.destination);
    o.start(); o.stop(AC.currentTime+dur);
  }catch(e){}
}
const sfx = {
  shoot: ()=>beep(700,0.05,'square',0.018,-260),
  hit:   ()=>beep(200,0.06,'square',0.04,-80),
  gem:   (n=0)=>beep(880+n*60,0.07,'sine',0.05,260),
  coin:  ()=>{ beep(1046,0.06,'square',0.05); setTimeout(()=>beep(1568,0.08,'square',0.05),60); },
  hurt:  ()=>beep(120,0.18,'sawtooth',0.09,-50),
  dash:  ()=>beep(420,0.12,'sine',0.05,260),
  level: ()=>{ beep(523,0.1,'triangle',0.06); setTimeout(()=>beep(659,0.1,'triangle',0.06),90); setTimeout(()=>beep(784,0.16,'triangle',0.06),180); },
  boss:  ()=>{ beep(90,0.4,'sawtooth',0.1,-30); setTimeout(()=>beep(70,0.45,'sawtooth',0.1,-25),250); },
  die:   ()=>beep(330,0.5,'sawtooth',0.09,-260),
  wave:  ()=>{ beep(523,0.08,'square',0.045); setTimeout(()=>beep(784,0.12,'square',0.045),80); },
  pick:  ()=>{ beep(660,0.05,'square',0.045); setTimeout(()=>beep(988,0.08,'square',0.045),55); },
  evolve:()=>{ [523,659,880,1175].forEach((f,i)=>setTimeout(()=>beep(f,0.13,'square',0.05),i*85)); },
  warn:  ()=>{ beep(150,0.3,'sawtooth',0.08,-18); setTimeout(()=>beep(150,0.3,'sawtooth',0.08,-18),320); },
  win:   ()=>{ [392,523,659,784].forEach((f,i)=>setTimeout(()=>beep(f,0.14,'triangle',0.06),i*70)); }
};

// ============ MUSIC (procedural chiptune loops, no audio assets) ============
const N = {
  E2:82.41,F2:87.31,G2:98.00,A2:110.00,B2:123.47,
  C3:130.81,D3:146.83,E3:164.81,F3:174.61,G3:196.00,A3:220.00,B3:246.94,
  C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392.00,A4:440.00,B4:493.88,
  C5:523.25,D5:587.33,E5:659.25,F5:698.46,G5:783.99,A5:880.00
}, _=0;
const TRACKS = {
  menu:  { bpm:92,  lt:'triangle', bt:'sine',     lv:0.045, bv:0.05,
    lead:[N.C5,_,N.E5,_, N.G5,_,N.E5,_, N.A4,_,N.C5,_, N.E5,_,N.D5,_],
    bass:[N.C3,_,_,_, N.G3,_,_,_, N.A3,_,_,_, N.F3,_,_,_] },
  game:  { bpm:126, lt:'square',   bt:'triangle', lv:0.036, bv:0.05,
    lead:[_,_,N.C5,_, _,_,N.A4,_, _,_,N.F4,_, _,N.G4,N.D5,_],
    bass:[N.C3,N.C3,N.G3,N.C3, N.A2,N.A3,N.E3,N.A3, N.F3,N.F3,N.C4,N.F3, N.G3,N.G3,N.D3,N.G3] },
  boss0: { bpm:142, lt:'square',   bt:'sawtooth', lv:0.04,  bv:0.045,
    lead:[N.A4,N.C5,N.E5,N.C5, N.F4,N.A4,N.C5,N.A4, N.G4,N.B4,N.D5,N.B4, N.E4,N.G4,N.B4,N.G4],
    bass:[N.A2,N.A2,N.A2,N.A2, N.F2,N.F2,N.F2,N.F2, N.G2,N.G2,N.G2,N.G2, N.E2,N.E2,N.E2,N.E2] },
  boss1: { bpm:152, lt:'sawtooth', bt:'square',   lv:0.032, bv:0.045,
    lead:[N.D5,N.F5,N.D5,N.A4, N.C5,N.E5,N.C5,N.G4, N.B4,N.D5,N.B4,N.F4, N.A4,N.C5,N.E5,N.A5],
    bass:[N.D3,N.A2,N.D3,N.A2, N.C3,N.G2,N.C3,N.G2, N.B2,N.F2,N.B2,N.F2, N.A2,N.E2,N.A2,N.E2] },
  boss2: { bpm:118, lt:'square',   bt:'sawtooth', lv:0.04,  bv:0.05,
    lead:[N.E5,_,N.D5,N.C5, _,N.B4,_,N.C5, N.A4,_,N.G4,_, N.A4,_,_,_],
    bass:[N.A2,_,N.A2,_, N.A2,_,N.G2,_, N.F2,_,N.F2,_, N.E2,_,N.E2,_] }
};
let musicTimer=null, musicTrack=null, musicStep=0;
function mNote(freq,dur,type,vol){
  if(!AC||!freq) return;
  try{
    const o=AC.createOscillator(), g=AC.createGain(), t=AC.currentTime;
    o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t+dur+0.03);
  }catch(e){}
}
function playMusic(name){
  if(musicTrack===name) return;
  stopMusic();
  const tr=TRACKS[name]; if(!AC||!tr) return;
  musicTrack=name; musicStep=0;
  const stepMs=60000/tr.bpm/2, sl=stepMs/1000;   // 8th-note steps
  musicTimer=setInterval(()=>{
    mNote(tr.lead[musicStep%tr.lead.length], sl*0.9,  tr.lt, tr.lv);
    mNote(tr.bass[musicStep%tr.bass.length], sl*0.95, tr.bt, tr.bv);
    musicStep++;
  }, stepMs);
}
function stopMusic(){ if(musicTimer){ clearInterval(musicTimer); musicTimer=null; } musicTrack=null; }
