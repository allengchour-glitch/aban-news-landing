// Rauchprobe der Seite (Fassung campus-einheitlich-7) gegen die nachgebauten Dashboard-Werte. Aufruf: node rauchprobe.js <Ordner mit harness.html> <Bilderordner>
const { chromium } = require('playwright');
const dir = process.argv[2], out = process.argv[3];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let fehlerGesamt = 0;
  for (const [name, w, h, dsf] of [['phone', 390, 844, 2], ['desk', 1280, 900, 1]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 200)));
    p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
    await p.goto('file://' + dir + '/harness.html');
    await p.waitForTimeout(500);
    await p.evaluate(() => window.__runAll && window.__runAll());
    const rows = await p.evaluate(() => window.__ROWS);
    const proBereich = {};
    rows.filter((r) => r.id !== 'social_linkedin').forEach((r) => { proBereich[r.bereich] = (proBereich[r.bereich] || 0) + 1; });
    // 2D
    await p.locator('#kb-tab-buero').click();
    await p.evaluate(() => window.__runAll());
    await p.waitForTimeout(600);
    const zwei = await p.evaluate(() => {
      const o = {};
      document.querySelectorAll('.kb-floor[data-bereich]').forEach((f) => { o[f.dataset.bereich] = f.querySelectorAll('.kb-desk').length; });
      return { figuren: o, papiere: document.querySelectorAll('.kb-blatt').length, breite: [document.documentElement.scrollWidth, document.documentElement.clientWidth] };
    });
    await p.screenshot({ path: `${out}/${name}-2d.png`, fullPage: name === 'desk' });
    // Liste
    await p.locator('#kb-tab-liste').click();
    await p.evaluate(() => window.__runAll());
    const liste = await p.locator('#kb-pane-liste .kb-row').count();
    // 3D
    await p.locator('#kb-tab-3d').click();
    await p.evaluate(() => window.__runAll());
    await p.waitForTimeout(5000);
    const drei = await p.evaluate(() => { const c = document.querySelector('#kb-pane-3d canvas'); return c ? [c.width, c.height] : null; });
    await p.screenshot({ path: `${out}/${name}-3d.png` });
    console.log(name, JSON.stringify({ zeilen: rows.length, erwartetProBereich: proBereich, figuren2D: zwei.figuren, blaetter: zwei.papiere, liste, canvas: drei, breite: zwei.breite, fehler: errs }));
    fehlerGesamt += errs.length;
    await ctx.close();
  }
  await b.close();
  process.exit(fehlerGesamt ? 1 : 0);
})();
