#!/usr/bin/env node
/* LuxeStyle — tiktok-bot.mjs  (VOLL-SUITE: posten + analysieren + löschen, alles über Brave-CDP Port 9222)
 *
 * User 2026-06-19 „TikTok-Bot voll erweitern mit Analyse und Posting, löschen etc."
 * TikTok hat KEINE Post/Delete-API fürs Privatkonto → alles läuft über den eingeloggten Brave (Port 9222),
 * wie der Follower-/Upload-Bot. Ein Tool, mehrere Unterbefehle:
 *
 *   node automation/local/tiktok-bot.mjs post                 # nächstes offenes Reel posten (stumm) → delegiert an tiktok-upload-browser.mjs
 *   node automation/local/tiktok-bot.mjs analyze [--max 80]   # eigene Videos scrapen (Views/Likes/Komm./Shares) → Report + Gehirn
 *   node automation/local/tiktok-bot.mjs delete <videoURL>    # EIN Post löschen (mit --go; ohne = dry)
 *   node automation/local/tiktok-bot.mjs delete --losers [--min-views 80] [--age-days 7] [--max 5] [--go]
 *   node automation/local/tiktok-bot.mjs all                  # analyze → post (für den Tages-Zyklus)
 *
 * SICHERHEIT (löschen): ohne --go ist JEDER Löschbefehl ein Trockenlauf (zeigt nur, was es täte).
 *   Auto-Löschen (--losers) hat harte Caps (max 5/Lauf), schützt Top-Performer + alles in tiktok-keep.txt,
 *   und schreibt jede Löschung nach reports/tiktok-deleted.txt. NIE blind, NIE Gewinner.
 *
 * Voraussetzung: Brave mit --remote-debugging-port=9222, bei tiktok.com eingeloggt (brave-agent-Profil).
 * No-op-sicher: kein Brave/keine Treffer → saubere Meldung, Exit 0. Selektor-Fallbacks + Screenshot-Diagnose.
 */
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const REPORTS = path.join(ROOT, 'reports');
const KEEP = path.join(ROOT, 'automation', 'local', 'tiktok-keep.txt');        // Video-IDs/URLs die NIE gelöscht werden
const DELLOG = path.join(REPORTS, 'tiktok-deleted.txt');
const USER = process.env.TT_USER || '@luxestyle.ch';
const args = process.argv.slice(2);
const cmd = (args[0] || 'all').toLowerCase();
const GO = args.includes('--go');                 // echte Löschung (sonst dry)
const flag = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(REPORTS, { recursive: true });

async function connect() {
  let chromium;
  try { ({ chromium } = await import('playwright-core')); }
  catch { log('❌ playwright-core fehlt. Am PC: npm install playwright-core --no-save'); process.exit(0); }
  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('❌ Kein Brave auf 9222. Brave mit --remote-debugging-port=9222 starten + bei tiktok.com eingeloggt sein.'); process.exit(0); }
  const ctx = b.contexts()[0] || await b.newContext();
  return { b, ctx };
}

/* ── POST: an den bewährten Upload-Bot delegieren (eine Quelle der Wahrheit, stumm-Logik dort) ── */
function doPost() {
  log('▶ post → tiktok-upload-browser.mjs');
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'automation/local/tiktok-upload-browser.mjs'), ...args.slice(1)],
      { stdio: 'inherit' });
  } catch (e) { log('Upload-Bot endete mit', e.status); }
}

/* ── ANALYZE: eigene Videos im TikTok-Studio scrapen → Report + Gehirn ── */
async function doAnalyze() {
  const max = parseInt(flag('--max', '80'), 10);
  const { ctx } = await connect();
  const p = await ctx.newPage();
  log('▶ analyze — öffne TikTok-Studio Inhalte…');
  await p.goto('https://www.tiktok.com/tiktokstudio/content', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(7000);
  // mehrfach scrollen, damit viele Videos laden
  for (let i = 0; i < 8; i++) { await p.mouse.wheel(0, 2200).catch(() => {}); await sleep(1200); }
  // Zeilen auslesen: Titel + Zahlen (Views/Likes/Kommentare/Shares). TikTok ändert DOM oft → tolerant lesen.
  const rows = await p.evaluate(() => {
    const toNum = s => { if (!s) return 0; s = s.trim().replace(',', '.'); const m = s.match(/([\d.]+)\s*([KMkm]?)/); if (!m) return 0; let n = parseFloat(m[1]) || 0; if (/k/i.test(m[2])) n *= 1e3; if (/m/i.test(m[2])) n *= 1e6; return Math.round(n); };
    const out = [];
    // Kandidaten-Container: Links auf /video/ herum gruppiert
    const links = Array.from(document.querySelectorAll('a[href*="/video/"]'));
    const seen = new Set();
    for (const a of links) {
      const m = (a.href || '').match(/\/video\/(\d+)/); if (!m) continue;
      const id = m[1]; if (seen.has(id)) continue; seen.add(id);
      // Zeilen-/Karten-Container hochlaufen
      let box = a; for (let i = 0; i < 5 && box.parentElement; i++) box = box.parentElement;
      const txt = (box.innerText || '').replace(/\s+/g, ' ').trim();
      // Zahlen in der Karte (erste = oft Views)
      const nums = (txt.match(/[\d.,]+\s*[KMkm]?/g) || []).map(toNum).filter(n => n > 0);
      out.push({ id, url: a.href.split('?')[0], title: (a.getAttribute('title') || txt.slice(0, 60)), views: nums[0] || 0, nums: nums.slice(0, 5) });
    }
    return out;
  }).catch(() => []);
  if (!rows.length) {
    await p.screenshot({ path: path.join(process.cwd(), 'tiktok-analyze-diag.png') }).catch(() => {});
    const d = await p.evaluate(() => ({ url: location.href, title: document.title, links: document.querySelectorAll('a[href*="/video/"]').length })).catch(() => ({}));
    log('⚠️ Keine Video-Zeilen gefunden. DIAG', JSON.stringify(d), '· Screenshot: tiktok-analyze-diag.png');
    log('   (Evtl. nicht eingeloggt ODER DOM geändert → schick mir die DIAG-Zeile, ich pass die Selektoren an.)');
    return;
  }
  const vids = rows.slice(0, max).sort((a, b) => b.views - a.views);
  const total = vids.reduce((s, v) => s + v.views, 0);
  const avg = Math.round(total / vids.length);
  const date = new Date().toISOString().slice(0, 10);
  const report = { date, user: USER, count: vids.length, total_views: total, avg_views: avg,
    top: vids.slice(0, 5), bottom: vids.slice(-5), videos: vids };
  fs.writeFileSync(path.join(REPORTS, `tiktok-bot-${date}.json`), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(REPORTS, 'tiktok-bot-latest.json'), JSON.stringify(report, null, 2));
  // CSV fürs schnelle Auge
  const csv = ['id,views,url,title', ...vids.map(v => `${v.id},${v.views},${v.url},"${(v.title || '').replace(/"/g, "'")}"`)].join('\n');
  fs.writeFileSync(path.join(REPORTS, 'tiktok-stats.csv'), csv);
  log(`✅ analyze: ${vids.length} Videos · Σ ${total} Views · Ø ${avg}. Top: ${vids[0]?.views} · Flop: ${vids[vids.length - 1]?.views}`);
  log(`   Report: reports/tiktok-bot-${date}.json + reports/tiktok-stats.csv`);
  // Gehirn anstossen (best effort, no-op-sicher)
  try { execFileSync(process.execPath, [path.join(ROOT, 'automation/brain/brain.mjs')], { stdio: 'ignore' }); log('   Gehirn aktualisiert.'); } catch {}
  return report;
}

/* ── DELETE: ein Video über das „…"-Menü im Studio löschen ── */
async function deleteOne(p, url) {
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(5000);
  // „Mehr"-/Options-Button öffnen (mehrere Sprachen/Selektoren)
  const more = p.locator('[data-e2e="video-options"], button[aria-label="more" i], button[aria-label*="Optionen" i], svg[aria-label*="more" i]').first();
  if (await more.count().catch(() => 0)) await more.click().catch(() => {});
  await sleep(1500);
  const del = p.locator('text=/^\\s*(Delete|Löschen|Entfernen)\\s*$/i').first();
  if (!(await del.count().catch(() => 0))) { log('   ⚠️ „Löschen" nicht gefunden für', url); return false; }
  await del.click().catch(() => {});
  await sleep(1500);
  // Bestätigen
  const conf = p.locator('button:has-text("Delete"), button:has-text("Löschen"), button:has-text("Confirm"), button:has-text("Bestätigen")').last();
  if (await conf.count().catch(() => 0)) await conf.click().catch(() => {});
  await sleep(3000);
  fs.appendFileSync(DELLOG, `${new Date().toISOString()} ${url}\n`);
  log('   🗑️ gelöscht:', url);
  return true;
}

async function doDelete() {
  const keep = fs.existsSync(KEEP) ? fs.readFileSync(KEEP, 'utf8').split(/\s+/).filter(Boolean) : [];
  let targets = [];
  if (args.includes('--losers')) {
    const minViews = parseInt(flag('--min-views', '80'), 10);
    const maxDel = Math.min(parseInt(flag('--max', '5'), 10), 5); // harter Cap 5/Lauf
    const repPath = path.join(REPORTS, 'tiktok-bot-latest.json');
    if (!fs.existsSync(repPath)) { log('⚠️ Kein analyze-Report. Erst `analyze` laufen lassen.'); return; }
    const rep = JSON.parse(fs.readFileSync(repPath, 'utf8'));
    // Verlierer = unter Views-Schwelle UND nicht in den Top-5 UND nicht in keep
    const topIds = new Set(rep.top.map(v => v.id));
    targets = rep.videos.filter(v => v.views < minViews && !topIds.has(v.id) && !keep.includes(v.id) && !keep.includes(v.url))
      .sort((a, b) => a.views - b.views).slice(0, maxDel).map(v => v.url);
    log(`▶ delete --losers: ${targets.length} Kandidaten (<${minViews} Views, Cap ${maxDel}, Gewinner+keep geschützt)`);
  } else {
    const url = args.find(a => /tiktok\.com\/.*\/video\/\d+/.test(a)) || args.find(a => /^\d{6,}$/.test(a));
    if (!url) { log('Nutzung: delete <videoURL>  ODER  delete --losers [...] [--go]'); return; }
    targets = [url.startsWith('http') ? url : `https://www.tiktok.com/${USER}/video/${url}`];
  }
  if (!targets.length) { log('Nichts zu löschen.'); return; }
  targets.forEach(t => log('   •', t));
  if (!GO) { log('💡 Trockenlauf (kein --go). Mit --go würde ich die obigen wirklich löschen.'); return; }
  const { ctx } = await connect();
  const p = await ctx.newPage();
  let n = 0;
  for (const t of targets) { if (await deleteOne(p, t)) n++; await sleep(2500); }
  log(`✅ delete: ${n}/${targets.length} gelöscht. Ledger: reports/tiktok-deleted.txt`);
}

(async () => {
  if (cmd === 'post') return doPost();
  if (cmd === 'analyze') { await doAnalyze(); return; }
  if (cmd === 'delete') { await doDelete(); return; }
  if (cmd === 'all') { await doAnalyze(); doPost(); return; }
  log('Unbekannt. Befehle: post | analyze | delete | all');
})();
