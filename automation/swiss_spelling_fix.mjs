#!/usr/bin/env node
/* swiss_spelling_fix — ersetzt „ß" → „ss" (Schweizer Hochdeutsch) in AKTIVEN Produkten (Titel+Beschreibung),
 * Collections (Titel+Beschreibung) und Pages (Body). ß ist ein DE/AT-Buchstabe; CH nutzt ausschliesslich „ss".
 * Ein „ß" entlarvt den Shop sofort als nicht-schweizerisch → Vertrauensverlust. Sicherer globaler Replace.
 * DRY-Default · LIVE=1. ENV: SHOPIFY_*.
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}
const fix=s=>(s||'').replace(/ß/g,'ss');

const t=await tk();if(!t){console.error('Kein Token');process.exit(1);}
let pFix=0,cFix=0,pgFix=0;
// 1) Produkte
let c=null,scanned=0;
do{
  const r=await gql(t,`query($c:String){products(first:50,after:$c,query:"status:active"){pageInfo{hasNextPage endCursor}nodes{id title descriptionHtml}}}`,{c});
  const pg=r?.data?.products;if(!pg){await sleep(1500);continue;}
  for(const p of pg.nodes){scanned++;
    const nt=fix(p.title),nd=fix(p.descriptionHtml);
    if(nt!==p.title||nd!==p.descriptionHtml){
      if(LIVE){const u=await gql(t,`mutation($id:ID!,$t:String!,$d:String!){productUpdate(input:{id:$id,title:$t,descriptionHtml:$d}){userErrors{message}}}`,{id:p.id,t:nt,d:nd});const e=u?.data?.productUpdate?.userErrors||[];if(e.length){console.log(' ⚠️P',JSON.stringify(e).slice(0,80));continue;}await sleep(150);}
      pFix++;
    }
  }
  c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null;
  if(scanned%500===0)console.log(`  … ${scanned} Produkte · ${pFix} mit ß gefixt`);
}while(c);
// 2) Collections
const col=await gql(t,`{collections(first:250){nodes{id title descriptionHtml}}}`);
for(const cl of col.data.collections.nodes){const nt=fix(cl.title),nd=fix(cl.descriptionHtml);if(nt!==cl.title||nd!==cl.descriptionHtml){if(LIVE){await gql(t,`mutation($id:ID!,$t:String!,$d:String!){collectionUpdate(input:{id:$id,title:$t,descriptionHtml:$d}){userErrors{message}}}`,{id:cl.id,t:nt,d:nd});await sleep(150);}cFix++;}}
// 3) Pages
const pgs=await gql(t,`{pages(first:50){nodes{id title body}}}`);
for(const p of pgs.data.pages.nodes){const nb=fix(p.body),ntt=fix(p.title);if(nb!==p.body||ntt!==p.title){if(LIVE){await gql(t,`mutation($id:ID!,$t:String!,$b:String!){pageUpdate(id:$id,page:{title:$t,body:$b}){userErrors{message}}}`,{id:p.id,t:ntt,b:nb});await sleep(150);}pgFix++;}}
console.log(`\nFertig. ß→ss: Produkte ${pFix} · Collections ${cFix} · Pages ${pgFix} ${LIVE?'':'(DRY)'}`);
