// Arcade flight model: forgiving, kid-friendly, no stalls or loops.
import * as THREE from 'three';
import { clamp, damp, DEG } from './util.js';

export const BASE_SPEED = 18;
export const BOOST_SPEED = 29;
export const LANDING_SPEED = 12;

export class Flight {
  constructor() {
    this.pos = new THREE.Vector3();
    this.h = 0;      // heading (rad), forward = (sin h, 0, cos h)
    this.p = 0;      // pitch (rad), nose up positive
    this.r = 0;      // roll (rad), right wing down positive
    this.speed = BASE_SPEED;
    this.vy = 0;
    this.juice = 1;
    this.boosting = false;
  }
  reset(pos, h) {
    this.pos.copy(pos); this.h = h; this.p = 0; this.r = 0; this.speed = BASE_SPEED; this.vy = 0; this.boosting = false;
  }
  forward(out = new THREE.Vector3()) {
    const cp = Math.cos(this.p);
    return out.set(Math.sin(this.h) * cp, Math.sin(this.p), Math.cos(this.h) * cp);
  }
  /**
   * input: { roll, pitch, boost } in [-1,1]
   * opt: { turn, maxRoll, tank, slow (landing approach), assist, holdAlt }
   */
  step(dt, input, opt) {
    const maxRoll = opt.maxRoll ?? 50 * DEG;
    // roll toward the stick, auto-level when released
    const targetRoll = input.roll * maxRoll;
    this.r = damp(this.r, targetRoll, 4.5, dt);
    // pitch: rate control that eases back to level
    const maxPitch = 38 * DEG;
    if (Math.abs(input.pitch) > 0.05) this.p += input.pitch * 55 * DEG * dt;
    else this.p = damp(this.p, 0, 1.3, dt);
    if (opt.assist) this.p = damp(this.p, opt.assist.pitch, 3, dt);
    this.p = clamp(this.p, -maxPitch, maxPitch);
    // coordinated turn: bank to turn
    const turn = opt.turn ?? 1.15;
    this.h -= turn * Math.sin(this.r) * dt;
    // speed
    const wantBoost = ((input.boost && this.juice > 0.02) || opt.free) && !opt.slow;
    this.boosting = wantBoost;
    if (wantBoost && !opt.free) this.juice = Math.max(0, this.juice - dt * (opt.tank ? 0.14 : 0.22));
    else this.juice = Math.min(1, this.juice + dt * 0.02);
    let target = wantBoost ? BOOST_SPEED : BASE_SPEED;
    if (opt.slow) target = LANDING_SPEED;
    target -= Math.sin(this.p) * 6; // climbing slows, diving speeds up
    this.speed = damp(this.speed, target, 1.4, dt);
    const f = this.forward();
    this.pos.addScaledVector(f, this.speed * dt);
    this.vy = f.y * this.speed;
  }
}

// ---------------------------------------------------------------- input
export class Input {
  constructor(settings) {
    this.settings = settings;
    this.roll = 0; this.pitch = 0; this.boost = false; this.trick = false; this.touchTrick = false;
    this.keys = new Set();
    this.joy = { x: 0, y: 0, active: false };
    this.touchBoost = false;
    this.tilt = { roll: 0, pitch: 0, ok: false };
    this.neutral = { roll: 0, pitch: 0.6 };
    this.lastTiltT = 0;
    window.addEventListener('keydown', (e) => { this.keys.add(e.code); if (e.code === 'Space') e.preventDefault(); });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    this._onOrient = (e) => this.onOrient(e);
  }

  get hasMotionAPI() { return typeof window.DeviceOrientationEvent !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0); }

  /** must be called from a user gesture on iOS */
  async requestMotion() {
    if (!this.hasMotionAPI) return false;
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res !== 'granted') return false;
      }
      window.removeEventListener('deviceorientation', this._onOrient);
      window.addEventListener('deviceorientation', this._onOrient);
      return true;
    } catch { return false; }
  }

  onOrient(e) {
    if (e.beta == null || e.gamma == null) return;
    const b = e.beta * DEG, g = e.gamma * DEG;
    // gravity in device coordinates
    const gx = Math.cos(b) * Math.sin(g), gy = -Math.sin(b), gz = -Math.cos(b) * Math.cos(g);
    const ang = ((screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0) * DEG;
    // rotate into screen coordinates (x right, y up, z out of the screen)
    const sx = gx * Math.cos(ang) - gy * Math.sin(ang);
    const sy = gx * Math.sin(ang) + gy * Math.cos(ang);
    // steering-wheel roll and how far the screen is tipped back
    this.tilt.roll = Math.atan2(sx, Math.hypot(sy, gz));
    this.tilt.pitch = Math.atan2(-gz, -sy);
    if (!this.tilt.ok) { this.tilt.ok = true; this.recenter(); }
    this.lastTiltT = performance.now();
  }

  recenter() { this.neutral.roll = this.tilt.roll; this.neutral.pitch = this.tilt.pitch; }

  bindTouch(joyEl, knobEl, boostEl) {
    const rect = () => joyEl.getBoundingClientRect();
    let id = null;
    const move = (e) => {
      const r = rect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const R = r.width / 2;
      let x = (e.clientX - cx) / R, y = (e.clientY - cy) / R;
      const m = Math.hypot(x, y);
      if (m > 1) { x /= m; y /= m; }
      this.joy.x = x; this.joy.y = y;
      knobEl.style.transform = `translate(${x * R * 0.6}px, ${y * R * 0.6}px)`;
    };
    joyEl.addEventListener('pointerdown', (e) => { id = e.pointerId; try { joyEl.setPointerCapture(id); } catch { /* not capturable */ } this.joy.active = true; move(e); e.preventDefault(); });
    joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; this.joy.active = false; this.joy.x = this.joy.y = 0; knobEl.style.transform = ''; };
    joyEl.addEventListener('pointerup', end);
    joyEl.addEventListener('pointercancel', end);
    const bd = (e) => { this.touchBoost = true; boostEl.classList.add('on'); e.preventDefault(); };
    const bu = () => { this.touchBoost = false; boostEl.classList.remove('on'); };
    boostEl.addEventListener('pointerdown', bd);
    boostEl.addEventListener('pointerup', bu);
    boostEl.addEventListener('pointercancel', bu);
    boostEl.addEventListener('pointerleave', bu);
  }

  update(dt) {
    const S = this.settings;
    let roll = 0, pitch = 0, boost = this.touchBoost;
    const k = this.keys;
    if (k.has('ArrowLeft') || k.has('KeyA')) roll -= 1;
    if (k.has('ArrowRight') || k.has('KeyD')) roll += 1;
    if (k.has('ArrowUp') || k.has('KeyW')) pitch += 1;
    if (k.has('ArrowDown') || k.has('KeyS')) pitch -= 1;
    if (k.has('Space') || k.has('ShiftLeft')) boost = true;
    // gamepad
    let trick = this.touchTrick || k.has('KeyE') || k.has('KeyQ');
    this.touchTrick = false;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (Math.abs(ax) > 0.15) roll += ax;
      if (Math.abs(ay) > 0.15) pitch -= ay;
      if (gp.buttons[0]?.pressed || gp.buttons[7]?.pressed || gp.buttons[5]?.pressed) boost = true;
      if (gp.buttons[1]?.pressed || gp.buttons[2]?.pressed) trick = true;
    }
    const sens = S.sensitivity ?? 1;
    if (S.controls === 'touch' && this.joy.active) {
      roll += this.joy.x * 1.1;
      pitch += -this.joy.y;
    }
    if (S.controls === 'tilt' && this.tilt.ok) {
      const range = 18 * DEG / sens;
      let tr = (this.tilt.roll - this.neutral.roll) / range;
      let tp = -(this.tilt.pitch - this.neutral.pitch) / (range * 1.2);
      const dz = 0.08;
      tr = Math.abs(tr) < dz ? 0 : tr - Math.sign(tr) * dz;
      tp = Math.abs(tp) < dz ? 0 : tp - Math.sign(tp) * dz;
      roll += tr; pitch += tp;
    }
    if (S.invert) pitch = -pitch;
    this.roll = clamp(roll, -1, 1);
    this.pitch = clamp(pitch, -1, 1);
    this.boost = boost;
    this.trick = trick;
  }

  bindTrick(el) {
    el.addEventListener('pointerdown', (e) => { this.touchTrick = true; el.classList.add('on'); setTimeout(() => el.classList.remove('on'), 250); e.preventDefault(); });
  }
}
