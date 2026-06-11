#!/usr/bin/env node
/* LuxeStyle — enhance_clips.mjs
 * "Veredeln → kurzer Clip": Nimmt echte Produktfotos (automation/good_products.csv), lässt Gemini
 * ("Nano Banana", Bild-zu-Bild) eine PREMIUM-Editorial-Szene rendern (Produkt bleibt 100% echt,
 * Lieferanten-Text/Overlays werden entfernt) und macht daraus per ffmpeg einen ruhigen 2–3-Sek-
 * VERTIKAL-Clip (1080×1920, sanfter Ken-Burns-Zoom, Musikbett, dezenter CTA). Reiht ihn als VIDEO
 * in social/video_queue.csv (status=ready) für Instagram/Facebook/Threads ein.
 *
 * Produkttreu (Marken-Regel 1+10): KI nur Licht/Hintergrund/Bewegung, Produkt unverändert.
 * Reuse: vorhandene social/enhanced/<name>.jpg werden wiederverwendet (Kostenbremse).
 * No-op ohne GEMINI_API_KEY (Enhance) — vorhandene Enhanced-Bilder werden trotzdem zu Clips.
 *
 * ENV: GEMINI_API_KEY · [GEMINI_IMAGE_MODEL] · [BATCH=4] · [CLIP_SEC=2.6] · [CLIP_ONLY=name,..]
 *      [OUT_BASE_URL=https://abannews.com] · [SITE_URL=https://luxestyle.ch] · [MUSIC=automation/reel_music.m4a] · [DRY_RUN=1]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { balanceByCategory } from './lib/reel-category.mjs';

const KEY=process.env.GEMINI_API_KEY||'';
const MODEL=process.env.GEMINI_IMAGE_MODEL||'gemini-2.5-flash-image';
const GBASE=process.env.GEMINI_BASE_URL||'https://generativelanguage.googleapis.com/v1beta';
const OUT_BASE=(process.env.OUT_BASE_URL||'https://abannews.com').replace(/\/$/,'');
const SITE=(process.env.SITE_URL||'https://luxestyle.ch').replace(/\/$/,'');
const BATCH=Math.max(1,parseInt(process.env.BATCH||'4',10)||4);
const SEC=Math.min(4,Math.max(2,parseFloat(process.env.CLIP_SEC||'2.6')||2.6));
const ONLY=(process.env.CLIP_ONLY||'').split(',').map(s=>s.trim()).filter(Boolean);
const DRY=process.env.DRY_RUN==='1';

const HERE=path.dirname(new URL(import.meta.url).pathname);
const ROOT=path.dirname(HERE);
const GOOD=path.join(HERE,'good_products.csv');
const ENH_DIR=path.join(ROOT,'social','enhanced');
const REELS=path.join(ROOT,'reels');
const QUEUE=path.join(ROOT,'social','video_queue.csv');
const POINTER=path.join(HERE,'.clip_pointer');
const MUSIC=path.join(ROOT, process.env.MUSIC||'automation/reel_music.m4a');
const FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

const CAPTIONS=[
  '{label} ✨ Premium-Look zum fairen Preis. Code WELCOME10 = -10% · 🔗 Link in Bio',
  'Neu entdeckt: {label} 🤍 Schweizer Shop · Gratis-Versand ab CHF 65 · 🔗 Link in Bio',
  'Dein Sommer-Liebling? {label} 🌿 -10% mit WELCOME10 · 30 Tage Rückgabe · 🔗 Link in Bio',
  '{label} — premium & bezahlbar. Jetzt mit Code WELCOME10 · 🔗 Link in Bio',
];
const _reach='#schweiz #foryou #luxestyle';
function pickTags(s){
  s=(s||'').toLowerCase();
  if(/herren|m\u00e4nner|menswear|\bmen\b/.test(s)) return _reach+' #herrenmode #menstyle';
  if(/sneaker|slides|sandal|schuh|stiefel|boot|loafer/.test(s)) return _reach+' #sneaker #shoes';
  if(/kette|ohrring|armreif|armband|\bring\b|schmuck|halskette|anh\u00e4nger|moissanite|zirkonia/.test(s)) return _reach+' #schmuck #jewelry';
  if(/serum|gua-?sha|creme|roller|beauty|pflege|skincare|maske/.test(s)) return _reach+' #skincare #selfcare';
  if(/st\u00e4nder|stander|halter|gadget|tech|lampe|deko|vase|kerze|organizer|\bhome\b/.test(s)) return _reach+' #gadget #lifestyle';
  if(/tasche|\bbag\b|handtasche|crossbody|clutch|rucksack/.test(s)) return _reach+' #handtasche #bag';
  if(/kleid|\brock\b|dress|skirt|bluse/.test(s)) return _reach+' #sommerkleid #damenmode';
  if(/blazer|cardigan|hemd|shirt|jacke|mantel|\btop\b|weste|strick|\bset\b|mode/.test(s)) return _reach+' #fashionschweiz #ootdschweiz';
  if(/sonnenbrille|brille|\bhut\b|\bcap\b|g\u00fcrtel|schal|accessoire/.test(s)) return _reach+' #accessoires #ootdschweiz';
  return _reach+' #neu #ootdschweiz';
}
const PROMPT=`Premium editorial fashion photograph for a Swiss boutique. Use the provided product image as the EXACT reference: keep the product 100% identical — same garment/accessory, same colours, same pattern, same cut and details. Do NOT redesign or alter the product in any way. Improve ONLY the lighting, background and mood: soft natural daylight, elegant minimal premium setting, gentle shadows, shallow depth of field, refined luxury-boutique aesthetic, true-to-life colours. IMPORTANT: completely REMOVE any text, watermarks, variant labels or graphic overlays that are on the original image. COMPOSITION: show the full product a little smaller in frame with elegant negative space, well-centred, vertical 9:16, high quality, photorealistic, no added text or logos.`;

function esc(v){ v=String(v??''); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }
function readGood(){ const lines=fs.readFileSync(GOOD,'utf8').split('\n').filter(Boolean).slice(1);
  return lines.map(l=>{const[name,image_url,label,handle]=l.split(',');return{name:(name||'').trim(),image_url:(image_url||'').trim(),label:(label||'').trim(),handle:(handle||'').trim()};}).filter(p=>p.name&&p.image_url); }
function loadPointer(n){ try{ return parseInt(fs.readFileSync(POINTER,'utf8').trim(),10)%n; }catch{ return 0; } }
async function fetchT(url,opts={},ms=60000){ const c=new AbortController(); const t=setTimeout(()=>c.abort(),ms);
  try{ return await fetch(url,{...opts,signal:c.signal}); } finally{ clearTimeout(t); } }
async function fetchImage(url){ const r=await fetchT(url,{},30000); if(!r.ok) throw new Error('Bild '+url+' HTTP '+r.status);
  const ct=(r.headers.get('content-type')||'').split(';')[0]||'image/jpeg'; return {b64:Buffer.from(await r.arrayBuffer()).toString('base64'),mime:ct}; }
function extractImage(j){ const parts=j?.candidates?.[0]?.content?.parts||[]; for(const p of parts){ const d=p.inline_data||p.inlineData; if(d?.data) return d.data; } return null; }
async function enhance(img){ const url=`${GBASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`;
  const body={contents:[{role:'user',parts:[{text:PROMPT},{inline_data:{mime_type:img.mime,data:img.b64}}]}],generationConfig:{responseModalities:['IMAGE'],temperature:0.5}};
  const r=await fetchT(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},120000);
  const j=await r.json().catch(()=>({})); if(!r.ok){ console.error('Gemini:',r.status,JSON.stringify(j.error||j).slice(0,200)); return null; } return extractImage(j); }

function makeClip(imgPath,outPath){
  const total=Math.round(SEC*30);
  const vf=`scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,scale=2160:3840,`
    +`zoompan=z='min(zoom+0.0008,1.12)':d=${total}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':fps=30:s=1080x1920,`
    +`drawtext=fontfile=${FONT}:text='luxestyle.ch   ·   WELCOME10 -10%':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=h-160:box=1:boxcolor=black@0.38:boxborderw=16,`
    +`format=yuv420p`;
  const hasMusic=fs.existsSync(MUSIC);
  const args=['-nostdin','-y','-loop','1','-t',String(SEC),'-i',imgPath];
  if(hasMusic) args.push('-i',MUSIC);
  args.push('-filter_complex',`[0:v]${vf}[v]`,'-map','[v]');
  if(hasMusic){ args.push('-map','1:a','-af',`afade=t=in:st=0:d=0.4,afade=t=out:st=${(SEC-0.4).toFixed(2)}:d=0.4,volume=0.65`,'-c:a','aac','-b:a','128k','-shortest'); }
  args.push('-t',String(SEC),'-r','30','-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-movflags','+faststart',outPath);
  execFileSync('ffmpeg',args,{stdio:['ignore','ignore','inherit'],timeout:120000});
}

const products=balanceByCategory(readGood(), p => `${p.name} ${p.label}`);
let queue;
if(ONLY.length) queue=products.filter(p=>ONLY.includes(p.name));
else { const start=loadPointer(products.length); queue=[]; for(let k=0;k<BATCH;k++) queue.push(products[(start+k)%products.length]); }

fs.mkdirSync(ENH_DIR,{recursive:true}); fs.mkdirSync(REELS,{recursive:true});
const today=new Date().toISOString().slice(0,10);
const existingIds=new Set(fs.existsSync(QUEUE)?fs.readFileSync(QUEUE,'utf8').split('\n').map(l=>l.split(',')[0]):[]);
const newRows=[]; let made=0;

for(let k=0;k<queue.length;k++){
  const p=queue[k]; const id=`clip-${p.name}-${today}`;
  if(existingIds.has(id)){ console.log('· schon in Queue:',id); continue; }
  const enhPath=path.join(ENH_DIR,`${p.name}.jpg`);
  console.log(`→ «${p.label||p.name}»`);
  try{
    if(!fs.existsSync(enhPath)){
      if(DRY){ console.log('   DRY: würde veredeln + Clip bauen'); made++; continue; }
      if(!KEY){ console.log('   kein GEMINI_API_KEY und kein Enhanced-Bild → übersprungen'); continue; }
      const src=await fetchImage(p.image_url); const b64=await enhance(src);
      if(!b64){ console.error('   ⚠️ keine KI-Bilddaten'); continue; }
      fs.writeFileSync(enhPath,Buffer.from(b64,'base64')); console.log('   ✅ veredelt');
    } else console.log('   ↺ Enhanced-Bild vorhanden');
    if(DRY){ made++; continue; }
    const outPath=path.join(REELS,`clip-${p.name}.mp4`);
    makeClip(enhPath,outPath);
    const kb=(fs.statSync(outPath).size/1024)|0; console.log(`   🎬 ${outPath} (${kb}kB)`);
    const url=p.handle?`${SITE}/products/${p.handle}`:SITE;
    const cap=CAPTIONS[made%CAPTIONS.length].replace('{label}',p.label||p.name).replace('{url}',url);
    const tags=pickTags(`${p.name} ${p.label||''}`);
    newRows.push([id,today,`${OUT_BASE}/reels/clip-${p.name}.mp4`,`${cap}\n${tags}`,'instagram,facebook,threads','ready','','']);
    made++;
  }catch(e){ console.error('   Fehler:',e.message); }
}

if(!DRY){
  if(!ONLY.length){ const start=loadPointer(products.length); fs.writeFileSync(POINTER,String((start+BATCH)%products.length)); }
  if(newRows.length){
    const exists=fs.existsSync(QUEUE)&&fs.statSync(QUEUE).size>0;
    let out=exists?'':'id,scheduled_date,video_url,caption,platforms,status,posted_at,post_url\n';
    out+=newRows.map(r=>r.map(esc).join(',')).join('\n')+'\n';
    fs.appendFileSync(QUEUE,out);
  }
}
console.log(`Fertig: ${made} Clip(s)${DRY?' (DRY)':''} → Video-Queue (ready).`);
