#!/usr/bin/env node
/* bigbuy_enrich_details — hängt allen tag:bigbuy-Produkten einen vollen
 * „Produktdetails"-Block an (Marke, Abmessungen, Gewicht, EAN, Versand, Rückgabe)
 * aus dem BigBuy-Katalog-Cache. Idempotent (skippt, wenn 'ls-feed-details' schon da).
 * ENV: SHOPIFY_* (creds). LIVE=1 zum Schreiben. MAXP=Limit (0=alle).
 */
import fs from 'fs';
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1'; const MAXP=parseInt(process.env.MAXP||'0',10);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}

console.log('Lade BigBuy-Katalog-Cache …');
const prod=new Map(), bySku=new Map();
for(const p of JSON.parse(fs.readFileSync('/tmp/bb_products.json','utf8'))){ prod.set(String(p.id),p); if(p.sku) bySku.set(String(p.sku).toUpperCase(),p); }
const mans=new Map(); for(const m of JSON.parse(fs.readFileSync('/tmp/bb_mans.json','utf8'))) mans.set(String(m.id),m.name);
console.log(`  ${prod.size} Produkte (${bySku.size} SKUs), ${mans.size} Hersteller.`);
function findRec(handle, sku){
  const m=handle.match(/-(\d{4,})$/); if(m && prod.has(m[1])) return prod.get(m[1]);
  if(sku){ const s=String(sku).toUpperCase().replace(/^BB-/,'').replace(/-(XS|S|M|L|XL|XXL|2XL|3XL|4XL|5XL|\d{1,2})$/,''); if(bySku.has(s)) return bySku.get(s); }
  return null;
}

function block(p){
  const li=[];
  const brand=mans.get(String(p.manufacturer));
  if(brand) li.push(`<li><strong>Marke:</strong> ${brand}</li>`);
  const w=+p.width,h=+p.height,d=+p.depth;
  if(w>0&&h>0&&d>0) li.push(`<li><strong>Abmessungen (ca.):</strong> ${w} × ${h} × ${d} cm</li>`);
  if(+p.weight>0) li.push(`<li><strong>Gewicht:</strong> ${(+p.weight).toLocaleString('de-CH')} kg</li>`);
  if(p.ean13&&/^\d{8,14}$/.test(String(p.ean13))) li.push(`<li><strong>EAN:</strong> ${p.ean13}</li>`);
  li.push('<li><strong>Versand:</strong> aus EU-Lager · 3–7 Tage · gratis ab CHF 65</li>');
  li.push('<li><strong>Rückgabe:</strong> 30 Tage</li>');
  return `\n<div class="ls-feed-details">\n<h4>Produktdetails</h4>\n<ul>\n${li.join('\n')}\n</ul>\n</div>`;
}

const t=await tok(); if(!t){console.error('Kein Token');process.exit(1);}
const Q=`query($cursor:String){ products(first:40, query:"tag:bigbuy status:active", after:$cursor){ pageInfo{hasNextPage endCursor} edges{ node{ id handle descriptionHtml variants(first:1){edges{node{sku}}} } } } }`;
let cursor=null, scanned=0, enriched=0, skipped=0, nomap=0, batch=[];
async function flush(){
  if(!batch.length) return;
  const al=batch.map((b,i)=>`u${i}: productUpdate(input:$i${i}){ userErrors{ message } }`).join('\n');
  const vars=`(${batch.map((b,i)=>`$i${i}:ProductInput!`).join(',')})`;
  const r=await gql(t,`mutation${vars}{ ${al} }`,Object.fromEntries(batch.map((b,i)=>[`i${i}`,b])));
  const errs=Object.values(r?.data||{}).flatMap(x=>x.userErrors||[]); if(errs.length) console.log('  ⚠️',JSON.stringify(errs).slice(0,200));
  batch=[];
}
do{
  const r=await gql(t,Q,{cursor}); const pg=r?.data?.products; if(!pg) break;
  for(const e of pg.edges){
    scanned++;
    const rec=findRec(e.node.handle, e.node.variants?.edges?.[0]?.node?.sku);
    if(!rec){ nomap++; continue; }
    if((e.node.descriptionHtml||'').includes('ls-feed-details')){ skipped++; continue; }
    const newHtml=(e.node.descriptionHtml||'')+block(rec);
    if(LIVE){ batch.push({id:e.node.id, descriptionHtml:newHtml}); if(batch.length>=10) await flush(); }
    enriched++;
    if(MAXP&&enriched>=MAXP){ cursor=null; break; }
  }
  cursor=(MAXP&&enriched>=MAXP)?null:(pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null);
  if(scanned%200===0) console.log(`  … ${scanned} gescannt, ${enriched} angereichert`);
}while(cursor);
if(LIVE) await flush();
console.log(`Fertig. Gescannt ${scanned} · angereichert ${enriched} · schon-ok ${skipped} · ohne-Cache ${nomap} ${LIVE?'':'(DRY)'}`);
