#!/usr/bin/env node
/* LuxeStyle — fb-groups.mjs  ·  FB-Gruppen beitreten + LANGSAM posten (AI-Selektoren via Stagehand)
 * =============================================================================================
 * User 2026-06-21 "fb gruppe beitretten und langsam was posten". FB bestraft Gruppen-Automation hart
 * -> SEHR vorsichtig: niedrige Caps, randomisierte Mensch-Pausen, nur Verkaufs-/CH-Gruppen, nativer Post.
 *
 *   node automation/local/fb-groups.mjs join        (1-2 Gruppen aus fb-groups.txt beitreten)
 *   node automation/local/fb-groups.mjs post        (1 Produkt in EINE beigetretene Gruppe, nativ)
 *   node automation/local/fb-groups.mjs join --dry   (nur ansehen)
 * Config: automation/local/fb-groups.txt (eine Gruppen-URL pro Zeile). Ledger: fb-groups-done.txt.
 * Voraussetzung: Brave 9222 bei facebook.com eingeloggt (Profil das posten darf); Stagehand + GEMINI_API_KEY.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiBrowser } from '../lib/ai-browser.mjs';
setTimeout(()=>{console.log("WATCHDOG 12min -> exit");process.exit(1);},720000).unref(); // 2026-06-25 Sweep: kein cmd-poll-Queue-Freeze

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url)))));
const SHOT = path.join(ROOT, 'automation', 'local', 'fb-groups-shots');
fs.mkdirSync(SHOT, { recursive: true });
const CFG = path.join(ROOT, 'automation', 'local', 'fb-groups.txt');
const DONE = path.join(ROOT, 'automation', 'local', 'fb-groups-done.txt');
const STATUS = path.join(ROOT, 'reports', 'fb-groups.json');
const MODE = (process.argv[2] || 'join').toLowerCase();
const DRY = process.argv.includes('--dry');
// SICHERHEITS-CAPS (langsam = nachhaltig, User-Wunsch): nie mehr pro Lauf.
const JOIN_CAP = parseInt(process.env.FB_JOIN_CAP || '2', 10);
const POST_CAP = parseInt(process.env.FB_POST_CAP || '1', 10);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a));
// RESET-FESTER Lokal-Ledger (FIX 2026-06-25, wie TikTok): ueberlebt CLOUD-AN `git reset --hard` -> kein
// doppelter Gruppen-Post, auch wenn der committe Ledger-Push scheitert.
const LOCALDONE = path.join(ROOT, 'automation', 'local', '.fb-groups-done.local');
const done = () => { const r = p => fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter(Boolean) : []; return [...new Set([...r(DONE), ...r(LOCALDONE)])]; };
const markDone = (line) => { try { fs.appendFileSync(DONE, line + '\n'); } catch {} try { fs.appendFileSync(LOCALDONE, line + '\n'); } catch {} };
const writeStatus = o => { try { fs.mkdirSync(path.dirname(STATUS), { recursive: true }); fs.writeFileSync(STATUS, JSON.stringify({ ts: new Date().toISOString(), mode: MODE, ...o }, null, 2)); } catch {} };

// Native CH-Captions (klingt wie Privat-Verkäufer:in, KEIN Gewerbe/Shop-Vibe -> Ban-Schutz in Secondhand-Gruppen).
// Mundart + konkreti Stück + CHF + softe Link. Wird rotiert (kein Spam).
const CAPTIONS = [
  'Han paar schöni wasserfeschti Kettli & Armbänder 💧 anlauffrei & hautfründlich, neu. Ab CHF 19. Bi Interesse meldet eu — meh Föteli uf luxestyle.ch 😊',
  'Verchaufe zarte Schmuck & Sommer-Accessoires 🌸 alles neu, fairi Priis, CH-Versand. Luege gärn: luxestyle.ch',
  'Schöni Edelstahl-Schmuck (wasserfescht, anlauffrei) z\'haa 💎 perfekt zum Verschänke oder für sich sälber. Detail uf luxestyle.ch, Frage gärn per Nachricht.',
  'Paar neui Stück: Kettli, Armbänder, Ohrring & meh. CHF, schnäll & sicher mit TWINT. Schaut verbi: luxestyle.ch 🇨🇭',
];

(async () => {
  writeStatus({ result: 'GESTARTET', cap: MODE === 'post' ? POST_CAP : JOIN_CAP });
  if (!fs.existsSync(CFG)) { log('⚠️ Keine fb-groups.txt — lege Gruppen-URLs an (eine pro Zeile).'); writeStatus({ result: 'KEINE_CONFIG', hinweis: 'automation/local/fb-groups.txt mit Gruppen-URLs befuellen' }); process.exit(0); }
  const groups = fs.readFileSync(CFG, 'utf8').split('\n').map(s => s.trim()).filter(l => l && !l.startsWith('#'));
  let ab;
  try { ab = await aiBrowser(); } catch (e) { writeStatus({ result: 'AIBROWSER_FEHLER', error: String(e).slice(0, 160) }); process.exit(0); }
  if (ab.mode !== 'stagehand') { log('⚠️ Stagehand nicht aktiv — FB-Gruppen brauchen AI-Selektoren.'); writeStatus({ result: 'KEIN_STAGEHAND' }); await ab.close(); process.exit(0); }
  const p = ab.page;
  const result = { joined: [], posted: [], skipped: [] };
  try {
    if (MODE === 'join') {
      const todo = groups.filter(g => !done().includes('join:' + g)).slice(0, JOIN_CAP);
      for (const g of todo) {
        await p.goto(g, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
        await sleep(rnd(4000, 8000));
        await p.screenshot({ path: path.join(SHOT, `join-${result.joined.length + 1}-before.png`) });
        if (DRY) { log(`[dry] wuerde beitreten: ${g}`); result.skipped.push(g); continue; }
        try { await ab.act('click the "Join group" or "Gruppe beitreten" button'); await sleep(rnd(2000, 4000));
          await ab.act('if a question dialog appears, leave it for the user (do nothing)').catch(() => {});
          markDone('join:' + g); result.joined.push(g); log('✅ beigetreten (oder Anfrage gesendet): ' + g);
        } catch (e) { log('Beitritt fehlgeschlagen: ' + String(e).slice(0, 60)); result.skipped.push(g); }
        await sleep(rnd(30000, 70000)); // lange Mensch-Pause
      }
    } else if (MODE === 'post') {
      const joined = done().filter(d => d.startsWith('join:')).map(d => d.slice(5));
      const target = joined.find(g => !done().includes('post:' + g + ':' + new Date().toISOString().slice(0, 10))) || joined[0];
      if (!target) { log('Keine beigetretene Gruppe — erst join.'); writeStatus({ result: 'KEINE_GRUPPE' }); await ab.close(); process.exit(0); }
      const cap = CAPTIONS[rnd(0, CAPTIONS.length)];
      await p.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
      await sleep(rnd(5000, 9000));
      await p.screenshot({ path: path.join(SHOT, 'post-before.png') });
      if (DRY) { log(`[dry] wuerde posten in ${target}: ${cap.slice(0, 40)}`); result.skipped.push(target); }
      else {
        try {
          await ab.act('click the "Write something" / "Schreibe etwas" post box to start a new post');
          await sleep(rnd(2000, 4000));
          await ab.act(`type this text into the post: ${cap}`);
          await sleep(rnd(2000, 4000));
          await p.screenshot({ path: path.join(SHOT, 'post-filled.png') });
          await ab.act('click the Post / Posten button to publish');
          await sleep(rnd(4000, 7000));
          markDone('post:' + target + ':' + new Date().toISOString().slice(0, 10));
          result.posted.push(target); log('✅ gepostet in ' + target);
        } catch (e) { log('Posten fehlgeschlagen: ' + String(e).slice(0, 60)); result.skipped.push(target); }
      }
      await p.screenshot({ path: path.join(SHOT, 'post-after.png') });
    }
    writeStatus({ result: 'OK', ...result, dry: DRY });
    log('Fertig:', JSON.stringify(result));
  } catch (e) { log('Fehler:', String(e).slice(0, 120)); writeStatus({ result: 'FEHLER', error: String(e).slice(0, 160) }); }
  await ab.close();
  process.exit(0);
})();
