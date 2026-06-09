#!/usr/bin/env node
/* LuxeStyle — printful_reprice.mjs
 * Setzt die POD-Preise auf gesunde Marge: holt je Variante die ECHTEN Printful-Katalog-Kosten
 * (SKU "<sync>_<printfulVariantId>" → GET /products/variant/{id} → price USD), rechnet
 *   Retail = max(Kosten×MARKUP, Kosten+MIN_MARGE), aufgerundet auf X.90 (CHF)
 * und aktualisiert die Shopify-Variantenpreise. DRY_RUN=1 → nur Vorschau-Tabelle, keine Änderung.
 *
 * ENV: PRINTFUL_API_KEY (Pflicht) · [PRINTFUL_STORE_ID] · SHOPIFY_SHOP · SHOPIFY_CLIENT_ID/SECRET (oder _ADMIN_TOKEN)
 *      [PF_USD_CHF=0.90] · [MARKUP=2.3] · [MIN_MARGE=12] · [TAG=printful_personalized_product] · [MAX=300] · [DRY_RUN=1]
 */
const SHOPraw=process.env.SHOPIFY_SHOP||'';
const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim();
const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const PF_KEY=(process.env.PRINTFUL_API_KEY||'').trim();
const PF_STORE=(process.env.PRINTFUL_STORE_ID||'').trim();
const RATE=parseFloat(process.env.PF_USD_CHF||'0.90')||0.90;
const MARKUP=parseFloat(process.env.MARKUP||'2.3')||2.3;
const MIN_MARGE=parseFloat(process.env.MIN_MARGE||'12')||12;
const TAG=process.env.TAG||'printful_personalized_product';
const MAXP=Math.max(1,parseInt(process.env.MAX||'300',10)||300);
const DRY=process.env.DRY_RUN==='1';
const API='2025-01';
let SHOP=SHOPraw.replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim();
if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!PF_KEY){ console.log('Kein PRINTFUL_API_KEY → No-op.'); process.exit(0); }
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }

async function gql(tok,query,variables){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query,variables})}); return r.json(); }
async function works(tok){ try{ const r=await gql(tok,'{ shop { name } }'); return r?.data?.shop?.name||null; }catch{ return null; } }
async function clientCred(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN)) return ADMIN_TOKEN; if(CID&&CSEC){ const t=await clientCred(); if(t&&await works(t)) return t; } console.error('❌ Shopify-Auth fehlgeschlagen'); process.exit(0); }

const costCache=new Map();
async function pfCost(vid){ if(costCache.has(vid)) return costCache.get(vid);
  const headers={'Authorization':'Bearer '+PF_KEY}; if(PF_STORE) headers['X-PF-Store-Id']=PF_STORE;
  let cost=null;
  try{ const r=await fetch('https://api.printful.com/products/variant/'+vid,{headers}); const j=await r.json().catch(()=>({}));
    const p=j?.result?.variant?.price; if(p!=null) cost=parseFloat(p); }catch{}
  costCache.set(vid,cost); return cost; }

function variantId(sku){ const m=String(sku||'').match(/_(\d+)\s*$/); return m?m[1]:null; }
function priced(costChf){ const target=Math.max(costChf*MARKUP, costChf+MIN_MARGE); return (Math.ceil(target)-0.10); }

const Q=`query($q:String!,$cursor:String){ products(first:50, query:$q, after:$cursor){ pageInfo{hasNextPage endCursor} edges{ node{ id title variants(first:100){ edges{ node{ id sku price } } } } } } }`;

(async()=>{
  const tok=await token();
  let cursor=null, products=[];
  do{ const d=await gql(tok,Q,{q:`tag:${TAG}`,cursor}); const c=d?.data?.products; if(!c){ console.error('Query-Fehler',JSON.stringify(d).slice(0,200)); break; }
      products.push(...c.edges.map(e=>e.node)); cursor=c.pageInfo.hasNextPage?c.pageInfo.endCursor:null;
  } while(cursor && products.length<MAXP);
  console.log(`Produkte: ${products.length} (Tag ${TAG}) · MARKUP ${MARKUP} · MIN_MARGE ${MIN_MARGE} · USD→CHF ${RATE} · ${DRY?'DRY-VORSCHAU':'ANWENDEN'}\n`);

  let changes=0, unknown=0;
  for(const p of products){
    const updates=[];
    for(const {node:v} of p.variants.edges){
      const vid=variantId(v.sku); if(!vid){ unknown++; continue; }
      const costUsd=await pfCost(vid);
      if(costUsd==null){ unknown++; console.log(`  ? ${p.title} | ${v.sku} → Printful-Kosten unbekannt`); continue; }
      const costChf=costUsd*RATE;
      const np=priced(costChf).toFixed(2);
      const cur=parseFloat(v.price).toFixed(2);
      if(np!==cur){ updates.push({id:v.id,price:np});
        console.log(`  ${p.title.slice(0,34).padEnd(34)} | ${v.sku.padEnd(14)} Kost ~${costChf.toFixed(2)} | ${cur} → ${np}`);
      }
    }
    if(updates.length && !DRY){
      const m=await gql(tok,`mutation($pid:ID!,$variants:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$pid,variants:$variants){ userErrors{ field message } } }`,{pid:p.id,variants:updates});
      const errs=m?.data?.productVariantsBulkUpdate?.userErrors||[]; if(errs.length) console.error('   ⚠️',JSON.stringify(errs).slice(0,160));
    }
    changes+=updates.length;
  }
  console.log(`\nFertig: ${changes} Variantenpreise ${DRY?'WÜRDEN angepasst (Vorschau)':'angepasst'} · ${unknown} ohne Printful-Kosten.`);
})().catch(e=>{ console.error('Fehler:',e); process.exit(0); });
