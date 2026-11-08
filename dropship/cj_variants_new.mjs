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
 * Sichtbare Farb-/Groessenwerte werden konservativ uebersetzt; unbekannte Werte blockieren die Ausgabe.
 */
import fs from 'fs';
import { cjImportSicherheitsdaten, pruefeCjImportText } from '../automation/lib/cj_import_guard.mjs';
import { uebersetzeCjFarbe, uebersetzeCjGroesse } from '../automation/lib/cj_optionen_de.mjs';
const [VFILE, PRICE, PRODUCTTYPE, TAGS, TITLE, DESCFILE, OUT] = process.argv.slice(2);
const j = JSON.parse(fs.readFileSync(VFILE));
// Produktwörter aus Farbnamen entfernen (CJ packt manchmal Produkttext rein)
const PW=/sexy|bikini|set|one[- ]?piece|solid[- ]?color|dress|shirt|polo|skirt|trousers|pants|swimsuit|cardigan|hoodie|vest|cover[- ]?up|three[- ]?piece|halter[- ]?neck|lace trim|knitted|business|elegant|womens|women|men|cotton linen|ramie|casual|short[- ]?sleeved|a[- ]?line|printed|fashionable|ruffled|long|beach|spring|autumn|for/ig;
const clean=s=>{let c=s.replace(PW,'').replace(/\s+/g,' ').trim();return c||s.trim();};
const cmap={}; for(const v of j.variants){if(v.color in cmap)continue;const farbe=uebersetzeCjFarbe(clean(v.color)||'Standard');
  if(farbe.status!=='OK')throw new Error(`OPTION_LANGUAGE_BLOCKED: ${farbe.grund}`);cmap[v.color]=farbe.wert;}
const seen={}; for(const k in cmap){ let c=cmap[k]; if(!c||seen[c]) c=k; seen[c]=1; cmap[k]=c; }
const cimg={}; j.variants.forEach(v=>{ if(v.img && !cimg[cmap[v.color]]) cimg[cmap[v.color]]=v.img; });
const colors=[...new Set(Object.values(cmap))], sizes=[];for(const raw of new Set(j.variants.map(v=>v.size))){const groesse=uebersetzeCjGroesse(raw);
  if(groesse.status!=='OK')throw new Error(`OPTION_LANGUAGE_BLOCKED: ${groesse.grund}`);sizes.push(groesse.wert);}
const hasSize=sizes.some(s=>s&&s!=='Einheitsgrösse');
const files=[...new Set(Object.values(cimg))].map(u=>({originalSource:u,contentType:'IMAGE'}));
const opts=[{name:'Farbe',values:colors.map(n=>({name:n}))}];
if(hasSize) opts.push({name:'Grösse',values:sizes.map(n=>({name:n}))});
let variants=j.variants.map(v=>{
  const ov=[{optionName:'Farbe',name:cmap[v.color]}];
  if(hasSize){const groesse=uebersetzeCjGroesse(v.size);if(groesse.status!=='OK')throw new Error(`OPTION_LANGUAGE_BLOCKED: ${groesse.grund}`);ov.push({optionName:'Grösse',name:groesse.wert});}
  return {optionValues:ov, price:PRICE, inventoryItem:{sku:v.sku,tracked:false}, file:{originalSource:cimg[cmap[v.color]],contentType:'IMAGE'}};
});
// dedupe gleiche Optionskombis
const key=v=>v.optionValues.map(o=>o.name).join('|'); const used=new Set(); const uniq=[];
for(const v of variants){const k=key(v);if(used.has(k))continue;used.add(k);uniq.push(v);}
const descriptionHtml=fs.readFileSync(DESCFILE,'utf8');
const textPruefung=pruefeCjImportText({sourceTitle:j.productNameEn||j.nameEn,title:TITLE,html:descriptionHtml});
if(textPruefung.status!=='OK')throw new Error(`TEXT_BLOCKED: ${textPruefung.gruende.join(' | ')}`);
const sicherheit=cjImportSicherheitsdaten(TAGS.split(','));
const input={
  title:TITLE,
  descriptionHtml,
  vendor:'LuxeStyle',
  productType:PRODUCTTYPE,
  status:sicherheit.status,
  tags:sicherheit.tags,
  productOptions:opts,
  files,
  variants:uniq,
};
fs.writeFileSync(OUT, JSON.stringify({input}));
console.log(`${OUT}: ${colors.length} Farben x ${hasSize?sizes.length:1} = ${uniq.length} Var, ${files.length} Farbbilder | ${TITLE}`);
