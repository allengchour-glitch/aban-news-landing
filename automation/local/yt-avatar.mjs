#!/usr/bin/env node
/* yt-avatar.mjs — PC-SKRIPT: setzt das YouTube-Kanal-Profilbild (Studio-UI, Brave 9222).
 * Bild: social/brand/profil-rund-dunkel.jpg (LS-Logo). Screenshots → yt-shots/. */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
fs.mkdirSync('automation/local/yt-shots', { recursive: true });
const shot = async (p, n) => { try { await p.screenshot({ path: `automation/local/yt-shots/${n}.png` }); } catch {} };
const log = m => { console.log(m); fs.appendFileSync('reports/yt-avatar.log', m + '\n'); };
const IMG = path.resolve('social/brand/profil-rund-dunkel.jpg');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = await browser.contexts()[0].newPage();
try {
  await page.goto('https://studio.youtube.com/channel/UCSfCEYjAsdOyYxyfTClXRZA/editing/details', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(12000);
  await shot(page, 'a1-details');
  // Avatar-Bereich: "Ändern"/"Change"-Button neben dem Profilbild
  const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 20000 });
  const changeBtn = page.getByRole('button', { name: /Ändern|Change|Hochladen|Upload|Bearbeiten|Edit/i }).first();
  await changeBtn.click({ timeout: 15000 }).catch(async () => {
    // Fallback: verstecktes input direkt füttern
    const inp = page.locator('input[type="file"]').first();
    const fc = await fileChooserPromise.catch(() => null);
    if (!fc) { await inp.setInputFiles(IMG); }
  });
  const fc = await fileChooserPromise.catch(() => null);
  if (fc) await fc.setFiles(IMG);
  await page.waitForTimeout(4000);
  await shot(page, 'a2-crop');
  // Zuschneide-Dialog bestätigen: "Fertig"/"Done"
  await page.getByRole('button', { name: /Fertig|Done|Übernehmen|Apply|Speichern|Save/i }).first().click({ timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await shot(page, 'a3-nachcrop');
  // Publizieren
  await page.locator('#publish-button, ytcp-button#publish-button').first().click({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(6000);
  await shot(page, 'a4-publiziert');
  log('FERTIG: Profilbild gesetzt (Screenshots a1-a4 prüfen).');
} catch (e) {
  log('FEHLER: ' + e.message.slice(0, 180));
  await shot(page, 'a9-fehler');
}
await browser.close();
