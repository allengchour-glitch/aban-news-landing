#!/usr/bin/env node
/* cj_category_fill.mjs — allgemeiner CJ-Import mit ECHTEN Produktnamen (Gemini→DE-Titel+Beschreibung).
 * CJ-Kategorie-Browse → product/query (echter Name, Bilder, Preis) → Gemini DE-Titel+Galaxus-Beschreibung
 * (grounded, nichts erfinden) → productSet+Media+Publish(6 Kanäle) → Ledger. Dedup dropship/cj_niche_done.txt.
 * ENV: CJ_TOKEN · SHOPIFY_CLIENT_ID/SECRET · GEMINI(/tmp/gemini_key) · GRP=nagel · CAP=40 · DRY=1
 */
import fs from 'node:fs';
const SHOP='au3j0y-hq.myshopify.com',API='2025-01';
const CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const CJT=(process.env.CJ_TOKEN||'').trim();
const GK=(fs.existsSync('/tmp/gemini_key')?fs.readFileSync('/tmp/gemini_key','utf8'):process.env.GEMINI_API_KEY||'').trim();
const DRY=process.env.DRY==='1', CAP=parseInt(process.env.CAP||'40',10);
const LEDGER='dropship/cj_niche_done.txt';
const PUBS=['301970915713','301971014017','302032716161','302566834561','302872297857','302994456961'].map(id=>({publicationId:`gid://shopify/Publication/${id}`}));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const chf=usd=>{const u=parseFloat((''+usd).split('--')[0])||0;const p=Math.max(u*2.6,9.9);return (Math.floor(p)+0.90).toFixed(2);};

const GROUPS={
 nagel:{cats:[['9F96CE84-962D-4992-81DC-BF79A4A9002D','Nail Gel'],['E157D35B-156B-49F6-A678-7C55D4E81D6C','Nail Dryers'],['EADB666A-12A5-4FA1-AD1F-BC351A7E7AF5','Nail Art Kits'],['26F7660F-A00A-468A-BA29-E61A465C0D0B','Nail Decorations'],['1B1A9B82-1833-4721-88CA-86F5F542D7A5','Nail Glitters'],['25A6516D-3AE3-4207-BA00-6FD3CCE20201','Nail Stickers']],
   type:'Nageldesign', tags:['naegel','nageldesign','maniküre','beauty','cj-real','dropship'], kat:'Nageldesign & Maniküre',
   ban:/wholesale|\bfor salon only\b/i, minImg:3, minP:2, maxP:70},
};

async function cj(path){const r=await fetch('https://developers.cjdropshipping.com/api2.0/v1'+path,{headers:{'CJ-Access-Token':CJT}});return r.json();}
async function shTok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
async function sgql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}
const SET=`mutation($i:ProductSetInput!){productSet(synchronous:true,input:$i){product{id}userErrors{message}}}`;
const MED=`mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$m){mediaUserErrors{message}}}`;
const PUB=`mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,input:$p){userErrors{message}}}`;
const TRUST=`<div style="background:#f7faf7;border:1px solid #d9e7d9;border-radius:10px;padding:11px 14px;margin:12px 0;font-size:14px;line-height:1.5;"><strong>\u{1F6E1}️ Sorglos shoppen:</strong> ✅ Geprüfte Qualität · \u{1F69A} Lieferung ca. 8–16 Tage · \u{1F504} 30 Tage Rückgabe · \u{1F1E8}\u{1F1ED} Schweizer Shop · \u{1F4B3} TWINT, Karte & Klarna.</div>\n<p>Gratis-Versand ab CHF 65 · <strong>–10 % mit Code WELCOME10</strong></p>`;

async function gemini(nameEn,feats,kat){
 const prompt=`Du textest für einen Schweizer Beauty-Shop. Aus dem englischen Produktnamen (und Feature-Text) mache:
1) einen KURZEN, natürlichen DEUTSCHEN Produkttitel (max 60 Zeichen, kein Preis, keine Marke erfinden)
2) eine deutsche Beschreibung (90-150 Wörter, Galaxus-Stil, NUR aus den Fakten – nichts erfinden).
Kategorie: ${kat}
Name (EN): ${nameEn}
Features (EN): ${(feats||'').slice(0,700)}
Gib NUR gültiges JSON zurück: {"title":"...","html":"<p>…</p><h3>Das zeichnet es aus</h3><ul><li>…</li></ul>"} (Schweizer ss statt ß, keine Markdown-Fences).`;
 for(let i=0;i<3;i++){const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GK}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.5,maxOutputTokens:1500,thinkingConfig:{thinkingBudget:0},responseMimeType:'application/json'}})});
  const j=await r.json(); if(j.error){if(j.error.code===429){await sleep(15000);continue;}return null;}
  try{const t=j.candidates?.[0]?.content?.parts?.[0]?.text||'';const o=JSON.parse(t);if(o.title&&o.html)return o;}catch{}
 }
 return null;
}

const grp=GROUPS[process.env.GRP||'nagel']; if(!grp){console.error('unknown GRP');process.exit(1);}
const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.replace('cj:','').trim()).filter(Boolean):[]);
const st=DRY?null:await shTok();
let total=0;
for(const [cat,label] of grp.cats){
 if(total>=CAP)break; let got=0;
 for(let page=1;page<=5 && total<CAP && got<Math.ceil(CAP/3);page++){
  const j=await cj(`/product/list?pageSize=30&pageNum=${page}&categoryId=${cat}`); await sleep(700);
  const list=(j.data&&j.data.list)||[]; if(!list.length)break;
  for(const p of list){
   if(total>=CAP)break;
   const nm=p.productNameEn||''; if(!nm||done.has(String(p.pid))||(grp.ban&&grp.ban.test(nm)))continue;
   const pr=parseFloat((''+p.sellPrice).split('--')[0])||0; if(pr<grp.minP||pr>grp.maxP)continue;
   const dj=await cj(`/product/query?pid=${p.pid}`); await sleep(950);
   const d=dj.data||{}; const imgs=((d.productImageSet)||[]).filter(u=>/^https/.test(u)).slice(0,8);
   if(imgs.length<grp.minImg)continue;
   const feats=(d.description||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
   const g=await gemini(nm,feats,grp.kat); await sleep(4200);
   if(!g){console.log('  skip(gemini)',nm.slice(0,30));continue;}
   const title=g.title.slice(0,70);
   if(DRY){console.log(`  [DRY] CHF${chf(p.sellPrice)} | ${title}`);got++;total++;continue;}
   const slug=title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,46)+'-'+String(p.pid).slice(-6);
   const html=`${g.html}\n${TRUST}`;
   const input={title,handle:slug,productType:grp.type,vendor:'LuxeStyle',status:'ACTIVE',tags:grp.tags,descriptionHtml:html,
    seo:{title:(title+' | LuxeStyle CH').slice(0,70),description:(`${title} – bei LuxeStyle Schweiz. Gratis-Versand ab CHF 65, 30 Tage Rückgabe.`).slice(0,320)},
    productOptions:[{name:'Variante',values:[{name:'Standard'}]}],
    variants:[{optionValues:[{optionName:'Variante',name:'Standard'}],price:chf(p.sellPrice),inventoryItem:{sku:('CJ-'+p.pid).slice(0,70),tracked:false},inventoryPolicy:'CONTINUE'}],
    files:[{originalSource:imgs[0],contentType:'IMAGE'}]};
   const r=await sgql(st,SET,{i:input}); const e=r.data?.productSet?.userErrors||[]; const pid=r.data?.productSet?.product?.id;
   if(e.length||!pid){console.log('  ✗',title.slice(0,30),JSON.stringify(e).slice(0,80));continue;}
   if(imgs.length>1)await sgql(st,MED,{id:pid,m:imgs.slice(1).map(u=>({originalSource:u,mediaContentType:'IMAGE'}))});
   await sgql(st,PUB,{id:pid,p:PUBS});
   fs.appendFileSync(LEDGER,'cj:'+p.pid+'\n'); done.add(String(p.pid));
   got++;total++; console.log(`✅ ${title} → ${pid.split('/').pop()}`);
   await sleep(300);
  }
 }
 console.log(`${label}: total ${total}`);
}
console.log(`\nFERTIG: ${total} ${grp.type}${DRY?' [DRY]':''}.`);
