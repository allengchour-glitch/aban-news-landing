#!/usr/bin/env node
/* LuxeStyle — profil-politur-browser.mjs (LOKAL auf dem PC ausführen!)  · Fassung 23.09.2026
 * ---------------------------------------------------------------------
 * Poliert Instagram-, TikTok- und Pinterest-Profil OHNE API: steuert dein bereits EINGELOGGTES
 * Brave über den Debug-Port 9222 (Browser-Automation, kein Passwort nötig).
 *
 * ⚠️ Die Fassung vom Juni war ABGEBROCHEN (Datei endete mitten im Instagram-Block, 70 Zeilen) — sie
 * hätte nie laufen können. Diese Fassung nutzt dieselbe Logik wie der Hetzner-Agent
 * (automation/browser/social_profil_politur.mjs) — Texte kommen von dort, damit alle Profile gleich sprechen.
 *
 * VORAUSSETZUNG: Brave läuft mit  --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\brave-agent"
 * und ist bei instagram.com, tiktok.com, pinterest.com eingeloggt.
 * AUSFÜHREN (PowerShell im Repo-Ordner):  npm install playwright-core ; node automation/local/profil-politur-browser.mjs
 * DRY=1 liest nur. Screenshots + Ergebnis-JSON nach ./politur-screenshots/.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import politur from '../browser/social_profil_politur.mjs';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const ERGEBNIS = path.resolve('./politur-screenshots'); fs.mkdirSync(ERGEBNIS, { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

log('Verbinde mit Brave (localhost:9222)…');
const browser = await chromium.connectOverCDP('http://localhost:9222').catch(e => {
  console.error('❌ Keine Verbindung zu Brave. Läuft es mit --remote-debugging-port=9222 ?\n', e.message);
  process.exit(1);
});
const ctx = browser.contexts()[0] || await browser.newContext();
const auftrag = { id: 'profil-politur-lokal-' + new Date().toISOString().slice(0, 10), dry: process.env.DRY === '1' };
try {
  const ergebnis = await politur({ ctx, REPO, ERGEBNIS, auftrag });
  fs.writeFileSync(path.join(ERGEBNIS, auftrag.id + '.json'), JSON.stringify(ergebnis, null, 2));
  for (const [dienst, r] of Object.entries(ergebnis.dienste)) {
    log(`— ${dienst.toUpperCase()} —`, r.fehler ? '❌ ' + r.fehler : `gesetzt: ${r.gesetzt.join(', ') || '–'}`, r.offen.length ? '· offen: ' + r.offen.join(' | ') : '');
  }
  log('Ergebnis:', path.join(ERGEBNIS, auftrag.id + '.json'));
} catch (e) {
  console.error('❌', e.message, e.nichtAngemeldet ? '(nicht angemeldet — in Brave einloggen und erneut starten)' : '');
  process.exit(1);
} finally { await browser.close().catch(() => {}); }
