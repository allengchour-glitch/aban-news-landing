#!/usr/bin/env node
/* LuxeStyle — gen_posters.mjs  (Schweiz-Poster-Motive für Gelato)
 * Vollflächige, hochwertige Poster-Artworks (KEINE Transparenz, kein Magenta-Chroma wie bei Stickern).
 * Gemini 2.5 Flash Image, Hochformat-Poster. Speichert social/posters/<name>.jpg (via Pages öffentlich).
 * No-op ohne GEMINI_API_KEY. Skip vorhandene (FORCE=1 überschreibt). ENV: GEMINI_API_KEY, ONLY=name,name, FORCE, MAX.
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const KEY = (process.env.GEMINI_API_KEY||'').trim();
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const GBASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const ONLY = (process.env.ONLY||'').split(',').map(s=>s.trim()).filter(Boolean);
const FORCE = process.env.FORCE==='1';
const MAX = Math.max(1, parseInt(process.env.MAX||'12',10)||12);

const HERE = path.dirname(fileURLToPath(new URL(import.meta.url)));
const ROOT = path.dirname(HERE);
const OUT = path.join(ROOT,'social','posters');

const STYLE = 'Premium fine-art travel POSTER, vertical 2:3 portrait orientation, full-bleed (fills the whole canvas, no border, no frame), elegant minimalist Swiss aesthetic, refined muted earthy palette with a subtle warm accent, soft natural light, high detail, gallery wall-art quality. NO people, NO watermark, NO logo.';
const POSTERS = [
  { name:'ch-poster-matterhorn', prompt:`A majestic Matterhorn peak at golden hour with a calm reflection, clean layered minimalist mountain illustration. ${STYLE} No text.` },
  { name:'ch-poster-alps-panorama', prompt:`A serene Swiss Alps panorama of layered mountain ranges in soft morning haze with a tiny red mountain cable car. ${STYLE} No text.` },
  { name:'ch-poster-edelweiss', prompt:`An elegant botanical study of a single Edelweiss alpine flower, delicate line-art with soft watercolour, cream background. ${STYLE} No text.` },
  { name:'ch-poster-gruezi', prompt:`A refined typographic poster: the word "GRÜEZI" in beautiful modern serif lettering, centred, with a small minimalist mountain line beneath, warm cream and charcoal. Vertical 2:3 portrait, premium wall art, full-bleed, no border. Spell it exactly "GRÜEZI". No other text.` },
  { name:'ch-poster-cow', prompt:`A charming folk-art illustration of a Swiss brown cow with a flower headdress and a cowbell, alpine meadow, warm storybook palette. ${STYLE} No text.` },
  { name:'ch-poster-chalet', prompt:`A cozy Swiss wooden chalet nestled in pine forest with mountains behind, warm inviting illustrated travel poster. ${STYLE} No text.` },
  { name:'ch-poster-lake', prompt:`A tranquil Swiss alpine lake mirroring snowy peaks, minimalist layered illustration, calm blues and warm sand tones. ${STYLE} No text.` },
  { name:'ch-poster-fondue', prompt:`A warm retro illustrated poster of a Swiss cheese fondue caquelon with crossed forks and rising steam, cosy kitchen wall-art, inviting palette. ${STYLE} No text.` },
  { name:'ch-poster-gondola', prompt:`A vintage Swiss travel poster of a little red mountain gondola climbing past alpine peaks, classic art-deco travel-poster feel, warm muted tones. ${STYLE} No text.` },
  { name:'ch-poster-edelweiss-pattern', prompt:`An elegant repeating edelweiss and gentian botanical pattern poster, refined, cream and sage palette, premium decorative wall art. ${STYLE} No text.` },
];

if(!KEY){ console.log('Kein GEMINI_API_KEY → No-op.'); process.exit(0); }
fs.mkdirSync(OUT,{recursive:true});

function extractImage(j){ const parts=j?.candidates?.[0]?.content?.parts||[]; for(const p of parts){ const d=p.inline_data||p.inlineData; if(d?.data) return d.data; } return null; }
async function gen(prompt){
  const url=`${GBASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`;
  const body={ contents:[{role:'user',parts:[{text:prompt}]}], generationConfig:{ responseModalities:['IMAGE'], temperature:0.7 } };
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok){ console.error('  Gemini:',r.status,JSON.stringify(j.error||j).slice(0,200)); return null; }
  return extractImage(j);
}

const queue = (ONLY.length ? POSTERS.filter(p=>ONLY.includes(p.name)) : POSTERS);
let made=0;
for(const it of queue){
  if(made>=MAX){ console.log(`MAX ${MAX} erreicht.`); break; }
  const outp=path.join(OUT,`${it.name}.jpg`);
  if(!FORCE && fs.existsSync(outp)){ console.log(`= ${it.name} (existiert)`); continue; }
  console.log(`→ ${it.name} …`);
  try{
    const b64=await gen(it.prompt);
    if(!b64){ console.error('   ⚠️ keine Bilddaten'); continue; }
    fs.writeFileSync(outp, Buffer.from(b64,'base64'));
    console.log(`   ✅ ${path.relative(ROOT,outp)} (${(fs.statSync(outp).size/1024)|0}kB)`);
    made++;
  }catch(e){ console.error('   Fehler:',e.message); }
}
console.log(`Fertig: ${made} Poster generiert.`);
