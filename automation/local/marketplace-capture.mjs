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

// ROBUST (Fix 2026-06-21, geratene URLs gaben 404): von der STARTSEITE aus durch das Konto-Menue
// klicken (Nachrichten/Profil/Konto), statt URLs zu raten. Startseite laedt immer -> Screenshot zeigt die UI.
const TARGETS = [
  { site: 'tutti', home: 'https://www.tutti.ch/de' },
  { site: 'anibis', home: 'https://www.anibis.ch/de' },
  { site: 'ricardo', home: 'https://www.ricardo.ch/de' },
];
const MENU_LINKS = ['Nachrichten', 'Mein Konto', 'Mein Profil', 'Profil', 'Konto', 'Einstellungen', 'Messages', 'Mes messages', 'Mon compte'];
async function clickByText(p, labels) {
  for (const t of labels) { for (const loc of [p.getByRole('link', { name: t }).first(), p.getByRole('button', { name: t }).first(), p.getByText(t, { exact: false }).first()]) {
    try { if (await loc.isVisible({ timeout: 1000 })) { await loc.click({ timeout: 2500 }); return t; } } catch {} } }
  return null;
}

(async () => {
  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('❌ Kein Brave auf 9222.'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  const p = await ctx.newPage();
  // Bekannte echte URLs (vom User verifiziert) als Seed je Site:
  const SEED = { anibis: ['https://www.anibis.ch/de/user/profile', 'https://www.anibis.ch/de/user/messages'], tutti: [], ricardo: [] };
  const result = { ts: new Date().toISOString(), pages: [], discovered: {} };
  let i = 1;
  for (const t of TARGETS) {
    try {
      // 1) Startseite (laedt immer) -> Screenshot + ECHTE Konto/Profil/Message-URLs aus hrefs ziehen
      await p.goto(t.home, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
      await sleep(5000);
      await p.screenshot({ path: path.join(SHOT, `${String(i).padStart(2, '0')}-${t.site}-home.png`) }); i++;
      const links = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.href)
        .filter(h => /user|account|profil|konto|message|nachricht|mein|compte|mes-/i.test(h)));
      const uniq = [...new Set([...(SEED[t.site] || []), ...links])].slice(0, 6);
      result.discovered[t.site] = uniq;
      log(`${t.site}: ${uniq.length} Konto/Profil-Links gefunden`);
      // 2) Jede Kandidaten-URL oeffnen + screenshotten
      for (const url of uniq) {
        try {
          await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 }); await sleep(4000);
          const name = `${String(i).padStart(2, '0')}-${t.site}.png`;
          await p.screenshot({ path: path.join(SHOT, name) });
          const info = await p.evaluate(() => ({ url: location.href, title: document.title,
            is404: /404|nicht.*finden|pas.*trouver|not found/i.test(document.body.innerText.slice(0, 300)),
            loggedIn: !/login|anmelden|sign in/i.test(document.body.innerText.slice(0, 400)),
            body: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 160) })).catch(() => ({}));
          result.pages.push({ site: t.site, url, ...info, screenshot: name }); i++;
          log(`  ${url} (404=${info.is404} loggedIn=${info.loggedIn})`);
        } catch (e) { log(`  ${url}: ${String(e).slice(0, 40)}`); }
      }
    } catch (e) { log(`${t.site}: ${String(e).slice(0, 50)}`); }
  }
  fs.writeFileSync(path.join(ROOT, 'reports', 'marketplace-capture.json'), JSON.stringify(result, null, 2));
  log('✅ Fertig. Screenshots in marketplace-shots/, Info reports/marketplace-capture.json');
  await p.close().catch(() => {});
  process.exit(0);
})();
