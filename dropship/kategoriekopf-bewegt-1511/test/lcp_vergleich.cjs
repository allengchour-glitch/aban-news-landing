// LCP heute gegen Testkopf im Nachbau, gedrosselt (Desktop: 40 ms, 10 Mbit/s), abwechselnd, frischer Kontext je Lauf.
// Aufruf: node test/lcp_vergleich.cjs <handle> <N>
const path = require('path');
const { seite, chromium } = require('../nachbau.cjs');
const HIER = path.join(__dirname, '..');
(async () => {
  const [h, n] = process.argv.slice(2);
  const { rendern } = await import(path.join(HIER, 'harness', 'render.mjs'));
  const e = await rendern(h, {});
  const b = await chromium.launch(); const erg = { heute: [], test: [] };
  for (let i = 0; i < Number(n || 3); i++) for (const art of ['heute', 'test']) {
    const t = await seite(b, { html: path.join(HIER, 'html', 'live', h + '.html'), profil: 'd', einsatz: art === 'test' ? e : null,
      vorLaden: async (p) => { const c = await p.context().newCDPSession(p); await c.send('Network.enable'); await c.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 10e6 / 8, uploadThroughput: 5e6 / 8 }); } });
    await t.page.waitForTimeout(3000);
    const l = await t.page.evaluate(() => { const x = window.__lcp.slice(-1)[0]; return x ? { t: x.t, tag: x.tag, cls: x.cls, url: x.url.split('/').pop().slice(0, 40) } : null; });
    erg[art].push(l); await t.ctx.close();
  }
  await b.close();
  const med = (a) => { const s = a.map((x) => x.t).sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  console.log(JSON.stringify(erg));
  console.log(h, 'LCP Median heute', med(erg.heute), 'ms, test', med(erg.test), 'ms');
})();
