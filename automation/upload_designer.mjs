#!/usr/bin/env node
/* LuxeStyle — upload_designer.mjs
 * Lädt automation/assets/lspod-designer.js zuverlässig auf die Shopify-Files-CDN hoch (saubere, gepatchte Version).
 * stagedUploadsCreate(FILE,PUT) → PUT bytes → fileCreate(contentType:FILE) → poll READY → gibt CDN-URL aus.
 * Danach greift repoint_designer.mjs (findet die neueste lspod-designer-Datei) und stellt die POD-Produkte darauf um.
 * No-op ohne Creds. ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN).
 */
import { readFileSync } from 'node:fs';
const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const API='2025-01'; const PATH='automation/assets/lspod-designer.js';
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN))return ADMIN_TOKEN; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} console.error('❌ Auth'); process.exit(0); }

const tok=await token();
const bytes=readFileSync(PATH);
// 1) Staged Upload anfordern (FILE, PUT)
const SU=`mutation($input:[StagedUploadInput!]!){ stagedUploadsCreate(input:$input){ stagedTargets{ url resourceUrl parameters{ name value } } userErrors{ field message } } }`;
const su=await gql(tok,SU,{input:[{filename:'lspod-designer.js', mimeType:'text/javascript', resource:'FILE', httpMethod:'PUT'}]});
const ue1=su?.data?.stagedUploadsCreate?.userErrors||[]; if(ue1.length){ console.error('stagedUploadsCreate:',JSON.stringify(ue1)); process.exit(1); }
const t=su?.data?.stagedUploadsCreate?.stagedTargets?.[0]; if(!t?.url){ console.error('kein stagedTarget'); process.exit(1); }
// 2) Bytes hochladen (PUT). Parameter (falls vorhanden) als Header.
const hdr={'Content-Type':'text/javascript'}; (t.parameters||[]).forEach(p=>{ hdr[p.name]=p.value; });
const up=await fetch(t.url,{method:'PUT',headers:hdr,body:bytes});
if(!(up.status>=200&&up.status<300)){ console.error('PUT fehlgeschlagen',up.status, (await up.text().catch(()=>'')).slice(0,200)); process.exit(1); }
console.log('PUT ok', up.status);
// 3) fileCreate
const FC=`mutation($files:[FileCreateInput!]!){ fileCreate(files:$files){ files{ id fileStatus alt } userErrors{ field message } } }`;
const fc=await gql(tok,FC,{files:[{originalSource:t.resourceUrl, contentType:'FILE', alt:'lspod-designer'}]});
const ue2=fc?.data?.fileCreate?.userErrors||[]; if(ue2.length){ console.error('fileCreate:',JSON.stringify(ue2)); process.exit(1); }
const fid=fc?.data?.fileCreate?.files?.[0]?.id; if(!fid){ console.error('keine file id'); process.exit(1); }
console.log('fileCreate id', fid);
// 4) poll bis READY + URL
const NQ=`query($id:ID!){ node(id:$id){ ... on GenericFile{ fileStatus url } } }`;
let url='', st='';
for(let i=0;i<20;i++){ const nr=await gql(tok,NQ,{id:fid}); st=nr?.data?.node?.fileStatus||''; url=nr?.data?.node?.url||''; if(st==='READY'&&url) break; await new Promise(x=>setTimeout(x,1500)); }
console.log('Status', st, '| CDN-URL:', url||'(noch keine)');
if(st!=='READY'||!url){ console.error('Datei nicht READY geworden (später erneut prüfen).'); process.exit(1); }
console.log('✅ Upload fertig. repoint_designer.mjs stellt die POD-Produkte jetzt auf diese neueste Datei um.');
