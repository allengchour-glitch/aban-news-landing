#!/usr/bin/env node
/* 🩹 conversion_radar.mjs — READ-ONLY Conversion-Scan des LuxeStyle-Shops
 *
 * Findet die echten Conversion-Lecks (warum Besucher nicht kaufen):
 *   - Produkte OHNE Reviews/Sterne (laut Memory der #1-Hebel)
 *   - FAILED-Bilder, fehlende SEO-Titel
 *   - schwach bewertete Produkte (<4★) in Ad-Landing-Collections
 * Schreibt automation/autopilot/CONVERSION-RADAR.md + optional Telegram.
 * NUR LESEN — ändert nichts. No-op ohne Shopify-Creds.
 *
 * ENV: SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (+ SHOPIFY_SHOP)  ODER  SHOPIFY_ADMIN_TOKEN.
 *      Optional TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const OUT = path.join(ROOT, 'automation', 'autopilot', 'CONVERSION-RADAR.md');
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const API = `https://${SHOP}/admin/api/2025-01/graphql.json`;

async function getToken() {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
  const id = process.env.SHOPIFY_CLIENT_ID, sec = process.env.SHOPIFY_CLIENT_SECRET;
  if (!id || !sec) return null;
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: id, client_secret: sec, grant_type: 'client_credentials' }),
  });
  const j = await r.json(); return j.access_token || null;
}
let TOKEN;
async function gql(query) {
  for (let t = 0; t < 6; t++) {
    const r = await fetch(API, { method: 'POST', headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
    const j = await r.json();
    if (j.errors && JSON.stringify(j.errors).includes('Throttled')) { await new Promise(r => setTimeout(r, 2000)); continue; }
    return j;
  }
}

TOKEN = await getToken();
if (!TOKEN) { console.log('Keine Shopify-Creds → No-Op (conversion_radar wartet auf SHOPIFY_CLIENT_ID/SECRET).'); process.exit(0); }

// Scan: cj-real ACTIVE — Reviews/SEO/Media
const Q = after => `{products(first:50, query:"status:active tag:cj-real"${after ? `, after:"${after}"` : ''}){pageInfo{hasNextPage endCursor} edges{node{
  title handle seo{title}
  media(first:12){edges{node{... on MediaImage{status}}}}
  rc:metafield(namespace:"reviews",key:"rating_count"){value}
  ra:metafield(namespace:"reviews",key:"rating"){value}
}}}}`;
let c = null, n = 0, noReviews = 0, lowRated = 0, failed = 0, noSeo = 0; const lowList = [];
while (true) {
  const p = (await gql(Q(c))).data?.products;
  if (!p) break;
  for (const e of p.edges) {
    const x = e.node; n++;
    const cnt = parseInt(x.rc?.value || '0', 10);
    const rating = parseFloat((x.ra?.value && JSON.parse(x.ra.value)?.value) || x.ra?.value || '0') || 0;
    if (!cnt) noReviews++;
    else if (rating && rating < 4) { lowRated++; if (lowList.length < 15) lowList.push(`${x.title.slice(0,42)} (${rating}★)`); }
    if (x.media.edges.some(m => m.node?.status && m.node.status !== 'READY')) failed++;
    if (!x.seo?.title?.trim()) noSeo++;
  }
  if (!p.pageInfo.hasNextPage) break; c = p.pageInfo.endCursor; await new Promise(r => setTimeout(r, 300));
}

const today = new Date().toISOString().slice(0, 10);
const pct = Math.round((noReviews / Math.max(1, n)) * 100);
const report = `# 🩹 Conversion-Radar — ${today}

**Gescannt:** ${n} cj-real ACTIVE Produkte (read-only).

| Leck | Anzahl | Hebel |
|---|---|---|
| ⭐ **OHNE Reviews/Sterne** | **${noReviews}** (${pct}%) | #1 Conversion-Hebel — Auto-Reviews-Import einrichten |
| ⚠️ schlecht bewertet (<4★) | ${lowRated} | aus Ad-Collections nehmen / Reviews fixen |
| 🖼️ FAILED-Bilder | ${failed} | Bild ersetzen → sonst Kauf-Abbruch |
| 🔤 ohne SEO-Titel | ${noSeo} | SEO setzen (shop-brain) |

${lowList.length ? '**Schwach bewertete (Stichprobe):**\n' + lowList.map(x => `- ${x}`).join('\n') + '\n' : ''}
> Größter Hebel: **${noReviews} Produkte ohne Sterne**. Reviews-Importer (#1) bringt hier am meisten.
> Read-only — keine Änderung am Shop.
`;
fs.writeFileSync(OUT, report);
console.log(`✅ CONVERSION-RADAR.md: ${n} geprüft · ${noReviews} ohne Reviews (${pct}%) · ${lowRated} <4★ · ${failed} FAILED · ${noSeo} ohne SEO.`);

const TOK = process.env.TELEGRAM_BOT_TOKEN, CHAT = process.env.TELEGRAM_CHAT_ID;
if (TOK && CHAT) {
  try { await fetch(`https://api.telegram.org/bot${TOK}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: CHAT, text: `🩹 Conversion-Radar ${today}\n${noReviews}/${n} Produkte OHNE Sterne (${pct}%) · ${failed} FAILED-Bilder · ${noSeo} ohne SEO.\nGrößter Hebel: Reviews.`, disable_web_page_preview: true }) }); console.log('✅ Telegram gesendet.'); } catch {}
}
