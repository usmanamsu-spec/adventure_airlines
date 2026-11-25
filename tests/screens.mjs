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
const plan = { intro: 3.2, dallas: 20, memphis: 61, fall: 72, smokies: 96, pilot: 136, greensboro: 158, downtown: 178, home: 205 };
const ids = Object.keys(plan);
const idx = { intro: 0 };
for (let i = 0; i < ids.length; i++) {
  if (which !== 'all' && !which.split(',').includes(ids[i])) continue;
  const t0 = Date.now();
  await page.evaluate(async (i) => { await window.__bsq.startMission(i, { autopilot: true }); window.__bsq.sim(4); }, ids[i] === 'intro' ? 0 : 1);
  console.log('built in', Date.now() - t0, 'ms');
  await page.evaluate((s) => window.__bsq.sim(s), plan[ids[i]]);
  
  await shot(`m-${ids[i]}`);
}
await browser.close();
