#!/usr/bin/env node
/* LuxeStyle — scrub_germany.mjs
 * Strikt-CH-Regel (FEST): KEINE Deutschland/EU-Versand-Erwähnungen. Entfernt sie aus Produkt-Beschreibungen
 * + SEO-Meta (description_tag/title_tag). Idempotent, No-op ohne Creds. DRY_RUN=1.
 * ⚠️ Homepage-Meta („nach Deutschland") ist Shop-Level (Online Store → Preferences) = separat/User.
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

// sichere Phrasen-Ersetzungen (spezifisch → allgemein), damit Grammatik nicht bricht
const REPL=[
  ['die Schweiz und nach Deutschland','die Schweiz'], ['Schweiz und nach Deutschland','Schweiz'],
  ['Schweiz und Deutschland','Schweiz'], [' und nach Deutschland',''], [' und nach DE',''],
  ['nach Deutschland und in die Schweiz','in die Schweiz'], ['nach Deutschland',''],
  ['schnelle EU-Lieferung','schnelle Lieferung in die Schweiz'], ['EU-Lieferung','Lieferung in die Schweiz'],
  ['EU-weit','schweizweit'], ['in ganz Europa','in der ganzen Schweiz'], ['Versand nach DE/AT/CH','Versand in die Schweiz'],
];
function scrub(s){ let o=String(s||''); for(const [a,b] of REPL){ o=o.split(a).join(b); } return o.replace(/\s{2,}/g,' '); }
function has(s){ return /Deutschland|EU-Lieferung|EU-weit|nach DE\b/i.test(String(s||'')); }

const Q=`query($n:Int!,$after:String){ products(first:$n, after:$after, query:"status:active"){ pageInfo{ hasNextPage endCursor } edges{ node{ id title descriptionHtml metafields(first:20,namespace:"global"){ edges{ node{ key value } } } } } } }`;
const M=`mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{ id } userErrors{ field message } } }`;
const MF=`mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ field message } } }`;

const tok=await token(); let after=null, seen=0, changed=0, fails=[];
outer:
while(true){
  const r=await gql(tok,Q,{n:50,after}); const conn=r?.data?.products; if(!conn) break;
  for(const {node:p} of conn.edges){
    seen++; const desc=p.descriptionHtml||'';
    const metas={}; for(const {node:m} of (p.metafields?.edges||[])) metas[m.key]=m.value;
    const newDesc=scrub(desc);
    const newTT=metas.title_tag!=null?scrub(metas.title_tag):null;
    const newDT=metas.description_tag!=null?scrub(metas.description_tag):null;
    const descChg=newDesc!==desc, ttChg=newTT!=null&&newTT!==metas.title_tag, dtChg=newDT!=null&&newDT!==metas.description_tag;
    if(!descChg && !ttChg && !dtChg) continue;
    if(DRY){ console.log(`DRY ${p.title}: ${descChg?'desc ':''}${ttChg?'title_tag ':''}${dtChg?'desc_tag':''}`); changed++; continue; }
    if(descChg){ const ur=await gql(tok,M,{p:{id:p.id,descriptionHtml:newDesc}}); const ue=ur?.data?.productUpdate?.userErrors||[]; if(ue.length){ fails.push(`${p.title}: ${JSON.stringify(ue).slice(0,100)}`); continue; } }
    const mfs=[]; if(ttChg) mfs.push({ownerId:p.id,namespace:'global',key:'title_tag',type:'single_line_text_field',value:newTT});
    if(dtChg) mfs.push({ownerId:p.id,namespace:'global',key:'description_tag',type:'single_line_text_field',value:newDT});
    if(mfs.length) await gql(tok,MF,{mf:mfs});
    changed++; if(changed%25===0) console.log(`  … ${changed}`);
    await new Promise(x=>setTimeout(x,200));
  }
  if(!conn.pageInfo?.hasNextPage) break; after=conn.pageInfo.endCursor;
}
if(fails.length) fails.slice(0,15).forEach(f=>console.error('✗',f));
console.log(`\nFertig: ${seen} geprüft, ${changed} ${DRY?'(DRY) ':''}von Deutschland/EU bereinigt (strikt CH).`);
