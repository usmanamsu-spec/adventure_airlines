// Ayra's ride: a sparkly golden dragon with a K-pop concert vibe (original design).
// Long gold serpent body with glowing stage-light stripes, a pink & purple mane, glowing eyes, horns and
// whiskers, little clawed legs, a fluffy tail tip, and the squad riding on saddle cushions along its back.
// Same interface as buildPlane(): { group, body, seats, seatOrder, tips, tail, kind, setUpgrades, setNight, update }.
import * as THREE from 'three';
import { tube, bakeTree } from './characters.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

let scaleTex = null;
function goldScales() {
  if (scaleTex) return scaleTex;
  const S = 128, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.fillStyle = '#e8b33a'; g.fillRect(0, 0, S, S);
  const r = 16;
  for (let row = -1; row < S / (r * 0.9) + 1; row++) {
    for (let col = -1; col < S / (r * 2) + 1; col++) {
      const x = col * r * 2 + (row % 2 ? r : 0), y = row * r * 0.9;
      const gr = g.createRadialGradient(x, y + r * 0.4, 2, x, y, r * 1.2);
      gr.addColorStop(0, '#fff2b0'); gr.addColorStop(0.55, '#f0bf45'); gr.addColorStop(1, '#a8731a');
      g.fillStyle = gr;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI); g.fill();
      g.strokeStyle = 'rgba(120,70,10,0.55)'; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI); g.stroke();
    }
  }
  scaleTex = new THREE.CanvasTexture(cv);
  scaleTex.wrapS = scaleTex.wrapT = THREE.RepeatWrapping;
  scaleTex.repeat.set(3, 6);
  scaleTex.colorSpace = THREE.SRGBColorSpace;
  return scaleTex;
}

export function buildDragon() {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const add = (geo, mat, parent = body) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };

  const gold = new THREE.MeshStandardMaterial({ map: goldScales(), color: 0xffffff, metalness: 0.75, roughness: 0.32, emissive: 0x6a4300, emissiveIntensity: 0.35, envMapIntensity: 1.3 });
  const goldPlain = new THREE.MeshStandardMaterial({ color: 0xf2c24a, metalness: 0.8, roughness: 0.28, emissive: 0x5a3a00, emissiveIntensity: 0.3 });
  const pearl = new THREE.MeshStandardMaterial({ color: 0xfff6e6, roughness: 0.3 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xff5fc8, roughness: 0.45, emissive: 0xff2fa8, emissiveIntensity: 0.35 });
  const purple = new THREE.MeshStandardMaterial({ color: 0x9a5cff, roughness: 0.45, emissive: 0x6a2fff, emissiveIntensity: 0.35 });
  const neonPink = new THREE.MeshBasicMaterial({ color: 0xff4fd8, toneMapped: false });
  const neonCyan = new THREE.MeshBasicMaterial({ color: 0x4ff6ff, toneMapped: false });

  // ---- main body (where everyone sits)
  const spine = [V(0, 1.0, 3.0), V(0.08, 1.0, 1.5), V(0, 1.0, 0), V(-0.08, 1.0, -1.5), V(0, 1.05, -2.7)];
  const R = (t) => 0.72 * (1 - 0.12 * t);
  const ridged = (t) => R(t) * (1 + 0.045 * Math.sin(t * 34)); // gentle body segments
  add(tube(spine, ridged, { tubular: 80, radial: 28, up: () => V(0, 1, 0) }), gold);
  // smooth joints where the neck and tail meet the body
  for (const [z, r] of [[3.0, 0.72], [-2.7, 0.64]]) { const j = add(new THREE.SphereGeometry(r, 24, 16), gold); j.position.set(0, z > 0 ? 1.0 : 1.05, z); }
  // glowing stage-light stripes along both sides
  for (const [s, m] of [[-1, neonPink], [1, neonCyan]]) {
    add(tube(spine.map(p => p.clone().add(V(s * 0.66, -0.15, 0))), () => 0.045, { tubular: 50, radial: 6 }), m);
  }
  // belly plates
  for (let i = 0; i < 9; i++) {
    const z = 2.6 - i * 0.62;
    const plate = add(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 14, 1, false, 0, Math.PI), pearl);
    plate.rotation.set(0, 0, Math.PI / 2); plate.position.set(0, 0.42, z); plate.scale.set(1, 1, 0.7);
  }

  // ---- neck + head (moves)
  const head = new THREE.Group();
  head.position.set(0, 1.05, 3.0);
  body.add(head);
  add(tube([V(0, 0, -0.25), V(0, 0.35, 0.6), V(0, 0.75, 1.15)], (t) => 0.7 - 0.24 * t, { tubular: 24, radial: 24, up: () => V(0, 1, 0) }), gold, head);
  add(new THREE.SphereGeometry(0.7, 20, 14), gold, head).position.set(0, 0, -0.2);
  const skull = add(new THREE.SphereGeometry(1, 24, 18), goldPlain, head);
  skull.scale.set(0.52, 0.46, 0.62); skull.position.set(0, 0.95, 1.45);
  const snout = add(new THREE.SphereGeometry(1, 20, 14), goldPlain, head);
  snout.scale.set(0.36, 0.27, 0.55); snout.position.set(0, 0.85, 2.05);
  const jaw = add(new THREE.SphereGeometry(1, 18, 12), pearl, head);
  jaw.scale.set(0.3, 0.13, 0.48); jaw.position.set(0, 0.64, 1.95);
  add(new THREE.SphereGeometry(0.11, 12, 8), pink, head).position.set(0, 0.98, 2.55); // nose pearl
  for (const s of [-1, 1]) {
    // big sparkly eyes (glow)
    const eye = add(new THREE.SphereGeometry(0.12, 14, 10), s < 0 ? neonCyan : neonPink, head);
    eye.position.set(s * 0.32, 1.1, 1.78);
    add(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), head).position.set(s * 0.36, 1.14, 1.88);
    // horns
    add(tube([V(s * 0.2, 1.3, 1.3), V(s * 0.32, 1.65, 1.05), V(s * 0.38, 1.95, 0.6), V(s * 0.3, 2.05, 0.3)], (t) => 0.09 * (1 - t) + 0.015, { tubular: 16, radial: 8 }), pearl, head);
    // long flowing whiskers
    add(tube([V(s * 0.3, 0.85, 2.35), V(s * 0.75, 0.8, 2.3), V(s * 1.2, 0.55, 1.8), V(s * 1.4, 0.2, 1.0)], (t) => 0.03 * (1 - t) + 0.008, { tubular: 18, radial: 5 }), goldPlain, head);
    // little ears / fins
    const fin = add(new THREE.ConeGeometry(0.14, 0.45, 8), pink, head);
    fin.position.set(s * 0.45, 1.15, 1.15); fin.rotation.set(-0.8, 0, s * -0.9);
  }
  // flowing pink & purple mane down the back of the head and neck
  for (let i = 0; i < 18; i++) {
    const a = (i / 17 - 0.5) * 2.2, side = Math.sin(a);
    const st = V(side * 0.35, 1.25 + Math.cos(a) * 0.08, 1.1 - Math.abs(side) * 0.2);
    add(tube([st, st.clone().add(V(side * 0.35, 0.1, -0.5)), st.clone().add(V(side * 0.6, -0.15, -1.0)), st.clone().add(V(side * 0.5, -0.45, -1.4))],
      (t) => 0.09 * (1 - t) + 0.015, { tubular: 14, radial: 6, flat: 0.5 }), i % 2 ? pink : purple, head);
  }

  // ---- tail (moves): curls up behind, with a fluffy pink tuft
  const tail = new THREE.Group();
  tail.position.set(0, 1.05, -2.7);
  body.add(tail);
  const tailPts = [V(0, 0, 0.1), V(0.4, -0.05, -1.0), V(1.0, 0.0, -1.9), V(1.4, 0.25, -2.7), V(1.2, 0.5, -3.4)]; // sweeps low and to the side
  add(tube(tailPts, (t) => (0.62 * (1 - t) + 0.1) * (1 + 0.05 * Math.sin(t * 26)), { tubular: 50, radial: 20, up: () => V(0, 1, 0) }), gold, tail);
  add(new THREE.SphereGeometry(0.64, 20, 14), gold, tail).position.set(0, 0, 0.05);
  for (let i = 0; i < 12; i++) {
    const d = V(Math.random() - 0.5, Math.random() * 0.8, -0.4 - Math.random() * 0.4).normalize();
    const base = V(1.2, 0.5, -3.4);
    add(tube([base, base.clone().addScaledVector(d, 0.45), base.clone().addScaledVector(d, 0.85).add(V(0, -0.15, 0))], (t) => 0.1 * (1 - t) + 0.02, { tubular: 8, radial: 5 }), i % 2 ? pink : purple, tail);
  }
  // back spines on the neck and the tail (not where the kids sit)
  for (let i = 0; i < 6; i++) {
    const t = i / 5, p = new THREE.CatmullRomCurve3(tailPts).getPointAt(t * 0.85);
    const sp = add(new THREE.ConeGeometry(0.12, 0.38, 6), i % 2 ? pink : purple, tail);
    sp.position.copy(p).add(V(0, 0.55 * (1 - t) + 0.15, 0)); sp.rotation.x = -0.4;
  }

  // ---- little clawed legs
  for (const [z, s] of [[1.7, -1], [1.7, 1], [-1.6, -1], [-1.6, 1]]) {
    add(tube([V(s * 0.45, 0.85, z), V(s * 0.75, 0.5, z + 0.15), V(s * 0.7, 0.18, z + 0.35)], (t) => 0.17 - 0.06 * t, { tubular: 10, radial: 10 }), gold);
    for (const c of [-1, 0, 1]) {
      const claw = add(new THREE.ConeGeometry(0.05, 0.2, 6), pearl);
      claw.position.set(s * 0.7 + c * 0.07, 0.1, z + 0.5); claw.rotation.x = Math.PI / 2 + 0.6;
    }
  }

  // ---- saddle cushions + a sparkly light-stick for the pilot to hold on to
  const seats = {}, seatOrder = [];
  const layout = [['pilot', 0, 2.3], ['r1a', -0.34, 1.45], ['r1b', 0.34, 1.45], ['r2a', -0.34, 0.6], ['r2b', 0.34, 0.6], ['r3a', -0.34, -0.25], ['r3b', 0.34, -0.25], ['back', -0.34, -1.1], ['back2', 0.34, -1.1]];
  const cushion = [0xff4fd8, 0x9a5cff, 0x4ff6ff, 0xff4fd8, 0x9a5cff, 0x4ff6ff, 0xff4fd8, 0x9a5cff, 0x4ff6ff];
  layout.forEach(([name, x, z], i) => {
    const top = 1.0 + R((3.0 - z) / 5.7) - 0.06;
    add(new THREE.BoxGeometry(0.48, 0.12, 0.44).translate(x, top + 0.05, z - 0.1), new THREE.MeshStandardMaterial({ color: cushion[i], roughness: 0.6, emissive: cushion[i], emissiveIntensity: 0.15 }));
    const a = new THREE.Group();
    a.position.set(x, top + 0.16, z - 0.1);
    body.add(a);
    seats[name] = a; seatOrder.push(name);
  });
  const stick = add(new THREE.CylinderGeometry(0.035, 0.035, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x222233 }));
  stick.position.set(0, 1.95, 2.85); stick.rotation.x = -0.4;
  add(new THREE.SphereGeometry(0.13, 14, 10), neonPink).position.set(0, 2.22, 2.97);

  // stage-light glow around the dragon
  const glowTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
  const auras = [];
  for (const [z, c] of [[1.8, 0xff4fd8], [-0.4, 0x9a5cff], [-2.4, 0x4ff6ff]]) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set(0, 0.4, z); s.scale.set(3.2, 2.2, 1);
    body.add(s); auras.push(s);
  }

  const spot = new THREE.SpotLight(0xffd9f6, 0, 90, 0.45, 0.5, 1.2);
  spot.position.set(0, 1.9, 4.4); spot.target.position.set(0, -3, 25);
  body.add(spot, spot.target);

  bakeTree(group, [body, head, tail]);
  let t = 0;
  return {
    group, body, seats, seatOrder, kind: 'dragon', propeller: new THREE.Group(),
    tips: [V(0.65, 0.9, -2.6), V(-0.65, 0.9, -2.6)],
    tail: V(1.2, 1.55, -6.1),
    setUpgrades() {},
    setNight(on) { spot.intensity = on ? 60 : 0; auras.forEach(a => (a.material.opacity = on ? 0.6 : 0.35)); },
    update(dt, speed, boosting) {
      t += dt;
      // the dragon swims through the sky: head bobs and looks around, tail swishes
      head.rotation.set(Math.sin(t * 1.6) * 0.08, Math.sin(t * 0.9) * 0.18, Math.sin(t * 1.6 + 1) * 0.05);
      tail.rotation.set(Math.sin(t * 2 + 1) * 0.08, Math.sin(t * 2.4) * 0.3, 0);
      body.position.y = Math.sin(t * 2) * 0.06;
      auras.forEach((a, i) => { const k = (boosting ? 1.4 : 1) * (1 + 0.12 * Math.sin(t * 5 + i * 2)); a.scale.set(3.2 * k, 2.2 * k, 1); });
    },
  };
}
