import * as THREE from 'three';

// ---------- Holiday red plaid (matched to reference photo) ----------
// Red base, wide black bands, thin white pinstripes beside them,
// and a thin black line through the middle of each red block.
const RED = [200, 22, 38];
const DARK = [20, 16, 18];
const WHITE = [240, 236, 232];

// Threadcount: [color, width] repeated as a sett.
const SETT = [
  [DARK, 5], [RED, 1], [DARK, 5], [RED, 4], [WHITE, 1], [RED, 20], [DARK, 2], [RED, 20], [WHITE, 1], [RED, 4],
];

function settLookup() {
  const arr = [];
  for (const [c, w] of SETT) for (let i = 0; i < w; i++) arr.push(c);
  return arr; // 62 threads
}

export function makePlaidTexture(px = 4) {
  const threads = settLookup();
  const n = threads.length;
  const size = n * px;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const warp = threads[Math.floor(x / px)];
      const weft = threads[Math.floor(y / px)];
      // 2/2 twill: alternate warp/weft along diagonals
      const c = ((x + y) >> 1) % 2 === 0 ? warp : weft;
      // soft flannel: blend toward the average a bit
      const k = 0.35;
      const i = (y * size + x) * 4;
      img.data[i] = c[0] * (1 - k) + (warp[0] + weft[0]) / 2 * k;
      img.data[i + 1] = c[1] * (1 - k) + (warp[1] + weft[1]) / 2 * k;
      img.data[i + 2] = c[2] * (1 - k) + (warp[2] + weft[2]) / 2 * k;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// ---------- Boy builder ----------
const SKIN = 0x9a6644;
const HAIR = 0x16100c;

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...opts });
}

function plaidMat(baseTex, rx, ry, rot = 0) {
  const t = baseTex.clone();
  t.needsUpdate = true;
  t.repeat.set(rx, ry);
  t.rotation = rot;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, metalness: 0 });
}

function add(parent, geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/**
 * opts: { name, height (scale), girth (width scale), hair: 'messy' | 'neat',
 *         slippers: [leftColor, rightColor] }
 */
export function makeBoy(opts, plaidTex) {
  const { height = 1, girth = 1, hair = 'messy', slippers = [0x2f5fb3, 0x3a9a4a] } = opts;
  const boy = new THREE.Group();
  boy.name = opts.name;

  const skin = mat(SKIN, { flatShading: false, roughness: 0.7 });
  const hairMat = mat(HAIR, { roughness: 1 }); // matte, no shine
  const black = mat(0x0b0b0b, { roughness: 0.4 });

  // --- legs (pants) ---
  const legLen = 0.32 * height;
  const pants = plaidMat(plaidTex, 1.5, 1.6);
  for (const sx of [-1, 1]) {
    const leg = add(boy, new THREE.CapsuleGeometry(0.085 * girth, legLen, 4, 10), pants,
      sx * 0.1 * girth, 0.1 + legLen / 2 + 0.06, 0);
    leg.rotation.z = sx * 0.04;
    // slipper
    const sl = add(boy, new THREE.BoxGeometry(0.15, 0.08, 0.26, 1, 1, 1), mat(slippers[sx < 0 ? 0 : 1]),
      sx * 0.11 * girth, 0.04, 0.04);
    sl.geometry.translate(0, 0, 0);
  }

  // --- torso (pajama top) ---
  const torsoY = 0.1 + legLen + 0.12 + 0.26 * height;
  const top = plaidMat(plaidTex, 3, 1.6);
  const torso = add(boy, new THREE.CapsuleGeometry(0.2, 0.26 * height, 4, 14), top, 0, torsoY, 0);
  torso.scale.set(1.08 * girth, 1, 0.78 * (0.85 + 0.15 * girth));

  // notched collar: two plaid lapels forming a V
  const collarMat = plaidMat(plaidTex, 0.4, 0.4, 0.6);
  const neckY = torsoY + 0.26 * height / 2 + 0.12;
  const zFront = 0.16 * (0.85 + 0.15 * girth);
  for (const sx of [-1, 1]) {
    const lapel = add(boy, new THREE.BoxGeometry(0.1, 0.17, 0.025), collarMat,
      sx * 0.055, neckY - 0.08, zFront + 0.01);
    lapel.rotation.z = -sx * 0.5;
    lapel.rotation.x = -0.25;
  }
  // skin V at the neck
  add(boy, new THREE.CylinderGeometry(0.07, 0.07, 0.1, 10), skin, 0, neckY + 0.02, 0);
  // buttons
  for (let i = 0; i < 3; i++) {
    add(boy, new THREE.SphereGeometry(0.016, 8, 6), black, 0, neckY - 0.2 - i * 0.11, zFront + 0.03);
  }
  // chest pocket (on wearer's left)
  const pocket = add(boy, new THREE.BoxGeometry(0.1, 0.1, 0.02), plaidMat(plaidTex, 0.35, 0.35, 0.785),
    0.1 * girth, neckY - 0.2, zFront + 0.02);
  pocket.rotation.x = -0.12;

  // --- arms ---
  const sleeve = plaidMat(plaidTex, 1.2, 1.2);
  for (const sx of [-1, 1]) {
    const shoulderX = sx * (0.24 * girth + 0.04);
    const armLen = 0.3 * height;
    const arm = add(boy, new THREE.CapsuleGeometry(0.065, armLen, 4, 10), sleeve,
      shoulderX + sx * 0.04, torsoY + 0.02, 0);
    arm.rotation.z = sx * 0.22;
    add(boy, new THREE.SphereGeometry(0.06, 10, 8), skin,
      shoulderX + sx * 0.085, torsoY - armLen / 2 - 0.06, 0.01);
  }

  // --- head (slightly big, toy style) ---
  const headY = neckY + 0.27;
  const head = new THREE.Group();
  head.position.set(0, headY, 0);
  boy.add(head);
  const headR = 0.23;
  const skull = add(head, new THREE.IcosahedronGeometry(headR, 3), skin);
  skull.scale.set(1, 1.05, 0.95);

  // ears
  for (const sx of [-1, 1]) add(head, new THREE.SphereGeometry(0.05, 8, 6), skin, sx * headR * 0.98, -0.01, 0);
  // eyes with highlights
  for (const sx of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.032, 12, 10), mat(0x24150d, { flatShading: false, roughness: 0.3 }),
      sx * 0.078, 0.0, headR * 0.88);
    add(head, new THREE.SphereGeometry(0.01, 6, 6), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 }),
      sx * 0.078 + 0.01, 0.012, headR * 0.88 + 0.028);
    // eyebrows
    const brow = add(head, new THREE.BoxGeometry(0.065, 0.013, 0.02), hairMat, sx * 0.08, 0.065, headR * 0.86);
    brow.rotation.z = sx * -0.12;
  }
  // nose
  add(head, new THREE.SphereGeometry(0.022, 8, 6), skin, 0, -0.04, headR * 0.95);
  // smile
  const smile = add(head, new THREE.TorusGeometry(0.05, 0.009, 6, 16, Math.PI), mat(0x4a1f16), 0, -0.075, headR * 0.86);
  smile.rotation.z = Math.PI;

  // --- hair ---
  if (hair === 'messy') {
    // longer, messy: full cap + random tufts + fringe and longer sides/back
    const cap = add(head, new THREE.SphereGeometry(headR * 1.07, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat, 0, 0.03, -0.01);
    cap.rotation.x = -0.38;
    const rnd = mulberry(7);
    for (let i = 0; i < 26; i++) {
      const theta = rnd() * Math.PI * 2;
      const phi = 0.2 + rnd() * 1.0;
      if (Math.sin(theta) > 0.55 && phi > 0.7) continue; // keep the face clear
      const r = headR * 1.08;
      const dir = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
      const tuft = add(head, new THREE.ConeGeometry(0.045 + rnd() * 0.02, 0.09 + rnd() * 0.05, 5), hairMat,
        dir.x * r, dir.y * r + 0.01, dir.z * r);
      tuft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().add(new THREE.Vector3((rnd() - 0.5) * 0.8, -0.35, (rnd() - 0.5) * 0.8)).normalize());
    }
    // fringe falling over the forehead
    for (let i = -3; i <= 3; i++) {
      const f = add(head, new THREE.ConeGeometry(0.035, 0.12, 5), hairMat, i * 0.04, 0.15, headR * 0.84);
      f.rotation.x = Math.PI * 0.92;
      f.rotation.z = i * 0.12 + 0.15;
    }
    // longer at sides and back, past the ears
    for (const sx of [-1, 1]) {
      for (let j = 0; j < 3; j++) {
        const s = add(head, new THREE.ConeGeometry(0.045, 0.16, 5), hairMat, sx * headR * 0.95, 0.03 - j * 0.02, -0.04 - j * 0.06);
        s.rotation.x = Math.PI;
        s.rotation.z = sx * -0.25;
      }
    }
    for (let j = -2; j <= 2; j++) {
      const b = add(head, new THREE.ConeGeometry(0.05, 0.16, 5), hairMat, j * 0.07, -0.02, -headR * 0.9);
      b.rotation.x = Math.PI * 0.85;
    }
  } else {
    // neat, side-combed, matte: smooth cap with a side part and a swoop
    const capGeo = new THREE.SphereGeometry(headR * 1.06, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const cap = add(head, capGeo, mat(HAIR, { roughness: 1, flatShading: false }), 0, 0.03, -0.01);
    cap.rotation.x = -0.42;
    // short neat sides/back
    const back = add(head, new THREE.SphereGeometry(headR * 1.04, 24, 10, Math.PI * 0.85, Math.PI * 1.3, Math.PI * 0.4, Math.PI * 0.22),
      mat(HAIR, { roughness: 1, flatShading: false }), 0, 0.02, 0);
    // swoop combed across from the part (part on his left, combed to his right)
    const swoop = add(head, new THREE.SphereGeometry(headR * 0.72, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
      mat(HAIR, { roughness: 1, flatShading: false }), -0.02, 0.16, 0.05);
    swoop.scale.set(1.3, 0.45, 1.05);
    swoop.rotation.z = 0.22;
    swoop.rotation.x = -0.25;
    // part line
    const part = add(head, new THREE.BoxGeometry(0.01, 0.012, 0.22), mat(0x3a2a1f, { roughness: 1 }), 0.11, 0.225, 0.0);
    part.rotation.z = -0.55;
  }

  // --- aviator goggles pushed up on the forehead ---
  const strap = add(head, new THREE.TorusGeometry(headR * 1.1, 0.014, 6, 30), mat(0x5a3a22), 0, 0.12, 0);
  strap.rotation.x = Math.PI / 2 + 0.35;
  for (const sx of [-1, 1]) {
    const lens = add(head, new THREE.CylinderGeometry(0.048, 0.048, 0.035, 14), mat(0x8a6a3a, { metalness: 0.6, roughness: 0.35, flatShading: false }),
      sx * 0.062, 0.2, headR * 0.82);
    lens.rotation.x = Math.PI / 2 - 0.55;
    const glass = add(head, new THREE.CircleGeometry(0.036, 14), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, metalness: 0.2, roughness: 0.1 }),
      sx * 0.062, 0.21, headR * 0.82 + 0.019);
    glass.rotation.x = -0.55;
  }

  return boy;
}

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
