import { umbauen } from './lib/queue_csv.mjs';   // gemeinsame Queue-Sperre (14.10.2026)
const CSV='social/posts_image.csv';
const metaLeak=/\b(the user|der user|we need|we did|i need|i'll|here'?s|sure,|as a swiss|caption for|social media caption|sentences with|high german|hochdeutsch,? no|want(s)? (a|me)|advantages?\b|hashtags? \(|let'?s craft|ensure|begin directly)\b/i;
// 14.10.2026: NICHT mehr selbst lesen und die ganze Datei mit fs.writeFileSync zurückschreiben (ohne Sperre, O_TRUNC — ein
// Poster/Motor, der dazwischen schreibt, verliert seine Zeile). umbauen() liest unter der gemeinsamen Queue-Sperre FRISCH,
// setzt nur die schlechten Captions auf skip und schreibt atomar. Ohne Treffer wird nichts geschrieben (früher: dieselbe
// Datei unverändert neu geschrieben).
let cleaned=0;
umbauen(CSV, rows=>{
  const H=rows[0]; const ci=Object.fromEntries(H.map((h,i)=>[h.trim(),i]));
  for(const r of rows.slice(1)){ if((r[ci.status]||'').trim()!=='ready')continue;
    const cap=r[ci.caption]||'';
    if(!cap.includes('#') || metaLeak.test(cap)){ r[ci.status]='bad-caption-skip'; cleaned++; }
  }
  return cleaned ? rows : null;
});
console.log('Un-ready (bad-caption-skip):',cleaned);
