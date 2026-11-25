// Anaya Apa's ride: a GIANT flying chicken tender.
// Golden crispy breading, crinkle-cut fry wings and propeller, dipping-sauce-cup thrusters and tail,
// a toothpick flag, and the whole squad riding on cushions along the top.
// Same interface as buildPlane(): { group, body, seats, seatOrder, tips, tail, kind, setUpgrades, setNight, update }.
import * as THREE from 'three';
import { tube, bakeTree } from './characters.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function hash3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  let r = 0;
  for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) for (let dz = 0; dz < 2; dz++) {
    r += hash3(xi + dx, yi + dy, zi + dz) * (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
  }
  return r * 2 - 1;
}

let crustTex = null;
function crustTexture() {
  if (crustTex) return crustTex;
  const S = 256, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.fillStyle = '#d8962e'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 1400; i++) { // crispy flakes, golden highlights and toasty brown bits
    const x = Math.random() * S, y = Math.random() * S, r = 1 + Math.random() * 5;
    const pick = Math.random();
    g.fillStyle = pick < 0.45 ? `rgba(250,205,110,${0.4 + Math.random() * 0.5})` : pick < 0.85 ? `rgba(165,92,28,${0.3 + Math.random() * 0.5})` : `rgba(110,55,15,${0.4 + Math.random() * 0.4})`;
    g.beginPath(); g.ellipse(x, y, r, r * (0.5 + Math.random() * 0.8), Math.random() * 3, 0, Math.PI * 2); g.fill();
  }
  crustTex = new THREE.CanvasTexture(cv);
  crustTex.wrapS = crustTex.wrapT = THREE.RepeatWrapping;
  crustTex.repeat.set(3, 6);
  crustTex.colorSpace = THREE.SRGBColorSpace;
  return crustTex;
}

/** a crinkle-cut fry: a long box with wavy ridges */
function fry(len, w = 0.24) {
  const g = new THREE.BoxGeometry(w, w, len, 2, 2, 28);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i), k = 1 + 0.12 * Math.sin(z * 22);
    p.setX(i, p.getX(i) * k); p.setY(i, p.getY(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

export function buildTender() {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const add = (geo, mat, parent = body) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };

  // ---- the tender: a fat, slightly bent, lumpy, crispy strip
  const L = 7.2;
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10, z = -L / 2 + t * L;
    pts.push(V(0.35 * Math.sin(t * Math.PI * 1.1 - 0.3), 0.95 + 0.12 * Math.sin(t * Math.PI), z));
  }
  const radius = (t) => {
    const ends = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t * 1.02 - 0.01))), 0.42);
    return 1.0 * (0.55 + 0.45 * ends) * (1 + 0.07 * Math.sin(t * 19));
  };
  const geo = tube(pts, radius, { tubular: 90, radial: 36, flat: 1, up: () => V(0, 1, 0) });
  // flatten top & bottom a bit (tenders are flat-ish) and add crunchy lumps
  const p = geo.attributes.position, n = geo.attributes.normal;
  const center = new THREE.CatmullRomCurve3(pts);
  const cols = [];
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = Math.min(1, Math.max(0, (z + L / 2) / L));
    const cp = center.getPointAt(t);
    y = cp.y + (y - cp.y) * 0.62;          // flatter
    const lump = 0.07 * noise3(x * 2.2, y * 2.2, z * 2.2) + 0.035 * noise3(x * 7, y * 7, z * 7);
    x += n.getX(i) * lump; y += n.getY(i) * lump; z += n.getZ(i) * lump * 0.5;
    p.setXYZ(i, x, y, z);
    // toasty edges, golden middle
    const toast = 0.5 + 0.5 * noise3(x * 1.3 + 5, y * 1.3, z * 1.3);
    c.setRGB(1, 1, 1).lerp(new THREE.Color(0.78, 0.6, 0.45), toast * 0.5 + (t < 0.08 || t > 0.92 ? 0.35 : 0));
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const crust = new THREE.MeshStandardMaterial({ map: crustTexture(), vertexColors: true, roughness: 0.75, bumpMap: crustTexture(), bumpScale: 2.5 });
  add(geo, crust);
  // rounded, extra-crispy ends
  for (const [k, dir] of [[0, -1], [10, 1]]) {
    const cap = new THREE.SphereGeometry(1, 28, 18);
    const cp = cap.attributes.position, ccols = [];
    for (let i = 0; i < cp.count; i++) {
      const x = cp.getX(i), y = cp.getY(i), z = cp.getZ(i);
      const lump = 1 + 0.07 * noise3(x * 3 + k, y * 3, z * 3);
      cp.setXYZ(i, x * lump, y * lump, z * lump);
      ccols.push(0.86, 0.72, 0.58);
    }
    cap.setAttribute('color', new THREE.Float32BufferAttribute(ccols, 3));
    cap.computeVertexNormals();
    const r0 = radius(k / 10) * 1.02;
    const m = add(cap, crust);
    m.position.copy(pts[k]).add(V(0, 0, -dir * 0.05));
    m.scale.set(r0, r0 * 0.62, r0 * 0.9);
  }

  // ---- fry wings (two layers each side) + fry tail fins
  const fryMat = new THREE.MeshStandardMaterial({ color: 0xffd25a, roughness: 0.6, emissive: 0x3a2200 });
  for (const s of [-1, 1]) {
    for (const [dz, dy, len] of [[0.35, 1.05, 4.6], [-0.05, 1.0, 4.2], [-0.45, 0.95, 3.6]]) {
      const f = add(fry(len), fryMat);
      f.rotation.y = s * Math.PI / 2;
      f.rotation.x = 0.0;
      f.position.set(s * (len / 2 + 0.6), dy + 0.08 * (len - 3.6), dz + 0.3);
      f.rotation.z = s * 0.08;
    }
  }
  for (const s of [-1, 1]) {
    const f = add(fry(1.8, 0.2), fryMat);
    f.position.set(s * 0.55, 1.15, -L / 2 + 0.1); f.rotation.set(0, s * 0.9, 0);
  }
  const fin = add(fry(1.3, 0.2), fryMat);
  fin.position.set(0, 1.65, -L / 2 + 0.25); fin.rotation.x = Math.PI / 2 - 0.4;

  // ---- fry propeller on the nose
  const prop = new THREE.Group();
  prop.position.set(pts[10].x, pts[10].y, L / 2 + 0.25);
  body.add(prop);
  for (let i = 0; i < 3; i++) {
    const g = fry(1.5, 0.2); g.rotateX(Math.PI / 2); g.translate(0, 0.75, 0); // fry pointing outward
    const blade = add(g, fryMat, prop);
    blade.rotation.z = i * Math.PI * 2 / 3;
  }
  add(new THREE.SphereGeometry(0.22, 14, 10), new THREE.MeshStandardMaterial({ color: 0xc8202a, roughness: 0.3 }), prop); // a dab of ketchup

  // ---- dipping-sauce cups: two thrusters underneath + honey mustard on the tail
  const cupMat = new THREE.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 0.5 });
  const sauces = [];
  const cup = (x, y, z, sauce, down = true) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    add(new THREE.CylinderGeometry(0.42, 0.32, 0.45, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 0.5, side: THREE.DoubleSide }), g);
    add(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 20).translate(0, -0.22, 0), cupMat, g);
    const s = new THREE.Mesh(new THREE.CircleGeometry(0.4, 20), new THREE.MeshStandardMaterial({ color: sauce, roughness: 0.2, emissive: sauce, emissiveIntensity: 0.15 }));
    s.rotation.x = -Math.PI / 2; s.position.y = 0.16; g.add(s);
    if (down) g.rotation.x = Math.PI; // open side down: sauce-powered thrusters!
    body.add(g);
    sauces.push(g);
    return g;
  };
  cup(-0.75, 0.42, 1.4, 0xd8202a);   // ketchup
  cup(0.75, 0.42, 1.4, 0xf0c020);    // honey mustard
  cup(-0.75, 0.42, -1.6, 0x7a3a1a);  // BBQ
  cup(0.75, 0.42, -1.6, 0xf6eedc);   // ranch
  // thruster glows (warm, like a sizzling fryer)
  const glows = [];
  const glowTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
  for (const [x, z] of [[-0.75, 1.4], [0.75, 1.4], [-0.75, -1.6], [0.75, -1.6]]) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb040, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set(x, 0.05, z); s.scale.set(1.3, 1.3, 1);
    body.add(s); glows.push(s);
  }

  // ---- toothpick flag
  add(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6).translate(0, 0.9, 0), new THREE.MeshStandardMaterial({ color: 0xe8d2a0 }), body).position.set(0.2, 1.3, -2.6);
  const flagCv = document.createElement('canvas'); flagCv.width = 128; flagCv.height = 64;
  const fg = flagCv.getContext('2d');
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { fg.fillStyle = (i + j) % 2 ? '#ffffff' : '#d8202a'; fg.fillRect(i * 32, j * 32, 32, 32); }
  const flagTex = new THREE.CanvasTexture(flagCv); flagTex.colorSpace = THREE.SRGBColorSpace;
  const flag = add(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide }), body);
  flag.position.set(0.65, 2.85, -2.6);
  flag.userData.keep = true; // flaps

  // ---- seats: cushions along the top of the tender, pilot up front with a little steering wheel
  const seats = {};
  const seatOrder = [];
  const topAt = (z) => { const t = (z + L / 2) / L, cp = center.getPointAt(Math.min(1, Math.max(0, t))); return { x: cp.x, y: cp.y + radius(t) * 0.62 - 0.08 }; };
  const layout = [['pilot', 0, 2.3], ['r1a', -0.38, 1.3], ['r1b', 0.38, 1.3], ['r2a', -0.38, 0.4], ['r2b', 0.38, 0.4], ['r3a', -0.38, -0.5], ['r3b', 0.38, -0.5], ['back', -0.38, -1.4], ['back2', 0.38, -1.4]];
  const cushionCols = [0xd8202a, 0xff5fa2, 0xffd23f, 0x5fd35a, 0xff9a3f, 0x8a5cff, 0x3fc5ff, 0xffffff, 0x2fc9a0];
  layout.forEach(([name, dx, z], i) => {
    const top = topAt(z);
    add(new THREE.BoxGeometry(0.5, 0.14, 0.44).translate(top.x + dx, top.y + 0.05, z - 0.1), new THREE.MeshStandardMaterial({ color: cushionCols[i], roughness: 0.8 }));
    const anchor = new THREE.Group();
    anchor.position.set(top.x + dx, top.y + 0.17, z - 0.1);
    body.add(anchor);
    seats[name] = anchor;
    seatOrder.push(name);
  });
  const ft = topAt(2.95);
  const wheel = add(new THREE.TorusGeometry(0.15, 0.03, 8, 20), new THREE.MeshStandardMaterial({ color: 0xd8202a, roughness: 0.4 }));
  wheel.position.set(ft.x, ft.y + 0.45, 2.85); wheel.rotation.x = -0.9;
  add(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0x333333 })).position.set(ft.x, ft.y + 0.2, 2.95);

  // night light: a little lamp on the nose
  const spot = new THREE.SpotLight(0xfff1c8, 0, 90, 0.45, 0.5, 1.2);
  spot.position.set(pts[10].x, pts[10].y + 0.4, L / 2);
  spot.target.position.set(0, -3, L / 2 + 20);
  body.add(spot, spot.target);

  bakeTree(group, [body, prop]);

  let t = 0;
  return {
    group, body, seats, seatOrder, kind: 'tender', propeller: prop,
    tips: [V(4.9, 1.2, 0.6), V(-4.9, 1.2, 0.6)],
    tail: V(0, 1.0, -L / 2 - 0.4),
    setUpgrades() { /* already perfect, says Anaya Apa */ },
    setNight(on) { spot.intensity = on ? 60 : 0; },
    update(dt, speed, boosting) {
      t += dt;
      prop.rotation.z += dt * (8 + speed * 1.6) * (boosting ? 1.6 : 1);
      glows.forEach((g, i) => { const k = (boosting ? 2 : 1.3) + Math.sin(t * 18 + i) * 0.15; g.scale.set(k, k, 1); });
      flag.rotation.y = Math.sin(t * 7) * 0.35;
      body.position.y = Math.sin(t * 2.4) * 0.05;
    },
  };
}
