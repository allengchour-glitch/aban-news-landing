#!/usr/bin/env node
/* fix_seo.mjs — „fix alles inkl SEO": (1) fehlende seo.title/description auffüllen · (2) englische csv-import-Reste draften.
 * ENV: SHOPIFY_CLIENT_ID/SECRET · LIMIT=20000 · DRY=1
 */
const SHOP='au3j0y-hq.myshopify.com',API='2025-01';
const CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const DRY=process.env.DRY==='1', LIMIT=parseInt(process.env.LIMIT||'20000',10);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// englische Titel-Erkennung (auf DE-Shop unerwünscht) — nur für csv-import
const ENG=/\b(for|with|the|and|Wireless|Charger|Holder|Stand|Portable|Adjustable|Foldable|Waterproof|Kit|Set|Bag|Case|Rechargeable|Smartphone)\b/;
const DE=/für|mit|und|Halter|Ladeger|Kabellos|Tasche|Generalüberholt|Ständer|Set für|deutsch/i;
async function tok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
async function gql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}
const Q=`query($c:String){products(first:100,after:$c,query:"status:active"){pageInfo{hasNextPage endCursor}nodes{id title productType seo{title description} tags}}}`;
const UPSEO=`mutation($id:ID!,$t:String!,$d:String!){productUpdate(input:{id:$id,seo:{title:$t,description:$d}}){userErrors{message}}}`;
const DRAFT=`mutation($id:ID!){productUpdate(input:{id:$id,status:DRAFT}){userErrors{message}}}`;
const T=await tok();
let cursor=null, seen=0, seoFixed=0, drafted=0;
while(true){
 const r=await gql(T,Q,{c:cursor}); const conn=r.data?.products; if(!conn){console.log('q fail',JSON.stringify(r).slice(0,150));break;}
 for(const p of conn.nodes){
  if(seoFixed+drafted>=LIMIT)break;
  seen++;
  // (2) englische csv-import → draft
  if(p.tags.includes('csv-import') && ENG.test(p.title) && !DE.test(p.title)){
   if(!DRY)await gql(T,DRAFT,{id:p.id}); drafted++; continue;
  }
  // (1) SEO auffüllen wenn leer
  const st=(p.seo?.title||'').trim(), sd=(p.seo?.description||'').trim();
  if(!st||!sd){
   const nt=(p.title+' | LuxeStyle CH').slice(0,70);
   const nd=(`${p.title} – ${p.productType||'Produkt'} bei LuxeStyle Schweiz. 100% geprüft, EU-Lager, 30 Tage Rückgabe, Gratis-Versand ab CHF 65.`).slice(0,320);
   if(!DRY){const u=await gql(T,UPSEO,{id:p.id,t:nt,d:nd}); if((u.data?.productUpdate?.userErrors||[]).length)continue;}
   seoFixed++;
   if(!DRY)await sleep(70);
   if(seoFixed%50===0)console.log(`  ${seoFixed} SEO gefüllt, ${drafted} engl. gedraftet…`);
  }
 }
 if(!conn.pageInfo.hasNextPage)break; cursor=conn.pageInfo.endCursor;
}
console.log(`\nFERTIG: ${seoFixed} SEO-Texte gefüllt · ${drafted} englische CSV-Produkte gedraftet · ${seen} gescannt${DRY?' [DRY]':''}.`);
