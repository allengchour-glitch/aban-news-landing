#!/usr/bin/env node
/* LuxeStyle — marketplace-profile.mjs
 * =============================================================================================
 * Fuellt die VERKAEUFER-PROFILE auf tutti, anibis & Ricardo (Beschreibung/Ueber-mich) ueber das
 * eingeloggte Brave (CDP 9222). Vorher/Nachher-Screenshots zur Kontrolle + Selektor-Iteration.
 * Profil-Text aus dropship/PROFILE-OPTIMIERUNG.md. No-op-safe, --dry = nur Screenshots.
 *
 * START am PC:  node automation/local/marketplace-profile.mjs            (alle 3)
 *               node automation/local/marketplace-profile.mjs --only tutti
 *               node automation/local/marketplace-profile.mjs --dry
 * Voraussetzung: Brave --remote-debugging-port=9222, bei tutti/anibis/ricardo eingeloggt.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

// Pro Marktplatz: wahrscheinliche Profil/Einstellungs-URLs (erste ladbare gewinnt)
const SITES = {
  tutti: ['https://www.tutti.ch/de/account/settings', 'https://www.tutti.ch/de/account/profile', 'https://www.tutti.ch/de/account'],
  anibis: ['https://www.anibis.ch/de/account/settings', 'https://www.anibis.ch/de/account/profile', 'https://www.anibis.ch/de/myanibis'],
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

async function doSite(ctx, site, urls) {
  const p = await ctx.newPage();
  try {
    let loaded = false;
    for (const u of urls) { try { await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 40000 }); await sleep(5000); loaded = true; break; } catch {} }
    await p.screenshot({ path: path.join(SHOT, `${site}-profile-before.png`) });
    if (!loaded) { log(`${site}: keine Seite geladen`); await p.close(); return 'NO_PAGE'; }
    if (/login|anmelden|sign in/i.test((await p.content()).slice(0, 3000))) { log(`${site}: nicht eingeloggt`); await p.close(); return 'NOT_LOGGED_IN'; }
    // Beschreibungs-Feld (Textarea) + ggf. Name
    const descSel = await fillFirst(p, ['textarea[name*="descr" i]', 'textarea[name*="bio" i]', 'textarea[placeholder*="eschreib" i]', 'textarea[aria-label*="eschreib" i]', 'textarea'], DESC);
    await fillFirst(p, ['input[name*="display" i]', 'input[name*="shopname" i]', 'input[placeholder*="ame" i]'], NAME).catch(() => {});
    await p.screenshot({ path: path.join(SHOT, `${site}-profile-filled.png`) });
    if (DRY) { log(`${site} [dry]: descField=${descSel} — NICHT gespeichert.`); await p.close(); return 'DRY'; }
    const saved = await clickTxt(p, ['Speichern', 'Save', 'Sichern', 'Aktualisieren', 'Bestätigen', 'Übernehmen']);
    await sleep(3000); await p.screenshot({ path: path.join(SHOT, `${site}-profile-after.png`) });
    log(`${site}: Beschreibung ${descSel ? 'gesetzt' : '⚠️ Feld nicht gefunden'} · gespeichert ${saved}`);
    await p.close(); return descSel && saved ? 'OK' : 'CHECK_SHOTS';
  } catch (e) { log(`${site}-Fehler:`, String(e).slice(0, 70)); await p.screenshot({ path: path.join(SHOT, `${site}-profile-error.png`) }).catch(() => {}); await p.close().catch(() => {}); return 'ERROR'; }
}

(async () => {
  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('❌ Kein Brave auf 9222.'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  const res = {};
  for (const [site, urls] of Object.entries(SITES)) { if (!ONLY || ONLY === site) res[site] = await doSite(ctx, site, urls); }
  try { fs.writeFileSync(path.join(ROOT, 'reports', 'marketplace-profile.json'), JSON.stringify({ ts: new Date().toISOString(), ...res }, null, 2)); } catch {}
  log('Fertig:', JSON.stringify(res), '· Screenshots in marketplace-shots/');
  process.exit(0);
})();
