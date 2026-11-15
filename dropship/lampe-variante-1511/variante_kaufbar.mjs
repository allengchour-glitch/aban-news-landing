// FÜR DIE HAUPTSITZUNG (nicht von der Szenen-Korrektur ausgeführt): Ausführung 55889781162369 («Stecker quadratisch, 1 PC»)
// wie die 13 kaufbaren Geschwister-Varianten ohne Bestandsführung führen (inventoryItem.tracked = false).
// Befund 12.11. 00:31 UTC: Admin availableForSale=true, CONTINUE, tracked=true, «Shop location» −1, «cjdropshipping» 12 338;
// Storefront /products/…js available=false (00:42 UTC). Ursache unbekannt; Hypothese: Bestandsführung über zwei Standorte.
//   node korrektur/variante_kaufbar.mjs            Trockenlauf (liest, schreibt nichts)
//   LIVE=1 node korrektur/variante_kaufbar.mjs     setzt tracked=false, liest zurück, Sicherung in variante_vorher.json
//   ZURUECK=1 LIVE=1 node korrektur/variante_kaufbar.mjs   setzt tracked wieder auf den gesicherten Wert
// Danach (nicht hier): https://luxestyle.ch/products/led-wasserwellen-projektionsleuchte-677504.js lesen, available der Variante prüfen.
import fs from 'node:fs'; import path from 'node:path';
const shop = process.env.SHOPIFY_SHOP;
const tok = (await (await fetch(`https://${shop}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) })).json()).access_token;
const gql = async (query, variables) => { const r = await (await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query, variables }) })).json(); if (r.errors) throw new Error(JSON.stringify(r.errors)); return r.data; };
const HIER = path.dirname(new URL(import.meta.url).pathname);
const SICHERUNG = path.join(HIER, 'variante_vorher.json');
const VID = 'gid://shopify/ProductVariant/55889781162369';
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const lesen = async () => (await gql(`query($id:ID!){productVariant(id:$id){id title sku availableForSale inventoryPolicy inventoryQuantity inventoryItem{id tracked}}}`, { id: VID })).productVariant;
const v = await lesen();
console.log(new Date().toISOString(), 'IST', JSON.stringify(v));
let soll;
if (ZURUECK) { const s = JSON.parse(fs.readFileSync(SICHERUNG, 'utf8')); soll = s.inventoryItem.tracked; }
else soll = false;
if (v.inventoryItem.tracked === soll) { console.log('nichts zu tun: tracked ist schon', soll); process.exit(0); }
console.log('PLAN: inventoryItemUpdate', v.inventoryItem.id, '{ tracked:', soll, '}');
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
if (!ZURUECK) fs.writeFileSync(SICHERUNG, JSON.stringify(v, null, 1));
const r = (await gql(`mutation($id:ID!,$i:InventoryItemInput!){inventoryItemUpdate(id:$id,input:$i){inventoryItem{id tracked} userErrors{field message}}}`, { id: v.inventoryItem.id, i: { tracked: soll } })).inventoryItemUpdate;
if (r.userErrors?.length) { console.error('userErrors', JSON.stringify(r.userErrors)); process.exit(3); }
await new Promise((x) => setTimeout(x, 3000));
const n = await lesen();
console.log(new Date().toISOString(), 'NACH', JSON.stringify(n), n.inventoryItem.tracked === soll ? 'GLEICH' : 'ABWEICHUNG');
process.exit(n.inventoryItem.tracked === soll ? 0 : 6);
