#!/usr/bin/env node
/* sort_all — gibt JEDER Collection eine saubere, deterministische Sortierung statt BEST_SELLING
 * (das bei ~0 Verkäufen quasi zufällig ist → wirkt unordentlich):
 *   • "neu"-artige Collections (neu/new/launch/neuheit)  → CREATED_DESC (Neuestes zuerst)
 *   • alle anderen (Kategorie/Marke/Saison/Geschenk/Look) → PRICE_DESC (Premium zuerst)
 *   • MANUAL bleibt unangetastet (bewusst kuratiert, z.B. Startseite)
 * Idempotent. DRY=1 nur zeigen. ENV: SHOPIFY_SHOP/CLIENT_ID/CLIENT_SECRET.
 */
const SHOP=process.env.SHOPIFY_SHOP,API='2025-01',CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const DRY=process.env.DRY==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const tok=async()=>{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;};
const T=await tok();
const gql=async(q,v)=>{const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':T},body:JSON.stringify({query:q,variables:v})});return r.json();};
let cur=null,all=[];
while(true){const r=await gql(`query($c:String){collections(first:250,after:$c){pageInfo{hasNextPage endCursor}nodes{id handle title sortOrder productsCount{count}}}}`,{c:cur});const c=r.data.collections;all.push(...c.nodes);if(!c.pageInfo.hasNextPage)break;cur=c.pageInfo.endCursor;}
const isNew=h=>/(^|[^a-z])(neu|new|launch|neuheit)/i.test(h);
// Ziel-Sortierung bestimmen; nur ändern wenn abweichend und NICHT MANUAL
const plan=[];
for(const c of all){
  if(c.sortOrder==='MANUAL')continue;            // kuratierte Reihenfolge respektieren
  if(c.productsCount.count<1)continue;
  const want=isNew(c.handle)?'CREATED_DESC':'PRICE_DESC';
  if(c.sortOrder!==want)plan.push({...c,want});
}
console.log(`Collections gesamt: ${all.length} · umzusortieren: ${plan.length}`);
const UP=`mutation($id:ID!,$so:CollectionSortOrder!){collectionUpdate(input:{id:$id,sortOrder:$so}){collection{handle sortOrder}userErrors{message}}}`;
let done=0,errs=0;
for(const c of plan){
  if(DRY){if(done<80)console.log(`  ${c.handle} (${c.sortOrder}→${c.want}, ${c.productsCount.count})`);done++;continue;}
  const r=await gql(UP,{id:c.id,so:c.want});
  const e=r.data?.collectionUpdate?.userErrors||[];
  if(e.length){errs++;if(errs<10)console.log('  ⚠️',c.handle,JSON.stringify(e).slice(0,120));}
  else done++;
  await sleep(60);
  if(done%40===0)console.log(`  … ${done} sortiert`);
}
console.log(`\nFERTIG: ${done} Collections sauber sortiert${errs?`, ${errs} Fehler`:''}${DRY?' [DRY]':''}.`);
