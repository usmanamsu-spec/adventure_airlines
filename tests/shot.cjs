// usage: node tests/shot.cjs <url> <out.png> [scale] [width] [height]
const { chromium } = require('playwright');
(async () => {
  const [url, out, scale, w, h] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: Number(w || 1180), height: Number(h || 820) }, deviceScaleFactor: Number(scale || 1) });
  page.on('console', m => { if (!/GPU stall|GL Driver/.test(m.text())) console.log('console:', m.text()); });
  page.on('pageerror', e => console.log('pageerror:', e.message));
  await page.goto(url, { waitUntil: 'commit', timeout: 60000 });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 400000 });
  await page.waitForTimeout(300);
  console.log(JSON.stringify(await page.evaluate(() => window.__times || null)));
  await page.screenshot({ path: out });
  await browser.close();
})();
