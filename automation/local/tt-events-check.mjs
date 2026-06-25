#!/usr/bin/env node
/* tt-events-check.mjs — oeffnet den TikTok Events Manager (Pixel D8EKVR) ueber das eingeloggte Brave (CDP 9222)
 * und macht Screenshots + liest grob, ob WEB-EVENTS reinkommen (PageView/AddToCart/...). DAS ist der echte
 * Beweis, ob der Pixel Daten sammelt (nicht nur HTML-Check). Nicht-destruktiv, schliesst seinen Tab selbst.
 *
 * START am PC:  node automation/local/tt-events-check.mjs
 * Voraussetzung: Brave --remote-debugging-port=9222, bei ads.tiktok.com (Konto LuxeStyle CH Ads) eingeloggt.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
setTimeout(() => { console.log('WATCHDOG 5min -> exit'); process.exit(1); }, 300000).unref();

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url)))));
const SHOT = path.join(ROOT, 'automation', 'local', 'tt-events-shots');
fs.mkdirSync(SHOT, { recursive: true });
const ADV = process.env.TT_ADVERTISER_ID || '7646349875793182738';
const PIXEL = process.env.TIKTOK_PIXEL_ID || 'D8EKVR3C77U6KT5BTBD0';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pT = (pr, ms, l = 'op') => Promise.race([Promise.resolve(pr).catch(() => null), new Promise(r => setTimeout(() => { log('timeout', l); r(null); }, ms))]);
const report = { ts: new Date().toISOString(), pixel: PIXEL, shots: [], eventLines: [] };
let STEP = 0;
const shot = async (p, name) => { try { await p.screenshot({ path: path.join(SHOT, `${String(++STEP).padStart(2, '0')}-${name}.png`) }); report.shots.push(name); } catch {} };

// Mehrere moegliche Events-Manager-URLs (TikTok aendert die Pfade) — erste, die laedt, gewinnt.
const URLS = [
  `https://ads.tiktok.com/i18n/events_manager/pixel/detail?aadvid=${ADV}&pixel_code=${PIXEL}`,
  `https://ads.tiktok.com/i18n/events_manager/overview?aadvid=${ADV}`,
  `https://ads.tiktok.com/i18n/assets/event?aadvid=${ADV}`,
];

(async () => {
  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('Kein Brave auf 9222.'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  const p = await ctx.newPage();
  for (let i = 0; i < URLS.length; i++) {
    await p.goto(URLS[i], { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(9000);
    await shot(p, 'events-' + (i + 1));
    const onSelect = await pT(p.evaluate(() => /select an account|konto auswählen/i.test(document.body.innerText || '')), 12000, 'sel');
    if (onSelect) { // Konto waehlen, dann nochmal
      await pT(p.evaluate((a) => { const el = [...document.querySelectorAll('a,div,li,button')].find(e => (e.innerText || '').includes(a) || /luxestyle ch ads/i.test(e.innerText || '')); if (el) (el.closest('a,[role="button"],li,div') || el).click(); }, ADV), 8000, 'pick');
      await sleep(6000); await p.goto(URLS[i], { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {}); await sleep(8000); await shot(p, 'events-' + (i + 1) + 'b');
    }
    // Event-relevante Zeilen grob einsammeln
    const lines = await pT(p.evaluate(() => {
      const t = document.body.innerText || '';
      return t.split('\n').map(s => s.trim()).filter(s => /pageview|page view|add ?to ?cart|complete ?payment|view ?content|initiate ?checkout|events? (received|today)|\bno data\b|keine daten|\d+ events?/i.test(s)).slice(0, 25);
    }), 12000, 'lines') || [];
    if (lines.length) { report.eventLines = lines; log('Event-Zeilen gefunden auf URL', i + 1, '→', lines.length); break; }
  }
  fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'reports', 'tt-events-check.json'), JSON.stringify(report, null, 2));
  log('FERTIG. Event-Zeilen:', report.eventLines.slice(0, 8).join(' | ') || '(keine erkannt — Screenshots ansehen)');
  log('Screenshots: automation/local/tt-events-shots/ · Report: reports/tt-events-check.json');
  await p.close().catch(() => {});
  process.exit(0);
})();
