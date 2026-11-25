// Runs one mission: world, plane, objectives, landing, scoring.
import * as THREE from 'three';
import { World, textSprite } from './world/kit.js';
import { juiceBox, sock as sockMesh, iceCream, firefly, fishingHat, glowTexture } from './world/props.js';
import { buildPlane } from './plane.js';
import { buildTruck } from './truck.js';
import { Flight, BASE_SPEED } from './flight.js';
import { SCRIPTS, resolveSpeaker, fillText, isLittle } from './dialogue.js';
import { clamp, damp, wrapAngle, DEG, lerp } from './util.js';
import { Confetti, Puffs, birdFlock, addTraffic, candyPool, juicePool, rainbowRing, Shockwaves, Fireworks, skyRainbow, Leaves } from './fx.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

/** who sits where: Anaya Apa likes the back row where she can keep an eye on everyone */
const SEAT_PREF = ['yusuf', 'musa', 'ayra', 'faris', 'harun', 'zainab', 'babymusa', 'hassan', 'anaya'];
export function crewSeating(pilot) {
  const others = SEAT_PREF.filter(id => id !== pilot);
  const seats = ['r1a', 'r1b', 'r2a', 'r2b', 'r3a', 'r3b', 'back2', 'back'];
  return others.map((id, i) => [id, seats[i]]);
}

export class MissionRun {
  constructor(app, def, player) {
    this.app = app;
    this.def = def;
    this.player = player;
    this.buddy = player === 'yusuf' ? 'musa' : 'yusuf';
    this.profile = app.profile;
    this.settings = app.settings;
    this.t = 0;
    this.time = 0;
    this.phase = 'build';
    this.flight = new Flight();
    this.tape = 6;
    this.maxTape = 6;
    this.score = 0;
    this.combo = 0;
    this.lastPickT = -9;
    this.candiesGot = 0;
    this.trickT = 0;
    this.trickCool = 0;
    this.freeBoost = 0;
    this.cheerT = 0;
    this.invuln = 0;
    this.shake = 0;
    this.bumps = 0;
    this.crashes = 0;
    this.sockFound = false;
    this.autopilot = false;
    this.events = [];
  }

  // ------------------------------------------------------------ build
  async build() {
    const def = this.def;
    this.scene = new THREE.Scene();
    this.scene.environment = this.app.envMap;
    this.scene.environmentIntensity = def.time === 'night' ? 0.15 : 0.45;
    const fancy = this.settings.graphics === 'fancy';
    const world = new World(this.scene, { ...def.world, time: def.time, seed: 11, fancy, renderer: this.app.renderer });
    this.world = world;
    this.spec = def.build(world, { player: this.player, upgrades: this.profile.upgrades });
    world.finish();
    const S = this.spec;
    // Easy flying (on by default): no damage, bigger targets, the plane steers itself and lands itself
    this.easy = this.settings.easy === true;
    this.noDamage = !!S.noDamage || this.easy;

    // plane + crew
    // when Faris flies, the cardboard plane becomes his shiny flying truck
    const plane = this.player === 'faris' ? buildTruck() : buildPlane({ upgrades: this.profile.upgrades, paint: this.profile.paint });
    plane.setNight(!!S.night);
    this.plane = plane;
    this.scene.add(plane.group);
    // the whole squad flies together: the chosen kid is the pilot, everyone else has a seat
    this.app.hud.setVehicle(plane.kind);
    this.pilotModel = this.app.getBoy(this.player, 'drive');
    this.seat(this.pilotModel, plane.seats.pilot);
    this.crew = crewSeating(this.player);
    this.passengers = this.crew.map(([id, seat]) => { const m = this.app.getBoy(id, 'ride'); this.seat(m, plane.seats[seat]); return m; });
    this.passenger = this.passengers[0];
    this.speaker = this.buddy;

    // objectives
    this.objectives = S.objectives.map(o => this.makeObjective(o));
    this.objIndex = 0;

    // pickups
    this.juicePool = juicePool(this.scene, S.juice.length);
    this.juices = S.juice.map((p, i) => { const it = this.juicePool.items[i]; it.position.set(...p); return it; });
    if (S.sock) {
      this.sock = sockMesh();
      this.sock.position.set(...S.sock);
      this.scene.add(this.sock);
    }

    // landing zone
    this.zone = this.makeZone(S.landing);

    // nav arrow
    const arrow = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.3, 4), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
    cone.rotation.x = Math.PI / 2;
    arrow.add(cone);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 6, 20), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    ring.position.z = -0.4;
    arrow.add(ring);
    this.arrow = arrow;
    this.scene.add(arrow);

    // camera
    // near 1.0 + far just past the fog: sharp depth (no flicker) and nothing drawn that the fog hides anyway
    this.camera = new THREE.PerspectiveCamera(62, this.app.aspect, 1.0, world.fogRange[1] + 120);
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();

    this.debris = [];
    this.splashes = [];
    // life & colour: traffic, birds, effects
    if (def.id !== 'trip') addTraffic(world, 12, 3);
    const B = S.bounds;
    const fc = B.corridor ? [[0, 600], [40, 1700], [-30, 2900], [10, 3800]] : [[B.cx, B.cz], [B.cx + 80, B.cz - 60], [B.cx - 90, B.cz + 70]];
    fc.forEach(([x, z], i) => birdFlock(world, x, z, { n: 5 + (i % 3), radius: 90 + i * 40, y: 38 + i * 12, speed: 0.1 + i * 0.03, seed: i * 2.1, color: def.time === 'night' ? 0x101018 : 0x2a2a3a }));
    this.confetti = new Confetti(this.scene);
    this.puffs = new Puffs(this.scene, 220);
    this.leaves = new Leaves(this.scene);
    this.shock = new Shockwaves(this.scene);
    this.fireworks = new Fireworks(this.puffs, this.app.sound);
    if (def.time !== 'night') this.scene.add(skyRainbow(V(...S.spawn.p), S.spawn.h + 0.4));
    this.fovKick = 0;
    this.squash = 0;
    this.makeCandies();
    this.progress = (S.progress || []).slice();
    this.respawnTo(S.spawn.p, S.spawn.h);
    this.checkpoint = { p: V(...S.spawn.p), h: S.spawn.h };
    this.targetTime = this.computeTargetTime();
    this.phase = 'ready';
  }

  seat(model, anchor) {
    // little kids get a booster cushion so they can see out
    model.position.set(0, -model.userData.hipY + 0.02 + (1 - (model.userData.scale || 1)) * 0.42, -0.05);
    model.userData.baseY = undefined;
    model.rotation.set(0, 0, 0);
    anchor.add(model);
  }

  makeObjective(o) {
    const obj = { ...o, done: false, count: 0, meshes: [] };
    if (o.type === 'rings') {
      const total = o.rings.length;
      obj.total = total;
      let prev = V(...this.spec.spawn.p);
      o.rings.forEach((p, i) => {
        const c = V(...p);
        const r = (o.radii && o.radii[i]) || o.r;
        const color = o.style === 'photo' ? 0x3fd0ff : o.style === 'waypoint' ? 0xff9a3f : 0xffd23f;
        const g = new THREE.Group();
        const rv = r * 1.25; // bigger, friendlier rings
        const style = o.photo && o.photo.includes(i) ? 'photo' : o.style;
        const torus = rainbowRing(rv, Math.max(0.55, rv * 0.08), style);
        g.add(torus);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity: 0.35, depthWrite: false }));
        glow.scale.set(rv * 3, rv * 3, 1);
        g.add(glow);
        if (style === 'photo') {
          const cam = textSprite('📷', { size: 64, bg: '#ffffff', fg: '#000' });
          cam.position.y = rv + 3;
          cam.scale.multiplyScalar(3.5);
          g.add(cam);
        }
        g.position.copy(c);
        const next = i < total - 1 ? V(...o.rings[i + 1]) : null;
        const dirIn = c.clone().sub(prev).setY(0).normalize();
        const dirOut = next ? next.clone().sub(c).setY(0).normalize() : dirIn;
        const dir = dirIn.add(dirOut).normalize();
        g.lookAt(c.clone().add(dir));
        g.userData = { c, r: rv + 3, torus, glow };
        this.scene.add(g);
        obj.meshes.push(g);
        prev = c;
      });
    } else if (o.type === 'collect') {
      obj.total = o.need;
      obj.r = o.r + 3;
      obj.items = o.items.map((p, i) => {
        const m = o.kind === 'icecream' ? iceCream() : firefly();
        m.position.set(...p);
        m.userData.base = V(...p);
        m.userData.phase = i * 1.7;
        this.scene.add(m);
        obj.meshes.push(m);
        return { m, got: false };
      });
    } else if (o.type === 'chase') {
      obj.total = o.need;
      obj.cool = 0;
      const marker = textSprite('TAG ME!', { size: 56, fg: '#7a4a24' });
      marker.scale.multiplyScalar(4);
      o.target.add(marker);
      marker.position.y = 16;
      obj.marker = marker;
    }
    return obj;
  }

  makeZone(L) {
    const g = new THREE.Group();
    const y = (L.water ? 0.2 : this.world.groundHeight(L.p[0], L.p[1])) + 0.4;
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(L.wid, L.len), new THREE.MeshBasicMaterial({ color: 0x5cff7a, transparent: true, opacity: 0.28, depthWrite: false }));
    strip.rotation.x = -Math.PI / 2;
    g.add(strip);
    const chev = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 6; i++) {
      for (const s of [-1, 1]) {
        const b = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 4), chev);
        b.rotation.x = -Math.PI / 2;
        b.rotation.z = s * 0.7;
        b.position.set(s * 1.3, 0.05, -L.len / 2 + 8 + i * (L.len - 16) / 5);
        g.add(b);
      }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4, 6), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      pole.position.set(sx * (L.wid / 2 + 1), 2, sz * L.len / 2);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshStandardMaterial({ color: sz < 0 ? 0x3cff7a : 0xff4f4f, side: THREE.DoubleSide }));
      flag.position.set(sx * (L.wid / 2 + 1) + 0.8, 3.4, sz * L.len / 2);
      g.add(pole, flag);
    }
    const label = textSprite('LAND HERE', { size: 60, fg: '#1b8a3a' });
    label.scale.multiplyScalar(5);
    label.position.set(0, 14, -L.len / 2);
    g.add(label);
    g.position.set(L.p[0], y, L.p[1]);
    g.rotation.y = L.h;
    g.visible = false;
    this.scene.add(g);
    if (L.prize === 'hat') {
      const hat = fishingHat();
      hat.position.set(L.prizeAt[0], 0.3, L.prizeAt[1]);
      this.scene.add(hat);
      this.hat = hat;
    }
    const dir = V(Math.sin(L.h), 0, Math.cos(L.h));
    return { ...L, g, y, dir, center: V(L.p[0], y, L.p[1]), label };
  }

  computeTargetTime() {
    const S = this.spec;
    let p = V(...S.spawn.p), d = 0;
    for (const o of S.objectives) {
      if (o.type === 'rings') for (const r of o.rings) { const q = V(...r); d += p.distanceTo(q); p = q; }
      else if (o.type === 'collect' && o.need < o.items.length) {
        // pick-any-order missions: a candy floats next to every item
        this._clusters = o.items.map((it, k) => V(...it).add(V(Math.sin(k * 2.4) * 5, 2, Math.cos(k * 2.4) * 5)));
        this._clusterFactor = o.need / o.items.length;
      } else if (o.type === 'collect') {
        const left = o.items.map(i => V(...i));
        for (let k = 0; k < o.need; k++) {
          let bi = 0, bd = Infinity;
          left.forEach((q, i) => { const dd = p.distanceTo(q); if (dd < bd) { bd = dd; bi = i; } });
          d += bd * 1.25; p = left.splice(bi, 1)[0];
        }
      } else if (o.type === 'chase') { d += 1500; }
    }
    const z = this.zone;
    const approach = z.center.clone().addScaledVector(z.dir, -z.len / 2 - 80);
    d += p.distanceTo(approach) * 1.3 + 140;
    return Math.ceil((d / 19 + 15) / 5) * 5;
  }

  // ------------------------------------------------------------ flow
  get currentObjective() { return this.objectives[this.objIndex] || null; }

  start() {
    this.phase = 'countdown';
    this.countdown = 3.2;
    this.lastCount = 4;
    this.app.input.recenter();
    const introKey = this.player === 'faris' ? 'introTruck' : isLittle(this.player) ? 'introBaby' : 'intro';
    this.chat(SCRIPTS[`${this.def.id}.${introKey}`] ? `${this.def.id}.${introKey}` : `${this.def.id}.intro`, { priority: 2 });
    this.updateHud(true);
  }

  /**
   * Play a little conversation between the passengers.
   * priority 0: chit-chat, skipped if someone is already talking; 1: normal; 2: important (always queued).
   */
  chat(key, { priority = 1 } = {}) {
    const variants = SCRIPTS[key];
    if (!variants) return;
    const busy = this.t < (this.chatBusy || 0);
    if (busy && priority === 0) return;
    // something important just happened: drop old chatter that hasn't been said yet, so the talk stays on time
    if (priority >= 2 && busy && this.chatBusy - this.t > 3) {
      // ...but let the conversation that's already going finish its last lines
      this.events = this.events.filter(e => !e.chat || e.conv === this.activeConv);
      this.chatBusy = Math.max(this.t, ...this.events.filter(e => e.chat).map(e => e.end));
    }
    const convId = (this.convCounter = (this.convCounter || 0) + 1);
    if (busy && priority === 1 && this.chatBusy - this.t > 4) return;
    // pick a conversation that works with this pilot (lines naming the pilot can't be said) and wasn't used lately
    this.usedConvs = this.usedConvs || {};
    const used = this.usedConvs[key] = this.usedConvs[key] || [];
    const ok = (conv) => conv.every(([spec]) => spec.includes('|') || ['little', 'five', 'big', 'plano', 'gso', 'any'].includes(spec) || spec !== this.player);
    let options = variants.map((c, i) => i).filter(i => ok(variants[i]) && !used.includes(i));
    if (!options.length) { used.length = 0; options = variants.map((c, i) => i).filter(i => ok(variants[i])); }
    if (!options.length) return;
    const pick = options[Math.floor(Math.random() * options.length)];
    used.push(pick);
    const conv = variants[pick];
    let at = Math.max(this.t + 0.1, this.chatBusy || 0);
    let prev = null;
    for (const [who0, text0] of conv) {
      const who = resolveSpeaker(who0, this.player, prev ? [prev] : []);
      if (!who) continue;
      const text = fillText(text0, who, this.player);
      const dur = 1.3 + text.length * 0.042;
      this.events.push({ at, end: at + dur + 0.2, chat: true, conv: convId, fn: () => { this.activeConv = convId; this.app.hud.say(who, text, (dur + 0.4) * 1000); this.talking = who; this.talkUntil = this.t + dur; } });
      at += dur + 0.2;
      prev = who;
    }
    this.chatBusy = at;
    this.lastChat = at;
  }

  respawnTo(p, h) {
    this.flight.reset(V(...(Array.isArray(p) ? p : [p.x, p.y, p.z])), h);
    this.syncPlane();
    const f = this.flight.forward();
    this.camPos.copy(this.flight.pos).addScaledVector(f, -10).add(V(0, 3.5, 0));
    this.camLook.copy(this.flight.pos).addScaledVector(f, 10);
  }

  syncPlane() {
    const F = this.flight;
    const g = this.plane.group;
    g.position.copy(F.pos);
    const tr = this.trickT > 0 ? (1 - this.trickT / 0.9) * Math.PI * 2 : 0;
    g.rotation.set(-F.p, F.h, F.r + tr, 'YXZ');
  }

  // ------------------------------------------------------------ main update (fixed step)
  step(dt) {
    this.t += dt;
    for (let i = this.events.length - 1; i >= 0; i--) if (this.events[i].at <= this.t) { const e = this.events.splice(i, 1)[0]; e.fn(); }
    this.world.update(dt, this.t);
    this.animateScenery(dt);
    this.honkCool = Math.max(0, (this.honkCool || 0) - dt);
    if (this.app.input.honk && this.honkCool <= 0 && this.phase !== 'crashed') { this.app.input.takeHonk(); this.honk(); }
    if (this.phase !== 'fly' && this.phase !== 'land' && this.app.input.trick) this.app.input.takeTrick(); // no surprise tricks later
    this.confetti.update(dt);
    this.puffs.update(dt);
    this.leaves.update(dt, this.t, this.flight.pos, this.world.isFall(this.flight.pos.z));
    this.shock.update(dt);
    this.fireworks.update(dt);
    if (this.squash > 0) {
      this.squash = Math.max(0, this.squash - dt);
      const k = Math.sin(this.squash / 0.4 * Math.PI) * 0.6;
      this.plane.body.scale.set(1 + 0.18 * k, 1 - 0.25 * k, 1 + 0.12 * k);
    } else this.plane.body.scale.set(1, 1, 1);

    if (this.phase === 'countdown') {
      this.countdown -= dt;
      const c = Math.ceil(this.countdown);
      if (c !== this.lastCount && c >= 0) {
        this.lastCount = c;
        this.app.hud.banner(c > 0 ? String(c) : 'GO!', 'count', 800);
        this.app.sound.countdown(c === 0);
      }
      if (this.countdown <= 0) { this.phase = 'fly'; this.app.sound.startEngine(); }
      this.updateCamera(dt);
      return;
    }
    if (this.phase === 'crashed') {
      this.crashT -= dt;
      this.updateDebris(dt);
      if (this.crashT <= 0) {
        this.debris.forEach(d => this.scene.remove(d));
        this.debris = [];
        this.plane.group.visible = true;
        this.tape = this.maxTape;
        this.invuln = 2;
        this.respawnTo(this.checkpoint.p.clone(), this.checkpoint.h);
        this.phase = this.objIndex >= this.objectives.length ? 'land' : 'fly';
        this.app.hud.banner('Taped back together!', 'good', 1500);
      }
      this.updateCamera(dt);
      return;
    }
    if (this.phase === 'landed') {
      const F = this.flight;
      F.speed = Math.max(0, F.speed - dt * 9);
      F.p = damp(F.p, 0, 6, dt); F.r = damp(F.r, 0, 6, dt);
      F.pos.addScaledVector(V(Math.sin(F.h), 0, Math.cos(F.h)), F.speed * dt);
      F.pos.y = this.groundAt(F.pos) + 0.35;
      this.syncPlane();
      this.plane.update(dt, F.speed, false);
      this.updateCamera(dt);
      this.landT -= dt;
      if (this.landT <= 0 && !this.finished) { this.finished = true; this.app.sound.stopEngine(); this.app.onMissionComplete(this.result); }
      return;
    }
    if (this.phase !== 'fly' && this.phase !== 'land') { this.updateCamera(dt); return; }

    this.time += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.talking && this.t > this.talkUntil) this.talking = null;
    if (this.phase === 'fly' && this.t - (this.lastChat || 0) > 9 && this.t > (this.chatBusy || 0)) this.chat(this.player === 'faris' && Math.random() < 0.4 ? 'truckBanter' : 'banter', { priority: 0 });
    // little reactions to boosting and juice
    const boostingNow = this.flight.boosting && !this.freeBoost;
    if (boostingNow && !this._wasBoosting && Math.random() < 0.35) this.chat('boost', { priority: 0 });
    this._wasBoosting = boostingNow;
    if (this.flight.juice < 0.12 && this.t - (this._juiceLowT || -99) > 30) { this._juiceLowT = this.t; this.chat('juiceLow', { priority: 0 }); }
    const F = this.flight;
    const easy = !this.autopilot && this.settings.easy === true;
    let input = this.autopilot ? this.autoInput() : this.app.input;
    if (easy) input = this.easyInput(input, dt);
    const opt = { cruise: this.spec.cruise || 1, turn: this.profile.upgrades.wings ? 1.7 : 1.35, maxRoll: (this.profile.upgrades.wings ? 58 : 50) * DEG, tank: this.profile.upgrades.blower, free: this.freeBoost > 0 };
    this.freeBoost = Math.max(0, this.freeBoost - dt);
    this.trickCool = Math.max(0, this.trickCool - dt);
    this.cheerT = Math.max(0, this.cheerT - dt);

    // landing approach helpers
    const landing = this.phase === 'land';
    let zl = null;
    if (landing) {
      zl = this.zoneLocal(F.pos);
      const alt = F.pos.y - this.groundAt(F.pos);
      if (zl.dist < this.zone.len / 2 + 160 && alt < 35) opt.slow = true;
      const assistOn = this.settings.assist || this.autopilot;
      const lined = Math.abs(wrapAngle(this.zone.h - F.h)) < 1.1; // only help when already heading the right way
      if (assistOn && lined && Math.abs(zl.x) < this.zone.wid / 2 + 24 && zl.z > -this.zone.len / 2 - 110 && zl.z < this.zone.len / 2 && alt < 20) {
        const sink = alt > 3 ? -2.2 : -0.9;
        opt.assist = { pitch: Math.asin(clamp(sink / Math.max(8, F.speed), -0.5, 0.2)), h: this.zone.h + clamp(zl.x * 0.04, -0.5, 0.5) };
      }
    }

    const roll = input.roll, pitch = input.pitch;
    F.step(dt, { roll, pitch, boost: input.boost }, opt);
    // landing helper: steer onto the centre line and level the wings
    if (opt.assist) {
      const e = wrapAngle(opt.assist.h - F.h);
      F.h += clamp(e, -0.6, 0.6) * dt * 1.2;
      F.r = damp(F.r, clamp(-e * 1.5, -0.3, 0.3), 2, dt);
    }
    // aim assist: gently curve toward the next ring / item
    if (this.phase === 'fly') {
      const T = this.currentTarget();
      if (T) {
        const dx = T.x - F.pos.x, dz = T.z - F.pos.z, dist = Math.hypot(dx, dz);
        const e = wrapAngle(Math.atan2(dx, dz) - F.h);
        const reach = this.easy ? 170 : 120, cone = this.easy ? 1.3 : 0.75, pull = this.easy ? 2.2 : 1.2;
        if (dist < reach && Math.abs(e) < cone) {
          F.h += clamp(e, -0.6, 0.6) * dt * pull;
          F.pos.y += clamp(T.y - F.pos.y, -8, 8) * dt * (dist < 60 ? (this.easy ? 1.2 : 0.6) : 0.3);
        }
      }
      // ground cushion: the plane politely refuses to fly into the ground
      const alt = F.pos.y - this.groundAt(F.pos);
      if (alt < 4.5) F.p = Math.max(F.p, (4.5 - alt) * 4 * DEG);
    }
    this.avoidObstacles(dt, easy || this.autopilot);
    // barrel roll trick!
    if (this.app.input.trick) { this.app.input.takeTrick(); if (this.trickCool <= 0 && F.pos.y - this.groundAt(F.pos) > 6) this.doTrick(); }
    if (this.trickT > 0) this.trickT = Math.max(0, this.trickT - dt);

    // world limits
    this.keepInBounds(dt);
    if (F.pos.y > 170) { F.p = Math.min(F.p, -0.1); }

    // collisions
    this.collide(dt);
    const g = this.groundAt(F.pos);
    const water = this.world.isWater(F.pos.x, F.pos.z);
    if (F.pos.y < g + 0.9) this.touchGround(g, water, zl);

    this.syncPlane();
    this.plane.update(dt, F.speed, F.boosting);
    this.app.sound.setEngine(F.speed, F.boosting);
    if (F.boosting && Math.floor(this.t * 60) % 2 === 0) {
      const tail = this.plane.group.localToWorld(this.plane.tail.clone());
      this.puffs.emit(tail, { size: 0.9, life: 0.7, grow: 1.6, fade: 0.65 });
    }
    this.updateCandies(dt);
    this.flightEffects(dt);

    // objectives & pickups
    this.updateObjective(dt);
    this.updatePickups();
    this.updateProgressEvents();
    this.updateArrow();
    this.updateCamera(dt);
    this.updateHud();
    this.prevPos = F.pos.clone();
  }

  groundAt(p) { return this.world.groundHeight(p.x, p.z); }

  zoneLocal(p) {
    const z = this.zone;
    const d = p.clone().sub(z.center);
    const fwd = z.dir, right = V(-fwd.z, 0, fwd.x);
    return { x: d.dot(right), z: d.dot(fwd), dist: Math.hypot(d.x, d.z) };
  }

  keepInBounds(dt) {
    const F = this.flight, B = this.spec.bounds;
    let back = null;
    if (B.corridor) {
      const px = B.path(F.pos.z);
      if (Math.abs(F.pos.x - px) > B.x) back = V(px, 0, F.pos.z + 60);
      if (F.pos.z < B.z0) back = V(px, 0, B.z0 + 200);
      if (F.pos.z > B.z1) back = V(B.path(B.z1 - 300), 0, B.z1 - 300);
    } else {
      const dx = F.pos.x - B.cx, dz = F.pos.z - B.cz;
      if (Math.hypot(dx, dz) > B.r) back = V(B.cx, 0, B.cz);
    }
    if (back) {
      const want = Math.atan2(back.x - F.pos.x, back.z - F.pos.z);
      F.h += clamp(wrapAngle(want - F.h), -1, 1) * dt * 1.6;
      F.r = damp(F.r, 0, 3, dt);
      if (!this.boundsMsgT || this.t - this.boundsMsgT > 4) { this.boundsMsgT = this.t; this.app.hud.banner('Too far! Turning back', 'warn', 1500); }
    }
  }

  collide() {
    const F = this.flight;
    const p = F.pos;
    for (const c of this.world.colliders) {
      if (c.type === 'box') {
        const m = 1.3;
        if (p.x > c.min.x - m && p.x < c.max.x + m && p.y > c.min.y - m && p.y < c.max.y + m && p.z > c.min.z - m && p.z < c.max.z + m) {
          const pen = [
            [p.x - (c.min.x - m), V(-1, 0, 0)], [(c.max.x + m) - p.x, V(1, 0, 0)],
            [(c.max.y + m) - p.y, V(0, 1, 0)], [p.y - (c.min.y - m), V(0, -1, 0)],
            [p.z - (c.min.z - m), V(0, 0, -1)], [(c.max.z + m) - p.z, V(0, 0, 1)],
          ].sort((a, b) => a[0] - b[0])[0];
          p.addScaledVector(pen[1], pen[0] + 0.3);
          this.bounce(pen[1]);
        }
      } else {
        const d = p.distanceTo(c.c), r = c.r + 1.4;
        if (d < r) {
          const n = p.clone().sub(c.c).normalize();
          p.addScaledVector(n, r - d + 0.3);
          this.bounce(n);
        }
      }
    }
  }

  bounce(n) {
    const F = this.flight;
    const f = F.forward();
    if (n.y > 0.7) { F.p = 12 * DEG; }
    else {
      const flat = V(n.x, 0, n.z).normalize();
      const vf = V(f.x, 0, f.z);
      const dot = vf.dot(flat);
      if (dot < 0) vf.addScaledVector(flat, -2 * dot);
      F.h = Math.atan2(vf.x, vf.z);
      if (n.y < -0.5) F.p = -10 * DEG;
    }
    F.speed = Math.max(12, F.speed * 0.75);
    this.hurt('bump');
  }

  touchGround(g, water, zl) {
    const F = this.flight;
    const Z = this.zone;
    if (this.phase === 'land' && zl) {
      const inZone = this.easy ? Math.abs(zl.x) < Z.wid / 2 + 22 && Math.abs(zl.z) < Z.len / 2 + 45 : Math.abs(zl.x) < Z.wid / 2 + 7 && Math.abs(zl.z) < Z.len / 2 + 12;
      const okSurface = Z.water ? (water && this.profile.upgrades.floats) : !water;
      if (inZone && okSurface) {
        const vs = F.vy;
        const rollOk = this.easy || Math.abs(F.r) < 45 * DEG;
        if ((this.easy ? vs > -9 : vs > -5) && rollOk) {
          const grade = this.easy ? (vs > -3.6 ? 'butter' : 'bumpy') : vs > -2.2 ? 'butter' : vs > -3.4 ? 'bumpy' : 'pancake';
          this.land(grade);
          return;
        }
        this.app.hud.banner('Lawn Dart! Come in more gently', 'warn', 1800);
        this.chat('lawndart', { priority: 1 });
      }
    }
    F.pos.y = g + 1.4;
    if (water && !this.noDamage) this.splash(F.pos);
    this.bounce(V(0, 1, 0));
  }

  hurt(kind) {
    this.shake = 0.5;
    this.squash = 0.4;
    this.app.hud.comic(['BONK!', 'POW!', 'BOING!', 'OOF!', 'THUD!'][Math.floor(Math.random() * 5)]);
    if (this.invuln > 0) return;
    this.invuln = 1.6;
    this.bumps++;
    this.app.sound.bump();
    if (this.noDamage) return;
    this.tape -= 1;
    this.app.hud.damage();
    if (this.tape <= 0) { this.crash(); return; }
    if (this.tape === 1) this.chat('tapeLow', { priority: 1 });
    else if (Math.random() < 0.6) this.chat('bump', { priority: 0 });
    void kind;
  }

  crash() {
    this.crashes++;
    this.phase = 'crashed';
    this.crashT = 2.2;
    this.app.sound.crash();
    this.app.hud.banner('It fell apart!', 'bad', 1800);
    this.chat('crash', { priority: 1 });
    this.plane.group.visible = false;
    const mat = new THREE.MeshStandardMaterial({ color: 0xc89a5c, roughness: 0.9 });
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.3 + Math.random() * 0.8, 0.05, 0.3 + Math.random() * 0.8), i % 4 === 0 ? new THREE.MeshStandardMaterial({ color: [0xff5fa2, 0xffd23f, 0x3fc5ff][i % 3] }) : mat);
      m.position.copy(this.flight.pos);
      m.userData.v = V((Math.random() - 0.5) * 14, 4 + Math.random() * 8, (Math.random() - 0.5) * 14);
      m.userData.w = V(Math.random() * 8, Math.random() * 8, Math.random() * 8);
      this.scene.add(m);
      this.debris.push(m);
    }
  }
  updateDebris(dt) {
    for (const d of this.debris) {
      d.userData.v.y -= 15 * dt;
      d.position.addScaledVector(d.userData.v, dt);
      const g = this.groundAt(d.position) + 0.05;
      if (d.position.y < g) { d.position.y = g; d.userData.v.multiplyScalar(0.3); }
      d.rotation.x += d.userData.w.x * dt; d.rotation.y += d.userData.w.y * dt;
    }
  }

  splash(p) {
    this.app.sound.splash();
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xe8f6ff, transparent: true, depthWrite: false }));
      s.position.copy(p).setY(0.5);
      s.scale.setScalar(2);
      s.userData = { v: V((Math.random() - 0.5) * 8, 4 + Math.random() * 6, (Math.random() - 0.5) * 8), life: 1 };
      this.scene.add(s);
      this.splashes.push(s);
    }
  }

  land(grade) {
    const F = this.flight;
    this.phase = 'landed';
    this.landT = 2.6;
    F.pos.y = this.groundAt(F.pos) + 0.35;
    if (this.zone.water) this.splash(F.pos);
    const msgs = { butter: 'BUTTER LANDING!', bumpy: 'Bumpy landing!', pancake: 'Pancake landing!' };
    this.app.hud.banner(msgs[grade], grade === 'butter' ? 'good' : 'ok', 2400);
    this.app.sound.fanfare();
    this.events = this.events.filter(e => !e.chat);
    this.chatBusy = this.t;
    this.chat(grade === 'butter' ? 'landedButter' : 'landedOk', { priority: 2 });
    this.addScore({ butter: 300, bumpy: 150, pancake: 60 }[grade], grade === 'butter' ? 'Butter bonus' : 'Landing');
    this.confetti.burst(F.pos.clone().add(V(0, 2, 0)), 160, 12, 9, 1.4);
    this.fireworks.launch(F.pos.clone().addScaledVector(V(Math.sin(F.h), 0, Math.cos(F.h)), 40), 7);
    this.puffs.sparkle(F.pos.clone().add(V(0, 2, 0)), 30, 6);
    this.cheerT = 2.5;
    const stars = [true, this.candiesGot >= this.candyNeed, grade === 'butter'];
    this.result = { id: this.def.id, grade, time: this.time, targetTime: this.targetTime, stars, sock: this.sockFound, bumps: this.bumps, crashes: this.crashes, score: this.score, candies: this.candiesGot, candyNeed: this.candyNeed, candyTotal: this.candies.length };
  }

  // ------------------------------------------------------------ objectives
  updateObjective(dt) {
    const o = this.currentObjective;
    const F = this.flight;
    if (!o) return;
    if (o.type === 'rings') {
      const i = o.count;
      o.meshes.forEach((g, k) => {
        const active = k === i;
        g.visible = k >= i;
        g.userData.torus.material.opacity = active ? 1 : 0.35;
        g.userData.glow.visible = active;
        if (active) { const s = 1 + Math.sin(this.t * 6) * 0.06; g.userData.torus.scale.setScalar(s); }
      });
      const g = o.meshes[i];
      const closeMiss = this.easy && g && (() => { // flew right past it? close enough!
        const d = g.userData.c.clone().sub(F.pos), fwd = F.forward();
        return d.dot(fwd) < -2 && Math.hypot(d.x, d.z) < 40 && Math.abs(d.y) < 30;
      })();
      if (g && (this.passedThrough(g.userData.c, g.userData.r + (this.easy ? 8 : 1.2)) || closeMiss)) {
        o.count++;
        this.app.sound.ring();
        this.checkpoint = { p: g.userData.c.clone(), h: F.h };
        if (F.juice < 1) F.juice = Math.min(1, F.juice + 0.15);
        this.freeBoost = 1.0;
        this.confetti.burst(g.userData.c.clone().addScaledVector(F.forward(), 9), 60, 8, 4);
        this.shock.spawn(g.userData.c, g.quaternion, g.userData.r - 3, 0xffffff);
        this.app.hud.flash();
        this.fovKick = 9;
        this.app.sound.whoosh();
        this.cheerT = 0.8;
        this.pickup(100, o.photo && o.photo.includes(o.count - 1) ? 'Click! 📸' : 'Ring!');
        if (SCRIPTS[`${this.def.id}.at${o.count}`]) this.chat(`${this.def.id}.at${o.count}`, { priority: 2 });
        else if (o.count < o.total && Math.random() < 0.4) this.chat('ring', { priority: 0 });
        if (o.count >= o.total) this.completeObjective();
      }
    } else if (o.type === 'collect') {
      for (const it of o.items) {
        if (it.got) continue;
        if (it.m.position.distanceTo(F.pos) < o.r + (this.easy ? 5 : 0)) {
          it.got = true;
          it.m.visible = false;
          o.count++;
          this.app.sound.ring();
          this.confetti.burst(it.m.position.clone().addScaledVector(F.forward(), 8), 40, 7, 4);
          this.pickup(100, o.kind === 'firefly' ? 'Firefly!' : 'Delivered! 🍦');
          this.checkpoint = { p: F.pos.clone(), h: F.h };
          if (SCRIPTS[`${this.def.id}.at${o.count}`]) this.chat(`${this.def.id}.at${o.count}`, { priority: 2 });
          if (o.count >= o.total) { this.completeObjective(); break; }
        }
      }
    } else if (o.type === 'chase') {
      o.cool = Math.max(0, o.cool - dt);
      const tp = o.target.position;
      const alt = F.pos.y - this.groundAt(F.pos);
      if (o.cool <= 0 && Math.hypot(tp.x - F.pos.x, tp.z - F.pos.z) < o.r * (this.easy ? 1.6 : 1) && alt < o.maxAlt * (this.easy ? 1.5 : 1)) {
        o.count++;
        o.cool = 2.5;
        o.onTag && o.onTag();
        this.app.sound.ring();
        this.confetti.burst(tp.clone().add(V(0, 6, 0)), 90, 12, 8);
        this.cheerT = 1.2;
        this.pickup(200, 'TAG!');
        this.checkpoint = { p: F.pos.clone().setY(Math.max(F.pos.y, this.groundAt(F.pos) + 25)), h: F.h };
        this.chat('ring', { priority: 0 });
        if (o.count >= o.total) { o.marker.visible = false; this.completeObjective(); }
      }
    }
  }

  passedThrough(c, r) {
    const p = this.flight.pos, q = this.prevPos || p;
    const seg = p.clone().sub(q);
    const len2 = seg.lengthSq();
    let t = len2 > 0 ? c.clone().sub(q).dot(seg) / len2 : 0;
    t = clamp(t, 0, 1);
    return q.clone().addScaledVector(seg, t).distanceTo(c) < r;
  }

  completeObjective() {
    const o = this.currentObjective;
    o.done = true;
    this.fireworks.launch(this.flight.pos.clone().addScaledVector(this.flight.forward(), 60).setY(this.groundAt(this.flight.pos)), 3);
    this.app.hud.flash();
    o.meshes.forEach(m => (m.visible = false));
    this.objIndex++;
    if (this.objIndex >= this.objectives.length) {
      this.phase = 'land';
      this.zone.g.visible = true;
      this.app.hud.banner(this.spec.landing.text, 'good', 2600);
      this.chat(`${this.def.id}.land`, { priority: 2 });
    }
    this.updateHud(true);
  }

  // ------------------------------------------------------------ candy trail, score, combos, tricks
  makeCandies() {
    const S = this.spec;
    const pts = [V(...S.spawn.p)];
    for (const o of S.objectives) {
      if (o.type === 'rings') o.rings.forEach(r => pts.push(V(...r)));
      else if (o.type === 'collect' && o.need < o.items.length) {
        // pick-any-order missions: a candy floats next to every item
        this._clusters = o.items.map((it, k) => V(...it).add(V(Math.sin(k * 2.4) * 5, 2, Math.cos(k * 2.4) * 5)));
        this._clusterFactor = o.need / o.items.length;
      } else if (o.type === 'collect') {
        const left = o.items.map(i => V(...i));
        let p = pts[pts.length - 1];
        while (left.length) {
          let bi = 0, bd = Infinity;
          left.forEach((q, i) => { const d = p.distanceTo(q); if (d < bd) { bd = d; bi = i; } });
          p = left.splice(bi, 1)[0];
          pts.push(p);
        }
      }
    }
    if (S.candyPath) S.candyPath.forEach(c => pts.push(V(...c)));
    const spacing = S.candySpacing || (S.bounds.corridor ? 70 : 24);
    const blocked = (q) => this.world.colliders.some(c => c.type === 'box'
      ? q.x > c.min.x - 4 && q.x < c.max.x + 4 && q.y > c.min.y - 4 && q.y < c.max.y + 4 && q.z > c.min.z - 4 && q.z < c.max.z + 4
      : q.distanceTo(c.c) < c.r + 4);
    const out = [];
    const cap = S.candyCap || 46;
    for (let i = 0; i < pts.length - 1 && out.length < cap; i++) {
      const a = pts[i], b = pts[i + 1], len = a.distanceTo(b);
      const n = Math.floor(len / spacing);
      const side = V(-(b.z - a.z), 0, b.x - a.x).normalize();
      for (let k = 1; k < n && out.length < cap; k++) {
        const t = k / n;
        const q = a.clone().lerp(b, t).addScaledVector(side, Math.sin(t * Math.PI * 2) * 4);
        q.y += Math.sin(t * Math.PI) * 3;
        if (i === 0 && a.distanceTo(q) < 40) continue;
        q.y = Math.max(q.y, this.groundAt(q) + 5);
        if (blocked(q)) continue;
        out.push(q);
      }
    }
    if (this._clusters) for (const q of this._clusters) { q.y = Math.max(q.y, this.groundAt(q) + 5); if (!blocked(q)) out.push(q); }
    this.candyPool = candyPool(this.scene, out.length);
    this.candies = out.map((q, i) => {
      const m = this.candyPool.items[i];
      m.position.copy(q);
      m.userData.base = q.clone();
      return m;
    });
    const chase = S.objectives.some(o => o.type === 'chase');
    const ratio = S.candyRatio || (chase ? 0.25 : this._clusters ? this._clusterFactor * 0.7 : 0.6);
    this.candyNeed = Math.max(1, Math.ceil(this.candies.length * ratio * (this.settings.easy === true ? 0.7 : 1)));
  }

  updateCandies(dt) {
    const F = this.flight;
    for (const c of this.candies) {
      if (!c.visible) continue;
      const d = c.position.distanceTo(F.pos);
      const mag = this.easy ? 22 : 13;
      if (d < mag) c.position.lerp(F.pos, Math.min(1, dt * 7 * (mag - d) / 6)); // candy magnet
      if (d < (this.easy ? 6 : 4.5)) {
        c.visible = false;
        this.candiesGot++;
        this.puffs.sparkle(c.position, 8, 2);
        this.pickup(25, null);
        if (this.candiesGot === this.candyNeed) { this.app.hud.banner('Candy star! ⭐🍬', 'good', 1600); this.app.sound.fanfare(); this.chat('candyStar', { priority: 0 }); }
      }
    }
  }

  pickup(points, label) {
    if (this.t - this.lastPickT < 2.6) this.combo++; else this.combo = 1;
    this.lastPickT = this.t;
    const bonus = this.combo >= 3 ? this.combo * 10 : 0;
    this.addScore(points + bonus, label);
    this.app.sound.candy(this.combo);
    if (this.combo >= 3 && (this.combo === 3 || this.combo % 5 === 0)) {
      this.app.hud.combo(this.combo);
      if (this.combo >= 5) this.fireworks.launch(this.flight.pos.clone().addScaledVector(this.flight.forward(), 70).setY(this.groundAt(this.flight.pos)), 2);
      if (this.combo >= 10) this.chat('combo', { priority: 0 });
    }
  }

  addScore(n, label) {
    this.score += n;
    this.app.hud.popScore(`+${n}${label ? ' ' + label : ''}`);
  }

  honk() {
    const truck = this.plane.kind === 'truck';
    this.honkCool = truck ? 0.6 : 0.45;
    if (truck) this.app.sound.honkTruck(); else this.app.sound.honkPlane();
    this.app.hud.comic(truck ? 'HOOONK!' : 'HONK HONK!');
    // a ring of sound puffs from the front
    const nose = this.plane.group.localToWorld(V(0, 1, truck ? 3.6 : 3.2));
    for (let k = 0; k < 10; k++) {
      const a = k / 10 * Math.PI * 2, d = V(Math.cos(a), Math.sin(a), 0).applyQuaternion(this.plane.group.quaternion);
      this.puffs.emit(nose, { color: truck ? 0.55 : 0.13, size: 0.8, life: 0.45, v: d.multiplyScalar(9), grow: 0.6, light: 0.75 });
    }
    this.cheerT = Math.max(this.cheerT, 0.6);
    this.honks = (this.honks || 0) + 1;
    if (this.honks === 1 || Math.random() < 0.45) this.chat(truck ? 'honkTruck' : 'honk', { priority: 0 });
  }

  doTrick() {
    this.trickT = 0.9;
    this.trickCool = 1.4;
    this.app.sound.trick();
    this.confetti.burst(this.plane.group.localToWorld(V(0, 1.5, 4)), 30, 7, 2);
    this.cheerT = 1;
    this.pickup(150, 'Barrel roll!');
    this.chat('trick', { priority: 0 });
  }

  // ------------------------------------------------------------ easy flying
  easyInput(inp, dt) {
    const ai = this.autoInput();
    const idle = Math.abs(inp.roll) < 0.15 && Math.abs(inp.pitch) < 0.15;
    this.idleT = idle ? (this.idleT || 0) + dt : 0;
    const out = { roll: inp.roll, pitch: inp.pitch, boost: inp.boost, trick: inp.trick };
    // height is automatic unless the kid pushes up or down
    if (Math.abs(inp.pitch) < 0.25) out.pitch = ai.pitch;
    // landing: let go of the stick and the plane lands itself
    if (this.phase === 'land') { out.roll = ai.roll; out.pitch = ai.pitch; out.boost = false; } // landing is fully automatic
    // flying: let go of the stick and the plane flies to the next target by itself
    else if (this.phase === 'fly' && this.idleT > 0.3) out.roll = ai.roll * Math.min(1, (this.idleT - 0.3) * 2);
    // light steering gets a helping hand toward the target too
    else if (this.phase === 'fly' && Math.abs(inp.roll) < 0.6) out.roll = clamp(inp.roll + ai.roll * 0.35, -1, 1);
    if (this.phase === 'land' && !this.landTipT) { this.landTipT = 1; this.chat('autoland', { priority: 1 }); }
    return out;
  }

  blockedAt(q, m = 3) {
    for (const c of this.world.colliders) {
      if (c.type === 'box') {
        if (q.x > c.min.x - m && q.x < c.max.x + m && q.y > c.min.y - m && q.y < c.max.y + m && q.z > c.min.z - m && q.z < c.max.z + m) return c;
      } else if (q.distanceTo(c.c) < c.r + m) return c;
    }
    return null;
  }

  /** look ahead and hop over (or steer around) buildings, trees and balloons */
  avoidObstacles(dt, strong) {
    const F = this.flight;
    if (this.phase === 'land' && this.zoneLocal(F.pos).dist < this.zone.len / 2 + 70) return;
    const f = F.forward();
    const T = this.phase === 'fly' ? this.currentTarget() : null;
    for (const d of strong ? [12, 24, 38] : [12, 22]) {
      const q = F.pos.clone().addScaledVector(f, d);
      if (T && (q.distanceTo(T) < 22 || F.pos.distanceTo(T) < d)) break; // flying through/under something on purpose (e.g. the bridge ring)
      const c = this.blockedAt(q);
      if (!c) continue;
      const top = c.type === 'box' ? c.max.y : c.c.y + c.r;
      const climb = (strong ? 16 : 9) * (1 - d / 50);
      F.pos.y += climb * dt;
      F.p = Math.max(F.p, 14 * DEG);
      if (strong && top > F.pos.y + 18) {
        const center = c.type === 'box' ? c.min.clone().add(c.max).multiplyScalar(0.5) : c.c;
        const right = V(-Math.cos(F.h), 0, Math.sin(F.h));
        const side = Math.sign(center.clone().sub(F.pos).dot(right)) || 1;
        F.h += side * 1.1 * dt; // obstacle on the right: turn left, and vice versa
      }
      break;
    }
  }

  flightEffects(dt) {
    const F = this.flight, g = this.plane.group;
    const frame = Math.floor(this.t * 60);
    this.app.hud.speedLines(F.boosting);
    if (frame % 3 === 0) {
      for (const tip of this.plane.tips) this.puffs.emit(g.localToWorld(tip.clone()), this.plane.kind === 'truck' ? { color: 0.52, size: 0.7, life: 0.5, grow: 1, light: 0.75, fade: 0.6 } : { size: 0.45, life: 0.45, grow: 0.8, light: 0.97, sat: 0.1, fade: 0.55 });
    }
    const alt = F.pos.y - this.groundAt(F.pos);
    if (alt < 8 && this.world.isWater(F.pos.x, F.pos.z) && frame % 2 === 0) {
      this.puffs.emit(V(F.pos.x + (Math.random() - 0.5) * 3, 0.6, F.pos.z + (Math.random() - 0.5) * 3), { size: 1.6, life: 0.6, grow: 1.2, light: 0.95, sat: 0.3, fade: 0.8, v: V(0, 4 + Math.random() * 3, 0) });
    }
    if (this.cheerT > 0 && !this._cheering && this.pilotModel) {
      const head = new THREE.Vector3();
      this.pilotModel.userData.head.getWorldPosition(head);
      this.puffs.sparkle(head.add(V(0, 0.8, 0)), 10, 1.2);
    }
    this._cheering = this.cheerT > 0;
  }

  updatePickups() {
    const F = this.flight;
    for (const j of this.juices) {
      if (!j.visible) continue;
      const dj = j.position.distanceTo(F.pos);
      if (dj < 14) j.position.lerp(F.pos, Math.min(1, 6 / 60 * (14 - dj) / 4));
      if (dj < 5) {
        j.visible = false;
        F.juice = Math.min(1, F.juice + 0.35);
        this.app.sound.pickup();
        this.puffs.sparkle(j.position, 10, 2);
        if (Math.random() < 0.35) this.chat('juice', { priority: 0 });
        this.app.hud.banner('+ Juice!', 'juice', 700);
      }
    }
    if (this.sock && this.sock.visible && this.sock.position.distanceTo(F.pos) < 6) {
      this.sock.visible = false;
      this.sockFound = true;
      this.app.sound.sockFound();
      this.confetti.burst(this.sock.position, 80, 12, 6);
      this.addScore(500, 'Lost sock!');
      this.app.hud.banner('You found a LOST SOCK! 🧦', 'good', 2200);
      this.chat('sock', { priority: 1 });
    }
  }

  updateProgressEvents() {
    if (!this.progress.length) return;
    const z = this.flight.pos.z;
    while (this.progress.length && z > this.progress[0][0]) {
      const [, key] = this.progress.shift();
      this.chat(`${this.def.id}.${key}`, { priority: 2 });
      if (key.startsWith('state:')) this.app.hud.banner('Welcome to ' + key.slice(6) + '!', 'good', 2200);
    }
  }

  currentTarget() {
    const o = this.currentObjective;
    const F = this.flight;
    if (this.phase === 'land' || !o) {
      const z = this.zone;
      const zl = this.zoneLocal(F.pos);
      if (zl.z < -z.len / 2 && zl.z > -z.len / 2 - 160 && Math.abs(zl.x) < 30 && Math.abs(wrapAngle(z.h - F.h)) < 0.9) return z.center.clone().addScaledVector(z.dir, -z.len * 0.25);
      return z.center.clone().addScaledVector(z.dir, -z.len / 2 - 110).setY(z.y + 22);
    }
    if (o.type === 'rings') return o.meshes[o.count]?.userData.c.clone();
    if (o.type === 'collect') {
      let best = null, bd = Infinity;
      for (const it of o.items) if (!it.got) { const d = it.m.position.distanceTo(F.pos); if (d < bd) { bd = d; best = it.m.position; } }
      return best && best.clone();
    }
    if (o.type === 'chase') return o.target.position.clone().setY(this.groundAt(o.target.position) + 7);
    return null;
  }

  updateArrow() {
    const T = this.currentTarget();
    const F = this.flight;
    if (!T) { this.arrow.visible = false; return; }
    this.arrow.visible = true;
    const f = F.forward();
    this.arrow.position.copy(F.pos).addScaledVector(f, 9).add(V(0, 4.2, 0));
    this.arrow.lookAt(T);
  }

  animateScenery(dt) {
    const t = this.t;
    for (const j of this.juices) { j.rotation.y += dt * 2; j.position.y += Math.sin(t * 3 + j.position.x) * 0.01; }
    if (this.sock) this.sock.rotation.y += dt * 1.5;
    if (this.candies) for (const c of this.candies) { if (!c.visible) continue; c.rotation.y += dt * 3; c.rotation.z = Math.sin(t * 2 + c.userData.base.x) * 0.4; }
    this.candyPool?.sync();
    this.juicePool?.sync();
    for (const o of this.objectives || []) if (o.type === 'rings') o.meshes.forEach((g, k) => { if (k === o.count) g.userData.torus.rotation.z += dt * 1.5; });
    if (this.hat) this.hat.position.y = 0.3 + Math.sin(t * 2) * 0.12;
    for (const o of this.objectives) {
      if (o.type === 'collect') for (const it of o.items) {
        const b = it.m.userData.base, ph = it.m.userData.phase;
        if (o.kind === 'firefly') {
          it.m.position.set(b.x + Math.sin(t * 0.7 + ph) * 3, b.y + Math.sin(t * 1.1 + ph) * 1.5, b.z + Math.cos(t * 0.6 + ph) * 3);
          const s = 0.6 + 0.5 * Math.max(0, Math.sin(t * 3 + ph * 2));
          it.m.children[1].scale.set(4 * s + 1, 4 * s + 1, 1);
        } else it.m.rotation.y += dt;
      }
    }
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      s.userData.v.y -= 15 * dt;
      s.position.addScaledVector(s.userData.v, dt);
      s.userData.life -= dt;
      s.material.opacity = Math.max(0, s.userData.life);
      if (s.userData.life <= 0) { this.scene.remove(s); this.splashes.splice(i, 1); }
    }
    // the crew looks around
    if (this.pilotModel) {
      const hd = this.pilotModel.userData.head;
      hd.rotation.y = damp(hd.rotation.y, -this.flight.r * 0.6, 3, dt);
      hd.rotation.z = damp(hd.rotation.z, -this.flight.r * 0.3, 3, dt);
    }
    // passengers look around; whoever is talking turns toward the pilot
    (this.passengers || []).forEach((m, i) => {
      const hd = m.userData.head;
      const talking = this.talking === this.crew[i][0];
      hd.rotation.y = talking ? damp(hd.rotation.y, (m.parent.position.x > 0 ? 0.35 : -0.35), 6, dt) : Math.sin(t * 0.5 + i * 1.7) * 0.5;
      hd.rotation.x = talking ? Math.sin(t * 14) * 0.05 : 0;
    });
    // happy bouncing, and big cheers when something good happens
    const jump = this.cheerT > 0 ? Math.abs(Math.sin(this.cheerT * 9)) * 0.14 : 0;
    for (const [m, ph] of [[this.pilotModel, 0], ...(this.passengers || []).map((p, i) => [p, 1.3 + i * 0.9])]) {
      if (!m) continue;
      if (m.userData.baseY === undefined) m.userData.baseY = m.position.y;
      m.position.y = m.userData.baseY + Math.abs(Math.sin(t * 4 + ph)) * 0.025 + jump;
      m.rotation.z = Math.sin(t * 2 + ph) * 0.04 + (this.cheerT > 0 ? Math.sin(this.cheerT * 12) * 0.08 : 0);
    }
    if (this.zone && this.zone.g.visible) this.zone.g.children.forEach((c, i) => { if (c.geometry && c.geometry.type === 'PlaneGeometry' && c.material.side === THREE.DoubleSide) c.rotation.y = Math.sin(t * 6 + i) * 0.35; });
  }

  updateCamera(dt) {
    const F = this.flight;
    const f = F.forward();
    const flat = V(f.x, 0, f.z).normalize();
    const right = V(-flat.z, 0, flat.x);
    const landed = this.phase === 'landed';
    const tall = this.camera.aspect < 1;
    const dist = (landed ? 12 : 10 + (F.boosting ? 1.8 : 0)) + (tall ? 1.4 : 0); // the squad's plane is big
    const want = F.pos.clone().addScaledVector(flat, -dist).add(V(0, (landed ? 4.6 : 3.4 - F.p * 3) + (tall ? 0.8 : 0), 0)).addScaledVector(right, F.r * 1.2);
    const g = this.groundAt(want) + 1.5;
    if (want.y < g) want.y = g;
    let look = F.pos.clone().addScaledVector(f, 10).add(V(0, 1.4, 0));
    if (this.phase === 'countdown') {
      // swoop around from the front of the plane to behind it
      const k = clamp(1 - this.countdown / 3.2, 0, 1), e = k * k * (3 - 2 * k);
      const off = want.clone().sub(F.pos).applyAxisAngle(UP, (1 - e) * Math.PI * 1.15);
      want.copy(F.pos).add(off.multiplyScalar(1 - 0.35 * (1 - e))).add(V(0, (1 - e) * 1.5, 0));
      look = F.pos.clone().add(V(0, 1, 0)).lerp(look, e);
      this.camPos.copy(want); this.camLook.copy(look);
    } else if (dt === 0) { this.camPos.copy(want); this.camLook.copy(look); }
    this.camPos.lerp(want, 1 - Math.exp(-5 * dt));
    this.camLook.lerp(look, 1 - Math.exp(-7 * dt));
    this.camera.position.copy(this.camPos);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      this.camera.position.add(V((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(this.shake));
    }
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.camLook);
    this.camera.rotateZ(-F.r * 0.25);
    this.fovKick = Math.max(0, this.fovKick - dt * 18);
    const baseFov = this.camera.aspect < 1 ? 74 : 62; // taller screen: wider view so you can see where you're going
    const fov = baseFov + (F.boosting ? 10 : 0) + this.fovKick;
    if (Math.abs(this.camera.fov - fov) > 0.1) { this.camera.fov = lerp(this.camera.fov, fov, 1 - Math.exp(-3 * dt)); this.camera.updateProjectionMatrix(); }
    this.world.follow(F.pos);
    this.puffs.setScale(this.camera, this.app.renderer.getDrawingBufferSize(new THREE.Vector2()).y);
  }

  updateHud(force = false) {
    const hud = this.app.hud;
    const o = this.currentObjective;
    if (this.phase === 'land' || !o) hud.setObjective('🛬', this.spec.landing.text);
    else hud.setObjective(o.type === 'rings' ? (o.style === 'photo' ? '📷' : o.style === 'waypoint' ? '🗺️' : '⭕') : o.kind === 'firefly' ? '✨' : o.kind === 'icecream' ? '🍦' : '🌰', `${o.label} ${o.count}/${o.total}`);
    hud.setScore(this.score);
    hud.setCandy(this.candiesGot, this.candyNeed);
    hud.setTape(this.tape, this.maxTape, this.noDamage);
    hud.setJuice(this.flight.juice);
    if (this.phase === 'land') {
      const zl = this.zoneLocal(this.flight.pos);
      const near = zl.dist < this.zone.len / 2 + 120;
      const alt = this.flight.pos.y - this.groundAt(this.flight.pos);
      hud.setLandMeter(near && alt < 30 ? this.flight.vy : null);
    } else hud.setLandMeter(null);
    void force;
  }

  // ------------------------------------------------------------ autopilot (used by tests and the title demo)
  autoInput() {
    const F = this.flight;
    let T = this.currentTarget();
    const out = { roll: 0, pitch: 0, boost: false };
    if (!T) return out;
    let wantAlt = T.y;
    if (this.phase === 'land') {
      const z = this.zone;
      const zl = this.zoneLocal(F.pos);
      if (zl.z > -z.len / 2 - 140 && zl.z < z.len / 2 - 10 && Math.abs(zl.x) < 25 && Math.abs(wrapAngle(z.h - F.h)) < 0.9) {
        // on final: track the centreline and descend
        const aim = z.center.clone().addScaledVector(z.dir, Math.min(z.len / 2, zl.z + 40));
        aim.addScaledVector(V(-z.dir.z, 0, z.dir.x), 0);
        T = aim;
        const toTouch = -z.len * 0.3 - zl.z;
        wantAlt = z.y + Math.max(0, toTouch * 0.12) + 0.2;
      }
    }
    const want = Math.atan2(T.x - F.pos.x, T.z - F.pos.z);
    const err = wrapAngle(want - F.h);
    const dist = Math.hypot(T.x - F.pos.x, T.z - F.pos.z);
    const R = F.speed / (1.15 * Math.sin(50 * DEG));
    out.roll = clamp(-err * 2.4, -1, 1);
    if (dist < 2.1 * R * Math.abs(Math.sin(err)) && Math.abs(err) > 0.5) out.roll = 0;
    const g = this.groundAt(F.pos);
    const ahead = F.pos.clone().addScaledVector(F.forward(), 40);
    const minAlt = Math.max(g, this.groundAt(ahead)) + (this.phase === 'land' ? 0 : 8);
    wantAlt = Math.max(wantAlt, minAlt);
    const pt = clamp((wantAlt - F.pos.y) * 0.05, -0.55, 0.55);
    out.pitch = clamp((pt - F.p) * 4, -1, 1);
    out.boost = this.phase !== 'land' && F.juice > 0.5 && dist > 150;
    return out;
  }

  dispose() {
    this.app.sound.stopEngine();
    if (this.pilotModel) this.pilotModel.parent?.remove(this.pilotModel);
    (this.passengers || []).forEach(m => m.parent?.remove(m));
    this.world.dispose();
    this.scene.traverse(o => { if (o.geometry && !o.userData.keep) o.geometry.dispose?.(); });
  }
}

export { BASE_SPEED };
