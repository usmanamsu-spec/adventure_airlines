// Anaya Apa's chicken tender: renders it, flies both missions, honks, and checks the right horn plays.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:4173';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 820, height: 1180 }, hasTouch: true });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(base, { waitUntil: 'commit' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
await page.tap('.pilot-card[data-who="anaya"]', { force: true });
await page.waitForTimeout(800);
await page.tap('.topbar .garage'); await page.waitForTimeout(2500);
await page.screenshot({ path: 'tests/out/tender-garage.png' });
await page.tap('.garage-panel .done');
for (const [name, v] of Object.entries({ side: [8, 3.5, 4, 0, 1, 0], front: [5, 3, 9, 0, 1.2, 0.5] })) {
  await page.evaluate(async (v) => {
    const a = window.__bsq;
    if (!a.mission) { await a.startMission(1, { autopilot: true }); a.sim(30); }
    a.paused = true;
    const m = a.mission, g = m.plane.group, V3 = g.position.constructor;
    m.camera.position.copy(g.localToWorld(new V3(v[0], v[1], v[2]))); m.camera.up.set(0, 1, 0);
    m.camera.lookAt(g.localToWorld(new V3(v[3], v[4], v[5]))); m.camera.fov = 50; m.camera.updateProjectionMatrix();
    document.querySelector('#hud').style.display = 'none';
  }, v);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `tests/out/tender-${name}.png` });
}
const r = await page.evaluate(async () => {
  const a = window.__bsq; document.querySelector('#hud').style.display = '';
  const out = [];
  for (const i of [0, 1]) {
    await a.startMission(i, { autopilot: true }); a.paused = false;
    const m = a.mission; let horns = [];
    for (const k of ['honkPlane', 'honkTruck', 'honkChicken']) { const f = a.sound[k].bind(a.sound); a.sound[k] = () => { horns.push(k); f(); }; }
    a.sim(6); a.input.touchHonk = true; a.input.honk = true; a.sim(0.1);
    let t = 0; while (t < 420 && !m.finished) { a.sim(1); t++; }
    out.push({ mission: m.def.id, vehicle: m.plane.kind, finished: !!m.finished, grade: m.result?.grade, bumps: m.bumps, horns: [...new Set(horns)], comic: document.querySelector('#hud .comic').textContent });
  }
  return out;
});
console.log(JSON.stringify(r));
await page.evaluate(async () => { const a = window.__bsq; await a.startMission(0, { autopilot: true }); a.sim(9); });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'tests/out/tender-play.png' });
console.log('errors', errors.length ? errors : 'none');
await browser.close();
