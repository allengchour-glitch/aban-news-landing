#!/usr/bin/env node
/* LuxeStyle — repoint_designer.mjs
 * Stellt den POD-Designer weg vom flaky abannews.com-Hosting auf die zuverlässige Shopify-CDN-Datei um.
 * 1. Holt die öffentliche CDN-URL zur hochgeladenen Datei (ENV FILE_ID, Default = die vom User hochgeladene lspod-designer.js).
 * 2. Ersetzt in ALLEN aktiven Produkten in der Beschreibung  https://abannews.com/pod/designer.js  →  <CDN-URL>.
 * Idempotent (nur wo abannews-URL steht). No-op ohne Creds. DRY_RUN=1 zeigt nur, was geändert würde.
 * ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [FILE_ID=…] · [DRY_RUN=1]
 */
const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1'; const API='2025-01';
const FILE_ID=(process.env.FILE_ID||'69852106326401').trim();
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN))return ADMIN_TOKEN; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} console.error('❌ Auth'); process.exit(0); }

const tok=await token();
// 1) CDN-URL ermitteln: zuerst per Dateiname (neueste lspod-designer*.js), sonst per fester FILE_ID.
let CDN='';
const FQ=`query{ files(first:20, query:"filename:lspod-designer", sortKey:CREATED_AT, reverse:true){ edges{ node{ __typename ... on GenericFile{ url } ... on MediaImage{ image{ url } } } } } }`;
try{ const fr=await gql(tok,FQ); const edges=fr?.data?.files?.edges||[];
  for(const {node} of edges){ const u=node?.url||node?.image?.url||''; if(u && /lspod-designer/i.test(u)){ CDN=u; break; } }
}catch(e){}
if(!CDN){ // Fallback: feste FILE_ID (GenericFile, sonst MediaImage)
  const NQ=`query($id:ID!){ node(id:$id){ __typename ... on GenericFile { url } ... on MediaImage { image { url } } } }`;
  const nr=await gql(tok,NQ,{id:`gid://shopify/GenericFile/${FILE_ID}`}); CDN=nr?.data?.node?.url||nr?.data?.node?.image?.url||'';
  if(!CDN){ const nr2=await gql(tok,NQ,{id:`gid://shopify/MediaImage/${FILE_ID}`}); CDN=nr2?.data?.node?.image?.url||nr2?.data?.node?.url||''; }
}
if(!CDN){ console.error('❌ Konnte CDN-URL des lspod-designer nicht ermitteln (kein Treffer per Name/ID).'); process.exit(1); }
console.log('CDN-URL:', CDN);

// matcht abannews.com/pod/designer.js UND eine evtl. schon gesetzte cdn.shopify…lspod-designer….js
const reFind=()=>/https?:\/\/[^"'\s)]*(?:pod\/designer\.js|lspod-designer[^"'\s)]*?\.js)/g;
const Q=`query($n:Int!,$after:String){ products(first:$n, after:$after, query:"status:active"){ pageInfo{ hasNextPage endCursor } edges{ node{ id title descriptionHtml } } } }`;
const M=`mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{ id } userErrors{ field message } } }`;
let after=null, seen=0, changed=0, fails=[];
while(true){
  const r=await gql(tok,Q,{n:50,after}); const conn=r?.data?.products; if(!conn) break;
  for(const {node:p} of conn.edges){
    seen++; const d=p.descriptionHtml||''; const ms=d.match(reFind()); if(!ms) continue;
    if(ms.every(m=>m===CDN)) continue; // schon auf aktueller CDN-URL
    const nd=d.replace(reFind(), CDN);
    if(DRY){ console.log(`DRY ${p.title}: abannews → CDN`); changed++; continue; }
    const ur=await gql(tok,M,{p:{id:p.id,descriptionHtml:nd}}); const ue=ur?.data?.productUpdate?.userErrors||[];
    if(ue.length){ fails.push(`${p.title}: ${JSON.stringify(ue).slice(0,120)}`); continue; }
    changed++; console.log(`✓ ${p.title}`); await new Promise(x=>setTimeout(x,200));
  }
  if(!conn.pageInfo?.hasNextPage) break; after=conn.pageInfo.endCursor;
}
if(fails.length) fails.forEach(f=>console.error('✗',f));
console.log(`\nFertig: ${seen} geprüft, ${changed} Produkte ${DRY?'(DRY) ':''}auf CDN umgestellt${fails.length?`, ${fails.length} Fehler`:''}.`);
