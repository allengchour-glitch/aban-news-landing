// Nur lesend: Browser-Äquivalenz der Stufe 2. Dieselbe gespeicherte Seite wird (A) unverändert, (A2) noch einmal unverändert (Messrauschen),
// (B) mit verdichtetem Filter- und Kartenbereich ausgeliefert (page.route auf die Live-Adresse, Assets live). Verglichen werden je Breite:
// Elementzahl, Rechtecke ALLER Elemente im Ergebnisbereich, innerText, FormData der Filter-Formulare, Seitenhöhe, geöffneter Filter-Dialog, aufgeklappte Filter, Pixel.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const S = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/seo/';
const KETTE = [32, 32, 8, 4, 2, 2];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const sp = (n) => ' '.repeat(n);
const verdichten = (t) => { let x = t.split('\n').join(' '); for (const n of KETTE) x = x.split(sp(n)).join(' '); return x; };
function regionen(h) {
  const a = h.indexOf('class="collection-wrapper'); const fStart = h.indexOf('>', a) + 1;
  const dEnd = h.indexOf('</dialog-component>', h.indexOf('<dialog-component id="filters-drawer"')) + '</dialog-component>'.length;
  const u = h.search(/<ul[^>]*product-grid/); const m = /<li\s+id="[^"]*"\s+class="product-grid__item/.exec(h.slice(u)); const kStart = u + m.index;
  const next = h.indexOf('<span ref="viewMoreNext"'); const kEnd = h.lastIndexOf('</li>', next) + 5;
  return { fStart, fEnd: dEnd, kStart, kEnd };
}
function variante(h) { const r = regionen(h); return h.slice(0, r.fStart) + verdichten(h.slice(r.fStart, r.fEnd)) + h.slice(r.fEnd, r.kStart) + verdichten(h.slice(r.kStart, r.kEnd)) + h.slice(r.kEnd); }

const MESSEN = () => {
  const R = document.querySelector('results-list');
  const els = [...R.querySelectorAll('*')];
  const rects = els.map((e) => { const r = e.getBoundingClientRect(); return [e.tagName, Math.round(r.x * 100) / 100, Math.round((r.y + window.scrollY) * 100) / 100, Math.round(r.width * 100) / 100, Math.round(r.height * 100) / 100]; });
  const forms = [...R.querySelectorAll('form')].map((f) => [...new FormData(f).entries()].map(([k, v]) => k + '=' + v));
  const imgs = [...R.querySelectorAll('img')].map((i) => (i.getAttribute('src') || '') + '|' + (i.getAttribute('srcset') || '').length);
  return { n: els.length, rects, text: R.innerText, forms, imgs, docH: document.documentElement.scrollHeight };
};

async function laden(browser, seite, breite, html) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 900 }, userAgent: UA, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); const ziel = `https://luxestyle.ch/collections/${seite}`;
  await page.route('**/*', (route) => { const rq = route.request(); if (rq.resourceType() === 'document' && rq.url().split('?')[0] === ziel) route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }); else route.continue(); });
  const fehler = []; page.on('pageerror', (e) => fehler.push(String(e).slice(0, 100)));
  await page.goto(ziel, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} html{scroll-behavior:auto!important}' });
  await page.evaluate(() => { for (const b of document.querySelectorAll('button')) if (/alle akzeptieren|akzeptieren|accept all/i.test(b.textContent || '')) { b.click(); break; } });
  await page.waitForTimeout(700);
  return { ctx, page, fehler };
}

async function zustaende(browser, seite, breite, html) {
  const { ctx, page, fehler } = await laden(browser, seite, breite, html); const aus = {};
  aus.basis = await page.evaluate(MESSEN);
  const shots = [];
  const gridTop = await page.evaluate(() => Math.round(document.querySelector('.product-grid').getBoundingClientRect().top + scrollY));
  for (const y of [0, Math.max(0, gridTop - 200), gridTop + 1100]) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(500); shots.push((await page.screenshot()).toString('base64')); }
  await page.evaluate(() => window.scrollTo(0, 0));
  // aufgeklappte Filter (Desktop) bzw. alle details
  await page.evaluate(() => { for (const d of document.querySelectorAll('results-list details')) d.open = true; });
  await page.waitForTimeout(400); aus.aufgeklappt = await page.evaluate(MESSEN);
  await page.evaluate(() => { for (const d of document.querySelectorAll('results-list details')) d.open = false; });
  // Filter-Dialog (mobil) aufmachen
  const hat = await page.evaluate(() => { const d = document.querySelector('#filters-drawer dialog'); if (!d) return false; d.showModal(); return true; });
  await page.waitForTimeout(600);
  if (hat) { aus.dialog = await page.evaluate(MESSEN); shots.push((await page.screenshot()).toString('base64')); }
  // Hover über der ersten Karte
  await page.evaluate(() => { const d = document.querySelector('#filters-drawer dialog'); if (d && d.open) d.close(); window.scrollTo(0, 0); });
  aus.fehler = fehler; aus.shots = shots;
  await ctx.close(); return aus;
}

async function pixelDiff(browser, a64, b64) {
  const p = await browser.newPage();
  const r = await p.evaluate(async ([x, y]) => {
    const laden = (b) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b; });
    const [ia, ib] = await Promise.all([laden(x), laden(y)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { grösse: false };
    const cv = (i) => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
    const da = cv(ia), db = cv(ib); let n = 0; for (let k = 0; k < da.length; k += 4) if (da[k] !== db[k] || da[k + 1] !== db[k + 1] || da[k + 2] !== db[k + 2]) n++;
    return { grösse: true, pixel: da.length / 4, abweichend: n };
  }, [a64, b64]);
  await p.close(); return r;
}

function vergleiche(x, y) {
  const o = {}; let rd = 0, maxd = 0;
  const n = Math.min(x.rects.length, y.rects.length);
  for (let i = 0; i < n; i++) { const a = x.rects[i], b = y.rects[i]; const d = a[0] !== b[0] ? 999 : Math.max(Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]), Math.abs(a[3] - b[3]), Math.abs(a[4] - b[4])); if (d > 0.01) rd++; if (d > maxd) maxd = d; }
  return { elemente: [x.n, y.n], rechteckeAbweichend: rd, maxDelta: maxd, textGleich: x.text === y.text, textLänge: [x.text.length, y.text.length], formDatenGleich: JSON.stringify(x.forms) === JSON.stringify(y.forms), bilderGleich: JSON.stringify(x.imgs) === JSON.stringify(y.imgs), seitenhöhe: [x.docH, y.docH] };
}

(async () => {
  const seiten = (process.argv[2] || 'uhren').split(','); const breiten = (process.argv[3] || '1440').split(',').map(Number);
  const browser = await chromium.launch(); const ergebnis = [];
  for (const seite of seiten) for (const breite of breiten) {
    const h = fs.readFileSync(S + 'pages/' + { 'uhren': 'uhren', 'spielzeug': 'spielzeug', 'kissen': 'kissen', 'damen-schuhe': 'damen-schuhe' }[seite] + '.html', 'utf8');
    const hb = variante(h);
    const A = await zustaende(browser, seite, breite, h); const A2 = await zustaende(browser, seite, breite, h); const B = await zustaende(browser, seite, breite, hb);
    const z = {};
    for (const k of ['basis', 'aufgeklappt', 'dialog']) { if (!A[k]) continue; z[k] = { kontrolle_A_gegen_A2: vergleiche(A[k], A2[k]), A_gegen_B: vergleiche(A[k], B[k]) }; }
    const px = [];
    for (let i = 0; i < A.shots.length; i++) px.push({ nr: i, kontrolle: await pixelDiff(browser, A.shots[i], A2.shots[i]), AgegenB: await pixelDiff(browser, A.shots[i], B.shots[i]) });
    const e = { seite, breite, bytes: [h.length, hb.length], zustände: z, pixel: px, fehler: { A: A.fehler, A2: A2.fehler, B: B.fehler } };
    ergebnis.push(e); console.log(JSON.stringify(e));
    fs.writeFileSync(S + 'stufe2/ergebnis_' + seite + '_' + breite + '.json', JSON.stringify(e, null, 1));
  }
  await browser.close();
})().catch((e) => { console.error('FEHLER', e); process.exit(1); });
