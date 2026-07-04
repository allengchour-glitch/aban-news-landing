#!/usr/bin/env node
/* klaviyo-tracking-port.mjs — Klaviyo↔Shopify-Integration + Onsite-Tracking prüfen/aktivieren über das
 * eingeloggte Brave (CDP-Port 9222), wie die Follower-/Campaign-Port-Tasks. LÄUFT NUR AM PC (Brave eingeloggt bei Klaviyo).
 *
 * Hintergrund: Klaviyo bekommt 0 Shop-Events (Checkout Started/Placed Order/Viewed Product = 0 über 90T) →
 * die Integration/das Onsite-Tracking sendet nichts → alle verhaltensbasierten Flows tot. Dieses Skript geht auf
 * die Klaviyo-Shopify-Integrations-Seite, macht Screenshots, liest den Status (verbunden? Web-Tracking an/aus?)
 * und (nur mit GO=1) klickt die sicheren Toggles „Web-Tracking aktivieren" / „Sync".
 *
 * ⚠️ SICHER: Default = DRY (nur lesen + Screenshot, NICHTS klicken). GO=1 klickt nur klar benannte Aktivieren-/
 *    Enable-/Sync-Buttons. KEIN Neu-Autorisieren/Login (das bleibt physisch beim User). Idempotent.
 * Voraussetzung: Brave mit --remote-debugging-port=9222, bei klaviyo.com eingeloggt.
 * ENV: [GO=1] · [CDP_URL=http://localhost:9222]
 */
import { mkdirSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
const CDP = process.env.CDP_URL || 'http://localhost:9222';
const GO = process.env.GO === '1';
const SHOTS = 'automation/local/klaviyo-shots';
const log = (...a) => console.log('klaviyo-track:', ...a);
try { mkdirSync(SHOTS, { recursive: true }); mkdirSync('reports', { recursive: true }); } catch {}

// Kandidaten-URLs (Klaviyo ändert Pfade; wir probieren mehrere, screenshotten die, die lädt).
const URLS = [
  'https://www.klaviyo.com/integrations/shopify',
  'https://www.klaviyo.com/settings/shop/integrations',
  'https://www.klaviyo.com/integrations',
];
const report = [];
const R = m => { report.push(m); log(m); try { writeFileSync('reports/klaviyo-track.txt', `${new Date().toISOString()} ${GO ? 'GO' : 'DRY'}\n` + report.join('\n') + '\n'); } catch {} };

async function visible(page) {
  try {
    return await page.evaluate(() => {
      const txt = (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 1400);
      const btns = [...document.querySelectorAll('button,[role=button],a')].map(x => (x.innerText || x.getAttribute('aria-label') || '').trim()).filter(s => s && s.length < 40).slice(0, 30);
      const toggles = [...document.querySelectorAll('input[type=checkbox],[role=switch]')].map(x => (x.getAttribute('aria-label') || x.name || x.getAttribute('aria-checked') || 'toggle')).slice(0, 20);
      return { txt, btns, toggles };
    });
  } catch (e) { return { txt: '', btns: [], toggles: [], err: String(e).slice(0, 80) }; }
}

(async () => {
  let chromium;
  try { ({ chromium } = await import('playwright')); } catch { try { ({ chromium } = await import('playwright-core')); } catch (e) { R('❌ playwright nicht installiert: ' + e.message); process.exit(1); } }
  let browser;
  try { browser = await chromium.connectOverCDP(CDP); }
  catch (e) { R('❌ Kein Brave auf ' + CDP + '. Brave mit --remote-debugging-port=9222 starten + bei klaviyo.com eingeloggt sein. ' + e.message); process.exit(1); }
  const ctx = browser.contexts()[0] || (await browser.newContext());
  const page = await ctx.newPage();
  let loaded = '';
  for (const url of URLS) {
    try {
      R('→ öffne ' + url);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(4000);
      const cur = page.url();
      if (/login|signin/i.test(cur)) { R('⚠️ nicht eingeloggt (Redirect auf Login): ' + cur + ' → im Brave bei Klaviyo einloggen, dann erneut.'); break; }
      loaded = cur;
      const v = await visible(page);
      const shot = `${SHOTS}/klaviyo-${URLS.indexOf(url)}.png`;
      await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
      R('   Screenshot: ' + shot);
      R('   URL: ' + cur);
      R('   Text (Auszug): ' + (v.txt || '').slice(0, 500));
      R('   Buttons: ' + (v.btns || []).join(' | '));
      // Status-Heuristik
      const t = (v.txt || '').toLowerCase();
      if (/connected|verbunden|active|sync/.test(t)) R('   → Integration wirkt VERBUNDEN (Text-Signal).');
      if (/not connected|nicht verbunden|disconnected|reconnect|connect your store/.test(t)) R('   → ⚠️ Integration wirkt NICHT/GETRENNT verbunden.');
      if (/web tracking|onsite|active on site|javascript/.test(t)) R('   → Web-Tracking-Abschnitt gefunden.');
      // GO: sichere Toggles klicken (nur klar benannte Aktivieren/Enable/Sync)
      if (GO) {
        for (const label of ['Enable web tracking', 'Web-Tracking aktivieren', 'Enable onsite', 'Sync now', 'Jetzt synchronisieren', 'Enable', 'Aktivieren']) {
          try {
            const el = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
            if (await el.count()) { await el.click({ timeout: 5000 }); R('   ✓ GO: geklickt „' + label + '"'); await page.waitForTimeout(2500); await page.screenshot({ path: `${SHOTS}/klaviyo-after.png`, fullPage: true }).catch(() => {}); break; }
          } catch {}
        }
      } else {
        R('   [DRY] nichts geklickt. Für Toggle: GO=1 erneut. (Re-Auth/Login macht das Skript NICHT — bleibt beim User.)');
      }
      break;
    } catch (e) { R('   Fehler bei ' + url + ': ' + String(e.message).slice(0, 120)); }
  }
  if (!loaded) R('⚠️ Keine Integrations-Seite geladen (Login nötig oder Pfad geändert — Screenshots prüfen).');
  R('Fertig (' + (GO ? 'GO' : 'DRY') + '). Screenshots in ' + SHOTS + '/, Bericht reports/klaviyo-track.txt');
  try { await page.close(); } catch {}
  try { await browser.close(); } catch {}
})().catch(e => { R('Fehler: ' + e.message); process.exit(1); });
