#!/usr/bin/env node
/* fix_swissness_email.mjs — entfernt unbelegte Swissness-/Umwelt-Claims (Ehrlichkeits-Regel) + vereinheitlicht
 * Kontakt-E-Mail auf info@luxestyle.ch über ALLE Shopify-Pages + Collections. Audit 2026-07-04 (Live-Text exakt geprüft):
 *  - /pages/uber-uns: „…reduziert CO₂ um 60%…" (unbelegt/erfunden) + „1% von jedem Verkauf geht an Schweizer
 *    Umweltprojekte." (unbelegte Spendenzusage) → RAUS; „Made with ❤ in der Schweiz" → „Kuratiert mit ❤ in der
 *    Schweiz" (Produkte sind NICHT swiss-made — nur kuratiert). Firma IST Schweizer (Belp) → „Schweizer Sorgfalt" bleibt.
 *  - /collections/premium-schmuck: „Eleganz und Schweizer Präzision vereint" → „…feine Verarbeitung vereint".
 *  - E-Mail: support@ / hello@ / allengchour@gmail.com (Privat-Leak!) → info@luxestyle.ch (überall).
 * Idempotent: schreibt nur, wenn sich der Body ändert. DRY_RUN=1. No-op ohne Creds.
 * ENV: SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [DRY_RUN=1] · [SHOPIFY_SHOP]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
const AT=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(), CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1'; const API='2025-01';
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
try{ mkdirSync('reports',{recursive:true}); }catch{}
const out=[]; const W=m=>{ out.push(m); console.log(m); try{ writeFileSync('reports/fix-swissness-email.txt', out.join('\n')+'\n'); }catch{} };
if(!AT && !(CID&&CSEC)){ W('Keine Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(AT&&await works(AT))return AT; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} W('❌ Auth'); process.exit(0); }
const tok=await token();

// Exakte String-Ersetzungen (aus Live-Audit verifiziert). Sätze mit führendem Leerzeichen zuerst, damit keine Doppel-Spaces bleiben.
const REPL=[
  // unbelegte Claims RAUS (mit möglichem umgebenden Whitespace/Trenner):
  [' Direkt-ab-Werk-Versand reduziert CO₂ um 60% gegenüber klassischem Lager.',''],
  ['Direkt-ab-Werk-Versand reduziert CO₂ um 60% gegenüber klassischem Lager.',''],
  [' 1% von jedem Verkauf geht an Schweizer Umweltprojekte.',''],
  ['1% von jedem Verkauf geht an Schweizer Umweltprojekte.',''],
  // Swiss-Made-Implikation entschärfen (Firma ist CH, Produkte nicht):
  ['Made with','Kuratiert mit'],
  // falsche Swissness bei Nicht-CH-Schmuck:
  ['Eleganz und Schweizer Präzision vereint','Eleganz und feine Verarbeitung vereint'],
  ['Schweizer Präzision','feine Verarbeitung'],
  ['Swiss Quality','geprüfte Qualität'], ['Swiss Made','geprüfte Qualität'],
  // Kontakt-E-Mail vereinheitlichen + Privat-Leak entfernen:
  ['support@luxestyle.ch','info@luxestyle.ch'],
  ['hello@luxestyle.ch','info@luxestyle.ch'],
  ['allengchour@gmail.com','info@luxestyle.ch'],
];
// Aufräum-Muster nach Satz-Entfernung (leere Container / Doppel-Trenner):
const CLEAN=[['<li></li>',''],['<li> </li>',''],['<p></p>',''],['<p> </p>',''],['  ',' ']];
function apply(body){
  let nb=body, hits=[];
  for(const [a,b] of REPL){ if(nb.includes(a)){ const n=nb.split(a).length-1; nb=nb.split(a).join(b); hits.push(`"${a.slice(0,40)}"→"${b.slice(0,24)}"×${n}`); } }
  if(hits.length){ for(const [a,b] of CLEAN){ if(nb.includes(a)) nb=nb.split(a).join(b); } }
  return {nb,hits};
}

// ---- PAGES ----
const PQ=`query($after:String){ pages(first:50, after:$after){ pageInfo{hasNextPage endCursor} edges{ node{ id handle title body } } } }`;
const PUP=`mutation($id:ID!,$b:String!){ pageUpdate(id:$id, page:{body:$b}){ userErrors{message} } }`;
let after=null, pChanged=0, pScan=0;
while(true){ const r=await gql(tok,PQ,{after}); const c=r?.data?.pages; if(!c){ W('pages-read fehler '+JSON.stringify(r?.errors||'').slice(0,120)); break; }
  for(const {node:p} of c.edges){ pScan++; const {nb,hits}=apply(p.body||''); if(!hits.length) continue;
    W(`Page „${p.handle}": `+hits.join(' · ')); if(DRY) continue;
    const u=await gql(tok,PUP,{id:p.id,b:nb}); const ue=u?.data?.pageUpdate?.userErrors||[]; if(ue.length){W('  ✗ '+JSON.stringify(ue).slice(0,90));} else {pChanged++; W('  ✓');} await new Promise(x=>setTimeout(x,250)); }
  if(!c.pageInfo?.hasNextPage) break; after=c.pageInfo.endCursor; }

// ---- COLLECTIONS ----
const CQ=`query($after:String){ collections(first:50, after:$after){ pageInfo{hasNextPage endCursor} edges{ node{ id handle title descriptionHtml } } } }`;
const CUP=`mutation($id:ID!,$b:String!){ collectionUpdate(input:{id:$id, descriptionHtml:$b}){ userErrors{message} } }`;
after=null; let cChanged=0, cScan=0;
while(true){ const r=await gql(tok,CQ,{after}); const c=r?.data?.collections; if(!c){ W('collections-read fehler '+JSON.stringify(r?.errors||'').slice(0,120)); break; }
  for(const {node:col} of c.edges){ cScan++; const {nb,hits}=apply(col.descriptionHtml||''); if(!hits.length) continue;
    W(`Collection „${col.handle}": `+hits.join(' · ')); if(DRY) continue;
    const u=await gql(tok,CUP,{id:col.id,b:nb}); const ue=u?.data?.collectionUpdate?.userErrors||[]; if(ue.length){W('  ✗ '+JSON.stringify(ue).slice(0,90));} else {cChanged++; W('  ✓');} await new Promise(x=>setTimeout(x,250)); }
  if(!c.pageInfo?.hasNextPage) break; after=c.pageInfo.endCursor; }

W(`\nFertig: ${pScan} Pages/${cScan} Collections gescannt · ${pChanged} Pages + ${cChanged} Collections geändert${DRY?' (DRY)':''}.`);
