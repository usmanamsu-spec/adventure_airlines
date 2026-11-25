// Yusuf's ride: a big airplane built from toy building bricks (shiny plastic, studs on top).
// Same interface as buildPlane(): { group, body, seats, seatOrder, tips, tail, kind, setUpgrades, setNight, update }.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { bakeTree } from './characters.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const U = 0.4;         // one stud = 0.4 m
const PLATE = 0.16;    // plate height
const BRICK = 0.48;    // brick height

const COLORS = { red: 0xd01712, blue: 0x0055bf, yellow: 0xf2cd37, white: 0xf4f4f4, black: 0x1b1b1b, grey: 0x8a8d91, green: 0x237841, orange: 0xfe8a18 };
const mats = {};
const plastic = (c) => (mats[c] = mats[c] || new THREE.MeshStandardMaterial({ color: COLORS[c] ?? c, roughness: 0.28, metalness: 0 }));

export function buildLego() {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const add = (geo, mat, parent = body) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const studGeo = new THREE.CylinderGeometry(U * 0.3, U * 0.3, U * 0.17, 12);

  /** a brick (or plate) w x d studs, h tall, with studs on top (optional) */
  const brick = (w, d, h, color, x, y, z, { studs = true, parent = body } = {}) => {
    const m = add(new RoundedBoxGeometry(w * U - 0.01, h, d * U - 0.01, 2, 0.025), plastic(color), parent);
    m.position.set(x, y + h / 2, z);
    if (studs) for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
      const s = add(studGeo, plastic(color), parent);
      s.position.set(x + (i - (w - 1) / 2) * U, y + h + U * 0.085, z + (j - (d - 1) / 2) * U);
    }
    return m;
  };

  // ---- fuselage: a long base plate with brick walls, seats inside
  const W = 5, Lz = 16;                         // 5 studs wide, 16 studs long
  brick(W, Lz, PLATE, 'grey', 0, 0.35, 0, { studs: false });
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) brick(1, 4, BRICK, k % 2 ? 'white' : 'red', s * 2 * U, 0.35 + PLATE, -6 * U + k * 4 * U, { studs: true });
    brick(1, 16, PLATE, 'yellow', s * 2 * U, 0.35 + PLATE + BRICK, 0, { studs: true });        // stripe on top of the wall
  }
  brick(3, 1, BRICK, 'red', 0, 0.35 + PLATE, -7.5 * U, { studs: true });                    // back wall
  // ---- nose: stacked bricks, a windshield, and the engine with a propeller
  brick(W, 3, BRICK, 'white', 0, 0.35 + PLATE, 9.5 * U, { studs: false });
  brick(W, 2, BRICK, 'red', 0, 0.35 + PLATE + BRICK, 10 * U, { studs: true });
  brick(3, 2, BRICK, 'white', 0, 0.35 + PLATE + BRICK * 2, 10 * U, { studs: true });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x9fd8ff, roughness: 0.05, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const ws = add(new THREE.BoxGeometry(W * U - 0.06, 0.62, 0.05), glass);
  ws.position.set(0, 0.35 + PLATE + BRICK * 2 + 0.3, 8.4 * U); ws.rotation.x = -0.55;
  const engine = add(new THREE.CylinderGeometry(0.55, 0.6, 0.5, 16), plastic('grey'));
  engine.rotation.x = Math.PI / 2; engine.position.set(0, 0.35 + PLATE + BRICK, 11.4 * U);
  const prop = new THREE.Group();
  prop.position.set(0, 0.35 + PLATE + BRICK, 11.4 * U + 0.35);
  body.add(prop);
  add(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 12).rotateX(Math.PI / 2), plastic('yellow'), prop);
  for (const s of [-1, 1]) { const b = add(new RoundedBoxGeometry(0.28, 1.7, 0.08, 2, 0.03), plastic('black'), prop); b.position.y = s * 0.85; }

  // ---- wings: big blue plates with yellow wingtips
  for (const s of [-1, 1]) {
    brick(9, 4, PLATE, 'blue', s * (W / 2 + 4.5) * U, 0.6, 2 * U);
    brick(9, 3, PLATE, 'blue', s * (W / 2 + 4.5) * U, 0.6, 5.5 * U);
    brick(2, 4, PLATE, 'yellow', s * (W / 2 + 9 + 1) * U, 0.6, 2 * U);
    brick(1, 2, BRICK, 'red', s * (W / 2 + 3) * U, 0.6 + PLATE, 3 * U); // little engine pods
  }
  // ---- tail: rising bricks, horizontal stabilizers, yellow fin
  brick(3, 2, BRICK, 'red', 0, 0.35 + PLATE, -9 * U);
  brick(3, 2, BRICK, 'red', 0, 0.35 + PLATE + BRICK, -9.5 * U);
  for (const s of [-1, 1]) brick(4, 2, PLATE, 'blue', s * 3.5 * U, 0.35 + PLATE + BRICK * 2, -9.5 * U);
  brick(1, 3, BRICK * 2, 'yellow', 0, 0.35 + PLATE + BRICK * 2, -9.5 * U);
  // ---- landing gear
  for (const [x, z] of [[1.6 * U, 6 * U], [-1.6 * U, 6 * U], [0, -6 * U]]) {
    add(new THREE.BoxGeometry(0.12, 0.3, 0.12), plastic('grey')).position.set(x, 0.2, z);
    const w = add(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 16).rotateZ(Math.PI / 2), plastic('black'));
    w.position.set(x, 0.18, z);
    add(new THREE.CylinderGeometry(0.1, 0.1, 0.17, 12).rotateZ(Math.PI / 2), plastic('white')).position.set(x, 0.18, z);
  }

  // ---- seats: 2x2 bricks inside the fuselage, pilot up front with a little brick steering wheel
  const seats = {}, seatOrder = [];
  const floor = 0.35 + PLATE;
  const layout = [['pilot', 0, 6.5], ['r1a', -1, 4], ['r1b', 1, 4], ['r2a', -1, 1.5], ['r2b', 1, 1.5], ['r3a', -1, -1], ['r3b', 1, -1], ['back', -1, -3.5], ['back2', 1, -3.5]];
  const seatCols = ['blue', 'yellow', 'green', 'orange', 'white', 'blue', 'yellow', 'green', 'orange'];
  layout.forEach(([name, sx, sz], i) => {
    brick(2, 2, BRICK * 0.66, seatCols[i], sx * 0.45, floor, sz * U, { studs: false });
    brick(2, 1, BRICK, seatCols[i], sx * 0.45, floor, sz * U - 0.6, { studs: true }); // backrest
    const a = new THREE.Group();
    a.position.set(sx * 0.45, floor + BRICK * 0.66 + 0.02, sz * U - 0.1);
    body.add(a);
    seats[name] = a; seatOrder.push(name);
  });
  const wheel = add(new THREE.TorusGeometry(0.16, 0.035, 8, 20), plastic('black'));
  wheel.position.set(0, floor + 0.75, 7.6 * U); wheel.rotation.x = -0.9;
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), plastic('grey')).position.set(0, floor + 0.45, 7.8 * U);

  const spot = new THREE.SpotLight(0xfff1c8, 0, 90, 0.45, 0.5, 1.2);
  spot.position.set(0, 0.9, 12 * U); spot.target.position.set(0, -3, 30);
  body.add(spot, spot.target);

  bakeTree(group, [body, prop]);
  let t = 0;
  return {
    group, body, seats, seatOrder, kind: 'lego', propeller: prop,
    tips: [V(6.6, 0.75, 0.8), V(-6.6, 0.75, 0.8)],
    tail: V(0, 1.0, -4.3),
    setUpgrades() {},
    setNight(on) { spot.intensity = on ? 60 : 0; },
    update(dt, speed, boosting) {
      t += dt;
      prop.rotation.z += dt * (8 + speed * 1.6) * (boosting ? 1.6 : 1);
      body.position.y = Math.sin(t * 7) * 0.012 * Math.min(1, speed / 10);
    },
  };
}
