// Ein Seitenaufruf /fr?view=lxstory: Kapitel, Karten-Links; danach im Seitenkontext /products/<handle>.js (available) der 6 Produkte.
const { chromium } = require('playwright');
const fs = require('fs');
const KAP = JSON.parse(fs.readFileSync(__dirname + '/../kapitel.json', 'utf8'));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', locale: 'fr-CH', extraHTTPHeaders: { 'Accept-Language': 'fr-CH,fr;q=0.9' } });
  const p = await ctx.newPage(); const fehler = []; p.on('pageerror', (e) => fehler.push(String(e).slice(0, 150)));
  const r = await p.goto('https://luxestyle.ch/fr?view=lxstory', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForTimeout(4000);
  const info = await p.evaluate(() => ({ worte: [...document.querySelectorAll('.lx-story__wort')].map((x) => x.textContent.trim()), zeilen: [...document.querySelectorAll('.lx-story__zeile')].map((x) => x.textContent.trim()), karten: [...document.querySelectorAll('.lx-story__karte')].map((a) => [a.getAttribute('href'), a.querySelector('.lx-story__karte-titel').textContent.trim(), (a.querySelector('.lx-story__karte-var') || {}).textContent || '']), cta: (document.querySelector('.lx-story__karte-cta') || {}).textContent }));
  console.log('fr HTTP', r.status(), JSON.stringify(info));
  const js = await p.evaluate(async (kap) => { const out = []; for (const k of kap) { const res = await fetch('/products/' + k.produkt + '.js', { headers: { Accept: 'application/json' } }); let j = null; try { j = await res.json(); } catch (e) {} const v = j && j.variants.find((x) => String(x.id) === k.variante); out.push({ h: k.produkt, status: res.status, produkt: j && j.available, variante: v ? v.available : null, titel: v && v.public_title }); await new Promise((r) => setTimeout(r, 400)); } return out; }, KAP);
  console.log('Storefront .js', new Date().toISOString(), JSON.stringify(js));
  console.log('Fehler', fehler.length);
  await b.close();
})();
