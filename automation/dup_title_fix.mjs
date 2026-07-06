#!/usr/bin/env node
/* dup_title_fix.mjs v2 — entdoppelt gleichnamige Aktiv-Produkte.
 * Der Lieferant (v. a. CJ) listet denselben Artikel oft unter mehreren IDs → im Shop
 * erscheinen scheinbare Duplikate. Regeln pro Titel-Gruppe (variantenreichstes Produkt behält den Titel):
 *   1. GLEICHES Hauptbild wie ein behaltenes Produkt → echtes Duplikat → Status DRAFT
 *      + Tag `duplikat-auto-draft` (rückholbar, nichts gelöscht).
 *   2. Anderes Bild + eindeutige Einzel-Farbe → Titel-Zusatz « · <Farbe>».
 *   3. Anderes Bild, keine Farbe → Titel-Zusatz « · Modell 2/3/…» (ehrlich, unterscheidbar).
 * Input: /tmp/products_bulk.jsonl (Bulk-Export id/title/options). ENV: SHOPIFY_CLIENT_ID/SECRET · [DRY=1]
 * Report: dropship/dup_title_report.md
 */
import fs from 'node:fs';
const SHOP = 'au3j0y-hq.myshopify.com', API = '2025-01';
const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
const DRY = process.env.DRY === '1';
const SRC = process.env.SRC || '/tmp/products_bulk.jsonl';
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
// Bild-Kern: Dateiname ohne Query/Version — Shopify hängt an dieselbe CDN-Datei ?v= an.
const imgKey = u => (u || '').split('?')[0].split('/').pop().replace(/_[0-9a-f]{8,}(?=\.)/, '');

const prods = fs.readFileSync(SRC, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
  .filter(d => (d.id || '').startsWith('gid://shopify/Product/'));
const norm = t => t.trim().toLowerCase().replace(/\s+/g, ' ');
const groups = new Map();
for (const p of prods) { const k = norm(p.title); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); }
const dups = [...groups.values()].filter(g => g.length > 1);
console.log(`${dups.length} Duplikat-Gruppen (${dups.reduce((s, g) => s + g.length, 0)} Produkte).`);

const t = await tok();
if (!t) { console.error('Kein Token.'); process.exit(1); }

// Live-Details in 50er-Batches
const allIds = dups.flat().map(p => p.id);
const detail = new Map();
for (let i = 0; i < allIds.length; i += 50) {
  const d = await gql(t, `query($ids:[ID!]!){ nodes(ids:$ids){ ... on Product { id title status createdAt
    featuredMedia{ preview{ image{ url } } }
    options{ name values } } } }`, { ids: allIds.slice(i, i + 50) });
  for (const n of d?.nodes || []) if (n) detail.set(n.id, n);
  await sleep(600);
}
console.log(`${detail.size} Detail-Datensätze geladen.`);

let drafted = 0, colored = 0, modeled = 0, errs = 0;
const report = [];
for (const g of dups) {
  const ds = g.map(p => detail.get(p.id)).filter(Boolean).filter(d => d.status === 'ACTIVE');
  if (ds.length < 2) continue;
  const richness = d => (d.options || []).reduce((s, o) => s + (o.values || []).length, 0);
  ds.sort((a, b) => richness(b) - richness(a) || a.createdAt.localeCompare(b.createdAt));
  const keeper = ds[0];
  const keptImgs = new Set([imgKey(keeper.featuredMedia?.preview?.image?.url)]);
  const usedTitles = new Set([norm(keeper.title)]);
  let modelN = 1;
  // Produkte ohne echte Auswahl (nur Titel/Standard) — z. B. Parfüm 30 ml, Funko-Figur:
  // gleicher Titel = derselbe Artikel, auch wenn die Bilddatei anders heisst.
  const noRealOpts = d => !(d.options || []).some(o => !/^(titel|title)$/i.test(o.name) && (o.values || []).filter(v => !/^(default|standard)$/i.test(v)).length > 0);
  for (const d of ds.slice(1)) {
    const ik = imgKey(d.featuredMedia?.preview?.image?.url);
    if ((ik && keptImgs.has(ik)) || (noRealOpts(d) && noRealOpts(keeper))) {
      // echtes Duplikat → DRAFT
      if (DRY) { console.log(`[DRY][DRAFT] ${d.title.slice(0, 55)}`); drafted++; continue; }
      const r = await gql(t, `mutation($i:ProductInput!){ productUpdate(input:$i){ userErrors{message} } }`,
        { i: { id: d.id, status: 'DRAFT', tags: ['duplikat-auto-draft'] } });
      if ((r?.productUpdate?.userErrors || []).length) { errs++; continue; }
      report.push(`DRAFT (Bild identisch mit Keeper): ${d.id.split('/').pop()} | ${d.title.slice(0, 60)}`);
      drafted++; await sleep(450); continue;
    }
    keptImgs.add(ik);
    const copt = (d.options || []).find(o => /^(farbe|color)$/i.test(o.name));
    const c = copt && copt.values.length === 1 && !/^(default|standard|title)$/i.test(copt.values[0]) ? copt.values[0] : null;
    modelN++;
    let nt = c ? `${d.title.trim()} · ${c}` : `${d.title.trim()} · Modell ${modelN}`;
    if (usedTitles.has(norm(nt))) nt = `${d.title.trim()} · Modell ${modelN}`;
    if (usedTitles.has(norm(nt))) { report.push(`UNGELÖST: ${d.id.split('/').pop()} | ${d.title.slice(0, 60)}`); continue; }
    usedTitles.add(norm(nt));
    if (DRY) { console.log(`[DRY][TITEL] ${d.title.slice(0, 40)} → ${nt.slice(0, 60)}`); c ? colored++ : modeled++; continue; }
    const r = await gql(t, `mutation($i:ProductInput!){ productUpdate(input:$i){ userErrors{message} } }`,
      { i: { id: d.id, title: nt.slice(0, 255) } });
    if ((r?.productUpdate?.userErrors || []).length) { errs++; continue; }
    report.push(`TITEL: ${d.id.split('/').pop()} | ${d.title.slice(0, 50)} → ${nt.slice(0, 60)}`);
    c ? colored++ : modeled++; await sleep(450);
  }
}
if (!DRY && report.length) fs.appendFileSync('dropship/dup_title_report.md',
  `\n## ${new Date().toISOString().slice(0, 16).replace('T', ' ')} — Entdoppelung (${report.length} Aktionen):\n` + report.map(s => '- ' + s).join('\n') + '\n');
console.log(`FERTIG: ${drafted} als Duplikat gedraftet · ${colored} per Farbe differenziert · ${modeled} per Modell-Nr. · ${errs} Fehler.`);
