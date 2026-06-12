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
 * ENV: METRICOOL_USER_TOKEN (Pflicht) · METRICOOL_USER_ID (Default 4801419) ·
 *      METRICOOL_BLOG_ID (Default 6394001) · MC_TZ (Default Europe/Zurich) ·
 *      MAX_PER_RUN (Default 50) · DRY_RUN=1
 */
import fs from 'node:fs';

const TOKEN = process.env.METRICOOL_USER_TOKEN || '';
const USER  = process.env.METRICOOL_USER_ID || '4801419';
const BLOG  = process.env.METRICOOL_BLOG_ID || '6394001';
const TZ    = process.env.MC_TZ || 'Europe/Zurich';
const DRY   = process.env.DRY_RUN === '1';
const MAX   = Math.max(1, parseInt(process.env.MAX_PER_RUN || '50', 10) || 50);
const BASE  = 'https://app.metricool.com/api';
const CSV   = new URL('../social/metricool_queue.csv', import.meta.url).pathname;
const COLS  = ['id','publish_date','media_url','text','networks','status','scheduled_at','note'];

if (!TOKEN && !DRY) { console.log('Kein METRICOOL_USER_TOKEN → No-op.'); process.exit(0); }
if (!fs.existsSync(CSV)) { console.log('Keine metricool_queue.csv → No-op.'); process.exit(0); }

// --- CSV (gleiche Mechanik wie die anderen Poster) ---
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
const esc = v => { v=String(v??''); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
const serialize = rows => rows.map(r=>r.map(esc).join(',')).join('\n')+'\n';

async function normalize(url){
  const u = `${BASE}/actions/normalize/image/url?url=${encodeURIComponent(url)}&userId=${USER}&blogId=${BLOG}`;
  const r = await fetch(u, { headers: { 'X-Mc-Auth': TOKEN } });
  const txt = await r.text();
  if(!r.ok){ console.error('  normalize', r.status, txt.slice(0,200)); return ''; }
  // Antwort ist die URL — evtl. als JSON umhüllt
  try { const j = JSON.parse(txt); return j.data?.url || j.url || j.data || (typeof j==='string'?j:''); }
  catch { return txt.trim().replace(/^"|"$/g,''); }
}

async function schedule(row){
  const norm = await normalize(row.media_url);
  if(!norm){ console.error('  ✗ Medium-Normalisierung fehlgeschlagen:', row.id); return false; }
  const providers = row.networks.split(/[;, ]+/).map(s=>s.trim()).filter(Boolean).map(n=>({ network:n }));
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
  const r = await fetch(`${BASE}/v2/scheduler/posts?userId=${USER}&blogId=${BLOG}`,
    { method:'POST', headers:{ 'X-Mc-Auth':TOKEN, 'Content-Type':'application/json' }, body: JSON.stringify(body) });
  const txt = await r.text();
  if(!r.ok){ console.error('  ✗ schedule', r.status, txt.slice(0,300)); return false; }
  console.log('  ✓ geplant:', row.id, '→', providers.map(p=>p.network).join('+'), '@', row.publish_date);
  return true;
}

// --- Hauptlauf ---
const rows = parse(fs.readFileSync(CSV,'utf8'));
const header = rows[0];
const idx = Object.fromEntries(COLS.map(c=>[c, header.indexOf(c)]));
const data = rows.slice(1);
const get = (r,k)=> (r[idx[k]]||'').trim();
const ready = data.filter(r => get(r,'status')==='ready' && get(r,'media_url') && get(r,'publish_date'));
if(ready.length===0){ console.log('Nichts mit status=ready.'); process.exit(0); }

console.log(`Metricool: ${ready.length} Posts · userId=${USER} blogId=${BLOG} · TZ=${TZ}${DRY?' · DRY':''}`);
let done=0, fail=false;
for(const r of ready.slice(0,MAX)){
  const row = { id:get(r,'id'), publish_date:get(r,'publish_date'), media_url:get(r,'media_url'),
                text:get(r,'text'), networks:get(r,'networks') };
  console.log(`→ ${row.id} (${row.networks})`);
  if(DRY){ console.log('  DRY: würde normalisieren + planen'); done++; continue; }
  const ok = await schedule(row);
  if(ok){ r[idx.status]='scheduled'; r[idx.scheduled_at]=new Date().toISOString(); done++; }
  else { fail=true; }
}
if(!DRY && done>0) fs.writeFileSync(CSV, serialize(rows));
console.log(`Fertig: ${done} geplant${DRY?' (DRY)':''}.`);
process.exit(fail && done===0 ? 1 : 0);
