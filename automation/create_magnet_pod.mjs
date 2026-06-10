#!/usr/bin/env node
/* LuxeStyle — create_magnet_pod.mjs
 * „Magnet zum Selbstgestalten" (Printful Die-Cut Magnets 656) per productSet. Kunde lädt eigenes Bild hoch (Editor-Widget),
 * Printful druckt automatisch (printful_sync, placement MAGNET→default). Quadratisch → Default-Widget (kein data-ratio).
 * Idempotent über Handle. Status DRAFT. No-op ohne Creds. DRY_RUN=1.
 * ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (oder _ADMIN_TOKEN) · [MAGNET_IMG] · [SKU_PREFIX=9000001] · [DRY_RUN=1]
 */
const SHOPraw=process.env.SHOPIFY_SHOP||''; const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1'; const API='2025-01';
const IMG=(process.env.MAGNET_IMG||'https://abannews.com/pod/magnet-blank.png').trim();
const PREFIX=(process.env.SKU_PREFIX||'9000001').trim();
let SHOP=SHOPraw.replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN))return ADMIN_TOKEN; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} console.error('❌ Auth'); process.exit(0); }

// [Grösse, Printful Die-Cut-Magnet variant_id, Verkaufspreis CHF]
const SIZES=[ ['7,6 × 7,6 cm','16366','7.90'], ['10 × 10 cm','16367','9.90'], ['15 × 15 cm','16465','13.90'] ];
const HANDLE='magnet-zum-selbstgestalten', TITLE='Magnet zum Selbstgestalten';
const DESC=`<p>Dein eigenes Foto oder Motiv als <strong>Kühlschrank-Magnet</strong> – gestalte ihn direkt hier im Editor (Bild hochladen, Text & Sticker, frei platzieren). Mattes Finish, starker Magnet, on-demand in Europa gedruckt.</p><ul><li>Lade dein Bild hoch &amp; gestalte selbst</li><li>3 Grössen (7,6–15 cm), Die-Cut</li><li>Tolles Geschenk &amp; Souvenir</li></ul><p>🇨🇭 LuxeStyle</p>`;
const SET=`mutation($input:ProductSetInput!){ productSet(synchronous:true,input:$input){ product{ id handle status } userErrors{ field message } } }`;
const input={ title:TITLE, handle:HANDLE, descriptionHtml:DESC, productType:'Magnet', vendor:'LuxeStyle', status:'DRAFT',
  tags:['wunschdesign','printful_personalized_product','pod-magnet','magnet','selbst-gestalten'],
  productOptions:[{name:'Grösse', values:SIZES.map(s=>({name:s[0]}))}],
  variants:SIZES.map(s=>({ optionValues:[{optionName:'Grösse',name:s[0]}], price:s[2], sku:`${PREFIX}_${s[1]}`, inventoryPolicy:'CONTINUE' })),
  files:[{originalSource:IMG, contentType:'IMAGE', alt:TITLE}] };

console.log(`${TITLE} (${HANDLE})${DRY?' [DRY]':''}`);
SIZES.forEach(s=>console.log(`  ${s[0].padEnd(14)} SKU ${PREFIX}_${s[1]}  CHF ${s[2]}`));
if(DRY){ console.log('DRY_RUN — nichts geschrieben.'); process.exit(0); }
const tok=await token();
const r=await gql(tok,SET,{input}); const e=r?.data?.productSet?.userErrors||[];
if(e.length||!r?.data?.productSet?.product){ console.error('✗', JSON.stringify(e.length?e:r).slice(0,400)); process.exit(1); }
console.log(`\n✅ ${r.data.productSet.product.handle} (${r.data.productSet.product.status}) — ${r.data.productSet.product.id}`);
console.log('Nächste Schritte: pod-inject-designer → Status ACTIVE/publizieren.');
