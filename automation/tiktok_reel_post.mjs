#!/usr/bin/env node
/* LuxeStyle — tiktok_reel_post.mjs
 * Postet das nächste `ready`-Reel aus automation/reels_seed.csv (platforms enthält "tiktok"
 * ODER --any) auf TikTok via Content Posting API (Direct Post, FILE_UPLOAD).
 *
 * Auth (durable): Refresh-Token-Flow. Env:
 *   TT_CLIENT_KEY, TT_CLIENT_SECRET, TT_REFRESH_TOKEN   (empfohlen — Access-Token wird frisch geholt)
 *   ODER TT_ACCESS_TOKEN direkt (nur 24h gültig).
 * Quelle: /tmp/tt_creds.env wird NICHT automatisch gelesen — Env vorher sourcen.
 *
 * Wichtig:
 *  - creator_info-Query ist PFLICHT vor jedem Post (TikTok-Regel) und liefert privacy_level_options.
 *    Un-auditierte Apps dürfen nur SELF_ONLY (privat) posten → Script wählt automatisch die
 *    „öffentlichste" erlaubte Stufe (PUBLIC_TO_EVERYONE > MUTUAL_FOLLOW_FRIENDS > SELF_ONLY).
 *  - FILE_UPLOAD (nicht PULL_FROM_URL): cdn.shopify.com ist keine verifizierte App-Domain.
 *  - Dedup: /tmp bzw. Repo-Ledger dropship/_tiktok_posted.txt (Reel-ID). Nie zweimal dieselbe ID.
 *
 * Nutzung:  node automation/tiktok_reel_post.mjs [--dry] [--any] [--id revid-schmuck]
 */
import fs from 'node:fs';

const DRY = process.argv.includes('--dry');
const ANY = process.argv.includes('--any');
const idArg = (()=>{const i=process.argv.indexOf('--id');return i>0?process.argv[i+1]:null;})();
const CK = (process.env.TT_CLIENT_KEY||'').trim();
const CS = (process.env.TT_CLIENT_SECRET||'').trim();
const RT = (process.env.TT_REFRESH_TOKEN||'').trim();
let AT = (process.env.TT_ACCESS_TOKEN||'').trim();
const CSV = 'automation/reels_seed.csv';
const LEDGER = 'dropship/_tiktok_posted.txt';

function log(...a){ console.log(...a); }
async function j(url, opt){ const r = await fetch(url, opt); const t = await r.text(); let d; try{d=JSON.parse(t);}catch{d={raw:t};} return {status:r.status, d}; }

// --- minimal CSV parse (handles quoted multiline fields) ---
function parseCSV(txt){
  const rows=[]; let f='', row=[], q=false;
  for(let i=0;i<txt.length;i++){ const c=txt[i];
    if(q){ if(c==='"'){ if(txt[i+1]==='"'){f+='"';i++;} else q=false; } else f+=c; }
    else { if(c==='"') q=true; else if(c===','){row.push(f);f='';} else if(c==='\n'||c==='\r'){ if(c==='\r'&&txt[i+1]==='\n')i++; row.push(f); rows.push(row); row=[]; f=''; } else f+=c; }
  }
  if(f!==''||row.length){ row.push(f); rows.push(row); }
  return rows.filter(r=>r.length>1||r[0]!=='');
}

async function refreshAccessToken(){
  if(RT){
    const body = new URLSearchParams({client_key:CK, client_secret:CS, grant_type:'refresh_token', refresh_token:RT});
    const {status,d} = await j('https://open.tiktokapis.com/v2/oauth/token/', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body});
    if(d.access_token){ log('access_token via refresh (expires_in', d.expires_in,'s)'); return d.access_token; }
    log('Refresh fehlgeschlagen:', status, JSON.stringify(d).slice(0,200));
  }
  if(AT){ log('nutze TT_ACCESS_TOKEN direkt (kein Refresh-Token gesetzt)'); return AT; }
  throw new Error('Kein gültiger Token: setze TT_REFRESH_TOKEN (empfohlen) oder TT_ACCESS_TOKEN');
}

async function creatorInfo(token){
  const {status,d} = await j('https://open.tiktokapis.com/v2/post/publish/creator_info/query/',
    {method:'POST', headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json; charset=UTF-8'}});
  if(d.error && d.error.code!=='ok') throw new Error('creator_info: '+JSON.stringify(d.error));
  return d.data||{};
}

function pickPrivacy(opts){
  const pref=['PUBLIC_TO_EVERYONE','MUTUAL_FOLLOW_FRIENDS','FOLLOWER_OF_CREATOR','SELF_ONLY'];
  for(const p of pref) if((opts||[]).includes(p)) return p;
  return 'SELF_ONLY';
}

async function main(){
  const txt = fs.readFileSync(CSV,'utf8');
  const rows = parseCSV(txt);
  const head = rows[0]; const ix = Object.fromEntries(head.map((h,i)=>[h.trim(),i]));
  const posted = fs.existsSync(LEDGER)? new Set(fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.trim()).filter(Boolean)) : new Set();
  // pick candidate
  let cand=null;
  for(let r=1;r<rows.length;r++){ const row=rows[r];
    const id=row[ix.id]?.trim(); const status=row[ix.status]?.trim(); const plat=(row[ix.platforms]||'').toLowerCase();
    if(!id||status!=='ready') continue;
    if(idArg && id!==idArg) continue;
    if(!idArg && !ANY && !plat.includes('tiktok')) continue;
    if(posted.has(id)) continue;
    cand={rowIdx:r, id, url:row[ix.video_url]?.trim(), caption:(row[ix.caption]||'').trim(), hashtags:(row[ix.hashtags]||'').trim()};
    break;
  }
  if(!cand){ log('Keine passende ready-Zeile gefunden (Tipp: --any für alle Plattformen, --id <reel>).'); return; }
  const title = (cand.caption.split('\n')[0] + ' ' + cand.hashtags).slice(0,2100);
  log('Kandidat:', cand.id, '\n  title:', title.slice(0,120), '\n  url:', cand.url);
  if(DRY){ log('[DRY] würde posten.'); return; }

  const token = await refreshAccessToken();
  const info = await creatorInfo(token);
  const privacy = pickPrivacy(info.privacy_level_options);
  log('creator:', info.creator_nickname||info.creator_username||'?', '| privacy:', privacy,
      '| max_dur:', info.max_video_post_duration_sec);
  if(privacy==='SELF_ONLY') log('⚠️ App un-auditiert → Post wird PRIVAT (nur du siehst ihn). Für öffentlich: App-Audit bei TikTok.');

  // download video bytes
  const vr = await fetch(cand.url); const buf = Buffer.from(await vr.arrayBuffer());
  const size = buf.length; log('Video', (size/1e6).toFixed(1),'MB');
  // init Direct Post via FILE_UPLOAD (single chunk if <=64MB)
  const initBody = {
    post_info:{ title, privacy_level:privacy, disable_comment:false, disable_duet:false, disable_stitch:false, video_cover_timestamp_ms:1000 },
    source_info:{ source:'FILE_UPLOAD', video_size:size, chunk_size:size, total_chunk_count:1 }
  };
  const init = await j('https://open.tiktokapis.com/v2/post/publish/video/init/',
    {method:'POST', headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json; charset=UTF-8'}, body:JSON.stringify(initBody)});
  if(!init.d.data || !init.d.data.upload_url){ log('init FAIL', init.status, JSON.stringify(init.d).slice(0,300)); return; }
  const {publish_id, upload_url} = init.d.data;
  log('publish_id', publish_id);
  // upload bytes
  const put = await fetch(upload_url, {method:'PUT', headers:{'Content-Type':'video/mp4','Content-Range':`bytes 0-${size-1}/${size}`}, body:buf});
  log('upload PUT status', put.status);
  // poll status
  for(let i=0;i<20;i++){
    await new Promise(r=>setTimeout(r,5000));
    const st = await j('https://open.tiktokapis.com/v2/post/publish/status/fetch/',
      {method:'POST', headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json; charset=UTF-8'}, body:JSON.stringify({publish_id})});
    const s = st.d.data?.status; log('  status', s);
    if(s==='PUBLISH_COMPLETE'){
      fs.appendFileSync(LEDGER, cand.id+'\n');
      // mark row posted in CSV
      const rows2=parseCSV(fs.readFileSync(CSV,'utf8'));
      log('✅ TikTok-Post fertig:', cand.id, '→ Ledger aktualisiert. (CSV-Status manuell/Autopilot auf posted setzen.)');
      return;
    }
    if(s==='FAILED'){ log('❌ FAILED', JSON.stringify(st.d.data)); return; }
  }
  log('⏱️ Timeout beim Status-Poll (publish_id', publish_id,') — evtl. trotzdem erfolgreich, später prüfen.');
}
main().catch(e=>{ console.error('ERR', e.message); process.exit(1); });
