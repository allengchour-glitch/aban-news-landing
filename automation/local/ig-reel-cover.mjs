#!/usr/bin/env node
/* ig-reel-cover.mjs - VERSUCHT, das Cover der N neuesten Instagram-Reels zu aendern, ueber das
 * eingeloggte Brave (CDP Port 9222). MIT Screenshots in jedem Schritt zur Kontrolle.
 *
 * HINTERGRUND (User 2026-06-23): 2 Reels hatten ein schwarzes Grid-Cover (Fade-in aus Schwarz ->
 * IG nahm Frame 0 = schwarz). Kuenftige Reels sind durch thumb_offset im Worker gefixt. Fuer die
 * BESTEHENDEN versuchen wir den Cover-Edit ueber den Port.
 * ⚠️ EHRLICHE LEHRE: Instagram-DESKTOP-WEB bietet fuer bereits veroeffentlichte Reels meist KEINEN
 * Cover-Picker (nur Caption/Alt-Text/Tags). Dieses Tool probiert es trotzdem + dokumentiert per
 * Screenshot, OB der Web-Pfad existiert. Existiert er nicht -> Fallback = Handy-App (20 Sek/Reel).
 *
 * START am PC:  node automation/local/ig-reel-cover.mjs           (2 neueste Reels, Versuch + Screenshots)
 *               node automation/local/ig-reel-cover.mjs --n 1     (nur 1)
 * Voraussetzung: Brave mit --remote-debugging-port=9222, bei instagram.com (luxestyle.ch) eingeloggt.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url)))));
const SHOT = path.join(ROOT, 'automation', 'local', 'ig-cover-shots');
fs.mkdirSync(SHOT, { recursive: true });
const N = (() => { const i = process.argv.indexOf('--n'); return i > -1 ? parseInt(process.argv[i + 1] || '2', 10) : 2; })();
const PROFILE = process.env.IG_HANDLE || 'luxestyle.ch';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const report = { ts: new Date().toISOString(), profile: PROFILE, reels: [], webCoverSupported: false };

async function clickFirst(scope, sels, timeout = 4000) {
  for (const s of sels) {
    try { const l = scope.locator(s).first(); await l.waitFor({ state: 'visible', timeout }); await l.click(); return s; } catch {}
  }
  return null;
}

(async () => {
  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('Kein Brave auf 9222. Brave mit --remote-debugging-port=9222 starten + bei instagram.com eingeloggt.'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  const p = await ctx.newPage();
  await p.goto(`https://www.instagram.com/${PROFILE}/reels/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  await p.screenshot({ path: path.join(SHOT, 'reels-grid.png') });
  log('Reels-Grid: ig-cover-shots/reels-grid.png');

  // Reel-Links einsammeln (neueste zuerst)
  const links = await p.locator('main a[href*="/reel/"]').evaluateAll(
    els => [...new Set(els.map(e => e.getAttribute('href')).filter(Boolean))]
  ).catch(() => []);
  log(`Gefundene Reel-Links: ${links.length}`);

  for (let i = 0; i < Math.min(N, links.length); i++) {
    const href = links[i];
    const rr = { href, coverEditFound: false, steps: [] };
    try {
      await p.goto('https://www.instagram.com' + href, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(3500);
      await p.screenshot({ path: path.join(SHOT, `reel-${i + 1}-open.png`) });

      // "Mehr Optionen" oeffnen
      const more = await clickFirst(p, [
        'svg[aria-label="More options"]', 'svg[aria-label="Mehr Optionen"]',
        'svg[aria-label*="ptions"]', 'svg[aria-label*="ptionen"]',
        '[aria-label*="ptions"]', '[aria-label*="ptionen"]'
      ]);
      rr.steps.push('more-options:' + (more || 'NICHT-gefunden'));
      await sleep(1500);
      await p.screenshot({ path: path.join(SHOT, `reel-${i + 1}-menu.png`) });

      // "Bearbeiten" klicken
      const edit = await clickFirst(p, [
        'button:has-text("Bearbeiten")', 'button:has-text("Edit")',
        'div[role="dialog"] :text("Bearbeiten")', 'div[role="dialog"] :text("Edit")'
      ]);
      rr.steps.push('edit:' + (edit || 'NICHT-gefunden'));
      await sleep(2500);
      await p.screenshot({ path: path.join(SHOT, `reel-${i + 1}-edit.png`) });

      // Cover-/Titelbild-Picker suchen (existiert auf Web fuer Reels meist NICHT)
      const coverHints = ['Titelbild', 'Cover', 'Coverbild', 'Vorschaubild', 'Profilraster', 'Cover photo', 'Thumbnail'];
      let found = false;
      for (const h of coverHints) {
        if (await p.locator(`text=${h}`).first().count().catch(() => 0)) { found = true; rr.steps.push('cover-hint:' + h); break; }
      }
      rr.coverEditFound = found;
      if (found) report.webCoverSupported = true;
      log(`Reel ${i + 1} (${href}): Cover-Edit ${found ? 'GEFUNDEN' : 'nicht vorhanden (Web)'}`);

      // Dialog schliessen (nichts veraendern -> nicht-destruktiv)
      await p.keyboard.press('Escape').catch(() => {});
      await sleep(800);
      await p.keyboard.press('Escape').catch(() => {});
    } catch (e) { rr.steps.push('ERR:' + String(e).slice(0, 80)); log('Fehler bei Reel', i + 1, String(e).slice(0, 80)); }
    report.reels.push(rr);
    await sleep(1500);
  }

  fs.writeFileSync(path.join(ROOT, 'reports', 'ig-cover.json'), JSON.stringify(report, null, 2));
  log('FAZIT: Web-Cover-Edit ' + (report.webCoverSupported ? 'IST verfuegbar -> Folge-Tool kann setzen.' : 'NICHT verfuegbar -> Cover nur in der Handy-App aenderbar (20 Sek/Reel).'));
  log('Report: reports/ig-cover.json + Screenshots: automation/local/ig-cover-shots/');
})();
