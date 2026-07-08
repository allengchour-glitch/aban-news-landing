#!/usr/bin/env node
/* cj_stock_guard.mjs — CJ-Lager-Wächter (User 2026-07-08: «keine Bestellung klappt bis zum Kunden»).
 * Prüft CJ-Produkte (SKU-Muster CJ-<variantSku>) gegen /product/stock/queryBySku und DRAFTet
 * Artikel mit 0 Gesamtbestand (Tag `ausverkauft-lieferant`). Kriterium: Summe totalInventoryNum
 * über alle Lager (Fabrikbestand zählt — CJ beschafft ab Fabrik).
 * ENV: SHOPIFY_CLIENT_ID/SECRET · CJ_TOKEN (oder /tmp/cj_token.json) ·
 *      [QUERY='collection:viral-hits'] (Shopify-Suche) · [LIMIT=300] · [DRY=1] · [GAP=1600]
 * Ledger: dropship/_cj_stock_ok.txt (SKU-Kerne mit Bestand; FORCE=1 ignoriert ihn).
 * ⚠️ CJ-QPS ist konto-weit 1/s — GAP nicht unter 1200 stellen, Retry bei 429/1600200 eingebaut.
 */
import fs from 'node:fs';
const SHOP = 'au3j0y-hq.myshopify.com', API = '2025-01';
const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
let CJT = (process.env.CJ_TOKEN || '').trim();
if (!CJT && fs.existsSync('/tmp/cj_token.json')) { try { CJT = JSON.parse(fs.readFileSync('/tmp/cj_token.json', 'utf8')).accessToken || ''; } catch {} }
const QUERY = process.env.QUERY || 'tag:cj-real status:active';
const LIMIT = parseInt(process.env.LIMIT || '300', 10);
const DRY = process.env.DRY === '1';
const GAP = Math.max(1200, parseInt(process.env.GAP || '1600', 10));
const FORCE = process.env.FORCE === '1';
const LEDGER = 'dropship/_cj_stock_ok.txt';
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (!CJT || !CID || !CSEC) { console.error('Secrets fehlen (CJ_TOKEN + SHOPIFY_CLIENT_ID/SECRET)'); process.exit(1); }

async function tok() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) });
  return (await r.json()).access_token;
}
async function gql(t, q, v) {
  for (let a = 0; a < 6; a++) {
    try {
      const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': t },
        body: JSON.stringify({ query: q, variables: v }) });
      const j = await r.json();
      if (j.errors && JSON.stringify(j.errors).includes('THROTTLED')) { await sleep(3000); continue; }
      return j.data;
    } catch { await sleep(3000); }
  }
  return null;
}
async function cjStock(sku) {
  for (let a = 0; a < 6; a++) {
    try {
      const r = await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/stock/queryBySku?sku=${encodeURIComponent(sku)}`,
        { headers: { 'CJ-Access-Token': CJT } });
      const j = await r.json();
      if (j.code === 1600200 || r.status === 429) { await sleep(3000 * (a + 1)); continue; } // QPS
      if (j.code === 200 && Array.isArray(j.data)) return j.data.reduce((s, w) => s + (Number(w.totalInventoryNum) || 0), 0);
      if (j.code === 200) return 0;
      return null; // unbekannter Fehler → nicht draften
    } catch { await sleep(3000); }
  }
  return null;
}

const t = await tok(); if (!t) { console.error('kein Shopify-Token'); process.exit(1); }
const ok = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean) : []);
// Kandidaten: Collection-Query oder Tag-Query
const items = [];
if (QUERY.startsWith('collection:')) {
  const h = QUERY.split(':')[1];
  const d = await gql(t, `query($q:String!){ collections(first:1, query:$q){ edges{ node{ products(first:250){ edges{ node{ id title tags variants(first:1){edges{node{ sku }}} } } } } } } }`, { q: `handle:${h}` });
  for (const e of d.collections.edges[0]?.node.products.edges || []) items.push(e.node);
} else {
  let cursor = null;
  while (items.length < 2000) {
    const d = await gql(t, `query($c:String,$q:String!){ products(first:100, after:$c, query:$q){ pageInfo{hasNextPage endCursor} edges{ node{ id title tags variants(first:1){edges{node{ sku }}} } } } }`, { c: cursor, q: QUERY });
    const p = d?.products; if (!p) break;
    for (const e of p.edges) items.push(e.node);
    if (!p.pageInfo.hasNextPage) break;
    cursor = p.pageInfo.endCursor;
  }
}
const cands = items.filter(n => /^CJ-/i.test(n.variants.edges[0]?.node.sku || ''))
  .map(n => ({ n, core: n.variants.edges[0].node.sku.replace(/^CJ-/i, '') }))
  .filter(x => FORCE || !ok.has(x.core));
console.log(`${items.length} Produkte (${QUERY}) · ${cands.length} CJ-SKUs zu prüfen · LIMIT ${LIMIT}${DRY ? ' [DRY]' : ''}`);

let done = 0, drafted = 0, okCount = 0;
for (const { n, core } of cands) {
  if (done >= LIMIT) break;
  done++;
  const stock = await cjStock(core); await sleep(GAP);
  if (stock === null) { console.log('  ?', core.slice(0, 30), n.title.slice(0, 40)); continue; }
  if (stock > 0) { okCount++; fs.appendFileSync(LEDGER, core + '\n'); continue; }
  if (DRY) { console.log(`[DRY] DRAFT (0 Lager) | ${n.title.slice(0, 60)}`); drafted++; continue; }
  await gql(t, `mutation($i:ProductInput!){ productUpdate(input:$i){ userErrors{message} } }`,
    { i: { id: n.id, status: 'DRAFT', tags: [...new Set([...n.tags, 'ausverkauft-lieferant'])] } });
  drafted++;
  console.log(`  DRAFT (0 Lager): ${n.title.slice(0, 55)}`);
}
console.log(`FERTIG: ${done} geprüft · ${okCount} an Lager · ${drafted} → DRAFT.`);
