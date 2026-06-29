#!/usr/bin/env node
/* tiktok-ads-learn.mjs — der Bot LERNT den nativen TikTok Ads Manager (ads.tiktok.com).
 * Verbindet zum lokalen Brave (--remote-allow-origins muss an sein, via CLOUD-AN), navigiert zu den
 * angegebenen ads.tiktok.com-Seiten und dumpt die komplette Struktur (Frames, Ueberschriften, Buttons,
 * Inputs/Felder, Links) nach reports/tiktok-ads-learn.txt. So sehe ich, was es gibt, und baue danach die Bedienung.
 *
 * ENV: CDP_HOST (default 127.0.0.1). URLS via ENV TT_LEARN_URLS (komma-getrennt) sonst Defaults.
 * Lauf: CDP_HOST=127.0.0.1 node automation/vps/tiktok-ads-learn.mjs
 */
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const HOST = process.env.CDP_HOST || '127.0.0.1';
const URLS = (process.env.TT_LEARN_URLS || 'https://ads.tiktok.com/ac/page/settings,https://ads.tiktok.com/i18n/dashboard,https://ads.tiktok.com/i18n/perf/creation').split(',');
const out = [];
const W = (m) => { out.push(m); try { writeFileSync('reports/tiktok-ads-learn.txt', out.join('\n') + '\n'); } catch {} };

async function dumpPage(p, label) {
  W('\n===== ' + label + ' =====');
  W('url=' + p.url());
  for (const f of p.frames()) {
    let d;
    try {
      d = await f.evaluate(() => {
        const txt = (el) => (el.innerText || el.getAttribute('aria-label') || el.placeholder || '').trim().replace(/\s+/g, ' ');
        const heads = [...document.querySelectorAll('h1,h2,h3,[role=heading]')].map(txt).filter(s => s && s.length < 60).slice(0, 20);
        const btns = [...document.querySelectorAll('button,[role=button],a[href]')].map(txt).filter(s => s && s.length < 32).slice(0, 40);
        const inps = [...document.querySelectorAll('input,select,textarea')].map(x => (x.tagName + ':' + (x.type || '') + ':' + (x.placeholder || x.getAttribute('aria-label') || x.name || '')).slice(0, 36)).filter(s => s.length > 6).slice(0, 25);
        const tabs = [...document.querySelectorAll('[role=tab],[role=menuitem],nav a')].map(txt).filter(s => s && s.length < 30).slice(0, 25);
        return { h: heads, t: tabs, b: btns, i: inps, blen: (document.body.innerText || '').length };
      });
    } catch { d = null; }
    if (!d) { W('  [frame x-origin] ' + (f.url() || '').slice(0, 50)); continue; }
    W('  [frame] ' + (f.url() || '').replace(/^https?:\/\//, '').slice(0, 50) + ' bodylen=' + d.blen);
    if (d.h.length) W('    HEADINGS: ' + JSON.stringify(d.h));
    if (d.t.length) W('    TABS/NAV: ' + JSON.stringify(d.t));
    if (d.b.length) W('    BUTTONS: ' + JSON.stringify(d.b));
    if (d.i.length) W('    INPUTS: ' + JSON.stringify(d.i));
  }
}

(async () => {
  let br;
  try {
    if (HOST === '127.0.0.1' || HOST === 'localhost') br = await chromium.connectOverCDP('http://127.0.0.1:9222', { timeout: 20000 });
    else { const j = await (await fetch(`http://${HOST}:9222/json/version`, { headers: { Host: '127.0.0.1:9222' }, signal: AbortSignal.timeout(8000) })).json(); br = await chromium.connectOverCDP(j.webSocketDebuggerUrl.replace(/127\.0\.0\.1|localhost/, HOST), { timeout: 20000 }); }
  } catch (e) { W('CONNECT-FAIL: ' + String(e).slice(0, 90)); process.exit(0); }
  try {
    const ctx = br.contexts()[0] || await br.newContext();
    const p = (br.contexts().flatMap(c => c.pages())[0]) || await ctx.newPage();
    W('TikTok-Ads-Manager LERN-DUMP @ ' + new Date().toISOString());
    for (const u of URLS) {
      try { await p.goto(u.trim(), { waitUntil: 'domcontentloaded', timeout: 45000 }); await p.waitForTimeout(7000); await dumpPage(p, u.trim()); }
      catch (e) { W('\n===== ' + u + ' ===== FEHLER ' + String(e).slice(0, 60)); }
    }
    // Login-Status grob
    try { const body = await p.evaluate(() => (document.body.innerText || '').slice(0, 200)); if (/log ?in|anmelden|sign in/i.test(body) && !/Dashboard|Kampagne|campaign|Konto/i.test(body)) W('\n⚠️ LOGIN noetig: brave-agent ist evtl. nicht bei ads.tiktok.com eingeloggt.'); } catch {}
    W('\n===== ENDE =====');
  } catch (e) { W('Fehler: ' + String(e).slice(0, 90)); }
  finally { await br.close().catch(() => {}); }
})();
