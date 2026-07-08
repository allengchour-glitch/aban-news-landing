#!/usr/bin/env node
/* bigbuy_viability_guard.mjs — Lieferbarkeits-Wächter (PRIO 1, gelernt aus Order #1006 + BEKO).
 * Problem: BigBuy-Katalog `active:1` heisst NICHT lieferbar. Wahrheit = 2 Checks:
 *   1) POST /rest/shipping/orders.json {delivery CH} → 404 «No shipping options found»
 *      = in die Schweiz gar nicht versendbar (BEKO-Falle) → DRAFT `nicht-lieferbar-ch`
 *   2) POST /rest/order/check.json (mit Carrier aus Schritt 1) → ER003 «no stock»
 *      = beim Lieferanten ausverkauft (#1006-Falle) → DRAFT `ausverkauft-lieferant`
 * Prüft aktive tag:bigbuy-Produkte, TEUERSTE ZUERST (grösster Schaden zuerst).
 * SKU-Formen: bb-S…/bb-V…/CSV-V… = Referenz direkt; bb-<Zahl> = BigBuy-Produkt-ID →
 * Referenz via catalog/product/{id}.json (gecacht in dropship/_bb_id2ref.json).
 * ENV: SHOPIFY_CLIENT_ID/SECRET · BIGBUY_API_KEY · [LIMIT=500] · [DRY=1] · [GAP=1800]
 *      [MINPRICE=0] · [FORCE=1] (OK-Ledger ignorieren) · [REVIVE=1] (geparkte re-prüfen)
 * Ledger: dropship/_viability_ok.txt · Report: dropship/viability_report.md
 */
import fs from 'node:fs';
const SHOP = 'au3j0y-hq.myshopify.com', API = '2025-01';
const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
const BB = (process.env.BIGBUY_API_KEY || '').trim();
const LIMIT = parseInt(process.env.LIMIT || '500', 10);
const DRY = process.env.DRY === '1';
const GAP = parseInt(process.env.GAP || '1800', 10);
const MINPRICE = parseFloat(process.env.MINPRICE || '0');
const FORCE = process.env.FORCE === '1';
const REVIVE = process.env.REVIVE === '1';
const OK_LEDGER = 'dropship/_viability_ok.txt';
const REPORT = 'dropship/viability_report.md';
const ID2REF = 'dropship/_bb_id2ref.json';
const sleep = ms => new Promise(r => setTimeout(r, ms));

if (!BB || !CID || !CSEC) { console.error('Secrets fehlen (SHOPIFY_CLIENT_ID/SECRET, BIGBUY_API_KEY)'); process.exit(1); }

async function tok() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) });
  return (await r.json()).access_token;
}
async function gql(t, q, v) {
  for (let a = 0; a < 6; a++) {
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
// BigBuy-Fetch mit 429-Backoff; gibt {status, json} zurück
async function bbCall(url, body) {
  for (let a = 0; a < 6; a++) {
    try {
      const r = await fetch(url, body
        ? { method: 'POST', headers: { Authorization: `Bearer ${BB}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        : { headers: { Authorization: `Bearer ${BB}` } });
      if (r.status === 429) { await sleep(8000 * (a + 1)); continue; }
      const j = await r.json().catch(() => ({}));
      if (j && j.message && /rate limit/i.test(String(j.message))) { await sleep(8000 * (a + 1)); continue; }
      return { status: r.status, j };
    } catch { await sleep(5000); }
  }
  return { status: 0, j: {} };
}

// SKU → BigBuy-Bestell-Referenz
const id2ref = fs.existsSync(ID2REF) ? JSON.parse(fs.readFileSync(ID2REF, 'utf8')) : {};
async function toRef(sku) {
  if (!sku) return null;
  const s = sku.trim();
  // BigBuy-Referenzen = 1–2 Buchstaben + Ziffern (S/V/M/D/J/H/R/… — gelernt 2026-07-08)
  let m = s.match(/^(?:bb|BB)-([A-Z]{0,2}\d{4,})(?:-[SML0-9X]+)?$/i); if (m) return m[1].toUpperCase();
  m = s.match(/^CSV-([A-Z]{0,2}\d{4,})$/i); if (m) return m[1].toUpperCase();
  m = s.match(/^([A-Z]{1,2}\d{6,})$/i); if (m) return m[1].toUpperCase();
  m = s.match(/^(?:bb|BB)-(\d+)$/); // Produkt-ID → Katalog-Lookup
  if (m) {
    const id = m[1];
    if (id2ref[id] !== undefined) return id2ref[id];
    const { status, j } = await bbCall(`https://api.bigbuy.eu/rest/catalog/product/${id}.json`);
    const ref = status === 200 && j && j.sku ? String(j.sku).toUpperCase() : null;
    id2ref[id] = ref; fs.writeFileSync(ID2REF, JSON.stringify(id2ref));
    await sleep(900);
    return ref;
  }
  return null;
}

// Check 1: Versandoptionen in die CH? → null=unlieferbar, sonst Carrier-Name
async function shippableCH(ref) {
  const { status, j } = await bbCall('https://api.bigbuy.eu/rest/shipping/orders.json',
    { order: { delivery: { isoCountry: 'CH', postcode: '8001' }, products: [{ reference: ref, quantity: 1 }] } });
  if (status === 404 || /no shipping options/i.test(String(j?.message || ''))) return { carrier: null };
  const opt = (j?.shippingOptions || [])[0];
  if (status === 200 && opt) return { carrier: (opt.shippingService?.name || 'seur').toLowerCase(), cost: opt.cost, delay: opt.shippingService?.delay };
  return { carrier: null, unknown: true, code: status };
}
// Check 2: Lagerbestand via order/check (NUR Check — bestellt NIE)
async function stockOk(ref, carrier) {
  const body = { order: { internalReference: 'viability-dry-check', cashOnDelivery: false, language: 'de', paymentMethod: 'moneybox',
    carriers: [{ name: carrier }], shippingAddress: { firstName: 'Check', lastName: 'Dry', country: 'CH', postcode: '8001',
      town: 'Zuerich', address: 'Bahnhofstrasse 1', phone: '000000000', email: 'info@luxestyle.ch', comment: '' },
    products: [{ reference: ref, quantity: 1 }] } };
  const { status, j } = await bbCall('https://api.bigbuy.eu/rest/order/check.json', body);
  if (status >= 200 && status < 300) return { ok: true };
  // ER005 «not enough money in moneybox» = Stock+Carrier OK, nur Guthaben fehlt → lieferbar
  if (j?.code === 'ER005') return { ok: true };
  return { ok: false, code: j?.code || String(status), msg: String(j?.message || '').slice(0, 120) };
}

const t = await tok(); if (!t) { console.error('kein Shopify-Token'); process.exit(1); }
const okSet = new Set(fs.existsSync(OK_LEDGER) ? fs.readFileSync(OK_LEDGER, 'utf8').split('\n').map(s => s.trim()).filter(Boolean) : []);

const query = REVIVE
  ? '(tag:ausverkauft-lieferant OR tag:nicht-lieferbar-ch) tag:bigbuy status:draft'
  : 'tag:bigbuy status:active';
const items = [];
let cursor = null;
while (true) {
  const d = await gql(t, `query($c:String){ products(first:100, after:$c, query:"${query}"){
    pageInfo{hasNextPage endCursor}
    edges{ node{ id title tags variants(first:1){edges{node{ sku price }}} } } }}`, { c: cursor });
  const p = d?.products; if (!p) break;
  for (const e of p.edges) items.push(e.node);
  if (!p.pageInfo.hasNextPage) break;
  cursor = p.pageInfo.endCursor;
}
const cands = items
  .map(n => ({ n, sku: n.variants.edges[0]?.node.sku || '', price: parseFloat(n.variants.edges[0]?.node.price || '0') }))
  .filter(x => x.price >= MINPRICE)
  .filter(x => FORCE || REVIVE || !okSet.has(x.sku))
  .sort((a, b) => b.price - a.price); // teuerste zuerst
console.log(`${items.length} ${REVIVE ? 'geparkte' : 'aktive'} BigBuy-Produkte · ${cands.length} Kandidaten (≥CHF ${MINPRICE}) · LIMIT ${LIMIT}${DRY ? ' [DRY]' : ''}${REVIVE ? ' [REVIVE]' : ''}`);

let done = 0, drafted = 0, revived = 0, okCount = 0, unresolved = 0; const rep = [];
for (const { n, sku, price } of cands) {
  if (done >= LIMIT) break;
  done++;
  const ref = await toRef(sku);
  if (!ref) { // #1008-Falle: ohne Lieferanten-Ref ist Lieferbarkeit UNPRÜFBAR → nicht verkaufen
    unresolved++;
    if (!DRY && !REVIVE) {
      await gql(t, `mutation($i:ProductInput!){ productUpdate(input:$i){ userErrors{message} } }`,
        { i: { id: n.id, status: 'DRAFT', tags: [...new Set([...n.tags, 'keine-lieferanten-ref'])] } });
      rep.push(`DRAFT NOREF CHF ${price} | ${n.title.slice(0, 60)}`);
    }
    continue;
  }
  const ship = await shippableCH(ref); await sleep(GAP);
  let verdict = null; // {tag, code}
  if (ship.unknown) { console.log(`? ${sku} shipping-code ${ship.code}`); continue; }
  if (!ship.carrier) verdict = { tag: 'nicht-lieferbar-ch', code: 'ER010' };
  else {
    const st = await stockOk(ref, ship.carrier); await sleep(GAP);
    if (st.ok) verdict = null;
    else if (st.code === 'ER003') verdict = { tag: 'ausverkauft-lieferant', code: 'ER003' };
    else { console.log(`? ${sku} ${st.code} ${st.msg}`); continue; } // unbekannt → nicht draften
  }
  if (!verdict) {
    okCount++;
    if (REVIVE) {
      if (DRY) { console.log(`[DRY] REVIVE CHF ${price} | ${sku} | ${n.title.slice(0, 55)}`); revived++; continue; }
      const tags = n.tags.filter(x => x !== 'ausverkauft-lieferant' && x !== 'nicht-lieferbar-ch');
      await gql(t, `mutation($i:ProductInput!){ productUpdate(input:$i){ userErrors{message} } }`,
        { i: { id: n.id, status: 'ACTIVE', tags } });
      revived++; rep.push(`REVIVE ✅ CHF ${price} | ${n.title.slice(0, 60)}`);
    } else fs.appendFileSync(OK_LEDGER, sku + '\n');
    continue;
  }
  if (REVIVE) continue; // bleibt geparkt
  if (DRY) { console.log(`[DRY] DRAFT(${verdict.tag}) CHF ${price} | ${sku} | ${n.title.slice(0, 55)}`); drafted++; continue; }
  const r = await gql(t, `mutation($i:ProductInput!){ productUpdate(input:$i){ userErrors{message} } }`,
    { i: { id: n.id, status: 'DRAFT', tags: [...new Set([...n.tags, verdict.tag])] } });
  if ((r?.productUpdate?.userErrors || []).length) continue;
  drafted++; rep.push(`DRAFT ${verdict.code} CHF ${price} | ${n.title.slice(0, 60)}`);
  if (drafted % 25 === 0) console.log(`… ${drafted} gedraftet (${done} geprüft, ${okCount} ok)`);
}
if (!DRY && rep.length) fs.appendFileSync(REPORT,
  `\n## ${new Date().toISOString().slice(0, 16).replace('T', ' ')} — Viability-Guard (${done} geprüft, ${drafted} DRAFT, ${revived} revived, ${okCount} ok, ${unresolved} ohne Ref):\n` + rep.slice(0, 400).map(s => '- ' + s).join('\n') + '\n');
console.log(`FERTIG: ${done} geprüft · ${okCount} lieferbar · ${drafted} → DRAFT · ${revived} → ACTIVE · ${unresolved} ohne Referenz.`);
