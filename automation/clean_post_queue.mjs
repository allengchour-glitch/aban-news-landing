import fs from 'node:fs';
const CSV='social/posts_image.csv';
const raw=fs.readFileSync(CSV,'utf8');
function parseCSV(t){const rows=[];let row=[],cur='',q=false;for(let i=0;i<t.length;i++){const c=t[i];
  if(q){if(c==='"'&&t[i+1]==='"'){cur+='"';i++;}else if(c==='"')q=false;else cur+=c;}
  else if(c==='"')q=true;else if(c===','){row.push(cur);cur='';}else if(c==='\n'){row.push(cur);rows.push(row);row=[];cur='';}else if(c!=='\r')cur+=c;}
  if(cur||row.length){row.push(cur);rows.push(row);}return rows;}
const esc=x=>/[",\n]/.test(x)?'"'+String(x).replace(/"/g,'""')+'"':x;
const rows=parseCSV(raw); const H=rows[0]; const ci=Object.fromEntries(H.map((h,i)=>[h.trim(),i]));
const metaLeak=/\b(the user|der user|we need|we did|i need|i'll|here'?s|sure,|as a swiss|caption for|social media caption|sentences with|high german|hochdeutsch,? no|want(s)? (a|me)|advantages?\b|hashtags? \(|let'?s craft|ensure|begin directly)\b/i;
let cleaned=0;
for(const r of rows.slice(1)){ if((r[ci.status]||'').trim()!=='ready')continue;
  const cap=r[ci.caption]||'';
  if(!cap.includes('#') || metaLeak.test(cap)){ r[ci.status]='bad-caption-skip'; cleaned++; }
}
fs.writeFileSync(CSV, rows.map(r=>r.map(esc).join(',')).join('\n')+'\n');
console.log('Un-ready (bad-caption-skip):',cleaned);
