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
import { markierungFehlt, lock as postLock, seen as postSeen, mark as postMark, fbSeitenIdentitaet } from './post_guard.mjs';
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
  // Retry gegen transiente Netz-/DNS-Fehler (Container-Poll darf nicht crashen)
  for (let a = 0; a < 5; a++) {
    try {
      const r = await fetch(`https://graph.facebook.com/${V}/${path}${method === 'GET' ? '?' + body : ''}`,
        method === 'GET' ? {} : { method, body });
      return await r.json();
    } catch (e) { if (a === 4) return { error: { message: 'net: ' + String(e).slice(0, 60) } }; await sleep(2500); }
  }
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

// ── GEMEINSAMER Lock (post_guard: /tmp/ig_post.lock) gegen parallele Läufe JEDES Posters.
//    ⚠️ FRÜHER eigener /tmp/meta_reel_post.lock → serialisierte NICHT gegen video-/social-/
//    story-autopost (die auf /tmp/ig_post.lock liegen). Zwei Poster konnten denselben Reel
//    (gleiches Video 'ready' in reels_seed.csv UND video_queue.csv) gleichzeitig hochladen →
//    Doppelpost auf IG. Jetzt teilen sich ALLE 5 Poster EINEN Lock → nie zwei gleichzeitig,
//    und der gemeinsame Ledger (_posted_media.txt) greift dadurch script-übergreifend.
if (!DRY) postLock();

const rows = parseCsv(fs.readFileSync(CSV, 'utf8'));
const head = rows[0];
const idx = Object.fromEntries(head.map((h, i) => [h.trim(), i]));
const today = new Date().toISOString().slice(0, 10);
const writeLedger = () => fs.writeFileSync(CSV, rows.map(r => r.map(esc).join(',')).join('\n') + '\n');

// Stale-Recovery: hängengebliebene 'posting'-Zeilen (>30min ohne Abschluss) NICHT neu posten —
// sie könnten live sein (Post-vor-Commit-Fenster). Auf 'posting-unklar' setzen für manuelle Prüfung.
for (const r of rows.slice(1)) {
  if ((r[idx.status] || '').trim() === 'posting') {
    const t = Date.parse(r[idx.posted_at] || '') || 0;
    if (Date.now() - t > 30 * 60000) { r[idx.status] = 'posting-unklar-pruefen'; }
  }
}
if (!DRY) writeLedger();

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

// ⛔ INHALTS-SPERRE (GEHIRN 10, «darf kein Doppelpost mehr passieren»): jedes je gepostete Video
//    (Basename der URL, plattform-übergreifend) merken → nie zweimal posten, auch wenn es in einer
//    zweiten ready-Zeile steht oder der Status-Flow mal durcheinanderkam.
const vkey = u => (u || '').split('?')[0].split('/').pop().toLowerCase();
const postedVideos = new Set();
for (const r of rows.slice(1)) {
  const st = (r[idx.status] || '').trim();
  if (st.startsWith('posted') || st === 'posting') { const k = vkey(r[idx.video_url]); if (k) postedVideos.add(k); }
}
// Nächste fällige Zeile: ready + instagram + fällig + Video noch NIE gepostet
const cand = rows.slice(1).find(r => (r[idx.status] || '').trim() === 'ready'
  && /instagram/i.test(r[idx.platforms] || '')
  && (r[idx.scheduled_date] || '9999') <= today
  && !postedVideos.has(vkey(r[idx.video_url]))
  && !postSeen(r[idx.video_url]));                    // gemeinsamer Ledger (script-übergreifend)
if (!cand) { console.log('Nichts fällig (kein ready+instagram+due, oder alle Videos schon gepostet).'); process.exit(0); }
// Harte Doppelpost-Sperre direkt vor dem Post (Gürtel + Hosenträger + gemeinsamer Ledger)
if (postedVideos.has(vkey(cand[idx.video_url])) || postSeen(cand[idx.video_url])) { console.error('⛔ Video bereits gepostet — Doppelpost verhindert.'); process.exit(0); }

// ⛔⛔ LIVE-IG-ABGLEICH (GEHIRN 10, «darf kein Doppelpost mehr passieren»): der einzige wasserdichte
//    Check ist gegen die WAHRHEIT auf IG selbst — fängt Posts, die im ungeschützten Fenster entstanden
//    und NICHT im Ledger landeten (genau die Lücke, die 2026-07-12 den Doppelpost verursachte).
//    Normalisierte Caption-Basis (erste ~40 Zeichen, ohne Emoji/Sonderzeichen) als Signatur.
const capSig = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
async function igLiveHas(caption) {
  const want = capSig(caption);
  if (!want) return false;
  for (let a = 0; a < 3; a++) {
    const d = await api(`${IG}/media`, { fields: 'caption,permalink,timestamp', limit: '25' }, 'GET');
    if (d && Array.isArray(d.data)) {
      const hit = d.data.find(p => capSig(p.caption) === want);
      if (hit) { console.error(`⛔ LIVE-DOPPELPOST verhindert — gleiche Caption ist auf IG schon live: ${hit.permalink}`); return true; }
      return false;                       // Abfrage erfolgreich, kein Treffer → sauber
    }
    await sleep(2000 * (a + 1));           // Lesefehler (Token/Netz) → kurz retry
  }
  console.error('⚠️ IG-Live-Abgleich nicht erreichbar (3× Fehler) → verlasse mich auf lokale Wachen.');
  return false;                            // Nie erreichbar → nicht das Posten blockieren (lokale Wachen greifen)
}
if (await igLiveHas(cand[idx.caption])) process.exit(0);
const [id, , url, caption, tags] = [cand[idx.id], 0, cand[idx.video_url], cand[idx.caption], cand[idx.hashtags]];
const text = `${caption}\n\n${(tags || '').split(/[,\s]+/).filter(Boolean).slice(0, 12).join(' ')}`;
console.log(`Post: ${id}\n  Video: ${url.slice(0, 90)}\n  Caption: ${text.slice(0, 100)}…`);
if (DRY) { console.log('[DRY] würde jetzt IG-Reel + FB-Video posten.'); process.exit(0); }

// ── CLAIM: Zeile SOFORT als 'posting' markieren + Ledger schreiben, BEVOR gepostet wird.
//    Schließt das «Post-vor-Commit»-Fenster: stirbt der Prozess jetzt, steht die Zeile auf
//    'posting' (nicht mehr 'ready') → kein zweiter Lauf postet denselben Reel erneut.
cand[idx.status] = 'posting';
cand[idx.posted_at] = new Date().toISOString();
writeLedger();

let igPermalink = '';
// 1) Instagram Reel
{ // Einwilligungs-Bedingung der Kundin: ihr Material nur MIT Markierung (04.09.2026).
  const fehlt = markierungFehlt(url, text, cand[idx.id]);
  if (fehlt) { console.error('⛔', fehlt); process.exit(0); } }
const c = await api(`${IG}/media`, { media_type: 'REELS', video_url: url, caption: text, share_to_feed: 'true' });
if (!c.id) { console.error('IG-Container-Fehler:', JSON.stringify(c).slice(0, 300)); cand[idx.status] = 'ready'; writeLedger(); process.exit(1); }
for (let a = 0; a < 30; a++) {
  await sleep(8000);
  const st = await api(`${c.id}`, { fields: 'status_code' }, 'GET');
  if (st.status_code === 'FINISHED') break;
  if (st.status_code === 'ERROR') { console.error('IG-Verarbeitung fehlgeschlagen:', JSON.stringify(st).slice(0, 200)); cand[idx.status] = 'ready'; writeLedger(); process.exit(1); }
}
const pub = await api(`${IG}/media_publish`, { creation_id: c.id });
if (pub.id) {
  // ✅ IG ist LIVE → SOFORT committen (vor dem langsamen FB-Schritt), sonst droht Re-Post bei Abbruch.
  cand[idx.status] = 'posted-ig-fb';
  cand[idx.posted_at] = new Date().toISOString();
  cand[idx.post_url] = pub.id;
  postMark(url);                    // gemeinsamer Ledger: kein anderer Poster wiederholt dieses Video
  writeLedger();
  const perma = await api(`${pub.id}`, { fields: 'permalink' }, 'GET');
  igPermalink = perma.permalink || pub.id;
  cand[idx.post_url] = igPermalink; writeLedger();
  console.log('✅ Instagram-Reel live:', igPermalink);
} else {
  // Publish fehlgeschlagen (kein IG-Post entstanden) → zurück auf ready
  console.error('IG-Publish-Fehler:', JSON.stringify(pub).slice(0, 300));
  cand[idx.status] = 'ready'; cand[idx.posted_at] = ''; writeLedger(); process.exit(1);
}
// 2) Facebook-Seitenvideo (best effort — Ledger ist bereits committet, FB-Fehler löst KEINEN Re-Post aus)
const fbIdent = await fbSeitenIdentitaet(TOK, FB);
if (!fbIdent.ok) { console.error('⛔ FB-Seitenwache:', fbIdent.grund); }
const fb = fbIdent.ok ? await api(`${FB}/videos`, { file_url: url, description: text }) : { error: 'FB-Seitenwache: ' + fbIdent.grund };
console.log(fb.id ? `✅ Facebook-Video live: ${fb.id}` : `FB-Fehler (IG war ok, Ledger committet): ${JSON.stringify(fb).slice(0, 200)}`);
console.log('Ledger aktualisiert →', id, 'posted-ig-fb');
