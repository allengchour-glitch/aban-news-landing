#!/usr/bin/env node
/* LuxeStyle — set_header_logo.mjs
 * Setzt das Header-Logo (globales Theme-Setting current.logo) auf das hochgeladene „LuxeStyle.ch"-Bild,
 * damit jeder Besucher sofort die Domain sieht. Aktuell ist KEIN Logo-Bild gesetzt → Theme zeigt nur den
 * Shop-Namen als Text.
 * SICHER & REVERSIBEL: liest config/settings_data.json (LIVE-Theme), Backup nach dropship/theme-backups/,
 * setzt NUR current.logo (+ logo_height), JSON.parse-Validierung vor dem Schreiben. REMOVE=1 = Logo wieder entfernen.
 * Auth: Client-Credentials. No-op ohne Creds.
 * ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET · [LOGO_REF] · [LOGO_HEIGHT=44] · DRY_RUN=1 · REMOVE=1
 */
import fs from 'node:fs';
const SHOP=(process.env.SHOPIFY_SHOP||'').trim(); const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const API='2025-01';
const LOGO=(process.env.LOGO_REF||'shopify://shop_images/luxestyle-ch-logo.png').trim();
const HEIGHT=parseInt(process.env.LOGO_HEIGHT||'44',10)||44;
const DRY=process.env.DRY_RUN==='1'; const REMOVE=process.env.REMOVE==='1';
const FILE='config/settings_data.json'; const BACKUP='dropship/theme-backups/settings_data.json.bak';
if(!SHOP||!CID||!CSEC){ console.log('Kein Shopify-Cred → No-op.'); process.exit(0); }

async function token(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); if(!j.access_token) throw new Error('kein Token'); return j.access_token; }
async function gql(tok,query,variables){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query,variables})}); const j=await r.json(); if(j.errors) throw new Error(JSON.stringify(j.errors)); return j.data; }
const Q_THEME=`query{themes(first:1,roles:[MAIN]){edges{node{id}}}}`;
const Q_FILE=`query($id:ID!){theme(id:$id){files(filenames:["${FILE}"],first:1){edges{node{body{... on OnlineStoreThemeFileBodyText{content}}}}}}}`;
const M_UPSERT=`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){ themeFilesUpsert(themeId:$id,files:$files){ upsertedThemeFiles{filename} userErrors{filename message} } }`;
function splitHeader(raw){ const i=raw.indexOf('{'); return {header:raw.slice(0,i), json:raw.slice(i)}; }

const tok=await token();
const themeId=(await gql(tok,Q_THEME)).themes.edges[0].node.id;
const raw=(await gql(tok,Q_FILE,{id:themeId})).theme.files.edges[0].node.body.content;
const {header,json}=splitHeader(raw);
const data=JSON.parse(json);
data.current=data.current||{};
const before={logo:data.current.logo, logo_height:data.current.logo_height};
if(REMOVE){ delete data.current.logo; console.log('current.logo entfernt (Rollback → Text-Logo).'); }
else { data.current.logo=LOGO; data.current.logo_height=HEIGHT; console.log(`current.logo = ${LOGO} (logo_height=${HEIGHT})`); }
console.log('vorher:', JSON.stringify(before));

const out=header+JSON.stringify(data,null,2);
JSON.parse(out.slice(out.indexOf('{'))); // validate
if(DRY){ console.log('DRY_RUN — nichts geschrieben.'); process.exit(0); }
try{ fs.mkdirSync('dropship/theme-backups',{recursive:true}); if(!REMOVE) fs.writeFileSync(BACKUP, raw); }catch{}
const res=await gql(tok,M_UPSERT,{id:themeId,files:[{filename:FILE,body:{type:'TEXT',value:out}}]});
const errs=res.themeFilesUpsert.userErrors||[];
if(errs.length){ console.error('userErrors:',JSON.stringify(errs)); process.exit(1); }
console.log('✅ settings_data.json aktualisiert (Header-Logo gesetzt).');
