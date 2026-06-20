#!/usr/bin/env node
/* bigbuy_image_fix — MEDIEN-KOMPLETT-Pass für alle tag:bigbuy-Produkte:
 *   (1) Alt-Texte für ALLE Produktbilder setzen (aus Produkttitel) — SEO/Barrierefreiheit/Merchant
 *   (2) Produkte mit FAILED-Medien oder 0 fertigen Bildern reparieren (frisches BigBuy-Cover, HTTP-geprüft)
 * Zwei-Phasen (erst alles sammeln, dann schreiben) + Stall-Guard gegen instabilen Such-Index.
 * LIVE=1 schreibt. Caches: /tmp/bb_products.json. ENV: SHOPIFY_*, BIGBUY_API_KEY.
 */
import fs from 'node:fs';
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const BB=(process.env.BIGBUY_API_KEY||'').trim(); const LIVE=process.env.LIVE==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clean=s=>s.replace(/^[^\p{L}\p{N}]+/u,'').replace(/\s+/g,' ').trim();
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}
async function bbImg(id){for(let a=0;a<4;a++){try{const ac=new AbortController();const to=setTimeout(()=>ac.abort(),20000);const r=await fetch(`https://api.bigbuy.eu/rest/catalog/productimages/${id}.json`,{headers:{'Authorization':`Bearer ${BB}`,'Accept':'application/json'},signal:ac.signal});clearTimeout(to);const tx=await r.text();if(/exceeded the rate limit/i.test(tx)){await sleep((a+1)*4000);continue;}try{return JSON.parse(tx);}catch{return null;}}catch{await sleep(2000);}}return null;}
async function ok(u){try{const ac=new AbortController();const to=setTimeout(()=>ac.abort(),12000);const r=await fetch(u,{method:'HEAD',signal:ac.signal});clearTimeout(to);return r.status>=200&&r.status<400;}catch{return false;}}

const prod=new Map(),bySku=new Map();
for(const p of JSON.parse(fs.readFileSync('/tmp/bb_products.json','utf8'))){prod.set(String(p.id),p);if(p.sku)bySku.set(String(p.sku).toUpperCase(),p);}
function bbId(handle,sku){const m=handle.match(/-(\d{4,})$/);if(m&&prod.has(m[1]))return m[1];if(sku){const s=String(sku).toUpperCase().replace(/^BB-/,'').replace(/-(XS|S|M|L|XL|XXL|2XL|3XL|4XL|5XL|\d{1,2})$/,'');if(bySku.has(s))return String(bySku.get(s).id);}return null;}

const t=await tk();if(!t){console.error('Kein Token');process.exit(1);}
const Q=`query($c:String){ products(first:50, query:"tag:bigbuy status:active", after:$c){ pageInfo{hasNextPage endCursor} edges{ node{ id title handle variants(first:1){edges{node{sku}}} media(first:12){edges{node{ ... on MediaImage{ id status alt } }}} } } } }`;
let c=null,items=[],seen=new Set(),stall=0,pages=0;
do{const r=await gql(t,Q,{c});const pg=r?.data?.products;if(!pg){await sleep(2500);continue;}const b=items.length;
  for(const e of pg.edges){if(seen.has(e.node.id))continue;seen.add(e.node.id);items.push(e.node);}
  if(items.length===b){if(++stall>=5){console.log('  ⚠️ STALL bei',items.length);break;}}else stall=0;
  c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null;pages++; if(pages%20===0)console.log('  Phase1 …',items.length);
}while(c);
console.log(`Phase 1: ${items.length} bigbuy-Produkte.`);

let altSet=0, repaired=0, noFix=0;
for(const n of items){
  const ct=clean(n.title||''); if(!ct) continue;
  const imgs=(n.media?.edges||[]).map(e=>e.node).filter(m=>m && m.id);
  const ready=imgs.filter(m=>m.status==='READY');
  const failed=imgs.filter(m=>m.status==='FAILED');
  // (1) Alt-Texte für vorhandene READY-Bilder (nur wo leer)
  const needAlt=ready.filter(m=>!m.alt || !m.alt.trim());
  if(LIVE && needAlt.length){
    const media=needAlt.map(m=>({id:m.id, alt:`${ct} – LuxeStyle Schweiz`}));
    const r=await gql(t,`mutation($pid:ID!,$m:[UpdateMediaInput!]!){ productUpdateMedia(productId:$pid, media:$m){ userErrors{ message } } }`,{pid:n.id,m:media});
    if(!r?.data?.productUpdateMedia?.userErrors?.length) altSet+=needAlt.length;
  } else if(needAlt.length) altSet+=needAlt.length;
  // (2) Reparatur, wenn FAILED oder 0 READY-Bilder
  if((failed.length>0 || ready.length===0)){
    const id=bbId(n.handle, n.variants?.edges?.[0]?.node?.sku);
    if(id && LIVE){
      const data=await bbImg(id); await sleep(1100);
      const urls=(data?.images||data?.[0]?.images||[]).map(x=>x.url).filter(Boolean);
      let added=false;
      for(const u of urls){ if(await ok(u)){ const r=await gql(t,`mutation($pid:ID!,$m:[CreateMediaInput!]!){ productCreateMedia(productId:$pid, media:$m){ userErrors{ message } } }`,{pid:n.id,m:[{originalSource:u,mediaContentType:'IMAGE',alt:`${ct} – LuxeStyle Schweiz`}]}); if(!r?.data?.productCreateMedia?.userErrors?.length){added=true;break;} } }
      if(failed.length){ await gql(t,`mutation($pid:ID!,$ids:[ID!]!){ productDeleteMedia(productId:$pid, mediaIds:$ids){ userErrors{ message } } }`,{pid:n.id,ids:failed.map(f=>f.id)}); }
      if(added) repaired++; else noFix++;
    } else if(!id) noFix++;
  }
}
console.log(`Fertig. Alt-Texte gesetzt: ${altSet} · Bilder repariert: ${repaired} · ohne BigBuy-Bild: ${noFix} ${LIVE?'':'(DRY)'}`);
