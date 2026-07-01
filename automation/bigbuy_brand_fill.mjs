#!/usr/bin/env node
/* bigbuy_brand_fill.mjs — EIN Befehl füllt den Shop mit echten BigBuy-Marken (EU-Lager).
 * Scan (Voll-Katalog, 1× laden) → Titel putzen → productSet+Media+Publish (6 Kanäle) → Ledger.
 * Dedup über dropship/bigbuy_done.txt. Nur aktive Produkte mit Bild + Preis im Cap.
 *
 * ENV: BIGBUY_API_KEY · SHOPIFY_CLIENT_ID/SECRET[/SHOP]
 *      GROUPS=parfum,uhr,tasche  (Default: alle)  ·  CAP=40 (Default-Stück/Gruppe, per CAP_<grp> überschreibbar)
 *      DRY=1 (nur scannen/zeigen, nichts anlegen)
 * Lauf: ( set -a; source /tmp/lux_env.sh; source /tmp/shopify_creds.env; set +a; GROUPS=parfum,skincare node automation/bigbuy_brand_fill.mjs )
 */
import fs from 'node:fs';
import { buildGalaxusDesc } from './lib/galaxus_desc.mjs';
const BB=(process.env.BIGBUY_API_KEY||'').trim();
const SHOP=(process.env.SHOPIFY_SHOP||'au3j0y-hq.myshopify.com').replace(/^https?:\/\//,'').replace(/\/.*/,'');
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET, API='2025-01';
const DRY=process.env.DRY==='1';
const DEFCAP=parseInt(process.env.CAP||'40',10);
const LEDGER='dropship/bigbuy_done.txt';
const PUBS=['301970915713','301971014017','302032716161','302566834561','302872297857','302994456961'].map(id=>({publicationId:`gid://shopify/Publication/${id}`}));
const chf=eur=>{const m=eur>150?1.5:eur>80?1.8:eur>40?2.2:2.6;return (Math.floor(eur*m)+0.90).toFixed(2);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// ── Marken-Katalog: regex (Produkttyp) + brand (echte Marken) + cap/cup + Shopify-Routing ──
const B={
 parfum:/hugo boss|calvin klein|versace|dior|chanel|\bysl\b|yves saint|paco rabanne|carolina herrera|dolce.?gabbana|armani|jean paul|davidoff|montblanc|azzaro|lancome|lancôme|guess|tommy hilfiger|bvlgari|givenchy|kenzo|moschino|cacharel|nina ricci|lacoste|gucci|prada|valentino|burberry/i,
 skin:/weleda|vichy|la roche|cerave|eucerin|nivea|garnier|l'?oreal|lancome|clinique|caudalie|bioderma|neutrogena|nuxe|elizabeth arden|shiseido|estee/i,
 makeup:/rimmel|maybelline|max factor|artdeco|\bnyx\b|revlon|catrice|essence|bourjois|loreal|l'oreal|deborah|astor|mia cosmetics|paese/i,
 hair:/l'?oreal|garnier|schwarzkopf|wella|pantene|syoss|nivea|tresemme|kerastase|moroccanoil/i,
 watch:/casio|festina|lotus|citizen|swatch|tommy hilfiger|guess|michael kors|calvin klein|police|viceroy|tous|skagen|fossil|nixon|breil/i,
 bag:/michael kors|guess|calvin klein|tommy hilfiger|lacoste|desigual|pepe jeans|david jones/i,
 sun:/ray.?ban|hugo boss|guess|police|carrera|calvin klein|tommy hilfiger|vogue|arnette|persol/i,
 gadget:/innovagoods|ksix|xiaomi|nedis|denver|forever|celly|muvit|\bspc\b|hama|aukey|baseus|anker/i,
};
const GROUPS={
 gadget:     {re:/projektor|beamer|\bled\b|\brgb\b|sternenhimmel|galaxy|bluetooth|lautsprecher|kopfhörer|earbuds|ohrhörer|smartwatch|fitness.?tracker|drohne|roboter|sauger|diffusor|luftbefeuchter|ringlicht|selfie|powerbank|wireless|kabellos|ladegerät|ventilator|nachtlicht|projektion|smart.?home|karaoke|mini.?drucker/i,
              ban:/hülle|case|schutzglas|panzerglas|ersatz|kabel(?!los)|adapter|halterung|ständer|stativ|mopp|filter|zubehör|schutzfolie|tasche für|beutel/i,
              brand:B.gadget, cap:220, type:'Gadgets', tags:['gadgets','tech','trend','marke','dropship'], blurb:'cooles Tech-Gadget'},
 parfum:     {re:/eau de toilette|eau de parfum|\bedt\b|\bedp\b|parfum|cologne/i, brand:B.parfum, cap:160, type:'Parfum & Düfte', tags:['parfum','duft','marke','bigbuy-beauty','dropship'], blurb:'Original-Markenparfüm'},
 skincare:   {re:/creme|cream|serum|feuchtigkeit|gesichts|moistur|reinigung|cleanser|pflege|lotion|maske|peeling|sonnenschutz/i, brand:B.skin, cap:90, type:'Hautpflege', tags:['beauty','skincare','hautpflege','marke','bigbuy-beauty','dropship'], blurb:'Marken-Hautpflege'},
 makeup:     {re:/lippenstift|lipstick|lidschatten|eyeshadow|foundation|rouge|blush|highlighter|eyeliner|kajal|concealer|primer|mascara|wimperntusche|puder|powder/i, brand:B.makeup, cap:60, type:'Make-up', tags:['beauty','makeup','marke','bigbuy-beauty','dropship'], blurb:'Original-Marken-Make-up'},
 haircare:   {re:/shampoo|spülung|conditioner|haarmaske|haarpflege|haaröl|haarspray|styling|haarfarbe|färbung/i, brand:B.hair, cap:50, type:'Haarpflege', tags:['beauty','haarpflege','marke','bigbuy-beauty','dropship'], blurb:'Marken-Haarpflege'},
 uhr:        {re:/\buhr\b|armbanduhr|herrenuhr|damenuhr|watch/i, brand:B.watch, cap:260, type:'Uhren', tags:['uhren','marke','accessoire','dropship'], blurb:'Marken-Armbanduhr'},
 tasche:     {re:/tasche|handtasche|umhängetasche|rucksack|geldbörse|portemonnaie|clutch|shopper/i, brand:B.bag, cap:200, type:'Taschen', tags:['taschen','damen','marke','accessoire','dropship'], blurb:'Marken-Tasche'},
 sonnenbrille:{re:/sonnenbrille|sunglasses/i, brand:B.sun, cap:160, type:'Sonnenbrillen', tags:['sonnenbrillen','eyewear','marke','accessoire','dropship'], blurb:'Marken-Sonnenbrille'},
};

function clean(n){return n
 .replace(/\b\d{3,}-?\d{2,}\b/g,' ').replace(/\b\d{6,}\b/g,' ')
 .replace(/\bN[ºo°]\b/gi,' ').replace(/\b(EDP|EDT)\b(?:\s+\1\b)+/gi,'$1')
 .replace(/\bMake Up\b/g,'').replace(/\s{2,}/g,' ').replace(/\s*\(\s*\)/g,'').trim().slice(0,70);}

async function bb(path){try{const r=await fetch('https://api.bigbuy.eu'+path,{headers:{'Authorization':`Bearer ${BB}`,'Accept':'application/json'}});if(r.status!==200)return null;return await r.json();}catch{return null;}}
async function shToken(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});const j=await r.json();if(!j.access_token)throw new Error('shopify token fail');return j.access_token;}
async function sgql(tok,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})});return r.json();}
const SET=`mutation($i:ProductSetInput!){productSet(synchronous:true,input:$i){product{id}userErrors{message}}}`;
const MED=`mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$m){mediaUserErrors{message}}}`;
const PUB=`mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,input:$p){userErrors{message}}}`;

const want=(process.env.GROUPS||Object.keys(GROUPS).join(',')).split(',').map(s=>s.trim()).filter(g=>GROUPS[g]);
const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.replace('bb:','').trim()).filter(Boolean):[]);

console.log('Lade BigBuy-Katalog…');
const arr=await bb('/rest/catalog/productsinformation.json?isoCode=de');
if(!arr){console.error('Katalog-Fehler');process.exit(1);}
console.log('Katalog:',arr.length,'· Gruppen:',want.join(','));

const tok=DRY?null:await shToken();
let total=0;
for(const gk of want){
 const g=GROUPS[gk]; const cap=parseInt(process.env['CAP_'+gk]||DEFCAP,10);
 const cands=arr.filter(p=>g.re.test(p.name||'')&&g.brand.test(p.name||'')&&!done.has(String(p.id))&&!/set |coffret|display|tester|\bpack\b/i.test(p.name||'')&&!(g.ban&&g.ban.test(p.name||'')));
 console.log(`\n=== ${gk}: ${cands.length} Kandidaten, Ziel ${cap} ===`);
 let got=0;
 for(const p of cands){
  if(got>=cap)break;
  const d=await bb(`/rest/catalog/product/${p.id}.json?isoCode=de`); await sleep(250);
  if(!d||!(d.active===true||d.active===1))continue;
  const eur=Number(d.wholesalePrice)||0; if(!eur||eur>g.cap)continue;
  const im=await bb(`/rest/catalog/productimages/${p.id}.json`); await sleep(250);
  const imgs=((im&&im.images)||[]).map(x=>x.url).filter(u=>/^https/.test(u)).slice(0,20); // ALLE verfügbaren Bilder
  if(!imgs.length)continue;
  const title=clean(p.name); if(title.length<5)continue;
  if(DRY){console.log(`  [DRY] CHF${chf(eur)} | ${title}`);got++;total++;continue;}
  const slug=title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)+'-bb'+p.id;
  const desc=buildGalaxusDesc(p.description, {title, blurb:g.blurb}); // Galaxus-Stil: Intro + Specs + Trust
  const input={title,handle:slug,productType:g.type,vendor:'LuxeStyle',status:'ACTIVE',tags:g.tags,descriptionHtml:desc,
   seo:{title:(title+' | LuxeStyle CH').slice(0,70),description:(`${title} – ${g.blurb}, 100% Original bei LuxeStyle Schweiz. EU-Lager, schnelle Lieferung. Gratis-Versand ab CHF 65.`).slice(0,320)},
   productOptions:[{name:'Variante',values:[{name:'Standard'}]}],
   variants:[{optionValues:[{optionName:'Variante',name:'Standard'}],price:chf(eur),inventoryItem:{sku:'BB-'+p.id,tracked:false},inventoryPolicy:'CONTINUE'}],
   files:[{originalSource:imgs[0],contentType:'IMAGE'}]};
  const r=await sgql(tok,SET,input?{i:input}:null); const e=r.data?.productSet?.userErrors||[]; const pid=r.data?.productSet?.product?.id;
  if(e.length||!pid){console.log('  ✗',title.slice(0,30),JSON.stringify(e).slice(0,100));continue;}
  if(imgs.length>1)await sgql(tok,MED,{id:pid,m:imgs.slice(1).map(u=>({originalSource:u,mediaContentType:'IMAGE'}))});
  await sgql(tok,PUB,{id:pid,p:PUBS});
  fs.appendFileSync(LEDGER,'bb:'+p.id+'\n'); done.add(String(p.id));
  got++; total++; if(got%10===0)console.log(`  ${gk} ${got}/${cap}…`);
  await sleep(300);
 }
 console.log(`${gk}: ${got} angelegt.`);
}
console.log(`\nFERTIG: ${total} Produkte${DRY?' [DRY]':''}.`);
