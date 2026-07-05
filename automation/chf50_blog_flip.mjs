#!/usr/bin/env node
/* chf50_blog_flip — flippt "CHF 65" → "CHF 50" im body ALLER Ratgeber-Artikel (paginiert, idempotent).
 * Nötig, weil ein früherer Lauf bei 200 Artikeln gedeckelt war (Blog hat 255). ENV: SHOPIFY_CLIENT_ID/SECRET. */
const SHOP='au3j0y-hq.myshopify.com',API='2025-01';
const CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const BLOG='gid://shopify/Blog/119864721793';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
const t=await tok();
async function gql(q,v){for(let a=0;a<6;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}
const UPD=`mutation($id:ID!,$b:String!){articleUpdate(id:$id,article:{body:$b}){userErrors{message}}}`;
let cursor=null,scanned=0,flipped=0,errs=0;
while(true){
  const q=`{ blog(id:"${BLOG}"){ articles(first:50${cursor?`,after:"${cursor}"`:''}){ pageInfo{hasNextPage endCursor} edges{node{id body}} } } }`;
  const j=await gql(q); const a=j?.data?.blog?.articles; if(!a)break;
  for(const e of a.edges){ scanned++; const b=e.node.body||''; if(!b.includes('CHF 65'))continue;
    const nb=b.split('CHF 65').join('CHF 50');
    const r=await gql(UPD,{id:e.node.id,b:nb}); const ue=r?.data?.articleUpdate?.userErrors||[];
    if(ue.length){errs++;console.log('✗',e.node.id,JSON.stringify(ue).slice(0,80));}else{flipped++;console.log('✅ flip',e.node.id.split('/').pop());}
    await sleep(250);
  }
  if(!a.pageInfo.hasNextPage)break; cursor=a.pageInfo.endCursor;
}
console.log(`DONE. scanned=${scanned} flipped=${flipped} errors=${errs}`);
