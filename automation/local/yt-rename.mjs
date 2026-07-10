#!/usr/bin/env node
/* yt-rename.mjs — PC-SKRIPT: benennt den YouTube-Kanal in «LuxeStyle CH» um (Studio-UI, Brave 9222). */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
fs.mkdirSync('automation/local/yt-shots', { recursive: true });
const shot = async (p, n) => { try { await p.screenshot({ path: `automation/local/yt-shots/${n}.png` }); } catch {} };
const log = m => { console.log(m); fs.appendFileSync('reports/yt-rename.log', m + '\n'); };
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = await browser.contexts()[0].newPage();
try {
  await page.goto('https://studio.youtube.com/channel/UCSfCEYjAsdOyYxyfTClXRZA/editing/details', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(12000);
  await shot(page, '1-editing');
  const name = page.locator('#brand-name-input input, ytcp-social-suggestion-input input, tp-yt-paper-input#input input').first();
  await name.click({ timeout: 20000 });
  await page.keyboard.press('Control+a');
  await page.keyboard.type('LuxeStyle CH', { delay: 40 });
  await page.waitForTimeout(1500);
  await shot(page, '2-name');
  await page.locator('#publish-button, ytcp-button#publish-button').first().click({ timeout: 15000 });
  await page.waitForTimeout(6000);
  await shot(page, '3-publiziert');
  log('FERTIG: Kanal-Name auf LuxeStyle CH gesetzt (Screenshots yt-shots/).');
} catch (e) {
  log('FEHLER: ' + e.message.slice(0, 180));
  await shot(page, '9-fehler');
}
try { await page.close(); } catch {}
await browser.close();
