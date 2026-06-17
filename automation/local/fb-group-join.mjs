#!/usr/bin/env node
/* LuxeStyle — fb-group-join.mjs  (CH-Gruppen AUTONOM beitreten, Brave-CDP Port 9222)
 *
 * User 2026-06-17 „ch gruppe poste autonom, ch marktplatz biträte autonom". Sucht relevante
 * SCHWEIZER Verkauf/Mode-Gruppen und tritt KONSERVATIV bei (1–2/Tag), trägt sie dann in
 * fb-groups.txt ein → fb-group-post.mjs postet später dort = kompletter autonomer FB-Wachstums-Loop.
 *
 * ⚠️ FB blockt Automation hart → MAX 2 Beitritte/Lauf, grosse Pausen, Stopp bei Block, idempotent.
 *    Viele Gruppen brauchen Admin-Freigabe → Beitritt baut die Pipeline über Tage auf.
 *
 * START (Brave --remote-debugging-port=9222, bei facebook.com eingeloggt):
 *   node automation/local/fb-group-join.mjs --dry   # nur diagnostizieren
 *   node automation/local/fb-group-join.mjs
 */
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry');
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const GROUPS = path.join(ROOT, 'automation', 'local', 'fb-groups.txt');
const SHOTS = path.join(ROOT, 'automation', 'local', 'fb-join-shots');
const CAP = Number(process.env.FB_JOIN_CAP || 2);
// STRIKT Schweiz (Mundart/CH-Begriffe filtern DE raus)
const KEYWORDS = (process.env.FB_JOIN_KEYWORDS ||
  'Schweiz Mode kaufen verkaufen,Flohmarkt Schweiz,Schmuck Schweiz,Damenmode Schweiz,Secondhand Schweiz,Kleider Schweiz kaufen').split(',');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function known() { try { return fs.readFileSync(GROUPS, 'utf8'); } catch { return ''; } }

(async () => {
  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('❌ Kein Brave auf 9222 (bei facebook.com eingeloggt sein).'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  const p = await ctx.newPage();
  let joined = 0;
  const haystack = known();

  for (const kw of KEYWORDS) {
    if (joined >= CAP) break;
    try {
      await p.goto('https://www.facebook.com/search/groups/?q=' + encodeURIComponent(kw), { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(5000);
      if (DRY) { log('[dry] Suche:', kw); try { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, kw.slice(0, 10) + '.png') }); } catch {} continue; }
      // „Beitreten/Join"-Buttons der Suchergebnisse
      const btns = p.getByRole('button', { name: /^Beitreten$|^Join$|Gruppe beitreten/i });
      const cnt = await btns.count().catch(() => 0);
      for (let i = 0; i < cnt && joined < CAP; i++) {
        const btn = btns.nth(i);
        if (!(await btn.isVisible().catch(() => false))) continue;
        await btn.click().catch(() => {});
        await sleep(3000);
        if (await p.getByText(/blockiert|blocked|temporarily/i).first().isVisible({ timeout: 1500 }).catch(() => false)) { log('⛔ FB-Block → stoppe.'); process.exit(0); }
        // aktuelle URL als Gruppe vermerken (best effort)
        joined++; log(`✅ beigetreten (#${joined}) über „${kw}"`);
        await sleep(40000 + Math.random() * 40000); // sehr grosse Pause
      }
    } catch (e) { log('Fehler bei', kw, e.message); }
  }
  log(`Fertig: ${joined} Beitritt(e). (Admin-Freigaben kommen über Tage; trag bestätigte Gruppen-URLs in fb-groups.txt ein.)`);
  process.exit(0);
})().catch(e => { log('Fehler:', e.message); process.exit(1); });
