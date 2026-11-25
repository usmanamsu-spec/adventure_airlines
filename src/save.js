// Progress is stored on the device only (localStorage). No accounts, no network.
import { MISSIONS } from './levels.js';
import { UPGRADES, PAINTS } from './plane.js';

const KEY = 'backyard-squadron-v1';

const newProfile = () => ({ missions: {}, upgrades: { wings: false, blower: false, floats: false }, paint: 'cardboard', paints: ['cardboard'], spent: 0, seenEnding: false });
const defaults = () => ({
  profiles: { yusuf: newProfile(), musa: newProfile() },
  settings: { controls: null, sensitivity: 1, invert: false, assist: true, easy: true, graphics: 'fancy', sound: true, music: true },
  last: null,
});

export const store = {
  data: defaults(),
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const base = defaults();
        this.data = { ...base, ...d, settings: { ...base.settings, ...d.settings }, profiles: { yusuf: { ...newProfile(), ...d.profiles?.yusuf }, musa: { ...newProfile(), ...d.profiles?.musa } } };
      }
    } catch { this.data = defaults(); }
    return this.data;
  },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* private mode */ } },
  reset() { this.data = defaults(); this.save(); },
  get settings() { return this.data.settings; },
  profile(who) { return this.data.profiles[who]; },
};

export function totalStars(p) {
  let n = 0;
  for (const id in p.missions) n += (p.missions[id].stars || []).filter(Boolean).length;
  return n;
}
export const availableStars = (p) => totalStars(p) - p.spent;
export const socksFound = (p) => Object.values(p.missions).filter(m => m.sock).length;
export function isUnlocked(p, i) {
  if (i === 0) return true;
  const prev = p.missions[MISSIONS[i - 1].id];
  return !!(prev && prev.done);
}
export function recordResult(p, id, { stars, sock, time, score }) {
  const m = p.missions[id] || { stars: [false, false, false], sock: false, done: false, best: null };
  m.stars = m.stars.map((s, i) => s || !!stars[i]);
  m.sock = m.sock || sock;
  m.done = true;
  m.best = m.best == null ? time : Math.min(m.best, time);
  m.bestScore = Math.max(m.bestScore || 0, score || 0);
  p.missions[id] = m;
}
export function buyUpgrade(p, key) {
  const u = UPGRADES[key];
  if (!u || p.upgrades[key] || availableStars(p) < u.cost) return false;
  p.upgrades[key] = true;
  p.spent += u.cost;
  return true;
}
export function buyPaint(p, key) {
  const c = PAINTS[key];
  if (!c) return false;
  if (!p.paints.includes(key)) {
    if (availableStars(p) < c.cost) return false;
    p.paints.push(key);
    p.spent += c.cost;
  }
  p.paint = key;
  return true;
}
