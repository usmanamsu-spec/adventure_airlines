import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [base, idx, secs, mode] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4] || 120), process.argv[5] || 'auto'];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
await page.goto(base, { waitUntil: 'commit' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
const log = await page.evaluate(async ([i, secs, mode]) => {
  const process_auto = mode === 'auto';
  const a = window.__bsq; a.player = 'yusuf'; a.profile.upgrades.floats = true;
  await a.startMission(i, { autopilot: process_auto });
  const m = a.mission, out = [];
  for (let t = 0; t < secs; t += 2) {
    a.sim(2);
    const F = m.flight, T = m.currentTarget();
    const o = m.currentObjective;
    out.push(`${t + 2}s phase=${m.phase} count=${o ? o.count : '-'} pos=${[F.pos.x, F.pos.y, F.pos.z].map(Math.round)} tgt=${T ? [T.x, T.y, T.z].map(Math.round) : '-'} bumps=${m.bumps}`);
    if (m.finished) break;
  }
  return out;
}, [idx, secs, mode]);
console.log(log.join('\n'));
await browser.close();
