#!/usr/bin/env node
/* cj_gadget_galaxus.mjs — Galaxus-Stil-Beschreibungen für alle Gadget-Produkte (tag:gadgets).
 * ENV: SHOPIFY_CLIENT_ID/SECRET[/SHOP] · LIMIT=0 (alle) · DRY=1 · QUERY override
 */
import { buildGadgetDesc } from './lib/gadget_desc.mjs';
const SHOP=(process.env.SHOPIFY_SHOP||'au3j0y-hq.myshopify.com').replace(/^https?:\/\//,'').replace(/\/.*/,'');
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET, API='2025-01';
const LIMIT=parseInt(process.env.LIMIT||'0',10)||Infinity, DRY=process.env.DRY==='1';
const QUERY=process.env.QUERY||'tag:gadgets';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
async function gql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}
const Q=`query($c:String){products(first:50,after:$c,query:${JSON.stringify(QUERY)}){pageInfo{hasNextPage endCursor}nodes{id title}}}`;
const UP=`mutation($id:ID!,$d:String!){productUpdate(input:{id:$id,descriptionHtml:$d}){userErrors{message}}}`;
const T=await tok(); let cursor=null, done=0, upd=0;
outer: while(true){
 const r=await gql(T,Q,{c:cursor}); const conn=r.data?.products; if(!conn){console.log('query fail',JSON.stringify(r).slice(0,150));break;}
 for(const p of conn.nodes){
  if(done>=LIMIT)break outer; done++;
  const html=buildGadgetDesc(p.title);
  if(DRY){if(upd<3)console.log('\n---',p.title,'---\n',html.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').slice(0,240));upd++;continue;}
  const ur=await gql(T,UP,{id:p.id,d:html}); const e=ur.data?.productUpdate?.userErrors||[];
  if(e.length){console.log('✗',p.title.slice(0,30),JSON.stringify(e).slice(0,80));continue;}
  upd++; if(upd%15===0)console.log(`  ${upd} aktualisiert…`); await sleep(120);
 }
 if(!conn.pageInfo.hasNextPage)break; cursor=conn.pageInfo.endCursor;
}
console.log(`\nFERTIG: ${upd}/${done} Gadget-Galaxus-Beschreibungen${DRY?' [DRY]':''}.`);
