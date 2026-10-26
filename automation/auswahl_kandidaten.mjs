#!/usr/bin/env node
/**
 * Auswahl-Kandidaten: welche aktiven Produkte haben im Shop EINE Variante («Default Title»), obwohl CJ meist mehrere führt?
 *
 * WARUM (26.10.2026): Der User sagte «fast alle Produkte fehlt die Auswahl». Gemessen: von 320 Produkten der Text-Charge hatten 149 leere
 * Optionen, obwohl das CJ-Datenblatt zwei bis dreissig Varianten nennt (Laufschuhe «Black-41/42/43/44» ohne Grösse!). Der Trockenlauf
 * von `cj_varianten_nachziehen.mjs` auf 11 davon: 10 mal PLAN. Der Grund, warum sie bisher durchrutschten: das Werkzeug verstand nur
 * SKUs mit 15 Ziffern (pid) — `CJYD…AZ` und `CJ-CJCS…` wurden als «keine pid» übersprungen (69 von 525).
 *
 * Liest den ganzen Katalog per Bulk-Abfrage (~1 Min, kostet keine CJ-Punkte) und schreibt die Kandidatenliste nach Priorität:
 *   Stufe 1  bewertete Produkte (≥ 4 ★)         — hier verliert eine fehlende Auswahl am meisten
 *   Stufe 2  Kleidung, Schuhe, Ringe, Uhren, Taschen — Grösse/Farbe fehlt fast immer
 *   Stufe 3  alle übrigen mit CJ-Kennung
 * Nur lesen. Aufruf: node automation/auswahl_kandidaten.mjs   (OUT=/tmp/auswahl_kandidaten.csv, NEU=1 ignoriert den Zwischenspeicher)
 */
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { strategien } from './lib/fakten_block.mjs';
import { bewertungAus } from './lib/bewertung_rang.mjs';

const CACHE = '/tmp/auswahl_bulk.jsonl', OUT = process.env.OUT || '/tmp/auswahl_kandidaten.csv';
const schlaf = ms => new Promise(r => setTimeout(r, ms));
const GROSSE_WAREN = /^Apparel & Accessories > (Clothing|Shoes|Jewelry > (Rings|Watches|Bracelets|Necklaces)|Handbags)|^Sporting Goods|^Baby & Toddler|^Toys, Kids/i;

export function stufe({ g, bewertung }) { return bewertung && bewertung.a >= 4 ? 1 : GROSSE_WAREN.test(g || '') ? 2 : 3; }
/** Ein Standard-Einzelprodukt: genau eine Variante, Option «Title»/«Default Title». Rein, getestet. */
export const istStandardEinzel = p => (p.variantsCount?.count ?? 0) === 1 && (p.options || []).every(o => /^(title|variante)$/i.test(o.name) && (o.values || []).every(v => /^(default title|standard)$/i.test(v)));
/** Hat die SKU eine CJ-Kennung, mit der sich das Produkt bei CJ finden lässt? Rein, getestet. */
export const hatCjKennung = sku => strategien(sku).length > 0 && /(\d{15,})|^(cj-)?cj[a-z0-9]{5,}$|^(cj-)?[0-9a-f]{8}-[0-9a-f]{4}-/i.test(String(sku || '').trim());

async function bulk(q) {
  if (process.env.NEU !== '1' && existsSync(CACHE) && Date.now() - statSync(CACHE).mtimeMs < 3 * 3600 * 1000) return readFileSync(CACHE, 'utf8');
  const lauf = (await q(`{currentBulkOperation(type:QUERY){status}}`)).currentBulkOperation;
  if (lauf && ['CREATED', 'RUNNING'].includes(lauf.status)) throw new Error('Es läuft schon eine Bulk-Abfrage — abwarten');
  const inner = `{ products(query:"status:active") { edges { node { id handle title tags productType updatedAt variantsCount{count} options{name values} mediaCount{count}
    gcat: metafield(namespace:"mm-google-shopping", key:"google_product_category"){value} jm: metafield(namespace:"judgeme", key:"review_widget_data"){value}
    variants(first:1){edges{node{sku}}} } } } }`;
  const m = (await q(`mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}`, { q: inner })).bulkOperationRunQuery;
  if (m.userErrors?.length) throw new Error(JSON.stringify(m.userErrors));
  for (let i = 0; i < 240; i++) {
    await schlaf(15000);
    const s = (await q(`{currentBulkOperation(type:QUERY){status errorCode url}}`)).currentBulkOperation;
    if (s.status === 'COMPLETED') { const t = await (await fetch(s.url)).text(); writeFileSync(CACHE, t); return t; }
    if (['FAILED', 'CANCELED', 'EXPIRED'].includes(s.status)) throw new Error(`Bulk ${s.status} ${s.errorCode || ''}`);
  }
  throw new Error('Bulk-Abfrage dauert zu lange');
}

async function main() {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const roh = await bulk(q);
  const produkte = new Map();
  for (const z of roh.split('\n')) {
    if (!z) continue; const o = JSON.parse(z);
    if (o.__parentId) { const p = produkte.get(o.__parentId); if (p && o.sku !== undefined) p.sku = o.sku; continue; }
    produkte.set(o.id, { ...o, g: o.gcat?.value || '', bewertung: bewertungAus(o.jm?.value) });
  }
  const alle = [...produkte.values()];
  const einzel = alle.filter(istStandardEinzel);
  const ohneKennung = einzel.filter(p => !hatCjKennung(p.sku));
  const kandidaten = einzel.filter(p => hatCjKennung(p.sku) && !(p.tags || []).includes('fortura'));
  const mitStufe = kandidaten.map(p => ({ ...p, stufe: stufe(p) }))
    .sort((a, b) => a.stufe - b.stufe || (b.bewertung?.c || 0) - (a.bewertung?.c || 0) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
  writeFileSync(OUT, mitStufe.map(p => [p.handle, p.stufe, p.sku, p.mediaCount?.count ?? '', (p.g || '').split(' > ').slice(0, 3).join(' > ')].join(';')).join('\n'));
  const z = n => mitStufe.filter(p => p.stufe === n).length;
  console.log(JSON.stringify({ aktiv: alle.length, einzelVariante: einzel.length, ohneCjKennung: ohneKennung.length, kandidaten: mitStufe.length, stufe1: z(1), stufe2: z(2), stufe3: z(3), datei: OUT }));
  const art = {}; for (const p of ohneKennung) { const k = String(p.sku || '').replace(/[0-9]+/g, 'N').replace(/[a-z]{3,}/gi, 'X').slice(0, 14); art[k] = (art[k] || 0) + 1; }
  console.log('SKU-Formen ohne CJ-Kennung:', JSON.stringify(Object.entries(art).sort((a, b) => b[1] - a[1]).slice(0, 8)));
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
