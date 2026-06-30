#!/usr/bin/env node
/* push_prepared.mjs — generischer Importer für vorbereitete CJ/BigBuy-Picks.
 * Liest <prefix>_create.json (productSet-Inputs i1..iN), <prefix>_media.json (m1..mN Extra-Bilder),
 * <prefix>_pids.json (Quell-IDs fürs Ledger). Legt an → Galerie → publiziert (6 Kanäle) → Ledger.
 * ENV: SHOPIFY_CLIENT_ID/SECRET/SHOP. Aufruf: PREFIX=/tmp/v3 LEDGER=dropship/cj_niche_done.txt node push_prepared.mjs
 */
import fs from 'node:fs';
const SHOP=(process.env.SHOPIFY_SHOP||'au3j0y-hq.myshopify.com').replace(/^https?:\/\//,'').replace(/\/.*/,'');
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET, API='2025-01';
const PREFIX=process.env.PREFIX||'/tmp/v3', LEDGER=process.env.LEDGER||'';
const PUBS=['301970915713','301971014017','302032716161','302566834561','302872297857','302994456961'].map(id=>({publicationId:`gid://shopify/Publication/${id}`}));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function token(){
  const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});
  const j=await r.json(); if(!j.access_token) throw new Error('token fail: '+JSON.stringify(j)); return j.access_token;
}
async function gql(tok,query,variables){
  const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',
    headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query,variables})});
  return r.json();
}
const SET=`mutation($input:ProductSetInput!){productSet(synchronous:true,input:$input){product{id title}userErrors{message}}}`;
const MEDIA=`mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$m){mediaUserErrors{message}}}`;
const PUB=`mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,input:$p){userErrors{message}}}`;

const create=JSON.parse(fs.readFileSync(`${PREFIX}_create.json`,'utf8'));
const media=JSON.parse(fs.readFileSync(`${PREFIX}_media.json`,'utf8'));
const pids=fs.existsSync(`${PREFIX}_pids.json`)?JSON.parse(fs.readFileSync(`${PREFIX}_pids.json`,'utf8')):[];
const keys=Object.keys(create);

const tok=await token();
let ok=0;
for(let i=0;i<keys.length;i++){
  const k=keys[i]; const input=create[k];
  const r=await gql(tok,SET,{input}); const e=r.data?.productSet?.userErrors||[]; const pid=r.data?.productSet?.product?.id;
  if(e.length||!pid){console.log('✗',input.title?.slice(0,32),JSON.stringify(e).slice(0,140)||'no id');continue;}
  const extra=media['m'+(i+1)]||[];
  if(extra.length){const mr=await gql(tok,MEDIA,{id:pid,m:extra});const me=mr.data?.productCreateMedia?.mediaUserErrors||[];if(me.length)console.log('  img-warn',JSON.stringify(me).slice(0,100));}
  await gql(tok,PUB,{id:pid,p:PUBS});
  if(LEDGER&&pids[i]) fs.appendFileSync(LEDGER,'cj:'+pids[i]+'\n');
  ok++; console.log('✅',input.title,'→',pid.split('/').pop());
  await sleep(350);
}
console.log(`\nFERTIG: ${ok}/${keys.length} angelegt.`);
