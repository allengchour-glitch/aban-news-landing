// Lokale Sicht auf die Seite (nachgebaute Dashboard-Werte). Aufruf: node shot.js <Ordner>
const { chromium } = require('playwright');
const dir = process.argv[2];

(async () => {
  const b = await chromium.launch();
  const lauf = [
    ['phone', 390, 844, 'light', 'harness.html', 2],
    ['phonedemo', 390, 844, 'light', 'harness_demo.html', 2],
    ['desk', 1000, 900, 'dark', 'harness.html', 1],
  ];
  for (const [name, w, h, scheme, file, dsf] of lauf) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, colorScheme: scheme });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
    p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await p.goto('file://' + dir + '/' + file);
    await p.evaluate(() => window.__runAll());
    await p.waitForTimeout(700);
    // Kopf
    await p.locator('.kb-head').screenshot({ path: `${dir}/${name}-kopf.png` });
    const raeume = p.locator('.kb-raum');
    const n = await raeume.count();
    for (let i = 0; i < n; i++) {
      await raeume.nth(i).screenshot({ path: `${dir}/${name}-raum${i}.png` });
    }
    // Breite prüfen
    const breite = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    console.log(name, 'Räume:', n, 'Breite', JSON.stringify(breite), 'Fehler:', JSON.stringify(errs));
    await ctx.close();
  }
  await b.close();
})();
