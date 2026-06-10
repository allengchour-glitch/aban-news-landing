#!/usr/bin/env node
/* LuxeStyle — create_sticker_products_shopify.mjs
 * Plan B (Printful /store/products ist für Shopify-Stores gesperrt): legt aus social/designs/*.png
 * direkt SHOPIFY-Sticker-Produkte an (3 Grössen, Design als Bild, Tag fertig-sticker + Thema, DRAFT).
 * Fulfillment: pro verkauftem Design 1× in Printful mappen (oder Sticker-API-Anbieter).
 * Idempotent über Ledger social/designs/_shop_created.txt. DRY_RUN=1 = Vorschau.
 * ENV: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID/SECRET (oder _ADMIN_TOKEN) · [LIMIT=20] · [ONLY=...] · [DRY_RUN=1]
 */
const SHOPraw=process.env.SHOPIFY_SHOP||''; const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const LIMIT=Math.max(1,parseInt(process.env.LIMIT||'20',10)||20);
const ONLY=(process.env.ONLY||'').split(',').map(s=>s.trim()).filter(Boolean);
const DRY=process.env.DRY_RUN==='1'; const API='2025-01';
const RAW='https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/main/social/designs/';
import fs from 'node:fs'; import path from 'node:path';
let SHOP=SHOPraw.replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }
const LEDGER='social/designs/_shop_created.txt'; const DIR='social/designs';

async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN))return ADMIN_TOKEN; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} console.error('❌ Auth'); process.exit(0); }

function theme(n){ if(n.startsWith('tattoo-'))return 'tattoo'; if(n.startsWith('badge-')||n.startsWith('logo-'))return 'logo';
  if(/swiss|matterhorn|fondue|alphorn|edelweiss|gruezi|hoppschwiiz|cowbell/.test(n))return 'schweiz';
  if(/vegan|plant|veggie|broccoli|carrot/.test(n))return 'vegan';
  if(/cute|wolf|lion|tiger|cat|dog|panda|fox|owl|bear/.test(n))return 'tiere';
  if(n.startsWith('text-'))return 'sprueche'; return 'grafik'; }
function pretty(n){ const m={'text-hoi':'Hoi','text-gruezi':'Grüezi','text-vegan':'Vegan','text-goodvibes':'Good Vibes Only','text-hoppschwiiz':'Hopp Schwiiz'};
  if(m[n])return m[n]; return n.replace(/^text-/,'').replace(/-(cute|y2k|line|vtg|graffiti|face|jack|spooky)$/,'').replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }

const SET=`mutation($input:ProductSetInput!){ productSet(synchronous:true,input:$input){ product{ id handle } userErrors{ field message } } }`;
const VARS=[['Klein (~7 cm)','4.90'],['Mittel (~10 cm)','5.90'],['Gross (~14 cm)','7.90']];

const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.trim()).filter(Boolean):[]);
let names=fs.readdirSync(DIR).filter(f=>f.endsWith('.png')).map(f=>f.replace(/\.png$/,''));
if(ONLY.length) names=names.filter(n=>ONLY.includes(n));
names=names.filter(n=>!done.has(n)).slice(0,LIMIT);
console.log(`${names.length} Sticker-Produkte${DRY?' (DRY)':''}: ${names.join(', ')}\n`);

const tok=DRY?null:await token();
let made=0, fails=[];
for(const n of names){
  const title=`Sticker «${pretty(n)}»`; const th=theme(n);
  const input={ title, descriptionHtml:`<p>Vinyl-Aufkleber «${pretty(n)}» – wetterfest & langlebig, perfekt für Laptop, Flasche, Handy &amp; mehr. 🇨🇭 In der Schweiz gedruckt.</p>`,
    productType:'Sticker', vendor:'LuxeStyle', status:'DRAFT', tags:['fertig-sticker','aufkleber',th],
    productOptions:[{name:'Grösse', values:VARS.map(v=>({name:v[0]}))}],
    variants:VARS.map(v=>({optionValues:[{optionName:'Grösse',name:v[0]}], price:v[1]})),
    files:[{originalSource:RAW+n+'.png', contentType:'IMAGE', alt:title}] };
  if(DRY){ console.log('PLAN:', title, '|', th, '| 4.90/5.90/7.90'); made++; continue; }
  try{ const r=await gql(tok,SET,{input}); const e=r?.data?.productSet?.userErrors||[]; if(e.length||!r?.data?.productSet?.product){ fails.push(`${n}: ${JSON.stringify(e||r).slice(0,160)}`); continue; }
    fs.appendFileSync(LEDGER,n+'\n'); console.log(`✓ ${title} → ${r.data.productSet.product.handle}`); made++;
  }catch(err){ fails.push(`${n}: ${err.message}`); }
}
if(fails.length) fails.forEach(f=>console.error('✗',f));
console.log(`\nFertig: ${made} Produkt(e)${DRY?' geplant':' angelegt'}${fails.length?`, ${fails.length} Fehler`:''}.`);
