// node datei_hoch.mjs <pfad> <zielname> <mime> <VIDEO|IMAGE> [alt]
// Lädt eine Datei in die Shopify-Dateien (stagedUploadsCreate → POST → fileCreate) und wartet auf READY.
import { readFileSync, statSync } from 'node:fs';
import { shopifyGql } from '/home/user/aban-news-landing/automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '/home/user/aban-news-landing/automation/lib/shopify_secret.mjs';
const [pfad, name, mime, art, alt = ''] = process.argv.slice(2);
const SHOP = process.env.SHOPIFY_SHOP;
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET), grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token;
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const gr = statSync(pfad).size;
const st = await q(`mutation($i:[StagedUploadInput!]!){ stagedUploadsCreate(input:$i){ stagedTargets{ url resourceUrl parameters{ name value } } userErrors{ field message } } }`,
  { i: [{ filename: name, mimeType: mime, resource: art === 'VIDEO' ? 'VIDEO' : 'IMAGE', fileSize: String(gr), httpMethod: 'POST' }] });
const e1 = st.stagedUploadsCreate.userErrors; if (e1?.length) { console.log('stagedUploadsCreate Fehler', JSON.stringify(e1)); process.exit(2); }
const ziel = st.stagedUploadsCreate.stagedTargets[0];
const fd = new FormData();
for (const p of ziel.parameters) fd.append(p.name, p.value);
fd.append('file', new Blob([readFileSync(pfad)], { type: mime }), name);
const up = await fetch(ziel.url, { method: 'POST', body: fd });
console.log('Upload HTTP', up.status, gr, 'Bytes');
if (!up.ok) { console.log((await up.text()).slice(0, 400)); process.exit(3); }
const fc = await q(`mutation($f:[FileCreateInput!]!){ fileCreate(files:$f){ files{ id fileStatus alt } userErrors{ field message code } } }`,
  { f: [{ originalSource: ziel.resourceUrl, contentType: art === 'VIDEO' ? 'VIDEO' : 'IMAGE', alt, filename: name }] });
const e2 = fc.fileCreate.userErrors; if (e2?.length) { console.log('fileCreate Fehler', JSON.stringify(e2)); process.exit(4); }
const id = fc.fileCreate.files[0].id; console.log('angelegt', id);
for (let i = 0; i < 60; i++) {
  await new Promise(s => setTimeout(s, 5000));
  const n = await q(`query($id:ID!){ node(id:$id){ ... on Video{ fileStatus fileErrors{ code message } sources{ url width height format } preview{ image{ url } } } ... on MediaImage{ fileStatus fileErrors{ code message } image{ url } } } }`, { id });
  const f = n.node; console.log(i, f?.fileStatus);
  if (f?.fileStatus === 'READY') { console.log(JSON.stringify(f)); break; }
  if (f?.fileStatus === 'FAILED') { console.log('FAILED', JSON.stringify(f)); process.exit(5); }
}
