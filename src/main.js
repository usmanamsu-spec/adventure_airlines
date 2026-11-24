import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './style.css';
import { makeBoy, lookAt, setSlippers, BOYS } from './characters.js';
import { buildPlane } from './plane.js';
import { Input } from './flight.js';
import { Sound } from './audio.js';
import { Hud } from './hud.js';
import { UI } from './ui.js';
import { MissionRun } from './mission.js';
import { MISSIONS } from './levels.js';
import { store, recordResult, socksFound } from './save.js';
import { nextFrame } from './util.js';

const STEP = 1 / 60;
const GOLD = [0xf2c230, 0xf2c230];

class App {
  constructor() {
    store.load();
    this.settings = store.settings;
    this.input = new Input(this.settings);
    if (!this.settings.controls) this.settings.controls = this.input.hasMotionAPI ? 'tilt' : 'keys';
    this.sound = new Sound(this.settings);
    this.root = document.getElementById('app');

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.root.appendChild(this.renderer.domElement);
    this.envMap = new THREE.PMREMGenerator(this.renderer).fromScene(new RoomEnvironment(), 0.04).texture;

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
    this.root.addEventListener('pointerdown', () => this.sound.unlock(), { capture: true });
  }

  get aspect() { return window.innerWidth / window.innerHeight; }
  get profile() { return store.profile(this.player); }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    for (const cam of [this.titleCam, this.mission?.camera]) if (cam) { cam.aspect = w / h; cam.updateProjectionMatrix(); }
    const portrait = h > w * 1.05;
    document.body.classList.toggle('portrait', portrait);
    if (portrait && this.state === 'mission' && !this.paused) this.pause();
  }

  // ------------------------------------------------------------ boot
  async boot() {
    this.ui.loading('Building the cardboard plane…');
    await nextFrame();
    this.titleBoys = {
      yusuf: makeBoy(BOYS.yusuf, { lod: 'hi' }),
      musa: makeBoy(BOYS.musa, { lod: 'hi' }),
    };
    this.ui.loading('Ironing the pajamas…');
    await nextFrame();
    this.makePortraits();
    this.buildTitleScene();
    this.state = 'title';
    this.ui.title();
    requestAnimationFrame((t) => this.loop(t));
    window.__ready = true;
  }

  makePortraits() {
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
    for (const k of ['yusuf', 'musa']) {
      const b = this.titleBoys[k];
      const rot = b.rotation.y;
      b.rotation.y = 0;
      scene.add(b);
      b.updateMatrixWorld(true);
      const head = new THREE.Vector3();
      b.userData.head.getWorldPosition(head);
      cam.position.set(head.x + 0.05, head.y + 0.03, head.z + 0.95);
      cam.lookAt(head.x, head.y - 0.03, head.z);
      lookAt(b, cam.position);
      r.setClearColor(k === 'yusuf' ? 0xffd27a : 0x8fd3ff, 1);
      r.render(scene, cam);
      this.portraits[k] = r.domElement.toDataURL('image/png');
      scene.remove(b);
      b.rotation.y = rot;
    }
    r.dispose();
    r.forceContextLoss?.();
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
    this.titlePlane.group.position.set(0.4, 0.21, -2.2);
    this.titlePlane.group.rotation.y = -0.5;
    this.titlePlane.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    s.add(this.titlePlane.group);
    const Y = this.titleBoys.yusuf, M = this.titleBoys.musa;
    Y.position.set(-0.45, 0, 0); Y.rotation.y = 0.28;
    M.position.set(0.5, 0, 0.05); M.rotation.y = -0.3;
    for (const b of [Y, M]) { b.traverse(o => { if (o.isMesh) o.castShadow = true; }); s.add(b); }
    this.titleCam = new THREE.PerspectiveCamera(30, this.aspect, 0.05, 200);
    this.titleT = 0;
  }

  titleCamera(dt) {
    this.titleT += dt;
    const t = this.titleT;
    const cam = this.titleCam;
    if (this.garageView) {
      cam.position.set(-0.6 + Math.sin(t * 0.3) * 0.5, 2.6, 4.2);
      cam.lookAt(-1.4, 0.7, -2.2);
    } else {
      const wide = this.aspect > 1.2;
      cam.position.set(Math.sin(t * 0.15) * 0.5 + 0.05, 1.05, wide ? 4.4 : 5.6);
      cam.lookAt(0.05, 0.92, 0);
    }
    lookAt(this.titleBoys.yusuf, cam.position);
    lookAt(this.titleBoys.musa, cam.position);
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
    if (this.settings.controls === 'tilt') await this.input.requestMotion();
    this.sound.unlock();
    this.sound.startMusic('day');
    this.state = 'map';
    this.ui.map();
  }
  toTitle() { this.state = 'title'; this.ui.title(); }
  reloadProfiles() { this.settings = store.settings; this.input.settings = this.settings; this.sound.settings = this.settings; }
  showGarage(on) { this.garageView = on; if (on) this.refreshGaragePlane(); }
  refreshGaragePlane() {
    const p = this.profile;
    this.titleScene.remove(this.titlePlane.group);
    this.titlePlane = buildPlane({ upgrades: p.upgrades, paint: p.paint });
    this.titlePlane.group.position.set(0.4, 0.21 + (p.upgrades.floats ? 0.32 : 0), -2.2);
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
    this.ui.clear();
    this.hud.show();
    this.state = 'mission';
    this.paused = false;
    this.acc = 0;
    this.sound.startMusic(def.time === 'night' ? 'night' : 'day');
    run.start();
    if (document.body.classList.contains('portrait')) this.pause();
  }
  restartMission() { this.startMission(this.missionIndex); }
  quitMission(silent) {
    if (this.mission) { this.mission.dispose(); this.mission = null; }
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
    if (document.body.classList.contains('portrait')) return;
    this.paused = false;
    this.ui.clear();
    this.last = performance.now();
    if (this.mission && this.mission.phase !== 'countdown') this.sound.startEngine();
  }

  onMissionComplete(r) {
    const p = this.profile;
    const prev = p.missions[r.id]?.best;
    recordResult(p, r.id, r);
    store.save();
    this.state = 'results';
    this.hud.hide();
    this.lastResult = r;
    this.ui.results(r, this.missionIndex, prev != null && r.time < prev);
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
      if (this.mission) this.renderer.render(this.mission.scene, this.mission.camera);
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

const app = new App();
window.__bsq = app;
app.boot();
