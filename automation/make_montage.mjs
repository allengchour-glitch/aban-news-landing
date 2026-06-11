#!/usr/bin/env node
/* LuxeStyle — make_montage.mjs
 * Baut aus mehreren VEREDELTEN Produktbildern (social/enhanced/<name>.jpg) EIN einziges Hochkant-Video
 * (1080×1920): je Produkt ein ~2,5-Sek-Segment mit sanftem Zoom + IMMER Produktname-Text (oben) + CTA
 * (unten), zusammengefügt mit durchlaufendem Musikbett. Ergebnis: reels/montage-<datum>.mp4, plus
 * Eintrag in social/video_queue.csv (status=ready) für IG/FB/Threads.
 *
 * Labels/Handles aus automation/good_products.csv (name,image_url,label,handle).
 * ENV: [SEG=2.6] · [MAX_SEG=8] · [MONTAGE_ONLY=name,..] · [OUT_BASE_URL] · [SITE_URL] · [MUSIC=automation/reel_music.m4a]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SEG=Math.min(4,Math.max(2,parseFloat(process.env.SEG||'2.6')||2.6));
const MAX_SEG=Math.max(2,parseInt(process.env.MAX_SEG||'8',10)||8);
const ONLY=(process.env.MONTAGE_ONLY||'').split(',').map(s=>s.trim()).filter(Boolean);
const OUT_BASE=(process.env.OUT_BASE_URL||'https://abannews.com').replace(/\/$/,'');
const SITE=(process.env.SITE_URL||'https://luxestyle.ch').replace(/\/$/,'');
const HERE=path.dirname(new URL(import.meta.url).pathname);
const ROOT=path.dirname(HERE);
const GOOD=path.join(HERE,'good_products.csv');
const ENH=path.join(ROOT,'social','enhanced');
const REELS=path.join(ROOT,'reels');
const QUEUE=path.join(ROOT,'social','video_queue.csv');
const MUSIC=path.join(ROOT, process.env.MUSIC||'automation/reel_music.m4a');
const FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const TMP='/tmp/montage'; fs.mkdirSync(TMP,{recursive:true}); fs.mkdirSync(REELS,{recursive:true});

function esc(v){ v=String(v??''); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }
const good=fs.readFileSync(GOOD,'utf8').split('\n').filter(Boolean).slice(1)
  .map(l=>{const[name,image_url,label,handle]=l.split(',');return{name:(name||'').trim(),label:(label||'').trim(),handle:(handle||'').trim()};});
let list=good.filter(p=>fs.existsSync(path.join(ENH,`${p.name}.jpg`)));
if(ONLY.length) list=list.filter(p=>ONLY.includes(p.name));
list=list.slice(0,MAX_SEG);
if(list.length<2){ console.log('Zu wenige veredelte Bilder für eine Montage ('+list.length+'). No-op.'); process.exit(0); }
console.log('Segmente:', list.map(p=>p.name).join(', '));

const total=Math.round(SEG*30);
function wtf(p,txt){ const f=path.join(TMP,p); fs.writeFileSync(f,txt); return f; }
const ctaFile=wtf('cta.txt','luxestyle.ch   ·   WELCOME10  -10%');

const segFiles=[];
list.forEach((p,i)=>{
  const img=path.join(ENH,`${p.name}.jpg`);
  const parts=p.label.split('·'); const l1=(parts[0]||p.name).trim(); const l2=parts.slice(1).join('·').trim();
  const f1=wtf(`l1_${i}.txt`,l1);
  let drawTop=`drawtext=textfile=${f1}:fontfile=${FONT}:fontcolor=white:fontsize=52:x=(w-text_w)/2:y=96:box=1:boxcolor=black@0.45:boxborderw=18`;
  if(l2){ const f2=wtf(`l2_${i}.txt`,l2); drawTop+=`,drawtext=textfile=${f2}:fontfile=${FONT}:fontcolor=0xEAD9B0:fontsize=32:x=(w-text_w)/2:y=170:box=1:boxcolor=black@0.40:boxborderw=12`; }
  const vf=`[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,scale=2160:3840,`
    +`zoompan=z='min(zoom+0.0009,1.12)':d=${total}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':fps=30:s=1080x1920,`
    +`${drawTop},`
    +`drawtext=textfile=${ctaFile}:fontfile=${FONT}:fontcolor=white:fontsize=40:x=(w-text_w)/2:y=h-150:box=1:boxcolor=black@0.42:boxborderw=16,`
    +`format=yuv420p[v]`;
  const out=path.join(TMP,`seg_${i}.mp4`);
  try{
    execFileSync('ffmpeg',['-nostdin','-y','-loop','1','-t',String(SEG),'-i',img,'-filter_complex',vf,'-map','[v]',
      '-t',String(SEG),'-r','30','-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p',out],{stdio:['ignore','ignore','pipe'],timeout:120000});
  }catch(e){ console.error(`✗ Segment ${p.name}: ffmpeg-Fehler\n`+String(e.stderr||e.message).slice(-700)); throw e; }
  segFiles.push(out); console.log(`  ✓ Segment ${i+1}/${list.length} «${l1}»`);
});

// concat (gleiche Parameter → copy)
const listFile=path.join(TMP,'list.txt');
fs.writeFileSync(listFile, segFiles.map(f=>`file '${f}'`).join('\n')+'\n');
const silent=path.join(TMP,'silent.mp4');
execFileSync('ffmpeg',['-nostdin','-y','-f','concat','-safe','0','-i',listFile,'-c','copy',silent],{stdio:['ignore','ignore','inherit'],timeout:120000});

const TOTAL=(SEG*list.length).toFixed(2);
const date=new Date().toISOString().slice(0,10);
const outMp4=path.join(REELS,`montage-${date}.mp4`);
const aArgs=['-nostdin','-y','-i',silent];
if(fs.existsSync(MUSIC)) aArgs.push('-stream_loop','-1','-i',MUSIC,'-map','0:v','-map','1:a:0',
  '-af',`afade=t=in:st=0:d=0.6,afade=t=out:st=${(TOTAL-0.9)}:d=0.9,volume=0.6`,'-c:a','aac','-b:a','128k');
else aArgs.push('-map','0:v');
aArgs.push('-c:v','copy','-t',String(TOTAL),'-shortest','-movflags','+faststart',outMp4);
execFileSync('ffmpeg',aArgs,{stdio:['ignore','ignore','inherit'],timeout:120000});
console.log(`🎬 ${outMp4} (${(fs.statSync(outMp4).size/1024/1024).toFixed(1)} MB, ${TOTAL}s)`);

// Queue-Eintrag
const id=`montage-${date}`;
const exists=fs.existsSync(QUEUE)&&fs.statSync(QUEUE).size>0;
const already=exists&&fs.readFileSync(QUEUE,'utf8').split('\n').some(l=>l.startsWith(id+','));
if(!already){
  const names=list.map(p=>p.label.split('·')[0].trim()).slice(0,5).join(' · ');
  const cap=`Neue Sommer-Favoriten ✨ ${names} & mehr bei LuxeStyle 🇨🇭 -10% mit WELCOME10 · 🔗 Link in Bio\n#schweizmode #sommermode2026 #ootdschweiz #fashionreels #luxestyle`;
  let out=exists?'':'id,scheduled_date,video_url,caption,platforms,status,posted_at,post_url\n';
  out+=[id,date,`${OUT_BASE}/reels/montage-${date}.mp4`,cap,'instagram,facebook,threads','ready','',''].map(esc).join(',')+'\n';
  fs.appendFileSync(QUEUE,out);
  console.log('→ in Video-Queue (ready):',id);
}
