#!/usr/bin/env node
/* LuxeStyle — gen_looks.mjs
 * Generiert „coole Look"-Bilder via Gemini 2.5 Flash Image (Nano Banana) und legt sie nach social/looks/ ab.
 * Quelle: social/looks/prompts.json  [{name, prompt}]  (oder Default-Set).
 * No-op ohne GEMINI_API_KEY. ENV: GEMINI_API_KEY, [GEMINI_IMAGE_MODEL], [ONLY=name,name]
 */
import fs from 'node:fs';
const KEY=process.env.GEMINI_API_KEY||'';
const MODEL=process.env.GEMINI_IMAGE_MODEL||'gemini-2.5-flash-image';
const ONLY=(process.env.ONLY||'').split(',').map(s=>s.trim()).filter(Boolean);
const BASE='https://generativelanguage.googleapis.com/v1beta';
const DIR='social/looks';
if(!KEY){ console.log('Kein GEMINI_API_KEY → No-op.'); process.exit(0); }
fs.mkdirSync(DIR,{recursive:true});

const DEFAULTS=[
  // POD Beispiel-Designs (Mockup mit coolem Print)
  {name:'ex-tshirt-mountain', prompt:'Professional studio product photo of a white unisex t-shirt laid flat on a soft light-grey background, with a bold minimalist single-line mountain range illustration printed large and centered on the chest in black, premium streetwear look, crisp, photorealistic, soft shadows, no text, no logo, no watermark'},
  {name:'ex-hoodie-sunset', prompt:'Professional studio product photo of a black premium hoodie on a light background, with a retro 1980s synthwave sunset and palm trees graphic printed on the chest in pink, purple and orange gradients, trendy, photorealistic, no text, no watermark'},
  {name:'ex-mug-quote', prompt:'Professional studio product photo of a white glossy ceramic mug on a clean light background, with an elegant hand-lettered phrase "Good vibes only" in warm gold script on the side, minimal premium, photorealistic, soft reflections, no watermark'},
  {name:'ex-tote-cat', prompt:'Professional studio product photo of a natural cotton tote bag hanging on a light wall, with a cute single-line minimalist drawing of a cat printed in black in the center, playful modern, photorealistic, no text, no watermark'},
  {name:'ex-tshirt-paint', prompt:'Professional studio product photo of a white t-shirt on a light background, with a colourful abstract paint-splash design printed across the chest, artistic and bold, vivid colours, photorealistic, no text, no watermark'},
  {name:'ex-case-marble', prompt:'Professional studio product photo of a smartphone hard case standing upright on a light surface, with an elegant white marble and gold geometric pattern, luxe premium aesthetic, photorealistic, no text, no watermark'},
  // Premium-Hero-Kandidaten (16:9, KEINE asiatischen Models)
  {name:'hero-summer-1', prompt:'Premium editorial fashion photograph, a stylish European woman in an elegant flowing white summer dress, soft natural golden-hour daylight, warm luxe tones, minimalist elegant background with generous empty negative space on the left side for headline text and a brand logo, vogue magazine style, cinematic wide 16:9 composition, high-end, photorealistic'},
  {name:'hero-summer-2', prompt:'Luxury summer fashion editorial, a confident European woman wearing chic sunglasses and a light beige linen outfit with a straw bag, golden hour by a soft neutral wall, premium boutique mood, lots of clean negative space on the right for a logo, cinematic wide 16:9, photorealistic, elegant colour grade'}
];

let list = DEFAULTS;
try{ if(fs.existsSync(DIR+'/prompts.json')) list = JSON.parse(fs.readFileSync(DIR+'/prompts.json','utf8')); }catch(e){}
if(ONLY.length) list = list.filter(x=>ONLY.includes(x.name));

async function genImage(prompt){
  const url=`${BASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`;
  const body={ contents:[{ parts:[{ text: prompt }] }], generationConfig:{ responseModalities:['IMAGE'] } };
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok){ throw new Error('HTTP '+r.status+' '+JSON.stringify(j).slice(0,250)); }
  const parts=(j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts)||[];
  for(const p of parts){ if(p.inlineData&&p.inlineData.data) return p.inlineData.data; if(p.inline_data&&p.inline_data.data) return p.inline_data.data; }
  throw new Error('kein Bild in Antwort: '+JSON.stringify(j).slice(0,250));
}

let made=0;
for(const item of list){
  try{
    const b64=await genImage(item.prompt);
    const out=`${DIR}/${item.name}.png`;
    fs.writeFileSync(out, Buffer.from(b64,'base64'));
    console.log(`✓ ${out} (${(fs.statSync(out).size/1024).toFixed(0)} KB)`);
    made++;
  }catch(e){ console.error(`✗ ${item.name}: ${e.message}`); }
  await new Promise(x=>setTimeout(x,1500));
}
console.log(`\nFertig: ${made}/${list.length} Bilder erzeugt → ${DIR}/`);
