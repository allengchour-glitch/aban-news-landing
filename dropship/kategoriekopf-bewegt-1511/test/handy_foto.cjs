const path = require('path'); const { seite, chromium } = require('../nachbau.cjs');
(async () => { const HIER = path.join(__dirname, '..'); const { rendern } = await import(path.join(HIER, 'harness', 'render.mjs'));
  const h = process.argv[2]; const e = await rendern(h, {}); const b = await chromium.launch();
  for (const [art, ein] of [['heute', null], ['test', e]]) { const t = await seite(b, { html: path.join(HIER, 'html', 'live', h + '.html'), profil: 'm664', einsatz: ein }); await t.page.waitForTimeout(3500); await t.page.evaluate(() => { const c = document.querySelector('#lx-cookie-banner'); if (c) c.remove(); }); await t.page.screenshot({ path: path.join(HIER, 'fotos', `handy_${h}_${art}.jpg`), type: 'jpeg', quality: 78 }); await t.ctx.close(); }
  await b.close(); })();
