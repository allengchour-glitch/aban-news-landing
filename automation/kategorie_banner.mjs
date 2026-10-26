#!/usr/bin/env node
/**
 * Kategorie-Banner «Pinnwand» (2000×1000) für Collections: ein grosses Bild aus bis zu 12 ECHTEN, von Gemini als sauber bestätigten Bestseller-Fotos
 * des Shops plus Titelband. Layout und Tests: automation/banner/ (Anleitung dropship/BANNER-LIESMICH.md). Kostet kein Bildgenerator, zeigt nur Ware, die es gibt.
 *
 * Ablauf je Collection: 60 Bestseller → Kandidaten (lib/banner_fotos.mjs, bis 2 Fotos je Produkt) → je Foto Gemini-Sauberkeitsprüfung (6 gleichzeitig) bis 12 saubere
 * → Banner in Chromium rendern → Gemini prüft das fertige Banner (Titel lesbar, Fotos passen zur Kategorie, kein Fremdtext/Logo) → erst dann Upload.
 * Weniger als 8 saubere Fotos oder durchgefallenes Banner = kein Upload, Grund im Bericht. Gemini nicht erreichbar = kein Upload (nie stillschweigend «ok»).
 *
 * TROCKENLAUF IST VORGABE: ohne LIVE=1 wird nur gerendert (OUT=pfad), nichts hochgeladen. Das alte Collection-Bild wird vor dem Ersetzen gesichert
 * (dropship/kategorie-bilder-sicherung/<handle>.json: url + altText), Rückfall = collectionUpdate mit dieser URL.
 * Aufruf:  HANDLES=damen-kleider,herren-hemden node automation/kategorie_banner.mjs
 *          ALLE=1 [PREFIX=m-] LIVE=1 node automation/kategorie_banner.mjs          (alle Themen-Kategorien aus lib/kategorien.mjs ohne Unterfilter; PREFIX filtert nach id)
 * Schalter: FORCE=1 (auch Collections mit Pinnwand-Banner) · OUT=/tmp/kategorie_banner · ZIEL=12 · MIN=8 · LIMIT=n (höchstens n Collections)
 */
import { mkdirSync, writeFileSync, existsSync, appendFileSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { KATEGORIEN } from './lib/kategorien.mjs';
import { kandidaten, waehleSaubere } from './lib/banner_fotos.mjs';
import { geminiSauber, geminiBanner } from './lib/foto_pruefung.mjs';
import { bannerHtml, anzahlText } from './banner/banner.mjs';

const require = createRequire(import.meta.url);
const HIER = dirname(fileURLToPath(import.meta.url));
const LIVE = process.env.LIVE === '1', FORCE = process.env.FORCE === '1';
const OUT = process.env.OUT || '/tmp/kategorie_banner';
const ZIEL = Number(process.env.ZIEL || 12), MIN = Number(process.env.MIN || 8), LIMIT = Number(process.env.LIMIT || 0);
const PY = process.env.PYTHON || '/usr/bin/python3';
const MARKE = 'LuxeStyle-Pinnwand';
const GLEICHZEITIG = 6;
const schlaf = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  if (!process.env.GEMINI_API_KEY) { console.error('GEMINI_API_KEY fehlt — ohne Bildprüfung wird nichts gerendert'); process.exit(1); }
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = async (a, b) => { for (let n = 0; ; n++) { try { return await shopifyGql(SHOP, '2025-01', tok, a, b); } catch (e) { if (n >= 5 || !/Throttled|THROTTLED|429/.test(e.message)) throw e; await schlaf(10000 * (n + 1)); } } };
  mkdirSync(OUT, { recursive: true }); mkdirSync('dropship/kategorie-bilder-sicherung', { recursive: true });

  let handles = process.env.ALLE === '1'
    ? KATEGORIEN.filter(k => !k.filter && (!process.env.PREFIX || k.id.startsWith(process.env.PREFIX))).map(k => k.handle)
    : (process.env.HANDLES || '').split(',').map(s => s.trim()).filter(Boolean);
  handles = [...new Set(handles)];
  if (!handles.length) { console.error('HANDLES=a,b oder ALLE=1 angeben'); process.exit(1); }

  const { chromium } = require('playwright');
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });   // damit die Seite die Pixel lokaler Fotos lesen darf (Freisteller-Erkennung)
  const seite = await browser.newPage({ viewport: { width: 2000, height: 1000 } });
  const bericht = []; let fertig = 0;
  for (const h of handles) {
    if (LIMIT && fertig >= LIMIT) break;
    try {
      const c = (await q(`query($h:String!){collectionByHandle(handle:$h){id title image{altText url} productsCount{count}
        products(first:60,sortKey:BEST_SELLING){nodes{status title tags featuredImage{url width height} media(first:4){nodes{... on MediaImage{image{url width height}}}}}}}}`, { h })).collectionByHandle;
      if (!c) { bericht.push(`${h}: Collection fehlt`); continue; }
      if (!FORCE && c.image?.altText?.includes(MARKE)) { bericht.push(`${h}: hat schon ein Pinnwand-Banner`); continue; }
      const titel = c.title.replace(/^[^\p{L}\p{N}]+/u, '').trim();
      const kand = kandidaten(c.products.nodes, { max: 90 });
      // Fotos laden und prüfen, 6 gleichzeitig, bis genug saubere beisammen sind
      const dirF = `${OUT}/fotos/${h}`; rmSync(dirF, { recursive: true, force: true }); mkdirSync(dirF, { recursive: true });
      const geprueft = [];
      for (let i = 0; i < kand.length; i += GLEICHZEITIG) {
        const teil = kand.slice(i, i + GLEICHZEITIG);
        const erg = await Promise.all(teil.map(async (k, j) => {
          try {
            const u = k.url + (k.url.includes('?') ? '&' : '?') + 'width=1000';
            const rr = await fetch(u); if (!rr.ok) return { ...k, sauber: null };
            const buf = Buffer.from(await rr.arrayBuffer());
            const s = await geminiSauber(buf.toString('base64'), rr.headers.get('content-type') || 'image/jpeg', undefined, titel);
            if (s === true) { const f = `${dirF}/${i + j}.jpg`; writeFileSync(f, buf); return { ...k, sauber: true, datei: f }; }
            return { ...k, sauber: s };
          } catch { return { ...k, sauber: null }; }
        }));
        geprueft.push(...erg);
        if (waehleSaubere(geprueft, ZIEL).length >= ZIEL) break;
      }
      const gewaehlt = waehleSaubere(geprueft, ZIEL);
      const unbekannt = geprueft.filter(g => g.sauber === null).length;
      if (gewaehlt.length < MIN) { bericht.push(`${h}: nur ${gewaehlt.length} saubere Fotos (${geprueft.length} geprüft, ${unbekannt} nicht prüfbar) — kein Banner`); continue; }
      const anzahl = anzahlText(c.productsCount.count);
      const htmlDatei = `${OUT}/${h}.html`;
      writeFileSync(htmlDatei, bannerHtml(titel, gewaehlt.map(g => 'file://' + g.datei), anzahl));
      await seite.goto('file://' + htmlDatei, { waitUntil: 'load' });
      await seite.waitForFunction(() => window.__fertig === true, null, { timeout: 30000 });
      const b = await seite.evaluate(() => window.__bericht);
      if (b.fehlend || b.fehler) { bericht.push(`${h}: Rendering mit Fehlern (fehlend ${b.fehlend}, Fehler ${b.fehler}) — kein Banner`); continue; }
      const png = `${OUT}/${h}.png`, jpg = `${OUT}/${h}.jpg`;
      await seite.screenshot({ path: png });
      execFileSync(PY, [`${HIER}/banner/tojpeg.py`, png, jpg]); rmSync(png);
      const qa = await geminiBanner(readFileSync(jpg).toString('base64'), titel);
      if (!qa) { bericht.push(`${h}: Banner-Prüfung nicht möglich — kein Upload (Bild liegt in ${jpg})`); continue; }
      if (!qa.ok) { bericht.push(`${h}: Banner-Prüfung NICHT bestanden (${qa.grund}) — kein Upload (Bild liegt in ${jpg})`); continue; }
      let status = `Banner OK (${gewaehlt.length} Fotos, Prüfung bestanden)`;
      if (LIVE) {
        if (c.image?.url) writeFileSync(`dropship/kategorie-bilder-sicherung/${h}.json`, JSON.stringify({ handle: h, url: c.image.url, altText: c.image.altText || '', gesichert: new Date().toISOString() }, null, 1));
        const bytes = readFileSync(jpg);
        const s = (await q(`mutation($in:[StagedUploadInput!]!){stagedUploadsCreate(input:$in){stagedTargets{url resourceUrl parameters{name value}} userErrors{message}}}`,
          { in: [{ filename: `pinnwand-${h}.jpg`, mimeType: 'image/jpeg', resource: 'IMAGE', httpMethod: 'POST' }] })).stagedUploadsCreate;
        const t = s.stagedTargets?.[0]; if (!t) { bericht.push(`${h}: Upload-Ziel fehlt ${JSON.stringify(s.userErrors)}`); continue; }
        const fd = new FormData(); for (const p of t.parameters) fd.append(p.name, p.value); fd.append('file', new Blob([bytes], { type: 'image/jpeg' }), `pinnwand-${h}.jpg`);
        const up = await fetch(t.url, { method: 'POST', body: fd });
        if (!up.ok && up.status !== 201 && up.status !== 204) { bericht.push(`${h}: Upload HTTP ${up.status}`); continue; }
        const u = (await q(`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}`, { i: { id: c.id, image: { src: t.resourceUrl, altText: `${titel} – ${MARKE}` } } })).collectionUpdate;
        if (u.userErrors.length) { bericht.push(`${h}: ${JSON.stringify(u.userErrors)}`); continue; }
        status += ' · hochgeladen'; appendFileSync('dropship/kategorien_ledger.txt', `${new Date().toISOString()} · pinnwand ${h}\n`);
      }
      fertig++; bericht.push(`${h}: ${status}`); console.log(`${h}: ${status}`);
      rmSync(dirF, { recursive: true, force: true });
    } catch (e) { bericht.push(`${h}: FEHLER ${String(e.message).slice(0, 120)}`); console.log(`${h}: FEHLER ${String(e.message).slice(0, 120)}`); }
  }
  await browser.close();
  console.log('\n' + bericht.join('\n'));
  writeFileSync(`${OUT}/bericht.txt`, bericht.join('\n'));
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
