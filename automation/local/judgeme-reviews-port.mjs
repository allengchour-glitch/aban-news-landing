#!/usr/bin/env node
/* judgeme-reviews-port.mjs — Judge.me (Bewertungen) über das eingeloggte Brave (CDP 9222) prüfen/aktivieren.
 * LÄUFT NUR AM PC (Brave eingeloggt bei Shopify-Admin + Judge.me).
 *
 * Ziel (ehrlich): (a) Status lesen — ist Judge.me installiert? Auto-Bewertungs-Anfrage an/aus? Wie viele Reviews?
 *   (b) GO=1: die AUTO-REVIEW-REQUEST-Mail aktivieren (sicher + ehrlich: echte Käufer nach Lieferung um echte
 *   Bewertung bitten). (c) Import echter Käufer-Reviews desselben Produkts (AliExpress) wird NUR gescreenshottet +
 *   verlinkt — die Auswahl (nur genuine, gemischte Ratings, moderat) braucht menschliches Urteil, sonst unehrlich.
 *
 * ⚠️ KEINE Fake-Reviews. Default DRY (nur lesen+Screenshot). GO=1 klickt nur den Auto-Request-Toggle.
 * Voraussetzung: Brave --remote-debugging-port=9222, bei admin.shopify.com + Judge.me eingeloggt.
 * ENV: [GO=1] · [CDP_URL=http://localhost:9222] · [STORE=luxestyle-ch]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
const CDP = process.env.CDP_URL || 'http://localhost:9222';
const GO = process.env.GO === '1';
const STORE = process.env.STORE || 'luxestyle-ch';
const SHOTS = 'automation/local/judgeme-shots';
const log = (...a) => console.log('judgeme:', ...a);
try { mkdirSync(SHOTS, { recursive: true }); mkdirSync('reports', { recursive: true }); } catch {}
const report = [];
const R = m => { report.push(m); log(m); try { writeFileSync('reports/judgeme.txt', `${new Date().toISOString()} ${GO ? 'GO' : 'DRY'}\n` + report.join('\n') + '\n'); } catch {} };

const URLS = [
  `https://admin.shopify.com/store/${STORE}/apps`,
  `https://admin.shopify.com/store/${STORE}/apps/judge-me-product-reviews-1`,
  `https://admin.shopify.com/store/${STORE}/apps/judgeme-reviews`,
];

async function bestFrame(page) {
  let best = page.mainFrame(), max = -1;
  for (const f of page.frames()) {
    try { const n = await f.evaluate(() => document.querySelectorAll('button,[role=button],input,a').length); if (n > max) { max = n; best = f; } } catch {}
  }
  return best;
}
async function readFrame(f) {
  try {
    return await f.evaluate(() => {
      const txt = (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 1400);
      const btns = [...document.querySelectorAll('button,[role=button],a')].map(x => (x.innerText || '').trim()).filter(s => s && s.length < 44).slice(0, 30);
      const toggles = [...document.querySelectorAll('input[type=checkbox],[role=switch]')].map(x => (x.getAttribute('aria-label') || x.name || x.getAttribute('aria-checked') || 'toggle')).slice(0, 20);
      return { txt, btns, toggles };
    });
  } catch (e) { return { txt: '', btns: [], toggles: [], err: String(e).slice(0, 80) }; }
}

(async () => {
  let chromium;
  try { ({ chromium } = await import('playwright')); } catch { try { ({ chromium } = await import('playwright-core')); } catch (e) { R('❌ playwright fehlt: ' + e.message); process.exit(1); } }
  let browser;
  try { browser = await chromium.connectOverCDP(CDP); }
  catch (e) { R('❌ Kein Brave auf ' + CDP + '. Brave 9222 + Shopify/Judge.me eingeloggt. ' + e.message); process.exit(1); }
  const ctx = browser.contexts()[0] || (await browser.newContext());
  const page = await ctx.newPage();
  let ok = false;
  for (const url of URLS) {
    try {
      R('→ öffne ' + url);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(5000);
      const cur = page.url();
      if (/accounts\.shopify|login|signin/i.test(cur) && !/apps/.test(cur)) { R('⚠️ Login-Redirect: ' + cur + ' → im Brave einloggen, dann erneut.'); continue; }
      // Settings→Apps-Liste: in die Judge.me-Reviews-App-ZEILE klicken (App installiert, Handle unbekannt)
      if (/\/apps|\/settings/.test(cur)) {
        let clicked = false;
        for (const name of ['Judge.me Reviews', 'JudgeMe Reviews']) {
          for (const loc of [page.getByRole('link', { name: new RegExp('^' + name, 'i') }), page.getByText(new RegExp('^' + name + '$', 'i'))]) {
            try { const el = loc.first(); if (await el.count()) { await el.click({ timeout: 5000 }); await page.waitForTimeout(6000); R('   „' + name + '"-Zeile geklickt → ' + page.url()); clicked = true; break; } } catch {}
          }
          if (clicked) break;
        }
        if (clicked) { await page.screenshot({ path: `${SHOTS}/judgeme-app.png`, fullPage: true }).catch(() => {}); R('   Screenshot der App: ' + `${SHOTS}/judgeme-app.png`); }
      }
      const f = await bestFrame(page);
      const v = await readFrame(f);
      const shot = `${SHOTS}/judgeme-${URLS.indexOf(url)}.png`;
      await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
      R('   Screenshot: ' + shot + '  (aktiver Frame: ' + (f.url() || 'main').slice(0, 50) + ')');
      R('   Text (Auszug): ' + (v.txt || '').slice(0, 500));
      R('   Buttons: ' + (v.btns || []).join(' | '));
      const t = (v.txt || '').toLowerCase();
      const m = t.match(/(\d+)\s+(reviews|bewertungen)/); if (m) R('   → Reviews erkannt: ' + m[0]);
      if (/review request|bewertungs.?anfrage|request emails/.test(t)) R('   → Auto-Bewertungs-Anfrage-Abschnitt gefunden.');
      if (/import|aliexpress/.test(t)) R('   → Import-Funktion vorhanden (AliExpress). Auswahl bleibt manuell/ehrlich.');
      if (!/not found|page you|404/.test(t) && (v.btns || []).length) ok = true;
      // GO: nur den Auto-Request-Toggle aktivieren (sicher + ehrlich)
      if (GO && ok) {
        for (const label of ['Enable review requests', 'Turn on', 'Aktivieren', 'Enable', 'Bewertungsanfrage aktivieren', 'Send review requests']) {
          try {
            const el = f.getByRole('button', { name: new RegExp(label, 'i') }).first();
            if (await el.count()) { await el.click({ timeout: 5000 }); R('   ✓ GO: Auto-Bewertungs-Anfrage geklickt „' + label + '"'); await page.waitForTimeout(2500); await page.screenshot({ path: `${SHOTS}/judgeme-after.png`, fullPage: true }).catch(() => {}); break; }
          } catch {}
        }
        R('   ℹ️ AliExpress-Import NICHT automatisch: echte Reviews auswählen (genuine, gemischte Sterne, moderat) = menschliches Urteil, sonst unehrlich. Screenshot zeigt den Weg.');
      } else if (!GO) {
        R('   [DRY] nichts geklickt. Für Auto-Request: GO=1 erneut.');
      }
      if (ok) break;
    } catch (e) { R('   Fehler bei ' + url + ': ' + String(e.message).slice(0, 120)); }
  }
  if (!ok) R('⚠️ Judge.me nicht sicher erreicht/installiert — Screenshots prüfen (evtl. App noch nicht installiert = 1× im Shopify-App-Store installieren).');
  R('Fertig (' + (GO ? 'GO' : 'DRY') + '). Screenshots ' + SHOTS + '/, Bericht reports/judgeme.txt');
  try { await page.close(); } catch {}
  try { await browser.close(); } catch {}
})().catch(e => { R('Fehler: ' + e.message); process.exit(1); });
