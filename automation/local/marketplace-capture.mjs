#!/usr/bin/env node
/* LuxeStyle — marketplace-capture.mjs  (read-only)
 * =============================================================================================
 * Screenshot-tet Nachrichten-Inbox + Profil/Einstellungen von tutti, anibis & Ricardo ueber das
 * eingeloggte Brave (CDP 9222) — damit die Cloud-Session die UIs SIEHT und danach Auto-Antwort +
 * Profil-Bearbeitung exakt baut (statt zu raten). User 2026-06-21 "antworte auch ... profil bearbeiten".
 * AENDERT NICHTS. Output: automation/local/marketplace-shots/*.png + reports/marketplace-capture.json
 *
 * START am PC:  node automation/local/marketplace-capture.mjs
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url)))));
const SHOT = path.join(ROOT, 'automation', 'local', 'marketplace-shots');
fs.mkdirSync(SHOT, { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Bekannte/wahrscheinliche URLs (mehrere probieren, screenshotten was laedt)
const TARGETS = [
  { site: 'tutti', urls: ['https://www.tutti.ch/de/account/messages', 'https://www.tutti.ch/de/messages', 'https://www.tutti.ch/de/account', 'https://www.tutti.ch/de/account/settings'] },
  { site: 'anibis', urls: ['https://www.anibis.ch/de/messages', 'https://www.anibis.ch/de/account/messages', 'https://www.anibis.ch/de/account', 'https://www.anibis.ch/de/myanibis'] },
  { site: 'ricardo', urls: ['https://www.ricardo.ch/de/account/messages/', 'https://www.ricardo.ch/de/myricardo/messages/', 'https://www.ricardo.ch/de/account/', 'https://www.ricardo.ch/de/myricardo/'] },
];

(async () => {
  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('❌ Kein Brave auf 9222.'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  const p = await ctx.newPage();
  const result = { ts: new Date().toISOString(), pages: [] };
  let i = 1;
  for (const t of TARGETS) {
    for (const url of t.urls) {
      try {
        await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(5000);
        const name = `${String(i).padStart(2, '0')}-${t.site}.png`;
        await p.screenshot({ path: path.join(SHOT, name) });
        const info = await p.evaluate(() => ({ url: location.href, title: document.title,
          loggedIn: !/login|anmelden|sign in/i.test(document.body.innerText.slice(0, 400)),
          body: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 180) })).catch(() => ({}));
        result.pages.push({ site: t.site, tried: url, ...info, screenshot: name });
        log(`${t.site}: ${info.url || url} (loggedIn=${info.loggedIn})`);
        i++;
        break; // erste ladbare URL je Site reicht
      } catch (e) { log(`${t.site} ${url}: ${String(e).slice(0, 50)}`); }
    }
  }
  fs.writeFileSync(path.join(ROOT, 'reports', 'marketplace-capture.json'), JSON.stringify(result, null, 2));
  log('✅ Fertig. Screenshots in marketplace-shots/, Info reports/marketplace-capture.json');
  await p.close().catch(() => {});
  process.exit(0);
})();
