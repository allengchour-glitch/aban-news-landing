#!/usr/bin/env node
/* LuxeStyle — aliexpress_video_api.mjs  (Weg B: AliExpress Open-Platform API)
 * ---------------------------------------------------------------------------------
 * Holt Produktvideos OHNE Browser über die offizielle AliExpress-Affiliate/Dropship-API
 * (TOP-Gateway, HMAC-SHA256-signiert). Voll autonom, sobald die Secrets gesetzt sind.
 *
 * Ablauf je Produkt:  aliexpress.affiliate.product.query (Keyword=Titel) → erste product_id
 *                     → aliexpress.affiliate.productdetail.get → product_video_url
 *                     → download → attach_video_to_product (wenn Shopify-Creds da)
 *
 * Secrets:  ALI_APP_KEY + ALI_APP_SECRET  (AliExpress Open Platform; API muss freigeschaltet sein)
 *           ALI_TRACKING_ID (optional, für Affiliate)  +  Shopify-Creds für den Attach
 * No-op:    ohne ALI_APP_KEY/SECRET → sauberer Exit 0.
 *
 * CLI:  node automation/aliexpress_video_api.mjs --in ae-targets.csv
 *       node automation/aliexpress_video_api.mjs "gid://shopify/Product/123|Retro Turntable Bluetooth Speaker"
 *       --dry   nur abfragen, nicht herunterladen/anhängen
 *
 * Doku: https://openservice.aliexpress.com  (Methoden-Namen ggf. an deinen API-Plan anpassen)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const KEY = process.env.ALI_APP_KEY || '';
const SECRET = process.env.ALI_APP_SECRET || '';
const TRACKING = process.env.ALI_TRACKING_ID || 'luxestyle';
const GATEWAY = process.env.ALI_GATEWAY || 'https://api-sg.aliexpress.com/sync';
const DRY = process.argv.includes('--dry');
const REELS = path.resolve('reels'); fs.mkdirSync(REELS, { recursive: true });
const FOUND = path.resolve('ae-video-found.csv');

if (!KEY || !SECRET) { console.error('ALI_APP_KEY/ALI_APP_SECRET fehlen → No-op.'); process.exit(0); }

function readTargets() {
  const out = [];
  const i = process.argv.indexOf('--in');
  if (i >= 0 && process.argv[i + 1]) for (const line of fs.readFileSync(process.argv[i + 1], 'utf8').split(/\r?\n/)) {
    const s = line.trim(); if (!s || s.startsWith('#')) continue;
    const [gid, ...rest] = s.split(','); out.push({ gid: gid.trim(), title: rest.join(',').trim() });
  }
  for (const a of process.argv.slice(2)) if (a.includes('|')) { const [gid, title] = a.split('|'); out.push({ gid: gid.trim(), title: title.trim() }); }
  return out;
}

// TOP-Signatur: sortierte key+value-Kette, HMAC-SHA256(secret), HEX-UPPER.
function sign(params) {
  const base = Object.keys(params).sort().map(k => k + params[k]).join('');
  return crypto.createHmac('sha256', SECRET).update(base, 'utf8').digest('hex').toUpperCase();
}
async function call(method, apiParams) {
  const params = {
    method, app_key: KEY, sign_method: 'sha256',
    timestamp: String(Date.now()), format: 'json', v: '2.0', ...apiParams,
  };
  params.sign = sign(params);
  const body = new URLSearchParams(params);
  const r = await fetch(GATEWAY, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await r.json().catch(() => ({}));
  if (j.error_response) throw new Error(`${method}: ${JSON.stringify(j.error_response).slice(0, 200)}`);
  return j;
}

function dig(obj, ...keys) { for (const k of keys) obj = obj?.[k]; return obj; }

async function findVideo(title) {
  // 1) Keyword-Suche → erste product_id
  const q = await call('aliexpress.affiliate.product.query', { keywords: title, page_size: '5', tracking_id: TRACKING });
  const list = dig(q, 'aliexpress_affiliate_product_query_response', 'resp_result', 'result', 'products', 'product') || [];
  const first = Array.isArray(list) ? list[0] : list;
  // manche Endpunkte liefern das Video schon hier:
  let vid = first?.product_video_url || '';
  const pid = first?.product_id;
  if (!vid && pid) {
    // 2) Detailabfrage
    const d = await call('aliexpress.affiliate.productdetail.get', { product_ids: String(pid), tracking_id: TRACKING });
    const det = dig(d, 'aliexpress_affiliate_productdetail_get_response', 'resp_result', 'result', 'products', 'product');
    const p = Array.isArray(det) ? det[0] : det;
    vid = p?.product_video_url || '';
  }
  return vid && /^https?:/.test(vid) ? vid : '';
}

(async () => {
  const targets = readTargets();
  if (!targets.length) { console.error('Keine Ziele. --in ae-targets.csv ODER "GID|Titel".'); process.exit(1); }
  let attach = null;
  if (process.env.SHOPIFY_SHOP && (process.env.SHOPIFY_ADMIN_TOKEN || (process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET))) {
    try { ({ attachVideo: attach } = await import('./attach_video_to_product.mjs')); } catch {}
  }
  for (const { gid, title } of targets) {
    try {
      console.error(`🔎 ${title}`);
      const url = await findVideo(title);
      if (!url) { console.error('  ⏭️  kein Video.'); continue; }
      console.error('  🎯', url.slice(0, 90));
      if (DRY) continue;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
      const out = path.join(REELS, `ae-${slug}.mp4`);
      fs.writeFileSync(out, Buffer.from(await (await fetch(url)).arrayBuffer()));
      console.error('  ⬇️ ', out);
      fs.appendFileSync(FOUND, `${gid},"${title.replace(/"/g, '""')}",${out}\n`);
      if (attach && gid?.startsWith('gid://')) {
        try { await attach({ productId: gid, file: out, alt: `${title} – Produktvideo` }); console.error('  📎 angehängt.'); }
        catch (e) { console.error('  ⚠️ Attach später:', e.message); }
      }
    } catch (e) { console.error('  ❌', e.message); }
    await new Promise(r => setTimeout(r, 1200)); // QPS schonen
  }
  console.error('Fertig.');
})();
