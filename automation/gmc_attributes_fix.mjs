#!/usr/bin/env node
/* gmc_attributes_fix — setzt fehlende Google-Merchant-Pflichtfelder:
 *   mm-google-shopping.age_group  (adult, bzw. kids bei Kinder-Tags)
 *   mm-google-shopping.gender     (female/male/unisex aus Tags — nur Mode/Accessoires)
 * Behebt den Hauptteil der „Needs attention" (fehlende Attribute bei Apparel).
 * Idempotent (setzt nur fehlende). LIVE=1 schreibt. ENV: SHOPIFY_*.
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}

const KID=/kinder|baby|kids|kleinkind|infant|newborn/i;
const APPAREL=/damen|herren|mode|kleid|rock|bluse|shirt|hose|jeans|hemd|pullover|jacke|mantel|bademode|bikini|badeanzug|trikot|sweat|hoodie|loungewear|activewear|unterwäsche|dessous|schuh|sneaker|stiefel|sandale|tasche|rucksack|gürtel|guertel|schmuck|kette|ring|armband|ohrring|uhr|sonnenbrille|brille|cap|hut|mütze|schal|accessoire|fashion|trainingsanzug|jogging|leggings|sport-bh|tank/i;

const t=await tk(); if(!t){console.error('Kein Token');process.exit(1);}
const Q=`query($c:String){ products(first:60, query:"status:active", after:$c){ pageInfo{hasNextPage endCursor} edges{ node{ id productType tags ag:metafield(namespace:"mm-google-shopping",key:"age_group"){value} gd:metafield(namespace:"mm-google-shopping",key:"gender"){value} } } } }`;
let c=null, scanned=0, setAge=0, setGen=0, batch=[];
async function flush(){ if(!batch.length)return; const r=await gql(t,`mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ message } } }`,{mf:batch}); const e=r?.data?.metafieldsSet?.userErrors||[]; if(e.length)console.log(' ⚠️',JSON.stringify(e).slice(0,200)); batch=[]; }
do{
  const r=await gql(t,Q,{c}); const pg=r?.data?.products; if(!pg) break;
  for(const e of pg.edges){
    scanned++; const x=e.node; const tags=(x.tags||[]).join(' ')+' '+(x.productType||'');
    if(!x.ag){ const v=KID.test(tags)?'kids':'adult'; if(LIVE) batch.push({ownerId:x.id,namespace:'mm-google-shopping',key:'age_group',type:'single_line_text_field',value:v}); setAge++; }
    if(!x.gd && APPAREL.test(tags)){ const v=/damen|frauen|women|bikini|kleid|dessous|bluse|rock|sport-bh/i.test(tags)?'female':(/herren|männer|men/i.test(tags)?'male':'unisex'); if(LIVE) batch.push({ownerId:x.id,namespace:'mm-google-shopping',key:'gender',type:'single_line_text_field',value:v}); setGen++; }
    if(batch.length>=20) await flush();
  }
  c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null;
  if(scanned%300===0) console.log(`  … ${scanned} gescannt · age ${setAge} · gender ${setGen}`);
}while(c);
if(LIVE) await flush();
console.log(`Fertig. Gescannt ${scanned} · age_group gesetzt ${setAge} · gender gesetzt ${setGen} ${LIVE?'':'(DRY)'}`);
