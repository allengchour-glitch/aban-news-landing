#!/usr/bin/env node
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const tk=async()=>{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;};
const t=await tk();
async function gql(q,v){for(let a=0;a<6;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}const j=await r.json();if((j?.data==null)&&Array.isArray(j?.errors)&&j.errors.some(e=>/THROTTLED/i.test(e?.extensions?.code||e?.message||''))){await sleep((a+1)*2500);continue;}return j;}return null;}
let prods=[],pc=null;
do{const r=await gql(`query($c:String){products(first:250,after:$c){pageInfo{hasNextPage endCursor}edges{node{title status}}}}`,{c:pc});const p=r?.data?.products;if(!p)break;prods.push(...p.edges.map(e=>e.node));pc=p.pageInfo.hasNextPage?p.pageInfo.endCursor:null;}while(pc);
for(const term of ['mobile','rassel','greifling','babyspielzeug','motorikspielzeug']){
  const m=prods.filter(p=>p.title.toLowerCase().includes(term));
  console.log(`\n### "${term}" -> ${m.length}`);
  for(const p of m)console.log(`  [${p.status}] ${p.title}`);
}
