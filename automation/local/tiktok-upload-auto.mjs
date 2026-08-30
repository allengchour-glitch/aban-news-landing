#!/usr/bin/env node
/* tiktok-upload-auto.mjs — PC-CLAUDE-SKRIPT: postet EINEN TikTok-Beitrag pro Tag automatisch.
 *
 * Warum ueber den Browser: Die Content-Posting-API der App «luxe» ist seit 18.08. in Review
 * (am 29.08. per vollstaendigem Nutzer-Fluss gemessen: unauthorized_client). Der einzige
 * heute funktionierende Weg ist der ANGEMELDETE Browser des Betreibers — dieses Skript
 * steuert ihn per CDP, wie youtube-shorts-upload.mjs es fuer YouTube vormacht.
 *
 * VORAUSSETZUNGEN (einmalig, siehe dropship/TIKTOK-AUTO-SETUP.md):
 *   1. Browser laeuft mit --remote-debugging-port=9222, angemeldet als @luxestyle.ch
 *   2. winget install Gyan.FFmpeg   (Musik-Schritt)
 *   3. npm i playwright-core        (im Repo-Ordner)
 *
 * WAS ES TUT:
 *   - liest dropship/tiktok_queue.json (schreibt der Cloud-Generator, prueft Preise/ACTIVE)
 *   - nimmt den ersten freien, noch nicht geposteten Beitrag MIT VIDEO
 *   - legt automation/music/luxe-premium.wav unter das stumme Video (ffmpeg, Video-Strom
 *     unangetastet) — Hausregel VIDEO-PRAEFERENZEN: ohne Voiceover, MIT der Marken-Musik.
 *     NIE stumm posten.
 *   - laedt hoch, ersetzt die von TikTok vorbefuellte Caption (Dateiname!) durch die
 *     gepruefte Caption, klickt Posten, macht Beweis-Screenshots nach tiktok-auto/
 *   - traegt den Beitrag in dropship/_tiktok_upload_done.txt ein (committen/pushen!)
 *
 * BREMSEN (fest eingebaut, nicht per Env abschaltbar):
 *   - hoechstens EIN Post pro Kalendertag (Ledger-Datum)
 *   - Datei dropship/_TIKTOK_STOPP stoppt alles (wie _SOCIAL_STOPP fuer IG/FB)
 *   - "frei": false in der Queue wird nie gepostet
 * ENV: DRY=1 = alles bis VOR den Posten-Klick, dann Screenshot + Abbruch.
 *      ONLY=<slug> = genau diesen Beitrag nehmen.
 */
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(process.cwd());
const QUEUE = path.join(REPO, 'dropship', 'tiktok_queue.json');
const LEDGER = path.join(REPO, 'dropship', '_tiktok_upload_done.txt');
const STOPP = path.join(REPO, 'dropship', '_TIKTOK_STOPP');
const MUSIK = path.join(REPO, 'automation', 'music', 'luxe-premium.wav');
const BEWEIS = path.join(REPO, 'tiktok-auto');
const DRY = process.env.DRY === '1';
const ONLY = process.env.ONLY || '';

const heute = new Date().toISOString().slice(0, 10);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// ---- Bremsen ---------------------------------------------------------------
if (fs.existsSync(STOPP)) { log('dropship/_TIKTOK_STOPP gesetzt — nichts wird gepostet.'); process.exit(0); }
const ledger = fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8') : '';
if (ledger.includes(heute)) { log(`Heute (${heute}) wurde schon gepostet — 1/Tag ist die Regel.`); process.exit(0); }
if (!fs.existsSync(QUEUE)) { log('dropship/tiktok_queue.json fehlt — erst git pull.'); process.exit(1); }

const q = JSON.parse(fs.readFileSync(QUEUE, 'utf8'));
const schonMal = new Set(ledger.split('\n').map(z => z.split('\t')[1]).filter(Boolean));
const kandidat = q.beitraege.find(b =>
  b.frei && b.video && !schonMal.has(b.slug) && (!ONLY || b.slug === ONLY));
if (!kandidat) { log('Kein offener Beitrag mit Video in der Queue — fertig.'); process.exit(0); }
log('Beitrag:', kandidat.slug);

// ---- ffmpeg: Marken-Musik unterlegen --------------------------------------
let ffmpeg = 'ffmpeg';
try { execFileSync(ffmpeg, ['-version'], { stdio: 'ignore' }); }
catch { log('ffmpeg fehlt. Einmalig:  winget install Gyan.FFmpeg  — dann Terminal neu. ' +
            'OHNE Musik wird NICHT gepostet (stummes Video schadet mehr als keins).'); process.exit(1); }
if (!fs.existsSync(MUSIK)) { log('Marken-Musik fehlt:', MUSIK, '— git pull.'); process.exit(1); }

fs.mkdirSync(BEWEIS, { recursive: true });
const stumm = path.join(BEWEIS, kandidat.slug + '-stumm.mp4');
const fertig = path.join(BEWEIS, kandidat.slug + '-musik.mp4');
log('Lade Video vom CDN …');
const r = await fetch(kandidat.video);
if (!r.ok) { log('CDN-Download scheitert:', r.status); process.exit(1); }
fs.writeFileSync(stumm, Buffer.from(await r.arrayBuffer()));
log('Musik unterlegen (Video-Strom bleibt unangetastet) …');
execFileSync(ffmpeg, ['-y', '-i', stumm, '-i', MUSIK,
  '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k',
  '-shortest', fertig], { stdio: 'inherit' });

// ---- Browser: hochladen ----------------------------------------------------
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
  .catch(() => { log('Kein Browser auf Port 9222. Browser mit --remote-debugging-port=9222 starten (Setup-Doku).'); process.exit(1); });
const ctx = browser.contexts()[0];
const page = await ctx.newPage();
await page.goto('https://www.tiktok.com/tiktokstudio/upload', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
if (page.url().includes('/login')) { log('Browser ist NICHT als @luxestyle.ch angemeldet — Abbruch.'); process.exit(1); }

const fileInput = page.locator('input[type="file"]').first();
await fileInput.setInputFiles(fertig);
log('Upload laeuft — warte auf Verarbeitung …');
// TikTok zeigt den Editor erst nach der Verarbeitung; grosszuegig warten, dann pruefen.
await page.waitForTimeout(25000);
await page.screenshot({ path: path.join(BEWEIS, kandidat.slug + '-1-editor.png') });

// Caption: TikTok befuellt sie mit dem DATEINAMEN vor — komplett ersetzen.
const editor = page.locator('div[contenteditable="true"]').first();
await editor.click();
await page.keyboard.press('Control+a');
await page.keyboard.press('Delete');
// Zeilenweise tippen (Enter im contenteditable), Hashtag-Popups mit Escape schliessen.
const zeilen = kandidat.caption.split('\n');
for (let i = 0; i < zeilen.length; i++) {
  if (zeilen[i]) { await page.keyboard.type(zeilen[i], { delay: 12 }); await page.keyboard.press('Escape').catch(() => {}); }
  if (i < zeilen.length - 1) await page.keyboard.press('Enter');
}
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(BEWEIS, kandidat.slug + '-2-caption.png') });

if (DRY) { log('[DRY] Stopp VOR dem Posten-Klick — Screenshots in tiktok-auto/.'); process.exit(0); }

// Posten. Studio nennt den Knopf je nach Sprache anders; data-e2e ist am stabilsten.
const posten = page.locator('[data-e2e="post_video_button"], button:has-text("Posten"), button:has-text("Post"), button:has-text("Veröffentlichen")').first();
await posten.click({ timeout: 20000 });
await page.waitForTimeout(12000);
await page.screenshot({ path: path.join(BEWEIS, kandidat.slug + '-3-nach-posten.png') });

fs.appendFileSync(LEDGER, `${heute}\t${kandidat.slug}\tvideo+luxe-premium\n`);
log(`✅ gepostet: ${kandidat.slug} — Ledger fortgeschrieben. Bitte committen/pushen (git add dropship/_tiktok_upload_done.txt && git commit && git push), sonst kennt die Cloud den Post nicht.`);
log('Beweis-Screenshots: tiktok-auto/' + kandidat.slug + '-*.png — kurz ansehen.');
