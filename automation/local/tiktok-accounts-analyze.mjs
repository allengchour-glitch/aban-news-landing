#!/usr/bin/env node
/* LuxeStyle — tiktok-accounts-analyze.mjs
 * =============================================================================================
 * Geht ALLE TikTok-Werbekonten durch (Brave CDP 9222, eingeloggt), screenshot-tet Konto-Liste +
 * je Konto das Dashboard (Guthaben/Spend/Impressions) und schreibt eine Zusammenfassung, damit die
 * Cloud-Session ALLES selbst analysieren kann (User 2026-06-21 "screenshot du das du alles selber
 * machen kannst"). Read-only: NICHTS wird geaendert/ausgegeben.
 *
 * START am PC:  node automation/local/tiktok-accounts-analyze.mjs
 * Output: automation/local/account-shots/*.png + reports/tiktok-accounts.json
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url)))));
const SHOT = path.join(ROOT, 'automation', 'local', 'account-shots');
const OUT = path.join(ROOT, 'reports', 'tiktok-accounts.json');
fs.mkdirSync(SHOT, { recursive: true });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Bekannte aadvids (aus Memory) + alle, die wir aus dem Dropdown/Links finden:
const KNOWN = (process.env.TT_AADVIDS || '7643589765259493393,7646349875793182738').split(',').map(s => s.trim()).filter(Boolean);

(async () => {
  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('❌ Kein Brave auf 9222. Brave mit --remote-debugging-port=9222 + bei ads.tiktok.com eingeloggt.'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  const p = await ctx.newPage();
  const result = { ts: new Date().toISOString(), accounts: [], aadvids_found: [] };

  // 1) Dashboard oeffnen + Konto-Switcher-Dropdown screenshotten (zeigt alle Konten)
  await p.goto('https://ads.tiktok.com/i18n/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(8000);
  await p.screenshot({ path: path.join(SHOT, '00-dashboard.png') }).catch(() => {});
  // Konto-Switcher (oben rechts) anklicken — mehrere Selektoren probieren
  for (const sel of ['[class*="account"][class*="select"]', 'header [class*="dropdown"]', '[data-testid*="account"]']) {
    try { const el = p.locator(sel).first(); if (await el.isVisible({ timeout: 1500 })) { await el.click({ timeout: 3000 }); break; } } catch {}
  }
  await sleep(2500);
  await p.screenshot({ path: path.join(SHOT, '01-account-dropdown.png') }).catch(() => {});

  // 2) aadvids aus allen Links/DOM ziehen (Dropdown-Eintraege haben oft ?aadvid=… Links)
  const found = await p.evaluate(() => {
    const ids = new Set();
    document.querySelectorAll('a[href*="aadvid="]').forEach(a => { const m = a.href.match(/aadvid=(\d+)/); if (m) ids.add(m[1]); });
    // auch Text der Konto-Liste mitnehmen
    const names = [...document.querySelectorAll('[class*="account"], [role="option"], li')]
      .map(e => (e.innerText || '').trim()).filter(t => t && t.length < 60 && /[A-Za-z]/.test(t)).slice(0, 40);
    return { ids: [...ids], names };
  }).catch(() => ({ ids: [], names: [] }));
  result.aadvids_found = found.ids;
  result.dropdown_names = found.names;
  log('aadvids im DOM:', found.ids.join(', ') || '(keine — Screenshot 01 ansehen)');

  // 3) Je Konto (bekannte + gefundene) das Dashboard oeffnen + Guthaben/Spend extrahieren
  const all = [...new Set([...KNOWN, ...found.ids])];
  let i = 1;
  for (const id of all) {
    await p.goto(`https://ads.tiktok.com/i18n/dashboard?aadvid=${id}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await sleep(7000);
    const shotName = `acct-${String(i).padStart(2, '0')}-${id}.png`;
    await p.screenshot({ path: path.join(SHOT, shotName) }).catch(() => {});
    const data = await p.evaluate(() => {
      const t = (document.body.innerText || '');
      const grab = (re) => { const m = t.match(re); return m ? m[1].trim() : null; };
      return {
        accountName: grab(/([A-Za-z][\w .'-]{2,40})\s*[▾⌄]/) || null,
        balance: grab(/Available balance[^\d]*([\d'’,.]+\s*CHF)/i) || grab(/Verf[uü]gbares Guthaben[^\d]*([\d'’,.]+\s*CHF)/i),
        todaySpend: grab(/Today'?s spend[^\d]*([\d'’,.]+\s*CHF)/i),
        cost: grab(/Cost[^\d]*([\d'’,.]+\s*CHF)/i),
        impressions: grab(/Impressions[^\d]*([\d'’,. ]+)/i),
        onboarding: /add business info|welcome to tiktok ads manager|select an industry/i.test(t),
      };
    }).catch(() => ({}));
    result.accounts.push({ aadvid: id, screenshot: shotName, ...data });
    log(`Konto ${id}: balance=${data.balance || '?'} cost=${data.cost || '?'} onboarding=${data.onboarding}`);
    i++;
  }

  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  log(`✅ Fertig: ${all.length} Konten. Screenshots in account-shots/, Zusammenfassung reports/tiktok-accounts.json`);
  await p.close().catch(() => {});
  process.exit(0);
})();
