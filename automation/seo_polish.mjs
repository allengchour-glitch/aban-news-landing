#!/usr/bin/env node
/* LuxeStyle — seo_polish.mjs : LANGSAME autonome Shop-Politur (User 2026-06-19 „langsam alles, Merchant").
 * Fuellt LEERE SEO-Meta-Beschreibungen (SEO + Google/Bing-Merchant-Feed-Gewinn). Idempotent (nur leere),
 * gedrosselt (MAX/Lauf), resuemierbar. Fasst KEINE Kategorie/Theme an (= ChatGPT-Session).
 * Token via Client-Credentials (SHOPIFY_CLIENT_ID/SECRET) ODER SHOPIFY_TOKEN. No-op ohne Creds.
 * ENV: SHOPIFY_SHOP=au3j0y-hq.myshopify.com · MAX=20
 */
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const MAX = parseInt(process.env.MAX || '20', 10);
const API = `https://${SHOP}/admin/api/2025-01/graphql.json`;
const log = (...a) => console.log(...a);
async function token() {
  if (process.env.SHOPIFY_TOKEN) return process.env.SHOPIFY_TOKEN;
  const id = process.env.SHOPIFY_CLIENT_ID, sec = process.env.SHOPIFY_CLIENT_SECRET;
  if (!id || !sec) return '';
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: id, client_secret: sec, grant_type: 'client_credentials' }) });
  return (await r.json()).access_token || '';
}
async function gql(tok, query, variables) {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query, variables }) });
  return r.json();
}
function seoDesc(p) {
  const t = p.title.length > 60 ? p.title.slice(0, 60) : p.title;
  const v = p.vendor && !t.includes(p.vendor) ? `${p.vendor} ` : '';
  let s = `${t} – ${v}jetzt im Schweizer Shop LuxeStyle. Gratis Versand ab CHF 49, 30 Tage Rückgabe, TWINT & Karte. –10% mit WELCOME10.`;
  return s.slice(0, 160);
}
(async () => {
  const tok = await token();
  if (!tok) { log('seo_polish: kein Shopify-Token (SHOPIFY_CLIENT_ID/SECRET) → No-op.'); process.exit(0); }
  const q = `query($c:String){ products(first:30, query:"status:active", after:$c){ edges{ cursor node{ id title vendor seo{ description } } } pageInfo{ hasNextPage } } } }`;
  let cursor = null, done = 0, scanned = 0;
  for (let page = 0; page < 60 && done < MAX; page++) {
    const j = await gql(tok, q, { c: cursor });
    const edges = j?.data?.products?.edges || []; if (!edges.length) break;
    for (const e of edges) {
      scanned++; cursor = e.cursor;
      if (e.node.seo?.description) continue;            // schon gefuellt → skip (idempotent)
      const desc = seoDesc(e.node);
      const m = await gql(tok, `mutation($id:ID!,$d:String!){ productUpdate(input:{id:$id, seo:{description:$d}}){ userErrors{message} } }`, { id: e.node.id, d: desc });
      const err = m?.data?.productUpdate?.userErrors?.[0]?.message;
      if (!err) { done++; log(`✓ ${e.node.title.slice(0, 45)}`); } else log(`✗ ${err}`);
      if (done >= MAX) break;
      await new Promise(r => setTimeout(r, 600));        // gedrosselt
    }
    if (!j?.data?.products?.pageInfo?.hasNextPage) break;
  }
  log(`seo_polish fertig: ${done} SEO-Beschreibungen gefuellt (von ${scanned} geprueft).`);
})();
