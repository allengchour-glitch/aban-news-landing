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
 *   THREADS_USER_ID      + THREADS_ACCESS_TOKEN                          → Threads (ID wird notfalls via /me aufgelöst)
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
const FB_TOK = process.env.FB_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
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
async function gpost(url, params){
  const body = new URLSearchParams(params);
  const r = await fetch(url, {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body});
  const j = await r.json().catch(()=>({}));
  return {ok:r.ok, status:r.status, j};
}

// --- Plattform-Poster (jeweils null, wenn keine Creds) -----------------------------
async function postIG(imageUrl, caption){
  if(!IG_ID || !IG_TOK) return null;
  const base = `https://graph.facebook.com/${V}/${IG_ID}`;
  const c = await gpost(`${base}/media`, { image_url: imageUrl, caption, access_token: IG_TOK });
  if(!c.ok || !c.j.id){ console.error('IG container:', c.status, JSON.stringify(c.j.error||c.j)); return false; }
  const p = await gpost(`${base}/media_publish`, { creation_id:c.j.id, access_token:IG_TOK });
  if(!p.ok || !p.j.id){ console.error('IG publish:', p.status, JSON.stringify(p.j.error||p.j)); return false; }
  console.log('IG: gepostet', p.j.id); return p.j.id;
}
async function postFB(imageUrl, caption){
  if(!FB_ID || !FB_TOK) return null;
  // Page-Access-Token auto-holen: User-Token → /me/accounts → Page-Token mit pages_manage_posts.
  // Nötig weil ein normaler User-Token aus dem Graph-API-Explorer "publish_actions" triggert (deprecated).
  let tok = FB_TOK;
  try{
    const ar = await fetch(`https://graph.facebook.com/${V}/me/accounts?access_token=${encodeURIComponent(FB_TOK)}`);
    const aj = await ar.json().catch(()=>({}));
    if(ar.ok && Array.isArray(aj.data)){
      const pg = aj.data.find(p => p.id === FB_ID);
      if(pg?.access_token){ tok = pg.access_token; console.log('FB: Page-Token via /me/accounts geholt.'); }
      else console.log('FB: Seite', FB_ID, 'nicht in /me/accounts gefunden — nutze Original-Token.');
    }
  }catch(e){ /* Netzfehler → Fallback auf Original-Token */ }
  const r = await gpost(`https://graph.facebook.com/${V}/${FB_ID}/photos`,
    { url: imageUrl, message: caption, access_token: tok });
  if(!r.ok || !(r.j.id||r.j.post_id)){
    console.error('FB photo:', r.status, JSON.stringify(r.j.error||r.j));
    if(r.status===403) console.error('FB-Tipp: Token braucht Scope "pages_manage_posts" + Admin-Rolle auf Seite', FB_ID, '— im Graph-API-Explorer neu generieren mit pages_manage_posts + pages_read_engagement.');
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
  const c = await gpost(`${base}/threads`, { media_type:'IMAGE', image_url:imageUrl, text:caption, access_token:TH_TOK });
  if(!c.ok || !c.j.id){ console.error('Threads container:', c.status, JSON.stringify(c.j.error||c.j)); return false; }
  const p = await gpost(`${base}/threads_publish`, { creation_id:c.j.id, access_token:TH_TOK });
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
  console.log(`→ Post ${next[idx.id]} | ${imageUrl}`);
  if(DRY){ console.log(`   DRY_RUN: würde an ${configured.join('+')||'(keine)'} senden.`); postedCount++; continue; }

  const results = await Promise.all([ postIG(imageUrl,caption), postFB(imageUrl,caption), postThreads(imageUrl,caption) ]);
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
