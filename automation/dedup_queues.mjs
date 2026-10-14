import fs from 'node:fs';
import { umbauen } from './lib/queue_csv.mjs';   // gemeinsame Queue-Sperre (14.10.2026)
const mediaKey=u=>(u||'').split('?')[0].split('/').pop().toLowerCase().trim();
function parseCsv(t){const rows=[];let row=[],cur='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'&&t[i+1]==='"'){cur+='"';i++;}else if(c==='"')q=false;else cur+=c;}else if(c==='"')q=true;else if(c===','){row.push(cur);cur='';}else if(c==='\n'){row.push(cur);rows.push(row);row=[];cur='';}else if(c!=='\r')cur+=c;}if(cur||row.length){row.push(cur);rows.push(row);}return rows;}
// reels_seed = Reel-Owner. Alles was dort (irgendein Status) vorkommt, in video_queue auf skip.
const reels=parseCsv(fs.readFileSync('automation/reels_seed.csv','utf8'));
const rh=reels[0].map(h=>h.trim()); const rVid=rh.indexOf('video_url');
const reelKeys=new Set(reels.slice(1).filter(r=>r[rVid]).map(r=>mediaKey(r[rVid])));
// 14.10.2026: video_queue.csv NICHT mehr selbst lesen und ganz zurückschreiben (fester Weg ohne Sperre, O_TRUNC — ein
// Poster, der dazwischen einen Status setzt, verliert ihn). umbauen() liest unter der gemeinsamen Queue-Sperre FRISCH,
// setzt nur die Dubletten auf skip und schreibt atomar; ohne Treffer wird nichts geschrieben (wie bisher).
let skipped=0;
umbauen('social/video_queue.csv', vq=>{
  const vh=vq[0].map(h=>h.trim()); const vVid=vh.indexOf('video_url'), vStat=vh.indexOf('status');
  for(const r of vq.slice(1)){
    if(!r[vVid])continue;
    if(reelKeys.has(mediaKey(r[vVid])) && (r[vStat]||'').trim()==='ready'){ r[vStat]='dup-reel-owner-skip'; skipped++; console.log('  skip in video_queue:',mediaKey(r[vVid])); }
  }
  return skipped ? vq : null;
});
console.log(`Cross-Queue-Dedup: ${skipped} Zeile(n) in video_queue.csv auf skip (reels_seed ist Reel-Owner).`);
