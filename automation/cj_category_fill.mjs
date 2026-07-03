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
const chf=usd=>{const u=parseFloat((''+usd).split('--')[0])||0;let m=u<8?2.4:u<20?2.2:u<50?2.0:1.85;const p=Math.max(u*m,4.90);return (Math.floor(p)+0.90).toFixed(2);};

const GROUPS={
 nagel:{cats:[['9F96CE84-962D-4992-81DC-BF79A4A9002D','Nail Gel'],['E157D35B-156B-49F6-A678-7C55D4E81D6C','Nail Dryers'],['EADB666A-12A5-4FA1-AD1F-BC351A7E7AF5','Nail Art Kits'],['26F7660F-A00A-468A-BA29-E61A465C0D0B','Nail Decorations'],['1B1A9B82-1833-4721-88CA-86F5F542D7A5','Nail Glitters'],['25A6516D-3AE3-4207-BA00-6FD3CCE20201','Nail Stickers']],
   type:'Nageldesign', tags:['naegel','nagel','nageldesign','maniküre','beauty','cj-real','dropship'], kat:'Nageldesign & Maniküre',
   ban:/wholesale|\bfor salon only\b/i, minImg:3, minP:2, maxP:70},
 makeup:{cats:[['A30E8F55-DC2C-4842-9372-91B96DEFDCC2','Makeup Brushes'],['426792A7-4906-403D-AD17-8293AFF00E66','Makeup Set'],['8FB2C16C-4C1B-4B5A-89F8-BC30FB2C442A','Eyeshadow'],['B68DF53F-4DD5-4659-A530-66D414CF2147','Lipstick'],['E31E5996-7B86-4FEC-B929-9AEB11E76853','False Eyelashes']],
   type:'Make-up', tags:['makeup','kosmetik','beauty','cj-real','dropship'], kat:'Make-up & Kosmetik',
   ban:/wholesale|salon only|\bsample\b/i, minImg:3, minP:2, maxP:60},
 kueche:{cats:[['E448A723-43DC-4BD8-A9AD-2FB9699338B4','Cooking Tools'],['23ADD7CB-065A-4A02-B8E8-43D3F041B90B','Kitchen Knives'],['CF330457-0E5B-4FAF-9BAE-7D2C247BD8DE','Drinkware'],['BEDFD1CC-E7CC-438F-9050-D7737904203D','Barware']],
   type:'Küche & Bar', tags:['kueche','kochen','haushalt','cj-real','dropship'], kat:'Küche, Bar & Kochen',
   ban:/wholesale|salon only/i, minImg:3, minP:3, maxP:60},
 skincare:{cats:[['EDE3FAD9-0E6C-4F7C-9016-A2299469AA7C','Facial Care'],['88AF62DE-5586-40E4-A287-864523D9AE50','Face Masks'],['E0238E88-0C63-427F-812E-BA1FCE4C67B4','Body Care'],['CB1A9CEF-8333-4D2F-B19A-418C6DE376C7','Essential Oil'],['B6A8B971-793B-4F9E-AA56-3A5D12F63827','Sun Care']],
   type:'Hautpflege', tags:['skincare','hautpflege','beauty','pflege','cj-real','dropship'], kat:'Hautpflege & Gesichtspflege',
   ban:/wholesale|salon only|\bsample\b|injection|needle/i, minImg:3, minP:3, maxP:55},
 gaming:{cats:[['1F23F16D-0A39-4D38-AB9C-1F21EEDEBEDD','Gamepads'],['56892B7E-0C59-4DAB-8336-57C6CA548043','Video Game Consoles'],['A96C59E8-C39A-4C8E-BA75-5B4AA347FCCC','Joysticks'],['2F6CCFAA-853F-41EF-8B91-24028A333948','Handheld Game Players']],
   type:'Gaming-Zubehör', tags:['gaming','ps4','ps5','xbox','konsole','gadgets','cj-real','dropship'], kat:'Gaming & Konsolen-Zubehör (PS4/PS5/Xbox)',
   ban:/wholesale|salon only|\bsample\b/i, minImg:3, minP:3, maxP:80},
 pet:{cats:[['2410110339451623300','Pet Chew Toys'],['2410110339311602900','Pet Chase Toys'],['2410110340161623400','Pet Sound Toys'],['2410110341061612000','Pet Bowls'],['2410110341451628800','Pet Feeding Tools']],
   type:'Haustierbedarf', tags:['haustier','hund','katze','pet','cj-real','dropship'], kat:'Haustierbedarf für Hund & Katze',
   ban:/wholesale|human|for people/i, minImg:3, minP:2, maxP:50},
 sport:{cats:[['2410301013021610400','Scooters'],['3D0169CF-0F24-4EEA-948E-E48C3980862E','Bicycle Helmets'],['161FA128-487C-4451-8B49-CB81B5A30A54','Bicycle Lights'],['C20B25A2-348C-48C8-A2C8-FE33749A40DE','Fitness & Bodybuilding'],['EA851596-F20F-4AA5-8869-4BB5CA1968DC','Camping & Hiking']],
   type:'Sport & Outdoor', tags:['sport','outdoor','fitness','cj-real','dropship'], kat:'Sport, Fitness & Outdoor',
   ban:/wholesale|\bsample\b/i, minImg:3, minP:3, maxP:90},
 storage:{cats:[['2502140315331600200','Storage Bags & Cases & Boxes'],['56845C3D-4D9E-4729-B5D4-6D7DE310C031','Kitchen Storage'],['B62EE40F-7650-4715-A7A5-BA227540593C','Bathroom Storage'],['A0E89009-FFD6-4B2E-906A-8076DF45B32C','Clothing & Wardrobe Storage'],['87CF251F-8D11-4DE0-A154-9694D9858EB3','Home Office Storage']],
   type:'Aufbewahrung & Organizer', tags:['aufbewahrung','organizer','wohnen','haushalt','cj-real','dropship'], kat:'Aufbewahrung & Organizer',
   ban:/wholesale|\bsample\b|adult/i, minImg:3, minP:2, maxP:50},
 musik:{cats:[['2502140306571605000','Guitars'],['2502140307181607100','Violins'],['2603180848241600400','Steel Tongue Drum']],
   type:'Musikinstrumente', tags:['musik','instrument','hobby','cj-real','dropship'], kat:'Musikinstrumente',
   ban:/wholesale|\bsample\b|zubehör.?set für/i, minImg:3, minP:5, maxP:120},
 cjelektronik:{cats:[['6DB79FAF-593D-4F52-B6FF-AB1D14331862','Charger'],['A0D39205-3770-4F0B-91BD-65E711263577','Batteries'],['D8515A8C-ECAC-422B-9963-14D7B07E10DB','TV Sticks'],['11D33F89-9B90-4D1A-B977-DE229BAA7E86','Wearable Devices'],['895CF515-0F6B-481D-8A32-604EDCBEFBED','Smart Wristbands'],['C83EF2A0-8FA3-4713-9901-2FD6E4554D97','Smart Watches'],['AD21D6F7-42CB-44E7-89B2-542692C7D101','Action Cameras'],['0AC6B44A-12CC-456F-831F-54064C77D303','Projectors'],['C1AB7563-AED4-44D8-9F01-05BD91C65307','Speakers'],['DAECCC3B-13D8-4978-86A8-61D3DF186134','Earphones'],['8FD4CA46-AA88-4CDC-8EBA-EBD8412152E2','Microphones'],['491E5474-524C-4666-BDD7-4E35E38900EA','Power Bank'],['9170B3F9-5B9C-4C39-8CD6-7DC00E481D47','Holders & Stands'],['4D3B9582-E92E-46BF-B00E-715E70FB4742','SSD'],['591E8920-019B-42FA-AE0B-420052E6C4F0','USB Flash Drives'],['7E65A403-CF6E-4B55-96FF-B7C3C376A47A','Memory Cards'],['C62BC6BF-BA2B-41ED-AB12-599A6D7FCAA5','External Hard Drives'],['1F23F16D-0A39-4D38-AB9C-1F21EEDEBEDD','Gamepads'],['2F6CCFAA-853F-41EF-8B91-24028A333948','Handheld Game Players']],
   type:'Elektronik', tags:['elektronik','tech','gadget','cj-real','dropship'], kat:'Elektronik & Technik',
   ban:/wholesale|\bsample\b|replacement part|ersatzteil|kinder|for kids/i, minImg:2, minP:2, maxP:120},
 cjgadgets:{cats:[['907BBB40-C131-4D3C-BA05-794D47EEBC90','Camera Drones'],['E95322D2-FF23-4837-A0C0-0CA686B9F062','Smart Remote Controls'],['36F73513-6A5A-445D-87F9-BF3D6629E649','Smart Home Appliances'],['599DFE31-C6AD-42D2-93AA-762126BBA475','Home Electronic Accessories'],['76B88FB8-9B37-4B55-AA09-082C5627DFE8','HDD Enclosures']],
   type:'Gadget', tags:['elektronik','gadget','tech','trend','cj-real','dropship'], kat:'Coole Gadgets & Technik',
   ban:/wholesale|\bsample\b|replacement part|ersatzteil|kinder/i, minImg:2, minP:2, maxP:110},
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
