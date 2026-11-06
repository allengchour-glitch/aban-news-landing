const SHOP = process.env.SHOPIFY_SHOP;
const { shopifyClientSecret } = await import('/home/user/aban-news-landing/automation/lib/shopify_secret.mjs');
const tr = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET), grant_type: 'client_credentials' }) });
const token = (await tr.json()).access_token;
const gql = async (q, v) => { const r = await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query: q, variables: v }) }); const j = await r.json(); if (j.errors) throw new Error(JSON.stringify(j.errors)); return j.data; };
const d = await gql(`query($id:ID!){ product(id:$id){ id handle title status tags vendor productType onlineStoreUrl onlineStorePreviewUrl
  resourcePublicationsV2(first:20){ nodes{ isPublished publication{ name } } }
  seo{ title description } options{ name values } totalInventory
  collections(first:10){ nodes{ handle } }
  variants(first:20){ nodes{ id sku price inventoryPolicy image{ id } selectedOptions{ name value } } }
  media(first:20){ nodes{ id status } }
  descriptionHtml } }`, { id: 'gid://shopify/Product/16697144705415' });
const p = d.product;
const out = { ...p, descriptionHtml: undefined, descriptionLaenge: p.descriptionHtml.length, variants: p.variants.nodes.length, medien: p.media.nodes.map((m) => m.status) };
console.log(JSON.stringify(out, null, 1));
import('node:fs').then((fs) => fs.writeFileSync(process.argv[2], p.descriptionHtml));
console.log(p.variants.nodes.slice(0, 3).map((v) => `${v.sku} ${v.price} ${v.inventoryPolicy} ${JSON.stringify(v.selectedOptions)} bild=${!!v.image}`).join('\n'));
