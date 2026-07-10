#!/usr/bin/env node
/* youtube-shorts-upload.mjs — PC-CLAUDE-SKRIPT (Brave via CDP Port 9222, eingeloggtes Google-Konto).
 * Lädt die 3 vorbereiteten Shorts aus reels/shorts/ mit Metadaten hoch (YouTube Studio Web-UI).
 * Voraussetzung: Brand-Kanal «LuxeStyle CH» existiert (einmalig manuell anlegen falls nicht;
 * studio.youtube.com fragt beim ersten Besuch). NIE Zahlungs-/Monetarisierungs-Dialoge anfassen.
 * Aufruf: node automation/local/youtube-shorts-upload.mjs   [ONLY=showcase  → nur ein Video]
 */
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';

const REPO = path.resolve(process.cwd());
const VIDEOS = [
  { file: 'reels/shorts/showcase-45s-yt.mp4', key: 'showcase',
    title: 'LuxeStyle in 43 Sekunden – Mode, Schmuck & Gadgets 🇨🇭',
    desc: 'Der Schweizer Online-Shop: 10\'000+ Produkte, Gratis-Versand ab CHF 50, Kauf auf Rechnung (Klarna) & TWINT.\nShop: Link im Kanal-Profil → luxestyle.ch\n#shorts #onlineshop #schweiz #gadgets' },
  { file: 'reels/shorts/kleider-sommer-yt.mp4', key: 'kleider',
    title: 'Sommerkleider 2026 – Schweizer Shop mit Gratis-Versand',
    desc: 'Sommer-Looks von LuxeStyle 🇨🇭 Gratis-Versand ab CHF 50 · Kauf auf Rechnung (Klarna) & TWINT.\nShop: Link im Kanal-Profil → luxestyle.ch\n#shorts #sommermode #schweiz #fashion' },
  { file: 'reels/shorts/sie-und-ihn-yt.mp4', key: 'sieihn',
    title: 'Geschenkideen für Sie & Ihn – LuxeStyle Schweiz',
    desc: 'Schmuck, Uhren & mehr für Paare. 30 Tage Rückgabe · Klarna & TWINT.\nShop: Link im Kanal-Profil → luxestyle.ch\n#shorts #geschenkidee #schweiz #schmuck' },
];
const ONLY = process.env.ONLY || '';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = await ctx.newPage();

for (const v of VIDEOS) {
  if (ONLY && v.key !== ONLY) continue;
  const abs = path.join(REPO, v.file);
  if (!fs.existsSync(abs)) { console.log('FEHLT:', abs, '→ git pull nötig'); continue; }
  console.log('Upload:', v.file);
  await page.goto('https://studio.youtube.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  // Upload-Dialog öffnen (Kamera-Icon → Videos hochladen)
  const create = page.locator('#create-icon, ytcp-button#create-icon').first();
  await create.click().catch(() => {});
  await page.waitForTimeout(1200);
  await page.getByText(/Videos hochladen|Upload videos/i).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(abs);
  await page.waitForTimeout(8000);
  // Titel + Beschreibung
  const boxes = page.locator('#textbox');
  await boxes.nth(0).fill(v.title).catch(async () => { await boxes.nth(0).click(); await page.keyboard.press('Control+a'); await page.keyboard.type(v.title); });
  await boxes.nth(1).fill(v.desc).catch(async () => { await boxes.nth(1).click(); await page.keyboard.type(v.desc); });
  // Kein Kinder-Content
  await page.locator('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]').click().catch(() => {});
  // 3× Weiter, dann Öffentlich + Veröffentlichen
  for (let i = 0; i < 3; i++) { await page.locator('#next-button').click().catch(() => {}); await page.waitForTimeout(1500); }
  await page.locator('tp-yt-paper-radio-button[name="PUBLIC"]').click().catch(() => {});
  // Warten bis Verarbeitung Upload fertig genug ist
  await page.waitForTimeout(10000);
  await page.locator('#done-button').click().catch(() => {});
  await page.waitForTimeout(5000);
  console.log('  ✅ veröffentlicht (oder im Entwurf falls Verarbeitung läuft — in Studio prüfen)');
}
console.log('FERTIG. Danach pro Video: eigenen Kommentar mit Produkt-/Shop-URL anpinnen (manuell oder Folge-Skript).');
try { await page.close(); } catch {}
await browser.close();
