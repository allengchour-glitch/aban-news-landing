#!/usr/bin/env node
/* bb_auto_order.mjs — «bestell auto» (Dauerauftrag User 2026-07-07): erfüllt bezahlte,
 * unerfüllte Shopify-Bestellungen mit BigBuy-Artikeln automatisch beim Lieferanten.
 * Ablauf je Order: SKU→Referenz → shipping/orders (CH-Carrier+Kosten) → order/check
 * (Stock+Moneybox) → Margen-Check (EK+Versand vs. VK) → order/create → Log.
 * SICHERUNGEN:
 *   - Default = DRY (nur prüfen+berichten). Echte Bestellung NUR mit CONFIRM=1.
 *   - Bestellt nie doppelt: Ledger dropship/BB-ORDERS.md (internalReference LX-<order>).
 *   - Negative Marge → NICHT bestellen (Ausnahme FORCE_MARGIN=1), stattdessen melden.
 *   - ER005 (Moneybox leer) → klare Meldung «User muss Guthaben laden», kein Crash.
 * ENV: SHOPIFY_CLIENT_ID/SECRET · BIGBUY_API_KEY · [CONFIRM=1] · [ONLY=#1007] · [FORCE_MARGIN=1]
 */
import fs from 'node:fs';
const SHOP = 'au3j0y-hq.myshopify.com', API = '2025-01';
const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
const BB = (process.env.BIGBUY_API_KEY || '').trim();
const CONFIRM = process.env.CONFIRM === '1';
const ONLY = (process.env.ONLY || '').trim();
const FORCE_MARGIN = process.env.FORCE_MARGIN === '1';
const LEDGER = 'dropship/BB-ORDERS.md';
const EUR = 0.97;
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
async function toRef(sku) {
  const s = (sku || '').trim();
  let m = s.match(/^(?:bb|BB)-([SV]\d+)$/i); if (m) return m[1].toUpperCase();
  m = s.match(/^CSV-(V\d+)$/i); if (m) return m[1].toUpperCase();
  m = s.match(/^(?:bb|BB)-(\d+)$/);
  if (m) {
    const { status, j } = await bbCall(`https://api.bigbuy.eu/rest/catalog/product/${m[1]}.json`);
    return status === 200 && j?.sku ? String(j.sku).toUpperCase() : null;
  }
  return null;
}

const t = await tok(); if (!t) { console.error('kein Shopify-Token'); process.exit(1); }
const ledger = fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8') : '';

// Bezahlte, unerfüllte Bestellungen holen
const d = await gql(t, `query{ orders(first:20, query:"financial_status:paid fulfillment_status:unfulfilled", sortKey:CREATED_AT, reverse:true){
  edges{ node{ id name createdAt totalPriceSet{shopMoney{amount}}
    shippingAddress{ firstName lastName address1 address2 zip city countryCodeV2 phone }
    email
    lineItems(first:10){ edges{ node{ title quantity sku } } } } } }}`, {});
const orders = (d?.orders?.edges || []).map(e => e.node)
  .filter(o => !ONLY || o.name === ONLY)
  .filter(o => o.lineItems.edges.some(li => /^(bb|BB|CSV)-/i.test(li.node.sku || '')));
console.log(`${orders.length} bezahlte unerfüllte BigBuy-Bestellungen${ONLY ? ` (nur ${ONLY})` : ''}${CONFIRM ? ' [LIVE]' : ' [DRY]'}`);

for (const o of orders) {
  const iref = 'LX-' + o.name.replace('#', '');
  if (ledger.includes(iref)) { console.log(`${o.name}: bereits bestellt (Ledger ${iref}) — skip`); continue; }
  const a = o.shippingAddress;
  if (!a || a.countryCodeV2 !== 'CH') { console.log(`${o.name}: keine CH-Adresse — manuell prüfen`); continue; }
  const items = [];
  let refFail = false;
  for (const li of o.lineItems.edges) {
    const sku = li.node.sku || '';
    if (!/^(bb|BB|CSV)-/i.test(sku)) continue;
    const ref = await toRef(sku);
    if (!ref) { console.log(`${o.name}: Referenz für ${sku} nicht auflösbar`); refFail = true; break; }
    items.push({ reference: ref, quantity: li.node.quantity });
  }
  if (refFail || !items.length) continue;
  // 1) Versandoptionen
  const ship = await bbCall('https://api.bigbuy.eu/rest/shipping/orders.json',
    { order: { delivery: { isoCountry: 'CH', postcode: a.zip }, products: items } });
  await sleep(1500);
  const opt = (ship.j?.shippingOptions || [])[0];
  if (!opt) { console.log(`${o.name}: ❌ kein CH-Versand möglich (${ship.status}) → Refund empfehlen`); continue; }
  const carrier = (opt.shippingService?.name || 'seur').toLowerCase();
  const shipCost = opt.cost;
  // 2) EK-Summe für Marge (productinformation liefert keinen Preis → order/check totalOrder nutzen)
  const body = { order: { internalReference: iref, cashOnDelivery: false, language: 'de', paymentMethod: 'moneybox',
    carriers: [{ name: carrier }], shippingAddress: {
      firstName: a.firstName || 'Kunde', lastName: a.lastName || 'LuxeStyle', country: 'CH', postcode: a.zip,
      town: a.city, address: [a.address1, a.address2].filter(Boolean).join(', '),
      phone: (a.phone || '').replace(/\D/g, '') || '000000000', email: o.email || 'info@luxestyle.ch', comment: '' },
    products: items } };
  const chk = await bbCall('https://api.bigbuy.eu/rest/order/check.json', body);
  await sleep(1500);
  if (chk.status >= 400) {
    const code = chk.j?.code;
    if (code === 'ER003') { console.log(`${o.name}: ❌ AUSVERKAUFT beim Lieferanten → Refund/Warten-Entscheid`); continue; }
    if (code === 'ER005') {
      const need = (() => { try { return JSON.parse(chk.j.message).data.totalOrder; } catch { return '?'; } })();
      console.log(`${o.name}: 💰 MONEYBOX LEER — benötigt ~${need} € (Stock+Versand OK!). User: BigBuy-Guthaben laden.`);
      continue;
    }
    console.log(`${o.name}: ? ${code} ${String(chk.j?.message || '').slice(0, 100)}`);
    continue;
  }
  const total = chk.j?.totalWithoutTaxesAndWithoutShippingCost ?? null;
  const totalOrder = chk.j?.total ?? null;
  const vk = parseFloat(o.totalPriceSet.shopMoney.amount);
  const kostenChf = totalOrder ? totalOrder * EUR : null;
  const marge = kostenChf !== null ? vk - kostenChf : null;
  console.log(`${o.name}: ✅ lieferbar via ${carrier} (Versand ${shipCost} €) · Kosten ~${totalOrder} € ≈ CHF ${kostenChf?.toFixed(2)} · VK CHF ${vk} · Marge ${marge?.toFixed(2)}`);
  if (marge !== null && marge < 0 && !FORCE_MARGIN) { console.log(`   ⚠️ NEGATIVE Marge → NICHT bestellt (FORCE_MARGIN=1 überstimmt)`); continue; }
  if (!CONFIRM) { console.log(`   [DRY] würde jetzt bestellen (CONFIRM=1 für echt)`); continue; }
  // 3) Echte Bestellung
  const crt = await bbCall('https://api.bigbuy.eu/rest/order/create.json', body);
  if (crt.status >= 200 && crt.status < 300 && (crt.j?.order_id || crt.j?.id)) {
    const oid = crt.j.order_id || crt.j.id;
    fs.appendFileSync(LEDGER, `\n- ${new Date().toISOString().slice(0, 16)} ${iref} → BigBuy-Order **${oid}** (${items.map(i => i.reference).join(',')}, ${carrier}, ~${totalOrder} €)`);
    console.log(`   🎉 BESTELLT: BigBuy-Order ${oid}`);
  } else {
    console.log(`   ✗ create fehlgeschlagen: ${crt.status} ${JSON.stringify(crt.j).slice(0, 150)}`);
  }
}
console.log('FERTIG.');
