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
  'https://www.bigbuy.eu/en/my-account.html',
  'https://www.bigbuy.eu/en/order-history',
  'https://www.bigbuy.eu/en/tiendab2b.html',
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
  let ok = false, shotN = 0;
  const grab = async (tag) => { const shot = `${SHOTS}/bigbuy-${shotN++}-${tag}.png`; await page.screenshot({ path: shot, fullPage: true }).catch(() => {}); const v = await readPage(page); R('   Screenshot: ' + shot + '  URL: ' + page.url()); R('   Text: ' + (v.txt || '').slice(0, 700)); const t = v.txt || ''; const carrier = (t.match(/(Correos|GLS|SEUR|DHL|DPD|UPS|Swiss ?Post|Post CH|Colissimo|Chronopost|Envialia|CTT|Cainiao|Asendia|Packlink|InPost)/i) || [])[0]; if (/S3414715|Marti|Grenchen|8420327578013/i.test(t)) R('   → Bestellung/Empfänger gefunden.'); if (carrier) { R('   → Carrier: ' + carrier); ok = true; } return t; };
  // 1) Direkte Order-URLs probieren
  for (const url of URLS) {
    try {
      R('→ öffne ' + url);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(4500);
      if (/\/login|signin|connexion|iniciar-sesion/i.test(page.url())) { R('⚠️ Login-Redirect: ' + page.url()); continue; }
      const t = await grab('url' + URLS.indexOf(url));
      if (/S3414715|Marti|Grenchen/i.test(t)) { ok = true; break; }
    } catch (e) { R('   Fehler ' + url + ': ' + String(e.message).slice(0, 100)); }
  }
  // 2) Über das Kontomenü klicken: "My account" -> Orders/My orders
  if (!ok) {
    try {
      R('→ Kontomenü-Klickweg (My account → Orders)');
      await page.goto('https://www.bigbuy.eu/en/tiendab2b.html', { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(3500);
      for (const acc of ['My account', 'Mein Konto', 'Account']) { try { const a = page.getByText(new RegExp(acc, 'i')).first(); if (await a.count()) { await a.click({ timeout: 4000 }); await page.waitForTimeout(1500); R('   „' + acc + '" geklickt'); break; } } catch {} }
      await grab('accountmenu');
      for (const ord of ['My orders', 'Orders', 'Bestellungen', 'Order history', 'Meine Bestellungen', 'Pedidos']) {
        try { const l = page.getByRole('link', { name: new RegExp(ord, 'i') }).first(); if (await l.count()) { await l.click({ timeout: 5000 }); await page.waitForTimeout(4000); R('   „' + ord + '" geöffnet'); const t = await grab('orders'); if (/S3414715|Marti|Grenchen/i.test(t)) ok = true; break; } } catch {} }
      // In die passende Bestellung klicken (Zeile mit Empfänger/Ref)
      for (const key of ['S3414715', 'Marti', 'Grenchen', 'Laterne', 'Boho']) {
        try { const row = page.getByText(new RegExp(key, 'i')).first(); if (await row.count()) { await row.click({ timeout: 4000 }); await page.waitForTimeout(3500); R('   Bestellung „' + key + '" geöffnet'); await grab('orderdetail'); ok = true; break; } } catch {}
      }
    } catch (e) { R('   Kontomenü-Fehler: ' + String(e.message).slice(0, 120)); }
  }
  if (!ok) R('⚠️ Bestellung/Carrier nicht sicher gelesen — Screenshots prüfen (ich sehe sie mir an).');
  R('Fertig. Screenshots ' + SHOTS + '/, Bericht reports/bigbuy-order.txt. (Für ETA: Carrier + Tracking-Nr aus dem Screenshot ablesen.)');
  try { await page.close(); } catch {}
  try { await browser.close(); } catch {}
})().catch(e => { R('Fehler: ' + e.message); process.exit(1); });
