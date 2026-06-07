#!/usr/bin/env node
/* LuxeStyle — gemini_enhance_image.mjs  (Echtfoto-KI-Veredelung, produkttreu)
 *
 * Nimmt das ECHTE Produktfoto (aus automation/good_products.csv) und lässt Gemini 2.5 Flash Image
 * ("Nano Banana", Bild-zu-Bild) eine edle Editorial-Szene rendern — das PRODUKT bleibt unverändert
 * (gleiche Farbe/Schnitt/Muster), nur Licht/Hintergrund/Stimmung werden Premium. So entstehen
 * "Meisterwerk"-Bilder ohne Misrepresentation-Risiko.
 *
 * Ergebnis: social/enhanced/<name>.jpg (gespeichert, via GitHub Pages öffentlich als
 * https://abannews.com/social/enhanced/<name>.jpg) + Queue-Zeile in social/posts_image.csv mit
 * direktem PRODUKTLINK in der Caption + Manifest social/enhanced/_manifest.csv (für Shopify-Zuordnung).
 *
 * Kostenbremse: BATCH (Default 5) Produkte/Lauf, rotierend (Pointer .enhance_pointer).
 * No-op-safe: ohne GEMINI_API_KEY sauberer Leerlauf.
 *
 * ENV: GEMINI_API_KEY (Pflicht) · GEMINI_IMAGE_MODEL (Default gemini-2.5-flash-image) ·
 *      OUT_BASE_URL (Default https://abannews.com) · SITE_URL (Default https://luxestyle.ch) ·
 *      BATCH (Default 5) · ENHANCE_ONLY (Komma-Liste names, gezielt) · DRY_RUN=1
 */
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const GBASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const OUT_BASE = (process.env.OUT_BASE_URL || 'https://abannews.com').replace(/\/$/, '');
const SITE = (process.env.SITE_URL || 'https://luxestyle.ch').replace(/\/$/, '');
const BATCH = Math.max(1, parseInt(process.env.BATCH || '5', 10) || 5);
const ONLY = (process.env.ENHANCE_ONLY || '').split(',').map(s=>s.trim()).filter(Boolean);
const DRY = process.env.DRY_RUN === '1';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.dirname(HERE);
const GOOD = path.join(HERE, 'good_products.csv');
const OUT_DIR = path.join(ROOT, 'social', 'enhanced');
const QUEUE = path.join(ROOT, 'social', 'posts_image.csv');
const MANIFEST = path.join(OUT_DIR, '_manifest.csv');
const POINTER = path.join(HERE, '.enhance_pointer');

const QUEUE_COLS = ['id','scheduled_date','image_url','caption','platforms','status','posted_at','post_url'];
const CAPTIONS = [
  '{label} ✨ Premium-Look zum fairen Preis. Code WELCOME10 = -10% → {url}',
  'Neu entdeckt: {label} 🤍 Schweizer Shop · Gratis-Versand ab CHF 65 → {url}',
  'Dein Sommer-Liebling? {label} 🌿 -10% mit WELCOME10 · 30 Tage Rückgabe → {url}',
  '{label} — premium & bezahlbar. Jetzt mit Code WELCOME10 → {url}',
  'Editorial-Look: {label} 👀 Designer-Vibe, fairer Preis → {url}',
];
const HASHTAGS = [
  '#schweizmode #ootdschweiz #sommerkleid #fashionschweiz #luxestyle',
  '#swissfashion #sommeroutfit #ootd #fashionschweiz #luxestylech',
  '#sommermode2026 #ootdschweiz #schweizmode #fashiontiktok #luxestyle',
];

if(!KEY && !DRY){ console.log('Kein GEMINI_API_KEY → No-op. Setze GEMINI_API_KEY (Projekt mit Billing).'); process.exit(0); }
if(!fs.existsSync(GOOD)){ console.log('good_products.csv fehlt → No-op.'); process.exit(0); }

// --- good_products.csv (name,image_url,label,handle) ---
function readGood(){
  const lines = fs.readFileSync(GOOD,'utf8').split('\n').filter(Boolean).slice(1);
  return lines.map(l => { const [name,image_url,label,handle] = l.split(','); return { name:(name||'').trim(), image_url:(image_url||'').trim(), label:(label||'').trim(), handle:(handle||'').trim() }; })
              .filter(p => p.name && p.image_url);
}
function loadPointer(n){ try{ return parseInt(fs.readFileSync(POINTER,'utf8').trim(),10) % n; }catch{ return 0; } }
function esc(v){ v=String(v??''); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }

const PROMPT = `Premium editorial fashion photograph for a Swiss boutique. Use the provided product image as the EXACT reference: keep the product 100% identical — same garment/accessory, same colours, same pattern, same cut and details. Do NOT redesign or alter the product in any way. Improve ONLY the lighting, background and mood: soft natural daylight, elegant minimal premium setting (clean studio or tasteful lifestyle scene), gentle shadows, shallow depth of field, refined luxury-boutique aesthetic, true-to-life colours. No text, no logos, no watermarks, no extra props that hide the product. Vertical 4:5 composition, high quality.`;

async function fetchImage(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error(`Bild ${url} → HTTP ${r.status}`);
  const ct = (r.headers.get('content-type')||'').split(';')[0] || (url.endsWith('.webp')?'image/webp':'image/jpeg');
  return { b64: Buffer.from(await r.arrayBuffer()).toString('base64'), mime: ct };
}
function extractImage(j){
  const parts = j?.candidates?.[0]?.content?.parts || [];
  for(const p of parts){ const d = p.inline_data || p.inlineData; if(d?.data) return d.data; }
  return null;
}
async function enhance(img){
  const url = `${GBASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`;
  const body = { contents: [{ role:'user', parts: [ { text: PROMPT }, { inline_data: { mime_type: img.mime, data: img.b64 } } ] }],
                 generationConfig: { responseModalities: ['IMAGE'], temperature: 0.5 } };
  const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const j = await r.json().catch(()=>({}));
  if(!r.ok){ console.error('Gemini-Image:', r.status, JSON.stringify(j.error||j).slice(0,300)); return null; }
  return extractImage(j);
}

// --- Hauptlauf ---
const products = readGood();
let queue;
if(ONLY.length){ queue = products.filter(p=>ONLY.includes(p.name)); }
else { const start = loadPointer(products.length); queue = []; for(let k=0;k<BATCH;k++) queue.push(products[(start+k)%products.length]); }

fs.mkdirSync(OUT_DIR, { recursive: true });
const today = new Date().toISOString().slice(0,10);
const newRows = [], manifestRows = [];
let made = 0;

for(let k=0;k<queue.length;k++){
  const p = queue[k];
  const url = p.handle ? `${SITE}/products/${p.handle}` : SITE;
  console.log(`→ Veredle «${p.label||p.name}» …`);
  if(DRY){ console.log('   DRY_RUN: würde', p.image_url, 'an', MODEL, 'senden.'); made++; continue; }
  try{
    const src = await fetchImage(p.image_url);
    const b64 = await enhance(src);
    if(!b64){ console.error('   ⚠️  keine KI-Bilddaten — übersprungen'); continue; }
    const outFile = path.join(OUT_DIR, `${p.name}.jpg`);
    fs.writeFileSync(outFile, Buffer.from(b64, 'base64'));
    const sizeKb = (fs.statSync(outFile).size/1024)|0;
    console.log(`   ✅ ${outFile} (${sizeKb}kB)`);
    const cap = CAPTIONS[(made)%CAPTIONS.length].replace('{label}', p.label||p.name).replace('{url}', url);
    const tags = HASHTAGS[(made)%HASHTAGS.length];
    const pub = `${OUT_BASE}/social/enhanced/${p.name}.jpg`;
    newRows.push([`ki-${p.name}-${today}`, today, pub, `${cap}\n${tags}`, 'instagram,facebook,threads', 'ready', '', '']);
    manifestRows.push([p.name, p.handle, p.label, today]);
    made++;
  }catch(e){ console.error('   Fehler:', e.message); }
}

if(!DRY){
  // Pointer weiterdrehen (nur im Rotations-Modus)
  if(!ONLY.length){ const start = loadPointer(products.length); fs.writeFileSync(POINTER, String((start+BATCH)%products.length)); }
  // Queue anhängen
  if(newRows.length){
    const exists = fs.existsSync(QUEUE) && fs.statSync(QUEUE).size>0;
    let out = exists ? '' : QUEUE_COLS.join(',') + '\n';
    out += newRows.map(r=>r.map(esc).join(',')).join('\n') + '\n';
    fs.appendFileSync(QUEUE, out);
    // Manifest (für shopify_add_enhanced.mjs)
    const mExists = fs.existsSync(MANIFEST) && fs.statSync(MANIFEST).size>0;
    let m = mExists ? '' : 'name,handle,label,date\n';
    m += manifestRows.map(r=>r.map(esc).join(',')).join('\n') + '\n';
    fs.appendFileSync(MANIFEST, m);
  }
}
console.log(`Fertig: ${made} veredelte Bild(er)${DRY?' (DRY)':''} → Queue + Manifest aktualisiert.`);
