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
  die:   ()=>beep(330,0.5,'sawtooth',0.09,-260)
};
