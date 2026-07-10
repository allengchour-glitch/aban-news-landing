/* Retag-Sweep: alle aktiven bb-lieferbar-ch mit verbessertem cat_tags nachsortieren (Damenring/Laufschuhe etc.) */
import fs from 'node:fs';
import { catTags } from '../cat_tags.mjs';
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET, SHOP='au3j0y-hq.myshopify.com';
async function scc(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
let TOK=await scc();
async function gql(q,v){for(let a=0;a<4;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(JSON.stringify(j.errors||'').includes('Throttled')){await new Promise(s=>setTimeout(s,3000));continue;}TOK=await scc();}return{};}
let cursor=null, retagged=0, seen=0;
do{
  const q=`query($c:String){products(first:100,after:$c,query:"tag:bb-lieferbar-ch status:active"){pageInfo{hasNextPage endCursor} edges{node{id title tags}}}}`;
  const r=await gql(q,{c:cursor}); const p=r.data?.products; if(!p)break;
  for(const e of p.edges){
    seen++;
    const have=new Set(e.node.tags);
    const want=catTags(e.node.title).filter(t=>!have.has(t));
    if(!want.length)continue;
    await gql(`mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}`,{id:e.node.id,t:want});
    retagged++;
    await new Promise(s=>setTimeout(s,250));
  }
  cursor=p.pageInfo.hasNextPage?p.pageInfo.endCursor:null;
}while(cursor);
console.log(`retag fertig: ${retagged} nachsortiert / ${seen} geprüft`);
