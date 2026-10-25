#!/usr/bin/env node
/**
 * Kategorie-Bilder: je Collection ein grosses Label-Bild (1600×1200) aus ECHTEN Bestseller-Fotos des Shops plus Kategorie-Name.
 * Kostet nichts (kein Bildgenerator), zeigt nur Ware, die es gibt (kein Fake-Foto), Text bleibt scharf (HTML → PNG per Chromium).
 *
 * Auswahl der Fotos: die meistverkauften aktiven Produkte der Collection; ein Foto kommt nur in Frage, wenn es gross genug,
 * annähernd quadratisch und — von Gemini-Vision bestätigt — ein sauberes Produktfoto ist (kein Text, keine Masspfeile, keine Collage).
 * Fehlt Gemini, werden nur Grösse/Seitenverhältnis geprüft und das Ergebnis im Bericht als «ungeprüft» markiert.
 *
 * TROCKENLAUF IST VORGABE: ohne LIVE=1 werden die PNGs nur gerendert (OUT=pfad), nichts hochgeladen.
 * Aufruf:  HANDLES=haustier-hunde,schmuck node automation/kategorie_bilder.mjs        (Trockenlauf, rendert PNGs)
 *          ALLE=1 LIVE=1 node automation/kategorie_bilder.mjs                          (alle Kategorien aus lib/kategorien.mjs)
 * Schalter: FORCE=1 (auch Collections, die schon ein Label tragen) · OUT=/tmp/kategorie_bilder · KI=0 (ohne Gemini-Prüfung)
 */
import { mkdirSync, writeFileSync, existsSync, appendFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { KATEGORIEN } from './lib/kategorien.mjs';

const require = createRequire(import.meta.url);
const LIVE = process.env.LIVE === '1', FORCE = process.env.FORCE === '1';
const OUT = process.env.OUT || '/tmp/kategorie_bilder';
const KI = process.env.KI !== '0' && !!process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GBASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const MARKE = 'LuxeStyle-Label';

/** Schriftgrösse nach Titellänge (Pixel auf der 1600er Fläche). Rein, getestet. */
export function titelGroesse(titel) { const n = String(titel).length; return n <= 12 ? 168 : n <= 20 ? 132 : n <= 30 ? 104 : 84; }
/** Wählt höchstens `n` Fotos: gross genug, annähernd quadratisch, bestätigt sauber. Rein, getestet. */
export function waehleFotos(kandidaten, n = 3, minPx = 700) {
  return kandidaten.filter(k => k.breite >= minPx && k.hoehe >= minPx && k.hoehe / k.breite > 0.75 && k.hoehe / k.breite < 1.34 && k.sauber !== false).slice(0, n);
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** HTML des Labels (1600×1200). */
export function labelHtml(titel, bilder, anzahl) {
  const [a, b, c] = bilder;
  const karte = (src, stil) => src ? `<div class="k" style="${stil}"><img src="${esc(src)}"></div>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  body{width:1600px;height:1200px;overflow:hidden;background:linear-gradient(135deg,#f7f1e7 0%,#eadcc8 100%);font-family:'Liberation Serif','DejaVu Serif',Georgia,serif;position:relative}
  .k{position:absolute;background:#fff;border-radius:34px;box-shadow:0 30px 70px rgba(80,58,30,.22),0 4px 12px rgba(80,58,30,.12);overflow:hidden}
  .k img{width:100%;height:100%;object-fit:cover;display:block}
  .marke{position:absolute;left:96px;top:84px;font-size:44px;letter-spacing:.04em;color:#3b2f22;font-weight:700}
  .marke b{color:#8b6f47}
  .titel{position:absolute;left:96px;bottom:200px;width:760px;font-size:${titelGroesse(titel)}px;line-height:1.02;color:#2c2118;font-weight:700;letter-spacing:-.01em}
  .linie{position:absolute;left:100px;bottom:168px;width:130px;height:6px;background:#8b6f47;border-radius:3px}
  .fuss{position:absolute;left:96px;bottom:84px;font-size:38px;color:#6b5a47;font-family:'Liberation Sans','DejaVu Sans',sans-serif}
  </style></head><body>
  <div class="marke">LuxeStyle<b>.ch</b></div>
  ${karte(a, 'left:760px;top:120px;width:700px;height:700px;transform:rotate(2deg)')}
  ${karte(b, 'left:610px;top:560px;width:470px;height:470px;transform:rotate(-3deg)')}
  ${karte(c, 'left:1110px;top:700px;width:400px;height:400px;transform:rotate(4deg)')}
  <div class="titel">${esc(titel)}</div><div class="linie"></div>
  <div class="fuss">${anzahl ? esc(anzahl) + ' Artikel · ' : ''}Schweizer Shop</div>
  </body></html>`;
}

async function gemini(bytesB64, mime) {
  const prompt = 'Ist das ein sauberes Produktfoto für eine Kategorie-Kachel eines Online-Shops? Sauber heisst: das Produkt ist klar sichtbar (allein, in der Hand, getragen oder in einer Wohnumgebung), KEIN eingeblendeter Text oder chinesische Schrift, KEINE Masspfeile oder Grössentabelle, KEIN Wasserzeichen, KEINE Collage aus mehreren Einzelbildern, nicht unscharf. '
    + 'Antworte NUR als JSON: {"sauber": true|false, "grund": "kurz"}';
  const r = await fetch(`${GBASE}/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: bytesB64 } }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } }) });
  if (!r.ok) return null;
  try { const t = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text || ''; return JSON.parse(t.replace(/^```json|```$/g, '')).sauber === true; } catch { return null; }
}

async function main() {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (query, variables) => shopifyGql(SHOP, '2025-01', tok, query, variables);
  mkdirSync(OUT, { recursive: true });
  const handles = process.env.ALLE === '1' ? KATEGORIEN.map(k => k.handle) : (process.env.HANDLES || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!handles.length) { console.error('HANDLES=a,b oder ALLE=1 angeben'); process.exit(1); }
  const { chromium } = require('playwright');
  const browser = await chromium.launch(); const seite = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  const bericht = [];
  for (const h of [...new Set(handles)]) {
    const c = (await q(`query($h:String!){collectionByHandle(handle:$h){id title image{altText url} productsCount{count}
      products(first:30,sortKey:BEST_SELLING){nodes{status featuredImage{url width height}}}}}`, { h })).collectionByHandle;
    if (!c) { bericht.push(`${h}: Collection fehlt`); continue; }
    if (!FORCE && c.image?.altText?.includes(MARKE)) { bericht.push(`${h}: hat schon ein Label`); continue; }
    const kand = c.products.nodes.filter(p => p.status === 'ACTIVE' && p.featuredImage).map(p => ({ url: p.featuredImage.url, breite: p.featuredImage.width, hoehe: p.featuredImage.height }));
    const vor = waehleFotos(kand, 12);
    const gewaehlt = [];
    for (const k of vor) {
      if (gewaehlt.length >= 3) break;
      if (KI) {
        const rr = await fetch(k.url + (k.url.includes('?') ? '&' : '?') + 'width=800'); if (!rr.ok) continue;
        const b64 = Buffer.from(await rr.arrayBuffer()).toString('base64');
        const sauber = await gemini(b64, rr.headers.get('content-type') || 'image/jpeg');
        if (sauber !== true) continue;
        gewaehlt.push({ ...k, sauber: true });
      } else gewaehlt.push({ ...k, sauber: undefined });
    }
    if (gewaehlt.length < 2) { bericht.push(`${h}: nur ${gewaehlt.length} saubere Fotos — kein Label (Kandidaten ${kand.length})`); continue; }
    const bilder = gewaehlt.map(g => g.url + (g.url.includes('?') ? '&' : '?') + 'width=1000');
    const anzahl = c.productsCount.count >= 20 ? String(Math.floor(c.productsCount.count / 10) * 10) + '+' : '';
    await seite.setContent(labelHtml(c.title.replace(/^[^\p{L}\p{N}]+/u, ''), bilder, anzahl), { waitUntil: 'networkidle', timeout: 60000 });
    await seite.waitForTimeout(500);
    const datei = `${OUT}/${h}.png`; await seite.screenshot({ path: datei });
    let status = `gerendert (${gewaehlt.length} Fotos${KI ? ', von Gemini bestätigt' : ', UNGEPRÜFT'})`;
    if (LIVE) {
      const bytes = readFileSync(datei);
      const s = (await q(`mutation($in:[StagedUploadInput!]!){stagedUploadsCreate(input:$in){stagedTargets{url resourceUrl parameters{name value}} userErrors{message}}}`, { in: [{ filename: `label-${h}.png`, mimeType: 'image/png', resource: 'IMAGE', httpMethod: 'POST' }] })).stagedUploadsCreate;
      const t = s.stagedTargets?.[0]; if (!t) { bericht.push(`${h}: Upload-Ziel fehlt ${JSON.stringify(s.userErrors)}`); continue; }
      const fd = new FormData(); for (const p of t.parameters) fd.append(p.name, p.value); fd.append('file', new Blob([bytes], { type: 'image/png' }), `label-${h}.png`);
      const up = await fetch(t.url, { method: 'POST', body: fd });
      if (!up.ok && up.status !== 201 && up.status !== 204) { bericht.push(`${h}: Upload HTTP ${up.status}`); continue; }
      const u = (await q(`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}`, { i: { id: c.id, image: { src: t.resourceUrl, altText: `${c.title} – ${MARKE}` } } })).collectionUpdate;
      if (u.userErrors.length) { bericht.push(`${h}: ${JSON.stringify(u.userErrors)}`); continue; }
      status += ' · hochgeladen'; appendFileSync('dropship/kategorien_ledger.txt', `${new Date().toISOString()} · bild ${h}\n`);
    }
    bericht.push(`${h}: ${status}`); console.log(`${h}: ${status}`);
  }
  await browser.close();
  console.log('\n' + bericht.join('\n'));
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
