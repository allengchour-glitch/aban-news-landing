/* cj_sort.mjs — sortiert die CJ-Produkte sauber in Collections: wendet cat_tags (Titel→Kategorie)
 * auf alle cj-real-Produkte an und ergänzt fehlende Kategorie-Tags → sie fliessen in die Smart-Collections.
 * Sanft (Fortura hat Vorrang). Idempotent (nur fehlende Tags). ENV: SHOPIFY_CLIENT_ID/SECRET. [SLEEP=ms]
 */
import { catTags } from './cat_tags.mjs';
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const SHOP='au3j0y-hq.myshopify.com';
const SLEEP=parseInt(process.env.SLEEP||'350',10);   // sanft, damit Fortura-Shards Vorrang haben
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function scc(){for(let a=0;a<5;a++){try{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});const t=JSON.parse(await r.text()).access_token;if(t)return t;}catch{}await sleep(2000*(a+1));}throw new Error('scc');}
let TOK;
async function gql(q,v){for(let a=0;a<4;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(JSON.stringify(j.errors||'').includes('Throttled')){await sleep(4000);continue;}TOK=await scc();await sleep(1000);}return{};}
TOK=await scc();
let cursor=null,scanned=0,tagged=0;
for(let p=0;p<220;p++){
  const q=`query($c:String){products(first:100,query:"tag:cj-real",after:$c){pageInfo{hasNextPage endCursor}edges{node{id title tags}}}}`;
  const r=await gql(q,{c:cursor}); if(!r.data)break;
  for(const {node:n} of r.data.products.edges){scanned++;
    const want=catTags(n.title||'');
    const missing=want.filter(t=>!n.tags.includes(t));
    if(missing.length){
      const m=await gql(`mutation($id:ID!,$tags:[String!]!){tagsAdd(id:$id,tags:$tags){userErrors{message}}}`,{id:n.id,tags:missing});
      if(!m.data?.tagsAdd?.userErrors?.length)tagged++;
      await sleep(SLEEP);
    }
  }
  if(tagged%250===0&&tagged)console.log('  sortiert:',tagged,'/ gescannt',scanned);
  if(!r.data.products.pageInfo.hasNextPage)break; cursor=r.data.products.pageInfo.endCursor;
}
console.log(`FERTIG. gescannt=${scanned} nachsortiert=${tagged}`);
