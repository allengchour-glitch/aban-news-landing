#!/usr/bin/env node
/* LuxeStyle — create_prodigi_products.mjs
 * FERTIGE Schweiz-Poster als Prodigi-Print-Produkte (Global Fine-Art-Print, EU/Global-Labs → schnelle EU-Lieferung).
 * Pro Motiv 1 Produkt (3 Grössen A4/A3/A2). Bild = Motiv (Hochformat); Druckdatei = Metafeld custom.print_file (= dasselbe
 * Hochformat-Motiv) → prodigi_sync druckt automatisch (Fallback ohne Editor-Upload). KEIN `wunschdesign` → kein Editor-Widget.
 * Shopify-Variant-SKU = DIREKT die Prodigi-SKU (z.B. GLOBAL-FAP-A3); prodigi_sync nutzt sie 1:1.
 * Idempotent über Handle. Status ACTIVE + Publish in alle Publications. No-op ohne Creds. DRY_RUN=1.
 * ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (oder _ADMIN_TOKEN) · [DRY_RUN=1]
 */
const SHOPraw=process.env.SHOPIFY_SHOP||''; const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1'; const API='2025-01';
const BASE='https://abannews.com/social/posters/hoch/';
let SHOP=SHOPraw.replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN))return ADMIN_TOKEN; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} console.error('❌ Auth'); process.exit(0); }

// [Grösse-Label, Prodigi-SKU, Verkaufspreis CHF]
const SIZES=[ ['A4 (21×30 cm)','GLOBAL-FAP-A4','24.90'], ['A3 (30×42 cm)','GLOBAL-FAP-A3','34.90'], ['A2 (42×59 cm)','GLOBAL-FAP-A2','44.90'] ];
// poster-Dateiname (in social/posters/hoch/, OHNE .jpg) → schöner Name
const MOTIFS=[
  ['ch-poster-matterhorn-hoch','Matterhorn'],
  ['ch-poster-alps-panorama-hoch','Alpen-Panorama'],
  ['ch-poster-chalet-hoch','Chalet'],
  ['ch-poster-cow-hoch','Schweizer Kuh'],
  ['ch-poster-edelweiss-hoch','Edelweiss'],
  ['ch-poster-edelweiss-pattern-hoch','Edelweiss-Muster'],
  ['ch-poster-fondue-hoch','Fondue'],
  ['ch-poster-gondola-hoch','Gondelbahn'],
  ['ch-poster-gruezi-hoch','Grüezi'],
  ['ch-poster-lake-hoch','Bergsee'],
];
const SET=`mutation($input:ProductSetInput!){ productSet(synchronous:true,input:$input){ product{ id handle status } userErrors{ field message } } }`;
const MF=`mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ field message } } }`;
const PUBQ=`{ publications(first:20){ edges{ node{ id name } } } }`;
const PUB=`mutation($id:ID!,$pubs:[PublicationInput!]!){ publishablePublish(id:$id,input:$pubs){ userErrors{ field message } } }`;

console.log(`${MOTIFS.length} Prodigi-Schweiz-Poster${DRY?' [DRY]':''} (Quelle ${BASE})`);
SIZES.forEach(s=>console.log(`  ${s[0].padEnd(16)} SKU ${s[1]}  CHF ${s[2]}`));
if(DRY){ MOTIFS.forEach(([f,p])=>console.log(`  PLAN: Poster «${p}» → prodigi-poster-${f.replace(/^ch-poster-/,'').replace(/-hoch$/,'')}  (${BASE}${f}.jpg)`)); console.log('DRY_RUN — nichts geschrieben.'); process.exit(0); }

const tok=await token();
const pubs=((await gql(tok,PUBQ))?.data?.publications?.edges||[]).map(e=>({publicationId:e.node.id}));
let made=0, fails=[];
for(const [file,pretty] of MOTIFS){
  const url=BASE+file+'.jpg';
  const title=`Schweiz-Poster «${pretty}»`;
  const handle='prodigi-poster-'+file.replace(/^ch-poster-/,'').replace(/-hoch$/,'');
  const input={ title, handle, productType:'Poster', vendor:'LuxeStyle', status:'ACTIVE',
    descriptionHtml:`<p><strong>«${pretty}»</strong> als hochwertiger Fine-Art-Print – mattes Premium-Papier, in EU-Labs gedruckt &amp; gerahmt-fähig. Perfekt für Wohnzimmer, Büro oder als Schweizer Geschänk. 🇨🇭 LuxeStyle</p><ul><li>Mattes Museums-Papier (Giclée)</li><li>3 Grössen (A4–A2)</li><li>Schnelle EU-Produktion &amp; -Lieferung</li></ul>`,
    tags:['prodigi_personalized_product','fertig-poster','schweiz-edition','poster','wohnen-dekoration'],
    productOptions:[{name:'Grösse', values:SIZES.map(s=>({name:s[0]}))}],
    variants:SIZES.map(s=>({ optionValues:[{optionName:'Grösse',name:s[0]}], price:s[2], sku:s[1], inventoryPolicy:'CONTINUE' })),
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
console.log(`\nFertig: ${made} Poster-Produkt(e) angelegt${fails.length?`, ${fails.length} Fehler`:''}.`);
