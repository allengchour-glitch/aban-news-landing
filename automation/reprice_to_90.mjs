import fs from 'node:fs';
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET, SHOP='au3j0y-hq.myshopify.com';
const DRY=process.env.DRY==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function scc(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return JSON.parse(await r.text()).access_token;}
let TOK; const gql=async(q,v)=>{for(let a=0;a<6;a++){try{const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(JSON.stringify(j.errors||'').includes('hrottl')){await sleep(4000);continue;}}catch(e){await sleep(3000);}TOK=await scc();}return null;};
const round90=pStr=>{const p=parseFloat(pStr);const e=Math.floor(p);const c=p-e; const np=(c<=0.9001)?e+0.90:e+1.90; return np.toFixed(2);};
const lines=fs.readFileSync('/tmp/prices.jsonl','utf8').split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean);
const status=new Map(); for(const o of lines){ if((o.id||'').includes('/Product/')) status.set(o.id,o.status); }
const acceptable=c=>['90','00','95','50'].includes(c);
const byProd=new Map();
for(const o of lines){
  if(!(o.id||'').includes('/ProductVariant/'))continue;
  if(status.get(o.__parentId)!=='ACTIVE')continue;
  if(!o.price)continue;
  const cents=(o.price.split('.')[1]||'00').padEnd(2,'0').slice(0,2);
  if(acceptable(cents))continue;
  if((o.sku||'').toLowerCase().startsWith('bb-'))continue;   // BigBuy: Kosten-Boden schützen
  const np=round90(o.price); if(np===o.price)continue;
  if(!byProd.has(o.__parentId))byProd.set(o.__parentId,[]);
  byProd.get(o.__parentId).push({id:o.id,price:np,old:o.price});
}
console.log(`Produkte zu repricen: ${byProd.size} | Varianten: ${[...byProd.values()].reduce((s,v)=>s+v.length,0)}`);
let ex=0; for(const [pid,vs] of byProd){ if(ex++<6) console.log('  '+vs[0].old+'→'+vs[0].price+(vs.length>1?` (+${vs.length-1} weitere)`:'')); }
if(DRY){console.log('(DRY)');process.exit(0);}
const LED='/tmp/reprice_done.txt';
const doneSet=new Set(fs.existsSync(LED)?fs.readFileSync(LED,'utf8').split('\n').filter(Boolean):[]);
TOK=await scc();
let done=doneSet.size;
for(const [pid,vs] of byProd){
  if(doneSet.has(pid))continue;
  const variants=vs.map(v=>`{id:"${v.id}",price:"${v.price}"}`).join(',');
  const u=await gql(`mutation{productVariantsBulkUpdate(productId:"${pid}",variants:[${variants}]){userErrors{message}}}`,{});
  if(u&&!(u.data?.productVariantsBulkUpdate?.userErrors||[]).length){done++;fs.appendFileSync(LED,pid+'\n');}
  else if(u?.data?.productVariantsBulkUpdate?.userErrors?.length) console.log('  err',pid.split('/').pop(),JSON.stringify(u.data.productVariantsBulkUpdate.userErrors).slice(0,80));
  if(done%50===0&&done)console.log('  ...',done);
  await sleep(300);
}
console.log('✅ Produkte gepreist:',done);
