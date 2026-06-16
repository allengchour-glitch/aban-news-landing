#!/usr/bin/env node
/**
 * rating_guard.mjs — verhindert den Conversion-Leak: schwach bewertete Produkte sollen NICHT
 * in Werbe-/Bestseller-Flächen auftauchen (dokumentierte Lehre: ein 3,5★-Kleid in Ads kostet Käufe).
 *
 * Scannt aktive Produkte mit Review-Metafeldern; bei rating <= RATING_MAX und count >= MIN_COUNT:
 *   - setzt Tag `niedrig-bewertet-nicht-bewerben`
 *   - entfernt das Produkt aus der sichtbaren Bestseller-Collection (idempotent)
 * Bleibt regulär kaufbar (kein Status-Eingriff) — nur nicht mehr beworben.
 *
 * No-op-sicher · DRY-Default · LIVE=1 · SCAN (Default 400).
 * ENV: SHOPIFY_SHOP + (SHOPIFY_ADMIN_TOKEN | SHOPIFY_CLIENT_ID+SHOPIFY_CLIENT_SECRET)
 *      RATING_MAX=3.8  MIN_COUNT=3  BESTSELLER_COLLECTION_GID=gid://shopify/Collection/687774499201
 */
const SHOP=process.env.SHOPIFY_SHOP||'', TOK_ST=process.env.SHOPIFY_ADMIN_TOKEN||'',
  CID=process.env.SHOPIFY_CLIENT_ID||'', CS=process.env.SHOPIFY_CLIENT_SECRET||'',
  LIVE=process.env.LIVE==='1', SCAN=Math.min(parseInt(process.env.SCAN||'400',10),5000),
  RATING_MAX=parseFloat(process.env.RATING_MAX||'3.8'), MIN_COUNT=parseInt(process.env.MIN_COUNT||'3',10),
  BEST=process.env.BESTSELLER_COLLECTION_GID||'gid://shopify/Collection/687774499201',
  TAG='niedrig-bewertet-nicht-bewerben', API='2025-01';

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
  const report={ ts:new Date().toISOString(), live:LIVE, ratingMax:RATING_MAX };
  if(!SHOP){ console.log('no-op: kein SHOPIFY_SHOP.'); return; }
  const token=await getToken(); if(!token){ console.log('no-op: kein Token.'); return; }

  let prods=[], cur=null;
  while(prods.length<SCAN){
    const d=await gql(token,`query($c:String){ products(first:50, after:$c, sortKey:UPDATED_AT, reverse:true, query:"status:active"){ pageInfo{hasNextPage endCursor} nodes{ id title tags r:metafield(namespace:"reviews",key:"rating"){value} c:metafield(namespace:"reviews",key:"rating_count"){value} } } }`,{c:cur});
    prods.push(...d.products.nodes);
    if(!d.products.pageInfo.hasNextPage) break; cur=d.products.pageInfo.endCursor;
  }
  prods=prods.slice(0,SCAN); report.scanned=prods.length;

  const low=[];
  for(const p of prods){
    if(!p.r) continue;
    let rating=0; try{ rating=parseFloat(JSON.parse(p.r.value).value||0); }catch{}
    const count=parseInt(p.c?.value||'0',10);
    if(count>=MIN_COUNT && rating>0 && rating<=RATING_MAX) low.push({id:p.id, title:p.title, rating, count, tagged:(p.tags||[]).includes(TAG)});
  }
  report.lowRated=low.map(x=>`${x.id.split('/').pop()} ${x.rating}★/${x.count}`);

  if(LIVE && low.length){
    let tagged=0;
    for(const p of low){
      if(!p.tagged){ try{ await gql(token,`mutation($id:ID!,$t:[String!]!){ tagsAdd(id:$id, tags:$t){ userErrors{message} } }`,{id:p.id,t:[TAG]}); tagged++; }catch{} }
      try{ await gql(token,`mutation($id:ID!,$p:[ID!]!){ collectionRemoveProducts(id:$id, productIds:$p){ userErrors{message} } }`,{id:BEST,p:[p.id]}); }catch{}
    }
    report.tagged=tagged; report.removedFromBestseller=low.length;
  }
  console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{ console.error('Fehler:',e.message); process.exit(0); });
