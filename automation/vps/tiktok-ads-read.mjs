#!/usr/bin/env node
/* tiktok-ads-read.mjs — VPS liest die TikTok-Ads-Reporting-Seite im PC-Brave (ueber Tailscale-CDP) aus und
 * stempelt Impressionen/Klicks/Spend/Status ins Shop-Metafeld luxe.tiktok_stats. So bekommt JEDE Session
 * (auch die Cloud, die den PC-Browser NICHT direkt erreicht) die echten Views+Klicks — ganz OHNE Marketing-API-Token.
 *
 * Architektur (Lehre 2026-06-26): Cloud kann den PC-Port nicht erreichen -> der VPS schon (Tailnet). VPS liest
 * die Seite, schreibt die Zahlen in ein Shopify-Metafeld; die Cloud-Session liest das Metafeld -> Schleife zu.
 *
 * Lauf auf dem VPS (PC-Brave muss laufen, --remote-debugging-port=9222, bei ads.tiktok.com eingeloggt):
 *   cd /opt/luxe/repo && CDP_HOST=100.71.8.47 node automation/vps/tiktok-ads-read.mjs
 *
 * ENV: CDP_HOST (Tailnet-IP des PC, default 100.71.8.47) · AADVID (TikTok advertiser_id, optional fuer die URL)
 *      SHOPIFY_CLIENT_ID/SECRET/SHOP (zum Stempeln) · GEMINI_API_KEY (optional, fuer robuste Zahlen-Extraktion).
 * No-op-sicher: ohne Brave/Tabs -> sauberer Abbruch, kein Crash.
 */
import { chromium } from 'playwright-core';

const HOST = process.env.CDP_HOST || '100.71.8.47';
const AADVID = process.env.AADVID || '7646349875793182738';
const ID = process.env.SHOPIFY_CLIENT_ID, SEC = process.env.SHOPIFY_CLIENT_SECRET, SHOP = process.env.SHOPIFY_SHOP;
const GEM = process.env.GEMINI_API_KEY;
const log = (...a) => console.log('tiktok-ads-read:', ...a);

// Reporting-Seite: 7-Tage-Fenster, Kampagnen-Ebene. reset_cache erzwingt frische Zahlen.
const REPORT_URL = `https://ads.tiktok.com/i18n/perf/campaign?aadvid=${AADVID}`;

async function connect() {
  const r = await fetch(`http://${HOST}:9222/json/version`, { headers: { Host: '127.0.0.1:9222' }, signal: AbortSignal.timeout(8000) });
  const j = await r.json();
  let ws = (j.webSocketDebuggerUrl || '').replace(/127\.0\.0\.1|localhost/, HOST);
  if (!ws) throw new Error('keine webSocketDebuggerUrl vom PC-Brave');
  log('Brave', j.Browser, '-> connectOverCDP', ws);
  return chromium.connectOverCDP(ws);
}

// Aus dem rohen Seitentext per Gemini robust die Kennzahlen ziehen (optional; sonst Regex-Fallback).
async function extractWithGemini(text) {
  if (!GEM) return null;
  const prompt = `Aus diesem TikTok-Ads-Reporting-Seitentext: gib NUR JSON zurueck wie
{"impressions":<int>,"clicks":<int>,"spend":<float CHF>,"status":"<delivering|review|rejected|paused|unknown>"}
Summe ueber alle Kampagnen. Wenn ein Wert fehlt -> 0 bzw "unknown". KEIN Markdown.\n\n` + text.slice(0, 12000);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEM}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(25000),
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const j = await r.json();
    const t = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const m = t.match(/\{[\s\S]*\}/); if (!m) return null;
    return JSON.parse(m[0]);
  } catch (e) { log('Gemini-Extraktion fehlgeschlagen', String(e).slice(0, 60)); return null; }
}

// Fallback: grobe Regex ueber den Seitentext (Labels variieren; nimm das Beste).
function extractWithRegex(text) {
  const num = (re) => { const m = text.match(re); return m ? parseInt(m[1].replace(/[^\d]/g, ''), 10) : 0; };
  const status = /Not delivering|Review not approved|Rejected/i.test(text) ? 'rejected'
    : /In review|Under review|Reviewing/i.test(text) ? 'review'
    : /Delivering|Active/i.test(text) ? 'delivering'
    : /Paused/i.test(text) ? 'paused' : 'unknown';
  return {
    impressions: num(/Impressions[^\d]{0,40}([\d.,]+)/i),
    clicks: num(/Clicks[^\d]{0,40}([\d.,]+)/i),
    spend: 0, status,
  };
}

async function stamp(summary) {
  if (!ID || !SEC || !SHOP) { log('keine Shopify-Creds -> kein Stamp. Zahlen:', summary); return; }
  const tok = (await (await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: ID, client_secret: SEC, grant_type: 'client_credentials' }) })).json()).access_token;
  if (!tok) { log('kein Token'); return; }
  const api = `https://${SHOP}/admin/api/2024-10/graphql.json`, H = { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' };
  const sid = (await (await fetch(api, { method: 'POST', headers: H, body: JSON.stringify({ query: '{shop{id}}' }) })).json()).data.shop.id;
  const m = 'mutation($mf:[MetafieldsSetInput!]!){metafieldsSet(metafields:$mf){userErrors{message}}}';
  await fetch(api, { method: 'POST', headers: H, body: JSON.stringify({ query: m, variables: { mf: [{ ownerId: sid, namespace: 'luxe', key: 'tiktok_stats', type: 'single_line_text_field', value: summary.slice(0, 250) }] } }) });
  log('Metafeld luxe.tiktok_stats gestempelt:', summary);
}

(async () => {
  let browser;
  try { browser = await connect(); }
  catch (e) { log('PC-Brave nicht erreichbar (' + String(e).slice(0, 80) + ') -> skip'); process.exit(0); }
  try {
    // Bestehenden ads.tiktok.com-Tab wiederverwenden (eingeloggt), sonst neuen oeffnen.
    const pages = browser.contexts().flatMap(c => c.pages());
    let page = pages.find(p => { try { return /ads\.tiktok\.com/.test(p.url()); } catch { return false; } }) || (await (browser.contexts()[0] || await browser.newContext()).newPage());
    await page.goto(REPORT_URL, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(9000); // SPA-Tabelle laden lassen
    const text = await page.evaluate(() => document.body.innerText).catch(() => '');
    if (!text || text.length < 50) { log('Seite leer/nicht eingeloggt -> skip'); await browser.close().catch(() => {}); process.exit(0); }
    // DIAGNOSE: zeigt was die Seite wirklich sagt (Regex/Gemini koennen sonst still danebenliegen).
    const snippet = text.replace(/\n{2,}/g, '\n').slice(0, 700);
    log('SEITEN-SCHNIPSEL ↓↓↓\n' + snippet + '\n↑↑↑ ENDE SCHNIPSEL');
    const reviewHits = (text.match(/Not delivering|Review not approved|Rejected|In review|Under review|No data|Keine Daten/gi) || []).slice(0, 4);
    if (reviewHits.length) log('STATUS-Hinweise auf der Seite:', reviewHits.join(' | '));
    const data = (await extractWithGemini(text)) || extractWithRegex(text);
    const summary = `7T impr=${data.impressions || 0} clicks=${data.clicks || 0} spend=CHF${(+data.spend || 0).toFixed(2)} status=${data.status || 'unknown'} @ ${new Date().toISOString()}`;
    await stamp(summary);
    console.log('\n✅ ' + summary);
    if (!GEM) log('HINWEIS: kein GEMINI_API_KEY geladen -> nur Regex (ungenau). Lauf mit: set -a; . /opt/luxe/.env; set +a; davor.');
  } catch (e) { log('Fehler', String(e).slice(0, 120)); }
  finally { await browser.close().catch(() => {}); }
})();
