#!/usr/bin/env node
/* create_manual_collection.mjs — erstellt/aktualisiert manuelle Collections aus automation/manual_collections.json.
 * JSON = [{handle,title,descriptionHtml,products:[handles]}]. Loest Handles -> Produkt-IDs, erstellt manuelle
 * Collection (oder fuegt fehlende Produkte hinzu), publiziert auf Online Store. SICHER: nur erstellen/hinzufuegen.
 * Idempotent. DRY (default) / GO=1. No-op ohne Creds/Datei.
 * ENV: SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [GO=1] · [SHOPIFY_SHOP]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const AT=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(), CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const GO=process.env.GO==='1'; const API='2025-01';
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
mkdirSync('reports',{recursive:true});
const out=[]; const W=m=>{ out.push(m); console.log(m); try{ writeFileSync('reports/manual-collections.txt', out.join('\n')+'\n'); }catch{} };
let COLS=[]; try{ COLS=JSON.parse(readFileSync('automation/manual_collections.json','utf8')); }catch(e){ W('Keine manual_collections.json → No-op.'); process.exit(0); }
if(!AT && !(CID&&CSEC)){ W('Keine Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
let tok=AT&&await works(AT)?AT:null; if(!tok&&CID&&CSEC){ const t=await cc(); if(t&&await works(t)) tok=t; }
if(!tok){ W('❌ Auth'); process.exit(0); }
async function pubOnlineStore(colId){ try{ const p=await gql(tok,`{ publications(first:10){ edges{ node{ id name } } } }`); const os=(p?.data?.publications?.edges||[]).find(e=>/online store/i.test(e.node.name))?.node?.id; if(os){ await gql(tok,`mutation($id:ID!,$pid:ID!){ publishablePublish(id:$id, input:{publicationId:$pid}){ userErrors{ message } } }`,{id:colId,pid:os}); return true; } }catch{} return false; }
for(const col of COLS){
  W(`\n=== ${col.title} (${col.handle}) ===`);
  const ids=[]; const miss=[];
  for(const h of (col.products||[])){ const n=(await gql(tok,`query($q:String!){ products(first:1, query:$q){ edges{ node{ id handle } } } }`,{q:`handle:${h}`}))?.data?.products?.edges?.[0]?.node; if(n&&n.handle===h) ids.push(n.id); else miss.push(h); await new Promise(x=>setTimeout(x,110)); }
  W(`  Produkte: ${ids.length}/${(col.products||[]).length}${miss.length?' · fehlt: '+miss.join(', '):''}`);
  if(!ids.length){ W('  keine IDs → skip'); continue; }
  const ex=(await gql(tok,`query($q:String!){ collections(first:1, query:$q){ edges{ node{ id } } } }`,{q:`handle:${col.handle}`}))?.data?.collections?.edges?.[0]?.node;
  let colId=ex?.id;
  if(!GO){ W(`  [DRY] wuerde ${colId?'aktualisieren':'erstellen'} mit ${ids.length} Produkten.`); continue; }
  if(!colId){ const c=await gql(tok,`mutation($in:CollectionInput!){ collectionCreate(input:$in){ collection{ id } userErrors{ message } } }`,{in:{title:col.title,handle:col.handle,descriptionHtml:col.descriptionHtml||''}}); const ue=c?.data?.collectionCreate?.userErrors||[]; if(ue.length){W('  ✗ create '+JSON.stringify(ue).slice(0,100));continue;} colId=c?.data?.collectionCreate?.collection?.id; W('  ✓ erstellt'); }
  const add=await gql(tok,`mutation($id:ID!,$ids:[ID!]!){ collectionAddProducts(id:$id, productIds:$ids){ userErrors{ message } } }`,{id:colId,ids}); const aue=add?.data?.collectionAddProducts?.userErrors||[]; W(aue.length?('  ✗ add '+JSON.stringify(aue).slice(0,120)):`  ✓ ${ids.length} Produkte`);
  W(await pubOnlineStore(colId)?'  ✓ publiziert':'  ⚠️ publish manuell pruefen');
}
W('\nFertig.');
