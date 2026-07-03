#!/usr/bin/env node
/* backfill_images — lädt für bestehende BigBuy-Produkte ALLE verfügbaren ECHTEN BigBuy-Bilder nach,
 * die beim Import (Cap 6) gefehlt haben. NUR echte BigBuy-Bilder, nichts erfunden. Idempotent.
 * Erkennt Duplikate über den BigBuy-Dateinamen (bleibt in der Shopify-CDN-URL erhalten).
 * ENV: SHOPIFY_* , BIGBUY_API_KEY. QUERY (Default tag:werkzeug AND tag:marken), CAP=10, LIVE=1, MAX=Zahl.
 */
const SHOP=process.env.SHOPIFY_SHOP,API='2025-01',CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const BB=process.env.BIGBUY_API_KEY;
const LIVE=process.env.LIVE==='1';
const QUERY=process.env.QUERY||'tag:werkzeug AND tag:marken';
const CAP=Number(process.env.CAP||10);
const MAX=Number(process.env.MAX||0);
const GAP=Number(process.env.GAP||1200);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const tok=async()=>{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;};
const T=await tok();
const gql=async(q,v)=>{for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':T},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;};
async function bb(p){for(let i=0;i<6;i++){const r=await fetch('https://api.bigbuy.eu'+p,{headers:{Authorization:'Bearer '+BB,Accept:'application/json'}});const t=await r.text();if(r.status===429||/rate limit/i.test(t)){await sleep((i+1)*4000);continue;}if(!r.ok)return null;try{return JSON.parse(t);}catch{return null;}}return null;}
async function ok(u){try{const r=await fetch(u,{method:'HEAD'});if(r.ok)return true;const g=await fetch(u);return g.ok;}catch{return false;}}
const fname=u=>{try{return decodeURIComponent(new URL(u).pathname.split('/').pop().split('?')[0]).replace(/^\d+_/,'').toLowerCase();}catch{return (u||'').toLowerCase();}};

// Phase 1: passende Produkte + aktuelle Medien sammeln
const Q=`query($c:String){products(first:40,query:"${QUERY}",after:$c){pageInfo{hasNextPage endCursor}edges{node{id handle media(first:20){nodes{preview{image{url}}}}}}}}`;
let cur=null,items=[],seen=new Set();
do{const r=await gql(Q,{c:cur});const pg=r?.data?.products;if(!pg){await sleep(2000);continue;}
  for(const e of pg.edges){if(seen.has(e.node.id))continue;seen.add(e.node.id);items.push(e.node);}
  cur=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null;
  if(MAX&&items.length>=MAX)break;
}while(cur);
console.log(`Phase 1: ${items.length} Produkte (${QUERY}).`);

const ADD=`mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$m){media{id}mediaUserErrors{field message}}}`;
let addedTotal=0,touched=0,checked=0;
for(const p of items){
  const id=(p.handle.match(/-(\d+)$/)||[])[1]; if(!id)continue;
  checked++;
  const have=(p.media?.nodes||[]).map(n=>n?.preview?.image?.url).filter(Boolean);
  const haveN=have.length;
  if(haveN>=CAP)continue;
  const d=await bb(`/rest/catalog/productimages/${id}.json`); await sleep(GAP);
  const bbUrls=((d&&d.images)||[]).map(x=>x.url).filter(Boolean);
  if(bbUrls.length<=haveN)continue; // BigBuy hat nicht mehr als schon da
  const haveNames=new Set(have.map(fname));
  const missing=[];
  for(const u of bbUrls){ if(haveNames.has(fname(u)))continue; if(await ok(u))missing.push(u); if(haveN+missing.length>=CAP)break; }
  if(!missing.length)continue;
  console.log(`  ${p.handle.slice(0,48)}: ${haveN} → +${missing.length}`);
  if(LIVE){const r=await gql(ADD,{id:p.id,m:missing.map(u=>({originalSource:u,mediaContentType:'IMAGE'}))});const er=r?.data?.productCreateMedia?.mediaUserErrors||[];if(er.length)console.log('   ⚠️',JSON.stringify(er).slice(0,140));else{addedTotal+=missing.length;touched++;}await sleep(300);}
  else addedTotal+=missing.length;
}
console.log(`\nFERTIG${LIVE?'':' [DRY]'}: ${checked} geprüft · ${touched} Produkte ergänzt · ${addedTotal} echte BigBuy-Bilder nachgeladen.`);
