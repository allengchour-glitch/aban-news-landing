#!/usr/bin/env node
/* check-sources.mjs - QUELLEN-WAECHTER (User 2026-06-20 „die Quelle immer pruefen ueberall").
 * Scannt ALLE Queue-/Source-Dateien auf doppelte Medien-URLs (Bild/Video) — innerhalb jeder Datei
 * UND dateiuebergreifend (gleiches Video als Reel in mehreren Quellen = Repost-Gefahr).
 * --fix entfernt Dubletten aus der Worker-Queue (queue.json) automatisch. Sonst nur Report.
 * No-op-sicher: fehlende Dateien werden uebersprungen. Exit 1 wenn Dubletten gefunden (fuer CI/Schleife).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
setTimeout(() => { console.log('WATCHDOG 6min -> exit'); process.exit(1); }, 360000).unref(); // 2026-06-25: kein FIFO-Hang

const ROOT = path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url))));
const FIX = process.argv.includes('--fix');
const SRC = [
  'automation/cloudflare/luxe-poster/src/queue.json',
  'social/video_queue.csv', 'social/tiktok_queue.csv', 'social/story_queue.csv',
  'automation/reels_seed.csv', 'social/posts_image.csv', 'social/tiktok_photos.csv',
];
const mediaRe = /(https?:\/\/[^\s",]+\.(?:mp4|jpg|jpeg|png|webp)[^\s",]*)/gi;
const fileBase = (u) => u.split('/').pop().split('?')[0];

let totalDupes = 0;

for (const rel of SRC) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) continue;
  const txt = fs.readFileSync(p, 'utf8');
  let dupes = [];
  if (rel.endsWith('queue.json')) {
    // TYP-BEWUSST: derselbe Clip als Reel UND Story ist GEWOLLT. Nur gleicher TYP+URL 2x = echte Dublette.
    const q = JSON.parse(txt); const arr = Array.isArray(q) ? q : (q.items || q.queue || []);
    const seen = {};
    for (const it of arr) {
      const u = it.video || it.image || (Array.isArray(it.images) && it.images[0]) || '';
      if (!u) continue; const k = (it.type || 'image') + '|' + fileBase(u);
      seen[k] = (seen[k] || 0) + 1;
    }
    dupes = Object.entries(seen).filter(([k, n]) => n > 1).map(([k, n]) => [k.replace('|', '  '), n]);
  } else {
    // CSV: gleicher Medien-Dateiname 2x = echte Zeilen-Dublette (postet doppelt).
    const urls = (txt.match(mediaRe) || []); const seen = {};
    for (const u of urls) { const b = fileBase(u); seen[b] = (seen[b] || 0) + 1; }
    dupes = Object.entries(seen).filter(([b, n]) => n > 1);
  }
  if (dupes.length) {
    totalDupes += dupes.length;
    console.log(`\n[DUBLETTE] ${rel}:`);
    dupes.forEach(([b, n]) => console.log(`   ${n}x  ${b}`));
  }
}
const crossReel = []; // Cross-Quelle (dasselbe Reel in mehreren Plattform-Queues) = GEWOLLT, kein Fehler.

// --fix: CSV-Quellen deduplizieren (Zeilen mit schon gesehener Medien-URL raus) + Worker-Queue
if (FIX) {
  for (const rel of SRC.filter(r => r.endsWith('.csv'))) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) continue;
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    const seen = new Set(); const out = []; let removed = 0;
    lines.forEach((l, i) => {
      if (i === 0) { out.push(l); return; }                 // Header
      const m = l.match(mediaRe);
      if (m && m.length) { const b = fileBase(m[0]); if (seen.has(b)) { removed++; return; } seen.add(b); }
      out.push(l);
    });
    if (removed) { fs.writeFileSync(p, out.join('\n')); console.log(`[FIX] ${rel}: ${removed} Dublett-Zeile(n) entfernt`); }
  }
  const qp = path.join(ROOT, 'automation/cloudflare/luxe-poster/src/queue.json');
  if (fs.existsSync(qp)) {
    const q = JSON.parse(fs.readFileSync(qp, 'utf8'));
    const arr = Array.isArray(q) ? q : (q.items || q.queue || []);
    const key = (it) => (it.type || 'image') + '|' + (it.video || it.image || (Array.isArray(it.images) && it.images[0]) || '');
    const seen = new Set(); const out = [];
    for (const it of arr) { const k = key(it); if (seen.has(k)) continue; seen.add(k); out.push(it); }
    if (out.length !== arr.length) {
      const res = Array.isArray(q) ? out : Object.assign(q, { [q.items ? 'items' : (q.queue ? 'queue' : 'items')]: out });
      fs.writeFileSync(qp, JSON.stringify(res, null, 2) + '\n');
      console.log(`\n[FIX] queue.json: ${arr.length} -> ${out.length} (${arr.length - out.length} Dubletten entfernt)`);
    }
  }
}

if (totalDupes === 0 && crossReel.length === 0) { console.log('✅ Quellen sauber — keine Dubletten in allen Source-Dateien.'); process.exit(0); }
console.log(`\n⚠️ ${totalDupes} Datei-interne + ${crossReel.length} Cross-Quellen-Dubletten. ${FIX ? '(Queue gefixt)' : 'Mit --fix bereinigen.'}`);
process.exit(FIX ? 0 : 1);
