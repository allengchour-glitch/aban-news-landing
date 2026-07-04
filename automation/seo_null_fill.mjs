#!/usr/bin/env node
/* seo_null_fill — füllt fehlende seo.title bei neu importierten ACTIVE-Produkten.
 * Paginiert status:active nach CREATED_AT reverse (neueste zuerst), fixt nur wo seo.title leer.
 * Setzt NUR seo{title,description} — nie title/tags/images/status. Idempotent. LIVE=1 schreibt.
 * ENV: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET.
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const MAX=parseInt(process.env.MAX||'800',10);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<6;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const cut=(s,n)=>s.length<=n?s:s.slice(0,n-1).trim()+'…';

const t=await tk(); if(!t){console.error('Kein Token');process.exit(1);}

// Phase 1: scannen (neueste zuerst), Produkte mit leerem seo.title sammeln
const Q=`query($c:String){ products(first:50, sortKey:CREATED_AT, reverse:true, query:"status:active", after:$c){ pageInfo{hasNextPage endCursor} edges{ node{ id title vendor productType seo{title description} } } } }`;
let c=null, scanned=0, targets=[], pages=0;
do{
  const r=await gql(t,Q,{c}); const pg=r?.data?.products;
  if(!pg){ await sleep(2500); continue; }
  for(const e of pg.edges){
    scanned++;
    const n=e.node;
    if(!clean(n.seo?.title)) targets.push(n);
  }
  c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null; pages++;
  if(pages%10===0)console.log(`  Phase1 … gescannt ${scanned}, Ziele ${targets.length}`);
}while(c && scanned<MAX);
console.log(`Phase 1: ${scanned} ACTIVE gescannt, ${targets.length} ohne seo.title.`);

// Phase 2: SEO setzen (gebatcht bis 10 Aliase pro Mutation)
let done=0, batch=[];
async function flush(){
  if(!batch.length)return;
  const al=batch.map((b,i)=>`p${i}:productUpdate(input:$i${i}){userErrors{message field}}`).join('\n');
  const vars=`(${batch.map((b,i)=>`$i${i}:ProductInput!`).join(',')})`;
  const r=await gql(t,`mutation${vars}{${al}}`,Object.fromEntries(batch.map((b,i)=>[`i${i}`,b])));
  const e=Object.values(r?.data||{}).flatMap(x=>x.userErrors||[]);
  if(e.length)console.log(' ⚠️',JSON.stringify(e).slice(0,200));
  batch=[]; await sleep(150);
}
for(const n of targets){
  const ct=clean(n.title); if(!ct) continue;
  const seoTitle=cut(`${ct} | LuxeStyle`,70);
  const seoDesc=cut(`${ct} online kaufen bei LuxeStyle: Premium-Qualität, Gratis-Versand ab CHF 65, 30 Tage Rückgabe, schnelle Lieferung in die Schweiz.`,160);
  if(LIVE){ batch.push({id:n.id, seo:{title:seoTitle, description:seoDesc}}); if(batch.length>=10) await flush(); }
  done++; if(done%100===0)console.log(`  … ${done}/${targets.length} SEO gesetzt`);
}
if(LIVE) await flush();
console.log(`Fertig. ${done} Produkte SEO gesetzt ${LIVE?'(LIVE)':'(DRY)'}. (gescannt ${scanned})`);
