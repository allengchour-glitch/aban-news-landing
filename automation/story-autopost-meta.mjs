#!/usr/bin/env node
/* LuxeStyle — story-autopost-meta.mjs  (Stories-Autopilot für Meta, committet → bleibt)
 *
 * Postet die nächste fällige STORY (status=ready, scheduled_date<=heute) aus social/story_queue.csv:
 *   • Instagram Stories — Bild (media_type=STORIES, image_url) ODER Video (media_type=STORIES, video_url)
 *   • Facebook-Page Stories — Foto-Story (/photos published=false → /photo_stories)
 *                              ODER Video-Story (/video_stories start → rupload file_url → finish)
 * Threads hat KEINE Stories → wird übersprungen.
 *
 * Medien (Bild=JPG, Video=mp4) müssen unter einer ÖFFENTLICHEN HTTPS-URL liegen (GitHub Pages).
 * Stories sind flüchtig (24 h) → ideal für hohe Frequenz; KEIN Link-/Caption-Param (API-Limit) →
 * die Marke steckt im Medium selbst (Logo/Outro). 1 Story pro Lauf (Throttle), gestaffelt per scheduled_date.
 *
 * Tokens NUR aus GitHub-Actions-Secrets (identisch zu den Feed-Postern). No-op ohne Secrets/fällige Zeile.
 * ENV: IG_USER_ID + IG_ACCESS_TOKEN(/META_ACCESS_TOKEN) · FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN(/META_ACCESS_TOKEN)
 *      META_GRAPH_VERSION(Default v21.0) · MAX_PER_RUN(1) · DRY_RUN=1
 */
import fs from 'node:fs';

const CSV = new URL('../social/story_queue.csv', import.meta.url).pathname;
const V = process.env.META_GRAPH_VERSION || 'v21.0';
const DRY = process.env.DRY_RUN === '1';
const MAX = Math.max(1, parseInt(process.env.MAX_PER_RUN || '1', 10) || 1);

const IG_ID = process.env.IG_USER_ID || '';
const IG_TOK = process.env.IG_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
const FB_ID = process.env.FB_PAGE_ID || '';
const FB_TOK = process.env.FB_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';

const COLS = ['id','scheduled_date','type','media_url','platforms','status','posted_at','post_url'];

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

async function gpost(url, params){
  const body = new URLSearchParams(params);
  const r = await fetch(url, {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body});
  const j = await r.json().catch(()=>({}));
  return {ok:r.ok, status:r.status, j};
}
async function waitFinished(statusUrl){
  for(let i=0;i<42;i++){
    await new Promise(r=>setTimeout(r, i===0?3000:5000));
    const r = await fetch(statusUrl).catch(()=>null);
    const j = r ? await r.json().catch(()=>({})) : {};
    const s = j.status_code || j.status;
    if(s==='FINISHED') return true;
    if(s==='ERROR' || s==='EXPIRED'){ console.error('Container-Status:', s, JSON.stringify(j)); return false; }
  }
  console.error('Story-Verarbeitung Timeout — versuche trotzdem Publish.'); return false;
}

// FB Page-Token (User-Token → Page-Token mit pages_manage_posts)
let _fbTok = null;
async function fbToken(){
  if(_fbTok) return _fbTok; _fbTok = FB_TOK;
  try{
    const ar = await fetch(`https://graph.facebook.com/${V}/me/accounts?access_token=${encodeURIComponent(FB_TOK)}`);
    const aj = await ar.json().catch(()=>({}));
    if(ar.ok && Array.isArray(aj.data)){
      const pg = aj.data.find(p => p.id === FB_ID);
      if(pg?.access_token){ _fbTok = pg.access_token; console.log('FB: Page-Token via /me/accounts geholt.'); }
    }
  }catch(e){ /* Original-Token */ }
  return _fbTok;
}

// --- Instagram Story (Bild oder Video) ---
async function igStory(type, url){
  if(!IG_ID || !IG_TOK) return null;
  const base = `https://graph.facebook.com/${V}/${IG_ID}`;
  const params = type==='video' ? { media_type:'STORIES', video_url:url, access_token:IG_TOK }
                                : { media_type:'STORIES', image_url:url, access_token:IG_TOK };
  const c = await gpost(`${base}/media`, params);
  if(!c.ok || !c.j.id){ console.error('IG-Story container:', c.status, JSON.stringify(c.j.error||c.j)); return false; }
  await waitFinished(`https://graph.facebook.com/${V}/${c.j.id}?fields=status_code,status&access_token=${encodeURIComponent(IG_TOK)}`);
  const p = await gpost(`${base}/media_publish`, { creation_id:c.j.id, access_token:IG_TOK });
  if(!p.ok || !p.j.id){ console.error('IG-Story publish:', p.status, JSON.stringify(p.j.error||p.j)); return false; }
  console.log('IG: Story gepostet', p.j.id); return p.j.id;
}

// --- Facebook Foto-Story ---
async function fbPhotoStory(url){
  if(!FB_ID || !FB_TOK) return null;
  const tok = await fbToken();
  const up = await gpost(`https://graph.facebook.com/${V}/${FB_ID}/photos`, { url, published:'false', access_token:tok });
  if(!up.ok || !up.j.id){ console.error('FB-Foto-Upload:', up.status, JSON.stringify(up.j.error||up.j)); return false; }
  const st = await gpost(`https://graph.facebook.com/${V}/${FB_ID}/photo_stories`, { photo_id:up.j.id, access_token:tok });
  if(!st.ok || !(st.j.post_id||st.j.success||st.j.id)){ console.error('FB-Foto-Story:', st.status, JSON.stringify(st.j.error||st.j)); return false; }
  console.log('FB: Foto-Story gepostet', st.j.post_id||st.j.id||'ok'); return st.j.post_id||st.j.id||'fb-photo-story';
}

// --- Facebook Video-Story (start → rupload file_url → finish) ---
async function fbVideoStory(url){
  if(!FB_ID || !FB_TOK) return null;
  const tok = await fbToken();
  const start = await gpost(`https://graph.facebook.com/${V}/${FB_ID}/video_stories`, { upload_phase:'start', access_token:tok });
  if(!start.ok || !start.j.video_id){ console.error('FB-Video-Story start:', start.status, JSON.stringify(start.j.error||start.j)); return false; }
  const vid = start.j.video_id;
  // Bytes SELBST laden + binär hochladen (umgeht die robots.txt-Sperre des FB-rupload-Fetchers).
  const vr = await fetch(url);
  if(!vr.ok){ console.error('FB-Video-Story: Quelle nicht ladbar', vr.status, url); return false; }
  const buf = Buffer.from(await vr.arrayBuffer());
  const rr = await fetch(`https://rupload.facebook.com/video-upload/${V}/${vid}`, {
    method:'POST',
    headers:{ 'Authorization':`OAuth ${tok}`, 'offset':'0', 'file_size':String(buf.length), 'Content-Type':'application/octet-stream' },
    body: buf });
  const rj = await rr.json().catch(()=>({}));
  if(!rr.ok || rj.success===false){ console.error('FB-Video-Story upload:', rr.status, JSON.stringify(rj)); return false; }
  // kurz warten, bis Verarbeitung greift
  await new Promise(r=>setTimeout(r, 8000));
  const fin = await gpost(`https://graph.facebook.com/${V}/${FB_ID}/video_stories`, { upload_phase:'finish', video_id:vid, access_token:tok });
  if(!fin.ok || !(fin.j.post_id||fin.j.success)){ console.error('FB-Video-Story finish:', fin.status, JSON.stringify(fin.j.error||fin.j)); return false; }
  console.log('FB: Video-Story gepostet', fin.j.post_id||vid); return fin.j.post_id||vid;
}

// --- Hauptlauf ---
const configured = [IG_ID&&IG_TOK&&'IG', FB_ID&&FB_TOK&&'FB'].filter(Boolean);
if(configured.length===0 && !DRY){ console.log('Kein Meta-Kanal für Stories konfiguriert → No-op.'); process.exit(0); }
if(!fs.existsSync(CSV)){ console.log('Keine social/story_queue.csv → nichts zu tun.'); process.exit(0); }

const today = new Date().toISOString().slice(0,10);
const rows = parse(fs.readFileSync(CSV,'utf8'));
const header = rows[0];
const idx = Object.fromEntries(COLS.map(c=>[c, header.indexOf(c)]));
const data = rows.slice(1);
const due = data.filter(r => (r[idx.status]||'').trim()==='ready' && (r[idx.media_url]||'').trim()
  && ((r[idx.scheduled_date]||'').trim()==='' || (r[idx.scheduled_date]||'').trim() <= today));
if(due.length===0){ console.log('Keine Story fällig.'); process.exit(0); }

console.log(`Kanäle: ${configured.join('+')||'(DRY)'} · fällig: ${due.length} · MAX_PER_RUN: ${MAX}`);
let postedCount = 0, anyFail = false;

for(const next of due.slice(0, MAX)){
  const type = (next[idx.type]||'image').trim().toLowerCase()==='video' ? 'video' : 'image';
  const url = next[idx.media_url].trim();
  const plat = (next[idx.platforms]||'').toLowerCase();
  const wantIG = !plat.trim() || /instagram|\big\b/.test(plat);
  const wantFB = !plat.trim() || /facebook|\bfb\b/.test(plat);
  console.log(`→ ${next[idx.id]} [${type}-story] | ${[wantIG&&'IG',wantFB&&'FB'].filter(Boolean).join('+')} | ${url}`);
  if(DRY){ console.log('   DRY_RUN: würde senden.'); postedCount++; continue; }

  const results = [];
  results.push(wantIG ? await igStory(type, url) : null);
  if(wantFB) results.push(type==='video' ? await fbVideoStory(url) : await fbPhotoStory(url));
  else results.push(null);
  const got = results.filter(x => x && x!==false);
  if(got.length>0){
    next[idx.status]='posted'; next[idx.posted_at]=new Date().toISOString(); next[idx.post_url]=got[0];
    postedCount++;
    console.log(`   ✅ Story auf ${results.map((x,i)=>x&&x!==false?['IG','FB'][i]:null).filter(Boolean).join('+')}`);
  } else { anyFail = true; console.error('   ❌ keine Story erfolgreich — bleibt ready.'); }
}

if(!DRY && postedCount>0) fs.writeFileSync(CSV, serialize(rows));
console.log(`Fertig: ${postedCount} Story(s)${DRY?' (DRY)':''}.`);
process.exit(anyFail && postedCount===0 ? 1 : 0);
