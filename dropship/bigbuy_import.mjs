#!/usr/bin/env node
/* LuxeStyle — bigbuy_import.mjs  (BigBuy EU → Shopify, Google-Merchant-READY, idempotent)
 *
 * Sucht tolle Produkte aus einer BigBuy-Kategorie und legt sie sauber + feed-ready im Shop an:
 *   - ACTIVE, in ALLE Publications, CHF-Preis (Markup, .90-Ende), barcode=EAN13 (GTIN!)
 *   - productCategory (Shopify-Taxonomie via categorize()), condition=new,
 *     gender/age_group (Mode), custom_product=false (EAN vorhanden → identifier_exists=true)
 *   - Vendor = echter Hersteller, Trust-Block in der Beschreibung.
 * Idempotent: bereits importierte EANs (dropship/bigbuy-imported-eans.txt) werden übersprungen.
 * Bild-Hygiene: nur Produkte mit erreichbarem Bild; Watermark/asiat.-Schrift-Audit separat
 *   (automation/image-audit.mjs, braucht GEMINI_API_KEY) — hier wird ein Sample visuell geprüft.
 *
 * ENV (Pflicht): SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (oder SHOPIFY_TOKEN), BIGBUY_TOKEN
 * ENV (optional): ROOT (Taxonomy, default 19662 Schmuck) · MAX (default 15) · MARKUP (default 1.8)
 *                 MIN_PRICE (default 9) · DRY (1=nur zeigen)
 * Lauf: BIGBUY_TOKEN=… SHOPIFY_CLIENT_ID=… SHOPIFY_CLIENT_SECRET=… ROOT=19662 MAX=15 \
 *       /opt/node22/bin/node dropship/bigbuy_import.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categorize, genderOf, ageOf } from '../automation/feed_polish.mjs';

const ROOT_DIR = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const BB = process.env.BIGBUY_TOKEN || '';
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const API = '2025-01';
const ROOT = process.env.ROOT || '19662';
const MAX = Number(process.env.MAX || 15);
const MARKUP = Number(process.env.MARKUP || 1.8);
const MIN_PRICE = Number(process.env.MIN_PRICE || 9);
const DRY = process.env.DRY === '1';
const LEDGER = path.join(ROOT_DIR, 'dropship', 'bigbuy-imported-eans.txt');
const log = (...a) => console.log(...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const BB_DELAY = Number(process.env.BB_DELAY || 1200); // BigBuy rate-limitet hart → Grund-Pause/Call
// BigBuy-GET mit Backoff bei 429 (Rate-Limit). Wartet & wiederholt bis zu 5×.
const bbGet = async (p) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    await sleep(BB_DELAY);
    const r = await fetch(`https://api.bigbuy.eu/rest${p}`, { headers: { Authorization: `Bearer ${BB}` } });
    if (r.status === 429) { await sleep(3000 * (attempt + 1)); continue; }
    if (!r.ok) throw new Error(`BigBuy ${p} → ${r.status}`);
    return r.json();
  }
  throw new Error(`BigBuy ${p} → 429 (rate limit, aufgegeben)`);
};
async function shToken() {
  if (process.env.SHOPIFY_TOKEN) return process.env.SHOPIFY_TOKEN;
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) });
  return (await r.json()).access_token;
}
async function gql(tok, query, variables) {
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok },
    body: JSON.stringify({ query, variables }) });
  const j = await r.json();
  if (j.errors) throw new Error('GraphQL: ' + JSON.stringify(j.errors).slice(0, 200));
  return j.data;
}
const priceCHF = (eur) => { const p = Math.max(MIN_PRICE, eur * MARKUP); return (Math.max(1, Math.round(p)) - 0.10).toFixed(2); };
const seenEans = () => new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split(/\s+/).filter(Boolean) : []);

const TRUST = '<hr><p><strong>LuxeStyle CH</strong> · Gratis-Versand ab CHF 65 · 30 Tage Rückgabe · TWINT &amp; Karte · –10% mit Code <strong>WELCOME10</strong></p>';

(async () => {
  if (!BB) { log('BIGBUY_TOKEN fehlt → No-op.'); process.exit(1); }
  const tok = await shToken();
  if (!tok) { log('Kein Shopify-Token.'); process.exit(1); }

  // Publications (alle Kanäle) + Manufacturer-Map
  const pubs = (await gql(tok, `{ publications(first:20){ nodes{ id name } } }`)).publications.nodes;
  const mfrs = {}; try { for (const m of await bbGet(`/catalog/manufacturers.json?isoCode=de`)) mfrs[m.id] = m.name; } catch {}

  const list = await bbGet(`/catalog/products.json?parentTaxonomy=${ROOT}&isoCode=de`);
  log(`BigBuy Root ${ROOT}: ${list.length} Produkte · Ziel: ${MAX} neue (Markup ${MARKUP}) ${DRY ? '(DRY)' : ''}`);
  const seen = seenEans();
  let made = 0; const created = [];

  for (const prod of list) {
    if (made >= MAX) break;
    if (!prod.active || !prod.ean13 || !(prod.retailPrice > 0)) continue;
    if (seen.has(prod.ean13)) continue;
    let info, imgs;
    try { info = await bbGet(`/catalog/productinformation/${prod.id}.json?isoCode=de`); } catch { continue; }
    const name = (info?.name || '').trim();
    if (!name || /china|made in/i.test(name)) continue;
    try { imgs = await bbGet(`/catalog/productimages/${prod.id}.json`); } catch { imgs = []; }
    const urls = (imgs || []).map(i => i.url).filter(Boolean).slice(0, 6);
    if (!urls.length) continue;
    // Bild erreichbar?
    try { const h = await fetch(urls[0], { method: 'HEAD' }); if (!h.ok) continue; } catch { continue; }

    const vendor = mfrs[prod.manufacturer] || 'LuxeStyle';
    const desc = (info?.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600);
    const hay = (name + ' ' + desc).toLowerCase();
    const cat = categorize(hay);
    const price = priceCHF(prod.retailPrice);
    const tags = ['bigbuy', cat ? 'kategorisiert' : 'unkat'];
    const g = genderOf(hay); if (g) tags.push(g);

    log(`  • ${name.slice(0, 50)} | ${vendor} | CHF ${price} | EAN ${prod.ean13} | imgs ${urls.length}`);
    if (DRY) { made++; created.push({ name, urls }); continue; }

    // 1) productCreate (ACTIVE) + Kategorie + Bilder
    const cp = await gql(tok, `mutation($in:ProductInput!,$media:[CreateMediaInput!]){
        productCreate(input:$in, media:$media){ product{ id variants(first:1){nodes{id}} } userErrors{ field message } } }`,
      { in: { title: name, descriptionHtml: `<p>${desc}</p>${TRUST}`, vendor, status: 'ACTIVE',
          productType: vendor, tags, ...(cat ? { category: cat } : {}) },
        media: urls.map(u => ({ originalSource: u, mediaContentType: 'IMAGE' })) });
    const pErr = cp.productCreate.userErrors; if (pErr.length) { log('    ⚠️ create:', JSON.stringify(pErr)); continue; }
    const pid = cp.productCreate.product.id;
    const vid = cp.productCreate.product.variants.nodes[0]?.id;

    // 2) Variante: Preis + Barcode (GTIN) + Oversell erlauben
    if (vid) await gql(tok, `mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){
        productVariantsBulkUpdate(productId:$pid, variants:$v){ userErrors{message} } }`,
      { pid, v: [{ id: vid, price, barcode: prod.ean13, inventoryPolicy: 'CONTINUE' }] });

    // 3) Merchant-Metafelder: condition + custom_product=false (EAN da) + gender/age (Mode)
    const mfs = [
      { ownerId: pid, namespace: 'mm-google-shopping', key: 'condition', type: 'single_line_text_field', value: 'new' },
      { ownerId: pid, namespace: 'mm-google-shopping', key: 'custom_product', type: 'single_line_text_field', value: 'false' },
    ];
    if (g) { mfs.push({ ownerId: pid, namespace: 'mm-google-shopping', key: 'gender', type: 'single_line_text_field', value: g });
      mfs.push({ ownerId: pid, namespace: 'mm-google-shopping', key: 'age_group', type: 'single_line_text_field', value: ageOf(hay) }); }
    await gql(tok, `mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ userErrors{message} } }`, { m: mfs });

    // 4) In alle Publications
    await gql(tok, `mutation($id:ID!,$p:[PublicationInput!]!){ publishablePublish(id:$id, input:$p){ userErrors{message} } }`,
      { id: pid, p: pubs.map(p => ({ publicationId: p.id })) });

    fs.appendFileSync(LEDGER, prod.ean13 + '\n');
    made++; created.push({ name, pid, price });
    await sleep(800);
  }
  log(`\n✅ ${made} Produkte ${DRY ? '(dry) ' : ''}angelegt (Root ${ROOT}).`);
  if (!DRY && created.length) created.forEach(c => log(`   ${c.pid} · ${c.name?.slice(0, 45)} · CHF ${c.price}`));
})().catch(e => { log('Fehler:', e.message); process.exit(1); });
