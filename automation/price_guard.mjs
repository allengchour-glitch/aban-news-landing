#!/usr/bin/env node
/**
 * price_guard.mjs — hält den Katalog VERKAUFBAR und meldet Preis-Anomalien.
 *
 * Dropship-Regel (CLAUDE.md): Produkte müssen dauerhaft kaufbar sein. Eine Variante mit
 * inventoryPolicy=DENY + getracktem Bestand kann auf 0 fallen → "ausverkauft" → verlorene Verkäufe.
 * Dieser Wächter:
 *   1) meldet Varianten mit inventoryPolicy=DENY; ändert keine Bestandsregel ohne Lieferantennachweis
 *   2) meldet Preis-Anomalien (Preis 0 / leer; compareAtPrice <= Preis = sinnlose „Rabatt"-Anzeige)
 *
 * Nur Bericht, auch mit LIVE=1 keine Bestandsänderung · SCAN=Anzahl zuletzt geänderter Produkte.
 * ENV: SHOPIFY_SHOP + (SHOPIFY_ADMIN_TOKEN | SHOPIFY_CLIENT_ID+SHOPIFY_CLIENT_SECRET)
 */
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { normalizeShopifyHost } from './lib/shopify_host.mjs';
const SHOP=normalizeShopifyHost(process.env.SHOPIFY_SHOP), TOK_ST=process.env.SHOPIFY_ADMIN_TOKEN||'',
  CID=process.env.SHOPIFY_CLIENT_ID||'', CS=shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET)||'',
  LIVE=process.env.LIVE==='1', SCAN=Math.min(parseInt(process.env.SCAN||'250',10),3000), API='2025-01';

async function getToken(){
  if(!(CID&&CS)&&TOK_ST) return TOK_ST;
  if(SHOP&&CID&&CS){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),
    headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CS,grant_type:'client_credentials'})});
    const j=await r.json().catch(()=>({})); return j.access_token||''; }
  return TOK_ST||'';
}
// Drosselung aussitzen statt aufgeben — Begruendung + Tests in automation/lib/shopify_gql.mjs
const gql=(token,query,variables)=>shopifyGql(SHOP,API,token,query,variables);

async function main(){
  const report={ ts:new Date().toISOString(), live:LIVE };
  if(!SHOP){ console.log('no-op: kein SHOPIFY_SHOP.'); return; }
  const token=await getToken(); if(!token){ console.log('no-op: kein Token.'); return; }

  let prods=[], cur=null;
  while(prods.length<SCAN){
    const d=await gql(token,`query($c:String){ products(first:60, after:$c, sortKey:UPDATED_AT, reverse:true, query:"status:active"){ pageInfo{hasNextPage endCursor} nodes{ id title variants(first:50){ nodes{ id price compareAtPrice inventoryPolicy } } } } }`,{c:cur});
    prods.push(...d.products.nodes);
    if(!d.products.pageInfo.hasNextPage) break; cur=d.products.pageInfo.endCursor;
  }
  prods=prods.slice(0,SCAN); report.scanned=prods.length;

  const denyByProduct=[];      // {productId, variantIds:[]}
  const priceZero=[], badCompare=[];
  for(const p of prods){
    const deny=p.variants.nodes.filter(v=>v.inventoryPolicy==='DENY');
    if(deny.length) denyByProduct.push({id:p.id, vids:deny.map(v=>v.id)});
    for(const v of p.variants.nodes){
      if(!v.price || parseFloat(v.price)<=0) priceZero.push(p.id.split('/').pop());
      if(v.compareAtPrice && parseFloat(v.compareAtPrice)<=parseFloat(v.price)) badCompare.push(p.id.split('/').pop());
    }
  }
  report.denyProducts=denyByProduct.length;
  report.denyVariants=denyByProduct.reduce((a,b)=>a+b.vids.length,0);
  report.priceZero=[...new Set(priceZero)];
  report.badCompareAt=[...new Set(badCompare)];

  // DENY ist kein Preisfehler. Lieferantenbestand und Varianten-Mapping müssen erst
  // geprüft werden; pauschales CONTINUE kann nicht lieferbare Bestellungen erzeugen.
  report.inventoryPolicyChanged=0;
  report.inventoryReviewRequired=denyByProduct;
  console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{ console.error('Fehler:',e.message); process.exit(1); });
