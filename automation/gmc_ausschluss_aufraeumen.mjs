#!/usr/bin/env node
/* 🧹 gmc_ausschluss_aufraeumen.mjs — räumt die Metafeld-Altlast `excluded_destination` weg.
 *
 * HINTERGRUND UND BEWEISLAGE: siehe `automation/lib/gmc_ausschluss.mjs`. Kurz: der „70 %
 * ausgeschlossen"-Befund vom 17.10. ist EINE Charge vom 17.08.2026, die für kein Produkt gilt
 * (bei der CJ-Ware sind 124 von 124 „ausgeschlossenen" Produkte auf dem Google-Kanal).
 *
 * TROCKENLAUF IST DIE VORGABE. Scharf nur mit LIVE=1.
 * Angefasst wird ausschliesslich `mm-google-shopping.excluded_destination` und nur, wenn der
 * Wert genau `["Shopping_ads"]` ist — jeder andere Wert bleibt stehen und wird genannt.
 *
 * ENV: SHOPIFY_CLIENT_ID+SECRET (+SHOPIFY_SHOP) ODER SHOPIFY_ADMIN_TOKEN
 *      PQUERY (Vorgabe 'status:active') · SCAN (Deckel, Vorgabe 3000) · MAXFIX (Deckel, 1000)
 *      SORT/REVERSE · LIVE=1
 */
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { darfWeg, NAMESPACE, KEY } from './lib/gmc_ausschluss.mjs';

const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const API = '2025-01';
const LIVE = process.env.LIVE === '1';
const PQUERY = process.env.PQUERY || 'status:active';
const SCAN = Math.min(+(process.env.SCAN || 3000), 10000);
const MAXFIX = Math.min(+(process.env.MAXFIX || 1000), 2000);
const SORT = (process.env.SORT || '').trim() || null;
const REVERSE = process.env.REVERSE === undefined ? null : process.env.REVERSE !== '0';

async function holeToken() {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
  const id = process.env.SHOPIFY_CLIENT_ID;
  const sec = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  if (!id || !sec) { console.log('ABBRUCH: SHOPIFY_CLIENT_ID oder _SECRET fehlt.'); return null; }
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: id, client_secret: sec, grant_type: 'client_credentials' }) });
  const txt = await r.text();
  let j = {}; try { j = JSON.parse(txt); } catch {}
  if (!j.access_token) { console.log(`ABBRUCH: Token HTTP ${r.status} · ${txt.slice(0, 200)}`); return null; }
  return j.access_token;
}
const TOKEN = await holeToken();
if (!TOKEN) process.exit(1);

const SEITE = `query($q:String!,$after:String,$sort:ProductSortKeys,$rev:Boolean){
  products(first:50, query:$q, after:$after, sortKey:$sort, reverse:$rev){
    pageInfo{ hasNextPage endCursor }
    nodes{ id handle title
      mf: metafield(namespace:"${NAMESPACE}", key:"${KEY}"){ id namespace key value } } } }`;

const LOESCHEN = `mutation($ids:[MetafieldIdentifierInput!]!){
  metafieldsDelete(metafields:$ids){ deletedMetafields{ key } userErrors{ field message } } }`;

const bericht = { ts: new Date().toISOString(), live: LIVE, pquery: PQUERY,
  gelesen: 0, mitFeld: 0, geloescht: 0, behalten: {}, fehler: [], abbruch: null };

let cur = null;
const stapel = [];
async function schreibe() {
  if (!stapel.length) return;
  if (!LIVE) { bericht.geloescht += stapel.length; stapel.length = 0; return; }
  const ids = stapel.map(p => ({ ownerId: p.id, namespace: NAMESPACE, key: KEY }));
  const d = await shopifyGql(SHOP, API, TOKEN, LOESCHEN, { ids });
  const ue = d?.metafieldsDelete?.userErrors || [];
  // Shopify meldet Abgelehntes in `userErrors` INNERHALB einer Erfolgsantwort — erst zählen,
  // was wirklich weg ist (dieselbe Falle wie `runMutations` im shop_brain am 18.10.).
  bericht.geloescht += (d?.metafieldsDelete?.deletedMetafields || []).length;
  for (const e of ue) bericht.fehler.push(`${e.field}: ${e.message}`);
  stapel.length = 0;
}

try {
  while (bericht.gelesen < SCAN) {
    const d = await shopifyGql(SHOP, API, TOKEN, SEITE,
      { q: PQUERY, after: cur, sort: SORT, rev: REVERSE });
    const p = d?.products;
    if (!p) { bericht.abbruch = `keine Produktdaten: ${JSON.stringify(d).slice(0, 200)}`; break; }
    for (const x of p.nodes) {
      bericht.gelesen++;
      if (!x.mf) continue;
      bericht.mitFeld++;
      const u = darfWeg(x.mf);
      if (!u.weg) { bericht.behalten[u.grund] = (bericht.behalten[u.grund] || 0) + 1; continue; }
      if (bericht.geloescht + stapel.length >= MAXFIX) break;
      stapel.push(x);
      if (stapel.length >= 25) await schreibe();
    }
    await schreibe();
    if (bericht.geloescht >= MAXFIX || !p.pageInfo.hasNextPage) break;
    cur = p.pageInfo.endCursor;
  }
  await schreibe();
} catch (e) { bericht.abbruch = String(e?.message || e); }

console.log(JSON.stringify(bericht, null, 2));
if (!LIVE) console.log('\n(Trockenlauf — nichts geändert. Mit LIVE=1 wird das Metafeld entfernt.)');
