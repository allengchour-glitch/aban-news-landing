// Lampen-Variante 55889781162369 aus dem Versandprofil «Shopify Collective» (0 Versandzonen) ins «Allgemeine Profil» verschieben.
// Befund 15.11. 22:1x UTC: Admin availableForSale=true, Shop zeigt «ausverkauft» (JSON-LD OutOfStock, .js available=false);
// die 17 Geschwister-Varianten und die Gegenprobe Hängematte liegen im Allgemeinen Profil und sind kaufbar.
// Trockenlauf Vorgabe · LIVE=1 schreibt (deliveryProfileUpdate variantsToAssociate), liest zurück
// ZURUECK=1 LIVE=1 legt die Variante wieder ins Collective-Profil (Sicherung variante_profil_vorher.json)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const V = 'gid://shopify/ProductVariant/55889781162369';
const ALLG = 'gid://shopify/DeliveryProfile/132124180865', COLL = 'gid://shopify/DeliveryProfile/132495966593';
const SICH = new URL('./variante_profil_vorher.json', import.meta.url).pathname;
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const shop = process.env.SHOPIFY_SHOP;
const tok = (await (await fetch(`https://${shop}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) })).json()).access_token;
const gql = async (query, variables) => { const r = await (await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query, variables }) })).json(); if (r.errors) throw new Error(JSON.stringify(r.errors)); return r.data; };
const lesen = async () => (await gql(`query($id:ID!){productVariant(id:$id){id title availableForSale deliveryProfile{id name}}}`, { id: V })).productVariant;
const v = await lesen();
console.log('VORHER', JSON.stringify(v));
const ziel = ZURUECK ? COLL : ALLG;
if (!ZURUECK && v.deliveryProfile?.id !== COLL) { console.log('nichts zu tun: Variante liegt nicht im Collective-Profil'); process.exit(0); }
if (ZURUECK && !existsSync(SICH)) { console.error('keine Sicherung'); process.exit(3); }
if (v.deliveryProfile?.id === ziel) { console.log('nichts zu tun: schon im Zielprofil'); process.exit(0); }
console.log('PLAN: deliveryProfileUpdate', ziel, '{ variantsToAssociate: [', V, '] }');
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben'); process.exit(0); }
if (!ZURUECK) writeFileSync(SICH, JSON.stringify(v, null, 1));
const r = (await gql(`mutation($id:ID!,$p:DeliveryProfileInput!){deliveryProfileUpdate(id:$id,profile:$p){profile{id name} userErrors{field message}}}`, { id: ziel, p: { variantsToAssociate: [V] } })).deliveryProfileUpdate;
if (r.userErrors.length) { console.error('FEHLER', JSON.stringify(r.userErrors)); process.exit(5); }
for (let i = 0; i < 6; i++) {
  await new Promise(z => setTimeout(z, i ? 5000 : 2000));
  const n = await lesen();
  if (n.deliveryProfile?.id === ziel) { console.log(new Date().toISOString(), 'NACH', JSON.stringify(n), 'GLEICH'); process.exit(0); }
}
console.error('ABWEICHUNG nach dem Schreiben'); process.exit(6);
