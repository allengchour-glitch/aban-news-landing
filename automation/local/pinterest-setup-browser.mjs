#!/usr/bin/env node
/* LuxeStyle — pinterest-setup-browser.mjs (LOKAL auf dem PC ausführen!)
 * ---------------------------------------------------------------------
 * Macht das Pinterest-Setup «per Port» (User 2026-07-08) über das bereits
 * EINGELOGGTE Brave (Debug-Port 9222) — kein Passwort nötig:
 *   TEIL 1: Shopify-Admin → Pinterest-Kanal → Karte «Katalog» → Händlerkonto-
 *           Einrichtung durchklicken (Richtlinien akzeptieren, Website bestätigen).
 *           ⛔ SICHERHEITS-STOPP: sobald Zahlungs-/Abrechnungsfelder auftauchen → Abbruch
 *           (Zahlungsdaten gibt NUR der User ein; Ads machen wir bewusst nicht).
 *   TEIL 2: Auf pinterest.ch die 8 Boards aus dropship/PINTEREST-STARTPAKET.md anlegen.
 *   TEIL 3: Bis zu MAX_PINS (Default 5) Start-Pins aus dem Startpaket posten
 *           (Bild-Download → Pin-Builder → Titel/Beschreibung/Link/Board → Veröffentlichen).
 *
 * AUSFÜHREN (PowerShell im Repo-Ordner; Brave läuft mit --remote-debugging-port=9222):
 *   npm install playwright-core        (falls noch nicht)
 *   node automation/local/pinterest-setup-browser.mjs
 *   [Env: MAX_PINS=5 · SKIP_SHOPIFY=1 · SKIP_BOARDS=1 · SKIP_PINS=1]
 *
 * Jeder Schritt ist einzeln abgesichert + Screenshot nach ./pinterest-screenshots/.
 * Selektoren können sich ändern — was scheitert, wird klar gemeldet, nichts crasht hart.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const SHOP_ADMIN = 'https://admin.shopify.com/store/luxestyle-ch/apps/pinterest-4/overviewv2';
const PAKET = 'dropship/PINTEREST-STARTPAKET.md';
const MAX_PINS = Math.max(0, parseInt(process.env.MAX_PINS || '5', 10) || 5);
const SHOTS = path.resolve('./pinterest-screenshots'); fs.mkdirSync(SHOTS, { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
let shotN = 0;
async function shot(page, name) { try { await page.screenshot({ path: path.join(SHOTS, `${String(++shotN).padStart(2, '0')}-${name}.png`), fullPage: false }); } catch {} }
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Sicherheits-Wache: NIE in Zahlungs-Formulare klicken ───
const PAY_RE = /(Kreditkarte|Kartennummer|card number|Abrechnungsdaten|Zahlungsmethode|payment method|billing|IBAN|CVC|CVV)/i;
async function frameLooksLikePayment(fr) {
  try { const t = await fr.evaluate(() => document.body ? document.body.innerText.slice(0, 4000) : ''); return PAY_RE.test(t); } catch { return false; }
}

// Klickt den ersten sichtbaren Button, dessen Text auf eines der Muster passt — in ALLEN Frames (Shopify-Apps = iframe!)
async function clickAny(page, patterns, { timeout = 4000 } = {}) {
  for (const fr of page.frames()) {
    for (const pat of patterns) {
      try {
        const loc = fr.locator(`button, a[role="button"], a`, { hasText: pat }).first();
        if (await loc.isVisible({ timeout: 500 }).catch(() => false)) {
          if (await frameLooksLikePayment(fr)) { log('⛔ Zahlungs-Kontext erkannt — klicke NICHT:', pat); return 'PAYMENT'; }
          await loc.click({ timeout });
          log('  Klick:', String(pat));
          return true;
        }
      } catch {}
    }
  }
  return false;
}

async function acceptCheckboxes(page) { // Richtlinien-Häkchen (aber NIE in Zahlungs-Frames)
  for (const fr of page.frames()) {
    if (await frameLooksLikePayment(fr)) continue;
    try {
      const boxes = fr.locator('input[type="checkbox"]:not(:checked)');
      const n = await boxes.count();
      for (let i = 0; i < Math.min(n, 4); i++) { try { await boxes.nth(i).check({ timeout: 1500 }); log('  Checkbox ✓'); } catch {} }
    } catch {}
  }
}

function download(url, dest) {
  return new Promise((res, rej) => {
    const f = fs.createWriteStream(dest);
    https.get(url, r => {
      if (r.statusCode >= 300 && r.headers.location) return download(r.headers.location, dest).then(res, rej);
      if (r.statusCode !== 200) return rej(new Error('HTTP ' + r.statusCode));
      r.pipe(f); f.on('finish', () => f.close(() => res(dest)));
    }).on('error', rej);
  });
}

// ─── Startpaket parsen (Boards + Pins) ───
function parsePaket() {
  const md = fs.readFileSync(PAKET, 'utf8');
  const boards = [...md.matchAll(/^\|\s*([^|]+?)\s*\|\s*\/collections\//gm)].map(m => m[1].trim()).filter(b => !/^Board$/i.test(b) && !/^---/.test(b));
  const pins = [...md.matchAll(/### Pin \d+: (.+?)\n- \*\*Bild:\*\* (\S+)\n- \*\*Link:\*\* (\S+)\n- \*\*Titel \(Pin\):\*\* (.+?)\n- \*\*Beschreibung:\*\* ([\s\S]+?)(?=\n###|\n*$)/g)]
    .map(m => ({ produkt: m[1].trim(), bild: m[2].trim(), link: m[3].trim(), titel: m[4].trim(), text: m[5].trim().replace(/\n/g, ' ') }));
  return { boards, pins };
}

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222').catch(e => { console.error('❌ Kein Brave auf Port 9222 erreichbar:', e.message); process.exit(1); });
const ctx = browser.contexts()[0];
const page = await ctx.newPage();

// ════ TEIL 1: Shopify → Pinterest-Katalog-Einrichtung ════
if (process.env.SKIP_SHOPIFY !== '1') {
  log('TEIL 1: Shopify-Pinterest-Katalog …');
  await page.goto(SHOP_ADMIN, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => log('  goto:', e.message));
  await sleep(5000); await shot(page, 'shopify-pinterest-uebersicht');
  const start = await clickAny(page, [/Los geht/i, /Get started/i, /Einrichtung abschliessen/i, /Complete setup/i]);
  if (start === true) {
    // Wizard: bis zu 12 Schritte weiterklicken; Häkchen setzen; bei Zahlung sofort Schluss
    for (let step = 1; step <= 12; step++) {
      await sleep(4000); await shot(page, `wizard-${step}`);
      await acceptCheckboxes(page);
      const r = await clickAny(page, [/Akzeptieren/i, /Accept/i, /Zustimmen/i, /Agree/i, /Bestätigen/i, /Confirm/i,
        /Verbinden/i, /Connect/i, /Beanspruchen/i, /Claim/i, /Weiter/i, /Continue/i, /Next/i, /Fertig/i, /Done/i, /Speichern/i, /Save/i, /Aktivieren/i, /Enable/i]);
      if (r === 'PAYMENT') { log('⛔ Zahlungsseite erreicht → Teil 1 hier bewusst beendet (kein Klick).'); break; }
      if (!r) { log('  kein weiterer Wizard-Knopf (Schritt ' + step + ') → vermutlich fertig.'); break; }
    }
    await sleep(4000); await shot(page, 'wizard-ende');
    log('TEIL 1 abgeschlossen — Screenshot «wizard-ende» prüfen (Katalog-Status).');
  } else if (start === 'PAYMENT') { log('⛔ Direkt Zahlungs-Kontext — übersprungen.'); }
  else log('  «Los geht\'s» nicht gefunden — evtl. schon eingerichtet? Screenshot prüfen.');
}

// ════ TEIL 2: Boards anlegen ════
const { boards, pins } = parsePaket();
if (process.env.SKIP_BOARDS !== '1') {
  log(`TEIL 2: ${boards.length} Boards anlegen …`);
  for (const b of boards) {
    try {
      await page.goto('https://www.pinterest.com/pin-creation-tool/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(3500);
      // Board-Dropdown im Pin-Builder öffnen → «Board erstellen» → Name → Erstellen (robusteste UI-Route)
      const dd = page.locator('[data-test-id="board-dropdown-select-button"], button:has-text("Board auswählen"), button:has-text("Choose a board")').first();
      if (await dd.isVisible({ timeout: 4000 }).catch(() => false)) await dd.click();
      await sleep(1200);
      const create = page.locator('div[role="button"]:has-text("Board erstellen"), div[role="button"]:has-text("Create board"), button:has-text("Board erstellen"), button:has-text("Create board")').first();
      if (!(await create.isVisible({ timeout: 3000 }).catch(() => false))) { log('  ? Board-erstellen-Knopf fehlt bei', b); continue; }
      await create.click(); await sleep(1200);
      const nameIn = page.locator('input[id*="boardName"], input[name="boardName"], input[placeholder*="Titel"], input[placeholder*="name" i]').first();
      await nameIn.fill(b, { timeout: 4000 }).catch(() => nameIn.type(b));
      await sleep(600);
      const mk = page.locator('button:has-text("Erstellen"), button:has-text("Create")').last();
      await mk.click({ timeout: 4000 });
      await sleep(2000); await shot(page, 'board-' + b.replace(/[^\w]+/g, '').slice(0, 20));
      log('  ✅ Board:', b);
    } catch (e) { log('  ✗ Board', b, '—', e.message.slice(0, 80)); }
  }
}

// ════ TEIL 3: Start-Pins posten (max MAX_PINS) ════
if (process.env.SKIP_PINS !== '1' && MAX_PINS > 0) {
  log(`TEIL 3: bis zu ${MAX_PINS} Pins posten …`);
  const tmp = fs.mkdtempSync(path.join(process.cwd(), 'pin-img-'));
  let posted = 0;
  for (const p of pins) {
    if (posted >= MAX_PINS) break;
    try {
      const img = path.join(tmp, `pin${posted}.jpg`);
      await download(p.bild.split('?')[0] + '?width=1000', img).catch(() => download(p.bild, img));
      await page.goto('https://www.pinterest.com/pin-creation-tool/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(3500);
      const file = page.locator('input[type="file"]').first();
      await file.setInputFiles(img, { timeout: 8000 });
      await sleep(4000);
      const title = page.locator('[data-test-id="pin-draft-title"] textarea, textarea[placeholder*="Titel"], textarea[placeholder*="title" i], input[placeholder*="Titel"]').first();
      await title.fill(p.titel.slice(0, 100)).catch(() => {});
      const desc = page.locator('[data-test-id="pin-draft-description"] [contenteditable="true"], [data-test-id="pin-draft-description"] textarea, div[aria-label*="Beschreibung"] [contenteditable="true"]').first();
      await desc.click().catch(() => {});
      await desc.type(p.text.slice(0, 480), { delay: 5 }).catch(() => {});
      const link = page.locator('[data-test-id="pin-draft-link"] textarea, textarea[placeholder*="Link"], input[placeholder*="Link"]').first();
      await link.fill(p.link).catch(() => {});
      // Board wählen: erstes passendes aus dem Dropdown
      const dd = page.locator('[data-test-id="board-dropdown-select-button"], button:has-text("Board auswählen"), button:has-text("Choose a board")').first();
      if (await dd.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dd.click(); await sleep(1200);
        const first = page.locator('[data-test-id="board-row"], div[role="option"]').first();
        await first.click({ timeout: 3000 }).catch(() => {});
      }
      await sleep(800);
      const pub = page.locator('button:has-text("Veröffentlichen"), button:has-text("Publish")').first();
      await pub.click({ timeout: 5000 });
      await sleep(3500); await shot(page, 'pin-' + (posted + 1));
      posted++; log(`  ✅ Pin ${posted}/${MAX_PINS}:`, p.produkt.slice(0, 40));
    } catch (e) { log('  ✗ Pin', p.produkt.slice(0, 30), '—', e.message.slice(0, 80)); }
  }
  log(`TEIL 3 fertig: ${posted} Pins gepostet.`);
}

log('ALLE TEILE DURCH. Screenshots in ./pinterest-screenshots/ prüfen.');
await page.close().catch(() => {});
process.exit(0);
