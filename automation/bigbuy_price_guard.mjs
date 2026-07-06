#!/usr/bin/env node
/* bigbuy_price_guard.mjs — schützt die Marge gegen BigBuy-Einkaufspreis-Drift.
 * Für importierte BigBuy-Produkte (Ledger dropship/bigbuy_done.txt, Zeilen `bb:<id>`):
 *   aktueller wholesalePrice → Vergleich mit Shopify-Verkaufspreis (Variant-SKU `bb-<sku>`).
 *   Marge unter Staffel-Minimum → Preis wird ANGEHOBEN (nie gesenkt) auf die Staffel-Formel.
 *   Bei BigBuy inaktiv (active!=1) → Meldung in Report (kein Auto-Draft — konservativ).
 * ENV: BIGBUY_API_KEY · SHOPIFY_CLIENT_ID/SECRET · [LIMIT=300] · [DRY=1] · [GAP=1300]
 * Resumierbar: Positions-Pointer dropship/_price_guard_pos.txt (Index im Ledger).
 * Report: dropship/price_guard_report.md (angehängt pro Lauf).
 */
import fs from 'node:fs';
const SHOP = 'au3j0y-hq.myshopify.com', API = '2025-01';
const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
const BB_KEY = (process.env.BIGBUY_API_KEY || '').trim();
const LIMIT = parseInt(process.env.LIMIT || '300', 10);
const DRY = process.env.DRY === '1';
const GAP = parseInt(process.env.GAP || '1300', 10);
const EUR_CHF = 0.97;
const LEDGER = 'dropship/bigbuy_done.txt';
const POS = 'dropship/_price_guard_pos.txt';
const REPORT = 'dropship/price_guard_report.md';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Staffel wie im Importer (chf()) — Soll-Preis + Minimum-Multiplikator (mit 5% Toleranz geprüft)
const mult = c => c > 150 ? 1.65 : c > 80 ? 1.8 : c > 40 ? 1.95 : c > 15 ? 2.1 : 2.3;
const chf = eur => { const c = eur * EUR_CHF; let p = Math.max(4.90, c * mult(c)); return (Math.ceil(p) - 0.1).toFixed(2); };

async function bbGet(path) {
  for (let a = 0; a < 5; a++) {
    const r = await fetch('https://api.bigbuy.eu' + path, { headers: { Authorization: `Bearer ${BB_KEY}` } });
    if (r.status === 429) { await sleep(4000 * (a + 1)); continue; }
    try { const j = await r.json(); if (j && j.message && /rate limit/i.test(j.message)) { await sleep(4000 * (a + 1)); continue; } return j; } catch { return null; }
  }
  return null;
}
async function shTok() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) });
  return (await r.json()).access_token;
}
async function gql(t, query, variables) {
  for (let a = 0; a < 4; a++) {
    const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': t },
      body: JSON.stringify({ query, variables }) });
    const j = await r.json().catch(() => ({}));
    if (j.errors && JSON.stringify(j.errors).includes('THROTTLED')) { await sleep(3000); continue; }
    return j.data;
  }
  return null;
}

if (!BB_KEY || !(CID && CSEC)) { console.log('Keys fehlen → No-op.'); process.exit(0); }
const ids = fs.readFileSync(LEDGER, 'utf8').split('\n').filter(l => l.startsWith('bb:')).map(l => l.slice(3).trim()).filter(Boolean);
let pos = fs.existsSync(POS) ? parseInt(fs.readFileSync(POS, 'utf8'), 10) || 0 : 0;
if (pos >= ids.length) pos = 0; // Rundlauf beendet → von vorn
const t = await shTok();
console.log(`Preis-Wächter: ${ids.length} Ledger-Produkte, starte bei Index ${pos}, LIMIT ${LIMIT}${DRY ? ' [DRY]' : ''}`);

let checked = 0, raised = 0, inactive = 0, notfound = 0;
const inactives = [];
for (let i = pos; i < ids.length && checked < LIMIT; i++) {
  const id = ids[i];
  const d = await bbGet(`/rest/catalog/product/${id}.json?isoCode=de`); await sleep(GAP);
  checked++; fs.writeFileSync(POS, String(i + 1));
  if (!d || typeof d !== 'object') continue;
  const cost = Number(d.wholesalePrice) || 0;
  const sku = d.sku ? 'bb-' + d.sku : null;
  if (d.active !== 1) { inactive++; if (sku) inactives.push(sku); continue; }
  if (!cost || !sku) continue;
  const sd = await gql(t, `query($q:String!){ productVariants(first:1,query:$q){edges{node{id price product{id title status}}}} }`, { q: `sku:${sku}` });
  const v = sd?.productVariants?.edges?.[0]?.node;
  if (!v || v.product.status !== 'ACTIVE') { notfound++; continue; }
  const costChf = cost * EUR_CHF;
  const minOk = costChf * mult(costChf) * 0.95; // 5% Toleranz
  const cur = parseFloat(v.price);
  if (cur >= minOk) continue;
  const neu = chf(cost);
  if (parseFloat(neu) <= cur) continue;
  if (DRY) { console.log(`[DRY] ${sku}: ${cur} → ${neu} (EK ${costChf.toFixed(2)} CHF) | ${v.product.title.slice(0, 40)}`); raised++; continue; }
  const r = await gql(t, `mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$pid,variants:$v){userErrors{message}} }`,
    { pid: v.product.id, v: [{ id: v.id, price: neu }] });
  const errs = r?.productVariantsBulkUpdate?.userErrors || [];
  if (errs.length) { console.log('  ✗', sku, JSON.stringify(errs).slice(0, 60)); continue; }
  raised++; console.log(`💰 ${sku}: ${cur} → ${neu} (EK-Drift, ${v.product.title.slice(0, 40)})`);
}
if (inactives.length) fs.appendFileSync(REPORT, `\n## ${new Date().toISOString().slice(0, 10)} — bei BigBuy INAKTIV (prüfen/draften):\n` + inactives.map(s => '- ' + s).join('\n') + '\n');
console.log(`FERTIG: ${checked} geprüft · ${raised} Preise angehoben · ${inactive} bei BigBuy inaktiv · ${notfound} nicht im Shop gefunden. Pointer: ${fs.readFileSync(POS, 'utf8')}`);
