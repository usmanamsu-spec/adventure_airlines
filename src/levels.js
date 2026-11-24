// Mission definitions: maps, objectives, landings and dialogue.
import * as THREE from 'three';
import { billboard, textSprite } from './world/kit.js';
import { hotAirBalloon, trainCar, rails, shuttle, acorn, firefly, netSculpture, sunflowers } from './world/props.js';
import { smooth, fbm2, rng } from './util.js';

const PI = Math.PI;

// ---------------------------------------------------------------- shared builders
function streetHouses(w, x1, z1, x2, z2, { spacing = 28, setback = 21, road = true, skip = null, trees = true, sides = [1, -1], pine = false, fences = true } = {}) {
  if (road) w.road(x1, z1, x2, z2, 10, { lines: false });
  const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
  const ux = dx / len, uz = dz / len, px = -uz, pz = ux;
  const n = Math.floor(len / spacing);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) * spacing;
    for (const s of sides) {
      const hx = x1 + ux * t + px * setback * s, hz = z1 + uz * t + pz * setback * s;
      if (skip && skip(hx, hz)) continue;
      const ry = Math.atan2(-px * s, -pz * s);
      w.house(hx, hz, ry, { garage: w.r() < 0.7 });
      if (trees && w.r() < 0.8) {
        const bx = hx + px * s * 14 + ux * (w.r() - 0.5) * 12, bz = hz + pz * s * 14 + uz * (w.r() - 0.5) * 12;
        w.tree(bx, bz, { kind: pine && w.r() < 0.7 ? 'pine' : 'round', s: 0.9 + w.r() * 0.3 });
      }
      if (fences) {
        const fx = hx + px * s * 9, fz = hz + pz * s * 9;
        w.fence(fx - ux * 12 + px * s * 0, fz - uz * 12, fx - ux * 12 + px * s * 14, fz - uz * 12 + pz * s * 14);
      }
      if (w.r() < 0.18) w.pool(hx + px * s * 13, hz + pz * s * 13, 6, 4);
    }
  }
}

function scatterTrees(w, cx, cz, rx, rz, n, opts = {}, avoid = null) {
  for (let i = 0; i < n; i++) {
    const x = cx + (w.r() - 0.5) * 2 * rx, z = cz + (w.r() - 0.5) * 2 * rz;
    if (avoid && avoid(x, z)) continue;
    w.tree(x, z, { kind: opts.pine && w.r() < (opts.pineRatio ?? 0.7) ? 'pine' : 'round', s: (opts.s ?? 1) * (0.8 + w.r() * 0.5), collide: opts.collide ?? true });
  }
}

function yusufHouse(w, x, z, ry) {
  w.house(x, z, ry, { w: 12, d: 12, h: 5.5, wall: 0xd8b48a, roof: 0x5a4636, garage: true });
  const c = Math.cos(ry), s = Math.sin(ry);
  // driveway + open garage with a workbench
  w.box(x + (8.6) * c + 8 * s, 0.02, z - 8.6 * s + 8 * c, 5.5, 0.06, 10, 0xbfbab0, { ry });
  w.lawn(x, z - 18 * c, 30, 22, 0x86c460, ry);
}

function musaHouse(w, x, z, ry) {
  w.house(x, z, ry, { w: 11, d: 12, h: 5.5, wall: 0x7fa8d8, roof: 0x3f4a5a, garage: true });
  const c = Math.cos(ry), s = Math.sin(ry);
  // red door + basketball hoop
  w.box(x + 6.2 * s, 0, z + 6.2 * c, 1.5, 2.5, 0.25, 0xc8323a, { ry });
  const hx = x + 8.6 * c + 9 * s, hz = z - 8.6 * s + 9 * c;
  w.box(hx, 0, hz, 0.25, 3.4, 0.25, 0x555555);
  w.box(hx, 3.4, hz, 1.8, 1.2, 0.15, 0xffffff, { ry });
}

function sign(w, x, z, ry, text, colors = {}) {
  const tex = billboard(text, colors);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.7 }));
  m.position.set(x, w.groundHeight(x, z) + 11, z);
  m.rotation.y = ry;
  w.add(m);
  for (const s of [-6, 6]) w.box(x + Math.cos(ry) * s, w.groundHeight(x, z), z - Math.sin(ry) * s, 0.5, 7, 0.5, 0x666666);
}

function label3d(w, text, x, y, z, scale = 6, opts) {
  const s = textSprite(text, opts);
  s.position.set(x, y, z);
  s.scale.multiplyScalar(scale);
  w.add(s);
  return s;
}

/** Spread juice boxes along a path of points. */
function juiceAlong(points, every = 2) {
  const out = [];
  for (let i = 0; i < points.length - 1; i += every) {
    const a = points[i], b = points[i + 1];
    out.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 1, (a[2] + b[2]) / 2]);
  }
  return out;
}

// ---------------------------------------------------------------- missions
export const MISSIONS = [
  // ============================================================ 1. First Flight
  {
    id: 'm1', chapter: 1, title: 'First Flight', place: 'Plano, TX', time: 'morning', icon: '🛫',
    blurb: 'Take off from Yusuf\'s cul-de-sac, fly the rings, land on the street.',
    world: { ground: 0x74b04e, size: 1400 },
    build(w) {
      // cul-de-sac
      w.circle(0, -40, 17);
      w.road(0, -24, 0, 230, 10);
      yusufHouse(w, 0, -72, 0);
      for (const a of [-1.1, -0.45, 0.45, 1.1]) {
        const x = Math.sin(a) * 44, z = -40 - Math.cos(a) * 44;
        w.house(x, z, a, { garage: true });
      }
      const zoneSkip = (x, z) => Math.abs(x) < 16 && z > 20 && z < 160;
      streetHouses(w, 0, -10, 0, 220, { road: false, skip: zoneSkip, spacing: 30 });
      streetHouses(w, -300, 230, 300, 230, {});
      streetHouses(w, -130, -160, -130, 220, {});
      streetHouses(w, 130, -160, 130, 220, {});
      streetHouses(w, -300, -170, 300, -170, { sides: [-1] });
      // park with a pond and the school field
      w.lawn(-220, 40, 120, 140, 0x8ccc62);
      w.waterEllipse(-225, 40, 30, 45);
      scatterTrees(w, -220, 40, 60, 70, 30, {}, (x, z) => ((x + 225) / 34) ** 2 + ((z - 40) / 50) ** 2 < 1);
      w.building(220, 70, 50, 30, 9, 0xc9a07a, { roof: 0x7a6a5a });
      w.lawn(220, 140, 80, 70, 0x9ad06a);
      for (const [x, z] of [[195, 120], [245, 160]]) w.box(x, 0, z, 0.3, 3, 0.3, 0xffffff);
      scatterTrees(w, 0, 0, 380, 380, 70, {}, (x, z) => Math.abs(x) < 30 || Math.hypot(x + 225, z - 40) < 60 || (Math.abs(x - 220) < 50 && Math.abs(z - 100) < 70) || Math.abs(z - 230) < 25 || Math.abs(z + 170) < 25 || Math.abs(Math.abs(x) - 130) < 25);
      for (let i = 0; i < 8; i++) w.cloud(-400 + i * 110, 110 + (i % 3) * 15, -300 + (i * 97) % 600, 1);
      label3d(w, 'Yusuf\'s House', 0, 18, -72, 4);
      const rings = [[0, 20, -20], [0, 24, 70], [-40, 26, 150], [-120, 26, 190], [-185, 24, 120], [-175, 22, 30], [-120, 20, -60], [-50, 18, -110]];
      return {
        spawn: { p: [0, 18, -140], h: 0 },
        objectives: [{ type: 'rings', label: 'Rings', rings, r: 8 }],
        landing: { p: [0, 95], h: 0, len: 90, wid: 14, text: 'Land on Sunny Lane!' },
        juice: juiceAlong(rings, 2),
        sock: [222, 16, 70],
        bounds: { cx: 0, cz: 20, r: 520 },
        tutorial: true,
      };
    },
    lines: {
      yusuf: {
        intro: ['Mission Control to Captain Yusuf! Tilt the iPad to steer.', 'Fly through the glowing rings. You got this!'],
        at: { 1: 'Hold the BOOST button for juice-box power!', 4: 'Grab juice boxes to fill your boost!', 7: 'Last ring! Then we land.' },
        land: 'Now land on Sunny Lane. Come in slow and gentle!',
      },
      musa: {
        intro: ['Musa, you\'re flying my plane by REMOTE from Greensboro?!', 'Okay... tilt to steer. Fly me through the rings!'],
        at: { 1: 'BOOST?! Okay, hold the boost button. Wheee!', 4: 'Juice boxes! Grab them for more boost!', 7: 'Last ring! Don\'t crash my mom\'s mailbox!' },
        land: 'Land on Sunny Lane. GENTLY. Please. I\'m inside this thing!',
      },
    },
  },

  // ============================================================ 2. Downtown Dash
  {
    id: 'm2', chapter: 1, title: 'Downtown Dash', place: 'Downtown Plano', time: 'morning', icon: '🍦',
    blurb: 'Deliver ice-cream orders around historic Downtown Plano.',
    world: { ground: 0x7cae54, size: 1400 },
    build(w) {
      // 15th Street with historic storefronts
      w.road(-260, 0, 260, 0, 13);
      const bricks = [0xa4513c, 0x8e4a36, 0xb8664a, 0x9a5a44, 0xc28a5a, 0x7a3e30];
      for (let x = -230; x <= 230; x += 15) {
        if (Math.abs(x - 40) < 14) continue; // rail crossing
        for (const s of [-1, 1]) {
          const h = 8 + w.r() * 5;
          w.building(x, s * 19, 14, 14, h, bricks[Math.floor(w.r() * bricks.length)], { roof: 0x5a4a40 });
          w.box(x, 3.4, s * 11.6, 12, 0.3, 2.2, [0xd8323a, 0x2f8f5a, 0x2f62c4, 0xf2b53a][Math.floor(w.r() * 4)]);
        }
      }
      // the rail line and the Interurban trolley
      rails(w, 40, -320, 40, 320);
      const trolley = trainCar(0xc8323a, 12);
      shuttle(w, trolley, 40, -300, 40, 300, 7);
      w.building(55, 118, 14, 10, 6, 0xa4513c, { roof: 0x3a3a3a });
      label3d(w, 'Interurban Railway Museum', 55, 16, 118, 3.2);
      // Haggard Park
      w.lawn(95, 70, 80, 64, 0x8fd067);
      w.shape('cyl6', 105, 0, 96, 8, 3.5, 8, 0xffffff);
      w.shape('cone', 105, 3.5, 96, 10, 3.5, 10, 0x4a6f8a);
      w.addSphereCollider(new THREE.Vector3(105, 3, 96), 6);
      for (const [x, z] of [[70, 96], [130, 96], [65, 45], [125, 45], [140, 70]]) w.tree(x, z, { s: 1.1 });
      w.lawn(25, 70, 40, 60, 0x9a9a9a); // plaza / parking
      // blocks around (kept clear of the ice-cream drop-offs and the park landing approach)
      const items = [[-140, 17, -19], [-70, 17, 19], [40, 16, 150], [120, 18, -70], [175, 17, 19]];
      for (let x = -220; x <= 220; x += 44) for (const z of [-70, -120, 70, 130]) {
        if (x > 10 && x < 150 && z > 0) continue;
        if (z === 70 && x > -140) continue;
        if (items.some(([ix, , iz]) => Math.hypot(ix - x, iz - z) < 32)) continue;
        if (w.r() < 0.25) continue;
        w.building(x, z, 26, 26, 10 + w.r() * 18, [0xd9c2a0, 0xb8a080, 0x9a8a7a, 0xc0a890][Math.floor(w.r() * 4)]);
      }
      streetHouses(w, -260, 190, 260, 190, { sides: [1] });
      streetHouses(w, -260, -190, 260, -190, { sides: [-1] });
      scatterTrees(w, 0, 0, 380, 380, 60, {}, (x, z) => Math.abs(z) < 150 && Math.abs(x) < 260);
      for (let i = 0; i < 6; i++) w.cloud(-300 + i * 120, 120, -200 + (i * 131) % 400);
      return {
        spawn: { p: [-240, 30, -40], h: PI / 2 },
        objectives: [{ type: 'collect', label: 'Ice cream orders', kind: 'icecream', items, need: 5, r: 9 }],
        landing: { p: [95, 70], h: PI / 2, len: 70, wid: 14, text: 'Land in Haggard Park!' },
        juice: [[-180, 20, 0], [-20, 20, 0], [40, 20, 60], [140, 20, -20], [100, 20, 30]],
        sock: [105, 10, 96],
        bounds: { cx: 0, cz: 0, r: 450 },
      };
    },
    lines: {
      yusuf: {
        intro: ['Downtown Plano! Five ice-cream orders are waiting.', 'Fly through the giant ice cream cones to deliver them!'],
        at: { 2: 'That\'s the old Interurban trolley line!', 4: 'One more order. My mouth is watering in Greensboro.' },
        land: 'All delivered! Land in Haggard Park, by the gazebo.',
      },
      musa: {
        intro: ['Downtown Plano! Fly through the ice cream cones.', 'Do NOT eat them. Okay, maybe one.'],
        at: { 2: 'The trolley! Wave at the trolley!', 4: 'Last order! I can smell the waffle cones!' },
        land: 'Park landing! Aim for the grass by the gazebo.',
      },
    },
  },

  // ============================================================ 3. Balloon Festival
  {
    id: 'm3', chapter: 1, title: 'Balloon Festival', place: 'Oak Point Park, Plano', time: 'afternoon', icon: '🎈',
    blurb: 'Weave through the rings between dozens of hot-air balloons.',
    world: { ground: 0x78b450, size: 1400 },
    build(w) {
      w.waterEllipse(60, -30, 110, 55);
      scatterTrees(w, 60, -30, 220, 160, 90, {}, (x, z) => ((x - 60) / 125) ** 2 + ((z + 30) / 70) ** 2 < 1 || (x < -110 && z > -20 && z < 140));
      // trails
      w.road(-200, -200, 220, -200, 4, { lines: false, color: 0xc9b48a });
      w.road(220, -200, 220, 140, 4, { lines: false, color: 0xc9b48a });
      // festival field: tents & food trucks
      w.lawn(-170, 60, 140, 170, 0x9ad46a);
      for (let i = 0; i < 8; i++) {
        w.shape('cone4', -232, 0, -10 + i * 18, 9, 7, 9, i % 2 ? 0xffffff : 0xffe08a);
        w.box(-208, 0, -5 + i * 18, 4, 3, 7, [0xd8323a, 0x2f62c4, 0xf2b53a, 0x2f8f5a][i % 4]);
      }
      label3d(w, 'Plano Balloon Festival', -232, 18, 60, 5, { fg: '#d8323a' });
      const rings = [[-150, 28, -80], [-110, 34, -20], [-60, 40, 30], [0, 44, 60], [70, 40, 60], [140, 36, 20], [160, 32, -60], [100, 30, -120], [20, 28, -130], [-60, 26, -90]];
      const palettes = [
        [0xff4f4f, 0xffd23f, 0xff4f4f, 0xffd23f], [0x3fa0ff, 0xffffff, 0x3fa0ff, 0xff4f6a], [0x9b5de5, 0xf15bb5, 0xfee440, 0x00bbf9],
        [0x2f8f5a, 0xffffff, 0xd8323a], [0xff8c42, 0xfff3b0, 0x7ad3c3], [0x222244, 0xffd23f, 0xd8323a, 0xffffff],
      ];
      const balloons = [];
      const place = (x, y, z, i) => {
        const b = hotAirBalloon(palettes[i % palettes.length], i + 3);
        b.position.set(x, y, z);
        w.add(b);
        const col = w.addSphereCollider(new THREE.Vector3(x, y, z), 8.5, b);
        balloons.push({ b, col, y0: y });
      };
      let k = 0;
      for (let i = 0; i < rings.length - 1; i++) {
        const a = rings[i], c = rings[i + 1];
        const dx = c[0] - a[0], dz = c[2] - a[2], len = Math.hypot(dx, dz);
        const px = -dz / len, pz = dx / len;
        const mx = (a[0] + c[0]) / 2, mz = (a[2] + c[2]) / 2, my = (a[1] + c[1]) / 2;
        const s = i % 2 ? 1 : -1;
        place(mx + px * 26 * s, my + 4, mz + pz * 26 * s, k++);
        if (i % 3 === 0) place(mx - px * 30 * s, my - 2, mz - pz * 30 * s, k++);
      }
      const r = rng(77);
      for (let i = 0; i < 14; i++) {
        const x = -300 + r() * 600, z = -300 + r() * 600, y = 50 + r() * 50;
        if (rings.some(q => Math.hypot(q[0] - x, q[2] - z) < 60)) continue;
        place(x, y, z, k++);
      }
      // two balloons inflating on the field
      for (const [x, z] of [[-215, 120], [-130, 130]]) {
        const b = hotAirBalloon(palettes[k % 6], k);
        b.position.set(x, 15, z);
        w.add(b);
        k++;
      }
      w.addDyn((dt, t) => {
        for (const { b, col, y0 } of balloons) {
          b.position.y = y0 + Math.sin(t * 0.5 + b.userData.phase) * 2.2;
          col.c.y = b.position.y;
        }
      });
      for (let i = 0; i < 6; i++) w.cloud(-350 + i * 140, 130, 250 - (i * 97) % 500);
      return {
        spawn: { p: [-150, 26, -170], h: 0 },
        objectives: [{ type: 'rings', label: 'Rings', rings, r: 8 }],
        landing: { p: [-160, 60], h: 0, len: 90, wid: 16, text: 'Land on the festival field!' },
        juice: juiceAlong(rings, 2),
        sock: [-215, 26, 120],
        bounds: { cx: 0, cz: 0, r: 480 },
      };
    },
    lines: {
      yusuf: {
        intro: ['The Plano Balloon Festival! Weave through the rings.', 'Careful: balloons are big and bouncy!'],
        at: { 3: 'You flew right past a balloon! The people waved!', 7: 'Three more rings. You\'re a natural!' },
        land: 'Land on the festival field by the tents.',
      },
      musa: {
        intro: ['BALLOONS! Musa, steer between them!', 'If we pop one, I\'m blaming you.'],
        at: { 3: 'I can see my house from up here!', 7: 'Three more! I\'m not even scared. Much.' },
        land: 'Land on the field by the tents. Smooth, please!',
      },
    },
  },

  // ============================================================ 4. Big City: Dallas
  {
    id: 'm4', chapter: 1, title: 'Big City: Dallas', place: 'Dallas, TX', time: 'sunset', icon: '🌆',
    blurb: 'Circle the Reunion Tower ball at sunset and fly under the bridge.',
    world: { ground: 0x6a9a4a, size: 1800, fog: [300, 1500] },
    build(w) {
      // downtown towers
      const towerCols = [0x8ea6bf, 0x9fb3c8, 0x7f95ad, 0xb5c2cf, 0x6f8aa3, 0xc8b89a, 0xa0a8b0];
      for (let x = 20; x <= 300; x += 42) for (let z = -300; z <= -60; z += 42) {
        if (w.r() < 0.15) continue;
        const h = 30 + w.r() * 70 * (1 - Math.abs(x - 160) / 260);
        w.building(x, z, 20 + w.r() * 10, 20 + w.r() * 10, h, towerCols[Math.floor(w.r() * towerCols.length)]);
      }
      // green-outlined tower
      w.building(140, -170, 26, 26, 120, 0x4a5a6a);
      for (const [dx, dz] of [[-13, -13], [13, -13], [-13, 13], [13, 13]]) w.box(140 + dx, 0, -170 + dz, 0.6, 121, 0.6, 0x3cff7a, { batch: 'glow' });
      for (const y of [40, 80, 120]) w.box(140, y, -170, 27, 0.6, 27, 0x3cff7a, { batch: 'glow' });
      for (let x = 0; x <= 320; x += 42) w.road(x - 21, -330, x - 21, -40, 8, { lines: false });
      // Reunion Tower
      const RT = new THREE.Vector3(-60, 0, -40);
      w.shape('cyl', RT.x, 0, RT.z, 7, 84, 7, 0xd8d4cc);
      for (let i = 0; i < 3; i++) w.shape('cyl', RT.x + Math.cos(i * 2.1) * 4, 0, RT.z + Math.sin(i * 2.1) * 4, 3, 80, 3, 0xe8e4dc);
      w.addBoxCollider(RT.x, 0, RT.z, 12, 82, 12);
      const ball = new THREE.Group();
      ball.position.set(RT.x, 92, RT.z);
      const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(13, 2), new THREE.MeshStandardMaterial({ color: 0x9aa4b0, metalness: 0.7, roughness: 0.3, flatShading: true }));
      ball.add(shell);
      const dots = new THREE.Points(new THREE.IcosahedronGeometry(13.3, 3), new THREE.PointsMaterial({ color: 0xffe9a0, size: 1.4 }));
      ball.add(dots);
      w.add(ball);
      w.addDyn((dt, t) => { dots.material.color.setHSL((t * 0.05) % 1, 0.8, 0.7); });
      w.addSphereCollider(new THREE.Vector3(RT.x, 92, RT.z), 14);
      label3d(w, 'Reunion Tower', RT.x, 112, RT.z, 5);
      // Trinity River, levees and the bridge
      w.waterRect(0, 120, 1400, 40, 0x3b7fb0);
      w.lawn(0, 80, 1400, 40, 0x86b85a);
      w.lawn(0, 160, 1400, 40, 0x86b85a);
      const BX = -150;
      w.box(BX, 10.5, 120, 14, 1.6, 160, 0xe8e8e8, { collide: true });
      for (const z of [60, 100, 140, 180]) w.box(BX, 0, z, 3, 10.5, 3, 0xcfcfcf, { collide: z !== 100 && z !== 140 });
      const arch = [];
      for (let i = 0; i <= 20; i++) { const t = i / 20; arch.push(new THREE.Vector3(BX, 12 + Math.sin(t * PI) * 48, 45 + t * 150)); }
      const archMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arch), 40, 1.6, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
      w.add(archMesh);
      const cableMat = new THREE.LineBasicMaterial({ color: 0xffffff });
      const pts = [];
      for (let i = 2; i <= 18; i++) for (const s of [-6.5, 6.5]) { pts.push(arch[i].clone(), new THREE.Vector3(BX + s, 12, arch[i].z)); }
      w.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), cableMat));
      for (let i = 1; i < 20; i += 2) w.addBoxCollider(BX, 12, arch[i].z, 16, arch[i].y - 12 + 2, 9);
      label3d(w, 'Margaret Hunt Hill Bridge', BX, 70, 120, 4);
      // neighborhoods & trees beyond
      streetHouses(w, -500, 250, 500, 250, { sides: [1] });
      scatterTrees(w, 0, 0, 600, 600, 80, {}, (x, z) => (z > 40 && z < 200) || (x > 0 && x < 330 && z < -40 && z > -330) || Math.hypot(x + 60, z + 40) < 30);
      for (let i = 0; i < 8; i++) w.cloud(-500 + i * 140, 150 + (i % 2) * 30, -400 + (i * 113) % 300, 1.3);
      const C = 42;
      const rings = [
        [RT.x + C, 86, RT.z], [RT.x, 86, RT.z - C], [RT.x - C, 86, RT.z], [RT.x, 84, RT.z + C],
        [-60, 30, 95], [-100, 8, 120], [BX, 5.5, 120], [-215, 12, 120],
      ];
      return {
        spawn: { p: [220, 75, 40], h: -PI / 2 },
        objectives: [{ type: 'rings', label: 'Rings', rings, r: 8, radii: { 6: 4.2 } }],
        landing: { p: [0, 82], h: PI / 2, len: 100, wid: 16, text: 'Land on the river levee park!' },
        juice: [[80, 80, -20], [-20, 60, 40], [-60, 20, 110], [-200, 20, 120], [-150, 25, 60]],
        sock: [140, 128, -170],
        bounds: { cx: 0, cz: 0, r: 650 },
      };
    },
    lines: {
      yusuf: {
        intro: ['Dallas at sunset! Circle the big glowing ball on Reunion Tower.', 'Then dive down to the river and fly UNDER the bridge!'],
        at: { 4: 'Now down to the Trinity River!', 6: 'Under the bridge! Keep it low and steady!', 7: 'You did it! That was SO cool.' },
        land: 'Land on the grass by the river. Then it\'s time to fly to Greensboro!',
      },
      musa: {
        intro: ['Dallas! Musa, circle the ball on Reunion Tower!', 'And then... UNDER the bridge? You\'re crazy. Do it!'],
        at: { 4: 'Down to the river! My stomach!', 6: 'UNDER THE BRIDGE! AAAAH!', 7: 'We made it! Best. Remote. Pilot. Ever.' },
        land: 'Land on the river grass. Then you\'re flying me to YOUR house!',
      },
    },
  },

  // ============================================================ T. The Long Flight
  {
    id: 'trip', chapter: 1, title: 'The Long Flight', place: 'Texas → North Carolina', time: 'afternoon', icon: '🗺️',
    blurb: '1,000 miles to Greensboro! Follow the rings and grab juice boxes.',
    world: {
      ground: 0x8fb35a, size: 4800, center: [0, 2150], fog: [200, 1000],
      height: (x, z) => {
        const env = smooth(2300, 2550, z) * (1 - smooth(3150, 3350, z));
        const px = tripPath(z);
        const valley = smooth(30, 110, Math.abs(x - px));
        const hill = Math.max(0, fbm2(x * 0.004, z * 0.004, 4) + 0.35) * 110 * env * valley;
        const roll = (fbm2(x * 0.002 + 9, z * 0.002, 3) * 8 + 6) * smooth(1850, 2100, z) * (1 - smooth(3350, 3700, z));
        const flatEnd = 1 - smooth(3800, 3950, z);
        return (hill + Math.max(0, roll) * valley) * flatEnd;
      },
    },
    build(w) {
      const r = rng(5);
      const rings = [];
      for (let z = 250; z <= 3900; z += 260) {
        const x = tripPath(z);
        rings.push([x, w.groundHeight(x, z) + 30, z]);
      }
      // Texas: golden fields, cows, windmills
      for (let i = 0; i < 26; i++) {
        const x = -300 + r() * 600, z = r() * 900;
        w.lawn(x, z, 60 + r() * 80, 60 + r() * 80, [0xd8c070, 0xc8b060, 0x9fc060][i % 3]);
      }
      for (let i = 0; i < 30; i++) {
        const x = -250 + r() * 500, z = 50 + r() * 800;
        w.box(x, 0, z, 1.2, 1.4, 2.4, r() < 0.5 ? 0x5a3a2a : 0xf2f2f2, { ry: r() * 3 });
      }
      for (const [x, z] of [[-90, 300], [120, 650]]) {
        w.box(x, 0, z, 1, 16, 1, 0x888888);
        for (let i = 0; i < 8; i++) w.box(x, 16, z + 0.6, 0.3, 5, 0.1, 0xdddddd, { rz: i * PI / 4 });
      }
      sign(w, tripPath(900) + 40, 900, PI, 'Welcome to\nARKANSAS', { bg: '#1f5fa8' });
      // Arkansas forests + Mississippi River (the Arkansas / Tennessee line)
      scatterTrees(w, 0, 1300, 380, 380, 520, { collide: false }, (x, z) => Math.abs(x - tripPath(z)) < 40);
      w.waterRect(0, 1660, 1400, 120, 0x4a7f9a);
      for (let x = -40; x <= 40; x += 20) w.box(tripPath(1660) + 150 + x, 0, 1660, 6, 22, 130, 0x8a8f96);
      w.box(tripPath(1660) + 150, 22, 1660, 50, 2, 132, 0x6a6f76);
      sign(w, tripPath(1760) + 40, 1760, PI, 'Welcome to\nTENNESSEE', { bg: '#c8323a' });
      // Tennessee: farms then the Smoky Mountains
      for (let i = 0; i < 14; i++) {
        const z = 1850 + r() * 450, x = -300 + r() * 600;
        w.house(x, z, r() * 6, { garage: false });
      }
      for (let i = 0; i < 700; i++) {
        const z = 2300 + r() * 1100, x = -380 + r() * 760;
        if (Math.abs(x - tripPath(z)) < 45) continue;
        w.tree(x, z, { kind: 'pine', s: 1.2, collide: false, color: r() < 0.5 ? 0x2f5a3c : 0x3a6a46 });
      }
      sign(w, tripPath(3330) + 40, 3330, PI, 'Welcome to\nNORTH CAROLINA', { bg: '#2e6b3a' });
      // North Carolina: pines and Greensboro
      for (let i = 0; i < 260; i++) {
        const z = 3400 + r() * 500, x = -380 + r() * 760;
        if (Math.abs(x - tripPath(z)) < 45) continue;
        w.tree(x, z, { kind: 'pine', collide: false });
      }
      musaHouse(w, 26, 4130, -PI / 2);
      streetHouses(w, 0, 3990, 0, 4260, { skip: (x, z) => Math.abs(x) < 16 || (x > 0 && Math.abs(z - 4130) < 20), pine: true });
      streetHouses(w, -150, 4000, 150, 4000, { sides: [-1], pine: true });
      w.lawn(26, 4130, 34, 34, 0x86c460);
      label3d(w, 'Musa\'s House', 26, 18, 4130, 4);
      // a freight train
      rails(w, -170, 100, -170, 1500);
      const train = new THREE.Group();
      [0xd8323a, 0x2f62c4, 0x2f8f5a, 0xf2b53a, 0x888888].forEach((c, i) => { const car = trainCar(c, 15); car.position.z = -i * 17; train.add(car); });
      shuttle(w, train, -170, 200, -170, 1450, 12);
      for (let i = 0; i < 20; i++) w.cloud(-300 + r() * 600, 130 + r() * 40, r() * 4200, 1.4);
      const juice = [];
      for (let i = 0; i < rings.length - 1; i++) {
        const a = rings[i], b = rings[i + 1];
        juice.push([(a[0] + b[0]) / 2 + 10, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [(a[0] + b[0]) / 2 - 10, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2 + 20]);
      }
      return {
        spawn: { p: [0, 30, 60], h: 0 },
        objectives: [{ type: 'rings', label: 'Waypoints', rings, r: 14, style: 'waypoint' }],
        landing: { p: [0, 4115], h: 0, len: 90, wid: 14, text: 'Land on Musa\'s street!' },
        juice,
        sock: [-170, 10, 980],
        bounds: { corridor: true, x: 330, z0: -60, z1: 4300, path: tripPath },
        noDamage: true,
        progress: [[900, 'state:Arkansas'], [1600, 'river'], [1760, 'state:Tennessee'], [2400, 'mountains'], [3330, 'state:North Carolina'], [3950, 'greensboro']],
      };
    },
    lines: {
      yusuf: {
        intro: ['Next stop: MY house in Greensboro! About 1,000 miles.', 'Follow the big rings and grab juice boxes. No crashing on this trip!'],
        events: { 'state:Arkansas': 'Welcome to Arkansas! So many trees!', river: 'That\'s the Mississippi River! It\'s HUGE!', 'state:Tennessee': 'Tennessee! You\'re halfway here!', mountains: 'The Smoky Mountains! Stay in the valleys!', 'state:North Carolina': 'NORTH CAROLINA! Almost here!', greensboro: 'I can see you! I\'m waving from my yard!' },
        land: 'Land on my street! My house is the blue one!',
      },
      musa: {
        intro: ['Musa, bring me to your house! All the way to Greensboro!', 'Follow the big rings. And don\'t drop me in a river.'],
        events: { 'state:Arkansas': 'Arkansas! Look at all those trees!', river: 'The Mississippi River! Don\'t drop me in it!', 'state:Tennessee': 'Tennessee! Halfway!', mountains: 'MOUNTAINS! Stay in the valleys, Musa!', 'state:North Carolina': 'North Carolina! Your state!', greensboro: 'Is that your house?! The blue one?!' },
        land: 'Land on your street, Captain Musa!',
      },
    },
  },

  // ============================================================ 5. Firefly Night
  {
    id: 'm5', chapter: 2, title: 'Firefly Night', place: 'Greensboro, NC', time: 'night', icon: '✨',
    blurb: 'First night flight! Catch 20 fireflies around Musa\'s neighborhood.',
    world: { ground: 0x3f6a3a, size: 1400, fog: [150, 900] },
    build(w) {
      musaHouse(w, 26, 30, -PI / 2);
      label3d(w, 'Musa\'s House', 26, 16, 30, 3.5, { bg: '#fff6d0' });
      w.road(0, -220, 0, 260, 10, { lines: false });
      streetHouses(w, 0, -220, 0, 260, { road: false, pine: true, skip: (x, z) => (x > 0 && Math.abs(z - 30) < 22) || Math.abs(x) < 16 });
      streetHouses(w, -220, 260, 220, 260, { pine: true });
      streetHouses(w, -220, -220, 220, -220, { pine: true });
      streetHouses(w, -150, -220, -150, 260, { pine: true });
      streetHouses(w, 150, -220, 150, 260, { pine: true });
      scatterTrees(w, 0, 20, 420, 420, 120, { pine: true }, (x, z) => Math.abs(x) < 25 || (Math.abs(Math.abs(x) - 150) < 25) || Math.abs(Math.abs(z - 20) - 240) < 25);
      // street lamps
      for (let z = -200; z <= 240; z += 40) for (const s of [-1, 1]) {
        w.box(s * 7, 0, z, 0.3, 6, 0.3, 0x333333);
        w.shape('sphere', s * 7, 6.4, z, 1.2, 1.2, 1.2, 0xfff0b0, { batch: 'glow' });
      }
      const r = rng(31);
      const items = [];
      const blocked = (x, y, z) => w.colliders.some(c => c.type === 'box'
        ? x > c.min.x - 6 && x < c.max.x + 6 && y > c.min.y - 6 && y < c.max.y + 6 && z > c.min.z - 6 && z < c.max.z + 6
        : Math.hypot(x - c.c.x, y - c.c.y, z - c.c.z) < c.r + 6);
      while (items.length < 40) {
        const x = -200 + r() * 400, z = -180 + r() * 400, y = 6 + r() * 16;
        if (Math.abs(x) < 12 && z > 40 && z < 150) continue;
        if (blocked(x, y, z)) continue;
        items.push([x, y, z]);
      }
      return {
        spawn: { p: [0, 24, -200], h: 0 },
        objectives: [{ type: 'collect', label: 'Fireflies', kind: 'firefly', items, need: 20, r: 7 }],
        landing: { p: [0, 95], h: PI, len: 90, wid: 14, text: 'Land on Musa\'s street!' },
        juice: [[-100, 15, -100], [100, 15, -50], [-80, 15, 100], [90, 15, 160], [0, 20, 200], [0, 20, -120]],
        sock: [150, 8, 280],
        bounds: { cx: 0, cz: 20, r: 430 },
        night: true,
      };
    },
    lines: {
      yusuf: {
        intro: ['Welcome to Greensboro! I mean, it\'s me, Musa, back here.', 'Catch 20 fireflies! The Christmas lights help you see.'],
        at: { 5: 'Five fireflies! They\'re blinking at us!', 10: 'Ten! We have SO many fireflies here.', 19: 'One more firefly!' },
        land: 'Land on my street. My mom made cookies!',
      },
      musa: {
        intro: ['Whoa, REAL fireflies! We don\'t get this many in Plano!', 'Catch 20 of them, Captain Musa!'],
        at: { 5: 'Five! They look like tiny stars!', 10: 'Ten! This is the coolest night ever.', 19: 'One more!' },
        land: 'Land on your street! I smell cookies!',
      },
    },
  },

  // ============================================================ 6. Lake Brandt Splashdown
  {
    id: 'm6', chapter: 2, title: 'Lake Brandt Splashdown', place: 'Lake Brandt, Greensboro', time: 'afternoon', icon: '🦩',
    blurb: 'Fly the greenway, then splash down next to a lost fishing hat.',
    requires: 'floats',
    world: { ground: 0x5f9a48, size: 1400 },
    build(w) {
      w.waterEllipse(0, 0, 270, 105, 0x3a86b8);
      w.waterEllipse(-230, 60, 80, 60, 0x3a86b8);
      // greenway trail on the north shore
      w.road(-320, -150, 320, -150, 4, { lines: false, color: 0xc9b48a });
      const nearPath = (x, z) => Math.abs(z + 150) < 18 && Math.abs(x) < 320;
      const inLake = (x, z) => (x / 285) ** 2 + (z / 118) ** 2 < 1 || ((x + 230) / 95) ** 2 + ((z - 60) / 75) ** 2 < 1;
      scatterTrees(w, 0, 0, 450, 360, 420, { pine: true, pineRatio: 0.5 }, (x, z) => inLake(x, z) || nearPath(x, z));
      // marina & dock
      w.box(-170, 0, -100, 30, 4, 12, 0x8a6a4a, { collide: true });
      w.box(-170, 0.3, -82, 4, 0.4, 26, 0x9a7a5a);
      for (let i = 0; i < 4; i++) w.box(-185 + i * 10, 0.3, -70, 3, 1, 6, [0xffffff, 0xd8323a, 0x2f62c4, 0xf2b53a][i]);
      label3d(w, 'Lake Brandt', 0, 30, -100, 6);
      const rings = [[-220, 18, -150], [-120, 16, -150], [-20, 14, -148], [80, 12, -140], [170, 10, -95], [160, 6, -10], [85, 5, 35]];
      return {
        spawn: { p: [-330, 20, -150], h: PI / 2 },
        objectives: [{ type: 'rings', label: 'Rings', rings, r: 8 }],
        landing: { p: [-15, 40], h: -PI / 2, len: 100, wid: 18, water: true, text: 'Splash down next to the hat!', prize: 'hat', prizeAt: [-70, 40] },
        juice: juiceAlong(rings, 1),
        sock: [-170, 9, -100],
        bounds: { cx: 0, cz: 0, r: 480 },
      };
    },
    lines: {
      yusuf: {
        intro: ['Lake Brandt! My grandpa lost his fishing hat out here.', 'Fly the greenway rings, then splash down on the lake!'],
        at: { 3: 'Look, kayaks! Hi, kayaks!', 5: 'Down low over the water. Flamingo floats ready!' },
        land: 'See the hat? Splash down right next to it!',
      },
      musa: {
        intro: ['Flamingo floats? This plane can land on WATER?!', 'Fly the greenway, then splash down by the hat!'],
        at: { 3: 'Kayaks! Wave! WAVE!', 5: 'Low over the water... my slippers are getting wet!' },
        land: 'Splash down by the floating hat. Gently!',
      },
    },
  },

  // ============================================================ 7. Gate City Tour
  {
    id: 'm7', chapter: 2, title: 'Gate City Tour', place: 'Downtown Greensboro', time: 'afternoon', icon: '📸',
    blurb: 'Snap photos: the train depot, the floating net, the ballpark and the Science Center.',
    world: { ground: 0x6aa64c, size: 1400 },
    build(w) {
      // Elm Street
      w.road(0, -320, 0, 320, 12);
      const bricks = [0xa4513c, 0x8e4a36, 0xb8664a, 0xc8a07a, 0xd8c8a8, 0x9a7a6a];
      for (let z = -280; z <= 280; z += 18) for (const s of [-1, 1]) {
        if (s > 0 && z > -30 && z < 70) continue; // LeBauer Park
        w.building(s * 20, z, 14, 16, 10 + w.r() * 12, bricks[Math.floor(w.r() * bricks.length)]);
      }
      w.building(-60, -100, 30, 30, 80, 0x6f8aa3);
      w.shape('cone4', -60, 80, -100, 30, 18, 30, 0x4a8a6a);
      w.addBoxCollider(-60, 80, -100, 20, 18, 20);
      // LeBauer Park + the floating net
      w.lawn(70, 20, 110, 110, 0x8fd067);
      const net = netSculpture(70, 50, 8);
      net.position.set(70, 32, 20);
      w.add(net);
      w.addBoxCollider(70, 21, 20, 76, 13, 56);
      for (const [x, z] of [[30, -30], [110, -30], [30, 70], [110, 70]]) w.addBoxCollider(x, 0, z, 2, 30, 2);
      label3d(w, 'LeBauer Park', 70, 50, 20, 4.5);
      // ballpark
      const B = [-120, -40];
      w.lawn(B[0], B[1], 90, 90, 0x4fa83a);
      w.box(B[0], 0.03, B[1] + 20, 30, 0.06, 30, 0xb5814a, { ry: PI / 4 });
      for (let i = 0; i < 7; i++) { const a = -PI / 2 + i * 0.35; w.box(B[0] + Math.cos(a) * 52, 0, B[1] + 45 + Math.sin(a) * 30, 18, 6 + i % 2, 8, 0x2f5a8a, { ry: -a + PI / 2, collide: true }); }
      for (const [x, z] of [[-165, -85], [-75, -85], [-165, 15], [-75, 15]]) { w.box(x, 0, z, 1, 28, 1, 0x888888, { collide: true }); w.box(x, 28, z, 5, 3, 1, 0xffffee, { batch: 'glow' }); }
      label3d(w, 'Ballpark', B[0], 36, B[1], 4);
      // train depot
      w.building(130, 150, 70, 18, 12, 0xa4513c, { roof: 0x3a4a3a });
      w.box(130, 12, 150, 16, 8, 16, 0xa4513c);
      rails(w, -300, 175, 300, 175);
      const train = new THREE.Group();
      [0x2f5a8a, 0x2f5a8a, 0xd8d8d8].forEach((c, i) => { const car = trainCar(c, 16); car.position.z = -i * 18; train.add(car); });
      shuttle(w, train, -280, 175, 280, 175, 6);
      label3d(w, 'Train Depot', 130, 32, 150, 4);
      // Science Center
      w.building(-60, -230, 50, 30, 14, 0xd8d8d8);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(16, 24, 12, 0, PI * 2, 0, PI / 2), new THREE.MeshStandardMaterial({ color: 0x8fd3ef, metalness: 0.3, roughness: 0.15, transparent: true, opacity: 0.8 }));
      dome.position.set(-20, 0, -230);
      w.add(dome);
      w.addSphereCollider(new THREE.Vector3(-20, 0, -230), 17);
      label3d(w, 'Science Center', -50, 32, -230, 4);
      // fields & neighborhoods
      w.lawn(-145, -170, 50, 120, 0x8ccc62);
      streetHouses(w, -320, 260, 320, 260, { sides: [1], pine: true });
      streetHouses(w, 200, -300, 200, 120, { pine: true });
      scatterTrees(w, 0, 0, 420, 420, 90, { pine: true, pineRatio: 0.4 }, (x, z) => Math.abs(x) < 40 || (x > 0 && x < 140 && z > -40 && z < 80) || (x < -60 && x > -190 && z > -240 && z < 20) || Math.abs(z - 175) < 20 || (x < 30 && x > -100 && z < -190));
      const rings = [[120, 18, 178], [70, 13, 20], [-120, 22, -40], [-20, 30, -185]];
      return {
        spawn: { p: [260, 30, 230], h: -PI / 2 - 0.3 },
        objectives: [{ type: 'rings', label: 'Photos', rings, r: 8, style: 'photo', radii: { 1: 6 } }],
        landing: { p: [-145, -160], h: 0, len: 100, wid: 16, text: 'Land on the field by the Science Center!' },
        juice: [[190, 25, 200], [95, 18, 100], [-30, 20, 0], [-80, 25, -110], [-20, 25, -100]],
        sock: [-20, 22, -230],
        bounds: { cx: 0, cz: 0, r: 470 },
      };
    },
    lines: {
      yusuf: {
        intro: ['Gate City photo tour! Fly through the camera rings.', 'Train depot, the floating net, the ballpark, then the Science Center!'],
        at: { 1: 'Fly UNDER the giant net at LeBauer Park!', 2: 'Click! Now the ballpark!', 3: 'Last photo: the Science Center dome!' },
        land: 'Great photos! Land on the field by the Science Center.',
      },
      musa: {
        intro: ['Show me Greensboro, Captain Musa! Fly through the camera rings!', 'Depot, net, ballpark, Science Center. Say cheese!'],
        at: { 1: 'A giant floating net?! Fly under it!', 2: 'Click! Ballpark next!', 3: 'Last one: the dome!' },
        land: 'Land on the field by the Science Center!',
      },
    },
  },

  // ============================================================ 8. Big City: Raleigh
  {
    id: 'm8', chapter: 2, title: 'Big City: Raleigh', place: 'Raleigh, NC', time: 'sunset', icon: '🌰',
    blurb: 'The giant acorn is rolling away! Tag it 3 times, then land in the sunflowers.',
    world: { ground: 0x6a9a4a, size: 1600, fog: [280, 1400] },
    build(w) {
      // Fayetteville Street & towers
      w.road(0, -340, 0, 220, 12);
      for (const z of [-200, -120, -40, 40, 120]) w.road(-200, z, 200, z, 10, { lines: false });
      for (const x of [-90, 90]) w.road(x, -260, x, 220, 10, { lines: false });
      const cols = [0x8ea6bf, 0xb5c2cf, 0xc8b89a, 0x9a8a7a, 0x7f95ad, 0xd8c8a8];
      // blocks sit between the streets so the acorn's route stays clear
      for (const x of [-150, -45, 45, 150]) for (const z of [-160, -80, 0, 80, 160]) {
        if (x === 150 && z < -60 && z > -200) continue;
        const tall = Math.abs(x) < 70 ? 1 : 0.45;
        w.building(x, z, 26, 46, 20 + w.r() * 70 * tall, cols[Math.floor(w.r() * cols.length)]);
      }
      // State Capitol
      w.lawn(0, -300, 90, 70, 0x86c460);
      w.box(0, 0, -300, 40, 14, 24, 0xc8c0b0, { collide: true });
      for (let i = -3; i <= 3; i++) w.box(i * 5, 0, -287, 1.4, 12, 1.4, 0xe8e0d0);
      w.shape('cyl', 0, 14, -300, 10, 6, 10, 0xd8d0c0);
      w.shape('dome', 0, 20, -300, 12, 10, 12, 0x9aa6a0);
      w.addBoxCollider(0, 14, -300, 12, 12, 12);
      label3d(w, 'NC State Capitol', 0, 42, -300, 4);
      // Museum of Natural Sciences + Daily Planet globe
      w.building(-130, -270, 50, 30, 22, 0xb8c4cc);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(13, 32, 20), new THREE.MeshStandardMaterial({ color: 0x3f8fd0, roughness: 0.3, metalness: 0.2 }));
      globe.position.set(-100, 14, -252);
      w.add(globe);
      const land = new THREE.Mesh(new THREE.IcosahedronGeometry(13.2, 2), new THREE.MeshStandardMaterial({ color: 0x4fa83a, flatShading: true, transparent: true, opacity: 0.85 }));
      land.position.copy(globe.position);
      land.scale.set(1, 0.7, 0.6);
      w.add(land);
      w.addSphereCollider(globe.position.clone(), 14);
      label3d(w, 'Museum of Natural Sciences', -120, 40, -260, 3.5);
      // Moore Square with the acorn plinth
      w.lawn(90, -120, 80, 80, 0x8fd067);
      w.box(90, 0, -120, 6, 1.5, 6, 0xcfcfcf);
      // Dix Park & the sunflower field
      w.lawn(-220, 340, 340, 220, 0x8cbc5a);
      const zoneSkip = (x, z) => Math.abs(z - 330) < 11 && x > -280 && x < -140;
      w.add(sunflowers(-220, 330, 280, 150, 2600, zoneSkip));
      w.lawn(-210, 330, 140, 20, 0x9a8a5a);
      label3d(w, 'Dix Park Sunflowers', -210, 26, 290, 4.5, { fg: '#c78a00' });
      scatterTrees(w, 0, 0, 520, 520, 120, { pineRatio: 0.3, pine: true }, (x, z) => (Math.abs(x) < 210 && z > -340 && z < 220) || (x < -40 && x > -400 && z > 220 && z < 460));
      streetHouses(w, 250, -300, 250, 300, { pine: true });
      // the acorn and its getaway route
      const route = [[90, -120], [90, -40], [0, -40], [0, 120], [-90, 120], [-90, -40], [0, -40], [0, -120], [90, -120]].map(([x, z]) => new THREE.Vector3(x, 0, z));
      const curve = new THREE.CatmullRomCurve3(route, true, 'catmullrom', 0.1);
      const nut = acorn();
      w.add(nut);
      let s = 0;
      const len = curve.getLength();
      const state = { speed: 7, paused: 0 };
      w.addDyn((dt) => {
        if (state.paused > 0) { state.paused -= dt; nut.userData.inner.position.y = 4.2 + Math.abs(Math.sin(state.paused * 8)) * 3; return; }
        s = (s + state.speed * dt) % len;
        const p = curve.getPointAt(s / len), tng = curve.getTangentAt(s / len);
        nut.position.copy(p);
        nut.rotation.y = Math.atan2(tng.x, tng.z);
        nut.userData.inner.rotation.x += dt * state.speed / 3.5;
        nut.userData.inner.position.y = 4.2;
      });
      nut.position.copy(route[0]);
      return {
        spawn: { p: [120, 40, 160], h: PI },
        objectives: [
          { type: 'chase', label: 'Acorn tags', target: nut, need: 3, r: 16, maxAlt: 28, onTag: () => { state.paused = 2; state.speed += 1; } },
        ],
        landing: { p: [-210, 330], h: -PI / 2, len: 110, wid: 16, text: 'Land on the path through the sunflowers!' },
        juice: [[60, 20, 100], [0, 18, 0], [-90, 18, 60], [90, 18, -60], [-150, 20, 220]],
        sock: [-100, 30, -252],
        bounds: { cx: -40, cz: 20, r: 520 },
        finale: true,
        candyPath: route.map(p => [p.x, 9, p.z]),
      };
    },
    lines: {
      yusuf: {
        intro: ['Raleigh! Uh oh, the GIANT ACORN is rolling away!', 'Fly low and tag it 3 times to stop it!'],
        events: { tag1: 'Tag! It bounced! Keep chasing!', tag2: 'Tag two! It\'s getting faster!', tag3: 'GOT IT! The acorn is safe!' },
        land: 'Now land in the Dix Park sunflowers. The grand finale!',
      },
      musa: {
        intro: ['Raleigh! Is that acorn... ROLLING?!', 'Fly low and tag it 3 times, Captain Musa!'],
        events: { tag1: 'Tag! Ha, it bounced!', tag2: 'Two! Get it again!', tag3: 'WE GOT IT! Acorn rescued!' },
        land: 'Land in the sunflowers! Best summer EVER!',
      },
    },
  },
];

export function tripPath(z) {
  return 60 * Math.sin(z / 500) * (1 - smooth(3650, 3980, z));
}

export const MISSION_INDEX = Object.fromEntries(MISSIONS.map((m, i) => [m.id, i]));
