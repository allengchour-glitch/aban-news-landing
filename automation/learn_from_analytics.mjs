#!/usr/bin/env node
/* LuxeStyle — learn_from_analytics.mjs  (Selbst-Lern-Schleife: „werde von selbst besser")
 *
 * Liest den NEUESTEN TikTok-Analyse-Report (reports/tiktok_*.json, erzeugt von tools/tiktok_analyze.py),
 * rankt die real performenden Hashtags nach durchschnittlichen Views und schreibt daraus optimierte
 * Pools nach automation/learned_pools.sh. auto_render.sh sourct diese Datei und überschreibt damit
 * seine Default-TAGSETS → künftige Reels nutzen automatisch die Hashtags, die wirklich Reichweite zogen.
 *
 * Zusätzlich wird eine datierte Lehre an dropship/REEL-REGELN.md angehängt (nachvollziehbar).
 * No-op-safe: ohne Report passiert nichts (kein Fehler).
 *
 * Report-Schema (tiktok_analyze.py): { report: { hashtags_ranked:[{tag,avg_views,avg_engagement,count}],
 *   hooks:[{...views}], top_by_views:[{caption,views}] , overview:{...} } }
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const REPORTS = path.join(ROOT, 'reports');
const OUT = path.join(ROOT, 'automation', 'learned_pools.sh');
const REGELN = path.join(ROOT, 'dropship', 'REEL-REGELN.md');

// Marken-/Reach-Pflicht-Tags, die immer in jeden Satz gehören.
const BRAND = ['#luxestyle', '#luxestylech'];
const REACH = ['#fyp', '#foryou'];

function latestReport(){
  let files = [];
  try { files = fs.readdirSync(REPORTS).filter(f => /^tiktok_.*\.json$/.test(f)); } catch { return null; }
  if(!files.length) return null;
  files.sort(); // tiktok_<label>_<YYYY-MM-DD>.json → lexikografisch = chronologisch
  return path.join(REPORTS, files[files.length - 1]);
}

const rf = latestReport();
if(!rf){ console.log('Kein reports/tiktok_*.json gefunden → No-op (Lernschleife wartet auf erste Analyse).'); process.exit(0); }

let report;
try { report = JSON.parse(fs.readFileSync(rf, 'utf8')).report || {}; }
catch(e){ console.log('Report nicht lesbar → No-op:', e.message); process.exit(0); }

const ranked = (report.hashtags_ranked || []).filter(h => h.tag && (h.avg_views || 0) > 0);
if(ranked.length < 3){
  console.log(`Report ${path.basename(rf)} hat zu wenig Hashtag-Signal (${ranked.length}) → No-op (Account noch klein).`);
  process.exit(0);
}

// Top-Performer-Tags (ohne Brand/Reach-Pflichttags, die wir separat anhängen), normalisiert mit '#'.
const norm = t => '#' + String(t).replace(/^#/, '').toLowerCase();
const top = ranked.map(h => norm(h.tag))
  .filter(t => !BRAND.includes(t) && !REACH.includes(t))
  .filter((t, i, a) => a.indexOf(t) === i)
  .slice(0, 9);

// 3 Sätze à 5 Tags bauen: 3 Performer + 1 Reach + 1 Brand (rotierend).
const sets = [];
for(let s = 0; s < 3; s++){
  const perf = [top[s*3 % top.length], top[(s*3+1) % top.length], top[(s*3+2) % top.length]];
  sets.push([...new Set([...perf, REACH[s % REACH.length], BRAND[s % BRAND.length]])].join(' '));
}

// learned_pools.sh schreiben (bash-Array, von auto_render.sh gesourct).
const esc = s => s.replace(/"/g, '\\"');
const sh = `#!/usr/bin/env bash
# AUTO-GENERIERT von automation/learn_from_analytics.mjs aus ${path.basename(rf)} — NICHT manuell editieren.
# Datengetriebene Hashtag-Sätze (Top-Performer nach Ø-Views) überschreiben die Defaults in auto_render.sh.
TAGSETS=(
  "${esc(sets[0])}"
  "${esc(sets[1])}"
  "${esc(sets[2])}"
)
`;
fs.writeFileSync(OUT, sh);
console.log(`✅ ${OUT} aktualisiert aus ${path.basename(rf)} — Top-Tags:`, top.slice(0,6).join(' '));
sets.forEach((s,i)=>console.log(`   Satz ${i+1}: ${s}`));

// Lehre in REEL-REGELN.md protokollieren (oben im Verbesserungs-Log).
try {
  const today = new Date().toISOString().slice(0,10);
  const note = `- ${today}: **Selbst-Lernen (learn_from_analytics.mjs):** Hashtag-Pools aus echten TikTok-Daten `+
    `(${path.basename(rf)}) neu gesetzt → Top-Performer: ${top.slice(0,6).join(' ')}. auto_render.sh nutzt sie automatisch.\n`;
  const md = fs.readFileSync(REGELN, 'utf8');
  const anchor = '## Verbesserungs-Log (chronologisch — neue Punkte kommen oben dazu)\n';
  if(md.includes(anchor) && !md.includes(note.trim())){
    fs.writeFileSync(REGELN, md.replace(anchor, anchor + note));
    console.log('   Lehre in REEL-REGELN.md protokolliert.');
  }
} catch(e){ /* Protokoll optional */ }
