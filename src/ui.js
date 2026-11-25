// Menu screens (DOM overlays).
import { MISSIONS } from './levels.js';
import { PAINTS, UPGRADES } from './plane.js';
import { store, totalStars, availableStars, socksFound, isUnlocked, buyUpgrade, buyPaint } from './save.js';

import { NAMES } from './dialogue.js';
import { KIDS } from './characters.js';
import { VEHICLES, SPECIAL } from './vehicles.js';

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
        ${KIDS.map(k => `
        <button class="pilot-card" data-who="${k.id}" style="--c1:${k.card[0]};--c2:${k.card[1]}">
          <img src="${P[k.id]}" alt="${NAMES[k.id]}">
          <div class="pc-name">${NAMES[k.id]}</div>
          <div class="pc-stars">⭐ ${totalStars(store.profile(k.id))}</div>
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
        <div class="mc-body"><div class="mc-title">${i + 1}. ${m.title}</div><div class="mc-place">${m.place}</div></div>
        <div class="mc-right"><div class="mc-stars">${stars}</div><div class="mc-sock">${rec?.sock ? '🧦' : ''}${needs && open ? '🦩?' : ''}</div></div>
      </button>`;
    };
    this.el.innerHTML = `
      <div class="topbar">
        <img class="tb-face" src="${app.portraits[who]}">
        <div class="tb-name">Captain ${NAMES[who]}</div>
        <div class="tb-stat">⭐ ${availableStars(p)} <small>to spend</small></div>
        <div class="tb-stat">🧦 ${socksFound(p)}/${MISSIONS.length}</div>
        <div class="tb-spacer"></div>
        <button class="btn easymode ${store.settings.easy === true ? 'on' : ''}">🐣 Easy flying: ${store.settings.easy === true ? 'ON' : 'OFF'}</button>
        <button class="btn garage">🔧 Garage</button>
        <button class="btn settings">⚙️</button>
        <button class="btn switch">👥 Switch pilot</button>
      </div>
      <div class="chapters">
        <div class="chapter"><div class="ch-title">✈️ <b>Plano ➜ Greensboro</b></div>
          <div class="ch-sub">Captain ${NAMES[who]} flies, and the whole squad rides along! The Greensboro kids (Musa, Hassan, Ayra and Harun) came to visit the Plano house (Anaya Apa, Yusuf, Faris and Zainab). Now everybody flies back to Greensboro together, where Ruman is waiting. Anaya Apa is in charge of the back row.</div>
          ${MISSIONS.map((m, i) => card(m, i)).join('')}
        </div>
      </div>`;
    this.bind('.mcard', (b) => this.briefing(Number(b.dataset.i)));
    this.bind('.easymode', () => { store.settings.easy = store.settings.easy !== true; store.save(); this.map(); });
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
      <div class="b-stars">⭐ Finish · ⭐ Collect the candy 🍬 · ⭐ Butter landing ${rec?.bestScore ? `<br><small>🏆 Best score ${rec.bestScore.toLocaleString()}</small>` : ''}</div>
      <div class="b-tips">🍬 Follow the candy trail · 🌀 Tap TRICK for barrel rolls · 🔥 Grab things fast for combos!</div>
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
    const special = VEHICLES[SPECIAL[app.player]];
    if (special) {
      const gi = special.garage;
      this.el.innerHTML = `
      <div class="garage-panel">
        <div class="gp-head"><span>🔧 ${gi.title}</span><span class="gp-stars">⭐ ${availableStars(p)}</span></div>
        <div class="gp-section">${gi.name}</div>
        <div class="gp-sub" style="font-size:17px">${gi.desc}</div>
        ${gi.items.map(([n, d]) => `<div class="gi owned"><div class="gi-name">${n}</div><div class="gi-desc">${d}</div><div class="gi-own">✅</div></div>`).join('')}
        <div class="gp-sub">${socksFound(p) >= MISSIONS.length ? '🧦 All lost socks found: GOLDEN SLIPPERS unlocked!' : `🧦 Find all ${MISSIONS.length} lost socks for golden slippers (${socksFound(p)}/${MISSIONS.length})`}</div>
        <button class="btn big done">Done</button>
      </div>`;
      this.bind('.done', () => { app.showGarage(false); this.map(); });
      return;
    }
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
        <button data-c="touch" class="${s.controls === 'touch' ? 'on' : ''}">🕹️ Touch stick</button>
        ${tiltOk ? `<button data-c="tilt" class="${s.controls === 'tilt' ? 'on' : ''}">📱 Tilt (gyro)</button>` : ''}
        ${!tiltOk ? `<button data-c="keys" class="${s.controls === 'keys' ? 'on' : ''}">⌨️ Keyboard</button>` : ''}
      </div></div>
      <div class="row"><span>Steering sensitivity</span><input type="range" class="sens" min="0.6" max="1.8" step="0.1" value="${s.sensitivity}"></div>
      <div class="row"><span>Flip up/down</span><button class="tog inv ${s.invert ? 'on' : ''}">${s.invert ? 'On' : 'Off'}</button></div>
      <div class="row"><span>Graphics <small>(Fancy adds glow, mirror-like water and sky lighting, but can lag on older iPads)</small></span><div class="seg">
        <button data-g="fast" class="${s.graphics !== 'fancy' ? 'on' : ''}">⚡ Fast</button>
        <button data-g="fancy" class="${s.graphics === 'fancy' ? 'on' : ''}">✨ Fancy</button>
      </div></div>
      <div class="row"><span>🐣 Easy flying <small>(the plane steers to the rings, no damage, lands itself)</small></span><button class="tog easy ${s.easy === true ? 'on' : ''}">${s.easy === true ? 'On' : 'Off'}</button></div>
      <div class="row"><span>Landing helper</span><button class="tog assist ${s.assist ? 'on' : ''}">${s.assist ? 'On' : 'Off'}</button></div>
      <div class="row"><span>Sound effects</span><button class="tog snd ${s.sound ? 'on' : ''}">${s.sound ? 'On' : 'Off'}</button></div>
      <div class="row"><span>Music</span><button class="tog mus ${s.music ? 'on' : ''}">${s.music ? 'On' : 'Off'}</button></div>
      <div class="s-help">Touch stick: drag the left stick to steer, hold BOOST to go fast.<br>
        Tilt: hold the iPad like a steering wheel, tip it away to dive, toward you to climb, 🎯 recenters.
        <b>If the screen keeps flipping when you tilt, lock rotation first:</b> hold the iPad upright, swipe down from the top-right corner and tap the 🔒 lock.<br>
        Keyboard: arrows / WASD to steer, Space to boost.</div>
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
    modal.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', this.click(() => { s.graphics = b.dataset.g; save(); modal.remove(); this.settings(back); })));
    modal.querySelector('.easy').addEventListener('click', this.click(() => { s.easy = s.easy !== true; save(); modal.remove(); this.settings(back); }));
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
    const reasons = ['Mission complete', `Candy ${Math.min(r.candies, r.candyNeed)}/${r.candyNeed} 🍬`, 'Butter landing'];
    this.clear();
    this.el.className = 'dim';
    const last = i === MISSIONS.length - 1;
    this.el.innerHTML = `<div class="sheet results">
      <div class="r-title">${m.icon} ${m.title}</div>
      <div class="r-stars">${r.stars.map((s, k) => `<div class="rs ${s ? 'got' : ''}" style="animation-delay:${0.3 + k * 0.35}s"><div class="big">${s ? '⭐' : '☆'}</div><div>${reasons[k]}</div></div>`).join('')}</div>
      <div class="r-score">🏆 ${r.score.toLocaleString()}</div>
      <div class="r-line">${gradeText} · 🍬 ${r.candies}/${r.candyTotal} · ⏱️ ${fmt(r.time)}${newBest ? ' · <b>New high score!</b>' : ''}</div>
      ${r.sock ? '<div class="r-line">🧦 Found the lost sock!</div>' : ''}
      ${r.crashes ? `<div class="r-line small">Rebuilt the plane ${r.crashes}×. Duct tape is amazing.</div>` : ''}
      <div class="b-buttons">
        <button class="btn retry">🔁 Try again</button>
        <button class="btn mapb">🗺️ Map</button>
        ${last ? '<button class="btn big end">🎬 The End</button>' : '<button class="btn big next">Next mission ▶️</button>'}
      </div>
    </div>`;
    this.confettiRain();
    this.bind('.retry', () => this.app.startMission(i));
    this.bind('.mapb', () => this.app.quitMission());
    this.bind('.next', () => this.app.startMission(i + 1));
    this.bind('.end', () => this.app.ending());
  }

  // ------------------------------------------------------------ ending
  ending() {
    const app = this.app, who = app.player;
    const p = app.profile;
    this.clear();
    this.el.className = 'ending';
    this.el.innerHTML = `<div class="end-card">
      <div class="end-title">Best. Summer. Ever.</div>
      <p>The sun went down over Greensboro and the fall leaves glowed orange. The whole squad climbed out of the cardboard plane in front of the Greensboro house, where Ruman was waiting with a big wave.</p>
      <p>"You actually made it," said Ruman. "In a BOX." "I supervised," said Anaya Apa.</p>
      <p>"Okay," said ${who === 'anaya' ? 'Yusuf' : 'Anaya Apa'}. "${who === 'anaya' ? 'Anaya Apa' : 'Captain ' + NAMES[who]}, that was... actually amazing. Everybody, say thank you."</p>
      <p>"Thank you!" yelled Ayra, Harun and Faris. "Again!" said Zainab. "Ba!" said Baby Musa.</p>
      <p>"Backyard Squadron forever!" said ${NAMES[who]}.</p>
      <div class="credits">
        <div><b>Starring</b></div>
        <div><b>The Plano house:</b> Anaya Apa · Yusuf · Faris · Zainab</div>
        <div><b>The Greensboro house:</b> Musa · Hassan · Ayra · Harun · Ruman</div>
        <div>and Baby Musa</div>
        <div class="cr-stats">⭐ ${totalStars(p)} / ${MISSIONS.length * 3} stars · 🧦 ${socksFound(p)} / ${MISSIONS.length} socks</div>
      </div>
      <button class="btn big done">🗺️ Back to map</button>
    </div>`;
    this.confettiRain(140);
    this.bind('.done', () => { app.showEnding(false); this.map(); });
  }

  confettiRain(n = 90) {
    const box = document.createElement('div');
    box.className = 'rain';
    const cols = ['#ff4f6a', '#ff9a3f', '#ffd23f', '#5fd35a', '#3fb8ff', '#8a5cff', '#ff6ad5'];
    for (let i = 0; i < n; i++) {
      const d = document.createElement('i');
      d.style.left = `${Math.random() * 100}%`;
      d.style.background = cols[i % cols.length];
      d.style.animationDelay = `${Math.random() * 1.5}s`;
      d.style.animationDuration = `${2.2 + Math.random() * 2}s`;
      d.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(d);
    }
    this.el.appendChild(box);
  }

  loading(text) {
    this.clear();
    this.el.className = 'loading';
    this.el.innerHTML = `<div class="load-card"><div class="spinner">✈️</div><div class="load-text">${text}</div></div>`;
  }
}
