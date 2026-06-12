#!/usr/bin/env node
/* LuxeStyle — tiktok-autopost.mjs  (PERSISTENTER TikTok-Autopilot)
 *
 * Postet das nächste fällige Reel (status=ready) aus automation/reels_seed.csv direkt per
 * TikTok-Content-Posting-API v2 (FILE_UPLOAD-Pfad: Video erst lokal laden, dann hochladen —
 * funktioniert auch ohne verifizierte Pull-URL-Domain).
 *
 * ⚠️ AUDIT-/SANDBOX-HINWEIS: Bis die App von TikTok auditiert ist, MUSS privacy_level=SELF_ONLY
 *   sein → das Video erscheint nur im eigenen Profil (nicht öffentlich). Nach Audit: PUBLIC_TO_EVERYONE.
 * ⚠️ THROTTLE: max MAX_PER_RUN Posts pro Lauf (Default 1).
 * No-op (Exit 0), wenn TT_ACCESS_TOKEN nicht gesetzt oder keine Zeile 'ready'.
 *
 * Token-Lifecycle: TikTok-Access-Tokens leben 24h, Refresh-Tokens 365 Tage. Sind TT_REFRESH_TOKEN,
 * TT_CLIENT_KEY und TT_CLIENT_SECRET als Secrets gesetzt, refresht das Skript automatisch und
 * schreibt die neuen Tokens nach $GITHUB_OUTPUT (Workflow persistiert sie via `gh secret set`).
 *
 * ENV:
 *   TT_ACCESS_TOKEN      (Pflicht — sonst No-op)
 *   TT_REFRESH_TOKEN, TT_CLIENT_KEY, TT_CLIENT_SECRET (optional → Auto-Refresh)
 *   TT_PRIVACY_LEVEL     (Default SELF_ONLY · nach Audit PUBLIC_TO_EVERYONE)
 *   MAX_PER_RUN=1
 *   DRY_RUN=1
 */
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

const CSV = new URL('./reels_seed.csv', import.meta.url).pathname;
const DRY = process.env.DRY_RUN === '1';
const MAX = Math.max(1, parseInt(process.env.MAX_PER_RUN || '1', 10) || 1);
const PRIVACY = process.env.TT_PRIVACY_LEVEL || 'SELF_ONLY';
const COLS = ['id','scheduled_date','video_url','caption','hashtags','platforms','status','posted_at','post_url'];

// --- CSV parse/serialize (identisch zu post-next-reel.mjs) ---
function parse(text){
  const rows=[]; let row=[], field='', q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){field+='"';i++;} else q=false; } else field+=c; }
    else { if(c==='"')q=true; else if(c===','){row.push(field);field='';}
      else if(c==='\n'){row.push(field);rows.push(row);row=[];field='';}
      else if(c==='\r'){} else field+=c; } }
  if(field.length||row.length){row.push(field);rows.push(row);}
  return rows.filter(r=>r.length>1||(r.length===1&&r[0]!==''));
}
function esc(v){ v=String(v??''); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }
function serialize(rows){ return rows.map(r=>r.map(esc).join(',')).join('\n')+'\n'; }

// --- Token-Refresh (auto, falls Creds gesetzt) ---
async function refreshIfNeeded(currentTok){
  const key = process.env.TT_CLIENT_KEY, sec = process.env.TT_CLIENT_SECRET, ref = process.env.TT_REFRESH_TOKEN;
  if(!currentTok) return '';
  if(!key || !sec || !ref) return currentTok;  // ohne Creds: Token direkt nutzen
  // Token validieren
  const v = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id', {
    headers: { Authorization: `Bearer ${currentTok}` }
  });
  if(v.ok) return currentTok;
  // Refresh
  const r = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({ client_key:key, client_secret:sec, grant_type:'refresh_token', refresh_token:ref })
  });
  const j = await r.json().catch(()=>({}));
  if(!r.ok || !j.access_token){ console.error('TT refresh:', r.status, JSON.stringify(j)); return currentTok; }
  console.log('TT: Token refreshed (24h).');
  // Tokens IMMER maskieren (oeffentliches Repo!) bevor sie irgendwo landen koennen.
  console.log(`::add-mask::${j.access_token}`);
  console.log(`::add-mask::${j.refresh_token}`);
  // Neue Tokens an Workflow weitergeben (persistiert per `gh secret set`)
  if(process.env.GITHUB_OUTPUT){
    fs.appendFileSync(process.env.GITHUB_OUTPUT,
      `tt_access_token=${j.access_token}\ntt_refresh_token=${j.refresh_token}\n`);
  }
  return j.access_token;
}

// --- Helpers ---
async function downloadToTemp(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error(`Download ${url} → HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const p = path.join(tmpdir(), `tt-${Date.now()}.mp4`);
  fs.writeFileSync(p, buf);
  return { path: p, size: buf.length };
}

// --- TikTok-Posting: Direct-Post mit automatischem Fallback auf Inbox/Entwurf (ohne Audit) ---
const TT_MODE = (process.env.TT_UPLOAD_MODE || 'auto').toLowerCase();  // auto | direct | inbox
const DIRECT_URL = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
const INBOX_URL  = 'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/';

async function ttInit(url, token, body){
  const r = await fetch(url, { method:'POST',
    headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
    body: JSON.stringify(body) });
  const j = await r.json().catch(()=>({}));
  return { ok:r.ok, j };
}

async function postTikTok(token, videoUrl, caption){
  const { path: localPath, size } = await downloadToTemp(videoUrl);
  const source_info = { source:'FILE_UPLOAD', video_size:size, chunk_size:size, total_chunk_count:1 };
  let upload_url='', publish_id='', mode='';

  // 1) Direct-Post versuchen (ausser explizit inbox)
  if(TT_MODE !== 'inbox'){
    const { ok, j } = await ttInit(DIRECT_URL, token, {
      post_info:{ title:caption.slice(0,2200), privacy_level:PRIVACY,
        disable_duet:false, disable_comment:false, disable_stitch:false, video_cover_timestamp_ms:1000 },
      source_info,
    });
    if(ok && j.data?.upload_url){ upload_url=j.data.upload_url; publish_id=j.data.publish_id; mode='direct'; }
    else {
      const code = j.error?.code || j.code || '';
      if(code === 'unaudited_client_can_only_post_to_private_accounts' && TT_MODE==='auto'){
        console.log('⏳ Direct-Post gesperrt (App unauditiert) → Fallback: Upload in TikTok-Entwürfe (Inbox).');
      } else {
        fs.unlinkSync(localPath);
        console.error('TT init (direct):', JSON.stringify(j.error||j));
        return false;
      }
    }
  }

  // 2) Inbox/Entwurf (funktioniert OHNE Audit; finaler Post in der TikTok-App)
  if(!upload_url){
    const { ok, j } = await ttInit(INBOX_URL, token, { source_info });
    if(!ok || !j.data?.upload_url){
      const code = j.error?.code || j.code || '';
      fs.unlinkSync(localPath);
      if(code === 'unaudited_client_can_only_post_to_private_accounts'){
        console.log('⏳ Auch Inbox meldet unauditiert → sauberer Skip bis App-Audit (Reel bleibt ready).');
        return 'AUDIT_PENDING';
      }
      console.error('TT init (inbox):', JSON.stringify(j.error||j));
      return false;
    }
    upload_url=j.data.upload_url; publish_id=j.data.publish_id; mode='inbox';
  }

  // 3) Bytes hochladen (Single-Chunk PUT)
  const buf = fs.readFileSync(localPath);
  const up = await fetch(upload_url, { method:'PUT',
    headers:{ 'Content-Type':'video/mp4', 'Content-Range':`bytes 0-${size-1}/${size}` }, body:buf });
  fs.unlinkSync(localPath);
  if(!up.ok){ const t=await up.text().catch(()=> ''); console.error('TT upload:', up.status, t.slice(0,200)); return false; }

  if(mode==='inbox'){ console.log('TikTok: Video in Entwürfe/Inbox geladen (publish_id', publish_id + ') → in der App final posten.'); return 'INBOX:'+publish_id; }
  console.log('TikTok: Direct-Post publish_id', publish_id, '(privacy:', PRIVACY + ')');
  return publish_id;
}

// --- Hauptlauf ---
const TOK = await refreshIfNeeded(process.env.TT_ACCESS_TOKEN || '');
if(!TOK){ console.log('Kein TT_ACCESS_TOKEN → No-op. Setze TT_ACCESS_TOKEN als Secret.'); process.exit(0); }
if(!fs.existsSync(CSV)){ console.log('Kein reels_seed.csv → No-op.'); process.exit(0); }

const rows = parse(fs.readFileSync(CSV,'utf8'));
const header = rows[0];
const idx = Object.fromEntries(COLS.map(c=>[c, header.indexOf(c)]));
const data = rows.slice(1);
const ready = data.filter(r => (r[idx.status]||'').trim()==='ready' && (r[idx.video_url]||'').trim());
if(ready.length===0){ console.log('Kein Reel mit status=ready → No-op.'); process.exit(0); }

console.log(`TikTok ready: ${ready.length} · MAX_PER_RUN: ${MAX} · Privacy: ${PRIVACY}`);
let postedCount = 0, anyFail = false;
for(const next of ready.slice(0, MAX)){
  const videoUrl = next[idx.video_url].trim();
  const caption = (next[idx.caption] || '') + (next[idx.hashtags] ? '\n' + next[idx.hashtags] : '');
  console.log(`→ Reel ${next[idx.id]} | ${videoUrl}`);
  if(DRY){ console.log('   DRY_RUN: würde an TikTok senden.'); postedCount++; continue; }
  try{
    const pubId = await postTikTok(TOK, videoUrl, caption);
    if(pubId === 'AUDIT_PENDING'){ console.log('   → warte auf TikTok-Audit; Reel bleibt ready.'); break; }
    if(pubId){
      const inbox = String(pubId).startsWith('INBOX:');
      next[idx.status] = inbox ? 'tiktok-entwurf' : 'posted-tiktok';
      next[idx.posted_at] = new Date().toISOString();
      next[idx.post_url] = inbox ? pubId.slice(6) : `tt:${pubId}`;
      postedCount++;
      console.log(inbox ? '   📥 in TikTok-Entwürfe geladen — in der App final posten' : '   ✅ veröffentlicht auf TikTok');
    } else { anyFail = true; }
  }catch(e){ console.error('TT error:', e.message); anyFail = true; }
}

if(!DRY && postedCount>0) fs.writeFileSync(CSV, serialize(rows));
console.log(`Fertig: ${postedCount} TikTok-Post(s)${DRY?' (DRY)':''}.`);
process.exit(anyFail && postedCount===0 ? 1 : 0);
