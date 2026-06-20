#!/usr/bin/env node
/* bigbuy_seo_fix — setzt für alle tag:bigbuy-Produkte einen markenbasierten, vollständigen
 * SEO-Titel + SEO-Beschreibung (aus dem aktuellen, re-betitelten Produkttitel).
 * Zwei-Phasen (erst IDs sammeln, dann schreiben) + Stall-Guard gegen instabilen Such-Index.
 * LIVE=1 schreibt. ENV: SHOPIFY_*.
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}
const clean=s=>s.replace(/^[^\p{L}\p{N}]+/u,'').replace(/\s+/g,' ').trim();
const cut=(s,n)=>s.length<=n?s:s.slice(0,n-1).trim()+'…';

const t=await tk(); if(!t){console.error('Kein Token');process.exit(1);}
// Phase 1: IDs + Titel sammeln
const Q=`query($c:String){ products(first:50, query:"tag:bigbuy status:active", after:$c){ pageInfo{hasNextPage endCursor} edges{ node{ id title } } } }`;
let c=null, items=[], seen=new Set(), stall=0, pages=0;
do{ const r=await gql(t,Q,{c}); const pg=r?.data?.products; if(!pg){await sleep(2500);continue;} const before=items.length;
  for(const e of pg.edges){ if(seen.has(e.node.id))continue; seen.add(e.node.id); items.push(e.node); }
  if(items.length===before){ if(++stall>=4){console.log(`  ⚠️ STALL bei ${items.length} → später erneut`);break;} } else stall=0;
  c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null; pages++;
  if(pages%20===0)console.log(`  Phase1 … ${items.length}`);
}while(c);
console.log(`Phase 1: ${items.length} bigbuy-Produkte.`);
// Phase 2: SEO setzen (gebatcht)
let done=0, batch=[];
async function flush(){ if(!batch.length)return; const al=batch.map((b,i)=>`u${i}:productUpdate(input:$i${i}){userErrors{message}}`).join('\n'); const vars=`(${batch.map((b,i)=>`$i${i}:ProductInput!`).join(',')})`; const r=await gql(t,`mutation${vars}{${al}}`,Object.fromEntries(batch.map((b,i)=>[`i${i}`,b]))); const e=Object.values(r?.data||{}).flatMap(x=>x.userErrors||[]); if(e.length)console.log(' ⚠️',JSON.stringify(e).slice(0,160)); batch=[]; }
for(const node of items){
  const ct=clean(node.title||''); if(!ct) continue;
  const seoTitle=cut(`${ct} kaufen | LuxeStyle Schweiz`,70);
  const seoDesc=cut(`${ct} online kaufen bei LuxeStyle: Marken-Original, Premium-Qualität, Gratis-Versand ab CHF 65, schnelle Lieferung in die Schweiz.`,160);
  if(LIVE){ batch.push({id:node.id, seo:{title:seoTitle, description:seoDesc}}); if(batch.length>=10) await flush(); }
  done++; if(done%200===0)console.log(`  … ${done}/${items.length} SEO gesetzt`);
}
if(LIVE) await flush();
console.log(`Fertig. ${done} Produkte SEO (Titel+Beschreibung) gesetzt ${LIVE?'':'(DRY)'}`);
