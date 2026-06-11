#!/usr/bin/env node
/* LuxeStyle — create_pod_stickers_all.mjs
 * Legt aus der GANZEN Design-Bibliothek (social/designs/*.png) FERTIGE, auto-druckbare Sticker an (Printful Kiss-Cut 358).
 * Pro Design 1 Produkt (3 Grössen), themen-bewusste DE-Copy + SEO, Tags (theme + fertig-sticker), ACTIVE + publiziert.
 * Auto-Fulfillment: SKU `9000001_<printfulVariantId>` + Metafeld custom.print_file (= Design-URL) → printful_sync druckt.
 * Idempotent über Handle (`pod-sticker-<name>`) + Ledger social/designs/_pod_sticker_created.txt. No-op ohne Creds. DRY_RUN=1.
 * ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (oder _ADMIN_TOKEN) · [LIMIT=60] · [ONLY=a,b] · [SKU_PREFIX=9000001] · [DRY_RUN=1]
 */
import fs from 'node:fs';
const SHOPraw=process.env.SHOPIFY_SHOP||''; const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1'; const API='2025-01';
const PREFIX=(process.env.SKU_PREFIX||'9000001').trim();
const LIMIT=Math.max(1,parseInt(process.env.LIMIT||'60',10)||60);
const ONLY=(process.env.ONLY||'').split(',').map(s=>s.trim()).filter(Boolean);
const BASE='https://abannews.com/social/designs/';
const DIR='social/designs'; const LEDGER='social/designs/_pod_sticker_created.txt';
// Diese Design-Basenamen wurden bereits als „schweiz-sticker-*" angelegt → hier überspringen (keine Dubletten).
const SKIP=new Set(['matterhorn','ch-edelweiss-line','ch-swiss-cross-badge','swiss-flag-heart','fondue','ch-raclette','alphorn','ch-gruezi-mitenand','ch-merci-vilmal','ch-hoi-zaeme','ch-steinbock','ch-murmeli']);
let SHOP=SHOPraw.replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN))return ADMIN_TOKEN; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} console.error('❌ Auth'); process.exit(0); }

// [Grösse-Label, Printful Kiss-Cut variant_id, Preis CHF]
const SIZES=[ ['7,6 × 7,6 cm','10163','4.90'], ['10 × 10 cm','10164','5.90'], ['14 × 14 cm','10165','7.90'] ];
function theme(n){ if(n.startsWith('tattoo-'))return 'tattoo'; if(n.startsWith('badge-')||n.startsWith('logo-'))return 'logo';
  if(/swiss|matterhorn|fondue|alphorn|edelweiss|gruezi|hoppschwiiz|cowbell|ch-|heidi|raclette|enzian|steinbock|murmeli|alpaufzug|chuchi|cervelat|znueni|fasnacht|postauto|baern|basel|prosit/.test(n))return 'schweiz';
  if(/vegan|plant|veggie|broccoli|carrot|tofu/.test(n))return 'vegan';
  if(/cute|wolf|lion|tiger|cat|dog|panda|fox|owl|bear|butterfly|whale|deer|hedgehog/.test(n))return 'tiere';
  if(n.startsWith('text-'))return 'sprueche'; if(/space|astro|planet|rocket|moon|star|cosmic/.test(n))return 'space';
  return 'grafik'; }
const THEME_DE={tattoo:'Tattoo-Style',logo:'Logo & Badge',schweiz:'Schweiz',vegan:'Vegan',tiere:'Tiere',sprueche:'Sprüche',space:'Space',grafik:'Grafik'};
function pretty(n){ const m={'text-hoi':'Hoi','text-gruezi':'Grüezi','text-vegan':'Vegan','text-goodvibes':'Good Vibes Only','text-hoppschwiiz':'Hopp Schwiiz','text-merci':'Merci'};
  if(m[n])return m[n]; return n.replace(/^(text|tattoo|badge|logo)-/,'').replace(/-(cute|y2k|line|vtg|graffiti|face|jack|spooky|sun|pattern)$/,'').replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }

const SET=`mutation($input:ProductSetInput!){ productSet(synchronous:true,input:$input){ product{ id handle } userErrors{ field message } } }`;
const MF=`mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ field message } } }`;
const PUBQ=`{ publications(first:20){ edges{ node{ id } } } }`;
const PUB=`mutation($id:ID!,$pubs:[PublicationInput!]!){ publishablePublish(id:$id,input:$pubs){ userErrors{ field message } } }`;

const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.trim()).filter(Boolean):[]);
let names=fs.readdirSync(DIR).filter(f=>f.endsWith('.png')).map(f=>f.replace(/\.png$/,''));
if(ONLY.length) names=names.filter(n=>ONLY.includes(n));
names=names.filter(n=>!done.has(n) && !SKIP.has(n)).slice(0,LIMIT);
console.log(`${names.length} POD-Sticker${DRY?' [DRY]':''} (Quelle ${BASE})`);
if(DRY){ names.forEach(n=>console.log(`  PLAN: Sticker «${pretty(n)}» [${theme(n)}] → pod-sticker-${n}`)); process.exit(0); }

const tok=await token();
const pubs=((await gql(tok,PUBQ))?.data?.publications?.edges||[]).map(e=>({publicationId:e.node.id}));
let made=0, fails=[];
for(const n of names){
  const url=BASE+n+'.png'; const th=theme(n); const name=pretty(n); const title=`Sticker «${name}»`;
  const tags=['printful_personalized_product','fertig-sticker','sticker','aufkleber',th]; if(th==='schweiz') tags.push('schweiz-edition');
  const input={ title, handle:'pod-sticker-'+n, productType:'Sticker', vendor:'LuxeStyle', status:'ACTIVE',
    descriptionHtml:`<p><strong>«${name}»</strong> als wetterfester Vinyl-Sticker – kratz- &amp; UV-beständig, perfekt für Laptop, Flasche, Handy, Auto &amp; mehr. On-demand in Europa gedruckt. 🇨🇭 LuxeStyle · Thema: ${THEME_DE[th]||th}.</p><ul><li>Wetterfestes Kiss-Cut-Vinyl</li><li>3 Grössen (7,6–14 cm)</li><li>Starke Farben, langlebig</li></ul>`,
    seo:{ title:`Sticker «${name}» – wetterfest & UV-beständig | LuxeStyle`, description:`Vinyl-Sticker «${name}» (${THEME_DE[th]||th}), wetterfest & kratzfest, 3 Grössen. In Europa gedruckt. Gratis-Versand ab CHF 65.` },
    tags,
    productOptions:[{name:'Grösse', values:SIZES.map(s=>({name:s[0]}))}],
    variants:SIZES.map(s=>({ optionValues:[{optionName:'Grösse',name:s[0]}], price:s[2], sku:`${PREFIX}_${s[1]}`, inventoryPolicy:'CONTINUE' })),
    files:[{originalSource:url, contentType:'IMAGE', alt:title}] };
  const r=await gql(tok,SET,{input}); const e=r?.data?.productSet?.userErrors||[];
  if(e.length||!r?.data?.productSet?.product){ fails.push(`${n}: ${JSON.stringify(e.length?e:r).slice(0,140)}`); continue; }
  const pid=r.data.productSet.product.id;
  await gql(tok,MF,{mf:[{ownerId:pid,namespace:'custom',key:'print_file',type:'url',value:url}]});
  if(pubs.length) await gql(tok,PUB,{id:pid,pubs});
  fs.appendFileSync(LEDGER,n+'\n'); made++;
  if(made%10===0) console.log(`  … ${made} angelegt`);
  await new Promise(x=>setTimeout(x,250));
}
if(fails.length) fails.slice(0,15).forEach(f=>console.error('✗',f));
console.log(`\nFertig: ${made} Sticker-Produkt(e) angelegt${fails.length?`, ${fails.length} Fehler`:''}. Rest läuft im nächsten Lauf (Ledger).`);
