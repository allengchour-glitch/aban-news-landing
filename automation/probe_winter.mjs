#!/usr/bin/env node
/* probe_winter — search live product titles for winter/cold-weather terms, sample to confirm. */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const tk=async()=>{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;};
const t=await tk();
async function gql(q,v){for(let a=0;a<6;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}const j=await r.json();if((j?.data==null)&&Array.isArray(j?.errors)&&j.errors.some(e=>/THROTTLED/i.test(e?.extensions?.code||e?.message||''))){await sleep((a+1)*2500);continue;}return j;}return null;}

const TERMS=['heizung','heizlüfter','wärmflasche','handwärmer','taschenwärmer','thermosocken','thermounterwäsche','schneeschaufel','eiskratzer','enteiser','mütze','schal','handschuhe','ohrenwärmer','heizdecke','heizkissen','beheizbar','thermo','winter','kälte','fleece','wärme'];

const results={};
for(const term of TERMS){
  let cursor=null,all=[];
  for(let p=0;p<6;p++){
    const q=`{products(first:100,query:${JSON.stringify('title:*'+term+'*')},after:${cursor?JSON.stringify(cursor):'null'}){pageInfo{hasNextPage endCursor} edges{node{id title status}}}}`;
    const d=await gql(q); const c=d?.data?.products; if(!c)break;
    all.push(...c.edges.map(e=>e.node));
    if(!c.pageInfo.hasNextPage)break; cursor=c.pageInfo.endCursor; await sleep(300);
  }
  results[term]=all;
  await sleep(200);
}

// print per-term counts and samples
for(const term of TERMS){
  const r=results[term]; const active=r.filter(x=>x.status==='ACTIVE');
  console.log(`\n=== ${term} : ${r.length} total (${active.length} ACTIVE) ===`);
  r.slice(0,12).forEach(x=>console.log(`  [${x.status}] ${x.title}`));
}
