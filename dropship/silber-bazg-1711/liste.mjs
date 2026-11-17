#!/usr/bin/env node
// NUR LESEN. Liest alle aktiven Produkte (Bulk, ~1 Minute) und schreibt die Liste der Produkte mit «925» im Titel nach liste.json.
//   node dropship/silber-bazg-1711/liste.mjs            (Vorgabe: liste.json neben dieser Datei; LISTE=<Pfad> ändert das Ziel)
// Die Suche `title:*925*` ist NICHT zuverlässig (fand am 17.11. 129 statt 207: «S925…» wird nicht getroffen): darum der ganze Katalog.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
import { waehleAusKatalog, MARKER } from './lib.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const AUS = process.env.LISTE || join(HIER, 'liste.json');
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const schlaf = (ms) => new Promise((r) => setTimeout(r, ms));
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const lauf = (await q(`{currentBulkOperation(type:QUERY){status}}`)).currentBulkOperation;
if (lauf && ['CREATED', 'RUNNING'].includes(lauf.status)) { console.error('Es läuft schon eine Bulk-Abfrage, abwarten'); process.exit(1); }
const inner = `{ products(query:"status:active") { edges { node { id handle title productType tags } } } }`;
const m = (await q(`mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}`, { q: inner })).bulkOperationRunQuery;
if (m.userErrors?.length) { console.error(JSON.stringify(m.userErrors)); process.exit(1); }
for (let i = 0; i < 240; i++) {
  await schlaf(10000);
  const s = (await q(`{currentBulkOperation(type:QUERY){status errorCode objectCount url}}`)).currentBulkOperation;
  if (s.status === 'COMPLETED') {
    const text = await (await fetch(s.url)).text();
    const alle = text.split('\n').filter(Boolean).map((z) => JSON.parse(z));
    if (alle.length !== Number(s.objectCount)) { console.error(`Unvollständig: ${alle.length} von ${s.objectCount}`); process.exit(1); }
    const eintraege = waehleAusKatalog(alle);
    const schonErfasst = alle.filter((p) => (p.tags || []).includes(MARKER)).length;
    writeFileSync(AUS, JSON.stringify({ gelesenAktiv: alle.length, erzeugt: new Date().toISOString(), schonMitArbeitsTag: schonErfasst, anzahl: eintraege.length, eintraege }, null, 1));
    console.log(JSON.stringify({ gelesenAktiv: alle.length, anzahl: eintraege.length, schonMitArbeitsTag: schonErfasst, datei: AUS }));
    process.exit(0);
  }
  if (['FAILED', 'CANCELED', 'EXPIRED'].includes(s.status)) { console.error('Bulk', s.status, s.errorCode); process.exit(1); }
}
console.error('Bulk-Abfrage dauert zu lange'); process.exit(1);
