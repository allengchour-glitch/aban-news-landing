#!/usr/bin/env node
/* LuxeStyle — social-profile-update.mjs
 * =============================================================================================
 * Setzt die PROFI-Bio (+ Website) auf Instagram & TikTok automatisch ueber das eingeloggte Brave
 * (CDP 9222). Profile aus dropship/PROFILE-OPTIMIERUNG.md. Vorher/Nachher-Screenshots zur Kontrolle.
 * Browser-Profil-Editieren ist fragil (Plattformen aendern UI) -> Screenshots + klare Logs, no-op-safe.
 *
 * START am PC:  node automation/local/social-profile-update.mjs            (IG + TikTok)
 *               node automation/local/social-profile-update.mjs --only ig  (nur IG)
 *               node automation/local/social-profile-update.mjs --dry       (nur Screenshots)
 * Voraussetzung: Brave --remote-debugging-port=9222, bei instagram.com + tiktok.com eingeloggt.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
🚚 Gratis ab CHF 49 · TWINT · 30 Tage Rückgab
👇 –10 % mit Code WELCOME10`;
const TT_BIO = `🇨🇭 Premium Mode·Schmuck·Uhren
Fair & schnell · –10% WELCOME10 👇`;
const SITE = 'https://luxestyle.ch';

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

async function updateInstagram(ctx) {
  const p = await ctx.newPage();
  try {
    await p.goto('https://www.instagram.com/accounts/edit/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(6000); await p.screenshot({ path: path.join(SHOT, 'ig-before.png') });
    if (/\/login/i.test(p.url())) { log('IG: nicht eingeloggt — uebersprungen.'); await p.close(); return 'NOT_LOGGED_IN'; }
    // Bio-Feld (Textarea) + Website
    const bioOk = await fillField(p, ['textarea[aria-label*="Bio" i]', 'textarea[name="biography"]', 'textarea'], IG_BIO);
    const siteOk = await fillField(p, ['input[name="url" i]', 'input[aria-label*="Website" i]', 'input[placeholder*="ebsite" i]'], SITE);
    await p.screenshot({ path: path.join(SHOT, 'ig-filled.png') });
    if (DRY) { log('IG [dry]: Bio-Feld', bioOk, 'Website', siteOk, '— NICHT gespeichert.'); await p.close(); return 'DRY'; }
    const saved = await clickTxt(p, ['Submit', 'Speichern', 'Save', 'Senden', 'Fertig', 'Done']);
    await sleep(3000); await p.screenshot({ path: path.join(SHOT, 'ig-after.png') });
    log('IG: Bio', bioOk ? 'gesetzt' : '⚠️ Feld nicht gefunden', '· gespeichert', saved);
    await p.close(); return bioOk && saved ? 'OK' : 'CHECK_SHOTS';
  } catch (e) { log('IG-Fehler:', String(e).slice(0, 80)); await p.screenshot({ path: path.join(SHOT, 'ig-error.png') }).catch(() => {}); await p.close().catch(() => {}); return 'ERROR'; }
}

async function updateTikTok(ctx) {
  const p = await ctx.newPage();
  try {
    await p.goto('https://www.tiktok.com/setting?activeTab=profile', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(6000); await p.screenshot({ path: path.join(SHOT, 'tt-before.png') });
    if (/\/login/i.test(p.url())) { log('TikTok: nicht eingeloggt — uebersprungen.'); await p.close(); return 'NOT_LOGGED_IN'; }
    // TikTok Bio oft ueber "Edit profile" Dialog -> erst Button suchen
    await clickTxt(p, ['Edit profile', 'Profil bearbeiten', 'Profil ändern']);
    await sleep(2000);
    const bioOk = await fillField(p, ['textarea[maxlength="80"]', 'textarea[placeholder*="Bio" i]', 'textarea[name="bio"]', 'textarea'], TT_BIO);
    await p.screenshot({ path: path.join(SHOT, 'tt-filled.png') });
    if (DRY) { log('TikTok [dry]: Bio-Feld', bioOk, '— NICHT gespeichert.'); await p.close(); return 'DRY'; }
    const saved = await clickTxt(p, ['Save', 'Speichern', 'Bestätigen', 'Confirm']);
    await sleep(3000); await p.screenshot({ path: path.join(SHOT, 'tt-after.png') });
    log('TikTok: Bio', bioOk ? 'gesetzt' : '⚠️ Feld nicht gefunden', '· gespeichert', saved);
    await p.close(); return bioOk && saved ? 'OK' : 'CHECK_SHOTS';
  } catch (e) { log('TikTok-Fehler:', String(e).slice(0, 80)); await p.screenshot({ path: path.join(SHOT, 'tt-error.png') }).catch(() => {}); await p.close().catch(() => {}); return 'ERROR'; }
}

(async () => {
  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('❌ Kein Brave auf 9222. Brave mit --remote-debugging-port=9222 + bei IG/TikTok eingeloggt.'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  const res = {};
  if (!ONLY || ONLY === 'ig') res.instagram = await updateInstagram(ctx);
  if (!ONLY || ONLY === 'tiktok' || ONLY === 'tt') res.tiktok = await updateTikTok(ctx);
  try { fs.writeFileSync(path.join(ROOT, 'reports', 'profile-update.json'), JSON.stringify({ ts: new Date().toISOString(), ...res }, null, 2)); } catch {}
  log('Fertig:', JSON.stringify(res), '· Screenshots in profile-shots/');
  process.exit(0);
})();
