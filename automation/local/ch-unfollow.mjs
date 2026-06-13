#!/usr/bin/env node
/* LuxeStyle — ch-unfollow.mjs  (EIGENSTÄNDIG, läuft am PC über Brave-CDP)
 * ---------------------------------------------------------------------------------
 * Begleiter zu ch-follower-growth.mjs: entfolgt nach ~14 Tagen alle, die NICHT
 * zurückgefolgt sind → hält die Following/Follower-Ratio sauber (gesundes Profil).
 * KEINE API (IG/TikTok haben keine) → steuert dein eingeloggtes Brave (Port 9222).
 *
 * Logik je Handle aus dem Wachstums-Ledger `ch-growth-ledger.txt`:
 *   1) gefolgt vor ≥ DAYS Tagen?  (Zeitstempel im Ledger; alte Zeilen ohne Datum = ja)
 *   2) Profil öffnen → zeigt es „Folgt dir / Follows you"?  → JA: behalten (Fan!).
 *   3) sonst, falls wir noch „Folge ich / Following" sind → ENTFOLGEN.
 *   4) verarbeitete Handles in `ch-unfollow-done.txt` → nie doppelt prüfen.
 *
 * START (PowerShell ODER PC-Claude „entfolge Nicht-Zurückfolger"):
 *   npm install playwright-core          # einmalig (gleicher Ordner)
 *   node ch-unfollow.mjs                  # IG + TikTok, Tageslimit
 *   node ch-unfollow.mjs instagram        # nur eine Plattform
 *   node ch-unfollow.mjs --dry            # nichts klicken, nur zeigen
 *   DAYS=10 MAX=40 node ch-unfollow.mjs   # Schwellen anpassen
 *
 * SICHER: Tages-Cap (Default 50), Pausen 20–55 s, Stopp bei „Action blocked".
 * Reversibel. LÖSCHT NICHTS ausser der Follow-Beziehung (kannst du neu folgen).
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const DAYS = Number(process.env.DAYS || 14);
const MAX  = Number(process.env.MAX  || 50);
const DRY  = process.argv.includes('--dry');
const ONLY = (process.argv.find(a => !a.startsWith('-')) || '').toLowerCase();

const LEDGER = path.join(process.cwd(), 'ch-growth-ledger.txt');
const DONE   = path.join(process.cwd(), 'ch-unfollow-done.txt');
const KEPT   = path.join(process.cwd(), 'ch-unfollow-kept.txt'); // Zurückfolger (behalten)
const SHOTS  = path.join(process.cwd(), 'ch-growth-screens');
fs.mkdirSync(SHOTS, { recursive: true });

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const pause = () => sleep(rnd(20000, 55000));

const done = new Set(fs.existsSync(DONE) ? fs.readFileSync(DONE, 'utf8').split('\n').filter(Boolean) : []);
const markDone = (k) => { done.add(k); fs.appendFileSync(DONE, k + '\n'); };
const markKept = (k) => fs.appendFileSync(KEPT, k + '\t' + new Date().toISOString().slice(0, 10) + '\n');

// Ledger einlesen → Kandidaten je Plattform, älter als DAYS, noch nicht verarbeitet
function candidates(prefix) {
  if (!fs.existsSync(LEDGER)) { log('⚠️ Kein ch-growth-ledger.txt — erst Wachstum laufen lassen.'); return []; }
  const cutoff = Date.now() - DAYS * 86400000;
  const out = [];
  for (const line of fs.readFileSync(LEDGER, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const [key, ts] = line.split('\t');
    if (!key.startsWith(prefix + ':')) continue;
    if (done.has(key)) continue;
    const old = !ts || (new Date(ts).getTime() <= cutoff); // ohne Datum = alt genug
    if (old) out.push(key.slice(prefix.length + 1));
  }
  return [...new Set(out)];
}

async function blocked(p) {
  const txt = (await p.locator('body').innerText().catch(() => '')) || '';
  return /Action Blocked|Aktion blockiert|Try Again Later|Versuche es später|We restrict certain activity/i.test(txt);
}
async function connect() {
  try { return await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('❌ Kein Brave auf 9222. Brave mit --remote-debugging-port=9222 starten + eingeloggt sein.'); process.exit(1); }
}

// ---------- INSTAGRAM ----------
async function unfollowInstagram(ctx) {
  const list = candidates('ig');
  log(`=== Instagram: ${list.length} Kandidaten (≥${DAYS} Tage, nicht geprüft) ===`);
  if (!list.length) return;
  const p = await ctx.newPage();
  let n = 0;
  for (const h of list) {
    if (n >= MAX) break;
    try {
      await p.goto(`https://www.instagram.com/${h}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(rnd(3000, 5000));
      if (await blocked(p)) { log('⛔ IG-Limit → stoppe.'); break; }
      const body = (await p.locator('main, body').first().innerText().catch(() => '')) || '';
      const followsMe = /Follows you|Folgt dir/i.test(body);
      if (followsMe) { markKept('ig:' + h); markDone('ig:' + h); log(`  ✅ @${h} folgt zurück → behalten`); continue; }
      // „Following/Abonniert/Folge ich"-Button finden
      const fb = p.locator('header button, main button').filter({ hasText: /^(Following|Abonniert|Folge ich)$/i }).first();
      if (!(await fb.count().catch(() => 0))) { markDone('ig:' + h); log(`  – @${h} (kein Following-Button / schon entfolgt)`); continue; }
      if (!DRY) {
        await fb.click({ timeout: 4000 }).catch(() => {});
        await sleep(rnd(900, 1800));
        // Bestätigungs-Dialog „Unfollow / Entfolgen"
        const conf = p.locator('button:has-text("Unfollow"), button:has-text("Entfolgen")').first();
        if (await conf.count().catch(() => 0)) await conf.click({ timeout: 4000 }).catch(() => {});
      }
      n++; markDone('ig:' + h);
      log(`  ${DRY ? '[dry] ' : ''}↩️ entfolgt @${h}  (${n}/${MAX})`);
      if (await blocked(p)) { log('⛔ IG-Limit → stoppe.'); break; }
      await pause();
    } catch (e) { log(`  ⚠️ @${h}:`, e.message); markDone('ig:' + h); await sleep(1500); }
  }
  await p.screenshot({ path: path.join(SHOTS, 'unfollow-ig.png') }).catch(() => {});
  log(`Instagram fertig: ${n} entfolgt.`);
}

// ---------- TIKTOK ----------
async function unfollowTikTok(ctx) {
  const list = candidates('tt');
  log(`=== TikTok: ${list.length} Kandidaten (≥${DAYS} Tage, nicht geprüft) ===`);
  if (!list.length) return;
  const p = await ctx.newPage();
  let n = 0;
  for (const h of list) {
    if (n >= MAX) break;
    try {
      await p.goto(`https://www.tiktok.com/@${h}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(rnd(3000, 5000));
      if (await blocked(p)) { log('⛔ TikTok-Limit → stoppe.'); break; }
      const body = (await p.locator('body').innerText().catch(() => '')) || '';
      const followsMe = /Follows you|Folgt dir/i.test(body);
      if (followsMe) { markKept('tt:' + h); markDone('tt:' + h); log(`  ✅ @${h} folgt zurück → behalten`); continue; }
      const fb = p.locator('button').filter({ hasText: /^(Following|Folge ich|Freunde|Friends)$/i }).first();
      if (!(await fb.count().catch(() => 0))) { markDone('tt:' + h); log(`  – @${h} (kein Following-Button)`); continue; }
      if (!DRY) {
        await fb.click({ timeout: 4000 }).catch(() => {});
        await sleep(rnd(900, 1800));
        const conf = p.locator('button:has-text("Unfollow"), button:has-text("Entfolgen")').first();
        if (await conf.count().catch(() => 0)) await conf.click({ timeout: 4000 }).catch(() => {});
      }
      n++; markDone('tt:' + h);
      log(`  ${DRY ? '[dry] ' : ''}↩️ entfolgt @${h}  (${n}/${MAX})`);
      if (await blocked(p)) { log('⛔ TikTok-Limit → stoppe.'); break; }
      await pause();
    } catch (e) { log(`  ⚠️ @${h}:`, e.message); markDone('tt:' + h); await sleep(1500); }
  }
  await p.screenshot({ path: path.join(SHOTS, 'unfollow-tt.png') }).catch(() => {});
  log(`TikTok fertig: ${n} entfolgt.`);
}

(async () => {
  log(`Start Unfollow ${DRY ? '(DRY-RUN)' : ''} — Schwelle ${DAYS} Tage, Cap ${MAX}/Lauf. Bereits geprüft: ${done.size}.`);
  const b = await connect();
  const ctx = b.contexts()[0] || await b.newContext();
  log('✓ Mit Brave verbunden.');
  try { if (!ONLY || ONLY === 'instagram') await unfollowInstagram(ctx); } catch (e) { log('IG-Fehler:', e.message); }
  try { if (!ONLY || ONLY === 'tiktok') await unfollowTikTok(ctx); } catch (e) { log('TikTok-Fehler:', e.message); }
  log('\nFertig. Zurückfolger stehen in ch-unfollow-kept.txt. Brave bleibt offen. 1×/Woche laufen lassen.');
  process.exit(0);
})();
