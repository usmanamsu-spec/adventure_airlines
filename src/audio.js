// Tiny synthesized sound kit (no audio files needed).

// 0.1 s of silence as a WAV data URI (used to unlock iOS audio)
const SILENT_WAV = (() => {
  const n = 2205, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 22050, true); v.setUint32(28, 44100, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  let bin = ''; const u8 = new Uint8Array(buf);
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
})();
export class Sound {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.musicTimer = null;
  }
  /**
   * Must run inside a tap/click/keypress. Creates and resumes the AudioContext, and on iPhone/iPad
   * switches the audio session to "playback" so sound plays even when the silent switch is on.
   */
  unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* older iOS */ }
    if (!this.ctx) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain(); this.musicBus.connect(this.master);
      this.applySettings();
      // a silent looping <audio> element also moves older iOS into the playback session
      this.keepAlive = new Audio(SILENT_WAV);
      this.keepAlive.loop = true;
      this.keepAlive.setAttribute('playsinline', '');
      this.ctx.onstatechange = () => { if (this.ok && this.pendingMusic) this.startMusic(this.pendingMusic); };
    }
    if (this.keepAlive && this.keepAlive.paused) this.keepAlive.play().catch(() => {});
    if (this.ctx.state !== 'running') {
      this.ctx.resume().catch(() => {});
      // play a 1-sample buffer: the classic iOS unlock
      const b = this.ctx.createBuffer(1, 1, 22050), src = this.ctx.createBufferSource();
      src.buffer = b; src.connect(this.ctx.destination); src.start(0);
    }
  }
  applySettings() {
    if (!this.ctx) return;
    this.sfxBus.gain.value = this.settings.sound ? 1 : 0;
    this.musicBus.gain.value = this.settings.music ? 0.3 : 0;
  }
  get ok() { return this.ctx && this.ctx.state === 'running'; }

  tone(freq, dur, { type = 'sine', vol = 0.3, at = 0, slide = 0, bus = null } = {}) {
    if (!this.ok) return;
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || this.sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur, { vol = 0.3, freq = 800, q = 1, at = 0 } = {}) {
    if (!this.ok) return;
    const t = this.ctx.currentTime + at;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxBus);
    src.start(t);
  }

  ring() { [784, 988, 1175].forEach((f, i) => this.tone(f, 0.25, { at: i * 0.07, vol: 0.22, type: 'triangle' })); }
  pickup() { this.tone(660, 0.12, { vol: 0.2, type: 'square', slide: 2 }); }
  sockFound() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, { at: i * 0.08, vol: 0.2, type: 'triangle' })); }
  bump() { this.tone(120, 0.25, { vol: 0.5, type: 'sine', slide: 0.4 }); this.noise(0.2, { vol: 0.25, freq: 300 }); }
  crash() { this.noise(0.9, { vol: 0.5, freq: 400, q: 0.5 }); this.tone(200, 0.8, { vol: 0.3, type: 'sawtooth', slide: 0.2 }); }
  splash() { this.noise(0.8, { vol: 0.4, freq: 1200, q: 0.6 }); }
  click() { this.tone(900, 0.05, { vol: 0.15, type: 'square' }); }
  countdown(go) { this.tone(go ? 1047 : 523, go ? 0.4 : 0.15, { vol: 0.25, type: 'square' }); }
  fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.35, { at: i * 0.13, vol: 0.22, type: 'triangle' })); }
  sad() { [392, 349, 330, 262].forEach((f, i) => this.tone(f, 0.3, { at: i * 0.15, vol: 0.2, type: 'triangle' })); }

  startEngine() {
    if (!this.ctx || this.engine) return;
    const c = this.ctx;
    const o1 = c.createOscillator(), o2 = c.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'square';
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    const g = c.createGain(); g.gain.value = 0.0001;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfxBus);
    // wind
    const n = c.sampleRate * 2, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const ws = c.createBufferSource(); ws.buffer = buf; ws.loop = true;
    const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 600; wf.Q.value = 0.4;
    const wg = c.createGain(); wg.gain.value = 0.0001;
    ws.connect(wf); wf.connect(wg); wg.connect(this.sfxBus);
    o1.start(); o2.start(); ws.start();
    this.engine = { o1, o2, f, g, ws, wg };
  }
  setEngine(speed, boosting) {
    if (!this.engine) return;
    const t = this.ctx.currentTime;
    const e = this.engine;
    const base = 60 + speed * 3.2 + (boosting ? 40 : 0);
    e.o1.frequency.setTargetAtTime(base, t, 0.1);
    e.o2.frequency.setTargetAtTime(base * 1.5, t, 0.1);
    e.f.frequency.setTargetAtTime(400 + speed * 25 + (boosting ? 500 : 0), t, 0.1);
    e.g.gain.setTargetAtTime(0.06 + (boosting ? 0.04 : 0), t, 0.1);
    e.wg.gain.setTargetAtTime(0.02 + speed * 0.0025, t, 0.2);
  }
  stopEngine() {
    if (!this.engine) return;
    const e = this.engine;
    try { e.o1.stop(); e.o2.stop(); e.ws.stop(); } catch { /* already stopped */ }
    this.engine = null;
  }

  /** cheerful looping chiptune */
  startMusic(mood = 'day') {
    this.stopMusic();
    this.pendingMusic = mood;
    if (!this.ctx) return; // starts on the first tap
    const scale = mood === 'night' ? [220, 247, 262, 330, 392, 440, 523] : [262, 294, 330, 392, 440, 523, 587];
    const pattern = mood === 'night' ? [0, 2, 4, 2, 5, 4, 2, 1] : [0, 2, 4, 5, 4, 2, 4, 6, 5, 4, 2, 0, 1, 2, 4, 2];
    const bass = [0, 0, 3, 4];
    let i = 0;
    const beat = mood === 'night' ? 0.32 : 0.2;
    this.musicTimer = setInterval(() => {
      if (!this.ok) return;
      const n = pattern[i % pattern.length];
      this.tone(scale[n] * 2, beat * 0.9, { vol: 0.25, type: 'triangle', bus: this.musicBus });
      if (i % 4 === 0) this.tone(scale[bass[(i / 4) % bass.length]] / 2, beat * 3.5, { vol: 0.35, type: 'sine', bus: this.musicBus });
      i++;
    }, beat * 1000);
  }
  stopMusic() { if (this.musicTimer) clearInterval(this.musicTimer); this.musicTimer = null; this.pendingMusic = null; }
}
