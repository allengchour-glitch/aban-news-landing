#!/usr/bin/env node
/*
 * BigBuy → Google-Merchant-Felder ausfüllen (idempotent, no-op-safe).
 *
 * Für ALLE tag:bigbuy-Produkte (ACTIVE) setzt es die KORREKTEN Google-Shopping-Identifier:
 *   1) echte GTIN  → Varianten-`barcode` = BigBuy `ean13`
 *   2) echte Marke → Produkt-`vendor`     = BigBuy-Herstellername
 *   3) wenn echte GTIN da: `mm-google-shopping.custom_product` = false
 *      (Markenware mit GTIN darf NICHT als „Eigenmarke ohne GTIN" markiert sein → sonst Disapproval)
 *
 * Mapping: Shopify-Handle endet auf `-<BigBuyId>` → BigBuy `products.json` (ean13+manufacturer)
 *          + `manufacturers.json` (id→Name).
 *
 * Env: BIGBUY_API_KEY + Shopify-Creds (/tmp/shopify_creds.env oder SHOPIFY_SHOP/CLIENT_ID/CLIENT_SECRET).
 * DRY ist Default. LIVE=1 wendet an. MAX=n begrenzt gescannte Produkte.
 */
import fs from 'node:fs';

const env = fs.existsSync('/tmp/shopify_creds.env')
  ? Object.fromEntries(fs.readFileSync('/tmp/shopify_creds.env','utf8').split('\n').filter(Boolean)
      .map(l => l.replace(/^export /,'').split('=').map(s=>s.trim().replace(/^["']|["']$/g,''))))
  : process.env;
const SHOP = env.SHOPIFY_SHOP, CID = env.SHOPIFY_CLIENT_ID, SECRET = env.SHOPIFY_CLIENT_SECRET;
const BB = (process.env.BIGBUY_API_KEY || env.BIGBUY_API_KEY || '').trim();
const LIVE = process.env.LIVE === '1';
const MAX  = parseInt(process.env.MAX || '99999', 10);
if(!SHOP || !CID || !SECRET){ console.log('No Shopify creds → no-op.'); process.exit(0); }
if(!BB){ console.log('No BIGBUY_API_KEY → no-op.'); process.exit(0); }
const API = `https://${SHOP}/admin/api/2025-01/graphql.json`;

async function bbGet(path){
  for(let a=0;a<5;a++){
    const r = await fetch('https://api.bigbuy.eu'+path, {headers:{Authorization:`Bearer ${BB}`}});
    if(r.status===429 || r.status>=500){ await new Promise(s=>setTimeout(s,2000*(a+1))); continue; }
    if(!r.ok) throw new Error('bb '+r.status+' '+path);
    return r.json();
  }
  throw new Error('bb retries: '+path);
}

async function token(){
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({client_id:CID, client_secret:SECRET, grant_type:'client_credentials'})});
  const j = await r.json(); if(!j.access_token) throw new Error('token: '+JSON.stringify(j));
  return j.access_token;
}
let TOK;
async function gql(q, v={}){
  for(let a=0;a<6;a++){
    const r = await fetch(API,{method:'POST',
      headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},
      body: JSON.stringify({query:q, variables:v})});
    if(r.status===429 || r.status>=500){ await new Promise(s=>setTimeout(s,1500*(a+1))); continue; }
    const j = await r.json();
    if(j.errors){
      if(JSON.stringify(j.errors).includes('Throttled')){ await new Promise(s=>setTimeout(s,2500*(a+1))); continue; }
      throw new Error(JSON.stringify(j.errors));
    }
    return j.data;
  }
  throw new Error('gql retries');
}

// 1) BigBuy-Maps (gecacht)
console.log('Lade BigBuy products.json (ean13+manufacturer) …');
let prods;
if(fs.existsSync('/tmp/bb_products.json')){ prods = JSON.parse(fs.readFileSync('/tmp/bb_products.json','utf8')); }
else { prods = await bbGet('/rest/catalog/products.json?isoCode=de'); fs.writeFileSync('/tmp/bb_products.json', JSON.stringify(prods)); }
const eanMap = new Map(), manOf = new Map();
for(const p of prods){ if(p && p.id){ if(p.ean13) eanMap.set(String(p.id), String(p.ean13)); if(p.manufacturer) manOf.set(String(p.id), p.manufacturer); } }
console.log(`  ${eanMap.size} Produkte mit ean13.`);

console.log('Lade BigBuy manufacturers.json …');
let mans;
if(fs.existsSync('/tmp/bb_mans.json')){ mans = JSON.parse(fs.readFileSync('/tmp/bb_mans.json','utf8')); }
else { mans = await bbGet('/rest/catalog/manufacturers.json?isoCode=de'); fs.writeFileSync('/tmp/bb_mans.json', JSON.stringify(mans)); }
const manName = new Map();
for(const m of mans){ if(m && m.id) manName.set(String(m.id), (m.name||'').trim()); }
console.log(`  ${manName.size} Hersteller.`);

// 2) Shopify-Scan
TOK = await token();
const Q = `query($cursor:String){
  products(first:80, after:$cursor, query:"tag:bigbuy status:active", sortKey:CREATED_AT, reverse:true){
    pageInfo{ hasNextPage endCursor }
    edges{ node{
      id handle vendor
      cp: metafield(namespace:"mm-google-shopping", key:"custom_product"){ value }
      variants(first:30){ edges{ node{ id barcode } } }
    } }
  }
}`;
let cursor=null, scanned=0;
const vendorJobs=[]; // {id, vendor}
const barcodeJobs=[]; // {productId, variants:[{id,barcode}]}
const unflagIds=[]; // products to set custom_product=false
do{
  const d = await gql(Q,{cursor});
  for(const e of d.products.edges){
    const n=e.node; scanned++;
    const m = n.handle.match(/-(\d+)$/); if(!m) continue;
    const bbid = m[1];
    const ean = eanMap.get(bbid);
    const brand = manName.get(String(manOf.get(bbid)||''));
    // Marke
    if(brand && brand.length>1 && n.vendor !== brand) vendorJobs.push({id:n.id, vendor:brand});
    // GTIN
    if(ean){
      const vs = n.variants.edges.map(v=>v.node).filter(v=> !(v.barcode && v.barcode.trim())).map(v=>({id:v.id, barcode:ean}));
      if(vs.length) barcodeJobs.push({productId:n.id, variants:vs});
      if(n.cp && n.cp.value==='true') unflagIds.push(n.id); // hat echte GTIN → custom_product weg
    }
  }
  cursor = d.products.pageInfo.hasNextPage ? d.products.pageInfo.endCursor : null;
  process.stdout.write(`\rScan ${scanned} · vendor ${vendorJobs.length} · gtin ${barcodeJobs.length} · unflag ${unflagIds.length}`);
}while(cursor && scanned<MAX);
console.log(`\nScan fertig: ${scanned} bigbuy-Produkte · Marke setzen ${vendorJobs.length} · GTIN setzen ${barcodeJobs.length} · custom_product entfernen ${unflagIds.length}.`);

if(!LIVE){ console.log('DRY-RUN (LIVE=1 zum Anwenden).'); process.exit(0); }

const MU_VENDOR = `mutation($id:ID!,$v:String!){ productUpdate(input:{id:$id, vendor:$v}){ userErrors{ message } } }`;
const MU_BARCODE = `mutation($pid:ID!,$vars:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$pid, variants:$vars){ userErrors{ message } } }`;
const MU_MF = `mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ message } } }`;

let vDone=0,bDone=0,fDone=0;
for(const j of vendorJobs){ const r=await gql(MU_VENDOR,{id:j.id,v:j.vendor}); const e=r.productUpdate.userErrors; if(e.length) console.log('vendor err',j.id,e); else vDone++; }
console.log(`Marke gesetzt: ${vDone}/${vendorJobs.length}`);
for(const j of barcodeJobs){ const r=await gql(MU_BARCODE,{pid:j.productId,vars:j.variants}); const e=r.productVariantsBulkUpdate.userErrors; if(e.length) console.log('gtin err',j.productId,e); else bDone++; }
console.log(`GTIN gesetzt: ${bDone}/${barcodeJobs.length}`);
for(let i=0;i<unflagIds.length;i+=25){
  const batch=unflagIds.slice(i,i+25).map(id=>({ownerId:id,namespace:'mm-google-shopping',key:'custom_product',type:'boolean',value:'false'}));
  const r=await gql(MU_MF,{mf:batch}); if(r.metafieldsSet.userErrors.length) console.log('mf err',r.metafieldsSet.userErrors); else fDone+=batch.length;
}
console.log(`custom_product=false: ${fDone}/${unflagIds.length}`);
console.log('✅ Google-Merchant-Felder (Marke + GTIN) ausgefüllt.');
