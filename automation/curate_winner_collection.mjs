#!/usr/bin/env node
/* curate_winner_collection.mjs — erstellt/aktualisiert eine SAUBERE manuelle Collection "Frauen-Favoriten"
 * (handle: frauen-favoriten) mit den 20 Winner-Handles aus automation/katalog_rekuration.json (CHF 15-70).
 * Grund (20-Agenten-Katalog-Audit 2026-07-04): die breite Topseller-Vitrine zeigt kaltem Frauen-Traffic einen
 * CHF-1042-Smart-TV auf Position 1 + Herren-Uhren/Parfum/Hanteln = max. Kaufrisiko. Diese kuratierte Collection
 * = sauberes Cold-Traffic-Ziel fuer Home-CTA/Nav (Theme-Session verlinkt darauf).
 * SICHER: erstellt nur + fuegt hinzu (loescht NIE). Idempotent. DRY (default), GO=1 schreibt. No-op ohne Creds.
 * ENV: SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [GO=1] · [SHOPIFY_SHOP]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const AT=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(), CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const GO=process.env.GO==='1'; const API='2025-01';
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
mkdirSync('reports',{recursive:true});
const out=[]; const W=m=>{ out.push(m); console.log(m); try{ writeFileSync('reports/curate-winners.txt', out.join('\n')+'\n'); }catch{} };
const TITLE='Frauen-Favoriten', HANDLE='frauen-favoriten';
const DESC='<p>Unsere beliebtesten Frauen-Favoriten zum Einsteigen: wasserfester Edelstahl- und 925-Silber-Schmuck, personalisierte Geschenke, Mini-Taschen und Sonnenbrillen. Faire Preise, gratis Versand ab CHF 50, 30 Tage Rückgabe.</p>';
let WIN=[]; try{ WIN=JSON.parse(readFileSync('automation/katalog_rekuration.json','utf8')).feature_winners||[]; }catch(e){ W('Keine katalog_rekuration.json → No-op.'); process.exit(0); }
if(!AT && !(CID&&CSEC)){ W('Keine Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
let tok=AT&&await works(AT)?AT:null; if(!tok&&CID&&CSEC){ const t=await cc(); if(t&&await works(t)) tok=t; }
if(!tok){ W('❌ Auth'); process.exit(0); }

// Produkt-IDs zu Handles
const pids=[]; const missing=[];
for(const h of WIN){
  const r=await gql(tok,`query($q:String!){ products(first:1, query:$q){ edges{ node{ id handle } } } }`,{q:`handle:${h}`});
  const n=r?.data?.products?.edges?.[0]?.node;
  if(n&&n.handle===h){ pids.push(n.id); } else { missing.push(h); }
  await new Promise(x=>setTimeout(x,120));
}
W(`Winner aufgeloest: ${pids.length}/${WIN.length}${missing.length?' · fehlend: '+missing.join(', '):''}`);
if(!pids.length){ W('Keine Produkt-IDs → Abbruch.'); process.exit(0); }

// Collection finden
const cr=await gql(tok,`query($q:String!){ collections(first:1, query:$q){ edges{ node{ id handle title } } } }`,{q:`handle:${HANDLE}`});
let colId=cr?.data?.collections?.edges?.[0]?.node?.id||null;
W(colId?`Collection existiert: ${colId}`:'Collection existiert noch nicht.');

if(!GO){ W(`\n[DRY] wuerde ${colId?'aktualisieren':'erstellen'}: "${TITLE}" (${HANDLE}) mit ${pids.length} Produkten. GO=1 zum Schreiben.`); process.exit(0); }

if(!colId){
  const c=await gql(tok,`mutation($in:CollectionInput!){ collectionCreate(input:$in){ collection{ id } userErrors{ message } } }`,
    {in:{title:TITLE, handle:HANDLE, descriptionHtml:DESC}});
  const ue=c?.data?.collectionCreate?.userErrors||[]; if(ue.length){ W('✗ create: '+JSON.stringify(ue).slice(0,120)); process.exit(0); }
  colId=c?.data?.collectionCreate?.collection?.id; W('✓ Collection erstellt: '+colId);
}
// Produkte hinzufuegen (manuell)
const add=await gql(tok,`mutation($id:ID!,$ids:[ID!]!){ collectionAddProducts(id:$id, productIds:$ids){ userErrors{ message } } }`,{id:colId, ids:pids});
const aue=add?.data?.collectionAddProducts?.userErrors||[]; if(aue.length){ W('✗ addProducts: '+JSON.stringify(aue).slice(0,160)); } else { W(`✓ ${pids.length} Produkte hinzugefuegt.`); }
// Auf Online Store publizieren (best effort)
try{
  const pubs=await gql(tok,`{ publications(first:10){ edges{ node{ id name } } } }`);
  const os=(pubs?.data?.publications?.edges||[]).find(e=>/online store/i.test(e.node.name))?.node?.id;
  if(os){ const pp=await gql(tok,`mutation($id:ID!,$pid:ID!){ publishablePublish(id:$id, input:{publicationId:$pid}){ userErrors{ message } } }`,{id:colId,pid:os});
    const pe=pp?.data?.publishablePublish?.userErrors||[]; W(pe.length?('⚠️ publish: '+JSON.stringify(pe).slice(0,100)):'✓ auf Online Store publiziert.'); }
  else W('⚠️ Online-Store-Publication nicht gefunden → ggf. manuell publizieren.');
}catch(e){ W('⚠️ publish-Schritt: '+(e?.message||'').slice(0,80)); }
W(`\nFertig: /collections/${HANDLE} mit ${pids.length} Winnern. Theme-Session: Home-CTA/Nav hierauf zeigen lassen.`);
