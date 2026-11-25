// The Backyard Squadron plane: a refrigerator box with pool-noodle wings and a box-fan propeller.
import * as THREE from 'three';
import { rng } from './util.js';

export const PAINTS = {
  cardboard: { name: 'Classic Cardboard', color: 0xc89a5c, cost: 0 },
  sky: { name: 'Sky Blue', color: 0x6fb6e8, cost: 2 },
  racing: { name: 'Racing Red', color: 0xd8443a, cost: 4 },
  lime: { name: 'Lime Zoom', color: 0x9bd243, cost: 6 },
  grape: { name: 'Grape Jet', color: 0x8a5cc9, cost: 8 },
  gold: { name: 'Gold Star', color: 0xe8b830, cost: 12 },
};

export const UPGRADES = {
  wings: { name: 'Patio-Umbrella Wings', desc: 'Tighter turns', cost: 3 },
  blower: { name: 'Leaf-Blower Engine', desc: 'Bigger boost tank', cost: 4 },
  floats: { name: 'Flamingo Floats', desc: 'Splash-proof and fabulous', cost: 3 },
};

function boxTexture(color, seed = 5) {
  const W = 512, H = 256;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const c = new THREE.Color(color);
  g.fillStyle = '#' + c.getHexString();
  g.fillRect(0, 0, W, H);
  // corrugation
  for (let x = 0; x < W; x += 6) {
    g.fillStyle = `rgba(0,0,0,${x % 12 ? 0.035 : 0.06})`;
    g.fillRect(x, 0, 2, H);
  }
  const r = rng(seed);
  // scuffs
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(80,50,20,${0.05 + r() * 0.06})`;
    g.beginPath(); g.ellipse(r() * W, r() * H, 6 + r() * 20, 3 + r() * 8, r() * 3, 0, Math.PI * 2); g.fill();
  }
  // duct tape strips
  g.fillStyle = 'rgba(170,175,180,0.92)';
  g.fillRect(0, 26, W, 22);
  g.fillRect(W * 0.62, 0, 26, H);
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.fillRect(0, 28, W, 4);
  // marker writing
  g.save();
  g.translate(W * 0.08, H * 0.7);
  g.rotate(-0.04);
  g.fillStyle = '#1b1b1b';
  g.font = 'bold 42px "Marker Felt", "Comic Sans MS", "Chalkboard SE", cursive';
  g.fillText('BACKYARD SQUADRON', 0, 0);
  g.font = 'bold 30px "Marker Felt", "Comic Sans MS", cursive';
  g.fillStyle = '#b3121f';
  g.fillText('Y + M  ★', 60, 50);
  g.restore();
  // "THIS SIDE UP" arrows
  g.fillStyle = '#2a2a2a';
  g.font = 'bold 16px Arial';
  g.fillText('THIS SIDE UP ↑↑', W * 0.68 + 30, H * 0.3);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function stripeTexture(colors) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 16;
  const g = cv.getContext('2d');
  const w = 256 / colors.length;
  colors.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * w, 0, w + 1, 16); });
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });

function add(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/**
 * Build the plane. Local axes: +z forward, +y up, +x left wing.
 * Returns { group, update(dt, speed, boosting), seats: { pilot, ... }, seatOrder, setNight(on) }.
 * Big enough for the whole squad: a pilot up front, three rows of two, and one seat at the back.
 */
export function buildPlane({ upgrades = {}, paint = 'cardboard' } = {}) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const boxColor = PAINTS[paint]?.color ?? PAINTS.cardboard.color;
  const boxMat = new THREE.MeshStandardMaterial({ map: boxTexture(boxColor), roughness: 0.95 });
  const inside = std(new THREE.Color(boxColor).multiplyScalar(0.7).getHex(), { side: THREE.DoubleSide });
  const tape = std(0xaab0b6, { roughness: 0.5, metalness: 0.2 });

  // --- the fridge box (open top) ---
  const L = 5.2, W = 1.5, H = 0.7, T = 0.03;
  add(body, new THREE.BoxGeometry(W, T, L), inside, 0, T / 2, 0);
  add(body, new THREE.BoxGeometry(T, H, L), boxMat, W / 2, H / 2, 0);
  add(body, new THREE.BoxGeometry(T, H, L), boxMat, -W / 2, H / 2, 0);
  add(body, new THREE.BoxGeometry(W, H, T), boxMat, 0, H / 2, L / 2);
  add(body, new THREE.BoxGeometry(W, H, T), boxMat, 0, H / 2, -L / 2);
  // flaps folded out
  for (const s of [-1, 1]) {
    const flap = add(body, new THREE.BoxGeometry(0.28, T, L * 0.96), boxMat, s * (W / 2 + 0.12), H + 0.03, 0);
    flap.rotation.z = s * 0.35;
  }
  // seats (coolers)
  const seatMat = std(0x2f7fd0, { roughness: 0.5 });
  const lid = std(0xffffff, { roughness: 0.4 });
  const seats = {};
  const seatOrder = [];
  const layout = [['pilot', 0, 1.95], ['r1a', -0.38, 0.95], ['r1b', 0.38, 0.95], ['r2a', -0.38, -0.05], ['r2b', 0.38, -0.05], ['r3a', -0.38, -1.05], ['r3b', 0.38, -1.05], ['back', 0, -1.95]];
  const seatCols = [0x2f7fd0, 0xff5fa2, 0xffd23f, 0x5fd35a, 0xff9a3f, 0x8a5cff, 0x3fc5ff, 0xd8323a];
  layout.forEach(([name, x, z], i) => {
    add(body, new THREE.BoxGeometry(0.56, 0.32, 0.42), std(seatCols[i], { roughness: 0.5 }), x, 0.16, z - 0.12);
    add(body, new THREE.BoxGeometry(0.58, 0.05, 0.44), lid, x, 0.345, z - 0.12);
    const anchor = new THREE.Group();
    anchor.position.set(x, 0.37, z - 0.1);
    body.add(anchor);
    seats[name] = anchor;
    seatOrder.push(name);
  });
  void seatMat;
  // toy steering wheel
  const wheel = add(body, new THREE.TorusGeometry(0.13, 0.022, 8, 24), std(0xf2c230, { roughness: 0.4 }), 0, 0.72, 2.36);
  wheel.rotation.x = -0.9;
  add(body, new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), std(0x333333), 0, 0.54, 2.52).rotation.x = -0.9;

  // --- nose: cereal box + box fan ---
  const nose = new THREE.Group();
  nose.position.set(0, 0.42, L / 2 + 0.02);
  body.add(nose);
  const fanFrame = std(0xf4f4f0, { roughness: 0.5 });
  const fan = new THREE.Group();
  fan.position.set(0, 0, 0.18);
  nose.add(fan);
  add(fan, new THREE.BoxGeometry(0.66, 0.66, 0.12), fanFrame);
  const grill = add(fan, new THREE.TorusGeometry(0.28, 0.012, 6, 32), std(0x9aa2a8, { metalness: 0.6, roughness: 0.4 }), 0, 0, 0.07);
  grill.scale.set(1, 1, 1);
  for (let i = 0; i < 4; i++) {
    const bar = add(fan, new THREE.BoxGeometry(0.58, 0.012, 0.012), std(0x9aa2a8, { metalness: 0.6 }), 0, 0, 0.075);
    bar.rotation.z = i * Math.PI / 4;
  }
  add(fan, new THREE.CylinderGeometry(0.29, 0.29, 0.1, 32, 1, true), std(0x2d2d30, { side: THREE.DoubleSide }), 0, 0, 0).rotation.x = Math.PI / 2;
  const prop = new THREE.Group();
  prop.position.set(0, 0, 0.03);
  fan.add(prop);
  const bladeMat = std(0x7fc8ff, { roughness: 0.3, transparent: true, opacity: 0.9 });
  for (let i = 0; i < 3; i++) {
    const b = add(prop, new THREE.SphereGeometry(0.13, 12, 8), bladeMat);
    b.scale.set(0.45, 1, 0.12);
    b.position.set(Math.sin(i * 2.094) * 0.13, Math.cos(i * 2.094) * 0.13, 0);
    b.rotation.z = -i * 2.094;
  }
  add(prop, new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16), std(0xff5a3a), 0, 0, 0.02).rotation.x = Math.PI / 2;
  // bike headlight
  const lamp = add(body, new THREE.CylinderGeometry(0.07, 0.06, 0.12, 16), std(0x222222), 0.38, 0.74, L / 2 + 0.05);
  lamp.rotation.x = Math.PI / 2;
  const lampGlass = add(body, new THREE.CircleGeometry(0.06, 16), new THREE.MeshStandardMaterial({ color: 0xfff6d0, emissive: 0xfff3c0, emissiveIntensity: 0.3 }), 0.38, 0.74, L / 2 + 0.115);

  // --- wings ---
  const wingGroup = new THREE.Group();
  body.add(wingGroup);
  const noodleColors = [0xff5fa2, 0xffd23f, 0x3fc5ff];
  const noodles = new THREE.Group();
  wingGroup.add(noodles);
  noodleColors.forEach((c, i) => {
    const n = add(noodles, new THREE.CylinderGeometry(0.1, 0.1, 8.4, 12), std(c, { roughness: 0.6 }), 0, 0.76, 0.55 - i * 0.21);
    n.rotation.z = Math.PI / 2;
  });
  for (const s of [-1, 1]) {
    const tp = add(noodles, new THREE.BoxGeometry(0.14, 0.22, 0.75), tape, s * 0.77, 0.76, 0.34);
    tp.rotation.z = 0;
  }
  // umbrella wings (upgrade)
  const umbrella = new THREE.Group();
  wingGroup.add(umbrella);
  const umbTex = stripeTexture(['#f04848', '#fff4e0', '#f04848', '#fff4e0', '#f04848', '#fff4e0', '#f04848', '#fff4e0']);
  umbTex.wrapS = THREE.RepeatWrapping;
  const canopy = add(umbrella, new THREE.ConeGeometry(2.1, 0.6, 16, 1, true), new THREE.MeshStandardMaterial({ map: umbTex, roughness: 0.7, side: THREE.DoubleSide }), 0, 1.75, -0.1);
  add(umbrella, new THREE.CylinderGeometry(0.025, 0.025, 1.3, 8), std(0xdddddd, { metalness: 0.6 }), 0, 1.1, -0.1);
  for (const s of [-1, 1]) {
    const w = add(umbrella, new THREE.BoxGeometry(3.8, 0.06, 1.0), new THREE.MeshStandardMaterial({ map: umbTex, roughness: 0.7 }), s * 2.6, 0.78, 0.35);
    w.rotation.z = s * 0.06;
  }
  canopy.rotation.y = 0.2;

  // --- tail: pizza box + cereal box fin ---
  const pizza = add(body, new THREE.BoxGeometry(2.6, 0.06, 0.8), std(0xf0e6d2), 0, 0.66, -L / 2 - 0.35);
  const pizzaLogo = add(body, new THREE.CircleGeometry(0.16, 20), std(0xd8443a), 0, 0.755, -L / 2 - 0.25);
  pizzaLogo.rotation.x = -Math.PI / 2;
  void pizza;
  const fin = add(body, new THREE.BoxGeometry(0.08, 1.0, 0.7), std(0xffc93c), 0, 1.1, -L / 2 - 0.3);
  fin.rotation.x = -0.15;
  add(body, new THREE.BoxGeometry(0.085, 0.2, 0.4), std(0x3f8fd8), 0, 1.25, -L / 2 - 0.3).rotation.x = -0.15;

  // --- wagon wheels ---
  const wheelMat = std(0x222222, { roughness: 0.9 });
  const hub = std(0xd83a3a, { roughness: 0.4 });
  for (const [x, z] of [[0.7, 1.9], [-0.7, 1.9], [0.7, 0], [-0.7, 0], [0.7, -1.9], [-0.7, -1.9]]) {
    const w = add(body, new THREE.CylinderGeometry(0.15, 0.15, 0.07, 16), wheelMat, x, -0.06, z);
    w.rotation.z = Math.PI / 2;
    const h = add(body, new THREE.CylinderGeometry(0.07, 0.07, 0.08, 12), hub, x, -0.06, z);
    h.rotation.z = Math.PI / 2;
  }

  // --- leaf blower (upgrade) ---
  const blower = new THREE.Group();
  blower.position.set(0, 0.5, -L / 2 - 0.35);
  body.add(blower);
  add(blower, new THREE.BoxGeometry(0.34, 0.3, 0.42), std(0xf07a1a, { roughness: 0.5 }));
  const tubeM = add(blower, new THREE.CylinderGeometry(0.07, 0.09, 0.8, 12), std(0x2a2a2a), 0, 0.02, -0.55);
  tubeM.rotation.x = Math.PI / 2;
  const puff = new THREE.Group();
  puff.position.set(0, 0.02, -1.0);
  blower.add(puff);

  // --- flamingo floats (upgrade) ---
  const floats = new THREE.Group();
  body.add(floats);
  const pink = std(0xff7fb0, { roughness: 0.35 });
  for (const s of [-1, 1]) {
    const f = add(floats, new THREE.CapsuleGeometry(0.26, 4.2, 6, 14), pink, s * 0.95, -0.12, 0.05);
    f.rotation.x = Math.PI / 2;
    const neck = add(floats, new THREE.TorusGeometry(0.2, 0.06, 8, 16, Math.PI * 1.2), pink, s * 0.95, 0.12, 2.25);
    neck.rotation.y = Math.PI / 2;
    neck.rotation.z = -0.3;
    add(floats, new THREE.SphereGeometry(0.1, 12, 10), pink, s * 0.95, 0.36, 2.37);
    const beak = add(floats, new THREE.ConeGeometry(0.04, 0.14, 8), std(0x222222), s * 0.95, 0.33, 2.48);
    beak.rotation.x = Math.PI / 2 + 0.6;
    add(floats, new THREE.SphereGeometry(0.02, 6, 6), std(0x111111), s * 1.03, 0.39, 2.41);
  }

  // --- Christmas lights along the box rim ---
  const bulbs = [];
  const bulbColors = [0xff3b3b, 0x3bff6a, 0x3bb8ff, 0xffd23b, 0xff6af0];
  let k = 0;
  for (const s of [-1, 1]) {
    for (let i = 0; i < 15; i++) {
      const z = -L / 2 + 0.15 + i * (L - 0.3) / 14;
      const c = bulbColors[k++ % bulbColors.length];
      const b = add(body, new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6 }), s * (W / 2 + 0.03), H + 0.01, z);
      b.castShadow = false;
      bulbs.push(b);
    }
  }

  // headlight spot for night flights
  const spot = new THREE.SpotLight(0xfff1c8, 0, 90, 0.42, 0.5, 1.2);
  spot.position.set(0.38, 0.74, L / 2 + 0.1);
  spot.target.position.set(0.3, -3, 20);
  body.add(spot, spot.target);

  let t = 0;
  const api = {
    group, body, seats, seatOrder, propeller: prop, spot,
    setUpgrades(u) {
      noodles.visible = !u.wings;
      umbrella.visible = !!u.wings;
      blower.visible = !!u.blower;
      floats.visible = !!u.floats;
    },
    setNight(on) {
      spot.intensity = on ? 60 : 0;
      lampGlass.material.emissiveIntensity = on ? 3 : 0.3;
      bulbs.forEach(b => (b.material.emissiveIntensity = on ? 2.5 : 0.6));
    },
    update(dt, speed, boosting) {
      t += dt;
      prop.rotation.z += dt * (8 + speed * 1.6) * (boosting ? 1.6 : 1);
      bulbs.forEach((b, i) => (b.scale.setScalar(1 + 0.25 * Math.sin(t * 6 + i))));
      puff.visible = boosting && blower.visible;
      body.position.y = Math.sin(t * 9) * 0.015 * Math.min(1, speed / 10);
    },
  };
  api.setUpgrades(upgrades);
  return api;
}
