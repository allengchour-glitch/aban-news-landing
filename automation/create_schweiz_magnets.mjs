#!/usr/bin/env node
/* LuxeStyle — create_schweiz_magnets.mjs
 * FERTIGE Schweiz-Magnete (Printful Die-Cut Magnets 656) mit festem Motiv. Pro Motiv 1 Produkt (3 Grössen).
 * Bild = Motiv; Druckdatei = Produkt-Metafeld custom.print_file (= dasselbe Motiv) → printful_sync druckt automatisch
 * (Fallback ohne Editor-Upload). KEIN `wunschdesign`-Tag → KEIN Editor-Widget (Kunde kauft fertig).
 * Idempotent über Handle. Status DRAFT. No-op ohne Creds. DRY_RUN=1.
 * ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (oder _ADMIN_TOKEN) · [SKU_PREFIX=9000001] · [DRY_RUN=1]
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

const SIZES=[ ['7,6 × 7,6 cm','16366','7.90'], ['10 × 10 cm','16367','9.90'], ['15 × 15 cm','16465','13.90'] ];
// design-Dateiname (ohne .png) → schöner Name
const MOTIFS=[
  ['matterhorn','Matterhorn'],
  ['ch-gruezi-mitenand','Grüezi mitenand'],
  ['ch-merci-vilmal','Merci vilmal'],
  ['swiss-flag-heart','Schweizer Herz'],
  ['swiss-cowbell','Kuhglocke'],
  ['fondue','Fondue'],
];
const SET=`mutation($input:ProductSetInput!){ productSet(synchronous:true,input:$input){ product{ id handle } userErrors{ field message } } }`;
const MF=`mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ field message } } }`;

console.log(`${MOTIFS.length} Schweiz-Magnete${DRY?' [DRY]':''}`);
const tok=DRY?null:await token();
let made=0, fails=[];
for(const [file,pretty] of MOTIFS){
  const url=BASE+file+'.png';
  const title=`Schweiz-Magnet «${pretty}»`;
  const handle='schweiz-magnet-'+file.replace(/^ch-/,'');
  const input={ title, handle, productType:'Magnet', vendor:'LuxeStyle', status:'DRAFT',
    descriptionHtml:`<p><strong>«${pretty}»</strong> als Kühlschrank-Magnet – mattes Finish, starker Magnet, on-demand in Europa gedruckt. Perfekt als CH-Souvenir oder kleines Geschänk. 🇨🇭 LuxeStyle</p>`,
    tags:['printful_personalized_product','fertig-magnet','schweiz-edition','magnet'],
    productOptions:[{name:'Grösse', values:SIZES.map(s=>({name:s[0]}))}],
    variants:SIZES.map(s=>({ optionValues:[{optionName:'Grösse',name:s[0]}], price:s[2], sku:`${PREFIX}_${s[1]}`, inventoryPolicy:'CONTINUE' })),
    files:[{originalSource:url, contentType:'IMAGE', alt:title}] };
  console.log(`  ${title}  → ${handle}  (Motiv ${url})`);
  if(DRY){ made++; continue; }
  const r=await gql(tok,SET,{input}); const e=r?.data?.productSet?.userErrors||[];
  if(e.length||!r?.data?.productSet?.product){ fails.push(`${file}: ${JSON.stringify(e.length?e:r).slice(0,160)}`); continue; }
  const pid=r.data.productSet.product.id;
  // Druckdatei-Metafeld setzen (= festes Motiv) → printful_sync nutzt es als Druckdatei
  const m=await gql(tok,MF,{mf:[{ownerId:pid,namespace:'custom',key:'print_file',type:'url',value:url}]});
  const me=m?.data?.metafieldsSet?.userErrors||[];
  if(me.length) fails.push(`${file} (metafield): ${JSON.stringify(me).slice(0,120)}`);
  console.log(`  ✓ ${title}`); made++;
  await new Promise(x=>setTimeout(x,300));
}
if(fails.length) fails.forEach(f=>console.error('✗',f));
console.log(`\nFertig: ${made} Magnet-Produkt(e)${DRY?' geplant':' angelegt'}${fails.length?`, ${fails.length} Fehler`:''}.`);
