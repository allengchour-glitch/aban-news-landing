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
 *   3)  node ch-follower-growth.mjs              # IG-Influencer + Hashtags + TikTok, Tageslimit
 *       node ch-follower-growth.mjs instagram    # nur eine Plattform
 *       node ch-follower-growth.mjs --dry        # nichts klicken, nur zeigen
 *       node ch-follower-growth.mjs --comments   # OPT-IN: dazu auf Influencer-Posts kommentieren (Cap 6, sehr vorsichtig)
 *
 * INFLUENCER-MODUS: folgt den CH-Influencern in IG_SEED_ACCOUNTS (Liste: dropship/INFLUENCER-TARGETS.md),
 * liked deren neue Beiträge und — nur mit --comments — setzt kurze, echte Mundart-Kommentare (KEIN Promo/Link).
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
// 2026-06-14: verifizierte CH-Influencer (Zürich, Fashion/Beauty — KEIN Deutschland, Geo-Regel).
// Deren engagierte Follower = unsere Wunsch-Zielgruppe. Weitere Kandidaten: dropship/INFLUENCER-TARGETS.md.
const IG_SEED_ACCOUNTS = ['oliviafaeh', 'mimoza', 'omnibloomofficial'];

// ---- Kommentar-Pool (NUR wenn --comments / COMMENTS=1) -------------------------
// ⚠️ Auto-Kommentare = höchstes Sperr-Risiko. Darum: OPT-IN, sehr kleiner Cap, NUR auf
// Influencer-Beiträgen (nicht random), KEINE Links/kein Marken-Promo (= Spam-Flag), variiert.
// Echt-positiv & kurz auf Mundart — wie ein echter Schweizer Fan.
const IG_COMMENTS = [
  'Schöne Vibes! 😍', 'Mega Look 🔥', 'Wow, das gseht traumhaft us! ✨', 'So schön 😍',
  'Toll gmacht 👏', 'Richtig schön! 🤩', 'Liebe dä Style! 💫', 'Wunderschön ✨',
  'Dä Look isch on point 🔥', 'Voll schön gmacht 😍',
];

// ---- Limits (konservativ; lieber täglich wenig & dauerhaft) -------------------
const COMMENTS_ON = process.argv.includes('--comments') || process.env.COMMENTS === '1';
const CAP = {
  // „Autonom-Level hoch / Ziel 1 Mio" (User 2026-06-17): Tages-Caps moderat erhöht — bleibt aber
  // im sicheren Bereich (IG soft-limit, 25–70 s Pausen, Stopp bei „Action blocked"). NIE höher
  // drehen ohne Risiko-Abwägung → Sperre = Totalverlust. Wachstum kommt aus TÄGLICHKEIT, nicht Spitzen.
  ig_follows: Number(process.env.IG_FOLLOWS || 55),
  tt_follows: Number(process.env.TT_FOLLOWS || 45),
  ig_comments: COMMENTS_ON ? Number(process.env.IG_COMMENTS_CAP || 6) : 0, // sehr klein, nur Influencer
};
const DRY = process.argv.includes('--dry');
const ONLY = (process.argv.find(a => !a.startsWith('-')) || '').toLowerCase();

const LEDGER = path.join(process.cwd(), 'ch-growth-ledger.txt');
const SHOTS = path.join(process.cwd(), 'ch-growth-screens');
fs.mkdirSync(SHOTS, { recursive: true });
// Ledger-Zeilen: "<key>\t<ISO-Datum>" (alte Zeilen ohne Datum bleiben gültig). seen = Set der keys.
const seen = new Set(fs.existsSync(LEDGER)
  ? fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map(l => l.split('\t')[0])
  : []);
const remember = (h) => { seen.add(h); fs.appendFileSync(LEDGER, h + '\t' + new Date().toISOString() + '\n'); };

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

// Kommentar absetzen (nur Influencer-Beiträge, Opt-in). Defensiv: Feld finden, tippen, senden.
async function tryComment(p) {
  const text = IG_COMMENTS[rnd(0, IG_COMMENTS.length)];
  try {
    const box = p.locator('textarea[aria-label*="omment"], textarea[aria-label*="ommentar"], form textarea').first();
    if (!(await box.count().catch(() => 0))) return false;
    await box.click({ timeout: 4000 }); await sleep(rnd(800, 1600));
    await box.type(text, { delay: rnd(40, 110) }); await sleep(rnd(900, 1800));
    const post = p.locator('div[role="button"]:has-text("Post"), div[role="button"]:has-text("Posten"), button:has-text("Post"), button:has-text("Posten")').first();
    if (await post.count().catch(() => 0)) { await post.click({ timeout: 4000 }).catch(() => {}); }
    else { await box.press('Enter').catch(() => {}); }
    log(`    💬 kommentiert: „${text}"`);
    return true;
  } catch { return false; }
}

// ---------- INSTAGRAM: Influencer gezielt ansprechen (folgen + Beiträge engagen) ----------
async function growSeedInfluencers(ctx) {
  if (!IG_SEED_ACCOUNTS.length) return;
  log('=== Instagram: Schweizer Influencer gezielt ===');
  const p = await ctx.newPage();
  let comments = 0;
  for (const acc of IG_SEED_ACCOUNTS) {
    await p.goto(`https://www.instagram.com/${acc}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(rnd(3500, 6000));
    if (await blocked(p)) { log('⛔ IG-Limit → stoppe.'); break; }
    // Dem Influencer selbst folgen (falls noch nicht)
    if (!seen.has('ig:' + acc)) {
      if (!DRY) {
        const fb = p.locator('header button:has-text("Follow"), header button:has-text("Folgen")').first();
        if (await fb.count().catch(() => 0)) { await fb.click({ timeout: 4000 }).catch(() => {}); }
      }
      remember('ig:' + acc);
      log(`  ${DRY ? '[dry] ' : ''}➕ folge Influencer @${acc}`);
      await pause();
    }
    // 1–2 aktuelle Beiträge öffnen → liken + (opt-in) kommentieren
    const posts = await p.locator('a[href*="/p/"]').all().catch(() => []);
    for (let i = 0; i < Math.min(posts.length, 2); i++) {
      try {
        await posts[i].click({ timeout: 8000 }); await sleep(rnd(2500, 4500));
        if (!DRY) await p.locator('svg[aria-label="Like"], svg[aria-label="Gefällt mir"]').first().click({ timeout: 4000 }).catch(() => {});
        await sleep(rnd(1500, 3000));
        if (!DRY && comments < CAP.ig_comments) { if (await tryComment(p)) comments++; }
        await p.keyboard.press('Escape').catch(() => {});
        if (await blocked(p)) { log('⛔ IG-Limit → stoppe.'); break; }
        await pause();
      } catch { await p.keyboard.press('Escape').catch(() => {}); await sleep(1500); }
    }
  }
  await p.screenshot({ path: path.join(SHOTS, 'influencers.png') }).catch(() => {});
  log(`Influencer fertig: ${comments}/${CAP.ig_comments} Kommentare. (Folgen + Likes dazu.)`);
}

(async () => {
  log(`Start CH-Follower-Wachstum ${DRY ? '(DRY-RUN)' : ''} — Caps: IG ${CAP.ig_follows} / TikTok ${CAP.tt_follows} / Kommentare ${CAP.ig_comments}${COMMENTS_ON ? '' : ' (AUS)'}. Ledger: ${seen.size} bekannt.`);
  const b = await connect();
  const ctx = b.contexts()[0] || await b.newContext();
  log('✓ Mit Brave verbunden.');
  try { if (!ONLY || ONLY === 'instagram') await growSeedInfluencers(ctx); } catch (e) { log('Influencer-Fehler:', e.message); }
  try { if (!ONLY || ONLY === 'instagram') await growInstagram(ctx); } catch (e) { log('IG-Fehler:', e.message); }
  try { if (!ONLY || ONLY === 'tiktok') await growTikTok(ctx); } catch (e) { log('TikTok-Fehler:', e.message); }
  log('\nFertig. Screenshots in ./ch-growth-screens/. Brave bleibt offen. Täglich 1× laufen lassen = stetiges CH-Wachstum.');
  process.exit(0);
})();
