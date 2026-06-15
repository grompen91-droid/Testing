'use strict';
// ============ AUDIO (tiny synth, no assets) ============
let AC = null;
let muted = localStorage.getItem('br_muted')==='1';        // music mute
let sfxMuted = localStorage.getItem('br_sfxmuted')==='1';  // sound-effects mute (independent of music)
function initAudio(){ if(!AC){ try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(AC && AC.state==='suspended') AC.resume(); }
function beep(freq, dur, type='square', vol=0.05, slide=0){
  if(!AC || sfxMuted) return;
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

// ============ MUSIC (procedural: drums + bass over a long chord bed, melody generated live) ============
function mtof(m){ return 440*Math.pow(2,(m-69)/12); }
function mNote(m, dur, type, vol){           // m = MIDI note number
  if(!AC || muted || m==null) return;
  try{
    const o=AC.createOscillator(), g=AC.createGain(), t=AC.currentTime;
    o.type=type; o.frequency.value=mtof(m);
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t+dur+0.03);
  }catch(e){}
}
function mKick(){ if(!AC||muted) return; try{ const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime;
  o.type='sine'; o.frequency.setValueAtTime(135,t); o.frequency.exponentialRampToValueAtTime(45,t+0.12);
  g.gain.setValueAtTime(0.13,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.16); o.connect(g);g.connect(AC.destination); o.start(t);o.stop(t+0.18);}catch(e){} }
function mNoise(dur,vol,hp){ if(!AC||muted) return; try{ const n=Math.max(1,Math.floor(AC.sampleRate*dur)), b=AC.createBuffer(1,n,AC.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=Math.random()*2-1; const s=AC.createBufferSource(); s.buffer=b;
  const f=AC.createBiquadFilter(); f.type=hp?'highpass':'bandpass'; f.frequency.value=hp?7000:1800;
  const g=AC.createGain(),t=AC.currentTime; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  s.connect(f);f.connect(g);g.connect(AC.destination); s.start(t);s.stop(t+dur+0.02);}catch(e){} }

// prog = chord roots in MIDI, one per bar; scale = melody note offsets from the root
const TRACKS = {
  menu:  { bpm:96,  density:0.26, drums:false, lt:'triangle', bt:'sine',     lv:0.05,  bv:0.055, scale:[0,2,4,7,9],
           prog:[57,57,62,62, 60,60,55,55, 53,53,57,57, 55,55,52,52] },
  game:  { bpm:128, density:0.36, drums:true,  lt:'square',   bt:'triangle', lv:0.042, bv:0.05,  scale:[0,3,5,7,10],
           prog:[57,57,53,53, 55,55,52,52, 57,57,60,60, 55,55,52,52,   50,50,53,53, 55,55,57,57, 53,53,52,52, 55,55,55,55] },
  // DIRT DEPTHS: slow + heavy underground march, dark minor scale, gritty bass-forward low end
  dirt:  { bpm:112, density:0.30, drums:true,  lt:'triangle', bt:'sawtooth', lv:0.044, bv:0.062, scale:[0,3,5,7,8,10],
           prog:[45,45,45,45, 43,43,41,41, 40,40,40,40, 41,41,43,43,   45,45,48,48, 41,41,43,43, 45,45,43,43, 41,40,40,40] },
  boss0: { bpm:144, density:0.50, drums:true,  lt:'square',   bt:'sawtooth', lv:0.04,  bv:0.05,  scale:[0,1,3,5,7,8,10],
           prog:[45,45,41,41, 43,43,40,40, 45,45,48,48, 43,41,40,40] },
  boss1: { bpm:154, density:0.55, drums:true,  lt:'sawtooth', bt:'square',   lv:0.036, bv:0.05,  scale:[0,2,3,5,7,8,10],
           prog:[50,50,48,48, 46,46,45,45, 50,53,48,46, 45,43,45,45] },
  boss2: { bpm:120, density:0.42, drums:true,  lt:'square',   bt:'sawtooth', lv:0.044, bv:0.055, scale:[0,3,5,6,7,10],
           prog:[45,45,45,45, 41,41,43,43, 44,44,40,40, 45,43,41,40] }
};
let musicTimer=null, musicName=null, musicStep=0;
function playMusic(name){
  if(musicName===name) return;
  stopMusic();
  const t=TRACKS[name]; if(!AC||!t) return;
  musicName=name; musicStep=0;
  const stepMs=60000/t.bpm/4, sd=stepMs/1000;   // 16th-note steps, 16 per bar
  musicTimer=setInterval(()=>{
    const sib=musicStep%16, bar=Math.floor(musicStep/16), root=t.prog[bar%t.prog.length];
    if(t.drums){
      if(sib%8===0) mKick();
      if(sib===4||sib===12) mNoise(0.14,0.05,false);   // snare
      if(sib%2===0) mNoise(0.025,0.017,true);          // hat
    }
    if(sib%4===0) mNote(root-12, sd*3.4, t.bt, t.bv);                              // bass root
    else if(sib%4===2 && Math.random()<0.5) mNote(root-5, sd*1.4, t.bt, t.bv*0.8);// passing 5th
    if(Math.random()<t.density){                                                  // live-generated melody
      const deg=t.scale[Math.floor(Math.random()*t.scale.length)];
      const oct=12*(Math.random()<0.55?1:2);
      mNote(root+deg+oct, sd*(Math.random()<0.28?2:1)*0.9, t.lt, t.lv*(0.8+Math.random()*0.4));
    }
    musicStep++;
  }, stepMs);
}
function stopMusic(){ if(musicTimer){ clearInterval(musicTimer); musicTimer=null; } musicName=null; }
