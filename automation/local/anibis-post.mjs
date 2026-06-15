#!/usr/bin/env node
/**
 * anibis-post.mjs — halbautomatisches Inserieren auf anibis.ch (LÄUFT NUR AM PC-CLAUDE, Brave-Port 9222).
 *
 * Zweiter Gratis-CH-Marktplatz neben tutti (kein API → Browser/CDP). Nutzt DIESELBE Liste
 * `dropship/tutti_listings.csv` (Titel/Preis/Kategorie/Ort/Bild/Text), eigener Ledger `anibis-ledger.txt`.
 * AUTO_PUBLISH=1 = vollauto (Bild laden + Felder + veröffentlichen, NUR wenn alles sauber gesetzt).
 *
 * LAUF:  AUTO_PUBLISH=1 ANIBIS_CAP=2 node automation/local/anibis-post.mjs
 *        node automation/local/anibis-post.mjs --dry
 * ENV:   ANIBIS_URL (Inserat-Formular, Default unten) · CDP_URL (Default localhost:9222)
 * ⚠️ anibis-Formular-Selektoren können abweichen → PC-Claude verifiziert sie beim 1. Lauf (dann hands-off).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, '../..');
const CSV = path.join(ROOT, 'dropship/tutti_listings.csv');
const LEDGER = path.join(__dir, 'anibis-ledger.txt');
const DRY = process.argv.includes('--dry');
const AUTO = process.env.AUTO_PUBLISH === '1' || process.argv.includes('--auto');
const CAP = parseInt(process.env.ANIBIS_CAP || (AUTO ? '2' : '3'), 10);
const CDP = process.env.CDP_URL || 'http://localhost:9222';
const FORM_URL = process.env.ANIBIS_URL || 'https://www.anibis.ch/de/inserat-aufgeben';

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

async function dl(url) {
  try { const r = await fetch(url); if (!r.ok) return null; const b = Buffer.from(await r.arrayBuffer());
    const ext = (url.split('?')[0].match(/\.(jpg|jpeg|png|webp)$/i)?.[1] || 'jpg').toLowerCase();
    const f = path.join(os.tmpdir(), `anibis-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`); fs.writeFileSync(f, b); return f;
  } catch { return null; }
}

async function fill(page, l) {
  await page.goto(FORM_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await sleep(1500);
  const set = async (sel, v) => { for (const s of sel) { const el = await page.$(s); if (el) { await el.click({ clickCount: 3 }).catch(() => {}); await el.fill(v).catch(async () => { await el.type(v); }); return true; } } return false; };
  const okT = await set(['input[name="title"]', 'input[placeholder*="Titel" i]', 'input[aria-label*="Titel" i]'], l.title);
  const okP = await set(['input[name="price"]', 'input[placeholder*="Preis" i]', 'input[aria-label*="Preis" i]'], l.price);
  const okB = await set(['textarea[name="body"]', 'textarea[placeholder*="Beschreib" i]', 'textarea[aria-label*="Beschreib" i]'], l.body);
  let okImg = false; const img = await dl(l.image_url);
  if (img) { const fi = await page.$('input[type="file"]'); if (fi) { await fi.setInputFiles(img).then(() => okImg = true).catch(() => {}); if (okImg) await sleep(4000); } }
  let okCat = false;
  try { const cs = await page.$('select[name*="categ" i], [role="combobox"]'); if (cs) { const tag = await cs.evaluate(e => e.tagName.toLowerCase());
    if (tag === 'select') await cs.selectOption({ label: l.category }).then(() => okCat = true).catch(() => {});
    else { await cs.click(); await sleep(600); const o = await page.$(`text="${l.category}"`); if (o) { await o.click(); okCat = true; } } } } catch {}
  console.log(`   Felder → T:${okT} P:${okP} Text:${okB} Bild:${okImg} Kat:${okCat}`);
  if (!okT || !okP || !okB) throw new Error('Pflicht-Textfeld nicht gefunden – anibis-Formular evtl. geändert → Selektoren prüfen.');
  if (AUTO) {
    if (!okImg || !okCat) { console.log('   ⏭️ ÜBERSPRUNGEN (Auto): Bild/Kategorie unsicher → PC-Claude verifiziert Selektoren einmal.'); return false; }
    for (const s of ['button:has-text("Veröffentlichen")', 'button:has-text("Inserat aufgeben")', 'button:has-text("Publizieren")', 'button[type="submit"]']) {
      const b = await page.$(s); if (b) { await b.click().catch(() => {}); await sleep(3000); console.log(`   ✅ veröffentlicht: "${l.title}"`); return true; } }
    console.log('   ⏭️ ÜBERSPRUNGEN (Auto): Veröffentlichen-Button nicht gefunden.'); return false;
  }
  console.log(`   ✓ Felder gefüllt: "${l.title}" – Bild/Kategorie/Veröffentlichen manuell bestätigen.`); return true;
}

(async () => {
  const listings = parseCsv(fs.readFileSync(CSV, 'utf8'));
  const seen = done();
  const todo = listings.filter(l => !seen.has(l.title)).slice(0, CAP);
  console.log(`anibis-post: ${listings.length} total, ${seen.size} schon, ${todo.length} jetzt (Cap ${CAP})${DRY ? ' [DRY]' : ''}`);
  if (!todo.length) { console.log('Nichts zu tun.'); return; }
  if (DRY) { for (const l of todo) console.log(`  [DRY] "${l.title}" CHF ${l.price} · ${l.category}`); return; }
  let browser, page;
  try { const { chromium } = await import('playwright'); browser = await chromium.connectOverCDP(CDP);
    const ctx = browser.contexts()[0] || await browser.newContext(); page = ctx.pages()[0] || await ctx.newPage();
  } catch (e) { console.error('❌ Kein Browser über CDP (' + CDP + '). Brave --remote-debugging-port=9222 + anibis.ch eingeloggt. ' + e.message); process.exit(1); }
  for (const l of todo) {
    try { console.log(`\n→ ${l.title}`); const ok = await fill(page, l); if (ok) mark(l.title); else console.log('   (nicht markiert – nächster Lauf erneut)');
      const w = rand(20000, 60000); console.log(`   ⏸ Pause ${Math.round(w / 1000)}s…`); await sleep(w);
    } catch (e) { console.error(`   ⚠️ Abbruch "${l.title}": ${e.message}`); break; }
  }
  console.log('\nFertig.'); await browser.close().catch(() => {});
})();
