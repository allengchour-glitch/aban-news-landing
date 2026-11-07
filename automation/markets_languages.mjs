#!/usr/bin/env node
/* LuxeStyle — markets_languages.mjs
 * Sprache je Land: aktiviert + publiziert Shop-Sprachen nur mit frischem, hashgebundenem
 * Vollkatalog-Uebersetzungsbeleg. Bereits publizierte Sprachen werden nie automatisch
 * deaktiviert oder umgeschrieben. Die Markt-Web-Presence bleibt reine Lesekontrolle.
 * No-op ohne Creds. Trockenlauf ist Vorgabe; ein Write braucht LIVE=1 UND DRY_RUN=0.
 * ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (oder _ADMIN_TOKEN) · [LOCALES=fr,it,en]
 *      TRANSLATION_COVERAGE_FILE + TRANSLATION_COVERAGE_SHA256
 *      TRANSLATION_SOURCE_SNAPSHOT_SHA256 · [COVERAGE_MAX_AGE_HOURS=24]
 */
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { auditRequestedLocaleCoverage, loadTranslationCoverage, localeWriteEnabled } from './lib/locale_publish_guard.mjs';
const SHOPraw=process.env.SHOPIFY_SHOP||''; const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET)||'').trim();
const DRY=!localeWriteEnabled(process.env); const API='2025-01';
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
let coverage;
let coverageError;
try {
  coverage=loadTranslationCoverage({
    file:process.env.TRANSLATION_COVERAGE_FILE,
    expectedSha256:process.env.TRANSLATION_COVERAGE_SHA256,
    expectedSourceSnapshotSha256:process.env.TRANSLATION_SOURCE_SNAPSHOT_SHA256,
    shopDomain:SHOP,
    maxAgeHours:Number(process.env.COVERAGE_MAX_AGE_HOURS||24),
  }).evidence;
} catch(error) {
  coverageError=error.message;
}

// Pflicht: Auch bereits publizierte Locales zuerst gegen den Beleg pruefen.
// So wird eine unuebersetzte, aber publizierte /fr/-Storefront nicht als «erledigt» uebersprungen.
const audit=auditRequestedLocaleCoverage({shopLocales:cur,wantedLocales:WANT,evidence:coverage,coverageError});
for(const row of audit.rows){
  if(row.coverage.ok) console.log(`COVERAGE OK ${row.locale}: ${row.coverage.reason}`);
  else console.error(`${row.published?'ALARM PUBLIZIERT':'BLOCKIERT'} ${row.locale}: ${row.coverage.reason}`);
}
if(!audit.ok){
  console.error('Keine Locale-Aenderung: mindestens eine angeforderte Sprache hat keinen vollstaendigen Beleg.');
  process.exit(2);
}

for(const row of audit.rows){
  const loc=row.requested, existing=row.existing, realLoc=row.locale;
  if(existing && existing.published){ console.log(`= ${loc}: belegt, aktiv & publiziert (${existing.locale})`); continue; }
  if(DRY){ console.log(`DRY ${loc}: ${existing?'publizieren':'aktivieren + publizieren'}`); continue; }
  if(!existing){ const e=await gql(tok,M_ENABLE,{locale:loc}); const ue=e?.data?.shopLocaleEnable?.userErrors||[]; if(ue.length){ console.error(`✗ enable ${loc}:`,JSON.stringify(ue)); continue; } console.log(`+ ${loc} aktiviert`); }
  const u=await gql(tok,M_PUBLISH,{locale:realLoc}); const uu=u?.data?.shopLocaleUpdate?.userErrors||[];
  if(uu.length) console.error(`✗ publish ${realLoc}:`,JSON.stringify(uu)); else console.log(`✓ ${realLoc} publiziert`);
  await new Promise(x=>setTimeout(x,300));
}

const markets=((await gql(tok,Q_MARKETS))?.data?.markets?.edges||[]).map(e=>e.node);
console.log(`\nMärkte (${markets.length}):`); markets.forEach(m=>console.log(`  • ${m.name} (${m.handle}) ${m.enabled?'enabled':'disabled'}`));
console.log('\nHinweis: Neue Sprachen werden nur mit vollständigem, frischem und hashgebundenem Uebersetzungsbeleg publiziert.');
console.log('Markt-Web-Presence wurde NICHT verändert (Parallel-Session-Schutz). Falls eine Sprache in einem Markt fehlt: im Admin → Märkte → Sprachen ergänzen.');
