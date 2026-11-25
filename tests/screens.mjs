// Renders screenshots of the menus and a moment from each mission.
// usage: NODE_PATH=$(npm root -g) node tests/screens.mjs [baseUrl] [outDir] [missions(comma)|all]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || 'tests/out';
const which = process.argv[4] || 'all';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 820, height: 1180 }, deviceScaleFactor: 1, hasTouch: true });
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto(base, { waitUntil: 'commit' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
await page.waitForTimeout(500);
const shot = async (name) => { await page.waitForTimeout(400); await page.screenshot({ path: `${out}/${name}.png` }); console.log('shot', name); };
if (which === 'all' || which.includes('menus')) {
  await shot('01-title');
  await page.click('.pilot-card[data-who="yusuf"]', { force: true });
  await page.waitForTimeout(600);
  await shot('02-map');
  await page.click('.mcard[data-i="0"]');
  await shot('03-briefing');
  await page.click('.modal .back');
  await page.click('.topbar .garage');
  await page.waitForTimeout(600);
  await shot('04-garage');
  await page.click('.garage-panel .done');
}
await page.evaluate(() => { const a = window.__bsq; a.player = a.player || 'yusuf'; a.profile.upgrades.floats = true; });
const plan = { m1: 6, m2: 12, m3: 14, m4: 9, trip: 70, m5: 14, m6: 22, m7: 12, m8: 10 };
const ids = ['m1', 'm2', 'm3', 'm4', 'trip', 'm5', 'm6', 'm7', 'm8'];
for (let i = 0; i < ids.length; i++) {
  if (which !== 'all' && !which.split(',').includes(ids[i])) continue;
  await page.evaluate(async (i) => { await window.__bsq.startMission(i, { autopilot: true }); window.__bsq.sim(4); }, i);
  await page.evaluate((s) => window.__bsq.sim(s), plan[ids[i]]);
  await page.evaluate(() => { const m = window.__bsq.mission; if (m.phase === 'fly') { m.doTrick(); m.trickT = 0.5; window.__bsq.sim(0.25); } m.flight.boosting = true; for (let k = 0; k < 20; k++) m.puffs.emit(m.plane.group.localToWorld(m.plane.group.position.clone().set(0, 0.8, -1.8 - k * 0.6)), { size: 1.4, life: 0.9 }); });
  await shot(`m-${ids[i]}`);
}
await browser.close();
