#!/usr/bin/env node
/* ig-delete-dupes.mjs - loescht die obersten N Instagram-Grid-Posts (Dubletten) ueber das
 * eingeloggte Brave (CDP Port 9222). MIT Vorher/Nachher-Screenshots zur Kontrolle.
 * Standard: loescht die 2 obersten (= die 2 Berg-Tee-Dubletten, der 3. mit meisten Views bleibt).
 *
 * START am PC:  node automation/local/ig-delete-dupes.mjs        (loescht 2, Screenshots)
 *               node automation/local/ig-delete-dupes.mjs --n 1  (nur 1 loeschen)
 *               node automation/local/ig-delete-dupes.mjs --dry  (nur Screenshot, NICHT loeschen)
 * Voraussetzung: Brave mit --remote-debugging-port=9222, bei instagram.com (Konto luxestyle.ch) eingeloggt.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url)))));
const SHOT = path.join(ROOT, 'automation', 'local', 'ig-delete-shots');
fs.mkdirSync(SHOT, { recursive: true });
const DRY = process.argv.includes('--dry');
const N = (() => { const i = process.argv.indexOf('--n'); return i > -1 ? parseInt(process.argv[i + 1] || '2', 10) : 2; })();
const PROFILE = process.env.IG_HANDLE || 'luxestyle.ch';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function clickFirst(scope, sels, timeout = 4000) {
  for (const s of sels) { try { const l = scope.locator(s).first(); await l.waitFor({ state: 'visible', timeout }); await l.click(); return true; } catch {} }
  return false;
}

(async () => {
  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('❌ Kein Brave auf 9222. Brave mit --remote-debugging-port=9222 starten + bei instagram.com eingeloggt.'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  const p = await ctx.newPage();
  await p.goto(`https://www.instagram.com/${PROFILE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  await p.screenshot({ path: path.join(SHOT, 'profile-before.png') });
  log('Profil-Screenshot: ig-delete-shots/profile-before.png');

  let deleted = 0;
  for (let i = 0; i < N; i++) {
    // immer den OBERSTEN Grid-Post oeffnen (nach jedem Loeschen rutscht der naechste nach oben)
    await p.goto(`https://www.instagram.com/${PROFILE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(3500);
    const firstPost = p.locator('main a[href*="/p/"], main a[href*="/reel/"]').first();
    if (!(await firstPost.count().catch(() => 0))) { log('Kein Post gefunden — Stop.'); break; }
    await firstPost.click().catch(() => {});
    await sleep(3000);
    await p.screenshot({ path: path.join(SHOT, `post-${i + 1}-open.png`) });
    if (DRY) { log(`[dry] Post ${i + 1} geoeffnet (Screenshot), NICHT geloescht.`); await p.keyboard.press('Escape').catch(() => {}); continue; }
    // ... (Mehr-Optionen) — robuste Erkennung: Selektoren + JS-Fallback (IG aendert aria-labels staendig)
    let menuOpen = await clickFirst(p, [
      'svg[aria-label="More options"]', 'svg[aria-label="Mehr Optionen"]',
      'svg[aria-label*="ptions"]', 'svg[aria-label*="ptionen"]',
      '[aria-label="More options"]', '[aria-label="Mehr Optionen"]',
      '[aria-label*="ptions"]', '[aria-label*="ptionen"]',
      'div[role="dialog"] button[aria-label*="ption"]', 'div[role="button"][aria-label*="ption"]'
    ]);
    if (!menuOpen) {
      // JS-Fallback: klickbares Element, dessen aria-label "option/optionen" enthaelt (im Dialog bevorzugt)
      menuOpen = await p.evaluate(() => {
        const norm = (s) => (s || '').toLowerCase();
        const scope = document.querySelector('div[role="dialog"]') || document;
        const cands = [...scope.querySelectorAll('[aria-label]')].filter(e => /option|optionen/.test(norm(e.getAttribute('aria-label'))));
        const el = cands[0]?.closest('button,[role="button"],div[role="button"]') || cands[0];
        if (el) { el.click(); return true; }
        return false;
      }).catch(() => false);
      if (menuOpen) await sleep(1200);
    }
    if (!menuOpen) {
      await p.screenshot({ path: path.join(SHOT, `post-${i + 1}-no-menu.png`) }); log('Menue (...) nicht gefunden — Stop.'); break;
    }
    await sleep(1200);
    if (!await clickFirst(p, ['button:has-text("Delete")', 'button:has-text("Löschen")', 'div[role="button"]:has-text("Delete")', 'div[role="button"]:has-text("Löschen")', '*:has-text("Löschen")'])) {
      await p.screenshot({ path: path.join(SHOT, `post-${i + 1}-no-del.png`) }); log('"Loeschen" nicht gefunden — Stop.'); break;
    }
    await sleep(1200);
    await clickFirst(p, ['button:has-text("Delete")', 'button:has-text("Löschen")']); // Bestaetigung
    await sleep(3500);
    await p.screenshot({ path: path.join(SHOT, `post-${i + 1}-after.png`) });
    deleted++; log(`✅ Post ${i + 1} geloescht.`);
  }
  await p.goto(`https://www.instagram.com/${PROFILE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await sleep(4000);
  await p.screenshot({ path: path.join(SHOT, 'profile-after.png') });
  log(`Fertig: ${deleted} geloescht${DRY ? ' (dry)' : ''}. Screenshots in automation/local/ig-delete-shots/`);
  process.exit(0);
})();
