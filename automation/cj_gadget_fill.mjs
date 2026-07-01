#!/usr/bin/env node
/* cj_gadget_fill.mjs — füllt coole CJ-Gadgets autonom (volle Galerien).
 * CJ-Kategorie-Browse → Typ-Erkennung → sauberer DE-Titel mit eindeutigem Modell → productSet+Media+Publish(6 Kanäle) → Ledger.
 * ENV: CJ_EMAIL/CJ_API_KEY (oder Defaults) · SHOPIFY_CLIENT_ID/SECRET[/SHOP] · CAP=80 · DRY=1
 */
import fs from 'node:fs';
const CJ_EMAIL=process.env.CJ_EMAIL||'allengchour@gmail.com';
const CJ_KEY=process.env.CJ_API_KEY||'2534f19e725b4e87bbaee17f5a547713';
const SHOP=(process.env.SHOPIFY_SHOP||'au3j0y-hq.myshopify.com').replace(/^https?:\/\//,'').replace(/\/.*/,'');
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET, API='2025-01';
const CAP=parseInt(process.env.CAP||'80',10), DRY=process.env.DRY==='1';
const LEDGER='dropship/cj_niche_done.txt';
const PUBS=['301970915713','301971014017','302032716161','302566834561','302872297857','302994456961'].map(id=>({publicationId:`gid://shopify/Publication/${id}`}));
const chf=u=>{const v=Math.max(16.9,(parseFloat((''+u).split('--')[0])||0)*2.5);return (Math.floor(v)+0.90).toFixed(2);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const CATS=[
 ['0AC6B44A-12CC-456F-831F-54064C77D303','Projektor'],['C1AB7563-AED4-44D8-9F01-05BD91C65307','Speaker'],
 ['DAECCC3B-13D8-4978-86A8-61D3DF186134','Kopfhörer'],['36F73513-6A5A-445D-87F9-BF3D6629E649','SmartHome'],
 ['907BBB40-C131-4D3C-BA05-794D47EEBC90','Drohne'],['C83EF2A0-8FA3-4713-9901-2FD6E4554D97','Smartwatch'],
 ['895CF515-0F6B-481D-8A32-604EDCBEFBED','Wristband'],['6DB79FAF-593D-4F52-B6FF-AB1D14331862','Charger'],
];
const ban=/case|cover|holder|mount(?!ain)|stand|cable|adapter|replacement|bracket|strap|screen protector|bag for|spare|propeller|blade|dock only|lens for/i;
function deType(n){const s=n.toLowerCase();
 if(/drone/.test(s)&&/camera|hd|4k|wifi/.test(s))return['Mini-Drohne','· mit HD-Kamera'];
 if(/drone/.test(s))return['Mini-Drohne','· faltbar'];
 if(/smart\s?watch|smartwatch/.test(s))return['Smartwatch','· Fitness & Anrufe'];
 if(/fitness (band|tracker)|wristband|smart band/.test(s))return['Fitness-Tracker','· Herzfrequenz & Schritte'];
 if(/wireless charg|qi charg/.test(s))return['Wireless-Charger','· kabellos laden'];
 if(/power ?bank/.test(s))return['Powerbank','· Schnellladen'];
 if(/(led|light) strip|strip light|neon rope/.test(s))return['LED-Streifen','· RGB-Beleuchtung'];
 if(/ring light|selfie light/.test(s))return['Selfie-Ringlicht','· dimmbar'];
 if(/humidifier|diffuser/.test(s))return['Aroma-Diffuser','· Luftbefeuchter mit LED'];
 if(/(star|galaxy|aurora|nebula|sky).*(projector|projection|light)|projector.*(star|galaxy)/.test(s))return['Sternenhimmel-Projektor','· LED-Nachtlicht'];
 if(/sunset|sunrise/.test(s)&&/lamp|light|projector/.test(s))return['Sonnenuntergang-Projektor','· Stimmungslicht'];
 if(/projector/.test(s)&&/wifi|hd|1080|4k|home|movie|cinema/.test(s))return['Mini-Beamer','· WLAN HD-Projektor'];
 if(/projector/.test(s))return['LED-Projektor','· Stimmungslicht'];
 if(/night light|moon lamp/.test(s))return['LED-Nachtlicht','· Stimmungslicht'];
 if(/speaker/.test(s)&&/rgb|led/.test(s))return['Bluetooth-Lautsprecher','· RGB-Licht'];
 if(/speaker|soundbar/.test(s))return['Bluetooth-Lautsprecher',''];
 if(/tws|earbuds|earphone|headphone/.test(s))return['Kabellose Kopfhörer','· Bluetooth TWS'];
 if(/vacuum|robot clean/.test(s))return['Saugroboter','· smart'];
 return null;}
const POOLS={'Mini-Beamer':['CineHome','CinePro','Beamly','HomeCinema','FlixBeam','ScreenGo','CineMax'],'LED-Projektor':['Ambiente','Aurora','Lumina','GlowCast'],
 'Sonnenuntergang-Projektor':['Sunset','Goldhour','Dusk'],'Sternenhimmel-Projektor':['Galaxy','Nova','Cosmos','Starlight'],
 'Bluetooth-Lautsprecher':['SoundBox','Pulse','BoomBox','Vibe','BassCube','Echo','SoundWave','Boom'],'Kabellose Kopfhörer':['AirBeat','SoundPods','BassBuds','FlowPods','EchoBuds','AeroPods','WavePods'],
 'Aroma-Diffuser':['Mist','Zen','Breeze','Aura'],'Mini-Drohne':['SkyCam','AeroX','FalconEye','SkyPro','Nimbus'],'Smartwatch':['PulseFit','ProWatch','ActiveOne','FitPro','SmartOne','Vital'],
 'Fitness-Tracker':['ActiveBand','StepGo','PulseBand'],'Powerbank':['ChargeGo','PowerCore','Volt','MaxPower'],'Wireless-Charger':['PowerPad','QiFast','ChargeSpot'],
 'LED-Streifen':['NeonFlex','GlowLine','RGBstrip'],'Selfie-Ringlicht':['GlowRing','StudioLite'],'LED-Nachtlicht':['Halo','Aura','Glow'],'Saugroboter':['CleanBot','SweepPro']};

async function cj(path,tok){const r=await fetch('https://developers.cjdropshipping.com/api2.0/v1'+path,{headers:{'CJ-Access-Token':tok}});return r.json();}
async function cjToken(){const r=await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:CJ_EMAIL,apiKey:CJ_KEY})});return (await r.json()).data.accessToken;}
async function shToken(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
async function sgql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}
const SET=`mutation($i:ProductSetInput!){productSet(synchronous:true,input:$i){product{id}userErrors{message}}}`;
const MED=`mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$m){mediaUserErrors{message}}}`;
const PUB=`mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,input:$p){userErrors{message}}}`;

const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.replace('cj:','').trim()).filter(Boolean):[]);
const cnt={};
const ct=await cjToken(); console.log('CJ ok');
const st=DRY?null:await shToken();
let total=0;
for(const [cat,label] of CATS){
 if(total>=CAP)break;
 let got=0;
 for(let page=1;page<=6 && total<CAP && got<Math.ceil(CAP/4);page++){
  const j=await cj(`/product/list?pageSize=30&pageNum=${page}&categoryId=${cat}`,ct); await sleep(600);
  const list=(j.data&&j.data.list)||[]; if(!list.length)break;
  for(const p of list){
   if(total>=CAP)break;
   const nm=p.productNameEn||''; if(done.has(String(p.pid))||ban.test(nm))continue;
   const de=deType(nm); if(!de)continue;
   const pr=parseFloat((''+p.sellPrice).split('--')[0])||0; if(pr<3||pr>90)continue;
   const dj=await cj(`/product/query?pid=${p.pid}`,ct); await sleep(950);
   const imgs=((dj.data&&dj.data.productImageSet)||[]).filter(u=>/^https/.test(u)).slice(0,8);
   if(imgs.length<3)continue;
   const pool=POOLS[de[0]]||['Pro']; const i=(cnt[de[0]]||0);cnt[de[0]]=i+1;
   const title=`${de[0]} «${pool[i%pool.length]}»${de[1]?' '+de[1]:''}`.slice(0,70);
   if(DRY){console.log(`  [DRY] CHF${chf(p.sellPrice)} | ${title}`);got++;total++;continue;}
   const slug=title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[«»]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,46)+'-'+String(p.pid).slice(-6);
   const desc=`<p><strong>${title}</strong> — cooles Tech-Gadget für Zuhause & unterwegs.</p><ul><li>✨ Trendiges Design, einfache Bedienung</li><li>🔋 Wiederaufladbar / stromsparend</li><li>🎁 Auch als Geschenk beliebt</li></ul><p style="background:#f4f6fb;border:1px solid #dde3ef;border-radius:10px;padding:10px 14px;font-size:13px;">📦 <strong>Lieferzeit:</strong> 🇨🇭 CH/EU ca. 8–16 Tage (inkl. Prüfung & Versand)</p><p>🇨🇭 Schweizer Shop · Gratis-Versand ab CHF 65 · 30 Tage Rückgabe · <strong>WELCOME10</strong> = –10 %</p>`;
   const input={title,handle:slug,productType:'Gadgets',vendor:'LuxeStyle',status:'ACTIVE',tags:['gadgets','tech','trend','cj-real','dropship'],descriptionHtml:desc,
    seo:{title:(title+' | LuxeStyle CH').slice(0,70),description:(`${title} – cooles Tech-Gadget bei LuxeStyle Schweiz. Gratis-Versand ab CHF 65, 30 Tage Rückgabe.`).slice(0,320)},
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
 console.log(`${label}: fertig (total ${total})`);
}
console.log(`\nFERTIG: ${total} Gadgets${DRY?' [DRY]':''}.`);
