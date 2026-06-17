#!/usr/bin/env node
/* LuxeStyle — brain.mjs  v2 (Maximum)  — das selbstlernende „Gehirn", wird mit jedem Lauf nur besser
 *
 * Lernt kumulativ aus ALLEN TikTok-Reports in ein persistentes Gedaechtnis (knowledge.json).
 * RATSCHE gegen Rueckschritt: Verlierer bleiben geblockt, kuratierte Gewinner bleiben, Entscheidungen
 * sind append-only. Daten reihen/ergaenzen nur.
 *
 * v2-Upgrades (echte Intelligenz, keine Kosmetik):
 *  1) BAYES-SHRINKAGE statt harter Mindest-Nutzung — kleine Stichproben werden zum Gesamtmittel
 *     gezogen → kein One-Hit-Wonder verzerrt, aber jedes Signal zaehlt (Konfidenz wird mitgefuehrt).
 *  2) HOOK-TYP-LERNEN aus report.hooks — jeder Video-Hook wird klassifiziert (Preis-Vergleich/Neugier/
 *     Mundart/Frage/Preis/generisch) und nach Ø-Views gerankt → CAPS + Format-Prioritaet datengetrieben.
 *  3) KPI-VERLAUF — pro Report Snapshot (Views/Likes/Shares/Eng/Dauer) → Trend mit Pfeilen (verbessert es sich?).
 *  4) MOMENTUM — letzter Report vs. kumulativ je Tag → steigende Tags werden erkannt/bevorzugt.
 *  5) KONFIDENZ-Labels auf Empfehlungen (hoch/mittel/niedrig nach Stichprobe).
 *
 * Lauf:  node automation/brain/brain.mjs [--dry]
 * No-op-safe + idempotent. Schreibt: learned_pools.sh, brain/BRAIN.md, brain/knowledge.json, brain/pools.json
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const REPORTS = path.join(ROOT, 'reports');
const KB = path.join(ROOT, 'automation', 'brain', 'knowledge.json');
const POOLS = path.join(ROOT, 'automation', 'learned_pools.sh');
const STATUS = path.join(ROOT, 'automation', 'brain', 'BRAIN.md');
const DRY = process.argv.includes('--dry');
const norm = t => '#' + String(t).replace(/^#/, '').toLowerCase();
const r0 = n => Math.round(Number(n) || 0);

// ---- Hook-Klassifizierung (welcher Hook-TYP zieht?) ------------------------
function classifyHook(s) {
  s = (s || '').toLowerCase();
  if (/statt|günstiger|guenstiger|spar|% ?weniger|teurer/.test(s)) return 'preis_vergleich';
  if (/dys|schwiiz|chasch|eiges|dini|zäme|hoi |mach dys|öppis/.test(s)) return 'mundart';
  if (/wusste nicht|stopp|das musst du|kaum|geheim|niemand|glaubst|warte/.test(s)) return 'neugier';
  if (/\?|kommentier|markier|1, ?2|welche|welches|oder /.test(s)) return 'frage_cta';
  if (/chf ?\d|fr\.? ?\d/.test(s)) return 'preis';
  return 'generisch';
}

// ---- Gedaechtnis laden + Container initialisieren --------------------------
let kb;
try { kb = JSON.parse(fs.readFileSync(KB, 'utf8')); }
catch (e) { console.error('knowledge.json nicht lesbar → Abbruch:', e.message); process.exit(1); }
kb.version = 2;
kb.signals = kb.signals || {};
const sig = kb.signals;
sig.hashtags = sig.hashtags || {};
sig.hook_types = sig.hook_types || {};
sig.kpi_history = sig.kpi_history || [];
sig.reports_ingested = sig.reports_ingested || [];
kb.decisions = kb.decisions || [];
const blocked = new Set((kb.rules.blocked_hashtags || []).map(norm));

// ---- Alle Reports kumulativ einlesen (idempotent) -------------------------
let reportFiles = [];
try { reportFiles = fs.readdirSync(REPORTS).filter(f => /^tiktok_.*\.json$/.test(f)).sort(); } catch {}
if (!reportFiles.length) { console.log('Keine reports/tiktok_*.json → No-op.'); process.exit(0); }

let latest = null, newlyIngested = 0;
for (const f of reportFiles) {
  let rep;
  try { rep = (JSON.parse(fs.readFileSync(path.join(REPORTS, f), 'utf8')).report) || {}; } catch { continue; }
  latest = { file: f, rep };
  if (sig.reports_ingested.includes(f)) continue;
  // (1) Hashtags kumulativ + letzten Report-Schnitt fuer Momentum merken
  for (const h of (rep.hashtags_ranked || [])) {
    const t = norm(h.tag); if (!t || t === '#') continue;
    const uses = Number(h.uses) || 1, v = Number(h.avg_views) || 0, e = Number(h.avg_engagement) || 0;
    const s = sig.hashtags[t] || { uses_total: 0, views_wsum: 0, eng_wsum: 0 };
    s.uses_total += uses; s.views_wsum += v * uses; s.eng_wsum += e * uses; s.last_avg = v;
    sig.hashtags[t] = s;
  }
  // (2) Hook-Typen aus allen Video-Hooks lernen
  for (const h of (rep.hooks || [])) {
    const ty = classifyHook(h.hook); const v = Number(h.views) || 0;
    const s = sig.hook_types[ty] || { views_sum: 0, n: 0, eng_sum: 0 };
    s.views_sum += v; s.n += 1; s.eng_sum += Number(h.engagement_rate) || 0;
    sig.hook_types[ty] = s;
  }
  // (3) KPI-Snapshot
  const tt = rep.totals || {}, av = rep.averages || {};
  sig.kpi_history.push({
    report: f, date: (f.match(/(\d{4}-\d{2}-\d{2})/) || [, ''])[1],
    videos: rep.video_count || 0, views: tt.views || 0, likes: tt.likes || 0,
    shares: tt.shares || 0, comments: tt.comments || 0,
    avg_views: r0(av.views), eng: +(av.engagement_rate || 0).toFixed(4), dur: av.duration_s || 0,
  });
  sig.reports_ingested.push(f);
  newlyIngested++;
}

// ---- (1) Bayes-Shrinkage-Ranking der Hashtags -----------------------------
const vals = Object.values(sig.hashtags);
const globalMean = vals.reduce((a, s) => a + s.views_wsum, 0) / Math.max(1, vals.reduce((a, s) => a + s.uses_total, 0));
const C = 5; // Pseudozaehler: kleine Stichproben werden Richtung globalMean gezogen
const conf = u => u >= 8 ? 'hoch' : u >= 3 ? 'mittel' : 'niedrig';
const scored = Object.entries(sig.hashtags).map(([t, s]) => {
  const avg = s.views_wsum / Math.max(1, s.uses_total);
  const score = (s.views_wsum + C * globalMean) / (s.uses_total + C);
  const momentum = s.last_avg && avg ? s.last_avg / avg : 1;
  return { tag: t, avg, score, uses: s.uses_total, momentum, conf: conf(s.uses_total) };
}).filter(r => !blocked.has(r.tag) && r.score > 0).sort((a, b) => b.score - a.score);

const reach = (kb.rules.reach || ['#fyp', '#foryou']).map(norm);
const discovery = (kb.rules.curated_discovery || []).map(norm);
// dataTop = nach Bayes-Score gerankt, ABER nur ROBUSTE Tags (>=3 Nutzungen) → keine Einmal-Tags eines
// einzigen viralen Videos (z.B. die 8 Aroma-Tags des Diffuser-Clips) verzerren die Saetze. Fallback: alle.
const MIN_USES = 3;
const robustScored = scored.filter(r => r.uses >= MIN_USES);
const poolSource = robustScored.length >= 4 ? robustScored : scored;
const dataTop = poolSource.map(r => r.tag).filter(t => !reach.includes(t) && !discovery.includes(t)).slice(0, 8);
const risers = robustScored.filter(r => r.momentum > 1.15).slice(0, 5);

// ---- (2) Hook-Typen ranken (Ø-Views) → CAPS + Format-Prioritaet datengetrieben
const hookRank = Object.entries(sig.hook_types)
  .map(([ty, s]) => ({ ty, avg: r0(s.views_sum / Math.max(1, s.n)), n: s.n }))
  .sort((a, b) => b.avg - a.avg);
const hookOrder = hookRank.map(h => h.ty);
const caps = (kb.rules.winner_hooks || []).slice().sort((a, b) => {
  const ia = hookOrder.indexOf(classifyHook(a)); const ib = hookOrder.indexOf(classifyHook(b));
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); // Gewinner-Hook-Typen zuerst
});

// ---- TAGSETS: 1 Reach + 2 Discovery + 2 Daten-Top (rotierend) -------------
const pick = (arr, i, n) => Array.from({ length: n }, (_, k) => arr[(i + k) % arr.length]).filter(Boolean);
const sets = [];
for (let i = 0; i < 4; i++) {
  sets.push([...new Set([
    reach[i % reach.length],
    ...pick(discovery, (i * 2) % Math.max(1, discovery.length), 2),
    ...pick(dataTop, (i * 2) % Math.max(1, dataTop.length), 2),
  ])].filter(Boolean).join(' '));
}

// ---- learned_pools.sh ------------------------------------------------------
const sh = `#!/usr/bin/env bash
# AUTO-GENERIERT von automation/brain/brain.mjs v2 — NICHT manuell editieren (Aenderungen in knowledge.json).
# Gehirn-Stand: ${sig.reports_ingested.length} Report(s) gelernt · Bayes-Shrinkage · Verlierer geblockt (${[...blocked].join(' ') || '—'}).
# CAPS sind nach gelerntem Hook-Typ sortiert (bester Typ zuerst: ${hookOrder.slice(0, 3).join(' > ') || '—'}).
TAGSETS=(
${sets.map(s => '  "' + s.replace(/"/g, '\\"') + '"').join('\n')}
)
CAPS=(
${caps.map(c => '  "' + c.replace(/"/g, '\\"') + '"').join('\n')}
)
`;

// ---- (3) KPI-Trend (Pfeile) ------------------------------------------------
const kh = sig.kpi_history;
const arrow = (cur, prev) => prev == null ? '·' : cur > prev ? '▲' : cur < prev ? '▼' : '=';
const last = kh[kh.length - 1] || {}, prev = kh[kh.length - 2] || null;
const kpiLine = (label, key, fmt = x => x) => `${label}: ${fmt(last[key])} ${arrow(last[key], prev?.[key])}${prev ? ` (vorher ${fmt(prev[key])})` : ''}`;

// ---- Gap-Analyse → naechste Aktionen --------------------------------------
const rep = latest.rep, tot = rep.totals || {}, avg = rep.averages || {};
const hours = rep.hour_utc_post_counts || {};
const primetime = kb.rules.posting?.ch_primetime_utc || [16, 17, 18, 19];
const ptPosts = primetime.reduce((n, h) => n + (Number(hours[h] || hours[String(h)] || 0)), 0);
const actions = [];
if ((Number(tot.shares) || 0) === 0) actions.push('🔴 0 Shares = Reichweiten-Decke. Share/Save-Trigger + Vergleichs-/Neugier-Hooks (stehen in CAPS) konsequent nutzen.');
if (prev && last.shares <= prev.shares && last.views > prev.views) actions.push('🔴 Views steigen, aber Shares/Engagement nicht → hohle Reichweite. UGC/Demo + Save-Trigger statt nur Produkt-Pans.');
if (ptPosts === 0) actions.push('🟡 Kein Post in CH-Primetime (16–19 UTC). Cron steht auf 16/19 — sobald Autopost live ist, erledigt sich das.');
if ((Number(avg.engagement_rate) || 0) < 0.02) actions.push('🟡 Engagement <2% → Frage-CTA „1/2/3?" + Mundart verstaerken.');
if ((Number(avg.duration_s) || 0) > 20) actions.push('🟢 Videolaenge >20s → auf 10–15s kuerzen (Completion).');
if (hookRank[0]) actions.push(`🟢 Bester Hook-Typ laut Daten: „${hookRank[0].ty}" (Ø ${hookRank[0].avg} V) → davon mehr; „generisch" meiden.`);
actions.push('🟢 Groesster Hebel (manuell/PC-Claude): Hands-on/UGC-Clips + Trending-Sounds.');

const todayISO = new Date().toISOString().slice(0, 10);
const md = `# 🧠 BRAIN v2 — LuxeStyle Social-Lernschleife (auto-generiert)

_Aktualisiert: ${todayISO} · ${sig.reports_ingested.length} Reports gelernt · Bayes-Shrinkage (C=${C}, Ø-Basis ${r0(globalMean)} V)_

## 📈 KPI-Verlauf (verbessert es sich?)
- ${kpiLine('Views', 'views')}
- ${kpiLine('Engagement', 'eng', x => (x * 100).toFixed(1) + '%')}
- ${kpiLine('Shares', 'shares')} · ${kpiLine('Likes', 'likes')} · ${kpiLine('Kommentare', 'comments')}
- Ø Views/Video: ${last.avg_views} ${arrow(last.avg_views, prev?.avg_views)} · Ø Dauer: ${last.dur}s

## 🏷️ Beste Hashtag-Saetze (Bayes-Score, Verlierer geblockt)
${sets.map((s, i) => `${i + 1}. ${s}`).join('\n')}
**Top-Performer (Score · Konfidenz):** ${robustScored.slice(0, 6).map(r => `${r.tag} ${r0(r.score)}·${r.conf}`).join(' · ') || '—'}
**📈 Momentum (steigend):** ${risers.length ? risers.map(r => `${r.tag} ×${r.momentum.toFixed(2)}`).join(' · ') : '— (noch zu wenig Verlauf)'}
**🚫 Geblockt:** ${[...blocked].join(' ') || '—'}

## 🎣 Hook-Typ-Scoreboard (was zieht wirklich — gelernt aus ${kh.length ? sig.hashtags && Object.keys(sig.hook_types).length : 0} Typen)
${hookRank.map(h => `- **${h.ty}**: Ø ${h.avg} Views (${h.n} Videos)`).join('\n') || '—'}

## 🎯 Naechste Aktionen (auto-abgeleitet)
${actions.map(a => `- ${a}`).join('\n')}

## ✅ Gewinner-Formate / ❌ Verlierer
${(kb.rules.format_priority || []).map(f => `- ✅ ${f}`).join('\n')}
${(kb.rules.loser_formats || []).map(f => `- ❌ ${f}`).join('\n')}

## 🧾 Entscheidungs-Log (Ratsche, append-only)
${kb.decisions.map(d => `- ${d.date}: ${d.change} _(${d.evidence})_`).join('\n')}
`;

// ---- Schreiben (idempotent) -----------------------------------------------
const prevPools = fs.existsSync(POOLS) ? fs.readFileSync(POOLS, 'utf8') : '';
const poolsChanged = prevPools !== sh;
if (poolsChanged && newlyIngested > 0) {
  kb.decisions.push({ date: todayISO, change: `Pools v2 aus ${sig.reports_ingested.length} Reports abgeleitet (Bayes + Hook-Typ-Lernen).`, evidence: `Top-Tag ${scored[0]?.tag}; bester Hook „${hookRank[0]?.ty}" (Ø ${hookRank[0]?.avg}V)` });
}
kb.updated = todayISO;

if (DRY) {
  console.log('[dry] TAGSETS:\n' + sets.join('\n'));
  console.log('[dry] Hook-Rang:', hookRank.map(h => `${h.ty}:${h.avg}`).join(' '));
  console.log('[dry] Momentum:', risers.map(r => `${r.tag}×${r.momentum.toFixed(2)}`).join(' ') || '—');
  console.log('[dry] Aktionen:\n' + actions.join('\n'));
  process.exit(0);
}
fs.writeFileSync(POOLS, sh);
fs.writeFileSync(STATUS, md);
fs.writeFileSync(KB, JSON.stringify(kb, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, 'automation', 'brain', 'pools.json'),
  JSON.stringify({ updated: todayISO, tagsets: sets, caps, top_tags: poolSource.slice(0, 8).map(r => r.tag),
    hook_rank: hookRank, kpi_last: last, risers: risers.map(r => r.tag) }, null, 2) + '\n');
console.log(`🧠 Gehirn v2 fertig. Reports: ${sig.reports_ingested.length} (neu: ${newlyIngested}). Pools ${poolsChanged ? 'AKTUALISIERT' : 'unveraendert'}.`);
console.log('   Top-Tags:', poolSource.slice(0, 6).map(r => r.tag).join(' '));
console.log('   Hook-Rang:', hookRank.map(h => `${h.ty}(${h.avg})`).join(' '));
console.log('   Aktionen:', actions.length, '→ automation/brain/BRAIN.md');
