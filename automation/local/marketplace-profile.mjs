#!/usr/bin/env node
/* LuxeStyle — marketplace-profile.mjs
 * =============================================================================================
 * Fuellt die VERKAEUFER-PROFILE auf tutti, anibis & Ricardo (Beschreibung/Ueber-mich) ueber das
 * eingeloggte Brave (CDP 9222). Vorher/Nachher-Screenshots zur Kontrolle.
 *
 * NEU: AI-Modus (Stagehand) — beschreibt die Aktion statt fragiler CSS-Selektoren; ein LLM loest
 * sie gegen den Accessibility-Tree (robust gegen UI-Aenderungen). Faellt sauber auf die alten
 * Playwright-Selektoren zurueck, wenn Stagehand nicht installiert ist.
 *
 * START am PC:  node automation/local/marketplace-profile.mjs            (alle 3)
 *               node automation/local/marketplace-profile.mjs --only tutti
 *               node automation/local/marketplace-profile.mjs --dry
 * Voraussetzung: Brave --remote-debugging-port=9222, bei tutti/anibis/ricardo eingeloggt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiBrowser } from '../lib/ai-browser.mjs';
setTimeout(()=>{console.log("WATCHDOG 8min -> exit");process.exit(1);},480000).unref(); // 2026-06-25 Sweep: kein cmd-poll-Queue-Freeze

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url)))));
const SHOT = path.join(ROOT, 'automation', 'local', 'marketplace-shots');
fs.mkdirSync(SHOT, { recursive: true });
const DRY = process.argv.includes('--dry');
const onlyIx = process.argv.indexOf('--only');
const ONLY = onlyIx > -1 ? (process.argv[onlyIx + 1] || '') : '';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const DESC = '🇨🇭 Schweizer Online-Shop · Mode, Schmuck & Uhren · Premium zu fairen Preisen · schnelle CH-Lieferung · TWINT & Rechnung · 30 Tage Rückgabe · luxestyle.ch';
const NAME = 'LuxeStyle CH';

const SITES = {
  tutti: ['https://www.tutti.ch/de/account/settings', 'https://www.tutti.ch/de/account/profile', 'https://www.tutti.ch/de/account'],
  anibis: ['https://www.anibis.ch/de/user/profile', 'https://www.anibis.ch/de/user/settings'],
  ricardo: ['https://www.ricardo.ch/de/account/settings/profile/', 'https://www.ricardo.ch/de/myricardo/profile/', 'https://www.ricardo.ch/de/account/'],
};

async function fillFirst(p, sels, value) {
  for (const s of sels) { try { const el = p.locator(s).first(); if (await el.isVisible({ timeout: 1500 })) { await el.click({ timeout: 2000 }); await el.fill(''); await sleep(300); await el.fill(value); await sleep(400); return s; } } catch {} }
  return null;
}
async function clickTxt(p, labels) {
  for (const t of labels) { for (const loc of [p.getByRole('button', { name: t }).first(), p.getByText(t, { exact: false }).first()]) {
    try { if (await loc.isVisible({ timeout: 1200 })) { await loc.click({ timeout: 2500 }); await sleep(800); return true; } } catch {} } }
  return false;
}

async function doSite(ab, site, urls) {
  const p = ab.page;
  try {
    let loaded = false;
    for (const u of urls) {
      try {
        await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 40000 }); await sleep(5000);
        const is404 = await p.evaluate(() => /404|nicht.*finden|pas.*trouver|not found|hoppla|oups/i.test(document.body.innerText.slice(0, 300))).catch(() => false);
        if (!is404) { loaded = true; break; }
        log(`${site}: ${u} = 404 -> naechste URL`);
      } catch {}
    }
    await p.screenshot({ path: path.join(SHOT, `${site}-profile-before.png`) });
    if (!loaded && ab.mode === 'stagehand') {
      // NAVIGATIONS-FALLBACK (2026-06-21): geratene URLs 404 -> per AI ueber das Konto-Menue zum Profil navigieren.
      try {
        const root = new URL(urls[0]).origin;
        await p.goto(root, { waitUntil: 'domcontentloaded', timeout: 40000 }); await sleep(4000);
        await ab.act('Oeffne das Konto-/Profil-Menue (meist Avatar oder Name oben rechts)'); await sleep(2500);
        await ab.act('Gehe zu den Konto-Einstellungen bzw. zum Verkaeuferprofil / "Mein Profil" / "Profil bearbeiten"'); await sleep(3500);
        const stillLogin = /login|anmelden|sign in/i.test((await p.content()).slice(0, 2000));
        if (!stillLogin) { loaded = true; log(`${site}: per AI ueber das Konto-Menue zum Profil navigiert.`); await p.screenshot({ path: path.join(SHOT, `${site}-profile-before.png`) }); }
      } catch (e) { log(`${site}: AI-Navigation fehlgeschlagen:`, String(e).slice(0, 60)); }
    }
    if (!loaded) { log(`${site}: keine gueltige Profil-Seite gefunden -> markt-capture URLs noetig`); return 'NO_VALID_PAGE'; }
    if (/login|anmelden|sign in/i.test((await p.content()).slice(0, 3000))) { log(`${site}: nicht eingeloggt`); return 'NOT_LOGGED_IN'; }

    if (ab.mode === 'stagehand') {
      try {
        await ab.act(`Setze das Beschreibungs-/Ueber-mich-Textfeld des Verkaeuferprofils komplett auf genau diesen Text: ${DESC}`); await sleep(800);
        await ab.act(`Falls ein Anzeigename-/Shopname-Feld existiert, setze es auf ${NAME}`).catch(() => {}); await sleep(500);
        await p.screenshot({ path: path.join(SHOT, `${site}-profile-filled.png`) });
        if (DRY) { log(`${site} [AI/dry]: Beschreibung gesetzt — NICHT gespeichert.`); return 'DRY'; }
        await ab.act('Klicke den Button zum Speichern (Speichern/Save/Aktualisieren/Bestaetigen)'); await sleep(3000);
        await p.screenshot({ path: path.join(SHOT, `${site}-profile-after.png`) });
        log(`${site} [AI]: Beschreibung gesetzt + gespeichert.`); return 'OK';
      } catch (e) { log(`${site} [AI]-Fehler -> Playwright-Fallback:`, String(e).slice(0, 70)); }
    }

    const descSel = await fillFirst(p, ['textarea[name*="descr" i]', 'textarea[name*="bio" i]', 'textarea[placeholder*="eschreib" i]', 'textarea[aria-label*="eschreib" i]', 'textarea'], DESC);
    await fillFirst(p, ['input[name*="display" i]', 'input[name*="shopname" i]', 'input[placeholder*="ame" i]'], NAME).catch(() => {});
    await p.screenshot({ path: path.join(SHOT, `${site}-profile-filled.png`) });
    if (DRY) { log(`${site} [dry]: descField=${descSel} — NICHT gespeichert.`); return 'DRY'; }
    const saved = await clickTxt(p, ['Speichern', 'Save', 'Sichern', 'Aktualisieren', 'Bestätigen', 'Übernehmen']);
    await sleep(3000); await p.screenshot({ path: path.join(SHOT, `${site}-profile-after.png`) });
    log(`${site}: Beschreibung ${descSel ? 'gesetzt' : '⚠️ Feld nicht gefunden'} · gespeichert ${saved}`);
    return descSel && saved ? 'OK' : 'CHECK_SHOTS';
  } catch (e) { log(`${site}-Fehler:`, String(e).slice(0, 70)); await p.screenshot({ path: path.join(SHOT, `${site}-profile-error.png`) }).catch(() => {}); return 'ERROR'; }
}

(async () => {
  let ab;
  try { ab = await aiBrowser(); } catch { log('❌ Kein Brave auf 9222.'); process.exit(1); }
  log('Browser-Modus:', ab.mode);
  const res = {};
  for (const [site, urls] of Object.entries(SITES)) { if (!ONLY || ONLY === site) res[site] = await doSite(ab, site, urls); }
  try { fs.writeFileSync(path.join(ROOT, 'reports', 'marketplace-profile.json'), JSON.stringify({ ts: new Date().toISOString(), mode: ab.mode, ...res }, null, 2)); } catch {}
  await ab.close().catch(() => {});
  log('Fertig:', JSON.stringify(res), '· Screenshots in marketplace-shots/');
  process.exit(0);
})();
