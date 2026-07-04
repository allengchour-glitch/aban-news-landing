import fs from 'node:fs';
const SHOP=process.env.SHOPIFY_SHOP, CID=process.env.SHOPIFY_CLIENT_ID, CSECRET=process.env.SHOPIFY_CLIENT_SECRET;
const API='2025-01';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSECRET,grant_type:'client_credentials'})});return (await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<8;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429){await sleep(2000*(a+1));continue;}const j=await r.json();if(j.errors){if(JSON.stringify(j.errors).includes('THROTTLED')){await sleep(2000*(a+1));continue;}throw new Error(JSON.stringify(j.errors));}return j.data;}}
const token=await tok();
let cursor=null; const dist={}; let n=0;
while(true){
  const d=await gql(token,`query($c:String){products(first:100,after:$c,query:"status:active",sortKey:CREATED_AT){pageInfo{hasNextPage endCursor}edges{node{productType}}}}`,{c:cursor});
  for(const e of d.products.edges){n++;const t=(e.node.productType||'(empty)').trim()||'(empty)';dist[t]=(dist[t]||0)+1;}
  if(!d.products.pageInfo.hasNextPage)break;cursor=d.products.pageInfo.endCursor;
}
const sorted=Object.entries(dist).sort((a,b)=>b[1]-a[1]);
console.log('total active:',n,'distinct types:',sorted.length);
sorted.forEach(([k,v])=>console.log(`${String(v).padStart(6)}  ${k}`));
