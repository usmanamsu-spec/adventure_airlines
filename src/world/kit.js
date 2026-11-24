// World-building kit: batched low-poly scenery, sky, lighting, colliders.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, fbm2 } from '../util.js';

// ---------------------------------------------------------------- base geometries (non-indexed)
const prism = (() => {
  const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 3, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0.25, 0);
  g.scale(1 / 0.866, 1 / 0.75, 1);
  return g;
})();
const BASE = {
  box: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
  roof: prism,
  cone: new THREE.ConeGeometry(0.5, 1, 7).translate(0, 0.5, 0),
  cone4: new THREE.ConeGeometry(0.5, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0),
  sphere: new THREE.IcosahedronGeometry(0.5, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10).translate(0, 0.5, 0),
  cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6).translate(0, 0.5, 0),
  dome: new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  disc: new THREE.CylinderGeometry(0.5, 0.5, 1, 20).translate(0, 0.5, 0),
};
const NI = {};
for (const k in BASE) {
  const g = BASE[k].toNonIndexed();
  g.deleteAttribute('uv');
  NI[k] = g;
}
const NI_UV_BOX = BASE.box.toNonIndexed();

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
function matrix(x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  return _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz)).clone();
}

class Batch {
  constructor() { this.parts = []; }
  add(geoKey, mat4, color) { this.parts.push({ geo: typeof geoKey === 'string' ? NI[geoKey] : geoKey, mat4, color: new THREE.Color(color) }); }
  build(material) {
    if (!this.parts.length) return null;
    const geos = this.parts.map(({ geo, mat4, color }) => {
      const g = geo.clone();
      g.applyMatrix4(mat4);
      const n = g.attributes.position.count;
      const c = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { c[i * 3] = color.r; c[i * 3 + 1] = color.g; c[i * 3 + 2] = color.b; }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      return g;
    });
    const merged = mergeGeometries(geos);
    const m = new THREE.Mesh(merged, material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
}

// ---------------------------------------------------------------- textures
function windowTextures() {
  const S = 256, cells = 4;
  const day = document.createElement('canvas'); day.width = day.height = S;
  const lit = document.createElement('canvas'); lit.width = lit.height = S;
  const g = day.getContext('2d'), gl = lit.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S);
  gl.fillStyle = '#000000'; gl.fillRect(0, 0, S, S);
  const r = rng(9);
  const cw = S / cells;
  for (let i = 0; i < cells; i++) for (let j = 0; j < cells; j++) {
    const x = i * cw + cw * 0.16, y = j * cw + cw * 0.18, w = cw * 0.68, h = cw * 0.6;
    const gr = g.createLinearGradient(x, y, x + w, y + h);
    gr.addColorStop(0, '#5d7fa6'); gr.addColorStop(0.5, '#2c4466'); gr.addColorStop(1, '#3b5a80');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 2, y + 2, w * 0.3, h - 4);
    if (r() < 0.55) { gl.fillStyle = r() < 0.5 ? '#ffd98a' : '#ffe9b8'; gl.fillRect(x, y, w, h); }
  }
  const t1 = new THREE.CanvasTexture(day), t2 = new THREE.CanvasTexture(lit);
  for (const t of [t1, t2]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; }
  return { day: t1, lit: t2 };
}
let WIN = null;

export function textSprite(text, { bg = '#ffffff', fg = '#b3121f', size = 64, pad = 22, w = null, border = '#1d1d1d' } = {}) {
  const cv = document.createElement('canvas');
  const g = cv.getContext('2d');
  g.font = `bold ${size}px "Chalkboard SE", "Trebuchet MS", sans-serif`;
  const tw = w || g.measureText(text).width + pad * 2;
  cv.width = tw; cv.height = size + pad * 2;
  g.font = `bold ${size}px "Chalkboard SE", "Trebuchet MS", sans-serif`;
  g.fillStyle = bg; g.strokeStyle = border; g.lineWidth = 8;
  const r = 24;
  g.beginPath(); g.roundRect(4, 4, cv.width - 8, cv.height - 8, r); g.fill(); g.stroke();
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, cv.width / 2, cv.height / 2 + 4);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false }));
  s.scale.set(cv.width / cv.height, 1, 1);
  return s;
}

export function billboard(text, { bg = '#2e7d32', fg = '#ffffff' } = {}) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.strokeRect(12, 12, 488, 232);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  const lines = text.split('\n');
  lines.forEach((l, i) => {
    g.font = `bold ${i === 0 && lines.length > 1 ? 42 : 56}px "Trebuchet MS", sans-serif`;
    g.fillText(l, 256, 128 + (i - (lines.length - 1) / 2) * 66);
  });
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------- times of day
export const TIMES = {
  morning: { top: 0x4fa8f5, horizon: 0xffe3c0, sun: 0xfff0d2, sunI: 2.6, sunDir: [-0.5, 0.55, 0.65], hemiSky: 0xd2e8ff, hemiGround: 0x7d9257, hemiI: 1.0, fog: 0xe3ecec, glow: 0, exposure: 1.0 },
  afternoon: { top: 0x2f8ff0, horizon: 0xc8ecff, sun: 0xffffff, sunI: 2.8, sunDir: [0.4, 0.8, 0.3], hemiSky: 0xcfe6ff, hemiGround: 0x6f8a4a, hemiI: 1.0, fog: 0xd6e9f7, glow: 0, exposure: 1.0 },
  sunset: { top: 0x4a3f9c, horizon: 0xff8a5a, sun: 0xffb070, sunI: 2.4, sunDir: [0.75, 0.22, -0.6], hemiSky: 0xffc8a0, hemiGround: 0x5b4a5a, hemiI: 0.8, fog: 0xf0a77a, glow: 0.7, exposure: 1.05 },
  night: { top: 0x040a1e, horizon: 0x1a2a52, sun: 0x9db8ff, sunI: 0.45, sunDir: [-0.3, 0.7, 0.4], hemiSky: 0x40508a, hemiGround: 0x141a24, hemiI: 0.45, fog: 0x101a36, glow: 1.6, exposure: 1.1 },
};

// ---------------------------------------------------------------- world
export class World {
  constructor(scene, { time = 'afternoon', size = 1600, ground = 0x6aa84f, height = null, seed = 1, fog = [260, 1300], center = [0, 0] } = {}) {
    this.center = center;
    if (!WIN) WIN = windowTextures();
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.time = TIMES[time];
    this.timeName = time;
    this.size = size;
    this.heightFn = height;
    this.r = rng(seed);
    this.solid = new Batch();
    this.glass = new Batch();
    this.glow = new Batch();
    this.colliders = [];
    this.dyn = [];
    this.water = [];
    this.groundColor = ground;
    this.fogRange = fog;
    this.paths = [];
    this.roads = [];
  }

  groundHeight(x, z) { return this.heightFn ? this.heightFn(x, z) : 0; }
  isWater(x, z) {
    for (const w of this.water) {
      if (w.type === 'rect') { if (Math.abs(x - w.x) < w.w / 2 && Math.abs(z - w.z) < w.d / 2) return true; }
      else { const dx = (x - w.x) / w.rx, dz = (z - w.z) / w.rz; if (dx * dx + dz * dz < 1) return true; }
    }
    return false;
  }

  // ---------- primitives ----------
  box(x, y, z, w, h, d, color, { ry = 0, collide = false, batch = 'solid', rx = 0, rz = 0 } = {}) {
    this[batch].add('box', matrix(x, y, z, w, h, d, ry, rx, rz), color);
    if (collide) this.addBoxCollider(x, y, z, w, h, d, ry);
  }
  shape(kind, x, y, z, sx, sy, sz, color, { ry = 0, rx = 0, rz = 0, batch = 'solid' } = {}) {
    this[batch].add(kind, matrix(x, y, z, sx, sy, sz, ry, rx, rz), color);
  }
  addBoxCollider(x, y, z, w, h, d, ry = 0) {
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    const hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2;
    this.colliders.push({ type: 'box', min: new THREE.Vector3(x - hw, y, z - hd), max: new THREE.Vector3(x + hw, y + h, z + hd) });
  }
  addSphereCollider(center, r, obj = null) {
    const c = { type: 'sphere', c: center, r, obj };
    this.colliders.push(c);
    return c;
  }

  /** Windowed building (offices, shops). */
  building(x, z, w, d, h, color, { ry = 0, roof = null, y = 0, collide = true, rooftop = true } = {}) {
    const g = NI_UV_BOX.clone();
    const uv = g.attributes.uv;
    // faces: +x,-x,+y,-y,+z,-z (6 verts each)
    for (let f = 0; f < 6; f++) {
      for (let i = 0; i < 6; i++) {
        const k = f * 6 + i;
        let u = uv.getX(k), v = uv.getY(k);
        if (f === 2 || f === 3) { u = 0.02; v = 0.02; }
        else { const fw = f < 2 ? d : w; u *= fw / 14; v *= h / 12; }
        uv.setXY(k, u, v);
      }
    }
    g.translate(0, 0, 0);
    this.glass.add(g, matrix(x, y, z, w, h, d, ry), color);
    if (rooftop) {
      this.box(x, y + h, z, w * 1.02, 0.6, d * 1.02, roof ?? new THREE.Color(color).multiplyScalar(0.7), { ry });
      if (w > 10 && d > 10) this.box(x + w * 0.15, y + h + 0.6, z - d * 0.1, w * 0.25, 2.2, d * 0.25, 0x9a9a9a, { ry });
    }
    if (collide) this.addBoxCollider(x, y, z, w, h + 1, d, ry);
  }

  house(x, z, ry = 0, { w = 10, d = 12, h = 5, wall = null, roof = null, garage = true, chimney = true } = {}) {
    const r = this.r;
    // bright, candy-coloured houses
    const walls = [0xffb3c7, 0xffe08a, 0x9fdcff, 0xb8f0b0, 0xd6c2ff, 0xffc89a, 0xfff6e8, 0x8fe3d6, 0xff9f9f];
    const roofs = [0xe84a5f, 0x2f62c4, 0x7a4bc2, 0x2f9f5a, 0xf28c28, 0x3fb8c8, 0xd8406a];
    wall = wall ?? walls[Math.floor(r() * walls.length)];
    roof = roof ?? roofs[Math.floor(r() * roofs.length)];
    const c = Math.cos(ry), s = Math.sin(ry);
    const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    this.box(x, 0, z, w, h, d, wall, { ry });
    if (r() < 0.6) { // flower bed by the front door
      const fx = x + (d / 2 + 2) * s + w * 0.25 * c, fz = z + (d / 2 + 2) * c - w * 0.25 * s;
      this.flowers(fx, fz, 6, 2.2, 10);
    }
    this.shape('roof', x, h, z, w + 1.2, 3.2, d + 1, roof, { ry: ry + Math.PI / 2 });
    // door + windows on the front (+z local)
    let [px, pz] = P(0, d / 2 + 0.06);
    this.box(px, 0, pz, 1.4, 2.4, 0.15, 0x6a3f2a, { ry });
    for (const lx of [-w * 0.3, w * 0.3]) {
      [px, pz] = P(lx, d / 2 + 0.06);
      this.box(px, 1.4, pz, 1.8, 1.5, 0.12, this.timeName === 'night' && r() < 0.7 ? 0xffd98a : 0x3a5578, { ry, batch: this.timeName === 'night' ? 'glow' : 'solid' });
    }
    if (garage) {
      [px, pz] = P(w / 2 + 2.6, 0.5);
      this.box(px, 0, pz, 5.2, 3.6, 7, wall, { ry });
      this.shape('roof', px, 3.6, pz, 5.8, 1.8, 7.4, roof, { ry: ry + Math.PI / 2 });
      [px, pz] = P(w / 2 + 2.6, 4.06);
      this.box(px, 0, pz, 4.2, 2.8, 0.15, 0xf2f2f2, { ry });
    }
    if (chimney) {
      [px, pz] = P(-w * 0.28, -d * 0.15);
      this.box(px, h, pz, 1, 3.4, 1, 0x9a4a3a, { ry });
    }
    this.addBoxCollider(x, 0, z, w + (garage ? 6 : 0) * Math.abs(c), h + 3, d + (garage ? 6 : 0) * Math.abs(s), 0);
  }

  tree(x, z, { kind = 'round', s = 1, color = null, collide = true } = {}) {
    const r = this.r;
    const y0 = this.groundHeight(x, z);
    if (kind === 'pine') {
      const h = (9 + r() * 6) * s;
      this.shape('cyl6', x, y0, z, 0.6 * s, h * 0.25, 0.6 * s, 0x5a3e2a);
      const col = color ?? [0x2f6b3a, 0x2a5e34, 0x376f3c][Math.floor(r() * 3)];
      this.shape('cone', x, y0 + h * 0.18, z, h * 0.42, h * 0.55, h * 0.42, col);
      this.shape('cone', x, y0 + h * 0.45, z, h * 0.32, h * 0.5, h * 0.32, new THREE.Color(col).multiplyScalar(1.1));
      if (collide) this.addSphereCollider(new THREE.Vector3(x, y0 + h * 0.45, z), h * 0.22);
    } else if (kind === 'palm') {
      const h = 9 * s;
      this.shape('cyl6', x, y0, z, 0.5, h, 0.5, 0x8a6a4a);
      for (let i = 0; i < 6; i++) this.shape('box', x, y0 + h, z, 0.6, 0.15, 4.5, 0x3f8f3a, { ry: i * 1.05, rx: 0.35 });
    } else {
      const h = (6 + r() * 4) * s;
      this.shape('cyl6', x, y0, z, 0.7 * s, h * 0.45, 0.7 * s, 0x6a4a32);
      const blossom = !color && r() < 0.14;
      const col = color ?? (blossom ? [0xff9fd0, 0xffb347, 0xfff07a][Math.floor(r() * 3)] : [0x55b83a, 0x6cc845, 0x48a83a, 0x7ad04f][Math.floor(r() * 4)]);
      const rad = h * 0.42;
      this.shape('sphere', x, y0 + h * 0.62, z, rad * 2, rad * 1.8, rad * 2, col);
      this.shape('sphere', x + rad * 0.5, y0 + h * 0.5, z + rad * 0.3, rad * 1.3, rad * 1.2, rad * 1.3, new THREE.Color(col).multiplyScalar(0.92));
      if (collide) this.addSphereCollider(new THREE.Vector3(x, y0 + h * 0.6, z), rad * 0.95);
    }
  }

  road(x1, z1, x2, z2, w = 9, { lines = true, color = 0x4a4d52 } = {}) {
    const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
    const ry = Math.atan2(dx, dz);
    this.roads.push([x1, z1, x2, z2, w]);
    const y = (this.groundHeight(x1, z1) + this.groundHeight(x2, z2)) / 2;
    this.box((x1 + x2) / 2, y + 0.02, (z1 + z2) / 2, w, 0.06, len, color, { ry });
    if (lines) {
      const n = Math.floor(len / 8);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        this.box(x1 + dx * t, y + 0.06, z1 + dz * t, 0.25, 0.03, 3, 0xf2d24a, { ry });
      }
    }
  }
  circle(x, z, r, color = 0x4a4d52) { this.shape('disc', x, 0.02, z, r * 2, 0.06, r * 2, color); }
  lawn(x, z, w, d, color = 0x7fbf5a, ry = 0) { this.box(x, 0.01, z, w, 0.04, d, color, { ry }); }

  /** a patch of bright little flowers */
  flowers(x, z, w = 8, d = 4, n = 14) {
    const cols = [0xff4f6a, 0xffd23f, 0xff8fd0, 0xffffff, 0x8a5cff, 0xff9a3f, 0x3fb8ff];
    for (let i = 0; i < n; i++) {
      const fx = x + (this.r() - 0.5) * w, fz = z + (this.r() - 0.5) * d;
      this.shape('sphere', fx, 0.35, fz, 0.7, 0.55, 0.7, cols[Math.floor(this.r() * cols.length)]);
    }
  }

  fence(x1, z1, x2, z2, color = 0xffffff) {
    const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
    this.box((x1 + x2) / 2, 0, (z1 + z2) / 2, 0.15, 1.8, len, color, { ry: Math.atan2(dx, dz) });
  }

  pool(x, z, w = 6, d = 4) {
    this.box(x, 0.02, z, w + 1, 0.1, d + 1, 0xe8e2d4);
    this.box(x, 0.06, z, w, 0.1, d, 0x3fc2e8);
  }

  waterRect(x, z, w, d, color = 0x3f8fd0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.waterMat(color));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.08, z); m.receiveShadow = true;
    this.group.add(m);
    this.water.push({ type: 'rect', x, z, w, d });
  }
  waterEllipse(x, z, rx, rz, color = 0x3f8fd0) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 48), this.waterMat(color));
    m.scale.set(rx, rz, 1);
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.08, z); m.receiveShadow = true;
    this.group.add(m);
    this.water.push({ type: 'ellipse', x, z, rx, rz });
  }
  waterMat(color) {
    if (!this._waterMat) this._waterMat = new Map();
    if (!this._waterMat.has(color)) this._waterMat.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.12, metalness: 0.15, envMapIntensity: 1.2 }));
    return this._waterMat.get(color);
  }

  cloud(x, y, z, s = 1) {
    const r = this.r;
    for (let i = 0; i < 6; i++) this.shape('sphere', x + (r() - 0.5) * 30 * s, y + (r() - 0.5) * 6 * s, z + (r() - 0.5) * 16 * s, (14 + r() * 12) * s, (9 + r() * 6) * s, (12 + r() * 10) * s, 0xffffff);
  }

  add(obj) { this.group.add(obj); return obj; }
  addDyn(update) { this.dyn.push(update); }

  // ---------- finish: ground, sky, lights ----------
  finish() {
    const T = this.time;
    const night = this.timeName === 'night';
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
    const solid = this.solid.build(mat);
    if (solid) this.group.add(solid);
    const glassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.1, map: WIN.day, emissiveMap: WIN.lit, emissive: 0xffffff, emissiveIntensity: T.glow * 0.9 });
    const glass = this.glass.build(glassMat);
    if (glass) this.group.add(glass);
    const glowMesh = this.glow.build(new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffd98a, emissiveIntensity: night ? 1.2 : 0.2, roughness: 0.6 }));
    if (glowMesh) { glowMesh.castShadow = false; this.group.add(glowMesh); }

    // ground
    const S = this.size, seg = this.heightFn ? 160 : 60;
    const gg = new THREE.PlaneGeometry(S, S, seg, seg);
    gg.rotateX(-Math.PI / 2);
    gg.translate(this.center[0], 0, this.center[1]);
    const p = gg.attributes.position;
    const cols = [];
    const base = new THREE.Color(this.groundColor), tmp = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const y = this.groundHeight(x, z);
      p.setY(i, y);
      const n = fbm2(x * 0.01, z * 0.01, 3);
      tmp.copy(base).multiplyScalar(0.9 + n * 0.18);
      if (this.heightFn && y > 40) tmp.lerp(new THREE.Color(0x5a6f52), Math.min(1, (y - 40) / 40));
      cols.push(tmp.r, tmp.g, tmp.b);
    }
    gg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    gg.computeVertexNormals();
    const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: !!this.heightFn }));
    ground.receiveShadow = true;
    this.group.add(ground);

    // sky dome
    const sky = new THREE.SphereGeometry(4000, 32, 16);
    const sp = sky.attributes.position;
    const sc = [];
    const top = new THREE.Color(T.top), hor = new THREE.Color(T.horizon);
    for (let i = 0; i < sp.count; i++) {
      const y = sp.getY(i) / 4000;
      const c = hor.clone().lerp(top, Math.pow(Math.max(0, y), 0.55));
      sc.push(c.r, c.g, c.b);
    }
    sky.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
    const skyMesh = new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    skyMesh.renderOrder = -1;
    this.sky = skyMesh;
    this.group.add(skyMesh);
    if (night) {
      const r = rng(4), pts = [];
      for (let i = 0; i < 1500; i++) {
        const u = r() * Math.PI * 2, v = 0.05 + r() * 0.95;
        pts.push(Math.cos(u) * Math.sqrt(1 - v * v) * 3500, v * 3500, Math.sin(u) * Math.sqrt(1 - v * v) * 3500);
      }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 6, sizeAttenuation: true, fog: false }));
      skyMesh.add(stars);
      const moon = new THREE.Mesh(new THREE.SphereGeometry(70, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff6dc, fog: false }));
      moon.position.set(-1200, 1600, 2000);
      skyMesh.add(moon);
    }
    if (this.timeName === 'sunset' || this.timeName === 'morning') {
      const d = new THREE.Vector3(...T.sunDir).normalize();
      const sun = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 16), new THREE.MeshBasicMaterial({ color: this.timeName === 'sunset' ? 0xffc070 : 0xfff2c0, fog: false }));
      sun.position.copy(d.multiplyScalar(3600));
      skyMesh.add(sun);
    }

    this.scene.fog = new THREE.Fog(T.fog, this.fogRange[0], this.fogRange[1]);
    const hemi = new THREE.HemisphereLight(T.hemiSky, T.hemiGround, T.hemiI);
    this.group.add(hemi);
    const sun = new THREE.DirectionalLight(T.sun, T.sunI);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc2 = sun.shadow.camera;
    sc2.left = -70; sc2.right = 70; sc2.top = 70; sc2.bottom = -70; sc2.near = 1; sc2.far = 600;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.05;
    this.sunDir = new THREE.Vector3(...T.sunDir).normalize();
    this.sun = sun;
    this.group.add(sun, sun.target);
  }

  /** keep the sky and shadow camera centred on the player */
  follow(pos) {
    this.sky.position.set(pos.x, 0, pos.z);
    this.sun.position.copy(pos).addScaledVector(this.sunDir, 300);
    this.sun.target.position.copy(pos);
  }

  update(dt, t) { for (const f of this.dyn) f(dt, t); }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map && m.map !== WIN.day) m.map.dispose(); m.dispose(); });
    });
    this.scene.fog = null;
  }
}
