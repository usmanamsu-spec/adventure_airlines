// Reports draw calls / triangles / textures in the title screen and during both missions.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:4173';
const gfx = process.argv[3] || null;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 820, height: 1180 } });
await page.goto(base, { waitUntil: 'commit' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
const stat = () => page.evaluate(() => {
  const a = window.__bsq, r = a.renderer;
  r.info.autoReset = false; r.info.reset();
  if (a.mission) { if (a.post.composer) a.post.render(); else r.render(a.mission.scene, a.mission.camera); }
  else r.render(a.titleScene, a.titleCam);
  const i = r.info; const out = { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures, programs: i.programs.length };
  r.info.autoReset = true;
  let meshes = 0; (a.mission ? a.mission.scene : a.titleScene).traverse(o => { if (o.isMesh || o.isSprite || o.isPoints) meshes++; });
  out.objects = meshes; return out;
});
console.log('title', JSON.stringify(await stat()));
for (const [i, t, name] of [[0, 8, 'intro'], [1, 20, 'dallas'], [1, 110, 'smokies'], [1, 190, 'greensboro']]) {
  await page.evaluate(async ([i, t, gfx]) => { const a = window.__bsq; a.player = 'yusuf'; if (gfx) a.settings.graphics = gfx; if (!a.mission || a.mission.def.id !== ['intro', 'trip'][i] || t < 21) await a.startMission(i, { autopilot: true }); a.sim(t - (a.mission.t || 0)); }, [i, t, gfx]);
  console.log(name, JSON.stringify(await stat()));
}
await browser.close();
