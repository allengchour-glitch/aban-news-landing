#!/usr/bin/env node
/* LuxeStyle — veo-hero-clip.mjs  (Veo-gesteuerter Hero-Clip-Generator, Bild → Video)
 *
 * Nimmt ein Produktbild aus automation/good_products.csv, lässt Veo (über die Gemini-API) daraus
 * einen kurzen, CINEASTISCHEN 9:16-Clip rendern ("echte" Kamerafahrt statt Standbild-Zoom → wackelt
 * nicht) und legt ihn als reels/veo-hero-<name>-<datum>.mp4 ab. Diese Clips kann die Reel-Pipeline
 * als Hook an den Anfang setzen.
 *
 * ⚠️ Veo KOSTET pro Sekunde Video → bewusst NICHT als täglicher Cron, sondern on-demand
 *    (workflow_dispatch) bzw. wenige Clips/Woche. Throttle via MAX_CLIPS (Default 1).
 * No-op-safe: ohne GEMINI_API_KEY sauberer Leerlauf (Exit 0).
 *
 * ⚠️ ERSTE VERSION — die genaue Veo-REST-Antwortform kann je nach Modell variieren; das Skript
 *    parst die Antwort defensiv (sucht Video-URI ODER Inline-Bytes) und loggt ausführlich, damit
 *    wir nach dem ersten echten Lauf bei Bedarf nachjustieren können.
 *
 * ENV (NUR aus GitHub-Secrets/Variablen):
 *   GEMINI_API_KEY   (Pflicht — derselbe Key wie die Site-Kritik)
 *   VEO_MODEL        (optional, Default veo-3.0-fast-generate-001; Alt: veo-3.0-generate-001, veo-2.0-generate-001)
 *   VEO_ONLY         (optional: ein name aus good_products.csv; sonst rotierender Pointer)
 *   MAX_CLIPS        (optional, Default 1)
 *   VEO_ASPECT       (optional, Default 9:16)
 *   VEO_SECONDS      (optional, Default 8)
 *   DRY_RUN=1
 */
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.VEO_MODEL || 'veo-3.0-fast-generate-001';
const ASPECT = process.env.VEO_ASPECT || '9:16';
const SECONDS = parseInt(process.env.VEO_SECONDS || '8', 10) || 8;
const MAX = Math.max(1, parseInt(process.env.MAX_CLIPS || '1', 10) || 1);
const ONLY = (process.env.VEO_ONLY || '').trim();
const DRY = process.env.DRY_RUN === '1';
const BASE = 'https://generativelanguage.googleapis.com/v1beta';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.dirname(HERE);
const CSV = path.join(HERE, 'good_products.csv');
const OUT_DIR = path.join(ROOT, 'reels');
const POINTER = path.join(HERE, '.veo_pointer');

if(!KEY && !DRY){ console.log('Kein GEMINI_API_KEY → No-op. Setze GEMINI_API_KEY als Secret.'); process.exit(0); }
if(!fs.existsSync(CSV)){ console.log('good_products.csv fehlt → No-op.'); process.exit(0); }

// --- good_products.csv lesen (name,image_url,label) ---
function readGood(){
  const lines = fs.readFileSync(CSV,'utf8').split('\n').filter(Boolean);
  const out = [];
  for(const line of lines.slice(1)){
    const [name, image_url, ...rest] = line.split(',');
    if(name && image_url) out.push({ name: name.trim(), image_url: image_url.trim(), label: rest.join(',').trim() });
  }
  return out;
}

function loadPointer(n){ try{ return parseInt(fs.readFileSync(POINTER,'utf8').trim(),10) % n; }catch{ return 0; } }

// Cineastischer Mode-Prompt, der Bewegung erzeugt ohne das Produkt zu verfälschen.
function buildPrompt(label){
  return `Cinematic fashion product video for a premium Swiss online boutique. Subject: ${label}. `
    + `Slow, smooth, elegant camera move (gentle dolly-in and subtle parallax), soft natural daylight, `
    + `shallow depth of field, warm premium color grading, luxury editorial mood. The product stays true `
    + `to the reference image — same colors, same design, no distortion. No text, no logos, no watermark. `
    + `Steady, stabilized footage (no shaking). Vertical 9:16, high quality.`;
}

async function fetchImageBase64(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error(`Bild-Download ${url} → HTTP ${r.status}`);
  const ct = r.headers.get('content-type') || (url.endsWith('.webp')?'image/webp':'image/jpeg');
  const buf = Buffer.from(await r.arrayBuffer());
  return { b64: buf.toString('base64'), mime: ct.split(';')[0] };
}

// Startet den Veo-Render-Job (long running operation) und gibt den Operationsnamen zurück.
async function startVeo(prompt, img){
  const url = `${BASE}/models/${MODEL}:predictLongRunning?key=${encodeURIComponent(KEY)}`;
  const body = {
    instances: [{ prompt, image: { imageBytes: img.b64, mimeType: img.mime } }],
    parameters: { aspectRatio: ASPECT, durationSeconds: SECONDS, personGeneration: 'allow_adult', sampleCount: 1 },
  };
  const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const j = await r.json().catch(()=>({}));
  if(!r.ok || !j.name){ console.error('Veo start:', r.status, JSON.stringify(j).slice(0,500)); return null; }
  console.log('Veo-Job gestartet:', j.name);
  return j.name;
}

async function pollVeo(opName){
  const url = `${BASE}/${opName}?key=${encodeURIComponent(KEY)}`;
  for(let i=0;i<60;i++){               // bis ~10 Min (Veo braucht oft 1–3 Min)
    await new Promise(res=>setTimeout(res, 10000));
    const r = await fetch(url);
    const j = await r.json().catch(()=>({}));
    if(j.done){
      if(j.error){ console.error('Veo-Fehler:', JSON.stringify(j.error).slice(0,400)); return null; }
      console.log('Veo fertig nach', (i+1)*10, 's.');
      return j.response || j;
    }
    if(i%3===0) console.log('… Veo rendert noch', (i+1)*10, 's');
  }
  console.error('Veo-Timeout.'); return null;
}

// Findet die Video-Daten in der (variablen) Antwort: entweder eine URI zum Download oder Inline-Bytes.
function extractVideo(resp){
  const j = JSON.stringify(resp);
  // 1) Inline-Bytes (verschiedene Feldnamen je Modell)
  const m = resp?.generateVideoResponse?.generatedSamples?.[0]?.video
         || resp?.generatedSamples?.[0]?.video
         || resp?.predictions?.[0]?.video
         || resp?.videos?.[0];
  if(m){
    if(m.videoBytes || m.bytesBase64Encoded) return { kind:'bytes', data: m.videoBytes || m.bytesBase64Encoded };
    if(m.uri || m.fileUri || m.url) return { kind:'uri', uri: m.uri || m.fileUri || m.url };
  }
  // 2) Fallback: irgendeine URI im JSON
  const uriMatch = j.match(/"(https:\/\/[^"]+(?:\.mp4|:download|alt=media)[^"]*)"/);
  if(uriMatch) return { kind:'uri', uri: uriMatch[1] };
  return null;
}

async function downloadVideo(v, outFile){
  if(v.kind==='bytes'){ fs.writeFileSync(outFile, Buffer.from(v.data,'base64')); return true; }
  let uri = v.uri;
  if(!/[?&]key=/.test(uri)) uri += (uri.includes('?')?'&':'?') + 'key=' + encodeURIComponent(KEY);
  const r = await fetch(uri);
  if(!r.ok){ console.error('Video-Download:', r.status); return false; }
  fs.writeFileSync(outFile, Buffer.from(await r.arrayBuffer())); return true;
}

// --- Hauptlauf ---
const products = readGood();
if(products.length===0){ console.log('good_products.csv leer → No-op.'); process.exit(0); }

let queue;
if(ONLY){ queue = products.filter(p=>p.name===ONLY); if(!queue.length){ console.error('VEO_ONLY nicht gefunden:', ONLY); process.exit(1); } }
else { const start = loadPointer(products.length); queue = []; for(let k=0;k<MAX;k++) queue.push(products[(start+k)%products.length]); }

fs.mkdirSync(OUT_DIR, { recursive: true });
const date = new Date().toISOString().slice(0,10);
let made = 0;

for(const p of queue){
  const prompt = buildPrompt(p.label || p.name);
  const outFile = path.join(OUT_DIR, `veo-hero-${p.name}-${date}.mp4`);
  console.log(`\n→ Veo-Hero für «${p.label||p.name}»`);
  if(DRY){ console.log('   DRY_RUN: würde Veo (', MODEL, ',', ASPECT, ',', SECONDS+'s) mit Bild', p.image_url, 'starten.'); made++; continue; }
  try{
    const img = await fetchImageBase64(p.image_url);
    const op = await startVeo(prompt, img);
    if(!op) continue;
    const resp = await pollVeo(op);
    if(!resp) continue;
    const v = extractVideo(resp);
    if(!v){ console.error('   Konnte Video in der Antwort nicht finden. Rohantwort (gekürzt):', JSON.stringify(resp).slice(0,600)); continue; }
    if(await downloadVideo(v, outFile)){ console.log('   ✅ gespeichert:', outFile, `(${(fs.statSync(outFile).size/1024/1024).toFixed(1)} MB)`); made++; }
  }catch(e){ console.error('   Veo-Fehler:', e.message); }
}

if(!ONLY && !DRY){ const start = loadPointer(products.length); fs.writeFileSync(POINTER, String((start+MAX)%products.length)); }
console.log(`\nFertig: ${made} Veo-Hero-Clip(s)${DRY?' (DRY)':''}.`);
