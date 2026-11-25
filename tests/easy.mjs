// "Hands-off kid" test: Easy Flying on, nobody touching the controls.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:4173';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(base, { waitUntil: 'commit' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
for (let i = 0; i < 9; i++) {
  const r = await page.evaluate(async (i) => {
    const a = window.__bsq; a.player = 'yusuf'; a.profile.upgrades.floats = true; a.settings.easy = true;
    await a.startMission(i);
    const m = a.mission; let t = 0;
    while (t < 420 && !m.finished) { a.sim(1); t++; }
    const o = m.currentObjective;
    return { id: m.def.id, finished: !!m.finished, t, phase: m.phase, progress: o ? `${o.count}/${o.total}` : 'land', grade: m.result?.grade, candies: m.candiesGot, bumps: m.bumps, crashes: m.crashes };
  }, i);
  console.log(JSON.stringify(r));
}
console.log('errors', errors.length ? errors : 'none');
await browser.close();
