// HONK must work on 60, 90 and 120 Hz screens, and in every phase (countdown, flying, after landing).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:4173';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 900 }, hasTouch: true });
await page.goto(base, { waitUntil: 'commit' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
await page.tap('.pilot-card[data-who="yusuf"]', { force: true });
for (const [hz, phase, pilot] of [[60, 'fly', 'yusuf'], [90, 'fly', 'yusuf'], [120, 'fly', 'yusuf'], [120, 'fly', 'faris'], [120, 'countdown', 'yusuf'], [120, 'landed', 'yusuf']]) {
  const r = await page.evaluate(async ([hz, phase, pilot]) => {
    const a = window.__bsq; a.player = pilot;
    await a.startMission(0, { autopilot: true });
    if (phase === 'fly') a.sim(5);
    if (phase === 'landed') { let n = 0; while (a.mission.phase !== 'landed' && n++ < 200) a.sim(1); }
    let honks = 0; const orig = a.mission.honk.bind(a.mission); a.mission.honk = () => { honks++; orig(); };
    const App = Object.getPrototypeOf(a), el = document.querySelector('.honk');
    const raf = window.requestAnimationFrame; window.requestAnimationFrame = () => 0;
    const draw = a.renderer.render; a.renderer.render = () => {}; // drawing isn't needed to test the horn (keeps the test fast)
    let now = performance.now(); a.last = now;
    const taps = phase === 'fly' ? 12 : 1;
    for (let tap = 0; tap < taps; tap++) {
      el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, bubbles: true, cancelable: true, pointerType: 'touch' }));
      for (let f = 0; f < hz * 0.7; f++) { now += 1000 / hz; App.loop.call(a, now); }
    }
    window.requestAnimationFrame = raf; a.renderer.render = draw;
    return `${pilot} @${hz}Hz during ${a.mission ? phase : '?'}: ${honks}/${taps} honks (${a.mission.plane.kind})`;
  }, [hz, phase, pilot]);
  console.log(r);
}
await browser.close();
