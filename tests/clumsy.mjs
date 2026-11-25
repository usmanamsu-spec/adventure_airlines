// A "clumsy kid" plays with Easy Flying on: random stick wiggles, wrong-way turns, BOOST and TRICK mashing.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:4173';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(base, { waitUntil: 'commit' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
for (const [pilot, i, seed] of [['yusuf', 0, 1], ['zainab', 0, 2], ['ayra', 0, 3], ['musa', 1, 4], ['faris', 1, 5]]) {
  const r = await page.evaluate(async ([pilot, i, seed]) => {
    const a = window.__bsq; a.player = pilot; a.settings.easy = true;
    await a.startMission(i);
    const m = a.mission, inp = a.input;
    let s = seed * 9301, rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    // take over the input each frame with silly kid input
    let hold = 0, roll = 0, pitch = 0, boost = false;
    inp.update = function (dt) {
      hold -= dt;
      if (hold <= 0) {
        hold = 0.5 + rnd() * 2;
        const mode = rnd();
        if (mode < 0.4) { roll = 0; pitch = 0; }                 // hands off
        else if (mode < 0.75) { roll = (rnd() * 2 - 1); pitch = (rnd() - 0.5) * 0.4; } // random steering
        else { roll = rnd() < 0.5 ? -1 : 1; pitch = (rnd() - 0.5); } // full lock, any direction
        boost = rnd() < 0.4;
      }
      this.roll = roll; this.pitch = pitch; this.boost = boost; this.trick = rnd() < 0.01;
    };
    let t = 0;
    const step = 1 / 60;
    while (t < 480 && !m.finished) { for (let k = 0; k < 60 && !m.finished; k++) { inp.update(step); m.step(step); } t++; }
    return { pilot, mission: m.def.id, finished: !!m.finished, t, grade: m.result?.grade, stars: m.result?.stars, bumps: m.bumps, crashes: m.crashes, candy: `${m.candiesGot}/${m.candyNeed}` };
  }, [pilot, i, seed]);
  console.log(JSON.stringify(r));
}
console.log('errors', errors.length ? errors : 'none');
await browser.close();
