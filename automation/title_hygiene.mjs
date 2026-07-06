#!/usr/bin/env node
/* title_hygiene.mjs — katalogweite Titel-Hygiene (Kunde sieht diese Titel!).
 * Entfernt MECHANISCH SICHER: «– Ref. …»-Suffixe, angehängte Lieferanten-SKUs (bb-/BB-/CSV-V/CJ…),
 * Doppel-Leerzeichen, abgebrochene Endungen («… &...»). Nichts wird erfunden.
 * Quelle: Bulk-Export /tmp/products_bulk2.jsonl (id/title). ENV: SHOPIFY_CLIENT_ID/SECRET · [DRY=1]
 * Report: dropship/title_hygiene_report.md · Idempotent (2. Lauf findet nichts mehr).
 */
import fs from 'node:fs';
const SHOP = 'au3j0y-hq.myshopify.com', API = '2025-01';
const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
const DRY = process.env.DRY === '1';
const SRC = process.env.SRC || '/tmp/products_bulk2.jsonl';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function tok() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) });
  return (await r.json()).access_token;
}
async function gql(t, query, variables) {
  for (let a = 0; a < 5; a++) {
    const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': t },
      body: JSON.stringify({ query, variables }) });
    const j = await r.json().catch(() => ({}));
    if (j.errors && JSON.stringify(j.errors).includes('THROTTLED')) { await sleep(3000); continue; }
    return j.data;
  }
  return null;
}

function fix(title) {
  let t = title;
  t = t.replace(/\s*[–—-]?\s*Ref(?![a-zäöü])\.?:?\s*\S.*$/i, '');           // «– Ref. 9000001_4011» — aber nicht «Reflexzonen»!
  t = t.replace(/\s+[({\[]?\s*(bb|BB|CSV)-[A-Za-z0-9_\-]+\s*[)}\]]?\s*$/,''); // angehängte bb-/CSV-SKU
  t = t.replace(/\s+CJ[A-Z]{0,4}\d[\w-]*\s*$/, '');                        // angehängte CJ-Codes
  t = t.replace(/\s{2,}/g, ' ');                                            // Doppel-Leerzeichen
  t = t.replace(/\s*[–—&·,;:\/+-]\s*(\.{3}|…)?\s*$/, '');                   // abgebrochene Endungen
  t = t.trim();
  return t;
}

const prods = fs.readFileSync(SRC, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
  .filter(d => (d.id || '').startsWith('gid://shopify/Product/'));
const work = [];
for (const p of prods) {
  const nt = fix(p.title);
  if (nt !== p.title.trim() && nt.length >= 8) work.push({ id: p.id, old: p.title, neu: nt });
}
console.log(`${work.length} Titel zu bereinigen (von ${prods.length}).`);
const t = await tok(); if (!t) { console.error('kein Token'); process.exit(1); }
let done = 0, errs = 0; const report = [];
for (const w of work) {
  if (DRY) { if (done < 30) console.log(`[DRY] ${w.old.slice(0, 55)} → ${w.neu.slice(0, 55)}`); done++; continue; }
  const r = await gql(t, `mutation($i:ProductInput!){ productUpdate(input:$i){ userErrors{message} } }`,
    { i: { id: w.id, title: w.neu.slice(0, 255) } });
  if ((r?.productUpdate?.userErrors || []).length) { errs++; continue; }
  done++; report.push(`${w.id.split('/').pop()} | ${w.old.slice(0, 50)} → ${w.neu.slice(0, 50)}`);
  if (done % 200 === 0) console.log(`… ${done}/${work.length}`);
  await sleep(430);
}
if (!DRY && report.length) fs.appendFileSync('dropship/title_hygiene_report.md',
  `\n## ${new Date().toISOString().slice(0, 16).replace('T', ' ')} — Titel-Hygiene (${report.length}):\n` + report.slice(0, 400).map(s => '- ' + s).join('\n') + (report.length > 400 ? `\n… +${report.length - 400} weitere` : '') + '\n');
console.log(`FERTIG: ${done} bereinigt · ${errs} Fehler.`);
