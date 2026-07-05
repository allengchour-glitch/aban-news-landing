#!/usr/bin/env node
/* archive_drafts.mjs — setzt Produkte aus automation/archive_handles.json ({draft:[handles]}) auf status DRAFT
 * (= aus dem Storefront ausgeblendet, REVERSIBEL, nicht geloescht). Fuer klare Nicht-Mode-Fremdkoerper +
 * Bild-Import-Fallen + unbelegte Claims (Trust-Audit 2026-07-05). Idempotent: ueberspringt bereits-DRAFT.
 * DRY (default) listet nur; GO=1 setzt. No-op ohne Creds/Datei.
 * ENV: SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [GO=1] · [SHOPIFY_SHOP]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const AT=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(), CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const GO=process.env.GO==='1'; const API='2025-01';
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
mkdirSync('reports',{recursive:true});
const out=[]; const W=m=>{ out.push(m); console.log(m); try{ writeFileSync('reports/archive-drafts.txt', out.join('\n')+'\n'); }catch{} };
let HANDLES=[]; try{ HANDLES=JSON.parse(readFileSync('automation/archive_handles.json','utf8')).draft||[]; }catch(e){ W('Keine archive_handles.json → No-op.'); process.exit(0); }
HANDLES=[...new Set(HANDLES.filter(h=>/^[a-z0-9-]+$/.test(h)))];
if(!HANDLES.length){ W('Keine gueltigen Handles.'); process.exit(0); }
if(!AT && !(CID&&CSEC)){ W('Keine Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
let tok=AT&&await works(AT)?AT:null; if(!tok&&CID&&CSEC){ const t=await cc(); if(t&&await works(t)) tok=t; }
if(!tok){ W('❌ Auth'); process.exit(0); }
const Q=`query($q:String!){ products(first:1, query:$q){ edges{ node{ id handle status title } } } }`;
const U=`mutation($id:ID!){ productUpdate(input:{id:$id, status:DRAFT}){ product{ id status } userErrors{ message } } }`;
let drafted=0, already=0, missing=0;
for(const h of HANDLES){
  const n=(await gql(tok,Q,{q:`handle:${h}`}))?.data?.products?.edges?.[0]?.node;
  if(!n||n.handle!==h){ W('? nicht gefunden: '+h); missing++; continue; }
  if(n.status==='DRAFT'){ W('= schon DRAFT: '+h); already++; continue; }
  if(!GO){ W('[DRY] wuerde DRAFT: '+h+' ('+n.title.slice(0,40)+')'); continue; }
  const r=await gql(tok,U,{id:n.id}); const ue=r?.data?.productUpdate?.userErrors||[];
  if(ue.length){ W('✗ '+h+': '+JSON.stringify(ue).slice(0,90)); } else { W('✓ DRAFT: '+h); drafted++; }
  await new Promise(x=>setTimeout(x,200));
}
W(`\nFertig: ${drafted} auf DRAFT, ${already} schon DRAFT, ${missing} nicht gefunden${GO?'':' (DRY — GO=1 zum Setzen)'}.`);
