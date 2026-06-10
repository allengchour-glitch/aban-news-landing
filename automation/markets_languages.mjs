#!/usr/bin/env node
/* LuxeStyle — markets_languages.mjs
 * Sprache je Land: aktiviert + publiziert die nötigen Shop-Sprachen (FR/IT/EN) zusätzlich zur Basis DE, damit Shopify
 * Markets die Storefront-Sprache automatisch je Land umschalten kann. ADDITIV & idempotent — entfernt NIE eine Sprache,
 * fasst die Markt-Web-Presence der Parallel-Session NICHT an (nur Report). No-op ohne Creds. DRY_RUN=1.
 * ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (oder _ADMIN_TOKEN) · [LOCALES=fr,it,en] · [DRY_RUN=1]
 */
const SHOPraw=process.env.SHOPIFY_SHOP||''; const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1'; const API='2025-01';
const WANT=(process.env.LOCALES||'fr,it,en').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
let SHOP=SHOPraw.replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN))return ADMIN_TOKEN; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} console.error('❌ Auth'); process.exit(0); }

const Q_LOC=`{ shopLocales{ locale primary published } }`;
const Q_MARKETS=`{ markets(first:30){ edges{ node{ id name handle enabled } } } }`;
const M_ENABLE=`mutation($locale:String!){ shopLocaleEnable(locale:$locale){ shopLocale{ locale published } userErrors{ field message } } }`;
const M_PUBLISH=`mutation($locale:String!){ shopLocaleUpdate(locale:$locale, shopLocale:{published:true}){ shopLocale{ locale published } userErrors{ field message } } }`;

const tok=await token();
const cur=((await gql(tok,Q_LOC))?.data?.shopLocales)||[];
console.log('Aktuelle Sprachen:', cur.map(l=>`${l.locale}${l.primary?'*':''}${l.published?'':'(unpubl.)'}`).join(', ')||'—');
const have=new Map(cur.map(l=>[l.locale.toLowerCase(), l]));

for(const loc of WANT){
  // exakter Match oder Sprach-Präfix (z.B. en == en-GB)
  const existing=cur.find(l=>l.locale.toLowerCase()===loc || l.locale.toLowerCase().startsWith(loc+'-'));
  if(existing && existing.published){ console.log(`= ${loc}: schon aktiv & publiziert (${existing.locale})`); continue; }
  if(DRY){ console.log(`DRY ${loc}: ${existing?'publizieren':'aktivieren + publizieren'}`); continue; }
  if(!existing){ const e=await gql(tok,M_ENABLE,{locale:loc}); const ue=e?.data?.shopLocaleEnable?.userErrors||[]; if(ue.length){ console.error(`✗ enable ${loc}:`,JSON.stringify(ue)); continue; } console.log(`+ ${loc} aktiviert`); }
  const realLoc=(existing&&existing.locale)||loc;
  const u=await gql(tok,M_PUBLISH,{locale:realLoc}); const uu=u?.data?.shopLocaleUpdate?.userErrors||[];
  if(uu.length) console.error(`✗ publish ${realLoc}:`,JSON.stringify(uu)); else console.log(`✓ ${realLoc} publiziert`);
  await new Promise(x=>setTimeout(x,300));
}

const markets=((await gql(tok,Q_MARKETS))?.data?.markets?.edges||[]).map(e=>e.node);
console.log(`\nMärkte (${markets.length}):`); markets.forEach(m=>console.log(`  • ${m.name} (${m.handle}) ${m.enabled?'enabled':'disabled'}`));
console.log('\nHinweis: Shopify schaltet je Land automatisch auf die publizierte Sprache, sobald Inhalte übersetzt sind (translate_content.mjs).');
console.log('Markt-Web-Presence wurde NICHT verändert (Parallel-Session-Schutz). Falls eine Sprache in einem Markt fehlt: im Admin → Märkte → Sprachen ergänzen.');
