#!/usr/bin/env node
/* title_polish.mjs — putzt Roh-Artefakte aus Produkttiteln (Artikel-Codes, Dubletten, offene Klammern).
 * KONSERVATIV: entfernt nur eindeutigen Müll, lässt echte Modell-/Grössen-Infos stehen.
 * ENV: SHOPIFY_CLIENT_ID/SECRET · QUERY (Default recent bigbuy) · LIMIT=2000 · DRY=1
 */
const SHOP='au3j0y-hq.myshopify.com',API='2025-01';
const CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const QUERY=process.env.QUERY||'tag:bigbuy tag:marke';
const LIMIT=parseInt(process.env.LIMIT||'2000',10), DRY=process.env.DRY==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function polish(t){
 let s=t;
 s=s.replace(/\b[A-Z]{2,4}\d{3,}(?:[- ]\d{2,})?\b/g,' ');       // Artikel-Codes (+ optional Farb-Code danach): FZ7553 359, SX03121410, AJ0094
 // (kein blanker \d{5,}-Filter — Spec-Zahlen wie 20000 mAh würden fälschlich getroffen)
 s=s.replace(/\b(\d{1,3})\s+\1\b/g,'$1');                        // Dublette "5 5" → "5"
 s=s.replace(/\(\s*(Größe\s*\d+)\s*$/i,'($1)');                  // offene "(Größe 6" schliessen
 s=s.replace(/\(\s*$/,'');                                       // leere offene Klammer am Ende
 s=s.replace(/\s{2,}/g,' ').replace(/\s+([)\]])/g,'$1').replace(/\(\s*\)/g,'').replace(/\s*[-–]\s*$/,'').trim();
 s=s.replace(/\s+(cm|mm|ml|l|W|K|g|kg)\b/gi,' $1'); // Einheiten normalisieren (kosmetisch)
 return s;
}

async function tok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
async function gql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}
const Q=`query($c:String){products(first:60,after:$c,query:${JSON.stringify(QUERY)}){pageInfo{hasNextPage endCursor}nodes{id title seo{title}}}}`;
const UP=`mutation($id:ID!,$t:String!,$s:String!){productUpdate(input:{id:$id,title:$t,seo:{title:$s}}){userErrors{message}}}`;

const T=await tok();
let cursor=null,seen=0,fixed=0,examples=[];
outer: while(true){
 const r=await gql(T,Q,{c:cursor}); const conn=r.data?.products; if(!conn){console.log('q fail',JSON.stringify(r).slice(0,150));break;}
 for(const p of conn.nodes){
  if(fixed>=LIMIT)break outer; seen++;
  const nt=polish(p.title);
  if(nt===p.title||nt.length<5)continue;
  if(examples.length<20)examples.push(`${p.title}\n   → ${nt}`);
  if(DRY){fixed++;continue;}
  const nseo=(nt+' | LuxeStyle CH').slice(0,70);
  const ur=await gql(T,UP,{id:p.id,t:nt,s:nseo});
  if((ur.data?.productUpdate?.userErrors||[]).length){console.log('  ✗',p.title.slice(0,30),JSON.stringify(ur.data.productUpdate.userErrors).slice(0,80));continue;}
  fixed++; await sleep(120);
  if(fixed%25===0)console.log(`  ${fixed} Titel geputzt…`);
 }
 if(!conn.pageInfo.hasNextPage)break; cursor=conn.pageInfo.endCursor;
}
console.log('\nBeispiele:\n'+examples.join('\n'));
console.log(`\nFERTIG: ${fixed}/${seen} Titel geputzt${DRY?' [DRY]':''}.`);
