#!/usr/bin/env node
/* LuxeStyle — brain.mjs  (das selbstlernende „Gehirn" — wird mit jedem Lauf nur besser)
 *
 * Idee: Eine Lernschleife, die NICHT nur den letzten Report ansieht, sondern ALLE historischen
 * TikTok-Reports kumulativ in ein persistentes Gedaechtnis (knowledge.json) schreibt und daraus
 * die besten Hashtags/Hooks ableitet. RATSCHE gegen Rueckschritt:
 *   · bewiesene Verlierer (rules.blocked_hashtags) erscheinen NIE im Output,
 *   · kuratierte Gewinner (rules.curated_discovery / winner_hooks) bleiben immer erhalten,
 *   · Daten REIHEN/ergaenzen nur, koennen Gewinner aber nicht loeschen,
 *   · Entscheidungen werden append-only protokolliert (Audit-Trail).
 * => mehr Daten = bessere Pools, ohne je auf bekannte Sackgassen zurueckzufallen.
 *
 * Lauf:  node automation/brain/brain.mjs            (ingest + Pools + BRAIN.md schreiben)
 *        node automation/brain/brain.mjs --dry      (nur zeigen, nichts schreiben)
 * No-op-safe: ohne Reports passiert nichts. Idempotent: gleiche Daten -> gleicher Output.
 *
 * Schreibt:  automation/learned_pools.sh  (TAGSETS+CAPS, von auto_render.sh gesourct)
 *            automation/brain/BRAIN.md     (Status + automatisch abgeleitete naechste Aktionen)
 *            automation/brain/knowledge.json (aktualisiertes Gedaechtnis)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const REPORTS = path.join(ROOT, 'reports');
const KB = path.join(ROOT, 'automation', 'brain', 'knowledge.json');
const POOLS = path.join(ROOT, 'automation', 'learned_pools.sh');
const STATUS = path.join(ROOT, 'automation', 'brain', 'BRAIN.md');
const DRY = process.argv.includes('--dry');
const norm = t => '#' + String(t).replace(/^#/, '').toLowerCase();

// ---- Gedaechtnis laden -----------------------------------------------------
let kb;
try { kb = JSON.parse(fs.readFileSync(KB, 'utf8')); }
catch (e) { console.error('knowledge.json nicht lesbar → Abbruch:', e.message); process.exit(1); }
kb.signals = kb.signals || { hashtags: {}, reports_ingested: [] };
kb.signals.hashtags = kb.signals.hashtags || {};
kb.signals.reports_ingested = kb.signals.reports_ingested || [];
const blocked = new Set((kb.rules.blocked_hashtags || []).map(norm));

// ---- Alle Reports kumulativ einlesen (idempotent ueber reports_ingested) ----
let reportFiles = [];
try { reportFiles = fs.readdirSync(REPORTS).filter(f => /^tiktok_.*\.json$/.test(f)).sort(); } catch {}
if (!reportFiles.length) { console.log('Keine reports/tiktok_*.json → No-op (Gehirn wartet auf erste Analyse).'); process.exit(0); }

let latest = null, newlyIngested = 0;
for (const f of reportFiles) {
  let rep;
  try { rep = (JSON.parse(fs.readFileSync(path.join(REPORTS, f), 'utf8')).report) || {}; } catch { continue; }
  latest = { file: f, rep };
  if (kb.signals.reports_ingested.includes(f)) continue;       // schon gelernt → nicht doppelt zaehlen
  for (const h of (rep.hashtags_ranked || [])) {
    const t = norm(h.tag); if (!t || t === '#') continue;
    const uses = Number(h.uses) || 1, v = Number(h.avg_views) || 0, e = Number(h.avg_engagement) || 0;
    const s = kb.signals.hashtags[t] || { uses_total: 0, views_wsum: 0, eng_wsum: 0 };
    s.uses_total += uses; s.views_wsum += v * uses; s.eng_wsum += e * uses;
    kb.signals.hashtags[t] = s;
  }
  kb.signals.reports_ingested.push(f);
  newlyIngested++;
}

// ---- Daten-Ranking (kumulativ, Verlierer raus, KONFIDENZ: nur robuste Signale) ----
// Einmal-Tags (z.B. 8 Aesthetik-Tags eines einzigen viralen Videos) sind Rauschen → min. Nutzungen
// verlangen, damit das Gehirn nur stabile Performer lernt und nicht auf One-Hit-Wonder reagiert.
const MIN_USES = 3;
const rankedAll = Object.entries(kb.signals.hashtags)
  .map(([t, s]) => ({ tag: t, avg_views: s.views_wsum / Math.max(1, s.uses_total), uses: s.uses_total }))
  .filter(r => !blocked.has(r.tag) && r.avg_views > 0)
  .sort((a, b) => b.avg_views - a.avg_views);
const ranked = rankedAll.filter(r => r.uses >= MIN_USES);

const reach = (kb.rules.reach || ['#fyp', '#foryou']).map(norm);
const discovery = (kb.rules.curated_discovery || []).map(norm);
// Top robuste Daten-Performer (min. Nutzungen) aus lokal/nische; Fallback auf rankedAll, falls zu duenn.
const robust = (ranked.length >= 4 ? ranked : rankedAll);
const dataTop = robust.map(r => r.tag).filter(t => !reach.includes(t) && !discovery.includes(t)).slice(0, 8);

// ---- TAGSETS bauen: 1 Reach + 2 Discovery + 2 Daten-Performer (rotierend) ----
const pick = (arr, i, n) => Array.from({ length: n }, (_, k) => arr[(i + k) % arr.length]).filter(Boolean);
const sets = [];
for (let i = 0; i < 4; i++) {
  const set = [...new Set([
    reach[i % reach.length],
    ...pick(discovery, (i * 2) % Math.max(1, discovery.length), 2),
    ...pick(dataTop, (i * 2) % Math.max(1, dataTop.length), 2),
  ])].filter(Boolean);
  sets.push(set.join(' '));
}

// ---- learned_pools.sh schreiben (TAGSETS aus Daten+Kuratiert, CAPS aus Gewinnern) ----
const caps = kb.rules.winner_hooks || [];
const sh = `#!/usr/bin/env bash
# AUTO-GENERIERT von automation/brain/brain.mjs — NICHT manuell editieren (Aenderungen in knowledge.json).
# Gehirn-Stand: ${reportFiles.length} Report(s) kumulativ gelernt, Verlierer geblockt (${[...blocked].join(' ') || '—'}).
# TAGSETS = 1 Reach + 2 Discovery (kuratiert) + 2 Daten-Top-Performer. CAPS = Gewinner-Hooks (Problem/Preis-Kontrast).
TAGSETS=(
${sets.map(s => '  "' + s.replace(/"/g, '\\"') + '"').join('\n')}
)
CAPS=(
${caps.map(c => '  "' + c.replace(/"/g, '\\"') + '"').join('\n')}
)
`;

// ---- Gap-Analyse aus dem neuesten Report → automatische naechste Aktionen ----
const rep = latest.rep, tot = rep.totals || {}, avg = rep.averages || {};
const hours = rep.hour_utc_post_counts || {};
const primetime = kb.rules.posting?.ch_primetime_utc || [16, 17, 18, 19];
const ptPosts = primetime.reduce((n, h) => n + (Number(hours[h] || hours[String(h)] || 0)), 0);
const actions = [];
if ((Number(tot.shares) || 0) === 0) actions.push('🔴 0 Shares im Account = Reichweiten-Decke. Share/Save-Trigger in JEDE Caption (ist in CAPS) + Vergleichs-/Problem-Hooks pushen.');
if (ptPosts === 0) actions.push('🟡 Kein Post in CH-Primetime (16–19 UTC = 18–21 CH). Posting-Zeit dorthin verschieben (Cloudflare-Cron steht schon auf 16/19).');
if ((Number(avg.engagement_rate || avg.avg_engagement) || 0) < 0.02) actions.push('🟡 Engagement <2% auf Reichweiten-Videos → Frage-CTA + „1/2/3?" konsequent (in CAPS), UGC/Demo statt reiner Produkt-Pans.');
if ((Number(avg.duration_s || avg.avg_duration) || 0) > 20) actions.push('🟢 Videolaenge >20s → auf ~10–15s kuerzen (hoehere Completion).');
actions.push('🟢 Naechster großer Hebel (manuell/PC-Claude): echte Hands-on/UGC-Clips + Trending-Sounds auf -clean.mp4.');

const todayISO = new Date().toISOString().slice(0, 10);
const md = `# 🧠 BRAIN — LuxeStyle Social-Lernschleife (auto-generiert)

_Aktualisiert: ${todayISO} · Reports kumulativ gelernt: ${reportFiles.length} (${kb.signals.reports_ingested.length} im Gedaechtnis)_

## Aktuelle beste Hashtag-Saetze (Daten + kuratiert, Verlierer geblockt)
${sets.map((s, i) => `${i + 1}. ${s}`).join('\n')}

**Geblockt (Sackgasse, nie im Output):** ${[...blocked].join(' ') || '—'}
**Daten-Top-Performer (kumulativ Ø-Views):** ${ranked.slice(0, 6).map(r => `${r.tag} (${Math.round(r.avg_views)})`).join(' · ') || '—'}

## Letzter Stand (neuester Report ${latest.file})
- Videos: ${rep.video_count ?? '—'} · Views: ${tot.views ?? '—'} · Likes: ${tot.likes ?? '—'} · Shares: ${tot.shares ?? '—'} · Kommentare: ${tot.comments ?? '—'}
- Posts in CH-Primetime (16–19 UTC): ${ptPosts}

## 🎯 Automatisch abgeleitete naechste Aktionen
${actions.map(a => `- ${a}`).join('\n')}

## Gewinner-Formate (Prioritaet)
${(kb.rules.format_priority || []).map(f => `- ${f}`).join('\n')}

## Verlierer-Formate (vermeiden)
${(kb.rules.loser_formats || []).map(f => `- ${f}`).join('\n')}

## Entscheidungs-Log (Ratsche, append-only)
${kb.decisions.map(d => `- ${d.date}: ${d.change} _(${d.evidence})_`).join('\n')}
`;

// ---- Schreiben (idempotent: nur wenn geaendert) -----------------------------
const prevPools = fs.existsSync(POOLS) ? fs.readFileSync(POOLS, 'utf8') : '';
const poolsChanged = prevPools !== sh;
if (poolsChanged && newlyIngested > 0) {
  kb.decisions.push({ date: todayISO, change: `Pools aus ${reportFiles.length} Reports neu abgeleitet.`, evidence: `Top: ${ranked.slice(0, 5).map(r => r.tag).join(' ')}` });
}
kb.updated = todayISO;

if (DRY) {
  console.log('[dry] TAGSETS:\n' + sets.join('\n'));
  console.log('[dry] Aktionen:\n' + actions.join('\n'));
  console.log(`[dry] poolsChanged=${poolsChanged} newlyIngested=${newlyIngested}`);
  process.exit(0);
}
fs.writeFileSync(POOLS, sh);
fs.writeFileSync(STATUS, md);
fs.writeFileSync(KB, JSON.stringify(kb, null, 2) + '\n');
console.log(`🧠 Gehirn-Lauf fertig. Reports gelernt: ${reportFiles.length} (neu: ${newlyIngested}). Pools ${poolsChanged ? 'AKTUALISIERT' : 'unveraendert'}.`);
console.log('   Top-Tags:', ranked.slice(0, 6).map(r => r.tag).join(' '));
console.log('   Aktionen:', actions.length, '→ automation/brain/BRAIN.md');
