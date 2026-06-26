#!/usr/bin/env node
/* tiktok_capi.mjs — TikTok Events API (CAPI, server-seitig). Liest bezahlte Shopify-Orders der letzten Tage und
 * sendet je ein CompletePayment-Event an TikTok -> robusteres Conversion-Tracking (uebersteht Adblocker/iOS ATT),
 * +19% Event-Volumen / +15% CPA (TikTok-Daten). DEDUP: event_id = Bestell-ID -> TikTok entfernt Dubletten gegen
 * den Browser-Pixel automatisch, KEIN Doppelzaehlen (egal ob der Pixel auch feuert).
 *
 * No-op-sicher: ohne TT_EVENTS_API_TOKEN -> skip. Idempotent: resendet Orders der letzten 2 Tage jeden Lauf
 * (TikTok dedupt via event_id) -> kein State noetig, kein verlorenes Event.
 *
 * ENV: TT_EVENTS_API_TOKEN (Events-API-Token, NIE im Repo) · TT_PIXEL_ID (default D8EKVR3C77U6KT5BTBD0)
 *      SHOPIFY_CLIENT_ID/SECRET/SHOP. Lauf: node automation/vps/tiktok_capi.mjs
 */
import crypto from 'node:crypto';
const TOKEN = process.env.TT_EVENTS_API_TOKEN;
const PIXEL = process.env.TT_PIXEL_ID || 'D8EKVR3C77U6KT5BTBD0';
const ID = process.env.SHOPIFY_CLIENT_ID, SEC = process.env.SHOPIFY_CLIENT_SECRET, SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const BASE = 'https://business-api.tiktok.com/open_api/v1.3';
const log = (...a) => console.log('tiktok_capi:', ...a);
if (!TOKEN) { log('kein TT_EVENTS_API_TOKEN -> skip (Events API noch nicht aktiviert)'); process.exit(0); }
if (!ID || !SEC) { log('keine Shopify-Creds -> skip'); process.exit(0); }

const sha = v => v ? crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex') : undefined;
const shaPhone = v => v ? crypto.createHash('sha256').update(String(v).replace(/[^\d+]/g, '')).digest('hex') : undefined;

(async () => {
  // 1) Shopify-Token + bezahlte Orders der letzten 2 Tage
  const tok = (await (await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: ID, client_secret: SEC, grant_type: 'client_credentials' }) })).json()).access_token;
  if (!tok) { log('kein Shopify-Token'); process.exit(0); }
  const since = new Date(Date.now() - 2 * 864e5).toISOString();
  const q = `{ orders(first:50, query:"financial_status:paid AND created_at:>${since}") { edges { node {
    id name createdAt currentTotalPriceSet{shopMoney{amount currencyCode}}
    customer{ email phone id }
    lineItems(first:20){ edges{ node{ quantity originalUnitPriceSet{shopMoney{amount}} product{ id legacyResourceId } } } }
  } } } }`;
  const data = (await (await fetch(`https://${SHOP}/admin/api/2024-10/graphql.json`, { method: 'POST', headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) })).json()).data;
  const orders = (data?.orders?.edges || []).map(e => e.node);
  if (!orders.length) { log('keine bezahlten Orders in 2 Tagen -> nichts zu senden (normal bei 0 Verkaeufen).'); process.exit(0); }

  // 2) Je Order ein CompletePayment-Event (event_id = Bestell-ID -> Dedup gegen Browser-Pixel)
  let ok = 0, fail = 0;
  for (const o of orders) {
    const oid = (o.id || '').split('/').pop();
    const amount = parseFloat(o.currentTotalPriceSet?.shopMoney?.amount || '0');
    const currency = o.currentTotalPriceSet?.shopMoney?.currencyCode || 'CHF';
    const contents = (o.lineItems?.edges || []).map(li => ({
      content_id: String(li.node.product?.legacyResourceId || ''), content_type: 'product',
      quantity: li.node.quantity, price: parseFloat(li.node.originalUnitPriceSet?.shopMoney?.amount || '0'),
    })).filter(c => c.content_id);
    const body = {
      event_source: 'web', event_source_id: PIXEL,
      data: [{
        event: 'CompletePayment', event_time: Math.floor(new Date(o.createdAt).getTime() / 1000), event_id: oid,
        user: { email: sha(o.customer?.email), phone: shaPhone(o.customer?.phone), external_id: sha(o.customer?.id) },
        properties: { currency, value: amount, contents, content_type: 'product', order_id: oid },
        page: { url: 'https://luxestyle.ch/' },
      }],
    };
    try {
      const r = await fetch(`${BASE}/event/track/`, { method: 'POST', headers: { 'Access-Token': TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.code === 0) { ok++; log(`✅ CompletePayment ${o.name} (CHF ${amount}) gesendet.`); }
      else { fail++; log(`⚠️ ${o.name}: code ${j.code} ${String(j.message).slice(0, 80)}`); }
    } catch (e) { fail++; log(`⚠️ ${o.name}: ${String(e).slice(0, 60)}`); }
  }
  log(`fertig: ${ok} gesendet, ${fail} Fehler (Dedup via event_id -> kein Doppelzaehlen).`);
})();
