// Close-up renders of Faris's truck in flight with the squad in the bed.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:4173';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 820, height: 1180 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(base, { waitUntil: 'commit' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
const views = { front: [5.2, 2.6, 7.4, 0, 1.0, 0.6], bed: [-3.4, 4.6, -7.2, 0, 0.9, -1.0], side: [8.5, 1.8, 0.5, 0, 1.0, 0] };
for (const [name, v] of Object.entries(views)) {
  await page.evaluate(async (v) => {
    const a = window.__bsq; a.player = 'faris';
    if (!a.mission || a.mission.def.id !== 'trip') { await a.startMission(1, { autopilot: true }); a.sim(26); }
    a.paused = true;
    const m = a.mission, g = m.plane.group, V3 = g.position.constructor;
    m.camera.position.copy(g.localToWorld(new V3(v[0], v[1], v[2]))); m.camera.up.set(0, 1, 0);
    m.camera.lookAt(g.localToWorld(new V3(v[3], v[4], v[5]))); m.camera.fov = 45; m.camera.updateProjectionMatrix();
    document.querySelector('#hud').style.display = 'none';
  }, v);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `tests/out/truck-${name}.png` });
  console.log('shot', name);
}
console.log('errors', errors.length ? errors : 'none');
await browser.close();
