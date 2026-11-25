import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './style.css';
import { makeBoy, lookAt, setSlippers, BOYS, KIDS, RUMAN } from './characters.js';
import { buildPlane } from './plane.js';
import { buildTruck } from './truck.js';
import { hotAirBalloon } from './world/props.js';
import { Input } from './flight.js';
import { Sound } from './audio.js';
import { Hud } from './hud.js';
import { UI } from './ui.js';
import { MissionRun } from './mission.js';
import { MISSIONS } from './levels.js';
import { store, recordResult, socksFound } from './save.js';
import { nextFrame } from './util.js';
import { preventZoom } from './nozoom.js';
import { Post } from './graphics.js';

const STEP = 1 / 60;
const GOLD = [0xf2c230, 0xf2c230];

class App {
  constructor() {
    store.load();
    this.settings = store.settings;
    this.input = new Input(this.settings);
    // touch stick by default on iPad/iPhone (tilt is opt-in from Settings); keyboard on computers
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if ((store.data.v || 0) < 2) this.settings.controls = touch ? 'touch' : 'keys';
    if ((store.data.v || 0) < 3) this.settings.assist = true; // landing helper on for kids
    if ((store.data.v || 0) < 4) { this.settings.easy = true; store.data.v = 4; store.save(); } // easy flying on for kids
    if (!this.settings.controls) this.settings.controls = touch ? 'touch' : 'keys';
    this.sound = new Sound(this.settings);
    this.root = document.getElementById('app');

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.root.appendChild(this.renderer.domElement);
    this.envMap = new THREE.PMREMGenerator(this.renderer).fromScene(new RoomEnvironment(), 0.04).texture;
    this.post = new Post(this.renderer);

    this.hud = new Hud(this.root, this);
    this.ui = new UI(this.root, this);
    this.state = 'boot';
    this.paused = false;
    this.acc = 0;
    this.last = performance.now();
    this.boyCache = new Map();
    this.portraits = {};
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'mission' && !this.paused) this.pause(); });
    // iOS only allows audio to start inside a real tap / click / key press
    for (const ev of ['touchend', 'click', 'keydown', 'pointerup']) window.addEventListener(ev, () => this.sound.unlock(), { capture: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && this.sound.ctx) this.sound.ctx.resume().catch(() => {}); });
  }

  get aspect() { return window.innerWidth / window.innerHeight; }
  get profile() { return store.profile(this.player); }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    for (const cam of [this.titleCam, this.mission?.camera]) if (cam) { cam.aspect = w / h; cam.updateProjectionMatrix(); }
    this.post.resize();
    // Portrait only. Only react to a sideways screen if it lasts: a quick accidental rotation shouldn't stop the game.
    const sideways = w > h * 1.05;
    clearTimeout(this.sidewaysT);
    if (!sideways) { document.body.classList.remove('sideways'); return; }
    this.sidewaysT = setTimeout(() => {
      if (window.innerWidth <= window.innerHeight * 1.05) return;
      document.body.classList.add('sideways');
      if (this.state === 'mission' && !this.paused) this.pause();
    }, 900);
  }

  // ------------------------------------------------------------ boot
  async boot() {
    this.titleBoys = {};
    const msgs = ['Building a BIG cardboard plane…', 'Ironing 8 pairs of pajamas…', 'Finding everybody\'s slippers…', 'Packing snacks…', 'Telling Anaya Apa she\'s in charge…', 'Finding Hassan\'s other slipper…', 'Warming up the juice boxes…', 'Finding Baby Musa\'s binky…', 'Almost ready…'];
    // full-detail models are only used for the portrait snapshots; the title screen uses lighter ones
    this.portraitRig();
    for (let i = 0; i < KIDS.length; i++) {
      this.ui.loading(msgs[i % msgs.length]);
      await nextFrame();
      const hi = makeBoy(KIDS[i], { lod: 'hi' });
      this.snapPortrait(KIDS[i], hi);
      hi.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      this.titleBoys[KIDS[i].id] = makeBoy(KIDS[i], { lod: 'lo' });
    }
    { const hi = makeBoy(RUMAN, { lod: 'hi' }); this.snapPortrait(RUMAN, hi); hi.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    this.portraitR.dispose();
    this.portraitR.forceContextLoss?.();
    this.buildTitleScene();
    this.state = 'title';
    this.ui.title();
    requestAnimationFrame((t) => this.loop(t));
    window.__ready = true;
  }

  portraitRig() {
    const size = 256;
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
    r.setSize(size, size);
    r.toneMapping = THREE.NeutralToneMapping;
    const scene = new THREE.Scene();
    scene.environment = this.envMap;
    scene.environmentIntensity = 0.5;
    const key = new THREE.DirectionalLight(0xffe7cc, 2.4); key.position.set(-1, 2, 3);
    const rim = new THREE.DirectionalLight(0xbfe0ff, 1.6); rim.position.set(2, 2, -2);
    scene.add(key, rim, new THREE.HemisphereLight(0xcfe8ff, 0x8a7a6a, 0.7));
    const cam = new THREE.PerspectiveCamera(22, 1, 0.05, 10);
    this.portraitR = r; this.portraitScene = scene; this.portraitCam = cam;
  }

  snapPortrait(spec, b) {
    const r = this.portraitR, scene = this.portraitScene, cam = this.portraitCam;
    const k = spec.id;
    {
      const rot = b.rotation.y;
      b.rotation.y = 0;
      scene.add(b);
      b.updateMatrixWorld(true);
      const head = new THREE.Vector3();
      b.userData.head.getWorldPosition(head);
      const hs = spec.R * (spec.scale || 1) / 0.152; // frame every head the same, big or small
      cam.position.set(head.x + 0.05 * hs, head.y + 0.03 * hs + (spec.hair === 'long' ? -0.04 : 0), head.z + 0.95 * hs);
      cam.lookAt(head.x, head.y - 0.03 * hs - (spec.hair === 'long' ? 0.04 : 0), head.z);
      lookAt(b, cam.position);
      r.setClearColor(new THREE.Color(spec.card[0]), 1);
      r.render(scene, cam);
      this.portraits[k] = r.domElement.toDataURL('image/png');
      scene.remove(b);
      b.rotation.y = rot;
    }
  }

  buildTitleScene() {
    const s = new THREE.Scene();
    this.titleScene = s;
    s.environment = this.envMap;
    s.environmentIntensity = 0.5;
    const sky = document.createElement('canvas'); sky.width = 2; sky.height = 256;
    const g = sky.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#5fb0f0'); gr.addColorStop(0.65, '#a9dcff'); gr.addColorStop(1, '#fde7c4');
    g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
    const skyTex = new THREE.CanvasTexture(sky); skyTex.colorSpace = THREE.SRGBColorSpace;
    s.background = skyTex;
    this.titleSky = skyTex;
    const key = new THREE.DirectionalLight(0xffe7cc, 2.6);
    key.position.set(-2, 4, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -2 });
    key.shadow.bias = -0.0003;
    const rim = new THREE.DirectionalLight(0xbfe0ff, 2.0); rim.position.set(3, 3, -3);
    const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x6d8a4a, 0.7);
    s.add(key, rim, hemi);
    this.titleLights = { key, rim, hemi };
    const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x5fa040, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    s.add(ground);
    const fence = new THREE.MeshStandardMaterial({ color: 0xb08a66, roughness: 0.95 });
    for (let i = -40; i <= 40; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.8, 0.03), fence);
      b.position.set(i * 0.165, 0.9, -5.5);
      b.receiveShadow = true;
      s.add(b);
    }
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 2.6, 8), new THREE.MeshStandardMaterial({ color: 0x6a4a32 }));
    trunk.position.y = 1.3;
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 1), new THREE.MeshStandardMaterial({ color: 0x4f8f3a, flatShading: true }));
    leaves.position.y = 3.3;
    tree.add(trunk, leaves);
    tree.position.set(-4.2, 0, -3.5);
    tree.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    s.add(tree);
    this.titlePlane = buildPlane({});
    this.titlePlane.group.position.set(0.6, 0.21, -3.6);
    this.titlePlane.group.rotation.y = -0.5;
    this.titlePlane.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    s.add(this.titlePlane.group);
    // the whole squad: big kids in the back row, little ones in front
    const spots = { anaya: [-1.3, -0.45, 0.25], yusuf: [-0.5, -0.4, 0.15], hassan: [0.25, -0.45, 0.0], musa: [1.0, -0.45, -0.25], ayra: [-1.4, 0.55, 0.35],
      harun: [-0.72, 0.6, 0.15], zainab: [-0.12, 0.7, 0.05], babymusa: [0.4, 0.72, -0.1], faris: [1.0, 0.6, -0.3] };
    for (const [id, [x, z, ry]] of Object.entries(spots)) {
      const b = this.titleBoys[id];
      b.position.set(x, 0, z); b.rotation.y = ry;
      b.traverse(o => { if (o.isMesh) o.castShadow = true; });
      s.add(b);
    }
    // colourful balloons drifting over the fence
    this.titleBalloons = [[0xff4f6a, 0xffd23f], [0x3fb8ff, 0xffffff, 0xff6ad5], [0x5fd35a, 0xffd23f, 0x8a5cff]].map((c, i) => {
      const b = hotAirBalloon(c, i + 1);
      b.scale.setScalar(0.32);
      b.position.set(-9 + i * 8, 9 + i * 1.5, -26 - i * 6);
      s.add(b);
      return b;
    });
    this.titleCam = new THREE.PerspectiveCamera(30, this.aspect, 0.05, 200);
    this.titleT = 0;
  }

  titleCamera(dt) {
    this.titleT += dt;
    const t = this.titleT;
    const cam = this.titleCam;
    if (this.garageView) {
      // portrait: plane in the top half, garage panel below
      cam.position.set(4.6 + Math.sin(t * 0.3) * 0.5, 6.6, 6.6);
      cam.lookAt(0.4, -2.4, -3.8);
    } else {
      // portrait framing: logo above, the boys in the middle, pilot cards below
      const tall = this.aspect < 0.8;
      cam.position.set(Math.sin(t * 0.15) * 0.3 - 0.1, 1.35, tall ? 9.6 : 7);
      cam.lookAt(-0.1, tall ? 0.15 : 0.55, 0);
    }
    // happy idle animation: bounce, sway, and a real wave
    const kids = Object.values(this.titleBoys);
    kids.forEach((b, i) => {
      const little = (b.userData.scale || 1) < 0.75;
      b.position.y = Math.abs(Math.sin(t * (little ? 3.2 : 2.2) + i * 1.4)) * (little ? 0.05 : 0.03);
      b.rotation.z = Math.sin(t * 1.1 + i * 1.4) * 0.025;
      const wh = b.userData.waveHand;
      if (wh) wh.quaternion.copy(wh.userData.baseQ).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.sin(t * 7 + i) * 0.45));
    });
    this.titleBalloons.forEach((b, i) => { b.position.x += dt * (0.25 + i * 0.1); if (b.position.x > 16) b.position.x = -16; b.position.y = 9 + i * 1.5 + Math.sin(t * 0.6 + i) * 0.6; });
    kids.forEach(b => lookAt(b, cam.position));
    this.titlePlane.update(dt, 4, false);
  }

  // ------------------------------------------------------------ boys inside the plane
  getBoy(name, variant) {
    const gold = socksFound(store.profile(this.player)) >= MISSIONS.length;
    const key = `${name}:${variant}`;
    if (!this.boyCache.has(key)) {
      const arms = variant === 'drive' ? { R: 'drive', L: 'drive' } : { R: 'relaxed', L: 'relaxed' };
      const b = makeBoy(BOYS[name], { lod: 'lo', arms, legs: 'sit', headTilt: [0.08, 0, 0] });
      b.traverse(o => { if (o.isMesh) o.castShadow = true; });
      this.boyCache.set(key, b);
    }
    const b = this.boyCache.get(key);
    setSlippers(b, gold ? GOLD : BOYS[name].slippers);
    return b;
  }

  // ------------------------------------------------------------ flow
  async choosePilot(who) {
    this.player = who;
    store.data.last = who;
    store.save();
    this.sound.unlock(); // first, while we're still inside the tap
    this.refreshGaragePlane(); // Faris gets his truck
    this.sound.startMusic('day');
    if (this.settings.controls === 'tilt') await this.input.requestMotion();
    this.state = 'map';
    this.ui.map();
  }
  toTitle() { this.state = 'title'; this.ui.title(); }
  reloadProfiles() { this.settings = store.settings; this.input.settings = this.settings; this.sound.settings = this.settings; }
  showGarage(on) { this.garageView = on; if (on) this.refreshGaragePlane(); }
  refreshGaragePlane() {
    const p = this.profile;
    this.titleScene.remove(this.titlePlane.group);
    const truck = this.player === 'faris';
    this.titlePlane = truck ? buildTruck() : buildPlane({ upgrades: p.upgrades, paint: p.paint });
    this.titlePlane.group.position.set(truck ? 0.9 : 0.6, truck ? 0 : 0.21 + (p.upgrades.floats ? 0.32 : 0), truck ? -5.2 : -3.6);
    if (truck) this.titlePlane.group.scale.setScalar(0.62);
    this.titlePlane.group.rotation.y = -0.5;
    this.titlePlane.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.titleScene.add(this.titlePlane.group);
  }

  async startMission(i, opts = {}) {
    this.quitMission(true);
    const def = MISSIONS[i];
    this.missionIndex = i;
    this.state = 'loading';
    this.ui.loading(`${def.icon} ${def.title}<br><small>${def.place}</small>`);
    this.hud.hide();
    await nextFrame(); await nextFrame();
    const run = new MissionRun(this, def, this.player);
    await run.build();
    run.autopilot = !!opts.autopilot;
    this.mission = run;
    run.camera.aspect = this.aspect;
    run.camera.updateProjectionMatrix();
    run.updateCamera(0);
    if (this.settings.graphics !== 'fast') this.post.setup(run.scene, run.camera); else this.post.dispose();
    this.ui.clear();
    this.hud.show();
    this.state = 'mission';
    this.paused = false;
    this.acc = 0;
    this.sound.startMusic(def.time === 'night' ? 'night' : 'day');
    run.start();
    if (document.body.classList.contains('sideways')) this.pause();
  }
  restartMission() { this.startMission(this.missionIndex); }
  quitMission(silent) {
    if (this.mission) { this.mission.dispose(); this.mission = null; }
    this.post.dispose();
    this.hud.hide();
    if (!silent) { this.state = 'map'; this.ui.map(); this.sound.startMusic('day'); }
  }
  pause() {
    if (this.state !== 'mission') return;
    this.paused = true;
    this.sound.stopEngine();
    this.ui.pause();
  }
  resume() {
    if (document.body.classList.contains('sideways')) return;
    this.paused = false;
    this.ui.clear();
    this.last = performance.now();
    if (this.mission && this.mission.phase !== 'countdown') this.sound.startEngine();
  }

  onMissionComplete(r) {
    const p = this.profile;
    const prev = p.missions[r.id]?.bestScore;
    recordResult(p, r.id, r);
    store.save();
    this.state = 'results';
    this.hud.hide();
    this.lastResult = r;
    this.ui.results(r, this.missionIndex, prev != null && r.score > prev);
  }

  ending() {
    this.quitMission(true);
    this.profile.seenEnding = true;
    store.save();
    this.showEnding(true);
    this.state = 'ending';
    this.ui.ending();
  }
  showEnding(on) {
    const L = this.titleLights;
    if (on) {
      const c = document.createElement('canvas'); c.width = 2; c.height = 256;
      const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, '#34488c'); gr.addColorStop(0.6, '#f08a6a'); gr.addColorStop(1, '#ffc070');
      g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      this.titleScene.background = t;
      L.key.color.set(0xffa060); L.key.intensity = 2.2; L.key.position.set(4, 2, 3);
      L.hemi.color.set(0xffc8a0);
    } else {
      this.titleScene.background = this.titleSky;
      L.key.color.set(0xffe7cc); L.key.intensity = 2.6; L.key.position.set(-2, 4, 4);
      L.hemi.color.set(0xcfe8ff);
    }
    if (on) this.state = 'ending';
    else this.state = 'map';
  }

  // ------------------------------------------------------------ loop
  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.input.update(dt);
    if (this.state === 'mission' && this.mission) {
      if (!this.paused) {
        this.acc += dt;
        let n = 0;
        while (this.acc >= STEP && n++ < 5) { this.mission.step(STEP); this.acc -= STEP; }
      }
      if (this.mission) { if (this.post.composer) this.post.render(); else this.renderer.render(this.mission.scene, this.mission.camera); }
    } else if (this.titleScene && this.state !== 'loading') {
      this.titleCamera(dt);
      this.renderer.render(this.titleScene, this.titleCam);
    }
  }

  /** test helper: advance the simulation without rendering */
  sim(seconds) {
    const n = Math.round(seconds / STEP);
    for (let i = 0; i < n && this.mission; i++) this.mission.step(STEP);
  }
}

preventZoom();
const app = new App();
window.__bsq = app;
window.__missions = MISSIONS.map(m => m.id);
app.boot();
