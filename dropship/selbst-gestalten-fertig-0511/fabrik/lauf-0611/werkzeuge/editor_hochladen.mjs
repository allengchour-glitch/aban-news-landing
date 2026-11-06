// L3: Editor v6.2.0 als versionierte Datei ins Shopify-CDN (Files). Legt NUR eine neue Datei an, ändert nichts Bestehendes.
import fs from 'node:fs'; import crypto from 'node:crypto';
const SHOP = process.env.SHOPIFY_SHOP, CID = process.env.SHOPIFY_CLIENT_ID;
const { shopifyClientSecret } = await import('/home/user/aban-news-landing/automation/lib/shopify_secret.mjs');
const CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const DATEI = '/home/user/aban-news-landing/pod/v6/lspod-designer-v6-6.2.0.js';
const NAME = 'lspod-designer-v6-6.2.0.js';
const buf = fs.readFileSync(DATEI);
const sha = crypto.createHash('sha256').update(buf).digest('hex');
console.log('lokal', buf.length, 'Byte, sha256', sha);
const tr = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CID, client_secret: CS, grant_type: 'client_credentials' }) });
const token = (await tr.json()).access_token; if (!token) { console.log('kein Token'); process.exit(1); }
const gql = async (query, variables) => { const r = await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }) }); const j = await r.json(); if (j.errors) throw new Error(JSON.stringify(j.errors)); return j.data; };
// vorhanden?
const v = await gql(`query($q:String!){ files(first:5, query:$q){ nodes{ id ... on GenericFile{ url } } } }`, { q: `filename:${NAME.replace(/\.js$/, '')}` });
if (v.files.nodes.length) { console.log('SCHON VORHANDEN, nichts hochgeladen:', JSON.stringify(v.files.nodes)); process.exit(2); }
const st = await gql(`mutation($i:[StagedUploadInput!]!){ stagedUploadsCreate(input:$i){ stagedTargets{ url resourceUrl parameters{ name value } } userErrors{ field message } } }`, { i: [{ resource: 'FILE', filename: NAME, mimeType: 'application/javascript', httpMethod: 'POST', fileSize: String(buf.length) }] });
const t = st.stagedUploadsCreate.stagedTargets[0]; if (!t || st.stagedUploadsCreate.userErrors.length) { console.log('staged fehlgeschlagen', JSON.stringify(st.stagedUploadsCreate.userErrors)); process.exit(1); }
const form = new FormData(); for (const p of t.parameters) form.append(p.name, p.value); form.append('file', new Blob([buf], { type: 'application/javascript' }), NAME);
const up = await fetch(t.url, { method: 'POST', body: form }); console.log('Staging-Upload', up.status); if (![200, 201, 204].includes(up.status)) { console.log((await up.text()).slice(0, 300)); process.exit(1); }
const cr = await gql(`mutation($f:[FileCreateInput!]!){ fileCreate(files:$f){ files{ id fileStatus } userErrors{ field message code } } }`, { f: [{ originalSource: t.resourceUrl, contentType: 'FILE', filename: NAME, alt: 'Editor Selbst gestalten v6.2.0 (versioniert, 06.11.2026)' }] });
const id = cr.fileCreate.files?.[0]?.id; if (!id || cr.fileCreate.userErrors.length) { console.log('fileCreate fehlgeschlagen', JSON.stringify(cr.fileCreate.userErrors)); process.exit(1); }
console.log('angelegt', id);
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, i === 0 ? 2000 : 3000));
  const d = await gql(`query($id:ID!){ node(id:$id){ ... on GenericFile{ fileStatus url mimeType originalFileSize } } }`, { id });
  const n = d.node; if (n?.fileStatus === 'FAILED') { console.log('FAILED', JSON.stringify(n)); process.exit(1); }
  if (n?.fileStatus === 'READY' && n.url) { console.log('READY', JSON.stringify(n)); 
    const g = await fetch(n.url); const b = Buffer.from(await g.arrayBuffer());
    const sha2 = crypto.createHash('sha256').update(b).digest('hex');
    console.log('abgerufen', g.status, g.headers.get('content-type'), b.length, 'Byte', 'sha256', sha2, sha2 === sha ? 'GLEICH' : 'ABWEICHUNG');
    console.log('URL', n.url); process.exit(sha2 === sha ? 0 : 3); }
}
console.log('Zeitlimit'); process.exit(1);
