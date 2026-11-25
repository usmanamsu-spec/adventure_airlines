// Ayra's ride: a sparkly golden dragon with a K-pop concert vibe (original design).
// A slim gold serpent body with glowing stage-light stripes, a pink & purple mane, glowing eyes, horns and
// whiskers, little clawed legs, and a LONG skinny tail that swims through the air with a smooth travelling wave.
// The squad rides on a saddle along its back.
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
  scaleTex.repeat.set(2, 6);
  scaleTex.colorSpace = THREE.SRGBColorSpace;
  return scaleTex;
}

// ---------------------------------------------------------------- the swimming tail
const TAIL_LEN = 6.8, TAIL_SEG = 72, TAIL_RAD = 12;
const TAIL_R0 = 0.4, TAIL_R1 = 0.035;

/** A tube whose centreline is recomputed every frame (smooth, no rigid pieces). */
class SwimmingTail {
  constructor(material, base) {
    this.base = base; // where the tail leaves the body (body-local)
    const n = (TAIL_SEG + 1) * (TAIL_RAD + 1);
    this.pos = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2), idx = [];
    for (let i = 0; i <= TAIL_SEG; i++) for (let j = 0; j <= TAIL_RAD; j++) {
      uv[(i * (TAIL_RAD + 1) + j) * 2] = j / TAIL_RAD;
      uv[(i * (TAIL_RAD + 1) + j) * 2 + 1] = i / TAIL_SEG * 4;
    }
    for (let i = 0; i < TAIL_SEG; i++) for (let j = 0; j < TAIL_RAD; j++) {
      const a = i * (TAIL_RAD + 1) + j, b = a + TAIL_RAD + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    this.geo = g;
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.userData.keep = true; // not merged: it moves every frame
    this.pts = Array.from({ length: TAIL_SEG + 1 }, () => V());
    this.tip = V(); this.tipDir = V(0, 0, -1);
    this.update(0, 1);
  }
  /** centreline point at u in [0..1] */
  spine(u, out) {
    const ph = this.phase, s = u * TAIL_LEN;
    const grow = u * u * (3 - 2 * u);                     // wave grows smoothly toward the tip
    const side = Math.sin(ph - s * 0.85) * (0.08 + 1.0 * grow);
    const lift = Math.sin(ph * 0.8 - s * 0.6 + 1.2) * (0.05 + 0.35 * grow) - 0.45 * grow; // droops gently, stays below the camera
    return out.set(this.base.x + side, this.base.y + lift, this.base.z - s);
  }
  update(dt, speed) {
    // slow, graceful swimming. The rhythm eases toward the new tempo and the wave phase is accumulated,
    // so speeding up (boost) never makes the tail jump.
    const want = 1.7 + 0.05 * Math.min(30, speed);
    this.speed = this.speed === undefined ? want : this.speed + (want - this.speed) * Math.min(1, dt * 1.5);
    this.phase = (this.phase || 0) + dt * this.speed;
    for (let i = 0; i <= TAIL_SEG; i++) this.spine(i / TAIL_SEG, this.pts[i]);
    const T = V(), N = V(), B = V(), up = V(0, 1, 0);
    for (let i = 0; i <= TAIL_SEG; i++) {
      const a = this.pts[Math.max(0, i - 1)], b = this.pts[Math.min(TAIL_SEG, i + 1)];
      T.subVectors(b, a).normalize();
      N.copy(up).addScaledVector(T, -up.dot(T)).normalize();
      B.crossVectors(T, N);
      const u = i / TAIL_SEG;
      const r = TAIL_R1 + (TAIL_R0 - TAIL_R1) * Math.pow(1 - u, 1.35);
      const P = this.pts[i];
      for (let j = 0; j <= TAIL_RAD; j++) {
        const ang = j / TAIL_RAD * Math.PI * 2, c = Math.cos(ang) * r, s = Math.sin(ang) * r;
        const k = (i * (TAIL_RAD + 1) + j) * 3;
        this.pos[k] = P.x + N.x * c + B.x * s;
        this.pos[k + 1] = P.y + N.y * c + B.y * s;
        this.pos[k + 2] = P.z + N.z * c + B.z * s;
      }
    }
    this.tip.copy(this.pts[TAIL_SEG]);
    this.tipDir.subVectors(this.pts[TAIL_SEG], this.pts[TAIL_SEG - 3]).normalize();
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
  }
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

  // ---- slim body (the squad rides on a saddle along it)
  const BODY_Y = 1.0;
  const spine = [V(0, BODY_Y + 0.05, 3.1), V(0.04, BODY_Y, 1.6), V(0, BODY_Y, 0), V(-0.04, BODY_Y, -1.6), V(0, BODY_Y, -2.9)];
  const R = (t) => 0.46 - 0.06 * t;                       // ends at the tail's starting radius (0.40)
  const ridged = (t) => R(t) * (1 + 0.04 * Math.sin(t * 30));
  add(tube(spine, ridged, { tubular: 80, radial: 24, up: () => V(0, 1, 0) }), gold);
  for (const [s, m] of [[-1, neonPink], [1, neonCyan]]) {
    add(tube(spine.map(p => p.clone().add(V(s * 0.42, -0.1, 0))), () => 0.035, { tubular: 50, radial: 6 }), m);
  }
  for (let i = 0; i < 10; i++) { // belly plates
    const z = 2.7 - i * 0.6;
    const plate = add(new THREE.CylinderGeometry(0.27, 0.27, 0.08, 12, 1, false, 0, Math.PI), pearl);
    plate.rotation.set(0, 0, Math.PI / 2); plate.position.set(0, BODY_Y - 0.4, z); plate.scale.set(1, 1, 0.7);
  }

  // ---- neck + head (smooth gentle motion)
  const head = new THREE.Group();
  head.position.set(0, BODY_Y + 0.05, 3.1);
  body.add(head);
  add(new THREE.SphereGeometry(0.45, 18, 12), gold, head);
  add(tube([V(0, 0, -0.1), V(0, 0.35, 0.6), V(0, 0.8, 1.15)], (t) => 0.45 - 0.13 * t, { tubular: 24, radial: 18, up: () => V(0, 1, 0) }), gold, head);
  const skull = add(new THREE.SphereGeometry(1, 24, 18), goldPlain, head);
  skull.scale.set(0.46, 0.4, 0.55); skull.position.set(0, 1.0, 1.42);
  const snout = add(new THREE.SphereGeometry(1, 20, 14), goldPlain, head);
  snout.scale.set(0.3, 0.23, 0.5); snout.position.set(0, 0.9, 1.98);
  const jaw = add(new THREE.SphereGeometry(1, 18, 12), pearl, head);
  jaw.scale.set(0.25, 0.11, 0.42); jaw.position.set(0, 0.72, 1.9);
  add(new THREE.SphereGeometry(0.1, 12, 8), pink, head).position.set(0, 1.02, 2.45);
  for (const s of [-1, 1]) {
    const eye = add(new THREE.SphereGeometry(0.11, 14, 10), s < 0 ? neonCyan : neonPink, head);
    eye.position.set(s * 0.28, 1.13, 1.72);
    add(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), head).position.set(s * 0.32, 1.17, 1.81);
    add(tube([V(s * 0.18, 1.3, 1.3), V(s * 0.3, 1.62, 1.05), V(s * 0.35, 1.9, 0.62), V(s * 0.28, 2.0, 0.34)], (t) => 0.08 * (1 - t) + 0.014, { tubular: 16, radial: 8 }), pearl, head);
    add(tube([V(s * 0.26, 0.9, 2.3), V(s * 0.65, 0.85, 2.2), V(s * 1.05, 0.6, 1.7), V(s * 1.25, 0.25, 0.95)], (t) => 0.026 * (1 - t) + 0.007, { tubular: 18, radial: 5 }), goldPlain, head);
    const fin = add(new THREE.ConeGeometry(0.12, 0.4, 8), pink, head);
    fin.position.set(s * 0.4, 1.17, 1.15); fin.rotation.set(-0.8, 0, s * -0.9);
  }
  for (let i = 0; i < 16; i++) { // flowing mane
    const a = (i / 15 - 0.5) * 2.1, side = Math.sin(a);
    const st = V(side * 0.3, 1.26 + Math.cos(a) * 0.07, 1.1 - Math.abs(side) * 0.18);
    add(tube([st, st.clone().add(V(side * 0.3, 0.08, -0.45)), st.clone().add(V(side * 0.5, -0.15, -0.95)), st.clone().add(V(side * 0.42, -0.42, -1.35))],
      (t) => 0.08 * (1 - t) + 0.014, { tubular: 14, radial: 6, flat: 0.5 }), i % 2 ? pink : purple, head);
  }
  // a row of small spines down the neck
  for (let i = 0; i < 4; i++) { const sp = add(new THREE.ConeGeometry(0.09, 0.3, 6), i % 2 ? pink : purple, head); sp.position.set(0, 0.48 + i * 0.12, 0.15 + i * 0.22); sp.rotation.x = -0.5; }

  // ---- the long skinny swimming tail + its fluffy tuft
  const tail = new SwimmingTail(gold, V(0, BODY_Y, -2.9));
  body.add(tail.mesh);
  const tuft = new THREE.Group();
  tuft.scale.setScalar(0.75);
  body.add(tuft);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, d = V(Math.cos(a) * 0.5, Math.sin(a) * 0.5, -1).normalize();
    add(tube([V(0, 0, 0), d.clone().multiplyScalar(0.4), d.clone().multiplyScalar(0.75).add(V(0, -0.08, 0))], (t) => 0.07 * (1 - t) + 0.015, { tubular: 8, radial: 5 }), i % 2 ? pink : purple, tuft);
  }

  // ---- slim clawed legs
  for (const [z, s] of [[1.9, -1], [1.9, 1], [-1.7, -1], [-1.7, 1]]) {
    add(tube([V(s * 0.3, BODY_Y - 0.15, z), V(s * 0.5, BODY_Y - 0.5, z + 0.15), V(s * 0.46, BODY_Y - 0.82, z + 0.35)], (t) => 0.11 - 0.04 * t, { tubular: 10, radial: 8 }), gold);
    for (const c of [-1, 0, 1]) {
      const claw = add(new THREE.ConeGeometry(0.04, 0.17, 6), pearl);
      claw.position.set(s * 0.46 + c * 0.06, BODY_Y - 0.9, z + 0.5); claw.rotation.x = Math.PI / 2 + 0.6;
    }
  }

  // ---- saddle: a long pink blanket over the back, with cushions for everyone
  const top = BODY_Y + 0.42;
  const blanket = add(new THREE.CylinderGeometry(0.475, 0.475, 4.1, 18, 1, true, Math.PI * 0.75, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: 0xc23ab0, roughness: 0.7, side: THREE.DoubleSide }));
  blanket.rotation.set(Math.PI / 2, 0, 0); blanket.position.set(0, BODY_Y + 0.02, 0.4);
  const seats = {}, seatOrder = [];
  const layout = [['pilot', 0, 2.35], ['r1a', -0.3, 1.55], ['r1b', 0.3, 1.55], ['r2a', -0.3, 0.75], ['r2b', 0.3, 0.75], ['r3a', -0.3, -0.05], ['r3b', 0.3, -0.05], ['back', -0.3, -0.85], ['back2', 0.3, -0.85]];
  const cushion = [0xff4fd8, 0x9a5cff, 0x4ff6ff, 0xff4fd8, 0x9a5cff, 0x4ff6ff, 0xff4fd8, 0x9a5cff, 0x4ff6ff];
  layout.forEach(([name, x, z], i) => {
    const y = top - Math.abs(x) * 0.35;
    add(new THREE.BoxGeometry(0.42, 0.1, 0.42).translate(x, y + 0.03, z - 0.1), new THREE.MeshStandardMaterial({ color: cushion[i], roughness: 0.6, emissive: cushion[i], emissiveIntensity: 0.15 }));
    const a = new THREE.Group();
    a.position.set(x, y + 0.12, z - 0.1);
    body.add(a);
    seats[name] = a; seatOrder.push(name);
  });
  const stick = add(new THREE.CylinderGeometry(0.035, 0.035, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x222233 }));
  stick.position.set(0, top + 0.3, 2.9); stick.rotation.x = -0.4;
  add(new THREE.SphereGeometry(0.13, 14, 10), neonPink).position.set(0, top + 0.57, 3.02);

  // stage-light glow
  const glowTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
  const auras = [];
  for (const [z, c] of [[1.8, 0xff4fd8], [-0.4, 0x9a5cff], [-2.4, 0x4ff6ff]]) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set(0, BODY_Y - 0.5, z); s.scale.set(2.4, 1.6, 1);
    body.add(s); auras.push(s);
  }

  const spot = new THREE.SpotLight(0xffd9f6, 0, 90, 0.45, 0.5, 1.2);
  spot.position.set(0, top + 0.5, 4.4); spot.target.position.set(0, -3, 25);
  body.add(spot, spot.target);

  bakeTree(group, [body, head, tuft]);

  // smooth motion: every movement is a slow sine (no sudden swings), and the tail wave flows from body to tip
  let t = 0;
  const tailTip = V();
  const q = new THREE.Quaternion(), fwd = V(0, 0, -1);
  return {
    group, body, seats, seatOrder, kind: 'dragon', propeller: new THREE.Group(),
    tips: [V(0.45, BODY_Y - 0.1, -2.8), V(-0.45, BODY_Y - 0.1, -2.8)],
    tail: tailTip,
    setUpgrades() {},
    setNight(on) { spot.intensity = on ? 60 : 0; auras.forEach(a => (a.material.opacity = on ? 0.55 : 0.3)); },
    update(dt, speed, boosting) {
      t += dt;
      tail.update(dt, speed);
      tuft.position.copy(tail.tip);
      tuft.quaternion.copy(q.setFromUnitVectors(fwd, tail.tipDir));
      tailTip.copy(tail.tip);
      // head: slow, gentle bob and a curious look around (in step with the tail's rhythm)
      head.rotation.set(Math.sin(t * 1.1) * 0.06, Math.sin(t * 0.55) * 0.14, Math.sin(t * 1.1 + 0.8) * 0.04);
      body.position.y = Math.sin(t * 1.1) * 0.05;
      auras.forEach((a, i) => { const k = (boosting ? 1.3 : 1) * (1 + 0.1 * Math.sin(t * 3 + i * 2)); a.scale.set(2.4 * k, 1.6 * k, 1); });
    },
  };
}
