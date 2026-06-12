#!/usr/bin/env node
/* LuxeStyle — ch-follower-growth.mjs  (EIGENSTÄNDIG, läuft am PC über Brave-CDP)
 * ---------------------------------------------------------------------------------
 * Holt ECHTE Schweizer Follower auf Instagram + TikTok — KEINE Fakes, kein Kauf.
 * Methode (das, was nachhaltig funktioniert): die richtige CH-Zielgruppe finden und
 * ihr dezent folgen + 1–2 aktuelle Beiträge liken. Viele folgen zurück, wenn Profil
 * + Content stimmen (Bio/Bild sind poliert). Steuert dein bereits eingeloggtes Brave
 * über Debug-Port 9222 — kein Passwort, kein Token, KEINE Repo-Abhängigkeit.
 *
 * WARUM Browser? Instagram & TikTok haben KEINE Follow-/Such-API. Wachstum geht nur
 * über die eingeloggte Web-Session. Dieses Skript bündelt das sicher & automatisch.
 *
 * START (PowerShell ODER einfach dein PC-Claude sagt „CH-Follower holen"):
 *   1) Brave läuft mit  --remote-debugging-port=9222 --user-data-dir="$env:USERPROFILE\brave-agent"
 *      und du bist bei instagram.com + tiktok.com eingeloggt (= dein Dauer-Setup).
 *   2) (einmalig)  npm install playwright-core
 *   3)  node ch-follower-growth.mjs              # IG + TikTok, Tageslimit
 *       node ch-follower-growth.mjs instagram    # nur eine Plattform
 *       node ch-follower-growth.mjs --dry        # nichts klicken, nur zeigen
 *
 * SICHERHEIT GEGEN SPERREN (bewusst konservativ):
 *   • harte Tages-Caps (IG 40 Follows / TikTok 30) + Likes ~2× so viele
 *   • randomisierte Pausen 25–70 s zwischen Aktionen (menschliches Tempo)
 *   • idempotent: schon gefolgte Handles stehen in ./ch-growth-ledger.txt → nie doppelt
 *   • KEINE automatischen Kommentare (häufigster Bann-Grund) — nur Follow + Like
 *   • bricht sofort ab, wenn IG/TikTok ein „Action blocked"/Limit-Banner zeigt
 *
 * Reversibel: Folgen kann man jederzeit wieder entfolgen. Das Skript LÖSCHT NICHTS.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

// ---- Schweizer Zielgruppe (Saat) ---------------------------------------------
// Hashtags, unter denen genau unsere Wunschkund:innen posten (CH-Mode/Schmuck/Lifestyle).
const IG_TAGS = [
  'schweizmode','ootdschweiz','swissfashion','schweizerin','zürichstyle',
  'fashionschweiz','swissstyle','modeschweiz','schweizshopping','luzern',
  'bern','berncity','baselstyle','schmuckliebe','swissmade','ootdswitzerland',
];
const TT_TAGS = [
  'schweiz','schweizmode','fypschweiz','swisstiktok','schweizerin',
  'bern','zürich','foryouschweiz','swissstyle','schweizshopping',
];
// Optional: „Seed-Accounts" (CH-Mode-/Lifestyle-Profile) — deren AKTIVE Liker/Kommentierende
// sind ideale Follower. Hier eintragen (ohne @). Default leer = nur Hashtag-Quelle.
const IG_SEED_ACCOUNTS = [];

// ---- Limits (konservativ; lieber täglich wenig & dauerhaft) -------------------
const CAP = {
  ig_follows: Number(process.env.IG_FOLLOWS || 40),
  tt_follows: Number(process.env.TT_FOLLOWS || 30),
};
const DRY = process.argv.includes('--dry');
const ONLY = (process.argv.find(a => !a.startsWith('-')) || '').toLowerCase();

const LEDGER = path.join(process.cwd(), 'ch-growth-ledger.txt');
const SHOTS = path.join(process.cwd(), 'ch-growth-screens');
fs.mkdirSync(SHOTS, { recursive: true });
const seen = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean) : []);
const remember = (h) => { seen.add(h); fs.appendFileSync(LEDGER, h + '\n'); };

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const pause = () => sleep(rnd(25000, 70000)); // 25–70 s menschliches Tempo

// Limit-/Block-Banner erkennen → sofort stoppen, um die Konten zu schützen
async function blocked(p) {
  const txt = (await p.locator('body').innerText().catch(() => '')) || '';
  return /Action Blocked|Aktion blockiert|Try Again Later|Versuche es später|We restrict certain activity|Limit erreicht/i.test(txt);
}

async function connect() {
  try { return await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('❌ Kein Brave auf 9222. Brave mit --remote-debugging-port=9222 starten + eingeloggt sein.'); process.exit(1); }
}

// ---------- INSTAGRAM ----------
async function growInstagram(ctx) {
  log('=== Instagram: Schweizer Zielgruppe ===');
  const p = await ctx.newPage();
  let follows = 0;
  for (const tag of IG_TAGS) {
    if (follows >= CAP.ig_follows) break;
    await p.goto(`https://www.instagram.com/explore/tags/${tag}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(rnd(3500, 6000));
    if (await blocked(p)) { log('⛔ IG-Limit-Banner → stoppe heute.'); break; }
    // erste echten Beiträge öffnen
    const posts = await p.locator('a[href*="/p/"]').all().catch(() => []);
    log(`#${tag}: ${posts.length} Beiträge gefunden`);
    for (let i = 0; i < Math.min(posts.length, 6) && follows < CAP.ig_follows; i++) {
      try {
        await posts[i].click({ timeout: 8000 });
        await sleep(rnd(2500, 4500));
        // Autor-Handle lesen
        const handle = await p.locator('header a[role="link"]').first().innerText().catch(() => '');
        const h = (handle || '').trim().toLowerCase();
        if (!h || seen.has('ig:' + h)) { await p.keyboard.press('Escape').catch(() => {}); await sleep(1200); continue; }
        // Like (Herz) + Follow im geöffneten Dialog
        if (!DRY) {
          await p.locator('svg[aria-label="Like"], svg[aria-label="Gefällt mir"]').first().click({ timeout: 4000 }).catch(() => {});
          await sleep(rnd(1500, 3000));
          const fbtn = p.locator('header button:has-text("Follow"), header button:has-text("Folgen")').first();
          if (await fbtn.count().catch(() => 0)) { await fbtn.click({ timeout: 4000 }).catch(() => {}); follows++; }
        } else { follows++; }
        remember('ig:' + h);
        log(`  ${DRY ? '[dry] ' : ''}❤️+follow @${h}  (${follows}/${CAP.ig_follows})`);
        await p.keyboard.press('Escape').catch(() => {});
        if (await blocked(p)) { log('⛔ IG-Limit-Banner → stoppe.'); follows = CAP.ig_follows; break; }
        await pause();
      } catch (e) { await p.keyboard.press('Escape').catch(() => {}); await sleep(1500); }
    }
  }
  await p.screenshot({ path: path.join(SHOTS, 'instagram.png') }).catch(() => {});
  log(`Instagram fertig: ${follows} neue CH-Kontakte angesprochen.`);
}

// ---------- TIKTOK ----------
async function growTikTok(ctx) {
  log('=== TikTok: Schweizer Zielgruppe ===');
  const p = await ctx.newPage();
  let follows = 0;
  for (const tag of TT_TAGS) {
    if (follows >= CAP.tt_follows) break;
    await p.goto(`https://www.tiktok.com/tag/${tag}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(rnd(3500, 6000));
    if (await blocked(p)) { log('⛔ TikTok-Limit → stoppe heute.'); break; }
    const vids = await p.locator('a[href*="/video/"]').all().catch(() => []);
    log(`#${tag}: ${vids.length} Videos`);
    for (let i = 0; i < Math.min(vids.length, 5) && follows < CAP.tt_follows; i++) {
      try {
        await vids[i].click({ timeout: 8000 });
        await sleep(rnd(2500, 4500));
        const author = await p.locator('[data-e2e="browse-username"], [data-e2e="video-author-uniqueid"]').first().innerText().catch(() => '');
        const h = (author || '').trim().toLowerCase();
        if (!h || seen.has('tt:' + h)) { await p.keyboard.press('Escape').catch(() => {}); await sleep(1200); continue; }
        if (!DRY) {
          await p.locator('[data-e2e="like-icon"], [data-e2e="browse-like-icon"]').first().click({ timeout: 4000 }).catch(() => {});
          await sleep(rnd(1500, 3000));
          const fbtn = p.locator('button:has-text("Follow"), button:has-text("Folgen")').first();
          if (await fbtn.count().catch(() => 0)) { await fbtn.click({ timeout: 4000 }).catch(() => {}); follows++; }
        } else { follows++; }
        remember('tt:' + h);
        log(`  ${DRY ? '[dry] ' : ''}❤️+follow @${h}  (${follows}/${CAP.tt_follows})`);
        await p.keyboard.press('Escape').catch(() => {});
        if (await blocked(p)) { log('⛔ TikTok-Limit → stoppe.'); follows = CAP.tt_follows; break; }
        await pause();
      } catch { await p.keyboard.press('Escape').catch(() => {}); await sleep(1500); }
    }
  }
  await p.screenshot({ path: path.join(SHOTS, 'tiktok.png') }).catch(() => {});
  log(`TikTok fertig: ${follows} neue CH-Kontakte angesprochen.`);
}

(async () => {
  log(`Start CH-Follower-Wachstum ${DRY ? '(DRY-RUN)' : ''} — Caps: IG ${CAP.ig_follows} / TikTok ${CAP.tt_follows}. Ledger: ${seen.size} bekannt.`);
  const b = await connect();
  const ctx = b.contexts()[0] || await b.newContext();
  log('✓ Mit Brave verbunden.');
  try { if (!ONLY || ONLY === 'instagram') await growInstagram(ctx); } catch (e) { log('IG-Fehler:', e.message); }
  try { if (!ONLY || ONLY === 'tiktok') await growTikTok(ctx); } catch (e) { log('TikTok-Fehler:', e.message); }
  log('\nFertig. Screenshots in ./ch-growth-screens/. Brave bleibt offen. Täglich 1× laufen lassen = stetiges CH-Wachstum.');
  process.exit(0);
})();
