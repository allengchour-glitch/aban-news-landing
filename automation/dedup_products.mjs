const SHOP='au3j0y-hq.myshopify.com',API='2025-01';
const CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const DRY=process.env.DRY==='1';
async function tok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
async function gql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}
const Q=`query($c:String){products(first:200,after:$c,query:"status:active"){pageInfo{hasNextPage endCursor}nodes{id title createdAt variants(first:1){nodes{sku}} }}}`;
const T=await tok();
let cur=null, bySku={};
while(true){const r=await gql(T,Q,{c:cur});const c=r.data?.products;if(!c)break;
 for(const p of c.nodes){const sku=p.variants.nodes[0]?.sku;if(sku)(bySku[sku]=bySku[sku]||[]).push(p);}
 if(!c.pageInfo.hasNextPage)break;cur=c.pageInfo.endCursor;}
// SICHER: nur echte Supplier-SKUs (bb-/BB-/CJ-), Gruppe 2-4, KEINE POD (9000001/GLOBAL)
const isSupplier=s=>/^(bb-|BB-|CJ-)/.test(s) && !/^9000001|^GLOBAL/i.test(s);
const targets=[];
for(const [sku,v] of Object.entries(bySku)){
 if(v.length<2||v.length>4||!isSupplier(sku))continue;
 const sorted=v.slice().sort((a,b)=>a.createdAt.localeCompare(b.createdAt)); // ältestes zuerst behalten
 const keep=sorted[0], drop=sorted.slice(1);
 targets.push({sku,keep,drop});
}
let dropCount=0; targets.forEach(t=>dropCount+=t.drop.length);
console.log(`SICHERE Dedup-Gruppen: ${targets.length} · zu draftende Dubletten: ${dropCount}`);
for(const t of targets.slice(0,40))console.log(`  ${t.sku}: behalte ${t.keep.id.split('/').pop()} (${t.keep.createdAt.slice(0,10)}), draft ${t.drop.map(d=>d.id.split('/').pop()+' ('+d.createdAt.slice(0,10)+')').join(', ')} — ${t.keep.title.slice(0,45)}`);
if(DRY){console.log('\n[DRY] nichts geändert.');process.exit(0);}
const UP=`mutation($id:ID!){productUpdate(input:{id:$id,status:DRAFT}){userErrors{message}}}`;
let done=0;
for(const t of targets){for(const d of t.drop){const r=await gql(T,UP,{id:d.id});if(!(r.data?.productUpdate?.userErrors||[]).length)done++;await new Promise(r=>setTimeout(r,90));}}
console.log(`\nFERTIG: ${done} Dubletten auf DRAFT gesetzt (Original je Gruppe bleibt aktiv).`);
