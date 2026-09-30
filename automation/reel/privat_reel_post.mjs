#!/usr/bin/env node
/**
 * privat_reel_post.mjs — ein Reel aus einer LOKALEN Datei auf Instagram + Facebook posten, ohne öffentliche Ablage (30.09.2026).
 *
 * Anlass: Tatis Model-Video (Betreiber 30.09. «Ja, posten»). Ihr Material darf nicht ins öffentliche Repo (erkennbare Person,
 * jederzeit widerrufbar — aus der git-Historie wäre es nicht mehr zu entfernen) und der Shopify-Dateispeicher ist voll. Die
 * übrigen Poster brauchen eine öffentliche video_url. Hier: Instagram «resumable upload» (Bytes direkt an rupload.facebook.com)
 * und Facebook-Seitenvideo per Datei-Upload (graph-video.facebook.com, multipart).
 *
 * Wachen wie alle Poster (post_guard.mjs): EIN Lock, Medien-Ledger (Dateiname), Model-Markierung Pflicht
 * (`markierungFehlt` — Dateiname luxestyle-model-* verlangt @tatjanalarsinamoira in der Caption), FB-Seitenwache.
 *
 *   IG_USER_ID=… META_ACCESS_TOKEN=… FB_PAGE_ID=… node automation/reel/privat_reel_post.mjs <datei.mp4> <caption.txt> [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { lock as postLock, seen as postSeen, mark as postMark, markierungFehlt, fbSeitenIdentitaet, igUserTags } from '../post_guard.mjs';

const [datei, capDatei] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const DRY = process.argv.includes('--dry');
const V = 'v21.0';
const IG = process.env.IG_USER_ID || '', TOK = process.env.META_ACCESS_TOKEN || '', FB = process.env.FB_PAGE_ID || '1049840534888592';
if (!datei || !capDatei || !fs.existsSync(datei)) { console.error('Aufruf: privat_reel_post.mjs <datei.mp4> <caption.txt> [--dry]'); process.exit(1); }
const caption = fs.readFileSync(capDatei, 'utf8').trim();
const name = path.basename(datei);

const sperre = markierungFehlt(name, caption, name);
if (sperre) { console.error('⛔', sperre); process.exit(2); }
if (postSeen(name)) { console.error(`⛔ ${name} steht schon im Medien-Ledger — nicht doppelt posten.`); process.exit(2); }
if (!IG || !TOK) { console.error('⛔ IG_USER_ID / META_ACCESS_TOKEN fehlen'); process.exit(1); }
const buf = fs.readFileSync(datei);
console.log(`→ ${name} (${(buf.length / 1e6).toFixed(1)} MB) · IG ${IG} + FB ${FB}${DRY ? ' · DRY' : ''}`);
if (DRY) process.exit(0);
postLock();

async function j(r) { const t = await r.text(); try { return JSON.parse(t); } catch { return { roh: t.slice(0, 300) }; } }

// --- Instagram: Container (resumable) → Bytes → warten → veröffentlichen
let igId = null;
{
  const c = await j(await fetch(`https://graph.facebook.com/${V}/${IG}/media`, { method: 'POST', body: new URLSearchParams({
    media_type: 'REELS', upload_type: 'resumable', caption, share_to_feed: 'true', access_token: TOK, ...igUserTags([name], 'reel') }) }));
  if (!c.id) { console.error('IG-Container:', JSON.stringify(c).slice(0, 300)); process.exit(1); }
  const up = await j(await fetch(`https://rupload.facebook.com/ig-api-upload/${V}/${c.id}`, { method: 'POST',
    headers: { Authorization: `OAuth ${TOK}`, offset: '0', file_size: String(buf.length) }, body: buf }));
  if (up.success === false || up.error) { console.error('IG-Upload:', JSON.stringify(up).slice(0, 300)); process.exit(1); }
  let st = '';
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const s = await j(await fetch(`https://graph.facebook.com/${V}/${c.id}?fields=status_code,status&access_token=${encodeURIComponent(TOK)}`));
    st = s.status_code || s.status || '';
    if (st === 'FINISHED' || st === 'ERROR' || st === 'EXPIRED') { if (st !== 'FINISHED') console.error('IG-Status:', JSON.stringify(s)); break; }
  }
  if (st !== 'FINISHED') { console.error('IG: Verarbeitung nicht fertig —', st); process.exit(1); }
  const p = await j(await fetch(`https://graph.facebook.com/${V}/${IG}/media_publish`, { method: 'POST', body: new URLSearchParams({ creation_id: c.id, access_token: TOK }) }));
  if (!p.id) { console.error('IG-Publish:', JSON.stringify(p).slice(0, 300)); process.exit(1); }
  igId = p.id; postMark(name);                       // Ledger SOFORT nach IG (Regel 10), vor dem langsamen FB-Schritt
  console.log('IG: Reel gepostet', igId);
}

// --- Facebook: Seitenvideo per Datei-Upload
{
  const ident = await fbSeitenIdentitaet(TOK, FB);
  if (!ident.ok) console.error('⛔ FB-Seitenwache:', ident.grund);
  else {
    const fd = new FormData();
    fd.append('access_token', TOK); fd.append('description', caption);
    fd.append('source', new Blob([buf], { type: 'video/mp4' }), name);
    const r = await j(await fetch(`https://graph-video.facebook.com/${V}/${FB}/videos`, { method: 'POST', body: fd }));
    if (r.id) console.log('FB: Video gepostet', r.id); else console.error('FB-Video:', JSON.stringify(r).slice(0, 300));
  }
}
console.log(`FERTIG: IG ${igId}`);
