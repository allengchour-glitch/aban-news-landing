#!/usr/bin/env node
/* ABAN Files — aban_yt_stats.mjs
 * Zieht die echten YouTube-Aufrufe (viewCount) zu allen hochgeladenen Folgen und schreibt
 * einen sortierten Report (Gewinner oben). Verknüpft Titel/Hook aus aban_scripts.json.
 * Zweck: datenbasiert sehen, welches FORMAT zieht (siehe WINNER-ANALYSE.md) — wiederholbar.
 *
 * Quelle der IDs: video-prototypes/aban-files/video_ids.json  { "ep21": "<videoId>", ... }
 * API: YouTube Data API v3 videos.list?part=statistics,snippet (braucht YT_API_KEY).
 * No-op ohne YT_API_KEY oder ohne IDs (kein Hard-Fail). Optional Telegram-Digest.
 *
 * Nutzung:  node automation/aban_yt_stats.mjs
 * ENV: YT_API_KEY (Pflicht für Live-Zahlen) · TELEGRAM_BOT_TOKEN/CHAT_ID (optional)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const IDS = path.join(ROOT, 'video-prototypes/aban-files/video_ids.json');
const SCRIPTS = path.join(ROOT, 'video-prototypes/aban-files/aban_scripts.json');
const KEY = process.env.YT_API_KEY || '';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '';

const ids = fs.existsSync(IDS) ? JSON.parse(fs.readFileSync(IDS, 'utf8')) : {};
const scripts = fs.existsSync(SCRIPTS) ? JSON.parse(fs.readFileSync(SCRIPTS, 'utf8')) : {};
const eps = Object.keys(ids);
if (!eps.length) { console.log('Keine Video-IDs → No-op.'); process.exit(0); }
if (!KEY) { console.log(`Kein YT_API_KEY → No-op (hätte ${eps.length} Videos geprüft).`); process.exit(0); }

const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

async function fetchStats(videoIds) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet`
    + `&id=${videoIds.join(',')}&key=${encodeURIComponent(KEY)}`;
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.error('YT-API-Fehler:', r.status, JSON.stringify(j).slice(0, 300)); return []; }
  return j.items || [];
}

async function telegram(text) {
  if (!TG_TOKEN || !TG_CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text, disable_web_page_preview: true }),
    });
  } catch {}
}

(async () => {
  const byId = {};
  for (const part of chunk([...new Set(Object.values(ids))], 50)) {
    for (const it of await fetchStats(part)) byId[it.id] = it;
  }
  const rows = eps.map(ep => {
    const vid = ids[ep];
    const it = byId[vid] || {};
    const views = Number(it?.statistics?.viewCount ?? -1);
    const likes = Number(it?.statistics?.likeCount ?? 0);
    const title = scripts[ep]?.title || it?.snippet?.title || '';
    const hook = scripts[ep]?.hook || '';
    return { ep, vid, views, likes, title, hook };
  }).filter(r => r.views >= 0).sort((a, b) => b.views - a.views);

  if (!rows.length) { console.log('Keine Statistiken erhalten → No-op.'); process.exit(0); }

  const date = new Date().toISOString().slice(0, 10);
  const total = rows.reduce((s, r) => s + r.views, 0);
  const median = rows[Math.floor(rows.length / 2)].views;
  let md = `# ABAN Files — YouTube-Aufrufe (${date})\n\n`;
  md += `${rows.length} Videos · gesamt ${total} Aufrufe · Median ${median} · Bestes ${rows[0].views}.\n\n`;
  md += `Methodik + Format-Lehre: \`video-prototypes/aban-files/WINNER-ANALYSE.md\`.\n\n`;
  md += `| Aufrufe | 👍 | Folge | Titel | Hook | Link |\n|--:|--:|---|---|---|---|\n`;
  for (const r of rows) {
    md += `| ${r.views} | ${r.likes} | ${r.ep} | ${r.title} | ${r.hook} | https://youtu.be/${r.vid} |\n`;
  }
  const dir = path.join(ROOT, 'reports'); fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `aban-yt-stats-${date}.md`);
  fs.writeFileSync(out, md);
  // stabile "neueste"-Kopie für schnellen Blick
  fs.writeFileSync(path.join(dir, 'aban-yt-stats-latest.md'), md);
  console.log(`-> ${out}`);
  const top = rows.slice(0, 3).map(r => `${r.views} ${r.title || r.ep}`).join(' · ');
  const zero = rows.filter(r => r.views <= 1).length;
  console.log(`Top: ${top} | ${zero} Videos mit ≤1 Aufruf`);
  await telegram(`📊 ABAN Files (${date}): bestes ${rows[0].views} Aufrufe (${rows[0].title || rows[0].ep}), `
    + `Median ${median}, ${zero}/${rows.length} mit ≤1. Gewinner-Stil = echte Menschen/warm (s. WINNER-ANALYSE).`);
})();
