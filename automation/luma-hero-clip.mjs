#!/usr/bin/env node
/* LuxeStyle — luma-hero-clip.mjs  (Luma Dream Machine: Bild → Video Hero-Clips)
 *
 * Analog zu veo-hero-clip.mjs, aber über die Luma-Dream-Machine-API (Ray). Nimmt ein
 * Produktfoto aus automation/good_products.csv, lässt Luma daraus einen kurzen, cineastischen
 * 9:16-Clip rendern (sanfter Push-in, „wackelt nicht"), lädt ihn auf die Shopify-CDN und reiht
 * ihn als status=ready-Zeile in social/video_queue.csv ein → der Meta-Autopilot
 * (video-autopost-meta.mjs) postet ihn auf IG/FB. Damit: „bauen UND posten" in einem.
 *
 * Reihenfolge ist kategorie-ausbalanciert (Damen/Herren/Schmuck/Beauty/Gadget durchmischt),
 * Hashtags kategorie-passend. No-op-safe: ohne LUMA_API_KEY sauberer Leerlauf.
 *
 * ENV:
 *   LUMA_API_KEY (Pflicht)                          — https://docs.lumalabs.ai
 *   LUMA_MODEL (Default ray-flash-2; ray-2 = höhere Qualität, teurer)
 *   LUMA_ASPECT (9:16) · LUMA_RESOLUTION (720p) · LUMA_DURATION (5s)
 *   MAX_CLIPS (Default 1) · LUMA_ONLY (ein/mehrere name, kommagetrennt) · DRY_RUN=1
 *   SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) — für den CDN-Upload
 *   SITE_URL (Default https://luxestyle.ch)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { balanceByCategory, catKey, tagsFor } from './lib/reel-category.mjs';

const KEY = process.env.LUMA_API_KEY || '';
const MODEL = process.env.LUMA_MODEL || 'ray-flash-2';
const ASPECT = process.env.LUMA_ASPECT || '9:16';
const RES = process.env.LUMA_RESOLUTION || '720p';
const DURATION = process.env.LUMA_DURATION || '5s';
const MAX = Math.max(1, parseInt(process.env.MAX_CLIPS || '1', 10) || 1);
const ONLY = (process.env.LUMA_ONLY || '').trim();
const SITE = (process.env.SITE_URL || 'https://luxestyle.ch').replace(/\/$/, '');
const DRY = process.env.DRY_RUN === '1';
const API = 'https://api.lumalabs.ai/dream-machine/v1';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.dirname(HERE);
const CSV = process.env.LUMA_CSV ? path.resolve(process.env.LUMA_CSV) : path.join(HERE, 'good_products.csv');
const VQ = path.join(ROOT, 'social', 'video_queue.csv');
const UPLOADER = path.join(HERE, 'upload_to_shopify_cdn.mjs');
const OUT_DIR = path.join(ROOT, 'reels');
const POINTER = path.join(HERE, '.luma_pointer');
const VQ_HEADER = 'id,scheduled_date,video_url,caption,platforms,status,posted_at,post_url';

if (!KEY && !DRY) { console.log('Kein LUMA_API_KEY → No-op. Setze LUMA_API_KEY (Luma-Plan mit API).'); process.exit(0); }
if (!fs.existsSync(CSV)) { console.log('good_products.csv fehlt → No-op.'); process.exit(0); }

function readGood(){
  return fs.readFileSync(CSV, 'utf8').split('\n').filter(Boolean).slice(1).map(line => {
    const [name, image_url, label, handle] = line.split(',');
    return { name:(name||'').trim(), image_url:(image_url||'').trim(), label:(label||'').trim(), handle:(handle||'').trim() };
  }).filter(p => p.name && p.image_url);
}
function loadPointer(n){ try { return parseInt(fs.readFileSync(POINTER,'utf8').trim(),10) % n; } catch { return 0; } }
const csvq = s => '"' + String(s).replace(/"/g,'""') + '"';

function prompt(label){
  return `Cinematic premium product video for a Swiss online boutique. Subject: ${label}. `
    + `Very subtle, gentle motion only: a slow soft push-in (dolly-in) with a touch of parallax and softly `
    + `drifting daylight. The subject stays facing the camera the whole time. NO rotation, no turning, no 180/360 `
    + `spin, no orbit, no flipping. Soft natural daylight, shallow depth of field, warm premium color grading, `
    + `luxury editorial mood. The product stays true to the reference image — same colours, same design, no `
    + `distortion. No text, no logos, no watermark. Steady, stabilized, locked framing (no shaking). Vertical 9:16.`;
}

const jpost = async (url, body) => { const r = await fetch(url, { method:'POST', headers:{ Authorization:`Bearer ${KEY}`, 'Content-Type':'application/json' }, body:JSON.stringify(body) }); const j = await r.json().catch(()=>({})); return { ok:r.ok, status:r.status, j }; };
const jget  = async (url) => { const r = await fetch(url, { headers:{ Authorization:`Bearer ${KEY}` } }); const j = await r.json().catch(()=>({})); return { ok:r.ok, status:r.status, j }; };

async function startGen(p, imageUrl){
  const r = await jpost(`${API}/generations`, {
    prompt: p, model: MODEL,
    keyframes: { frame0: { type:'image', url: imageUrl } },
    aspect_ratio: ASPECT, resolution: RES, duration: DURATION,
  });
  if (!r.ok || !r.j.id) { console.error('Luma start:', r.status, JSON.stringify(r.j).slice(0,400)); return null; }
  console.log('Luma-Job gestartet:', r.j.id); return r.j.id;
}
async function pollGen(id){
  for (let i=0; i<60; i++) {
    await new Promise(s=>setTimeout(s, 10000));
    const r = await jget(`${API}/generations/${id}`);
    const st = r.j.state;
    if (st === 'completed') { const v = r.j.assets?.video; if (v) { console.log('Luma fertig nach', (i+1)*10, 's.'); return v; } }
    if (st === 'failed') { console.error('Luma failed:', JSON.stringify(r.j.failure_reason || r.j).slice(0,300)); return null; }
    if (i % 3 === 0) console.log('… Luma rendert', st || '?', (i+1)*10, 's');
  }
  console.error('Luma-Timeout.'); return null;
}
async function download(url, outFile){
  const r = await fetch(url); if (!r.ok) { console.error('Video-Download:', r.status); return false; }
  fs.writeFileSync(outFile, Buffer.from(await r.arrayBuffer())); return true;
}
function uploadToCdn(file, alt){
  try { const out = execFileSync('node', [UPLOADER, file, alt], { encoding:'utf8' }); return (out.trim().split('\n').filter(Boolean).pop() || '').trim(); }
  catch (e) { console.error('CDN-Upload-Fehler:', e.message); return ''; }
}

// --- Hauptlauf ---
const products = balanceByCategory(readGood(), p => `${p.name} ${p.label}`);
let queue;
if (ONLY) {
  const sel = new Set(ONLY.split(',').map(x=>x.trim()).filter(Boolean));
  queue = products.filter(p => sel.has(p.name));
  if (!queue.length) { console.error('LUMA_ONLY nicht gefunden:', ONLY); process.exit(1); }
} else {
  const start = loadPointer(products.length); queue = [];
  for (let k=0; k<MAX; k++) queue.push(products[(start+k) % products.length]);
}

fs.mkdirSync(OUT_DIR, { recursive:true });
if (!fs.existsSync(VQ)) fs.writeFileSync(VQ, VQ_HEADER + '\n');
const today = new Date().toISOString().slice(0,10);
let made = 0;

for (const p of queue) {
  const id = `luma-${p.name}-${today}`;
  const existing = fs.readFileSync(VQ, 'utf8');
  if (existing.includes(id + ',')) { console.log('skip (schon in Queue):', id); continue; }
  console.log(`→ ${p.label} (${catKey(`${p.name} ${p.label}`)})`);
  if (DRY) { console.log('   DRY: würde Luma-Clip bauen + posten'); made++; continue; }

  const gen = await startGen(prompt(p.label), p.image_url);
  if (!gen) continue;
  const videoUrl = await pollGen(gen);
  if (!videoUrl) continue;

  const fileName = `luma-hero-${p.name}-${today}.mp4`;
  const outFile = path.join(OUT_DIR, fileName);
  if (!await download(videoUrl, outFile)) continue;
  const kb = (fs.statSync(outFile).size/1024)|0; console.log(`   🎬 ${outFile} (${kb}kB)`);

  const cdn = uploadToCdn(outFile, `LuxeStyle ${p.label}`);
  if (!/^https:\/\/cdn\.shopify\.com\//.test(cdn)) { console.error('   ✗ keine CDN-URL → nicht eingereiht:', cdn); continue; }

  const caption = `${p.label} ✨ Neu bei deinem Schweizer Shop · -10% mit Code WELCOME10 · 🔗 Link in Bio\n${tagsFor(`${p.name} ${p.label}`)}`;
  const row = [ id, today, csvq(cdn), csvq(caption), '', 'ready', '', '' ].join(',');
  fs.appendFileSync(VQ, row + '\n');
  console.log('   ✓ in Meta-Queue:', id, '→', cdn);
  made++;
}

if (!ONLY && !DRY) { const start = loadPointer(products.length); fs.writeFileSync(POINTER, String((start+MAX) % products.length)); }
console.log(`Fertig: ${made} Luma-Clip(s)${DRY?' (DRY)':''} → Meta-Queue (ready).`);
