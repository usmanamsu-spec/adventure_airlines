const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const s of [512, 192, 180]) {
    const p = await b.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: s / 512 });
    await p.goto('http://localhost:5173/tests/pages/icon.html');
    await p.screenshot({ path: `public/icon-${s}.png`, clip: { x: 0, y: 0, width: 512, height: 512 } });
  }
  await b.close();
})();
