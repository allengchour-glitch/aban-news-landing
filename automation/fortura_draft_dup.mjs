/* fortura_draft_dup.mjs — entfernt die ALTEN Einzelgrössen-Fortura-Duplikate (Handle -ft…) aus dem Verkauf,
 * ABER nur wenn ein gruppiertes Pendant (-fg…, gleicher Basis-Titel) aktiv existiert. Sonst KEIN Draft
 * (würde sonst verkäufliche Ware entfernen). Ursache: Umbau auf Grössen-Varianten liess die Einzelprodukte
 * aktiv → dasselbe Produkt doppelt in den Kollektionen («doppel Bilder»). Tag 'alt-einzelgroesse-ersetzt'.
 * ENV: SHOPIFY_CLIENT_ID/SECRET [DRY=1] [SLEEP=120]
 */
import fs from 'node:fs';
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const SHOP='au3j0y-hq.myshopify.com';
const DRY=process.env.DRY==='1';
const SLEEP=parseInt(process.env.SLEEP||'120',10);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const norm=s=>(s||'').toLowerCase().replace(/·.*$/,'').replace(/\bgr\.?\s.*$/,'').replace(/[^a-z0-9äöü]+/g,' ').trim();
async function scc(){for(let a=0;a<5;a++){try{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});const t=JSON.parse(await r.text()).access_token;if(t)return t;}catch{}await sleep(2000*(a+1));}throw new Error('scc');}
let TOK;
async function gql(q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(JSON.stringify(j.errors||'').includes('Throttled')){await sleep(4000);continue;}TOK=await scc();await sleep(1000);}return{};}
TOK=await scc();

// 1) Alle aktiven Fortura durchgehen → gruppierte Basis-Titel sammeln + alte -ft merken
const grouped=new Set(); const old=[];
let cursor=null;
for(let p=0;p<120;p++){
  const r=await gql(`query($c:String){products(first:200,query:"tag:fortura status:active",after:$c){pageInfo{hasNextPage endCursor}edges{node{id title handle}}}}`,{c:cursor});
  if(!r.data)break;
  for(const {node:n} of r.data.products.edges){
    if(/-fg[a-z0-9]+$/i.test(n.handle)) grouped.add(norm(n.title));
    else if(/-ft/i.test(n.handle)) old.push(n);
  }
  if(!r.data.products.pageInfo.hasNextPage)break; cursor=r.data.products.pageInfo.endCursor;
}
console.log(`gruppierte Basis-Titel: ${grouped.size} | alte -ft aktiv: ${old.length}`);

// 2) alte -ft draften, wenn gruppiertes Pendant existiert
let draft=0, keep=0;
for(const n of old){
  if(grouped.has(norm(n.title))){
    if(DRY){ draft++; if(draft<=10)console.log('DRY DRAFT:',n.title.slice(0,45)); }
    else { await gql(`mutation($id:ID!){productUpdate(input:{id:$id,status:DRAFT,tags:["alt-einzelgroesse-ersetzt"]}){userErrors{message}}}`,{id:n.id}); draft++; await sleep(SLEEP); }
  } else { keep++; if(keep<=8)console.log('  BEHALTEN (kein Grouped):',n.title.slice(0,45)); }
}
console.log(`\n${DRY?'[DRY] ':''}gedraftet=${draft} behalten(kein Pendant)=${keep}`);
