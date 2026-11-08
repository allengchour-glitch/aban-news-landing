// Editor v6.2.0: Vorschau «Auf dem Produkt» gegen echte Printful-Mockups (Hoodie, T-Shirt, iPhone-Hülle, Beutel), gleiche Zeichnung, gleiche Lage, 800 × 800.
// Kein Schreiben irgendwo ausser in diesen Ordner. Vorlagenbilder: nur GET von files.cdn.printful.com/m/…, einmal geholt und im Ordner cache/ abgelegt.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const REPO = '/home/user/aban-news-landing';
const lib = await import(pathToFileURL(join(REPO, 'pod/v6/test/lib.mjs')).href);
const { karteFuerEditor } = await import(pathToFileURL(join(REPO, 'pod/v6/werkzeug/karte_fuer_editor.mjs')).href);
const VB = await import(pathToFileURL(join(REPO, 'pod/v6/werkzeug/vorschau_daten_bauen.mjs')).href);
const KATALOG = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/sg/katalog/';
const HIER = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/sg/v62/pixel/';
const PHOTO = 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/59641_1_256ba8dc-9abe-45f1-b1c8-54c696fe7aed.jpg?v=1784844378';
mkdirSync(HIER + 'cache', { recursive: true }); mkdirSync(HIER + '' + (process.env.ERG || 'ergebnis2') + '', { recursive: true });
const { chromium } = lib.playwright();

const FAELLE = {
  s71t: { id: 71, pv: 4012, platz: 'front', mock: 's71t.jpg', spec: { aw: 1800, ah: 2400, w: 1000, h: 992, top: 300, left: 400 } },
  s71l: { id: 71, pv: 4012, platz: 'front', mock: 's71l.jpg', spec: { aw: 1800, ah: 2400, w: 1000, h: 992, top: 1200, left: 400 } },
  s586t: { id: 586, pv: 15125, platz: 'front', mock: 's586t.jpg', spec: { aw: 1800, ah: 2400, w: 1000, h: 992, top: 300, left: 400 } },
  s586l: { id: 586, pv: 15125, platz: 'front', mock: 's586l.jpg', spec: { aw: 1800, ah: 2400, w: 1000, h: 992, top: 1200, left: 400 } },
  s456t: { id: 456, pv: 11865, platz: 'front', mock: 's456t.jpg', spec: { aw: 1800, ah: 2400, w: 1000, h: 992, top: 300, left: 400 } },
  s456l: { id: 456, pv: 11865, platz: 'front', mock: 's456l.jpg', spec: { aw: 1800, ah: 2400, w: 1000, h: 992, top: 1200, left: 400 } },
};
// Echte Vorlage der iPhone-15-Hülle (GET /mockup-generator/templates, Antwort vom 05.11.2026, im Scratch config.json): im verdichteten Katalog trägt nur das Beispielmodell (iPhone 11 Max) Bildadressen.
const CASE_TPL = {
  overlay: 'https://files.cdn.printful.com/m/47-iphone-cases/medium/default/iphone_15/15/caseon/05_iphone15_caseon_overlay_whitebg.png?v=1792482300',
  base: 'https://files.cdn.printful.com/m/47-iphone-cases/medium/default/iphone_15/15/caseon/03_iphone15_caseon_base.png?v=1792482300',
};
const wahl = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FAELLE);

function daten(name) {
  const f = FAELLE[name];
  const katalog = JSON.parse(readFileSync(KATALOG + f.id + '.json', 'utf8'));
  const karte = karteFuerEditor(katalog, { panelErlauben: true });
  karte.shop = { varianten: { 1001: f.pv } };
  let eintrag = VB.vorschauModell(katalog).eintrag;
  let bilder = Object.keys(eintrag.bilder);
  if (f.inject) {
    // Hülle: die Geometrie von iPhone 15 bekommt die echten Bildadressen; Modell als «flach» geführt (nur für diese Messung, die Produktionsdaten haben das noch nicht)
    const p = karte.platzierungen.find((x) => x.id === f.platz);
    // Die Karte kennt bei einer Druckdatei-Gruppe keine Zuordnung Variante → Geometrie (geometrieFuer nimmt dann die Vorlage der Platzierung): die echte Vorlage von iPhone 15 wird dort eingesetzt
    p.vorlage = { vorlageId: 208745, bildUrl: CASE_TPL.overlay, hintergrundUrl: CASE_TPL.base, hintergrundFarbe: null, vorlageBreite: 3000, vorlageHoehe: 3000, flaecheLinks: 983, flaecheOben: 470, flaecheBreite: 1025, flaecheHoehe: 2168, ausrichtung: 'any', vorderansicht: true };
    eintrag = { adapter: 'flach', grund: null, titel: karte.titelEn, klasse: karte.klasse, bilder: { [CASE_TPL.overlay]: null, [CASE_TPL.base]: null }, tasse: {}, vorlagen: {} };
    bilder = Object.keys(eintrag.bilder);
  }
  if (process.env.KORR) { // Prüfung einer gemessenen Korrektur der Druckfläche (Vorlagenpixel): KORR='{"71":{"L":1007.8,"T":498.8,"W":1017.6,"H":1361}}'
    const k = JSON.parse(process.env.KORR)[String(f.id)];
    if (k) {
      const pl = karte.platzierungen.find((x) => x.id === f.platz);
      pl.vorlage.flaecheLinks = k.L; pl.vorlage.flaecheOben = k.T; pl.vorlage.flaecheBreite = k.W; pl.vorlage.flaecheHoehe = k.H;
      const ev = eintrag.vorlagen && eintrag.vorlagen[f.platz]; if (ev) { ev.fl = k.L; ev.fo = k.T; ev.fb = k.W; ev.fh = k.H; }
    }
  }
  return { f, karte, vorschau: { schema: 1, stand: '2026-11-06', modelle: { [f.id]: eintrag } }, bilder };
}
async function holen(url) {
  const datei = HIER + 'cache/' + createHash('sha1').update(url).digest('hex').slice(0, 16);
  if (!existsSync(datei)) { const r = await fetch(url); if (!r.ok) throw new Error(url + ' ' + r.status); writeFileSync(datei, Buffer.from(await r.arrayBuffer())); }
  return readFileSync(datei);
}

const aktuell = {};
const server = createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const senden = (typ, inhalt, code = 200) => { res.writeHead(code, { 'content-type': typ, 'cache-control': 'no-store' }); res.end(inhalt); };
  if (u.pathname === '/mock.html') return senden('text/html; charset=utf-8', readFileSync(join(REPO, 'pod/v6/test/mock.html')));
  if (u.pathname === '/lspod-designer-v6.js') return senden('text/javascript; charset=utf-8', readFileSync(lib.V6_DATEI));
  let m;
  if ((m = u.pathname.match(/^\/karten\/(\d+)\.json$/))) return senden('application/json', JSON.stringify(aktuell.karte));
  if ((m = u.pathname.match(/^\/vorschau\/(\d+)\.json$/))) return senden('application/json', JSON.stringify(aktuell.vorschau));
  if ((m = u.pathname.match(/^\/pf\/(\w+\.jpg)$/))) return senden('image/jpeg', readFileSync(HIER + m[1]));
  if (u.pathname === '/bild/vorne.svg' || u.pathname === '/bild/hinten.svg') return senden('image/svg+xml', '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
  senden('text/plain', 'nicht gefunden', 404);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const basis = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const alle = {};
for (const name of wahl) {
  const d = daten(name); aktuell.karte = d.karte; aktuell.vorschau = d.vorschau;
  const cache = new Map();
  for (const u of d.bilder) cache.set(u, await holen(u));
  const s = await lib.seiteOeffnen(browser, basis, {
    breite: 1200, hoehe: 900, query: `karte=${d.f.id}&vorschau=${d.f.id}&spiegel=0&varianten=1001:Test`,
    printfulBild: (u) => { const b = cache.get(u); return b ? { typ: /\.jpe?g/i.test(u.split('?')[0]) ? 'image/jpeg' : 'image/png', body: b } : null; },
    shopifyBild: (u) => (u.includes('59641_1_') ? { typ: 'image/jpeg', body: readFileSync(HIER + 'photo.jpg') } : null),
  });
  await lib.editorBereit(s.page);
  const mockBase64 = readFileSync(HIER + d.f.mock).toString('base64');
  const overlayBase64 = cache.size ? [...cache.entries()].map(([u, b]) => [u, b.toString('base64')]) : [];
  const erg = {};
  for (const overlay of ['normal', 'multiply']) {
    erg[overlay] = await s.page.evaluate(async (a) => {
      const ed = window.LSPOD6.editors[0];
      if (!ed.st.ebenen[a.platz].length) {
        const sp = a.spec; const e = ed.neuesBild(a.photo, 910, 903);
        e.cx = (sp.left + sp.w / 2) / sp.aw; e.cy = (sp.top + sp.h / 2) / sp.ah; e.scale = 2 * sp.w / sp.aw;
      }
      const p = ed.karte.platzierungen.find((x) => x.id === a.platz);
      const cv = document.createElement('canvas'); cv.width = 800; cv.height = 800;
      const r = await ed.vorschauZeichnen(cv, { p, overlay: a.overlay === 'multiply' ? 'multiply' : undefined });
      if (!r.ok) return { ok: false, grund: r.grund };
      const mock = await new Promise((ok, fe) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fe; im.src = 'data:image/jpeg;base64,' + a.mock; });
      const c2 = document.createElement('canvas'); c2.width = 800; c2.height = 800; const x2 = c2.getContext('2d'); x2.drawImage(mock, 0, 0, 800, 800);
      const A = cv.getContext('2d').getImageData(0, 0, 800, 800).data, B = x2.getImageData(0, 0, 800, 800).data;
      // Maske «im Produkt»: Alpha der Vorlage unter 250 (innen: Stoff, Schatten) in der Fassung von 800 px
      const ovUrl = a.ovs.find((o) => /overlay|whitebg/.test(o[0]) && !/bgImages|base\.png/.test(o[0]));
      let maske = null;
      if (ovUrl) {
        const ov = await new Promise((ok, fe) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fe; im.src = 'data:image/png;base64,' + ovUrl[1]; });
        const c3 = document.createElement('canvas'); c3.width = 800; c3.height = 800; const x3 = c3.getContext('2d'); x3.drawImage(ov, 0, 0, 800, 800);
        const O = x3.getImageData(0, 0, 800, 800).data; maske = new Uint8Array(640000); for (let i = 0; i < 640000; i++) maske[i] = O[i * 4 + 3] < 250 ? 1 : 0;
      }
      function mad(filter) {
        const s = [0, 0, 0]; let n = 0;
        for (let i = 0; i < 640000; i++) { if (filter && !filter(i)) continue; n++; for (let k = 0; k < 3; k++) s[k] += Math.abs(A[i * 4 + k] - B[i * 4 + k]); }
        return { n, r: s[0] / n, g: s[1] / n, b: s[2] / n, mittel: (s[0] + s[1] + s[2]) / (3 * n) };
      }
      function bbox(D, test) {
        let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, cnt = 0;
        for (let y = 0; y < 800; y++) for (let x = 0; x < 800; x++) { const i = (y * 800 + x) * 4; if (test(D[i], D[i + 1], D[i + 2])) { cnt++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
        return { x0, y0, x1, y1, cnt };
      }
      const sil = (r, g, b) => Math.min(r, g, b) < 240;
      const motiv = (r, g, b) => r - b > 60 && r > 120;   // das orange Plüschtier
      const sA = bbox(A, sil), sB = bbox(B, sil), mA = bbox(A, motiv), mB = bbox(B, motiv);
      const diff = (p, q) => ({ links: p.x0 - q.x0, oben: p.y0 - q.y0, rechts: p.x1 - q.x1, unten: p.y1 - q.y1 });
      const dS = diff(sA, sB), dM = diff(mA, mB);
      const mx = (o) => Math.max(...Object.values(o).map(Math.abs));
      // Motivfenster (Vereinigung der beiden Umrisse, 8 px Rand): Abweichung dort
      const fx0 = Math.max(0, Math.min(mA.x0, mB.x0) - 8), fy0 = Math.max(0, Math.min(mA.y0, mB.y0) - 8), fx1 = Math.min(799, Math.max(mA.x1, mB.x1) + 8), fy1 = Math.min(799, Math.max(mA.y1, mB.y1) + 8);
      const inMotiv = (i) => { const x = i % 800, y = (i / 800) | 0; return x >= fx0 && x <= fx1 && y >= fy0 && y <= fy1; };
      // Beste Ausrichtung des Motivfensters: Editor-Bild um (dx, dy) verschoben und um s vergrössert (um die Fenstermitte) gegen das Printful-Bild, kleinste mittlere Abweichung im Fenster
      function suche() {
        const w = fx1 - fx0 + 1, h = fy1 - fy0 + 1, cxm = (fx0 + fx1) / 2, cym = (fy0 + fy1) / 2;
        const src = document.createElement('canvas'); src.width = 800; src.height = 800; src.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(A), 800, 800), 0, 0);
        const t = document.createElement('canvas'); t.width = w; t.height = h; const tx = t.getContext('2d');
        function wert(dx, dy, sk) {
          tx.setTransform(1, 0, 0, 1, 0, 0); tx.fillStyle = '#fff'; tx.fillRect(0, 0, w, h);
          tx.setTransform(sk, 0, 0, sk, (cxm - fx0) + dx - cxm * sk + fx0 * 0 - (cxm - fx0) * 0, 0);
          tx.setTransform(sk, 0, 0, sk, -fx0 + cxm - cxm * sk + dx, -fy0 + cym - cym * sk + dy); tx.drawImage(src, 0, 0);
          const D = tx.getImageData(0, 0, w, h).data; let sum = 0;
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, j = ((fy0 + y) * 800 + fx0 + x) * 4; sum += Math.abs(D[i] - B[j]) + Math.abs(D[i + 1] - B[j + 1]) + Math.abs(D[i + 2] - B[j + 2]); }
          return sum / (3 * w * h);
        }
        const null0 = wert(0, 0, 1); let best = { dx: 0, dy: 0, s: 1, w: null0 };
        for (const sk of [0.97, 0.98, 0.99, 1, 1.01, 1.02, 1.03]) for (let dy = -8; dy <= 8; dy += 1) for (let dx = -8; dx <= 8; dx += 1) { const v = wert(dx, dy, sk); if (v < best.w) best = { dx, dy, s: sk, w: v }; }
        let nurShift = { dx: 0, dy: 0, w: null0 };
        for (let dy = -8; dy <= 8; dy += 1) for (let dx = -8; dx <= 8; dx += 1) { const v = wert(dx, dy, 1); if (v < nurShift.w) nurShift = { dx, dy, w: v }; }
        return { ohneVerschiebung: null0, nurVerschiebung: nurShift, mitMassstab: best, fenster: [fx0, fy0, fx1, fy1] };
      }
      const ausrichtung = suche();
      return {
        ok: true, ms: Math.round(r.ms * 10) / 10, stoff: r.stoff, ausrichtung,
        gesamt: mad(null), produkt: maske ? mad((i) => maske[i] === 1) : null, motivfenster: mad(inMotiv), ausserhalb: maske ? mad((i) => maske[i] === 0) : null,
        silhouette: { editor: sA, printful: sB, diff: dS, max: mx(dS) }, motiv: { editor: mA, printful: mB, diff: dM, max: mx(dM) },
        // ein Bild mit den drei Spalten Editor | Printful | Differenz (4-fach verstärkt) für die Sichtung
        sheet: (() => { const c = document.createElement('canvas'); c.width = 2400 / 2; c.height = 400; const x = c.getContext('2d'); x.drawImage(cv, 0, 0, 400, 400); x.drawImage(x2.canvas, 400, 0, 400, 400);
          const t = document.createElement('canvas'); t.width = 800; t.height = 800; const tx = t.getContext('2d'); const im = tx.createImageData(800, 800);
          for (let i = 0; i < 640000; i++) for (let k = 0; k < 3; k++) im.data[i * 4 + k] = 255 - Math.min(255, Math.abs(A[i * 4 + k] - B[i * 4 + k]) * 4); for (let i = 0; i < 640000; i++) im.data[i * 4 + 3] = 255; tx.putImageData(im, 0, 0);
          x.drawImage(t, 800, 0, 400, 400); return c.toDataURL('image/jpeg', 0.85); })(),
        editorPng: cv.toDataURL('image/png'),
      };
    }, { platz: d.f.platz, spec: d.f.spec, photo: PHOTO, mock: mockBase64, ovs: overlayBase64, overlay });
    if (erg[overlay].ok) {
      writeFileSync(HIER + `${process.env.ERG || 'ergebnis2'}/${name}_${overlay}_editor.png`, Buffer.from(erg[overlay].editorPng.split(',')[1], 'base64'));
      writeFileSync(HIER + `${process.env.ERG || 'ergebnis2'}/${name}_${overlay}_sheet.jpg`, Buffer.from(erg[overlay].sheet.split(',')[1], 'base64'));
      delete erg[overlay].editorPng; delete erg[overlay].sheet;
    }
  }
  erg.seitenfehler = s.fehler;
  alle[name] = erg;
  await s.schliessen();
  console.log(name, JSON.stringify({ normal: erg.normal.ok ? { gesamt: erg.normal.gesamt.mittel.toFixed(2), produkt: erg.normal.produkt && erg.normal.produkt.mittel.toFixed(2), rgb: [erg.normal.gesamt.r, erg.normal.gesamt.g, erg.normal.gesamt.b].map((v) => v.toFixed(2)), sil: erg.normal.silhouette.max, motiv: erg.normal.motiv.max } : erg.normal, multiply: erg.multiply.ok ? { gesamt: erg.multiply.gesamt.mittel.toFixed(2), produkt: erg.multiply.produkt && erg.multiply.produkt.mittel.toFixed(2) } : erg.multiply, fehler: s.fehler.length }));
}
writeFileSync(HIER + '' + (process.env.ERG || 'ergebnis2') + '/messung.json', JSON.stringify(alle, null, 1));
await browser.close(); server.close();
