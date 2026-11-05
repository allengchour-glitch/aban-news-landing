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

export const hier = dirname(fileURLToPath(import.meta.url));
export const v6Ordner = join(hier, '..');
export const repo = join(hier, '..', '..', '..');
const require = createRequire(import.meta.url);

/** Playwright laden: lokal, sonst die globale Installation dieser Umgebung. */
export function playwright() {
  for (const wo of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { return require(wo); } catch { /* nächster */ } }
  throw new Error('Playwright nicht gefunden');
}

export const V6_DATEI = process.env.V6_DATEI || join(v6Ordner, 'lspod-designer-v6.js');
export const V5_DATEI = join(repo, 'pod', 'live', 'lspod-designer-v5-safe.js');
/** Optionaler Ordner mit heruntergeladenen Vorlagenbildern (sha1 der Adresse, 16 Zeichen); ohne ihn gibt es einfache Attrappen. */
export const BILDCACHE = process.env.V6_BILDCACHE || '';

// ── Server ──────────────────────────────────────────────────────────────────────────────────────
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
    const senden = (typ, inhalt, code = 200) => { res.writeHead(code, { 'content-type': typ, 'cache-control': 'no-store' }); res.end(inhalt); };
    if (u.pathname === '/mock.html') return senden('text/html; charset=utf-8', readFileSync(join(hier, 'mock.html')));
    if (u.pathname === '/lspod-designer-v6.js') return senden('text/javascript; charset=utf-8', readFileSync(V6_DATEI));
    if (u.pathname === '/v5.js') return senden('text/javascript; charset=utf-8', readFileSync(V5_DATEI));
    let m;
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
 * @param opt      { query: 'karte=71&…', breite, hoehe, mobil, sprache, cloudinaryFehler: bool }
 * @returns { page, ctx, fehler: string[], uploads: [], warenkorb: [], png(url), schliessen() }
 */
export async function seiteOeffnen(browser, basis, opt = {}) {
  const ctx = await browser.newContext({
    viewport: { width: opt.breite || 1440, height: opt.hoehe || 900 }, deviceScaleFactor: 1, userAgent: NORMALE_KENNUNG, hasTouch: !!opt.mobil, isMobile: !!opt.mobil, locale: opt.sprache || 'de-CH',
  });
  const page = await ctx.newPage();
  const fehler = [];
  const uploads = [];
  const warenkorb = [];
  const gespeichert = new Map();
  page.on('pageerror', (e) => fehler.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) fehler.push('console.error: ' + m.text()); });
  await page.route('https://files.cdn.printful.com/**', (route) => { const b = vorlagenBild(route.request().url()); route.fulfill({ status: 200, contentType: b.typ, body: b.body, headers: { 'access-control-allow-origin': '*' } }); });
  await page.route('https://cdn.shopify.com/**', (route) => {
    const u = route.request().url();
    if (/stk-index\.json/.test(u)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['heart-red', 'star-gold', 'crown']), headers: { 'access-control-allow-origin': '*' } });
    return route.fulfill({ status: 200, contentType: 'image/png', body: pngErzeugen(256, 256, [220, 160, 40]), headers: { 'access-control-allow-origin': '*' } });
  });
  await page.route('https://api.cloudinary.com/**', async (route) => {
    const req = route.request();
    const koerper = req.postDataBuffer() || Buffer.alloc(0);
    const p = pngAusKoerper(koerper);
    const dateityp = p ? 'png' : (koerper.indexOf(Buffer.from([0xff, 0xd8, 0xff])) >= 0 ? 'jpeg' : '?');
    if (opt.cloudinaryFehler) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { message: 'mock-fehler' } }) });
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
  await page.route('**/cart/add.js', (route) => {
    const req = route.request();
    let daten = null; try { daten = JSON.parse(req.postData()); } catch { /* egal */ }
    warenkorb.push(daten);
    route.fulfill({ status: opt.warenkorbFehler ? 422 : 200, contentType: 'application/json', body: JSON.stringify(opt.warenkorbFehler ? { description: 'mock-warenkorb-fehler' } : { id: 1, items: [] }) });
  });
  await page.goto(`${basis}/mock.html?${opt.query || ''}`, { waitUntil: 'domcontentloaded' });
  return { page, ctx, fehler, uploads, warenkorb, png: (url) => gespeichert.get(url), schliessen: () => ctx.close() };
}

/** Warten, bis der v6-Editor gebaut ist. */
export async function editorBereit(page, selector = '.lspod-designer-v6') {
  await page.waitForSelector(`${selector}[data-init-v6="1"] .lsp6`, { timeout: 15000 });
}
