import fs from 'node:fs';
const SHOP='au3j0y-hq.myshopify.com',API='2025-01';
const CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const TOKEN=fs.readFileSync('/tmp/cj_token.txt','utf8').trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
async function gql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}
const T=await tok();
const Q=`query($c:String){products(first:200,after:$c,query:"status:active"){pageInfo{hasNextPage endCursor}nodes{id title variants(first:1){nodes{sku}} }}}`;
let cur=null, hits=[];
while(true){const r=await gql(T,Q,{c:cur});const c=r.data?.products;if(!c)break;
 for(const p of c.nodes){if(/\(Typ\s/.test(p.title))hits.push({id:p.id,title:p.title,sku:p.variants.nodes[0]?.sku});}
 if(!c.pageInfo.hasNextPage)break;cur=c.pageInfo.endCursor;}
console.log('(Typ-Produkte:',hits.length);
const out=[];
for(const p of hits){
 const sku=(p.sku||'').replace(/^CJ-/,'');
 let d=null;
 try{const r=await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/query?productSku=${encodeURIComponent(sku)}`,{headers:{'CJ-Access-Token':TOKEN}});const j=await r.json();if(j.result)d=j.data;}catch(e){}
 await sleep(600);
 out.push({id:p.id,oldTitle:p.title,sku,nameEn:d?.productNameEn||''});
 console.log(`${p.title}\n   EN: ${d?.productNameEn||'(nicht gefunden)'}`);
}
fs.writeFileSync('/tmp/cj_real.json',JSON.stringify(out,null,1));
console.log('\nmit echtem Namen:',out.filter(x=>x.nameEn).length,'/',out.length);
