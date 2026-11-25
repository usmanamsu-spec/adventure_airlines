// Headless smoke test: boots the game, then flies every mission on autopilot (simulation only).
// usage: NODE_PATH=$(npm root -g) node tests/smoke.mjs [baseUrl] [missionFilter]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:4173';
const only = process.argv[3] || null;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 820, height: 1180 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(base, { waitUntil: 'commit' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
console.log('booted');
const results = [];
for (const player of ['yusuf', 'musa']) {
  await page.evaluate((p) => { const a = window.__bsq; a.player = p; a.profile.upgrades.floats = true; }, player);
  const ids = await page.evaluate(() => (window.__bsqMissions || []).length);
  void ids;
  const n = 9;
  for (let i = 0; i < n; i++) {
    const id = await page.evaluate(async (i) => { const a = window.__bsq; await a.startMission(i, { autopilot: true }); return a.mission.def.id; }, i);
    if (only && id !== only) continue;
    const r = await page.evaluate(() => {
      const a = window.__bsq; const m = a.mission;
      let t = 0;
      while (t < 600 && a.state === 'mission' && a.mission === m && !m.finished) { a.sim(1); t += 1; }
      const F = m.flight;
      return { phase: m.phase, finished: !!m.finished, result: m.result || null, t, obj: m.objIndex, pos: [F.pos.x, F.pos.y, F.pos.z].map(v => Math.round(v)), bumps: m.bumps, crashes: m.crashes, target: m.targetTime };
    });
    results.push({ player, id, ...r });
    console.log(player, id, JSON.stringify(r));
    if (player === 'musa') break; // second pilot: just check one mission builds and flies
  }
}
console.log('errors:', errors.length ? errors.slice(0, 10) : 'none');
await browser.close();
const bad = results.filter(r => !r.finished);
process.exit(bad.length || errors.length ? 1 : 0);
