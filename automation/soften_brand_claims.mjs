#!/usr/bin/env node
/* soften_brand_claims.mjs — entschaerft unbelegte Echtheits-/Herkunfts-Claims in PRODUKT-Beschreibungen katalogweit
 * (User-Entscheid 2026-07-05 "Marken behalten + entschaerfen"). Ersetzt absolute "100% Original"-Superlative +
 * falsche "Swiss Made"/"Schweizer Qualitaet" durch neutrale, ehrliche Formulierungen. Idempotent (nur wenn Ziel-
 * String vorkommt), loescht keine Produkte. DRY (default) / GO=1. No-op ohne Creds.
 * ENV: SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [GO=1] · [SHOPIFY_SHOP] · [MAX=0]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
const AT=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(), CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const GO=process.env.GO==='1'; const API='2025-01'; const MAX=parseInt(process.env.MAX||'0',10);
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
mkdirSync('reports',{recursive:true});
const out=[]; const W=m=>{ out.push(m); console.log(m); try{ writeFileSync('reports/soften-claims.txt', out.join('\n')+'\n'); }catch{} };
if(!AT && !(CID&&CSEC)){ W('Keine Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
let tok=AT&&await works(AT)?AT:null; if(!tok&&CID&&CSEC){ const t=await cc(); if(t&&await works(t)) tok=t; }
if(!tok){ W('❌ Auth'); process.exit(0); }

const REPL=[
  ['100 % Original-Markenware','Markenware'], ['100% Original-Markenware','Markenware'],
  ['100 % Original','Markenware'], ['100% Original','Markenware'],
  ['Original-Markenware in geprüfter Qualität','Markenware'],
  ['garantiert 100 % original',''], ['garantiert original',''], ['garantiert echt',''],
  ['Swiss Made','geprüfte Qualität'], ['Schweizer Qualität','geprüfte Qualität'],
  ['Schweizer Präzision','feine Verarbeitung'],
];
function fix(html){ let n=html, hits=[]; for(const [a,b] of REPL){ if(n.includes(a)){ const c=n.split(a).length-1; n=n.split(a).join(b); hits.push(`"${a.slice(0,28)}"×${c}`); } } return {n,hits}; }

const Q=`query($after:String){ products(first:100, after:$after){ pageInfo{hasNextPage endCursor} edges{ node{ id handle descriptionHtml } } } }`;
const U=`mutation($id:ID!,$b:String!){ productUpdate(input:{id:$id, descriptionHtml:$b}){ userErrors{ message } } }`;
let after=null, scan=0, changed=0;
outer: while(true){
  const r=await gql(tok,Q,{after}); const c=r?.data?.products; if(!c){ W('products-read fehler '+JSON.stringify(r?.errors||'').slice(0,120)); break; }
  for(const {node:p} of c.edges){ scan++;
    const {n,hits}=fix(p.descriptionHtml||''); if(!hits.length) continue;
    W(`${p.handle}: ${hits.join(' · ')}`);
    if(GO){ const u=await gql(tok,U,{id:p.id,b:n}); const ue=u?.data?.productUpdate?.userErrors||[]; if(ue.length){W('  ✗ '+JSON.stringify(ue).slice(0,90));} else {changed++; W('  ✓');} await new Promise(x=>setTimeout(x,180)); }
    if(MAX && changed>=MAX) break outer;
  }
  if(!c.pageInfo?.hasNextPage) break; after=c.pageInfo.endCursor;
}
W(`\nFertig: ${scan} Produkte gescannt · ${changed} entschaerft${GO?'':' (DRY — GO=1 zum Schreiben)'}.`);
