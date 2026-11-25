// Checks that pinches / double taps are blocked, while the stick, BOOST and menus still work.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:4173';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(base, { waitUntil: 'commit' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
const touchTest = () => page.evaluate(() => {
  const mk = (el, id, x, y) => new Touch({ identifier: id, target: el, clientX: x, clientY: y });
  const fire = (type, el, touches) => { const ev = new TouchEvent(type, { touches, targetTouches: touches, changedTouches: touches, bubbles: true, cancelable: true }); el.dispatchEvent(ev); return ev.defaultPrevented; };
  const joy = document.querySelector('.joystick') || document.body;
  const boost = document.querySelector('.boost') || document.body;
  const two = [mk(joy, 1, 120, 700), mk(boost, 2, 1090, 730)];
  const one = [mk(document.querySelector('canvas'), 3, 500, 400)];
  const g = new Event('gesturestart', { bubbles: true, cancelable: true }); document.dispatchEvent(g);
  return {
    twoFingerStartBlocked: fire('touchstart', joy, two),
    twoFingerMoveBlocked: fire('touchmove', joy, two),
    oneFingerDragOnGameBlocked: fire('touchmove', one[0].target, one),
    gestureBlocked: g.defaultPrevented,
    oneFingerTouchOnGameBlocked: fire('touchstart', one[0].target, one),
    boostDoubleTapBlocked: (fire('touchend', boost, []), fire('touchend', boost, [])),
  };
});
const menuTapAllowed = await page.evaluate(() => {
  const b = document.querySelector('.pilot-card');
  const t = new Touch({ identifier: 5, target: b, clientX: 100, clientY: 900 });
  const ev = new TouchEvent('touchstart', { touches: [t], targetTouches: [t], changedTouches: [t], bubbles: true, cancelable: true });
  b.dispatchEvent(ev);
  return !ev.defaultPrevented;
});
await page.tap('.pilot-card[data-who="yusuf"]', { force: true });
const menuScroll = await page.evaluate(() => {
  const ch = document.querySelector('.chapter .mcard');
  const t = new Touch({ identifier: 9, target: ch, clientX: 200, clientY: 300 });
  const ev = new TouchEvent('touchmove', { touches: [t], targetTouches: [t], changedTouches: [t], bubbles: true, cancelable: true });
  ch.dispatchEvent(ev);
  return !ev.defaultPrevented;
});
await page.tap('.mcard[data-i="0"]');
await page.tap('.modal .go');
await page.waitForFunction(() => window.__bsq.state === 'mission', null, { timeout: 120000 });
await page.evaluate(() => window.__bsq.sim(4));
const inGame = await touchTest();
// stick + boost together (two fingers) still steer and boost
const box = await page.locator('.joystick').boundingBox();
const both = await page.evaluate(({ cx, cy }) => {
  const joy = document.querySelector('.joystick'), boost = document.querySelector('.boost');
  const pe = (el, type, id, x, y) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, pointerType: 'touch' }));
  pe(joy, 'pointerdown', 11, cx, cy); pe(joy, 'pointermove', 11, cx + 80, cy);
  const r = boost.getBoundingClientRect(); pe(boost, 'pointerdown', 12, r.x + 40, r.y + 40);
  const a = window.__bsq; for (let i = 0; i < 30; i++) { a.input.update(1 / 60); a.mission.step(1 / 60); }
  return { roll: a.input.roll, boost: a.input.boost };
}, { cx: box.x + box.width / 2, cy: box.y + box.height / 2 });
console.log(JSON.stringify({ menuTapAllowed, menuScrollAllowed: menuScroll, ...inGame, stickAndBoostTogether: both, errors }));
await browser.close();
