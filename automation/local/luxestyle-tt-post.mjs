/**
 * LuxeStyle TikTok-Autoposter — STANDALONE (31.08.2026, kein Git noetig).
 * Liegt in einem eigenen Ordner (z. B. %USERPROFILE%\LuxeStyleTT) neben:
 *   - luxe-premium.wav   (Marken-Musik)
 *   - tiktok_queue.json  (lokale Kopie; wird bei jedem Lauf frisch vom Shop-CDN geholt)
 * Voraussetzungen: Browser laeuft mit --remote-debugging-port=9222 (start-browser.cmd),
 * einmalig als @luxestyle.ch angemeldet; ffmpeg + node + playwright-core (macht setup.ps1).
 * Bremsen: 1 Post/Kalendertag (tiktok_done.txt), Datei STOPP.txt stoppt alles,
 * DRY=1 stoppt vor dem Posten-Klick.
 */
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const QUEUE = path.join(DIR, 'tiktok_queue.json');
const LEDGER = path.join(DIR, 'tiktok_done.txt');
const STOPP = path.join(DIR, 'STOPP.txt');
const MUSIK = path.join(DIR, 'luxe-premium.wav');
const BEWEIS = path.join(DIR, 'beweise');
const QUEUE_URL = 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/tiktok_queue.json';
const DRY = process.env.DRY === '1';
const ONLY = process.env.ONLY || '';
// SOFORT=1: ausdruecklicher «jetzt posten»-Befehl des Betreibers (kommt ueber
// tiktok_befehl.json + luxestyle-tt-check.mjs) — nur DANN darf die 1/Tag-Bremse
// fallen. Die Slug-Dedup-Bremse (nie derselbe Beitrag zweimal) faellt NIE.
const SOFORT = process.env.SOFORT === '1';

const heute = new Date().toISOString().slice(0, 10);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

if (fs.existsSync(STOPP)) { log('STOPP.txt gesetzt — nichts wird gepostet.'); process.exit(0); }
const ledger = fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8') : '';
if (ledger.includes(heute) && !SOFORT) { log(`Heute (${heute}) wurde schon gepostet — 1/Tag ist die Regel.`); process.exit(0); }

// Queue frisch vom CDN — die Cloud haelt sie aktuell (Preise/ACTIVE gegengeprueft).
// Faellt der Download aus, gilt die lokale Kopie: lieber gestern geprueft als gar nicht.
try {
  const r = await fetch(QUEUE_URL + '?v=' + Date.now() /* ?t= wird vom Shopify-CDN fuer den Cache-Key IGNORIERT (gemessen 31.08.) — nur ?v= bustet */);
  if (r.ok) { fs.writeFileSync(QUEUE, Buffer.from(await r.arrayBuffer())); log('Queue frisch vom CDN geladen.'); }
  else log('Queue-Download HTTP', r.status, '— nutze lokale Kopie.');
} catch (e) { log('Queue-Download scheitert — nutze lokale Kopie.'); }
if (!fs.existsSync(QUEUE)) { log('tiktok_queue.json fehlt und CDN nicht erreichbar — Abbruch.'); process.exit(1); }

const q = JSON.parse(fs.readFileSync(QUEUE, 'utf8'));
const schonMal = new Set(ledger.split('\n').map(z => z.split('\t')[1]).filter(Boolean));
const kandidat = q.beitraege.find(b =>
  b.frei && b.video && !schonMal.has(b.slug) && (!ONLY || b.slug === ONLY));
if (!kandidat) { log('Kein offener Beitrag mit Video in der Queue — fertig.'); process.exit(0); }
log('Beitrag:', kandidat.slug);

// ---- ffmpeg: Marken-Musik unterlegen (stumm posten schadet mehr als nicht posten) ----
let ffmpeg = 'ffmpeg';
try { execFileSync(ffmpeg, ['-version'], { stdio: 'ignore' }); }
catch {
  const kandidatenPfad = [
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'),
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
  ].find(p => p && fs.existsSync(p));
  if (kandidatenPfad) ffmpeg = kandidatenPfad;
  else { log('ffmpeg fehlt. Einmalig:  winget install Gyan.FFmpeg  — dann Terminal neu.'); process.exit(1); }
}
if (!fs.existsSync(MUSIK)) { log('luxe-premium.wav fehlt im Ordner — setup.ps1 erneut laufen lassen.'); process.exit(1); }

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
  .catch(() => { log('Kein Browser auf Port 9222 — start-browser.cmd zuerst.'); process.exit(1); });
const ctx = browser.contexts()[0];
const page = await ctx.newPage();
await page.goto('https://www.tiktok.com/tiktokstudio/upload', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
if (page.url().includes('/login')) { log('Browser ist NICHT als @luxestyle.ch angemeldet — im Bot-Fenster einloggen.'); process.exit(1); }

const fileInput = page.locator('input[type="file"]').first();
await fileInput.setInputFiles(fertig);
log('Upload laeuft — warte auf Verarbeitung …');
await page.waitForTimeout(25000);
await page.screenshot({ path: path.join(BEWEIS, kandidat.slug + '-1-editor.png') });

// Caption: TikTok befuellt sie mit dem DATEINAMEN vor — komplett ersetzen.
const editor = page.locator('div[contenteditable="true"]').first();
await editor.click();
await page.keyboard.press('Control+a');
await page.keyboard.press('Delete');
const zeilen = kandidat.caption.split('\n');
for (let i = 0; i < zeilen.length; i++) {
  if (zeilen[i]) { await page.keyboard.type(zeilen[i], { delay: 12 }); await page.keyboard.press('Escape').catch(() => {}); }
  if (i < zeilen.length - 1) await page.keyboard.press('Enter');
}
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(BEWEIS, kandidat.slug + '-2-caption.png') });

if (DRY) { log('[DRY] Stopp VOR dem Posten-Klick — Screenshots im Ordner beweise\\.'); process.exit(0); }

const posten = page.locator('[data-e2e="post_video_button"], button:has-text("Posten"), button:has-text("Post"), button:has-text("Veröffentlichen")').first();
await posten.click({ timeout: 20000 });
await page.waitForTimeout(12000);
await page.screenshot({ path: path.join(BEWEIS, kandidat.slug + '-3-nach-posten.png') });

fs.appendFileSync(LEDGER, `${heute}\t${kandidat.slug}\tvideo+luxe-premium\n`);
log(`✅ gepostet: ${kandidat.slug} — Beweis-Screenshots im Ordner beweise\\.`);
