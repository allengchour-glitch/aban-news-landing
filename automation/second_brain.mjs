#!/usr/bin/env node
/* 🧠 second_brain.mjs — Das „zweite Gehirn": selbst-verbessernde Wissens-Synthese
 *
 * IDEE: Der YouTube-Sammler (learn_from_youtube.mjs) füllt rund um die Uhr ROHE Lernläufe in
 * automation/youtube-learnings.md. Dieses Tool ist die nächste Stufe: es LIEST alle bisherigen
 * Läufe (+ TikTok-Reports, falls da), VERDICHTET sie zu einer deduplizierten, ranggeordneten
 * Wissensbasis `automation/SECOND-BRAIN.md` und LEITET konkrete Verbesserungen ab
 * (Konsens-Hashtag-Pool `automation/brain_pools.sh`). Mit jedem Lauf wächst & schärft sich das Wissen
 * → das System „lernt selbstständig besser zu werden".
 *
 * Reines Node, keine Deps. No-op-safe (ohne Quellen passiert nichts). Nur echte, abgeleitete Daten —
 * keine erfundenen Fakten. Läuft per Cron (second-brain.yml), unabhängig von einer Session.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const YT = path.join(ROOT, 'automation', 'youtube-learnings.md');
const REPORTS = path.join(ROOT, 'reports');
const BRAIN = path.join(ROOT, 'automation', 'SECOND-BRAIN.md');
const BRAIN_POOL = path.join(ROOT, 'automation', 'brain_pools.sh');

const num = s => parseInt(String(s).replace(/[^0-9]/g, ''), 10) || 0;

// --- Quellen einlesen (alle optional) ---
let yt = '';
try { yt = fs.readFileSync(YT, 'utf8'); } catch {}
let tiktok = [];
try {
  for (const f of fs.readdirSync(REPORTS).filter(f => /^tiktok_.*\.json$/.test(f))) {
    try { tiktok.push(JSON.parse(fs.readFileSync(path.join(REPORTS, f), 'utf8')).report || {}); } catch {}
  }
} catch {}

if (!yt && !tiktok.length) { console.log('Keine Lern-Quellen (youtube-learnings.md / tiktok-Reports) → No-Op.'); process.exit(0); }

// --- YouTube-Digest parsen ---
const runs = yt.split(/\n##\s+📅/).slice(1);            // jeder Lernlauf-Block
const hashFreq = {}, kwFreq = {}, hooks = new Map(), themeRuns = {};
for (const block of runs) {
  const themes = block.split(/\n###\s+/).slice(1);
  for (const th of themes) {
    const label = (th.split('\n')[0] || '').replace(/\s+$/, '').trim();
    themeRuns[label] = (themeRuns[label] || 0) + 1;
    // Hashtags
    const hm = th.match(/\*\*Trend-Hashtags:\*\*\s*(.+)/);
    if (hm) for (const h of hm[1].split(/\s+/)) { const t = h.toLowerCase(); if (/^#/.test(t)) hashFreq[t] = (hashFreq[t] || 0) + 1; }
    // Keywords
    const km = th.match(/\*\*Keywords:\*\*\s*(.+)/);
    if (km) for (const w of km[1].split(/,\s*/)) { const k = w.trim().toLowerCase(); if (k) kwFreq[k] = (kwFreq[k] || 0) + 1; }
    // Hooks (Titel · Views) — höchste Views je Titel behalten
    for (const line of th.split('\n')) {
      const m = line.match(/^-\s+(.*?)\s+·\s+([0-9'.,\s]+)\s*$/);
      if (m) { const title = m[1].trim(); const v = num(m[2]); if (title && (!hooks.has(title) || hooks.get(title) < v)) hooks.set(title, v); }
    }
  }
}
// TikTok-Reports einfließen lassen (Hashtags nach Ø-Views)
for (const r of tiktok) for (const h of (r.hashtags_ranked || [])) {
  if (h.tag && (h.avg_views || 0) > 0) { const t = '#' + String(h.tag).replace(/^#/, '').toLowerCase(); hashFreq[t] = (hashFreq[t] || 0) + 2; }
}

const topHash = Object.entries(hashFreq).sort((a, b) => b[1] - a[1]);
const topKw = Object.entries(kwFreq).sort((a, b) => b[1] - a[1]).slice(0, 20);
const topHooks = [...hooks.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
const totalRuns = runs.length;

// --- Selbst-Verbesserung: Konsens-Hashtag-Pool aus den am häufigsten wiederkehrenden Tags ---
const BRAND = ['#luxestyle', '#luxestylech'], REACH = ['#fyp', '#foryou'];
const consensus = topHash.map(([t]) => t).filter(t => !BRAND.includes(t) && !REACH.includes(t)).slice(0, 9);
let poolWritten = false;
if (consensus.length >= 3) {
  const sets = [];
  for (let s = 0; s < 3; s++) {
    const perf = [consensus[(s * 3) % consensus.length], consensus[(s * 3 + 1) % consensus.length], consensus[(s * 3 + 2) % consensus.length]];
    sets.push([...new Set([...perf, REACH[s % REACH.length], BRAND[s % BRAND.length]])].join(' '));
  }
  const esc = s => s.replace(/"/g, '\\"');
  fs.writeFileSync(BRAIN_POOL, `#!/usr/bin/env bash\n# 🧠 AUTO-GENERIERT von automation/second_brain.mjs — Konsens-Hashtags über ALLE Lernläufe.\n# Stärker als Einzellauf-Pools: nimmt die Tags, die am häufigsten wiederkehren. auto_render.sh kann sourcen.\nBRAIN_TAGSETS=(\n  "${esc(sets[0])}"\n  "${esc(sets[1])}"\n  "${esc(sets[2])}"\n)\n`);
  poolWritten = true;
}

// --- Verbesserungs-Vorschläge (einfache, ehrliche Heuristiken) ---
const suggestions = [];
const weakThemes = Object.entries(themeRuns).filter(([, n]) => n < Math.max(2, totalRuns * 0.15)).map(([k]) => k);
if (weakThemes.length) suggestions.push(`Wenig Daten zu: ${weakThemes.join(', ')} → mehr/spezifischere Queries in learn_from_youtube.mjs ergänzen.`);
if (consensus.length) suggestions.push(`Konsens-Hashtags in Reels/Posts priorisieren: ${consensus.slice(0, 6).join(' ')} (brain_pools.sh nutzt sie bereits).`);
if (topHooks.length) suggestions.push(`Diese Hook-Muster ziehen Reichweite — als Caption-Inspiration testen (nicht kopieren): „${topHooks[0][0]}".`);
if (totalRuns < 5) suggestions.push(`Wissensbasis noch jung (${totalRuns} Läufe) — Aussagekraft steigt, je länger der 24/7-Sammler läuft.`);

// --- SECOND-BRAIN.md schreiben (lebende Wissensbasis, oben ein kurzer Evolutions-Log) ---
const today = new Date().toISOString().slice(0, 10);
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
let prevLog = '';
try { prevLog = (fs.readFileSync(BRAIN, 'utf8').match(/<!--LOG-->([\s\S]*?)<!--\/LOG-->/) || [, ''])[1].trim(); } catch {}
const logLine = `- ${stamp}: ${totalRuns} Läufe · ${topHash.length} Hashtags · ${hooks.size} Hooks · ${Object.keys(kwFreq).length} Keywords verdichtet${poolWritten ? ' · Konsens-Pool aktualisiert' : ''}.`;
const log = [logLine, ...prevLog.split('\n').filter(Boolean)].slice(0, 30).join('\n');

const md = `# 🧠 SECOND BRAIN — verdichtete, selbst-wachsende Wissensbasis

> **Auto-generiert** von \`automation/second_brain.mjs\` (Cron \`second-brain.yml\`) aus \`youtube-learnings.md\`
> + TikTok-Reports. **Nicht manuell editieren.** Jede Session liest hier den DESTILLIERTEN Stand statt der
> Rohläufe. Wird mit jedem Lauf reicher & genauer. Nur echte, abgeleitete Daten — keine erfundenen Fakten.
> Stand: ${stamp} · Quellen: ${totalRuns} YouTube-Läufe, ${tiktok.length} TikTok-Reports.

## 🔝 Konsens-Hashtags (am häufigsten über alle Läufe)
${topHash.slice(0, 20).map(([t, n]) => `- ${t}  _(${n}×)_`).join('\n') || '_noch keine_'}

## 🪝 Stärkste Hooks (höchste gesehene Views — Inspiration, nicht kopieren)
${topHooks.map(([t, v]) => `- ${t} · ${v.toLocaleString('de-CH')}`).join('\n') || '_noch keine_'}

## 🔑 Trend-Keywords
${topKw.map(([k, n]) => `${k} _(${n})_`).join(' · ') || '_noch keine_'}

## 💡 Selbst-Verbesserungs-Vorschläge
${suggestions.map(s => `- ${s}`).join('\n') || '- (keine offenen Hinweise)'}

## 📈 Themen-Abdeckung (Läufe je Thema)
${Object.entries(themeRuns).sort((a, b) => b[1] - a[1]).map(([k, n]) => `- ${k}: ${n}`).join('\n') || '_noch keine_'}

## 🧬 Evolutions-Log (wie das Gehirn wächst)
<!--LOG-->
${log}
<!--/LOG-->
`;
fs.writeFileSync(BRAIN, md);
console.log(`✅ ${path.relative(ROOT, BRAIN)} verdichtet: ${totalRuns} Läufe → ${topHash.length} Hashtags, ${hooks.size} Hooks, ${Object.keys(kwFreq).length} Keywords.`);
if (poolWritten) console.log(`✅ ${path.relative(ROOT, BRAIN_POOL)} — Konsens-Tags: ${consensus.slice(0, 6).join(' ')}`);
suggestions.forEach(s => console.log('   💡 ' + s));
