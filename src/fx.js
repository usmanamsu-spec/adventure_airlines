// Fun effects: confetti, rainbow boost trail, sparkles, birds, cars and candies.
import * as THREE from 'three';
import { glowTexture } from './world/props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const RAINBOW = [0xff4f6a, 0xff9a3f, 0xffd23f, 0x5fd35a, 0x3fb8ff, 0x8a5cff, 0xff6ad5];

// ---------------------------------------------------------------- confetti (one instanced mesh)
export class Confetti {
  constructor(scene, max = 500) {
    const geo = new THREE.PlaneGeometry(0.24, 0.15);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.max = max;
    this.parts = [];
    this.next = 0;
    const c = new THREE.Color();
    for (let i = 0; i < max; i++) {
      this.parts.push({ p: V(0, -999, 0), v: V(), r: V(), w: V(), life: 0, s: 1 });
      this.mesh.setColorAt(i, c.set(RAINBOW[i % RAINBOW.length]));
    }
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.sc = V(1, 1, 1);
    scene.add(this.mesh);
  }
  burst(pos, n = 40, speed = 9, up = 6, scale = 1) {
    for (let k = 0; k < n; k++) {
      const p = this.parts[this.next];
      this.next = (this.next + 1) % this.max;
      p.p.copy(pos);
      const a = Math.random() * Math.PI * 2, b = Math.random() * 2 - 1;
      p.v.set(Math.cos(a) * Math.sqrt(1 - b * b), b, Math.sin(a) * Math.sqrt(1 - b * b)).multiplyScalar(speed * (0.4 + Math.random() * 0.6));
      p.v.y += up;
      p.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      p.w.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
      p.life = 1.6 + Math.random() * 0.8;
      p.s = scale * (0.7 + Math.random() * 0.8);
    }
  }
  update(dt) {
    for (let i = 0; i < this.max; i++) {
      const p = this.parts[i];
      if (p.life > 0) {
        p.life -= dt;
        p.v.y -= 9 * dt;
        p.v.multiplyScalar(1 - 1.6 * dt);
        p.p.addScaledVector(p.v, dt);
        p.r.addScaledVector(p.w, dt);
      }
      const s = p.life > 0 ? p.s * Math.min(1, p.life * 2) : 0;
      this.e.set(p.r.x, p.r.y, p.r.z);
      this.m.compose(p.p, this.q.setFromEuler(this.e), this.sc.set(s, s, s));
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- rainbow puffs (boost trail, sparkles)
export class Puffs {
  constructor(scene, max = 120) {
    this.sprites = [];
    for (let i = 0; i < max; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      s.visible = false;
      s.userData = { life: 0, v: V(), grow: 1 };
      scene.add(s);
      this.sprites.push(s);
    }
    this.i = 0;
    this.hue = 0;
  }
  emit(pos, { color = null, size = 1.6, life = 0.8, v = null, grow = 1.5, fade = 1 } = {}) {
    const s = this.sprites[this.i];
    this.i = (this.i + 1) % this.sprites.length;
    s.visible = true;
    s.position.copy(pos);
    this.hue = (this.hue + 0.035) % 1;
    s.material.color.setHSL(color ?? this.hue, 1, 0.6);
    s.scale.setScalar(size);
    s.userData.life = life; s.userData.max = life; s.userData.size = size; s.userData.grow = grow;
    s.userData.v.copy(v || V(0, 0, 0));
    s.userData.fade = fade;
  }
  sparkle(pos, n = 12, radius = 3) {
    for (let k = 0; k < n; k++) {
      const d = V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      this.emit(pos.clone().addScaledVector(d, Math.random() * radius), { color: Math.random(), size: 1.2, life: 0.6, v: d.multiplyScalar(6), grow: 0.2 });
    }
  }
  update(dt) {
    for (const s of this.sprites) {
      if (!s.visible) continue;
      const u = s.userData;
      u.life -= dt;
      if (u.life <= 0) { s.visible = false; continue; }
      s.position.addScaledVector(u.v, dt);
      const k = u.life / u.max;
      s.material.opacity = k * (u.fade ?? 1);
      s.scale.setScalar(u.size * (1 + (1 - k) * u.grow));
    }
  }
}

// ---------------------------------------------------------------- birds
export function birdFlock(world, cx, cz, { n = 6, radius = 140, y = 45, speed = 0.12, color = 0x2a2a3a, seed = 0 } = {}) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const wingGeo = new THREE.BufferGeometry().setFromPoints([V(0, 0, 0.4), V(0, 0, -0.4), V(1.6, 0.2, 0)]);
  const birds = [];
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group();
    const l = new THREE.Mesh(wingGeo, mat), r = new THREE.Mesh(wingGeo, mat);
    r.scale.x = -1;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 4), mat);
    body.scale.set(1, 0.8, 2.2);
    b.add(l, r, body);
    const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
    b.position.set(side * row * 2.4, 0, -row * 2.4);
    b.userData = { l, r, ph: i * 0.7 + seed };
    g.add(b);
    birds.push(b);
  }
  world.add(g);
  let a = seed;
  world.addDyn((dt, t) => {
    a += speed * dt;
    g.position.set(cx + Math.cos(a) * radius, y + Math.sin(t * 0.3 + seed) * 6, cz + Math.sin(a) * radius);
    g.rotation.y = -a;
    for (const b of birds) {
      const f = Math.sin(t * 9 + b.userData.ph) * 0.7;
      b.userData.l.rotation.z = f; b.userData.r.rotation.z = -f;
    }
  });
}

// ---------------------------------------------------------------- cars driving on the roads
const CAR_COLORS = [0xff4f6a, 0x3fb8ff, 0xffd23f, 0x5fd35a, 0xff9a3f, 0x8a5cff, 0xffffff, 0xff6ad5];
export function car(color) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.2 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 4), paint);
  body.position.y = 0.75;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 2), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.1 }));
  cab.position.set(0, 1.45, -0.2);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.12, 2.05), paint);
  roof.position.set(0, 1.85, -0.2);
  g.add(body, cab, roof);
  const wm = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  for (const [x, z] of [[0.9, 1.3], [-0.9, 1.3], [0.9, -1.3], [-0.9, -1.3]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10), wm);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.38, z);
    g.add(w);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
export function addTraffic(world, n = 10, seed = 1) {
  const roads = world.roads.filter(r => Math.hypot(r[2] - r[0], r[3] - r[1]) > 80 && r[4] >= 8);
  if (!roads.length) return;
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < n; i++) {
    const [x1, z1, x2, z2] = roads[Math.floor(rnd() * roads.length)];
    const c = car(CAR_COLORS[i % CAR_COLORS.length]);
    const len = Math.hypot(x2 - x1, z2 - z1), dx = (x2 - x1) / len, dz = (z2 - z1) / len;
    const lane = 2.2 * (rnd() < 0.5 ? 1 : -1);
    let d = rnd() * len, dir = lane > 0 ? 1 : -1;
    const speed = 7 + rnd() * 5;
    world.add(c);
    world.addDyn((dt) => {
      d += dir * speed * dt;
      if (d > len) { d = len; dir = -1; }
      if (d < 0) { d = 0; dir = 1; }
      const off = dir > 0 ? lane : -lane;
      c.position.set(x1 + dx * d - dz * off, world.groundHeight(x1 + dx * d, z1 + dz * d) + 0.05, z1 + dz * d + dx * off);
      c.rotation.y = Math.atan2(dx * dir, dz * dir);
    });
  }
}

// ---------------------------------------------------------------- candy
const candyGeo = (() => {
  const s = new THREE.SphereGeometry(0.9, 14, 10);
  s.scale(1.25, 1, 1);
  return s;
})();
const twistGeo = new THREE.ConeGeometry(0.6, 0.9, 8);
export function candy(i) {
  const g = new THREE.Group();
  const col = RAINBOW[i % RAINBOW.length];
  const m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.25, metalness: 0.1, emissive: col, emissiveIntensity: 0.25 });
  const stripe = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  g.add(new THREE.Mesh(candyGeo, m));
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.14, 6, 18), stripe);
  band.rotation.y = Math.PI / 2;
  g.add(band);
  for (const s of [-1, 1]) {
    const t = new THREE.Mesh(twistGeo, m);
    t.rotation.z = s * Math.PI / 2;
    t.position.x = s * 1.45;
    g.add(t);
  }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: col, transparent: true, opacity: 0.55, depthWrite: false }));
  halo.scale.set(4.5, 4.5, 1);
  g.add(halo);
  g.scale.setScalar(1.15);
  return g;
}

/** colourful ring with rainbow vertex colours */
export function rainbowRing(r, tube, style) {
  const geo = new THREE.TorusGeometry(r, tube, 12, 64);
  const p = geo.attributes.position, cols = [];
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2(p.getY(i), p.getX(i));
    if (style === 'photo') c.setHSL(0.52 + 0.08 * Math.sin(a * 3), 0.9, 0.6);
    else if (style === 'waypoint') c.setHSL(0.07 + 0.05 * Math.sin(a * 3), 1, 0.6);
    else c.setHSL((a / (Math.PI * 2) + 1) % 1, 0.95, 0.6);
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, toneMapped: false }));
}
