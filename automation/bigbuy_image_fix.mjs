#!/usr/bin/env node
/* bigbuy_image_fix — Bild-QA für alle tag:bigbuy-Produkte:
 *   - findet Produkte mit FAILED-Medien oder 0 fertigen Bildern
 *   - holt frische Bild-URLs aus BigBuy (productimages), prüft HTTP-200,
 *     fügt das Cover-Bild hinzu (productCreateMedia) und entfernt FAILED-Medien.
 * Zwei-Phasen + Stall-Guard. SCAN-only ohne LIVE; LIVE=1 repariert.
 * Caches: /tmp/bb_products.json (id/sku). ENV: SHOPIFY_*, BIGBUY_API_KEY.
 */
import fs from 'node:fs';
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const BB=(process.env.BIGBUY_API_KEY||'').trim(); const LIVE=process.env.LIVE==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}
async function bbImg(id){for(let a=0;a<4;a++){try{const ac=new AbortController();const to=setTimeout(()=>ac.abort(),20000);const r=await fetch(`https://api.bigbuy.eu/rest/catalog/productimages/${id}.json`,{headers:{'Authorization':`Bearer ${BB}`,'Accept':'application/json'},signal:ac.signal});clearTimeout(to);const tx=await r.text();if(/exceeded the rate limit/i.test(tx)){await sleep((a+1)*4000);continue;}try{return JSON.parse(tx);}catch{return null;}}catch{await sleep(2000);}}return null;}
async function ok(u){try{const ac=new AbortController();const to=setTimeout(()=>ac.abort(),12000);const r=await fetch(u,{method:'HEAD',signal:ac.signal});clearTimeout(to);return r.status>=200&&r.status<400;}catch{return false;}}

const prod=new Map(),bySku=new Map();
for(const p of JSON.parse(fs.readFileSync('/tmp/bb_products.json','utf8'))){prod.set(String(p.id),p);if(p.sku)bySku.set(String(p.sku).toUpperCase(),p);}
function bbId(handle,sku){const m=handle.match(/-(\d{4,})$/);if(m&&prod.has(m[1]))return m[1];if(sku){const s=String(sku).toUpperCase().replace(/^BB-/,'').replace(/-(XS|S|M|L|XL|XXL|2XL|3XL|4XL|5XL|\d{1,2})$/,'');if(bySku.has(s))return String(bySku.get(s).id);}return null;}

const t=await tk();if(!t){console.error('Kein Token');process.exit(1);}
const Q=`query($c:String){ products(first:50, query:"tag:bigbuy status:active", after:$c){ pageInfo{hasNextPage endCursor} edges{ node{ id handle variants(first:1){edges{node{sku}}} media(first:10){edges{node{id status:mediaContentType ... on MediaImage{status} }}} } } } }`;
let c=null,items=[],seen=new Set(),stall=0,pages=0;
do{const r=await gql(t,Q,{c});const pg=r?.data?.products;if(!pg){await sleep(2500);continue;}const b=items.length;
  for(const e of pg.edges){if(seen.has(e.node.id))continue;seen.add(e.node.id);items.push(e.node);}
  if(items.length===b){if(++stall>=4){console.log('  ⚠️ STALL bei',items.length);break;}}else stall=0;
  c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null;pages++; if(pages%20===0)console.log('  Phase1 …',items.length);
}while(c);
console.log(`Phase 1: ${items.length} bigbuy-Produkte.`);

const broken=[];
for(const n of items){
  const ms=(n.media?.edges||[]).map(e=>e.node);
  const failed=ms.filter(m=>m.status==='FAILED');
  const readyImg=ms.filter(m=>m.status==='READY');
  if(failed.length>0 || readyImg.length===0) broken.push({n,failed});
}
console.log(`Kaputt/leer: ${broken.length} Produkte (FAILED oder 0 fertige Bilder).`);
if(!LIVE){ broken.slice(0,30).forEach(b=>console.log('  -',b.n.handle)); console.log('(DRY — nichts geändert)'); process.exit(0); }

let fixed=0,nofix=0;
for(const {n,failed} of broken){
  const id=bbId(n.handle, n.variants?.edges?.[0]?.node?.sku);
  if(!id){ nofix++; continue; }
  const data=await bbImg(id); await sleep(1200);
  const imgs=(data?.images||data?.[0]?.images||[]).map(x=>x.url).filter(Boolean);
  let added=false;
  for(const u of imgs){ if(await ok(u)){ const r=await gql(t,`mutation($pid:ID!,$m:[CreateMediaInput!]!){ productCreateMedia(productId:$pid, media:$m){ userErrors{ message } } }`,{pid:n.id,m:[{originalSource:u,mediaContentType:'IMAGE'}]}); if(!r?.data?.productCreateMedia?.userErrors?.length){added=true;break;} } }
  // FAILED-Medien entfernen
  if(failed.length){ await gql(t,`mutation($pid:ID!,$ids:[ID!]!){ productDeleteMedia(productId:$pid, mediaIds:$ids){ userErrors{ message } } }`,{pid:n.id,ids:failed.map(f=>f.id)}); }
  if(added){ fixed++; } else nofix++;
  if((fixed+nofix)%20===0)console.log(`  … ${fixed} repariert, ${nofix} ohne Bild`);
}
console.log(`Fertig. ${fixed} repariert · ${nofix} ohne brauchbares BigBuy-Bild.`);
