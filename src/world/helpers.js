// Shared building helpers used by the missions.
import * as THREE from 'three';
import { billboard, textSprite } from './kit.js';

// ---------------------------------------------------------------- shared builders
export function streetHouses(w, x1, z1, x2, z2, { spacing = 28, setback = 21, road = true, skip = null, trees = true, sides = [1, -1], pine = false, fences = true } = {}) {
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

export function scatterTrees(w, cx, cz, rx, rz, n, opts = {}, avoid = null) {
  for (let i = 0; i < n; i++) {
    const x = cx + (w.r() - 0.5) * 2 * rx, z = cz + (w.r() - 0.5) * 2 * rz;
    if (avoid && avoid(x, z)) continue;
    w.tree(x, z, { kind: opts.pine && w.r() < (opts.pineRatio ?? 0.7) ? 'pine' : 'round', s: (opts.s ?? 1) * (0.8 + w.r() * 0.5), collide: opts.collide ?? true });
  }
}

export function yusufHouse(w, x, z, ry) {
  w.house(x, z, ry, { w: 12, d: 12, h: 5.5, wall: 0xd8b48a, roof: 0x5a4636, garage: true });
  const c = Math.cos(ry), s = Math.sin(ry);
  // driveway + open garage with a workbench
  w.box(x + (8.6) * c + 8 * s, 0.02, z - 8.6 * s + 8 * c, 5.5, 0.26, 10, 0xbfbab0, { ry });
  w.lawn(x, z - 18 * c, 30, 22, 0x86c460, ry);
}

export function musaHouse(w, x, z, ry) {
  w.house(x, z, ry, { w: 11, d: 12, h: 5.5, wall: 0x7fa8d8, roof: 0x3f4a5a, garage: true });
  const c = Math.cos(ry), s = Math.sin(ry);
  // red door + basketball hoop
  w.box(x + 6.2 * s, 0, z + 6.2 * c, 1.5, 2.5, 0.25, 0xc8323a, { ry });
  const hx = x + 8.6 * c + 9 * s, hz = z - 8.6 * s + 9 * c;
  w.box(hx, 0, hz, 0.25, 3.4, 0.25, 0x555555);
  w.box(hx, 3.4, hz, 1.8, 1.2, 0.15, 0xffffff, { ry });
}

export function sign(w, x, z, ry, text, colors = {}) {
  const tex = billboard(text, colors);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.7 }));
  m.position.set(x, w.groundHeight(x, z) + 11, z);
  m.rotation.y = ry;
  w.add(m);
  for (const s of [-6, 6]) w.box(x + Math.cos(ry) * s, w.groundHeight(x, z), z - Math.sin(ry) * s, 0.5, 7, 0.5, 0x666666);
}

export function label3d(w, text, x, y, z, scale = 6, opts) {
  const s = textSprite(text, opts);
  s.position.set(x, y, z);
  s.scale.multiplyScalar(scale);
  w.add(s);
  return s;
}

/** Spread juice boxes along a path of points. */
export function juiceAlong(points, every = 2) {
  const out = [];
  for (let i = 0; i < points.length - 1; i += every) {
    const a = points[i], b = points[i + 1];
    out.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 1, (a[2] + b[2]) / 2]);
  }
  return out;
}

