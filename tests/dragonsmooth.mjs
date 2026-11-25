// Ayra's dragon tail must move smoothly, including when the speed changes (boost on/off).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 400, height: 600 } });
await page.goto(process.argv[2] || 'http://localhost:4173', { waitUntil: 'commit' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
console.log(await page.evaluate(async () => {
  const a = window.__bsq; a.player = 'ayra'; await a.startMission(0, { autopilot: true });
  const p = a.mission.plane; const tips = [];
  for (let i = 0; i < 540; i++) { const boost = i >= 180 && i < 360; p.update(1 / 60, boost ? 29 : 18, boost); tips.push(p.tail.clone()); }
  const v = tips.slice(1).map((q, i) => q.clone().sub(tips[i]).multiplyScalar(60));
  const acc = v.slice(1).map((q, i) => q.clone().sub(v[i]).length() * 60);
  return JSON.stringify({ tipSpeedMax: +Math.max(...v.map(x => x.length())).toFixed(2), tipAccelMax: +Math.max(...acc).toFixed(1), smooth: Math.max(...acc) < 40 });
}));
await browser.close();
