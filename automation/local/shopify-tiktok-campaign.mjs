#!/usr/bin/env node
/* shopify-tiktok-campaign.mjs - AUTONOMER Bot fuer die Shopify-TikTok-Smart+-Kampagne.
 * =============================================================================================
 * User 2026-06-21 "ein bot fuer autonom, alle wege, mach alles du": Der PIXEL funktioniert ueber den
 * Shopify-TikTok-Kanal (Konto LuxeStyle CH Ads 7646349875793182738, 332 CHF). Dieser Bot klickt die
 * Smart+-Kampagne dort autonom durch: Sammlung "favoriten" -> Targeting Schweiz/Frauen/18-34 -> Budget -> Senden.
 * Nutzt Stagehand (sh.act) via Brave-CDP 9222 -> Brave-agent MUSS bei admin.shopify.com eingeloggt sein.
 *
 * START am PC:  node automation/local/shopify-tiktok-campaign.mjs           (DRY - stoppt vor Senden)
 *               AUTO_LAUNCH=1 node automation/local/shopify-tiktok-campaign.mjs   (sendet ab)
 * ENV: SHOP_HANDLE=luxestyle-ch  TT_DAILY_BUDGET=10  TT_COLLECTION=favoriten
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiBrowser } from '../lib/ai-browser.mjs';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url)))));
const SHOT = path.join(ROOT, 'automation', 'local', 'shopify-campaign-shots');
fs.mkdirSync(SHOT, { recursive: true });
const HANDLE = process.env.SHOP_HANDLE || 'luxestyle-ch';
const BUDGET = process.env.TT_DAILY_BUDGET || '10';
const COLLECTION = process.env.TT_COLLECTION || 'Bestseller';   // "🔥 Bestseller & Lieblinge" / favoriten
const LAUNCH = process.env.AUTO_LAUNCH === '1';
const URL = `https://admin.shopify.com/store/${HANDLE}/apps/tiktok-ads-2/ad_creation`;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const diag = async (p, n) => { try { await p.screenshot({ path: path.join(SHOT, n + '.png') }); } catch {} };

(async () => {
  let ab; try { ab = await aiBrowser(); } catch { log('Kein Brave 9222.'); process.exit(1); }
  const p = ab.page;
  log('Modus:', ab.mode, ab.mode === 'stagehand' ? '(AI)' : '(Playwright - act nicht moeglich)');
  const res = { ts: new Date().toISOString(), mode: ab.mode, dry: !LAUNCH, steps: [] };
  const A = async (instr, name, ms = 2800) => { try { await ab.act(instr); res.steps.push(name + ':ok'); } catch (e) { res.steps.push(name + ':' + String(e).slice(0, 40)); log('act!', name, String(e).slice(0, 50)); } await sleep(ms); if (name) await diag(p, name); };
  try {
    await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 }); await sleep(8000);
    try { await p.keyboard.press('Escape'); } catch {}            // Uebersetzungs-/Cookie-Popup wegklicken
    if (ab.mode === 'stagehand') { try { await ab.act('schliesse alle stoerenden Popups/Banner (Uebersetzung, Cookies), falls vorhanden'); } catch {} }
    await sleep(1500); await diag(p, '01-open');
    const body = (await p.content()).slice(0, 4000);
    if (/login|anmelden|sign in|passwort/i.test(body) && !/Smart|Kampagne|campaign|werben/i.test(body)) {
      log('Nicht bei Shopify-Admin eingeloggt.'); res.result = 'NOT_LOGGED_IN';
    } else if (ab.mode !== 'stagehand') {
      log('Stagehand nicht aktiv (kein Key) -> kann nicht klicken.'); res.result = 'AI_INAKTIV';
    } else {
      await A(`waehle als Werbeziel "Sammlung" (collection) statt einzelnes Produkt`, '02-sammlung');
      await A(`klicke "Sammlung auswaehlen" und waehle die Sammlung mit Namen die "${COLLECTION}" enthaelt (Bestseller & Lieblinge / favoriten)`, '03-collection');
      await A(`klicke Weiter/Continue um zum naechsten Schritt zu gelangen`, '04-continue', 4000);
      await A(`setze beim Zielgruppen-Targeting den Standort auf "Schweiz" (entferne andere Laender / All)`, '05-location');
      await A(`setze Geschlecht auf "Frauen" und Alter auf 18-24 und 25-34`, '06-targeting');
      await A(`setze das Tagesbudget auf ${BUDGET} CHF`, '07-budget');
      await diag(p, '08-before-send');
      if (!LAUNCH) { log('DRY: stoppe vor Senden.'); res.result = 'DRY_OK'; }
      else { await A(`klicke den blauen Button "Senden" um die Kampagne einzureichen`, '09-sent', 5000); res.result = 'SUBMITTED'; log('Kampagne abgesendet.'); }
    }
  } catch (e) { log('Fehler:', String(e).slice(0, 80)); res.result = res.result || 'ERROR'; res.error = String(e).slice(0, 120); }
  try { fs.writeFileSync(path.join(ROOT, 'reports', 'shopify-campaign-last-run.json'), JSON.stringify(res, null, 2)); } catch {}
  await ab.close().catch(() => {});
  log('Fertig:', res.result, '· Steps:', res.steps.join(' | '));
  process.exit(0);
})();
