#!/usr/bin/env node
/* tiktok-bio.mjs - setzt die TikTok-Profil-Bio via PC-Brave (CDP 9222). Kein Geld, reversibel.
 * Muster wie smartplus-drive: robuste Text-Selektoren (DE-UI), Trace nach reports/tiktok-bio.txt,
 * Screenshot reports/tiktok-bio.png. ENV: TT_BIO (Text), CDP_HOST (default 127.0.0.1).
 */
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const BIO = process.env.TT_BIO || 'Wasserfester Schmuck & Mode aus der Schweiz | -10% mit Code WELCOME10';
const HOST = process.env.CDP_HOST || '127.0.0.1';
const out = [];
const T = (m) => { out.push(m); try { writeFileSync('reports/tiktok-bio.txt', out.join('\n') + '\n'); } catch {} console.log(m); };
setTimeout(() => { T('WATCHDOG 5min -> exit'); process.exit(1); }, 300000).unref();

(async () => {
  let br;
  try { br = await chromium.connectOverCDP('http://' + HOST + ':9222', { timeout: 25000 }); }
  catch (e) { T('CONNECT-FAIL: ' + String(e).slice(0, 100)); process.exit(0); }
  try {
    const ctx = br.contexts()[0] || await br.newContext();
    const p = await ctx.newPage();
    await p.goto('https://www.tiktok.com/@luxestyle.ch', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await p.waitForTimeout(5000);
    const body = await p.evaluate(() => (document.body.innerText || '').slice(0, 300)).catch(() => '');
    if (/log ?in|anmelden|sign up/i.test(body) && !/Profil bearbeiten|Edit profile/i.test(body)) { T('LOGIN-WAND: brave-agent nicht bei TikTok eingeloggt.'); await p.screenshot({ path: 'reports/tiktok-bio.png' }).catch(() => {}); process.exit(0); }
    // Profil bearbeiten oeffnen
    let opened = false;
    for (const sel of ['[data-e2e="edit-profile-entrance"]', 'button:has-text("Profil bearbeiten")', 'div:has-text("Profil bearbeiten")', 'button:has-text("Edit profile")']) {
      try { const b = p.locator(sel).first(); if (await b.count()) { await b.click({ timeout: 5000 }); opened = true; break; } } catch {}
    }
    T('edit-open=' + opened);
    await p.waitForTimeout(2500);
    // Bio-Feld finden + setzen
    let set = false;
    for (const sel of ['[data-e2e="edit-profile-bio"] textarea', 'textarea']) {
      try { const t = p.locator(sel).first(); if (await t.count()) { await t.click(); await t.fill(''); await t.fill(BIO); set = true; break; } } catch {}
    }
    T('bio-set=' + set + ' text=' + BIO);
    // Speichern
    let saved = false;
    for (const sel of ['[data-e2e="edit-profile-save"]', 'button:has-text("Speichern")', 'button:has-text("Save")']) {
      try { const b = p.locator(sel).first(); if (await b.count() && await b.isEnabled().catch(() => false)) { await b.click({ timeout: 5000 }); saved = true; break; } } catch {}
    }
    if (!saved) { try { saved = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Speichern|Save/i.test(x.textContent || '') && !x.disabled); if (b) { b.click(); return true; } return false; }); } catch {} }
    T('saved=' + saved);
    await p.waitForTimeout(3000);
    await p.screenshot({ path: 'reports/tiktok-bio.png' }).catch(() => {});
    T('ENDE ' + (saved && set ? 'OK' : 'UNVOLLSTAENDIG'));
    await p.close().catch(() => {});
  } catch (e) { T('Fehler: ' + String(e).slice(0, 120)); }
  finally { await br.close().catch(() => {}); }
})();
