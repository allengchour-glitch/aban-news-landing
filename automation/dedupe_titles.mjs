#!/usr/bin/env node
/* dedupe_titles — differenziert identische Produkt-Titel (Gemini vergibt gleichen Quell-Namen oft denselben Titel).
 * Scannt die N neuesten AKTIVEN bigbuy-Produkte, gruppiert nach exaktem Titel, hängt bei Gruppen >1 ein distinktes
 * Modell-Suffix «…» an (nach Preis sortiert), mit grossem Nick-Pool + index-Fallback (nie "undefined").
 * DRY-Default · LIVE=1. ENV: SHOPIFY_*. SCAN=Anzahl neueste Produkte (default 60).
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const SCAN=parseInt(process.env.SCAN||'60',10);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}
const NICKS=['«Classic»','«Comfort»','«Plus»','«Pro»','«Max»','«Smart»','«Active»','«Premium»','«Urban»','«Compact»','«Deluxe»','«Style»','«Prime»','«Elite»','«Air»','«Neo»','«Duo»','«Solo»','«Easy»','«Power»'];
const nick=i=>NICKS[i]||`«Modell ${i+1}»`;

const t=await tk();if(!t){console.error('Kein Token');process.exit(1);}
let c=null,nodes=[],n=0;
do{const r=await gql(t,`query($c:String){products(first:50,after:$c,query:"tag:bigbuy status:active",sortKey:CREATED_AT,reverse:true){pageInfo{hasNextPage endCursor}nodes{id title variants(first:1){nodes{price}}}}}`,{c});const pg=r?.data?.products;if(!pg)break;
 for(const p of pg.nodes){if(n++<SCAN)nodes.push(p);} c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null;
}while(c&&n<SCAN);
const groups={}; for(const p of nodes)(groups[p.title]=groups[p.title]||[]).push(p);
let fixed=0;
for(const [title,arr] of Object.entries(groups)){
  if(arr.length<2)continue;
  arr.sort((a,b)=>parseFloat(a.variants?.nodes?.[0]?.price||0)-parseFloat(b.variants?.nodes?.[0]?.price||0));
  const base=title.split(/[:–-]/)[0].trim();
  const tail=title.slice(base.length).replace(/^[\s:–-]+/,'').trim();
  console.log(`„${title.slice(0,42)}" ×${arr.length} → differenziere`);
  for(let i=0;i<arr.length;i++){
    const nt=`${base} ${nick(i)}${tail?' – '+tail:''}`.slice(0,255);
    if(LIVE){const u=await gql(t,`mutation($id:ID!,$ti:String!,$s:SEOInput!){productUpdate(input:{id:$id,title:$ti,seo:$s}){userErrors{message}}}`,{id:arr[i].id,ti:nt,s:{title:`${base} ${nick(i)} | LuxeStyle`}});const e=u?.data?.productUpdate?.userErrors||[];if(e.length){console.log('  ⚠️',JSON.stringify(e).slice(0,80));continue;}}
    console.log(`  ${LIVE?'✅':'(DRY)'} ${nt.slice(0,55)} (CHF ${arr[i].variants?.nodes?.[0]?.price})`);
    fixed++; await sleep(180);
  }
}
console.log(`\nFertig. ${fixed} Titel differenziert (aus ${Object.values(groups).filter(a=>a.length>1).length} Gruppen) ${LIVE?'':'(DRY)'}`);
