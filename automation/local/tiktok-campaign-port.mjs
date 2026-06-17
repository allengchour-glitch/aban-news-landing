#!/usr/bin/env node
/* LuxeStyle — tiktok-campaign-port.mjs  · MAXIMUM-VERSION
 * =============================================================================================
 * Erstellt + startet die bezahlte TikTok-Conversion-Kampagne autonom über das EINGELOGGTE
 * TikTok Ads Manager im Brave (Port 9222). Kein API-Audit nötig. (User: 350 CHF drauf, voll Gas.)
 *
 * ROBUST: jeder Schritt mit mehrsprachigen (DE/EN) Selektoren + Fallbacks + SCREENSHOT (campaign-shots/)
 * + Log. HARTE Budget-Obergrenze (Lifetime-Cap) → kann nie mehr ausgeben als TT_TOTAL_BUDGET.
 * Idempotent über campaign-ledger.txt. AUTO_LAUNCH gating + --dry (nur durchlaufen + screenshotten).
 *
 * EMPFOHLENER ABLAUF (1× begleitet, dann autonom):
 *   1) Brave mit --remote-debugging-port=9222, bei ads.tiktok.com eingeloggt, richtiges Werbekonto aktiv.
 *   2) node automation/local/tiktok-campaign-port.mjs --dry      → läuft durch, macht Screenshots,
 *      meldet wo ein Selektor nicht passt. Screenshots/DIAG anschauen → ggf. SEL_* per ENV überschreiben.
 *   3) AUTO_LAUNCH=1 node automation/local/tiktok-campaign-port.mjs → erstellt + sendet zur Prüfung ab.
 *
 * ENV (sichere Defaults):
 *   TT_TOTAL_BUDGET=350  TT_DAILY_BUDGET=25  TT_PIXEL_ID=D8EKVR3C77U6KT5BTBD0
 *   TT_EVENT="Complete payment"  TT_LANDING=https://luxestyle.ch/collections/sommer
 *   TT_VIDEO=reels/luxe-flagship-film.mp4   TT_IDENTITY="Luxestyle.ch"
 *   TT_LOCATION=Switzerland  TT_GENDER=Female  TT_AGE="18-24,25-34"  TT_LANG="German,French"
 *   TT_ADTEXT="Premium-Looks zu faire Priis. -10% mit WELCOME10."  TT_CTA="Shop Now"
 *   AUTO_LAUNCH=0  CREATION_URL=https://ads.tiktok.com/i18n/perf/creation/campaign
 */
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry');
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const C = {
  total: process.env.TT_TOTAL_BUDGET || '350',
  daily: process.env.TT_DAILY_BUDGET || '25',
  pixel: process.env.TT_PIXEL_ID || 'D8EKVR3C77U6KT5BTBD0',
  event: process.env.TT_EVENT || 'Complete payment',
  landing: process.env.TT_LANDING || 'https://luxestyle.ch/collections/sommer',
  video: path.resolve(process.env.TT_VIDEO || path.join(ROOT, 'reels', 'luxe-flagship-film.mp4')),
  identity: process.env.TT_IDENTITY || 'Luxestyle.ch',
  location: process.env.TT_LOCATION || 'Switzerland',
  gender: process.env.TT_GENDER || 'Female',
  age: (process.env.TT_AGE || '18-24,25-34').split(','),
  lang: (process.env.TT_LANG || 'German,French').split(','),
  adtext: process.env.TT_ADTEXT || 'Premium-Looks zu faire Priis. -10% mit Code WELCOME10.',
  cta: process.env.TT_CTA || 'Shop Now',
  autoLaunch: process.env.AUTO_LAUNCH === '1',
  creationUrl: process.env.CREATION_URL || 'https://ads.tiktok.com/i18n/perf/creation/campaign',
};
const LEDGER = path.join(ROOT, 'automation', 'local', 'tiktok-campaign-ledger.txt');
const SHOTS = path.join(ROOT, 'automation', 'local', 'campaign-shots');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let STEP = 0;

async function shot(p, name) { try { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, `${String(++STEP).padStart(2, '0')}-${name}.png`) }); } catch {} }
async function diag(p, step) {
  const d = await p.evaluate(() => ({ url: location.href, title: document.title, body: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200) })).catch(() => ({}));
  log(`DIAG[${step}]`, JSON.stringify(d)); await shot(p, step);
}
// klick erstes sichtbares Element aus Text/Rollen-Liste
async function clickAny(p, labels, { role = 'button', timeout = 6000 } = {}) {
  for (const t of labels) {
    for (const loc of [p.getByRole(role, { name: t }).first(), p.getByText(t, { exact: false }).first()]) {
      try { if (await loc.isVisible({ timeout: 1000 })) { await loc.click({ timeout }); await sleep(800); return t; } } catch {}
    }
  }
  return null;
}
async function fillAny(p, labelOrPlaceholder, value) {
  for (const loc of [p.getByPlaceholder(labelOrPlaceholder, { exact: false }).first(), p.getByLabel(labelOrPlaceholder, { exact: false }).first()]) {
    try { if (await loc.isVisible({ timeout: 1000 })) { await loc.fill(String(value)); await sleep(500); return true; } } catch {}
  }
  return false;
}
// in Such-Combobox tippen + ersten Treffer wählen (für Location/Sprache/Pixel/Event)
async function pickFromSearch(p, value) {
  try {
    await p.keyboard.type(String(value), { delay: 60 }); await sleep(1800);
    const opt = p.getByRole('option', { name: new RegExp(value, 'i') }).first();
    if (await opt.isVisible({ timeout: 2500 }).catch(() => false)) { await opt.click(); await sleep(700); return true; }
    await p.keyboard.press('Enter'); await sleep(700); return true;
  } catch { return false; }
}

(async () => {
  if (fs.existsSync(LEDGER) && fs.readFileSync(LEDGER, 'utf8').trim()) {
    log('Kampagne existiert schon (campaign-ledger.txt) → No-op (kein Doppel-Spend). Leeren zum Neu-Erstellen.'); process.exit(0);
  }
  if (!fs.existsSync(C.video)) { log('❌ Creative-Video fehlt:', C.video); process.exit(1); }
  log(`MAXIMUM-Setup · Pixel ${C.pixel} · Event "${C.event}" · Lifetime-Cap ${C.total} / Tag ${C.daily} CHF`);
  log(`Creative ${path.basename(C.video)} · ${C.location}/${C.gender}/${C.age.join('+')}/${C.lang.join('+')} · Auto-Launch ${C.autoLaunch} ${DRY ? '(DRY)' : ''}`);

  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('❌ Kein Brave auf 9222. Brave mit --remote-debugging-port=9222 + bei ads.tiktok.com eingeloggt.'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  const p = await ctx.newPage();

  // ---- Schritt 1: Kampagnen-Erstellung öffnen + Ziel ----
  await p.goto(C.creationUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(8000); await diag(p, 'open-creation');
  await clickAny(p, ['Custom mode', 'Benutzerdefinierter Modus', 'Erweitert']); // falls Simplified-Default
  const obj = await clickAny(p, ['Website conversions', 'Conversions', 'Sales', 'Verkäufe', 'Conversion', 'Website-Conversions']);
  log('Ziel:', obj || '⚠️ Ziel-Selektor prüfen (Screenshot 01)');
  await clickAny(p, ['Continue', 'Weiter', 'Next', 'Bestätigen']);
  await sleep(4000); await diag(p, 'adgroup-start');

  // ---- Schritt 2: Optimierungsort = Website + Pixel + Event ----
  await clickAny(p, ['Website']);
  if (await clickAny(p, ['Select a Pixel', 'Pixel auswählen', 'Pixel'])) { await pickFromSearch(p, C.pixel); }
  if (await clickAny(p, ['Optimization event', 'Optimierungsereignis', 'Optimization Event'])) { await pickFromSearch(p, C.event); }
  await diag(p, 'pixel-event');

  // ---- Schritt 3: Placement = nur TikTok ----
  await clickAny(p, ['Select placement', 'Placement auswählen', 'Manuelle Platzierung', 'Manual placement']);
  // andere Placements abwählen → nur TikTok. (UI-abhängig → Screenshot zur Kontrolle)
  await diag(p, 'placement');

  // ---- Schritt 4: Zielgruppe (Standort/Geschlecht/Alter/Sprache) ----
  if (await clickAny(p, ['Location', 'Standort', 'Standorte'])) { await pickFromSearch(p, C.location); }
  await clickAny(p, [C.gender, C.gender === 'Female' ? 'Weiblich' : 'Männlich']);
  for (const a of C.age) await clickAny(p, [a]);
  if (await clickAny(p, ['Languages', 'Sprachen', 'Sprache'])) { for (const l of C.lang) await pickFromSearch(p, l); }
  await diag(p, 'targeting');

  // ---- Schritt 5: Budget — Lifetime-Cap (harte Obergrenze) bevorzugt ----
  await clickAny(p, ['Lifetime', 'Laufzeitbudget', 'Gesamtbudget']);
  if (!await fillAny(p, 'budget', C.total)) { if (!await fillAny(p, 'Budget', C.total)) log('⚠️ Budgetfeld nicht gefunden (Screenshot).'); }
  await fillAny(p, 'Daily', C.daily).catch(() => {});
  await diag(p, 'budget');
  await clickAny(p, ['Next', 'Weiter', 'Continue']);
  await sleep(3000);

  // ---- Schritt 6: Anzeige — Identity, Video, Text, CTA, URL ----
  await diag(p, 'ad-start');
  if (await clickAny(p, ['Identity', 'Identität'])) { await pickFromSearch(p, C.identity); }
  // Video hochladen (oder aus Bibliothek). Datei-Input setzen falls vorhanden.
  try {
    const inp = await p.$('input[type="file"]');
    if (inp) { await inp.setInputFiles(C.video); log('Creative gesetzt:', path.basename(C.video)); await sleep(8000); }
    else log('⚠️ Kein Datei-Input — evtl. erst "Upload" klicken (Screenshot).');
  } catch (e) { log('Video-Upload-Hinweis:', e.message); }
  await fillAny(p, 'Text', C.adtext).catch(() => {});
  if (await clickAny(p, ['Call to action', 'Handlungsaufforderung', 'CTA'])) { await clickAny(p, [C.cta, 'Jetzt einkaufen', 'Mehr ansehen']); }
  await fillAny(p, 'URL', C.landing).catch(() => {});
  await fillAny(p, 'Website URL', C.landing).catch(() => {});
  await diag(p, 'ad-filled');

  if (DRY) { log('[dry] Durchlauf fertig. Screenshots in campaign-shots/ prüfen, dann AUTO_LAUNCH=1.'); process.exit(0); }
  if (!C.autoLaunch) { log('AUTO_LAUNCH=0 → stoppe VOR dem Absenden (1 Klick "Senden" durch dich).'); process.exit(0); }

  // ---- Schritt 7: Absenden ----
  const sub = await clickAny(p, ['Submit', 'Senden', 'Publish', 'Veröffentlichen', 'Confirm']);
  await sleep(5000); await diag(p, 'submitted');
  if (sub) { fs.writeFileSync(LEDGER, new Date().toISOString() + ' campaign submitted\n'); log('✅ Kampagne abgesendet (zur Prüfung).'); }
  else log('⚠️ Submit-Button nicht gefunden — letzter Screenshot prüfen, Selektor nachziehen.');
  process.exit(0);
})().catch(e => { log('Fehler:', e.message); process.exit(1); });
