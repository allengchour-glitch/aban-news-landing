#!/usr/bin/env node
/* Baut einen gesperrten DRAFT-Payload mit voller Galerie; unbekannte sichtbare Optionswerte blockieren.
   Aufruf: node cj_full_create.mjs <PID> <PRICE> <TYPE> <TAGS> <TITLE> <DESCFILE> <OUT>  (token-basiert) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { cjImportSicherheitsdaten, pruefeCjImportText } from '../automation/lib/cj_import_guard.mjs';
import { uebersetzeCjFarbe, uebersetzeCjGroesse } from '../automation/lib/cj_optionen_de.mjs';
const [PID,PRICE,TYPE,TAGS,TITLE,DESCFILE,OUT]=process.argv.slice(2);
const BASE='https://developers.cjdropshipping.com/api2.0/v1';
const tok=JSON.parse(fs.readFileSync('/tmp/cj_token.json')).accessToken;
const SIZES=['XS','S','M','L','XL','XXL','2XL','3XL','4XL','5XL'];
const PW=/sexy|bikini|set|one[- ]?piece|solid[- ]?color|dress|shirt|polo|skirt|trousers|pants|necklace|pendant|silver|s925|999|sterling|diffuser|humidifier|pillowcase|satin|silk|womens|women|men|for|with|the|and/ig;
const clean=s=>{let c=s.replace(/-\d+m[lL]/,'').replace(PW,'').replace(/\s+/g,' ').trim();return c||s.trim();};
const b=await chromium.launch({headless:true,args:['--no-sandbox','--ignore-certificate-errors']});
const c=await b.newContext({ignoreHTTPSErrors:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ok(u){try{const r=await c.request.head(u,{timeout:15000});if(r.status()===200)return true;const g=await c.request.get(u,{timeout:15000});return g.status()===200;}catch(e){return false;}}
const r=await (await c.request.get(`${BASE}/product/query?pid=${PID}`,{headers:{'CJ-Access-Token':tok},timeout:30000})).json();
const d=r.data; if(!d){console.error('no data');process.exit(1);}
const vs=d.variants||[];
const rows=vs.map(v=>{const key=(v.variantKey||v.variantNameEn||'').trim();const parts=key.split('-').map(s=>s.trim());let size='',color=key;const last=(parts[parts.length-1]||'').toUpperCase().replace(/\s/g,'');if(SIZES.includes(last)){size=last;color=parts.slice(0,-1).join('-').trim();}return {color:color||'Standard',size:size||'Einheit',sku:v.variantSku,img:v.variantImage||''};});
const cmap={};for(const v of rows){if(v.color in cmap)continue;const farbe=uebersetzeCjFarbe(clean(v.color)||'Standard');
 if(farbe.status!=='OK'){await b.close();throw new Error(`OPTION_LANGUAGE_BLOCKED: ${farbe.grund}`);}cmap[v.color]=farbe.wert;}
const seen={};for(const k in cmap){let cc=cmap[k];if(!cc||seen[cc])cc=k;seen[cc]=1;cmap[k]=cc;}
const cimg={};rows.forEach(v=>{if(v.img&&!cimg[cmap[v.color]])cimg[cmap[v.color]]=v.img;});
const colors=[...new Set(Object.values(cmap))],sizes=[];for(const raw of new Set(rows.map(v=>v.size))){const groesse=uebersetzeCjGroesse(raw);
 if(groesse.status!=='OK'){await b.close();throw new Error(`OPTION_LANGUAGE_BLOCKED: ${groesse.grund}`);}sizes.push(groesse.wert);}
const hasSize=sizes.some(s=>s&&s!=='Einheitsgrösse');
// files = Galerie ∪ Farbbilder, HTTP-200
let all=[...new Set([...(d.productImageSet||[]), ...Object.values(cimg)])];
const good=[];for(const u of all){if(await ok(u))good.push(u);}
const goodSet=new Set(good);
const files=good.map(u=>({originalSource:u,contentType:'IMAGE'}));
const opts=[{name:'Farbe',values:colors.map(n=>({name:n}))}];
if(hasSize)opts.push({name:'Grösse',values:sizes.map(n=>({name:n}))});
const used=new Set();const variants=[];
for(const v of rows){const ov=[{optionName:'Farbe',name:cmap[v.color]}];if(hasSize){const groesse=uebersetzeCjGroesse(v.size);if(groesse.status!=='OK'){await b.close();throw new Error(`OPTION_LANGUAGE_BLOCKED: ${groesse.grund}`);}ov.push({optionName:'Grösse',name:groesse.wert});}const k=ov.map(o=>o.name).join('|');if(used.has(k))continue;used.add(k);const cI=cimg[cmap[v.color]];const vv={optionValues:ov,price:PRICE,inventoryItem:{sku:v.sku,tracked:false}};if(cI&&goodSet.has(cI))vv.file={originalSource:cI,contentType:'IMAGE'};variants.push(vv);}
const descriptionHtml=fs.readFileSync(DESCFILE,'utf8');
const textPruefung=pruefeCjImportText({sourceTitle:d.productNameEn,title:TITLE,html:descriptionHtml});
if(textPruefung.status!=='OK'){await b.close();throw new Error(`TEXT_BLOCKED: ${textPruefung.gruende.join(' | ')}`);}
const sicherheit=cjImportSicherheitsdaten(TAGS.split(','));
const input={title:TITLE,descriptionHtml,vendor:'LuxeStyle',productType:TYPE,status:sicherheit.status,tags:sicherheit.tags,productOptions:opts,files,variants};
fs.writeFileSync(OUT,JSON.stringify({input}));
await b.close();
console.log(`${OUT}: ${colors.length}F x ${hasSize?sizes.length:1} = ${variants.length}var, ${files.length} Bilder (Galerie+Farbe)`);
