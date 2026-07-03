#!/usr/bin/env node
/* LuxeStyle — set_trikot_prices.mjs
 * Einmal-/idempotent: setzt die WM-Trikot-Preise auf profitables Niveau (User-OK 2026-07-03), weil das
 * Printful-Trikot ~CHF 40 landed kostet und CHF 34.90 = Verlust war.
 *   • Personalisiert (mit Druck)  Produkt 15433948070273 → alle Varianten 59.90 · compareAt 79.90
 *   • Blank (ohne Druck)          Produkt 15447487480193 → alle Varianten 49.90 · compareAt 69.90
 * Ehrliche Streichpreise (~1.3-1.4x, kein Fake). Idempotent: ändert nur, was abweicht. No-op ohne Creds. DRY_RUN=1.
 * ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [DRY_RUN=1]
 */
const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1'; const API='2025-01';
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN))return ADMIN_TOKEN; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} console.error('❌ Auth'); process.exit(0); }

const TARGETS=[
  {id:'gid://shopify/Product/15433948070273', price:'59.90', comp:'79.90', label:'personalisiert'},
  {id:'gid://shopify/Product/15447487480193', price:'49.90', comp:'69.90', label:'blank'},
];
const Q=`query($id:ID!){ product(id:$id){ title variants(first:100){ edges{ node{ id price compareAtPrice } } } } }`;
const M=`mutation($pid:ID!,$vars:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$pid, variants:$vars){ userErrors{ field message } } }`;

const tok=DRY?(await token().catch(()=>null)):await token();
if(!tok){ console.log('Keine Auth → No-op.'); process.exit(0); }
let changed=0, fails=[];
for(const t of TARGETS){
  const r=await gql(tok,Q,{id:t.id}); const p=r?.data?.product;
  if(!p){ console.log(`⚠️ Produkt ${t.id} nicht gefunden (übersprungen).`); continue; }
  const upd=[];
  for(const {node:v} of (p.variants?.edges||[])){
    if(v.price!==t.price || v.compareAtPrice!==t.comp){ upd.push({id:v.id, price:t.price, compareAtPrice:t.comp}); }
  }
  if(!upd.length){ console.log(`= ${t.label}: schon ${t.price}/${t.comp} (${p.title})`); continue; }
  if(DRY){ console.log(`DRY ${t.label}: ${upd.length} Varianten → ${t.price} (comp ${t.comp})`); changed+=upd.length; continue; }
  // in Chunks von 25 (Shopify-Limit pro bulk)
  for(let i=0;i<upd.length;i+=25){
    const chunk=upd.slice(i,i+25);
    const ur=await gql(tok,M,{pid:t.id,vars:chunk}); const ue=ur?.data?.productVariantsBulkUpdate?.userErrors||[];
    if(ue.length){ fails.push(`${t.label}: ${JSON.stringify(ue).slice(0,120)}`); } else changed+=chunk.length;
    await new Promise(x=>setTimeout(x,250));
  }
  console.log(`✓ ${t.label}: ${upd.length} Varianten → ${t.price}/${t.comp} (${p.title})`);
}
if(fails.length) fails.forEach(f=>console.error('✗',f));
console.log(`\nFertig: ${changed} Varianten ${DRY?'(DRY) ':''}auf Zielpreis gesetzt${fails.length?`, ${fails.length} Fehler`:''}.`);
