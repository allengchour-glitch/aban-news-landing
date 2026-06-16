#!/usr/bin/env node
/**
 * publish_guard.mjs — stellt sicher, dass aktive Produkte auf ALLEN Verkaufskanälen veröffentlicht sind.
 * (Der am häufigsten wiederholte Handgriff: nach create-product wird nicht automatisch in alle Kanäle publiziert.)
 *
 * Zielkanäle = alle Publications AUSSER „Point of Sale". Für jedes gescannte aktive Produkt wird der
 * fehlende Kanal-Satz per publishablePublish nachgezogen. Idempotent (bereits publizierte werden übersprungen).
 *
 * No-op-sicher · DRY-Default · LIVE=1 · SCAN=zuletzt geänderte Produkte (Default 250).
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

  const pd=await gql(token,`{ publications(first:25){ nodes{ id name } } }`);
  const targets=pd.publications.nodes.filter(p=>!/point of sale/i.test(p.name));
  report.targetChannels=targets.map(p=>p.name);
  const targetIds=new Set(targets.map(p=>p.id));

  let prods=[], cur=null;
  while(prods.length<SCAN){
    const d=await gql(token,`query($c:String){ products(first:50, after:$c, sortKey:UPDATED_AT, reverse:true, query:"status:active"){ pageInfo{hasNextPage endCursor} nodes{ id resourcePublications(first:25){ nodes{ publication{id} } } } } }`,{c:cur});
    prods.push(...d.products.nodes);
    if(!d.products.pageInfo.hasNextPage) break; cur=d.products.pageInfo.endCursor;
  }
  prods=prods.slice(0,SCAN); report.scanned=prods.length;

  const needsPublish=[];
  for(const p of prods){
    const have=new Set((p.resourcePublications?.nodes||[]).map(n=>n.publication.id));
    const missing=[...targetIds].filter(id=>!have.has(id));
    if(missing.length) needsPublish.push({id:p.id, missing});
  }
  report.productsMissingChannels=needsPublish.length;

  if(LIVE && needsPublish.length){
    let fixed=0;
    for(const pr of needsPublish){
      const input=pr.missing.map(id=>`{publicationId:"${id}"}`).join(',');
      try{ const d=await gql(token,`mutation{ publishablePublish(id:"${pr.id}", input:[${input}]){ userErrors{message} } }`);
        if(!d.publishablePublish.userErrors.length) fixed++; }catch(e){ /* skip */ }
    }
    report.published=fixed;
  }
  console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{ console.error('Fehler:',e.message); process.exit(0); });
