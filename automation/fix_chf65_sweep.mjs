#!/usr/bin/env node
/* fix_chf65_sweep.mjs — entfernt „CHF 65"/„ab 65" restlos aus ALLEN Shopify-Artikeln (Blogs) und Pages (→ CHF 50).
 * Audit 2026-07-04: Footer/alte Blog-Artikel zeigen noch „ab CHF 65" (widerspricht Header CHF 50). Idempotent:
 * ändert nur Objekte, die die Ziel-Strings enthalten. DRY_RUN=1. No-op ohne Creds.
 * ENV: SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [DRY_RUN=1] · [SHOPIFY_SHOP]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
const AT=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(), CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1'; const API='2025-01';
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
try{ mkdirSync('reports',{recursive:true}); }catch{}
const out=[]; const W=m=>{ out.push(m); console.log(m); try{ writeFileSync('reports/fix-chf65.txt', out.join('\n')+'\n'); }catch{} };
if(!AT && !(CID&&CSEC)){ W('Keine Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(AT&&await works(AT))return AT; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} W('❌ Auth'); process.exit(0); }
const tok=await token();
const fix=s=>String(s||'').split('CHF 65').join('CHF 50').split('ab 65').join('ab 50').split('65 CHF').join('50 CHF').split('CHF 65').join('CHF 50');

// ARTIKEL (alle Blogs)
const AQ=`query($after:String){ articles(first:50, after:$after){ pageInfo{hasNextPage endCursor} edges{ node{ id title body } } } }`;
const AUP=`mutation($id:ID!,$b:String!){ articleUpdate(id:$id, article:{body:$b}){ userErrors{message} } }`;
let after=null, aChanged=0, aScan=0;
while(true){ const r=await gql(tok,AQ,{after}); const c=r?.data?.articles; if(!c){ W('article-read fehler '+JSON.stringify(r?.errors||'').slice(0,120)); break; }
  for(const {node:a} of c.edges){ aScan++; if(!/CHF ?65|ab 65|65 CHF/.test(a.body||'')) continue; const nb=fix(a.body); W(`Artikel „${a.title}": CHF65→50`); if(DRY) continue; const u=await gql(tok,AUP,{id:a.id,b:nb}); const ue=u?.data?.articleUpdate?.userErrors||[]; if(ue.length){W('  ✗ '+JSON.stringify(ue).slice(0,90));} else {aChanged++; W('  ✓');} await new Promise(x=>setTimeout(x,250)); }
  if(!c.pageInfo?.hasNextPage) break; after=c.pageInfo.endCursor; }

// PAGES
const PQ=`query($after:String){ pages(first:50, after:$after){ pageInfo{hasNextPage endCursor} edges{ node{ id title body } } } }`;
const PUP=`mutation($id:ID!,$b:String!){ pageUpdate(id:$id, page:{body:$b}){ userErrors{message} } }`;
after=null; let pChanged=0, pScan=0;
while(true){ const r=await gql(tok,PQ,{after}); const c=r?.data?.pages; if(!c){ break; }
  for(const {node:p} of c.edges){ pScan++; if(!/CHF ?65|ab 65|65 CHF/.test(p.body||'')) continue; const nb=fix(p.body); W(`Page „${p.title}": CHF65→50`); if(DRY) continue; const u=await gql(tok,PUP,{id:p.id,b:nb}); const ue=u?.data?.pageUpdate?.userErrors||[]; if(ue.length){W('  ✗ '+JSON.stringify(ue).slice(0,90));} else {pChanged++; W('  ✓');} await new Promise(x=>setTimeout(x,250)); }
  if(!c.pageInfo?.hasNextPage) break; after=c.pageInfo.endCursor; }

W(`\nFertig: ${aScan} Artikel/${pScan} Pages gescannt · ${aChanged} Artikel + ${pChanged} Pages geändert${DRY?' (DRY)':''}.`);
