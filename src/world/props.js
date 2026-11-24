// Special props: balloons, trains, trolley, the giant acorn, fireflies, the net sculpture, sunflowers, pickups.
import * as THREE from 'three';
import { rng } from '../util.js';
import { tube } from '../characters.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o });

export function hotAirBalloon(colors, seed = 1) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(8, 16, 12);
  geo.scale(1, 1.2, 1);
  // teardrop: pinch the bottom
  const p = geo.attributes.position;
  const cols = [];
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < -2) { const k = 1 - Math.min(0.6, (-2 - y) / 12); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
    const a = Math.atan2(p.getZ(i), p.getX(i));
    const c = new THREE.Color(colors[Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8) % colors.length]);
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const env = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, flatShading: true }));
  env.castShadow = true;
  g.add(env);
  const basket = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2), std(0x8a5a2a));
  basket.position.y = -14;
  g.add(basket);
  const rope = std(0x5a4a3a);
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 6, 4), rope);
    r.position.set(x * 1.6, -10.5, z * 1.6);
    r.rotation.set(z * 0.18, 0, -x * 0.18);
    g.add(r);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 8), new THREE.MeshBasicMaterial({ color: 0xffa030 }));
  flame.position.y = -11.6;
  g.add(flame);
  g.userData.phase = rng(seed)() * 6.28;
  return g;
}

export function trainCar(color, len = 16) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.4, len), std(color, { roughness: 0.5 }));
  body.position.y = 2.6;
  body.castShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.4, len), std(0x3a3a3a));
  roof.position.y = 4.5;
  g.add(roof);
  const win = std(0x2a3a55, { roughness: 0.2 });
  for (let i = -2; i <= 2; i++) for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.1, 1.8), win);
    w.position.set(s * 1.62, 3.0, i * (len / 5.5));
    g.add(w);
  }
  const wheel = std(0x222222);
  for (const z of [-len * 0.35, len * 0.35]) for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.3, 12), wheel);
    w.rotation.z = Math.PI / 2;
    w.position.set(s * 1.3, 0.6, z);
    g.add(w);
  }
  return g;
}

export function rails(world, x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz), ry = Math.atan2(dx, dz);
  const px = Math.cos(ry), pz = -Math.sin(ry);
  world.box((x1 + x2) / 2, 0.02, (z1 + z2) / 2, 4.2, 0.1, len, 0x8a7a6a, { ry });
  for (const s of [-0.75, 0.75]) world.box((x1 + x2) / 2 + px * s, 0.12, (z1 + z2) / 2 + pz * s, 0.12, 0.18, len, 0x707680, { ry });
  const n = Math.floor(len / 2.2);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    world.box(x1 + dx * t, 0.06, z1 + dz * t, 2.6, 0.1, 0.3, 0x5a4030, { ry });
  }
}

/** a vehicle moving back and forth along a straight track */
export function shuttle(world, obj, x1, z1, x2, z2, speed = 8) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  let s = 0, dir = 1;
  obj.rotation.y = Math.atan2(x2 - x1, z2 - z1);
  world.add(obj);
  world.addDyn((dt) => {
    s += dir * speed * dt;
    if (s > len) { s = len; dir = -1; }
    if (s < 0) { s = 0; dir = 1; }
    obj.position.set(x1 + (x2 - x1) * s / len, 0, z1 + (z2 - z1) * s / len);
  });
}

export function acorn() {
  const g = new THREE.Group();
  const copper = new THREE.MeshStandardMaterial({ color: 0xb8733a, metalness: 0.75, roughness: 0.35 });
  const capM = new THREE.MeshStandardMaterial({ color: 0x7a4a24, metalness: 0.6, roughness: 0.5 });
  const nut = new THREE.Mesh(new THREE.SphereGeometry(3, 24, 18), copper);
  nut.scale.set(1, 1.25, 1);
  nut.position.y = -0.5;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(3.25, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), capM);
  cap.position.y = 1.2;
  cap.scale.set(1, 0.75, 1);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.6, 8), capM);
  stem.position.y = 4;
  const inner = new THREE.Group();
  inner.add(nut, cap, stem);
  inner.position.y = 4.2;
  inner.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.add(inner);
  g.userData.inner = inner;
  return g;
}

export function firefly() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshBasicMaterial({ color: 0xf6ff8a }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xd8ff6a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(4, 4, 1);
  g.add(core, halo);
  return g;
}

let glowTex = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(cv);
  return glowTex;
}

/** LeBauer Park-style floating net sculpture */
export function netSculpture(w = 70, d = 50, sag = 9) {
  const g = new THREE.Group();
  const seg = 28;
  const geo = new THREE.PlaneGeometry(w, d, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const cols = [];
  const ca = new THREE.Color(0xff4fa0), cb = new THREE.Color(0x3fd0ff), cc = new THREE.Color(0xffd23f);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (w / 2), z = p.getZ(i) / (d / 2);
    p.setY(i, -sag * (1 - x * x) * (1 - z * z) + 2.5 * Math.sin(x * 2.5) * Math.cos(z * 2));
    const c = ca.clone().lerp(cb, (x + 1) / 2).lerp(cc, Math.max(0, z) * 0.6);
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const surf = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ vertexColors: false, color: 0xff6ab8 }));
  g.add(surf, wire);
  const cable = new THREE.MeshStandardMaterial({ color: 0x333333 });
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 40, 8), std(0xdddddd, { metalness: 0.5 }));
    pole.position.set(x * 1.15, -12, z * 1.15);
    g.add(pole);
    const c = new THREE.Mesh(tube([new THREE.Vector3(x * 1.15, 8, z * 1.15), new THREE.Vector3(x, 0, z)], () => 0.15, { tubular: 2, radial: 4 }), cable);
    g.add(c);
  }
  return g;
}

/** sunflower field as one instanced mesh */
export function sunflowers(cx, cz, w, d, count, skip = null, seed = 2) {
  const stem = new THREE.CylinderGeometry(0.06, 0.08, 1.6, 5).translate(0, 0.8, 0);
  const head = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 10).rotateX(Math.PI / 2 - 0.35).translate(0, 1.7, 0.08);
  const center = new THREE.CylinderGeometry(0.2, 0.2, 0.14, 8).rotateX(Math.PI / 2 - 0.35).translate(0, 1.71, 0.12);
  const leaf = new THREE.BoxGeometry(0.5, 0.04, 0.2).translate(0.25, 0.9, 0);
  const colorize = (g, c) => {
    const col = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g.toNonIndexed();
  };
  const parts = [colorize(stem, 0x3f7f2a), colorize(head, 0xffc81e), colorize(center, 0x5a3a1a), colorize(leaf, 0x4f8f32)];
  parts.forEach(p => p.deleteAttribute('uv'));
  const geo = mergeAll(parts);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true }), count);
  const r = rng(seed);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pp = new THREE.Vector3();
  let k = 0;
  for (let i = 0; i < count * 3 && k < count; i++) {
    const x = cx + (r() - 0.5) * w, z = cz + (r() - 0.5) * d;
    if (skip && skip(x, z)) continue;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -0.4 + r() * 0.8);
    const sc = 1.6 + r() * 1.2;
    m.compose(pp.set(x, 0, z), q, s.set(sc, sc, sc));
    mesh.setMatrixAt(k++, m);
  }
  mesh.count = k;
  mesh.receiveShadow = true;
  return mesh;
}

function mergeAll(geos) {
  let n = 0;
  for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// ---------------------------------------------------------------- pickups & markers
export function juiceBox() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2, 0.9), std(0x45b649, { roughness: 0.4 }));
  const label = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.9, 0.92), std(0xffd23f, { roughness: 0.4 }));
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.2, 6), std(0xff5fa2));
  straw.position.set(0.35, 1.3, 0);
  straw.rotation.z = -0.3;
  g.add(box, label, straw);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xaaff88, transparent: true, depthWrite: false, opacity: 0.6 }));
  halo.scale.set(5, 5, 1);
  g.add(halo);
  return g;
}

export function sock() {
  const g = new THREE.Group();
  const stripes = ['#ffffff', '#ff4f6a', '#ffffff', '#3fa0ff', '#ffffff', '#ffd23f'];
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 128;
  const c = cv.getContext('2d');
  stripes.forEach((s, i) => { c.fillStyle = s; c.fillRect(0, i * 128 / stripes.length, 16, 128 / stripes.length + 1); });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const pts = [new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(0.3, -0.5, 0), new THREE.Vector3(1.4, -0.7, 0)];
  const m = new THREE.Mesh(tube(pts, (t) => 0.42 + 0.06 * Math.sin(t * 9) - (t > 0.92 ? (t - 0.92) * 4 : 0), { tubular: 24, radial: 10 }), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  g.add(m);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffffff, transparent: true, depthWrite: false, opacity: 0.7 }));
  halo.scale.set(6, 6, 1);
  g.add(halo);
  g.scale.setScalar(1.3);
  return g;
}

export function iceCream() {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.6, 12), std(0xd9a05a));
  cone.rotation.x = Math.PI;
  const scoops = [0xffb3d1, 0xfff1c4, 0x8b5a3c];
  scoops.forEach((c, i) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(1.35, 14, 12), std(c, { roughness: 0.5 }));
    s.position.y = 2.2 + i * 1.5;
    g.add(s);
  });
  const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), std(0xd8203a, { roughness: 0.3 }));
  cherry.position.y = 6.3;
  g.add(cone, cherry);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 40, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = -18;
  g.add(beam);
  return g;
}

export function fishingHat() {
  const g = new THREE.Group();
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.15, 20), std(0x8aa060));
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.7, 16), std(0x8aa060));
  top.position.y = 0.4;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.2, 16), std(0x5a3a2a));
  band.position.y = 0.15;
  const lure = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), std(0xff4040));
  lure.position.set(0.8, 0.3, 0.3);
  g.add(brim, top, band, lure);
  g.scale.setScalar(1.5);
  return g;
}
