// In-flight heads-up display (DOM overlay, sized for iPad landscape).
const NAMES = { yusuf: 'Yusuf', musa: 'Musa' };

export class Hud {
  constructor(root, app) {
    this.app = app;
    const el = document.createElement('div');
    el.id = 'hud';
    el.innerHTML = `
      <div class="hud-top-left">
        <div class="pill objective"><span class="obj-icon">⭕</span><span class="obj-text">Rings 0/8</span></div>
        <div class="pill-row"><div class="pill score">🏆 <span class="sc">0</span></div><div class="pill candy">🍬 <span class="cn">0/0</span></div></div>
      </div>
      <div class="bubble hidden"><img class="face" alt=""><div><div class="who"></div><div class="said"></div></div></div>
      <div class="hud-top-right">
        <button class="round recenter" title="Recenter tilt">🎯</button>
        <button class="round pause" title="Pause">⏸️</button>
      </div>
      <div class="hud-bottom-left">
        <div class="meter tape"><span class="lbl">Duct tape</span><div class="rolls"></div></div>
        <div class="meter juice"><span class="lbl">🧃 Boost</span><div class="bar"><div class="fill"></div></div></div>
      </div>
      <div class="joystick hidden"><div class="knob"></div></div>
      <button class="boost">BOOST</button>
      <button class="trick">🌀<span>TRICK</span></button>
      <div class="pops"></div>
      <div class="combo hidden"></div>
      <div class="landmeter hidden"><div class="lm-title">Landing</div><div class="lm-bar"><div class="lm-dot"></div></div><div class="lm-text">Gentle!</div></div>
      <div class="banner hidden"></div>
      <div class="damage"></div>
      <div class="speedlines"></div>
      <div class="flash"></div>
      <div class="comic hidden"></div>`;
    root.appendChild(el);
    this.el = el;
    this.q = (s) => el.querySelector(s);
    this.objIcon = this.q('.obj-icon'); this.objText = this.q('.obj-text');
    this.scEl = this.q('.sc'); this.cnEl = this.q('.cn'); this.pops = this.q('.pops'); this.comboEl = this.q('.combo');
    this.rolls = this.q('.rolls'); this.fill = this.q('.juice .fill');
    this.bubble = this.q('.bubble'); this.face = this.q('.bubble .face'); this.who = this.q('.bubble .who'); this.said = this.q('.bubble .said');
    this.bannerEl = this.q('.banner');
    this.land = this.q('.landmeter'); this.lmDot = this.q('.lm-dot'); this.lmText = this.q('.lm-text');
    this.joy = this.q('.joystick'); this.knob = this.q('.knob'); this.boostBtn = this.q('.boost');
    this.q('.pause').addEventListener('click', () => app.pause());
    this.q('.recenter').addEventListener('click', () => { app.input.recenter(); this.banner('Tilt recentered', 'ok', 900); });
    app.input.bindTouch(this.joy, this.knob, this.boostBtn);
    app.input.bindTrick(this.q('.trick'));
    this.cache = {};
    this.hide();
  }
  set(key, val, fn) { if (this.cache[key] !== val) { this.cache[key] = val; fn(val); } }
  show() { this.el.classList.remove('hidden'); this.setControls(this.app.settings.controls); }
  hide() { this.el.classList.add('hidden'); this.bubble.classList.add('hidden'); this.bannerEl.classList.add('hidden'); }
  setControls(mode) {
    this.joy.classList.toggle('hidden', mode !== 'touch');
    this.q('.recenter').classList.toggle('hidden', mode !== 'tilt');
    this.el.classList.toggle('touch-mode', mode === 'touch');
  }
  setObjective(icon, text) { this.set('oi', icon, v => (this.objIcon.textContent = v)); this.set('ot', text, v => (this.objText.textContent = v)); }
  setScore(n) { this.set('sc', n, v => { this.scEl.textContent = v.toLocaleString(); this.bump(this.scEl.parentElement); }); }
  setCandy(n, need) { this.set('cn', `${n}/${need}`, v => { this.cnEl.textContent = v; this.cnEl.parentElement.classList.toggle('done', n >= need); if (n) this.bump(this.cnEl.parentElement); }); }
  bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  popScore(text) {
    const d = document.createElement('div');
    d.className = 'scorepop';
    d.textContent = text;
    d.style.left = `${46 + Math.random() * 8}%`;
    this.pops.appendChild(d);
    setTimeout(() => d.remove(), 1100);
  }
  combo(n) {
    const c = this.comboEl;
    c.textContent = `COMBO x${n}!`;
    c.classList.remove('hidden', 'go'); void c.offsetWidth; c.classList.add('go');
    clearTimeout(this.comboT);
    this.comboT = setTimeout(() => c.classList.add('hidden'), 1300);
  }
  setTime(t, target) {
    const f = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    this.set('t', Math.floor(t), () => (this.timeEl.textContent = f(t)));
    this.set('tt', target, () => (this.targetEl.textContent = ` / ⭐ ${f(target)}`));
    this.set('late', t > target, v => this.timeEl.classList.toggle('late', v));
  }
  setTape(n, max, infinite) {
    this.set('tape', infinite ? 'inf' : `${n}/${max}`, () => {
      this.rolls.innerHTML = infinite ? '<span class="inf">∞ No damage on this trip!</span>' : Array.from({ length: max }, (_, i) => `<span class="roll ${i < n ? '' : 'gone'}"></span>`).join('');
    });
  }
  setJuice(f) { this.set('j', Math.round(f * 50), () => { this.fill.style.width = `${Math.round(f * 100)}%`; this.fill.classList.toggle('low', f < 0.2); }); }
  setLandMeter(vy) {
    this.set('lmv', vy === null, v => this.land.classList.toggle('hidden', v));
    if (vy === null) return;
    const k = Math.max(0, Math.min(1, -vy / 5));
    this.lmDot.style.top = `${k * 100}%`;
    const label = vy > -1.5 ? 'Butter!' : vy > -2.6 ? 'OK' : vy > -3.6 ? 'Too fast' : 'Pull up!';
    this.set('lmt', label, v => { this.lmText.textContent = v; this.lmText.className = 'lm-text ' + (vy > -1.5 ? 'g' : vy > -2.6 ? 'y' : 'r'); });
  }
  say(who, text, ms = 3600) {
    this.face.src = this.app.portraits[who] || '';
    this.who.textContent = NAMES[who] + (this.app.mission && this.app.mission.def.chapter === 1 && who === 'musa' ? ' · Mission Control' : '');
    this.said.textContent = text;
    this.bubble.classList.remove('hidden');
    this.bubble.classList.remove('pop'); void this.bubble.offsetWidth; this.bubble.classList.add('pop');
    clearTimeout(this.sayT);
    this.sayT = setTimeout(() => this.bubble.classList.add('hidden'), ms);
  }
  banner(text, cls = 'ok', ms = 1500) {
    const b = this.bannerEl;
    b.textContent = text;
    b.className = 'banner ' + cls;
    void b.offsetWidth;
    b.classList.add('show');
    clearTimeout(this.banT);
    this.banT = setTimeout(() => b.classList.add('hidden'), ms);
  }
  speedLines(on) { this.set('sl', on, v => this.q('.speedlines').classList.toggle('on', v)); }
  flash() { const f = this.q('.flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
  comic(text) {
    const c = this.q('.comic');
    c.textContent = text;
    c.style.left = `${38 + Math.random() * 24}%`;
    c.style.setProperty('--rot', `${(Math.random() - 0.5) * 30}deg`);
    c.classList.remove('hidden', 'go'); void c.offsetWidth; c.classList.add('go'); // fades itself out
  }
  damage() { const d = this.q('.damage'); d.classList.remove('hit'); void d.offsetWidth; d.classList.add('hit'); }
}
