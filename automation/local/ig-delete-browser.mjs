#!/usr/bin/env node
/* LuxeStyle — ig-delete-browser.mjs  (löscht IG-Posts über Brave-CDP, Port 9222)
 * ---------------------------------------------------------------------------------
 * Die IG-Graph-API kann VERÖFFENTLICHTE Posts NICHT löschen (Fehler #10). Darum löscht dieses
 * Tool die in `automation/local/ig-delete-queue.txt` gelisteten Posts über das eingeloggte
 * Instagram im Brave (Port 9222) — gleicher Weg wie Upload/Follower-Bot.
 *
 * Queue-Format pro Zeile:  <media_id> | <permalink> | <caption-kurz>   (Kommentar-Zeilen mit #)
 * Grund hier: Botox/Serum/Rosehip-Öl/Gua-Sha (HEMP-Marke) — User „nie posten".
 *
 * Idempotent über ig-delete-done.txt. Sicher: nur Posts aus der Queue, Pausen, Stopp bei Fehler.
 *
 * START (Brave mit --remote-debugging-port=9222, bei instagram.com eingeloggt):
 *   npm install playwright-core
 *   node automation/local/ig-delete-browser.mjs --dry    # ZUERST: nur zeigen + Selektor-Diagnose
 *   node automation/local/ig-delete-browser.mjs           # echt löschen
 */
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry');
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const QUEUE = path.join(ROOT, 'automation', 'local', 'ig-delete-queue.txt');
const DONE = path.join(ROOT, 'automation', 'local', 'ig-delete-done.txt');
const SHOTS = path.join(ROOT, 'automation', 'local', 'ig-delete-shots');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function loadQueue() {
  if (!fs.existsSync(QUEUE)) return [];
  const done = fs.existsSync(DONE) ? fs.readFileSync(DONE, 'utf8').split(/\s+/).filter(Boolean) : [];
  return fs.readFileSync(QUEUE, 'utf8').split('\n')
    .map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    .map(l => { const [id, link] = l.split('|').map(s => s.trim()); return { id, link }; })
    .filter(x => x.link && !done.includes(x.id));
}
async function shot(p, name) { try { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, name + '.png') }); } catch {} }

(async () => {
  const items = loadQueue();
  if (!items.length) { log('Keine offenen IG-Löschungen (ig-delete-queue.txt leer/alle erledigt). No-op.'); process.exit(0); }
  log(`${items.length} IG-Posts zu löschen ${DRY ? '(DRY)' : ''}`);

  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('❌ Kein Brave auf 9222. Brave mit --remote-debugging-port=9222 starten + bei instagram.com eingeloggt sein.'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  const p = await ctx.newPage();

  for (const it of items) {
    try {
      await p.goto(it.link, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(4000);
      if (DRY) { log('[dry] würde löschen:', it.link); await shot(p, it.id); continue; }
      // „…"-Menü (Optionen) öffnen — mehrsprachig/role-basiert
      const opts = p.getByRole('button', { name: /Mehr|More|Options|Optionen/i }).first();
      if (await opts.isVisible({ timeout: 4000 }).catch(() => false)) await opts.click();
      else { // Fallback: das SVG-„…" oben rechts im Post
        const svg = p.locator('svg[aria-label="Mehr"], svg[aria-label="More options"], svg[aria-label="More"]').first();
        await svg.click({ timeout: 4000 }).catch(() => {});
      }
      await sleep(1500);
      // „Löschen / Delete" im Dialog
      const del = p.getByRole('button', { name: /^Löschen$|^Delete$/i }).first();
      if (await del.isVisible({ timeout: 4000 }).catch(() => false)) {
        await del.click();
        await sleep(1500);
        // Bestätigen (zweiter „Löschen/Delete")
        const conf = p.getByRole('button', { name: /^Löschen$|^Delete$/i }).first();
        await conf.click({ timeout: 4000 }).catch(() => {});
        await sleep(2500);
        fs.appendFileSync(DONE, it.id + '\n');
        log('🗑️ gelöscht:', it.link);
      } else {
        log('⚠️ „Löschen" nicht gefunden — Screenshot:', it.id); await shot(p, it.id + '-nodel');
      }
      await sleep(3000 + Math.random() * 3000);
    } catch (e) { log('Fehler bei', it.link, e.message); await shot(p, it.id + '-err'); }
  }
  log('Fertig. (Nicht-gefundene → Screenshots in ig-delete-shots/, Selektoren ggf. nachziehen.)');
  process.exit(0);
})().catch(e => { log('Fehler:', e.message); process.exit(1); });
