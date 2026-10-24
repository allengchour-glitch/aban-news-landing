#!/usr/bin/env node
/* LuxeStyle — metricool-schedule.mjs
 * Plant Posts aus social/metricool_queue.csv über die Metricool-API ein (öffentlich, inkl. TikTok).
 *
 * Metricool-API (offizielle PDF, 04.09.2024):
 *  - Auth: Header  X-Mc-Auth: <userToken>  + Query  userId  &  blogId
 *  - Medien: ZUERST  GET /api/actions/normalize/image/url?url=<MEDIA>&userId=&blogId=
 *            → kopiert Bild/Video auf Metricool-Server, liefert eine URL zurück.
 *  - Posten:  POST /api/v2/scheduler/posts?userId=&blogId=
 *            Body: { publicationDate{dateTime,timezone}, text, providers:[{network}],
 *                    media:[<normalisierte URL>], autoPublish:true }
 *
 * Pinterest verlangt zusätzlich pinterestData{boardId,pinTitle}: dafür die Queue-Spalten
 * pin_board_id, pin_title und (optional) pin_link füllen. Fehlen sie, wird die Zeile mit
 * genanntem Grund NICHT gesendet, statt still zu scheitern (Metricool antwortet sonst HTTP 400).
 *
 * ENV: METRICOOL_USER_TOKEN (Pflicht) · METRICOOL_USER_ID (Default 4801419) ·
 *      METRICOOL_BLOG_ID (explizit erforderlich für Live) · MC_TZ (Default Europe/Zurich) ·
 *      MAX_PER_RUN (Default 50) · DRY_RUN=0 + APPROVE_PUBLISH=1 für Live; sonst Dry-Run.
 * Vor jedem POST wird inflight atomar gespeichert. Antworten ohne bestätigte Post-ID
 * bleiben uncertain: vor einem erneuten Versuch im Metricool-Planer abgleichen.
 */
import fs from 'node:fs';
import path from 'node:path';
import { QueueInputError, readSocialQueue, validateMetricoolRow, validateMediaUrl, parseRunLimit } from './lib/social_queue.mjs';

const TOKEN = process.env.METRICOOL_USER_TOKEN || '';
const USER  = process.env.METRICOOL_USER_ID || '4801419';
const BLOG  = process.env.METRICOOL_BLOG_ID || '';
const TZ    = process.env.MC_TZ || 'Europe/Zurich';
const DRY   = process.env.DRY_RUN !== '0' || process.env.APPROVE_PUBLISH !== '1';
let MAX;
const BASE  = 'https://app.metricool.com/api';
const CSV   = new URL('../social/metricool_queue.csv', import.meta.url).pathname;
const COLS  = ['id','publish_date','media_url','text','networks','status','scheduled_at','note'];
// Nur für Pinterest nötig; fehlende Spalten sind erlaubt und werden leer gelesen.
const PIN_COLS = ['pin_board_id','pin_title','pin_link'];
const RESULT_COLS = ['metricool_post_id', 'metricool_post_uuid', 'request_started_at'];
const TIMEOUT_MS = 60000;

// Validation and parsing are shared with the direct Meta publisher.
const esc = v => { v=String(v??''); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
const serialize = rows => rows.map(r=>r.map(esc).join(',')).join('\n')+'\n';

// Same-directory rename leaves either the old or the complete new queue on disk.
// An inflight row survives a crash after POST but before receiving its response.
function checkpoint(rows) {
  const temp = `${CSV}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
  let fd;
  try {
    fd = fs.openSync(temp, 'wx', 0o600);
    fs.writeFileSync(fd, serialize(rows));
    fs.fsyncSync(fd);
    fs.closeSync(fd); fd = undefined;
    fs.renameSync(temp, CSV);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

function requestError(error) {
  // Do not print a request URL or a token reflected in an upstream exception.
  return String(error?.cause?.code || error?.name || 'RequestError').replace(/[^a-z0-9_-]/gi, '').slice(0, 60);
}

async function normalize(url){
  const u = `${BASE}/actions/normalize/image/url?url=${encodeURIComponent(url)}&userId=${USER}&blogId=${BLOG}`;
  const r = await fetch(u, { headers: { 'X-Mc-Auth': TOKEN }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const txt = await r.text();
  if(!r.ok){ console.error('  normalize HTTP', r.status); return ''; }
  // Antwort ist die URL — evtl. als JSON umhüllt
  let normalized;
  try {
    const j = JSON.parse(txt);
    if (j?.success === false || j?.result === false || j?.error) return '';
    normalized = j?.data?.url || j?.url || j?.data || (typeof j === 'string' ? j : '');
  } catch { normalized = txt.trim().replace(/^"|"$/g,''); }
  if (typeof normalized !== 'string') return '';
  try { return validateMediaUrl(normalized); }
  catch { return ''; }
}

function confirmedPost(txt) {
  let body;
  try { body = JSON.parse(txt); } catch { return null; }
  if (!body || body.success === false || body.result === false || body.error || body.errors?.length) return null;
  const post = body.data?.post || body.data || body.post || body;
  if (!post || post.draft === true || post.autoPublish === false || post.success === false || post.result === false || post.error) return null;
  const id = post.id;
  const uuid = post.uuid;
  const validId = (typeof id === 'number' && Number.isSafeInteger(id) && id > 0) ||
    (typeof id === 'string' && /^[1-9]\d*$/.test(id));
  const validUuid = typeof uuid === 'string' && /^-?[0-9]+$|^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(uuid);
  return validId || validUuid ? { id: validId ? String(id) : '', uuid: validUuid ? uuid : '' } : null;
}

async function schedule(row, beforePost){
  let norm;
  try { norm = await normalize(row.media_url); }
  catch (error) {
    console.error(`  ✗ Normalisierungs-Anfrage fehlgeschlagen (${requestError(error)}): ${row.id}; kein POST gesendet.`);
    return { status: 'not_sent' };
  }
  if(!norm){ console.error('  ✗ Medium-Normalisierung fehlgeschlagen:', row.id); return { status: 'not_sent' }; }
  const providers = row.networks.split(/[;, ]+/).map(s=>s.trim()).filter(Boolean).map(n=>({ network:n }));
  if (!providers.length) { console.error('  ✗ Zielkanal fehlt:', row.id); return { status: 'not_sent' }; }
  const body = {
    publicationDate: { dateTime: row.publish_date, timezone: TZ },
    text: row.text,
    providers,
    media: [norm],
    autoPublish: true,
    draft: false,
    shortener: false,
  };
  if (providers.some(p=>p.network==='instagram')) body.instagramData = { autoPublish: true };
  if (providers.some(p=>p.network==='tiktok'))    body.tiktokData    = { autoPublish: true };
  // A media download may take long enough for a previously future slot to expire.
  validateMetricoolRow(row, { timeZone:TZ });
  if (providers.some(p=>p.network==='pinterest')) {
    // Ohne Board und Pin-Titel lehnt Metricool den Pin ab; das soll die Zeile laut beenden.
    if (!row.pin_board_id || !row.pin_title) {
      console.error(`  ✗ Pinterest ohne pin_board_id/pin_title: ${row.id}; kein POST gesendet.`);
      return { status: 'not_sent' };
    }
    body.pinterestData = { boardId: row.pin_board_id, pinTitle: row.pin_title, pinNewFormat: true };
    if (row.pin_link) body.pinterestData.pinLink = row.pin_link;
  }
  beforePost(); // If this checkpoint fails, no publication request is made.
  let r, txt;
  try {
    r = await fetch(`${BASE}/v2/scheduler/posts?userId=${USER}&blogId=${BLOG}`,
      { method:'POST', headers:{ 'X-Mc-Auth':TOKEN, 'Content-Type':'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
    txt = await r.text();
  } catch (error) {
    console.error(`  ✗ Planungs-Anfrage unbestätigt (${requestError(error)}): ${row.id}; vor Wiederholung in Metricool abgleichen.`);
    return { status: 'uncertain', note: `Metricool: POST unbestätigt (${requestError(error)}); im Planer abgleichen, nicht automatisch wiederholen.` };
  }
  const post = r.ok ? confirmedPost(txt) : null;
  if(!post){
    console.error(`  ✗ Planung nicht bestätigt (HTTP ${r.status}, keine sichere Post-ID): ${row.id}; in Metricool abgleichen.`);
    return { status: 'uncertain', note: `Metricool: HTTP ${r.status}, keine sichere Planungsbestätigung; im Planer abgleichen, nicht automatisch wiederholen.` };
  }
  console.log('  ✓ geplant:', row.id, '→', providers.map(p=>p.network).join('+'), '@', row.publish_date);
  return { status: 'scheduled', ...post };
}

// --- Hauptlauf ---
async function runQueue() {
const { rows, header } = readSocialQueue(fs.readFileSync(CSV,'utf8'), COLS);
for (const col of RESULT_COLS) {
  if (!header.includes(col)) {
    const column = header.length;
    header.push(col);
    for (const row of rows.slice(1)) row[column] = '';
  }
}
const idx = Object.fromEntries([...COLS, ...RESULT_COLS, ...PIN_COLS].map(c=>[c, header.indexOf(c)]));
const data = rows.slice(1);
const get = (r,k)=> (r[idx[k]]||'').trim();
const unresolved = data.filter(r => ['inflight', 'uncertain'].includes(get(r,'status')));
if (unresolved.length) console.error(`Metricool: ${unresolved.length} unbestätigte Zeile(n) gesperrt; vor Wiederholung im Planer abgleichen.`);
const ready = data.filter(r => get(r,'status')==='ready');
const prepared = new Map();
// Validate every ready row before sending the first request, including rows past
// MAX_PER_RUN. Missing fields must produce an error rather than disappear as no-op.
for (let i = 0; i < data.length; i++) {
  const source = data[i];
  if (get(source,'status') !== 'ready') continue;
  // PIN_COLS muessen mit: ohne sie fehlen dem Pinterest-Guard board/title und KEIN Pin
  // ginge mehr raus. `validateMetricoolRow` liest nur die Pflichtfelder, zusaetzliche
  // Schluessel stoeren es nicht.
  const record = Object.fromEntries([...COLS, ...PIN_COLS].map(key => [key, get(source,key)]));
  const validation = validateMetricoolRow(record, { row:i + 2, timeZone:TZ });
  record.networks = validation.networks.join(' ');
  record.media_url = validation.mediaUrl;
  prepared.set(source, record);
}
if(ready.length===0){ console.log('Nichts mit status=ready.'); return unresolved.length ? 1 : 0; }

console.log(`Metricool: ${ready.length} Posts · userId=${USER} blogId=${BLOG} · TZ=${TZ}${DRY?' · DRY':''}`);
let done=0, fail=unresolved.length > 0;
for(const r of ready.slice(0,MAX)){
  const row = prepared.get(r);
  console.log(`→ ${row.id} (${row.networks})`);
  if(DRY){ console.log('  DRY: würde normalisieren + planen'); done++; continue; }
  const result = await schedule(row, () => {
    r[idx.status] = 'inflight';
    r[idx.request_started_at] = new Date().toISOString();
    checkpoint(rows);
  });
  if(result.status === 'scheduled'){
    r[idx.status]='scheduled'; r[idx.scheduled_at]=new Date().toISOString();
    r[idx.metricool_post_id]=result.id; r[idx.metricool_post_uuid]=result.uuid;
    checkpoint(rows);
    done++;
  } else {
    fail=true;
    if (result.status === 'uncertain') {
      r[idx.status]='uncertain';
      r[idx.note]=[get(r,'note'), result.note].filter(Boolean).join(' | ');
      checkpoint(rows);
    }
  }
}
console.log(`Fertig: ${done} geplant${DRY?' (DRY)':''}.`);
return fail ? 1 : 0;
}

async function main() {
  MAX = parseRunLimit(process.env.MAX_PER_RUN, 50);
  if (MAX === 0) { console.log('MAX_PER_RUN=0 → pausiert, keine Planung.'); return 0; }
  if (!DRY && (!TOKEN || !BLOG || !process.env.METRICOOL_USER_ID)) {
    console.error('Metricool: Token, User-ID und verifizierte Marken-ID für Live explizit setzen.');
    return 1;
  }
  if (!fs.existsSync(CSV)) { console.log('Keine metricool_queue.csv → No-op.'); return 0; }
  // All live invocations share one lock, including runs started outside Actions.
  const lock = path.join(path.dirname(CSV), 'metricool_queue.csv.lock');
  let lockFd;
  try {
    if (!DRY) {
      try { lockFd = fs.openSync(lock, 'wx', 0o600); }
      catch (error) {
        if (error.code === 'EEXIST') {
          console.error('Metricool-Queue gesperrt: anderer Lauf aktiv oder abgebrochen. Prozess und inflight-Zeilen prüfen, bevor die Sperrdatei entfernt wird.');
          return 1;
        }
        throw error;
      }
      fs.writeFileSync(lockFd, String(process.pid));
    }
    return await runQueue();
  } finally {
    if (lockFd !== undefined) { fs.closeSync(lockFd); fs.unlinkSync(lock); }
  }
}

try { process.exitCode = await main(); }
catch (error) {
  console.error(error instanceof QueueInputError ? error.message :
    `Metricool-Lauf abgebrochen (${requestError(error)}). Queue und inflight-Zeilen vor einem erneuten Versuch prüfen.`);
  process.exitCode = 1;
}
