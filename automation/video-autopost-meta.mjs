#!/usr/bin/env node
/* LuxeStyle — video-autopost-meta.mjs  (Video/Reel-Autopilot für Meta, committet → bleibt)
 *
 * Postet das nächste fällige VIDEO (status=ready, scheduled_date<=heute) aus social/video_queue.csv
 * direkt per Meta-Graph-API an Instagram (Reels) + Facebook-Page (Video) + Threads (Video).
 * KEIN Drittanbieter. Container→Publish-Flow für IG & Threads; /videos-Endpoint für die FB-Page.
 *
 * Schwester von automation/social-autopost-meta.mjs (Bilder) — gleiche Tokens, gleiche CSV-Mechanik.
 * Das Video muss unter einer ÖFFENTLICHEN HTTPS-URL liegen (Meta zieht per URL, kein Datei-Upload).
 * → Reels liegen via GitHub Pages unter https://abannews.com/reels/<datei>.mp4.
 *
 * ⚠️ THROTTLE: max MAX_PER_RUN Posts pro Lauf (Default 1) → gestaffeltes Posten / Rate-Limit-Schutz.
 * ⚠️ scheduled_date staffelt: eine Zeile wird erst gepostet, wenn ihr Datum <= heute ist (leer = sofort).
 * No-op (Exit 0), wenn keine Plattform-Secrets gesetzt sind oder nichts fällig ist.
 *
 * Tokens NUR aus GitHub-Actions-Secrets / ENV — NIE im Code. ENV (identisch zum Bild-Poster):
 *   META_GRAPH_VERSION (Default v21.0)
 *   IG_USER_ID + IG_ACCESS_TOKEN (oder META_ACCESS_TOKEN)            → Instagram Business (Reels)
 *   FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN (oder META_ACCESS_TOKEN)       → Facebook-Seite (Video)
 *   THREADS_USER_ID + THREADS_ACCESS_TOKEN                            → Threads (Video)
 *   MAX_PER_RUN=1 · DRY_RUN=1
 */
import fs from 'node:fs';

const CSV = new URL('../social/video_queue.csv', import.meta.url).pathname;
const V = process.env.META_GRAPH_VERSION || 'v21.0';
const DRY = process.env.DRY_RUN === '1';
const MAX = Math.max(1, parseInt(process.env.MAX_PER_RUN || '1', 10) || 1);
// Cover-Frame (ms) für IG-Reels: das 3.0s-Marken-Intro ist off-white → ohne Offset nimmt IG einen
// weissen Frame als Grid-Vorschau. ~3800ms landet sauber im ERSTEN Produktbild (nach Intro-Fade,
// vor dem nächsten Übergang) = Produkt-Cover statt weisser Kachel. Via THUMB_OFFSET überschreibbar.
const THUMB_MS = String(parseInt(process.env.THUMB_OFFSET || '3800', 10) || 3800);

const IG_ID = process.env.IG_USER_ID || '';
const IG_TOK = process.env.IG_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
const FB_ID = process.env.FB_PAGE_ID || '';
const FB_TOK = process.env.FB_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
const TH_ID = process.env.THREADS_USER_ID || '';
const TH_TOK = process.env.THREADS_ACCESS_TOKEN || '';

const COLS = ['id','scheduled_date','video_url','caption','platforms','status','posted_at','post_url'];

// --- minimal CSV (identisch zum Bild-Poster) ---
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
// Video braucht länger zum Verarbeiten als ein Bild → großzügiger pollen (bis ~3.5 Min).
async function waitVideo(statusUrl){
  for(let i=0;i<42;i++){
    await new Promise(r=>setTimeout(r, i===0?4000:5000));
    const r = await fetch(statusUrl).catch(()=>null);
    const j = r ? await r.json().catch(()=>({})) : {};
    const s = j.status_code || j.status;
    if(s==='FINISHED') return true;
    if(s==='ERROR' || s==='EXPIRED'){ console.error('Container-Status:', s, JSON.stringify(j)); return false; }
  }
  console.error('Video-Verarbeitung Timeout — versuche trotzdem 1× Publish.');
  return false;
}

// --- Instagram Reel ---
async function postIG(videoUrl, caption){
  if(!IG_ID || !IG_TOK) return null;
  const base = `https://graph.facebook.com/${V}/${IG_ID}`;
  const c = await gpost(`${base}/media`, { media_type:'REELS', video_url:videoUrl, caption, share_to_feed:'true', thumb_offset:THUMB_MS, access_token:IG_TOK });
  if(!c.ok || !c.j.id){ console.error('IG container:', c.status, JSON.stringify(c.j.error||c.j)); return false; }
  await waitVideo(`https://graph.facebook.com/${V}/${c.j.id}?fields=status_code,status&access_token=${encodeURIComponent(IG_TOK)}`);
  const p = await gpost(`${base}/media_publish`, { creation_id:c.j.id, access_token:IG_TOK });
  if(!p.ok || !p.j.id){ console.error('IG publish:', p.status, JSON.stringify(p.j.error||p.j)); return false; }
  console.log('IG: Reel gepostet', p.j.id); return p.j.id;
}
// --- Facebook-Page Video ---
async function postFB(videoUrl, caption){
  if(!FB_ID || !FB_TOK) return null;
  let tok = FB_TOK; // Page-Token via /me/accounts holen (User-Token allein triggert deprecated-Recht)
  try{
    const ar = await fetch(`https://graph.facebook.com/${V}/me/accounts?access_token=${encodeURIComponent(FB_TOK)}`);
    const aj = await ar.json().catch(()=>({}));
    if(ar.ok && Array.isArray(aj.data)){
      const pg = aj.data.find(p => p.id === FB_ID);
      if(pg?.access_token){ tok = pg.access_token; console.log('FB: Page-Token via /me/accounts geholt.'); }
      else console.log('FB: Seite', FB_ID, 'nicht in /me/accounts — nutze Original-Token.');
    }
  }catch(e){ /* Netzfehler → Original-Token */ }
  const r = await gpost(`https://graph.facebook.com/${V}/${FB_ID}/videos`,
    { file_url: videoUrl, description: caption, access_token: tok });
  if(!r.ok || !r.j.id){
    console.error('FB video:', r.status, JSON.stringify(r.j.error||r.j));
    if(r.status===403) console.error('FB-Tipp: Token braucht Scope "pages_manage_posts" + Admin-Rolle auf Seite', FB_ID);
    return false;
  }
  console.log('FB: Video gepostet', r.j.id); return r.j.id;
}
// --- Threads Video ---
async function postThreads(videoUrl, caption){
  if(!TH_TOK) return null;
  let uid = TH_ID;
  try{
    const me = await fetch(`https://graph.threads.net/v1.0/me?fields=id&access_token=${encodeURIComponent(TH_TOK)}`);
    const mj = await me.json().catch(()=>({}));
    if(me.ok && mj.id){ uid = mj.id; if(mj.id!==TH_ID) console.log('Threads: User-ID via /me →', mj.id); }
  }catch(e){ /* Netzfehler */ }
  if(!uid){ console.error('Threads: keine User-ID.'); return false; }
  const base = `https://graph.threads.net/v1.0/${uid}`;
  const c = await gpost(`${base}/threads`, { media_type:'VIDEO', video_url:videoUrl, text:caption, access_token:TH_TOK });
  if(!c.ok || !c.j.id){ console.error('Threads container:', c.status, JSON.stringify(c.j.error||c.j)); return false; }
  await waitVideo(`https://graph.threads.net/v1.0/${c.j.id}?fields=status&access_token=${encodeURIComponent(TH_TOK)}`);
  const p = await gpost(`${base}/threads_publish`, { creation_id:c.j.id, access_token:TH_TOK });
  if(!p.ok || !p.j.id){ console.error('Threads publish:', p.status, JSON.stringify(p.j.error||p.j)); return false; }
  console.log('Threads: Video gepostet', p.j.id); return p.j.id;
}

// --- Hauptlauf ---
const configured = [IG_ID&&IG_TOK&&'IG', FB_ID&&FB_TOK&&'FB', TH_TOK&&'Threads'].filter(Boolean);
if(configured.length===0 && !DRY){ console.log('Kein Meta-Kanal konfiguriert → No-op.'); process.exit(0); }
if(!fs.existsSync(CSV)){ console.log('Keine social/video_queue.csv → nichts zu tun.'); process.exit(0); }

const today = new Date().toISOString().slice(0,10);
const rows = parse(fs.readFileSync(CSV,'utf8'));
const header = rows[0];
const idx = Object.fromEntries(COLS.map(c=>[c, header.indexOf(c)]));
const data = rows.slice(1);

const due = data.filter(r => (r[idx.status]||'').trim()==='ready' && (r[idx.video_url]||'').trim()
  && ((r[idx.scheduled_date]||'').trim()==='' || (r[idx.scheduled_date]||'').trim() <= today));
if(due.length===0){ console.log('Kein Video fällig (status=ready, scheduled_date<=heute).'); process.exit(0); }

console.log(`Kanäle: ${configured.join('+')||'(DRY)'} · fällig: ${due.length} · MAX_PER_RUN: ${MAX}`);
let postedCount = 0, anyFail = false;

for(const next of due.slice(0, MAX)){
  const videoUrl = next[idx.video_url].trim();
  const caption = next[idx.caption] || '';
  const plat = (next[idx.platforms]||'').toLowerCase();
  const wantIG = !plat.trim() || /instagram|\big\b/.test(plat);
  const wantFB = !plat.trim() || /facebook|\bfb\b/.test(plat);
  const wantTH = !plat.trim() || /threads/.test(plat);
  console.log(`→ ${next[idx.id]} | ${[wantIG&&'IG',wantFB&&'FB',wantTH&&'Threads'].filter(Boolean).join('+')} | ${videoUrl}`);
  if(DRY){ console.log('   DRY_RUN: würde senden.'); postedCount++; continue; }

  // sequenziell (Video-Verarbeitung ist schwer) statt parallel
  const results = [];
  results.push(wantIG ? await postIG(videoUrl, caption) : null);
  results.push(wantFB ? await postFB(videoUrl, caption) : null);
  results.push(wantTH ? await postThreads(videoUrl, caption) : null);
  const got = results.filter(x => x && x!==false);
  if(got.length>0){
    next[idx.status] = 'posted';
    next[idx.posted_at] = new Date().toISOString();
    next[idx.post_url] = got[0];
    postedCount++;
    console.log(`   ✅ veröffentlicht auf ${results.map((x,i)=>x&&x!==false?['IG','FB','Threads'][i]:null).filter(Boolean).join('+')}`);
  } else {
    anyFail = true;
    console.error('   ❌ kein Kanal erfolgreich — bleibt ready (nächster Lauf erneut).');
  }
}

if(!DRY && postedCount>0) fs.writeFileSync(CSV, serialize(rows));
console.log(`Fertig: ${postedCount} Video(s) gepostet${DRY?' (DRY)':''}.`);
process.exit(anyFail && postedCount===0 ? 1 : 0);
