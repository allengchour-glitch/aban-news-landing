#!/usr/bin/env node
/* feed_attributes_fill — setzt bei Mode-Produkten die Google-Merchant-Pflichtattribute
 * gender + age_group (Metafelder mm-google-shopping). Behebt "Missing gender/age group".
 * Gender aus Tags (damen→female, herren→male, sonst unisex). Idempotent + Ledger.
 * ENV: SHOPIFY_*. QUERY (Default Mode-Tags), MAX, LIVE=1.
 */
import fs from 'node:fs';
const SHOP=process.env.SHOPIFY_SHOP,API='2025-01',CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const LIVE=process.env.LIVE==='1';
// Mehrere kleine Queries statt EINE riesige OR-Kette (grosse OR-Ketten lösen Shopify-Query-Complexity-Fehler aus,
// und der Default liess Kinder-/Schuh-/Baby-Mode ungedeckt → fehlende Google-Merchant-Pflichtattribute).
const APPAREL_TAGS=['damen','herren','mode','kleider','hoodies','caps','kinder','kids','baby','kleinkind','schuhe','socken','bademode','unterwaesche','muetze'];
const QUERIES=process.env.QUERY?[process.env.QUERY]:APPAREL_TAGS.map(t=>`tag:${t} AND status:active`);
const MAX=Number(process.env.MAX||0);
const LEDGER=process.env.LEDGER||'dropship/feed_attr_done.txt';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchT(u,o={},ms=25000){const ac=new AbortController();const to=setTimeout(()=>ac.abort(),ms);try{return await fetch(u,{...o,signal:ac.signal});}finally{clearTimeout(to);}}
const tok=async()=>{const r=await fetchT(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;};
let T=await tok();
const gql=async(q,v)=>{for(let a=0;a<5;a++){let r;try{r=await fetchT(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':T},body:JSON.stringify({query:q,variables:v})},30000);}catch{await sleep(1500);continue;}if(r.status===401){T=await tok();continue;}if(r.status===429||r.status>=500){await sleep((a+1)*1500);continue;}return r.json();}return null;};
const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.trim()).filter(Boolean):[]);
const SET=`mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{message}}}`;
let set=0,skip=0,seen=0,hardStop=false;
for(const QUERY of QUERIES){
 if(hardStop)break;
 const Q=`query($c:String){products(first:60,query:"${QUERY}",after:$c){pageInfo{hasNextPage endCursor}edges{node{id tags gender:metafield(namespace:"mm-google-shopping",key:"gender"){value}}}}}`;
 let cur=null;
 do{
  const r=await gql(Q,{c:cur}); const pg=r?.data?.products; if(!pg){await sleep(2000);break;}
  let stop=false;
  for(const {node} of pg.edges){
   seen++; if(done.has(node.id)){skip++;continue;}
   if(node.gender&&node.gender.value){done.add(node.id);skip++;continue;}
   const tags=node.tags||[];
   const gender=tags.includes('herren')?'male':tags.includes('damen')?'female':'unisex';
   const age=tags.includes('baby')?'newborn':(tags.includes('kinder')||tags.includes('kids')||tags.includes('kleinkind'))?'kids':'adult';
   if(LIVE){const u=await gql(SET,{m:[
     {ownerId:node.id,namespace:'mm-google-shopping',key:'gender',value:gender,type:'single_line_text_field'},
     {ownerId:node.id,namespace:'mm-google-shopping',key:'age_group',value:age,type:'single_line_text_field'}]});
    if(!(u?.data?.metafieldsSet?.userErrors||[]).length){set++;done.add(node.id);}await sleep(90);}
   else{set++;if(set<=8)console.log(`  ${gender}/${age}`);}
   if(LIVE&&set%40===0){fs.writeFileSync(LEDGER,[...done].join('\n')+'\n');console.log(`  … ${set} gesetzt`);}
   if(MAX&&set>=MAX){stop=true;hardStop=true;break;}
  }
  cur=stop?null:(pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null);
 }while(cur);
}
if(LIVE)fs.writeFileSync(LEDGER,[...done].join('\n')+'\n');
console.log(`\nFERTIG${LIVE?'':' [DRY]'}: ${set} Mode-Produkte mit gender+age_group · ${skip} übersprungen (von ${seen}).`);
