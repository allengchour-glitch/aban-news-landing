#!/usr/bin/env node
/* 🛡️ conversion_guard.mjs — READ-ONLY Funnel-Wächter: hält den Kaufweg 24/7 intakt
 *
 * Mehr Käufe = (a) mehr qualifizierter Traffic [User: Pixel/Kampagne/Pinterest] UND (b) ein Funnel
 * ohne Lecks. Dieses Tool sichert (b): prüft täglich, ob etwas KÄUFE BLOCKIERT, und schlägt per
 * Telegram Alarm. Prüft: aktive Rabatte (WELCOME10), alle 6 Policies, Landing-Collections
 * (vorhanden + Produkte + im Onlineshop), aktive Produkte. NUR LESEN, ändert nichts. No-op ohne Creds.
 *
 * ENV: SHOPIFY_CLIENT_ID+SECRET (+SHOPIFY_SHOP) ODER SHOPIFY_ADMIN_TOKEN · [TELEGRAM_BOT_TOKEN+CHAT_ID]
 * Output: automation/autopilot/CONVERSION-GUARD.md (+ Telegram NUR bei Blocker).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const OUT = path.join(ROOT, 'automation', 'autopilot', 'CONVERSION-GUARD.md');
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const API = `https://${SHOP}/admin/api/2025-01/graphql.json`;
const KEY_COLLECTIONS = (process.env.GUARD_COLLECTIONS || 'sommer,damen-mode').split(',').map(s => s.trim()).filter(Boolean);

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

const ok = [], blockers = [];

// 1) Aktive Rabatte (WELCOME10 = Conversion-Anker)
const disc = (await gql('{codeDiscountNodes(first:20,query:"status:active"){edges{node{codeDiscount{... on DiscountCodeBasic{title} ... on DiscountCodeBxgy{title} ... on DiscountCodeFreeShipping{title}}}}}}')).data?.codeDiscountNodes?.edges || [];
const codes = disc.map(e => e.node.codeDiscount?.title).filter(Boolean);
const hasWelcome = codes.some(c => /WELCOME/i.test(c));
if (codes.length) ok.push(`${codes.length} aktive Rabatte${hasWelcome ? ' (WELCOME10 ✓)' : ''}`); else blockers.push('KEIN aktiver Rabattcode (WELCOME10 fehlt → schwächerer Anreiz)');
if (codes.length && !hasWelcome) blockers.push('WELCOME10 nicht aktiv (Popup/Ads bewerben ihn)');

// 2) Policies (Vertrauen + rechtlich → sonst Kaufabbruch)
const pol = (await gql('{shop{shopPolicies{type}}}')).data?.shop?.shopPolicies || [];
if (pol.length >= 6) ok.push(`${pol.length}/6 Policies vorhanden`); else blockers.push(`nur ${pol.length}/6 Policies (Versand/Rückgabe/AGB fehlen → Vertrauensverlust)`);

// 3) Landing-Collections: vorhanden + Produkte (collections-Query; collectionByHandle ist veraltet/null in 2025-01)
const hq = KEY_COLLECTIONS.map(h => `handle:${h}`).join(' OR ');
const colls = (await gql(`{collections(first:50, query:${JSON.stringify(hq)}){edges{node{handle productsCount{count}}}}}`)).data?.collections?.edges || [];
const byHandle = Object.fromEntries(colls.map(e => [e.node.handle, e.node.productsCount?.count ?? 0]));
for (const h of KEY_COLLECTIONS) {
  if (!(h in byHandle)) blockers.push(`Collection /${h} FEHLT (Ad-Landing läuft auf 404 → Käufe verloren)`);
  else if (byHandle[h] === 0) blockers.push(`Collection /${h} hat 0 Produkte`);
  else ok.push(`/${h}: ${byHandle[h]} Produkte`);
}

// 4) Aktive Produkte
const active = (await gql('{productsCount(query:"status:active"){count}}')).data?.productsCount?.count ?? 0;
if (active > 0) ok.push(`${active} aktive Produkte`); else blockers.push('0 aktive Produkte!');

const today = new Date().toISOString().slice(0, 10);
const status = blockers.length ? '🔴 BLOCKER' : '🟢 OK';
const report = `# 🛡️ Conversion-Guard — ${today}  ${status}

**Funnel-Status:** ${blockers.length ? `${blockers.length} Blocker gefunden!` : 'kein Kauf-Blocker — Funnel intakt.'}

${blockers.length ? '## 🔴 Blocker (blockieren Käufe → fixen!)\n' + blockers.map(b => `- ${b}`).join('\n') + '\n' : ''}
## ✅ Geprüft & ok
${ok.map(o => `- ${o}`).join('\n')}

> Read-only. „Mehr Käufe" = dieser Funnel intakt **+** qualifizierter Traffic (Pixel/Kampagne/Pinterest — User).
`;
fs.writeFileSync(OUT, report);
console.log(`${status} — ${blockers.length} Blocker, ${ok.length} ok.`);
blockers.forEach(b => console.log('   🔴 ' + b));

// Telegram NUR bei Blocker (kein Spam)
const TT = process.env.TELEGRAM_BOT_TOKEN, CH = process.env.TELEGRAM_CHAT_ID;
if (TT && CH && blockers.length) {
  try { await fetch(`https://api.telegram.org/bot${TT}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: CH, text: `🛡️ Conversion-Guard ${today}: ${blockers.length} KAUF-BLOCKER!\n` + blockers.map(b => '• ' + b).join('\n'), disable_web_page_preview: true }) }); console.log('⚠️ Blocker-Alarm an Telegram gesendet.'); } catch {}
}
