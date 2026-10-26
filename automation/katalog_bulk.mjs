#!/usr/bin/env node
/**
 * Katalog in einer Minute: alle aktiven Produkte (id, handle, title, productType, tags, Google-Kategorie) per Bulk-Abfrage.
 * Gleiches Dateiformat wie katalog_titel_scan.mjs (das braucht dieselbe Menge Seiten und dauert 20+ Minuten und teilt sich das Punkte-Budget).
 * NUR LESEN. Aufruf: node automation/katalog_bulk.mjs [ziel.json]   (Vorgabe /tmp/katalog_frisch.json)
 */
import { writeFileSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
const AUS = process.argv[2] || '/tmp/katalog_frisch.json';
const schlaf = ms => new Promise(r => setTimeout(r, ms));
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const lauf = (await q(`{currentBulkOperation(type:QUERY){status}}`)).currentBulkOperation;
if (lauf && ['CREATED', 'RUNNING'].includes(lauf.status)) { console.error('Es läuft schon eine Bulk-Abfrage — abwarten'); process.exit(1); }
const inner = `{ products(query:"status:active") { edges { node { id handle title productType tags g:metafield(namespace:"mm-google-shopping", key:"google_product_category"){ value } } } } }`;
const m = (await q(`mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}`, { q: inner })).bulkOperationRunQuery;
if (m.userErrors?.length) { console.error(JSON.stringify(m.userErrors)); process.exit(1); }
for (let i = 0; i < 240; i++) {
  await schlaf(10000);
  const s = (await q(`{currentBulkOperation(type:QUERY){status errorCode objectCount url}}`)).currentBulkOperation;
  if (s.status === 'COMPLETED') {
    const text = await (await fetch(s.url)).text();
    const produkte = text.split('\n').filter(Boolean).map(z => { const o = JSON.parse(z); return { id: o.id, handle: o.handle, title: o.title, productType: o.productType, tags: o.tags || [], g: o.g?.value || '' }; });
    writeFileSync(AUS, JSON.stringify({ gelesen: produkte.length, vollstaendig: produkte.length === Number(s.objectCount), produkte }));
    console.log(JSON.stringify({ gelesen: produkte.length, objekte: s.objectCount, datei: AUS })); process.exit(0);
  }
  if (['FAILED', 'CANCELED', 'EXPIRED'].includes(s.status)) { console.error('Bulk', s.status, s.errorCode); process.exit(1); }
}
console.error('Bulk-Abfrage dauert zu lange'); process.exit(1);
