// Plays the missions on autopilot with every kid as pilot and prints what the squad says.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:4173';
const only = process.argv[3];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(base, { waitUntil: 'commit' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
await page.evaluate(() => { const h = window.__bsq.hud; const orig = h.say.bind(h); window.__said = []; h.say = (who, text, ms) => { window.__said.push([who, text]); return orig(who, text, ms); }; });
const pilots = only ? [only] : ['yusuf', 'musa', 'anaya', 'ayra', 'harun', 'faris', 'zainab', 'babymusa'];
let total = 0;
for (const p of pilots) {
  for (const i of p === pilots[0] ? [0, 1] : [0]) {
    const r = await page.evaluate(async ([p, i]) => {
      const a = window.__bsq; a.player = p; window.__said = [];
      await a.startMission(i, { autopilot: true });
      const m = a.mission; let t = 0;
      while (t < 400 && !m.finished) { a.sim(1); t++; }
      return { finished: !!m.finished, t, said: window.__said, selfTalk: window.__said.filter(s => s[0] === p).length };
    }, [p, i]);
    total += r.said.length;
    console.log(`\n=== pilot ${p}, mission ${i}: ${r.said.length} lines in ${r.t}s, finished ${r.finished}, pilot talked to themselves: ${r.selfTalk}`);
    for (const [w, t] of r.said.slice(0, process.env.ALL ? 999 : 18)) console.log(`  ${w}: ${t}`);
  }
}
console.log('\ntotal lines', total, 'errors', errors.length ? errors : 'none');
await browser.close();
