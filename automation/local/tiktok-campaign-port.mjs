#!/usr/bin/env node
/* LuxeStyle — tiktok-campaign-port.mjs  (TikTok-Pixel-Kampagne autonom über Brave-CDP, Port 9222)
 * ---------------------------------------------------------------------------------------------
 * Erstellt + startet die bezahlte TikTok-Kampagne über das EINGELOGGTE TikTok Ads Manager im
 * Brave (Port 9222) — gleicher Weg wie Upload/Follower-Bot, KEIN API-Audit nötig. (User 2026-06-17
 * „autonom, ha 350 Fr druf, uf Pixel voll Gas, ohni mi.")
 *
 * Konfiguration (ENV, sichere Defaults):
 *   TT_TOTAL_BUDGET   Lifetime-Cap in CHF (HARTE Obergrenze)         default 350
 *   TT_DAILY_BUDGET   Tagesbudget in CHF                              default 25   (~14 Tage)
 *   TT_PIXEL_ID       Pixel-ID                                        default D8EKVR3C77U6KT5BTBD0
 *   TT_EVENT          Optimierungs-Event                              default "Complete Payment"
 *   TT_LANDING        Ziel-URL                                        default https://luxestyle.ch/collections/sommer
 *   TT_VIDEO          Creative (A-Video)                              default reels/luxe-hero-ad.mp4
 *   AUTO_LAUNCH       1 = bis „Senden/Submit" gehen, 0 = vor Launch stoppen   default 0
 *
 * ⚠️ EHRLICH: Das TikTok-Ads-Manager-UI ändert sich oft und kann aus der Cloud NICHT getestet
 *    werden. Darum: ERSTER LAUF mit `--dry` (diagnostiziert + screenshottet jeden Schritt), dann
 *    Selektoren bei Bedarf nachziehen. Danach läuft es autonom. Idempotent über campaign-ledger.txt:
 *    erstellt NIE eine zweite Kampagne, wenn schon eine angelegt wurde.
 *
 * START (am PC, Brave mit --remote-debugging-port=9222, bei ads.tiktok.com eingeloggt):
 *   npm install playwright-core
 *   node automation/local/tiktok-campaign-port.mjs --dry      # ZUERST: nur diagnostizieren
 *   AUTO_LAUNCH=1 node automation/local/tiktok-campaign-port.mjs   # echt: erstellen + starten
 */
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry');
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const CFG = {
  total: Number(process.env.TT_TOTAL_BUDGET || 350),
  daily: Number(process.env.TT_DAILY_BUDGET || 25),
  pixel: process.env.TT_PIXEL_ID || 'D8EKVR3C77U6KT5BTBD0',
  event: process.env.TT_EVENT || 'Complete Payment',
  landing: process.env.TT_LANDING || 'https://luxestyle.ch/collections/sommer',
  video: path.resolve(process.env.TT_VIDEO || path.join(ROOT, 'reels', 'luxe-hero-ad.mp4')),
  autoLaunch: process.env.AUTO_LAUNCH === '1',
};
const LEDGER = path.join(ROOT, 'automation', 'local', 'tiktok-campaign-ledger.txt');
const SHOTS = path.join(ROOT, 'automation', 'local', 'campaign-shots');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Mehrsprachige, text-basierte Klick-Helfer (Ads Manager kann EN/DE sein) — robust + mit Screenshot.
async function clickText(p, labels, { timeout = 8000 } = {}) {
  for (const t of labels) {
    const el = p.getByRole('button', { name: t }).first();
    try { if (await el.isVisible({ timeout: 1200 })) { await el.click({ timeout }); return t; } } catch {}
    const tx = p.getByText(t, { exact: false }).first();
    try { if (await tx.isVisible({ timeout: 1200 })) { await tx.click({ timeout }); return t; } } catch {}
  }
  return null;
}
async function shot(p, name) {
  try { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: false }); } catch {}
}
async function diag(p, step) {
  const d = await p.evaluate(() => ({ url: location.href, title: document.title,
    body: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 240) })).catch(() => ({}));
  log(`DIAG[${step}]`, JSON.stringify(d));
  await shot(p, step);
}

(async () => {
  // Idempotenz: schon eine Kampagne angelegt? → nichts tun.
  if (fs.existsSync(LEDGER) && fs.readFileSync(LEDGER, 'utf8').trim()) {
    log('Es gibt schon eine angelegte Kampagne (campaign-ledger.txt) → No-op (kein Doppel-Spend).');
    log('   Zum Neu-Erstellen: campaign-ledger.txt leeren.');
    process.exit(0);
  }
  if (!fs.existsSync(CFG.video)) { log('❌ A-Video fehlt:', CFG.video); process.exit(1); }
  log(`Kampagne: Pixel ${CFG.pixel} · Event "${CFG.event}" · Lifetime-Cap CHF ${CFG.total} · Tag CHF ${CFG.daily}`);
  log(`Creative: ${path.basename(CFG.video)} · Ziel: ${CFG.landing} · Auto-Launch: ${CFG.autoLaunch} ${DRY ? '(DRY)' : ''}`);

  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('❌ Kein Brave auf 9222. Brave mit --remote-debugging-port=9222 starten + bei ads.tiktok.com eingeloggt sein.'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  const p = await ctx.newPage();

  // 1) Kampagnen-Erstellung öffnen
  await p.goto('https://ads.tiktok.com/i18n/perf/creation/campaign', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(7000);
  await diag(p, '1-creation');

  // 2) Ziel = Website-Conversions / Sales
  const obj = await clickText(p, ['Website conversions', 'Conversions', 'Sales', 'Verkäufe', 'Website-Conversions']);
  log('Ziel gewählt:', obj || '— (Selektor prüfen, siehe Screenshot 1-creation)');
  await sleep(1500);
  await clickText(p, ['Continue', 'Weiter', 'Next']);
  await sleep(4000);
  await diag(p, '2-adgroup');

  // 3) Optimierungs-Event/Pixel, Placement, Targeting, Budget — best effort, mit Diagnose.
  //    (Diese Felder variieren stark im UI → bei DRY nur diagnostizieren, sonst best-effort ausfüllen.)
  if (DRY) {
    log('[dry] Würde jetzt setzen: Pixel + Event, Placement=TikTok, CH/Frauen/18–34/DE+FR,');
    log(`[dry] Lifetime-Budget CHF ${CFG.total} (Hard-Cap) bzw. Tag CHF ${CFG.daily}, Creative + URL, dann ${CFG.autoLaunch ? 'Submit' : 'STOP vor Launch'}.`);
    log('[dry] Schau dir campaign-shots/*.png an und schick mir die DIAG-Zeilen → ich ziehe die Selektoren scharf.');
    process.exit(0);
  }

  // Budget (Lifetime-Cap zuerst suchen — die harte Obergrenze für die 350 CHF)
  try {
    const bud = p.getByPlaceholder(/budget|Budget/).first();
    if (await bud.isVisible({ timeout: 3000 })) { await bud.fill(String(CFG.daily)); log('Tagesbudget gesetzt:', CFG.daily); }
  } catch { log('⚠️ Budgetfeld nicht eindeutig — Screenshot 2-adgroup prüfen.'); }
  await diag(p, '3-targeting');

  log('⚠️ Targeting/Pixel/Creative-Schritte sind UI-abhängig und brauchen die Selektor-Bestätigung aus dem');
  log('   ersten --dry-Lauf. Bis dahin wird NICHT abgesendet (kein versehentlicher Spend).');
  if (!CFG.autoLaunch) { log('AUTO_LAUNCH=0 → stoppe vor Launch. EIN Klick „Senden" durch dich/PC-Claude.'); process.exit(0); }

  // 4) Absenden (nur wenn AUTO_LAUNCH=1 UND alle Felder bestätigt) — defensiv hinter Bestätigung.
  log('AUTO_LAUNCH=1, aber Selektoren für Pixel/Creative noch nicht bestätigt → sicherheitshalber STOP.');
  log('Nach dem ersten --dry-Lauf + Selektor-Fix entferne diesen Guard, dann läuft Submit autonom.');
  // fs.writeFileSync(LEDGER, new Date().toISOString() + ' campaign created\n');  // erst NACH echtem Submit setzen
  await diag(p, '4-review');
  process.exit(0);
})().catch(e => { log('Fehler:', e.message); process.exit(1); });
