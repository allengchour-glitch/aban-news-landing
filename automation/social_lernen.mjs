#!/usr/bin/env node
/* social_lernen.mjs — die Lernschleife (Betreiber 22.09.2026: «pure automation mit verbesserung und
 * analyse und lernen mehrmals täglich»). Liest die Zahlen der letzten Instagram-Posts (Graph API,
 * nur lesend), ordnet jedem Post Hook und Thema zu (aus reels_seed.csv / posts_image.csv) und schreibt
 *   · social/_lernen.json   — Gewichte je Hook und Thema (Reichweite je Post, relativ zum Median)
 *   · dropship/SOCIAL-LERNEN.md — Bericht: beste/schwächste Posts, Themen, Hooks, Uhrzeiten
 * Der Reel-Motor liest die Gewichte (hookFuer) — so werden Hooks bevorzugt, die gemessen ziehen.
 * Metriken: reach, likes, comments, saved, shares (Reels: plays/views). Fehlt eine Metrik, zaehlt der Rest.
 * ENV: META_ACCESS_TOKEN (oder /tmp/meta_page_token) · IG_USER_ID (oder /tmp/meta_ig_id) · N=40
 */
import fs from 'node:fs';
const TOK = (process.env.META_ACCESS_TOKEN || (fs.existsSync('/tmp/meta_page_token') ? fs.readFileSync('/tmp/meta_page_token', 'utf8') : '')).trim();
const IG = (process.env.IG_USER_ID || (fs.existsSync('/tmp/meta_ig_id') ? fs.readFileSync('/tmp/meta_ig_id', 'utf8') : '')).trim();
const N = parseInt(process.env.N || '40', 10);
if (!TOK || !IG) { console.log('Kein Meta-Token/IG-ID → No-op.'); process.exit(0); }
const V = 'v21.0';
async function api(path, params = {}) {
  const u = new URL(`https://graph.facebook.com/${V}/${path}`); for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v); u.searchParams.set('access_token', TOK);
  for (let a = 0; a < 3; a++) { try { const r = await fetch(u); return await r.json(); } catch { await new Promise(r => setTimeout(r, 2000)); } }
  return {};
}
const media = (await api(`${IG}/media`, { fields: 'id,caption,media_type,media_product_type,timestamp,like_count,comments_count,permalink', limit: String(N) })).data || [];
if (!media.length) { console.log('Keine Posts gelesen (Token/Netz?) → nichts gelernt.'); process.exit(0); }
const posts = [];
for (const m of media) {
  const istReel = m.media_product_type === 'REELS' || m.media_type === 'VIDEO';
  const metriken = istReel ? 'reach,saved,shares,views' : 'reach,saved,shares';
  let ins = await api(`${m.id}/insights`, { metric: metriken });
  if (ins.error) ins = await api(`${m.id}/insights`, { metric: 'reach,saved' });
  const w = {}; for (const d of (ins.data || [])) w[d.name] = d.values?.[0]?.value ?? d.total_value?.value ?? 0;
  const reach = Number(w.reach || 0), likes = Number(m.like_count || 0), comments = Number(m.comments_count || 0), saved = Number(w.saved || 0), shares = Number(w.shares || 0), views = Number(w.views || 0);
  const score = reach + 3 * likes + 5 * comments + 5 * saved + 5 * shares + 0.2 * views;
  posts.push({ id: m.id, reel: istReel, ts: m.timestamp, caption: (m.caption || '').slice(0, 160), reach, likes, comments, saved, shares, views, score, url: m.permalink });
}
// Hook = erste Zeile der Caption, Thema aus Schluesselwoertern (gleiche Liste wie der Reel-Motor)
function thema(t) {
  const s = t.toLowerCase();
  if (/hund|katze|haustier/.test(s)) return 'haustier'; if (/fitness|yoga|training|faszien|sport/.test(s)) return 'fitness';
  if (/küche|mixer|kaffee|tee|grill/.test(s)) return 'kueche'; if (/kind|baby|spielzeug/.test(s)) return 'kinder';
  if (/lampe|licht|led|deko|vase|kerze|diffuser|aroma|kissen/.test(s)) return 'home';
  if (/beamer|projektor|kopfhörer|lautsprecher|lade|kabel|usb|bluetooth|smart|kamera|hülle/.test(s)) return 'gadget';
  if (/serum|gua|roller|creme|pflege|haar|nagel|wimper|makeup|massage|beauty/.test(s)) return 'beauty';
  if (/kette|ohrring|armreif|armband|ring|schmuck|uhr/.test(s)) return 'schmuck';
  if (/kleid|rock|bluse|hose|jacke|hoodie|shirt|sneaker|schuh|tasche|rucksack/.test(s)) return 'mode';
  return 'allgemein';
}
const scores = posts.map(p => p.score).sort((a, b) => a - b); const med = scores[Math.floor(scores.length / 2)] || 1;
const hooks = {}, themen = {}, stunden = {};
for (const p of posts) {
  const rel = med ? p.score / med : 1;
  const hook = p.caption.split('\n')[0].replace(/[«»"]/g, '').replace(/[👀✨🇨🇭🔗]/g, '').trim().slice(0, 60);
  if (hook) hooks[hook] = Math.round(((hooks[hook] || 0) + rel) * 100) / 100;
  const th = thema(p.caption); themen[th] = themen[th] || { n: 0, rel: 0 }; themen[th].n++; themen[th].rel += rel;
  const h = new Date(p.ts).getUTCHours(); stunden[h] = stunden[h] || { n: 0, rel: 0 }; stunden[h].n++; stunden[h].rel += rel;
}
const themenMittel = Object.fromEntries(Object.entries(themen).map(([k, v]) => [k, Math.round(v.rel / v.n * 100) / 100]));
fs.mkdirSync('social', { recursive: true });
fs.writeFileSync('social/_lernen.json', JSON.stringify({ stand: new Date().toISOString(), posts: posts.length, median_score: med, hooks, themen: themenMittel }, null, 2));
const top = [...posts].sort((a, b) => b.score - a.score);
const md = [`# Social-Lernen — Stand ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`, '',
  `Gelesen: ${posts.length} Instagram-Posts (${posts.filter(p => p.reel).length} Reels) · Score = Reichweite + 3·Likes + 5·Kommentare + 5·Speichern + 5·Teilen + 0,2·Views · Median ${Math.round(med)}`, '',
  '## Beste 5', ...top.slice(0, 5).map(p => `- ${Math.round(p.score)} · Reichweite ${p.reach} · ❤ ${p.likes} · 💬 ${p.comments} · 🔖 ${p.saved} · ${p.reel ? 'Reel' : 'Bild'} · ${p.caption.split('\n')[0].slice(0, 70)} · ${p.url}`), '',
  '## Schwächste 5', ...top.slice(-5).reverse().map(p => `- ${Math.round(p.score)} · Reichweite ${p.reach} · ${p.reel ? 'Reel' : 'Bild'} · ${p.caption.split('\n')[0].slice(0, 70)}`), '',
  '## Themen (relativ zum Median, 1.0 = Durchschnitt)', ...Object.entries(themenMittel).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v} (${themen[k].n} Posts)`), '',
  '## Uhrzeiten UTC (relativ)', ...Object.entries(stunden).sort((a, b) => b[1].rel / b[1].n - a[1].rel / a[1].n).map(([k, v]) => `- ${k}:00 → ${Math.round(v.rel / v.n * 100) / 100} (${v.n})`), '',
  'Der Reel-Motor bevorzugt Hooks mit hohem Gewicht (social/_lernen.json). Bilder/Reels ohne Hook-Zeile zaehlen unter ihrem ersten Satz.'].join('\n');
fs.writeFileSync('dropship/SOCIAL-LERNEN.md', md + '\n');
console.log(`Gelernt aus ${posts.length} Posts · Median ${Math.round(med)} · Themen: ${Object.entries(themenMittel).map(([k, v]) => k + ' ' + v).join(', ')}`);
