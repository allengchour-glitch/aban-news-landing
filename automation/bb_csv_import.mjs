/* bb_csv_import.mjs — importiert rentable, lagernde BigBuy-Ware aus dem FTP-Produkt-Feed (User 2026-07-14,
 * FTP-CSV statt rate-limitierter API). Quelle: /tmp/bb_all_viable.json (aus products_*.csv gefiltert:
 * lagernd ∩ klein/kein-Sperrgut ∩ Profit≥€18 nach €27.94 CH-Versand). Bilder direkt aus dem Feed (kein API-Call).
 * tracked+DENY (kein Ghost-Sale), Titel-Wache gegen Dubletten, Ledger. ENV: SHOPIFY_CLIENT_ID/SECRET · [LIMIT]
 */
import fs from 'node:fs';
import { catTags } from './cat_tags.mjs';
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const SHOP='au3j0y-hq.myshopify.com', LOC='gid://shopify/Location/109350125953';
const PUBS=['301970915713','301971014017','302032716161','302566834561','302872297857','302994456961'].map(id=>({publicationId:`gid://shopify/Publication/${id}`}));
const LIMIT=parseInt(process.env.LIMIT||'500',10);
const LEDGER='dropship/_bb_csv_done.txt';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').filter(Boolean):[]);
const viable=JSON.parse(fs.readFileSync('/tmp/bb_all_viable.json','utf8'));
const normT=x=>x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim();
const existTitles=new Set();
try{for(const l of fs.readFileSync('/tmp/products.jsonl','utf8').split('\n')){if(!l)continue;try{existTitles.add(normT(JSON.parse(l).title||''));}catch{}}}catch{}
async function scc(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
let TOK=await scc();
async function sgql(q,v){for(let a=0;a<4;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(JSON.stringify(j.errors||'').includes('Throttled')){await sleep(3000);continue;}TOK=await scc();await sleep(1000);}return{};}
async function img200(u){try{const r=await fetch(u,{method:'HEAD'});return r.ok;}catch{return false;}}
const clean=n=>n.replace(/\s*\((Restauriert|Refurbished)[^)]*\)/gi,'').replace(/ß/g,'ss').replace(/\s{2,}/g,' ').trim().slice(0,70);
const SET=`mutation($input:ProductSetInput!){productSet(synchronous:true,input:$input){product{id} userErrors{message}}}`;
let created=0,skip=0;
for(const it of viable.slice(0,LIMIT)){
  if(done.has('bbc:'+it.ref)){skip++;continue;}
  const title=clean(it.name);
  if(!title||title.length<6){skip++;fs.appendFileSync(LEDGER,'bbc:'+it.ref+'\n');continue;}
  if(existTitles.has(normT(title))){console.log('= existiert',title.slice(0,40));fs.appendFileSync(LEDGER,'bbc:'+it.ref+'\n');continue;}
  const img=it.img;
  if(!img||!/^https?:\/\//.test(img)||!(await img200(img))){console.log('✗ bild',title.slice(0,40));fs.appendFileSync(LEDGER,'bbc:'+it.ref+'\n');continue;}
  existTitles.add(normT(title));
  const price=it.sell.toFixed(2);
  const qty=Math.max(1,Math.min(Number(it.qty)||1,20));
  const tags=[...new Set(['bigbuy','dropship','neu','bb-lieferbar-ch',...catTags(title+' '+(it.cat||''))])];
  const slug=(title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,46))+'-'+String(it.ref).toLowerCase();
  const desc=`<p>${title}</p><p>📦 Lieferung aus EU-Lager · Gratis-Versand ab CHF 50 · 30 Tage Rückgabe · Kauf auf Rechnung mit Klarna & TWINT · 🇨🇭 LuxeStyle</p>`;
  const input={title,handle:slug,productType:'BigBuy-CH',vendor:'LuxeStyle',status:'ACTIVE',tags,descriptionHtml:desc,
    seo:{title:`${title} | LuxeStyle`.slice(0,70),description:`${title} – schnelle EU-Lieferung, Gratis-Versand ab CHF 50.`.slice(0,320)},
    productOptions:[{name:'Titel',values:[{name:'Standard'}]}],
    variants:[{optionValues:[{optionName:'Titel',name:'Standard'}],price,inventoryItem:{sku:`bb-${it.ref}`.slice(0,70),tracked:true},inventoryPolicy:'DENY',inventoryQuantities:[{locationId:LOC,name:'available',quantity:qty}]}],
    files:[{originalSource:img,contentType:'IMAGE'}]};
  const r=await sgql(SET,{input});
  const spid=r.data?.productSet?.product?.id;
  if(!spid){console.log('✗',title.slice(0,40),JSON.stringify(r.data?.productSet?.userErrors||'').slice(0,90));fs.appendFileSync(LEDGER,'bbc:'+it.ref+'\n');continue;}
  await sgql(`mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,input:$p){userErrors{message}}}`,{id:spid,p:PUBS});
  fs.appendFileSync(LEDGER,'bbc:'+it.ref+'\n');created++;
  console.log(`✅ ${title.slice(0,44)} → CHF ${price} [${qty}] {${tags.filter(t=>!['bigbuy','dropship','neu','bb-lieferbar-ch'].includes(t)).join(',')}}`);
  await sleep(400);
}
console.log(`\nFERTIG. angelegt=${created} skip=${skip}`);
