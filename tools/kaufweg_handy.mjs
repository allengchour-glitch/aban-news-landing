/**
 * tools/kaufweg_handy.mjs — den Kaufweg auf dem Handy wirklich gehen (10.10.2026).
 *
 * ANLASS: Sidekick-Empfehlung «Kaufweg auf dem Handy testen: Startseite → Produkt → Checkout; Variantenwahl und
 * Kaufknopf verständlich? Überraschen Versandkosten spät?» — Tabellen zeigen 97 % Absprung, nicht WARUM.
 *
 * WAS ES TUT (echtes Chromium, iPhone-Masse 390×844, Touch): je Schritt Bildschirmfoto + gerenderter Text +
 * Lage der wichtigen Elemente (Preis, Variantenwahl, Kaufknopf, Versand-/Lieferangabe: y-Position, im ersten
 * Bildschirm ja/nein).
 *   1 Startseite  2 Produkt (per Tipp auf die erste Produktkarte ODER --produkt HANDLE)  3 Variante wählen
 *   4 In den Warenkorb  5 Warenkorb  6 Kasse (Testadresse test@example.com, Bahnhofstrasse 1, 8001 Zürich —
 *   Hausregel: Testkassen nur mit example.com; KEINE Zahlungsdaten, es wird nichts bestellt)
 *   /opt/node22/bin/node tools/kaufweg_handy.mjs [--produkt HANDLE] [--aus ORDNER]
 * Ergebnis: <ORDNER>/kaufweg.json + schritt-N.png (Standard: /tmp/kaufweg)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { starte } from './browser.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const BASIS = 'https://luxestyle.ch';
const AUS = arg('--aus', '/tmp/kaufweg');
const PRODUKT = arg('--produkt', null);
mkdirSync(AUS, { recursive: true });

const protokoll = { start: new Date().toISOString(), schritte: [] };
const VERSAND_RX = /versand|lieferung|lieferzeit|zustellung|werktag/i;

async function lage(seite) {
  // y-Positionen (Dokument) der Dinge, die eine Kundin vor dem Kauf sehen muss
  return seite.evaluate((rxQuelle) => {
    const rx = new RegExp(rxQuelle, 'i');
    const sichtbar = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const y = (el) => Math.round(el.getBoundingClientRect().top + window.scrollY);
    const erstes = (sel, pruef = () => true) => [...document.querySelectorAll(sel)].find((e) => sichtbar(e) && pruef(e));
    const knopf = erstes('button[name="add"], button[type="submit"]', (e) => /warenkorb|in den korb|kaufen/i.test(e.innerText));
    const preis = erstes('.price, [class*="price"]', (e) => /CHF/.test(e.innerText));
    const varianten = [...document.querySelectorAll('variant-picker fieldset, fieldset.variant-option, select[name^="options"], fieldset')]
      .filter(sichtbar).map((f) => ({ y: y(f), text: f.innerText.replace(/\s+/g, ' ').slice(0, 120) }));
    const versand = [...document.querySelectorAll('p, li, div, span, details, summary')]
      .filter((e) => sichtbar(e) && e.children.length <= 3 && rx.test(e.innerText) && e.innerText.length < 220)
      .map((e) => ({ y: y(e), text: e.innerText.replace(/\s+/g, ' ').slice(0, 160) }))
      .sort((a, b) => a.y - b.y).slice(0, 6);
    const overlay = [...document.querySelectorAll('[id*="cookie"], [class*="cookie"], [class*="popup"], dialog[open], [role="dialog"]')]
      .filter(sichtbar).map((e) => ({ y: y(e), h: Math.round(e.getBoundingClientRect().height), text: e.innerText.replace(/\s+/g, ' ').slice(0, 80) }));
    return {
      knopf: knopf ? { y: y(knopf), text: knopf.innerText.trim(), aktiv: !knopf.disabled } : null,
      preis: preis ? { y: y(preis), text: preis.innerText.replace(/\s+/g, ' ').slice(0, 60) } : null,
      varianten, versand, overlay, hoehe: document.body.scrollHeight,
    };
  }, VERSAND_RX.source);
}

async function schritt(seite, nr, name, extra = {}) {
  await seite.waitForTimeout(1500);
  const bild = `${AUS}/schritt-${nr}.png`;
  await seite.screenshot({ path: bild, fullPage: false });
  const text = await seite.evaluate(() => document.body.innerText);
  const l = await lage(seite).catch((e) => ({ fehler: String(e) }));
  const eintrag = { nr, name, url: seite.url(), bild, lage: l, text: text.slice(0, 2500), ...extra };
  protokoll.schritte.push(eintrag);
  console.log(`\n== ${nr} ${name} · ${seite.url()}`);
  if (l.knopf) console.log(`   Kaufknopf y=${l.knopf.y} «${l.knopf.text}» aktiv=${l.knopf.aktiv} ${l.knopf.y < 844 ? '(erster Bildschirm)' : '(erst nach Scrollen)'}`);
  if (l.preis) console.log(`   Preis y=${l.preis.y} ${l.preis.text}`);
  for (const v of (l.varianten || []).slice(0, 4)) console.log(`   Auswahl y=${v.y} ${v.text}`);
  for (const v of (l.versand || []).slice(0, 4)) console.log(`   Versand y=${v.y} ${v.text}`);
  for (const o of (l.overlay || [])) console.log(`   ÜBERLAGERUNG y=${o.y} h=${o.h} ${o.text}`);
  return eintrag;
}

const browser = await starte();
try {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'de-CH',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  });
  const seite = await ctx.newPage();
  await seite.goto(BASIS + '/', { waitUntil: 'load', timeout: 90000 });
  await schritt(seite, 1, 'Startseite');

  // 2 Produkt: per Tipp auf die erste sichtbare Produktkarte (so wie eine Besucherin) oder vorgegebenes Produkt
  if (PRODUKT) {
    await seite.goto(`${BASIS}/products/${PRODUKT}`, { waitUntil: 'load', timeout: 90000 });
  } else {
    // Cookie-Banner zuerst wegtippen (liegt auf der Startseite im ersten Bildschirm, siehe Schritt 1)
    for (const t of ['Akzeptieren', 'Alle akzeptieren', 'OK', 'Einverstanden']) {
      const b = seite.locator(`button:has-text("${t}")`).first();
      if (await b.isVisible().catch(() => false)) { await b.tap().catch(() => b.click()); protokoll.cookie_start = t; break; }
    }
    // erste SICHTBARE Produktkarte (Karussell-Folien ausserhalb des Bildes sind unsichtbar)
    const link = seite.locator('main a[href*="/products/"] >> visible=true').first();
    await link.scrollIntoViewIfNeeded();
    await seite.waitForTimeout(800);
    protokoll.getippt = await link.getAttribute('href');
    await Promise.all([seite.waitForURL(/\/products\//, { timeout: 60000 }), link.tap().catch(() => link.click({ force: true }))]);
    await seite.waitForLoadState('load');
  }
  await schritt(seite, 2, 'Produktseite');

  // Cookie-Banner: wie eine Besucherin wegtippen, wenn er den Weg versperrt (wird protokolliert)
  for (const t of ['Akzeptieren', 'Alle akzeptieren', 'OK', 'Einverstanden']) {
    const b = seite.locator(`button:has-text("${t}")`).first();
    if (await b.isVisible().catch(() => false)) { await b.tap().catch(() => b.click()); protokoll.cookie = t; break; }
  }

  // 3 Variante: in jeder Auswahlgruppe die erste wählbare Option antippen
  const gruppen = seite.locator('variant-picker fieldset, fieldset.variant-option');
  const n = await gruppen.count();
  const gewaehlt = [];
  for (let i = 0; i < n; i++) {
    const g = gruppen.nth(i);
    const label = g.locator('label').filter({ hasNot: seite.locator('[aria-disabled="true"]') }).first();
    if (await label.isVisible().catch(() => false)) {
      await label.scrollIntoViewIfNeeded(); await label.tap().catch(() => label.click());
      gewaehlt.push((await label.innerText()).trim());
    }
  }
  const sel = seite.locator('select[name^="options"]');
  for (let i = 0; i < await sel.count(); i++) {
    const s = sel.nth(i); const opts = await s.locator('option').allInnerTexts();
    if (opts.length > 1) { await s.selectOption({ index: 1 }); gewaehlt.push(opts[1]); }
  }
  await schritt(seite, 3, 'Variante gewählt', { gewaehlt, gruppen: n });

  // 4 In den Warenkorb
  const knopf = seite.locator('button[name="add"]').first();
  await knopf.scrollIntoViewIfNeeded();
  await knopf.tap().catch(() => knopf.click());
  await seite.waitForTimeout(2500);
  await schritt(seite, 4, 'Nach «In den Warenkorb»');

  // 5 Warenkorb-Seite
  await seite.goto(BASIS + '/cart', { waitUntil: 'load', timeout: 90000 });
  await schritt(seite, 5, 'Warenkorb');

  // 6 Kasse
  const kasse = seite.locator('button[name="checkout"], a[href*="/checkout"]').first();
  await kasse.scrollIntoViewIfNeeded();
  await Promise.all([seite.waitForURL(/checkouts?\//, { timeout: 60000 }).catch(() => null), kasse.tap().catch(() => kasse.click())]);
  await seite.waitForLoadState('load').catch(() => null);
  await schritt(seite, 6, 'Kasse (leer)');
  // Testadresse (example.com) — nur bis die Versandarten erscheinen, keine Zahlung
  const fuelle = async (sel, wert) => { const f = seite.locator(sel).first(); if (await f.isVisible().catch(() => false)) { await f.fill(wert); return true; } return false; };
  await fuelle('input[name="email"], input#email', 'kaufweg-test@example.com');
  await fuelle('input[name="firstName"]', 'Test');
  await fuelle('input[name="lastName"]', 'Kaufweg');
  await fuelle('input[name="address1"]', 'Bahnhofstrasse 1');
  await fuelle('input[name="postalCode"]', '8001');
  await fuelle('input[name="city"]', 'Zürich');
  await seite.keyboard.press('Tab');
  await seite.waitForTimeout(6000);
  await schritt(seite, 7, 'Kasse mit Testadresse');
  await seite.screenshot({ path: `${AUS}/schritt-7-voll.png`, fullPage: true });
} catch (e) {
  protokoll.fehler = String(e && e.stack || e);
  console.log('FEHLER', protokoll.fehler.slice(0, 400));
} finally {
  writeFileSync(`${AUS}/kaufweg.json`, JSON.stringify(protokoll, null, 1));
  await browser.close();
}
