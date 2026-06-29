#!/usr/bin/env node
/* smartplus-drive.mjs — TikTok-Ad via Shopify Smart+ AUTONOM erstellen, PURE PLAYWRIGHT (KEIN Stagehand, KEIN
 * Marketing-Token). Faehrt den PC-Brave ueber die Tailscale-Bruecke (die nachweislich verbindet: tiktok_stats
 * stempelt taeglich). Geht auf die Shopify-TikTok-App-Ad-Erstellung, klickt mit ECHTEN locator.click durch den
 * Smart+-Flow (Ziel->Produkte->Budget->Land/Sprache), DRY (stoppt VOR dem Absenden) + stempelt jeden Schritt
 * nach luxe.smartplus_status, damit die Cloud sieht wie weit er kam + die echten Buttons.
 *
 * GO=1 sendet real ab (max 15 CHF/Tag in der UI gesetzt). Default DRY. ENV: CDP_HOST, SHOPIFY_CLIENT_ID/SECRET/SHOP.
 * Lauf: CDP_HOST=100.71.8.47 node automation/vps/smartplus-drive.mjs
 */
import { chromium } from 'playwright-core';
const HOST = process.env.CDP_HOST || '100.71.8.47';
const GO = process.env.GO === '1';
const ID = process.env.SHOPIFY_CLIENT_ID, SEC = process.env.SHOPIFY_CLIENT_SECRET, SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const URL = 'https://admin.shopify.com/store/luxestyle-ch/apps/tiktok-ads-2/ad_creation';
import { writeFileSync } from 'node:fs';
const log = (...a) => console.log('smartplus:', ...a);
const trace = [];
const T = m => { trace.push(m); log(m); writeT(); };
function writeT(extra) {
  try { writeFileSync('reports/smartplus-trace.txt', `${new Date().toISOString()} ${GO ? 'GO' : 'DRY'}\n` + trace.join('\n') + (extra ? '\n' + extra : '') + '\n'); } catch {}
}

async function stamp(val) {
  if (!ID || !SEC) { log('keine Shopify-Creds -> kein Stamp:', val); return; }
  try {
    const tok = (await (await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: ID, client_secret: SEC, grant_type: 'client_credentials' }) })).json()).access_token;
    const api = `https://${SHOP}/admin/api/2024-10/graphql.json`, H = { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' };
    const sid = (await (await fetch(api, { method: 'POST', headers: H, body: JSON.stringify({ query: '{shop{id}}' }) })).json()).data.shop.id;
    await fetch(api, { method: 'POST', headers: H, body: JSON.stringify({ query: 'mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{message}}}', variables: { m: [{ ownerId: sid, namespace: 'luxe', key: 'smartplus_status', type: 'multi_line_text_field', value: val.slice(0, 480) }] } }) });
    log('luxe.smartplus_status gestempelt');
  } catch (e) { log('stamp-fehler', String(e).slice(0, 80)); }
}
const controls = async (ctx) => ctx.evaluate(() => {
  const b = [...document.querySelectorAll('button,[role=button]')].map(x => (x.innerText || x.getAttribute('aria-label') || '').trim()).filter(s => s && s.length < 28).slice(0, 14);
  const i = [...document.querySelectorAll('input,select')].map(x => (x.type || x.tagName) + ':' + (x.placeholder || x.getAttribute('aria-label') || x.name || '?').slice(0, 18)).slice(0, 8);
  return 'BTN[' + b.join('|') + '] INP[' + i.join('|') + ']';
}).catch(() => '');
// Shopify Embedded-Apps rendern in iframes -> den Frame mit den meisten Steuerelementen waehlen (= eigentliche App-UI).
async function bestFrame(p) {
  let best = p.mainFrame(), max = -1;
  for (const f of p.frames()) {
    try { const n = await f.evaluate(() => document.querySelectorAll('button,[role=button],input,select,a').length); if (n > max) { max = n; best = f; } } catch {}
  }
  return best;
}
async function frameDiag(p) {
  const out = [];
  for (const f of p.frames()) {
    try { const n = await f.evaluate(() => document.querySelectorAll('button,[role=button]').length); out.push((f.url() || 'about:blank').replace(/^https?:\/\//, '').slice(0, 38) + '#' + n); } catch {}
  }
  return `frames=${p.frames().length} [${out.join(' | ')}]`;
}
async function clickAny(ctx, res) {
  for (const re of res) {
    for (const loc of [ctx.getByRole('button', { name: re }).first(), ctx.getByText(re).first()]) {
      try { if (await loc.isVisible({ timeout: 1500 }).catch(() => false)) { await loc.click({ timeout: 4000 }); await ctx.waitForTimeout(2500); return true; } } catch {}
    }
  } return false;
}

(async () => {
  let br;
  try {
    if (HOST === '127.0.0.1' || HOST === 'localhost') {
      // PC-lokal: direkter HTTP-Endpoint = robusteste Methode (Playwright macht den /json/version + WS-Handshake selbst,
      // umgeht den Host-Header/ws-URL-Stolperstein der manuellen Methode).
      br = await chromium.connectOverCDP('http://127.0.0.1:9222', { timeout: 20000 });
    } else {
      const j = await (await fetch(`http://${HOST}:9222/json/version`, { headers: { Host: '127.0.0.1:9222' }, signal: AbortSignal.timeout(8000) })).json();
      br = await chromium.connectOverCDP(j.webSocketDebuggerUrl.replace(/127\.0\.0\.1|localhost/, HOST), { timeout: 20000 });
    }
  } catch (e) { writeT('CONNECT-FAIL: ' + String(e).slice(0, 90)); await stamp('Brave nicht erreichbar: ' + String(e).slice(0, 70)); process.exit(0); }
  try {
    const ctx = br.contexts()[0] || await br.newContext();
    const p = (br.contexts().flatMap(c => c.pages()).find(x => { try { return /apps\/tiktok/.test(x.url()); } catch { return false; } })) || await ctx.newPage();
    await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {}); await p.waitForTimeout(9000);
    const body = (await p.evaluate(() => document.body.innerText).catch(() => '')) || '';
    // DIAGNOSE: Top-URL, Body-Laenge + alle Frames mit Button-Anzahl (Shopify-App liegt in einem iframe).
    T('DIAG topurl=' + p.url().replace(/^https?:\/\//, '').slice(0, 45) + ' bodylen=' + body.length + ' ' + (await frameDiag(p)));
    if (/login|anmelden|sign in|log in to shopify/i.test(body) && !/Smart|Kampagne|campaign|Budget|Ziel/i.test(body)) {
      writeT('LOGIN-WAND: brave-agent nicht bei admin.shopify.com eingeloggt. ' + (await controls(p))); await stamp('LOGIN-WAND: brave-agent-Profil ist NICHT bei admin.shopify.com eingeloggt -> dort 1x einloggen. ' + (await controls(p))); process.exit(0);
    }
    let fr = await bestFrame(p);
    T('start ' + (await controls(fr)));
    // Schritt 1: Start/Weiter (Smart+ auswaehlen falls Auswahl) — Frame nach jeder Navigation neu waehlen
    await clickAny(fr, [/smart\+?/i, /create campaign|kampagne erstellen/i, /get started|los geht/i, /continue|weiter|next/i]);
    fr = await bestFrame(p);
    T('s1 ' + (await controls(fr)));
    // Schritt 2: Ziel
    await clickAny(fr, [/traffic|besuche|website/i, /sales|verkäufe|conversions/i]);
    await clickAny(fr, [/continue|weiter|next/i]);
    fr = await bestFrame(p);
    T('s2-ziel ' + (await controls(fr)));
    // Schritt 3: Budget 15 in ein Zahlen-Input
    try { const ni = fr.locator('input[type=number],input[inputmode=numeric],input[inputmode=decimal]').first(); if (await ni.count()) { await ni.fill('15'); T('budget 15 gesetzt'); } } catch {}
    await clickAny(fr, [/continue|weiter|next/i]);
    fr = await bestFrame(p);
    T('s3-budget ' + (await controls(fr)));
    // Schritt 4: pre-submit Zustand
    T('PRE-SUBMIT ' + (await controls(fr)));
    if (GO) {
      const sent = await clickAny(fr, [/veröffentlichen|publish|launch|absenden|senden|kampagne starten|submit/i]);
      T(sent ? 'GO: abgesendet' : 'GO: Senden-Button nicht gefunden');
    } else T('DRY: stoppe vor Senden (kein Spend)');
  } catch (e) { T('Fehler: ' + String(e).slice(0, 90)); }
  finally {
    writeT('ENDE');
    await stamp(`${GO ? 'GO' : 'DRY'} | ${trace.join(' >> ').slice(0, 440)}`);
    await br.close().catch(() => {});
  }
})();
