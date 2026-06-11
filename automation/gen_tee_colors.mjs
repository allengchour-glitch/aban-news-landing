#!/usr/bin/env node
/* LuxeStyle — gen_tee_colors.mjs
 * Erzeugt aus dem echten WEISSEN Tee-Foto photorealistische SCHWARZ- und NAVY-Varianten
 * (Gemini 2.5 Flash Image, Bild-zu-Bild) für die Farb-Vorschau im Gestalten-Editor.
 * Nur die Stofffarbe ändert sich — Form/Pose/Falten/Licht/Hintergrund bleiben identisch.
 * Ergebnis: pod/tees/tee-<farbe>.jpg (committet → via Pages öffentlich).
 * No-op-safe ohne GEMINI_API_KEY. ENV: GEMINI_API_KEY, [GEMINI_IMAGE_MODEL], [FORCE=1], [DRY_RUN=1]
 */
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const GBASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const FORCE = process.env.FORCE === '1';
const DRY = process.env.DRY_RUN === '1';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.dirname(HERE);
const OUT_DIR = path.join(ROOT, 'pod', 'tees');
const SRC = 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/blank-tee-white.png?v=1781027029';

const COLORS = [
  { name: 'black', desc: 'solid deep black' },
  { name: 'navy',  desc: 'solid navy blue (dark blue)' },
];

if(!KEY && !DRY){ console.log('Kein GEMINI_API_KEY → No-op.'); process.exit(0); }
fs.mkdirSync(OUT_DIR, { recursive:true });

async function fetchImage(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error(`Bild ${url} → HTTP ${r.status}`);
  const ct = (r.headers.get('content-type')||'').split(';')[0] || 'image/png';
  return { b64: Buffer.from(await r.arrayBuffer()).toString('base64'), mime: ct };
}
function extractImage(j){
  const parts = j?.candidates?.[0]?.content?.parts || [];
  for(const p of parts){ const d = p.inline_data || p.inlineData; if(d?.data) return d.data; }
  return null;
}
async function recolor(img, desc){
  const prompt = `You are a professional product-photo retoucher. The image is a plain white unisex t-shirt on a light studio background. TASK: change ONLY the t-shirt's fabric colour to ${desc}. CRITICAL: keep the t-shirt 100% IDENTICAL otherwise — exact same shape, cut, pose, folds, wrinkles, seams, lighting, shadows, highlights, background and camera angle. Do NOT add any text, logo, pattern or graphic. Keep the background unchanged. Output a clean, photorealistic, e-commerce-quality product photo.`;
  const url = `${GBASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`;
  const body = { contents:[{ role:'user', parts:[ { text: prompt }, { inline_data:{ mime_type: img.mime, data: img.b64 } } ] }],
                 generationConfig:{ responseModalities:['IMAGE'], temperature: 0.2 } };
  const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const j = await r.json().catch(()=>({}));
  if(!r.ok){ console.error('  Gemini:', r.status, JSON.stringify(j.error||j).slice(0,300)); return null; }
  return extractImage(j);
}

let made=0;
const src = await fetchImage(SRC).catch(e=>{ console.error('Quelle:', e.message); return null; });
if(!src){ process.exit(1); }
for(const c of COLORS){
  const outFile = path.join(OUT_DIR, `tee-${c.name}.jpg`);
  if(!FORCE && fs.existsSync(outFile)){ console.log(`= tee-${c.name} (existiert, skip)`); continue; }
  console.log(`→ tee-${c.name} …`);
  if(DRY){ console.log('   DRY'); made++; continue; }
  try{
    const b64 = await recolor(src, c.desc);
    if(!b64){ console.error('   ⚠️  keine Bilddaten — übersprungen'); continue; }
    fs.writeFileSync(outFile, Buffer.from(b64,'base64'));
    console.log(`   ✅ ${path.relative(ROOT,outFile)} (${(fs.statSync(outFile).size/1024)|0}kB)`);
    made++;
  }catch(e){ console.error('   Fehler:', e.message); }
}
console.log(`Fertig: ${made} erzeugt.`);
