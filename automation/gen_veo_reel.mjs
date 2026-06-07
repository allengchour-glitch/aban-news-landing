#!/usr/bin/env node
/* LuxeStyle — gen_veo_reel.mjs  (Google Veo via Vertex AI → 3-Sek-Hook-Reel)
 *
 * Erzeugt aus einem ECHTEN Produktfoto (good_products.csv) einen kurzen, edlen Bewegungs-Clip
 * (Veo image-to-video) als Reel-Hook. MARKEN-REGEL: das Produkt bleibt echt — KI nur für Bewegung,
 * keine erfundenen Produkte (REEL-REGELN.md Regel 1). Output landet als status=pending in der Queue
 * → menschliche Freigabe (Regel 9) vor dem Posten.
 *
 * No-op (Exit 0) ohne GCP_SA_KEY. DRY_RUN=1 loggt nur, ruft keine (kostenpflichtige) API.
 *
 * ENV:
 *   GCP_SA_KEY        Service-Account-JSON (oder base64) — sonst No-op
 *   GCP_PROJECT       GCP-Projekt-ID
 *   GCP_LOCATION      z.B. us-central1 (Default)
 *   VERTEX_VEO_MODEL  z.B. veo-3.0-generate-001 (Default; ggf. gegen Vertex-Doku prüfen)
 *   MODE              animate (Default, Bild→Video) | broll (Text→Video, kein Produkt)
 *   VEO_DURATION      Sekunden, die Veo erzeugt (Default 4) — wird auf HOOK_SECONDS getrimmt
 *   HOOK_SECONDS      Ziel-Hook-Länge (Default 3)
 *   PROMPT            optionaler Override-Prompt
 *   DRY_RUN=1         nur loggen
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { getAccessToken, getServiceAccount } from './_gcp_auth.mjs';

const PROJECT = process.env.GCP_PROJECT || '';
const LOCATION = process.env.GCP_LOCATION || 'us-central1';
// Default = günstigstes Veo (Fast). Standard-Veo wäre teurer. Überschreibbar via VERTEX_VEO_MODEL.
const MODEL = process.env.VERTEX_VEO_MODEL || 'veo-3.0-fast-generate-001';
const MODE = (process.env.MODE || 'animate').toLowerCase();
const VEO_DURATION = parseInt(process.env.VEO_DURATION || '4', 10);
const HOOK_SECONDS = parseInt(process.env.HOOK_SECONDS || '3', 10);
const DRY = process.env.DRY_RUN === '1';

const PRODUCTS = new URL('./good_products.csv', import.meta.url).pathname;
const SEED = new URL('./reels_seed.csv', import.meta.url).pathname;
const POINTER = new URL('./.veo_pointer', import.meta.url).pathname;
const REELS_DIR = new URL('../reels/', import.meta.url).pathname;
const COLS = ['id','scheduled_date','video_url','caption','hashtags','platforms','status','posted_at','post_url'];
const BASEURL = process.env.BASEURL || 'https://abannews.com/reels';

// --- CSV (gleiche Mechanik wie die anderen Tools) ---
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
const sleep = ms => new Promise(r=>setTimeout(r,ms));

function pickProduct(){
  const rows = parse(fs.readFileSync(PRODUCTS,'utf8'));
  const hdr = rows[0]; const data = rows.slice(1);
  const idx = Object.fromEntries(['name','image_url','label','handle'].map(c=>[c,hdr.indexOf(c)]));
  let p = 0; try { p = parseInt(fs.readFileSync(POINTER,'utf8').trim(),10)||0; } catch {}
  const r = data[p % data.length];
  if(!DRY) fs.writeFileSync(POINTER, String((p+1) % data.length));
  return { name:r[idx.name], image_url:r[idx.image_url], label:r[idx.label], handle:r[idx.handle]||'' };
}

function animatePrompt(label){
  return process.env.PROMPT ||
    `Subtle cinematic motion for this real fashion product photo (${label}): slow gentle camera push-in, soft natural `+
    `movement of fabric and light, elegant premium summer mood. Keep the product exactly as shown — do not change, `+
    `replace or distort it. Vertical 9:16, photorealistic, clean.`;
}
function brollPrompt(){
  return process.env.PROMPT ||
    `Elegant summer lifestyle b-roll, no product, no text: soft sunlight, light fabrics in the breeze, mediterranean `+
    `beach/city mood, premium fashion-brand aesthetic. Vertical 9:16, photorealistic, slow cinematic motion.`;
}

async function fetchImageB64(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error(`Bild-Download ${url} → HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const mime = /\.png($|\?)/i.test(url) ? 'image/png' : /\.webp($|\?)/i.test(url) ? 'image/webp' : 'image/jpeg';
  return { b64: buf.toString('base64'), mime };
}

// Sucht das Video (Base64 oder URI) defensiv in der Operation-Response.
function extractVideo(resp){
  const out = { b64:null, uri:null };
  const visit = (o) => {
    if(!o || typeof o!=='object') return;
    for(const [k,v] of Object.entries(o)){
      if(typeof v==='string'){
        if(/bytesBase64Encoded|encodedVideo|videoBytes/i.test(k) && v.length>100) out.b64 = out.b64||v;
        if(/(gcsUri|uri|videoUri)/i.test(k) && /^(gs|https?):/.test(v)) out.uri = out.uri||v;
      } else visit(v);
    }
  };
  visit(resp);
  return out;
}

async function main(){
  if(!getServiceAccount() && !DRY){
    console.log('Kein GCP_SA_KEY → No-op (kein Veo-Aufruf). Siehe USER-CHECKLISTE §Veo.');
    process.exit(0);
  }
  const product = MODE==='broll' ? null : pickProduct();
  const prompt = MODE==='broll' ? brollPrompt() : animatePrompt(product.label);
  const stamp = new Date().toISOString().replace(/[-:T]/g,'').slice(0,13); // YYYYMMDDHHMM
  const slug = `veo-${stamp}`;
  const outFull = `${REELS_DIR}${slug}-full.mp4`;
  const outFile = `${REELS_DIR}${slug}.mp4`;

  console.log(`Veo ${MODE} · Modell ${MODEL} · ${LOCATION} · ${product?('Produkt: '+product.label):'B-Roll'}`);
  console.log('Prompt:', prompt);

  const base = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/${MODEL}`;

  if(DRY){
    console.log('DRY_RUN: würde POST', `${base}:predictLongRunning`, '· durationSeconds', VEO_DURATION, '→ trim', HOOK_SECONDS+'s');
    if(product) console.log('DRY_RUN: würde echtes Produktfoto als Startframe anhängen:', product.image_url);
    process.exit(0);
  }

  const instance = { prompt };
  if(product){
    const img = await fetchImageB64(product.image_url);
    instance.image = { bytesBase64Encoded: img.b64, mimeType: img.mime };
    console.log('Startframe:', product.image_url, `(${img.mime})`);
  }
  const body = { instances:[instance], parameters:{ aspectRatio:'9:16', sampleCount:1, durationSeconds:VEO_DURATION } };

  const token = await getAccessToken();
  if(!token){ console.error('Kein Access-Token (GCP_SA_KEY prüfen) → Abbruch.'); process.exit(1); }
  const auth = { 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' };

  // 1) Start (Long-Running)
  const start = await fetch(`${base}:predictLongRunning`, { method:'POST', headers:auth, body:JSON.stringify(body) });
  const sj = await start.json().catch(()=>({}));
  if(!start.ok || !sj.name){ console.error('Veo start:', start.status, JSON.stringify(sj.error||sj).slice(0,400)); process.exit(1); }
  console.log('Operation:', sj.name);

  // 2) Pollen
  let resp=null;
  for(let i=0;i<60;i++){
    await sleep(10000);
    const p = await fetch(`${base}:fetchPredictOperation`, { method:'POST', headers:auth, body:JSON.stringify({ operationName: sj.name }) });
    const pj = await p.json().catch(()=>({}));
    if(pj.error){ console.error('Veo poll-Fehler:', JSON.stringify(pj.error).slice(0,400)); process.exit(1); }
    if(pj.done){ resp = pj.response || pj; console.log('Veo fertig nach', (i+1)*10, 's'); break; }
    if(i%3===0) console.log('… läuft', (i+1)*10, 's');
  }
  if(!resp){ console.error('Veo-Timeout (>10 Min) → Abbruch.'); process.exit(1); }

  // 3) Video extrahieren + speichern
  const vid = extractVideo(resp);
  if(vid.b64){
    fs.writeFileSync(outFull, Buffer.from(vid.b64,'base64'));
  } else if(vid.uri && vid.uri.startsWith('http')){
    const r = await fetch(vid.uri); fs.writeFileSync(outFull, Buffer.from(await r.arrayBuffer()));
  } else {
    console.error('Kein Video in Veo-Response gefunden (evtl. gs://-URI ohne Download-Recht):', JSON.stringify(resp).slice(0,400));
    process.exit(1);
  }
  console.log('Video gespeichert:', outFull, `(${(fs.statSync(outFull).size/1e6).toFixed(1)} MB)`);

  // 4) Auf Hook-Länge trimmen (falls ffmpeg vorhanden), sonst voll übernehmen
  let finalName = `${slug}-full.mp4`;
  const ff = spawnSync('ffmpeg', ['-y','-i',outFull,'-t',String(HOOK_SECONDS),'-c:v','libx264','-pix_fmt','yuv420p','-an',outFile], {stdio:'ignore'});
  if(ff.status===0 && fs.existsSync(outFile)){ fs.unlinkSync(outFull); finalName = `${slug}.mp4`; console.log('Auf', HOOK_SECONDS,'s getrimmt →', outFile); }
  else { console.log('ffmpeg nicht verfügbar/Fehler → voller Clip bleibt.'); }

  // 5) In die Queue als PENDING (Freigabe-Gate, Regel 9)
  const rows = parse(fs.readFileSync(SEED,'utf8'));
  const idx = Object.fromEntries(COLS.map(c=>[c, rows[0].indexOf(c)]));
  const row = new Array(rows[0].length).fill('');
  const link = product?.handle ? `luxestyle.ch/products/${product.handle}` : 'luxestyle.ch';
  row[idx.id] = slug;
  row[idx.scheduled_date] = new Date().toISOString().slice(0,10);
  row[idx.video_url] = `${BASEURL}/${finalName}`;
  row[idx.caption] = product
    ? `${product.label} ✨ Sommer bei LuxeStyle. -10% mit Code WELCOME10 → ${link}`
    : `Sommer-Stimmung bei LuxeStyle ✨ -10% mit Code WELCOME10 → luxestyle.ch`;
  row[idx.hashtags] = '#schweizmode #sommermode2026 #ootdschweiz #fashiontiktok #fyp';
  row[idx.platforms] = 'tiktok,instagram';
  row[idx.status] = 'pending';   // erst nach Freigabe auf 'ready'
  rows.push(row);
  fs.writeFileSync(SEED, rows.map(r=>r.map(esc).join(',')).join('\n')+'\n');

  // Medien-Manifest für add_media_to_products.mjs (handle→Video), nur bei Produkt-Animation
  if(product?.handle){
    const MAN = new URL('../social/generated_media.csv', import.meta.url).pathname;
    if(!fs.existsSync(MAN)) fs.writeFileSync(MAN, 'handle,type,url,alt\n');
    fs.appendFileSync(MAN, `${product.handle},VIDEO,${row[idx.video_url]},${esc(product.label)}\n`);
  }
  console.log(`✅ ${finalName} erzeugt + als PENDING in reels_seed.csv eingetragen (Freigabe nötig vor dem Posten).`);
}

main().catch(e=>{ console.error('Fehler:', e.message); process.exit(1); });
