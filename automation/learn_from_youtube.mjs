#!/usr/bin/env node
/* Wissenssammler — learn_from_youtube.mjs  (Lern-Schleife aus YouTube → geteilte Memory)
 *
 * ROLLE: Claude als Wissenssammler. Zieht echte YouTube-Daten zu den Projekt-Themen, destilliert
 * Hooks / Trend-Hashtags / Keywords und schreibt einen DATIERTEN Digest nach
 * `automation/youtube-learnings.md` — die geteilte Memory, die jede andere Session liest.
 * Zusätzlich Reel-Hashtag-Pool `automation/learned_youtube_pools.sh`.
 *
 * ZWEI MODI (env YT_MODE):
 *   - normal   (Default): 1 Query/Thema, maxResults 12, ruhiger Dauerlauf (Cron alle 2 h).
 *   - hardcore: stündlich, rotierende Query aus dem großen Pool/Thema, maxResults 25 — INTENSIVES
 *     Sammeln. Selbst-limitiert auf die ERSTEN 24 h ab dem 1. erfolgreichen Lauf (Marker-Datei
 *     `automation/.yt_hardcore_until`). Danach macht hardcore No-Op; normal pausiert, solange das
 *     Hardcore-Fenster aktiv ist (kein Quota-Konflikt).
 *
 * EHRLICH: nur echte API-Daten, keine erfundenen Fakten. Ohne Key sauberer No-Op. Keine Secrets im Repo.
 * TOKEN: YT_API_KEY (oder YOUTUBE_API_KEY) — YouTube Data API v3.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const DIGEST = path.join(ROOT, 'automation', 'youtube-learnings.md');
const POOLS = path.join(ROOT, 'automation', 'learned_youtube_pools.sh');
const MARKER = path.join(ROOT, 'automation', '.yt_hardcore_until');

const KEY = process.env.YT_API_KEY || process.env.YOUTUBE_API_KEY || '';
if (!KEY) { console.log('Kein YT_API_KEY/YOUTUBE_API_KEY → No-Op (Wissenssammler wartet auf Key).'); process.exit(0); }

const MODE = (process.env.YT_MODE || 'normal').toLowerCase() === 'hardcore' ? 'hardcore' : 'normal';
const HARDCORE_HOURS = 24;

// Themen mit großem Query-Pool (User: „alles" + „hardcore"). pool=true → fließt in Reel-Hashtag-Pool.
// project: 'luxestyle' (Shop) | 'abannews' (KI-Newsletter/Tools/GEO). pool=true → Reel-Hashtag-Pool (nur Shop).
const THEMES = [
  // ── LuxeStyle (Shop) ──
  { key: 'mode', project: 'luxestyle', label: '[LuxeStyle] Mode/Reels-Trends', pool: true, region: 'CH', lang: 'de', queries: [
    'sommer mode outfit reel 2026', 'sommerkleid styling damen', 'beach outfit lookbook', 'mode trend sommer 2026',
    'ootd reel sommer', 'leichte sommerkleider haul', 'strand accessoires mode', 'boho kleid styling'] },
  { key: 'fashion', project: 'luxestyle', label: '[LuxeStyle] Fashion Hooks (DACH)', pool: true, region: 'DE', lang: 'de', queries: [
    'ootd fashion haul deutsch', 'modetrends 2026 frauen', 'capsule wardrobe sommer', 'fashion reel hooks',
    'outfit inspiration deutsch', 'try on haul sommer', 'styling tipps damen', 'günstige mode finds'] },
  { key: 'dropship', project: 'luxestyle', label: '[LuxeStyle] Dropshipping/Shopify-Strategie', pool: false, region: 'DE', lang: 'de', queries: [
    'dropshipping shopify conversion 2026', 'shopify store optimieren umsatz', 'tiktok ads dropshipping strategie',
    'shopify conversion rate tipps', 'dropshipping winning products 2026', 'meta ads ecommerce 2026',
    'shopify seo deutsch', 'ugc content ecommerce'] },
  // ── aban-news (KI-Newsletter / Tools / GEO) ──
  { key: 'kitools', project: 'abannews', label: '[abannews] KI-Tools & Reviews', pool: false, region: 'DE', lang: 'de', queries: [
    'künstliche intelligenz tools deutsch', 'beste KI software unternehmen', 'KI automatisierung mittelstand', 'neue KI tools test deutsch',
    'chatgpt claude vergleich deutsch', 'KI marketing werkzeuge', 'KI tools selbstständige', 'KI produktivität deutsch'] },
  { key: 'kinews', project: 'abannews', label: '[abannews] KI-News & Trends', pool: false, region: 'DE', lang: 'de', queries: [
    'künstliche intelligenz news deutsch', 'openai google update deutsch', 'KI wochenrückblick deutsch', 'neue KI modelle erklärt',
    'künstliche intelligenz unternehmen', 'KI regulierung eu act', 'KI agenten erklärt deutsch', 'künstliche intelligenz business'] },
  { key: 'geo', project: 'abannews', label: '[abannews] GEO/AI-Sichtbarkeit & SEO', pool: false, region: 'DE', lang: 'de', queries: [
    'generative engine optimization', 'AI overviews seo strategie', 'in chatgpt gefunden werden', 'answer engine optimization',
    'seo 2026 ki', 'perplexity sichtbarkeit', 'programmatic seo deutsch', 'zero click search strategie'] },
  { key: 'newsletter', project: 'abannews', label: '[abannews] Newsletter/Creator-Wachstum', pool: false, region: 'DE', lang: 'de', queries: [
    'newsletter wachstum strategie', 'beehiiv tipps deutsch', 'lead magnet ideen', 'newsletter monetarisieren',
    'linkedin reichweite aufbauen', 'content creator einkommen', 'affiliate marketing deutsch', 'digitale produkte verkaufen'] },
  // ── mehr: LuxeStyle (Shop) ──
  { key: 'schmuck', project: 'luxestyle', label: '[LuxeStyle] Schmuck & Accessoires', pool: true, region: 'CH', lang: 'de', queries: [
    'schmuck trend 2026', 'ketten ohrringe styling', 'sonnenbrillen trend sommer', 'accessoires outfit damen',
    'gold schmuck kombinieren', 'armband layering', 'statement schmuck', 'geschenkidee schmuck'] },
  { key: 'tiktokshop', project: 'luxestyle', label: '[LuxeStyle] TikTok-Shop/Viral-Produkte', pool: true, region: 'DE', lang: 'de', queries: [
    'tiktok made me buy it mode', 'viral fashion finds 2026', 'amazon mode favoriten', 'tiktok shop haul deutsch',
    'sommer must haves 2026', 'trend produkte mode', 'aliexpress fashion finds', 'günstige trend teile'] },
  // ── mehr: aban-news (KI-Geld/Berufe) ──
  { key: 'kiberufe', project: 'abannews', label: '[abannews] KI für Berufe/Branchen', pool: false, region: 'DE', lang: 'de', queries: [
    'KI für selbstständige', 'KI im handwerk', 'KI für steuerberater', 'KI für ärzte praxis',
    'KI für anwälte kanzlei', 'KI für immobilienmakler', 'KI für coaches', 'KI für kleine unternehmen'] },
  { key: 'kigeld', project: 'abannews', label: '[abannews] Online Geld verdienen (KI)', pool: false, region: 'DE', lang: 'de', queries: [
    'mit KI geld verdienen 2026', 'passives einkommen online deutsch', 'nebeneinkommen ideen 2026', 'online business starten deutsch',
    'mit ki automatisieren geld', 'faceless content geld', 'print on demand deutsch', 'dropshipping deutschland 2026'] },
];

const STOP = new Set(['und','der','die','das','mit','für','von','ich','dein','the','for','and','you','your','this','how','best','top','2024','2025','2026','review','deutsch','german','neue','beste']);

async function api(endpoint, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  for (const [k, v] of Object.entries({ ...params, key: KEY })) url.searchParams.set(k, v);
  const r = await fetch(url);
  if (!r.ok) { const t = await r.text(); throw new Error(`${endpoint} HTTP ${r.status}: ${t.slice(0, 160)}`); }
  return r.json();
}
const publishedAfterISO = days => new Date(Date.now() - days * 864e5).toISOString();
const extractHashtags = text => (String(text).match(/#[A-Za-z0-9_äöüÄÖÜ]{2,30}/g) || []).map(h => h.toLowerCase());
const extractKeywords = text => (String(text).toLowerCase().match(/[a-zA-ZäöüÄÖÜß]{4,}/g) || []).filter(w => !STOP.has(w));

// --- Hardcore-Fenster-Logik (Marker = ISO-Zeit, bis wann hardcore aktiv ist) ---
function readMarker() { try { return new Date(fs.readFileSync(MARKER, 'utf8').trim()); } catch { return null; } }
const now = new Date();
const marker = readMarker();
const windowActive = marker && now < marker;

// Hardcore (optional, nur GitHub-Zwei-Workflow-Aufbau) limitiert sich selbst auf 24 h.
// Auf GitLab läuft NUR der Normal-Modus (ein Job) → KEINE Selbst-Pause (sonst 24 h Stillstand).
if (MODE === 'hardcore' && marker && !windowActive) {
  console.log(`Hardcore-Fenster beendet (bis ${marker.toISOString()}) → No-Op.`);
  process.exit(0);
}

// --- Query- & Themen-Auswahl je Lauf ---
// Hardcore läuft alle 15 Min: pro Lauf nur EIN Thema (rotierend) → alle 4 einmal/Stunde,
// ~9.600 API-Einheiten/Tag (im 10.000-Limit). Normal (alle 2 h): alle Themen.
const slot = Math.floor(Date.now() / (15 * 60e3)); // fortlaufender 15-Min-Slot
const day = Math.floor(Date.now() / 864e5);
function pickQuery(theme) {
  const i = MODE === 'hardcore' ? (Math.floor(slot / THEMES.length) % theme.queries.length) : (day % theme.queries.length);
  return theme.queries[i];
}
const MAXRES = MODE === 'hardcore' ? '25' : '12';
const THEMES_THIS_RUN = MODE === 'hardcore' ? [THEMES[slot % THEMES.length]] : THEMES;

async function learnTheme(t) {
  const q = pickQuery(t);
  const search = await api('search', {
    part: 'snippet', type: 'video', q, order: 'viewCount',
    publishedAfter: publishedAfterISO(45), maxResults: MAXRES, regionCode: t.region, relevanceLanguage: t.lang,
  });
  const ids = (search.items || []).map(i => i.id?.videoId).filter(Boolean);
  if (!ids.length) return { ...t, q, hooks: [], hashtags: [], keywords: [], n: 0 };
  const vids = await api('videos', { part: 'snippet,statistics', id: ids.join(',') });
  const items = (vids.items || []).map(v => ({
    title: v.snippet?.title || '', desc: v.snippet?.description || '',
    tags: v.snippet?.tags || [], views: parseInt(v.statistics?.viewCount || '0', 10),
  })).sort((a, b) => b.views - a.views);
  const hooks = items.slice(0, 6).map(v => ({ title: v.title.replace(/\s+/g, ' ').trim().slice(0, 90), views: v.views }));
  const tagFreq = {}, kwFreq = {};
  for (const v of items) {
    for (const h of new Set([...extractHashtags(v.title + ' ' + v.desc), ...((v.tags || []).map(x => '#' + x.toLowerCase().replace(/[^a-z0-9äöü]/g, '')))]))
      if (h.length > 2) tagFreq[h] = (tagFreq[h] || 0) + 1;
    for (const w of new Set(extractKeywords(v.title))) kwFreq[w] = (kwFreq[w] || 0) + 1;
  }
  const hashtags = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k);
  const keywords = Object.entries(kwFreq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k);
  return { ...t, q, hooks, hashtags, keywords, n: items.length };
}

const today = now.toISOString().slice(0, 10);
const results = [];
for (const t of THEMES_THIS_RUN) {
  try { results.push(await learnTheme(t)); }
  catch (e) { console.log(`⚠️  ${t.key}: ${e.message}`); results.push({ ...t, q: '', hooks: [], hashtags: [], keywords: [], n: 0, err: e.message }); }
  await new Promise(r => setTimeout(r, 400));
}

if (!results.some(r => r.n > 0)) { console.log('Keine YouTube-Daten erhalten (Quota/Key?) → No-Op, Digest unverändert.'); process.exit(0); }

// Marker setzen beim 1. erfolgreichen Lauf (startet das 24-h-Hardcore-Fenster).
if (!marker) {
  const until = new Date(Date.now() + HARDCORE_HOURS * 3600e3);
  fs.writeFileSync(MARKER, until.toISOString() + '\n');
  console.log(`🔥 Hardcore-Fenster gestartet bis ${until.toISOString()} (erste 24 h intensiv).`);
}

// --- Digest-Block (datiert, neuester oben) ---
const tag = MODE === 'hardcore' ? '🔥 HARDCORE' : 'normal';
let block = `## 📅 ${today} ${now.toISOString().slice(11, 16)} UTC — YouTube-Lernlauf (${tag})\n\n`;
for (const r of results) {
  block += `### ${r.label}  \n_Suche: \`${r.q}\` · ${r.n} Top-Videos (Views, 45 T)_\n\n`;
  if (r.err) { block += `> ⚠️ ${r.err}\n\n`; continue; }
  if (r.hooks.length) block += `**Hooks (Titel · Views):**\n` + r.hooks.map(h => `- ${h.title} · ${h.views.toLocaleString('de-CH')}`).join('\n') + '\n\n';
  if (r.hashtags.length) block += `**Trend-Hashtags:** ${r.hashtags.join(' ')}\n\n`;
  if (r.keywords.length) block += `**Keywords:** ${r.keywords.join(', ')}\n\n`;
}
block += `> Quelle: YouTube Data API v3 (echte Daten). Hooks = fremde Titel → **Inspiration, nicht kopieren** ([Redaktion: prüfen]).\n\n---\n\n`;

const HEAD = `# 📺 YouTube-Learnings — geteilte Memory (auto-generiert)\n\n` +
  `> Auto-Befüllt von \`automation/learn_from_youtube.mjs\` (Cron \`youtube-learn.yml\` alle 2 h + \`youtube-learn-hardcore.yml\`\n` +
  `> alle 15 Min in den ersten 24 h). **Nicht manuell editieren** — jede Session liest hier die jüngsten Trends. Neueste oben.\n\n`;

let prev = '';
try { prev = fs.readFileSync(DIGEST, 'utf8').replace(/^#[^\n]*\n(>[^\n]*\n)*\n*/, ''); } catch {}
// im Hardcore-Fenster mehr Historie halten (24 h × 4/h ≈ 96 Läufe), sonst 12
const keep = windowActive || MODE === 'hardcore' ? 100 : 12;
const blocks = (block + prev).split(/\n---\n\n/).filter(b => b.trim()).slice(0, keep);
fs.writeFileSync(DIGEST, HEAD + blocks.join('\n---\n\n') + '\n---\n\n');
console.log(`✅ ${path.relative(ROOT, DIGEST)} aktualisiert [${tag}] (${results.filter(r => r.n > 0).length} Themen mit Daten).`);

// --- Reel-Hashtag-Pool aus pool=true-Themen ---
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
  fs.writeFileSync(POOLS, `#!/usr/bin/env bash\n# AUTO-GENERIERT von automation/learn_from_youtube.mjs (${today}, ${tag}) — NICHT manuell editieren.\n# YouTube-Trend-Hashtags; auto_render.sh kann diese Datei zusätzlich sourcen.\nYT_TAGSETS=(\n  "${esc(sets[0])}"\n  "${esc(sets[1])}"\n  "${esc(sets[2])}"\n)\n`);
  console.log(`✅ ${path.relative(ROOT, POOLS)} — Top-Tags: ${poolTags.slice(0, 6).join(' ')}`);
}
