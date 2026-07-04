#!/usr/bin/env node
/* bigbuy_csv_import.mjs — Import aus BigBuy-FTP-CSV (kein Rate-Limit, MIT Lagerbestand + RRP-Preis).
 * CSV-Spalten: sku;name;images;video;stock_a..c(+days);pvd_old;pvd;pvd_dif;pvr_old;pvr;pvr_dif;category
 * → Preis = pvr (empf. VK, fair) · echter Lagerbestand (tracked, kein Oversell) · „Restauriert"→„Generalüberholt (Note X)".
 * ENV: SHOPIFY_CLIENT_ID/SECRET · CSV=/pfad/a.csv,/pfad/b.csv · LIMIT=2000 · DRY=1
 */
import fs from 'node:fs';
const SHOP='au3j0y-hq.myshopify.com',API='2025-01';
const CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const LOC='gid://shopify/Location/109350125953';
const DRY=process.env.DRY==='1', LIMIT=parseInt(process.env.LIMIT||'2000',10);
const LEDGER='dropship/bigbuy_done.txt';
const PUBS=['301970915713','301971014017','302032716161','302566834561','302872297857','302994456961'].map(id=>({publicationId:`gid://shopify/Publication/${id}`}));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const Q=String.fromCharCode(34);

function parseCSV(txt){const rows=[];let i=0,f='',row=[],q=false;while(i<txt.length){const c=txt[i];
 if(q){if(c===Q){if(txt[i+1]===Q){f+=Q;i++;}else q=false;}else f+=c;}
 else{if(c===Q)q=true;else if(c===';'){row.push(f);f='';}else if(c==='\n'){row.push(f);rows.push(row);row=[];f='';}else if(c==='\r'){}else f+=c;}i++;}
 if(f||row.length){row.push(f);rows.push(row);}return rows;}

// BigBuy-Kategorie → {type, tags}
function route(cat){const c=(cat||'').toLowerCase();
 if(/notebook|laptop|pc\b|computer|tablet/.test(c))return{t:'Elektronik & Computer',g:['elektronik','pc','computer','tech']};
 if(/smartphone|telefon|handy/.test(c))return{t:'Smartphones',g:['elektronik','smartphone','handy','tech']};
 if(/fernseher|\btv\b|monitor/.test(c))return{t:'TV & Monitore',g:['elektronik','tv','tech']};
 if(/projektor|beamer/.test(c))return{t:'Beamer & Projektoren',g:['elektronik','beamer','tech']};
 if(/kopfhörer|audio|lautsprecher/.test(c))return{t:'Audio',g:['elektronik','audio','tech']};
 if(/kamera|foto/.test(c))return{t:'Foto & Kamera',g:['elektronik','foto','tech']};
 if(/uhr/.test(c))return{t:'Uhren',g:['uhren','accessoire']};
 if(/staubsauger|roboter/.test(c))return{t:'Haushalt & Küche',g:['haushalt','gadgets']};
 if(/kaffee|küche|kitchen/.test(c))return{t:'Küche & Haushalt',g:['haushalt','kueche']};
 if(/heimtrainer|laufband|spinning|fitness/.test(c))return{t:'Fitness & Sport',g:['fitness','sport']};
 if(/sofa|schreibtisch|stuhl|möbel|regal|schrank|wäscheständer|schuhablage/.test(c))return{t:'Möbel & Wohnen',g:['moebel','wohnen']};
 return{t:'Elektronik & mehr',g:['elektronik','tech']};
}
function cleanName(n){let s=n.replace(/\b\d{6,}\b/g,' ')
 .replace(/\(Restauriert\s*([ABC])\)/i,'· Generalüberholt (Note $1)')
 .replace(/\s{2,}/g,' ').replace(/\s+·/g,' ·').trim();return s.slice(0,90);}
const chf=pvr=>{const p=parseFloat((''+pvr).replace(',','.'))||0;return (Math.max(Math.floor(p),5)+0.90).toFixed(2);};
const TR=process.env.TRANSLATE==='1';
const GK=(fs.existsSync('/tmp/gemini_key')?fs.readFileSync('/tmp/gemini_key','utf8'):'').trim();
const isEng=n=>/\b(for|with|the|and|Box|Black|White|Wireless|Refurbished|Portable|Adjustable|Waterproof|Charger|Holder|Stand|Case)\b/.test(n) && !/für|mit|und|[äöü]|Schwarz|Weiss|Generalüberholt/i.test(n);
async function gtranslate(en){ if(!GK)return null;
 const prompt=`Übersetze diesen Produktnamen in einen KURZEN, natürlichen DEUTSCHEN Produkttitel (max 80 Zeichen). "Refurbished A/B/C" → "Generalüberholt (Note A/B/C)". Keine Anführungszeichen, nur der Titel:\n${en}`;
 for(let i=0;i<3;i++){try{const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GK}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.3,maxOutputTokens:120,thinkingConfig:{thinkingBudget:0}}})});const j=await r.json();if(j.error){if(j.error.code===429){await sleep(12000);continue;}return null;}let t=(j.candidates?.[0]?.content?.parts?.[0]?.text||'').replace(/^["']|["']$/g,'').trim();if(t.length>4)return t.slice(0,90);}catch{}}
 return null;}

async function tok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
async function gql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}
const SET=`mutation($i:ProductSetInput!){productSet(synchronous:true,input:$i){product{id variants(first:1){nodes{inventoryItem{id}}}}userErrors{message}}}`;
const MED=`mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$m){mediaUserErrors{message}}}`;
const PUB=`mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,input:$p){userErrors{message}}}`;
const INV=`mutation($id:ID!,$loc:ID!,$q:Int!){inventorySetQuantities(input:{name:"available",reason:"correction",ignoreCompareQuantity:true,quantities:[{inventoryItemId:$id,locationId:$loc,quantity:$q}]}){userErrors{message}}}`;

const files=(process.env.CSV||'').split(',').map(s=>s.trim()).filter(Boolean);
if(!files.length){console.error('CSV=... nötig');process.exit(1);}
const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.replace('bb:','').trim()).filter(Boolean):[]);
const T=DRY?null:await tok();
let total=0;
for(const file of files){
 const rows=parseCSV(fs.readFileSync(file,'utf8')); const H=rows[0]; if(!H||!Array.isArray(H)){console.log('  (leer übersprungen)',file.split('/').pop());continue;} const ix={}; H.forEach((h,i)=>ix[h]=i);
 for(const r of rows.slice(1)){
  if(total>=LIMIT)break;
  const sku=r[ix.sku]; if(!sku||done.has(sku)||done.has('csv-'+sku))continue;
  const st=(+r[ix.stock_a]||0)+(+r[ix.stock_b]||0)+(+r[ix.stock_c]||0); if(st<1)continue;
  const img=r[ix.images]; if(!img||img==='-')continue;
  const pvr=parseFloat((''+r[ix.pvr]).replace(',','.'))||0; if(pvr<5)continue;
  if(process.env.REFURB_ONLY==='1' && !/Restauriert|Refurbished/i.test(r[ix.name]||''))continue; // nur Refurbished-Gems
  let name=cleanName(r[ix.name]||''); if(name.length<5)continue;
  if(TR){const de=await gtranslate(name); if(de){name=de;await sleep(3800);} else if(isEng(name))continue;} // TRANSLATE=1 → alles übersetzen (englische Feeds)
  const rt=route(r[ix.category]); const refurb=/Restauriert|Generalüberholt|generalüberholt/i.test(r[ix.name]||'')||/Generalüberholt/i.test(name);
  const price=chf(pvr);
  const imgUrl=encodeURI(img.split('|')[0].trim());
  if(DRY){console.log(`  [DRY] CHF${price} (RRP ${pvr}) Lager:${st} ${refurb?'♻️':''} | ${name.slice(0,55)} [${rt.t}]`);total++;continue;}
  const slug=name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,44)+'-'+sku.toLowerCase();
  const desc=`<p><strong>${name}</strong></p>`
   +(refurb?`<div style="background:#eef6ff;border:1px solid #cfe3f7;border-radius:10px;padding:11px 14px;margin:10px 0;font-size:14px;"><strong>♻️ Generalüberholt (Refurbished):</strong> Geprüft, gereinigt & voll funktionsfähig. Note gemäss Titel (A=wie neu · B=leichte Gebrauchsspuren · C=sichtbare Spuren). Nachhaltig & günstiger als neu.</div>`:'')
   +`<h3>Eigenschaften</h3><ul><li><strong>Kategorie:</strong> ${(r[ix.category]||'').slice(0,40)}</li><li><strong>Verfügbarkeit:</strong> ${st} an Lager · Lieferung ca. 3–7 Tage (EU-Lager)</li>${refurb?'<li><strong>Zustand:</strong> Generalüberholt</li>':''}</ul>`
   +`<div style="background:#f7faf7;border:1px solid #d9e7d9;border-radius:10px;padding:11px 14px;margin:12px 0;font-size:14px;line-height:1.5;"><strong>\u{1F6E1}️ Sorglos shoppen:</strong> ✅ Original-Markenware · \u{1F69A} EU-Lager 3–7 Tage · \u{1F504} 30 Tage Rückgabe · \u{1F1E8}\u{1F1ED} Schweizer Shop.</div>\n<p>Gratis-Versand ab CHF 50 · <strong>–10 % mit Code WELCOME10</strong></p>`;
  const tags=[...rt.g,'bigbuy','csv-import','dropship',...(refurb?['refurbished','generalueberholt']:[])];
  const input={title:name,handle:slug,productType:rt.t,vendor:'LuxeStyle',status:'ACTIVE',tags,descriptionHtml:desc,
   seo:{title:(name+' | LuxeStyle CH').slice(0,70),description:(`${name} – bei LuxeStyle Schweiz. ${refurb?'Generalüberholt, ':''}EU-Lager, 30 Tage Rückgabe, Gratis-Versand ab CHF 50.`).slice(0,320)},
   productOptions:[{name:'Variante',values:[{name:'Standard'}]}],
   variants:[{optionValues:[{optionName:'Variante',name:'Standard'}],price,inventoryItem:{sku:'CSV-'+sku,tracked:true},inventoryPolicy:'DENY'}],
   files:[{originalSource:imgUrl,contentType:'IMAGE'}]};
  const rr=await gql(T,SET,{i:input}); const e=rr.data?.productSet?.userErrors||[]; const pid=rr.data?.productSet?.product?.id;
  const invId=rr.data?.productSet?.product?.variants?.nodes?.[0]?.inventoryItem?.id;
  if(e.length||!pid){if(JSON.stringify(e).includes('already in use')){fs.appendFileSync(LEDGER,'bb:csv-'+sku+'\n');done.add('csv-'+sku);}else console.log('  ✗',name.slice(0,30),JSON.stringify(e).slice(0,80));continue;}
  if(invId)await gql(T,INV,{id:invId,loc:LOC,q:st});
  await gql(T,PUB,{id:pid,p:PUBS});
  fs.appendFileSync(LEDGER,'bb:csv-'+sku+'\n'); done.add('csv-'+sku);
  total++; if(total%20===0)console.log(`  ${total} importiert…`);
  await sleep(250);
 }
}
console.log(`\nFERTIG: ${total} Produkte aus CSV${DRY?' [DRY]':''} (Preis=RRP, echter Lagerbestand).`);
