#!/usr/bin/env node
// Google-Merchant-Feed-Pflege (idempotent, katalogweit).
// Behebt den häufigsten Disapproval: "fehlende GTIN/Barcode" → setzt für Produkte OHNE Barcode
// das Metafeld mm-google-shopping.custom_product = true (= "Eigenmarke ohne GTIN", von Google akzeptiert).
// Zusätzlich: meldet Produkte ohne SEO-Titel (die fixt seo_gap_fix.mjs separat).
// DRY ist Default. LIVE=1 wendet an. Funktioniert auch im GitHub-Bot (Env-Creds).
import fs from 'node:fs';

const env = fs.existsSync('/tmp/shopify_creds.env')
  ? Object.fromEntries(fs.readFileSync('/tmp/shopify_creds.env','utf8').split('\n').filter(Boolean)
      .map(l => l.replace(/^export /,'').split('=').map(s=>s.trim().replace(/^["']|["']$/g,''))))
  : process.env;
const SHOP = env.SHOPIFY_SHOP, ID = env.SHOPIFY_CLIENT_ID, SECRET = env.SHOPIFY_CLIENT_SECRET;
const LIVE = process.env.LIVE === '1';
const MAX  = parseInt(process.env.MAX || '99999', 10);
if(!SHOP || !ID || !SECRET){ console.log('No Shopify creds → no-op.'); process.exit(0); }
const API = `https://${SHOP}/admin/api/2025-01/graphql.json`;

async function token(){
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({client_id:ID, client_secret:SECRET, grant_type:'client_credentials'})});
  const j = await r.json(); if(!j.access_token) throw new Error('token: '+JSON.stringify(j));
  return j.access_token;
}
let TOK;
async function gql(q, v={}){
  for(let a=0;a<5;a++){
    const r = await fetch(API,{method:'POST',
      headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},
      body: JSON.stringify({query:q, variables:v})});
    if(r.status===429 || r.status>=500){ await new Promise(s=>setTimeout(s,1500*(a+1))); continue; }
    const j = await r.json();
    if(j.errors){ // throttle?
      if(JSON.stringify(j.errors).includes('Throttled')){ await new Promise(s=>setTimeout(s,2000*(a+1))); continue; }
      throw new Error(JSON.stringify(j.errors));
    }
    return j.data;
  }
  throw new Error('gql: retries exhausted');
}

TOK = await token();
const Q = `query($cursor:String){
  products(first:120, after:$cursor, query:"status:active", sortKey:CREATED_AT, reverse:true){
    pageInfo{ hasNextPage endCursor }
    edges{ node{
      id title
      seo{ title }
      cp: metafield(namespace:"mm-google-shopping", key:"custom_product"){ value }
      variants(first:25){ edges{ node{ barcode } } }
    } }
  }
}`;

let cursor=null, scanned=0, noBarcodeNoFlag=[], noSeo=0;
do{
  const d = await gql(Q, {cursor});
  for(const e of d.products.edges){
    const n = e.node; scanned++;
    const anyBarcode = n.variants.edges.some(v => v.node.barcode && v.node.barcode.trim());
    const hasFlag = n.cp && n.cp.value === 'true';
    if(!n.seo || !n.seo.title) noSeo++;
    if(!anyBarcode && !hasFlag) noBarcodeNoFlag.push(n.id);
  }
  cursor = d.products.pageInfo.hasNextPage ? d.products.pageInfo.endCursor : null;
  process.stdout.write(`\rScanned ${scanned} … to-flag ${noBarcodeNoFlag.length}, no-SEO ${noSeo}`);
}while(cursor && scanned < MAX);
console.log(`\nScan fertig: ${scanned} aktive Produkte · ${noBarcodeNoFlag.length} ohne Barcode+ohne custom_product-Flag · ${noSeo} ohne SEO-Titel (→ seo_gap_fix.mjs).`);

if(!LIVE){ console.log('DRY-RUN (LIVE=1 zum Anwenden).'); process.exit(0); }
if(noBarcodeNoFlag.length===0){ console.log('Nichts zu tun — Feed bzgl. GTIN/custom_product sauber.'); process.exit(0); }

const M = `mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ field message } } }`;
let done=0;
for(let i=0;i<noBarcodeNoFlag.length;i+=25){
  const batch = noBarcodeNoFlag.slice(i,i+25).map(id => ({
    ownerId:id, namespace:'mm-google-shopping', key:'custom_product', type:'boolean', value:'true'
  }));
  const r = await gql(M, {mf:batch});
  const ue = r.metafieldsSet.userErrors;
  if(ue && ue.length) console.error('userErrors:', JSON.stringify(ue));
  done += batch.length;
  process.stdout.write(`\rcustom_product gesetzt: ${done}/${noBarcodeNoFlag.length}`);
}
console.log(`\n✅ ${done} Produkte für Google-Merchant geflaggt (custom_product=true → kein "fehlende GTIN").`);
