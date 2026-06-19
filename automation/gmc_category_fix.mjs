#!/usr/bin/env node
/* gmc_category_fix — setzt mm-google-shopping.google_product_category (Google-Taxonomie)
 * für aktive Produkte, die sie noch nicht haben. Mapping aus productType/Tags.
 * Idempotent. LIVE=1 schreibt. ENV: SHOPIFY_*.
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}

// Google-Produktkategorie (Text-Pfad, von Google akzeptiert) je Schlüsselwort
const MAP=[
 [/uhr|watch/i,                         'Apparel & Accessories > Jewelry > Watches'],
 [/schmuck|kette|ring|armband|ohrring|collier|anhänger/i,'Apparel & Accessories > Jewelry'],
 [/sonnenbrille|brille|eyewear/i,       'Apparel & Accessories > Clothing Accessories > Sunglasses'],
 [/tasche|rucksack|handbag|bag|clutch/i,'Apparel & Accessories > Handbags, Wallets & Cases > Handbags'],
 [/gürtel|guertel|belt/i,               'Apparel & Accessories > Clothing Accessories > Belts'],
 [/leder|geldbörse|geldbeutel|wallet|portemonnaie|kartenetui/i,'Apparel & Accessories > Handbags, Wallets & Cases > Wallets & Money Clips'],
 [/parfum|cologne|duft|fragrance/i,     'Health & Beauty > Personal Care > Cosmetics > Perfume & Cologne'],
 [/beauty|make-up|makeup|lippenstift|nagellack|serum|creme|pflege|cosmetic/i,'Health & Beauty > Personal Care > Cosmetics'],
 [/haustier|hund|katze|pet|napf/i,      'Animals & Pet Supplies > Pet Supplies'],
 [/trikot|shirt|hose|kleid|rock|bluse|hemd|jacke|pullover|hoodie|sweat|bademode|bikini|loungewear|trainingsanzug|jogging|tank|sport-bh|leggings|mode|damen|herren/i,'Apparel & Accessories > Clothing'],
 [/schuh|sneaker|stiefel|sandale|hausschuh/i,'Apparel & Accessories > Shoes'],
 [/cap|hut|mütze|schal|handschuh/i,     'Apparel & Accessories > Clothing Accessories'],
 [/handy|smartphone|powerbank|ladekabel|ladegerät|kopfhörer|audio|gaming|tech/i,'Electronics'],
 [/deko|wohnen|vase|kissen|wanduhr|wandbild|bilderrahmen|laterne|kerze|teppich/i,'Home & Garden > Decor'],
 [/fitness|hantel|widerstandsband|yoga|sport/i,'Sporting Goods > Exercise & Fitness'],
 [/angeln|fishing/i,                    'Sporting Goods > Outdoor Recreation > Fishing'],
 [/velo|fahrrad|rad/i,                  'Sporting Goods > Outdoor Recreation > Cycling'],
];
function cat(s){ for(const [re,c] of MAP) if(re.test(s)) return c; return null; }

const t=await tk(); if(!t){console.error('Kein Token');process.exit(1);}
const Q=`query($c:String){ products(first:60, query:"status:active", after:$c){ pageInfo{hasNextPage endCursor} edges{ node{ id title productType tags gpc:metafield(namespace:"mm-google-shopping",key:"google_product_category"){value} } } } }`;
let c=null, scanned=0, set=0, none=0, batch=[];
async function flush(){ if(!batch.length)return; const r=await gql(t,`mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ message } } }`,{mf:batch}); const e=r?.data?.metafieldsSet?.userErrors||[]; if(e.length)console.log(' ⚠️',JSON.stringify(e).slice(0,200)); batch=[]; }
do{
  const r=await gql(t,Q,{c}); const pg=r?.data?.products; if(!pg) break;
  for(const e of pg.edges){
    scanned++; const x=e.node;
    const g=cat((x.title||'')+' '+(x.productType||'')+' '+(x.tags||[]).join(' '));
    if(!g){ none++; continue; }                 // keine sichere Zuordnung → vorhandenen Wert nie überschreiben
    if(x.gpc && !process.env.FORCE){ continue; } // ohne FORCE: nur fehlende setzen
    if(x.gpc===g){ continue; }                   // schon korrekt
    if(LIVE) batch.push({ownerId:x.id,namespace:'mm-google-shopping',key:'google_product_category',type:'single_line_text_field',value:g});
    set++; if(batch.length>=20) await flush();
  }
  c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null;
  if(scanned%400===0) console.log(`  … ${scanned} gescannt · gesetzt ${set} · keine-Zuordnung ${none}`);
}while(c);
if(LIVE) await flush();
console.log(`Fertig. Gescannt ${scanned} · google_product_category gesetzt ${set} · keine-Zuordnung ${none} ${LIVE?'':'(DRY)'}`);
