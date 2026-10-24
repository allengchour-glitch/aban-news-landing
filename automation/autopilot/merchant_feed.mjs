#!/usr/bin/env node
/* 🛒 merchant_feed.mjs — NUR LESEN: Google-Merchant-Produktfeed (kostenlose Shopping-Einträge)
 *
 * Baut aus den aktiven Produkten einen RSS-2.0-Feed nach Google-Merchant-Schema.
 * In Google Merchant Center als „geplanter Abruf" hinterlegbar.
 * Ausgabe: automation/autopilot/google-merchant-feed.xml
 *
 * WAS SICH AM 2026-10-17 GEÄNDERT HAT (gemessen, Bericht dropship/GOOGLE-MERCHANT-STAND-1710.md):
 *  - Der Feed schrieb bei JEDEM Artikel `identifier_exists: no` — dabei tragen **84 % der
 *    Fortura-Artikel einen Barcode (GTIN)**. Jetzt: echte GTIN, sonst Marke+MPN, erst dann `no`.
 *  - `google_product_category` fehlte komplett, obwohl **100 % der zuletzt geänderten 600
 *    Produkte** das Metafeld `mm-google-shopping.google_product_category` haben.
 *  - Gefiltert wurde nur über eine Titel-Liste; die Sperrtags des Katalogs
 *    (`nicht-google-bewerben`, `gmc-adult-pull`, `google-policy-flag` …) las niemand.
 *  - Versandangabe fehlte — Merchant Center meldete „Missing shipping info in some countries".
 *  - Bei Drosselung gab der Lauf still auf; jetzt `shopifyGql` mit wachsenden Pausen.
 *
 * REGEL: Dieser Lauf darf aussteigen, aber er muss den Grund nennen (Status + Antworttext).
 *
 * ENV: SHOPIFY_CLIENT_ID+SECRET (+SHOPIFY_SHOP) ODER SHOPIFY_ADMIN_TOKEN.
 *      FEED_QUERY (mehrere Abfragen mit `||` trennen) · SCAN (Deckel je Abfrage, Vorgabe 6000)
 *      SORT (ProductSortKeys, z. B. CREATED_AT) · REVERSE (0/1) · VERSAND_LAND/VERSAND_PREIS · OUT
 */
import fs from 'node:fs';
import path from 'node:path';
import { shopifyClientSecret } from '../lib/shopify_secret.mjs';
import { shopifyGql } from '../lib/shopify_gql.mjs';
import { feedItem, pruefeProdukt } from '../lib/gmc_feed_item.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const OUT = process.env.OUT || path.join(ROOT, 'automation', 'autopilot', 'google-merchant-feed.xml');
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const API = '2025-01';
const STORE = 'https://luxestyle.ch';
const SCAN = +(process.env.SCAN || 6000);
const VERSAND = { versandLand: process.env.VERSAND_LAND || 'CH', versandPreis: +(process.env.VERSAND_PREIS ?? 7) };
// Vorgabe bewusst NICHT „nur was schon auf dem Google-Kanal liegt": der Feed ist genau der Weg
// für die Artikel, die dort fehlen. Gemessen 17.10.: 1890 aktive Produkte sind nicht auf
// „Google & YouTube", 1689 davon ohne jeden Sperrtag, und 1604 von diesen sind Fortura-Ware aus
// dem Schweizer Lager mit echtem Barcode (97 % GTIN) — das beste Shopping-Material des Shops.
// Die Sperrtags und der Marken-/Safety-Filter in `gmc_feed_item.mjs` halten den Rest draussen.
// MEHRERE ABFRAGEN, weil EIN Fenster nicht reicht (gemessen 24.10.): ohne Sortierung beginnt
// jeder Lauf am selben Katalogende und erreicht die Fortura-Ware nie — genau die mit den
// Barcodes. Darum `FEED_QUERY` mit `||` trennbar; jede Abfrage bekommt ihr eigenes SCAN-Fenster,
// Dubletten fallen ueber `ids` weg. Dieselbe Fensterfalle wie beim SEO-Titel-Lauf.
const QUERIES = (process.env.FEED_QUERY || 'status:active||status:active AND tag:fortura')
  .split('||').map(q => q.trim()).filter(Boolean);
// Ohne SORT entscheidet Shopify (Vorgabe) — das ist der alte Lauf, unveraendert.
const SORT = (process.env.SORT || '').trim() || null;
const REVERSE = process.env.REVERSE === undefined ? null : process.env.REVERSE !== '0';

async function holeToken() {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
  const id = process.env.SHOPIFY_CLIENT_ID;
  const sec = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  if (!id || !sec) { console.log('ABBRUCH: SHOPIFY_CLIENT_ID oder _SECRET fehlt (kein Token holbar).'); return null; }
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: id, client_secret: sec, grant_type: 'client_credentials' }) });
  const txt = await r.text();
  let j = {}; try { j = JSON.parse(txt); } catch {}
  if (!j.access_token) {
    console.log(`ABBRUCH: Token-Anfrage HTTP ${r.status} · Antwort ${txt.slice(0, 200)} · Secret-Länge ${sec.length}`);
    return null;
  }
  return j.access_token;
}

const TOKEN = await holeToken();
if (!TOKEN) process.exit(1);

const SEITE = `query($q:String!,$after:String,$sort:ProductSortKeys,$rev:Boolean){
  products(first:50, query:$q, after:$after, sortKey:$sort, reverse:$rev){
  pageInfo{ hasNextPage endCursor }
  edges{ node{
    title handle onlineStoreUrl vendor productType tags
    beschreibung: description(truncateAt:900)
    featuredImage{ url }
    media(first:4){ edges{ node{ preview{ image{ url } } } } }
    mf: metafields(first:12, namespace:"mm-google-shopping"){ edges{ node{ key value } } }
    variants(first:1){ edges{ node{ sku barcode price compareAtPrice availableForSale } } }
  } }
} }`;

let gesehen = 0;
const items = [];
const ids = new Set();
const gruende = new Map();
const jeAbfrage = [];
for (const QUERY of QUERIES) {
 let cursor = null, nQ = 0, vorher = items.length;
 while (nQ < SCAN) {
  const daten = await shopifyGql(SHOP, API, TOKEN, SEITE,
    { q: QUERY, after: cursor, sort: SORT, rev: REVERSE });
  const p = daten?.products;
  if (!p) { console.log(`ABBRUCH: keine Produktdaten · ${JSON.stringify(daten).slice(0, 200)}`); process.exit(1); }
  for (const e of p.edges) {
    const x = e.node; gesehen++; nQ++;
    const mf = Object.fromEntries(x.mf.edges.map(m => [m.node.key, m.node.value]));
    const v = x.variants.edges[0]?.node || {};
    const bilder = x.media.edges.map(m => m.node.preview?.image?.url).filter(Boolean);
    const produkt = {
      // ID = handle, NICHT die SKU: gemessen 17.10. teilten sich 450 von 3932 Artikeln eine SKU
      // (CJ vergibt dieselbe Varianten-SKU mehrfach). Google weist einen Feed mit doppelten IDs
      // ab — der alte Generator schrieb `sku || handle` und hätte genau das geliefert.
      id: x.handle, sku: v.sku, handle: x.handle, gtin: v.barcode,
      titel: x.title, beschreibung: x.beschreibung || x.title,
      link: x.onlineStoreUrl || `${STORE}/products/${x.handle}`,
      bild: x.featuredImage?.url, weitereBilder: bilder.filter(u => u !== x.featuredImage?.url),
      preis: v.price, vergleichspreis: v.compareAtPrice, waehrung: 'CHF',
      verfuegbar: v.availableForSale !== false,
      marke: x.vendor || 'LuxeStyle', produktTyp: x.productType, tags: x.tags,
      googleKategorie: mf.google_product_category, altersgruppe: mf.age_group,
      geschlecht: mf.gender, zustand: mf.condition || 'new', gruppe: x.handle,
    };
    const urteil = pruefeProdukt(produkt);
    if (!urteil.ok) {
      const schlagwort = urteil.grund.startsWith('Sperrtag') ? 'Sperrtag' : urteil.grund;
      gruende.set(schlagwort, (gruende.get(schlagwort) || 0) + 1);
      continue;
    }
    if (ids.has(produkt.id)) { gruende.set('doppelte ID', (gruende.get('doppelte ID') || 0) + 1); continue; }
    ids.add(produkt.id);
    items.push(feedItem(produkt, VERSAND));
  }
  if (!p.pageInfo.hasNextPage) break;
  cursor = p.pageInfo.endCursor;
 }
 jeAbfrage.push({ query: QUERY, gelesen: nQ, neu: items.length - vorher, gedeckelt: nQ >= SCAN });
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>LuxeStyle CH — Produktfeed</title>
<link>${STORE}</link>
<description>LuxeStyle Schweizer Mode-Shop — Google-Merchant-Feed</description>
${items.join('\n')}
</channel>
</rss>`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, xml);
const mitGtin = items.filter(i => i.includes('<g:gtin>')).length;
const mitKat = items.filter(i => i.includes('<g:google_product_category>')).length;
console.log(`✅ ${path.relative(ROOT, OUT)}: ${items.length} Artikel von ${gesehen} geprüften.`);
console.log(`   davon mit GTIN ${mitGtin} · mit google_product_category ${mitKat}`);
// Die gelaufene Region MIT nennen: eine Zahl ohne sie laedt zum Fehlschluss ein,
// der Lauf habe den ganzen Katalog gesehen.
console.log(`   Sortierung: ${SORT || 'Shopify-Vorgabe'}${REVERSE === null ? '' : REVERSE ? ' (rueckwaerts)' : ' (vorwaerts)'}`);
for (const a of jeAbfrage) console.log(`   Abfrage «${a.query}»: ${a.gelesen} gelesen` +
  `${a.gedeckelt ? ` (Teilmessung, Deckel ${SCAN})` : ''} · ${a.neu} neu im Feed`);
for (const [grund, n] of [...gruende].sort((a, b) => b[1] - a[1])) console.log(`   ausgelassen · ${grund}: ${n}`);
