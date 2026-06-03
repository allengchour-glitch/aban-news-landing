#!/usr/bin/env node
/* LuxeStyle — reviews-import.mjs  (echte Bewertungen via Judge.me-API importieren)
 * --------------------------------------------------------------------------------
 * Importiert ECHTE Kundenbewertungen (z.B. von der AliExpress-Quelle desselben
 * Produkts) in Judge.me — kennzeichnet sie als importiert. KEINE erfundenen Reviews:
 * der Inhalt kommt ausschliesslich aus `dropship/reviews_seed.json` (echte Quelle).
 *
 * Voraussetzung im Shop (vom User aktiviert): Judge.me → Einstellungen →
 *   „Review-Einreichungen über Integrationen zulassen (API-Anfragen)" = AN.
 *
 * ENV:
 *   JUDGEME_PRIVATE_TOKEN   Privat-Token (Judge.me → Einstellungen → API/Integrationen)
 *   JUDGEME_SHOP_DOMAIN     z.B. au3j0y-hq.myshopify.com  (default unten)
 *   SEED_FILE               default dropship/reviews_seed.json
 *   DRY_RUN=1               nur zeigen, nichts senden
 *   TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID   (optional: Report)
 *
 * Seed-Schema (dropship/reviews_seed.json) — NUR echte Reviews eintragen:
 *   [{ "product_external_id": 15412915339649,        // Shopify-Produkt-ID (numerisch)
 *      "source": "https://www.aliexpress.com/item/....html",
 *      "reviews": [
 *        { "name":"M. K.", "email":"importiert+1@luxestyle.ch", "rating":5,
 *          "title":"Tolle Qualität", "body":"...echter Review-Text...",
 *          "created_at":"2026-03-01", "picture_urls":["https://..."] }
 *      ] }]
 *
 * No-op-safe: ohne Token/Seed passiert nichts (Exit 0).
 */
import fs from 'node:fs';

const TOKEN = process.env.JUDGEME_PRIVATE_TOKEN || '';
const SHOP_DOMAIN = process.env.JUDGEME_SHOP_DOMAIN || 'au3j0y-hq.myshopify.com';
const SEED_FILE = process.env.SEED_FILE || 'dropship/reviews_seed.json';
const DRY = process.env.DRY_RUN === '1';
const TG_T = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_C = process.env.TELEGRAM_CHAT_ID || '';
const API = 'https://judge.me/api/v1/reviews';

function loadSeed() {
  if (!fs.existsSync(SEED_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(SEED_FILE, 'utf8')); }
  catch (e) { console.error('Seed-Datei nicht lesbar:', e.message); return []; }
}

async function postReview(pid, r) {
  const body = {
    shop_domain: SHOP_DOMAIN,
    platform: 'shopify',
    id: pid,                              // Produkt, an das die Review gehängt wird
    name: r.name || 'Verifizierter Käufer',
    email: r.email || `importiert+${Math.random().toString(36).slice(2, 8)}@luxestyle.ch`,
    rating: Math.max(1, Math.min(5, Number(r.rating) || 5)),
    title: r.title || '',
    body: r.body || '',
    api_token: TOKEN,
  };
  if (r.created_at) body.created_at = r.created_at;
  if (Array.isArray(r.picture_urls) && r.picture_urls.length) body.picture_urls = r.picture_urls;

  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text: text.slice(0, 200) };
}

(async () => {
  const seed = loadSeed();
  if (!TOKEN) { console.log('Kein JUDGEME_PRIVATE_TOKEN → No-op.'); process.exit(0); }
  if (!seed.length) { console.log(`Keine echten Reviews in ${SEED_FILE} → No-op.`); process.exit(0); }

  let sent = 0, failed = 0, products = 0;
  for (const entry of seed) {
    const pid = entry.product_external_id;
    const reviews = Array.isArray(entry.reviews) ? entry.reviews : [];
    if (!pid || !reviews.length) continue;
    products++;
    for (const r of reviews) {
      if (DRY) { console.log(`[DRY] ${pid} ★${r.rating} ${(r.title || '').slice(0, 40)}`); sent++; continue; }
      try {
        const out = await postReview(pid, r);
        if (out.ok) { sent++; console.log(`✓ ${pid} ★${r.rating} ${(r.title || '').slice(0, 40)}`); }
        else { failed++; console.error(`✗ ${pid} HTTP ${out.status}: ${out.text}`); }
      } catch (e) { failed++; console.error(`✗ ${pid} ${e.message}`); }
      await new Promise(s => setTimeout(s, 600)); // sanftes Rate-Limit
    }
  }

  const msg = `⭐ Judge.me-Import: ${sent} echte Reviews ${DRY ? '(DRY)' : 'gesendet'} auf ${products} Produkt(e)`
    + (failed ? ` · ${failed} Fehler` : '');
  console.log(msg);
  if (TG_T && TG_C && !DRY && (sent || failed)) {
    try {
      await fetch(`https://api.telegram.org/bot${TG_T}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_C, text: msg, disable_web_page_preview: true }),
      });
    } catch (e) { /* still */ }
  }
  process.exit(0);
})();
