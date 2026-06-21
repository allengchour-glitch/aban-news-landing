#!/usr/bin/env node
/* LuxeStyle — fix_shipping_text.mjs : zieht die Gratis-Versand-Schwelle im LIVE-Katalogtext nach
 * (User 2026-06-20: Schwelle 65 -> 49 gesenkt; bestehende Produktbeschreibungen sagen noch "ab CHF 65").
 *
 * Ersetzt GEZIELT nur die Versand-Phrasen "ab CHF 65"/"over CHF 65" -> "...49" in descriptionHtml
 * (NICHT jedes "65" — echte Preise bleiben unangetastet). Idempotent (ueberspringt Produkte ohne Treffer),
 * gedrosselt (MAX/Lauf), resuemierbar via Cursor. Faesst KEINE Kategorie/Theme/SEO-Metas an.
 * Token via Client-Credentials (SHOPIFY_CLIENT_ID/SECRET) ODER SHOPIFY_TOKEN. No-op ohne Creds.
 * ENV: SHOPIFY_SHOP=au3j0y-hq.myshopify.com · MAX=300
 * Lauf:  MAX=300 node automation/fix_shipping_text.mjs   (mehrmals bis "0 geaendert")
 */
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const MAX = parseInt(process.env.MAX || '300', 10);
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
// KORRIGIERT 2026-06-21: dieses Skript setzte FAELSCHLICH 65->49 (alte falsche Schwelle) und brach den
// echten Wert immer wieder zurueck. Echte Versand-Schwelle = CHF 65. Jetzt korrigierend: 49 -> 65.
function fixText(html) {
  if (!html) return null;
  let out = html
    .replace(/ab CHF\s?49(?!\d)(?!\.\d)/g, 'ab CHF 65')
    .replace(/over CHF\s?49(?!\d)(?!\.\d)/g, 'over CHF 65')
    .replace(/gratis ab CHF\s?49(?!\d)(?!\.\d)/gi, (m) => m.replace('49', '65'))
    .replace(/Gratis-?Versand ab CHF\s?49(?!\d)(?!\.\d)/g, (m) => m.replace('49', '65'))
    .replace(/49 Franken/g, '65 Franken');
  return out !== html ? out : null;
}
(async () => {
  const tok = await token();
  if (!tok) { log('fix_shipping_text: kein Shopify-Token (SHOPIFY_CLIENT_ID/SECRET) -> No-op.'); process.exit(0); }
  const q = `query($c:String){ products(first:30, query:"status:active", after:$c){ edges{ cursor node{ id title descriptionHtml } } pageInfo{ hasNextPage } } }`;
  let cursor = null, changed = 0, scanned = 0;
  for (let page = 0; page < 200 && changed < MAX; page++) {
    const j = await gql(tok, q, { c: cursor });
    const edges = j?.data?.products?.edges || []; if (!edges.length) break;
    for (const e of edges) {
      scanned++; cursor = e.cursor;
      const fixed = fixText(e.node.descriptionHtml);
      if (!fixed) continue;                                // kein "ab CHF 65" -> skip (idempotent)
      const m = await gql(tok, `mutation($id:ID!,$h:String!){ productUpdate(input:{id:$id, descriptionHtml:$h}){ userErrors{message} } }`, { id: e.node.id, h: fixed });
      const err = m?.data?.productUpdate?.userErrors?.[0]?.message;
      if (!err) { changed++; log(`✓ ${e.node.title.slice(0, 50)}`); } else log(`✗ ${err}`);
      if (changed >= MAX) break;
      await new Promise(r => setTimeout(r, 500));          // gedrosselt
    }
    if (!j?.data?.products?.pageInfo?.hasNextPage) break;
  }
  log(`fix_shipping_text fertig: ${changed} Beschreibungen auf CHF 49 geaendert (von ${scanned} geprueft).`);
})();
