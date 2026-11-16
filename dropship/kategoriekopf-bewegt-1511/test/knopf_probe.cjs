const path = require('path'); const { seite, chromium } = require('../nachbau.cjs');
const HIER = path.join(__dirname, '..');
(async () => {
  const [h, profil, aus] = process.argv.slice(2);
  const e = await (await import(path.join(HIER, 'harness', 'render.mjs'))).rendern(h);
  const b = await chromium.launch(); const t = await seite(b, { html: path.join(HIER, 'html', 'live', h + '.html'), profil, handle: h, einsatz: e }); await t.page.waitForTimeout(2500);
  if (process.env.OFFEN) { await t.page.evaluate(() => { const d = document.querySelector('.lx-kk details'); if (d) d.open = true; }); await t.page.waitForTimeout(400); }
  const r = await t.page.evaluate(() => { const k = document.querySelector('.lx-kk'); const kb = document.querySelector('.lx-kb-knopf').getBoundingClientRect(); const out = []; for (const el of k.querySelectorAll('h1, .lx-kk__beschr p, .lx-kk__beschr summary, .lx-kk__anriss, .lx-kk__beschr li')) if (!(el.closest('details:not([open])') && !el.matches('summary')) && el.checkVisibility()) for (const q of el.getClientRects()) if (q.width > 0 && q.left < kb.right && q.right > kb.left && q.top < kb.bottom && q.bottom > kb.top) out.push([el.tagName, el.className, Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom), el.textContent.slice(0, 60)]); return { knopf: [kb.left, kb.top, kb.right, kb.bottom].map(Math.round), kk: (() => { const q = k.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom].map(Math.round); })(), treffer: out }; });
  console.log(JSON.stringify(r));
  await t.page.screenshot({ path: aus, clip: { x: 0, y: r.kk[1] - 5, width: t.page.viewportSize().width, height: r.kk[3] - r.kk[1] + 10 } });
  await t.ctx.close(); await b.close();
})();
