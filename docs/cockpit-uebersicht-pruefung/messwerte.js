// Messwerte (keine Prüfung mit Schwelle, sondern die gemessenen Zahlen): Breite/Scrollen, kleinste Tippfläche, schlechtester Kontrast, Konsole, reduzierte Bewegung.
//   node messwerte.js
let playwright; try { playwright = require('playwright'); } catch (e) { playwright = require('/opt/node-tools/node_modules/playwright'); }
const { chromium } = playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const HTML = process.env.COCKPIT_HTML || path.resolve(__dirname, '../../tools/trading/krypto_bot/cockpit.html');
const FX = path.join(__dirname, 'fx');
const FAELLE = ['voll', 'leer', 'echtgeld'];
const GROESSEN = [[360, 640, true], [390, 844, true], [412, 915, true], [768, 1024, false], [1440, 900, false]];

const messen = () => {
  const rgbaVon = s => { let m = s.match(/rgba?\(([^)]+)\)/); if (m) { const t = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: t[0], g: t[1], b: t[2], a: t.length > 3 ? t[3] : 1 }; }
    m = s.match(/color\(srgb ([^)]+)\)/); if (m) { const t = m[1].split(/[ \/]+/).filter(Boolean).map(Number); return { r: t[0] * 255, g: t[1] * 255, b: t[2] * 255, a: t.length > 3 ? t[3] : 1 }; } return { r: 0, g: 0, b: 0, a: 0 }; };
  const misch = (v, h) => ({ r: v.r * v.a + h.r * (1 - v.a), g: v.g * v.a + h.g * (1 - v.a), b: v.b * v.a + h.b * (1 - v.a), a: 1 });
  const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const grund = el => { const e = []; for (let x = el; x; x = x.parentElement) { const c = rgbaVon(getComputedStyle(x).backgroundColor); if (c.a > 0) e.push(c); if (c.a >= 1) break; }
    let h = { r: 255, g: 255, b: 255, a: 1 }; if (!e.length || e[e.length - 1].a < 1) h = rgbaVon(getComputedStyle(document.body).backgroundColor); for (let i = e.length - 1; i >= 0; i--) h = misch(e[i], h); return h; };
  const normal = [], gross = [], gesehen = new Set();
  document.querySelectorAll('.band, .status-zeile, #uebersicht, #ampelListe:not([hidden]), #sprung').forEach(b => [b, ...b.querySelectorAll('*')].forEach(el => {
    if (gesehen.has(el) || el.closest('.nur-leser') || el.closest('defs')) return;
    const eigen = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
    if (!eigen) return;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    gesehen.add(el);
    const cs = getComputedStyle(el), svgText = el instanceof SVGElement;
    const bg = grund(svgText ? el.closest('svg').parentElement : el), fgm = misch(rgbaVon(svgText ? cs.fill : cs.color), bg);
    const a = lum(fgm), b2 = lum(bg), v = (Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05);
    const px = parseFloat(cs.fontSize), fett = parseInt(cs.fontWeight, 10) >= 700, g = px >= 24 || (px >= 18.66 && fett);
    (g ? gross : normal).push({ v: +v.toFixed(2), t: eigen.slice(0, 30), px });
  }));
  normal.sort((x, y) => x.v - y.v); gross.sort((x, y) => x.v - y.v);
  const ziele = [...document.querySelectorAll('.band button, .band a[href], .status-zeile button, #uebersicht button, #uebersicht a[href], #uebersicht summary, #ampelListe summary, #sprung a')]
    .filter(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && !e.closest('[hidden]'); })
    .map(e => { const r = e.getBoundingClientRect(); return { n: (e.id || e.className || e.tagName).toString().slice(0, 28), b: Math.round(r.width), h: Math.round(r.height) }; })
    .sort((x, y) => Math.min(x.b, x.h) - Math.min(y.b, y.h));
  return { iw: innerWidth, sw: document.documentElement.scrollWidth, kontrastMin: normal[0] || null, kontrastGrossMin: gross[0] || null, nNormal: normal.length, nGross: gross.length, kleinsteZiele: ziele.slice(0, 2), nZiele: ziele.length };
};

(async () => {
  const server = http.createServer((q, a) => { a.setHeader('Content-Type', 'text/html; charset=utf-8'); a.end(fs.readFileSync(HTML)); }).listen(0);
  const BASIS = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch();
  const zeilen = [];
  for (const thema of ['dunkel', 'hell']) for (const fall of FAELLE) for (const [w, h, handy] of GROESSEN) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: handy, hasTouch: handy, colorScheme: thema === 'hell' ? 'light' : 'dark', locale: 'de-CH', timezoneId: 'Europe/Zurich' });
    const page = await ctx.newPage(), fehler = [];
    page.on('pageerror', e => fehler.push('PAGEERROR ' + e.message)); page.on('console', m => { if (['error', 'warning'].includes(m.type())) fehler.push(m.type() + ' ' + m.text()); });
    await page.route('**/api/**', r => { const n = new URL(r.request().url()).pathname.split('/').pop(); r.fulfill({ contentType: 'application/json', body: fs.readFileSync(path.join(FX, fall, n + '.json')) }); });
    await page.goto(BASIS); await page.waitForSelector('#uebersicht .ukarte'); await page.waitForTimeout(500);
    await page.click('#ampel', { force: true }).catch(() => {}); await page.waitForTimeout(150);
    const m = await page.evaluate(messen);
    zeilen.push({ thema, fall, w, h, scroll: `${m.sw}/${m.iw}`, ueberstand: m.sw > m.iw, konsole: fehler.length, kontrast: m.kontrastMin && `${m.kontrastMin.v} («${m.kontrastMin.t}», ${m.kontrastMin.px}px)`, kontrastGross: m.kontrastGrossMin && m.kontrastGrossMin.v, ziele: m.nZiele, kleinsteZiele: m.kleinsteZiele.map(z => `${z.n} ${z.b}×${z.h}`).join('; ') });
    await ctx.close();
  }
  // reduzierte Bewegung
  const rctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', isMobile: true, hasTouch: true });
  const rp = await rctx.newPage();
  await rp.route('**/api/**', r => { const n = new URL(r.request().url()).pathname.split('/').pop(); r.fulfill({ contentType: 'application/json', body: fs.readFileSync(path.join(FX, 'voll', n + '.json')) }); });
  await rp.goto(BASIS); await rp.waitForSelector('#uebersicht .ukarte');
  const bewegung = await rp.evaluate(() => ({ scroll: getComputedStyle(document.documentElement).scrollBehavior, bahn: getComputedStyle(document.querySelector('.schalter-klein .bahn')).transitionDuration, ampel: getComputedStyle(document.querySelector('.ampel')).transitionDuration }));
  await rctx.close();
  await browser.close(); server.close();
  const worst = k => zeilen.filter(z => k(z)).length;
  console.log('Messungen:', zeilen.length, '(2 Designs × 3 Fälle × 5 Breiten)');
  console.log('seitliches Scrollen (scrollWidth > innerWidth):', worst(z => z.ueberstand), 'von', zeilen.length);
  console.log('Konsolenfehler gesamt:', zeilen.reduce((s, z) => s + z.konsole, 0));
  for (const thema of ['dunkel', 'hell']) {
    const t = zeilen.filter(z => z.thema === thema);
    const k = t.slice().sort((a, b) => parseFloat(a.kontrast) - parseFloat(b.kontrast))[0];
    console.log(`Kontrast ${thema}: schlechtester normaler Text ${k.kontrast} bei ${k.w}×${k.h} (${k.fall}); schlechtester grosser Text ${Math.min(...t.map(z => z.kontrastGross))}`);
  }
  const handyZeilen = zeilen.filter(z => z.w < 700);
  console.log('Tippflächen am Handy (kleinste Seite je Element, kleinste je Messung):', [...new Set(handyZeilen.map(z => z.kleinsteZiele))].slice(0, 4).join(' | '));
  const desk = zeilen.filter(z => z.w >= 700);
  console.log('Tippflächen Tablet/Desktop:', [...new Set(desk.map(z => z.kleinsteZiele))].slice(0, 4).join(' | '));
  console.log('reduzierte Bewegung:', JSON.stringify(bewegung));
  fs.writeFileSync(path.join(__dirname, 'messwerte.json'), JSON.stringify(zeilen, null, 1));
})().catch(e => { console.error('ABSTURZ', e); process.exit(2); });
