#!/usr/bin/env node
/* tiktok-campaign-error.mjs — liest den ECHTEN Kampagnen-Fehlertext aus dem PC-Brave (ueber Tailscale-CDP) und
 * stempelt ihn nach luxe.campaign_error. Reines playwright-core (KEIN Stagehand) = zuverlaessig. So sieht die
 * Cloud-Session autonom, welcher Fehler bei "Ads -> Kampagne" erscheint (User 2026-06-28 "klick auf ads -> fehler").
 *
 * Sucht offene Tabs auf ads.tiktok.com ODER admin.shopify.com/.../tiktok; oeffnet sonst die Ad-Creation-Seite.
 * Lauf: CDP_HOST=100.71.8.47 node automation/vps/tiktok-campaign-error.mjs
 * ENV: CDP_HOST, SHOPIFY_CLIENT_ID/SECRET/SHOP. No-op-sicher.
 */
import { chromium } from 'playwright-core';
const HOST = process.env.CDP_HOST || '100.71.8.47';
const ID = process.env.SHOPIFY_CLIENT_ID, SEC = process.env.SHOPIFY_CLIENT_SECRET, SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const log = (...a) => console.log('campaign-error:', ...a);

async function stamp(val) {
  if (!ID || !SEC) { log('keine Shopify-Creds -> kein Stamp. Wert:', val); return; }
  try {
    const tok = (await (await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: ID, client_secret: SEC, grant_type: 'client_credentials' }) })).json()).access_token;
    const api = `https://${SHOP}/admin/api/2024-10/graphql.json`, H = { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' };
    const sid = (await (await fetch(api, { method: 'POST', headers: H, body: JSON.stringify({ query: '{shop{id}}' }) })).json()).data.shop.id;
    await fetch(api, { method: 'POST', headers: H, body: JSON.stringify({ query: 'mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{message}}}', variables: { m: [{ ownerId: sid, namespace: 'luxe', key: 'campaign_error', type: 'multi_line_text_field', value: val.slice(0, 480) }] } }) });
    log('luxe.campaign_error gestempelt.');
  } catch (e) { log('Stamp-Fehler:', String(e).slice(0, 80)); }
}

(async () => {
  let browser;
  try {
    const r = await fetch(`http://${HOST}:9222/json/version`, { headers: { Host: '127.0.0.1:9222' }, signal: AbortSignal.timeout(8000) });
    let ws = (await r.json()).webSocketDebuggerUrl.replace(/127\.0\.0\.1|localhost/, HOST);
    browser = await chromium.connectOverCDP(ws);
  } catch (e) { await stamp('PC-Brave nicht erreichbar: ' + String(e).slice(0, 80)); process.exit(0); }
  try {
    const pages = browser.contexts().flatMap(c => c.pages());
    // Tab finden: TikTok-Ads ODER Shopify-TikTok-App; sonst neuen oeffnen auf der Ad-Creation-Seite.
    let page = pages.find(p => { try { return /ads\.tiktok\.com|apps\/tiktok/.test(p.url()); } catch { return false; } });
    let opened = false;
    if (!page) { page = await (browser.contexts()[0] || await browser.newContext()).newPage(); await page.goto('https://admin.shopify.com/store/luxestyle-ch/apps/tiktok-ads-2/ad_creation', { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {}); opened = true; await page.waitForTimeout(8000); }
    const info = await page.evaluate(() => {
      const t = document.body.innerText || '';
      const lines = t.split('\n').map(s => s.trim()).filter(Boolean);
      const errLines = lines.filter(l => /(error|fehler|can.?t|cannot|invalid|required|rejected|abgelehnt|nicht möglich|fehlgeschlagen|problem|denied|expired|payment|zahlung|billing|insufficient|limit|verify|verifizier|login|anmelden)/i.test(l)).slice(0, 5);
      // SMART+-UI auslesen (Sicht vor Fix): echte Button-Texte + Input-Felder -> Cloud baut den pure-playwright-Driver.
      const btn = [...document.querySelectorAll('button,[role=button],a[href]')].map(b => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(s => s && s.length < 30).slice(0, 16);
      const inp = [...document.querySelectorAll('input,select,textarea')].map(i => (i.tagName + ':' + (i.type || '') + ':' + (i.placeholder || i.getAttribute('aria-label') || i.name || '?')).slice(0, 30)).slice(0, 10);
      return { url: location.href, title: document.title, err: errLines.join(' | '), btn: btn.join('|'), inp: inp.join('|') };
    }).catch(() => ({ url: page.url(), err: '(evaluate fehlgeschlagen)', btn: '', inp: '' }));
    const out = `url=${info.url.slice(0, 55)} ${opened ? '(auf)' : '(tab)'} | ERR:${info.err || '-'} | BTN[${info.btn}] | INP[${info.inp}]`;
    console.log('\n' + out);
    await stamp(out);
  } catch (e) { await stamp('Lese-Fehler: ' + String(e).slice(0, 100)); }
  finally { await browser.close().catch(() => {}); }
})();
