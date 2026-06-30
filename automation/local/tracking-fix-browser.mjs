#!/usr/bin/env node
/* LuxeStyle — tracking-fix-browser.mjs  (LOKAL auf dem PC ausführen — „Port-Bot")
 * ----------------------------------------------------------------------------------
 * Steuert dein bereits EINGELOGGTES Brave über den Debug-Port 9222. Erledigt den Teil,
 * den die Cloud-Session NICHT kann: in deinen eingeloggten Konten (Meta / Shopify / Klaviyo)
 * die kaputten Tracking-Pixel reparieren.
 *
 * HINTERGRUND (Cloud-Session 2026-06-30, am Live-HTML von luxestyle.ch forensisch belegt):
 *   🔴 Facebook-Pixel TOT   → girally_facebook_id = ''   (App „girally" hat keine Pixel-ID)
 *   🔴 Google-Conversion TOT→ girally_google_id  = ''
 *   🔴 Klaviyo Onsite FEHLT → kein klaviyo.js?company_id=XWqMAD  → „Viewed Product = 0"
 *   🟢 TikTok-Pixel LEBT     → D8EKVR3C77U6KT5BTBD0  (einziger funktionierender Pixel)
 *
 * VORAUSSETZUNG (hast du schon):
 *   Brave läuft mit:  --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\brave-agent"
 *   und du bist dort eingeloggt bei: business.facebook.com, admin.shopify.com, klaviyo.com.
 *
 * AUSFÜHREN (PowerShell, im Repo-Ordner):
 *   npm install playwright-core
 *   node automation/local/tracking-fix-browser.mjs
 *
 * Was es tut (alles defensiv, nichts Destruktives):
 *   1) Liest deine Meta-Pixel-ID(s) aus dem Events Manager (eingeloggt) → druckt sie.
 *   2) Öffnet die 3 Reparatur-Seiten in Tabs (girally-App, Klaviyo-Integration, Klaviyo-Account)
 *      und macht Screenshots nach ./tracking-screenshots/ (Beweis + Orientierung).
 *   3) Druckt eine glasklare 3-Schritt-Checkliste MIT deiner echten Pixel-ID zum Einfügen.
 * Das eigentliche Eintippen der ID in die girally-/Klaviyo-Formulare macht PC-Claude (Vision)
 * adaptiv — siehe dropship/BROWSER-CLAUDE-AUFTRAG-TRACKING.md. (Blindes Auto-Fill über 3 fremde
 * UIs wäre zu fragil, um es zu garantieren.)
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const SHOP = 'au3j0y-hq';                 // admin.shopify.com/store/<SHOP>
const KLAVIYO_COMPANY = 'XWqMAD';         // public_api_key / company_id (Cloud-Session bestätigt)
const SHOP_DOMAIN = 'luxestyle.ch';

const SHOTS = path.resolve('./tracking-screenshots'); fs.mkdirSync(SHOTS, { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function shot(page, name) {
  try { await page.screenshot({ path: path.join(SHOTS, name), fullPage: false }); log('📸', name); } catch {}
}
async function openTab(ctx, url, name) {
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(3500);                    // SPA-Inhalte nachladen lassen
    await shot(page, name);
  } catch (e) { log('⚠️ konnte', url, 'nicht laden:', e.message); }
  return page;
}

log('Verbinde mit Brave (localhost:9222)…');
const browser = await chromium.connectOverCDP('http://localhost:9222').catch(e => {
  console.error('❌ Keine Verbindung zu Brave. Läuft es mit --remote-debugging-port=9222 ?\n', e.message);
  process.exit(1);
});
const ctx = browser.contexts()[0] || await browser.newContext();

// ── 1) Meta-Pixel-ID(s) aus dem Events Manager ernten ───────────────────────────
let pixelIds = [];
{
  const page = await openTab(ctx, 'https://business.facebook.com/events_manager2/list/dataset', 'meta-events-manager.png');
  try {
    // Pixel-/Dataset-IDs sind 15–16-stellige Zahlen; aus dem sichtbaren Text + DOM kratzen.
    const txt = await page.evaluate(() => document.body ? document.body.innerText : '');
    const found = new Set((txt.match(/\b\d{15,16}\b/g) || []));
    // auch href/data-Attribute scannen (IDs stehen oft in Links)
    const attrs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[href],[data-testid],[id]'))
        .map(e => (e.getAttribute('href') || '') + ' ' + (e.id || '')).join(' '));
    (attrs.match(/\b\d{15,16}\b/g) || []).forEach(x => found.add(x));
    pixelIds = [...found];
  } catch (e) { log('⚠️ Pixel-Scan:', e.message); }
  if (pixelIds.length) log('🟢 Gefundene Meta-Pixel/Dataset-IDs:', pixelIds.join(', '));
  else log('⚠️ Keine Pixel-ID automatisch erkannt — bitte im Screenshot meta-events-manager.png ablesen',
           '(Events Manager → Datenquellen → die Zahl unter dem Pixel-Namen). Existiert KEIN Pixel? Dann eins anlegen (Auftrag-Doku).');
}

// ── 2) Die 3 Reparatur-Seiten öffnen + screenshoten ─────────────────────────────
await openTab(ctx, `https://admin.shopify.com/store/${SHOP}/apps`, 'shopify-apps.png');           // girally-App hier finden/öffnen
await openTab(ctx, 'https://www.klaviyo.com/integration/shopify', 'klaviyo-shopify-integration.png'); // Onsite-Tracking gegen .ch verbinden
await openTab(ctx, 'https://www.klaviyo.com/settings/account', 'klaviyo-account.png');             // website_url + Währung CHF

// ── 3) Glasklare Checkliste drucken ─────────────────────────────────────────────
const pid = pixelIds[0] || '<DEINE_META_PIXEL_ID — siehe meta-events-manager.png>';
console.log(`
══════════════════════════════════════════════════════════════════════════════
  ✅ TRACKING-FIX — 3 Schritte (Tabs sind offen, Screenshots in ./tracking-screenshots/)
══════════════════════════════════════════════════════════════════════════════
  Deine Meta-Pixel-ID:  ${pixelIds.length ? pixelIds.join('  |  ') : '(nicht auto-erkannt → im Screenshot ablesen)'}

  1) FACEBOOK + GOOGLE  →  Tab „shopify-apps.png": App „girally" öffnen → Pixel-Settings
       • Facebook-Pixel-ID eintragen:  ${pid}
       • Google-Conversion/Ads-ID eintragen (aus Google Ads, falls vorhanden)
       • Speichern.  → behebt girally_facebook_id='' / girally_google_id=''

  2) KLAVIYO ONSITE  →  Tab „klaviyo-shopify-integration.png"
       • Shopify-Integration gegen  ${SHOP_DOMAIN}  (NICHT .com.co) verbinden/re-syncen
       • „Onsite tracking / Active on site" AKTIVIEREN (company_id ${KLAVIYO_COMPANY})
       → behebt „Viewed Product = 0" (klaviyo.js lädt dann auf der Storefront)

  3) KLAVIYO ACCOUNT  →  Tab „klaviyo-account.png"  (Settings → Account)
       • website_url:  https://${SHOP_DOMAIN}   (war: luxestyle.com.co)
       • Preferred currency:  CHF   (war: USD)
       • Speichern.

  🟢 TikTok-Pixel lebt bereits (D8EKVR3C77U6KT5BTBD0) → wenn Budget: zuerst TikTok Ads.
══════════════════════════════════════════════════════════════════════════════
`);
log('Fertig. Tabs offen gelassen für den manuellen/PC-Claude-Feinschliff. Screenshots:', SHOTS);
// Browser NICHT schliessen — du arbeitest in denselben Tabs weiter.
