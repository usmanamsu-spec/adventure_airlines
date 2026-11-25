// Greensboro, NC: the end of the trip, in detail, at sunset in the fall.
// Guilford Courthouse battlefield, Lake Brandt, the Science Center, the Bog Garden, the Coliseum, UNCG,
// downtown (Elm Street, the Carolina Theatre, the Civil Rights Museum, LeBauer Park's floating net,
// Center City Park fountain, the ballpark), the train depot, N.C. A&T, and Musa's neighborhood.
import * as THREE from 'three';
import { netSculpture, trainCar, rails, shuttle } from './props.js';
import { label3d, musaHouse, scatterTrees } from './helpers.js';
import { glowTexture } from './props.js';
import { makeBoy, lookAt, RUMAN } from '../characters.js';

const PI = Math.PI;
export const GSO = { landX: 0, landZ: 4860 };

function streetLamps(w, x1, z1, x2, z2, every = 28, side = 7) {
  const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz), n = Math.floor(len / every);
  const px = -dz / len, pz = dx / len;
  for (let i = 0; i <= n; i++) for (const s of [-1, 1]) {
    const x = x1 + dx * i / n + px * side * s, z = z1 + dz * i / n + pz * side * s;
    w.box(x, 0, z, 0.3, 6, 0.3, 0x2a2a2a);
    w.shape('sphere', x, 6.3, z, 1, 1, 1, 0xfff0b0, { batch: 'glow' });
  }
}

function storefront(w, x, z, ry, wdt, h, color, awning) {
  w.building(x, z, wdt, 14, h, color, { ry, roof: 0x5a4a40 });
  const c = Math.cos(ry), s = Math.sin(ry);
  // front faces the street (local +z)
  w.box(x + s * 7.6, 3.2, z + c * 7.6, wdt * 0.9, 0.3, 2.4, awning, { ry });
  w.box(x + s * 7.05, 0, z + c * 7.05, wdt * 0.8, 3, 0.15, 0x2c4466, { ry });
  w.box(x + s * 7.05, h - 1.2, z + c * 7.05, wdt, 1, 0.3, 0xe8e0d0, { ry }); // cornice
}

export function buildGreensboro(w, P) {
  const rings = [];
  const r = () => w.r();

  // ---------------------------------------------------------------- Guilford Courthouse National Military Park (left)
  w.lawn(-170, 3690, 230, 180, 0xa7a24a);
  w.road(-270, 3620, -70, 3620, 5, { lines: false, color: 0x9a8f7a });
  w.road(-70, 3620, -70, 3770, 5, { lines: false, color: 0x9a8f7a });
  w.road(-270, 3770, -70, 3770, 5, { lines: false, color: 0x9a8f7a });
  for (const [x, z, h] of [[-150, 3660, 14], [-205, 3720, 10], [-120, 3745, 12], [-230, 3655, 8]]) {
    w.box(x, 0, z, 3, h, 3, 0xe8e4da, { collide: true });
    w.shape('cone4', x, h, z, 3.4, 2.5, 3.4, 0xe8e4da);
  }
  w.box(-180, 0, 3695, 6, 4, 4, 0xd8d4c8);
  w.box(-180, 4, 3695, 2.2, 3, 4.5, 0x5a4a32); // equestrian statue (bronze)
  w.box(-180, 7, 3693, 1, 3, 1, 0x5a4a32);
  for (let i = 0; i < 14; i++) w.box(-260 + i * 14, 0.6, 3790 + (i % 2) * 2, 14, 0.25, 0.25, 0x7a5a3a, { ry: PI / 2 + (i % 2 ? 0.25 : -0.25) });
  for (const [x, z] of [[-120, 3700], [-128, 3708], [-112, 3708]]) { w.shape('cyl', x, 0.4, z, 0.6, 2.2, 0.6, 0x3a3a3a, { rx: PI / 2 - 0.3 }); }
  w.building(-95, 3780, 22, 14, 6, 0xb87a5d, { roof: 0x4a3a2a });
  label3d(w, 'Guilford Courthouse Battlefield', -170, 34, 3690, 4.2);
  scatterTrees(w, -170, 3690, 160, 120, 70, {}, (x, z) => Math.abs(x + 170) < 110 && Math.abs(z - 3690) < 85);
  rings.push([-90, 26, 3700, true]);

  // ---------------------------------------------------------------- Lake Brandt (right), with greenway & marina
  w.waterEllipse(210, 3700, 130, 64, 0x2f6f9a);
  w.road(80, 3620, 340, 3620, 3.5, { lines: false, color: 0xc9b48a });
  w.box(110, 0.3, 3700, 26, 0.5, 4, 0x9a7a5a);
  for (let i = 0; i < 5; i++) w.box(150 + i * 22, 0.4, 3690 + (i % 2) * 22, 1.2, 0.6, 4, [0xff4f4f, 0xffd23f, 0x3fb8ff, 0x5fd35a, 0xff9a3f][i], { ry: i });
  scatterTrees(w, 210, 3700, 190, 120, 110, {}, (x, z) => ((x - 210) / 140) ** 2 + ((z - 3700) / 74) ** 2 < 1 || Math.abs(x - P(z)) < 40);
  label3d(w, 'Lake Brandt', 210, 22, 3700, 4);

  // ---------------------------------------------------------------- Greensboro Science Center (left) & Bog Garden (right)
  w.lawn(-150, 3865, 160, 110, 0x7fbf5a);
  w.building(-175, 3840, 56, 26, 13, 0xd8e2ea, { roof: 0x8aa0b0 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(17, 28, 14, 0, PI * 2, 0, PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x9fdcff, metalness: 0.2, roughness: 0.05, transmission: 0.2, transparent: true, opacity: 0.75, envMapIntensity: 1.5 }));
  dome.position.set(-120, 0, 3880);
  w.add(dome);
  w.addSphereCollider(new THREE.Vector3(-120, 0, 3880), 18);
  w.waterEllipse(-195, 3895, 22, 12, 0x3aa0c8);
  for (let i = 0; i < 4; i++) w.fence(-230 + i * 20, 3905, -215 + i * 20, 3905, 0x8a6a4a);
  for (let i = 0; i < 6; i++) { const x = -235 + i * 10; w.box(x, 0, 3920, 0.5, 9, 0.5, 0x6a4a32); if (i) w.box(x - 5, 8, 3920, 10, 0.2, 0.2, 0x3a3a3a); }
  label3d(w, 'Greensboro Science Center', -150, 34, 3860, 4.2);
  rings.push([-100, 32, 3870, true]);
  w.waterEllipse(130, 3865, 34, 22, 0x3f7f6a);
  for (let i = 0; i < 9; i++) w.box(100 + i * 7, 0.6, 3860 + (i % 2 ? 6 : -6), 2, 0.4, 13, 0x9a7a5a, { ry: i % 2 ? 0.6 : -0.6 });
  w.flowers(160, 3900, 40, 16, 50);
  label3d(w, 'Bog Garden', 130, 18, 3865, 3.4);

  // ---------------------------------------------------------------- Greensboro Coliseum (right) & UNCG (left)
  w.lawn(150, 4000, 160, 120, 0x8a8f8a);
  w.shape('disc', 150, 0, 4000, 92, 16, 92, 0xd8d0c0);
  w.shape('dome', 150, 16, 4000, 94, 22, 94, 0xc0c8d0);
  w.addSphereCollider(new THREE.Vector3(150, 6, 4000), 47);
  label3d(w, 'Greensboro Coliseum', 150, 52, 4000, 4.4);
  rings.push([80, 36, 4000, true]);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) w.building(-205 + i * 16 + (j % 2) * 6, 3960 + j * 34, 12, 20, 9 + (i % 3) * 3, 0xa4513c, { roof: 0x3a3a3a, collide: i % 2 === 0 });
  w.lawn(-150, 4000, 60, 26, 0x86c460);
  label3d(w, 'UNCG', -150, 32, 4000, 3.6);

  // ---------------------------------------------------------------- Downtown
  w.road(0, 4070, 0, 4350, 12);
  for (const z of [4100, 4170, 4240, 4310]) w.road(-160, z, 160, z, 9, { lines: false });
  streetLamps(w, 0, 4070, 0, 4350, 24, 8);
  const bricks = [0xa4513c, 0x8e4a36, 0xb8664a, 0xc28a5a, 0xd8c8a8, 0x9a7a6a, 0x7a3e30];
  const awnings = [0xd8323a, 0x2f8f5a, 0x2f62c4, 0xf2b53a, 0x7a4bc2, 0xff8fd0];
  for (let z = 4078; z <= 4342; z += 13) {
    if ([4100, 4170, 4240, 4310].some(c => Math.abs(z - c) < 9)) continue;
    for (const s of [-1, 1]) {
      if (s < 0 && z > 4225 && z < 4295) continue; // LeBauer Park opens onto Elm Street
      storefront(w, s * 21, z, s > 0 ? -PI / 2 : PI / 2, 12, 9 + Math.floor(r() * 3) * 3.5, bricks[Math.floor(r() * bricks.length)], awnings[Math.floor(r() * awnings.length)]);
    }
  }
  // Carolina Theatre vertical sign
  const sg = document.createElement('canvas'); sg.width = 64; sg.height = 320;
  const gx = sg.getContext('2d');
  gx.fillStyle = '#1a1a3a'; gx.fillRect(0, 0, 64, 320);
  gx.fillStyle = '#ffd86a'; gx.font = 'bold 40px Georgia, serif'; gx.textAlign = 'center';
  'CAROLINA'.split('').forEach((ch, i) => gx.fillText(ch, 32, 40 + i * 37));
  const sgTex = new THREE.CanvasTexture(sg); sgTex.colorSpace = THREE.SRGBColorSpace;
  const marquee = new THREE.Mesh(new THREE.BoxGeometry(0.6, 13, 2.6), [0, 1, 2, 3, 4, 5].map(i => i < 2 ? new THREE.MeshStandardMaterial({ map: sgTex, emissive: 0xffffff, emissiveMap: sgTex, emissiveIntensity: 0.9 }) : new THREE.MeshStandardMaterial({ color: 0x1a1a3a })));
  marquee.position.set(-13.5, 14, 4150);
  w.add(marquee);
  label3d(w, 'Carolina Theatre', -21, 26, 4150, 3);
  w.building(23, 4112, 16, 18, 10, 0xd8c8a8, { roof: 0x5a4a40 });
  label3d(w, 'International Civil Rights Center & Museum', 23, 22, 4112, 2.8);
  // the skyline
  w.building(78, 4205, 30, 30, 68, 0x6f8aa3);
  w.building(78, 4205, 22, 22, 18, 0x7f95ad, { y: 68 });
  w.building(78, 4205, 14, 14, 12, 0x8ea6bf, { y: 86 });
  w.box(78, 98, 4205, 1, 14, 1, 0xdddddd);
  label3d(w, 'Downtown Greensboro', 78, 124, 4205, 4.6);
  for (const [x, z, h] of [[125, 4130, 48], [120, 4280, 40], [62, 4130, 34], [-95, 4120, 44], [-130, 4200, 36], [-110, 4320, 30], [150, 4210, 30]]) {
    w.building(x, z, 22, 22, h, [0x8ea6bf, 0xb5c2cf, 0xc8b89a, 0x9a8a7a][Math.floor(r() * 4)]);
  }
  // LeBauer Park + the floating net sculpture
  w.lawn(-72, 4260, 74, 64, 0x8fd067);
  w.flowers(-72, 4240, 50, 8, 40);
  const net = netSculpture(62, 46, 7);
  net.position.set(-72, 34, 4260);
  w.add(net);
  w.addBoxCollider(-72, 27, 4260, 68, 10, 52);
  for (const [x, z] of [[-108, 4232], [-36, 4232], [-108, 4288], [-36, 4288]]) w.addBoxCollider(x, 0, z, 2, 28, 2);
  label3d(w, 'LeBauer Park', -72, 50, 4260, 4);
  rings.push([-72, 15, 4260, true]);
  // Center City Park fountain (animated jets)
  w.lawn(-72, 4185, 60, 40, 0x86c460);
  w.shape('disc', -72, 0, 4185, 18, 0.8, 18, 0xbfc6cc);
  const jets = [];
  const jetMat = new THREE.MeshStandardMaterial({ color: 0xcfefff, transparent: true, opacity: 0.7, roughness: 0.1 });
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * PI * 2;
    const j = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 1, 6).translate(0, 0.5, 0), jetMat);
    j.position.set(-72 + Math.cos(a) * 6, 0.8, 4185 + Math.sin(a) * 6);
    w.add(j); jets.push(j);
  }
  const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 1, 8).translate(0, 0.5, 0), jetMat);
  mid.position.set(-72, 0.8, 4185); w.add(mid); jets.push(mid);
  const mist = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xe8f8ff, transparent: true, opacity: 0.4, depthWrite: false }));
  mist.position.set(-72, 4, 4185); mist.scale.set(16, 8, 1); w.add(mist);
  w.addDyn((dt, t) => jets.forEach((j, i) => { j.scale.y = (i === 8 ? 9 : 4) + Math.sin(t * 3 + i) * 1.5; }));
  // ballpark
  w.lawn(95, 4320, 80, 60, 0x4fa83a);
  w.box(95, 0.03, 4330, 24, 0.06, 24, 0xb5814a, { ry: PI / 4 });
  for (let i = 0; i < 7; i++) { const a = -PI / 2 + i * 0.35; w.box(95 + Math.cos(a) * 44, 0, 4300 + Math.sin(a) * 22 + 30, 16, 6 + (i % 2), 7, 0x2f5a8a, { ry: -a + PI / 2, collide: true }); }
  for (const [x, z] of [[60, 4295], [130, 4295], [60, 4348], [130, 4348]]) { w.box(x, 0, z, 1, 26, 1, 0x888888, { collide: true }); w.box(x, 26, z, 5, 3, 1, 0xffffee, { batch: 'glow' }); }
  label3d(w, 'Ballpark', 95, 36, 4320, 3.6);

  // ---------------------------------------------------------------- the train depot
  w.building(62, 4398, 70, 16, 12, 0xa4513c, { roof: 0x3a4a3a });
  w.box(62, 12, 4398, 10, 14, 10, 0xa4513c, { collide: true });
  w.shape('cone4', 62, 26, 4398, 11, 6, 11, 0x3a4a3a);
  for (const s of [-1, 1]) w.shape('disc', 62, 20, 4398 + s * 5.1, 4, 0.2, 4, 0xfff6e0, { rx: PI / 2, batch: 'glow' });
  rails(w, -420, 4428, 420, 4428);
  const train = new THREE.Group();
  [0x2f5a8a, 0x2f5a8a, 0xd8d8d8, 0xd8323a].forEach((c, i) => { const car = trainCar(c, 16); car.position.z = -i * 18; train.add(car); });
  shuttle(w, train, -380, 4428, 380, 4428, 7);
  label3d(w, 'Galyon Depot', 62, 40, 4398, 3.8);
  rings.push([10, 18, 4415, true]);

  // ---------------------------------------------------------------- N.C. A&T State University (left)
  w.lawn(-150, 4510, 170, 90, 0x86c460);
  for (const [x, z] of [[-210, 4480], [-160, 4475], [-110, 4480], [-210, 4545], [-110, 4545]]) {
    w.building(x, z, 30, 18, 12, 0xa4513c, { roof: 0x3a3a3a });
    for (let i = 0; i < 5; i++) w.shape('cyl', x - 10 + i * 5, 0, z + 9.5, 0.9, 9, 0.9, 0xffffff);
  }
  w.box(-160, 0, 4512, 6, 26, 6, 0xa4513c, { collide: true });
  w.shape('cone4', -160, 26, 4512, 7, 6, 7, 0x2f62c4);
  w.shape('disc', -160, 18, 4515.2, 3.6, 0.2, 3.6, 0xffffff, { rx: PI / 2 });
  w.box(-195, 0, 4515, 50, 0.1, 22, 0x2f62c4);
  w.box(-195, 0.1, 4515, 44, 0.1, 16, 0x4fa83a);
  for (let i = 0; i < 4; i++) w.box(-135 + i * 2.4, 1.5, 4520, 1, 2.4, 1, 0x5a4a32);
  w.box(-131.5, 0, 4520, 12, 1.5, 3, 0xd8d4c8);
  label3d(w, 'N.C. A&T', -160, 40, 4512, 3.8);

  // ---------------------------------------------------------------- neighborhoods & Musa's street
  const zone = (x, z) => Math.abs(x) < 18 && z > 4790 && z < 4930;
  w.road(0, 4560, 0, 5060, 10, { lines: false });
  streetLamps(w, 0, 4580, 0, 5040, 36, 7);
  for (let z = 4590; z < 5050; z += 28) for (const s of [-1, 1]) {
    const x = s * 22;
    if (s > 0 && Math.abs(z - (GSO.landZ + 10)) < 16) continue;
    w.house(x, z, s > 0 ? -PI / 2 : PI / 2);
    w.tree(s * 38, z + 8, { s: 1.1 });
    if (r() < 0.6 && !(Math.abs(z + 14 - GSO.landZ) < 70)) w.tree(s * 9, z + 14, { s: 0.8 });
  }
  musaHouse(w, 26, GSO.landZ + 10, -PI / 2);
  w.lawn(26, GSO.landZ + 10, 30, 30, 0x86c460);
  label3d(w, 'The Greensboro House', 26, 20, GSO.landZ + 10, 4);
  // Ruman is waiting in the front yard, waving
  const ruman = makeBoy(RUMAN, { lod: 'lo' });
  ruman.position.set(14, 0, GSO.landZ + 2);
  ruman.rotation.y = -Math.PI / 2 - 0.5;
  ruman.traverse(o => { if (o.isMesh) o.castShadow = true; });
  w.add(ruman);
  const wave = ruman.userData.waveHand;
  w.addDyn((dt, t) => {
    ruman.position.y = Math.abs(Math.sin(t * 3)) * 0.12;
    if (wave) wave.quaternion.copy(wave.userData.baseQ).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.sin(t * 8) * 0.5));
  });
  label3d(w, 'Ruman', 14, 3.4, GSO.landZ + 2, 1.6);
  void lookAt;
  for (const zz of [4700, 4980]) w.road(-200, zz, 200, zz, 9, { lines: false });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) {
    const x = (i < 2 ? -1 : 1) * (70 + (i % 2) * 70), z = 4600 + j * 55;
    w.house(x + (r() - 0.5) * 8, z, r() < 0.5 ? 0 : PI);
    w.tree(x + 20, z + 18, { s: 1.1 });
  }
  scatterTrees(w, 0, 4200, 420, 700, 260, {}, (x, z) => Math.abs(x - P(z)) < 30 || (Math.abs(x) < 170 && z > 4060 && z < 4440) || (z > 3600 && z < 3800 && ((x + 170) ** 2 / 120 ** 2 + (z - 3690) ** 2 / 95 ** 2 < 1 || (x - 210) ** 2 / 145 ** 2 + (z - 3700) ** 2 / 80 ** 2 < 1)) || (Math.abs(x + 150) < 90 && z > 3800 && z < 3930) || (Math.abs(x - 150) < 90 && z > 3930 && z < 4070) || zone(x, z));
  return { rings };
}
