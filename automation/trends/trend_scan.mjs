#!/usr/bin/env node
/* LuxeStyle — trend_scan.mjs  (Trends + Musik-Mood regelmässig analysieren & entwickeln)
 *
 * User 2026-06-17 „analysiere Trends, Musik immer und entwickle". GRATIS, grösstenteils ohne Key:
 *   1) Google-Trends Schweiz (Daily Trending RSS, KEIN Key) → was die CH gerade sucht.
 *   2) Eigene TikTok-Performance (tools/tiktok_analyze.py, best-effort) — falls Report vorhanden.
 *   3) KI-Interpretation über den Multi-Provider-Router (ai_generate, fällt selbst zurück):
 *      macht aus Trends + LuxeStyle-Kategorien 3–5 konkrete Content-Ideen + Musik-Mood + CH-Hashtags
 *      (STRIKT Schweiz, Mundart bevorzugt, KEIN Deutschland). Ohne KI → regelbasierter Fallback.
 *
 * Output: reports/trends-YYYY-MM-DD.json  (+ Konsole). Idempotent, no-op-safe.
 * Lauf:   node automation/trends/trend_scan.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from '../ai/ai_generate.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const MOODS = ['elegant', 'cinematic', 'upbeat-pop', 'house', 'phonk', 'lofi'];

async function googleTrendsCH() {
  try {
    const r = await fetch('https://trends.google.com/trending/rss?geo=CH', { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];
    const xml = await r.text();
    const titles = [...xml.matchAll(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/g)].map(m => m[1].trim());
    // erster <title> ist der Feed-Titel → weg
    return titles.slice(1).filter(Boolean).slice(0, 20);
  } catch { return []; }
}

function ownTikTokSignals() {
  // Neuesten tiktok-Report einlesen, falls vorhanden (Gewinner-Hashtags/Hooks aus echten Views).
  try {
    const dir = path.join(ROOT, 'reports');
    const f = fs.readdirSync(dir).filter(x => /tiktok|ANALYSE-SOCIAL/i.test(x)).sort().pop();
    if (!f) return null;
    return path.basename(f);
  } catch { return null; }
}

function musicCatalogMoods() {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'automation/music/catalog.json'), 'utf8'));
    const tracks = c.tracks || c;
    const byMood = {};
    for (const t of (Array.isArray(tracks) ? tracks : Object.values(tracks)))
      if (t.mood) byMood[t.mood] = (byMood[t.mood] || 0) + 1;
    return byMood;
  } catch { return {}; }
}

(async () => {
  const trends = await googleTrendsCH();
  const ttReport = ownTikTokSignals();
  const moods = musicCatalogMoods();

  const system = 'Du bist Social-Media-Stratege für einen Schweizer Online-Shop (LuxeStyle, luxestyle.ch). ' +
    'STRIKT Schweiz, Mundart (Bärndütsch) bevorzugt, NIE Deutschland-Bezug. Antworte als JSON.';
  const prompt = `Schweizer Google-Trends gerade: ${trends.join(', ') || '(keine geladen)'}.
LuxeStyle-Kategorien: Damen-/Herrenmode, Schmuck, Beauty, Schuhe, Taschen, Hüte, Outdoor/Camping, Küche, Werkzeug, Bademode.
Verfügbare Musik-Moods im Tool: ${MOODS.join(', ')}.
Gib JSON: {"content_ideen":[{"idee":"…","kategorie":"…","hook_mundart":"…","musik_mood":"<einer der Moods>","hashtags":["#…"]}], "trend_musik_note":"…"}.
3–5 Ideen, Hooks kurz/Mundart, Hashtags CH (#schweiz/#schweizmode/#ootdschweiz + Stadt rotieren), max 5 Tags pro Idee.`;

  let ai = null, provider = 'none';
  const g = await generate({ system, prompt, json: true, maxTokens: 900 });
  provider = g.provider;
  if (g.text) { try { ai = JSON.parse(g.text); } catch { /* manche Modelle umrahmen JSON */
    const m = g.text.match(/\{[\s\S]*\}/); if (m) { try { ai = JSON.parse(m[0]); } catch {} } } }

  // Regelbasierter Fallback (ohne KI) — nutzt Gewinner-Format aus dem Gehirn: Produkt+Preis+Mundart.
  if (!ai) ai = { content_ideen: [
    { idee: 'Top-Produkt + CHF-Preis + Vergleich', kategorie: 'Mode/Schmuck', hook_mundart: 'Lueg mau das aa 😍',
      musik_mood: 'upbeat-pop', hashtags: ['#schweizmode', '#ootdschweiz', '#zürich', '#fyp'] },
    { idee: 'Beauty-Routine kurz, Vorher/Nachher (kein fremdes Branding!)', kategorie: 'Beauty', hook_mundart: 'Dis nöie Lieblingsteil?',
      musik_mood: 'lofi', hashtags: ['#beautyschweiz', '#selfcare', '#basel', '#fyp'] } ],
    trend_musik_note: 'Ohne KI: upbeat-pop für schnelle Montagen, elegant für Schmuck/Editorial.' };

  const report = { ts: new Date().toISOString(), provider, google_trends_ch: trends,
    own_tiktok_report: ttReport, music_moods_available: moods, ideen: ai };

  const dir = path.join(ROOT, 'reports'); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `trends-${report.ts.slice(0, 10)}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n');

  console.log('📈 Trend-Scan (Schweiz)');
  console.log('Google-Trends CH:', trends.slice(0, 8).join(' · ') || '(keine)');
  console.log(`KI-Quelle: ${provider}`);
  for (const it of (ai.content_ideen || []).slice(0, 5))
    console.log(`  • [${it.kategorie}] ${it.idee} → Hook „${it.hook_mundart}" · 🎵 ${it.musik_mood} · ${(it.hashtags || []).join(' ')}`);
  console.log('🎵 Musik-Note:', ai.trend_musik_note || '—');
  console.log('Report:', path.relative(ROOT, file));
})();
