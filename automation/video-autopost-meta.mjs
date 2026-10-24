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
 * Finale Publish-Anfragen werden pro Kanal vorab als inflight gespeichert.
 * inflight/uncertain erst mit dem Plattformkonto abgleichen, niemals blind wiederholen.
 */
import fs from 'node:fs';
import { QueueInputError, readSocialQueue, validateMetaRow, localDateInZone, parseRunLimit } from './lib/social_queue.mjs';

const CSV = new URL('../social/video_queue.csv', import.meta.url).pathname;
const V = process.env.META_GRAPH_VERSION || 'v21.0';
const DRY = process.env.DRY_RUN !== '0' || process.env.APPROVE_PUBLISH !== '1';
let MAX;
const TZ = process.env.SOCIAL_TZ || process.env.MC_TZ || 'Europe/Zurich';
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
const SKIP_THREADS = process.env.SKIP_THREADS === '1';  // Threads-Drossel (s. social-autopost-meta.mjs)

const COLS = ['id','scheduled_date','video_url','caption','platforms','status','posted_at','post_url'];

// Validation and parsing are shared with the Metricool publisher.
function esc(v){ v=String(v??''); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }
function serialize(rows){ return rows.map(r=>r.map(esc).join(',')).join('\n')+'\n'; }

class QueueCheckpointError extends Error {}
function checkpoint(rows) {
  const temp = `${CSV}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
  let fd;
  try {
    fd = fs.openSync(temp, 'wx', 0o600);
    fs.writeFileSync(fd, serialize(rows));
    fs.fsyncSync(fd);
    fs.closeSync(fd); fd = undefined;
    fs.renameSync(temp, CSV);
  } catch (error) {
    throw new QueueCheckpointError(`Queue-Checkpoint fehlgeschlagen (${safeError(error)})`);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}
function safeError(error) {
  return String(error?.cause?.code || error?.code || error?.name || 'RequestError').replace(/[^a-z0-9_-]/gi, '').slice(0, 60);
}
function confirmed(value) {
  return (typeof value === 'string' && value.trim().length > 0) ||
    (typeof value === 'number' && Number.isSafeInteger(value) && value > 0);
}
function uncertain(value) { return value && typeof value === 'object' && ['inflight', 'uncertain'].includes(value.status); }
function failed(reason, details = {}) { return { ...details, status: 'failed', reason, retryable: true }; }

async function gpost(url, params){
  const body = new URLSearchParams(params);
  const r = await fetch(url, {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body, signal:AbortSignal.timeout(60000)});
  const j = await r.json().catch(()=>({}));
  return {ok:r.ok, status:r.status, j};
}

async function publishFinal(name, url, params, beforePublish, details = {}) {
  // Must be outside the request catch: a failed disk write must prevent the POST.
  beforePublish({ ...details, status: 'inflight', phase: 'publish', started_at: new Date().toISOString() });
  let response;
  try { response = await gpost(url, params); }
  catch (error) {
    console.error(`${name}: Publish-Antwort unbestätigt (${safeError(error)}); im Konto abgleichen.`);
    return { ...details, status: 'uncertain', phase: 'publish', reason: 'request_unconfirmed' };
  }
  if (response.ok && confirmed(response.j?.id) && !response.j?.error) return response.j.id;
  // A Graph API rejection is safe to retry. A server error or unusable success
  // response can follow a completed write, so it must never be retried blindly.
  if (response.status >= 400 && response.status < 500 && response.j?.error) {
    console.error(`${name}: Publish abgelehnt (HTTP ${response.status}); Kanal bleibt wiederholbar.`);
    return failed('api_rejected', { ...details, phase: 'publish', http_status: response.status });
  }
  console.error(`${name}: Publish nicht bestätigt (HTTP ${response.status}); im Konto abgleichen.`);
  return { ...details, status: 'uncertain', phase: 'publish', reason: 'response_unconfirmed', http_status: response.status };
}
// Video braucht länger zum Verarbeiten als ein Bild → großzügiger pollen (bis ~3.5 Min).
async function waitVideo(statusUrl){
  for(let i=0;i<42;i++){
    await new Promise(r=>setTimeout(r, i===0?4000:5000));
    const r = await fetch(statusUrl, { signal:AbortSignal.timeout(60000) }).catch(()=>null);
    const j = r ? await r.json().catch(()=>({})) : {};
    const s = j.status_code || j.status;
    if(r?.ok && s==='FINISHED') return true;
    if(s==='ERROR' || s==='EXPIRED'){ console.error('Container-Status:', s); return false; }
  }
  console.error('Video-Verarbeitung Timeout — nicht veröffentlichen.');
  return false;
}

// --- Instagram Reel ---
async function postIG(videoUrl, caption, beforePublish){
  if(!IG_ID || !IG_TOK) return failed('missing_credentials');
  const base = `https://graph.facebook.com/${V}/${IG_ID}`;
  const c = await gpost(`${base}/media`, { media_type:'REELS', video_url:videoUrl, caption, share_to_feed:'true', thumb_offset:THUMB_MS, access_token:IG_TOK });
  if(!c.ok || !confirmed(c.j?.id)){ console.error('IG container: HTTP', c.status); return failed('container_failed'); }
  if (!await waitVideo(`https://graph.facebook.com/${V}/${c.j.id}?fields=status_code,status&access_token=${encodeURIComponent(IG_TOK)}`)) return failed('processing_failed');
  return publishFinal('IG', `${base}/media_publish`, { creation_id:c.j.id, access_token:IG_TOK }, beforePublish, {container_id:c.j.id});
}
// --- Facebook-Page Video ---
async function postFB(videoUrl, caption, beforePublish){
  if(!FB_ID || !FB_TOK) return failed('missing_credentials');
  let tok = FB_TOK; // Page-Token via /me/accounts holen (User-Token allein triggert deprecated-Recht)
  try{
    const ar = await fetch(`https://graph.facebook.com/${V}/me/accounts?access_token=${encodeURIComponent(FB_TOK)}`, { signal:AbortSignal.timeout(60000) });
    const aj = await ar.json().catch(()=>({}));
    if(ar.ok && Array.isArray(aj.data)){
      const pg = aj.data.find(p => p.id === FB_ID);
      if(pg?.access_token){ tok = pg.access_token; console.log('FB: Page-Token via /me/accounts geholt.'); }
      else console.log('FB: Seite', FB_ID, 'nicht in /me/accounts — nutze Original-Token.');
    }
  }catch(e){ /* Netzfehler → Original-Token */ }
  return publishFinal('FB', `https://graph.facebook.com/${V}/${FB_ID}/videos`,
    { file_url: videoUrl, description: caption, access_token: tok }, beforePublish);
}
// --- Threads Video ---
async function postThreads(videoUrl, caption, beforePublish){
  if(!TH_TOK) return failed('missing_credentials');
  let uid = TH_ID;
  try{
    const me = await fetch(`https://graph.threads.net/v1.0/me?fields=id&access_token=${encodeURIComponent(TH_TOK)}`, { signal:AbortSignal.timeout(60000) });
    const mj = await me.json().catch(()=>({}));
    if(me.ok && mj.id){ uid = mj.id; if(mj.id!==TH_ID) console.log('Threads: User-ID via /me →', mj.id); }
  }catch(e){ /* Netzfehler */ }
  if(!uid){ console.error('Threads: keine User-ID.'); return failed('missing_user_id'); }
  const base = `https://graph.threads.net/v1.0/${uid}`;
  const c = await gpost(`${base}/threads`, { media_type:'VIDEO', video_url:videoUrl, text:caption, access_token:TH_TOK });
  if(!c.ok || !confirmed(c.j?.id)){ console.error('Threads container: HTTP', c.status); return failed('container_failed'); }
  if (!await waitVideo(`https://graph.threads.net/v1.0/${c.j.id}?fields=status&access_token=${encodeURIComponent(TH_TOK)}`)) return failed('processing_failed');
  return publishFinal('Threads', `${base}/threads_publish`, { creation_id:c.j.id, access_token:TH_TOK }, beforePublish, {container_id:c.j.id});
}

// --- Hauptlauf ---
async function runQueue(configured) {
const today = localDateInZone(TZ);
const { rows, header } = readSocialQueue(fs.readFileSync(CSV,'utf8'), COLS);
if (!header.includes('platform_results')) {
  const column = header.length;
  header.push('platform_results');
  for (const row of rows.slice(1)) row[column] = '';
}
const idx = Object.fromEntries(COLS.map(c=>[c, header.indexOf(c)]));
const resultIndex = header.indexOf('platform_results');
const data = rows.slice(1);

const prepared = new Map();
for (let i = 0; i < data.length; i++) {
  const source = data[i];
  if (!['ready', 'partial', 'uncertain'].includes((source[idx.status] || '').trim())) continue;
  const record = Object.fromEntries(COLS.map(key => [key, source[idx[key]] || '']));
  prepared.set(source, validateMetaRow(record, { row:i + 2, skipThreads:SKIP_THREADS }));
}
const due = data.filter(source => {
  const record = prepared.get(source);
  return record && (!record.scheduledDate || record.scheduledDate <= today);
});
if(due.length===0){ console.log('Kein Video fällig (status=ready, scheduled_date<=heute).'); return 0; }

console.log(`Kanäle: ${configured.join('+')||'(DRY)'} · fällig: ${due.length} · MAX_PER_RUN: ${MAX}`);
let postedCount = 0, anyFail = false;

for(const next of due.slice(0, MAX)){
  const { mediaUrl:videoUrl, networks } = prepared.get(next);
  const caption = next[idx.caption] || '';
  const wantIG = networks.includes('instagram');
  const wantFB = networks.includes('facebook');
  const wantTH = !SKIP_THREADS && networks.includes('threads');
  console.log(`→ ${next[idx.id]} | ${[wantIG&&'IG',wantFB&&'FB',wantTH&&'Threads'].filter(Boolean).join('+')}`);
  if(DRY){ console.log('   DRY_RUN: würde senden.'); postedCount++; continue; }

  // Jeden bestätigten Kanal sofort speichern. Ein späterer Fehler darf weder den
  // fehlenden Kanal verschlucken noch beim nächsten Lauf den erfolgreichen doppeln.
  let results = {};
  try { results = JSON.parse(next[resultIndex] || '{}'); }
  catch { throw new Error('Video-Queue: ungültiges platform_results-Ledger'); }
  if (!results || Array.isArray(results) || typeof results !== 'object') throw new Error('Video-Queue: ungültiges Kanal-Ledger');
  for (const value of Object.values(results)) {
    if (!confirmed(value) && !(value && typeof value === 'object' && !Array.isArray(value) &&
      ['inflight', 'uncertain', 'failed'].includes(value.status))) throw new Error('Video-Queue: ungültiger Kanal-Status');
  }
  const persist = () => {
    next[resultIndex] = JSON.stringify(results);
    next[idx.status] = Object.values(results).some(uncertain) ? 'uncertain' : 'partial';
    next[idx.post_url] = String(Object.values(results).find(confirmed) || '');
    checkpoint(rows);
  };
  const selected = [['IG', wantIG, postIG], ['FB', wantFB, postFB], ['Threads', wantTH, postThreads]]
    .filter(([, wanted]) => wanted);
  if (!selected.length) { anyFail = true; console.error('Kein unterstützter Zielkanal gewählt.'); continue; }
  for (const [name, , publish] of selected) {
    if (confirmed(results[name])) { console.log(`   ${name}: bereits bestätigt, übersprungen`); continue; }
    if (uncertain(results[name]) || results[name]?.retryable === false) {
      anyFail = true;
      console.error(`   ${name}: ${results[name].status}, gesperrt; vor Wiederholung im Konto abgleichen.`);
      continue;
    }
    let result;
    try {
      result = await publish(videoUrl, caption, pending => { results[name] = pending; persist(); });
    } catch (error) {
      if (error instanceof QueueCheckpointError) throw error;
      console.error(`   ${name}: Fehler vor Veröffentlichung (${safeError(error)}), Kanal bleibt wiederholbar.`);
      result = failed('prepublish_request_failed');
    }
    results[name] = result;
    persist();
    if (confirmed(result)) console.log(`${name}: Video gepostet`, result);
    else anyFail = true;
  }
  if (selected.every(([name]) => confirmed(results[name])) && !Object.values(results).some(uncertain)) {
    next[idx.status] = 'posted';
    next[idx.posted_at] = new Date().toISOString();
    postedCount++;
    checkpoint(rows);
  } else {
    anyFail = true;
    console.error('Noch offene Kanäle; nur eindeutig fehlgeschlagene Versuche werden automatisch erneut bearbeitet.');
  }
}

console.log(`Fertig: ${postedCount} Video(s) gepostet${DRY?' (DRY)':''}.`);
return anyFail ? 1 : 0;
}

async function main() {
  MAX = parseRunLimit(process.env.MAX_PER_RUN, 1);
  if (MAX === 0) { console.log('MAX_PER_RUN=0 → pausiert, keine Veröffentlichung.'); return 0; }
  const configured = [IG_ID&&IG_TOK&&'IG', FB_ID&&FB_TOK&&'FB', TH_TOK&&'Threads'].filter(Boolean);
  if(configured.length===0 && !DRY){ console.log('Kein Meta-Kanal konfiguriert → No-op.'); return 0; }
  if(!fs.existsSync(CSV)){ console.log('Keine social/video_queue.csv → nichts zu tun.'); return 0; }
  const lock = `${CSV}.lock`;
  let lockFd;
  try {
    if (!DRY) {
      try { lockFd = fs.openSync(lock, 'wx', 0o600); }
      catch (error) {
        if (error.code === 'EEXIST') {
          console.error('Video-Queue gesperrt: aktiven/abgebrochenen Lauf und inflight-Kanäle prüfen, bevor die Sperre entfernt wird.');
          return 1;
        }
        throw error;
      }
      fs.writeFileSync(lockFd, String(process.pid));
    }
    return await runQueue(configured);
  } finally {
    if (lockFd !== undefined) { fs.closeSync(lockFd); fs.unlinkSync(lock); }
  }
}

try { process.exitCode = await main(); }
catch (error) {
  console.error(error instanceof QueueInputError ? error.message :
    `Meta-Lauf abgebrochen (${safeError(error)}). Queue und unbestätigte Kanäle vor Wiederholung prüfen.`);
  process.exitCode = 1;
}
