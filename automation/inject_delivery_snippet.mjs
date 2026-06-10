#!/usr/bin/env node
/* LuxeStyle — inject_delivery_snippet.mjs
 * Lieferzeit Phase 2: lädt snippets/ls-lieferzeit.liquid ins LIVE-Theme und bindet es in die Produkt-Sektion ein
 * ({% render 'ls-lieferzeit', product: product %}). Landesabhängig + einsprachig (liest Metafeld custom.lieferzeit).
 * SICHER & REVERSIBEL: Backup der Sektion nach dropship/theme-backups/, idempotenter Marker, JSON/Liquid bleibt intakt.
 * REMOVE=1 = Einbindung wieder entfernen (Snippet-Datei bleibt, schadet nicht).
 * Auth: Client-Credentials. No-op ohne Creds. DRY_RUN=1.
 * ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET · [SECTION=sections/main-product.liquid] · DRY_RUN=1 · REMOVE=1
 */
import fs from 'node:fs';
const SHOP=(process.env.SHOPIFY_SHOP||'').trim(); const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const API='2025-01';
const SECTION=(process.env.SECTION||'sections/main-product.liquid').trim();
const SNIPPET='snippets/ls-lieferzeit.liquid';
const DRY=process.env.DRY_RUN==='1'; const REMOVE=process.env.REMOVE==='1';
const MARKER='{% render \'ls-lieferzeit\', product: product %}';
const BLOCK=`\n{%- comment -%} ls-liefer-injected {%- endcomment -%}\n${MARKER}\n`;
if(!SHOP||!CID||!CSEC){ console.log('Kein Shopify-Cred → No-op.'); process.exit(0); }

async function token(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); if(!j.access_token) throw new Error('kein Token'); return j.access_token; }
async function gql(tok,query,variables){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query,variables})}); const j=await r.json(); if(j.errors) throw new Error(JSON.stringify(j.errors)); return j.data; }
const Q_THEME=`query{themes(first:1,roles:[MAIN]){edges{node{id}}}}`;
const Q_FILE=`query($id:ID!,$fn:[String!]!){theme(id:$id){files(filenames:$fn,first:1){edges{node{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}}`;
const M_UPSERT=`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){ themeFilesUpsert(themeId:$id,files:$files){ upsertedThemeFiles{filename} userErrors{filename message} } }`;

async function readFile(tok,themeId,fn){ const r=await gql(tok,Q_FILE,{id:themeId,fn:[fn]}); const e=r.theme.files.edges[0]; return e?e.node.body.content:null; }

const tok=await token();
const themeId=(await gql(tok,Q_THEME)).themes.edges[0].node.id;

// 1) Snippet-Datei ins Theme schreiben (immer aktuell halten)
const snippetSrc=fs.readFileSync(SNIPPET,'utf8');
if(!DRY){ const sr=await gql(tok,M_UPSERT,{id:themeId,files:[{filename:SNIPPET,body:{type:'TEXT',value:snippetSrc}}]}); const se=sr.themeFilesUpsert.userErrors||[]; if(se.length){ console.error('Snippet-Upsert-Fehler:',JSON.stringify(se)); process.exit(1);} console.log(`✓ ${SNIPPET} ins Theme geschrieben.`); }
else console.log(`DRY: würde ${SNIPPET} schreiben (${snippetSrc.length} Zeichen).`);

// 2) Sektion bearbeiten
const raw=await readFile(tok,themeId,SECTION);
if(raw==null){ console.error(`⚠️ ${SECTION} nicht gefunden → Einbindung übersprungen. Setze SECTION=… auf die Produkt-Sektion deines Themes.`); process.exit(0); }
const has=raw.includes('ls-liefer-injected')||raw.includes(MARKER);
let out=raw;
if(REMOVE){ if(!has){ console.log('Marker nicht vorhanden → nichts zu entfernen.'); process.exit(0); }
  out=raw.replace(/\n\{%- comment -%\} ls-liefer-injected \{%- endcomment -%\}\n\{% render 'ls-lieferzeit', product: product %\}\n/g,'\n');
  console.log('Entferne Lieferzeit-Einbindung.');
}
else { if(has){ console.log('= Einbindung schon vorhanden → idempotent, nichts zu tun.'); process.exit(0); }
  // nach dem ersten Vorkommen von {{ product.description }} ODER vor </form> der Produktform einfügen; sonst ans Ende.
  let idx=raw.search(/{{-?\s*product\.description/);
  if(idx>=0){ const end=raw.indexOf('}}',idx); const cut=end>=0?end+2:idx; out=raw.slice(0,cut)+BLOCK+raw.slice(cut); }
  else { out=raw+BLOCK; }
  console.log('Füge Lieferzeit-Einbindung ein (nach Produktbeschreibung bzw. ans Ende).');
}
if(out===raw){ console.log('Keine Änderung.'); process.exit(0); }
if(DRY){ console.log('DRY_RUN — Sektion nicht geschrieben.'); process.exit(0); }
try{ fs.mkdirSync('dropship/theme-backups',{recursive:true}); fs.writeFileSync('dropship/theme-backups/'+SECTION.split('/').pop()+'.bak', raw); }catch{}
const res=await gql(tok,M_UPSERT,{id:themeId,files:[{filename:SECTION,body:{type:'TEXT',value:out}}]});
const errs=res.themeFilesUpsert.userErrors||[];
if(errs.length){ console.error('userErrors:',JSON.stringify(errs)); process.exit(1); }
console.log(`✅ ${SECTION} aktualisiert (Lieferzeit-Snippet eingebunden).`);
