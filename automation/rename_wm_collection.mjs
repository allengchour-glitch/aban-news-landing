#!/usr/bin/env node
/* LuxeStyle — rename_wm_collection.mjs
 * Rechts-/Ehrlichkeits-Fix: kundenseitige Collection-TITEL von „WM/World Cup" befreien (generisch).
 * Handle bleibt (URLs/Links brechen nicht) — nur der angezeigte Titel wird generisch. Idempotent. DRY_RUN=1.
 * ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [DRY_RUN=1]
 */
const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1'; const API='2025-01';
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN))return ADMIN_TOKEN; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} console.error('❌ Auth'); process.exit(0); }

function newTitle(t){
  let o=t;
  o=o.split('WM & Fussball 2026').join('Fussball & Fan 2026').split('WM &amp; Fussball 2026').join('Fussball &amp; Fan 2026');
  o=o.split('WM-Fussball 2026').join('Fussball & Fan 2026').split('WM Fussball 2026').join('Fussball & Fan 2026');
  o=o.split('WM 2026').join('Fan-Saison 2026').split('WM-2026').join('Fan-Saison 2026');
  o=o.replace(/\bWM\b/g,'Fan');
  return o;
}

const tok=await token();
const Q=`query($n:Int!,$after:String){ collections(first:$n, after:$after){ pageInfo{ hasNextPage endCursor } edges{ node{ id title handle } } } }`;
const M=`mutation($in:CollectionInput!){ collectionUpdate(input:$in){ collection{ id title } userErrors{ field message } } }`;
let after=null, seen=0, changed=0, fails=[];
while(true){
  const r=await gql(tok,Q,{n:100,after}); const conn=r?.data?.collections; if(!conn) break;
  for(const {node:c} of conn.edges){
    seen++; if(!/\bWM\b/.test(c.title)) continue;
    const nt=newTitle(c.title); if(nt===c.title) continue;
    if(DRY){ console.log(`DRY „${c.title}" → „${nt}" (${c.handle})`); changed++; continue; }
    const ur=await gql(tok,M,{in:{id:c.id, title:nt}}); const ue=ur?.data?.collectionUpdate?.userErrors||[];
    if(ue.length){ fails.push(`${c.title}: ${JSON.stringify(ue).slice(0,100)}`); continue; }
    changed++; console.log(`✓ „${c.title}" → „${nt}"`);
    await new Promise(x=>setTimeout(x,200));
  }
  if(!conn.pageInfo?.hasNextPage) break; after=conn.pageInfo.endCursor;
}
if(fails.length) fails.forEach(f=>console.error('✗',f));
console.log(`\nFertig: ${seen} Collections geprüft, ${changed} ${DRY?'(DRY) ':''}von „WM" befreit (Handle unverändert).`);
