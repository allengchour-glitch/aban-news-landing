#!/usr/bin/env node
/* cj_enrich_details — hängt allen tag:cj-real-Produkten einen „Produktdetails"-Block an
 * (Material, Gewicht, Kategorie, Versand, Rückgabe) aus der CJ-Product-Query.
 * Idempotent (skippt 'ls-feed-details'). Token: /tmp/cj_token.json. LIVE=1 schreibt. MAXP begrenzt.
 */
import fs from 'fs';
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1'; const MAXP=parseInt(process.env.MAXP||'0',10); const GAP=parseInt(process.env.GAP||'1100',10);
const CJTOK=JSON.parse(fs.readFileSync('/tmp/cj_token.json','utf8')).accessToken;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}
async function cj(sku){
  for(let a=0;a<4;a++){
    try{ const r=await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/query?productSku=${encodeURIComponent(sku)}`,{headers:{'CJ-Access-Token':CJTOK}});
      const j=await r.json(); if(j.code===200&&j.data) return j.data; if(/frequ|limit|429/i.test(JSON.stringify(j))){await sleep(2500);continue;} return null;
    }catch(e){ await sleep(2000); }
  } return null;
}
function block(d){
  const li=[];
  const mat=(d.materialNameEnSet&&d.materialNameEnSet.length?d.materialNameEnSet.join(', '):d.materialNameEn);
  if(mat) li.push(`<li><strong>Material:</strong> ${mat}</li>`);
  if(+d.productWeight>0){ const g=+d.productWeight; li.push(`<li><strong>Gewicht:</strong> ${g>=1000?(g/1000).toLocaleString('de-CH')+' kg':g+' g'}</li>`); }
  if(d.categoryName){ const c=String(d.categoryName).split('/').pop().trim(); if(c) li.push(`<li><strong>Kategorie:</strong> ${c}</li>`); }
  li.push('<li><strong>Versand:</strong> 🇨🇭 CH/EU ca. 8–16 Tage · inkl. Produktion</li>');
  li.push('<li><strong>Rückgabe:</strong> 30 Tage · Gratis-Versand ab CHF 65</li>');
  return `\n<div class="ls-feed-details">\n<h4>Produktdetails</h4>\n<ul>\n${li.join('\n')}\n</ul>\n</div>`;
}
const t=await tok(); if(!t){console.error('Kein Shopify-Token');process.exit(1);}
const Q=`query($cursor:String){ products(first:30, query:"tag:cj-real status:active", after:$cursor){ pageInfo{hasNextPage endCursor} edges{ node{ id descriptionHtml variants(first:1){edges{node{sku}}} } } } }`;
let cursor=null, scanned=0, enriched=0, skipped=0, nodata=0, batch=[];
async function flush(){ if(!batch.length)return; const al=batch.map((b,i)=>`u${i}: productUpdate(input:$i${i}){ userErrors{ message } }`).join('\n'); const vars=`(${batch.map((b,i)=>`$i${i}:ProductInput!`).join(',')})`; const r=await gql(t,`mutation${vars}{ ${al} }`,Object.fromEntries(batch.map((b,i)=>[`i${i}`,b]))); const e=Object.values(r?.data||{}).flatMap(x=>x.userErrors||[]); if(e.length)console.log('  ⚠️',JSON.stringify(e).slice(0,160)); batch=[]; }
do{
  const r=await gql(t,Q,{cursor}); const pg=r?.data?.products; if(!pg) break;
  for(const e of pg.edges){
    scanned++;
    if((e.node.descriptionHtml||'').includes('ls-feed-details')){ skipped++; continue; }
    let sku=e.node.variants?.edges?.[0]?.node?.sku||''; sku=sku.replace(/^CJ-/,'').trim();
    if(!sku){ nodata++; continue; }
    const d=await cj(sku); await sleep(GAP);
    if(!d){ nodata++; continue; }
    const nh=(e.node.descriptionHtml||'')+block(d);
    if(LIVE){ batch.push({id:e.node.id, descriptionHtml:nh}); if(batch.length>=10) await flush(); }
    enriched++;
    if(MAXP&&enriched>=MAXP) break;
  }
  cursor=(MAXP&&enriched>=MAXP)?null:(pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null);
  if(scanned%60===0) console.log(`  … ${scanned} gescannt, ${enriched} angereichert, ${skipped} schon-ok`);
}while(cursor);
if(LIVE) await flush();
console.log(`Fertig. Gescannt ${scanned} · angereichert ${enriched} · schon-ok ${skipped} · ohne-Daten ${nodata} ${LIVE?'':'(DRY)'}`);
