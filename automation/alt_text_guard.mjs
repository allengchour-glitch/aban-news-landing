#!/usr/bin/env node
/**
 * alt_text_guard.mjs — füllt fehlende Bild-Alt-Texte (SEO + Barrierefreiheit).
 * Aktive Produkte mit MediaImage ohne alt-Text bekommen einen Alt-Text aus dem Produkttitel.
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
const stripE=s=>String(s).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️‍]/gu,'').replace(/\s{2,}/g,' ').trim();
const clip=(s,n)=>s.length>n?s.slice(0,n-1)+'…':s;

async function main(){
  const report={ ts:new Date().toISOString(), live:LIVE };
  if(!SHOP){ console.log('no-op: kein SHOPIFY_SHOP.'); return; }
  const token=await getToken(); if(!token){ console.log('no-op: kein Token.'); return; }

  let prods=[], cur=null;
  while(prods.length<SCAN){
    const d=await gql(token,`query($c:String){ products(first:40, after:$c, sortKey:UPDATED_AT, reverse:true, query:"status:active"){ pageInfo{hasNextPage endCursor} nodes{ id title media(first:20){ nodes{ ... on MediaImage{ id alt } } } } } }`,{c:cur});
    prods.push(...d.products.nodes);
    if(!d.products.pageInfo.hasNextPage) break; cur=d.products.pageInfo.endCursor;
  }
  prods=prods.slice(0,SCAN); report.scanned=prods.length;

  // alle Files ohne alt sammeln (id + gewünschter alt)
  const files=[];
  for(const p of prods){
    const title=clip(stripE(p.title),120);
    for(const m of (p.media?.nodes||[])){
      if(m && m.id && (!m.alt || !m.alt.trim())) files.push({ id:m.id, alt:title });
    }
  }
  report.imagesMissingAlt=files.length;

  if(LIVE && files.length){
    let fixed=0;
    for(let i=0;i<files.length;i+=20){
      const chunk=files.slice(i,i+20);
      const d=await gql(token,`mutation($files:[FileUpdateInput!]!){ fileUpdate(files:$files){ files{ id } userErrors{message} } }`,{files:chunk});
      fixed += (d.fileUpdate.files||[]).length;
      if(d.fileUpdate.userErrors.length) console.log('alt err', d.fileUpdate.userErrors.slice(0,2));
    }
    report.altFixed=fixed;
  }
  console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{ console.error('Fehler:',e.message); process.exit(0); });
