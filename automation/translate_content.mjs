#!/usr/bin/env node
/* LuxeStyle — translate_content.mjs
 * Sprache je Land: übersetzt Shop-Inhalte DE → FR/IT/EN per Gemini und registriert sie via translationsRegister
 * (digest-basiert, idempotent über Ledger dropship/_translated.txt). Shopify schaltet danach automatisch je Land um.
 * SCOPE steuert den Umfang (nacheinander aufrufen, ohne Pause):
 *   SCOPE=hero    → Hero-/bewertete Produkte (good_products.csv/rated_products.csv) + alle Collections
 *   SCOPE=catalog → ALLE ACTIVE Produkte (paginiert)
 *   SCOPE=theme   → Online-Store-Theme-Strings (Menü/Buttons/Sektionen, inkl. Lieferzeit-Keys) + Menü-Links
 * No-op ohne Shopify-Creds oder GEMINI_API_KEY. DRY_RUN=1 = nur Vorschau (keine Registrierung, keine Gemini-Kosten).
 * ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (oder _ADMIN_TOKEN) · GEMINI_API_KEY · SCOPE · [TARGETS=fr,it,en] · [MAX=1000] · [DRY_RUN=1]
 */
import fs from 'node:fs';
const SHOPraw=process.env.SHOPIFY_SHOP||''; const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const GEMINI=(process.env.GEMINI_API_KEY||'').trim();
const SCOPE=(process.env.SCOPE||'hero').trim().toLowerCase();
const TARGETS=(process.env.TARGETS||'fr,it,en').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
const MAX=Math.max(1,parseInt(process.env.MAX||'1000',10)||1000);
const DRY=process.env.DRY_RUN==='1'; const API='2025-01';
const LANGNAME={fr:'French',it:'Italian',en:'English',de:'German'};
const LEDGER='dropship/_translated.txt';
let SHOP=SHOPraw.replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }
if(!GEMINI){ console.log('Kein GEMINI_API_KEY → No-op (Übersetzung braucht den Key).'); process.exit(0); }

async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN))return ADMIN_TOKEN; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} console.error('❌ Auth'); process.exit(0); }

// ---- Ledger ----
const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.trim()).filter(Boolean):[]);
function mark(id,loc,digest){ const k=`${id}|${loc}|${digest}`; done.add(k); if(!DRY) fs.appendFileSync(LEDGER,k+'\n'); }
function isDone(id,loc,digest){ return done.has(`${id}|${loc}|${digest}`); }

// ---- Gemini ----
function stripFences(t){ return String(t||'').replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim(); }
async function translateBatch(map, lang){ // map: {key:value} → {key:translated}
  const keys=Object.keys(map); if(!keys.length) return {};
  const prompt=`Translate the VALUES of this JSON from German to ${LANGNAME[lang]||lang}. Rules: keep all HTML tags/attributes and emojis intact, translate only human-readable text, keep brand names (LuxeStyle) unchanged, do NOT translate URLs or handles, keep placeholders like {{ ... }} unchanged. Return ONLY a JSON object with the SAME keys and translated values, no commentary.\n\n${JSON.stringify(map)}`;
  const body={contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.2,responseMimeType:'application/json'}};
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(GEMINI)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  const t=((j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts||[]).map(p=>p.text||'').join('')).trim();
  try{ const o=JSON.parse(stripFences(t)); return (o&&typeof o==='object')?o:{}; }catch{ return {}; }
}

const T_REG=`mutation($id:ID!,$tr:[TranslationInput!]!){ translationsRegister(resourceId:$id, translations:$tr){ userErrors{ field message } } }`;
const Q_BYTYPE=`query($type:TranslatableResourceType!,$n:Int!,$after:String){ translatableResources(first:$n, resourceType:$type, after:$after){ pageInfo{ hasNextPage endCursor } edges{ node{ resourceId translatableContent{ key value digest type } } } } }`;
const Q_BYID=`query($id:ID!){ translatableResource(resourceId:$id){ resourceId translatableContent{ key value digest type } } }`;
const Q_HANDLE=`query($h:String!){ productByHandle(handle:$h){ id } }`;

function wantField(c){ if(!c||!c.digest) return false; const v=(c.value||'').trim(); if(!v) return false;
  if(c.key==='handle') return false; if(/^https?:\/\//.test(v)) return false; if(/_URL$|^uri$/i.test(c.type||'')) return false; return true; }

const tok=await token();

async function translateResource(res){
  const id=res.resourceId; const fields=(res.translatableContent||[]).filter(wantField);
  if(!fields.length) return {skipped:true};
  let regs=0;
  for(const loc of TARGETS){
    // alle Felder dieses Resource für diese Sprache, die noch nicht im Ledger sind
    const todo=fields.filter(c=>!isDone(id,loc,c.digest));
    if(!todo.length) continue;
    const map={}; for(const c of todo) map[c.key]=c.value;
    if(DRY){ console.log(`   DRY ${loc}: ${Object.keys(map).length} Feld(er) [${Object.keys(map).join(',')}]`); for(const c of todo) mark(id,loc,c.digest); regs++; continue; }
    const out=await translateBatch(map, loc);
    const tr=[]; for(const c of todo){ const val=out[c.key]; if(typeof val==='string' && val.trim()){ tr.push({locale:loc, key:c.key, value:val, translatableContentDigest:c.digest}); } }
    if(!tr.length){ continue; }
    const r=await gql(tok,T_REG,{id,tr}); const ue=r?.data?.translationsRegister?.userErrors||[];
    if(ue.length){ console.error(`   ✗ ${id} ${loc}:`,JSON.stringify(ue).slice(0,140)); continue; }
    for(const c of todo) mark(id,loc,c.digest); regs++;
    await new Promise(x=>setTimeout(x,250));
  }
  return {regs};
}

async function eachByType(type, cb){ let after=null, n=0; while(true){ const r=await gql(tok,Q_BYTYPE,{type,n:50,after}); const conn=r?.data?.translatableResources; if(!conn){ console.error('  ⚠️ kein Ergebnis für',type, JSON.stringify(r?.errors||'').slice(0,160)); break; }
  for(const {node} of conn.edges){ if(n>=MAX) return n; await cb(node); n++; } if(!conn.pageInfo?.hasNextPage) break; after=conn.pageInfo.endCursor; } return n; }

let total=0, touched=0;
console.log(`Übersetzen — SCOPE=${SCOPE}, Ziele: ${TARGETS.join('/')}${DRY?' [DRY]':''}`);

if(SCOPE==='hero'){
  // Hero-Produkte aus CSV-Handles
  const handles=new Set();
  for(const f of ['automation/good_products.csv','dropship/rated_products.csv']){ if(!fs.existsSync(f)) continue;
    const lines=fs.readFileSync(f,'utf8').split('\n').slice(1); for(const ln of lines){ const h=(ln.split(',')[0]||'').trim(); if(h) handles.add(h); } }
  console.log(`  Hero-Produkte: ${handles.size} Handles + alle Collections`);
  for(const h of handles){ if(total>=MAX) break; const pr=await gql(tok,Q_HANDLE,{h}); const pid=pr?.data?.productByHandle?.id; if(!pid){ continue; }
    const rr=await gql(tok,Q_BYID,{id:pid}); const res=rr?.data?.translatableResource; if(!res) continue;
    const out=await translateResource(res); total++; if(out.regs) touched++; if(out.regs) console.log(`  ✓ ${h}`); }
  // alle Collections
  total+=await eachByType('COLLECTION', async (node)=>{ const out=await translateResource(node); if(out.regs){ touched++; } });
}
else if(SCOPE==='catalog'){
  total+=await eachByType('PRODUCT', async (node)=>{ const out=await translateResource(node); if(out.regs){ touched++; if(touched%25===0) console.log(`  … ${touched} Produkte übersetzt`); } });
}
else if(SCOPE==='theme'){
  for(const type of ['ONLINE_STORE_THEME','LINK','SHOP_POLICY','ONLINE_STORE_THEME_SECTION_GROUP']){
    try{ const n=await eachByType(type, async (node)=>{ const out=await translateResource(node); if(out.regs) touched++; }); console.log(`  ${type}: ${n} Ressource(n) geprüft`); }catch(e){ console.error('  ⚠️',type,e.message); }
  }
  total=touched;
}
else { console.error('Unbekannter SCOPE (hero|catalog|theme).'); process.exit(1); }

console.log(`\nFertig SCOPE=${SCOPE}: ${total} Ressource(n) geprüft, ${touched} mit neuen Übersetzungen${DRY?' (DRY — nichts registriert)':''}.`);
