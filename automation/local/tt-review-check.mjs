#!/usr/bin/env node
/* tt-review-check.mjs — liest die EXAKTE TikTok-Ablehnungs-Begruendung der abgelehnten Ads aus, ueber das
 * eingeloggte Brave (CDP 9222). NICHT-destruktiv: oeffnet den Ad-Tab, klappt "Not delivering / Review not
 * approved" auf, schiesst Screenshots + extrahiert den Grund-Text -> reports/tt-review-check.json.
 *
 * HINTERGRUND (User 2026-06-24): Kampagne "Sales20260606004848" liefert nicht — "One or more ad creatives
 * have been rejected." Wir wollen den GENAUEN Grund (Musik? Overlay-Text? Qualitaet?), um ihn beim neuen
 * sauberen Creative zu vermeiden (Lern-Auftrag).
 *
 * START am PC:  node automation/local/tt-review-check.mjs
 * Voraussetzung: Brave --remote-debugging-port=9222, bei ads.tiktok.com (Konto LuxeStyle CH Ads) eingeloggt.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
setTimeout(() => { console.log('WATCHDOG 5min -> exit'); process.exit(1); }, 300000).unref();

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url)))));
const SHOT = path.join(ROOT, 'automation', 'local', 'tt-review-shots');
fs.mkdirSync(SHOT, { recursive: true });
const ADV = process.env.TT_ADVERTISER_ID || '7646349875793182738';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pTimeout = (pr, ms, l = 'op') => Promise.race([Promise.resolve(pr).catch(() => null), new Promise(r => setTimeout(() => { log('timeout', l); r(null); }, ms))]);
const report = { ts: new Date().toISOString(), advertiser: ADV, rejections: [], shots: [] };
let STEP = 0;
const shot = async (p, name) => { try { await p.screenshot({ path: path.join(SHOT, `${String(++STEP).padStart(2, '0')}-${name}.png`) }); report.shots.push(name); } catch {} };

(async () => {
  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('Kein Brave auf 9222.'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  const p = await ctx.newPage();
  // Ad-Ebene direkt oeffnen (zeigt Creative-Status inkl. Ablehnung)
  await p.goto(`https://ads.tiktok.com/i18n/perf/creative/ad?aadvid=${ADV}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(9000);
  await shot(p, 'ad-list');

  // Status-/Reject-Texte einsammeln
  const grab = async () => (await pTimeout(p.evaluate(() => {
    const txt = document.body.innerText || '';
    const lines = txt.split('\n').map(s => s.trim()).filter(Boolean);
    const rej = lines.filter(l => /reject|not approved|not delivering|abgelehnt|nicht genehmigt|review|violat|prohibited|music|copyright|unauthorized|nicht zugelassen/i.test(l));
    return { hasRejected: /reject|not approved|abgelehnt|nicht genehmigt/i.test(txt), lines: rej.slice(0, 40) };
  }), 15000, 'grab')) || { hasRejected: false, lines: [] };

  let info = await grab();
  log('Abgelehnt erkannt:', info.hasRejected, '| Treffer-Zeilen:', info.lines.length);

  // "Not delivering" / Status-Badge anklicken, um den Detail-Grund aufzuklappen
  await pTimeout(p.evaluate(() => {
    const el = [...document.querySelectorAll('span,div,a,button')].find(e => /not delivering|not approved|rejected|abgelehnt|nicht genehmigt/i.test((e.innerText || '').trim()) && (e.innerText || '').length < 60);
    if (el) el.click();
  }), 8000, 'click-status');
  await sleep(3500);
  await shot(p, 'reason-open');
  const info2 = await grab();
  // beide Sammlungen vereinen (deduped)
  const all = [...new Set([...info.lines, ...info2.lines])];
  report.rejections = all;
  report.hasRejected = info.hasRejected || info2.hasRejected;

  fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'reports', 'tt-review-check.json'), JSON.stringify(report, null, 2));
  log('FERTIG. Gruende:', all.slice(0, 8).join(' | ') || '(keine Klartext-Begruendung gefunden — Screenshots pruefen)');
  log('Report: reports/tt-review-check.json + Screenshots: automation/local/tt-review-shots/');
  await p.close().catch(() => {});
  process.exit(0);
})();
