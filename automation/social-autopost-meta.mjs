#!/usr/bin/env node
/* LuxeStyle — social-autopost-meta.mjs  (PERSISTENTER Meta-Autopilot, committet damit er BLEIBT)
 *
 * Postet den nächsten fälligen BILD-Post (status=ready) aus social/posts_image.csv direkt per
 * Meta-Graph-API an Instagram + Facebook-Page + Threads. KEIN Drittanbieter (kein Buffer/Make).
 * Container→Publish-Flow für IG & Threads; Foto-Endpoint für die FB-Page.
 *
 * ⚠️ JPG-PFLICHT: IG/Threads verlangen eine ÖFFENTLICHE Bild-URL; .webp wird abgelehnt → nur .jpg/.jpeg.
 * ⚠️ THROTTLE: max MAX_PER_RUN Posts pro Lauf (Default 1) → Spam-/Rate-Limit-Schutz.
 * No-op (Exit 0), wenn keine Plattform-Secrets gesetzt sind oder keine Zeile 'ready' ist.
 *
 * Tokens kommen NUR aus GitHub-Actions-Secrets / ENV — NIE im Code. ENV:
 *   META_GRAPH_VERSION   (optional, Default v21.0)
 *   IG_USER_ID           + IG_ACCESS_TOKEN  (oder META_ACCESS_TOKEN)   → Instagram Business
 *   FB_PAGE_ID           + FB_PAGE_ACCESS_TOKEN (oder META_ACCESS_TOKEN) → Facebook-Seite
 *   THREADS_USER_ID      + THREADS_ACCESS_TOKEN                          → Threads
 *   MAX_PER_RUN=1        (optional Throttle)
 *   DRY_RUN=1            (optional: nur loggen, nichts senden/schreiben)
 *
 * Der EINE Schritt für Dauerbetrieb: THREADS_ACCESS_TOKEN (+ IG/FB) als Repo-Secret → Cron postet 2×/Tag.
 */
import fs from 'node:fs';

const CSV = new URL('../social/posts_image.csv', import.meta.url).pathname;
const V = process.env.META_GRAPH_VERSION || 'v21.0';
const DRY = process.env.DRY_RUN === '1';
const MAX = Math.max(1, parseInt(process.env.MAX_PER_RUN || '1', 10) || 1);

const IG_ID = process.env.IG_USER_ID || '';
const IG_TOK = process.env.IG_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
const FB_ID = process.env.FB_PAGE_ID || '';
const FB_PAGE_TOK = process.env.FB_PAGE_ACCESS_TOKEN || '';   // dedizierter Page-Token (Pflicht für FB-Posting)
const FB_TOK = FB_PAGE_TOK || process.env.META_ACCESS_TOKEN || '';
const TH_ID = process.env.THREADS_USER_ID || '';
const TH_TOK = process.env.THREADS_ACCESS_TOKEN || '';

const COLS = ['id','scheduled_date','image_url','caption','platforms','status','posted_at','post_url'];

// --- minimal CSV (RFC-4180-ish, identisch zu post-next-reel.mjs) ---
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

function isJpg(u){ return /\.jpe?g($|\?)/i.test(u); }
async function gget(url){ const r = await fetch(url, {method:'POST'}); const j = await r.json().catch(()=>({})); return {ok:r.ok, status:r.status, j}; }

// --- Plattform-Poster (jeweils null, wenn keine Creds) -----------------------------
async function postIG(imageUrl, caption){
  if(!IG_ID || !IG_TOK) return null;
  const base = `https://graph.facebook.com/${V}/${IG_ID}`;
  const q = new URLSearchParams({ image_url: imageUrl, caption, access_token: IG_TOK });
  const c = await gget(`${base}/media?${q}`);
  if(!c.ok || !c.j.id){ console.error('IG container:', c.status, JSON.stringify(c.j.error||c.j)); return false; }
  const p = await gget(`${base}/media_publish?${new URLSearchParams({ creation_id:c.j.id, access_token:IG_TOK })}`);
  if(!p.ok || !p.j.id){ console.error('IG publish:', p.status, JSON.stringify(p.j.error||p.j)); return false; }
  console.log('IG: gepostet', p.j.id); return p.j.id;
}
async function postFB(imageUrl, caption){
  if(!FB_ID || !FB_TOK) return null;
  // FB-Page-Posting braucht einen PAGE-Token. Ist nur ein User-Token (META_ACCESS_TOKEN) gesetzt,
  // versuchen wir, den Page-Token daraus abzuleiten (geht NUR, wenn das Token pages_manage_posts hat).
  let tok = FB_TOK;
  if(!FB_PAGE_TOK){
    try{
      const pr = await fetch(`https://graph.facebook.com/${V}/${FB_ID}?fields=access_token&access_token=${encodeURIComponent(FB_TOK)}`);
      const pj = await pr.json().catch(()=>({}));
      if(pr.ok && pj.access_token){ tok = pj.access_token; console.log('FB: Page-Token aus User-Token abgeleitet.'); }
    }catch(e){ /* Netzfehler → mit User-Token weiter (scheitert dann mit Hinweis) */ }
  }
  const q = new URLSearchParams({ url: imageUrl, caption, access_token: tok });
  const r = await gget(`https://graph.facebook.com/${V}/${FB_ID}/photos?${q}`);
  if(!r.ok || !(r.j.id||r.j.post_id)){
    const e = r.j.error||r.j;
    console.error('FB photo:', r.status, JSON.stringify(e));
    // Verifiziert 2026-06-07: ohne dedizierten Page-Token kommt (#200) publish_actions deprecated.
    if(!FB_PAGE_TOK && (e?.code===200 || /publish_actions/i.test(e?.message||''))){
      console.error('   ↳ FB-FIX: Nur User-Token (META_ACCESS_TOKEN) gesetzt. Facebook-Page-Posting braucht einen '
        + 'PAGE-Access-Token mit Scope pages_manage_posts → als Secret FB_PAGE_ACCESS_TOKEN hinterlegen (Page '+FB_ID+').');
    }
    return false;
  }
  console.log('FB: gepostet', r.j.post_id||r.j.id); return r.j.post_id||r.j.id;
}
async function postThreads(imageUrl, caption){
  if(!TH_TOK) return null;
  // Threads-User-ID robust aus dem Token auflösen (/me) — vermeidet die häufige Falle einer
  // falsch eingetragenen THREADS_USER_ID (Graph-Fehler 100/Subcode 33). Fallback: gesetzte ID.
  let uid = TH_ID;
  try{
    const me = await fetch(`https://graph.threads.net/v1.0/me?fields=id&access_token=${encodeURIComponent(TH_TOK)}`);
    const mj = await me.json().catch(()=>({}));
    if(me.ok && mj.id){ uid = mj.id; if(mj.id!==TH_ID) console.log('Threads: User-ID via /me aufgelöst →', mj.id); }
    else if(!uid) console.error('Threads /me:', me.status, JSON.stringify(mj.error||mj));
  }catch(e){ /* Netzfehler → mit gesetzter ID weiter */ }
  if(!uid){ console.error('Threads: keine User-ID (weder via /me noch THREADS_USER_ID).'); return false; }
  const base = `https://graph.threads.net/v1.0/${uid}`;
  const q = new URLSearchParams({ media_type:'IMAGE', image_url:imageUrl, text:caption, access_token:TH_TOK });
  const c = await gget(`${base}/threads?${q}`);
  if(!c.ok || !c.j.id){ console.error('Threads container:', c.status, JSON.stringify(c.j.error||c.j)); return false; }
  const p = await gget(`${base}/threads_publish?${new URLSearchParams({ creation_id:c.j.id, access_token:TH_TOK })}`);
  if(!p.ok || !p.j.id){ console.error('Threads publish:', p.status, JSON.stringify(p.j.error||p.j)); return false; }
  console.log('Threads: gepostet', p.j.id); return p.j.id;
}

// --- Hauptlauf ---------------------------------------------------------------------
const configured = [IG_ID&&IG_TOK&&'IG', FB_ID&&FB_TOK&&'FB', TH_TOK&&'Threads'].filter(Boolean);
if(configured.length===0 && !DRY){
  console.log('Kein Meta-Kanal konfiguriert (IG/FB/Threads Secrets fehlen) → No-op. Setze THREADS_ACCESS_TOKEN etc.');
  process.exit(0);
}
if(!fs.existsSync(CSV)){ console.log('Keine social/posts_image.csv vorhanden → nichts zu tun.'); process.exit(0); }

const rows = parse(fs.readFileSync(CSV,'utf8'));
const header = rows[0];
const idx = Object.fromEntries(COLS.map(c=>[c, header.indexOf(c)]));
const data = rows.slice(1);

const ready = data.filter(r => (r[idx.status]||'').trim()==='ready' && (r[idx.image_url]||'').trim());
if(ready.length===0){ console.log('Kein Bild mit status=ready — nichts zu tun.'); process.exit(0); }

console.log(`Konfigurierte Kanäle: ${configured.join('+')||'(keine, DRY)'} · ready: ${ready.length} · MAX_PER_RUN: ${MAX}`);
let postedCount = 0, anyFail = false;

for(const next of ready.slice(0, MAX)){
  const imageUrl = next[idx.image_url].trim();
  const caption = next[idx.caption] || '';
  if(!isJpg(imageUrl)){
    console.error(`⏭️  Übersprungen (keine JPG-URL, Meta-Pflicht): ${imageUrl}`);
    next[idx.status] = 'skipped-nonjpg'; anyFail = true; continue;
  }
  // platforms-Spalte respektieren (leer = alle). So sind gezielte Einzel-Kanal-Posts möglich (z.B. nur FB nachposten).
  const plats = (next[idx.platforms]||'').toLowerCase();
  const want = (...keys) => plats==='' || keys.some(k => plats.includes(k));
  const wIG = want('instagram','ig'), wFB = want('facebook','fb'), wTH = want('threads');
  console.log(`→ Post ${next[idx.id]} | ${imageUrl} | Kanäle: ${[wIG&&'IG',wFB&&'FB',wTH&&'Threads'].filter(Boolean).join('+')||'(keine)'}`);
  if(DRY){ console.log(`   DRY_RUN: würde senden.`); postedCount++; continue; }

  const results = await Promise.all([
    wIG ? postIG(imageUrl,caption) : Promise.resolve(null),
    wFB ? postFB(imageUrl,caption) : Promise.resolve(null),
    wTH ? postThreads(imageUrl,caption) : Promise.resolve(null),
  ]);
  const got = results.filter(x => x && x!==false);
  if(got.length>0){
    next[idx.status] = 'posted';
    next[idx.posted_at] = new Date().toISOString();
    next[idx.post_url] = got[0];
    postedCount++;
    console.log(`   ✅ veröffentlicht auf ${results.map((x,i)=>x&&x!==false?['IG','FB','Threads'][i]:null).filter(Boolean).join('+')}`);
  } else {
    anyFail = true;
    console.error(`   ❌ kein Kanal erfolgreich — bleibt ready (nächster Lauf erneut).`);
  }
}

if(!DRY && postedCount>0) fs.writeFileSync(CSV, serialize(rows));
console.log(`Fertig: ${postedCount} gepostet${DRY?' (DRY)':''}.`);
process.exit(anyFail && postedCount===0 ? 1 : 0);
