// Futterautomat «Automatischer Futterspender für Katzen» (Product 15523986473345): Edelstahl-Angabe auf das belegte Mass zurückführen.
// Beleg: CJ-Datenblatt (pid 1418384701726527488): «Material: stainless steel», «Features: automatic feeding», Weiss, 2200 g; Produktbilder: weisses Gehäuse, sichtbare Edelstahlschale.
// Trockenlauf ist Vorgabe. LIVE=1 schreibt (Sicherung vorher), ZURUECK=1 LIVE=1 stellt die Sicherung wieder her.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const hier = path.dirname(fileURLToPath(import.meta.url));
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const ID = 'gid://shopify/Product/15523986473345';
const shop = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const tr = await fetch(`https://${shop}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) });
const tok = (await tr.json()).access_token;
const gql = async (q, v) => { const j = await (await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query: q, variables: v }) })).json(); if (j.errors) throw new Error(JSON.stringify(j.errors)); return j.data; };
const LESEN = `query($id:ID!){product(id:$id){title status descriptionHtml seo{title description} material:metafield(namespace:"mm-google-shopping",key:"material"){id value}}}`;
const SICHERUNG = path.join(hier, 'sicherung.json');
const ALT_ERWARTET = { body: '<p>Dieser automatische Futterspender für Katzen versorgt deine Katze mit Futter, auch wenn du nicht zu Hause bist. Er besteht aus Edelstahl und hat eine automatische Fütterungsfunktion. Im Lieferumfang ist ein Futterautomat enthalten.</p><h3>Automatische Fütterung</h3><ul>\n<li>Automatisches Füttern</li>\n<li>Aus Edelstahl gefertigt</li>' };
const NEU = {
  ersetzungen: [
    ['Er besteht aus Edelstahl und hat eine automatische Fütterungsfunktion.', 'Er hat eine automatische Fütterungsfunktion und eine Futterschale aus Edelstahl.'],
    ['<li>Aus Edelstahl gefertigt</li>', '<li>Futterschale aus Edelstahl</li>'],
  ],
  seoDescription: 'Automatischer Futterspender für Katzen in Weiss mit Fütterungsfunktion und Futterschale aus Edelstahl. Für die Futterausgabe, auch wenn du nicht zu Hause bist.',
  material: 'Edelstahl (Futterschale)',
};
const p = (await gql(LESEN, { id: ID })).product;
console.log('Stand:', p.title, p.status);
if (ZURUECK) {
  const s = JSON.parse(fs.readFileSync(SICHERUNG, 'utf8'));
  console.log(LIVE ? 'ZURÜCK auf Sicherung' : 'Trockenlauf Rücknahme (kein Schreiben)');
  if (LIVE) {
    const m = await gql(`mutation($i:ProductInput!){productUpdate(input:$i){userErrors{field message}}}`, { i: { id: ID, descriptionHtml: s.descriptionHtml, seo: s.seo, metafields: [{ id: s.material.id, value: s.material.value }] } });
    console.log(JSON.stringify(m.productUpdate.userErrors)); process.exit(m.productUpdate.userErrors.length ? 5 : 0);
  }
  process.exit(0);
}
let body = p.descriptionHtml; let ok = true;
for (const [a, b] of NEU.ersetzungen) { const n = body.split(a).length - 1; if (n !== 1) { console.log('ANKER nicht genau einmal:', a, n); ok = false; } body = body.split(a).join(b); }
if (!ok) process.exit(4);
console.log('--- NEUER BODY ---\n' + body + '\n--- SEO ---\n' + NEU.seoDescription + '\nMaterial:', p.material.value, '->', NEU.material);
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }
fs.writeFileSync(SICHERUNG, JSON.stringify({ descriptionHtml: p.descriptionHtml, seo: p.seo, material: p.material }, null, 1));
const m = await gql(`mutation($i:ProductInput!){productUpdate(input:$i){userErrors{field message}}}`, { i: { id: ID, descriptionHtml: body, seo: { title: p.seo.title, description: NEU.seoDescription }, metafields: [{ id: p.material.id, value: NEU.material }] } });
console.log(JSON.stringify(m.productUpdate.userErrors)); if (m.productUpdate.userErrors.length) process.exit(5);
await new Promise(r => setTimeout(r, 4000));
const q = (await gql(LESEN, { id: ID })).product;
const gleich = q.descriptionHtml === body && q.seo.description === NEU.seoDescription && q.material.value === NEU.material && q.seo.title === p.seo.title;
console.log('Rücklesen', gleich ? 'GLEICH' : 'WEICHT AB'); process.exit(gleich ? 0 : 6);
