#!/usr/bin/env node
/* LuxeStyle — profil-politur-browser.mjs (LOKAL auf dem PC ausführen!)
 * ---------------------------------------------------------------------
 * Poliert Instagram + TikTok-Profil OHNE API: steuert dein bereits EINGELOGGTES
 * Brave über den Debug-Port 9222 (Browser-Automation, kein Passwort nötig).
 *
 * VORAUSSETZUNG (hast du schon):
 *   Brave läuft mit:  --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\brave-agent"
 *   und du bist dort bei instagram.com + tiktok.com eingeloggt.
 *
 * AUSFÜHREN (PowerShell, im Repo-Ordner oder Datei einzeln herunterladen):
 *   npm install playwright-core
 *   node automation/local/profil-politur-browser.mjs
 *
 * Was es tut: IG-Bio/Name setzen · TikTok-Name/Bio setzen · Profilbild hochladen (beide) ·
 * Screenshots nach ./politur-screenshots/ (Beweis). Jeder Schritt einzeln abgesichert —
 * was nicht klappt, wird klar gemeldet (Selektoren können sich ändern).
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const BIO_IG = '🇨🇭 Schweizer Online-Shop\nMode · Schmuck · Uhren · dein eigenes Design 🎨\n📦 Weltweiter Versand · 30 Tage Rückgabe\n🎁 –10 % mit Code WELCOME10 👇';
const NAME_IG = 'LuxeStyle · Schweizer Online-Shop';
const BIO_TT = '🇨🇭 Schweizer Shop · Mode·Schmuck·Uhren\n–10 % Code WELCOME10 · Link 👇';
const NAME_TT = 'LuxeStyle · Schweizer Shop';
const PIC_URL = 'https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/main/social/brand/profil-rund-dunkel.jpg';

const SHOTS = path.resolve('./politur-screenshots'); fs.mkdirSync(SHOTS, { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11,19), ...a);

function download(url, dest){
  return new Promise((res, rej) => {
    const f = fs.createWriteStream(dest);
    https.get(url, r => { if(r.statusCode!==200) return rej(new Error('HTTP '+r.statusCode));
      r.pipe(f); f.on('finish', ()=>f.close(()=>res(dest))); }).on('error', rej);
  });
}

async function shot(page, name){ try{ await page.screenshot({ path: path.join(SHOTS, name), fullPage:false }); log('📸', name);}catch{} }

async function firstVisible(page, selectors){
  for (const s of selectors) {
    try { const el = page.locator(s).first(); if (await el.isVisible({ timeout: 1500 })) return el; } catch {}
  }
  return null;
}

const PIC = path.join(SHOTS, 'profilbild.jpg');
await download(PIC_URL, PIC).then(()=>log('Profilbild geladen.')).catch(e=>log('⚠️ Bild-Download:', e.message));

log('Verbinde mit Brave (localhost:9222)…');
const browser = await chromium.connectOverCDP('http://localhost:9222').catch(e => {
  console.error('❌ Keine Verbindung zu Brave. Läuft es mit --remote-debugging-port=9222 ?\n', e.message);
  process.exit(1);
});
const ctx = browser.contexts()[0] || await browser.newContext();
const page = await ctx.newPage();
const results = [];

/* ---------------- INSTAGRAM ---------------- */
try {
  log('— INSTAGRAM —');
  await page.goto('https://www.instagram.com/accounts/edit/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3500);
  if (page.url().includes('login')) throw new Error('Nicht eingeloggt (Login-Seite).');

  // Bio (textarea) + Name/Website-Felder
  const bio = await firstVisible(page, ['textarea#pepBio','textarea[aria-label*="Bio" i]','textarea[aria-label*="Steckbrief" i]','form textarea']);
  if (bio) { await bio