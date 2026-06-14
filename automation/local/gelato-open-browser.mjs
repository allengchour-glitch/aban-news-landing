#!/usr/bin/env node
/* LuxeStyle — gelato-open-browser.mjs  (LOKAL auf dem PC ausführen!)
 * --------------------------------------------------------------------
 * Verbindet sich mit deinem laufenden, EINGELOGGTEN Brave über den Debug-Port 9222
 * (CDP, via puppeteer-core — robuster als Playwright bei Brave) und öffnet das
 * Gelato-Dashboard als Startpunkt für PC-Claude (siehe dropship/GELATO-BROWSER-AUFTRAG.md).
 * Macht NICHTS Destruktives: öffnet nur die Seite + Screenshot. Lässt Brave offen.
 *
 * VORAUSSETZUNG (hast du schon):
 *   Brave läuft mit:  --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\brave-agent"
 *   und du bist bei dashboard.gelato.com eingeloggt.
 *
 * AUSFÜHREN (PowerShell im Repo-Ordner):
 *   npm install puppeteer-core
 *   node automation/local/gelato-open-browser.mjs
 *
 * ENV: CDP (Default http://localhost:9222) · GELATO_URL (Default Dashboard-Produkte)
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CDP = process.env.CDP || 'http://localhost:9222';
const URL = process.env.GELATO_URL || 'https://dashboard.gelato.com/products';
const SHOTS = path.resolve('./gelato-screenshots');
fs.mkdirSync(SHOTS, { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const STEPS = `
── Was PC-Claude jetzt tun soll (Details: dropship/GELATO-BROWSER-AUFTRAG.md) ──
A) GELATO Loungewear-Kapsel → Store "LuxeStyle":
   1. "Create product" → Apparel
   2. Hoodie / Jogger / Sweatshirt / T-Shirt / Tank-Top wählen
   3. Schweizer Design (Edelweiss/Matterhorn/Cow/Fondue/Alpsee/Chalet) als ZENTRIERTEN Brustdruck
   4. Farbe (Schwarz/Grau/Creme) + DE-Titel grob + "Publish to LuxeStyle"
   5. Wenn im Shop → Cloud-Session sagen: "Gelato-Loungewear ist im Shop"
B) PRINTFUL (printful.com) fuer echte Leggings/Sport-BH (Gelato kann das nicht).
Nur NEUE Produkte anlegen + publishen — nichts loeschen.
`;

async function main() {
  log(`Verbinde mit Brave über CDP ${CDP} (puppeteer-core) …`);
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: CDP, defaultViewport: null, protocolTimeout: 0 });
  } catch (e) {
    console.error(`❌ Konnte nicht mit Brave verbinden (${CDP}).`);
    console.error('   → Brave KOMPLETT schliessen, dann so starten (eine Zeile):');
    console.error('     & "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe" --remote-debugging-port=9222 --user-data-dir="$env:USERPROFILE\\brave-agent"');
    console.error('   → dort bei dashboard.gelato.com einloggen, dann Skript erneut ausführen.');
    console.error('   Fehler:', e.message);
    process.exit(1);
  }
  log('✅ Mit Brave verbunden.');
  let page;
  try {
    page = await browser.newPage();
    log(`Öffne Gelato: ${URL}`);
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 4000));
    const shot = path.join(SHOTS, `gelato-${Date.now()}.png`);
    await page.screenshot({ path: shot });
    const title = await page.title().catch(() => '');
    log(`✅ Gelato geöffnet. Seite: "${title}"`);
    log(`Screenshot: ${shot}`);
    if (/log\s?in|sign\s?in/i.test(title)) log('⚠️ Login-Seite → erst bei dashboard.gelato.com einloggen, dann Produkte anlegen.');
  } catch (e) {
    console.error('⚠️ Seite konnte nicht geöffnet werden:', e.message);
  }
  console.log(STEPS);
  log('Browser bleibt offen — PC-Claude übernimmt jetzt visuell.');
  browser.disconnect(); // trennt nur die Verbindung; Brave-Fenster bleibt offen
}

main().catch((e) => { console.error('Fehler:', e.message); process.exit(1); });
