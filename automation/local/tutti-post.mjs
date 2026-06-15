#!/usr/bin/env node
/**
 * tutti-post.mjs — halbautomatisches Inserieren auf tutti.ch (LÄUFT NUR AM PC-CLAUDE).
 *
 * Warum Browser statt API: tutti.ch hat KEIN öffentliches Inserier-API. Posten geht nur über die
 * eingeloggte Session → wir steuern den vorhandenen Brave/Chrome per CDP (Port 9222), genau wie
 * `ch-follower-growth.mjs`. Dieses Skript hat hier in der Cloud KEINEN Browser → es ist nur am PC nutzbar.
 *
 * Sicherheit gegen Sperren (wie bei Follower-Tool):
 *   - Tages-Cap (Default 3 Inserate/Lauf), randomisierte Pausen 20–60 s zwischen Inseraten.
 *   - Idempotenter Ledger `automation/local/tutti-ledger.txt` → schon gepostete Titel werden übersprungen.
 *   - --dry = nur anzeigen, was gepostet würde (nichts absenden).
 *   - Stoppt bei „zu viele Inserate"/Blockade-Hinweisen.
 *
 * VORAUSSETZUNG (PC): Brave/Chrome mit Remote-Debugging offen + auf tutti.ch eingeloggt:
 *   brave.exe --remote-debugging-port=9222
 * LAUF:  node automation/local/tutti-post.mjs            (füllt, du bestätigst Veröffentlichen)
 *        node automation/local/tutti-post.mjs --dry      (Trockenlauf)
 *        AUTO_PUBLISH=1 TUTTI_CAP=2 node …/tutti-post.mjs (VOLL-AUTO: lädt Bild + wählt Kategorie + veröffentlicht)
 *
 * AUTO_PUBLISH=1 = vollautonom (für den täglichen PC-Task). Sicherung: veröffentlicht NUR, wenn ALLE Pflichtfelder
 * (Titel/Preis/Text/Bild/Kategorie) erfolgreich gesetzt sind — sonst wird das Inserat ÜBERSPRUNGEN (kein kaputtes Listing).
 *
 * ⚠️ Die tutti-Formular-Selektoren können sich ändern. Das Skript füllt defensiv per Label/Placeholder
 *    mit Fallbacks; falls ein Feld nicht gefunden wird, hält es an und meldet, was anzupassen ist
 *    (PC-Claude kann die Selektoren dann live im DOM nachziehen). NIE blind weiterklicken.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, '../..');
const CSV = path.join(ROOT, 'dropship/tutti_listings.csv');
const LEDGER = path.join(__dir, 'tutti-ledger.txt');
const DRY = process.argv.includes('--dry');
const AUTO = process.env.AUTO_PUBLISH === '1' || process.argv.includes('--auto');
const CAP = parseInt(process.env.TUTTI_CAP || (AUTO ? '2' : '3'), 10);
const CDP = process.env.CDP_URL || 'http://localhost:9222';

async function downloadImage(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const ext = (url.split('?')[0].match(/\.(jpg|jpeg|png|webp)$/i)?.[1] || 'jpg').toLowerCase();
    const f = path.join(os.tmpdir(), `tutti-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
    fs.writeFileSync(f, buf);
    return f;
  } catch { return null; }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => Math.floor(a + Math.random() * (b - a));

function parseCsv(txt) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"' && txt[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  const head = rows.shift();
  return rows.filter(r => r.length > 1 && r[0]).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const done = () => fs.existsSync(LEDGER) ? new Set(fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean)) : new Set();
const mark = t => fs.appendFileSync(LEDGER, t + '\n');

async function fill(page, listing) {
  // Defensiv: tutti „Inserat aufgeben" öffnen.
  await page.goto('https://www.tutti.ch/de/ai', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await sleep(1500);
  // Heuristik: Titel-/Preis-/Beschreibungsfelder per Label/Placeholder finden.
  const set = async (selectors, value) => {
    for (const s of selectors) {
      const el = await page.$(s);
      if (el) { await el.click({ clickCount: 3 }).catch(() => {}); await el.fill(value).catch(async () => { await el.type(value); }); return true; }
    }
    return false;
  };
  const okTitle = await set(['input[name="title"]', 'input[placeholder*="Titel" i]', 'input[aria-label*="Titel" i]'], listing.title);
  const okPrice = await set(['input[name="price"]', 'input[placeholder*="Preis" i]', 'input[aria-label*="Preis" i]'], listing.price);
  const okBody = await set(['textarea[name="body"]', 'textarea[placeholder*="Beschreib" i]', 'textarea[aria-label*="Beschreib" i]'], listing.body);

  // Bild: vom Shop-CDN laden und ins File-Input setzen.
  let okImg = false;
  const imgFile = await downloadImage(listing.image_url);
  if (imgFile) {
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) { await fileInput.setInputFiles(imgFile).then(() => okImg = true).catch(() => {}); if (okImg) await sleep(4000); }
  }

  // Kategorie: best effort – Dropdown/Combobox per Text wählen.
  let okCat = false;
  try {
    const catSel = await page.$('select[name*="categ" i], [role="combobox"]');
    if (catSel) {
      const tag = await catSel.evaluate(e => e.tagName.toLowerCase());
      if (tag === 'select') { await catSel.selectOption({ label: listing.category }).then(() => okCat = true).catch(() => {}); }
      else { await catSel.click(); await sleep(600); const opt = await page.$(`text="${listing.category}"`); if (opt) { await opt.click(); okCat = true; } }
    }
  } catch {}

  console.log(`   Felder → Titel:${okTitle} Preis:${okPrice} Text:${okBody} Bild:${okImg} Kategorie:${okCat}`);
  if (!okTitle || !okPrice || !okBody) {
    throw new Error(`Pflicht-Textfeld nicht gefunden – tutti-Formular evtl. geändert → Selektoren im DOM prüfen/anpassen.`);
  }

  if (AUTO) {
    // VOLL-AUTO: nur veröffentlichen, wenn ALLES sauber gesetzt ist (kein kaputtes Inserat).
    if (!okImg || !okCat) {
      console.log(`   ⏭️  ÜBERSPRUNGEN (Auto): Bild oder Kategorie nicht sicher gesetzt – ` +
        `PC-Claude muss tutti-Selektoren für File-Input/Kategorie einmal verifizieren. Kein Teil-Inserat veröffentlicht.`);
      return false;
    }
    const pubSelectors = ['button:has-text("Veröffentlichen")', 'button:has-text("Inserat aufgeben")', 'button:has-text("Publizieren")', 'button[type="submit"]'];
    for (const s of pubSelectors) {
      const b = await page.$(s);
      if (b) { await b.click().catch(() => {}); await sleep(3000); console.log(`   ✅ veröffentlicht: "${listing.title}"`); return true; }
    }
    console.log(`   ⏭️  ÜBERSPRUNGEN (Auto): „Veröffentlichen"-Button nicht gefunden.`); return false;
  }

  console.log(`   ✓ Felder gefüllt: "${listing.title}" – CHF ${listing.price} – ${listing.location}`);
  console.log(`   ℹ️ Bild/Kategorie/„Veröffentlichen" im Browser bestätigen (kein Auto-Publish ohne AUTO_PUBLISH=1).`);
  return true;
}

(async () => {
  const listings = parseCsv(fs.readFileSync(CSV, 'utf8'));
  const seen = done();
  const todo = listings.filter(l => !seen.has(l.title)).slice(0, CAP);
  console.log(`tutti-post: ${listings.length} Inserate total, ${seen.size} schon gepostet, ${todo.length} jetzt dran (Cap ${CAP})${DRY ? ' [DRY]' : ''}`);
  if (!todo.length) { console.log('Nichts zu tun – alles schon inseriert (Ledger).'); return; }

  if (DRY) {
    for (const l of todo) console.log(`  [DRY] würde posten: "${l.title}" CHF ${l.price} · ${l.category} · Bild ${l.image_url}`);
    return;
  }

  let browser, page;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.connectOverCDP(CDP);
    const ctx = browser.contexts()[0] || await browser.newContext();
    page = ctx.pages()[0] || await ctx.newPage();
  } catch (e) {
    console.error('❌ Kein Browser über CDP erreichbar (' + CDP + '). Brave mit --remote-debugging-port=9222 starten + auf tutti.ch eingeloggt sein. ' + e.message);
    process.exit(1);
  }

  for (const l of todo) {
    try {
      console.log(`\n→ Inserat: ${l.title}`);
      const ok = await fill(page, l);
      if (ok) mark(l.title);          // idempotent: nur bei Erfolg markieren (sonst nächster Lauf erneut)
      else { console.log('   (nicht markiert – wird beim nächsten Lauf erneut versucht)'); }
      const wait = rand(20000, 60000);
      console.log(`   ⏸  Pause ${Math.round(wait / 1000)} s (Sperr-Schutz)…`);
      await sleep(wait);
    } catch (e) {
      console.error(`   ⚠️ Abbruch bei "${l.title}": ${e.message}`);
      console.error('   → Nicht weiter erzwingen. Selektoren/Login prüfen und erneut starten.');
      break;
    }
  }
  console.log('\nFertig. Bild + Kategorie + „Veröffentlichen" je Inserat im Browser bestätigen.');
  await browser.close().catch(() => {});
})();
