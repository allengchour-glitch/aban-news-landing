#!/usr/bin/env node
/* 🛒 merchant_feed.mjs — READ-ONLY: Google-Merchant-Produktfeed (kostenlose Shopping-Listings)
 *
 * Baut aus den cj-real ACTIVE-Produkten einen Google-Merchant-konformen RSS-2.0-Feed.
 * In Google Merchant Center als „geplanter Abruf" hinterlegbar → kostenlose Shopping-Treffer.
 * NUR LESEN. No-op ohne Shopify-Creds. Output: automation/autopilot/google-merchant-feed.xml
 *
 * ENV: SHOPIFY_CLIENT_ID+SECRET (+SHOPIFY_SHOP) ODER SHOPIFY_ADMIN_TOKEN.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const OUT = path.join(ROOT, 'automation', 'autopilot', 'google-merchant-feed.xml');
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const STORE = 'https://luxestyle.ch';
const API = `https://${SHOP}/admin/api/2025-01/graphql.json`;

async function getToken() {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
  const id = process.env.SHOPIFY_CLIENT_ID, sec = process.env.SHOPIFY_CLIENT_SECRET;
  if (!id || !sec) return null;
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: id, client_secret: sec, grant_type: 'client_credentials' }) });
  return (await r.json()).access_token || null;
}
let TOKEN; const gql = async q => { for (let t = 0; t < 6; t++) { const r = await fetch(API, { method: 'POST', headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) }); const j = await r.json(); if (j.errors && JSON.stringify(j.errors).includes('Throttled')) { await new Promise(r => setTimeout(r, 2000)); continue; } return j; } };
const esc = s => String(s || '').replace(/[<>&]/g, m => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[m]));

TOKEN = await getToken();
if (!TOKEN) { console.log('Keine Shopify-Creds → No-Op.'); process.exit(0); }

const Q = after => `{products(first:50, query:"status:active tag:cj-real"${after ? `, after:"${after}"` : ''}){pageInfo{hasNextPage endCursor} edges{node{
  title handle onlineStoreUrl descriptionPlainSummary: description(truncateAt:400)
  featuredImage{url} productType vendor
  priceRangeV2{minVariantPrice{amount currencyCode}}
  variants(first:1){edges{node{availableForSale sku}}}
}}}}`;
let c = null, items = [];
while (true) {
  const p = (await gql(Q(c))).data?.products; if (!p) break;
  for (const e of p.edges) {
    const x = e.node; if (!x.featuredImage?.url) continue;
    const price = x.priceRangeV2?.minVariantPrice;
    const link = x.onlineStoreUrl || `${STORE}/products/${x.handle}`;
    const avail = x.variants.edges[0]?.node?.availableForSale !== false ? 'in stock' : 'out of stock';
    items.push(`<item>
<g:id>${esc(x.variants.edges[0]?.node?.sku || x.handle)}</g:id>
<g:title>${esc(x.title)}</g:title>
<g:description>${esc(x.descriptionPlainSummary || x.title)}</g:description>
<g:link>${esc(link)}</g:link>
<g:image_link>${esc(x.featuredImage.url)}</g:image_link>
<g:availability>${avail}</g:availability>
<g:price>${price ? `${(+price.amount).toFixed(2)} ${price.currencyCode}` : '0.00 CHF'}</g:price>
<g:condition>new</g:condition>
<g:brand>${esc(x.vendor || 'LuxeStyle')}</g:brand>
<g:product_type>${esc(x.productType || 'Mode')}</g:product_type>
<g:identifier_exists>no</g:identifier_exists>
</item>`);
  }
  if (!p.pageInfo.hasNextPage) break; c = p.pageInfo.endCursor; await new Promise(r => setTimeout(r, 300));
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
fs.writeFileSync(OUT, xml);
console.log(`✅ ${path.relative(ROOT, OUT)}: ${items.length} Produkte im Google-Merchant-Feed.`);
