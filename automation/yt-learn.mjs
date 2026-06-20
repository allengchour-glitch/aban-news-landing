#!/usr/bin/env node
/* LuxeStyle — yt-learn.mjs  (User 2026-06-20 „der Youtuber alle Video analysieren mit Tool und lernen")
 * Analysiert ALLE Videos eines YouTube-Kanals mit yt-dlp und lernt die Gewinner-Muster (Hooks/Formate/
 * Titel/Laenge). LAEUFT AM PC (yt-dlp + eingeloggtes Brave = Cookies; YouTube blockt Cloud-IPs).
 *
 * 1) loest aus YT_URL (Video ODER Kanal) den Kanal auf
 * 2) listet alle Videos (Titel, Views, Dauer) -> sortiert nach Views
 * 3) holt Transkripte der Top-Videos -> extrahiert die HOOKS (erste Saetze)
 * 4) KI-Synthese (ai_generate) -> konkrete Lehren fuer LuxeStyle-Reels (Baerndütsch-Adaption)
 * 5) schreibt reports/yt-learn-<kanal>.json + reports/yt-learn-lehren.md (gepusht -> Cloud-Claude liest+lernt)
 *
 * Lauf:  YT_URL="https://www.youtube.com/watch?v=XXXX" node automation/yt-learn.mjs
 * ENV:   YT_URL (Pflicht) · COOKIES_BROWSER=brave · TOP=25 · SUBS_TOP=8 · YTDLP=yt-dlp
 * No-op-sicher: ohne yt-dlp/URL klare Meldung, kein Crash.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const REP = path.join(ROOT, 'reports');
const YTDLP = process.env.YTDLP || 'yt-dlp';
const URLIN = process.env.YT_URL || process.argv[2] || '';
const BROWSER = process.env.COOKIES_BROWSER || 'brave';
const TOP = parseInt(process.env.TOP || '25', 10);
const SUBS_TOP = parseInt(process.env.SUBS_TOP || '8', 10);
const COMMON = ['--no-check-certificates', '--no-warnings', '--cookies-from-browser', BROWSER];
const log = (...a) => console.log(...a);

function yt(args) { return execFileSync(YTDLP, [...COMMON, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }

if (!URLIN) { log('YT_URL fehlt. Lauf: YT_URL="https://youtube.com/watch?v=..." node automation/yt-learn.mjs'); process.exit(0); }
fs.mkdirSync(REP, { recursive: true });

(async () => {
  // 1) Kanal aufloesen
  let channel = '';
  try { channel = yt(['--playlist-items', '1', '--print', '%(channel_url)s', URLIN]).trim().split('\n')[0]; }
  catch (e) { log('yt-dlp Kanal-Aufloesung fehlgeschlagen (yt-dlp da? Brave eingeloggt?):', String(e.message).slice(0, 200)); process.exit(0); }
  if (!channel) { log('Kein Kanal gefunden.'); process.exit(0); }
  log('Kanal:', channel);

  // 2) Alle Videos listen (flat = schnell)
  let lines = [];
  try { lines = yt(['--flat-playlist', '--print', '%(view_count)s\t%(duration)s\t%(id)s\t%(title)s', `${channel}/videos`]).trim().split('\n').filter(Boolean); }
  catch (e) { log('Video-Liste fehlgeschlagen:', String(e.message).slice(0, 160)); }
  const vids = lines.map(l => { const [v, d, id, ...t] = l.split('\t'); return { views: parseInt(v) || 0, dur: parseInt(d) || 0, id, title: t.join('\t') }; })
    .filter(x => x.id);
  vids.sort((a, b) => b.views - a.views);
  log(`Videos gesamt: ${vids.length} · Top-Views: ${vids[0]?.views} · Median-Dauer: ${vids.length ? vids[Math.floor(vids.length / 2)].dur : 0}s`);
  const top = vids.slice(0, TOP);

  // 3) Transkripte/Hooks der Top-Videos
  const hooks = [];
  for (const v of top.slice(0, SUBS_TOP)) {
    try {
      const out = path.join(REP, `_sub_${v.id}`);
      yt(['--skip-download', '--write-auto-subs', '--sub-lang', 'en,de,en-US', '--sub-format', 'vtt', '-o', out, `https://www.youtube.com/watch?v=${v.id}`]);
      const f = fs.readdirSync(REP).find(n => n.startsWith(`_sub_${v.id}`) && n.endsWith('.vtt'));
      if (f) {
        const txt = fs.readFileSync(path.join(REP, f), 'utf8').split('\n')
          .filter(l => l && !/-->/.test(l) && !/^WEBVTT|^\d+$|^Kind:|^Language:/.test(l)).join(' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        hooks.push({ title: v.title, views: v.views, hook: txt.slice(0, 220) });
        fs.unlinkSync(path.join(REP, f));
      }
    } catch {}
  }

  // 4) KI-Synthese der Lehren
  let lehren = '';
  try {
    const { generate } = await import('./ai/ai_generate.mjs');
    const g = await generate({ system: 'Du bist Viral-Video-Analyst fuer einen Schweizer Mode-Shop. Antworte knapp, umsetzbar, Baerndütsch-tauglich.', maxTokens: 500,
      prompt: `Analysiere diesen YouTuber. Top-Videos (Views | Titel | Hook):\n${hooks.map(h => `${h.views} | ${h.title} | ${h.hook}`).join('\n')}\n\nGib 5 konkrete, kopierbare Lehren fuer LuxeStyle-Reels (Hook-Formel, Titel-Struktur, Laenge, Format, Schnitt). Pro Lehre 1 Satz.` });
    lehren = g.text || '';
  } catch {}

  // 5) Report schreiben
  const slug = (channel.split('/').pop() || 'kanal').replace(/[^a-zA-Z0-9_-]/g, '');
  const report = { ts: new Date().toISOString(), channel, total_videos: vids.length,
    top_by_views: top.map(v => ({ views: v.views, dur: v.dur, title: v.title })), hooks, lehren };
  fs.writeFileSync(path.join(REP, `yt-learn-${slug}.json`), JSON.stringify(report, null, 2) + '\n');
  const md = `# YouTuber-Analyse: ${channel}\n_${report.ts}_\n\n**${vids.length} Videos** · Top-Views ${vids[0]?.views || '?'}\n\n## Top 10 nach Views\n${top.slice(0, 10).map(v => `- ${v.views} Views · ${v.dur}s · ${v.title}`).join('\n')}\n\n## Gewinner-Hooks\n${hooks.map(h => `- (${h.views}) ${h.hook}`).join('\n')}\n\n## 🧠 Lehren fuer LuxeStyle\n${lehren || '(keine KI-Synthese — Keys pruefen)'}\n`;
  fs.writeFileSync(path.join(REP, 'yt-learn-lehren.md'), md);
  log(`\nFertig. Report: reports/yt-learn-${slug}.json + reports/yt-learn-lehren.md`);
  if (lehren) log('\n🧠 LEHREN:\n' + lehren);
})().catch(e => { log('Fehler:', e.message); process.exit(0); });
