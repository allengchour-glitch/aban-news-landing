#!/usr/bin/env node
/* LuxeStyle — rename_trikot_generic.mjs
 * Rechts-/Ehrlichkeits-Fix (User-OK 2026-07-03): „WM 2026"/„World Cup"/FIFA sind geschützte Marken → das Trikot
 * generisch als „Schweiz Fan-Trikot 2026 – selbst gestalten" führen (kein WM/World Cup/offizielles Wappen).
 * Ändert Titel + SEO-Meta (title_tag/description_tag) + entschärft WM-Referenzen in der Beschreibung. Idempotent.
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

// literal Ersetzungen (Reihenfolge wichtig: spezifisch → allgemein). Entfernt geschützte „WM/World Cup"-Marke.
const REPL=[
  ['WM-Fan-Trikot','Fan-Trikot'], ['WM Fan-Trikot','Fan-Trikot'], ['WM-Trikot','Fan-Trikot'], ['WM Trikot','Fan-Trikot'],
  ['WM &amp; Fussball 2026','Fussball &amp; Fan 2026'], ['WM & Fussball 2026','Fussball & Fan 2026'],
  ['zur WM 2026','zur Fussball-Saison 2026'], ['zur WM','zur Fussball-Saison'],
  ['WM-2026','2026'], ['WM 2026','Fan-Saison 2026'], ['World Cup',''], ['Weltmeisterschaft','Fussball-Saison'],
];
function scrub(s){ let out=String(s||''); for(const [a,b] of REPL){ out=out.split(a).join(b); } return out; }

const TARGETS=[
  { id:'gid://shopify/Product/15433948070273',
    title:'⚽ Schweiz Fan-Trikot 2026 – selbst gestalten (Name & Nummer)',
    titleTag:'Schweiz Fan-Trikot 2026 selbst gestalten – Name & Nummer | LuxeStyle',
    descTag:'Gestalte dein eigenes Schweizer Fan-Trikot 2026: Name + Nummer frei wählbar, Grössen S–2XL. In der Schweiz gestaltet, schnelle Lieferung. Inoffizielles Fan-Design.' },
  { id:'gid://shopify/Product/15447487480193',
    title:'⚽ Schweiz Fan-Trikot 2026 – Rot (Blank)',
    titleTag:'Schweiz Fan-Trikot 2026 – Rot (Blank) | LuxeStyle',
    descTag:'Schlichtes rotes Schweizer Fan-Trikot 2026, Grössen S–2XL. In der Schweiz gestaltet, schnelle Lieferung. Inoffizielles Fan-Design.' },
];
const Q=`query($id:ID!){ product(id:$id){ title descriptionHtml } }`;
const M=`mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{ id title } userErrors{ field message } } }`;
const MF=`mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ field message } } }`;

const tok=await token(); let changed=0, fails=[];
for(const t of TARGETS){
  const r=await gql(tok,Q,{id:t.id}); const p=r?.data?.product; if(!p){ console.log(`⚠️ ${t.id} nicht gefunden`); continue; }
  const newDesc=scrub(p.descriptionHtml);
  const needTitle = p.title!==t.title;
  const needDesc  = newDesc!==p.descriptionHtml;
  if(!needTitle && !needDesc){ console.log(`= schon generisch: ${p.title}`); }
  if(DRY){ console.log(`DRY ${p.title} → ${t.title}${needDesc?' (+desc)':''}`); changed++; continue; }
  if(needTitle||needDesc){
    const ur=await gql(tok,M,{p:{id:t.id, title:t.title, descriptionHtml:newDesc}}); const ue=ur?.data?.productUpdate?.userErrors||[];
    if(ue.length){ fails.push(`${t.id}: ${JSON.stringify(ue).slice(0,120)}`); continue; }
    changed++;
  }
  await gql(tok,MF,{mf:[
    {ownerId:t.id, namespace:'global', key:'title_tag', type:'single_line_text_field', value:t.titleTag},
    {ownerId:t.id, namespace:'global', key:'description_tag', type:'single_line_text_field', value:t.descTag},
  ]});
  console.log(`✓ ${t.title}`);
  await new Promise(x=>setTimeout(x,250));
}
if(fails.length) fails.forEach(f=>console.error('✗',f));
console.log(`\nFertig: ${changed} ${DRY?'(DRY) ':''}Trikot-Produkte generisch benannt (kein WM/World-Cup).`);
