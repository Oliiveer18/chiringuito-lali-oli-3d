/* =========================================================
   audio.js
   Sonidos sintetizados con WebAudio; en coop el anfitrión reenvía los del invitado.
   ========================================================= */
import { Game, Net, hostLive } from './state.js?v=28.17.1-online-web';

// ---------- Audio ----------
export const Audio = {
  ctx:null, master:null, sfxGain:null, musicGain:null, waveGain:null, on:true, nextNote:0, step:0,
  init(){
    if(this.ctx) { this.ctx.resume(); return; }
    try{
      const C = window.AudioContext || window.webkitAudioContext; if(!C) return;
      this.ctx = new C();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.55; this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.16; this.musicGain.connect(this.master);
      // olas: ruido filtrado con LFO
      const len = this.ctx.sampleRate*3, buf = this.ctx.createBuffer(1,len,this.ctx.sampleRate), d = buf.getChannelData(0);
      let last=0; for(let i=0;i<len;i++){ const w=Math.random()*2-1; last=(last+0.02*w)/1.02; d[i]=last*3.5; }
      const src = this.ctx.createBufferSource(); src.buffer=buf; src.loop=true;
      const lp = this.ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=700;
      this.waveGain = this.ctx.createGain(); this.waveGain.gain.value = 0.25;
      const lfo = this.ctx.createOscillator(); lfo.frequency.value=0.11; const lg=this.ctx.createGain(); lg.gain.value=0.18;
      lfo.connect(lg).connect(this.waveGain.gain); lfo.start();
      src.connect(lp).connect(this.waveGain).connect(this.master); src.start();
      this.nextNote = this.ctx.currentTime + 0.2;
      setInterval(()=>this.schedule(), 100);
    }catch(e){ this.ctx=null; }
  },
  toggle(){ this.on=!this.on; if(this.master) this.master.gain.value = this.on?0.8:0; return this.on; },
  tone(freq,dur,type='sine',vol=0.3,when=0,slide=0,dest){
    if(!this.ctx) return; const t=this.ctx.currentTime+when;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(freq,t); if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),t+dur);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g).connect(dest||this.sfxGain); o.start(t); o.stop(t+dur+0.05);
  },
  noise(dur,freq=2000,vol=0.2,q=1){
    if(!this.ctx) return; const t=this.ctx.currentTime;
    const len=Math.floor(this.ctx.sampleRate*dur), b=this.ctx.createBuffer(1,len,this.ctx.sampleRate), d=b.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
    const s=this.ctx.createBufferSource(); s.buffer=b; const f=this.ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=freq; f.Q.value=q;
    const g=this.ctx.createGain(); g.gain.value=vol; s.connect(f).connect(g).connect(this.sfxGain); s.start(t);
  },
  coin(){ this.tone(1320,0.08,'square',0.12); this.tone(1760,0.18,'square',0.12,0.07); },
  click(){ this.tone(660,0.05,'triangle',0.15); },
  start(){ this.tone(520,0.07,'triangle',0.18); this.noise(0.25,3000,0.08,2); },
  sizzle(){ this.noise(0.5,5000,0.06,0.7); },
  angry(){ this.tone(220,0.35,'sawtooth',0.12,0,0.5); },
  protest(){ this.tone(880,0.09,'square',0.07); this.tone(660,0.12,'square',0.07,0.1); },
  clean(){ this.noise(0.18,1800,0.18,1.5); this.tone(990,0.08,'sine',0.1,0.12); },
  bad(){ this.tone(330,0.18,'square',0.1); this.tone(247,0.3,'square',0.1,0.15); },
  good(){ [523,659,784,1047].forEach((f,i)=>this.tone(f,0.2,'triangle',0.15,i*0.08)); },
  // Espacialización Stereo Panner (Fase AAA)
  getPanner(pan = 0){
    if(!this.ctx) return null;
    try{
      if(this.ctx.createStereoPanner){
        const p = this.ctx.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, pan));
        p.connect(this.sfxGain);
        return p;
      }
    }catch(e){}
    return this.sfxGain;
  },
  // Expresiones vocales sintéticas estilo Animal Crossing
  voiceGreet(pan = 0){
    if(!this.ctx || !this.on) return;
    const dest = this.getPanner(pan);
    const pitches = [560 + Math.random()*40, 740 + Math.random()*50];
    pitches.forEach((f, i) => this.tone(f, 0.055, 'triangle', 0.16, i * 0.05, 1.12, dest));
  },
  voiceThanks(pan = 0){
    if(!this.ctx || !this.on) return;
    const dest = this.getPanner(pan);
    const pitches = [620, 800, 1040, 1280];
    pitches.forEach((f, i) => this.tone(f, 0.065, 'triangle', 0.15, i * 0.05, 1.05, dest));
  },
  voiceGrumble(pan = 0){
    if(!this.ctx || !this.on) return;
    const dest = this.getPanner(pan);
    const pitches = [310, 260, 200];
    pitches.forEach((f, i) => this.tone(f, 0.08, 'sawtooth', 0.12, i * 0.065, 0.75, dest));
  },
  voiceChirp(type = 'greet', pan = 0){
    if(type === 'thanks') this.voiceThanks(pan);
    else if(type === 'grumble') this.voiceGrumble(pan);
    else this.voiceGreet(pan);
  },
  // Chime celestial de estrellas de fin de jornada
  starChime(i = 0){
    if(!this.ctx || !this.on) return;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    const freq = notes[Math.min(i, notes.length - 1)];
    this.tone(freq, 0.35, 'sine', 0.18, 0, 0);
    this.tone(freq * 2, 0.22, 'sine', 0.06, 0.02, 0);
  },
  // Fanfarria triunfal por nuevo récord de la temporada
  fanfare(){
    if(!this.ctx || !this.on) return;
    const fan = [
      {f: 523.25, d: 0.12, t: 0},
      {f: 659.25, d: 0.12, t: 0.10},
      {f: 783.99, d: 0.12, t: 0.20},
      {f: 1046.50, d: 0.40, t: 0.32},
      {f: 1318.51, d: 0.55, t: 0.50}
    ];
    fan.forEach(n => {
      this.tone(n.f, n.d, 'triangle', 0.22, n.t, 1.02);
      this.tone(n.f * 1.5, n.d * 0.8, 'sine', 0.08, n.t + 0.01, 1.0);
    });
  },
  // Sonido costero de gaviota procedural con paneo espacial
  seagullCall(pan = 0){
    if(!this.ctx || !this.on) return;
    const dest = this.getPanner(pan);
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(820, t);
    o.frequency.exponentialRampToValueAtTime(1420, t + 0.14);
    o.frequency.exponentialRampToValueAtTime(960, t + 0.38);
    o.frequency.exponentialRampToValueAtTime(740, t + 0.55);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.065, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.055, t + 0.28);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

    o.connect(g).connect(dest || this.sfxGain);
    o.start(t);
    o.stop(t + 0.58);
  },
  // música: punteo tipo timple en 3/4, sol mayor
  schedule(){
    if(!this.ctx || !this.on || Game.mode!=='service' || Game.speed===0){ if(this.ctx) this.nextNote=this.ctx.currentTime+0.1; return; }
    const beat = 60/112/2; // corcheas
    const prog=[[67,71,74],[72,76,79],[74,78,81],[67,71,74],[72,76,79],[67,71,74],[74,78,81],[67,71,74]];
    while(this.nextNote < this.ctx.currentTime + 0.3){
      const bar = Math.floor(this.step/6)%prog.length, s=this.step%6, ch=prog[bar];
      const midi = n=> 440*Math.pow(2,(n-69)/12);
      const when = this.nextNote - this.ctx.currentTime;
      if(s===0) this.tone(midi(ch[0]-24),0.5,'triangle',0.35,when,0,this.musicGain);
      const pat=[ch[2],ch[1],ch[0]+12,ch[1],ch[2],ch[1]];
      if(!(s===3 && bar%2)) this.tone(midi(pat[s]),0.28,'triangle',s===0?0.32:0.2,when,0,this.musicGain);
      if(s===2||s===5) this.tone(midi(ch[0]+12),0.12,'square',0.05,when,0,this.musicGain);
      this.nextNote += beat; this.step++;
    }
  }
};

// Sonidos compartidos: el anfitrión los reenvía al otro móvil
Audio._raw = {};
['coin','start','sizzle','angry','clean','bad','good','protest','voiceGreet','voiceThanks','voiceGrumble','voiceChirp','starChime','fanfare','seagullCall'].forEach(n=>{
  const f = Audio[n].bind(Audio); Audio._raw[n]=f;
  Audio[n] = (...a)=>{ f(...a); if(hostLive()) Net.events.push({e:'sfx',n}); };
});
