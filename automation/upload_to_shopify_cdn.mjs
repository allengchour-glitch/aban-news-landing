#!/usr/bin/env node
/* LuxeStyle — upload_to_shopify_cdn.mjs
 *
 * Lädt eine lokale Datei (Reel/Bild) in die Shopify-Files-CDN und gibt die ÖFFENTLICHE
 * https://cdn.shopify.com/...-URL aus. Das löst das Reel-Hosting-Problem: Meta/TikTok
 * ziehen Videos per öffentlicher URL — der private GitHub-Repo + abannews.com/reels (404)
 * taugten nicht. Shopify-CDN-URLs sind öffentlich, range-fähig (HTTP 206) und stabil.
 *
 * Ablauf (Shopify Admin GraphQL): stagedUploadsCreate → PUT/POST der Bytes an GCS →
 * fileCreate(contentType:FILE) → node(id) pollen bis fileStatus=READY → url ausgeben.
 *
 * Auth (identisch zu reel-analytics.mjs): SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET
 * (Client-Credentials-Grant, ~24h gültig) ODER direkter SHOPIFY_ADMIN_TOKEN.
 *
 * Nutzung:
 *   SHOPIFY_SHOP=au3j0y-hq.myshopify.com SHOPIFY_CLIENT_ID=... SHOPIFY_CLIENT_SECRET=... \
 *   node automation/upload_to_shopify_cdn.mjs reels/auto-XYZ.mp4 [alt-text]
 *
 * stdout = nur die öffentliche URL (für Pipeline-Verkettung). Logs gehen nach stderr.
 * Exit 0 + URL bei Erfolg, Exit 1 ohne URL.
 */
import fs from 'node:fs';
import path from 'node:path';

const SHOP = process.env.SHOPIFY_SHOP || '';
const CID = process.env.SHOPIFY_CLIENT_ID || '';
const CSECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
const TOK_STATIC = process.env.SHOPIFY_ADMIN_TOKEN || '';
const API = process.env.SHOPIFY_API_VERSION || '2025-01';

const file = process.argv[2];
const alt = process.argv[3] || path.basename(file || '');
if (!file) { console.error('Nutzung: node upload_to_shopify_cdn.mjs <datei> [alt]'); process.exit(1); }
if (!fs.existsSync(file)) { console.error('Datei nicht gefunden:', file); process.exit(1); }
if (!SHOP) { console.error('SHOPIFY_SHOP fehlt → No-op.'); process.exit(1); }

const MIME = { '.mp4':'video/mp4', '.mov':'video/quicktime', '.webm':'video/webm',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.webp':'image/webp' };
const ext = path.extname(file).toLowerCase();
const mimeType = MIME[ext] || 'application/octet-stream';
const fileSize = String(fs.statSync(file).size);
const filename = path.basename(file).replace(/[^a-zA-Z0-9._-]/g, '-');

async function getToken(){
  if (!(CID && CSECRET) && TOK_STATIC) return TOK_STATIC;
  if (SHOP && CID && CSECRET){
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ client_id:CID, client_secret:CSECRET, grant_type:'client_credentials' }) });
    const j = await r.json().catch(()=>({})); return j.access_token || '';
  }
  return '';
}
async function gql(token, query, variables){
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method:'POST',
    headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},
    body: JSON.stringify({ query, variables }) });
  const j = await r.json().catch(()=>({}));
  if (j.errors) throw new Error('GraphQL: ' + JSON.stringify(j.errors));
  return j.data;
}

(async () => {
  const token = await getToken();
  if (!token) { console.error('Kein gültiger Admin-Token (Client-Credentials/Token fehlen).'); process.exit(1); }

  // 1) Staged Target anfordern
  const staged = await gql(token,
    `mutation($input:[StagedUploadInput!]!){ stagedUploadsCreate(input:$input){
       stagedTargets{ url resourceUrl parameters{ name value } } userErrors{ field message } } }`,
    { input: [{ resource:'FILE', filename, mimeType, httpMethod:'POST', fileSize }] });
  const t = staged?.stagedUploadsCreate?.stagedTargets?.[0];
  const errs = staged?.stagedUploadsCreate?.userErrors || [];
  if (!t || errs.length) { console.error('stagedUploadsCreate fehlgeschlagen:', JSON.stringify(errs)); process.exit(1); }

  // 2) Bytes an GCS posten (multipart; Parameter VOR der Datei)
  const form = new FormData();
  for (const p of t.parameters) form.append(p.name, p.value);
  const buf = fs.readFileSync(file);
  form.append('file', new Blob([buf], { type: mimeType }), filename);
  const up = await fetch(t.url, { method:'POST', body: form });
  if (up.status !== 201 && up.status !== 200) {
    console.error('Upload an Staging fehlgeschlagen:', up.status, (await up.text()).slice(0,300)); process.exit(1);
  }
  console.error('Bytes hochgeladen (', up.status, ').');

  // 3) Datei in Shopify registrieren
  const created = await gql(token,
    `mutation($files:[FileCreateInput!]!){ fileCreate(files:$files){
       files{ ... on GenericFile{ id fileStatus } } userErrors{ field message } } }`,
    { files: [{ originalSource: t.resourceUrl, contentType:'FILE', alt }] });
  const cErrs = created?.fileCreate?.userErrors || [];
  const id = created?.fileCreate?.files?.[0]?.id;
  if (!id || cErrs.length) { console.error('fileCreate fehlgeschlagen:', JSON.stringify(cErrs)); process.exit(1); }

  // 4) Pollen bis READY → öffentliche URL
  for (let i=0;i<30;i++){
    await new Promise(r=>setTimeout(r, i===0?2000:3000));
    const d = await gql(token, `query($id:ID!){ node(id:$id){ ... on GenericFile{ fileStatus url } } }`, { id });
    const n = d?.node;
    if (n?.fileStatus === 'READY' && n.url) { console.error('READY.'); console.log(n.url); process.exit(0); }
    if (n?.fileStatus === 'FAILED') { console.error('Verarbeitung FAILED.'); process.exit(1); }
  }
  console.error('Timeout beim Warten auf READY.'); process.exit(1);
})().catch(e => { console.error('Fehler:', e.message); process.exit(1); });
