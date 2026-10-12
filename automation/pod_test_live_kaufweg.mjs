// Echter Kaufweg auf luxestyle.ch mit v5 (nur im Testbrowser umgelenkt). Warenkorb danach geleert.
import fs from 'node:fs';
import path from 'node:path';
import { starte } from '/home/user/aban-news-landing/tools/browser.mjs';
const WIDGET = fs.readFileSync(path.resolve(process.argv[2]), 'utf8');
const URL = 'https://luxestyle.ch/products/' + (process.env.PRODUKT || 'buegeltransfer-selbst-gestalten');
const OUT = path.resolve('./out_live'); fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a);
const browser = await starte();
let umgelenkt = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'de-CH' });
  if (!process.env.NOROUTE) await ctx.route(/lspod-designer-v\d+\.js/, (r) => { umgelenkt++; r.fulfill({ status: 200, contentType: 'text/javascript', body: WIDGET }); });
  const geladen = []; ctx.on('request', (r) => { if (/lspod-designer/.test(r.url())) geladen.push(r.url()); });
  const s = await ctx.newPage();
  const fehler = []; s.on('pageerror', (e) => fehler.push(e.message));
  const antw = await s.goto(URL, { waitUntil: 'load', timeout: 90000 });
  log('Seite:', antw && antw.status(), '· Skript umgelenkt:', umgelenkt, '· geladen:', geladen.join(' '));
  for (const t of ['Nur notwendige', 'Alle akzeptieren', 'Akzeptieren']) {
    const b = s.locator(`button:has-text("${t}")`).first();
    if (await b.count()) { await b.click({ timeout: 3000 }).catch(() => {}); break; }
  }
  await s.waitForSelector('.lspod-designer[data-init="1"]', { timeout: 20000 });
  const formVar = await s.evaluate(() => { const f = document.querySelector('form[action*="/cart/add"]'); const i = f && (f.querySelector('[name="id"]:checked') || f.querySelector('[name="id"]')); return i ? i.value : null; });
  const dataVar = await s.evaluate(() => document.querySelector('.lspod-designer').getAttribute('data-variant'));
  const v5da = await s.evaluate(() => !!document.querySelector('textarea') && [...document.querySelectorAll('span')].some((x) => x.textContent === 'Ebenen'));
  log('Formular-Variante:', formVar, '· data-variant:', dataVar, '· v5-Oberfläche:', v5da);
  await s.locator('.lspod-designer button:has-text("Text")').first().click();
  await s.fill('.lspod-designer textarea', 'LuxeStyle\nTest v5');
  await s.locator('.lspod-designer textarea').press('Tab');
  await s.locator('.lspod-designer').screenshot({ path: path.join(OUT, 'live-editor.png') });
  const nav = s.waitForURL(/\/cart/, { timeout: 60000 }).then(() => true).catch(() => false);
  await s.locator('.lspod-designer button:has-text("Warenkorb")').click();
  const zumKorb = await nav;
  const meldung = await s.evaluate(() => { const m = [...document.querySelectorAll('.lspod-designer div')].find((d) => /Warenkorb|hinzuf|Fehler|nicht/i.test(d.textContent) && d.children.length === 0); return m ? m.textContent : ''; }).catch(() => '');
  log('Weiterleitung zum Warenkorb:', zumKorb, meldung ? '· Meldung: ' + meldung : '');
  const korb = await s.evaluate(() => fetch('/cart.js').then((r) => r.json()));
  const pos = (korb.items || [])[0];
  log('Warenkorb-Positionen:', (korb.items || []).length);
  if (pos) {
    log('Variante:', pos.variant_id, pos.variant_title, '· Preis', pos.final_price / 100);
    for (const [k, v] of Object.entries(pos.properties || {})) log('  Eigenschaft', JSON.stringify(k), '=', String(v).slice(0, 110));
  }
  fs.writeFileSync(path.join(OUT, 'cart.json'), JSON.stringify(korb, null, 1));
  await s.evaluate(() => fetch('/cart/clear.js', { method: 'POST' }));
  const leer = await s.evaluate(() => fetch('/cart.js').then((r) => r.json()).then((j) => j.item_count));
  log('Warenkorb danach geleert:', leer === 0);
  log('Browserfehler:', fehler.length ? fehler.slice(0, 3) : 'keine');
} finally { await browser.close(); }
