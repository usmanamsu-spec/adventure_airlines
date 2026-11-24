// Menu screens (DOM overlays).
import { MISSIONS } from './levels.js';
import { PAINTS, UPGRADES } from './plane.js';
import { store, totalStars, availableStars, socksFound, isUnlocked, buyUpgrade, buyPaint } from './save.js';

const NAMES = { yusuf: 'Yusuf', musa: 'Musa' };
const HOME = { yusuf: 'Plano, TX', musa: 'Greensboro, NC' };
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export class UI {
  constructor(root, app) {
    this.app = app;
    this.root = root;
    this.el = document.createElement('div');
    this.el.id = 'ui';
    root.appendChild(this.el);
  }

  clear() { this.el.innerHTML = ''; this.el.className = ''; }
  click(fn) { return (e) => { this.app.sound.unlock(); this.app.sound.click(); fn(e); }; }
  bind(sel, fn) { this.el.querySelectorAll(sel).forEach(b => b.addEventListener('click', this.click(fn.bind(null, b)))); }

  // ------------------------------------------------------------ title
  title() {
    const P = this.app.portraits;
    this.clear();
    this.el.className = 'title';
    this.el.innerHTML = `
      <div class="logo"><div class="logo-top">BACKYARD</div><div class="logo-bottom">SQUADRON</div><div class="logo-sub">✈️ A cardboard flying adventure</div></div>
      <div class="who-q">Who's flying today?</div>
      <div class="pick">
        ${['yusuf', 'musa'].map(k => `
        <button class="pilot-card" data-who="${k}">
          <img src="${P[k]}" alt="${NAMES[k]}">
          <div class="pc-name">${NAMES[k]}</div>
          <div class="pc-home">${HOME[k]}</div>
          <div class="pc-stars">⭐ ${totalStars(store.profile(k))}</div>
        </button>`).join('')}
      </div>
      <button class="corner gear">⚙️</button>`;
    this.bind('.pilot-card', (b) => this.app.choosePilot(b.dataset.who));
    this.bind('.gear', () => this.settings(() => this.title()));
  }

  // ------------------------------------------------------------ mission map
  map() {
    const app = this.app, who = app.player, p = app.profile;
    this.clear();
    this.el.className = 'map';
    const card = (m, i) => {
      const rec = p.missions[m.id];
      const open = isUnlocked(p, i);
      const stars = rec ? rec.stars.map(s => (s ? '⭐' : '☆')).join('') : '☆☆☆';
      const needs = m.requires && !p.upgrades[m.requires];
      return `<button class="mcard ${open ? '' : 'locked'} ${rec?.done ? 'done' : ''}" data-i="${i}" ${open ? '' : 'disabled'}>
        <div class="mc-icon">${open ? m.icon : '🔒'}</div>
        <div class="mc-body"><div class="mc-title">${m.id === 'trip' ? '' : (i < 4 ? i + 1 : i) + '. '}${m.title}</div><div class="mc-place">${m.place}</div></div>
        <div class="mc-right"><div class="mc-stars">${stars}</div><div class="mc-sock">${rec?.sock ? '🧦' : ''}${needs && open ? '🦩?' : ''}</div></div>
      </button>`;
    };
    const ch1 = MISSIONS.map((m, i) => [m, i]).filter(([m]) => m.chapter === 1);
    const ch2 = MISSIONS.map((m, i) => [m, i]).filter(([m]) => m.chapter === 2);
    this.el.innerHTML = `
      <div class="topbar">
        <img class="tb-face" src="${app.portraits[who]}">
        <div class="tb-name">Captain ${NAMES[who]}</div>
        <div class="tb-stat">⭐ ${availableStars(p)} <small>to spend</small></div>
        <div class="tb-stat">🧦 ${socksFound(p)}/${MISSIONS.length}</div>
        <div class="tb-spacer"></div>
        <button class="btn garage">🔧 Garage</button>
        <button class="btn settings">⚙️</button>
        <button class="btn switch">👥 Switch pilot</button>
      </div>
      <div class="chapters">
        <div class="chapter"><div class="ch-title">Chapter 1 · <b>Plano, Texas</b></div><div class="ch-sub">${who === 'yusuf' ? 'Yusuf flies. Musa is Mission Control!' : 'Musa flies Yusuf\'s plane by remote control!'}</div>${ch1.map(([m, i]) => card(m, i)).join('')}</div>
        <div class="chapter"><div class="ch-title">Chapter 2 · <b>Greensboro, North Carolina</b></div><div class="ch-sub">${who === 'yusuf' ? 'Musa shows Yusuf his town!' : 'Captain Musa shows Yusuf his town!'}</div>${ch2.map(([m, i]) => card(m, i)).join('')}</div>
      </div>`;
    this.bind('.mcard', (b) => this.briefing(Number(b.dataset.i)));
    this.bind('.garage', () => this.garage());
    this.bind('.settings', () => this.settings(() => this.map()));
    this.bind('.switch', () => this.app.toTitle());
  }

  briefing(i) {
    const m = MISSIONS[i], p = this.app.profile;
    const rec = p.missions[m.id];
    const needs = m.requires && !p.upgrades[m.requires];
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `<div class="sheet brief">
      <div class="b-icon">${m.icon}</div>
      <div class="b-title">${m.title}</div>
      <div class="b-place">📍 ${m.place}</div>
      <div class="b-blurb">${m.blurb}</div>
      <div class="b-stars">⭐ Finish · ⭐ Beat the clock · ⭐ Butter landing ${rec?.best ? `<br><small>Best time ${fmt(rec.best)}</small>` : ''}</div>
      ${needs ? `<div class="b-need">You need <b>${UPGRADES[m.requires].name}</b> from the Garage for this one! 🦩</div>` : ''}
      <div class="b-buttons"><button class="btn back">Back</button>${needs ? '<button class="btn big go-garage">🔧 Garage</button>' : '<button class="btn big go">🚀 Start Engines!</button>'}</div>
    </div>`;
    this.el.appendChild(modal);
    modal.querySelector('.back').addEventListener('click', this.click(() => modal.remove()));
    modal.querySelector('.go')?.addEventListener('click', this.click(() => { modal.remove(); this.app.startMission(i); }));
    modal.querySelector('.go-garage')?.addEventListener('click', this.click(() => { modal.remove(); this.garage(); }));
  }

  // ------------------------------------------------------------ garage
  garage() {
    const app = this.app, p = app.profile;
    app.showGarage(true);
    this.clear();
    this.el.className = 'garage';
    const up = Object.entries(UPGRADES).map(([k, u]) => `
      <div class="gi ${p.upgrades[k] ? 'owned' : ''}">
        <div class="gi-name">${u.name}</div><div class="gi-desc">${u.desc}</div>
        ${p.upgrades[k] ? '<div class="gi-own">✅ Installed</div>' : `<button class="btn buy" data-k="${k}" ${availableStars(p) < u.cost ? 'disabled' : ''}>⭐ ${u.cost}</button>`}
      </div>`).join('');
    const paints = Object.entries(PAINTS).map(([k, c]) => {
      const owned = p.paints.includes(k);
      return `<button class="swatch ${p.paint === k ? 'sel' : ''}" data-k="${k}" style="--c:#${c.color.toString(16).padStart(6, '0')}" ${!owned && availableStars(p) < c.cost ? 'disabled' : ''}>
        <span class="sw"></span><span class="sw-name">${c.name}</span><span class="sw-cost">${owned ? (p.paint === k ? '✓' : '') : '⭐ ' + c.cost}</span></button>`;
    }).join('');
    this.el.innerHTML = `
      <div class="garage-panel">
        <div class="gp-head"><span>🔧 Garage</span><span class="gp-stars">⭐ ${availableStars(p)} to spend</span></div>
        <div class="gp-sub">Earn stars in missions, then upgrade your plane!</div>
        <div class="gp-section">Upgrades</div>${up}
        <div class="gp-section">Paint</div><div class="swatches">${paints}</div>
        <div class="gp-sub">${socksFound(p) >= MISSIONS.length ? '🧦 All lost socks found: GOLDEN SLIPPERS unlocked!' : `🧦 Find all ${MISSIONS.length} lost socks for golden slippers (${socksFound(p)}/${MISSIONS.length})`}</div>
        <button class="btn big done">Done</button>
      </div>`;
    this.bind('.buy', (b) => { if (buyUpgrade(p, b.dataset.k)) { store.save(); app.sound.fanfare(); app.refreshGaragePlane(); } this.garage(); });
    this.bind('.swatch', (b) => { if (buyPaint(p, b.dataset.k)) { store.save(); app.refreshGaragePlane(); } this.garage(); });
    this.bind('.done', () => { app.showGarage(false); this.map(); });
  }

  // ------------------------------------------------------------ settings
  settings(back) {
    const s = store.settings, app = this.app;
    const modal = document.createElement('div');
    modal.className = 'modal';
    const tiltOk = app.input.hasMotionAPI;
    modal.innerHTML = `<div class="sheet settings">
      <div class="s-title">⚙️ Settings</div>
      <div class="row"><span>Steering</span><div class="seg">
        ${tiltOk ? `<button data-c="tilt" class="${s.controls === 'tilt' ? 'on' : ''}">📱 Tilt</button>` : ''}
        <button data-c="touch" class="${s.controls === 'touch' ? 'on' : ''}">🕹️ Touch stick</button>
        ${!tiltOk ? `<button data-c="keys" class="${s.controls === 'keys' ? 'on' : ''}">⌨️ Keyboard</button>` : ''}
      </div></div>
      <div class="row"><span>Steering sensitivity</span><input type="range" class="sens" min="0.6" max="1.8" step="0.1" value="${s.sensitivity}"></div>
      <div class="row"><span>Flip up/down</span><button class="tog inv ${s.invert ? 'on' : ''}">${s.invert ? 'On' : 'Off'}</button></div>
      <div class="row"><span>Landing helper</span><button class="tog assist ${s.assist ? 'on' : ''}">${s.assist ? 'On' : 'Off'}</button></div>
      <div class="row"><span>Sound effects</span><button class="tog snd ${s.sound ? 'on' : ''}">${s.sound ? 'On' : 'Off'}</button></div>
      <div class="row"><span>Music</span><button class="tog mus ${s.music ? 'on' : ''}">${s.music ? 'On' : 'Off'}</button></div>
      <div class="s-help">Tilt: hold the iPad like a steering wheel. Tip it away from you to dive, toward you to climb. Press 🎯 to recenter.<br>Keyboard: arrows / WASD to steer, Space to boost.</div>
      <div class="b-buttons"><button class="btn reset">Reset progress</button><button class="btn big close">Done</button></div>
    </div>`;
    this.el.appendChild(modal);
    const save = () => { store.save(); app.sound.applySettings(); app.hud.setControls(s.controls); };
    modal.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', this.click(async () => {
      s.controls = b.dataset.c;
      if (s.controls === 'tilt') await app.input.requestMotion();
      save(); modal.remove(); this.settings(back);
    })));
    modal.querySelector('.sens').addEventListener('input', (e) => { s.sensitivity = Number(e.target.value); save(); });
    const tog = (cls, key) => modal.querySelector(cls).addEventListener('click', this.click(() => { s[key] = !s[key]; save(); modal.remove(); this.settings(back); }));
    tog('.inv', 'invert'); tog('.assist', 'assist'); tog('.snd', 'sound'); tog('.mus', 'music');
    modal.querySelector('.reset').addEventListener('click', this.click(() => {
      if (confirm('Erase all stars and upgrades for BOTH pilots?')) { store.reset(); app.reloadProfiles(); modal.remove(); app.toTitle(); }
    }));
    modal.querySelector('.close').addEventListener('click', this.click(() => { modal.remove(); if (back) back(); }));
  }

  // ------------------------------------------------------------ pause
  pause() {
    this.clear();
    this.el.className = 'dim';
    this.el.innerHTML = `<div class="sheet pause">
      <div class="s-title">⏸️ Paused</div>
      <button class="btn big resume">▶️ Keep flying</button>
      <button class="btn restart">🔁 Restart mission</button>
      <button class="btn recenter">🎯 Recenter tilt</button>
      <button class="btn sett">⚙️ Settings</button>
      <button class="btn quit">🗺️ Back to map</button>
    </div>`;
    this.bind('.resume', () => this.app.resume());
    this.bind('.restart', () => this.app.restartMission());
    this.bind('.recenter', () => { this.app.input.recenter(); this.app.resume(); });
    this.bind('.sett', () => this.settings(() => this.pause()));
    this.bind('.quit', () => this.app.quitMission());
  }

  // ------------------------------------------------------------ results
  results(r, i, newBest) {
    const m = MISSIONS[i];
    const gradeText = { butter: '🧈 Butter landing!', bumpy: '🙂 Bumpy landing', pancake: '🥞 Pancake landing' }[r.grade];
    const reasons = ['Mission complete', `Under ${fmt(r.targetTime)}`, 'Butter landing'];
    this.clear();
    this.el.className = 'dim';
    const last = i === MISSIONS.length - 1;
    this.el.innerHTML = `<div class="sheet results">
      <div class="r-title">${m.icon} ${m.title}</div>
      <div class="r-stars">${r.stars.map((s, k) => `<div class="rs ${s ? 'got' : ''}" style="animation-delay:${0.3 + k * 0.35}s"><div class="big">${s ? '⭐' : '☆'}</div><div>${reasons[k]}</div></div>`).join('')}</div>
      <div class="r-line">${gradeText} · ⏱️ ${fmt(r.time)}${newBest ? ' · <b>New best!</b>' : ''}</div>
      ${r.sock ? '<div class="r-line">🧦 Found the lost sock!</div>' : ''}
      ${r.crashes ? `<div class="r-line small">Rebuilt the plane ${r.crashes}×. Duct tape is amazing.</div>` : ''}
      <div class="b-buttons">
        <button class="btn retry">🔁 Try again</button>
        <button class="btn mapb">🗺️ Map</button>
        ${last ? '<button class="btn big end">🎬 The End</button>' : '<button class="btn big next">Next mission ▶️</button>'}
      </div>
    </div>`;
    this.bind('.retry', () => this.app.startMission(i));
    this.bind('.mapb', () => this.app.quitMission());
    this.bind('.next', () => this.app.startMission(i + 1));
    this.bind('.end', () => this.app.ending());
  }

  // ------------------------------------------------------------ ending
  ending() {
    const app = this.app, who = app.player, buddy = who === 'yusuf' ? 'musa' : 'yusuf';
    const p = app.profile;
    this.clear();
    this.el.className = 'ending';
    this.el.innerHTML = `<div class="end-card">
      <div class="end-title">Best. Summer. Ever.</div>
      <p>The sun went down over Greensboro. ${NAMES[who]} and ${NAMES[buddy]} sat in the cardboard plane, still in their red plaid pajamas, sharing the last juice box.</p>
      <p>"Next summer," said ${NAMES[buddy]}, "you visit ${buddy === 'yusuf' ? 'Plano' : 'Greensboro'}... and we fly even farther."</p>
      <p>"Deal," said ${NAMES[who]}. "Backyard Squadron forever!"</p>
      <div class="credits">
        <div><b>Starring</b></div>
        <div>Yusuf <small>(Plano, TX)</small> &amp; Musa <small>(Greensboro, NC)</small></div>
        <div class="cr-stats">⭐ ${totalStars(p)} / ${MISSIONS.length * 3} stars · 🧦 ${socksFound(p)} / ${MISSIONS.length} socks</div>
      </div>
      <button class="btn big done">🗺️ Back to map</button>
    </div>`;
    this.bind('.done', () => { app.showEnding(false); this.map(); });
  }

  loading(text) {
    this.clear();
    this.el.className = 'loading';
    this.el.innerHTML = `<div class="load-card"><div class="spinner">✈️</div><div class="load-text">${text}</div></div>`;
  }
}
