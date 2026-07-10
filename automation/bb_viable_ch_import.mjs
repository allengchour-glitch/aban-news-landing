/* BigBuy CH-Voll-Importer (User «hole alles mögliche aus bigbuy für CH», 2026-07-10)
 * Importiert die vorab berechnete verkäufbare CH-Liste (/tmp/bb_viable_ch.json = lagernd+CH-lieferbar+rentabel).
 * Namen kommen DE direkt von BigBuy (kein Groq). Kategorie via cat_tags.mjs. VERFOLGTER Lagerbestand
 * (inventoryPolicy DENY = kein Ghost-Verkauf). Dedup: Ledger bb:id + Titel-Wache + Bild-Wache.
 */
import fs from 'node:fs';
import { catTags } from './cat_tags.mjs';
const BB=(process.env.BIGBUY_API_KEY||'').trim();
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const SHOP='au3j0y-hq.myshopify.com';
const LOC='gid://shopify/Location/109350125953';
const PUBS=['301970915713','301971014017','302032716161','302566834561','302872297857','302994456961']
  .map(id=>({publicationId:`gid://shopify/Publication/${id}`}));
const LIMIT=parseInt(process.env.LIMIT||'552',10);
const GAP=1400;
const LEDGER='dropship/_bb_viable_done.txt';
const IMGLEDGER='dropship/bb_viable_img_seen.txt';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').filter(Boolean):[]);
const imgSeen=new Set(fs.existsSync(IMGLEDGER)?fs.readFileSync(IMGLEDGER,'utf8').split('\n').filter(Boolean):[]);
const viable=JSON.parse(fs.readFileSync('/tmp/bb_viable_ch.json','utf8'));
const r2i=JSON.parse(fs.readFileSync('/tmp/bb_ref2id.json','utf8'));
async function scc(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
let TOK=await scc();
async function sgql(q,v){for(let a=0;a<4;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(j.errors&&JSON.stringify(j.errors).includes('Throttled')){await sleep(3000);continue;}TOK=await scc();await sleep(1000);}return{};}
async function bb(path){for(let a=0;a<4;a++){const r=await fetch(`https://api.bigbuy.eu${path}`,{headers:{Authorization:`Bearer ${BB}`}});if(r.status===429){await sleep(4000);continue;}try{return await r.json();}catch{return null;}}return null;}
async function img200(u){try{const r=await fetch(u,{method:'HEAD'});return r.ok;}catch{return false;}}
const norm=x=>x.toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim();
const cleanTitle=n=>n.replace(/\b[SVMC]\d{6,}\b/g,'').replace(/\bBB[-_]\w+/gi,'').replace(/ß/g,'ss').replace(/\s{2,}/g,' ').replace(/\s*[-–]\s*$/,'').trim().slice(0,70);
const SET=`mutation($input:ProductSetInput!){productSet(synchronous:true,input:$input){product{id} userErrors{field message}}}`;
let created=0,skip=0;
for(const it of viable.slice(0,LIMIT)){
  const ref=it.ref.toUpperCase();
  const id=r2i[ref]||r2i[it.ref];
  if(!id){skip++;continue;}
  if(done.has('bb:'+id)){skip++;continue;}
  const info=await bb(`/rest/catalog/productinformation/${id}.json?isoCode=de`);await sleep(GAP);
  const rec=Array.isArray(info)?info[0]:info;
  if(!rec||!rec.name){console.log('✗ kein-name',ref);fs.appendFileSync(LEDGER,'bb:'+id+'\n');continue;}
  const low=(rec.name+' '+(rec.description||'')).toLowerCase();
  // ⛔ Adult/Erotik nie importieren (Google-GMC-Sperr-Risiko, Regel erotik-only-online)
  if(/sexfun|intimax|\bdildo\b|vibrator|vibrations|masturbat|penis|vagina|erotik|dessous|gleitgel|gleitmittel|analplug|butt.?plug|kondom|prostata|sex.?toy|lingerie|einlauf/.test(low)){console.log('⛔ adult-skip',rec.name.slice(0,40));fs.appendFileSync(LEDGER,'bb:'+id+'\n');continue;}
  // ⛔ Elektronik-Schrott/Nicht-Fit (überteuerte Markenware, 0 Fit): PC/Toner/Akku/Netzwerk
  if(/\bdesktop pc\b|\bpc \b|toner|patrone|\bram\b|\bssd\b|festplatte|\bakku\b|\bakkus\b|batterie|netzteil|router|switch |kabel |monitor |drucker|tastatur|prozessor|grafikkarte/.test(low)){console.log('⛔ elektronik-skip',rec.name.slice(0,40));fs.appendFileSync(LEDGER,'bb:'+id+'\n');continue;}
  const title=cleanTitle(rec.name);
  if(!title){skip++;continue;}
  // Titel-Wache (norm)
  const dq=await sgql(`query($q:String!){products(first:5,query:$q){edges{node{title}}}}`,{q:`title:"${title.split(' ').slice(0,3).join(' ')}*" status:active`});
  if((dq.data?.products?.edges||[]).some(e=>norm(e.node.title)===norm(title))){console.log('= titel existiert',title.slice(0,34));fs.appendFileSync(LEDGER,'bb:'+id+'\n');continue;}
  const imgD=await bb(`/rest/catalog/productimages/${id}.json`);await sleep(GAP);
  const urls=(imgD?.images||[]).sort((a,b)=>(b.isCover?1:0)-(a.isCover?1:0)).map(x=>x.url).filter(Boolean);
  const good=[];for(const u of urls.slice(0,8)){if(await img200(u))good.push(u);if(good.length>=6)break;}
  if(good.length<2){console.log('✗ zu-wenig-bilder',title.slice(0,34));fs.appendFileSync(LEDGER,'bb:'+id+'\n');continue;}
  const imgKey=(good[0]||'').split('?')[0].split('/').pop();
  if(imgKey&&imgSeen.has(imgKey)){console.log('= bild existiert',title.slice(0,34));fs.appendFileSync(LEDGER,'bb:'+id+'\n');continue;}
  const price=it.sell.toFixed(2);
  const tags=[...new Set(['bigbuy','dropship','neu','bb-lieferbar-ch',...catTags(`${title} ${rec.description||''}`)])];
  const slug=(title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,46))+'-'+String(id).slice(-6);
  const desc=`${(rec.description||'').slice(0,1400)}<p>📦 Lieferung aus EU-Lager · Gratis-Versand ab CHF 50 · 30 Tage Rückgabe · 🇨🇭 LuxeStyle</p>`;
  const qty=Math.min(Number(it.qty)||1,999);
  const input={title,handle:slug,productType:'BigBuy-CH',vendor:'LuxeStyle',status:'ACTIVE',tags,descriptionHtml:desc,
    seo:{title:`${title} | LuxeStyle`.slice(0,70),description:`${title} – schnelle EU-Lieferung, Gratis-Versand ab CHF 50.`.slice(0,320)},
    productOptions:[{name:'Titel',values:[{name:'Standard'}]}],
    variants:[{optionValues:[{optionName:'Titel',name:'Standard'}],price,
      inventoryItem:{sku:`bb-${ref}`.slice(0,70),tracked:true},inventoryPolicy:'DENY',
      inventoryQuantities:[{locationId:LOC,name:'available',quantity:qty}]}],
    files:good.map(u=>({originalSource:u,contentType:'IMAGE'}))};
  const r=await sgql(SET,{input});
  const spid=r.data?.productSet?.product?.id;
  if(!spid){console.log('✗',title.slice(0,34),JSON.stringify(r.data?.productSet?.userErrors||'').slice(0,100));fs.appendFileSync(LEDGER,'bb:'+id+'\n');continue;}
  await sgql(`mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,input:$p){userErrors{message}}}`,{id:spid,p:PUBS});
  fs.appendFileSync(LEDGER,'bb:'+id+'\n');
  if(imgKey){imgSeen.add(imgKey);fs.appendFileSync(IMGLEDGER,imgKey+'\n');}
  created++;console.log(`✅ ${title.slice(0,48)} → CHF ${price} [${qty} Lager] {${tags.filter(t=>!['bigbuy','dropship','neu','bb-lieferbar-ch'].includes(t)).join(',')||'—'}}`);
  await sleep(300);
}
console.log(`\nFERTIG. angelegt=${created}, skip=${skip}`);
