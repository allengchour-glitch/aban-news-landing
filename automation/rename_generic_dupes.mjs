const SHOP='au3j0y-hq.myshopify.com',API='2025-01';
const CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const DRY=process.env.DRY==='1';
async function tok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
async function gql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}
const T=await tok();
const Q=`query($c:String){products(first:200,after:$c,query:"status:active"){pageInfo{hasNextPage endCursor}nodes{id title variants(first:1){nodes{sku}} }}}`;
let cur=null, byTitle={};
while(true){const r=await gql(T,Q,{c:cur});const c=r.data?.products;if(!c)break;
 for(const p of c.nodes){const k=p.title.trim();(byTitle[k]=byTitle[k]||[]).push(p);}
 if(!c.pageInfo.hasNextPage)break;cur=c.pageInfo.endCursor;}
const groups=Object.entries(byTitle).filter(([t,v])=>{
 if(v.length<2||v.length>6)return false;
 const skus=v.map(p=>p.variants.nodes[0]?.sku||'');
 if(new Set(skus).size<2)return false;
 if(!skus.every(s=>/^CJ-/.test(s)))return false;      // NUR CJ
 if(/[«»]|Modell/.test(t))return false;                 // keine Marken-Marker, nicht schon behandelt
 return true;
});
const UP=`mutation($id:ID!,$t:String!,$s:String!){productUpdate(input:{id:$id,title:$t,seo:{title:$s}}){userErrors{message}}}`;
let planned=[],done=0;
for(const [title,v] of groups){for(const p of v){
 const ref=(p.variants.nodes[0]?.sku||'').replace(/^CJ-?/,'').replace(/^CJ/,'').slice(-6);
 const nt=`${title} (Typ ${ref})`.slice(0,90);
 planned.push(nt);
 if(!DRY){const r=await gql(T,UP,{id:p.id,t:nt,s:(nt.slice(0,60)+' | LuxeStyle').slice(0,70)});if(!(r.data?.productUpdate?.userErrors||[]).length)done++;await new Promise(r=>setTimeout(r,80));}
}}
console.log(`CJ-Generik-Dublette-Gruppen: ${groups.length} · Produkte: ${planned.length}`);
planned.slice(0,40).forEach(p=>console.log('  '+p));
console.log(DRY?'\n[DRY]':`\nFERTIG: ${done} umbenannt.`);
