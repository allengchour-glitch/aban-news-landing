#!/usr/bin/env node
/* LuxeStyle — tiktok-delete-dupes.mjs  ·  loescht doppelte TikTok-Posts (AI-Selektoren via Stagehand)
 * =============================================================================================
 * Nutzt den ai-browser-Wrapper (Stagehand, falls installiert) -> beschreibt Aktionen statt fragiler
 * Selektoren ("oeffne das erste Video mit dem Text X", "klicke Loeschen"). Faellt auf Playwright zurueck.
 * Loescht die N obersten Posts, deren Caption/Overlay MATCH enthaelt (default die Marken-Montage), behaelt
 * den meistgesehenen NICHT automatisch -> daher Vorsicht: default DRY (nur anschauen), --go zum Loeschen.
 *
 * START am PC:  node automation/local/tiktok-delete-dupes.mjs            (DRY = nur Screenshots)
 *               node automation/local/tiktok-delete-dupes.mjs --go --n 3 (loescht 3 Dubletten)
 *               MATCH="Lieblingsstuck" node ...                          (welcher Text = Dublette)
 * Voraussetzung: Brave 9222 bei tiktok.com (@luxestyle.ch) eingeloggt; Stagehand + GEMINI_API_KEY.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiBrowser } from '../lib/ai-browser.mjs';
setTimeout(()=>{console.log("WATCHDOG 5min -> exit");process.exit(1);},300000).unref(); // 2026-06-24: kein Loop-Hang

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url)))));
// PLATFORM=tiktok|ig (User 2026-06-21 "kontrolliere ueberall"): ein Bot fuer beide via Stagehand-AI.
const PLATFORM = (process.env.PLATFORM || 'tiktok').toLowerCase();
const PROFILE = process.env.TT_HANDLE || 'luxestyle.ch';
const PROFILE_URL = PLATFORM === 'ig' ? `https://www.instagram.com/${PROFILE}/` : `https://www.tiktok.com/@${PROFILE}`;
const MATCH = process.env.MATCH || (PLATFORM === 'ig' ? 'a white t-shirt with a mountain design' : 'Lieblingsstuck');
const SHOT = path.join(ROOT, 'automation', 'local', PLATFORM === 'ig' ? 'ig-delete-shots' : 'tiktok-delete-shots');
fs.mkdirSync(SHOT, { recursive: true });
const GO = process.argv.includes('--go');
const N = (() => { const i = process.argv.indexOf('--n'); return i > -1 ? parseInt(process.argv[i + 1] || '3', 10) : 3; })();
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const STATUS = path.join(ROOT, 'reports', PLATFORM === 'ig' ? 'ig-delete.json' : 'tiktok-delete.json');
function writeStatus(o) { try { fs.writeFileSync(STATUS, JSON.stringify({ ts: new Date().toISOString(), platform: PLATFORM, ...o }, null, 2)); } catch {} }
(async () => {
  writeStatus({ result: 'GESTARTET', match: MATCH, dry: !GO });  // sofort, damit ein frueher Crash sichtbar ist
  let ab;
  try {
    ab = await aiBrowser();
  } catch (e) { log('aiBrowser-Fehler:', String(e).slice(0, 120)); writeStatus({ result: 'AIBROWSER_FEHLER', error: String(e).slice(0, 200) }); process.exit(0); }
  const p = ab.page;
  log(`Modus: ${ab.mode} · MATCH="${MATCH}" · ${GO ? 'LOESCHEN n=' + N : 'DRY (nur ansehen)'}`);
  try {
    await p.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(6000);
    if (/\/login/i.test(p.url())) { log('❌ Nicht eingeloggt.'); await ab.close(); process.exit(0); }
    await p.screenshot({ path: path.join(SHOT, 'profile-before.png') });

    let deleted = 0;
    for (let i = 0; i < N; i++) {
      try {
        if (ab.mode === 'stagehand') {
          // AI-Weg: oeffne den obersten passenden Post, dann loeschen
          await ab.act(`open the first post/video thumbnail in the grid that shows ${MATCH}`);
          await sleep(3500); await p.screenshot({ path: path.join(SHOT, `open-${i + 1}.png`) });
          // ⚠️ LEHRE 2026-06-25: das Stagehand-page-Objekt hat KEIN .keyboard/.mouse — NIE p.keyboard/p.mouse
          // benutzen (wirft -> deleted:0). Alles ueber ab.act() (Stagehand hovert/scrollt selber).
          if (!GO) { log(`[dry] Dublette ${i + 1} geoeffnet (Screenshot), NICHT geloescht.`); await ab.act('close the open post and go back to the profile grid').catch(() => {}); await sleep(1500); continue; }
          // FIX 2026-06-26 (Recherche, vorher FALSCH herum = deleted:0): im geoeffneten Video liegt das
          // ⋮-Mehr-Menue OBEN RECHTS in der Ecke (nicht unten). Klick die Share-/More-Leiste oben rechts.
          await ab.act(PLATFORM === 'tiktok'
            ? 'in the opened video view, click the three-dots "more" (...) button in the TOP-RIGHT corner of the video (next to the share/report icons)'
            : 'click the more options button (three dots) on this post');
          await sleep(1800); await p.screenshot({ path: path.join(SHOT, `menu-${i + 1}.png`) });
          await ab.act('in the menu that opened, click the item whose text is Delete or Löschen');
          await sleep(1500);
          await ab.act('in the confirmation dialog, click the button labeled Delete or Löschen (never Cancel/Abbrechen)');
          await sleep(3500); await p.screenshot({ path: path.join(SHOT, `after-${i + 1}.png`) });
          deleted++; log(`✅ Dublette ${i + 1} geloescht (AI).`);
          await p.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 }); await sleep(5000);
        } else {
          log('⚠️ Stagehand nicht aktiv -> TikTok-Loeschen braucht AI-Selektoren. INSTALL-STAGEHAND.bat + GEMINI_API_KEY.');
          await p.screenshot({ path: path.join(SHOT, 'no-stagehand.png') });
          break;
        }
      } catch (e) { log(`Dublette ${i + 1}: ${String(e).slice(0, 80)}`); await p.screenshot({ path: path.join(SHOT, `err-${i + 1}.png`) }).catch(() => {}); break; }
    }
    await p.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await sleep(4000); await p.screenshot({ path: path.join(SHOT, 'profile-after.png') });
    try { fs.writeFileSync(path.join(ROOT, 'reports', PLATFORM === 'ig' ? 'ig-delete.json' : 'tiktok-delete.json'), JSON.stringify({ ts: new Date().toISOString(), mode: ab.mode, match: MATCH, deleted, dry: !GO }, null, 2)); } catch {}
    log(`Fertig: ${deleted} geloescht${GO ? '' : ' (DRY)'}. Screenshots in tiktok-delete-shots/`);
  } catch (e) { log('Fehler:', String(e).slice(0, 100)); }
  await ab.close();
  process.exit(0);
})();
