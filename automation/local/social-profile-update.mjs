#!/usr/bin/env node
/* LuxeStyle — social-profile-update.mjs
 * =============================================================================================
 * Setzt die PROFI-Bio (+ Website) auf Instagram & TikTok automatisch ueber das eingeloggte Brave
 * (CDP 9222). Profile aus dropship/PROFILE-OPTIMIERUNG.md. Vorher/Nachher-Screenshots zur Kontrolle.
 *
 * NEU: AI-Modus (Stagehand) — beschreibt die Aktion ("setze die Bio auf ...") statt fragiler
 * CSS-Selektoren; ein LLM loest sie gegen den Accessibility-Tree (robust gegen UI-Aenderungen).
 * Faellt sauber auf die alten Playwright-Selektoren zurueck, wenn Stagehand nicht installiert ist.
 *
 * START am PC:  node automation/local/social-profile-update.mjs            (IG + TikTok)
 *               node automation/local/social-profile-update.mjs --only ig  (nur IG)
 *               node automation/local/social-profile-update.mjs --dry       (nur Screenshots)
 * Voraussetzung: Brave --remote-debugging-port=9222, bei instagram.com + tiktok.com eingeloggt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiBrowser } from '../lib/ai-browser.mjs';
setTimeout(()=>{console.log("WATCHDOG 8min -> exit");process.exit(1);},480000).unref(); // 2026-06-25 Sweep: kein cmd-poll-Queue-Freeze

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url)))));
const SHOT = path.join(ROOT, 'automation', 'local', 'profile-shots');
fs.mkdirSync(SHOT, { recursive: true });
const DRY = process.argv.includes('--dry');
const onlyIx = process.argv.indexOf('--only');
const ONLY = onlyIx > -1 ? (process.argv[onlyIx + 1] || '') : '';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const IG_BIO = `🇨🇭 Schweizer Online-Shop für Premium-Looks
✨ Mode · Schmuck · Uhren — fair & schnell
🚚 Gratis ab CHF 65 · TWINT · 30 Tage Rückgabe
👇 –10 % mit Code WELCOME10`;
const TT_BIO = `🇨🇭 Premium Mode·Schmuck·Uhren
Gratis ab CHF 65 · –10% WELCOME10 👇`;
// Link-in-Bio zeigt auf die kuratierte Bestseller-Kollektion (Recherche 2026: NIE Homepage -> kuratierte
// Gewinner = hoehere Conversion; jeder Extra-Klick kostet ~20-30%). /collections/favoriten = 9 top-bewertete Produkte.
const SITE = 'https://luxestyle.ch/collections/favoriten';

// --- Playwright-Fallback-Helfer (wenn Stagehand fehlt) ---
async function fillField(scope, sels, value) {
  for (const s of sels) {
    try { const el = scope.locator(s).first(); if (await el.isVisible({ timeout: 1500 })) {
      await el.click({ timeout: 2000 }); await el.fill(''); await sleep(300); await el.fill(value); await sleep(400); return true; } } catch {}
  }
  return false;
}
async function clickTxt(p, labels) {
  for (const t of labels) { for (const loc of [p.getByRole('button', { name: t }).first(), p.getByText(t, { exact: false }).first()]) {
    try { if (await loc.isVisible({ timeout: 1200 })) { await loc.click({ timeout: 2500 }); await sleep(800); return true; } } catch {} } }
  return false;
}

async function updateInstagram(ab) {
  const p = ab.page;
  try {
    await p.goto('https://www.instagram.com/accounts/edit/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(6000); await p.screenshot({ path: path.join(SHOT, 'ig-before.png') });
    if (/\/login/i.test(p.url())) { log('IG: nicht eingeloggt — uebersprungen.'); return 'NOT_LOGGED_IN'; }

    if (ab.mode === 'stagehand') {
      try {
        await ab.act(`Setze das Bio/Steckbrief-Textfeld komplett auf genau diesen Text: ${IG_BIO}`); await sleep(800);
        await ab.act(`Setze das Website-Feld auf ${SITE}`); await sleep(600);
        await p.screenshot({ path: path.join(SHOT, 'ig-filled.png') });
        if (DRY) { log('IG [AI/dry]: Bio+Website gesetzt — NICHT gespeichert.'); return 'DRY'; }
        await ab.act('Klicke den Button zum Speichern/Senden des Profils (Submit/Speichern/Save)'); await sleep(3000);
        await p.screenshot({ path: path.join(SHOT, 'ig-after.png') });
        log('IG [AI]: Bio gesetzt + gespeichert.'); return 'OK';
      } catch (e) { log('IG [AI]-Fehler -> Playwright-Fallback:', String(e).slice(0, 70)); }
    }

    const bioOk = await fillField(p, ['textarea[aria-label*="Bio" i]', 'textarea[name="biography"]', 'textarea'], IG_BIO);
    const siteOk = await fillField(p, ['input[name="url" i]', 'input[aria-label*="Website" i]', 'input[placeholder*="ebsite" i]'], SITE);
    await p.screenshot({ path: path.join(SHOT, 'ig-filled.png') });
    if (DRY) { log('IG [dry]: Bio-Feld', bioOk, 'Website', siteOk, '— NICHT gespeichert.'); return 'DRY'; }
    const saved = await clickTxt(p, ['Submit', 'Speichern', 'Save', 'Senden', 'Fertig', 'Done']);
    await sleep(3000); await p.screenshot({ path: path.join(SHOT, 'ig-after.png') });
    log('IG: Bio', bioOk ? 'gesetzt' : '⚠️ Feld nicht gefunden', '· gespeichert', saved);
    return bioOk && saved ? 'OK' : 'CHECK_SHOTS';
  } catch (e) { log('IG-Fehler:', String(e).slice(0, 80)); await p.screenshot({ path: path.join(SHOT, 'ig-error.png') }).catch(() => {}); return 'ERROR'; }
}

async function updateTikTok(ab) {
  const p = ab.page;
  try {
    await p.goto('https://www.tiktok.com/setting?activeTab=profile', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(6000); await p.screenshot({ path: path.join(SHOT, 'tt-before.png') });
    if (/\/login/i.test(p.url())) { log('TikTok: nicht eingeloggt — uebersprungen.'); return 'NOT_LOGGED_IN'; }

    if (ab.mode === 'stagehand') {
      try {
        await ab.act('Oeffne den Profil-bearbeiten-Dialog (Edit profile / Profil bearbeiten), falls vorhanden'); await sleep(1500);
        await ab.act(`Setze das Bio-Textfeld komplett auf genau diesen Text: ${TT_BIO}`); await sleep(800);
        await p.screenshot({ path: path.join(SHOT, 'tt-filled.png') });
        if (DRY) { log('TikTok [AI/dry]: Bio gesetzt — NICHT gespeichert.'); return 'DRY'; }
        await ab.act('Klicke den Button zum Speichern (Save/Speichern/Bestaetigen)'); await sleep(3000);
        await p.screenshot({ path: path.join(SHOT, 'tt-after.png') });
        log('TikTok [AI]: Bio gesetzt + gespeichert.'); return 'OK';
      } catch (e) { log('TikTok [AI]-Fehler -> Playwright-Fallback:', String(e).slice(0, 70)); }
    }

    await clickTxt(p, ['Edit profile', 'Profil bearbeiten', 'Profil ändern']);
    await sleep(2000);
    const bioOk = await fillField(p, ['textarea[maxlength="80"]', 'textarea[placeholder*="Bio" i]', 'textarea[name="bio"]', 'textarea'], TT_BIO);
    await p.screenshot({ path: path.join(SHOT, 'tt-filled.png') });
    if (DRY) { log('TikTok [dry]: Bio-Feld', bioOk, '— NICHT gespeichert.'); return 'DRY'; }
    const saved = await clickTxt(p, ['Save', 'Speichern', 'Bestätigen', 'Confirm']);
    await sleep(3000); await p.screenshot({ path: path.join(SHOT, 'tt-after.png') });
    log('TikTok: Bio', bioOk ? 'gesetzt' : '⚠️ Feld nicht gefunden', '· gespeichert', saved);
    return bioOk && saved ? 'OK' : 'CHECK_SHOTS';
  } catch (e) { log('TikTok-Fehler:', String(e).slice(0, 80)); await p.screenshot({ path: path.join(SHOT, 'tt-error.png') }).catch(() => {}); return 'ERROR'; }
}

(async () => {
  let ab;
  try { ab = await aiBrowser(); } catch { log('❌ Kein Brave auf 9222. Brave mit --remote-debugging-port=9222 + bei IG/TikTok eingeloggt.'); process.exit(1); }
  log('Browser-Modus:', ab.mode);
  const res = {};
  if (!ONLY || ONLY === 'ig') res.instagram = await updateInstagram(ab);
  if (!ONLY || ONLY === 'tiktok' || ONLY === 'tt') res.tiktok = await updateTikTok(ab);
  try { fs.writeFileSync(path.join(ROOT, 'reports', 'profile-update.json'), JSON.stringify({ ts: new Date().toISOString(), mode: ab.mode, ...res }, null, 2)); } catch {}
  await ab.close().catch(() => {});
  log('Fertig:', JSON.stringify(res), '· Screenshots in profile-shots/');
  process.exit(0);
})();
