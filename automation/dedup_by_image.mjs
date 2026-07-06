#!/usr/bin/env node
/* dedup_by_image.mjs — katalogweite Entdoppelung über das Hauptbild (gleiche Foto-Datei =
 * derselbe Artikel, egal wie der Titel lautet). Ursache: mehrere Sessions/Importer haben
 * dieselben Lieferanten-Artikel mit unterschiedlich generierten Titeln angelegt.
 * Regeln pro Bild-Gruppe (sortiert nach createdAt, das ÄLTESTE bleibt unverändert):
 *   - CJ-Produkte (SKU enthält CJ): Rest → DRAFT + Tag duplikat-auto-draft (rückholbar).
 *   - BigBuy (SKU CSV-/bb-/BB-): Rest nur bei GLEICHEM Preis → DRAFT; verschiedene Preise
 *     = vermutlich Grössen/Versionen → behalten, nur «– Ref. XXX» aus dem Titel entfernen.
 *   - Titel-Hygiene überall: sichtbare Lieferanten-Refs («– Ref. V3401718») abschneiden.
 * Input: /tmp/img_dups.json (aus Bulk-Analyse). ENV: SHOPIFY_CLIENT_ID/SECRET · [DRY=1]
 * Report: dropship/dup_image_report.md
 */
import fs from 'node:fs';
const SHOP = 'au3j0y-hq.myshopify.com', API = '2025-01';
const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
const DRY = process.env.DRY === '1';
const SRC = process.env.SRC || '/tmp/img_dups.json';
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
const stripRef = t => t.replace(/\s*[–—-]?\s*Ref\.?:?\s*[A-Z0-9][\w-]*\s*$/i, '').trim();

const groups = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const t = await tok(); if (!t) { console.error('kein Token'); process.exit(1); }
let drafted = 0, renamed = 0, kept = 0, errs = 0;
const report = [];
async function update(id, input) {
  const r = await gql(t, `mutation($i:ProductInput!){ productUpdate(input:$i){ userErrors{message} } }`, { i: { id, ...input } });
  const e = r?.productUpdate?.userErrors || [];
  if (e.length) { errs++; return false; }
  await sleep(420); return true;
}
for (const [key, list] of Object.entries(groups)) {
  list.sort((a, b) => (a.created || '').localeCompare(b.created || ''));
  const keeper = list[0]; kept++;
  // Titel-Hygiene beim Keeper
  if (/Ref\.?:?\s*[A-Z0-9]/i.test(keeper.title)) {
    const nt = stripRef(keeper.title);
    if (nt && nt !== keeper.title) {
      if (DRY) console.log(`[DRY][REF] ${keeper.title.slice(0, 50)} → ${nt.slice(0, 50)}`);
      else if (await update(keeper.id, { title: nt.slice(0, 255) })) { renamed++; report.push(`REF-CLEAN: ${keeper.id.split('/').pop()} | ${nt.slice(0, 60)}`); }
    }
  }
  const isCJ = s => /(^|-)CJ/i.test(s || '');
  for (const p of list.slice(1)) {
    const samePrice = parseFloat(p.price) === parseFloat(keeper.price);
    const bigbuy = !isCJ(p.sku) && !isCJ(keeper.sku);
    if (bigbuy && !samePrice) {
      // vermutlich Grössen-/Versions-Staffel → behalten, nur Ref aus Titel
      const nt = stripRef(p.title);
      if (nt && nt !== p.title) {
        if (DRY) { console.log(`[DRY][REF] ${p.title.slice(0, 50)} → ${nt.slice(0, 50)}`); renamed++; }
        else if (await update(p.id, { title: nt.slice(0, 255) })) { renamed++; report.push(`REF-CLEAN: ${p.id.split('/').pop()} | ${nt.slice(0, 60)}`); }
      }
      continue;
    }
    if (DRY) { console.log(`[DRY][DRAFT] ${p.title.slice(0, 55)} (Bild wie: ${keeper.title.slice(0, 35)})`); drafted++; continue; }
    if (await update(p.id, { status: 'DRAFT', tags: ['duplikat-auto-draft'] })) {
      drafted++; report.push(`DRAFT: ${p.id.split('/').pop()} | ${p.title.slice(0, 60)} (= ${keeper.title.slice(0, 40)})`);
      if (drafted % 100 === 0) console.log(`… ${drafted} gedraftet`);
    }
  }
}
if (!DRY && report.length) fs.appendFileSync('dropship/dup_image_report.md',
  `\n## ${new Date().toISOString().slice(0, 16).replace('T', ' ')} — Bild-Entdoppelung (${report.length} Aktionen):\n` + report.map(s => '- ' + s).join('\n') + '\n');
console.log(`FERTIG: ${kept} Gruppen · ${drafted} Duplikate → DRAFT · ${renamed} Titel bereinigt · ${errs} Fehler.`);
