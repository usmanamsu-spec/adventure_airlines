// The cross-country flight: Plano → Dallas → Little Rock → Memphis → Nashville → Smoky Mountains
// → Blue Ridge → Pilot Mountain → Greensboro. Short, but packed with (stylized) landmarks.
import * as THREE from 'three';
import { smooth, lerp, fbm2, rng } from '../util.js';
import { tube } from '../characters.js';
import { hotAirBalloon, trainCar, rails, shuttle } from './props.js';
import { scatterTrees, sign, label3d } from './helpers.js';
import { buildGreensboro, GSO } from './greensboro.js';

const PI = Math.PI;

// ---------------------------------------------------------------- the flight path (x as a function of z)
const PATH = [[0, -200], [0, 120], [-30, 280], [-20, 420], [20, 620], [40, 820], [10, 1000], [-10, 1240], [20, 1450], [35, 1680],
  [10, 1880], [-30, 2080], [15, 2300], [0, 2500], [-25, 2700], [-15, 2920], [20, 3120], [25, 3300], [0, 3520],
  [30, 3700], [-15, 3860], [25, 4000], [0, 4130], [-5, 4260], [15, 4400], [0, 4560], [0, 5200]];
export function tripPath(z) {
  if (z <= PATH[0][1]) return PATH[0][0];
  for (let i = 0; i < PATH.length - 1; i++) {
    const [x0, z0] = PATH[i], [x1, z1] = PATH[i + 1];
    if (z <= z1) { const t = (z - z0) / (z1 - z0); return lerp(x0, x1, (1 - Math.cos(PI * t)) / 2); }
  }
  return PATH[PATH.length - 1][0];
}

// cities and rivers sit on flat ground
const FLAT = [[-400, 560], [740, 900], [1150, 1430], [1580, 1800], [3540, 5300]];
const flatMask = (z) => {
  let k = 1;
  for (const [a, b] of FLAT) k *= 1 - smooth(a - 90, a, z) * (1 - smooth(b, b + 90, z));
  return k;
};
const gauss2 = (x, z, cx, cz, s) => Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (s * s));
export const CLINGMANS = { z: 2320, dx: 95 };
export const PILOT = { z: 3300, dx: 130 };

export function tripHeight(x, z) {
  const px = tripPath(z), d = Math.abs(x - px);
  const hills = 7 * smooth(600, 700, z) * (1 - smooth(1100, 1150, z)) + 16 * smooth(1430, 1520, z) * (1 - smooth(1900, 2000, z)) + 10 * smooth(3120, 3200, z) * (1 - smooth(3480, 3540, z));
  const mtn = lerp(150, 105, smooth(2600, 2750, z)) * smooth(1930, 2060, z) * (1 - smooth(3060, 3200, z));
  let h = hills * (fbm2(x * 0.004 + 3, z * 0.004, 3) * 0.5 + 0.5);
  h += mtn * Math.max(0, fbm2(x * 0.0032, z * 0.0032, 4) + 0.42) * smooth(38, 140, d);
  h += 120 * gauss2(x, z, tripPath(CLINGMANS.z) + CLINGMANS.dx, CLINGMANS.z, 62) * smooth(30, 80, d);
  h += 55 * gauss2(x, z, tripPath(PILOT.z) + PILOT.dx, PILOT.z, 80);
  return h * flatMask(z);
}

// ---------------------------------------------------------------- animated farm props
function pumpjack(w, x, z) {
  const g = new THREE.Group();
  const m = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 9), m(0x555555)); base.position.y = 0.3;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.5), m(0x3a5a8a)); frame.position.set(0, 2.8, 0);
  const beam = new THREE.Group(); beam.position.set(0, 5.3, 0);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 9), m(0xd8b030)); beam.add(bar);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 1.2), m(0xd8b030)); head.position.set(0, -0.6, 4.6); beam.add(head);
  g.add(base, frame, beam);
  g.position.set(x, w.groundHeight(x, z), z);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  w.add(g);
  const ph = Math.random() * 6;
  w.addDyn((dt, t) => { beam.rotation.x = Math.sin(t * 1.6 + ph) * 0.28; });
}
function windmill(w, x, z) {
  const y = w.groundHeight(x, z);
  w.box(x, y, z, 1, 16, 1, 0x888888);
  const rotor = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.6, 0.08), new THREE.MeshStandardMaterial({ color: 0xe8e8e8 }));
    b.position.y = 1.6; const arm = new THREE.Group(); arm.rotation.z = i * PI / 6; arm.add(b); rotor.add(arm);
  }
  rotor.position.set(x, y + 16, z + 0.7);
  w.add(rotor);
  w.addDyn((dt) => { rotor.rotation.z += dt * 2.5; });
}
function barn(w, x, z, ry) {
  const y = w.groundHeight(x, z);
  w.box(x, y, z, 10, 6, 14, 0xb3261e, { ry });
  w.shape('roof', x, y + 6, z, 11, 4, 15, 0x4a4a4a, { ry: ry + PI / 2 });
  w.box(x + Math.sin(ry) * 7.05, y, z + Math.cos(ry) * 7.05, 4, 4.5, 0.2, 0xf4f0e8, { ry });
  w.shape('cyl', x + 9 * Math.cos(ry), y, z - 9 * Math.sin(ry), 4, 12, 4, 0xcfcfcf);
  w.shape('dome', x + 9 * Math.cos(ry), y + 12, z - 9 * Math.sin(ry), 4, 3, 4, 0x8a8a8a);
}
function cows(w, x, z, n) {
  for (let i = 0; i < n; i++) {
    const cx = x + (w.r() - 0.5) * 60, cz = z + (w.r() - 0.5) * 60, y = w.groundHeight(cx, cz);
    w.box(cx, y + 0.6, cz, 1.2, 1.2, 2.4, w.r() < 0.5 ? 0x5a3a2a : 0xf2f2f2, { ry: w.r() * 3 });
  }
}
function towersCluster(w, x0, x1, z0, z1, { n = 14, hmin = 30, hmax = 100, cols = [0x8ea6bf, 0x9fb3c8, 0x7f95ad, 0xb5c2cf, 0xc8b89a, 0xa0a8b0] } = {}) {
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, w.r()), z = lerp(z0, z1, w.r());
    const center = 1 - Math.min(1, Math.hypot((x - (x0 + x1) / 2) / ((x1 - x0) / 2), (z - (z0 + z1) / 2) / ((z1 - z0) / 2)));
    w.building(x, z, 16 + w.r() * 10, 16 + w.r() * 10, hmin + (hmax - hmin) * (0.3 + 0.7 * center) * (0.6 + w.r() * 0.4), cols[Math.floor(w.r() * cols.length)]);
  }
}

// ---------------------------------------------------------------- build
export function buildTrip(w) {
  const P = tripPath, G = (x, z) => w.groundHeight(x, z);
  const rings = [], photo = [];
  const ring = (x, y, z, isPhoto = false) => { if (isPhoto) photo.push(rings.length); rings.push([x, y, z]); };
  const air = (z, h = 30) => [P(z), G(P(z), z) + h, z];

  // ===== TEXAS: Plano start, Dallas skyline, Reunion Tower, Trinity River, oil country
  for (let z = -180; z < 140; z += 26) for (const s of [-1, 1]) {
    w.house(s * 32 + (w.r() - 0.5) * 6, z, s > 0 ? -PI / 2 : PI / 2);
    if (w.r() < 0.6) w.tree(s * 52, z + 10);
  }
  w.road(0, -200, 0, 150, 10);
  towersCluster(w, -330, -150, 230, 420, { n: 18 });
  w.building(-200, 300, 24, 24, 115, 0x4a5a6a);
  for (const [dx, dz] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) w.box(-200 + dx, 0, 300 + dz, 0.6, 116, 0.6, 0x3cff7a, { batch: 'glow' });
  const RT = new THREE.Vector3(-95, 0, 330);
  w.shape('cyl', RT.x, 0, RT.z, 7, 84, 7, 0xd8d4cc);
  w.addBoxCollider(RT.x, 0, RT.z, 12, 82, 12);
  const ball = new THREE.Group();
  ball.position.set(RT.x, 92, RT.z);
  ball.add(new THREE.Mesh(new THREE.IcosahedronGeometry(13, 2), new THREE.MeshStandardMaterial({ color: 0x9aa4b0, metalness: 0.8, roughness: 0.25, flatShading: true })));
  const dots = new THREE.Points(new THREE.IcosahedronGeometry(13.3, 3), new THREE.PointsMaterial({ color: 0xffe9a0, size: 1.4, toneMapped: false }));
  ball.add(dots);
  w.add(ball);
  w.addDyn((dt, t) => dots.material.color.setHSL((t * 0.06) % 1, 0.9, 0.7));
  w.addSphereCollider(new THREE.Vector3(RT.x, 92, RT.z), 14);
  label3d(w, 'Dallas · Reunion Tower', RT.x, 114, RT.z, 5);
  ring(RT.x + 44, 88, RT.z, true);
  w.waterRect(0, 480, 1000, 40, 0x3b7fb0);
  w.box(-230, 10, 480, 12, 1.4, 90, 0xeeeeee, { collide: true });
  const arch = [];
  for (let i = 0; i <= 16; i++) arch.push(new THREE.Vector3(-230, 11 + Math.sin(i / 16 * PI) * 36, 440 + i * 5));
  w.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arch), 32, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })));
  for (let i = 0; i < 18; i++) w.lawn(-300 + w.r() * 600, 520 + w.r() * 60, 50 + w.r() * 60, 40, [0xd8c070, 0xc8b060, 0x9fc060][i % 3]);
  for (const [x, z] of [[60, 525], [95, 545], [-70, 535], [140, 530]]) pumpjack(w, x, z);
  windmill(w, -120, 550);
  cows(w, 120, 560, 10);
  sign(w, P(600) + 34, 600, PI, 'Welcome to\nARKANSAS', { bg: '#1f5fa8' });
  ring(...air(470, 22));

  // ===== ARKANSAS: forests, Little Rock, the Arkansas River and the Big Dam Bridge
  scatterTrees(w, 0, 870, 420, 280, 380, { collide: false, pine: true, pineRatio: 0.45 }, (x, z) => Math.abs(x - P(z)) < 45 || (z > 740 && z < 900));
  w.waterRect(0, 820, 1000, 70, 0x4a7f9a);
  const bx = P(820) + 75;
  w.box(bx, 21, 820, 6, 1.2, 150, 0xd8d8d8, { collide: true });
  for (let z = 750; z <= 890; z += 28) w.box(bx, 0, z, 3, 21, 3, 0xbfbfbf);
  towersCluster(w, P(820) + 170, P(820) + 300, 760, 880, { n: 9, hmax: 70 });
  const cap = P(770) - 150;
  w.box(cap, 0, 770, 50, 14, 22, 0xf2efe6, { collide: true });
  w.shape('cyl', cap, 14, 770, 12, 8, 12, 0xf2efe6);
  w.shape('dome', cap, 22, 770, 14, 12, 14, 0xe8e2d4);
  label3d(w, 'Little Rock · Arkansas River', P(820), 48, 820, 4.5);
  ring(...air(820, 30), true);
  ring(...air(1030, 30));

  // ===== MISSISSIPPI RIVER at Memphis: the M-bridge and the Pyramid
  w.waterRect(0, 1240, 1200, 140, 0x3f6f8a);
  const MB = P(1240) - 90;
  w.box(MB, 22, 1240, 14, 1.6, 200, 0x8a8f96, { collide: true });
  for (const z of [1150, 1330]) w.box(MB, 0, z, 6, 22, 8, 0x9a9a9a, { collide: true });
  const lights = [];
  for (const zc of [1205, 1275]) {
    const pts = [];
    for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new THREE.Vector3(MB, 23 + Math.sin(t * PI) * 40, zc - 35 + t * 70)); }
    w.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0xd8dde2, metalness: 0.5, roughness: 0.4 })));
    pts.forEach(p => lights.push(p.clone().add(new THREE.Vector3(0, 1.6, 0))));
    w.addBoxCollider(MB, 23, zc, 16, 42, 50);
  }
  const lp = new THREE.Points(new THREE.BufferGeometry().setFromPoints(lights), new THREE.PointsMaterial({ color: 0xfff0b0, size: 2.2, toneMapped: false }));
  w.add(lp);
  const pyr = new THREE.Mesh(new THREE.ConeGeometry(64, 78, 4), new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.85, roughness: 0.25, envMapIntensity: 1.3 }));
  pyr.rotation.y = PI / 4;
  pyr.position.set(P(1370) + 150, 39, 1370);
  w.add(pyr);
  w.addBoxCollider(pyr.position.x, 0, 1370, 80, 70, 80);
  towersCluster(w, P(1370) + 240, P(1370) + 360, 1330, 1420, { n: 8, hmax: 65 });
  label3d(w, 'Mississippi River · Memphis', P(1240), 52, 1240, 5);
  ring(...air(1240, 34), true);
  ring(pyr.position.x - 58, 58, 1370, true);
  sign(w, P(1440) + 34, 1440, PI, 'Welcome to\nTENNESSEE', { bg: '#c8323a' });

  // ===== TENNESSEE (autumn!): farms, Nashville, the Smoky Mountains
  for (let i = 0; i < 6; i++) { const z = 1480 + w.r() * 100, x = P(z) + (w.r() < 0.5 ? -1 : 1) * (70 + w.r() * 150); barn(w, x, z, w.r() * 3); }
  for (let i = 0; i < 5; i++) { const z = 1830 + w.r() * 120, x = P(z) + (w.r() < 0.5 ? -1 : 1) * (70 + w.r() * 150); barn(w, x, z, w.r() * 3); }
  scatterTrees(w, 0, 1700, 420, 300, 420, { collide: false }, (x, z) => Math.abs(x - P(z)) < 40 || (z > 1580 && z < 1800 && Math.abs(x - P(z)) < 300));
  w.waterRect(0, 1700, 1000, 45, 0x4a7f9a);
  w.box(P(1700) + 30, 14, 1700, 8, 1.2, 70, 0xb3261e, { collide: true });
  for (let i = 0; i < 6; i++) w.box(P(1700) + 30, 15, 1672 + i * 11, 8, 6, 0.6, 0xb3261e);
  towersCluster(w, P(1650) + 70, P(1650) + 250, 1600, 1780, { n: 14, hmax: 80, cols: [0x8ea6bf, 0xc8b89a, 0xb5c2cf, 0x9a8a7a] });
  const BB = [P(1650) + 120, 1650];
  w.building(BB[0], BB[1], 26, 20, 96, 0x4f5f78, { rooftop: false });
  for (const s of [-1, 1]) w.shape('cone4', BB[0] + s * 9, 96, BB[1], 5, 26, 5, 0x3f4a5a);
  w.box(BB[0], 96, BB[1], 12, 8, 18, 0x4f5f78);
  w.addBoxCollider(BB[0], 96, BB[1], 26, 26, 20);
  label3d(w, 'Nashville · "Batman Building"', BB[0], 132, BB[1], 4.5);
  const PA = [P(1640) - 150, 1640];
  w.lawn(PA[0], PA[1], 90, 70, 0x7fae4a);
  w.box(PA[0], 0, PA[1], 32, 2, 16, 0xe8e2d4, { collide: true });
  for (let i = 0; i < 9; i++) for (const s of [-1, 1]) w.shape('cyl', PA[0] - 14 + i * 3.5, 2, PA[1] + s * 7, 1.3, 10, 1.3, 0xf2eee4);
  w.box(PA[0], 12, PA[1], 32, 1.5, 16, 0xe8e2d4);
  w.shape('roof', PA[0], 13.5, PA[1], 16.5, 4, 33, 0xd8d0c0, { ry: 0 });
  label3d(w, 'The Parthenon', PA[0], 26, PA[1], 3.6);
  ring(BB[0] - 46, 72, BB[1], true);

  // Smoky Mountains: fall colours, mist, Clingmans Dome
  const r = rng(12);
  for (let i = 0; i < 1500; i++) {
    const z = 1960 + r() * 700, x = P(z) + (r() - 0.5) * 820;
    if (Math.abs(x - P(z)) < 32) continue;
    w.tree(x, z, { kind: r() < 0.22 ? 'pine' : 'round', s: 1.25, collide: false });
  }
  for (let i = 0; i < 46; i++) {
    const z = 1980 + r() * 680, x = P(z) + (r() - 0.5) * 520;
    w.mist(x, G(x, z) + 14 + r() * 24, z, 55 + r() * 40, 0.3);
  }
  const CX = P(CLINGMANS.z) + CLINGMANS.dx, CZ = CLINGMANS.z, CY = G(CX, CZ);
  w.shape('cyl', CX, CY, CZ, 6, 16, 6, 0xd8d4cc);
  const helix = [];
  for (let i = 0; i <= 60; i++) { const a = i / 60 * PI * 3; helix.push(new THREE.Vector3(CX + Math.cos(a) * 12, CY + 1 + i / 60 * 15, CZ + Math.sin(a) * 12)); }
  w.add(new THREE.Mesh(tube(helix, () => 1.4, { tubular: 120, radial: 6, flat: 0.3, up: () => new THREE.Vector3(0, 1, 0) }), new THREE.MeshStandardMaterial({ color: 0xcfcac0, roughness: 0.8 })));
  w.shape('disc', CX, CY + 16, CZ, 18, 1.2, 18, 0xd8d4cc);
  w.addBoxCollider(CX, CY, CZ, 26, 18, 26);
  label3d(w, 'Smoky Mountains · Clingmans Dome', CX, CY + 34, CZ, 4.5);
  ring(...air(2120, 32));
  ring(CX - 42, CY + 24, CZ, true);
  ring(...air(2520, 32));
  sign(w, P(2665) + 30, 2665, PI, 'Welcome to\nNORTH CAROLINA', { bg: '#2e6b3a' });

  // ===== NORTH CAROLINA: Blue Ridge Parkway viaduct, Pilot Mountain, then Greensboro
  for (let i = 0; i < 900; i++) {
    const z = 2660 + r() * 860, x = P(z) + (r() - 0.5) * 820;
    if (Math.abs(x - P(z)) < 34) continue;
    w.tree(x, z, { kind: r() < 0.35 ? 'pine' : 'round', s: 1.15, collide: false });
  }
  for (let i = 0; i < 20; i++) { const z = 2700 + r() * 420, x = P(z) + (r() - 0.5) * 500; w.mist(x, G(x, z) + 18 + r() * 20, z, 60, 0.25); }
  // Linn Cove Viaduct: a road that curves around the side of the mountain on stilts
  const vpts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, z = 2870 + t * 140, x = P(z) - 70 - Math.sin(t * PI) * 22;
    vpts.push(new THREE.Vector3(x, 0, z));
  }
  const vy = Math.max(...vpts.map(p => G(p.x, p.z))) * 0.6 + 14;
  vpts.forEach((p, i) => {
    p.y = vy;
    if (i < vpts.length - 1) {
      const q = vpts[i + 1];
      w.box((p.x + q.x) / 2, vy, (p.z + q.z) / 2, 8, 1.4, Math.hypot(q.x - p.x, q.z - p.z) + 0.5, 0xbfb7aa, { ry: Math.atan2(q.x - p.x, q.z - p.z), collide: true });
    }
    if (i % 2 === 0) { const gy = G(p.x, p.z); if (vy > gy) w.box(p.x, gy, p.z, 2.4, vy - gy, 2.4, 0xa9a196); }
  });
  label3d(w, 'Blue Ridge Parkway · Linn Cove Viaduct', vpts[8].x, vy + 22, vpts[8].z, 4.2);
  ring(vpts[8].x + 34, vy + 10, vpts[8].z, true);
  // Pilot Mountain: the famous knob
  const PX = P(PILOT.z) + PILOT.dx, PZ = PILOT.z, PY = G(PX, PZ);
  w.shape('cyl', PX, PY - 4, PZ, 52, 46, 46, 0x8a7a68);
  w.shape('cyl', PX, PY + 40, PZ, 48, 2, 42, 0x6a8a4a);
  for (let i = 0; i < 14; i++) { const a = r() * PI * 2, d = r() * 18; w.tree(PX + Math.cos(a) * d, PZ + Math.sin(a) * d, { kind: 'pine', s: 0.7, collide: false }); }
  w.addBoxCollider(PX, PY - 4, PZ, 52, 60, 46);
  label3d(w, 'Pilot Mountain', PX, PY + 70, PZ, 4.5);
  ring(PX - 56, PY + 34, PZ, true);
  for (let i = 0; i < 5; i++) { const z = 3380 + r() * 140, x = P(z) + (r() < 0.5 ? -1 : 1) * (70 + r() * 140); barn(w, x, z, r() * 3); }

  // ===== GREENSBORO (detailed, at sunset)
  const g = buildGreensboro(w, P);
  g.rings.forEach(([x, y, z, ph]) => ring(x, y, z, ph));

  // a few hot-air balloons and clouds for good measure
  [[60, 120, 380], [-150, 140, 1050], [200, 150, 1900], [-180, 160, 3400], [160, 130, 3900]].forEach(([x, y, z], i) => {
    const b = hotAirBalloon([[0xff4f4f, 0xffd23f], [0x3fa0ff, 0xffffff, 0xff4f6a], [0x9b5de5, 0xf15bb5, 0xfee440, 0x00bbf9]][i % 3], i);
    b.position.set(x, y, z);
    w.add(b);
    w.addDyn((dt, t) => { b.position.y = y + Math.sin(t * 0.4 + i) * 3; });
  });
  for (let i = 0; i < 26; i++) w.cloud(-350 + r() * 700, 150 + r() * 50, r() * 4900, 1.5);
  // freight train through Arkansas
  rails(w, -150, 640, -150, 1120);
  const train = new THREE.Group();
  [0xd8323a, 0x2f62c4, 0x2f8f5a, 0xf2b53a].forEach((c, i) => { const car = trainCar(c, 15); car.position.z = -i * 17; train.add(car); });
  shuttle(w, train, -150, 680, -150, 1100, 11);

  const juice = [];
  for (let i = 0; i < rings.length - 1; i++) {
    const a = rings[i], b = rings[i + 1];
    juice.push([(a[0] + b[0]) / 2 + 8, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
  }
  return {
    spawn: { p: [0, 26, -150], h: 0 },
    objectives: [{ type: 'rings', label: 'Landmarks', rings, r: 12, style: 'waypoint', photo }],
    landing: { p: [GSO.landX, GSO.landZ], h: 0, len: 90, wid: 14, text: 'Land on Musa\'s street!' },
    juice,
    sock: [PX, PY + 52, PZ],
    bounds: { corridor: true, x: 360, z0: -260, z1: 5150, path: tripPath },
    progress: [
      [230, 'dallas'], [600, 'state:Arkansas'], [760, 'littlerock'], [1170, 'mississippi'], [1330, 'memphis'], [1440, 'state:Tennessee'],
      [1520, 'fall'], [1590, 'nashville'], [1960, 'smokies'], [2260, 'clingmans'], [2665, 'state:North Carolina'], [2860, 'viaduct'],
      [3230, 'pilot'], [3560, 'greensboro'], [3640, 'guilford'], [3820, 'science'], [3960, 'coliseum'], [4080, 'downtown'],
      [4220, 'lebauer'], [4360, 'depot'], [4460, 'aandt'], [4600, 'home'],
    ],
    candySpacing: 55,
    candyCap: 80,
    candyRatio: 0.45,
    cruise: 1.3,
  };
}
