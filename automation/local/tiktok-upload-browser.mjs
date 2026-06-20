#!/usr/bin/env node
/* LuxeStyle — tiktok-upload-browser.mjs  (lädt Reels über Brave-CDP, Port 9222 hoch — wie der Follower-Bot)
 * ---------------------------------------------------------------------------------
 * Postet das nächste fertige Reel (reels/*-9x16-meta.mp4) AUTOMATISCH über dein eingeloggtes
 * TikTok im Brave (kein API-Audit nötig, kein manuelles Handy-Hochladen). Steuert die TikTok-
 * Web-Upload-Seite, setzt die Videodatei, füllt die Caption und postet. Idempotent über
 * tiktok-upload-done.txt. So läuft TikTok genauso über den Port wie alles andere.
 *
 * ⚠️ Trend-Sounds gehen NUR in der Handy-App — Web-Upload nimmt die eingebackene Musik (Eigen-Track).
 *    Für Trend-Sound: stumme Version manuell in der App. Sonst: hier vollautomatisch mit Eigen-Track.
 *
 * START (PC-Claude „lad das nächste Reel auf TikTok" ODER):
 *   npm install playwright-core
 *   node automation/local/tiktok-upload-browser.mjs --dry     # ZUERST: nur zeigen + Selektor-Diagnose
 *   node automation/local/tiktok-upload-browser.mjs            # echt: 1 Reel posten
 *   node automation/local/tiktok-upload-browser.mjs reels/reel-flame-9x16-meta.mp4   # bestimmtes Reel
 *
 * Voraussetzung: Brave mit --remote-debugging-port=9222, bei tiktok.com eingeloggt.
 */
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry');
const argFile = process.argv.find(a => a.endsWith('.mp4'));
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const REELS = path.join(ROOT, 'reels');
const CAPS = JSON.parse(fs.readFileSync(path.join(ROOT, 'automation', 'local', 'reels-captions.json'), 'utf8'));
const DONE = path.join(ROOT, 'automation', 'local', 'tiktok-upload-done.txt'); // fix am Repo-Root → nie Re-Post bei anderem cwd
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
// STATUS-DATEI (Observability, User 2026-06-20 „du musst alles im Griff haben"): der PC committet sie,
// damit die Cloud-Session sieht, ob der letzte Lauf POSTED / NOT_LOGGED_IN / NO_INPUT / NO_REEL war.
const STATUS = path.join(ROOT, 'reports', 'tiktok-last-run.json');
function writeStatus(result, reason, extra = {}) {
  try { fs.mkdirSync(path.dirname(STATUS), { recursive: true });
    fs.writeFileSync(STATUS, JSON.stringify({ ts: new Date().toISOString(), result, reason, ...extra }, null, 2) + '\n'); } catch {}
}

function pickReel() {
  if (argFile) return path.resolve(argFile);
  const done = fs.existsSync(DONE) ? fs.readFileSync(DONE, 'utf8').split(/\s+/).filter(Boolean) : [];
  // PRIORITÄT (User 2026-06-17 „wenn postist TikTok"): erst die besten Hero-Creatives, dann alle
  // luxe-*-9x16-Reels, dann die alten *-9x16-meta. So landen die neuen Top-Videos auch auf TikTok.
  // MEISTERWERKE ZUERST (User 2026-06-19 „muss meisterwerk sein, komplette videos") + Vollstaendigkeits-Gate.
  const PRIO = ['luxe-ultimate-ad.mp4', 'luxe-jewelry-cinematic.mp4', 'luxe-hero-ad.mp4',
    'luxe-showcase-fast.mp4', 'luxe-main-showcase.mp4'];
  const all = fs.readdirSync(REELS);
  const big = f => { try { return fs.statSync(path.join(REELS, f)).size > 250000; } catch { return false; } };
  const mw   = all.filter(f => /^mw-.*\.mp4$/.test(f)).sort();                 // Meisterwerke (build_masterpiece)
  const lmw  = all.filter(f => /^luxe-meisterwerk-.*\.mp4$/.test(f)).sort();   // aeltere Meisterwerke
  const luxe = all.filter(f => /^luxe-.*-9x16\.mp4$/.test(f)).sort();
  const meta = all.filter(f => /-9x16-meta\.mp4$/.test(f)).sort();
  const mont = all.filter(f => /^luxe-montage-.*\.mp4$/.test(f)).sort();         // Montagen (mehrere Produkte, dynamisch)
  // Meisterwerke + Montagen zuerst -> komplette, polierte Videos. Dedupe + nur Dateien > 250 KB.
  const seen = new Set();
  const cand = [...mont, ...mw, ...lmw, ...PRIO.filter(f => all.includes(f)), ...luxe, ...meta]
    .filter(f => big(f) && !seen.has(f) && (seen.add(f), true));
  for (const f of cand) if (!done.includes(f)) return path.join(REELS, f);
  // PERPETUAL (User „mehrmals am Tag, suberi Lösig"): wenn ALLE schon gepostet → Rotation neu
  // starten (Ledger leeren), damit nie still steht. Inhalt wiederholt sich erst nach ~allen Reels.
  if (cand.length) { try { fs.writeFileSync(DONE, ''); } catch {} log('♻️ Alle Reels gepostet → Rotation startet neu.'); return path.join(REELS, cand[0]); }
  return null;
}
// Caption aus video_queue.csv ziehen (gleiche coole Mundart-Captions wie Meta), sonst reels-captions.json.
function captionFromQueue(file) {
  try {
    const base = path.basename(file);
    const lines = fs.readFileSync(path.join(ROOT, 'social', 'video_queue.csv'), 'utf8').split('\n');
    for (const l of lines) {
      if (!l.includes(base)) continue;
      const m = l.match(/"([^"]+)"/); if (m) return m[1];
    }
  } catch {}
  return null;
}
// SMART-FALLBACK (FIX 2026-06-20: taeglich neue Produkte automatisch ordentlich captionen statt Dateiname):
// erkennt aus dem Slug die Kategorie -> Mundart-Caption + passende CH-Hashtags. So kriegt JEDES neue Reel
// sofort eine brauchbare Caption, auch ohne Eintrag in reels-captions.json.
function smartCaption(slug) {
  const low = slug.toLowerCase();
  let name = slug.replace(/^mw-/, '').replace(/-/g, ' ').replace(/\bs925\b|\b9x16\b|\bmeta\b|\bgo\b|\bvio\b/gi, '')
    .replace(/\s+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase());
  let emoji = '✨', tag = '#schweizmode';
  if (/kette|ohrring|armreif|armkette|ring|schmuck|moissanite|zirkonia|herzkette/.test(low)) { emoji = '💎'; tag = '#swissjewelry'; }
  else if (/tasche|shopper|crossbody|handtasche|bag|beutel/.test(low)) { emoji = '👜'; tag = '#ootdschweiz'; }
  else if (/sneaker|stiletto|sandalette|schuh|plateau|heel|stiefel/.test(low)) { emoji = '👟'; tag = '#ootdschweiz'; }
  else if (/sonnenbrille|brille/.test(low)) { emoji = '🕶️'; tag = '#ootdschweiz'; }
  else if (/hut|fedora|cap|huet/.test(low)) { emoji = '🎩'; tag = '#ootdschweiz'; }
  else if (/roller|gua|sha|serum|creme|beauty|lifting|maske/.test(low)) { emoji = '✨'; tag = '#skincareschweiz'; }
  else if (/ventilator|diffuser|gadget|lampe|projektor/.test(low)) { emoji = '🌬️'; tag = '#gadget'; }
  else if (/blazer|hemd|set|weste|hose|kleid|strick|stola|schal|shirt|polo/.test(low)) { emoji = '🧥'; tag = '#ootdschweiz'; }
  return `${name} ${emoji} entdeck's im Schwiizer Shop. Gratis-Versand ab CHF 49 · –10% mit WELCOME10 → luxestyle.ch\n${tag} #ootdschweiz #swissmade #fyp #foryou`;
}
// TikTok-Sound-Regel (FEST): Reels STUMM hochladen → User legt Trend-Sound in der App drauf.
// Macht eine tonlose Kopie (kein Re-Encode des Bilds = schnell, verlustfrei). Fallback = Original.
function toSilent(file) {
  try {
    const out = path.join(os.tmpdir(), 'tt-' + path.basename(file));
    execSync(`ffmpeg -y -nostdin -i "${file}" -c:v copy -an "${out}"`, { stdio: 'ignore' });
    if (fs.existsSync(out) && fs.statSync(out).size > 10000) return out;
  } catch {}
  return file;
}

(async () => {
  let file = pickReel();
  if (!file || !fs.existsSync(file)) { log('Kein offenes Reel zum Posten (alle in tiktok-upload-done.txt). No-op.'); process.exit(0); }
  // QA-GATE (User 2026-06-19 „immer neue Videos analysieren ob's passt"): vor dem Posten pruefen
  // (Format/Vollstaendigkeit + Gemini-Vision asiat.Schrift/Watermark/Qualitaet). Durchfall -> ueberspringen.
  for (let tries = 0; file && tries < 8; tries++) {
    let qaOut = '';
    // ROBUST (FIX 2026-06-20): video-qa.mjs crasht auf Windows beim Exit (libuv UV_HANDLE_CLOSING) ->
    // execSync wirft, obwohl die QA bestanden hat. Darum Urteil aus dem TEXT lesen, nicht aus dem Exit-Code.
    try { qaOut = execSync(`node "${path.join(ROOT, 'automation/video/video-qa.mjs')}" "${file}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { qaOut = String((e.stdout || '') + (e.stderr || '')); }
    process.stdout.write(qaOut);
    const failed = /QA-FAIL/i.test(qaOut);
    const passed = /QA-OK|bestanden|premium=true/i.test(qaOut);
    if (passed && !failed) break;                       // bestanden -> posten (Exit-Code egal)
    log('⚠️ QA durchgefallen → ueberspringe ' + path.basename(file)); fs.appendFileSync(DONE, path.basename(file) + '\n'); file = pickReel();
  }
  if (!file || !fs.existsSync(file)) { log('Kein QA-bestandenes Reel offen. No-op.'); process.exit(0); }
  const slug = path.basename(file).replace('.mp4', '');
  let caption = captionFromQueue(file) || CAPS[slug] || smartCaption(slug);
  // Trust-Winkel (Recherche „Vertrauen VOR Verkauf"): ~jeder 3. Reel kriegt eine WAHRE Trust-Zeile.
  const TRUST_TT = ['🇨🇭 Schweizer Shop · TWINT · 30 Tage Rückgab · gratis ab CHF 49', '✅ Sicher zahle mit TWINT · 30 Tage Rückgaberächt · schnälle CH-Versand'];
  const h = [...slug].reduce((a, c) => a + c.charCodeAt(0), 0);
  if (h % 3 === 0 && !/Schweizer Shop|TWINT/.test(caption)) caption += `\n${TRUST_TT[h % TRUST_TT.length]}`;
  log(`Reel: ${path.basename(file)} ${DRY ? '(DRY)' : ''}`);
  log(`Caption: ${caption.split('\n')[0]}`);

  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('❌ Kein Brave auf 9222. Brave mit --remote-debugging-port=9222 starten + bei tiktok.com eingeloggt sein.'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  const p = await ctx.newPage();
  await p.goto('https://www.tiktok.com/tiktokstudio/upload', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(6000);

  // LOGIN-CHECK (haeufigste Ursache fuer "1 Woche nichts": TikTok-Session in Brave abgelaufen → Redirect auf /login).
  const curUrl = p.url();
  if (/\/login|\/signup|passport/i.test(curUrl)) {
    log('❌ NICHT bei TikTok eingeloggt (Seite: ' + curUrl + ').');
    log('   → EINMAL in Brave (Profil brave-agent) bei tiktok.com mit @luxestyle.ch einloggen, dann postet der Bot wieder vollautomatisch.');
    writeStatus('NOT_LOGGED_IN', 'TikTok-Session in Brave abgelaufen — 1x einloggen noetig', { url: curUrl, file: path.basename(file) });
    await p.screenshot({ path: path.join(ROOT, 'reports', 'tiktok-login-needed.png') }).catch(() => {});
    await p.close().catch(() => {});
    process.exit(0);
  }

  // Datei-Input finden (oft versteckt) und Video setzen
  let input = await p.$('input[type="file"]');
  if (!input) { // evtl. in iframe
    for (const fr of p.frames()) { input = await fr.$('input[type="file"]').catch(() => null); if (input) { log('(Datei-Input im iframe)'); break; } }
  }
  if (!input) {
    log('⚠️ Kein Datei-Input gefunden — Diagnose:');
    const d = await p.evaluate(() => ({ url: location.href, title: document.title, inputs: document.querySelectorAll('input').length, iframes: document.querySelectorAll('iframe').length, body: (document.body.innerText || '').slice(0, 200).replace(/\s+/g, ' ') })).catch(() => ({}));
    log('DIAG', JSON.stringify(d));
    await p.screenshot({ path: path.join(ROOT, 'reports', 'tiktok-upload-diag.png') }).catch(() => {});
    log('Screenshot: tiktok-upload-diag.png — schick mir die DIAG-Zeile, ich passe die Selektoren an.');
    writeStatus('NO_FILE_INPUT', 'Kein Upload-Feld — evtl. ausgeloggt oder TikTok-UI geaendert', { url: d.url || curUrl, file: path.basename(file) });
    process.exit(0);
  }
  if (DRY) { log('[dry] würde Video setzen + Caption füllen + posten. (Datei-Input gefunden ✓)'); process.exit(0); }

  // User 2026-06-20 "gepostet aber ohne Ton": organische TikTok-Posts kommen MIT eingebackener Musik
  // (CC-BY, kommerziell ok) -> jeder Post hat automatisch Sound = voll autonom. TIKTOK_SILENT=1 = wieder
  // stumm (falls man lieber den In-App-Trend-Sound nutzen will). (Bezahlte Ads bleiben separat tonlos.)
  const upFile = process.env.TIKTOK_SILENT === '1' ? toSilent(file) : file;
  if (upFile !== file) log('🔇 Tonlose Kopie (TIKTOK_SILENT=1) — Trend-Sound in der App.');
  else log('🔊 Mit eingebackener Musik (Sound automatisch).');
  await input.setInputFiles(upFile);
  log('Video gesetzt, warte auf Verarbeitung…');
  await sleep(15000);
  // Caption-Feld (contenteditable) — leeren + füllen
  const box = p.locator('div[contenteditable="true"]').first();
  if (await box.count().catch(() => 0)) {
    await box.click().catch(() => {});
    await p.keyboard.press('Control+A').catch(() => {});
    await p.keyboard.press('Backspace').catch(() => {});
    await box.type(caption, { delay: 12 }).catch(() => {});
  } else { log('⚠️ Kein Caption-Feld gefunden (poste evtl. ohne Caption)'); }
  await sleep(2000);
  // Post-/Veröffentlichen-Button (DE+EN). Wichtig: TikTok zeigt DANACH oft noch einen
  // Bestätigungs-Dialog „Weiter und veröffentlichen?" → den auch klicken (sonst bleibt's stehen).
  const postBtn = p.locator('[data-e2e="post_video_button"], button:has-text("Veröffentlichen"), button:has-text("Posten"), button:has-text("Post"), button:has-text("Publish")').first();
  if (await postBtn.count().catch(() => 0)) {
    await postBtn.click().catch(() => {});
    log('„Veröffentlichen" geklickt — prüfe auf Bestätigungs-Dialog…');
    // Bestätigungs-Dialog „Weiter und veröffentlichen?" → „Jetzt veröffentlichen" (mehrfach versuchen)
    let confirmed = false;
    for (let i = 0; i < 5 && !confirmed; i++) {
      await sleep(1800);
      const confirm = p.locator('button:has-text("Jetzt veröffentlichen"), button:has-text("Trotzdem veröffentlichen"), button:has-text("Publish now"), div[role="dialog"] button:has-text("Veröffentlichen"), div[role="dialog"] button:has-text("Weiter"), button:has-text("Continue")').first();
      if (await confirm.count().catch(() => 0) && await confirm.isVisible().catch(() => false)) {
        await confirm.click().catch(() => {});
        log('✅ Bestätigung „Jetzt veröffentlichen" geklickt.');
        confirmed = true;
      }
    }
    await sleep(12000);
    fs.appendFileSync(DONE, path.basename(file) + '\n');
    log(confirmed ? '✅ Veröffentlicht (Bestätigung geklickt). Vermerkt.' : '✅ „Veröffentlichen" geklickt (kein Extra-Dialog). Vermerkt.');
    writeStatus('POSTED', confirmed ? 'Veroeffentlicht (Bestaetigung geklickt)' : 'Veroeffentlichen geklickt', { file: path.basename(file), caption: caption.split('\n')[0] });
  } else { log('⚠️ Veröffentlichen-Button nicht gefunden — Video ist gesetzt, bitte in der Seite manuell klicken.'); writeStatus('NO_POST_BUTTON', 'Video gesetzt, Veroeffentlichen-Button fehlt', { file: path.basename(file) }); }
  await p.screenshot({ path: path.join(ROOT, 'reports', 'tiktok-upload-result.png') }).catch(() => {});
  await p.close().catch(() => {});   // Tab schliessen (User: nicht zu viele Tabs offen lassen)
  process.exit(0);
})();
