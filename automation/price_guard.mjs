#!/usr/bin/env node
/**
 * price_guard.mjs — hält den Katalog VERKAUFBAR und meldet Preis-Anomalien.
 *
 * Dropship-Regel (CLAUDE.md): Produkte müssen dauerhaft kaufbar sein. Eine Variante mit
 * inventoryPolicy=DENY + getracktem Bestand kann auf 0 fallen → "ausverkauft" → verlorene Verkäufe.
 * Dieser Wächter:
 *   1) findet aktive Varianten mit inventoryPolicy=DENY  → setzt sie (LIVE) auf CONTINUE (Weiterverkauf erlaubt)
 *   2) meldet Preis-Anomalien (Preis 0 / leer; compareAtPrice <= Preis = sinnlose „Rabatt"-Anzeige)
 *
 * No-op-sicher · DRY-Default · LIVE=1 schreibt · SCAN=Anzahl zuletzt geänderter Produkte.
 * ENV: SHOPIFY_SHOP + (SHOPIFY_ADMIN_TOKEN | SHOPIFY_CLIENT_ID+SHOPIFY_CLIENT_SECRET)
 */
const SHOP=process.env.SHOPIFY_SHOP||'', TOK_ST=process.env.SHOPIFY_ADMIN_TOKEN||'',
  CID=process.env.SHOPIFY_CLIENT_ID||'', CS=process.env.SHOPIFY_CLIENT_SECRET||'',
  LIVE=process.env.LIVE==='1', SCAN=Math.min(parseInt(process.env.SCAN||'250',10),3000), API='2025-01';

async function getToken(){
  if(!(CID&&CS)&&TOK_ST) return TOK_ST;
  if(SHOP&&CID&&CS){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CS,grant_type:'client_credentials'})});
    const j=await r.json().catch(()=>({})); return j.access_token||''; }
  return TOK_ST||'';
}
async function gql(token,query,variables){
  const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',
    headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query,variables})});
  const j=await r.json(); if(j.errors) throw new Error('GraphQL: '+JSON.stringify(j.errors).slice(0,300)); return j.data;
}

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

  if(LIVE && denyByProduct.length){
    let fixed=0;
    for(const pr of denyByProduct){
      const vars=pr.vids.map(id=>`{id:"${id}", inventoryPolicy:CONTINUE}`).join(',');
      const d=await gql(token,`mutation{ productVariantsBulkUpdate(productId:"${pr.id}", variants:[${vars}]){ productVariants{id} userErrors{message} } }`);
      const e=d.productVariantsBulkUpdate.userErrors; if(e.length) console.log('var err',pr.id,e); else fixed+=pr.vids.length;
    }
    report.setToContinue=fixed;
  }
  console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{ console.error('Fehler:',e.message); process.exit(0); });
