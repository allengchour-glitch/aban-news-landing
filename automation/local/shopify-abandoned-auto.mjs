#!/usr/bin/env node
/* shopify-abandoned-auto.mjs — PC-SKRIPT (Brave CDP 9222, Shopify-Admin eingeloggt).
 * Aktiviert die NATIVE Shopify-Marketing-Automation «Warenkorbabbruch» (User 2026-07-10 «4b mach du»).
 * Sicher: aktiviert nur die Standard-Vorlage, ändert keine Zahlungen/Einstellungen. Screenshots → reports/.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

fs.mkdirSync('automation/local/abandoned-shots', { recursive: true });
const shot = async (p, n) => { try { await p.screenshot({ path: `automation/local/abandoned-shots/${n}.png`, fullPage: false }); } catch {} };
const log = m => { console.log(m); fs.appendFileSync('reports/abandoned-mail.log', m + '\n'); };

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = await ctx.newPage();
try {
  await page.goto('https://admin.shopify.com/store/luxestyle-ch/marketing/automations', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  await shot(page, '01-automations');
  // Schon aktiv? (Liste zeigt «Warenkorbabbruch» mit Status Aktiv)
  const body = await page.evaluate(() => document.body.innerText);
  if (/Warenkorbabbruch|Abandoned checkout/i.test(body) && /Aktiv|Active/i.test(body)) {
    log('Automation scheint bereits zu existieren — prüfe Status im Screenshot 01.');
  }
  // Vorlagen-Galerie öffnen
  const createBtn = page.getByRole('button', { name: /Automatisierung erstellen|Create automation/i }).first();
  await createBtn.click({ timeout: 15000 }).catch(async () => {
    await page.getByText(/Automatisierung erstellen|Create automation/i).first().click({ timeout: 10000 });
  });
  await page.waitForTimeout(4000);
  await shot(page, '02-vorlagen');
  // Vorlage «Warenkorbabbruch / Abandoned checkout» wählen
  await page.getByText(/Warenkorbabbruch|Abandoned checkout/i).first().click({ timeout: 15000 });
  await page.waitForTimeout(3000);
  await shot(page, '03-vorlage');
  // «Vorlage verwenden» / «Use template»
  await page.getByRole('button', { name: /Vorlage verwenden|Use template|Verwenden/i }).first().click({ timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(6000);
  await shot(page, '04-editor');
  // Aktivieren: «Automatisierung aktivieren» / «Turn on automation»
  const onBtn = page.getByRole('button', { name: /aktivieren|Turn on/i }).first();
  await onBtn.click({ timeout: 15000 });
  await page.waitForTimeout(3000);
  await shot(page, '05-aktivieren');
  // Bestätigungs-Dialog
  await page.getByRole('button', { name: /^(Aktivieren|Turn on)$/i }).last().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await shot(page, '06-fertig');
  log('FERTIG: Warenkorbabbruch-Automation aktiviert (Screenshots 01–06 prüfen).');
} catch (e) {
  log('FEHLER: ' + e.message.slice(0, 200) + ' — Screenshots zeigen, wo es hakte.');
  await shot(page, '99-fehler');
}
try { await page.close(); } catch {}
await browser.close();
