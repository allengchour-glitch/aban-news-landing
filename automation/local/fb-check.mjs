#!/usr/bin/env node
/* fb-check.mjs — SCREENSHOT-Check der LuxeStyle-Facebook-Seite über das eingeloggte Brave (CDP 9222).
 * Nicht-destruktiv: öffnet die Seite, scrollt die letzten Posts durch, macht Screenshots → damit man
 * Dubletten / Herren-Frauen-Mix / Bild-Qualität / asiatische Schrift prüfen kann (User: "fb schau du,
 * mach immer alles screenshot check"). LÖSCHT NICHTS.
 *
 * START am PC:  node automation/local/fb-check.mjs
 * Voraussetzung: Brave 9222 bei facebook.com (Seite "LuxeStyle CH") eingeloggt.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url)))));
const SHOT = path.join(ROOT, 'automation', 'local', 'fb-check-shots');
fs.mkdirSync(SHOT, { recursive: true });
// FB-Seite: numerische ID (LuxeStyle CH 1049840534888592) ODER PAGE-ENV.
const PAGE = process.env.FB_PAGE || '1049840534888592';
const URL = `https://www.facebook.com/${PAGE}`;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const report = { ts: new Date().toISOString(), page: PAGE, url: URL, shots: [] };

(async () => {
  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('Kein Brave auf 9222. Brave mit --remote-debugging-port=9222 + bei facebook.com eingeloggt.'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  const p = await ctx.newPage();
  try {
    await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(6000);
    if (/\/login/i.test(p.url())) { log('❌ Nicht eingeloggt bei Facebook.'); await p.screenshot({ path: path.join(SHOT, 'login.png') }); process.exit(0); }
    // Top der Seite
    await p.screenshot({ path: path.join(SHOT, 'fb-top.png') });
    report.shots.push('fb-top.png');
    log('Screenshot: fb-top.png');
    // 4× scrollen, je 1 Screenshot der letzten Posts
    for (let i = 1; i <= 4; i++) {
      await p.mouse.wheel(0, 1600);
      await sleep(2500);
      const f = `fb-scroll-${i}.png`;
      await p.screenshot({ path: path.join(SHOT, f) });
      report.shots.push(f);
      log('Screenshot:', f);
    }
    // Captions der sichtbaren Posts grob einsammeln (für Dubletten-Hinweis)
    const texts = await p.locator('[role="article"]').allInnerTexts().catch(() => []);
    const caps = texts.map(t => t.slice(0, 60).replace(/\s+/g, ' ')).slice(0, 15);
    const seen = {}; caps.forEach(c => seen[c] = (seen[c] || 0) + 1);
    report.possibleDuplicates = Object.entries(seen).filter(([c, n]) => n > 1 && c.trim()).map(([c, n]) => `${n}x ${c}`);
    log('Mögliche Dubletten:', report.possibleDuplicates.length ? report.possibleDuplicates.join(' | ') : 'keine offensichtlichen');
  } catch (e) { log('Fehler:', String(e).slice(0, 100)); }
  fs.writeFileSync(path.join(ROOT, 'reports', 'fb-check.json'), JSON.stringify(report, null, 2));
  log('Fertig. Screenshots: automation/local/fb-check-shots/ · Report: reports/fb-check.json');
  process.exit(0);
})();
