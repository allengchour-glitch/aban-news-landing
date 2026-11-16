// Abwechselnd heute und Testkopf, je N Laeufe, gleiche Seite und Fensterbreite. CLS gesamt und die groesste Verschiebung.
// Aufruf: node test/cls_vergleich.cjs <handle> <profil> <N>
const path = require('path');
const { seite, GEOM, chromium } = require('../nachbau.cjs');
const HIER = path.join(__dirname, '..');
(async () => {
  const [h, profil, n] = process.argv.slice(2);
  const { rendern } = await import(path.join(HIER, 'harness', 'render.mjs'));
  const e = await rendern(h, {});
  const b = await chromium.launch(); const erg = { heute: [], test: [] };
  for (let i = 0; i < Number(n || 5); i++) {
    for (const art of ['heute', 'test']) {
      const t = await seite(b, { html: path.join(HIER, 'html', 'live', h + '.html'), profil, einsatz: art === 'test' ? e : null });
      await t.page.waitForTimeout(4000);
      const g = await t.page.evaluate(GEOM);
      const gross = g.shifts.slice().sort((a, b2) => b2.v - a.v)[0] || null;
      erg[art].push({ cls: g.cls, kopf: g.clsKopf, gross: gross && { v: gross.v, t: gross.t, src: gross.src } });
      await t.ctx.close();
    }
  }
  await b.close();
  const med = (a) => { const s = a.map((x) => x.cls).sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  console.log(JSON.stringify(erg, null, 0));
  console.log(h, profil, 'CLS Median heute', med(erg.heute), 'test', med(erg.test), '| nur Kopf (test):', erg.test.map((x) => x.kopf));
})();
