#!/usr/bin/env node
/**
 * hero_image_guard.mjs — jede Menü-Collection bekommt ein Hero-Bild.
 * Sammelt Collection-Handles aus dem Hauptmenü; Collections ohne Bild erhalten (LIVE) das
 * Titelbild ihres ersten Produkts als Hero (Shopify rehostet die URL). Meldet leere ohne Produkt.
 *
 * No-op-sicher · DRY-Default · LIVE=1.
 * ENV: SHOPIFY_SHOP + (SHOPIFY_ADMIN_TOKEN | SHOPIFY_CLIENT_ID+SHOPIFY_CLIENT_SECRET)  MENU_HANDLE=main-menu
 */
const SHOP=process.env.SHOPIFY_SHOP||'', TOK_ST=process.env.SHOPIFY_ADMIN_TOKEN||'',
  CID=process.env.SHOPIFY_CLIENT_ID||'', CS=process.env.SHOPIFY_CLIENT_SECRET||'',
  LIVE=process.env.LIVE==='1', MENU=process.env.MENU_HANDLE||'main-menu', API='2025-01';

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

  const handles=new Set();
  try{
    const m=await gql(token,`query($h:String!){ menu(handle:$h){ items{ url items{ url items{ url } } } } }`,{h:MENU});
    const walk=items=>{ for(const it of items||[]){ const mm=(it.url||'').match(/\/collections\/([a-z0-9\-]+)/i); if(mm) handles.add(mm[1]); walk(it.items); } };
    if(m.menu) walk(m.menu.items);
  }catch(e){ report.menuError=e.message; }
  report.menuCollections=handles.size;

  const missingImage=[], fixedList=[], emptyNoProduct=[];
  for(const h of handles){
    let c; try{ const d=await gql(token,`query($h:String!){ collectionByHandle(handle:$h){ id title image{url} products(first:1){ nodes{ featuredImage{url} } } } }`,{h}); c=d.collectionByHandle; }catch{ continue; }
    if(!c || (c.image&&c.image.url)) continue;
    const pimg=c.products?.nodes?.[0]?.featuredImage?.url;
    if(!pimg){ emptyNoProduct.push(h); continue; }
    missingImage.push(h);
    if(LIVE){
      try{ const u=await gql(token,`mutation($id:ID!,$src:String!,$alt:String){ collectionUpdate(input:{id:$id, image:{src:$src, altText:$alt}}){ collection{id} userErrors{message} } }`,
        {id:c.id, src:pimg, alt:c.title}); if(!u.collectionUpdate.userErrors.length) fixedList.push(h); }catch{}
    }
  }
  report.missingImage=missingImage; report.emptyNoProduct=emptyNoProduct;
  if(LIVE) report.heroesSet=fixedList;
  console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{ console.error('Fehler:',e.message); process.exit(0); });
