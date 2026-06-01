#!/usr/bin/env node
/**
 * AliExpress → angereicherte Kandidatenliste für LuxeStyle CH
 * ===========================================================
 * Spiegelt cj_enrich.mjs, aber für die **AliExpress Open Platform** (signierte API).
 * Ausgabe identisch nutzbar: /tmp/ae_enriched.json → danach via Shopify-MCP create-product.
 *
 * ⚠️  BENÖTIGT ECHTE CREDENTIALS (siehe dropship/AE-IMPORT-SETUP.md):
 *     AE_APP_KEY, AE_APP_SECRET, AE_TRACKING_ID   (Affiliate/Portals-Account)
 *  optional: AE_ACCESS_TOKEN (nur für DS-Methoden aliexpress.ds.*)
 *
 * Start:
 *   AE_APP_KEY=... AE_APP_SECRET=... AE_TRACKING_ID=... /opt/node22/bin/node dropship/ae_import.mjs "sommer gadget" "kueche helfer"
 *
 * Gateway: https://api-sg.aliexpress.com/sync   (System-Interface, sign_method=sha256)
 * Default-Methode: aliexpress.affiliate.product.query  (Suche, kein OAuth nötig)
 *           Detail: aliexpress.affiliate.productdetail.get
 */
import crypto from 'crypto';
import fs from 'fs';

const APP_KEY = process.env.AE_APP_KEY;
const APP_SECRET = process.env.AE_APP_SECRET;
const TRACKING = process.env.AE_TRACKING_ID || 'luxestyle';
const TOKEN = process.env.AE_ACCESS_TOKEN || '';
const GATEWAY = 'https://api-sg.aliexpress.com/sync';

if (!APP_KEY || !APP_SECRET) {
  console.error('❌ AE_APP_KEY und AE_APP_SECRET müssen gesetzt sein. Siehe dropship/AE-IMPORT-SETUP.md');
  process.exit(1);
}
const keywords = process.argv.slice(2);
if (!keywords.length) { console.error('Nutzung: node ae_import.mjs "keyword1" "keyword2" ...'); process.exit(1); }

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** TOP/IOP-Signatur: Params alphabetisch, key+value konkateniert, HMAC-SHA256(appSecret) hex upper. */
function sign(params) {
  const keys = Object.keys(params).filter(k => k !== 'sign' && params[k] !== undefined && params[k] !== '').sort();
  const base = keys.map(k => k + params[k]).join('');
  return crypto.createHmac('sha256', APP_SECRET).update(base, 'utf8').digest('hex').toUpperCase();
}

async function call(method, biz) {
  const sys = {
    app_key: APP_KEY,
    method,
    timestamp: Date.now().toString(), // ms (neues /sync-Gateway)
    sign_method: 'sha256',
    ...(TOKEN ? { session: TOKEN } : {}),
  };
  const params = { ...sys, ...biz };
  params.sign = sign(params);
  const body = new URLSearchParams(params).toString();
  for (let a = 0; a < 4; a++) {
    try {
      const r = await fetch(GATEWAY, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      const j = await r.json();
      // Fehlerfelder der Plattform abfangen
      if (j.error_response) {
        const e = j.error_response;
        if (/isp\.|isv\.|too many|frequency/i.test(JSON.stringify(e))) { await sleep((a + 1) * 2000); continue; }
        throw new Error('AE-API: ' + JSON.stringify(e));
      }
      return j;
    } catch (e) { if (a === 3) throw e; await sleep((a + 1) * 1500); }
  }
}

function pickList(resp) {
  // Pfad variiert je nach Methode/Region — defensiv mehrere Pfade prüfen
  return resp?.aliexpress_affiliate_product_query_response?.resp_result?.result?.products?.product
      || resp?.resp_result?.result?.products?.product
      || [];
}

(async () => {
  const out = [];
  for (const kw of keywords) {
    console.error('🔎', kw);
    try {
      const resp = await call('aliexpress.affiliate.product.query', {
        keywords: kw,
        page_size: '20',
        page_no: '1',
        target_currency: 'CHF',
        target_language: 'DE',
        ship_to_country: 'CH',
        tracking_id: TRACKING,
        sort: 'LAST_VOLUME_DESC', // Bestseller zuerst
      });
      const list = pickList(resp);
      console.error(`   ${list.length} Treffer`);
      for (const p of list.slice(0, 2)) {
        out.push({
          keyword: kw,
          pid: p.product_id,
          nameEn: p.product_title,
          priceChf: p.target_sale_price || p.sale_price || p.target_app_sale_price,
          orig: p.target_original_price || p.original_price,
          images: [p.product_main_image_url, ...(p.product_small_image_urls?.string || [])].filter(Boolean).slice(0, 10),
          video: p.product_video_url || null,
          rating: p.evaluate_rate,
          orders: p.lastest_volume,
          url: p.product_detail_url,
          shop: p.shop_url,
        });
        console.error(`   ✔ ${(p.product_title || '').slice(0, 50)} | CHF ${p.target_sale_price} | ${p.lastest_volume} Bestellungen`);
      }
    } catch (e) { console.error('   ⚠️', e.message); }
    await sleep(1200); // freundlich zum Rate-Limit
  }
  fs.writeFileSync('/tmp/ae_enriched.json', JSON.stringify(out, null, 2));
  console.error(`\n✅ ${out.length} Kandidaten → /tmp/ae_enriched.json`);
  console.error('   Nächster Schritt: Bilder HTTP-200 prüfen, dann via Shopify-MCP create-product (wie bei CJ).');
})();
