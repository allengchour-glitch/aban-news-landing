#!/usr/bin/env node
/* bigbuy-order-port.mjs — echten Carrier + Sendungsstatus einer BigBuy-Bestellung über das eingeloggte Brave
 * (CDP 9222) auslesen. LÄUFT NUR AM PC (Brave bei bigbuy.eu eingeloggt). Read-only: navigiert, screenshottet,
 * dumpt sichtbaren Text — damit die Cloud den echten Carrier/Status/ETA sieht (Shopify/parcelsapp zeigen nichts).
 *
 * Hintergrund #1004: Shopify-Tracking bb-S3414715 / 8420327578013 zeigt keine Scan-Daten → BigBuy-Plattform ist
 * die verlässliche Quelle für Carrier + Live-Status.
 * ENV: [SEARCH=S3414715] (Suchbegriff in der Bestellliste) · [CDP_URL=http://localhost:9222]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
const CDP = process.env.CDP_URL || 'http://localhost:9222';
const SEARCH = process.env.SEARCH || 'S3414715';
const SHOTS = 'automation/local/bigbuy-shots';
try { mkdirSync(SHOTS, { recursive: true }); mkdirSync('reports', { recursive: true }); } catch {}
const report = [];
const R = m => { report.push(m); console.log('bigbuy:', m); try { writeFileSync('reports/bigbuy-order.txt', `${new Date().toISOString()}\n` + report.join('\n') + '\n'); } catch {} };

const URLS = [
  'https://www.bigbuy.eu/en/my-account/orders',
  'https://www.bigbuy.eu/en/dropshipping/orders',
  'https://www.bigbuy.eu/my-account/orders',
  'https://www.bigbuy.eu/',
];
async function readPage(page) {
  try {
    return await page.evaluate(() => {
      const txt = (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 2000);
      const links = [...document.querySelectorAll('a')].map(a => (a.innerText || '').trim()).filter(s => s && s.length < 40).slice(0, 30);
      return { txt, links };
    });
  } catch (e) { return { txt: '', links: [], err: String(e).slice(0, 80) }; }
}

(async () => {
  let chromium;
  try { ({ chromium } = await import('playwright')); } catch { try { ({ chromium } = await import('playwright-core')); } catch (e) { R('❌ playwright fehlt: ' + e.message); process.exit(1); } }
  let browser;
  try { browser = await chromium.connectOverCDP(CDP); }
  catch (e) { R('❌ Kein Brave auf ' + CDP + '. Brave 9222 + bei bigbuy.eu eingeloggt. ' + e.message); process.exit(1); }
  const ctx = browser.contexts()[0] || (await browser.newContext());
  const page = await ctx.newPage();
  let ok = false;
  for (const url of URLS) {
    try {
      R('→ öffne ' + url);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(4500);
      const cur = page.url();
      if (/login|signin|connexion|iniciar/i.test(cur)) { R('⚠️ nicht eingeloggt (Login-Redirect): ' + cur + ' → im Brave bei bigbuy.eu einloggen.'); continue; }
      // Falls ein Suchfeld existiert, Suchbegriff eingeben
      try { const s = page.locator('input[type=search],input[name*=search i],input[placeholder*=order i],input[placeholder*=search i]').first(); if (await s.count()) { await s.fill(SEARCH); await s.press('Enter'); await page.waitForTimeout(3500); R('   Suche „' + SEARCH + '" eingegeben.'); } } catch {}
      const v = await readPage(page);
      const shot = `${SHOTS}/bigbuy-${URLS.indexOf(url)}.png`;
      await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
      R('   Screenshot: ' + shot + '  URL: ' + cur);
      R('   Text (Auszug): ' + (v.txt || '').slice(0, 900));
      const t = (v.txt || '');
      const found = /S3414715|Marti|Grenchen|8420327578013/i.test(t);
      const carrier = (t.match(/(Correos|GLS|SEUR|DHL|DPD|UPS|Swiss ?Post|Post CH|Colissimo|Chronopost|Envialia|CTT|Cainiao|Asendia)/i) || [])[0];
      const trk = (t.match(/\b\d{10,}\b/) || [])[0];
      if (found) R('   → Bestellung/Empfänger im Text gefunden.');
      if (carrier) R('   → Carrier erkannt: ' + carrier);
      if (trk) R('   → mögliche Tracking-Nummer im Text: ' + trk);
      if ((v.links || []).length) ok = true;
      if (found || carrier) { ok = true; break; }
    } catch (e) { R('   Fehler bei ' + url + ': ' + String(e.message).slice(0, 120)); }
  }
  if (!ok) R('⚠️ BigBuy-Bestellliste nicht erreicht — Screenshots prüfen (Login nötig oder andere URL/Panel).');
  R('Fertig. Screenshots ' + SHOTS + '/, Bericht reports/bigbuy-order.txt. (Für ETA: Carrier + Tracking-Nr aus dem Screenshot ablesen.)');
  try { await page.close(); } catch {}
  try { await browser.close(); } catch {}
})().catch(e => { R('Fehler: ' + e.message); process.exit(1); });
