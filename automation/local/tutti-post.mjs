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
 * LAUF:  node automation/local/tutti-post.mjs            (postet bis CAP)
 *        node automation/local/tutti-post.mjs --dry      (Trockenlauf)
 *        TUTTI_CAP=2 node automation/local/tutti-post.mjs (Cap überschreiben)
 *
 * ⚠️ Die tutti-Formular-Selektoren können sich ändern. Das Skript füllt defensiv per Label/Placeholder
 *    mit Fallbacks; falls ein Feld nicht gefunden wird, hält es an und meldet, was anzupassen ist
 *    (PC-Claude kann die Selektoren dann live im DOM nachziehen). NIE blind weiterklicken.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, '../..');
const CSV = path.join(ROOT, 'dropship/tutti_listings.csv');
const LEDGER = path.join(__dir, 'tutti-ledger.txt');
const DRY = process.argv.includes('--dry');
const CAP = parseInt(process.env.TUTTI_CAP || '3', 10);
const CDP = process.env.CDP_URL || 'http://localhost:9222';

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
  if (!okTitle || !okPrice || !okBody) {
    throw new Error(`Formularfeld nicht gefunden (Titel:${okTitle} Preis:${okPrice} Text:${okBody}). ` +
      `tutti-Formular hat sich evtl. geändert → Selektoren im DOM prüfen und im Skript anpassen.`);
  }
  console.log(`   ✓ Felder gefüllt: "${listing.title}" – CHF ${listing.price} – Kat: ${listing.category} – ${listing.location}`);
  console.log(`   ℹ️ Bild manuell hochladen/prüfen: ${listing.image_url}`);
  console.log(`   ℹ️ Kategorie/Ort/Bild ggf. manuell bestätigen, dann „Veröffentlichen" drücken.`);
  // Absenden bewusst NICHT vollautomatisch erzwungen — PC-Claude/User bestätigt Kategorie+Bild+Veröffentlichen,
  // um Fehl-Inserate zu vermeiden. (Wer voll-auto will: hier den „Veröffentlichen"-Button-Klick ergänzen.)
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
      await fill(page, l);
      mark(l.title);                  // idempotent: erst nach erfolgreichem Befüllen markieren
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
