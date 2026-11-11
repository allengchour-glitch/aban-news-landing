// banner_v2_vorschau.cjs — lokale Vorschau der echten Kategorieseiten mit den Vorschlägen eines kategorie_banner_v2-Plans.
// Nur lesend: je Sammlung EIN Seitenabruf (Browser-Kopf, 7 s Pause, höchstens 12), danach alles aus dem Speicher wiedergegeben
// (route.fulfill). Theme-Dateien und Bilder kommen vom freien CDN (cdn.shopify.com), nicht von luxestyle.ch.
// Varianten je Seite und Gerät: heute (unverändert) · neu (Kopf-Fotos aus luxe.kopf_produkte des Plans) · kompakt (neu + Plan Rang 1
// als CSS-Nachbildung: Handy ohne Fotostreifen, Titel + 1 Zeile; Desktop höchstens 300 px, Text 2 Zeilen).
// Aufruf: node banner_v2_vorschau.cjs <plan.json> [ausgabeordner]
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const PLAN = process.argv[2]; if (!PLAN) { console.error('plan.json angeben'); process.exit(1); }
const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
const OUT = process.argv[3] || path.join(path.dirname(PLAN), 'vorschau'); fs.mkdirSync(path.join(OUT, 'html'), { recursive: true });
const MAX_SEITEN = 12, PAUSE = 7000, CDN = 'https://cdn.shopify.com/s/files/1/0943/6856/3585';
const UA_M = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const UA_D = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const schlaf = ms => new Promise(r => setTimeout(r, ms));
let seitenAbrufe = 0; const fehlend = new Set(); const cache = new Map();

function abbilden(u) {   // luxestyle.ch/cdn/... → freies CDN
  const m = u.match(/^https?:\/\/(?:www\.)?luxestyle\.ch\/cdn\/(.*)$/); if (!m) return null;
  const rest = m[1];
  if (rest.startsWith('shop/')) return CDN + '/' + rest.slice(5);          // shop/t/26/assets/x, shop/files/x, shop/products/x
  if (rest.startsWith('shopifycloud/')) return 'https://cdn.shopify.com/' + rest;
  return null;
}
async function cdnHolen(u) {
  if (cache.has(u)) return cache.get(u);
  const r = await fetch(u, { headers: { 'User-Agent': UA_D, Accept: '*/*' } }).catch(() => null);
  const v = r && r.ok ? { status: 200, ct: r.headers.get('content-type') || 'application/octet-stream', body: Buffer.from(await r.arrayBuffer()) } : null;
  cache.set(u, v); return v;
}
async function seiteHolen(handle) {
  const f = path.join(OUT, 'html', handle + '.html');
  if (fs.existsSync(f) && Date.now() - fs.statSync(f).mtimeMs < 6 * 3600e3) return fs.readFileSync(f, 'utf8');
  if (seitenAbrufe >= MAX_SEITEN) throw new Error('Seitenbudget erschöpft');
  if (seitenAbrufe) await schlaf(PAUSE);
  seitenAbrufe++;
  const r = await fetch('https://luxestyle.ch/collections/' + encodeURIComponent(handle), { headers: { 'User-Agent': UA_D, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'de-CH,de;q=0.9' } });
  if (r.status !== 200) throw new Error('HTTP ' + r.status);
  const html = await r.text(); if (!html.includes('lx-hero')) throw new Error('kein lx-hero im HTML (Sperrseite?)');
  fs.writeFileSync(f, html); return html;
}
function kopfErsetzen(html, kopf) {
  if (!kopf || kopf.produkte.length < 4) return html;
  const a = html.indexOf('class="lx-hero__bilder"'); if (a < 0) return html;
  const s = html.indexOf('>', a) + 1, e = html.indexOf('</div>', s);
  const imgs = kopf.produkte.map((p, i) => `<img src="${p.bild}${p.bild.includes('?') ? '&' : '?'}width=640" alt="" loading="${i < 2 ? 'eager' : 'lazy'}" width="640" height="640">`).join('');
  return html.slice(0, s) + imgs + html.slice(e);
}
const KOMPAKT = `@media(max-width:749px){html body .lx-hero__bilder{display:none!important}html body .lx-hero{min-height:0!important;background:transparent!important;color:inherit!important}html body .lx-hero::before{display:none!important}html body .lx-hero__text{padding:6px 16px 4px!important}html body .lx-hero h1{font-size:24px!important;line-height:1.15!important;margin:0 0 2px!important;color:#1f1a12!important;text-shadow:none!important}html body .lx-hero__beschr,html body .lx-hero__beschr p{font-size:14px!important;line-height:1.35!important;margin:0!important;color:#3a3226!important;text-shadow:none!important}html body .lx-hero__beschr{display:-webkit-box!important;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden!important}html body .lx-hero__beschr>*:not(:first-child){display:none!important}}
@media(min-width:750px){html body .lx-hero{min-height:230px!important;max-height:300px!important}html body .lx-hero__beschr{display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden!important}html body .lx-hero__beschr>*:not(:first-child){display:none!important}}`;
function kompakt(html) { const i = html.indexOf('</head>'); return html.slice(0, i) + `<style id="sim-kompakt">${KOMPAKT}</style>` + html.slice(i); }
const MESS = () => {
  const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top + scrollY), h: Math.round(b.height) }; };
  const hero = document.querySelector('.lx-hero');
  const karte = document.querySelector('results-list li.product-grid__item') || document.querySelector('main a[href*="/products/"]');
  const img = karte && karte.querySelector('img');
  const bilder = hero ? [...hero.querySelectorAll('.lx-hero__bilder img')].filter(i => getComputedStyle(i).display !== 'none' && getComputedStyle(i.parentElement).display !== 'none').map(i => (i.currentSrc || i.src).split('/').pop().split('?')[0]) : [];
  return { fenster: innerWidth + 'x' + innerHeight, hero: r(hero), ersteKarte: r(karte), karteBild: r(img), bilder, seite: document.documentElement.scrollHeight };
};
async function render(browser, handle, html, mobil, name) {
  const ctx = await browser.newContext({ viewport: mobil ? { width: 390, height: 844 } : { width: 1440, height: 900 }, userAgent: mobil ? UA_M : UA_D, isMobile: mobil, hasTouch: mobil, deviceScaleFactor: 1, locale: 'de-CH' });
  await ctx.route('**/*', async route => {
    const q = route.request(); const u = q.url();
    if (q.resourceType() === 'document' && /luxestyle\.ch\/collections\//.test(u)) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    const ziel = abbilden(u);
    if (ziel) { const v = await cdnHolen(ziel); if (v) return route.fulfill({ status: 200, contentType: v.ct, body: v.body }); if (/\.css/.test(u)) fehlend.add(u.split('?')[0]); return route.abort(); }
    if (/^https:\/\/(cdn\.shopify\.com|fonts\.shopifycdn\.com)\//.test(u) && !/web-pixels|trekkie|monorail|shop-js|extensions\//.test(u)) {
      const v = await cdnHolen(u); if (v) return route.fulfill({ status: 200, contentType: v.ct, body: v.body }); return route.abort();
    }
    return route.abort();   // luxestyle.ch-Seiten, Analytik, Dritte: nie abrufen
  });
  const page = await ctx.newPage();
  await page.goto('https://luxestyle.ch/collections/' + handle, { waitUntil: 'load', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const m = await page.evaluate(MESS);
  const datei = path.join(OUT, `${handle}_${mobil ? 'handy' : 'desktop'}_${name}.png`);
  await page.screenshot({ path: datei, clip: { x: 0, y: 0, width: mobil ? 390 : 1440, height: Math.min(m.seite, mobil ? 1300 : 1100) } });
  await ctx.close();
  return { ...m, datei };
}
(async () => {
  const browser = await chromium.launch();
  const erg = [];
  for (const e of plan.eintraege) {
    let html; try { html = await seiteHolen(e.handle); } catch (x) { erg.push({ handle: e.handle, fehler: x.message }); console.log(e.handle, 'FEHLER', x.message); continue; }
    const varianten = { heute: html, neu: kopfErsetzen(html, e.kopf), kompakt: kompakt(kopfErsetzen(html, e.kopf)) };
    const r = { handle: e.handle, kopfNeu: !!(e.kopf && e.kopf.produkte.length >= 4) };
    for (const mobil of [false, true]) for (const [name, h] of Object.entries(varianten)) r[`${mobil ? 'handy' : 'desktop'}_${name}`] = await render(browser, e.handle, h, mobil, name);
    erg.push(r);
    const unten = x => x.karteBild ? x.karteBild.top + x.karteBild.h : null;
    for (const k of Object.keys(r)) if (r[k] && r[k].karteBild) { r[k].bildUnten = unten(r[k]); r[k].bildGanzBei844 = r[k].bildUnten <= 844; r[k].bildGanzBei664 = r[k].bildUnten <= 664; r[k].bildSichtbarBei664 = Math.max(0, 664 - r[k].karteBild.top); }
    console.log(e.handle, ['desktop', 'handy'].map(g => `${g}: Karte heute ${r[g + '_heute'].ersteKarte?.top} → neu ${r[g + '_neu'].ersteKarte?.top} → kompakt ${r[g + '_kompakt'].ersteKarte?.top} (Kopf ${r[g + '_heute'].hero?.h}/${r[g + '_kompakt'].hero?.h})`).join(' · ')
      + ` · Handy 1. Kartenbild unten: heute ${r.handy_heute.bildUnten}, kompakt ${r.handy_kompakt.bildUnten} (bei 664 sichtbar: ${r.handy_heute.bildSichtbarBei664} → ${r.handy_kompakt.bildSichtbarBei664} px)`);
  }
  // Vergleichsbogen je Sammlung
  const seite = await browser.newPage({ viewport: { width: 1700, height: 900 } });
  for (const r of erg.filter(x => !x.fehler)) {
    const bild = k => `<figure><img src="file://${r[k].datei}"><figcaption>${k} · Kopf ${r[k].hero?.h} px · 1. Karte ${r[k].ersteKarte?.top} px · Kopf-Fotos: ${r[k].bilder.length}</figcaption></figure>`;
    const h = `<!doctype html><meta charset="utf-8"><style>body{font:13px system-ui;margin:10px;background:#fff}figure{display:inline-block;vertical-align:top;margin:0 8px 8px 0}img{border:1px solid #999;display:block}.d img{width:540px}.m img{width:300px}h2{margin:4px 0}</style>
      <h2>${r.handle}${r.kopfNeu ? '' : ' (Kopf unverändert: weniger als 4 geprüfte Fotos)'}</h2>
      <div class="m">${bild('handy_heute')}${bild('handy_neu')}${bild('handy_kompakt')}</div><div class="d">${bild('desktop_heute')}${bild('desktop_neu')}${bild('desktop_kompakt')}</div>`;
    const f = path.join(OUT, `vergleich_${r.handle}.html`); fs.writeFileSync(f, h);
    await seite.goto('file://' + f, { waitUntil: 'load' }); await seite.screenshot({ path: f.replace(/\.html$/, '.jpg'), fullPage: true, type: 'jpeg', quality: 78 });
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'messung.json'), JSON.stringify({ zeit: new Date().toISOString(), seitenAbrufe, fehlendeCss: [...fehlend], erg }, null, 1));
  console.log(`Seitenabrufe luxestyle.ch: ${seitenAbrufe} · fehlende CSS: ${fehlend.size} · ${OUT}`);
})();
