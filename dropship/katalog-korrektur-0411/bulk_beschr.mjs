// NUR LESEN. Bulk-Abfrage aller aktiven Produkte (Beschreibung + Optionen), Auswertung als Strom; gespeichert werden nur abgeleitete Felder.
// Ausgabe: scan.jsonl (je Produkt: id, handle, title, mat, prosa, opts, feed, tags)
import { createWriteStream } from 'node:fs';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
const OUT = (process.env.ARBEIT || '/tmp/katalog-korrektur-0411/') + 'scan.jsonl';
const schlaf = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const lauf = (await q(`{currentBulkOperation(type:QUERY){status}}`)).currentBulkOperation;
if (lauf && ['CREATED', 'RUNNING'].includes(lauf.status)) { console.error('Es läuft schon eine Bulk-Abfrage: abwarten'); process.exit(1); }
const inner = `{ products(query:"status:active") { edges { node { id handle title tags descriptionHtml options { name values } } } } }`;
const m = (await q(`mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}`, { q: inner })).bulkOperationRunQuery;
if (m.userErrors?.length) { console.error(JSON.stringify(m.userErrors)); process.exit(1); }
console.log('Bulk gestartet', m.bulkOperation.id);
let s;
for (let i = 0; i < 300; i++) {
  await schlaf(10000);
  s = (await q(`{currentBulkOperation(type:QUERY){status errorCode objectCount url}}`)).currentBulkOperation;
  if (i % 6 === 0) console.log('Status', s.status, s.objectCount);
  if (s.status === 'COMPLETED') break;
  if (['FAILED', 'CANCELED', 'EXPIRED'].includes(s.status)) { console.error('Bulk', s.status, s.errorCode); process.exit(1); }
}
if (s.status !== 'COMPLETED') { console.error('zu lange'); process.exit(1); }
const res = await fetch(s.url);
const dec = new TextDecoder();
const aus = createWriteStream(OUT);
let rest = '', n = 0;
const verarbeite = (zeile) => {
  if (!zeile) return;
  const o = JSON.parse(zeile);
  if (!o.handle) return;
  const html = o.descriptionHtml || '';
  const feed = html.includes('ls-feed-details') || html.includes('ls-produktdetails');
  const mm = html.match(/<strong>Material:<\/strong>\s*([^<]*)/);
  const kopf = html.split(/<div class="ls-produktdetails"/)[0];
  const prosa = kopf.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500);
  aus.write(JSON.stringify({ id: o.id, handle: o.handle, title: o.title, mat: mm ? mm[1].trim() : null, prosa, opts: (o.options || []).map((x) => ({ n: x.name, v: x.values })), feed, tags: (o.tags || []).filter((t) => /^(cj-real|fortura|sort-|auswahl|varianten|text-|titel-|lspod|pod)/.test(t)).slice(0, 8) }) + '\n');
  n++;
};
for await (const chunk of res.body) {
  rest += dec.decode(chunk, { stream: true });
  const teile = rest.split('\n'); rest = teile.pop();
  for (const z of teile) verarbeite(z);
}
verarbeite(rest);
aus.end();
await new Promise((ok) => aus.on('finish', ok));
console.log('FERTIG', n, 'Produkte,', 'Bulk-Objekte', s.objectCount);
