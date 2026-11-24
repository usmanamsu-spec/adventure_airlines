// Backyard Squadron — hero character models (procedural, animated-film style)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const gauss = (n, c, w) => Math.exp(-n.distanceToSquared(c) / (w * w));

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- textures
const RED = [196, 20, 36];
const DARK = [22, 16, 18];
const WHITE = [238, 234, 228];
const SETT = [[DARK, 5], [RED, 1], [DARK, 5], [RED, 4], [WHITE, 1], [RED, 20], [DARK, 2], [RED, 20], [WHITE, 1], [RED, 4]];
export const PLAID_REPEAT_M = 0.11; // one pattern repeat, in meters, on the kids

export function makePlaidCanvas(px = 6) {
  const threads = [];
  for (const [c, w] of SETT) for (let i = 0; i < w; i++) threads.push(c);
  const size = threads.length * px;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  const r = rng(3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const warp = threads[Math.floor(x / px)];
      const weft = threads[Math.floor(y / px)];
      const c = ((x + y) >> 1) % 2 === 0 ? warp : weft; // 2/2 twill
      const k = 0.4;
      const fuzz = 0.92 + r() * 0.12; // brushed flannel
      const i = (y * size + x) * 4;
      for (let ch = 0; ch < 3; ch++) img.data[i + ch] = Math.min(255, (c[ch] * (1 - k) + (warp[ch] + weft[ch]) / 2 * k) * fuzz);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

function plaidMaterial(canvas, ru, rv, rot = 0, offset = [0, 0]) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  t.repeat.set(ru, rv);
  t.rotation = rot;
  t.offset.set(offset[0], offset[1]);
  return new THREE.MeshPhysicalMaterial({
    map: t, roughness: 0.92, metalness: 0,
    sheen: 0.6, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x7a1c1c),
  });
}

function irisTexture(base = '#5a3418', dark = '#1e1008') {
  const W = 1024, H = 512;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#f3eee8';
  g.fillRect(0, 0, W, H);
  const sc = g.createRadialGradient(256, 256, 60, 256, 256, 240);
  sc.addColorStop(0, 'rgba(255,255,255,0)');
  sc.addColorStop(1, 'rgba(230,190,180,0.55)');
  g.fillStyle = sc;
  g.fillRect(0, 0, W, H);
  const cx = 256, cy = 256, R = 86, P = 34;
  const ir = g.createRadialGradient(cx, cy, P * 0.6, cx, cy, R);
  ir.addColorStop(0, '#2a160a');
  ir.addColorStop(0.35, base);
  ir.addColorStop(0.75, '#7a4a24');
  ir.addColorStop(0.92, '#3a200f');
  ir.addColorStop(1, dark);
  g.fillStyle = ir;
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
  const r = rng(11);
  for (let i = 0; i < 260; i++) {
    const a = r() * Math.PI * 2, l0 = P + r() * 10, l1 = R * (0.55 + r() * 0.4);
    g.strokeStyle = r() < 0.5 ? 'rgba(160,105,55,0.35)' : 'rgba(30,15,6,0.35)';
    g.lineWidth = 1 + r() * 1.5;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * l0, cy + Math.sin(a) * l0); g.lineTo(cx + Math.cos(a) * l1, cy + Math.sin(a) * l1); g.stroke();
  }
  g.fillStyle = '#060404';
  g.beginPath(); g.arc(cx, cy, P, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ---------------------------------------------------------------- geometry helpers
/** Tapered tube along a smooth curve. radius(t) -> r. Optional up(P) orients flat ribbons. */
function tube(points, radius, { tubular = 32, radial = 14, flat = 1, up = null, closed = false } = {}) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  const frames = curve.computeFrenetFrames(tubular, closed);
  const pos = [], uv = [], idx = [];
  const N = new THREE.Vector3(), B = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    const P = curve.getPointAt(closed ? t % 1 : t);
    const T = frames.tangents[i];
    if (up) {
      const u = up(P, t);
      N.copy(u).addScaledVector(T, -u.dot(T)).normalize();
      B.crossVectors(T, N);
    } else { N.copy(frames.normals[i]); B.copy(frames.binormals[i]); }
    const r = radius(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const c = Math.cos(a) * flat * r, s = Math.sin(a) * r;
      pos.push(P.x + c * N.x + s * B.x, P.y + c * N.y + s * B.y, P.z + c * N.z + s * B.z);
      uv.push(j / radial, t);
    }
  }
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = (i + 1) * (radial + 1) + j, c = b + 1, d = a + 1;
      idx.push(a, d, b, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const roundEnd = (r0, r1, cap = 0.18) => (t) => {
  const base = lerp(r0, r1, t);
  if (t < 1 - cap) return base;
  const k = (t - (1 - cap)) / cap;
  return base * Math.sqrt(Math.max(0, 1 - k * k));
};

function displace(geo, fn) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  const v = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); nn.fromBufferAttribute(n, i);
    const d = fn(v, uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
    p.setXYZ(i, v.x + nn.x * d, v.y + nn.y * d, v.z + nn.z * d);
  }
  geo.computeVertexNormals();
  return geo;
}

function hash3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  let r = 0;
  for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) for (let dz = 0; dz < 2; dz++) {
    const h = hash3(xi + dx, yi + dy, zi + dz);
    r += h * (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
  }
  return r * 2 - 1;
}

/** Project a flat (x,y) geometry onto a target mesh along -Z (same local space). */
function conform(geo, target, offset = 0.001) {
  target.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const p = geo.attributes.position;
  const o = new THREE.Vector3(), dir = V(0, 0, -1);
  for (let i = 0; i < p.count; i++) {
    o.set(p.getX(i), p.getY(i), 2);
    ray.set(o, dir);
    const hit = ray.intersectObject(target, false)[0];
    if (hit) p.setZ(i, hit.point.z + p.getZ(i) + offset);
  }
  geo.computeVertexNormals();
  return geo;
}
function surfacePoint(x, y, target, offset = 0) {
  target.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(V(x, y, 2), V(0, 0, -1));
  const hit = ray.intersectObject(target, false)[0];
  if (!hit) return null;
  const n = hit.face.normal.clone().transformDirection(target.matrixWorld);
  return { p: hit.point.clone().addScaledVector(n, offset), n };
}

/** Densely tessellated flat shape (grid clipped to polygon) so it conforms smoothly. */
function denseShape(pts, res = 0.0015) {
  const sh = new THREE.Shape(pts);
  const g = new THREE.ShapeGeometry(sh, 6);
  // subdivide triangles until edges are short
  let pos = Array.from(g.toNonIndexed().attributes.position.array);
  for (let pass = 0; pass < 6; pass++) {
    const out = [];
    let split = false;
    for (let i = 0; i < pos.length; i += 9) {
      const a = pos.slice(i, i + 3), b = pos.slice(i + 3, i + 6), c = pos.slice(i + 6, i + 9);
      const len = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (Math.max(len(a, b), len(b, c), len(c, a)) > res) {
        split = true;
        const m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, 0];
        const ab = m(a, b), bc = m(b, c), ca = m(c, a);
        out.push(...a, ...ab, ...ca, ...ab, ...b, ...bc, ...ca, ...bc, ...c, ...ab, ...bc, ...ca);
      } else out.push(...a, ...b, ...c);
    }
    pos = out;
    if (!split) break;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const uv = [];
  for (let i = 0; i < pos.length; i += 3) uv.push(pos[i] / PLAID_REPEAT_M, pos[i + 1] / PLAID_REPEAT_M);
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

function mesh(geo, mat, parent, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

// ---------------------------------------------------------------- head sculpt
const EYE_DIR = (s) => V(0.39 * s, 0.05, 0.92).normalize();
function makeSculpt(shape) {
  const C = {
    cheekL: V(0.55, -0.36, 0.76).normalize(), cheekR: V(-0.55, -0.36, 0.76).normalize(),
    eyeL: EYE_DIR(1), eyeR: EYE_DIR(-1),
    browL: V(0.36, 0.3, 0.88).normalize(), browR: V(-0.36, 0.3, 0.88).normalize(),
    chin: V(0, -0.8, 0.6).normalize(), muzzle: V(0, -0.42, 0.9).normalize(),
    temple: V(0.8, 0.25, 0.4).normalize(), templeR: V(-0.8, 0.25, 0.4).normalize(),
  };
  return (n) => {
    const p = V(n.x * shape.width, n.y * 1.1, n.z * 0.98);
    const jaw = smooth(0.05, -0.95, n.y);
    p.x *= 1 - shape.jawTaper * jaw;
    p.z *= 1 - 0.1 * jaw;
    p.z -= 0.07 * smooth(0.1, -0.9, n.z) * smooth(-0.7, 0.3, n.y);
    p.z *= 1 - 0.05 * smooth(0.55, 1, n.z) * smooth(-0.6, 0.4, n.y);
    let d = 0;
    d += shape.cheeks * (gauss(n, C.cheekL, 0.33) + gauss(n, C.cheekR, 0.33));
    d -= 0.055 * (gauss(n, C.eyeL, 0.19) + gauss(n, C.eyeR, 0.19));
    d += 0.022 * (gauss(n, C.browL, 0.2) + gauss(n, C.browR, 0.2));
    d += shape.chin * gauss(n, C.chin, 0.22);
    d += 0.03 * gauss(n, C.muzzle, 0.3);
    d -= 0.02 * (gauss(n, C.temple, 0.3) + gauss(n, C.templeR, 0.3));
    p.addScaledVector(n, d);
    return p;
  };
}

// ---------------------------------------------------------------- the boy
export function makeBoy(spec, plaidCanvas) {
  const boy = new THREE.Group();
  boy.name = spec.name;
  const g = spec.girth, h = spec.height;
  const R = spec.R;
  const r = rng(spec.seed);

  const skin = new THREE.MeshPhysicalMaterial({
    color: spec.skin, roughness: 0.48, metalness: 0,
    sheen: 0.2, sheenRoughness: 0.45, sheenColor: new THREE.Color(0xff9a6a),
    clearcoat: 0.08, clearcoatRoughness: 0.45,
  });
  const skinHead = skin.clone(); skinHead.vertexColors = true; skinHead.color.set(0xffffff);
  const skinDark = skin.clone(); skinDark.color.set(spec.skin).multiplyScalar(0.72);
  const handSkin = skin.clone(); handSkin.side = THREE.DoubleSide;

  const Y = (y) => y * h;

  // ---------- torso (pajama top) ----------
  const prof = [
    [0.104, 0.638], [0.126, 0.62], [0.134, 0.636], [0.13, 0.70], [0.126 + 0.036 * (g - 1), 0.77],
    [0.132, 0.84], [0.139, 0.905], [0.14, 0.955], [0.134, 0.995], [0.116, 1.03], [0.085, 1.055], [0.052, 1.068], [0.044, 1.074],
  ].map(([rr, y]) => new THREE.Vector2(rr, Y(y)));
  const torsoGeo = new THREE.LatheGeometry(prof, 96, Math.PI, Math.PI * 2);
  torsoGeo.computeVertexNormals();
  displace(torsoGeo, (v, u) => {
    let d = 0.0025 * noise3(v.x * 30, v.y * 30, v.z * 30);
    d += 0.0035 * Math.sin(u * Math.PI * 2 * 9 + noise3(v.x * 8, 0, v.z * 8) * 3) * smooth(Y(0.8), Y(0.66), v.y) * smooth(Y(0.62), Y(0.66), v.y);
    d += 0.002 * Math.sin(v.y * 90 + u * 12) * smooth(Y(0.95), Y(0.85), v.y) * smooth(Y(0.66), Y(0.75), v.y);
    return d;
  });
  const torso = mesh(torsoGeo, plaidMaterial(plaidCanvas, 7, 4.2), boy);
  torso.scale.set(1.28 * g, 1, 0.82 * (0.9 + 0.1 * g));
  torso.updateMatrixWorld();

  // ---------- placket, buttons, neckline, lapels, pocket ----------
  const vBottom = Y(0.95);
  {
    const x0 = -0.012, x1 = 0.012, y0 = Y(0.625);
    const pg = denseShape([new THREE.Vector2(x0, y0), new THREE.Vector2(x1, y0), new THREE.Vector2(x1, vBottom), new THREE.Vector2(x0, vBottom)], 0.004);
    conform(pg, torso, 0.0018);
    const uv = pg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) + 0.3);
    mesh(pg, plaidMaterial(plaidCanvas, 1, 1), boy);
  }
  const buttonMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0c, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 });
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x34343a, roughness: 0.6 });
  for (let i = 0; i < 4; i++) {
    const y = vBottom - 0.03 - i * (Y(0.27) / 4);
    const sp = surfacePoint(0, y, torso, 0.0034);
    if (!sp) continue;
    const b = mesh(new THREE.CylinderGeometry(0.0082, 0.0082, 0.0028, 28), buttonMat, boy);
    b.position.copy(sp.p);
    b.quaternion.setFromUnitVectors(V(0, 1, 0), sp.n);
    for (const [hx, hz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const hole = mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.0032, 8), holeMat, b, false);
      hole.position.set(hx * 0.0024, 0.0003, hz * 0.0024);
    }
  }
  {
    const vg = denseShape([new THREE.Vector2(0, vBottom - 0.004), new THREE.Vector2(0.04, Y(1.085)), new THREE.Vector2(-0.04, Y(1.085))], 0.004);
    conform(vg, torso, 0.0006);
    mesh(vg, skin, boy);
  }
  for (const s of [-1, 1]) {
    let pts = [
      [0.0, vBottom - 0.002], [0.026, Y(1.07)], [0.05, Y(1.084)], [0.072, Y(1.07)],
      [0.088, Y(1.035)], [0.074, Y(1.024)], [0.07, Y(1.03)], [0.094, Y(1.008)], [0.036, vBottom + 0.02],
    ].map(([x, y]) => new THREE.Vector2(x * s, y));
    if (s < 0) pts = pts.reverse();
    const geo = denseShape(pts, 0.005);
    conform(geo, torso, 0.004);
    displace(geo, () => 0); // recompute normals
    const m = mesh(geo, plaidMaterial(plaidCanvas, 1, 1, 0.12 * s, [0.2, 0.4]), boy);
    m.material.side = THREE.DoubleSide;
    // lapel edge roll for thickness
    const edge = pts.map(v => { const sp = surfacePoint(v.x, v.y, torso, 0.0042); return sp ? sp.p : null; }).filter(Boolean);
    edge.push(edge[0].clone());
  }
  {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const a = lerp(0.95, Math.PI * 2 - 0.95, i / 16) + Math.PI / 2;
      pts.push(V(Math.cos(a) * 0.058 * (1 + 0.15 * (g - 1)), Y(1.078) + 0.004 * Math.sin(i / 16 * Math.PI), Math.sin(a) * 0.05 - 0.004));
    }
    const geo = tube(pts, () => 0.011, { tubular: 40, radial: 10, flat: 0.25, up: (P) => V(P.x, 0, P.z).normalize() });
    mesh(geo, plaidMaterial(plaidCanvas, 1, 2.5), boy);
  }
  {
    const w = 0.052, hh = 0.056, cx = 0.074 * g, cy = Y(0.955);
    const pts = [];
    for (let i = 0; i <= 4; i++) pts.push(new THREE.Vector2(cx - w / 2 + (w * i) / 4, cy + hh / 2));
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 * (i / 8); pts.push(new THREE.Vector2(cx + w / 2 - 0.006 + Math.cos(a) * 0.006, cy - hh / 2 + 0.006 + Math.sin(a) * 0.006)); }
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 - Math.PI / 2 * (i / 8); pts.push(new THREE.Vector2(cx - w / 2 + 0.006 + Math.cos(a) * 0.006, cy - hh / 2 + 0.006 + Math.sin(a) * 0.006)); }
    const pg = denseShape(pts.reverse(), 0.005);
    conform(pg, torso, 0.0017);
    mesh(pg, plaidMaterial(plaidCanvas, 1, 1, 0, [0.37, 0.21]), boy).material.side = THREE.DoubleSide;
    const edge = pts.map(v => surfacePoint(v.x, v.y, torso, 0.0016)?.p).filter(Boolean);
  }

  // ---------- pelvis + legs ----------
  const pelvisGeo = new THREE.LatheGeometry([
    [0.0, Y(0.555)], [0.06, Y(0.56)], [0.112, Y(0.585)], [0.126, Y(0.63)], [0.122, Y(0.7)],
  ].map(([a, b]) => new THREE.Vector2(a, b)), 72, Math.PI, Math.PI * 2);
  const pelvis = mesh(pelvisGeo, plaidMaterial(plaidCanvas, 7, 1.3), boy);
  pelvis.scale.set(1.18 * g, 1, 0.8 * (0.9 + 0.1 * g));

  const stance = spec.pose === 'hip' ? 0.085 : 0.062;
  for (const s of [-1, 1]) {
    const pts = [V(s * 0.056 * g, Y(0.64), 0), V(s * (0.06 * g + 0.01), Y(0.38), 0.012), V(s * stance * g, Y(0.11), 0.0), V(s * stance * g, Y(0.06), 0.004)];
    const geo = tube(pts, (t) => {
      let rr = lerp(0.062 * g, 0.05 * (0.85 + 0.15 * g), smooth(0, 0.55, t));
      rr = lerp(rr, 0.058 * (0.85 + 0.15 * g), smooth(0.7, 1, t));
      return rr;
    }, { tubular: 60, radial: 28 });
    displace(geo, (v, u, t) => 0.004 * Math.sin(t * 70 + u * 6) * smooth(0.82, 0.97, t)
      + 0.003 * Math.sin(u * Math.PI * 2 * 3 + t * 20) * Math.exp(-Math.pow((t - 0.5) / 0.08, 2))
      + 0.0015 * noise3(v.x * 40, v.y * 40, v.z * 40));
    mesh(geo, plaidMaterial(plaidCanvas, 3, 5), boy);

    const slMat = new THREE.MeshPhysicalMaterial({ color: spec.slippers[s < 0 ? 0 : 1], roughness: 1, sheen: 1, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xffffff) });
    const slGeo = new THREE.SphereGeometry(1, 40, 28);
    {
      const p = slGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        if (y < -0.35) y = -0.35 + (y + 0.35) * 0.15;
        x *= 0.052 * (1 + 0.15 * z); y *= 0.042; z *= 0.095;
        p.setXYZ(i, x, y, z);
      }
      slGeo.computeVertexNormals();
      displace(slGeo, (v) => 0.0012 * noise3(v.x * 200, v.y * 200, v.z * 200));
    }
    const sl = mesh(slGeo, slMat, boy);
    sl.position.set(s * stance * g, 0.042 * 0.42 + 0.004, 0.035);
    sl.rotation.y = s * 0.12;
    const cuff = mesh(new THREE.TorusGeometry(0.042, 0.011, 12, 36), new THREE.MeshPhysicalMaterial({ color: 0xf4efe6, roughness: 1, sheen: 1, sheenColor: new THREE.Color(0xffffff) }), boy);
    cuff.position.set(s * stance * g, 0.05, 0.002);
    cuff.rotation.x = Math.PI / 2;
    const sole = mesh(new THREE.CylinderGeometry(1, 1, 1, 32), new THREE.MeshStandardMaterial({ color: 0x3a2e28, roughness: 0.9 }), boy);
    sole.scale.set(0.05, 0.008, 0.092);
    sole.position.set(s * stance * g, 0.004, 0.035);
    sole.rotation.y = s * 0.12;
  }

  // ---------- arms + hands ----------
  const shoulderX = 0.152 * g;
  const shoulderY = Y(1.0);
  const arms = spec.pose === 'wave'
    ? { R: [V(-shoulderX, shoulderY, 0), V(-0.275 * g, Y(1.09), 0.035), V(-0.29 * g, Y(1.29), 0.075)], Rp: 'wave',
        L: [V(shoulderX, shoulderY, 0), V(0.19 * g, Y(0.825), -0.02), V(0.205 * g, Y(0.665), 0.03)], Lp: 'relaxed' }
    : { R: [V(-shoulderX, shoulderY, 0), V(-0.285 * g, Y(0.85), -0.05), V(-0.178 * g, Y(0.735), 0.01)], Rp: 'hip',
        L: [V(shoulderX, shoulderY, 0), V(0.198 * g, Y(0.825), 0.0), V(0.21 * g, Y(0.66), 0.035)], Lp: 'relaxed' };
  for (const side of ['R', 'L']) {
    const [S, E, W] = arms[side];
    const s = side === 'R' ? -1 : 1;
    const pts = [S.clone().add(V(-s * 0.02, 0.01, 0)), S, E, W];
    const geo = tube(pts, (t) => {
      let rr = lerp(0.044 * (0.9 + 0.1 * g), 0.034 * (0.9 + 0.1 * g), smooth(0.1, 0.8, t));
      rr += 0.004 * smooth(0.9, 0.95, t);
      return rr;
    }, { tubular: 56, radial: 24 });
    displace(geo, (v, u, t) => 0.003 * Math.sin(t * 60 + u * 9) * Math.exp(-Math.pow((t - 0.62) / 0.07, 2)) + 0.0012 * noise3(v.x * 50, v.y * 50, v.z * 50));
    mesh(geo, plaidMaterial(plaidCanvas, 2, 4), boy);
    const cap = mesh(new THREE.SphereGeometry(0.047 * (0.9 + 0.1 * g), 24, 16), plaidMaterial(plaidCanvas, 2, 1), boy);
    cap.position.copy(S).add(V(0, -0.005, 0));
    cap.scale.set(1, 0.95, 0.9);

    const dir = W.clone().sub(E).normalize();
    const pose = arms[side + 'p'];
    const palmN = pose === 'wave' ? V(0, 0.1, 1) : V(-s, 0, 0.15);
    const hand = makeHand(pose, s, handSkin, skin);
    const yAxis = dir.clone().negate();
    const xAxis = palmN.clone().addScaledVector(yAxis, -palmN.dot(yAxis)).normalize();
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis);
    hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis));
    hand.scale.setScalar(1.3);
    hand.position.copy(W).addScaledVector(dir, 0.004);
    boy.add(hand);
  }

  // ---------- neck + head ----------
  const neck = mesh(new THREE.CylinderGeometry(0.044, 0.05, Y(0.12), 32), skin, boy);
  neck.position.set(0, Y(1.1), -0.004);

  const head = new THREE.Group();
  boy.add(head);
  buildHead(head, spec, skinHead, skin, skinDark, r);
  head.position.set(0, Y(1.1) + R * 0.93, 0.014);
  head.rotation.set(spec.headTilt[0], spec.headTilt[1], spec.headTilt[2]);

  boy.traverse(o => { if (o.isMesh && o.castShadow !== false) o.receiveShadow = true; });
  return boy;
}

// ---------------------------------------------------------------- hand
function makeHand(pose, s, mat, palmMat) {
  // Local: wrist at origin, fingers toward -y, palm faces +x, thumb toward +z (mirrored for left).
  const hand = new THREE.Group();
  const tz = -s;
  const palm = mesh(new THREE.SphereGeometry(1, 28, 20), palmMat, hand);
  palm.scale.set(0.0125, 0.028, 0.03);
  palm.position.set(0, -0.026, 0);
  const curlBy = { wave: [0.05, 0.08, 0.05], relaxed: [0.35, 0.45, 0.3], hip: [0.55, 0.7, 0.5] }[pose];
  const spread = pose === 'wave' ? 0.14 : 0.04;
  const fingers = [
    { z: 0.0135, L: 0.03, r: 0.0068 }, { z: 0.0045, L: 0.034, r: 0.007 },
    { z: -0.0045, L: 0.032, r: 0.0067 }, { z: -0.013, L: 0.026, r: 0.006 },
  ];
  fingers.forEach((f, i) => {
    const pts = [V(0, -0.04, f.z * tz)];
    const dir = V(0, -1, (i - 1.5) * -spread * tz).normalize();
    let p = V(0, -0.048, f.z * tz * 1.05);
    pts.push(p.clone());
    [0.45, 0.3, 0.25].forEach((sl, k) => {
      dir.applyAxisAngle(V(0, 0, 1), -curlBy[k] * (k === 0 ? 0.8 : 1));
      p = p.clone().addScaledVector(dir, f.L * sl);
      pts.push(p.clone());
    });
    mesh(tube(pts, roundEnd(f.r, f.r * 0.86, 0.22), { tubular: 20, radial: 12 }), mat, hand);
  });
  {
    const curl = pose === 'wave' ? 0.1 : 0.35;
    let p = V(0.004, -0.012, 0.015 * tz);
    const pts = [V(0.0, -0.01, 0.006 * tz), p.clone()];
    const dir = V(0.35, -0.55, 0.75 * tz).normalize();
    for (const sl of [0.4, 0.33, 0.27]) {
      dir.applyAxisAngle(V(0, 1, 0), curl * tz * 0.6);
      p = p.clone().addScaledVector(dir, 0.032 * sl);
      pts.push(p.clone());
    }
    mesh(tube(pts, roundEnd(0.0085, 0.0072, 0.22), { tubular: 20, radial: 12 }), mat, hand);
  }
  return hand;
}

// ---------------------------------------------------------------- head details
function buildHead(head, spec, skinHead, skin, skinDark, r) {
  const R = spec.R;
  const sculpt = makeSculpt(spec.face);
  const S = (n) => sculpt(n).multiplyScalar(R);

  const geo = new THREE.SphereGeometry(1, 128, 96);
  const p = geo.attributes.position;
  const colors = [];
  const base = new THREE.Color(spec.skin), blush = new THREE.Color(0xc4604a), tmp = new THREE.Color();
  const cheekL = V(0.55, -0.32, 0.77).normalize(), cheekR = V(-0.55, -0.32, 0.77).normalize(), noseTip = V(0, -0.15, 1).normalize();
  for (let i = 0; i < p.count; i++) {
    const n = V(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    const q = S(n);
    p.setXYZ(i, q.x, q.y, q.z);
    const b = 0.32 * (gauss(n, cheekL, 0.24) + gauss(n, cheekR, 0.24)) + 0.15 * gauss(n, noseTip, 0.15);
    tmp.copy(base).lerp(blush, b);
    colors.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const skull = mesh(geo, skinHead, head);
  skull.updateMatrixWorld();

  // ---------- eyes ----------
  const re = R * 0.285;
  const eyeMat = new THREE.MeshPhysicalMaterial({ map: irisTexture(), roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.02, metalness: 0 });
  const lashMat = new THREE.MeshStandardMaterial({ color: 0x120c0a, roughness: 0.6 });
  const eyes = [];
  for (const s of [-1, 1]) {
    const d = EYE_DIR(s);
    const c = S(d).addScaledVector(d, -re * 0.55);
    const eyeGroup = new THREE.Group();
    eyeGroup.position.copy(c);
    head.add(eyeGroup);
    const eyeball = new THREE.Group();
    eyeGroup.add(eyeball);
    const ball = mesh(new THREE.SphereGeometry(re, 64, 48), eyeMat, eyeball);
    eyes.push(eyeball);
    const cl = mesh(new THREE.SphereGeometry(re * 0.085, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), eyeball, false);
    cl.position.set(re * 0.28, re * 0.3, re * 0.96);
    const cl2 = mesh(new THREE.SphereGeometry(re * 0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), eyeball, false);
    cl2.position.set(-re * 0.22, -re * 0.25, re * 0.98);

    const lid = new THREE.Group();
    eyeGroup.add(lid);
    lid.rotation.set(0.12, s * 0.1, -s * spec.expr.lidTilt);
    const lidTheta = Math.PI * spec.expr.lid;
    mesh(new THREE.SphereGeometry(re * 1.045, 48, 24, 0, Math.PI * 2, 0, lidTheta), skin, lid);
    const crease = [];
    for (let i = 0; i <= 12; i++) {
      const ph = lerp(0.12, 0.88, i / 12) * Math.PI, th = lidTheta * 0.62;
      crease.push(V(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th)).multiplyScalar(re * 1.075));
    }
    mesh(tube(crease, (t) => 0.0016 * Math.sin(Math.PI * t), { tubular: 24, radial: 6 }), skinDark, lid);
    const lash = [];
    for (let i = 0; i <= 16; i++) {
      const ph = lerp(0.06, 0.94, i / 16) * Math.PI;
      lash.push(V(-Math.cos(ph) * Math.sin(lidTheta), Math.cos(lidTheta), Math.sin(ph) * Math.sin(lidTheta)).multiplyScalar(re * 1.055));
    }
    const o = lash[s > 0 ? lash.length - 1 : 0].clone();
    const flick = o.clone().add(V(s * re * 0.18, re * 0.12, -re * 0.05));
    if (s > 0) lash.push(flick); else lash.unshift(flick);
    mesh(tube(lash, (t) => {
      const outer = s > 0 ? t : 1 - t;
      return 0.0013 + 0.0022 * outer * Math.sin(Math.PI * Math.min(1, t * 1.02 + 0.02)) + 0.0006;
    }, { tubular: 40, radial: 8, flat: 0.6 }), lashMat, lid);
    const low = [];
    const lowTheta = Math.PI * 0.69;
    for (let i = 0; i <= 12; i++) {
      const ph = lerp(0.15, 0.85, i / 12) * Math.PI;
      low.push(V(-Math.cos(ph) * Math.sin(lowTheta), Math.cos(lowTheta), Math.sin(ph) * Math.sin(lowTheta)).multiplyScalar(re * 1.03));
    }
    mesh(tube(low, (t) => 0.0034 * Math.sin(Math.PI * t) + 0.0006, { tubular: 24, radial: 8 }), skin, eyeGroup);
  }
  head.userData.eyes = eyes;

  // ---------- brows ----------
  const browMat = new THREE.MeshStandardMaterial({ color: 0x15100d, roughness: 0.9 });
  for (const s of [-1, 1]) {
    const raise = s < 0 ? spec.expr.browR : spec.expr.browL;
    const pts = [
      V(0.13 * s, 0.415 + raise * 0.6, 0.9), V(0.33 * s, 0.48 + raise, 0.86), V(0.52 * s, 0.45 + raise * 0.7, 0.75), V(0.64 * s, 0.38 + raise * 0.4, 0.66),
    ].map(d => { const n = d.normalize(); return S(n).addScaledVector(n, 0.003); });
    mesh(tube(pts, (t) => lerp(0.0075, 0.0035, t) * (R / 0.124) * (t < 0.1 ? 0.7 + t * 3 : 1), { tubular: 30, radial: 10, flat: 0.4, up: (P) => P.clone().normalize() }), browMat, head);
  }

  // ---------- nose ----------
  {
    const tipN = V(0, -0.17, 1).normalize();
    const tip = S(tipN).addScaledVector(tipN, R * 0.05);
    const bridgeTop = S(V(0, 0.12, 1).normalize());
    mesh(tube([bridgeTop.clone().addScaledVector(V(0, 0, 1), -0.004), bridgeTop.clone().lerp(tip, 0.5).add(V(0, 0, 0.003)), tip.clone().add(V(0, 0.004, -0.004))],
      (t) => lerp(0.005, 0.0095, t) * (R / 0.124), { tubular: 20, radial: 16 }), skin, head);
    const tipM = mesh(new THREE.SphereGeometry(1, 32, 24), skin, head);
    tipM.position.copy(tip);
    tipM.scale.set(R * 0.1, R * 0.085, R * 0.09);
    for (const s of [-1, 1]) {
      const w = mesh(new THREE.SphereGeometry(1, 24, 16), skin, head);
      w.position.copy(tip).add(V(s * R * 0.075, -R * 0.025, -R * 0.045));
      w.scale.set(R * 0.055, R * 0.048, R * 0.05);
      const nos = mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: 0x2a140c, roughness: 1 }), head, false);
      nos.position.copy(tip).add(V(s * R * 0.04, -R * 0.065, -R * 0.015));
      nos.scale.set(R * 0.022, R * 0.011, R * 0.026);
    }
  }

  // ---------- mouth ----------
  {
    const sc = R / 0.124;
    const W = spec.expr.mouthW * sc, H = spec.expr.mouthH * sc, k = spec.expr.smile, asym = spec.expr.asym * sc;
    const c = S(V(0, -0.47, 0.88).normalize());
    const N = 40;
    const top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N * 2 - 1;
      const x = u * W / 2;
      const lift = k * H * u * u + asym * u;
      top.push(new THREE.Vector2(c.x + x, c.y + lift - 0.06 * H * (1 - u * u)));
      bot.push(new THREE.Vector2(c.x + x, c.y + lift - H * Math.pow(1 - u * u, 0.8)));
    }
    const outline = [...top, ...bot.slice(1, -1).reverse()];
    mesh(conform(denseShape(outline.slice().reverse(), 0.002), skull, 0.0012), new THREE.MeshStandardMaterial({ color: 0x3b0f12, roughness: 0.8, side: THREE.DoubleSide }), head, false);
    const tg = [];
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI + (i / 24) * Math.PI;
      tg.push(new THREE.Vector2(c.x + Math.cos(a) * W * 0.24, c.y - H * 0.78 - Math.sin(a) * H * 0.28));
    }
    const tongueGeo = conform(denseShape(tg.map(v => new THREE.Vector2(v.x, Math.max(v.y, c.y - H * 0.92))), 0.002), skull, 0.0019);
    mesh(tongueGeo, new THREE.MeshStandardMaterial({ color: 0xc0505a, roughness: 0.5, side: THREE.DoubleSide }), head, false);
    const teeth = [];
    const tw = 0.8;
    for (let i = 0; i <= 30; i++) {
      const u = (i / 30 * 2 - 1) * tw;
      teeth.push(new THREE.Vector2(c.x + u * W / 2, c.y + k * H * u * u + asym * u - 0.06 * H * (1 - u * u) - 0.001));
    }
    for (let i = 30; i >= 0; i--) {
      const u = (i / 30 * 2 - 1) * tw;
      teeth.push(new THREE.Vector2(c.x + u * W / 2, c.y + k * H * u * u + asym * u - H * 0.34 * (1 - 0.3 * u * u)));
    }
    mesh(conform(denseShape(teeth, 0.002), skull, 0.0022), new THREE.MeshPhysicalMaterial({ color: 0xfaf6ee, roughness: 0.25, clearcoat: 0.6, side: THREE.DoubleSide }), head, false);
    const lift3 = (v2, off) => { const sp = surfacePoint(v2.x, v2.y, skull, off); return sp ? sp.p : V(v2.x, v2.y, c.z); };
    const lower = bot.filter((_, i) => i % 2 === 0).map(v => lift3(new THREE.Vector2(v.x, v.y - 0.0028), 0.0016));
    mesh(tube(lower, (t) => 0.0034 * Math.pow(Math.sin(Math.PI * t), 0.6), { tubular: 40, radial: 10, flat: 0.55, up: (P) => P.clone().normalize() }),
      new THREE.MeshPhysicalMaterial({ color: new THREE.Color(spec.skin).lerp(new THREE.Color(0xa0453c), 0.35), roughness: 0.4, clearcoat: 0.3 }), head);
    const upper = top.filter((_, i) => i % 2 === 0).map(v => lift3(new THREE.Vector2(v.x, v.y + 0.0012), 0.0012));
    mesh(tube(upper, (t) => 0.0018 * Math.pow(Math.sin(Math.PI * t), 0.5), { tubular: 40, radial: 8, flat: 0.5, up: (P) => P.clone().normalize() }),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(spec.skin).multiplyScalar(0.62), roughness: 0.6 }), head);
    for (const s of [-1, 1]) {
      const end = top[s < 0 ? 0 : N];
      const pts = [new THREE.Vector2(end.x + s * 0.002, end.y + 0.003), new THREE.Vector2(end.x + s * 0.006, end.y - 0.001), new THREE.Vector2(end.x + s * 0.0055, end.y - 0.006)].map(v => lift3(v, 0.0006));
      mesh(tube(pts, (t) => 0.0011 * Math.sin(Math.PI * t), { tubular: 12, radial: 6 }), skinDark, head, false);
    }
  }

  // ---------- ears ----------
  for (const s of [-1, 1]) {
    const d = V(s, 0.0, -0.1).normalize();
    const base = S(d);
    const ear = new THREE.Group();
    ear.position.copy(base).add(V(s * 0.004, 0, 0));
    ear.rotation.y = s * 0.45;
    head.add(ear);
    const outer = mesh(new THREE.SphereGeometry(1, 32, 24), skin, ear);
    outer.scale.set(0.012, R * 0.3, R * 0.2);
    const rim = mesh(new THREE.TorusGeometry(1, 0.18, 12, 32, Math.PI * 1.5), skin, ear);
    rim.scale.set(R * 0.17, R * 0.27, R * 0.17);
    rim.rotation.y = s * Math.PI / 2;
    rim.rotation.z = -Math.PI * 0.25;
    rim.position.x = s * 0.005;
    const inner = mesh(new THREE.SphereGeometry(1, 24, 16), skinDark, ear);
    inner.scale.set(0.004, R * 0.17, R * 0.1);
    inner.position.set(s * 0.0095, -0.002, 0.002);
  }

  buildHair(head, spec, sculpt, r);
  buildGoggles(head, spec, sculpt);
}

const HAIRLINE = {
  messy: [[0, 0.5], [0.5, 0.43], [0.9, 0.24], [1.25, 0.12], [1.45, 0.02], [1.75, -0.12], [2.3, -0.42], [Math.PI, -0.56]],
  neat: [[0, 0.52], [0.5, 0.45], [0.9, 0.3], [1.25, 0.18], [1.45, 0.08], [1.75, -0.05], [2.3, -0.35], [Math.PI, -0.5]],
};
function hairlineY(n, style) {
  const phi = Math.abs(Math.atan2(n.x, n.z));
  const k = HAIRLINE[style];
  for (let i = 0; i < k.length - 1; i++) {
    if (phi <= k[i + 1][0]) return lerp(k[i][1], k[i + 1][1], smooth(k[i][0], k[i + 1][0], phi));
  }
  return k[k.length - 1][1];
}

function buildHair(head, spec, sculpt, r) {
  const R = spec.R;
  const style = spec.hair;
  const messy = style === 'messy';
  const S = (n, k = 1) => sculpt(n).multiplyScalar(R * k);

  const hairMat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, color: 0xffffff,
    roughness: messy ? 0.55 : 0.92, metalness: 0,
    sheen: messy ? 0.7 : 0.15, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x6a4a34),
  });
  const baseCol = new THREE.Color(0x17110e);

  {
    const geo = new THREE.SphereGeometry(1, 200, 140);
    const p = geo.attributes.position;
    const keep = [];
    for (let i = 0; i < p.count; i++) {
      const n = V(p.getX(i), p.getY(i), p.getZ(i)).normalize();
      const q = S(n, 1.012);
      p.setXYZ(i, q.x, q.y, q.z);
      keep.push(n.y - hairlineY(n, style));
    }
    const idx = geo.index.array, out = [];
    for (let i = 0; i < idx.length; i += 3) {
      if (Math.min(keep[idx[i]], keep[idx[i + 1]], keep[idx[i + 2]]) > 0.04) out.push(idx[i], idx[i + 1], idx[i + 2]);
    }
    geo.setIndex(out);
    geo.computeVertexNormals();
    const cols = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { cols[i * 3] = baseCol.r * 0.9; cols[i * 3 + 1] = baseCol.g * 0.9; cols[i * 3 + 2] = baseCol.b * 0.9; }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    mesh(geo, hairMat, head);
  }

  const geos = [];
  const N = messy ? 420 : 520;
  const crown = V(0.12, 0.75, -0.64).normalize();
  const tangentize = (v, n) => v.addScaledVector(n, -v.dot(n)).normalize();
  let made = 0, guard = 0;
  while (made < N && guard++ < 20000) {
    const n = V(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);
    if (n.lengthSq() > 1 || n.lengthSq() < 0.01) continue;
    n.normalize();
    const yh = hairlineY(n, style);
    if (n.y < yh + 0.015) continue;
    if (n.y > yh + 0.14 && r() < 0.35) continue; // denser along the hairline
    const front = smooth(0.2, 0.7, n.z) * smooth(0.2, 0.45, n.y);
    let flow, L, lift0, liftAmp, gravity, width, curl;
    if (messy) {
      flow = tangentize(n.clone().sub(crown), n);
      const bang = tangentize(V(0.15 * (r() - 0.5), -0.55, 1), n);
      flow.lerp(bang, front).normalize();
      flow.applyAxisAngle(n, (r() - 0.5) * 0.65);
      L = lerp(0.07, 0.115, r()) * (R / 0.124) * (1 - 0.5 * front);
      lift0 = 0.008 + r() * 0.01;
      liftAmp = 0.012 + r() * 0.022;
      gravity = 0.18;
      width = lerp(0.016, 0.026, r()) * (R / 0.124);
      curl = (r() - 0.5) * 0.08;
    } else {
      const partX = 0.3;
      const bigSide = n.x < partX;
      if (bigSide) {
        flow = tangentize(V(-1, -0.05, -0.45), n);
        flow.lerp(tangentize(V(-0.75, 0.45, -0.6), n), smooth(0.1, 0.6, n.z)).normalize();
        const back = smooth(-0.1, -0.6, n.z);
        flow.lerp(tangentize(V(-0.2 * Math.sign(n.x || 1), -1, -0.3), n), back).normalize();
      } else {
        flow = tangentize(V(0.5, -1, -0.2), n);
      }
      flow.applyAxisAngle(n, (r() - 0.5) * 0.12);
      L = lerp(0.06, 0.08, r()) * (R / 0.124) * (bigSide ? 1 : 0.45);
      lift0 = 0.007 + 0.016 * front * (bigSide ? 1 : 0.3) + 0.002 * r();
      liftAmp = 0.002;
      gravity = 0.0;
      width = lerp(0.014, 0.02, r()) * (R / 0.124);
      curl = 0;
    }
    const K = 14;
    const pts = [S(n, 0.99)];
    let cur = n.clone();
    let tau = flow.clone();
    const down = V(0, -1, 0);
    const step = (L / (R * 1.05)) / K;
    for (let k = 1; k <= K; k++) {
      const t = k / K;
      cur = cur.clone().addScaledVector(tau, step).normalize();
      tau = tangentize(tau.clone(), cur);
      tau.applyAxisAngle(cur, curl * step * 6);
      tau.add(tangentize(down.clone(), cur).multiplyScalar(gravity * step * 4)).normalize();
      tau = tangentize(tau, cur);
      let lift = lift0 * (1 - 0.6 * t) + liftAmp * Math.sin(Math.PI * t * 0.9) * (messy ? 1 : 0.5);
      if (messy && t > 0.65) lift += (r() < 0.5 ? 0.012 : 0) * (t - 0.65) * 3;
      pts.push(S(cur, 1.012).addScaledVector(cur, lift * 0.9));
    }
    const geo = tube(pts, (t) => width * Math.pow(1 - t, messy ? 0.65 : 0.45) * (t < 0.08 ? 0.75 + t * 3 : 1) + 0.0004,
      { tubular: 18, radial: 10, flat: messy ? 0.28 : 0.16, up: (P) => P.clone().normalize() });
    const shade = 0.75 + r() * 0.5;
    const cnt = geo.attributes.position.count;
    const cols = new Float32Array(cnt * 3);
    for (let i = 0; i < cnt; i++) {
      const t = geo.attributes.uv.getY(i);
      const tipLight = messy ? 1 + 0.35 * t : 1;
      cols[i * 3] = baseCol.r * shade * tipLight; cols[i * 3 + 1] = baseCol.g * shade * tipLight; cols[i * 3 + 2] = baseCol.b * shade * tipLight;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geos.push(geo);
    made++;
  }
  mesh(mergeGeometries(geos), hairMat, head);
}

function buildGoggles(head, spec, sculpt) {
  const R = spec.R;
  const lift = spec.hair === 'messy' ? 1.2 : 1.11;
  const tilt = -0.62;
  const pts = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const d = V(Math.sin(a), 0, Math.cos(a)).applyAxisAngle(V(1, 0, 0), tilt).normalize();
    pts.push(sculpt(d).multiplyScalar(R * lift));
  }
  const strapMat = new THREE.MeshPhysicalMaterial({ color: 0x6b4226, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.5 });
  mesh(tube(pts, () => 0.011, { tubular: 128, radial: 10, flat: 0.28, closed: true, up: (P) => P.clone().normalize() }), strapMat, head);
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xc8954a, metalness: 1, roughness: 0.28 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.8 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x8fd3ef, metalness: 0.1, roughness: 0.03, clearcoat: 1, transparent: true, opacity: 0.82 });
  const lensPos = [];
  for (const s of [-1, 1]) {
    const a = s * 0.36;
    const d = V(Math.sin(a), 0, Math.cos(a)).applyAxisAngle(V(1, 0, 0), tilt).normalize();
    const c = sculpt(d).multiplyScalar(R * lift).addScaledVector(d, 0.012);
    lensPos.push(c);
    const lens = new THREE.Group();
    lens.position.copy(c);
    lens.quaternion.setFromUnitVectors(V(0, 1, 0), d);
    head.add(lens);
    mesh(new THREE.CylinderGeometry(0.026, 0.029, 0.02, 40), rubber, lens);
    const ring = mesh(new THREE.TorusGeometry(0.025, 0.0042, 14, 40), brass, lens);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.011;
    mesh(new THREE.SphereGeometry(0.026, 32, 12, 0, Math.PI * 2, 0, 0.6), glass, lens);
  }
  const mid = lensPos[0].clone().lerp(lensPos[1], 0.5);
  mid.addScaledVector(mid.clone().normalize(), 0.006);
  mesh(tube([lensPos[0], mid, lensPos[1]], () => 0.004, { tubular: 16, radial: 8 }), brass, head);
}

/** Aim both eyeballs at a world-space point. */
export function lookAt(boy, target) {
  boy.updateMatrixWorld(true);
  boy.traverse(o => { if (o.userData.eyes) o.userData.eyes.forEach(e => e.lookAt(target)); });
}

export const YUSUF = {
  name: 'Yusuf', seed: 7, R: 0.152, height: 1.04, girth: 0.96, skin: 0xa0694c, hair: 'messy',
  face: { width: 1.0, cheeks: 0.06, jawTaper: 0.27, chin: 0.05 },
  expr: { mouthW: 0.058, mouthH: 0.024, smile: 0.32, asym: 0.0, lid: 0.29, lidTilt: 0.04, browL: 0.05, browR: 0.06 },
  headTilt: [0.04, 0.12, 0.07], pose: 'wave', slippers: [0x2f62c4, 0xf2b53a],
};
export const MUSA = {
  name: 'Musa', seed: 21, R: 0.156, height: 0.97, girth: 1.12, skin: 0x9a6449, hair: 'neat',
  face: { width: 1.0, cheeks: 0.08, jawTaper: 0.22, chin: 0.04 },
  expr: { mouthW: 0.052, mouthH: 0.018, smile: 0.42, asym: 0.0035, lid: 0.31, lidTilt: 0.0, browL: 0.06, browR: 0.0 },
  headTilt: [0.02, -0.14, -0.05], pose: 'hip', slippers: [0x3a9a4a, 0x7a4bc2],
};
