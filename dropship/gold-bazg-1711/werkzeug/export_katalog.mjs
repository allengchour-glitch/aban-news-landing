// NUR LESEN: aktive Produkte (Bulk), alle Seiten und Artikel in Dateien im Scratch schreiben.
import { createWriteStream, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { shopifyGql } from '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/arbeit9/automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/arbeit9/automation/lib/shopify_secret.mjs';
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const schlaf = (ms) => new Promise((r) => setTimeout(r, ms));
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
// Seiten und Artikel
async function seitenweise(feld, knoten) {
  const alle = []; let nach = null;
  for (;;) {
    const d = await q(`query($n:String){ ${feld}(first:100, after:$n){ pageInfo{hasNextPage endCursor} nodes{ ${knoten} } } }`, { n: nach });
    alle.push(...d[feld].nodes); if (!d[feld].pageInfo.hasNextPage) break; nach = d[feld].pageInfo.endCursor; await schlaf(400);
  }
  return alle;
}
const seiten = await seitenweise('pages', 'id handle title body isPublished');
const artikel = await seitenweise('articles', 'id handle title body isPublished blog{handle title}');
writeFileSync('/dev/null', JSON.stringify(seiten)); writeFileSync('/dev/null', JSON.stringify(artikel));
console.log('Seiten', seiten.length, 'Artikel', artikel.length);
// Produkte
for (let i = 0; ; i++) {
  const lauf = (await q(`{currentBulkOperation(type:QUERY){status}}`)).currentBulkOperation;
  if (!lauf || !['CREATED', 'RUNNING', 'CANCELING'].includes(lauf.status)) break;
  if (i >= 32) { console.error('Bulk blockiert'); process.exit(1); }
  await schlaf(15000);
}
const inner = `{ products(query:"status:active") { edges { node { id handle title productType vendor tags description options { name values } } } } }`;
const m = (await q(`mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}`, { q: inner })).bulkOperationRunQuery;
if (m.userErrors?.length) { console.error(JSON.stringify(m.userErrors)); process.exit(1); }
for (let i = 0; i < 120; i++) {
  await schlaf(10000);
  const s = (await q(`{currentBulkOperation(type:QUERY){status errorCode objectCount url}}`)).currentBulkOperation;
  if (s.status === 'COMPLETED') {
    const antwort = await fetch(s.url); const out = createWriteStream('produkte_voll.jsonl'); let n = 0;
    for await (const z of createInterface({ input: Readable.fromWeb(antwort.body), crlfDelay: Infinity })) { if (z.trim()) { out.write(z + '\n'); n++; } }
    await new Promise((r) => out.end(r)); console.log('Produkte', n, 'von', s.objectCount); process.exit(n === Number(s.objectCount) ? 0 : 1);
  }
  if (['FAILED', 'CANCELED', 'EXPIRED'].includes(s.status)) { console.error('Bulk', s.status, s.errorCode); process.exit(1); }
}
console.error('Bulk zu lang'); process.exit(1);
