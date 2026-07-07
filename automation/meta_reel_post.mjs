#!/usr/bin/env node
/* meta_reel_post.mjs — postet das nächste fällige VIDEO aus automation/reels_seed.csv
 * als Instagram-REEL + Facebook-Seitenvideo (Meta Graph API). Threads: NIE (User 2026-07-07:
 * «threads nichts mehr posten erst wenn follower da sind»).
 *
 * QUALITÄTS-KADENZ (User: «poste weniger, aber besser»): max 1 Post pro Lauf und
 * MIN_GAP_H (Default 48h) Abstand zum letzten IG-Post aus dem Ledger → 3–4 Posts/Woche.
 * DOPPELPOST-SCHUTZ (GEHIRN 10): nur status=ready; nach Erfolg → status=posted-ig-fb.
 *
 * ENV: META_ACCESS_TOKEN (oder /tmp/meta_page_token) · IG_USER_ID (oder /tmp/meta_ig_id) ·
 *      FB_PAGE_ID (Default 1049840534888592) · [DRY=1] · [MIN_GAP_H=48]
 */
import fs from 'node:fs';
const CSV = 'automation/reels_seed.csv';
const V = 'v21.0';
const DRY = process.env.DRY === '1';
const MIN_GAP_H = parseFloat(process.env.MIN_GAP_H || '48');
const TOK = (process.env.META_ACCESS_TOKEN || (fs.existsSync('/tmp/meta_page_token') ? fs.readFileSync('/tmp/meta_page_token', 'utf8') : '')).trim();
const IG = (process.env.IG_USER_ID || (fs.existsSync('/tmp/meta_ig_id') ? fs.readFileSync('/tmp/meta_ig_id', 'utf8') : '')).trim();
const FB = (process.env.FB_PAGE_ID || '1049840534888592').trim();
if (!TOK || !IG) { console.error('Kein Token/IG-ID (META_ACCESS_TOKEN + IG_USER_ID oder /tmp/meta_page_token + /tmp/meta_ig_id).'); process.exit(1); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(path, params, method = 'POST') {
  const body = new URLSearchParams({ ...params, access_token: TOK });
  const r = await fetch(`https://graph.facebook.com/${V}/${path}${method === 'GET' ? '?' + body : ''}`,
    method === 'GET' ? {} : { method, body });
  return r.json();
}

// CSV robust parsen (Anführungszeichen mit Kommas)
function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const esc = s => /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;

const rows = parseCsv(fs.readFileSync(CSV, 'utf8'));
const head = rows[0];
const idx = Object.fromEntries(head.map((h, i) => [h.trim(), i]));
const today = new Date().toISOString().slice(0, 10);

// Kadenz-Wache: letzter IG-Post aus dem Ledger
let lastPosted = 0;
for (const r of rows.slice(1)) {
  if ((r[idx.status] || '').startsWith('posted') && r[idx.posted_at]) {
    const t = Date.parse(r[idx.posted_at]); if (t > lastPosted) lastPosted = t;
  }
}
if (lastPosted && (Date.now() - lastPosted) < MIN_GAP_H * 3600000) {
  console.log(`Kadenz-Wache: letzter Post vor ${((Date.now() - lastPosted) / 3600000).toFixed(1)}h (<${MIN_GAP_H}h) → kein Post.`);
  process.exit(0);
}

// Nächste fällige Zeile: ready + instagram-Plattform + fällig
const cand = rows.slice(1).find(r => (r[idx.status] || '').trim() === 'ready'
  && /instagram/i.test(r[idx.platforms] || '')
  && (r[idx.scheduled_date] || '9999') <= today);
if (!cand) { console.log('Nichts fällig (kein ready+instagram+due).'); process.exit(0); }
const [id, , url, caption, tags] = [cand[idx.id], 0, cand[idx.video_url], cand[idx.caption], cand[idx.hashtags]];
const text = `${caption}\n\n${(tags || '').split(/[,\s]+/).filter(Boolean).slice(0, 12).join(' ')}`;
console.log(`Post: ${id}\n  Video: ${url.slice(0, 90)}\n  Caption: ${text.slice(0, 100)}…`);
if (DRY) { console.log('[DRY] würde jetzt IG-Reel + FB-Video posten.'); process.exit(0); }

let igPermalink = '';
// 1) Instagram Reel
const c = await api(`${IG}/media`, { media_type: 'REELS', video_url: url, caption: text, share_to_feed: 'true' });
if (!c.id) { console.error('IG-Container-Fehler:', JSON.stringify(c).slice(0, 300)); process.exit(1); }
for (let a = 0; a < 30; a++) {
  await sleep(8000);
  const st = await api(`${c.id}`, { fields: 'status_code' }, 'GET');
  if (st.status_code === 'FINISHED') break;
  if (st.status_code === 'ERROR') { console.error('IG-Verarbeitung fehlgeschlagen:', JSON.stringify(st).slice(0, 200)); process.exit(1); }
}
const pub = await api(`${IG}/media_publish`, { creation_id: c.id });
if (pub.id) {
  const perma = await api(`${pub.id}`, { fields: 'permalink' }, 'GET');
  igPermalink = perma.permalink || pub.id;
  console.log('✅ Instagram-Reel live:', igPermalink);
} else { console.error('IG-Publish-Fehler:', JSON.stringify(pub).slice(0, 300)); process.exit(1); }
// 2) Facebook-Seitenvideo
const fb = await api(`${FB}/videos`, { file_url: url, description: text });
console.log(fb.id ? `✅ Facebook-Video live: ${fb.id}` : `FB-Fehler (IG war ok): ${JSON.stringify(fb).slice(0, 200)}`);
// 3) Ledger
cand[idx.status] = 'posted-ig-fb';
cand[idx.posted_at] = new Date().toISOString();
cand[idx.post_url] = igPermalink;
fs.writeFileSync(CSV, rows.map(r => r.map(esc).join(',')).join('\n') + '\n');
console.log('Ledger aktualisiert →', id, 'posted-ig-fb');
