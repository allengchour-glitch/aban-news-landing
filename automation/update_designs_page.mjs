#!/usr/bin/env node
/* LuxeStyle — update_designs_page.mjs — erstellt/aktualisiert die Shopify-Seite "Designs & Sticker Galerie"
 * aus dropship/designs/page_body.html. Auth: Client-Credentials. No-op ohne Creds. */
import fs from 'node:fs';
const SHOPraw=process.env.SHOPIFY_SHOP||'', CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(), SEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const ADMIN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim(); const API='2025-01';
let SHOP=SHOPraw.replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!ADMIN && !(CID&&SEC)){ console.log('Keine Creds → No-op.'); process.exit(0); }
const body=fs.readFileSync('dropship/designs/page_body.html','utf8');
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:SEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
const tok=ADMIN&&await works(ADMIN)?ADMIN:(CID&&SEC?await cc():null);
if(!tok||!await works(tok)){ console.error('Auth fehlgeschlagen'); process.exit(0); }
const HANDLE='designs-galerie', TITLE='Designs & Sticker — Galerie';
const q=await gql(tok,`{ pages(first:1, query:"handle:${HANDLE}"){ edges{ node{ id } } } }`);
const existing=q?.data?.pages?.edges?.[0]?.node?.id;
if(existing){
  const r=await gql(tok,`mutation($id:ID!,$p:PageUpdateInput!){ pageUpdate(id:$id,page:$p){ page{handle} userErrors{message} } }`,{id:existing,p:{body,isPublished:true}});
  console.log('UPDATE:', JSON.stringify(r?.data?.pageUpdate?.userErrors||r?.data?.pageUpdate?.page||r).slice(0,200));
}else{
  const r=await gql(tok,`mutation($p:PageCreateInput!){ pageCreate(page:$p){ page{id handle} userErrors{message} } }`,{p:{title:TITLE,handle:HANDLE,body,isPublished:true}});
  console.log('CREATE:', JSON.stringify(r?.data?.pageCreate?.userErrors||r?.data?.pageCreate?.page||r).slice(0,200));
}
