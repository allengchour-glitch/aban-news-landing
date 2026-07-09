#!/usr/bin/env node
/* brand_price_fix.mjs — Markenware-Preise marktgerecht (User-Fund 2026-07-07: Bosch-Bohrer
 * CHF 266.90 bei UVP ~159!). Die Dropship-Leiter (×1.8–2.3) gilt NICHT für Marken mit
 * transparenten Marktpreisen. Neue Formel je tag:marke-BigBuy-Produkt:
 *   Preis = max( EK_CHF × 1.25 , UVP_CHF × 1.05 ) → auf .90 gerundet; nie ERHÖHEN über alt.
 * (EK/UVP live von BigBuy; EUR→CHF ×0.97. Senkt nur — falls Formel > alt, bleibt alt.)
 * ENV: SHOPIFY_CLIENT_ID/SECRET · BIGBUY_API_KEY · [LIMIT=400] · [DRY=1] · [GAP=1400]
 * Cursor: dropship/_brandprice_pos.txt · Report: dropship/brand_price_report.md
 */
import fs from 'node:fs';
const SHOP = 'au3j0y-hq.myshopify.com', API = '2025-01';
const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
const BB = (process.env.BIGBUY_API_KEY || '').trim();
const LIMIT = parseInt(process.env.LIMIT || '400', 10);
const DRY = process.env.DRY === '1';
const GAP = parseInt(process.env.GAP || '1400', 10);
const POS = process.env.MODE==='parfum' ? 'dropship/_parfumprice_pos.txt' : 'dropship/_brandprice_pos.txt';
const EUR = 0.97;
const REF2ID = fs.existsSync('/tmp/bb_ref2id.json') ? JSON.parse(fs.readFileSync('/tmp/bb_ref2id.json','utf8')) : {};
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function tok() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) });
  return (await r.json()).access_token;
}
async function gql(t, q, v) {
  for (let a = 0; a < 5; a++) {
    try {
      const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': t },
        body: JSON.stringify({ query: q, variables: v }) });
      const j = await r.json();
      if (j.errors && JSON.stringify(j.errors).includes('THROTTLED')) { await sleep(3000); continue; }
      return j.data;
    } catch { await sleep(3000); }
  }
  return null;
}
async function bb(pid) {
  for (let a = 0; a < 5; a++) {
    try {
      const r = await fetch(`https://api.bigbuy.eu/rest/catalog/product/${pid}.json`, { headers: { Authorization: `Bearer ${BB}` } });
      if (r.status === 429) { await sleep(5000 * (a + 1)); continue; }
      const j = await r.json();
      if (j && j.message && /rate limit/i.test(j.message)) { await sleep(5000 * (a + 1)); continue; }
      return j;
    } catch { await sleep(4000); }
  }
  return null;
}
const round90 = x => (Math.ceil(x) - 0.10).toFixed(2);

const t = await tok(); if (!t) { console.error('kein Token'); process.exit(1); }
let pos = fs.existsSync(POS) ? parseInt(fs.readFileSync(POS, 'utf8'), 10) || 0 : 0;
// Alle marke+bigbuy-Produkte einsammeln (IDs stabil sortiert)
const items = [];
let cursor = null;
while (true) {
  const d = await gql(t, `query($c:String){ products(first:100, after:$c, query:"${process.env.MODE==='parfum' ? '(title:*Damenparfüm* OR title:*Herrenparfüm* OR title:*Parfüm* OR title:*Parfum*) status:active' : 'tag:marke tag:bigbuy status:active'}", sortKey:ID){
    pageInfo{hasNextPage endCursor}
    edges{ node{ id title variants(first:1){edges{node{ id sku price }}} } } }}`, { c: cursor });
  const p = d?.products; if (!p) break;
  for (const e of p.edges) items.push(e.node);
  if (!p.pageInfo.hasNextPage) break;
  cursor = p.pageInfo.endCursor;
}
console.log(`${items.length} Marken-Produkte (BigBuy) · Start bei ${pos} · LIMIT ${LIMIT}${DRY ? ' [DRY]' : ''}`);
let done = 0, lowered = 0; const report = [];
for (let i = pos; i < items.length && done < LIMIT; i++) {
  const n = items[i]; done++; fs.writeFileSync(POS, String(i + 1));
  const v = n.variants.edges[0]?.node; if (!v) continue;
  let pid = null;
  const mNum = (v.sku || '').match(/^(?:bb|BB)-(\d+)$/);
  if (mNum) pid = mNum[1];
  else { // S-/V-/CSV-Referenzen über die Katalog-Karte auflösen (2026-07-09)
    const mRef = (v.sku || '').match(/^(?:bb|BB|CSV)-([A-Z]{0,2}\d{4,})/i);
    if (mRef && REF2ID[mRef[1]]) pid = String(REF2ID[mRef[1]]);
  }
  if (!pid) continue;
  const d = await bb(pid); await sleep(GAP);
  if (!d || !d.wholesalePrice) continue;
  const ek = d.wholesalePrice * EUR;
  const uvp = (d.retailPrice || 0) * EUR;
  const target = process.env.MODE==='parfum'
    ? Math.max(ek * 1.30, 9.90)                     // Parfüm: Strassenpreis-Anker, UVP ist Fantasie
    : Math.max(ek * 1.25, uvp > 0 ? uvp * 1.05 : 0);
  if (!target) continue;
  const neu = parseFloat(round90(target));
  const alt = parseFloat(v.price);
  if (neu >= alt) continue; // nur senken (Anheben macht price_guard)
  if (DRY) { console.log(`[DRY] ${alt} → ${neu} | ${n.title.slice(0, 55)}`); lowered++; continue; }
  const r = await gql(t, `mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$pid,variants:$v){userErrors{message}} }`,
    { pid: n.id, v: [{ id: v.id, price: String(neu) }] });
  if ((r?.productVariantsBulkUpdate?.userErrors || []).length) continue;
  lowered++; report.push(`${alt} → ${neu} | ${n.title.slice(0, 60)}`);
  if (lowered % 50 === 0) console.log(`… ${lowered} gesenkt (${done} geprüft)`);
}
if (!DRY && report.length) fs.appendFileSync('dropship/brand_price_report.md',
  `\n## ${new Date().toISOString().slice(0, 16).replace('T', ' ')} — Marken-Preise marktgerecht (${report.length}):\n` + report.slice(0, 300).map(s => '- ' + s).join('\n') + '\n');
console.log(`FERTIG: ${done} geprüft · ${lowered} Preise gesenkt. Pointer: ${fs.readFileSync(POS, 'utf8')}`);
