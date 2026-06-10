#!/usr/bin/env node
/* LuxeStyle — create_schweiz_stickers.mjs
 * FERTIGE Schweiz-Sticker (Printful Kiss-Cut Stickers 358) mit festem Motiv. Pro Motiv 1 Produkt (3 Grössen).
 * Bild = Motiv; Druckdatei = Metafeld custom.print_file (= dasselbe Motiv) → printful_sync druckt automatisch.
 * KEIN `wunschdesign` → kein Editor-Widget. Tag `schweiz-edition` → füllt die Smart-Collection. ACTIVE + publish in alle Kanäle.
 * Shopify-Variant-SKU = `9000001_<printfulKissCutVariantId>` (printful_sync decodet die Zahl). Idempotent über Handle.
 * No-op ohne Creds. DRY_RUN=1. ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (oder _ADMIN_TOKEN) · [SKU_PREFIX=9000001] · [DRY_RUN=1]
 */
const SHOPraw=process.env.SHOPIFY_SHOP||''; const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1'; const API='2025-01';
const PREFIX=(process.env.SKU_PREFIX||'9000001').trim();
const BASE='https://abannews.com/social/designs/';
let SHOP=SHOPraw.replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN))return ADMIN_TOKEN; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} console.error('❌ Auth'); process.exit(0); }

// [Grösse-Label, Printful Kiss-Cut-Sticker variant_id, Verkaufspreis CHF]
const SIZES=[ ['7,6 × 7,6 cm','10163','4.90'], ['10 × 10 cm','10164','5.90'], ['14 × 14 cm','10165','7.90'] ];
// design-Dateiname (ohne .png) → schöner Mundart-Name
const MOTIFS=[
  ['matterhorn','Matterhorn'],
  ['ch-edelweiss-line','Edelwyss'],
  ['ch-swiss-cross-badge','Schwiizerchrüz'],
  ['swiss-flag-heart','Schwiizer Härz'],
  ['fondue','Fondue'],
  ['ch-raclette','Raclette'],
  ['alphorn','Alphorn'],
  ['ch-gruezi-mitenand','Grüezi mitenand'],
  ['ch-merci-vilmal','Merci vilmal'],
  ['ch-hoi-zaeme','Hoi zäme'],
  ['ch-steinbock','Steinbock'],
  ['ch-murmeli','Murmeli'],
];
const SET=`mutation($input:ProductSetInput!){ productSet(synchronous:true,input:$input){ product{ id handle status } userErrors{ field message } } }`;
const MF=`mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ field message } } }`;
const PUBQ=`{ publications(first:20){ edges{ node{ id } } } }`;
const PUB=`mutation($id:ID!,$pubs:[PublicationInput!]!){ publishablePublish(id:$id,input:$pubs){ userErrors{ field message } } }`;

console.log(`${MOTIFS.length} Schweiz-Sticker${DRY?' [DRY]':''} (Quelle ${BASE})`);
SIZES.forEach(s=>console.log(`  ${s[0].padEnd(14)} SKU ${PREFIX}_${s[1]}  CHF ${s[2]}`));
if(DRY){ MOTIFS.forEach(([f,p])=>console.log(`  PLAN: Sticker «${p}» → schweiz-sticker-${f.replace(/^ch-/,'')}`)); console.log('DRY_RUN — nichts geschrieben.'); process.exit(0); }

const tok=await token();
const pubs=((await gql(tok,PUBQ))?.data?.publications?.edges||[]).map(e=>({publicationId:e.node.id}));
let made=0, fails=[];
for(const [file,pretty] of MOTIFS){
  const url=BASE+file+'.png';
  const title=`Schweiz-Sticker «${pretty}»`;
  const handle='schweiz-sticker-'+file.replace(/^ch-/,'');
  const input={ title, handle, productType:'Sticker', vendor:'LuxeStyle', status:'ACTIVE',
    descriptionHtml:`<p><strong>«${pretty}»</strong> als wetterfester Vinyl-Sticker – kratz- &amp; UV-beständig, perfekt für Laptop, Flasche, Auto &amp; mehr. On-demand in Europa gedruckt. 🇨🇭 LuxeStyle</p><ul><li>Wetterfestes Kiss-Cut-Vinyl</li><li>3 Grössen (7,6–14 cm)</li><li>Tolles CH-Souvenir &amp; Geschänk</li></ul>`,
    tags:['printful_personalized_product','fertig-sticker','schweiz-edition','sticker','aufkleber'],
    productOptions:[{name:'Grösse', values:SIZES.map(s=>({name:s[0]}))}],
    variants:SIZES.map(s=>({ optionValues:[{optionName:'Grösse',name:s[0]}], price:s[2], sku:`${PREFIX}_${s[1]}`, inventoryPolicy:'CONTINUE' })),
    files:[{originalSource:url, contentType:'IMAGE', alt:title}] };
  const r=await gql(tok,SET,{input}); const e=r?.data?.productSet?.userErrors||[];
  if(e.length||!r?.data?.productSet?.product){ fails.push(`${file}: ${JSON.stringify(e.length?e:r).slice(0,160)}`); continue; }
  const pid=r.data.productSet.product.id;
  const m=await gql(tok,MF,{mf:[{ownerId:pid,namespace:'custom',key:'print_file',type:'url',value:url}]});
  const me=m?.data?.metafieldsSet?.userErrors||[]; if(me.length) fails.push(`${file} (metafield): ${JSON.stringify(me).slice(0,120)}`);
  if(pubs.length){ const pr=await gql(tok,PUB,{id:pid,pubs}); const pe=pr?.data?.publishablePublish?.userErrors||[]; if(pe.length) fails.push(`${file} (publish): ${JSON.stringify(pe).slice(0,120)}`); }
  console.log(`  ✓ ${title} → ${handle} (ACTIVE, ${pubs.length} Kanäle)`); made++;
  await new Promise(x=>setTimeout(x,300));
}
if(fails.length) fails.forEach(f=>console.error('✗',f));
console.log(`\nFertig: ${made} Sticker-Produkt(e) angelegt${fails.length?`, ${fails.length} Fehler`:''}.`);
