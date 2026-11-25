// Faris's ride: a flying, angular, stainless-steel electric pickup truck (a Cybertruck-style homage).
// Faris drives in the glass cabin; the rest of the squad rides in the open bed.
// Same interface as buildPlane(): { group, body, seats, seatOrder, tips, tail, setUpgrades, setNight, update }.
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const W = 2.2;          // body width
const HALF = W / 2;

/** extrude a side profile given in (z, y) across the truck's width */
function sideExtrude(points, width, bevel = 0.04, holes = []) {
  const shape = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y)));
  holes.forEach(h => shape.holes.push(new THREE.Path(h.map(([z, y]) => new THREE.Vector2(z, y)))));
  const g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 1 });
  g.rotateY(-Math.PI / 2);          // profile x -> world z, extrusion -> world -x
  g.translate(width / 2, 0, 0);     // centre across the width
  g.computeVertexNormals();
  return g;
}

function quad(a, b, c, d) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  g.computeVertexNormals();
  return g;
}
function poly(points) {
  // simple fan (points must be convex)
  const pos = [];
  for (let i = 1; i < points.length - 1; i++) pos.push(...points[0], ...points[i], ...points[i + 1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

let steelTex = null;
function brushedSteel() {
  if (steelTex) return steelTex;
  const S = 512, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    const y = Math.random() * S, x = Math.random() * S, l = 40 + Math.random() * 260;
    const c = 110 + Math.random() * 90;
    g.strokeStyle = `rgba(${c},${c},${c},${0.08 + Math.random() * 0.15})`;
    g.lineWidth = Math.random() < 0.8 ? 1 : 2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (Math.random() - 0.5) * 2); g.stroke();
  }
  steelTex = new THREE.CanvasTexture(cv);
  steelTex.wrapS = steelTex.wrapT = THREE.RepeatWrapping;
  steelTex.repeat.set(2, 2);
  return steelTex;
}

function aeroCover() {
  const S = 256, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.fillStyle = '#2b2d31'; g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.fill();
  // angular six-sided "turbine" cover
  g.fillStyle = '#c9ccd1';
  g.beginPath();
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.lineTo(128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104); }
  g.closePath(); g.fill();
  g.strokeStyle = '#2b2d31'; g.lineWidth = 7;
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.25; g.beginPath(); g.moveTo(128 + Math.cos(a) * 26, 128 + Math.sin(a) * 26); g.lineTo(128 + Math.cos(a + 0.5) * 100, 128 + Math.sin(a + 0.5) * 100); g.stroke(); }
  g.fillStyle = '#2b2d31'; g.beginPath(); g.arc(128, 128, 24, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildTruck() {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const add = (geo, mat, parent = body) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };

  const tex = brushedSteel();
  const steel = new THREE.MeshPhysicalMaterial({
    color: 0xc4c8cd, metalness: 1, roughness: 0.3, roughnessMap: tex, envMapIntensity: 1.25,
    clearcoat: 0.15, clearcoatRoughness: 0.4, flatShading: true,
  });
  if ('anisotropy' in steel) { steel.anisotropy = 0.6; }
  const trim = new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.6 });
  const liner = new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 0.95 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x14202c, metalness: 0.3, roughness: 0.04, transparent: true, opacity: 0.42, side: THREE.DoubleSide, envMapIntensity: 1.6, depthWrite: false });
  const ledWhite = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const ledRed = new THREE.MeshBasicMaterial({ color: 0xff2a2a, toneMapped: false });
  const thrustMat = new THREE.MeshBasicMaterial({ color: 0x5fe8ff, toneMapped: false, transparent: true, opacity: 0.9 });

  // ---- lower hull with angular wheel wells (front of the cab up to the beltline, bed section up to the bed floor)
  const hull = [
    [3.22, 0.48], [3.3, 1.0], [2.43, 1.3], [-0.55, 1.3], [-0.55, 1.02], [-3.2, 1.02], [-3.26, 0.56], [-3.0, 0.45],
    [-2.8, 0.45], [-2.62, 0.95], [-1.48, 0.95], [-1.3, 0.45],
    [1.3, 0.45], [1.48, 0.95], [2.62, 0.95], [2.8, 0.45], [3.0, 0.45],
  ];
  add(sideExtrude(hull, W - 0.08), steel);
  // bed liner + sail walls that follow the famous sloped roofline to the tailgate
  add(new THREE.BoxGeometry(W - 0.34, 0.04, 2.56).translate(0, 1.04, -1.88), liner);
  for (const s of [-1, 1]) {
    const wall = add(sideExtrude([[-0.55, 1.0], [-0.55, 1.79], [-3.2, 1.27], [-3.2, 1.0]], 0.12, 0.02), steel);
    wall.position.x = s * (HALF - 0.1);
  }
  // tailgate with the red light bar
  add(new THREE.BoxGeometry(W - 0.06, 0.74, 0.08).translate(0, 0.9, -3.2), steel);
  add(new THREE.BoxGeometry(W - 0.2, 0.035, 0.02).translate(0, 1.22, -3.25), ledRed);
  // cab back wall (behind the driver, in front of the bed)
  add(new THREE.BoxGeometry(W - 0.3, 0.48, 0.06).translate(0, 1.54, -0.56), steel);

  // ---- glass cabin: windshield, rear glass, side windows, glass roof seam
  const yb = 1.3, apex = [0.45, 1.98], rearTop = [-0.55, 1.79], ws = [2.43, yb];
  const gx = HALF - 0.06;
  add(quad([gx, ws[1], ws[0]], [-gx, ws[1], ws[0]], [-gx + 0.05, apex[1], apex[0]], [gx - 0.05, apex[1], apex[0]]), glass);
  add(quad([gx - 0.05, apex[1], apex[0]], [-gx + 0.05, apex[1], apex[0]], [-gx, rearTop[1], rearTop[0]], [gx, rearTop[1], rearTop[0]]), glass);
  for (const s of [-1, 1]) {
    const x = s * (HALF - 0.04);
    add(poly([[x, yb, ws[0] - 0.05], [x, apex[1] - 0.05, apex[0]], [x, rearTop[1] - 0.04, rearTop[0] + 0.02], [x, yb, rearTop[0] + 0.02]]), glass);
    // pillars & frame (stainless)
    const edge = (a, b, w = 0.07) => {
      const d = b.clone().sub(a), len = d.length();
      const m = add(new THREE.BoxGeometry(w, w, len), steel);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.lookAt(b);
      return m;
    };
    edge(V(x, yb, ws[0]), V(x, apex[1], apex[0]));
    edge(V(x, apex[1], apex[0]), V(x, rearTop[1], rearTop[0]));
    edge(V(x, yb + 0.02, 0.92), V(x, 1.87, 0.92), 0.06); // B-pillar
    // panel gaps & door seams
    add(new THREE.BoxGeometry(0.012, 0.82, 0.012).translate(s * (HALF + 0.035), 0.88, 0.92), trim);
    add(new THREE.BoxGeometry(0.012, 0.82, 0.012).translate(s * (HALF + 0.035), 0.88, -0.56), trim);
    add(new THREE.BoxGeometry(0.012, 0.012, 3.2).translate(s * (HALF + 0.035), 1.27, 0.92), trim);
    // angular black wheel-arch flares
    for (const zc of [2.05, -2.05]) {
      const arch = new THREE.Shape([[zc - 0.82, 0.45], [zc - 0.62, 1.07], [zc + 0.62, 1.07], [zc + 0.82, 0.45], [zc + 0.7, 0.45], [zc + 0.52, 0.97], [zc - 0.52, 0.97], [zc - 0.7, 0.45]].map(([a, b]) => new THREE.Vector2(a, b)));
      const ag = new THREE.ExtrudeGeometry(arch, { depth: 0.08, bevelEnabled: false });
      ag.rotateY(-Math.PI / 2);
      const m = add(ag, trim);
      m.position.x = s * (HALF + 0.07) + (s > 0 ? 0 : 0.08);
    }
    // small angular mirror
    add(new THREE.BoxGeometry(0.22, 0.1, 0.06).translate(s * (HALF + 0.12), 1.38, 2.05), steel);
  }
  // roof spine
  add(new THREE.BoxGeometry(W - 0.12, 0.05, 0.08).translate(0, apex[1] + 0.01, apex[0]), steel);

  // ---- lights
  add(new THREE.BoxGeometry(W - 0.12, 0.035, 0.02).translate(0, 0.99, 3.315), ledWhite);
  const headGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  headGlow.position.set(0, 1.0, 3.4); headGlow.scale.set(3.2, 0.5, 1);
  body.add(headGlow);

  // ---- wheels with aero covers
  const wheels = [];
  const coverTex = aeroCover();
  const tire = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
  const cover = new THREE.MeshStandardMaterial({ map: coverTex, metalness: 0.6, roughness: 0.35 });
  for (const zc of [2.05, -2.05]) for (const s of [-1, 1]) {
    const wg = new THREE.Group();
    wg.position.set(s * (HALF - 0.12), 0.45, zc);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.34, 28), tire);
    t.rotation.z = Math.PI / 2; t.castShadow = true;
    const c = new THREE.Mesh(new THREE.CircleGeometry(0.34, 28), cover);
    c.position.x = s * 0.175; c.rotation.y = s * Math.PI / 2;
    wg.add(t, c);
    body.add(wg);
    wheels.push(c);
  }

  // ---- flight thrusters (so it can fly!)
  const thrusters = [];
  for (const [x, z] of [[0.6, 2.05], [-0.6, 2.05], [0.6, -2.05], [-0.6, -2.05]]) {
    const ring = add(new THREE.TorusGeometry(0.28, 0.06, 8, 24), trim);
    ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.42, z);
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.24, 20), thrustMat);
    core.rotation.x = Math.PI / 2; core.position.set(x, 0.41, z);
    body.add(core);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0x5fe8ff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.set(x, 0.2, z); glow.scale.set(1.4, 1.4, 1);
    body.add(glow);
    thrusters.push(glow);
  }

  // ---- Faris's driver seat + yoke, and seats in the bed
  const seats = {};
  const seatOrder = [];
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 0.7 });
  const layout = [['pilot', 0.45, 1.35, 0.86], ['r1a', -0.42, -0.9, 1.05], ['r1b', 0.42, -0.9, 1.05], ['r2a', -0.42, -1.6, 1.05], ['r2b', 0.42, -1.6, 1.05],
    ['r3a', -0.42, -2.3, 1.05], ['r3b', 0.42, -2.3, 1.05], ['back', 0, -2.85, 1.05]];
  const cushionCols = [0x2a2b2e, 0xff5fa2, 0xffd23f, 0x5fd35a, 0xff9a3f, 0x8a5cff, 0x3fc5ff, 0xd8323a];
  layout.forEach(([name, x, z, y], i) => {
    if (i === 0) add(new THREE.BoxGeometry(0.55, 0.1, 0.5).translate(x, y - 0.06, z - 0.1), seatMat);
    else add(new THREE.BoxGeometry(0.5, 0.14, 0.42).translate(x, y + 0.05, z - 0.1), new THREE.MeshStandardMaterial({ color: cushionCols[i], roughness: 0.8 }));
    const anchor = new THREE.Group();
    anchor.position.set(x, i === 0 ? y : y + 0.12, z - 0.1);
    body.add(anchor);
    seats[name] = anchor;
    seatOrder.push(name);
  });
  const yoke = add(new THREE.TorusGeometry(0.14, 0.022, 6, 4), trim);
  yoke.position.set(0.45, 1.3, 1.85); yoke.rotation.set(-0.8, 0, Math.PI / 4); yoke.scale.set(1.3, 0.8, 1);
  add(new THREE.BoxGeometry(1.9, 0.08, 0.35).translate(0, 1.22, 2.05), trim); // dashboard
  add(new THREE.BoxGeometry(0.38, 0.24, 0.02).translate(0, 1.4, 1.95), new THREE.MeshBasicMaterial({ color: 0x9fd8ff, toneMapped: false })); // centre screen

  // night headlights
  const spot = new THREE.SpotLight(0xffffff, 0, 110, 0.5, 0.5, 1.2);
  spot.position.set(0, 1.0, 3.35);
  spot.target.position.set(0, -3, 25);
  body.add(spot, spot.target);

  let t = 0;
  return {
    group, body, seats, seatOrder, kind: 'truck',
    tips: [V(1.2, 0.5, -3.2), V(-1.2, 0.5, -3.2)],
    tail: V(0, 0.9, -3.4),
    propeller: new THREE.Group(),
    setUpgrades() { /* the truck is already perfect, says Faris */ },
    setNight(on) { spot.intensity = on ? 80 : 0; headGlow.material.opacity = on ? 0.9 : 0.5; },
    update(dt, speed, boosting) {
      t += dt;
      wheels.forEach(w => (w.rotation.z -= dt * speed * 0.9));
      thrusters.forEach((g, i) => { const s = (boosting ? 2.2 : 1.4) + Math.sin(t * 20 + i) * 0.15; g.scale.set(s, s, 1); });
      body.position.y = Math.sin(t * 2.2) * 0.04;
    },
  };
}

let glowT = null;
function glowTex() {
  if (glowT) return glowT;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  glowT = new THREE.CanvasTexture(cv);
  return glowT;
}
