#!/usr/bin/env node
/* LuxeStyle — veo-hero-clip.mjs  (Veo-Fast Hero-Clip-Generator, Bild → Video)
 *
 * Nimmt ein Produktbild aus automation/good_products.csv, lässt Veo (über die Gemini-API) daraus
 * einen kurzen, CINEASTISCHEN 9:16-Clip rendern ("echte" Kamerafahrt statt Standbild-Zoom → wackelt
 * nicht) und legt ihn als reels/veo-hero-<name>-<datum>.mp4 ab. Danach wird der Clip als
 * status=ready-Zeile in automation/reels_seed.csv eingereiht (Caption inkl. PRODUKTLINK) — der
 * Reel-Autopilot (reel-autopost.yml / post-next-reel.mjs, und nach Audit tiktok-autopost.yml) postet ihn.
 *
 * ⚠️ Veo KOSTET pro Sekunde → Default ist die GÜNSTIGE Veo-Fast-Variante; MAX_CLIPS (Default 1).
 * No-op-safe: ohne GEMINI_API_KEY sauberer Leerlauf.
 *
 * ENV: GEMINI_API_KEY (Pflicht) · VEO_MODEL (Default veo-3.0-fast-generate-001) · VEO_ONLY (ein name) ·
 *      MAX_CLIPS (Default 1) · VEO_ASPECT (Default 9:16) · VEO_SECONDS (Default 8) ·
 *      OUT_BASE_URL (Default https://abannews.com) · SITE_URL (Default https://luxestyle.ch) · DRY_RUN=1
 *
 * Hinweis Bild→Video: die Gemini-REST-API erwartet das Referenzbild als image.bytesBase64Encoded
 * (NICHT imageBytes — das ist nur der Python-SDK-Feldname).
 */
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.VEO_MODEL || 'veo-3.0-fast-generate-001';
const ASPECT = process.env.VEO_ASPECT || '9:16';
const SECONDS = parseInt(process.env.VEO_SECONDS || '8', 10) || 8;
const MAX = Math.max(1, parseInt(process.env.MAX_CLIPS || '1', 10) || 1);
const ONLY = (process.env.VEO_ONLY || '').trim();
const OUT_BASE = (process.env.OUT_BASE_URL || 'https://abannews.com').replace(/\/$/, '');
const SITE = (process.env.SITE_URL || 'https://luxestyle.ch').replace(/\/$/, '');
const DRY = process.env.DRY_RUN === '1';
const BASE = 'https://generativelanguage.googleapis.com/v1beta';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.dirname(HERE);
const CSV = path.join(HERE, 'good_products.csv');
const REELS_CSV = path.join(HERE, 'reels_seed.csv');
const OUT_DIR = path.join(ROOT, 'reels');
const POINTER = path.join(HERE, '.veo_pointer');

if(!KEY && !DRY){ console.log('Kein GEMINI_API_KEY → No-op. Setze GEMINI_API_KEY (Projekt mit Billing).'); process.exit(0); }
if(!fs.existsSync(CSV)){ console.log('good_products.csv fehlt → No-op.'); process.exit(0); }

// --- good_products.csv (name,image_url,label,handle) ---
function readGood(){
  return fs.readFileSync(CSV,'utf8').split('\n').filter(Boolean).slice(1).map(line => {
    const [name, image_url, label, handle] = line.split(',');
    return { name:(name||'').trim(), image_url:(image_url||'').trim(), label:(label||'').trim(), handle:(handle||'').trim() };
  }).filter(p => p.name && p.image_url);
}
function loadPointer(n){ try{ return parseInt(fs.readFileSync(POINTER,'utf8').trim(),10) % n; }catch{ return 0; } }
function esc(v){ v=String(v??''); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }

const REEL_HASHTAGS = '#schweizmode #sommerkleid #ootdschweiz #fashiontiktokschweiz #luxestyle';
function buildPrompt(label){
  return `Cinematic fashion product video for a premium Swiss online boutique. Subject: ${label}. `
    + `Slow, smooth, elegant camera move (gentle dolly-in and subtle parallax), soft natural daylight, `
    + `shallow depth of field, warm premium color grading, luxury editorial mood. The product stays true `
    + `to the reference image — same colours, same design, no distortion. No text, no logos, no watermark. `
    + `Steady, stabilized footage (no shaking). Vertical 9:16, high quality.`;
}

async function fetchImageBase64(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error(`Bild-Download ${url} → HTTP ${r.status}`);
  const ct = r.headers.get('content-type') || (url.endsWith('.webp')?'image/webp':'image/jpeg');
  return { b64: Buffer.from(await r.arrayBuffer()).toString('base64'), mime: ct.split(';')[0] };
}
async function startVeo(prompt, img){
  const url = `${BASE}/models/${MODEL}:predictLongRunning?key=${encodeURIComponent(KEY)}`;
  const body = { instances: [{ prompt, image: { bytesBase64Encoded: img.b64, mimeType: img.mime } }],
                 parameters: { aspectRatio: ASPECT, durationSeconds: SECONDS, personGeneration: 'allow_adult', sampleCount: 1 } };
  const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const j = await r.json().catch(()=>({}));
  if(!r.ok || !j.name){ console.error('Veo start:', r.status, JSON.stringify(j).slice(0,500)); return null; }
  console.log('Veo-Job gestartet:', j.name); return j.name;
}
async function pollVeo(opName){
  const url = `${BASE}/${opName}?key=${encodeURIComponent(KEY)}`;
  for(let i=0;i<60;i++){
    await new Promise(res=>setTimeout(res, 10000));
    const r = await fetch(url); const j = await r.json().catch(()=>({}));
    if(j.done){ if(j.error){ console.error('Veo-Fehler:', JSON.stringify(j.error).slice(0,400)); return null; }
      console.log('Veo fertig nach', (i+1)*10, 's.'); return j.response || j; }
    if(i%3===0) console.log('… Veo rendert noch', (i+1)*10, 's');
  }
  console.error('Veo-Timeout.'); return null;
}
function extractVideo(resp){
  const j = JSON.stringify(resp);
  const m = resp?.generateVideoResponse?.generatedSamples?.[0]?.video || resp?.generatedSamples?.[0]?.video
         || resp?.predictions?.[0]?.video || resp?.videos?.[0];
  if(m){ if(m.videoBytes || m.bytesBase64Encoded) return { kind:'bytes', data: m.videoBytes || m.bytesBase64Encoded };
    if(m.uri || m.fileUri || m.url) return { kind:'uri', uri: m.uri || m.fileUri || m.url }; }
  const uriMatch = j.match(/"(https:\/\/[^"]+(?:\.mp4|:download|alt=media)[^"]*)"/);
  if(uriMatch) return { kind:'uri', uri: uriMatch[1] };
  return null;
}
async function downloadVideo(v, outFile){
  if(v.kind==='bytes'){ fs.writeFileSync(outFile, Buffer.from(v.data,'base64')); return true; }
  let uri = v.uri; if(!/[?&]key=/.test(uri)) uri += (uri.includes('?')?'&':'?') + 'key=' + encodeURIComponent(KEY);
  const r = await fetch(uri); if(!r.ok){ console.error('Video-Download:', r.status); return false; }
  fs.writeFileSync(outFile, Buffer.from(await r.arrayBuffer())); return true;
}

function queueReel(name, label, handle, fileName){
  const url = handle ? `${SITE}/products/${handle}` : SITE;
  const today = new Date().toISOString().slice(0,10);
  const videoUrl = `${OUT_BASE}/reels/${fileName}`;
  const caption = `${label} ✨ Sommer-Mode aus der Schweiz · -10% mit Code WELCOME10 → ${url}`;
  const row = [ `veo-${name}-${today}`, today, videoUrl, caption, REEL_HASHTAGS, 'tiktok,instagram', 'ready', '', '' ];
  const exists = fs.existsSync(REELS_CSV) && fs.statSync(REELS_CSV).size>0;
  let out = exists ? '' : 'id,scheduled_date,video_url,caption,hashtags,platforms,status,posted_at,post_url\n';
  out += row.map(esc).join(',') + '\n';
  fs.appendFileSync(REELS_CSV, out);
  console.log('   ↳ Reel eingereiht:', videoUrl);
}

// --- Hauptlauf ---
const products = readGood();
let queue;
if(ONLY){ queue = products.filter(p=>p.name===ONLY); if(!queue.length){ console.error('VEO_ONLY nicht gefunden:', ONLY); process.exit(1); } }
else { const start = loadPointer(products.length); queue = []; for(let k=0;k<MAX;k++) queue.push(products[(start+k)%products.length]); }

fs.mkdirSync(OUT_DIR, { recursive: true });
const date = new Date().toISOString().slice(0,10);
let made = 0;
for(const p of queue){
  const prompt = buildPrompt(p.label || p.name);
  const fileName = `veo-hero-${p.name}-${date}.mp4`;
  const outFile = path.join(OUT_DIR, fileName);
  console.log(`\n→ Veo-Hero für «${p.label||p.name}»`);
  if(DRY){ console.log('   DRY_RUN: würde Veo (', MODEL, ASPECT, SECONDS+'s) mit', p.image_url, 'starten.'); made++; continue; }
  try{
    const img = await fetchImageBase64(p.image_url);
    const op = await startVeo(prompt, img); if(!op) continue;
    const resp = await pollVeo(op); if(!resp) continue;
    const v = extractVideo(resp);
    if(!v){ console.error('   Video in Antwort nicht gefunden:', JSON.stringify(resp).slice(0,500)); continue; }
    if(await downloadVideo(v, outFile)){
      console.log('   ✅ gespeichert:', outFile, `(${(fs.statSync(outFile).size/1024/1024).toFixed(1)} MB)`);
      queueReel(p.name, p.label||p.name, p.handle, fileName);
      made++;
    }
  }catch(e){ console.error('   Veo-Fehler:', e.message); }
}
if(!ONLY && !DRY){ const start = loadPointer(products.length); fs.writeFileSync(POINTER, String((start+MAX)%products.length)); }
console.log(`\nFertig: ${made} Veo-Hero-Clip(s)${DRY?' (DRY)':''} → Reel-Queue aktualisiert.`);
