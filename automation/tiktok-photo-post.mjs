#!/usr/bin/env node
/* tiktok-photo-post.mjs - TikTok FOTO/KARUSSELL-Post per Content Posting API (King-Upgrade).
 * Postet das naechste faellige Foto-Set (status=ready) aus social/tiktok_photos.csv:
 *   id,scheduled_date,image_urls(|-getrennt),caption,status,posted_at
 * Vor App-Audit: landet als ENTWURF im TikTok-Posteingang (du tippst "Posten"). Nach Audit + TT_API_LIVE=1:
 *   direkt oeffentlich (PUBLIC_TO_EVERYONE).
 * No-op ohne TT_ACCESS_TOKEN oder ohne faellige Zeile. Token-Refresh wie tiktok-autopost.mjs (ENV-Creds).
 *
 * ENV: TT_ACCESS_TOKEN (Pflicht) · TT_REFRESH_TOKEN/TT_CLIENT_KEY/TT_CLIENT_SECRET (Auto-Refresh) ·
 *      TT_API_LIVE=1 (nach Audit -> oeffentlich) · DRY_RUN=1
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url))));
const CSV = path.join(ROOT, 'social', 'tiktok_photos.csv');
const DRY = process.env.DRY_RUN === '1';
const LIVE = process.env.TT_API_LIVE === '1';
const PRIVACY = LIVE ? 'PUBLIC_TO_EVERYONE' : 'SELF_ONLY';

async function refreshIfNeeded(tok) {
  const key = process.env.TT_CLIENT_KEY, sec = process.env.TT_CLIENT_SECRET, ref = process.env.TT_REFRESH_TOKEN;
  if (!tok || !key || !sec || !ref) return tok;
  const v = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id', { headers: { Authorization: `Bearer ${tok}` } });
  if (v.ok) return tok;
  const r = await fetch('https://open.tiktokapis.com/v2/oauth/token/', { method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: key, client_secret: sec, grant_type: 'refresh_token', refresh_token: ref }) });
  const j = await r.json().catch(() => ({}));
  return j.access_token || tok;
}
function parse(t){ const rows=[]; let row=[],f='',q=false; for(let i=0;i<t.length;i++){const c=t[i];
  if(q){ if(c==='"'){ if(t[i+1]==='"'){f+='"';i++;} else q=false; } else f+=c; }
  else { if(c==='"')q=true; else if(c===','){row.push(f);f='';} else if(c==='\n'){row.push(f);rows.push(row);row=[];f='';} else if(c==='\r'){} else f+=c; } }
  if(f.length||row.length){row.push(f);rows.push(row);} return rows.filter(r=>r.length>1||(r[0]||'')!==''); }
function esc(v){ v=String(v??''); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }

(async () => {
  let tok = await refreshIfNeeded(process.env.TT_ACCESS_TOKEN || '');
  if (!tok) { console.log('Kein TT_ACCESS_TOKEN -> No-op.'); process.exit(0); }
  if (!fs.existsSync(CSV)) { console.log('Keine tiktok_photos.csv -> No-op.'); process.exit(0); }
  const rows = parse(fs.readFileSync(CSV, 'utf8')); const hdr = rows[0]; const ix = n => hdr.indexOf(n);
  const today = new Date().toISOString().slice(0, 10);
  const di = rows.findIndex((r, k) => k > 0 && (r[ix('status')] || '').trim() === 'ready'
    && ((r[ix('scheduled_date')] || '').trim() === '' || (r[ix('scheduled_date')] || '').trim() <= today));
  if (di === -1) { console.log('Keine faellige Foto-Zeile.'); process.exit(0); }
  const r = rows[di];
  const images = (r[ix('image_urls')] || '').split('|').map(s => s.trim()).filter(Boolean);
  const caption = r[ix('caption')] || '';
  if (!images.length) { console.log('Keine Bild-URLs.'); process.exit(1); }
  console.log(`-> Foto-Post ${r[ix('id')]} (${images.length} Bilder, Privacy ${PRIVACY})`);
  if (DRY) { console.log('DRY - wuerde senden.'); process.exit(0); }

  const body = {
    post_info: { title: caption.slice(0, 90), description: caption.slice(0, 4000), privacy_level: PRIVACY,
      disable_comment: false, auto_add_music: true },
    source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: images },
    post_mode: LIVE ? 'DIRECT_POST' : 'MEDIA_UPLOAD', media_type: 'PHOTO',
  };
  const init = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
    method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body) });
  const j = await init.json().catch(() => ({}));
  if (init.ok && j.data?.publish_id) {
    r[ix('status')] = 'posted'; r[ix('posted_at')] = new Date().toISOString();
    fs.writeFileSync(CSV, rows.map(row => row.map(esc).join(',')).join('\n') + '\n');
    console.log('OK publish_id', j.data.publish_id, LIVE ? '(oeffentlich)' : '(Entwurf -> in der App posten)');
  } else { console.error('Fehler:', init.status, JSON.stringify(j.error || j).slice(0, 220)); process.exit(1); }
})();
