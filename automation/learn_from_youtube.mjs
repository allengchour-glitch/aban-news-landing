#!/usr/bin/env node
/* Wissenssammler — learn_from_youtube.mjs  (24/7-Lern-Schleife aus YouTube → geteilte Memory)
 *
 * ROLLE: Claude als Wissenssammler. Dieses Tool zieht periodisch (GitHub-Action-Cron) echte
 * YouTube-Daten zu den Projekt-Themen, destilliert daraus Hooks / Trend-Hashtags / Keywords und
 * schreibt einen DATIERTEN Digest nach `automation/youtube-learnings.md` — die geteilte Memory,
 * die jede andere Session liest. Zusätzlich für LuxeStyle-Reels einen Hashtag-Pool
 * `automation/learned_youtube_pools.sh` (analog learn_from_analytics.mjs).
 *
 * EHRLICH / MARKENREGEL: Es werden NUR echte API-Daten genutzt (View-Zahlen, Titel, Tags). Keine
 * erfundenen Fakten. Ohne API-Key sauberer No-Op (kein Fehler). Keine Secrets im Repo.
 *
 * TOKEN: YT_API_KEY (oder YOUTUBE_API_KEY) — YouTube Data API v3 Key. In GitHub als Repo-Secret.
 *   Holen: console.cloud.google.com → APIs → „YouTube Data API v3" aktivieren → Anmeldedaten → API-Schlüssel.
 *
 * KEIN echtes 24/7 in einer Session möglich → „24/7" = der Cron in .github/workflows/youtube-learn.yml
 * (läuft ohne Session periodisch). Hier nur ein Lauf pro Aufruf.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const DIGEST = path.join(ROOT, 'automation', 'youtube-learnings.md');
const POOLS = path.join(ROOT, 'automation', 'learned_youtube_pools.sh');

const KEY = process.env.YT_API_KEY || process.env.YOUTUBE_API_KEY || '';
if (!KEY) { console.log('Kein YT_API_KEY/YOUTUBE_API_KEY → No-Op (Wissenssammler wartet auf Key).'); process.exit(0); }

// Themen decken alle Workstreams ab (User: „alles"). pool=true → fließt in den Reel-Hashtag-Pool.
const TOPICS = [
  { key: 'mode',    label: 'LuxeStyle Mode/Reels-Trends', q: 'sommer mode outfit reel 2026', pool: true,  region: 'CH', lang: 'de' },
  { key: 'fashion', label: 'Fashion Hooks (DACH)',        q: 'ootd fashion haul deutsch',     pool: true,  region: 'DE', lang: 'de' },
  { key: 'dropship',label: 'Dropshipping/Shopify-Strategie', q: 'dropshipping shopify conversion 2026', pool: false, region: 'DE', lang: 'de' },
  { key: 'kinews',  label: 'KI-News/Tools (aban-news)',   q: 'KI tools 2026 deutsch',         pool: false, region: 'DE', lang: 'de' },
];

const STOP = new Set(['und','der','die','das','mit','für','von','ich','dein','the','for','and','you','your','this','how','best','top','2024','2025','2026','review','deutsch','german']);

async function api(endpoint, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  for (const [k, v] of Object.entries({ ...params, key: KEY })) url.searchParams.set(k, v);
  const r = await fetch(url);
  if (!r.ok) { const t = await r.text(); throw new Error(`${endpoint} HTTP ${r.status}: ${t.slice(0, 160)}`); }
  return r.json();
}

function publishedAfterISO(days) {
  // Date.now() ist im Workflow-Node ok (hier kein Determinismus-Zwang); robust ohne Args.
  return new Date(Date.now() - days * 864e5).toISOString();
}

function extractHashtags(text) {
  return (String(text).match(/#[A-Za-z0-9_äöüÄÖÜ]{2,30}/g) || []).map(h => h.toLowerCase());
}
function extractKeywords(text) {
  return (String(text).toLowerCase().match(/[a-zA-ZäöüÄÖÜß]{4,}/g) || []).filter(w => !STOP.has(w));
}

async function learnTopic(t) {
  // 1) Top-Videos nach Views, letzte 45 Tage
  const search = await api('search', {
    part: 'snippet', type: 'video', q: t.q, order: 'viewCount',
    publishedAfter: publishedAfterISO(45), maxResults: '12',
    regionCode: t.region, relevanceLanguage: t.lang,
  });
  const ids = (search.items || []).map(i => i.id?.videoId).filter(Boolean);
  if (!ids.length) return { ...t, hooks: [], hashtags: [], keywords: [], n: 0 };
  // 2) Statistik + volle Beschreibung
  const vids = await api('videos', { part: 'snippet,statistics', id: ids.join(',') });
  const items = (vids.items || []).map(v => ({
    title: v.snippet?.title || '', desc: v.snippet?.description || '',
    tags: v.snippet?.tags || [], views: parseInt(v.statistics?.viewCount || '0', 10),
  })).sort((a, b) => b.views - a.views);

  const hooks = items.slice(0, 6).map(v => ({ title: v.title.replace(/\s+/g, ' ').trim().slice(0, 90), views: v.views }));
  const tagFreq = {}, kwFreq = {};
  for (const v of items) {
    for (const h of new Set([...extractHashtags(v.title + ' ' + v.desc), ...((v.tags || []).map(x => '#' + x.toLowerCase().replace(/[^a-z0-9äöü]/g, '')))])) {
      if (h.length > 2) tagFreq[h] = (tagFreq[h] || 0) + 1;
    }
    for (const w of new Set(extractKeywords(v.title))) kwFreq[w] = (kwFreq[w] || 0) + 1;
  }
  const hashtags = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k);
  const keywords = Object.entries(kwFreq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k);
  return { ...t, hooks, hashtags, keywords, n: items.length };
}

const today = new Date().toISOString().slice(0, 10);
const results = [];
for (const t of TOPICS) {
  try { results.push(await learnTopic(t)); }
  catch (e) { console.log(`⚠️  ${t.key}: ${e.message}`); results.push({ ...t, hooks: [], hashtags: [], keywords: [], n: 0, err: e.message }); }
  await new Promise(r => setTimeout(r, 400));
}

if (!results.some(r => r.n > 0)) { console.log('Keine YouTube-Daten erhalten (Quota/Key?) → No-Op, Digest unverändert.'); process.exit(0); }

// --- Digest-Block bauen (datiert, neuer Eintrag kommt oben dazu) ---
let block = `## 📅 ${today} — YouTube-Lernlauf\n\n`;
for (const r of results) {
  block += `### ${r.label}  \n_Suche: \`${r.q}\` · ${r.n} Top-Videos (nach Views, 45 T)_\n\n`;
  if (r.err) { block += `> ⚠️ Fehler: ${r.err}\n\n`; continue; }
  if (r.hooks.length) { block += `**Stärkste Hooks (Titel · Views):**\n` + r.hooks.map(h => `- ${h.title} · ${h.views.toLocaleString('de-CH')}`).join('\n') + '\n\n'; }
  if (r.hashtags.length) block += `**Trend-Hashtags:** ${r.hashtags.join(' ')}\n\n`;
  if (r.keywords.length) block += `**Keywords:** ${r.keywords.join(', ')}\n\n`;
}
block += `> Quelle: YouTube Data API v3 (echte Daten). Hooks sind fremde Titel = **Inspiration, nicht kopieren** ([Redaktion: prüfen]).\n\n---\n\n`;

const HEAD = `# 📺 YouTube-Learnings — geteilte Memory (auto-generiert)\n\n` +
  `> Auto-Befüllt von \`automation/learn_from_youtube.mjs\` (Cron \`youtube-learn.yml\`). **Nicht manuell editieren** —\n` +
  `> jede Session liest hier die jüngsten Trend-Hooks/Hashtags/Keywords. Neueste Läufe oben. Nur echte API-Daten.\n\n`;

let prev = '';
try { prev = fs.readFileSync(DIGEST, 'utf8').replace(/^#[^\n]*\n(>[^\n]*\n)*\n*/, ''); } catch { /* erste Anlage */ }
// auf die letzten ~12 Läufe begrenzen (Datei schlank halten)
const blocks = (block + prev).split(/\n---\n\n/).filter(b => b.trim()).slice(0, 12);
fs.writeFileSync(DIGEST, HEAD + blocks.join('\n---\n\n') + '\n---\n\n');
console.log(`✅ ${path.relative(ROOT, DIGEST)} aktualisiert (${results.filter(r => r.n > 0).length} Themen mit Daten).`);

// --- Reel-Hashtag-Pool aus den pool=true-Themen (analog learned_pools.sh) ---
const BRAND = ['#luxestyle', '#luxestylech'], REACH = ['#fyp', '#foryou'];
const poolTags = [...new Set(results.filter(r => r.pool).flatMap(r => r.hashtags))]
  .filter(t => !BRAND.includes(t) && !REACH.includes(t)).slice(0, 9);
if (poolTags.length >= 3) {
  const sets = [];
  for (let s = 0; s < 3; s++) {
    const perf = [poolTags[(s * 3) % poolTags.length], poolTags[(s * 3 + 1) % poolTags.length], poolTags[(s * 3 + 2) % poolTags.length]];
    sets.push([...new Set([...perf, REACH[s % REACH.length], BRAND[s % BRAND.length]])].join(' '));
  }
  const esc = s => s.replace(/"/g, '\\"');
  fs.writeFileSync(POOLS, `#!/usr/bin/env bash\n# AUTO-GENERIERT von automation/learn_from_youtube.mjs (${today}) — NICHT manuell editieren.\n# YouTube-Trend-Hashtags; auto_render.sh kann diese Datei zusätzlich sourcen.\nYT_TAGSETS=(\n  "${esc(sets[0])}"\n  "${esc(sets[1])}"\n  "${esc(sets[2])}"\n)\n`);
  console.log(`✅ ${path.relative(ROOT, POOLS)} — Top-Tags: ${poolTags.slice(0, 6).join(' ')}`);
}
