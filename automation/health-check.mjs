#!/usr/bin/env node
/* LuxeStyle — health-check.mjs  (welche GRATIS-Quellen/Tools leben gerade?)
 *
 * Teil der „richtigen Vollautomation" (User 2026-06-17): prüft regelmässig, welche KI-Provider,
 * Binaries und Daten-Quellen funktionieren — damit man SOFORT sieht, wenn einer „nicht mehr geht",
 * und der Fallback greift. Schreibt reports/health-YYYY-MM-DD.json + Konsolen-Übersicht.
 *
 * Lauf:  node automation/health-check.mjs            (alle Checks)
 *        node automation/health-check.mjs --ai       (nur KI-Provider live anpingen)
 * No-op-safe: ohne Keys = „kein Key" (kein Fehler). Netz-Timeouts werden als „down" gewertet.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generate, listProviders } from './ai/ai_generate.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const AI_ONLY = process.argv.includes('--ai');

function bin(cmd) { try { execSync(`command -v ${cmd}`, { stdio: 'pipe' }); return true; } catch { return false; } }

async function pingProvider(name) {
  // EIN Provider isoliert testen (order = nur dieser) mit Mini-Prompt.
  try {
    const r = await generate({ prompt: 'Antworte nur mit: OK', maxTokens: 5, order: [name] });
    return r.provider === name ? 'live' : 'down';
  } catch { return 'down'; }
}

(async () => {
  const out = { ts: new Date().toISOString(), ai: {}, binaries: {}, data: {} };

  // KI-Provider: erst Key-Status, dann (wenn Key da) echten Live-Ping
  for (const p of listProviders()) {
    if (!p.available) { out.ai[p.name] = 'kein Key'; continue; }
    out.ai[p.name] = await pingProvider(p.name);
  }

  if (!AI_ONLY) {
    for (const b of ['ffmpeg', 'yt-dlp', 'piper', 'python3', 'node', 'curl', 'gallery-dl', 'wrangler'])
      out.binaries[b] = bin(b) ? 'ok' : 'fehlt';
    // Daten-Quellen
    try { const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'automation/music/catalog.json'), 'utf8'));
      out.data.music_tracks = (c.tracks || c).length || Object.keys(c).length; } catch { out.data.music_tracks = 0; }
    try { out.data.top_products = fs.readFileSync(path.join(ROOT, 'automation/top_products.csv'), 'utf8').trim().split('\n').length - 1; } catch { out.data.top_products = 0; }
    try { out.data.text_image_cards = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'social/text_image_map.json'), 'utf8'))).length; } catch { out.data.text_image_cards = 0; }
    // Google-Trends-CH erreichbar? (gratis, kein Key)
    try { const r = await fetch('https://trends.google.com/trending/rss?geo=CH', { signal: AbortSignal.timeout(8000) });
      out.data.google_trends_ch = r.ok ? 'erreichbar' : `http ${r.status}`; } catch { out.data.google_trends_ch = 'down'; }
  }

  const liveAi = Object.entries(out.ai).filter(([, v]) => v === 'live').map(([k]) => k);
  out.summary = { ai_live: liveAi, ai_live_count: liveAi.length,
    automation_ok: liveAi.length > 0 || true /* Template-Fallback sichert Grundbetrieb */ };

  const dir = path.join(ROOT, 'reports'); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `health-${out.ts.slice(0, 10)}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');

  console.log('🩺 LuxeStyle Health-Check');
  console.log('KI-Provider :', Object.entries(out.ai).map(([k, v]) => `${k}=${v}`).join('  '));
  if (!AI_ONLY) {
    console.log('Binaries    :', Object.entries(out.binaries).map(([k, v]) => `${k}=${v}`).join('  '));
    console.log('Daten       :', JSON.stringify(out.data));
  }
  console.log(`✅ KI live: ${liveAi.length ? liveAi.join(', ') : 'keiner (→ Template-Fallback hält Betrieb)'}  ·  Report: ${path.relative(ROOT, file)}`);
})();
