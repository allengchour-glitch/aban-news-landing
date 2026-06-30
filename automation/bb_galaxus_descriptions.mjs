#!/usr/bin/env node
/* bb_galaxus_descriptions.mjs — re-beschreibt BigBuy-Marken-Produkte im Galaxus-Stil
 * (Intro + Eigenschaften-Specs aus BigBuy-Daten + Trust). Findet Produkte via SKU "BB-<id>".
 * ENV: BIGBUY_API_KEY · SHOPIFY_CLIENT_ID/SECRET[/SHOP] · LIMIT=50 (Default alle) · DRY=1
 */
import { buildGalaxusDesc } from './lib/galaxus_desc.mjs';
const BB=(process.env.BIGBUY_API_KEY||'').trim();
const SHOP=(process.env.SHOPIFY_SHOP||'au3j0y-hq.myshopify.com').replace(/^https?:\/\//,'').replace(/\/.*/,'');
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET, API='2025-01';
const LIMIT=parseInt(process.env.LIMIT||'0',10)||Infinity, DRY=process.env.DRY==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const blurbFor=(t)=>/parfum|duft/i.test(t)?'Markenparfüm':/uhr/i.test(t)?'Marken-Armbanduhr':/tasche/i.test(t)?'Marken-Tasche':/sonnenbrille/i.test(t)?'Marken-Sonnenbrille':/haar/i.test(t)?'Marken-Haarpflege':/skincare|hautpflege/i.test(t)?'Marken-Hautpflege':'Original-Marken-Beauty';

async function bb(p){try{const r=await fetch('https://api.bigbuy.eu'+p,{headers:{'Authorization':`Bearer ${BB}`,'Accept':'application/json'}});return r.status===200?await r.json():null;}catch{return null;}}
async function tok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
async function gql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}

console.log('Lade BigBuy-Katalog…');
const arr=await bb('/rest/catalog/productsinformation.json?isoCode=de');
if(!arr){console.error('Katalog-Fehler');process.exit(1);}
const descById=new Map(arr.map(p=>[String(p.id),p.description||'']));
const descBySku=new Map(arr.map(p=>[String(p.sku||'').toUpperCase(),p.description||'']));
console.log('Katalog:',arr.length);

const T=await tok();
const QUERY=process.env.PRODUCT_QUERY||'sku:BB-* AND -tag:ls-ai-deep';
const Q=`query($c:String){products(first:50,after:$c,query:${JSON.stringify(QUERY)}){pageInfo{hasNextPage endCursor}nodes{id title productType tags variants(first:1){nodes{sku}}}}}`;
const UP=`mutation($id:ID!,$d:String!){productUpdate(input:{id:$id,descriptionHtml:$d}){userErrors{message}}}`;
let cursor=null, done=0, updated=0;
outer: while(true){
 const r=await gql(T,Q,{c:cursor});
 const conn=r.data?.products; if(!conn){console.log('query fail',JSON.stringify(r).slice(0,200));break;}
 for(const p of conn.nodes){
  if(done>=LIMIT) break outer;
  done++;
  const sku=p.variants?.nodes?.[0]?.sku||''; const m=sku.match(/^bb-?(.+)$/i); if(!m)continue;
  const key=m[1].trim().toUpperCase();
  const raw=descById.get(key)||descBySku.get(key)||descBySku.get('BB'+key); if(!raw||raw.length<40)continue;
  const html=buildGalaxusDesc(raw,{title:p.title,blurb:blurbFor(p.productType+' '+(p.tags||[]).join(' '))});
  if(DRY){if(updated<3)console.log('\n---',p.title.slice(0,40),'---\n',html.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').slice(0,260));updated++;continue;}
  const ur=await gql(T,UP,{id:p.id,d:html}); const e=ur.data?.productUpdate?.userErrors||[];
  if(e.length){console.log('✗',p.title.slice(0,30),JSON.stringify(e).slice(0,80));continue;}
  updated++; if(updated%20===0)console.log(`  ${updated} aktualisiert…`);
  await sleep(120);
 }
 if(!conn.pageInfo.hasNextPage) break;
 cursor=conn.pageInfo.endCursor;
}
console.log(`\nFERTIG: ${updated}/${done} Galaxus-Beschreibungen${DRY?' [DRY]':''}.`);
