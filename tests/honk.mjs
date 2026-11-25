// Taps HONK in the plane and in Faris's truck: checks the right horn plays and the kids react.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:4173';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 820, height: 1180 }, hasTouch: true });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(base, { waitUntil: 'commit' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
await page.tap('.pilot-card[data-who="yusuf"]', { force: true }); // unlocks audio like a real tap
for (const pilot of ['yusuf', 'faris']) {
  await page.evaluate(async (p) => {
    const a = window.__bsq; a.player = p;
    await a.startMission(0, { autopilot: true }); a.sim(6);
    window.__horns = [];
    for (const k of ['honkPlane', 'honkTruck']) { const f = a.sound[k].bind(a.sound); a.sound[k] = () => { window.__horns.push(k); f(); }; }
    window.__said = []; const h = a.hud, orig = h.__origSay || (h.__origSay = h.say.bind(h)); h.say = (w, t, ms) => { window.__said.push(w + ': ' + t); orig(w, t, ms); };
  }, pilot);
  const btn = await page.locator('.honk').boundingBox();
  await page.evaluate(({ x, y }) => {
    const el = document.querySelector('.honk');
    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 3, clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch' }));
    const a = window.__bsq; a.input.update(1 / 60); a.mission.step(1 / 60); a.sim(0.2);
  }, { x: btn.x + 30, y: btn.y + 30 });
  await page.evaluate(() => { const c = document.querySelector('#hud .comic'); c.style.animation = 'none'; c.style.opacity = '1'; c.style.transform = 'translate(-50%,-50%) rotate(-6deg)'; window.__bsq.sim(4); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `tests/out/honk-${pilot}.png` });
  const r = await page.evaluate(() => ({ horns: window.__horns, button: document.querySelector('.honk').className, comic: document.querySelector('#hud .comic').textContent, said: window.__said, audio: window.__bsq.sound.ctx?.state }));
  console.log(pilot, JSON.stringify(r));
}
console.log('errors', errors.length ? errors : 'none');
await browser.close();
