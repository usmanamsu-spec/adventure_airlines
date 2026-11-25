// End-to-end: menus -> mission via UI -> keyboard steering -> results screen -> next mission.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || 'tests/out';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 820, height: 1180 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(base, { waitUntil: 'commit' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
await page.click('.pilot-card[data-who="musa"]', { force: true });
await page.click('.mcard[data-i="0"]');
await page.click('.modal .go');
await page.waitForFunction(() => window.__bsq.state === 'mission', null, { timeout: 120000 });
await page.evaluate(() => window.__bsq.sim(4));
const h0 = await page.evaluate(() => window.__bsq.mission.flight.h);
await page.keyboard.down('ArrowRight');
await page.keyboard.down('Space');
await page.waitForTimeout(2500);
await page.evaluate(() => { const a = window.__bsq; a.input.update(0.016); a.sim(1); });
const s1 = await page.evaluate(() => ({ h: window.__bsq.mission.flight.h, boost: window.__bsq.mission.flight.boosting, roll: window.__bsq.input.roll }));
await page.keyboard.up('ArrowRight'); await page.keyboard.up('Space');
console.log('heading change', (s1.h - h0).toFixed(2), 'roll input', s1.roll, 'boosting', s1.boost);
await page.screenshot({ path: `${out}/flow-flying.png` });
// pause menu
await page.click('#hud .pause');
await page.screenshot({ path: `${out}/flow-pause.png` });
await page.click('.pause .resume');
// let the autopilot finish
await page.evaluate(() => { const a = window.__bsq; a.mission.autopilot = true; let t = 0; while (t < 300 && !a.mission.finished) { a.sim(1); t++; } });
await page.waitForSelector('.results', { timeout: 20000 });
await page.waitForTimeout(1800);
await page.screenshot({ path: `${out}/flow-results.png` });
const unlocked = await page.evaluate(() => window.__bsq.profile.missions.intro);
console.log('saved intro', JSON.stringify(unlocked));
await page.click('.results .next');
await page.waitForFunction(() => window.__bsq.state === 'mission' && window.__bsq.mission.def.id === 'trip', null, { timeout: 120000 });
console.log('next mission started: trip');
// sideways guard (the game is portrait-only)
await page.setViewportSize({ width: 1180, height: 820 });
await page.waitForTimeout(1600);
const paused = await page.evaluate(() => window.__bsq.paused);
await page.screenshot({ path: `${out}/flow-sideways.png` });
console.log('paused when sideways', paused);
console.log('errors', errors.length ? errors : 'none');
await browser.close();
