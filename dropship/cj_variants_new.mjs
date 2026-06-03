#!/usr/bin/env node
/**
 * Neues Mode-Produkt via productSet (OHNE id → Shopify legt neu an) aus CJ-Variantenmatrix.
 * Aufruf: node dropship/cj_variants_new.mjs <VFILE> <PRICE> <PRODUCTTYPE> <TAGS> <TITLE> <DESCFILE> <OUT>
 *   VFILE     = /tmp/v_<x>.json (Ausgabe von cj_variants.mjs)
 *   PRICE     = CHF-Verkaufspreis (z.B. 24.90)
 *   PRODUCTTYPE = z.B. "Damenmode"
 *   TAGS      = kommagetrennt (z.B. "neu,cj-real,dropship,damen,damen-mode")
 *   TITLE     = Shopify-Titel (in Anführungszeichen)
 *   DESCFILE  = Datei mit descriptionHtml
 *   OUT       = Ziel-JSON für productSet-input
 * Farbnamen bleiben (wie bei den Bestandsartikeln) englisch; jede Farbe → erstes Variantenbild.
 */
import fs from 'fs';
const [VFILE, PRICE, PRODUCTTYPE, TAGS, TITLE, DESCFILE, OUT] = process.argv.slice(2);
const j = JSON.parse(fs.readFileSync(VFILE));
// Produktwörter aus Farbnamen entfernen (CJ packt manchmal Produkttext rein)
const PW=/sexy|bikini|set|one[- ]?piece|solid[- ]?color|dress|shirt|polo|skirt|trousers|pants|swimsuit|cardigan|hoodie|vest|cover[- ]?up|three[- ]?piece|halter[- ]?neck|lace trim|knitted|business|elegant|womens|women|men|cotton linen|ramie|casual|short[- ]?sleeved|a[- ]?line|printed|fashionable|ruffled|long|beach|spring|autumn|for/ig;
const clean=s=>{let c=s.replace(PW,'').replace(/\s+/g,' ').trim();return c||s.trim();};
const cmap={}; j.variants.forEach(v=>{ if(!(v.color in cmap)) cmap[v.color]=clean(v.color); });
const seen={}; for(const k in cmap){ let c=cmap[k]; if(!c||seen[c]) c=k; seen[c]=1; cmap[k]=c; }
const cimg={}; j.variants.forEach(v=>{ if(v.img && !cimg[cmap[v.color]]) cimg[cmap[v.color]]=v.img; });
const colors=[...new Set(Object.values(cmap))], sizes=[...new Set(j.variants.map(v=>v.size))];
const hasSize=sizes.some(s=>s&&s!=='Einheitsgrösse');
const files=[...new Set(Object.values(cimg))].map(u=>({originalSource:u,contentType:'IMAGE'}));
const opts=[{name:'Farbe',values:colors.map(n=>({name:n}))}];
if(hasSize) opts.push({name:'Grösse',values:sizes.map(n=>({name:n}))});
let variants=j.variants.map(v=>{
  const ov=[{optionName:'Farbe',name:cmap[v.color]}];
  if(hasSize) ov.push({optionName:'Grösse',name:v.size});
  return {optionValues:ov, price:PRICE, inventoryItem:{sku:v.sku,tracked:false}, file:{originalSource:cimg[cmap[v.color]],contentType:'IMAGE'}};
});
// dedupe gleiche Optionskombis
const key=v=>v.optionValues.map(o=>o.name).join('|'); const used=new Set(); const uniq=[];
for(const v of variants){const k=key(v);if(used.has(k))continue;used.add(k);uniq.push(v);}
const input={
  title:TITLE,
  descriptionHtml:fs.readFileSync(DESCFILE,'utf8'),
  vendor:'LuxeStyle',
  productType:PRODUCTTYPE,
  status:'ACTIVE',
  tags:TAGS.split(','),
  productOptions:opts,
  files,
  variants:uniq,
};
fs.writeFileSync(OUT, JSON.stringify({input}));
console.log(`${OUT}: ${colors.length} Farben x ${hasSize?sizes.length:1} = ${uniq.length} Var, ${files.length} Farbbilder | ${TITLE}`);
