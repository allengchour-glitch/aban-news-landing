import fs from 'fs';
const TOK=fs.readFileSync('/tmp/shopify_tok.txt','utf8').trim();
const SHOP='au3j0y-hq.myshopify.com';
const AD=['301971014017','302032716161','302566834561','302872297857','302994456961']
  .map(id=>({publicationId:`gid://shopify/Publication/${id}`}));
async function gql(q,v){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});return r.json();}
const ids=fs.readFileSync('/tmp/adult_ids.txt','utf8').split('\n').filter(Boolean);
let ok=0;
for(const pid of ids){
  const gid=`gid://shopify/Product/${pid}`;
  const u=await gql(`mutation($id:ID!,$p:[PublicationInput!]!){publishableUnpublish(id:$id,input:$p){userErrors{message}}}`,{id:gid,p:AD});
  const t=await gql(`mutation($id:ID!,$tags:[String!]!){tagsAdd(id:$id,tags:$tags){userErrors{message}}}`,{id:gid,tags:['nicht-bewerben','erotik']});
  const e=[...(u.data?.publishableUnpublish?.userErrors||[]),...(t.data?.tagsAdd?.userErrors||[])];
  console.log(`${e.length?'✗':'✓'} ${pid}${e.length?' '+JSON.stringify(e):''}`);
  if(!e.length)ok++;
  await new Promise(s=>setTimeout(s,400));
}
console.log('aus Werbe-Feeds gezogen (Online-Store bleibt):',ok,'/',ids.length);
