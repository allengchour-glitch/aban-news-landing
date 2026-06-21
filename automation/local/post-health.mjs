#!/usr/bin/env node
/* LuxeStyle — post-health.mjs  ·  LIVE-CHECK ueberall (User 2026-06-21 "immer live check, ob gepostet, doppelt, Fehler")
 * =============================================================================================
 * Aggregiert den Posting-Status ALLER Kanaele zu EINEM Bild — laeuft aus der CLOUD oder am PC:
 *   - TikTok:   reports/tiktok-last-run.json  (POSTED / NOT_LOGGED_IN / NO_FILE_INPUT / NO_REEL)
 *   - Kampagne: reports/campaign-last-run.json (ACCOUNT_NOT_SETUP / NEEDS_PAYMENT / OK)
 *   - IG/FB:    Cloudflare-Worker  ?key=…&health   (post_log + Fehler)
 *   - Doppel:   tiktok-upload-done.txt  +  Worker-post_log  → gleicher Clip mehrfach?
 * Output: reports/post-health.json + Klartext-Konsole. KEINE Aenderung, reine Analyse.
 *
 * START:  node automation/local/post-health.mjs        (aus Repo-Root, Cloud ODER PC)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url)))));
const WORKER = process.env.LUXE_WORKER || 'https://luxe-poster.allengchour.workers.dev';
const KEY = process.env.LUXE_KEY || 'Abanaban192%2B';
const readJson = (rel) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch { return null; } };
const ageMin = (ts) => ts ? Math.round((Date.now() - new Date(ts).getTime()) / 60000) : null;

(async () => {
  const out = { ts: new Date().toISOString(), platforms: {}, duplicates: [], errors: [], ok: [] };

  // --- TikTok ---
  const tk = readJson('reports/tiktok-last-run.json');
  if (tk) {
    out.platforms.tiktok = { result: tk.result, reason: tk.reason, file: tk.file, vor_min: ageMin(tk.ts) };
    if (tk.result === 'POSTED') out.ok.push(`TikTok zuletzt OK (${tk.file}, vor ${ageMin(tk.ts)} min)`);
    else out.errors.push(`TikTok: ${tk.result} — ${tk.reason || ''}`);
  } else out.platforms.tiktok = { result: 'KEIN_STATUS' };

  // --- Kampagne ---
  const cp = readJson('reports/campaign-last-run.json');
  if (cp) {
    out.platforms.campaign = { result: cp.result, vor_min: ageMin(cp.ts) };
    if (cp.result && cp.result !== 'OK') out.errors.push(`Kampagne: ${cp.result} — ${cp.hinweis || ''}`);
  }

  // --- TikTok ECHTES Doppel (gleiche Datei <90 Min auseinander; Rotation ueber Tage = normal, ignoriert) ---
  try {
    const lines = fs.readFileSync(path.join(ROOT, 'automation/local/tiktok-upload-done.txt'), 'utf8').split('\n').filter(Boolean);
    const byFile = {};
    for (const l of lines) { const [f, ts] = l.split('|'); if (!f) continue; (byFile[f.trim()] ||= []).push(ts ? new Date(ts).getTime() : null); }
    for (const [f, times] of Object.entries(byFile)) {
      const t = times.filter(Boolean).sort((a, b) => a - b);
      for (let i = 1; i < t.length; i++) if ((t[i] - t[i - 1]) < 90 * 60000) { out.duplicates.push(`TikTok ECHTES DOPPEL: ${f} 2x innerhalb ${Math.round((t[i] - t[i - 1]) / 60000)} min`); break; }
    }
  } catch {}

  // --- IG/FB ueber Worker ---
  try {
    const r = await fetch(`${WORKER}/?key=${KEY}&health`, { signal: AbortSignal.timeout(20000) });
    const j = await r.json().catch(() => ({}));
    out.platforms.meta = j.post_log ? { recent: (j.post_log.recent || j.post_log).slice ? (j.post_log.recent || []).slice(-5) : j.post_log, cursor: j.cursor } : j;
    // Doppel im Meta-Log: gleiche Signatur mehrfach in den letzten Eintraegen
    const log = (j.post_log && (j.post_log.recent || j.post_log)) || [];
    if (Array.isArray(log)) {
      const sigs = {}; log.forEach(e => { const s = (e.sig || e.caption || e.id || '').toString().slice(0, 40); if (s) sigs[s] = (sigs[s] || 0) + 1; });
      for (const [s, n] of Object.entries(sigs)) if (n > 1) out.duplicates.push(`Meta-Log: "${s}" ${n}x`);
    }
    if (j.errors || j.last_error) out.errors.push(`Meta: ${JSON.stringify(j.errors || j.last_error)}`);
  } catch (e) { out.platforms.meta = { result: 'WORKER_NICHT_ERREICHBAR', detail: String(e).slice(0, 80) }; }

  // --- Fehler-Sink (reports/failures.jsonl) der letzten 24h einsammeln ---
  try {
    const fl = fs.readFileSync(path.join(ROOT, 'reports/failures.jsonl'), 'utf8').trim().split('\n').filter(Boolean);
    const recent = fl.slice(-15).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
      .filter(e => (Date.now() - new Date(e.ts).getTime()) < 24 * 3600 * 1000);
    out.recent_failures = recent.map(e => `${e.task}: ${String(e.error).slice(0, 80)}`);
    for (const e of recent) out.errors.push(`failures.jsonl ${e.task}: ${String(e.error).slice(0, 80)}`);
  } catch {}

  fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'reports/post-health.json'), JSON.stringify(out, null, 2));

  // Klartext
  console.log('\n=== POSTING LIVE-CHECK ' + out.ts + ' ===');
  for (const [pf, v] of Object.entries(out.platforms)) console.log(`  ${pf.padEnd(10)} ${JSON.stringify(v)}`);
  console.log(out.duplicates.length ? '⚠️ DOPPEL:\n  ' + out.duplicates.join('\n  ') : '✅ keine Doppel erkannt');
  console.log(out.errors.length ? '🔴 FEHLER:\n  ' + out.errors.join('\n  ') : '✅ keine Fehler');
  console.log('→ reports/post-health.json\n');
})();
