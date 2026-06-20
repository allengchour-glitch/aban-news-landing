#!/usr/bin/env node
/* LuxeStyle — yt-learn.mjs  (User 2026-06-20 „der Youtuber alle Video analysieren mit Tool und lernen")
 * Analysiert YouTube-Kanaele/Videos mit yt-dlp und lernt die Gewinner-Muster (Hooks/Formate/Titel/Laenge).
 * LAEUFT AM PC (yt-dlp + eingeloggtes Brave = Cookies; YouTube blockt Cloud-IPs).
 *
 * Quellen: YT_URL (eine URL) ODER automation/yt-learn-urls.txt (mehrere, eine pro Zeile, # = Kommentar).
 * Pro URL: Kanal aufloesen -> alle Videos (Titel/Views/Dauer) -> Top-Hooks (Transkripte) -> aggregiert.
 * Dann KI-Synthese (ai_generate) -> konkrete Lehren fuer LuxeStyle-Reels. Report nach reports/ (gepusht).
 *
 * Lauf:  node automation/yt-learn.mjs              (liest die Liste)
 *        YT_URL="https://youtu.be/XXXX" node automation/yt-learn.mjs   (eine URL)
 * ENV:   COOKIES_BROWSER=brave · TOP=20 · SUBS_TOP=6 · YTDLP=yt-dlp
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const REP = path.join(ROOT, 'reports');
const LIST = path.join(ROOT, 'automation', 'yt-learn-urls.txt');
const YTDLP = process.env.YTDLP || 'yt-dlp';
const BROWSER = process.env.COOKIES_BROWSER || 'brave';
const TOP = parseInt(process.env.TOP || '40', 10);       // mehr Videos erfassen (User: alle anschauen)
const SUBS_TOP = parseInt(process.env.SUBS_TOP || '8', 10);
const COMMON = ['--no-check-certificates', '--no-warnings', '--cookies-from-browser', BROWSER];
const log = (...a) => console.log(...a);
const yt = (args) => execFileSync(YTDLP, [...COMMON, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const urls = process.env.YT_URL ? [process.env.YT_URL]
  : (fs.existsSync(LIST) ? fs.readFileSync(LIST, 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#')) : []);
if (!urls.length) { log('Keine URLs (YT_URL oder automation/yt-learn-urls.txt).'); process.exit(0); }
fs.mkdirSync(REP, { recursive: true });

function analyzeChannel(url) {
  let channel = '';
  try { channel = yt(['--playlist-items', '1', '--print', '%(channel_url)s', url]).trim().split('\n')[0]; } catch { return null; }
  if (!channel) return null;
  let lines = [];
  try { lines = yt(['--flat-playlist', '--print', '%(view_count)s\t%(duration)s\t%(id)s\t%(title)s', `${channel}/videos`]).trim().split('\n').filter(Boolean); } catch {}
  const vids = lines.map(l => { const [v, d, id, ...t] = l.split('\t'); return { views: parseInt(v) || 0, dur: parseInt(d) || 0, id, title: t.join('\t') }; }).filter(x => x.id);
  vids.sort((a, b) => b.views - a.views);
  const top = vids.slice(0, TOP);
  const hooks = [];
  for (const v of top.slice(0, SUBS_TOP)) {
    try {
      const out = path.join(REP, `_sub_${v.id}`);
      yt(['--skip-download', '--write-auto-subs', '--sub-lang', 'en,de,en-US', '--sub-format', 'vtt', '-o', out, `https://www.youtube.com/watch?v=${v.id}`]);
      const f = fs.readdirSync(REP).find(n => n.startsWith(`_sub_${v.id}`) && n.endsWith('.vtt'));
      if (f) {
        const txt = fs.readFileSync(path.join(REP, f), 'utf8').split('\n').filter(l => l && !/-->/.test(l) && !/^WEBVTT|^\d+$|^Kind:|^Language:/.test(l)).join(' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        hooks.push({ title: v.title, views: v.views, hook: txt.slice(0, 200) });
        fs.unlinkSync(path.join(REP, f));
      }
    } catch {}
  }
  log(`  ${channel}: ${vids.length} Videos, Top ${vids[0]?.views || 0} Views, ${hooks.length} Hooks`);
  return { channel, total: vids.length, top: top.map(v => ({ views: v.views, dur: v.dur, title: v.title })), hooks };
}

(async () => {
  const seen = new Set(); const results = [];
  for (const u of urls) {
    log('Analysiere:', u);
    const r = analyzeChannel(u);
    if (r && !seen.has(r.channel)) { seen.add(r.channel); results.push(r); }
  }
  if (!results.length) { log('Nichts analysiert (yt-dlp da? Brave eingeloggt?).'); process.exit(0); }
  const allHooks = results.flatMap(r => r.hooks).sort((a, b) => b.views - a.views).slice(0, 15);
  const allTitles = results.flatMap(r => r.top).sort((a, b) => b.views - a.views).slice(0, 50);  // alle Videos (Titel+Views)
  let lehren = '';
  try {
    const { generate } = await import('./ai/ai_generate.mjs');
    const g = await generate({ system: 'Du bist Viral-Video-Analyst fuer einen Schweizer Mode-Shop. Knapp, umsetzbar, Baerndütsch-tauglich.', maxTokens: 600,
      prompt: `ALLE Top-Videotitel (Views | Titel):\n${allTitles.map(h => `${h.views} | ${h.title}`).join('\n')}\n\nGEWINNER-HOOKS (Transkript-Anfang):\n${allHooks.map(h => `${h.views} | ${h.hook}`).join('\n')}\n\nGib 6 konkrete, kopierbare Lehren fuer LuxeStyle-Reels: Hook-Formel (erste 3 Sek), Titel-Struktur, ideale Laenge, Format, Schnitt-Tempo, CTA. Pro Lehre 1 kurzer Satz, direkt umsetzbar.` });
    lehren = g.text || '';
  } catch {}
  const report = { ts: new Date().toISOString(), channels: results.map(r => ({ channel: r.channel, total: r.total })), top_hooks: allHooks, lehren };
  fs.writeFileSync(path.join(REP, 'yt-learn-report.json'), JSON.stringify(report, null, 2) + '\n');
  const md = `# YouTuber-Analyse (${results.length} Kanaele)\n_${report.ts}_\n\n${results.map(r => `**${r.channel}** — ${r.total} Videos`).join('\n')}\n\n## Top-Hooks (nach Views)\n${allHooks.map(h => `- (${h.views}) ${h.title}: ${h.hook}`).join('\n')}\n\n## 🧠 Lehren fuer LuxeStyle\n${lehren || '(keine KI-Synthese — Keys pruefen)'}\n`;
  fs.writeFileSync(path.join(REP, 'yt-learn-lehren.md'), md);
  // 🤖 "setze um fuer autobot": Lehren INS GEHIRN schreiben -> Content-Generatoren (Captions/Reels/Hooks) nutzen sie
  if (lehren) {
    try {
      const kp = path.join(ROOT, 'automation/brain/knowledge.json');
      const k = JSON.parse(fs.readFileSync(kp, 'utf8'));
      k.updated = new Date().toISOString().slice(0, 10);
      k.rules.yt_gelernt = { stand: report.ts, quelle: results.map(r => r.channel),
        top_hooks: allHooks.slice(0, 6).map(h => h.title), lehren,
        anwenden: 'Diese Hook-Formeln/Titel-Struktur/Laenge in Reels+Captions umsetzen (build_masterpiece, build_montage_fast, smartCaption, build_queue).' };
      fs.writeFileSync(kp, JSON.stringify(k, null, 2) + '\n');
      log('🤖 Lehren ins Gehirn geschrieben (rules.yt_gelernt) -> Autobot wendet sie an.');
    } catch (e) { log('Gehirn-Update Hinweis:', e.message); }
  }
  log(`\nFertig: ${results.length} Kanaele. Report: reports/yt-learn-report.json + yt-learn-lehren.md`);
  if (lehren) log('\n🧠 LEHREN:\n' + lehren);
})().catch(e => { log('Fehler:', e.message); process.exit(0); });
