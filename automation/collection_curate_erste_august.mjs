const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET, SHOP='au3j0y-hq.myshopify.com';
const DRY=process.env.DRY==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function scc(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return JSON.parse(await r.text()).access_token;}
const TOK=await scc();
const gql=async(q,v)=>{for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;await sleep(3000);}return null;};
const c=await gql(`{collections(first:3,query:"handle:erste-august"){edges{node{id handle}}}}`,{});
const col=c.data.collections.edges.find(e=>e.node.handle==='erste-august').node;
// Off-Theme: Trachten/Waggis/Nikolaus/Fasnacht/Bayrisch etc. — NICHT 1. August (aber Schweiz-echte bleiben)
const off=/Nikolaus|Lederhose|Waggis|Trachten|Bayrisch|Bayerisch|Fasnacht|Weihnacht|Zimmermädchen|Oktoberfest|Dirndl|Wiesn/i;
let after=null, hits=[];
for(let p=0;p<12;p++){
  const r=await gql(`query($id:ID!,$c:String){collection(id:$id){products(first:50,after:$c){pageInfo{hasNextPage endCursor}edges{node{id title}}}}}`,{id:col.id,c:after});
  for(const e of r.data.collection.products.edges){ if(off.test(e.node.title)) hits.push(e.node); }
  if(!r.data.collection.products.pageInfo.hasNextPage)break; after=r.data.collection.products.pageInfo.endCursor;
}
console.log(`${hits.length} off-theme → schweiz-edition-Tag entfernen`);
let done=0;
for(const n of hits){
  if(!DRY){ const u=await gql(`mutation($id:ID!,$tags:[String!]!){tagsRemove(id:$id,tags:$tags){userErrors{message}}}`,{id:n.id,tags:['schweiz-edition']}); if((u.data?.tagsRemove?.userErrors||[]).length){console.log('  FEHLER',n.title);continue;} await sleep(200); }
  done++;
}
console.log(`${DRY?'WÜRDE entfernen':'✅ Tag entfernt bei'}: ${done}`);
