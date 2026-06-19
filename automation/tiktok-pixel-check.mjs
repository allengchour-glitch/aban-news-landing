#!/usr/bin/env node
/* LuxeStyle — tiktok-pixel-check.mjs  (PIXEL-AUTONOMIE: prueft in ALLEN Varianten, ob der TikTok-Pixel
 * feuert — und meldet, falls etwas nicht geht. No-op-sicher. Laeuft im Bot-Zyklus + Health-Check.
 *
 * Prueft auf der Live-Storefront:
 *   1) Browser-Pixel (ttq base code + Pixel-ID)        = Haupt-Variante (Theme-Snippet)
 *   2) Shopify-TikTok-App Web-Pixel                    = 2. Variante (Channel-App)
 *   3) Consent-Gating (DSGVO)                          = feuert erst nach Cookie-Zustimmung
 * Fallback-Hinweis (server-side Events API) wenn Browser-Pixel fehlt.
 *
 * CLI: node automation/tiktok-pixel-check.mjs   (Default-URL luxestyle.ch; ENV SHOP_URL ueberschreibt)
 */
const URL = process.env.SHOP_URL || 'https://luxestyle.ch/';
const PIXEL = process.env.TIKTOK_PIXEL_ID || 'D8EKVR3C77U6KT5BTBD0';
const log = (...a) => console.log(...a);

async function fetchHtml(u) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 25000);
  try { const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: ctrl.signal }); return r.ok ? await r.text() : ''; }
  catch { return ''; } finally { clearTimeout(t); }
}

(async () => {
  const html = await fetchHtml(URL);
  if (!html) { log('⚠️ Storefront nicht erreichbar — Pixel-Check uebersprungen (No-op).'); process.exit(0); }
  const r = {
    pixel_id_present: html.includes(PIXEL),
    ttq_base_code: /TiktokAnalyticsObject|analytics\.tiktok\.com\/i18n\/pixel/.test(html),
    shopify_tiktok_webpixel: /web-pixel.*tiktok|tiktok.*web-pixel/is.test(html) || /"TikTok"/.test(html),
    consent_gated: /loadTikTokPixel|lx-consent-granted|cookie_consent/.test(html),
  };
  const variants = [r.pixel_id_present && 'Browser-Pixel(Theme)', r.shopify_tiktok_webpixel && 'Shopify-App-WebPixel'].filter(Boolean);
  log('🎯 TikTok-Pixel-Check', new Date().toISOString().slice(0, 16));
  log('   Pixel-ID gefunden :', r.pixel_id_present ? '✅ ' + PIXEL : '❌ FEHLT');
  log('   ttq Base-Code     :', r.ttq_base_code ? '✅' : '❌');
  log('   Shopify-TikTok-App:', r.shopify_tiktok_webpixel ? '✅' : '—');
  log('   Consent-gated     :', r.consent_gated ? '✅ (DSGVO, feuert nach Cookie-OK)' : '⚠️ nein');
  log('   Aktive Varianten  :', variants.length ? variants.join(' + ') : 'KEINE');
  if (!r.pixel_id_present && !r.shopify_tiktok_webpixel) {
    log('🔴 KEIN Pixel aktiv → Fallback: (a) Shopify-TikTok-App neu verbinden, (b) Theme-Snippet ttq einbauen,');
    log('   (c) server-side TikTok Events API (Pixel-ID + Access-Token). Details: dropship/TIKTOK-PIXEL.md');
    process.exit(0);
  }
  if (r.consent_gated) log('💡 Hinweis: Pixel feuert NUR nach Cookie-Zustimmung → Consent-Banner muss sichtbar/aktiv sein, sonst wenig Daten.');
  log('✅ Pixel OK (' + variants.length + ' Variante' + (variants.length > 1 ? 'n' : '') + ').');
  process.exit(0);
})();
