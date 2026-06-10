#!/usr/bin/env node
/* LuxeStyle — gen_designs.mjs
 * Generiert Print-fertige Fertig-Designs via Gemini 2.5 Flash Image (Nano Banana) → social/designs/*.png.
 * Gemini liefert KEINE echte Transparenz (malt ein Schachbrett). Daher generieren wir die Sticker auf
 * SOLIDEM MAGENTA-Hintergrund und keyen Magenta hier per pngjs zu echtem Alpha (transparent) aus.
 * Quelle: social/designs/prompts.json  [{name, prompt}].  Schreibt social/designs/index.json fürs Grid.
 * No-op ohne GEMINI_API_KEY. ENV: GEMINI_API_KEY, [GEMINI_IMAGE_MODEL], [ONLY=name,name], [NO_KEY=1]
 */
import fs from 'node:fs';
const KEY=process.env.GEMINI_API_KEY||'';
const MODEL=process.env.GEMINI_IMAGE_MODEL||'gemini-2.5-flash-image';
const ONLY=(process.env.ONLY||'').split(',').map(s=>s.trim()).filter(Boolean);
const NO_KEY=process.env.NO_KEY==='1';
const MAXRUN=Math.max(1,parseInt(process.env.MAX||'45',10)||45);
const FORCE=process.env.FORCE==='1';
const BASE='https://generativelanguage.googleapis.com/v1beta';
const DIR='social/designs';
fs.mkdirSync(DIR,{recursive:true});

let PNG=null;
try{ ({PNG}=await import('pngjs')); }catch(e){ console.warn('pngjs nicht verfügbar → kein Chroma-Key, schreibe rohe PNGs:',e.message); }

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

// Magenta (#FF00FF) → transparent. Weicher Übergang + Despill der Magenta-Säume.
function keyMagenta(buf){
  if(!PNG||NO_KEY) return buf;
  const png=PNG.sync.read(buf);
  const d=png.data;
  for(let i=0;i<d.length;i+=4){
    const r=d[i],g=d[i+1],b=d[i+2];
    const m=Math.min(r,b)-g;                 // hoch = magentafarben
    let a;
    if(m<=30) a=255; else if(m>=90) a=0; else a=Math.round(255*(90-m)/60);
    if(a<255){ // Despill: Magenta-Säume entsättigen (r,b Richtung g)
      d[i]=Math.min(r,g+12); d[i+2]=Math.min(b,g+12);
    }
    d[i+3]=a;
  }
  return PNG.sync.write(png);
}

if(KEY){
  let made=0;
  for(const item of list){
    const outp=`${DIR}/${item.name}.png`;
    if(!FORCE && fs.existsSync(outp)){ continue; }   // nur fehlende generieren
    if(made>=MAXRUN){ console.log(`MAX ${MAXRUN} erreicht — Rest beim nächsten Lauf.`); break; }
    try{
      const b64=await genImage(item.prompt);
      let buf=Buffer.from(b64,'base64');
      try{ buf=keyMagenta(buf); }catch(e){ console.warn('Key-Fehler '+item.name+': '+e.message); }
      const out=`${DIR}/${item.name}.png`;
      fs.writeFileSync(out, buf);
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
