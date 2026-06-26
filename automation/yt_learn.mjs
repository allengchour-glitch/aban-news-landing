#!/usr/bin/env node
/* yt_learn.mjs — LERNE AUS YOUTUBE (robust, gratis). Zieht die Untertitel/Auto-Captions eines Videos per yt-dlp,
 * bereinigt das VTT zu Klartext und (optional) fasst es per AI-Router zusammen. So kann JEDE Session aus einem
 * YouTube-Link lernen — auch wenn WebFetch/Browser YouTube blockt (Captcha). "der andere session kann das auch".
 *
 * Lehre 2026-06-26: WebFetch auf youtube.com = nur Footer/403/Captcha. yt-dlp --write-auto-sub holt das Transkript
 * zuverlaessig (auch ohne Login). Damit ist YouTube-Lernen wieder moeglich.
 *
 * Nutzung:
 *   node automation/yt_learn.mjs "https://www.youtube.com/watch?v=ID"            # Titel + Klartext-Transkript
 *   node automation/yt_learn.mjs "URL" --summary                                  # + AI-Zusammenfassung (Router)
 *   node automation/yt_learn.mjs "URL" --chars 6000                               # Transkript-Laenge begrenzen
 * Voraussetzung: yt-dlp installiert (setup-free-stack.sh). AI-Zusammenfassung nutzt automation/ai/ai_generate.mjs
 * (Groq/Gemini/... -> Template-Fallback), braucht keinen Pflicht-Key.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const url = process.argv[2];
if (!url || !/youtu/.test(url)) { console.error('Bitte eine YouTube-URL angeben.'); process.exit(1); }
const wantSummary = process.argv.includes('--summary');
const charsArg = process.argv.indexOf('--chars');
const MAX = charsArg > -1 ? parseInt(process.argv[charsArg + 1], 10) : 8000;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ytlearn-'));

function run(cmd, args, opts = {}) { return execFileSync(cmd, args, { encoding: 'utf8', timeout: 90000, ...opts }); }

// 1) Titel/Kanal/Dauer
let meta = '';
try { meta = run('yt-dlp', ['--skip-download', '--print', '%(title)s | %(channel)s | %(duration_string)s', url]).trim(); }
catch (e) { meta = '(Titel nicht lesbar)'; }

// 2) Untertitel ziehen (Auto + manuell, EN/DE bevorzugt)
let vtt = '';
try {
  run('yt-dlp', ['--skip-download', '--write-auto-sub', '--write-sub', '--sub-lang', 'en.*,de.*',
    '--sub-format', 'vtt', '-o', path.join(tmp, 'sub.%(ext)s'), url], { stdio: ['ignore', 'ignore', 'ignore'] });
  const f = fs.readdirSync(tmp).find(x => x.endsWith('.vtt'));
  if (f) vtt = fs.readFileSync(path.join(tmp, f), 'utf8');
} catch (e) { /* unten gemeldet */ }

if (!vtt) {
  console.log('TITEL:', meta);
  console.log('⚠️ Keine Untertitel verfuegbar (Video hat keine Captions oder yt-dlp blockiert). Nur Titel gelernt.');
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(0);
}

// 3) VTT -> Klartext: Zeitstempel/Tags/Dupes raus (Auto-Captions wiederholen Zeilen rollierend)
const text = vtt.split('\n')
  .filter(l => !/^\d{2}:\d{2}|-->|^WEBVTT|^Kind:|^Language:|align:|position:/.test(l) && l.trim())
  .map(l => l.replace(/<[^>]+>/g, '').trim())
  .filter((l, i, a) => l && l !== a[i - 1])
  .join(' ').replace(/\s+/g, ' ').trim();

const clipped = text.slice(0, MAX);
console.log('TITEL:', meta);
console.log('LAENGE:', text.length, 'Zeichen' + (text.length > MAX ? ` (auf ${MAX} gekuerzt)` : ''));
console.log('\n--- TRANSKRIPT ---\n' + clipped);

// 4) Optional: AI-Zusammenfassung ueber den vorhandenen Multi-Provider-Router
if (wantSummary) {
  try {
    const prompt = `Fasse dieses YouTube-Transkript fuer einen Schweizer Dropshipping-Shop (LuxeStyle, TikTok-Ads) zusammen.
Gib 5-8 KONKRETE, umsetzbare Lehren (Taktiken/Zahlen/Schritte), je 1 Zeile. NUR die Lehren, kein Vorwort.\n\nTITEL: ${meta}\n\n${clipped}`;
    const out = run(process.execPath, [path.join(path.dirname(new URL(import.meta.url).pathname), 'ai', 'ai_generate.mjs'), prompt], { timeout: 60000 });
    console.log('\n--- AI-LEHREN ---\n' + out.trim());
  } catch (e) { console.log('\n(AI-Zusammenfassung nicht verfuegbar: ' + String(e.message || e).slice(0, 80) + ')'); }
}

fs.rmSync(tmp, { recursive: true, force: true });
