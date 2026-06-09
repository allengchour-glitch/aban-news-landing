#!/usr/bin/env node
/* LuxeStyle — gen_stickers.mjs
 * Generiert Die-Cut-Sticker (Cliparts) via Gemini 2.5 Flash Image (Nano Banana) → social/stickers/*.png.
 * Quelle: social/stickers/prompts.json  [{name, prompt}].
 * Schreibt zusätzlich social/stickers/index.json (Liste der vorhandenen Sticker) für das Designer-Grid.
 * No-op ohne GEMINI_API_KEY. ENV: GEMINI_API_KEY, [GEMINI_IMAGE_MODEL], [ONLY=name,name]
 */
import fs from 'node:fs';
const KEY=process.env.GEMINI_API_KEY||'';
const MODEL=process.env.GEMINI_IMAGE_MODEL||'gemini-2.5-flash-image';
const ONLY=(process.env.ONLY||'').split(',').map(s=>s.trim()).filter(Boolean);
const BASE='https://generativelanguage.googleapis.com/v1beta';
const DIR='social/stickers';
fs.mkdirSync(DIR,{recursive:true});

let list=[];
try{ list = JSON.parse(fs.readFileSync(DIR+'/prompts.json','utf8')); }catch(e){ console.error('prompts.json fehlt:',e.message); }
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

if(KEY){
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
  console.log(`\nFertig: ${made}/${list.length} Sticker erzeugt → ${DIR}/`);
} else {
  console.log('Kein GEMINI_API_KEY → generiere nichts, baue nur index.json aus vorhandenen PNGs.');
}

// index.json aus tatsächlich vorhandenen PNGs bauen (Reihenfolge wie prompts.json, Rest angehängt)
const present=new Set(fs.readdirSync(DIR).filter(f=>f.endsWith('.png')).map(f=>f.replace(/\.png$/,'')));
const ordered=[];
for(const it of list){ if(present.has(it.name)){ ordered.push(it.name); present.delete(it.name); } }
for(const n of present) ordered.push(n);
fs.writeFileSync(DIR+'/index.json', JSON.stringify(ordered,null,0));
console.log(`index.json: ${ordered.length} Sticker → ${DIR}/index.json`);
