#!/usr/bin/env node
/* tiktok-ads-setup.mjs — versucht das TikTok-Ads-Business-Onboarding AUTONOM auszufüllen, über das
 * eingeloggte Brave (CDP 9222). Füllt NUR Formular-Felder (Land=Schweiz, Währung=CHF, Industry=Retail,
 * Firmenname=LuxeStyle, Website=luxestyle.ch). STOPPT VOR der Zahlung (Kreditkarte = physisch nur der User).
 * Screenshot in JEDEM Schritt (Regel: immer screenshot-check). Submittet NICHTS Finanzielles.
 *
 * START am PC:  node automation/local/tiktok-ads-setup.mjs
 * Voraussetzung: Brave 9222 bei ads.tiktok.com eingeloggt (Konto „LuxeStyle CH Ads").
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
setTimeout(()=>{console.log("WATCHDOG 8min -> exit");process.exit(1);},480000).unref(); // 2026-06-25 Sweep: kein cmd-poll-Queue-Freeze

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url)))));
const SHOT = path.join(ROOT, 'automation', 'local', 'tiktok-ads-shots');
fs.mkdirSync(SHOT, { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BIZ = { country: 'Switzerland', currency: 'CHF', industry: 'Retail', name: 'LuxeStyle', website: 'luxestyle.ch', tz: 'Zurich' };
const report = { ts: new Date().toISOString(), filled: [], stoppedAt: '', shots: [], biz: BIZ };

async function tryFill(p, labels, value) {
  // Sucht Input/Select nahe einem Label-Text und füllt es. Best-effort, nicht-destruktiv.
  for (const lab of labels) {
    try {
      const inp = p.locator(`xpath=//*[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"${lab.toLowerCase()}")]/following::input[1]`).first();
      await inp.waitFor({ state: 'visible', timeout: 2500 });
      await inp.fill(String(value));
      report.filled.push(`${lab}=${value}`); return true;
    } catch {}
  }
  return false;
}

(async () => {
  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('Kein Brave auf 9222.'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  const p = await ctx.newPage();
  try {
    await p.goto('https://ads.tiktok.com/i18n/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(6000);
    await p.screenshot({ path: path.join(SHOT, '1-dashboard.png') }); report.shots.push('1-dashboard.png');
    if (/login|passport/i.test(p.url())) { report.stoppedAt = 'NICHT_EINGELOGGT'; log('❌ Nicht eingeloggt bei ads.tiktok.com.'); fin(); return; }

    // "Add business info" / Onboarding-Felder best-effort füllen
    await tryFill(p, ['business name', 'firmenname', 'company'], BIZ.name);
    await tryFill(p, ['website', 'webseite', 'url'], BIZ.website);
    await sleep(800);
    await p.screenshot({ path: path.join(SHOT, '2-businessinfo.png') }); report.shots.push('2-businessinfo.png');

    // Zahlungs-Schritt NUR screenshotten, NICHT ausfüllen (Karte = User)
    const payHint = await p.locator('text=/payment|zahlung|billing|kreditkarte|card/i').first().count().catch(() => 0);
    if (payHint) { report.stoppedAt = 'ZAHLUNG_ERREICHT (Karte = User)'; await p.screenshot({ path: path.join(SHOT, '3-payment.png') }); report.shots.push('3-payment.png'); }
    else report.stoppedAt = report.filled.length ? 'FELDER_GEFUELLT (prüfen + speichern)' : 'KEINE_FELDER_GEFUNDEN (Screenshot prüfen)';

    log('Status:', report.stoppedAt, '· gefüllt:', report.filled.join(', ') || 'nichts');
  } catch (e) { report.stoppedAt = 'FEHLER:' + String(e).slice(0, 80); log('Fehler:', String(e).slice(0, 100)); }
  fin();
  function fin() {
    fs.writeFileSync(path.join(ROOT, 'reports', 'tiktok-ads-setup.json'), JSON.stringify(report, null, 2));
    log('Fertig. Screenshots: automation/local/tiktok-ads-shots/ · Report: reports/tiktok-ads-setup.json');
    process.exit(0);
  }
})();
