#!/usr/bin/env node
/* order_lookup.mjs — schnelle Bestell-/Sendungs-Abfrage per Shopify-Admin-API. Schreibt Ergebnis nach
 * reports/order-lookup.txt (damit die Cloud-Session es sieht). No-op ohne Creds.
 * ENV: ORDER_NAME (default 1004) · SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [SHOPIFY_SHOP]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
const AT=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(), CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const NAME=(process.env.ORDER_NAME||'1004').replace(/^#/,'').trim();
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
const API='2025-01';
try{ mkdirSync('reports',{recursive:true}); }catch{}
const out=[]; const W=m=>{ out.push(m); console.log(m); try{ writeFileSync('reports/order-lookup.txt', out.join('\n')+'\n'); }catch{} };
if(!AT && !(CID&&CSEC)){ W('Keine Shopify-Creds → No-op.'); process.exit(0); }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
const tok = AT || await cc();
if(!tok){ W('❌ Kein Token (Creds/App prüfen).'); process.exit(0); }
async function gql(q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
const Q=`query($q:String!){ orders(first:5, query:$q){ edges{ node{
  name createdAt displayFulfillmentStatus displayFinancialStatus cancelledAt
  totalPriceSet{shopMoney{amount currencyCode}}
  customer{ firstName lastName email }
  shippingAddress{ name city zip countryCodeV2 }
  lineItems(first:10){ edges{ node{ title quantity variantTitle } } }
  fulfillments(first:5){ status createdAt trackingInfo{ number url company } }
} } } }`;
const r=await gql(Q,{q:`name:${NAME}`});
const nodes=(r?.data?.orders?.edges||[]).map(e=>e.node);
if(!nodes.length){ W(`Keine Bestellung #${NAME} gefunden.`); if(r?.errors) W('Fehler: '+JSON.stringify(r.errors).slice(0,300)); process.exit(0); }
for(const o of nodes){
  W(`\n=== Bestellung ${o.name} ===`);
  W(`Datum: ${o.createdAt}`);
  W(`Kunde: ${o.customer?.firstName||''} ${o.customer?.lastName||''} <${o.customer?.email||'—'}>`);
  W(`Lieferadresse: ${o.shippingAddress?.name||'—'}, ${o.shippingAddress?.zip||''} ${o.shippingAddress?.city||''} (${o.shippingAddress?.countryCodeV2||''})`);
  W(`Betrag: ${o.totalPriceSet?.shopMoney?.amount||'?'} ${o.totalPriceSet?.shopMoney?.currencyCode||''}`);
  W(`Zahlung: ${o.displayFinancialStatus} · Fulfillment: ${o.displayFulfillmentStatus}${o.cancelledAt?` · STORNIERT ${o.cancelledAt}`:''}`);
  W('Positionen: '+(o.lineItems?.edges||[]).map(e=>`${e.node.quantity}× ${e.node.title}${e.node.variantTitle?` (${e.node.variantTitle})`:''}`).join(' | '));
  const fs=o.fulfillments||[];
  if(!fs.length){ W('Sendung: noch KEINE Fulfillment/Sendung angelegt (noch nicht verschickt).'); }
  else for(const f of fs){ const ti=(f.trackingInfo||[])[0]||{}; W(`Sendung: status=${f.status} · ${f.createdAt} · Tracking: ${ti.number||'—'} ${ti.company?`(${ti.company})`:''} ${ti.url||''}`); }
}
