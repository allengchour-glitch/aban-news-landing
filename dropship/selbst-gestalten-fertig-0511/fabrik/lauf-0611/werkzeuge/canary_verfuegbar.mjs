const SHOP = process.env.SHOPIFY_SHOP;
const { shopifyClientSecret } = await import('/home/user/aban-news-landing/automation/lib/shopify_secret.mjs');
const tr = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET), grant_type: 'client_credentials' }) });
const token = (await tr.json()).access_token;
const g = async (query) => (await (await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query }) })).json());
const a = await g(`{ product(id:"gid://shopify/Product/16697144705415"){ variants(first:20){ nodes{ sku availableForSale inventoryPolicy inventoryQuantity inventoryItem{ tracked requiresShipping } selectedOptions{ value } } } } }`);
console.log(JSON.stringify(a.errors || a.data.product.variants.nodes.map(v => [v.sku, v.availableForSale, v.inventoryPolicy, v.inventoryQuantity, v.inventoryItem.tracked, v.selectedOptions.map(o=>o.value).join('/')])));
// Vergleich: die bestehende Tasse
const b = await g(`{ productByHandle(handle:"keramik-tasse-selbst-gestalten"){ status variants(first:5){ nodes{ sku availableForSale inventoryPolicy inventoryQuantity inventoryItem{ tracked } } } } }`);
console.log('bestehende Tasse:', JSON.stringify(b.errors || b.data.productByHandle));
