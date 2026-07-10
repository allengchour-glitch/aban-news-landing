#!/usr/bin/env node
/* LuxeStyle — ebay_listing_pipeline.mjs  (BigBuy-Produkte als ECHTE eBay-Angebote listen)
 *
 * Listet kuratierte BigBuy-Produkte über die offizielle eBay Sell/Inventory-API als
 * Festpreis-Angebote (eBay.de, EUR). Dropshipping von einem GROSSHÄNDLER (BigBuy) ist
 * laut eBay-Richtlinie erlaubt (verboten ist nur Dropshipping von Einzelhändlern).
 *
 * ── EINMALIGES SETUP (nur der User kann das, siehe dropship/EBAY-VERKAUF-SETUP.md):
 *    1. eBay-Verkäuferkonto + developer.ebay.com-Keyset (Production, Sell-Scopes)
 *    2. OAuth-User-Consent → Refresh-Token
 *    3. Business Policies (Zahlung/Versand/Rückgabe) im Verkäuferkonto anlegen
 *    → Secrets: EBAY_SELL_CLIENT_ID, EBAY_SELL_CLIENT_SECRET, EBAY_SELL_REFRESH_TOKEN,
 *      EBAY_FULFILLMENT_POLICY_ID, EBAY_PAYMENT_POLICY_ID, EBAY_RETURN_POLICY_ID,
 *      EBAY_MERCHANT_LOCATION_KEY
 *
 * Quelle: dropship/ebay_listings.json (kuratierte Produkte mit BigBuy-Snapshot).
 * Preisformel: (EK_EUR + VERSAND_EUR) * MARGE, dann +GEBÜHR-Aufschlag, auf .90 gerundet.
 * DRY_RUN ist DEFAULT (zeigt nur, was gelistet würde). LIVE=1 zum echten Listen.
 * No-op ohne Creds. Idempotent über SKU (bb-…). KEINE Secrets im Repo.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const SRC = path.join(ROOT, 'dropship', 'ebay_listings.json');

const CID = (process.env.EBAY_SELL_CLIENT_ID || '').trim();
const CSEC = (process.env.EBAY_SELL_CLIENT_SECRET || '').trim();
const RTOK = (process.env.EBAY_SELL_REFRESH_TOKEN || '').trim();
const POL_FULFIL = (process.env.EBAY_FULFILLMENT_POLICY_ID || '').trim();
const POL_PAY = (process.env.EBAY_PAYMENT_POLICY_ID || '').trim();
const POL_RETURN = (process.env.EBAY_RETURN_POLICY_ID || '').trim();
const LOCATION = (process.env.EBAY_MERCHANT_LOCATION_KEY || '').trim();
const DRY = process.env.LIVE !== '1';
const MARGIN = parseFloat(process.env.MARGIN || '1.55') || 1.55;   // auf (EK+Versand)
const FEE = parseFloat(process.env.EBAY_FEE || '0.15') || 0.15;    // ~13.5% Provision + Puffer
const SHIP_EUR = parseFloat(process.env.SHIP_EUR || '6') || 6;     // konservativer BigBuy-Versand-Puffer/Stück
const MARKETPLACE = process.env.EBAY_MARKETPLACE_SELL || 'EBAY_DE';

function priceEur(ekEur) {
  const base = (ekEur + SHIP_EUR) * MARGIN;      // Kosten + Marge
  const withFee = base / (1 - FEE);              // eBay-Gebühr einpreisen
  return Math.max(9.90, Math.floor(withFee) + 0.90);
}

if (!fs.existsSync(SRC)) { console.log(`Keine ${SRC} → nichts zu listen.`); process.exit(0); }
const items = JSON.parse(fs.readFileSync(SRC, 'utf8'));

console.log(`eBay-Listing-Pipeline [${MARKETPLACE}] ${DRY ? '[DRY — nichts wird gelistet; LIVE=1 zum Listen]' : '[LIVE]'}`);
for (const it of items) {
  const p = priceEur(it.ekEur);
  console.log(`  ${DRY ? '[DRY] würde listen' : 'liste'}: ${it.title.slice(0, 60)} → EUR ${p.toFixed(2)} (EK ${it.ekEur} + Versand ~${SHIP_EUR})`);
}

if (DRY) process.exit(0);
if (!CID || !CSEC || !RTOK || !POL_FULFIL || !POL_PAY || !POL_RETURN || !LOCATION) {
  console.log('LIVE angefragt, aber eBay-Sell-Creds/Policies fehlen → Abbruch (siehe dropship/EBAY-VERKAUF-SETUP.md).');
  process.exit(0);
}

const API = 'https://api.ebay.com';
async function accessToken() {
  const r = await fetch(`${API.replace('api.', 'api.')}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${CID}:${CSEC}`).toString('base64') },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: RTOK,
      scope: 'https://api.ebay.com/oauth/api_scope/sell.inventory' }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('OAuth fehlgeschlagen: ' + JSON.stringify(d).slice(0, 200));
  return d.access_token;
}
async function call(tok, method, pathname, body) {
  const r = await fetch(`${API}${pathname}`, {
    method,
    headers: { 'Authorization': `Bearer ${tok}`, 'Content-Type': 'application/json',
      'Content-Language': 'de-DE', 'Accept-Language': 'de-DE' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  return { status: r.status, body: text ? JSON.parse(text) : {} };
}

const tok = await accessToken();
for (const it of items) {
  const sku = it.sku;
  const p = priceEur(it.ekEur).toFixed(2);
  // 1) Inventory-Item (idempotent per SKU)
  const inv = await call(tok, 'PUT', `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
    availability: { shipToLocationAvailability: { quantity: it.quantity || 3 } },
    condition: 'NEW',
    product: { title: it.title.slice(0, 80), description: it.descriptionHtml,
      imageUrls: it.images.slice(0, 12), brand: it.brand || undefined, mpn: it.mpn || undefined },
  });
  if (inv.status >= 300) { console.log(`  ✗ ${sku} inventory: ${inv.status} ${JSON.stringify(inv.body).slice(0, 200)}`); continue; }
  // 2) Offer anlegen (oder vorhandenes via sku+marketplace wiederverwenden)
  const offers = await call(tok, 'GET', `/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}&marketplace_id=${MARKETPLACE}`);
  let offerId = offers.body?.offers?.[0]?.offerId;
  const offerBody = {
    sku, marketplaceId: MARKETPLACE, format: 'FIXED_PRICE',
    availableQuantity: it.quantity || 3, categoryId: it.ebayCategoryId,
    listingDescription: it.descriptionHtml,
    listingPolicies: { fulfillmentPolicyId: POL_FULFIL, paymentPolicyId: POL_PAY, returnPolicyId: POL_RETURN },
    pricingSummary: { price: { value: p, currency: 'EUR' } },
    merchantLocationKey: LOCATION,
  };
  if (!offerId) {
    const off = await call(tok, 'POST', '/sell/inventory/v1/offer', offerBody);
    offerId = off.body?.offerId;
    if (!offerId) { console.log(`  ✗ ${sku} offer: ${off.status} ${JSON.stringify(off.body).slice(0, 200)}`); continue; }
  } else {
    await call(tok, 'PUT', `/sell/inventory/v1/offer/${offerId}`, offerBody);
  }
  // 3) Publizieren
  const pub = await call(tok, 'POST', `/sell/inventory/v1/offer/${offerId}/publish`, {});
  if (pub.status < 300 && pub.body.listingId) {
    console.log(`  ✓ ${sku} LIVE auf eBay: listingId ${pub.body.listingId} → EUR ${p}`);
  } else {
    console.log(`  ✗ ${sku} publish: ${pub.status} ${JSON.stringify(pub.body).slice(0, 300)}`);
  }
}
console.log('Fertig. WICHTIG: Bei Verkauf → BigBuy-Bestellung an Käuferadresse auslösen (Fulfillment, siehe Doku).');
