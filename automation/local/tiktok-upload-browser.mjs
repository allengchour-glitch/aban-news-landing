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
import fs from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry');
const argFile = process.argv.find(a => a.endsWith('.mp4'));
const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const REELS = path.join(ROOT, 'reels');
const CAPS = JSON.parse(fs.readFileSync(path.join(ROOT, 'automation', 'local', 'reels-captions.json'), 'utf8'));
const DONE = path.join(process.cwd(), 'tiktok-upload-done.txt');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function pickReel() {
  if (argFile) return path.resolve(argFile);
  const done = fs.existsSync(DONE) ? fs.readFileSync(DONE, 'utf8').split(/\s+/).filter(Boolean) : [];
  const cand = fs.readdirSync(REELS).filter(f => /-9x16-meta\.mp4$/.test(f)).sort();
  for (const f of cand) if (!done.includes(f)) return path.join(REELS, f);
  return null;
}

(async () => {
  const file = pickReel();
  if (!file || !fs.existsSync(file)) { log('Kein offenes Reel zum Posten (alle in tiktok-upload-done.txt). No-op.'); process.exit(0); }
  const slug = path.basename(file).replace('.mp4', '');
  const caption = CAPS[slug] || `${slug} ✨ luxestyle.ch · –10% WELCOME10 #schweizmode #fyp`;
  log(`Reel: ${path.basename(file)} ${DRY ? '(DRY)' : ''}`);
  log(`Caption: ${caption.split('\n')[0]}`);

  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('❌ Kein Brave auf 9222. Brave mit --remote-debugging-port=9222 starten + bei tiktok.com eingeloggt sein.'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  const p = await ctx.newPage();
  await p.goto('https://www.tiktok.com/tiktokstudio/upload', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(6000);

  // Datei-Input finden (oft versteckt) und Video setzen
  let input = await p.$('input[type="file"]');
  if (!input) { // evtl. in iframe
    for (const fr of p.frames()) { input = await fr.$('input[type="file"]').catch(() => null); if (input) { log('(Datei-Input im iframe)'); break; } }
  }
  if (!input) {
    log('⚠️ Kein Datei-Input gefunden — Diagnose:');
    const d = await p.evaluate(() => ({ url: location.href, title: document.title, inputs: document.querySelectorAll('input').length, iframes: document.querySelectorAll('iframe').length, body: (document.body.innerText || '').slice(0, 200).replace(/\s+/g, ' ') })).catch(() => ({}));
    log('DIAG', JSON.stringify(d));
    await p.screenshot({ path: path.join(process.cwd(), 'tiktok-upload-diag.png') }).catch(() => {});
    log('Screenshot: tiktok-upload-diag.png — schick mir die DIAG-Zeile, ich passe die Selektoren an.');
    process.exit(0);
  }
  if (DRY) { log('[dry] würde Video setzen + Caption füllen + posten. (Datei-Input gefunden ✓)'); process.exit(0); }

  await input.setInputFiles(file);
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
  // Post-Button
  const postBtn = p.locator('button:has-text("Post"), button:has-text("Posten"), [data-e2e="post_video_button"]').first();
  if (await postBtn.count().catch(() => 0)) {
    await postBtn.click().catch(() => {});
    log('„Post" geklickt — warte auf Bestätigung…');
    await sleep(12000);
    fs.appendFileSync(DONE, path.basename(file) + '\n');
    log('✅ Gepostet (oder im Upload). In tiktok-upload-done.txt vermerkt.');
  } else { log('⚠️ Post-Button nicht gefunden — Video ist gesetzt, bitte in der Seite manuell „Post" klicken.'); }
  await p.screenshot({ path: path.join(process.cwd(), 'tiktok-upload-result.png') }).catch(() => {});
  process.exit(0);
})();
