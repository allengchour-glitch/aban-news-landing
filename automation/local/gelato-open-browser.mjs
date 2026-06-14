#!/usr/bin/env node
/* LuxeStyle — gelato-open-browser.mjs  (LOKAL auf dem PC ausführen!)
 * --------------------------------------------------------------------
 * Verbindet sich mit deinem bereits laufenden, EINGELOGGTEN Brave über den
 * Debug-Port 9222 (CDP) und öffnet das Gelato-Dashboard auf der Produkt-Anlage —
 * als Startpunkt für PC-Claude, der dann visuell die Loungewear-Produkte anlegt
 * (siehe dropship/GELATO-BROWSER-AUFTRAG.md). Macht NICHTS Destruktives:
 * öffnet nur die Seite + Screenshot.
 *
 * VORAUSSETZUNG (hast du schon):
 *   Brave läuft mit:  --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\brave-agent"
 *   und du bist bei dashboard.gelato.com eingeloggt.
 *
 * AUSFÜHREN (PowerShell im Repo-Ordner):
 *   npm install playwright-core
 *   node automation/local/gelato-open-browser.mjs
 *
 * ENV: CDP (Default http://localhost:9222) · GELATO_URL (Default Dashboard-Produkte)
 */
import { chromium } from 'playwright-core';
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
B) PRINTFUL (printful.com) für echte Leggings/Sport-BH (Gelato kann das nicht).
Nur NEUE Produkte anlegen + publishen — nichts löschen.
`;

async function main() {
  log(`Verbinde mit Brave über CDP ${CDP} …`);
  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP);
  } catch (e) {
    console.error(`❌ Konnte nicht mit Brave verbinden (${CDP}).`);
    console.error('   → Brave mit  --remote-debugging-port=9222  starten und eingeloggt sein.');
    console.error('   Fehler:', e.message);
    process.exit(1);
  }
  const ctx = browser.contexts()[0] || (await browser.newContext());
  const page = await ctx.newPage();
  log(`Öffne Gelato: ${URL}`);
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);
    const shot = path.join(SHOTS, `gelato-${Date.now()}.png`);
    await page.screenshot({ path: shot, fullPage: false });
    log(`✅ Gelato geöffnet. Screenshot: ${shot}`);
    const title = await page.title().catch(() => '');
    log(`Seite: "${title}"`);
    if (/log\s?in|sign\s?in/i.test(title)) log('⚠️ Sieht nach Login-Seite aus → erst bei dashboard.gelato.com einloggen.');
  } catch (e) {
    console.error('⚠️ Seite konnte nicht vollständig geladen werden:', e.message);
  }
  console.log(STEPS);
  log('Browser bleibt offen — PC-Claude übernimmt jetzt visuell. (Skript beendet sich, Brave läuft weiter.)');
  // Verbindung trennen, OHNE den Browser zu schliessen (kein browser.close()):
  await browser.close().catch(() => {}); // trennt nur die CDP-Verbindung; Brave-Fenster bleibt
}

main().catch((e) => { console.error('Fehler:', e.message); process.exit(1); });
