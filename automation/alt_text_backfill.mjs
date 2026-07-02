#!/usr/bin/env node
/* LuxeStyle — alt_text_backfill.mjs : fuellt LEERE Bild-Alt-Texte (Reichweite via Google-Bildersuche +
 * Accessibility + SEO-Signal). Idempotent (nur leere Alt), gedrosselt (MAX Produkte/Lauf), resuemierbar.
 * Muster wie seo_polish.mjs. Fasst KEINE Kategorie/Theme/Bilder selbst an - nur den alt-Text der Medien.
 * Token via Client-Credentials (SHOPIFY_CLIENT_ID/SECRET) ODER SHOPIFY_TOKEN. No-op ohne Creds.
 * ENV: SHOPIFY_SHOP=au3j0y-hq.myshopify.com · MAX=40
 */
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const MAX = parseInt(process.env.MAX || '40', 10);
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
// Kurzer, keyword-reicher, ehrlicher Alt-Text (<=125 Zeichen), mehrere Bilder mit Index.
function altFor(p, idx, total) {
  let base = p.title.replace(/\s+/g, ' ').trim();
  const v = p.vendor && !base.toLowerCase().includes(p.vendor.toLowerCase()) ? `${p.vendor} ` : '';
  let s = `${v}${base} – LuxeStyle Schweiz`;
  if (total > 1) s = `${v}${base} – Bild ${idx + 1} – LuxeStyle Schweiz`;
  return s.length > 125 ? s.slice(0, 122) + '…' : s;
}

(async () => {
  const tok = await token();
  if (!tok) { log('alt_text_backfill: kein Shopify-Token (SHOPIFY_CLIENT_ID/SECRET) → No-op.'); process.exit(0); }
  const q = `query($c:String){ products(first:25, query:"status:active", after:$c){ edges{ cursor node{ id title vendor media(first:12){ edges{ node{ ... on MediaImage{ id image{ altText } } } } } } } pageInfo{ hasNextPage } } }`;
  let cursor = null, done = 0, scanned = 0, imgs = 0;
  for (let page = 0; page < 80 && done < MAX; page++) {
    const d = await gql(tok, q, { c: cursor });
    const edges = d?.data?.products?.edges || [];
    if (!edges.length) break;
    for (const e of edges) {
      scanned++;
      const media = (e.node.media?.edges || []).map(x => x.node).filter(n => n && n.id);
      const empty = media.filter(m => !(m.image?.altText || '').trim());
      if (!empty.length) { cursor = e.cursor; continue; }
      const updates = empty.map((m, i) => ({ id: m.id, alt: altFor(e.node, media.indexOf(m), media.length) }));
      const mut = `mutation($pid:ID!,$m:[UpdateMediaInput!]!){ productUpdateMedia(productId:$pid, media:$m){ mediaUserErrors{ field message } } }`;
      const r = await gql(tok, mut, { pid: e.node.id, m: updates });
      const err = r?.data?.productUpdateMedia?.mediaUserErrors?.[0]?.message || r?.errors?.[0]?.message;
      if (err) { log(`  ! ${e.node.title.slice(0,40)}: ${err}`); } else { done++; imgs += updates.length; }
      cursor = e.cursor;
      if (done >= MAX) break;
      await new Promise(r => setTimeout(r, 350)); // throttling
    }
    if (!d?.data?.products?.pageInfo?.hasNextPage) break;
  }
  log(`alt_text_backfill fertig: ${done} Produkte / ${imgs} Bilder mit Alt-Text versehen (von ${scanned} geprueft, MAX=${MAX}).`);
})();
