import { execSync } from 'child_process';
import fs from 'fs';
const [PID, GID, PRICE, OUT] = process.argv.slice(2);
const j=JSON.parse(execSync(`/opt/node22/bin/node dropship/cj_variants.mjs ${PID}`).toString());
const PW=/sexy|bikini|set|one[- ]?piece|solid[- ]?color|dress|shirt|polo|skirt|trousers|pants|swimsuit|three[- ]?piece|halter[- ]?neck|lace trim|knitted|business|elegant|sophisticated|womens|women|men|cotton linen|ramie|casual|short[- ]?sleeved|a[- ]?line|shirt[- ]?collar|printed|fashionable|ruffled|long|double[- ]?layered|lined|beach|spring|autumn|for/ig;
const clean=s=>{let c=s.replace(PW,'').replace(/\s+/g,' ').trim();return c||s.trim();};
const cmap={}; j.variants.forEach(v=>{ if(!(v.color in cmap)) cmap[v.color]=clean(v.color); });
// kollisionsschutz
const seen={}; for(const k in cmap){ let c=cmap[k]; if(!c||seen[c]) c=k; seen[c]=1; cmap[k]=c; }
const cimg={}; j.variants.forEach(v=>{ if(v.img && !cimg[cmap[v.color]]) cimg[cmap[v.color]]=v.img; });
const colors=[...new Set(Object.values(cmap))], sizes=[...new Set(j.variants.map(v=>v.size))];
const multiColor=colors.length>1, hasSize=sizes.some(s=>s&&s!=='Einheitsgrösse');
if(!multiColor || Object.keys(cimg).length<2){ console.log(`${OUT}: SKIP (keine Mehrfarb-Bilder)`); process.exit(0); }
const files=[...new Set(Object.values(cimg))].map(u=>({originalSource:u,contentType:'IMAGE'}));
const opts=[{name:'Farbe',values:colors.map(n=>({name:n}))}];
if(hasSize) opts.push({name:'Grösse',values:sizes.map(n=>({name:n}))});
const variants=j.variants.map(v=>{
  const ov=[{optionName:'Farbe',name:cmap[v.color]}];
  if(hasSize) ov.push({optionName:'Grösse',name:v.size});
  return {optionValues:ov, price:PRICE, inventoryItem:{sku:v.sku,tracked:false}, file:{originalSource:cimg[cmap[v.color]],contentType:'IMAGE'}};
});
// dedupe option combos
const key=v=>v.optionValues.map(o=>o.name).join('|'); const used=new Set(); const uniq=[];
for(const v of variants){const k=key(v);if(used.has(k))continue;used.add(k);uniq.push(v);}
fs.writeFileSync(OUT, JSON.stringify({input:{id:GID, productOptions:opts, files, variants:uniq}}));
console.log(`${OUT}: ${colors.length} Farben x ${hasSize?sizes.length:1} = ${uniq.length} Var, ${files.length} Farbbilder`);
