#!/usr/bin/env node
/**
 * feed_ready.mjs — macht BigBuy-Produkte automatisch GOOGLE-FEED-FERTIG.
 *
 * Codifiziert die manuelle Feed-Arbeit (2026-06-15): für jedes `tag:bigbuy`-Produkt ohne
 * Barcode / Kategorie setzt es:
 *   - EAN13-Barcode (aus BigBuy `ean13`, gematcht über SKU `bb-<bigbuysku>`)
 *   - Google-Produktkategorie (nach productType-Bucket)
 * Marke = `vendor` wird beim Import schon gesetzt. Markenartikel ohne GTIN werden in
 * Google Shopping oft abgelehnt → dieses Skript schliesst die Lücke automatisch.
 *
 * ENV (transient, NIE committen — als GitHub-Secrets nutzen):
 *   SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET   (Client-Credentials-Grant)
 *   ODER SHOPIFY_TOKEN (direkter Admin-API-Token)
 *   BIGBUY_TOKEN  (für EAN-Lookup; Header Authorization: Bearer)
 * Lauf:  node automation/feed_ready.mjs        (live)   ·   DRY=1 …  (nur Report)
 *
 * Idempotent: überspringt Produkte, die Barcode + Kategorie schon haben.
 */
const SHOP = process.env.SHOPIFY_SHOP, CID = process.env.SHOPIFY_CLIENT_ID, SEC = process.env.SHOPIFY_CLIENT_SECRET;
const BB = process.env.BIGBUY_TOKEN, DRY = process.env.DRY === '1', API = '2025-01';
// productType → Shopify Standard-Taxonomie (Google Product Category mapped automatisch)
const CAT = {
  'Parfum': 'gid://shopify/TaxonomyCategory/hb-3-2-8',
  'Uhren': 'gid://shopify/TaxonomyCategory/aa-6-11',
  'Schmuck': 'gid://shopify/TaxonomyCategory/aa-6',
  'Sonnenbrillen': 'gid://shopify/TaxonomyCategory/aa-2-27',
  'Taschen & Rucksäcke': 'gid://shopify/TaxonomyCategory/aa-5-4',
  'Beauty': 'gid://shopify/TaxonomyCategory/hb-3-2-9',
};

async function shToken() {
  if (process.env.SHOPIFY_TOKEN) return process.env.SHOPIFY_TOKEN;
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: SEC, grant_type: 'client_credentials' }) });
  if (!r.ok) throw new Error('shopify token grant failed: ' + r.status);
  return (await r.json()).access_token;
}
async function gql(tok, query, variables) {
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
    headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }) });
  const j = await r.json(); if (j.errors) throw new Error(JSON.stringify(j.errors)); return j.data;
}
async function bbGet(u) { for (let i=0;i<3;i++){ try { return await (await fetch(u,{headers:{Authorization:'Bearer '+BB}})).json(); } catch { await new Promise(r=>setTimeout(r,2000)); } } }

// EAN-Map aus den Premium-Wurzeln (idempotent gecacht im Lauf)
async function buildEanMap() {
  const map = {}; const roots = [19650,19662,19667,19654,19668];
  for (const root of roots) for (let pg=1; pg<=8; pg++) {
    const d = await bbGet(`https://api.bigbuy.eu/rest/catalog/products.json?parentTaxonomy=${root}&page=${pg}&pageSize=200`);
    if (!Array.isArray(d) || !d.length) break;
    for (const p of d) if (p.sku && p.ean13) map[p.sku] = p.ean13;
    if (d.length < 200) break;
  }
  return map;
}

(async () => {
  const tok = await shToken();
  let cursor = null, prods = [];
  do {
    const d = await gql(tok, `query($c:String){ products(first:100, query:"tag:bigbuy", after:$c){ pageInfo{hasNextPage endCursor} edges{ node{ id productType category{id} variants(first:10){nodes{id sku barcode}} } } } }`, { c: cursor });
    prods.push(...d.products.edges.map(e=>e.node));
    cursor = d.products.pageInfo.hasNextPage ? d.products.pageInfo.endCursor : null;
  } while (cursor);
  console.log('bigbuy products:', prods.length);
  const ean = BB ? await buildEanMap() : {};
  let fixedCat=0, fixedBar=0;
  for (const p of prods) {
    // category
    const want = CAT[p.productType];
    if (want && (!p.category || p.category.id !== want)) {
      if (!DRY) await gql(tok, `mutation($id:ID!,$c:ID!){ productUpdate(input:{id:$id, category:$c}){ userErrors{message} } }`, { id:p.id, c:want });
      fixedCat++;
    }
    // barcode
    const needBar = p.variants.nodes.filter(v=>!v.barcode);
    if (BB && needBar.length) {
      for (const v of needBar) {
        const raw = (v.sku||'').replace(/^bb-/,'').replace(/-(XS|S|M|L|XL|XXL|EU ?\d+)$/i,'');
        const e = ean[raw];
        if (e) { if (!DRY) await gql(tok, `mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$pid, variants:$v){ userErrors{message} } }`, { pid:p.id, v:[{id:v.id, barcode:e}] }); fixedBar++; }
      }
    }
  }
  console.log(`${DRY?'[DRY] ':''}category set: ${fixedCat} · barcodes set: ${fixedBar}`);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
