/**
 * Gemeinsame Hilfen der Browser-Tests für den Editor v6: lokaler Server, Netzattrappen (Cloudinary, Printful-CDN, Sticker),
 * PNG-Erzeugung und -Lesen. Kein Netz nach aussen ausser dem optionalen Bildcache (siehe vorlagenBild).
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bauen as vorschauBauen, vorschauDatei } from '../werkzeug/vorschau_daten_bauen.mjs';

export const hier = dirname(fileURLToPath(import.meta.url));
export const v6Ordner = join(hier, '..');
export const repo = join(hier, '..', '..', '..');
const require = createRequire(import.meta.url);

/** Playwright laden: lokal, sonst die globale Installation dieser Umgebung. */
export function playwright() {
  for (const wo of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { return require(wo); } catch { /* nächster */ } }
  throw new Error('Playwright nicht gefunden');
}

/** Die geprüfte Fassung des Editors: 6.4.0. Die Vorgänger (6.3.1, 6.2.0 und die Rücknahme 6.1.0 = lspod-designer-v6.js) laufen mit V6_DATEI=… und V6_VERSION=… durch dieselben Prüfungen
 *  (Prüfungen der neuen Ansichten gibt es dort nicht: bearbeiten_test.mjs prüft die Version und beendet sich sonst). */
export const V6_DATEI = process.env.V6_DATEI || join(v6Ordner, 'lspod-designer-v6-6.4.0.js');
/** Referenzfassung für Vergleiche (gleiche Eingaben, andere Datei): Standard 6.3.1. Die Mock-Seite lädt sie mit dem Parameter editor=ref. */
export const V6_REF_DATEI = process.env.V6_REF_DATEI || join(v6Ordner, 'lspod-designer-v6-6.3.1.js');
export const V5_DATEI = join(repo, 'pod', 'live', 'lspod-designer-v5-safe.js');
/** Optionaler Ordner mit heruntergeladenen Vorlagenbildern (sha1 der Adresse, 16 Zeichen); ohne ihn gibt es einfache Attrappen. */
export const BILDCACHE = process.env.V6_BILDCACHE || '';
/** Scheitert ein Testlauf an der UMGEBUNG (Chromium weg oder nicht startbar, Platte voll, Port belegt) und nicht an einer Prüfung? Dann sagt er nichts über einen Mutanten (Mutationsprobe: «ungeklärt», nie «erkannt»).
 *  Bewusst NICHT dabei: Zeitüberschreitungen einzelner Warte-Aufrufe (waitFor, Timeout …) und Seitenfehler: das sind Prüfungen, die ein Mutant zu Recht zum Scheitern bringt. */
const INFRASTRUKTUR = /browser has been closed|Target (page, context or browser )?closed|browserType\.launch|Executable doesn't exist|ENOSPC|EADDRINUSE|spawn .* (ENOENT|EAGAIN)/;
export const istUmgebungsfehler = (aus) => INFRASTRUKTUR.test(String(aus));

// ── Server ──────────────────────────────────────────────────────────────────────────────────────
export const KATALOG_TEST = join(repo, 'dropship', 'selbst-gestalten-fertig-0511', 'werkzeuge', 'testdaten', 'katalog');
/** Zusätzliche echte Katalogdatei für diesen Strang: Modell 1592 (Unisex Oversized Boxy Tee, Vorlage mit festem Farbfoto, 9 Farben), kopiert aus dem Katalog vom 05.11.2026. */
export const KATALOG_ZUSATZ = join(hier, 'testdaten', 'katalog');
function karteMitShop(id, shopParam, ohneMinDpi, extraHinweise) {
  const datei = join(hier, 'testdaten', `${id}.karte.json`);
  if (!existsSync(datei)) return null;
  const k = JSON.parse(readFileSync(datei, 'utf8'));
  if (ohneMinDpi) delete k.minDpi;
  if (extraHinweise) {
    k.hinweise = [...(k.hinweise ?? []),
      { code: 'unbekannt_grenze', art: 'einschraenkung', text: 'Beispiel einer Einschränkung ohne eigenen Kundentext.' },
      { code: 'unbekannt_info', art: 'info', text: 'Interne Info, darf der Kunde nie sehen.' },
      { code: 'kappe', art: 'einschraenkung', kundentext: 'Eigener Kundentext der Karte hat Vorrang.' },
      { code: 'ohne_text', art: 'einschraenkung' }];
  }
  if (shopParam) {
    const v = {};
    for (const paar of shopParam.split(',')) { const [s, p] = paar.split(':'); if (s && p) v[s] = Number(p); }
    if (Object.keys(v).length) k.shop = { varianten: v };
  }
  return k;
}
export function starteServer() {
  const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const senden0 = (typ, inhalt, code = 200) => { res.writeHead(code, { 'content-type': typ, 'cache-control': 'no-store' }); res.end(inhalt); };
    // verzoegerung=ms: Vorschaudaten treffen verspätet ein (Test: Daten kommen erst NACH der ersten Änderung des Kunden)
    const verz = /^\/vorschau\//.test(u.pathname) ? Number(u.searchParams.get('verzoegerung')) || 0 : 0;
    const senden = verz > 0 ? (typ, inhalt, code = 200) => { setTimeout(() => senden0(typ, inhalt, code), verz); } : senden0;
    if (u.pathname === '/mock.html') return senden('text/html; charset=utf-8', readFileSync(join(hier, 'mock.html')));
    if (u.pathname === '/lspod-designer-v6.js') return senden('text/javascript; charset=utf-8', readFileSync(V6_DATEI));
    if (u.pathname === '/lspod-designer-v6-ref.js') return senden('text/javascript; charset=utf-8', readFileSync(V6_REF_DATEI));
    if (u.pathname === '/v5.js') return senden('text/javascript; charset=utf-8', readFileSync(V5_DATEI));
    let m;
    if (u.pathname === '/karten/syn.json') {
      // Künstliche Karte mit n gleichen Platzierungen «teil_01» … (kein echtes Modell): für Tests mit sehr vielen Reitern und sehr langer _pod_karte
      const n = Math.max(1, Math.min(60, Number(u.searchParams.get('n')) || 25));
      const k = karteMitShop('71', '', false, false);
      const vorlage = k.platzierungen.find((p) => p.id === 'front');
      k.printfulProductId = 99999;
      k.platzierungen = Array.from({ length: n }, (_, i) => {
        const id = 'teil_' + String(i + 1).padStart(2, '0');
        return { ...JSON.parse(JSON.stringify(vorlage)), id, dateiTyp: id, titelDe: 'Schnittteil ' + (i + 1), titelEn: 'Panel ' + (i + 1), kollidiertMit: [], aufpreisChf: 0, aufpreisUsd: null };
      });
      k.hinweise = [];
      return senden('application/json', JSON.stringify(k));
    }
    if (u.pathname === '/karten/buendel.json') {
      // Kartenbündel: m=71,586 (Modelle aus testdaten/), shop=<Shopify-Id>:<Printful-Variante>:<Modell>,…
      const modelle = {};
      for (const id of (u.searchParams.get('m') || '').split(',').filter(Boolean)) { const k = karteMitShop(id, '', false, false); if (k) modelle[id] = k; }
      const varianten = {};
      for (const paar of (u.searchParams.get('shop') || '').split(',').filter(Boolean)) { const [sv, pv, mo] = paar.split(':'); if (sv && pv && mo) varianten[sv] = { pv: Number(pv), m: Number(mo) }; }
      return senden('application/json', JSON.stringify({ schema: 1, modelle, shop: { varianten } }));
    }
    // LIVE-Karten und -Vorschaudaten aus pod/v6/maps (die Dateien, die in den Produktbeschreibungen stehen): karte=live-<Dateiname ohne «lspod-» und Endung>, vorschau=live-<…>; spiegel=0 (Vorgabe der Tests): Vorlagenbilder
    // werden von der Printful-Adresse geladen (mit V6_BILDCACHE die echten Bilder), sonst gelten die gespiegelten Adressen der Datei.
    if ((m = u.pathname.match(/^\/karten\/live-(\d+)\.json$/))) {
      const f = join(v6Ordner, 'maps', `lspod-${m[1]}.karte.json`);
      return existsSync(f) ? senden('application/json', readFileSync(f)) : senden('text/plain', 'keine Karte', 404);
    }
    if ((m = u.pathname.match(/^\/vorschau\/live-(\d+)\.json$/))) {
      const f = join(v6Ordner, 'maps', `lspod-${m[1]}.vorschau.json`);
      if (!existsSync(f)) return senden('text/plain', 'keine Vorschaudaten', 404);
      const d = JSON.parse(readFileSync(f, 'utf8'));
      if (u.searchParams.get('spiegel') === '0') for (const mo of Object.values(d.modelle)) for (const k of Object.keys(mo.bilder || {})) mo.bilder[k] = null;
      return senden('application/json', JSON.stringify(d));
    }
    if ((m = u.pathname.match(/^\/vorschau\/([\d,]+)\.json$/))) {
      // Vorschaudaten (Schema 1) aus den Test-Katalogen im Repo, gebaut mit dem echten Werkzeug; spiegel=0: Bilder nicht gespiegelt (null), sonst auf «cdn.shopify.com/s/files/test/»
      const ids = m[1].split(',').map(Number);
      const erst = vorschauBauen({ katalogOrdner: [KATALOG_TEST, KATALOG_ZUSATZ], modelle: ids, stand: '2026-11-06' });
      const spiegel = {};
      if (u.searchParams.get('spiegel') !== '0') for (const d of erst.plan.dateien) spiegel[d.dateiname] = `https://cdn.shopify.com/s/files/test/${d.dateiname}`;
      const r = vorschauBauen({ katalogOrdner: [KATALOG_TEST, KATALOG_ZUSATZ], modelle: ids, spiegel, stand: '2026-11-06' });
      const datei = vorschauDatei(r.ergebnisse, '2026-11-06');
      const kaputt = u.searchParams.get('kaputt');
      if (kaputt === 'json') return senden('application/json', JSON.stringify(datei).slice(0, 60));
      if (kaputt === 'schema') return senden('application/json', JSON.stringify({ ...datei, schema: 2 }));
      if (kaputt === 'modell') { for (const e of Object.values(datei.modelle)) e.adapter = 'unbekannt'; return senden('application/json', JSON.stringify(datei)); }
      return senden('application/json', JSON.stringify(datei));
    }
    if ((m = u.pathname.match(/^\/karten\/(\d+)\.json$/))) {
      const k = karteMitShop(m[1], u.searchParams.get('shop'), u.searchParams.get('ohneMinDpi'), u.searchParams.get('hinweise'));
      return k ? senden('application/json', JSON.stringify(k)) : senden('text/plain', 'keine Karte', 404);
    }
    if ((m = u.pathname.match(/^\/bild\/(\w+)\.svg$/))) {
      const farbe = m[1] === 'vorne' ? '#e9e4d8' : '#d8e4e9';
      return senden('image/svg+xml', `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720"><rect width="600" height="720" fill="${farbe}"/><text x="300" y="360" font-size="48" text-anchor="middle" fill="#555" font-family="Arial">${m[1]}</text></svg>`);
    }
    if (u.pathname === '/cart') return senden('text/html; charset=utf-8', '<!doctype html><title>Warenkorb</title><h1 id="warenkorb">Warenkorb</h1>');
    senden('text/plain', 'nicht gefunden', 404);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${server.address().port}`, stop: () => new Promise((z) => server.close(z)) })));
}

// ── PNG ─────────────────────────────────────────────────────────────────────────────────────────
const CRC_TAB = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC_TAB[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(typ, daten) {
  const l = Buffer.alloc(4); l.writeUInt32BE(daten.length);
  const td = Buffer.concat([Buffer.from(typ, 'ascii'), daten]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td));
  return Buffer.concat([l, td, c]);
}
/** Einfaches PNG (RGBA) mit Verlauf; Breite × Höhe in Pixeln. */
export function pngErzeugen(w, h, farbe = [200, 60, 60]) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const zeile = Buffer.alloc(1 + w * 4);
  const roh = Buffer.alloc((1 + w * 4) * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) { const o = 1 + x * 4; zeile[o] = farbe[0]; zeile[o + 1] = farbe[1] + ((y * 80 / h) | 0); zeile[o + 2] = farbe[2] + ((x * 80 / w) | 0); zeile[o + 3] = 255; }
    zeile.copy(roh, y * (1 + w * 4));
  }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(roh, { level: 1 })), chunk('IEND', Buffer.alloc(0))]);
}
/** PNG (RGBA) aus einer Funktion (x, y) → [r, g, b, a]. */
export function pngRGBA(w, h, pixel) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const roh = Buffer.alloc((1 + w * 4) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (1 + w * 4) + 1 + x * 4; const c = pixel(x, y); roh[o] = c[0]; roh[o + 1] = c[1]; roh[o + 2] = c[2]; roh[o + 3] = c[3]; }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(roh, { level: 1 })), chunk('IEND', Buffer.alloc(0))]);
}
/** Nachbau eines Printful-Vorlagenbildes («whitebg»): ausserhalb des Kleidungsstücks (Rechteck x 250..749, y 100..899 von 1000) opakes Weiss, darin ein halbdurchsichtiger Schatten
 *  (schwarz, Alpha 22) mit einer dunkleren Falte (x 480..519, Alpha 70). So sieht das echte Bild aus (GEMESSEN: 52 % opakes Weiss, 48 % halbdurchsichtig, Mitte RGBA 121,121,121,21). */
export const GEISTER_GROESSE = 1000;
export const GEISTER_RECHTECK = { x0: 250, y0: 100, x1: 749, y1: 899, falteX0: 480, falteX1: 519, alpha: 22, alphaFalte: 70 };
let geisterPuffer = null;
export function geisterPng() {
  if (!geisterPuffer) {
    const g = GEISTER_RECHTECK;
    geisterPuffer = pngRGBA(GEISTER_GROESSE, GEISTER_GROESSE, (x, y) => (x >= g.x0 && x <= g.x1 && y >= g.y0 && y <= g.y1 ? [0, 0, 0, x >= g.falteX0 && x <= g.falteX1 ? g.alphaFalte : g.alpha] : [255, 255, 255, 255]));
  }
  return geisterPuffer;
}
/** Nachbau eines Tassenfotos 700 × 1000 (weisser Grund, Körper x 213..601, y 289..757 in hellem Grau 236, Henkel links als Ring): so gross wie das Katalogfoto 1320. */
export const TASSE_FOTO = { breite: 700, hoehe: 1000, x0: 213, x1: 601, y0: 289, y1: 757 };
let tassePuffer = null;
export function tassePng() {
  if (!tassePuffer) {
    const t = TASSE_FOTO;
    tassePuffer = pngRGBA(t.breite, t.hoehe, (x, y) => {
      if (x >= t.x0 && x <= t.x1 && y >= t.y0 && y <= t.y1) return [236, 236, 236, 255];
      const dx = x - 150, dy = y - 520, d = Math.sqrt(dx * dx + dy * dy);
      if (d < 150 && d > 105 && x < t.x0) return [236, 236, 236, 255];
      return [255, 255, 255, 255];
    });
  }
  return tassePuffer;
}
/** PNG mit Zufallsrauschen (fast nicht komprimierbar): so gross wie ein echtes Handyfoto, damit Dateigrössen-Grenzen greifen. Deterministisch (fester Startwert). */
export function pngRauschen(w, h) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;   // RGB ohne Alpha
  const roh = Buffer.alloc((1 + w * 3) * h);
  let z = 123456789;
  for (let i = 0; i < roh.length; i++) { z = (Math.imul(z, 1664525) + 1013904223) >>> 0; roh[i] = z >>> 24; }
  for (let y = 0; y < h; y++) roh[y * (1 + w * 3)] = 0;   // Filtertyp 0 je Zeile
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(roh, { level: 1 })), chunk('IEND', Buffer.alloc(0))]);
}
const PNG_KOPF = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
/** Ein PNG aus einem Mehrteil-Körper (multipart) herausschneiden; Breite und Höhe aus dem IHDR. */
export function pngAusKoerper(buf) {
  const a = buf.indexOf(PNG_KOPF);
  if (a < 0) return null;
  const iend = buf.indexOf(Buffer.from('IEND'), a);
  const ende = iend < 0 ? buf.length : iend + 8;
  const png = buf.subarray(a, ende);
  return { png, breite: png.readUInt32BE(16), hoehe: png.readUInt32BE(20), bytes: png.length };
}

// ── Seite öffnen mit Netzattrappen ──────────────────────────────────────────────────────────────
function vorlagenBild(url) {
  if (BILDCACHE) {
    const f = join(BILDCACHE, createHash('sha1').update(url).digest('hex').slice(0, 16));
    if (existsSync(f)) return { typ: /\.jpe?g/i.test(url) ? 'image/jpeg' : 'image/png', body: readFileSync(f) };
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#f2f0ea"/><rect x="200" y="160" width="400" height="500" rx="24" fill="none" stroke="#999" stroke-width="3" stroke-dasharray="10 8"/></svg>`;
  return { typ: 'image/svg+xml', body: Buffer.from(svg) };
}
const NORMALE_KENNUNG = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

/**
 * @param browser  Playwright-Browser
 * @param basis    Adresse des Test-Servers
 * @param opt      { query: 'karte=71&…', breite, hoehe, mobil, sprache, cloudinaryFehler: bool,
 *                   cloudinaryMaxBytes: Zahl (grössere Uploads → HTTP 400 «File size too large»), cloudinaryMaxPixel: Zahl (mehr Pixel → HTTP 400 «Image dimensions too large»),
 *                   cloudinaryVerzoegerung: (n, art) => ms (n = laufende Nummer des Uploads), cloudinaryHaengt: (n) => bool (Antwort kommt nie), warenkorbVerzoegerung: ms,
 *                   initSkript: String (läuft vor den Skripten der Seite), cloudinaryJpegFehler: bool (nur Uploads von JPEG scheitern), printfulHaengt / shopifyHaengt: (url) => bool (Antwort kommt nie), printfulBild / shopifyBild: (url) => { status?, typ, body, cors?, verzoegerung? } | null, corsErwartet: bool }
 * @returns { page, ctx, fehler: string[], uploads: [], abgelehnt: [], warenkorb: [], png(url), schliessen() }
 */
export async function seiteOeffnen(browser, basis, opt = {}) {
  const ctx = await browser.newContext({
    viewport: { width: opt.breite || 1440, height: opt.hoehe || 900 }, deviceScaleFactor: 1, userAgent: NORMALE_KENNUNG, hasTouch: !!opt.mobil, isMobile: !!opt.mobil, locale: opt.sprache || 'de-CH', reducedMotion: opt.reducedMotion || 'no-preference',
  });
  const page = await ctx.newPage();
  if (opt.initSkript) await page.addInitScript(opt.initSkript);   // läuft vor jedem Skript der Seite (z. B. gesperrter Speicher)
  const fehler = [];
  const uploads = [];
  const abgelehnt = [];
  let eingang = 0;
  const warenkorb = [];
  const gespeichert = new Map();
  page.on('pageerror', (e) => fehler.push('pageerror: ' + e.message));
  // opt.corsErwartet: der Test lässt ein Bild absichtlich an der CORS-Sperre scheitern; die Meldung «blocked by CORS policy» schreibt Chromium selbst, nicht der Editor
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text()) && !(opt.corsErwartet && /blocked by CORS policy/.test(m.text()))) fehler.push('console.error: ' + m.text()); });
  /** opt.printfulBild / opt.shopifyBild: (url) → { status?, typ, body, cors?: false } oder null (dann gilt die Standard-Attrappe). Zähler: bildAnfragen (Adressen aller Bild-Anfragen an Printful und Shopify Files). */
  const bildAnfragen = [];
  function bildAntwort(route, r) {
    if (r.status && r.status !== 200) return route.fulfill({ status: r.status, contentType: 'text/plain', body: 'nicht da' });
    // cors: false = der Server gibt die Freigabe nur einem FREMDEN Ursprung (Chromium lehnt ein Bild mit crossOrigin=anonymous dann ab). Ganz ohne Kopf ginge es nicht: Playwright ergänzt bei
    // abgefangenen Antworten selbst «access-control-allow-origin: *» (GEMESSEN 06.11.2026), die Attrappe wäre dann freigegeben.
    return route.fulfill({ status: 200, contentType: r.typ, body: r.body, headers: { 'access-control-allow-origin': r.cors === false ? 'https://fremd.example' : '*' } });
  }
  await page.route('https://files.cdn.printful.com/**', (route) => {
    const u = route.request().url();
    bildAnfragen.push(u);
    if (opt.printfulHaengt && opt.printfulHaengt(u)) return;   // Antwort bleibt aus (Verbindung offen): Test der Fristen
    const eigene = opt.printfulBild ? opt.printfulBild(u) : null;
    if (eigene) { if (eigene.verzoegerung > 0) { setTimeout(() => { bildAntwort(route, eigene).catch(() => {}); }, eigene.verzoegerung); return; } return bildAntwort(route, eigene); }   // verzoegerung: ms bis zur Antwort (Test: das Foto scheitert erst, wenn die Seite längst steht)
    const b = vorlagenBild(u); route.fulfill({ status: 200, contentType: b.typ, body: b.body, headers: { 'access-control-allow-origin': '*' } });
  });
  await page.route('https://cdn.shopify.com/**', (route) => {
    const u = route.request().url();
    bildAnfragen.push(u);
    if (/stk-index\.json/.test(u)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['heart-red', 'star-gold', 'crown']), headers: { 'access-control-allow-origin': '*' } });
    if (opt.shopifyHaengt && opt.shopifyHaengt(u)) return;   // Antwort bleibt aus (Verbindung offen)
    const eigene = opt.shopifyBild ? opt.shopifyBild(u) : null;
    if (eigene) return bildAntwort(route, eigene);
    // gespiegelte Vorlagenbilder der Vorschau (Schema 1, Werkzeug vorschau_daten_bauen.mjs): Nachbau des Geisterbildes, bei .jpg das Tassenfoto
    if (/\/luxe-vorschau-[0-9a-f]+\.(png|jpg)/.test(u)) return bildAntwort(route, /\.jpg/.test(u) ? { typ: 'image/png', body: tassePng() } : { typ: 'image/png', body: geisterPng() });
    return route.fulfill({ status: 200, contentType: 'image/png', body: pngErzeugen(256, 256, [220, 160, 40]), headers: { 'access-control-allow-origin': '*' } });
  });
  await page.route('https://api.cloudinary.com/**', async (route) => {
    const req = route.request();
    const koerper = req.postDataBuffer() || Buffer.alloc(0);
    const p = pngAusKoerper(koerper);
    const dateityp = p ? 'png' : (koerper.indexOf(Buffer.from([0xff, 0xd8, 0xff])) >= 0 ? 'jpeg' : '?');
    if (opt.cloudinaryFehler || (opt.cloudinaryJpegFehler && dateityp === 'jpeg')) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { message: 'mock-fehler' } }), headers: { 'access-control-allow-origin': '*' } });
    const nr = ++eingang;
    if (opt.cloudinaryHaengt && opt.cloudinaryHaengt(nr)) return;   // Antwort bleibt aus (Zeitlimit-Test)
    if (opt.cloudinaryVerzoegerung) { const ms = opt.cloudinaryVerzoegerung(nr, dateityp); if (ms > 0) await new Promise((r) => setTimeout(r, ms)); }
    const cors = { 'access-control-allow-origin': '*' };
    if (opt.cloudinaryMaxBytes && koerper.length > opt.cloudinaryMaxBytes) {
      abgelehnt.push({ nr, bytes: koerper.length, grund: 'bytes' });
      return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: { message: `File size too large. Got ${koerper.length}. Maximum is ${opt.cloudinaryMaxBytes}.` } }), headers: cors });
    }
    if (opt.cloudinaryMaxPixel && p && p.breite * p.hoehe > opt.cloudinaryMaxPixel) {
      abgelehnt.push({ nr, bytes: koerper.length, grund: 'pixel', breite: p.breite, hoehe: p.hoehe });
      return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: { message: `Image dimensions too large. Maximum is ${opt.cloudinaryMaxPixel} megapixels.` } }), headers: cors });
    }
    const n = uploads.length + 1;
    const url = `https://res.cloudinary.com/dwyi6kkrl/image/upload/mock/${n}.png`;
    uploads.push({ n, url, typ: dateityp, breite: p ? p.breite : null, hoehe: p ? p.hoehe : null, bytes: p ? p.bytes : koerper.length, hatPreset: koerper.includes(Buffer.from('pigto8ba')) });
    if (p) gespeichert.set(url, p.png);
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ secure_url: url }), headers: { 'access-control-allow-origin': '*' } });
  });
  await page.route('https://res.cloudinary.com/**', (route) => {
    const png = gespeichert.get(route.request().url());
    if (png) return route.fulfill({ status: 200, contentType: 'image/png', body: png, headers: { 'access-control-allow-origin': '*' } });
    route.fulfill({ status: 200, contentType: 'image/png', body: pngErzeugen(64, 64), headers: { 'access-control-allow-origin': '*' } });
  });
  await page.route('**/cart/add.js', async (route) => {
    const req = route.request();
    let daten = null; try { daten = JSON.parse(req.postData()); } catch { /* egal */ }
    warenkorb.push(daten);
    if (opt.warenkorbVerzoegerung) await new Promise((r) => setTimeout(r, opt.warenkorbVerzoegerung));
    route.fulfill({ status: opt.warenkorbFehler ? 422 : 200, contentType: 'application/json', body: JSON.stringify(opt.warenkorbFehler ? { description: 'mock-warenkorb-fehler' } : { id: 1, items: [] }) });
  });
  await page.goto(`${basis}/mock.html?${opt.query || ''}`, { waitUntil: 'domcontentloaded' });
  return { page, ctx, fehler, uploads, abgelehnt, warenkorb, bildAnfragen, png: (url) => gespeichert.get(url), schliessen: () => ctx.close() };
}

/** Warten, bis der v6-Editor gebaut ist. */
export async function editorBereit(page, selector = '.lspod-designer-v6') {
  await page.waitForSelector(`${selector}[data-init-v6="1"] .lsp6`, { timeout: 15000 });
}
