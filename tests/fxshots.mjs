import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:4173';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, hasTouch: true });
await page.goto(base, { waitUntil: 'commit' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
await page.evaluate(() => { const a = window.__bsq; a.player = 'yusuf'; a.profile.upgrades.floats = true; });
// 1. ring pass in Balloon Festival: shockwave + flash + boost lines
await page.evaluate(async () => { const a = window.__bsq; await a.startMission(2, { autopilot: true }); const m = a.mission; let n = 0; while (m.objectives[0].count < 2 && n++ < 3000) a.sim(1 / 60); a.sim(0.12); });
await page.waitForTimeout(150);
await page.screenshot({ path: 'tests/out/fx-ring.png' });
// 2. bonk
await page.evaluate(() => { const m = window.__bsq.mission; m.invuln = 0; m.hurt('bump'); window.__bsq.sim(0.15); });
await page.waitForTimeout(200);
await page.screenshot({ path: 'tests/out/fx-bonk.png' });
// 3. landing fireworks at night
await page.evaluate(async () => { const a = window.__bsq; await a.startMission(5, { autopilot: true }); const m = a.mission; let n = 0; while (m.phase !== 'landed' && n++ < 400) a.sim(1); a.sim(1.6); });
await page.waitForTimeout(150);
await page.screenshot({ path: 'tests/out/fx-fireworks.png' });
// 4. lake: low over the water with spray
await page.evaluate(async () => { const a = window.__bsq; await a.startMission(6, { autopilot: true }); const m = a.mission; let n = 0; while (m.objectives[0].count < 6 && n++ < 4000) a.sim(1 / 60); a.sim(0.5); });
await page.waitForTimeout(150);
await page.screenshot({ path: 'tests/out/fx-lake.png' });
await browser.close();
