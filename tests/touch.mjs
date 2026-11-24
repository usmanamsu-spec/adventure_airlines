// Checks touch-first defaults, audio unlock after the first tap, and the HUD on iPad + phone landscape.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:4173';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [name, w, h] of [['ipad', 1180, 820], ['phone', 844, 390]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: name === 'phone' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
  const before = await page.evaluate(() => ({ controls: window.__bsq.settings.controls, audio: window.__bsq.sound.ctx?.state ?? 'none' }));
  await page.tap('.pilot-card[data-who="yusuf"]', { force: true });
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({ audio: window.__bsq.sound.ctx?.state, music: !!window.__bsq.sound.musicTimer }));
  await page.tap('.mcard[data-i="0"]');
  await page.tap('.modal .go');
  await page.waitForFunction(() => window.__bsq.state === 'mission', null, { timeout: 120000 });
  await page.evaluate(() => window.__bsq.sim(5));
  // drag the touch stick to the right
  const box = await page.locator('.joystick').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.evaluate(({ cx, cy }) => {
    const el = document.querySelector('.joystick');
    const opts = (x, y) => ({ pointerId: 7, clientX: x, clientY: y, bubbles: true, pointerType: 'touch' });
    el.dispatchEvent(new PointerEvent('pointerdown', opts(cx, cy)));
    el.dispatchEvent(new PointerEvent('pointermove', opts(cx + 80, cy)));
  }, { cx, cy });
  const h0 = await page.evaluate(() => window.__bsq.mission.flight.h);
  await page.evaluate(() => { const a = window.__bsq; for (let i = 0; i < 60; i++) { a.input.update(1 / 60); a.mission.step(1 / 60); } });
  const st = await page.evaluate(() => ({ roll: window.__bsq.input.roll, h: window.__bsq.mission.flight.h, engine: !!window.__bsq.sound.engine }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `tests/out/touch-${name}.png` });
  console.log(name, JSON.stringify({ before, after, stickRoll: st.roll, turned: (st.h - h0).toFixed(2), engine: st.engine, errors }));
  await ctx.close();
}
await browser.close();
