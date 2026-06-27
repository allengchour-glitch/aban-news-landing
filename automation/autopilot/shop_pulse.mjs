#!/usr/bin/env node
/* 📈 shop_pulse.mjs — READ-ONLY tägliches Geschäfts-Cockpit → Telegram
 *
 * Holt die ECHTEN Shop-Zahlen (Bestellungen + Umsatz 24h/7T/30T, neue Produkte, Bestand) und schickt
 * dir einen kompakten Tages-Puls aufs Handy — plus eine 2-Satz-Fokus-Empfehlung (Gemini, optional).
 * Wie ein CEO-Dashboard. NUR LESEN, ändert nichts am Shop. No-op-safe.
 *
 * ENV: SHOPIFY_CLIENT_ID+SECRET (+SHOPIFY_SHOP) ODER SHOPIFY_ADMIN_TOKEN · [TELEGRAM_BOT_TOKEN+CHAT_ID] · [GEMINI_API_KEY]
 * Output: automation/autopilot/SHOP-PULSE.md (+ Telegram-Versand, falls Token gesetzt).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const OUT = path.join(ROOT, 'automation', 'autopilot', 'SHOP-PULSE.md');
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const API = `https://${SHOP}/admin/api/2025-01/graphql.json`;

async function getToken() {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
  const id = process.env.SHOPIFY_CLIENT_ID, sec = process.env.SHOPIFY_CLIENT_SECRET;
  if (!id || !sec) return null;
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: id, client_secret: sec, grant_type: 'client_credentials' }) });
  return (await r.json()).access_token || null;
}
let TOKEN; const gql = async q => { for (let t = 0; t < 6; t++) { const r = await fetch(API, { method: 'POST', headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) }); const j = await r.json(); if (j.errors && JSON.stringify(j.errors).includes('Throttled')) { await new Promise(r => setTimeout(r, 1500)); continue; } return j; } };

TOKEN = await getToken();
if (!TOKEN) { console.log('Keine Shopify-Creds → No-Op.'); process.exit(0); }

const iso = d => new Date(Date.now() - d * 864e5).toISOString();
const cur = (await gql('{shop{currencyCode}}')).data?.shop?.currencyCode || 'CHF';

// Bestellungen der letzten 30 Tage (mit Datum + Betrag), lokal in 24h/7T/30T bucketn
let orders = [], c = null;
for (let i = 0; i < 6; i++) {
  const j = await gql(`{orders(first:100, query:"created_at:>=${iso(30)}"${c ? `, after:"${c}"` : ''}, sortKey:CREATED_AT){pageInfo{hasNextPage endCursor} edges{node{createdAt displayFinancialStatus totalPriceSet{shopMoney{amount}}}}}}`);
  const p = j.data?.orders; if (!p) break;
  orders.push(...p.edges.map(e => e.node));
  if (!p.pageInfo.hasNextPage) break; c = p.pageInfo.endCursor;
}
const now = Date.now();
const sum = days => orders.filter(o => now - new Date(o.createdAt).getTime() <= days * 864e5)
  .reduce((a, o) => a + (+o.totalPriceSet?.shopMoney?.amount || 0), 0);
const cnt = days => orders.filter(o => now - new Date(o.createdAt).getTime() <= days * 864e5).length;
const f = n => n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Katalog-Kennzahlen
const today = new Date().toISOString().slice(0, 10);
const newToday = (await gql(`{productsCount(query:"created_at:>=${today} status:active"){count}}`)).data?.productsCount?.count ?? '–';
const active = (await gql('{productsCount(query:"status:active"){count}}')).data?.productsCount?.count ?? '–';

// Top-Trend aus der Wissensbasis (falls da)
let topTrend = '';
try {
  const brain = fs.readFileSync(path.join(ROOT, 'automation', 'SECOND-BRAIN.md'), 'utf8');
  topTrend = (brain.match(/Konsens-Hashtags[^\n]*\n((?:- [^\n]*\n){1,3})/) || [, ''])[1].split('\n').map(l => (l.match(/#[A-Za-z0-9äöü]+/) || [''])[0]).filter(Boolean).join(' ');
} catch {}

// 2-Satz-Fokus von Gemini (optional)
let tip = '';
const GK = (process.env.GEMINI_API_KEY || '').trim();
if (GK) {
  try {
    const prompt = `Du bist E-Commerce-Berater für den Schweizer Mode-Shop LuxeStyle. Zahlen: ${cnt(1)} Bestellungen/24h, ${cnt(7)}/7T, ${cnt(30)}/30T, Umsatz 30T ${f(sum(30))} ${cur}, ${active} aktive Produkte. Trend-Hashtags: ${topTrend || 'n/a'}. Gib in GENAU 2 kurzen deutschen Sätzen die wichtigste Fokus-Empfehlung für heute. Kein Vorgeplänkel, keine Hype-Wörter.`;
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GK}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    const j = await r.json(); tip = j.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  } catch {}
}

const report = `📈 LuxeStyle Shop-Puls — ${today}

🛒 Bestellungen: ${cnt(1)} (24h) · ${cnt(7)} (7T) · ${cnt(30)} (30T)
💰 Umsatz: ${f(sum(1))} (24h) · ${f(sum(7))} (7T) · ${f(sum(30))} (30T) ${cur}
📦 Katalog: ${active} aktiv · +${newToday} heute neu
🔝 Trend: ${topTrend || '–'}
${tip ? `\n🎯 Fokus heute: ${tip}` : ''}`;

fs.writeFileSync(OUT, report + '\n');
console.log(report);

const TT = process.env.TELEGRAM_BOT_TOKEN, CH = process.env.TELEGRAM_CHAT_ID;
if (TT && CH) {
  try { const r = await fetch(`https://api.telegram.org/bot${TT}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: CH, text: report, disable_web_page_preview: true }) }); console.log(r.ok ? '\n✅ An Telegram gesendet.' : `\n⚠️ Telegram HTTP ${r.status}`); } catch (e) { console.log('\n⚠️', e.message); }
}
