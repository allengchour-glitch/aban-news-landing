#!/usr/bin/env node
/* LuxeStyle — delivery_block.mjs
 * Lieferzeit-Anzeige je nach Bestellort (Phase 1): schreibt pro Produkt einen Regions-Block in die Beschreibung
 * UND ein Metafeld custom.lieferzeit (json) — Herkunft aus den Lieferanten-Tags abgeleitet:
 *   • EU-Druck (printful/prodigi_personalized_product) → CH/EU 3–7 T · USA 5–9 T
 *   • EU-Lager  (eu-lager)                             → CH/EU 5–10 T
 *   • China-Lager (cj-real, Default)                   → CH/EU 8–14 T · USA 10–20 T
 *   • sonst Fallback generisch.
 * Idempotent (Marker class="ls-liefer" → kein Doppeln; Update ersetzt alten Block). No-op ohne Creds. DRY_RUN=1.
 * Das Metafeld custom.lieferzeit nutzt Phase 2 (Theme-Snippet) für die landesabhängige, einsprachige Anzeige.
 * ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (oder _ADMIN_TOKEN) · [LIMIT=500] · [DRY_RUN=1]
 */
const SHOPraw=process.env.SHOPIFY_SHOP||''; const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1'; const API='2025-01';
const LIMIT=Math.max(1,parseInt(process.env.LIMIT||'1000',10)||1000);
let SHOP=SHOPraw.replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN))return ADMIN_TOKEN; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} console.error('❌ Auth'); process.exit(0); }

// Herkunfts-Tier → Lieferzeit-Regionen (Tage-Range als String)
function tier(tags){ const t=tags.map(x=>String(x).toLowerCase());
  if(t.includes('printful_personalized_product')||t.includes('prodigi_personalized_product')) return {key:'eu-druck', ch_eu:'3–7', us:'5–9'};
  if(t.includes('eu-lager')) return {key:'eu-lager', ch_eu:'5–10', us:null};
  if(t.includes('cj-real')) return {key:'china', ch_eu:'8–14', us:'10–20'};
  return {key:'standard', ch_eu:'6–12', us:'9–16'};
}
function blockHtml(z){ const parts=[`🇨🇭 CH / 🇪🇺 EU: <strong>${z.ch_eu} Tage</strong>`]; if(z.us) parts.push(`🇺🇸 USA: <strong>${z.us} Tage</strong>`);
  return `<p class="ls-liefer" data-tier="${z.key}" style="background:#f4f6fb;border:1px solid #dde3ef;border-radius:10px;padding:10px 14px;font-size:13px;margin:0 0 14px;">📦 <strong>Lieferzeit</strong> (je nach Land): ${parts.join(' · ')} <span style="opacity:.7;">· Werktage, inkl. Produktion</span></p>`;
}
function stripBlock(html){ return (html||'').replace(/<p class="ls-liefer"[\s\S]*?<\/p>\s*/g,''); }

const Q=`query($n:Int!,$after:String){ products(first:$n, after:$after, query:"status:active"){ pageInfo{ hasNextPage endCursor } edges{ node{ id title tags descriptionHtml } } } }`;
const M=`mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{ id } userErrors{ field message } } }`;
const MF=`mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ field message } } }`;

const tok=DRY?(await token().catch(()=>null)):await token();
if(!tok){ console.log('Keine Auth → No-op.'); process.exit(0); }
let after=null, seen=0, changed=0, same=0, fails=[];
outer:
while(true){
  const r=await gql(tok,Q,{n:50,after}); const conn=r?.data?.products; if(!conn) break;
  for(const {node:p} of conn.edges){
    if(seen>=LIMIT) break outer; seen++;
    const z=tier(p.tags||[]); const desc=p.descriptionHtml||'';
    const want=blockHtml(z);
    const cleaned=stripBlock(desc);
    const newDesc=want+'\n'+cleaned;
    const mfVal=JSON.stringify({ch_eu:z.ch_eu, us:z.us||'', tier:z.key});
    if(desc.includes(want)){ same++; continue; } // schon exakt so
    if(DRY){ console.log(`DRY ${p.title} [${z.key}]: CH/EU ${z.ch_eu}${z.us?` · US ${z.us}`:''}`); changed++; continue; }
    const ur=await gql(tok,M,{p:{id:p.id,descriptionHtml:newDesc}}); const ue=ur?.data?.productUpdate?.userErrors||[];
    if(ue.length){ fails.push(`${p.title}: ${JSON.stringify(ue).slice(0,120)}`); continue; }
    await gql(tok,MF,{mf:[{ownerId:p.id,namespace:'custom',key:'lieferzeit',type:'json',value:mfVal}]});
    changed++; if(changed%25===0) console.log(`  … ${changed} aktualisiert`);
    await new Promise(x=>setTimeout(x,200));
  }
  if(!conn.pageInfo?.hasNextPage) break; after=conn.pageInfo.endCursor;
}
if(fails.length) fails.slice(0,20).forEach(f=>console.error('✗',f));
console.log(`\nFertig: ${seen} geprüft, ${changed} ${DRY?'(DRY) ':''}aktualisiert, ${same} schon aktuell${fails.length?`, ${fails.length} Fehler`:''}.`);
