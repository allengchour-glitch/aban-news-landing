// Feinmessung (Teilpixel) der Lage des Motivs: Editor-Vorschau (PNG aus vergleich2.mjs) gegen das Printful-Mockup (JPG), 800 x 800.
// Suche: Verschiebung (dx, dy) und Massstab s um die Fenstermitte, Schritt 0,125 px bzw. 0,0025; Mass = mittlere absolute Abweichung im Motivfenster (3 Kanäle).
// Nutzung: ERG=ergebnis2 node fein.mjs <fall> [...]   (Fall = Dateiname ohne Endung, z. B. s586t)  -> fein_<ERG>.json
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const REPO = '/home/user/aban-news-landing';
const HIER = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/sg/v62/pixel/';
const ERG = process.env.ERG || 'ergebnis2';
const lib = await import(pathToFileURL(join(REPO, 'pod/v6/test/lib.mjs')).href);
const { chromium } = lib.playwright();
const faelle = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');
const alle = {};
for (const name of faelle) {
  const a64 = readFileSync(HIER + `${ERG}/${name}_normal_editor.png`).toString('base64');
  const b64 = readFileSync(HIER + `${name}.jpg`).toString('base64');
  const erg = await page.evaluate(async ({ a64, b64 }) => {
    const laden = (src) => new Promise((ok, fe) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fe; im.src = src; });
    const ia = await laden('data:image/png;base64,' + a64), ib = await laden('data:image/jpeg;base64,' + b64);
    const grab = (im) => { const c = document.createElement('canvas'); c.width = 800; c.height = 800; const x = c.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#fff'; x.fillRect(0, 0, 800, 800); x.drawImage(im, 0, 0, 800, 800); return { c, x, d: x.getImageData(0, 0, 800, 800).data }; };
    const A = grab(ia), B = grab(ib);
    const motiv = (r, g, b) => r - b > 60 && r > 120;
    const bbox = (D) => { let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let y = 0; y < 800; y++) for (let x = 0; x < 800; x++) { const i = (y * 800 + x) * 4; if (motiv(D[i], D[i + 1], D[i + 2])) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } } return { x0, y0, x1, y1 }; };
    const mA = bbox(A.d), mB = bbox(B.d);
    const fx0 = Math.max(0, Math.min(mA.x0, mB.x0) - 8), fy0 = Math.max(0, Math.min(mA.y0, mB.y0) - 8), fx1 = Math.min(799, Math.max(mA.x1, mB.x1) + 8), fy1 = Math.min(799, Math.max(mA.y1, mB.y1) + 8);
    const w = fx1 - fx0 + 1, h = fy1 - fy0 + 1, cxm = (fx0 + fx1) / 2, cym = (fy0 + fy1) / 2;
    const t = document.createElement('canvas'); t.width = w; t.height = h; const tx = t.getContext('2d', { willReadFrequently: true });
    const ref = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const j = ((fy0 + y) * 800 + fx0 + x) * 4, i = (y * w + x) * 4; ref[i] = B.d[j]; ref[i + 1] = B.d[j + 1]; ref[i + 2] = B.d[j + 2]; }
    function wert(dx, dy, sk) {
      tx.setTransform(1, 0, 0, 1, 0, 0); tx.fillStyle = '#fff'; tx.fillRect(0, 0, w, h);
      tx.setTransform(sk, 0, 0, sk, -fx0 + cxm - cxm * sk + dx, -fy0 + cym - cym * sk + dy); tx.drawImage(A.c, 0, 0);
      const D = tx.getImageData(0, 0, w, h).data; let sum = 0;
      for (let i = 0; i < w * h * 4; i += 4) sum += Math.abs(D[i] - ref[i]) + Math.abs(D[i + 1] - ref[i + 1]) + Math.abs(D[i + 2] - ref[i + 2]);
      return sum / (3 * w * h);
    }
    const null0 = wert(0, 0, 1);
    // 1. grob: nur Verschiebung, Schritt 0,5 px
    let g = { dx: 0, dy: 0, w: null0 };
    for (let dy = -10; dy <= 10; dy += 0.5) for (let dx = -10; dx <= 10; dx += 0.5) { const v = wert(dx, dy, 1); if (v < g.w) g = { dx, dy, w: v }; }
    // 2. fein: nur Verschiebung, Schritt 0,125 px
    let f1 = { ...g };
    for (let dy = g.dy - 0.5; dy <= g.dy + 0.5001; dy += 0.125) for (let dx = g.dx - 0.5; dx <= g.dx + 0.5001; dx += 0.125) { const v = wert(dx, dy, 1); if (v < f1.w) f1 = { dx, dy, w: v }; }
    // 3. mit Massstab: für jeden Massstab fein um das bisherige Optimum
    let f2 = { ...f1, s: 1 };
    for (let k = -8; k <= 10; k++) { const sk = 1 + k * 0.0025; let loc = { dx: f1.dx, dy: f1.dy, w: 1e9 };
      for (let dy = f1.dy - 1.5; dy <= f1.dy + 1.5001; dy += 0.125) for (let dx = f1.dx - 1.5; dx <= f1.dx + 1.5001; dx += 0.125) { const v = wert(dx, dy, sk); if (v < loc.w) loc = { dx, dy, w: v }; }
      if (loc.w < f2.w) f2 = { ...loc, s: sk }; }
    return { fenster: [fx0, fy0, fx1, fy1], mitte: [cxm, cym], ohne: null0, nurVerschiebung: f1, mitMassstab: f2, motivA: mA, motivB: mB };
  }, { a64, b64 });
  alle[name] = erg;
  console.log(name, 'nurV dx=' + erg.nurVerschiebung.dx.toFixed(3) + ' dy=' + erg.nurVerschiebung.dy.toFixed(3) + ' (' + erg.nurVerschiebung.w.toFixed(2) + ' statt ' + erg.ohne.toFixed(2) + ') | mitS dx=' + erg.mitMassstab.dx.toFixed(3) + ' dy=' + erg.mitMassstab.dy.toFixed(3) + ' s=' + erg.mitMassstab.s.toFixed(4) + ' (' + erg.mitMassstab.w.toFixed(2) + ') | Mitte y=' + erg.mitte[1]);
}
writeFileSync(HIER + `fein_${ERG}.json`, JSON.stringify(alle, null, 1));
await browser.close();
