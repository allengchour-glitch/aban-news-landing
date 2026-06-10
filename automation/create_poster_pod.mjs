#!/usr/bin/env node
/* LuxeStyle — create_poster_pod.mjs
 * Legt EIN anpassbares Produkt „Poster zum Selbstgestalten" per Shopify productSet an
 * (4 Grössen, SKU = <präfix>_<Printful-Variant-ID> → printful_sync routet die Druck-Bestellung).
 * Tag `wunschdesign` → Editor-Widget klinkt sich automatisch ein (pod_inject_designer, poster-aware via productType "Poster").
 * Idempotent über festen Handle `poster-zum-selbstgestalten` (Re-Run aktualisiert statt dupliziert).
 * Featured-/Editor-Bild: sauberes Hochformat-Blanko (pod/poster-blank.png via Pages).
 * No-op-safe ohne Creds. DRY_RUN=1 = Vorschau. Status DRAFT (Aktivieren/Publizieren danach separat).
 * ENV: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID/SECRET (oder _ADMIN_TOKEN) · [POSTER_IMG] · [SKU_PREFIX=9000001] · [DRY_RUN=1]
 */
const SHOPraw=process.env.SHOPIFY_SHOP||''; const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1'; const API='2025-01';
const IMG=(process.env.POSTER_IMG||'https://abannews.com/pod/poster-blank.png').trim();
const PREFIX=(process.env.SKU_PREFIX||'9000001').trim();
let SHOP=SHOPraw.replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }

async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN))return ADMIN_TOKEN; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} console.error('❌ Auth'); process.exit(0); }

// [Anzeige-Grösse, Printful-Variant-ID (Produkt 268 „Enhanced Matte Paper Poster cm"), Richt-Verkaufspreis CHF]
const SIZES=[
  ['30×40 cm',        '8948',  '25.90'],
  ['50×70 cm',        '8952',  '32.90'],
  ['70×100 cm',       '8954',  '46.90'],
  ['A2 (42×59,4 cm)', '19516', '28.90'],
];
const HANDLE='poster-zum-selbstgestalten';
const TITLE='Poster zum Selbstgestalten';
const DESC=`<p>Dein eigenes Foto, Motiv oder Design als <strong>Premium-Kunstdruck</strong> – du gestaltest es direkt hier im Editor (Bild hochladen, Text & Sticker hinzufügen, frei platzieren). Mattes Premium-Papier, satti Farben, on-demand in Europa gedruckt &amp; sorgfältig verpackt.</p><ul><li>Lade dein Bild hoch &amp; gestalte es selbst</li><li>Mehrere Grössen (30×40 bis 70×100 cm)</li><li>Premium-Matt-Papier, randlos bedruckt</li></ul><p>Tipp: für beste Druckqualität ein <strong>möglichst grosses/scharfes Bild</strong> hochladen. 🇨🇭 LuxeStyle</p>`;

const SET=`mutation($input:ProductSetInput!){ productSet(synchronous:true,input:$input){ product{ id handle status } userErrors{ field message } } }`;

const input={
  title:TITLE, handle:HANDLE,
  descriptionHtml:DESC,
  productType:'Poster', vendor:'LuxeStyle', status:'DRAFT',
  tags:['wunschdesign','printful_personalized_product','pod-poster','poster','selbst-gestalten'],
  productOptions:[{name:'Grösse', values:SIZES.map(s=>({name:s[0]}))}],
  variants:SIZES.map(s=>({
    optionValues:[{optionName:'Grösse',name:s[0]}],
    price:s[2],
    sku:`${PREFIX}_${s[1]}`,
    inventoryPolicy:'CONTINUE'
  })),
  files:[{originalSource:IMG, contentType:'IMAGE', alt:TITLE}]
};

console.log(`Poster-Produkt „${TITLE}" (${HANDLE})${DRY?' [DRY]':''}`);
SIZES.forEach(s=>console.log(`  ${s[0].padEnd(18)} SKU ${PREFIX}_${s[1]}  CHF ${s[2]}`));
console.log(`  Bild: ${IMG}`);
if(DRY){ console.log('DRY_RUN — nichts geschrieben.'); process.exit(0); }

const tok=await token();
const r=await gql(tok,SET,{input});
const e=r?.data?.productSet?.userErrors||[];
if(e.length||!r?.data?.productSet?.product){ console.error('✗ Fehler:', JSON.stringify(e.length?e:r).slice(0,400)); process.exit(1); }
const p=r.data.productSet.product;
console.log(`\n✅ angelegt/aktualisiert: ${p.handle} (${p.status}) — ${p.id}`);
console.log('Nächste Schritte: pod-inject-designer (Widget) → printful_reprice → Status ACTIVE/publizieren.');
