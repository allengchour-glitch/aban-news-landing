#!/usr/bin/env node
/* LuxeStyle — honest_compareat.mjs
 * "Alles ehrlich" (User 2026-07-03): aufgeblasene Streichpreise entschaerfen. Schweizer PBV verlangt, dass ein
 * durchgestrichener Preis ein ECHTER Referenzpreis ist — ein dauerhaft erfundener 2x-compareAt = unzulaessiger
 * Fake-Rabatt. Dieses Skript senkt jeden Variant-compareAt, der >= FACTOR_MAX (Default 1.85) ueber dem Preis liegt,
 * auf ein glaubwuerdiges ~1.5x (psychologisch auf .90 gerundet). Verkaufspreis bleibt unveraendert.
 * Bundles bleiben unberuehrt: ihr compareAt = Summe der Einzelteile liegt real UNTER 1.85x (verifiziert 2026-07-03),
 * greift also gar nicht in die Regel. Idempotent (unter Zielverhaeltnis passiert nichts). No-op ohne Creds. DRY_RUN=1.
 * ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (oder _ADMIN_TOKEN) · [LIMIT=2000] · [FACTOR_MAX=1.85] · [TARGET=1.5] · [DRY_RUN=1]
 */
const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1'; const API='2025-01';
const LIMIT=Math.max(1,parseInt(process.env.LIMIT||'2000',10)||2000);
const FACTOR_MAX=parseFloat(process.env.FACTOR_MAX||'1.85')||1.85;
const TARGET=parseFloat(process.env.TARGET||'1.5')||1.5;
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN))return ADMIN_TOKEN; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} console.error('❌ Auth'); process.exit(0); }

// neuer, ehrlicher Streichpreis: ~TARGET x Preis, auf X.90 gerundet, immer > Preis
function honestComp(price){ let v=Math.round(price*TARGET)-0.10; if(v<=price) v=Math.round((price*TARGET+0.5))-0.10; return v.toFixed(2); }

const Q=`query($n:Int!,$after:String){ products(first:$n, after:$after, query:"status:active"){ pageInfo{ hasNextPage endCursor } edges{ node{ id title variants(first:100){ edges{ node{ id price compareAtPrice } } } } } } }`;
const M=`mutation($pid:ID!,$vars:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$pid, variants:$vars){ userErrors{ field message } } }`;

const tok=DRY?(await token().catch(()=>null)):await token();
if(!tok){ console.log('Keine Auth → No-op.'); process.exit(0); }
let after=null, seen=0, prodChanged=0, varChanged=0, fails=[];
outer:
while(true){
  const r=await gql(tok,Q,{n:40,after}); const conn=r?.data?.products; if(!conn) break;
  for(const {node:p} of conn.edges){
    if(seen>=LIMIT) break outer; seen++;
    const upd=[];
    for(const {node:v} of (p.variants?.edges||[])){
      const price=parseFloat(v.price||'0'); const comp=v.compareAtPrice?parseFloat(v.compareAtPrice):0;
      if(price>0 && comp>0 && comp/price>=FACTOR_MAX){ upd.push({id:v.id, compareAtPrice:honestComp(price)}); }
    }
    if(!upd.length) continue;
    if(DRY){ console.log(`DRY ${p.title}: ${upd.map(u=>u.compareAtPrice).join(',')}`); prodChanged++; varChanged+=upd.length; continue; }
    const ur=await gql(tok,M,{pid:p.id,vars:upd}); const ue=ur?.data?.productVariantsBulkUpdate?.userErrors||[];
    if(ue.length){ fails.push(`${p.title}: ${JSON.stringify(ue).slice(0,120)}`); continue; }
    prodChanged++; varChanged+=upd.length; if(prodChanged%25===0) console.log(`  … ${prodChanged} Produkte`);
    await new Promise(x=>setTimeout(x,200));
  }
  if(!conn.pageInfo?.hasNextPage) break; after=conn.pageInfo.endCursor;
}
if(fails.length) fails.slice(0,20).forEach(f=>console.error('✗',f));
console.log(`\nFertig: ${seen} geprüft, ${prodChanged} Produkte / ${varChanged} Varianten ${DRY?'(DRY) ':''}auf ehrliches ~${TARGET}x gesenkt${fails.length?`, ${fails.length} Fehler`:''}.`);
