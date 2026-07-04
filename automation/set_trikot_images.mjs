#!/usr/bin/env node
/* LuxeStyle — set_trikot_images.mjs
 * Ersetzt die (Fake-Cartoon-)Produktbilder des Fan-Trikots durch die ECHTEN Printful-Mockups → 1:1 = Bild ist Ware.
 * Fügt die Mockup-URLs als Media hinzu, setzt das erste als Featured; mit REPLACE=1 werden vorherige Bilder entfernt.
 * URLs via ENV (kommagetrennt) MOCKUPS="url1,url2,...". Ziel-Produkt via ENV PRODUCT_ID (Default = perso-Trikot).
 * No-op ohne Creds/URLs. DRY_RUN=1.
 * ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · MOCKUPS="..." · [PRODUCT_ID=gid...] · [REPLACE=1] · [DRY_RUN=1]
 */
const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1'; const REPLACE=process.env.REPLACE==='1'; const API='2025-01';
const PRODUCT_ID=(process.env.PRODUCT_ID||'gid://shopify/Product/15433948070273').trim();
const MOCKUPS=(process.env.MOCKUPS||'').split(',').map(s=>s.trim()).filter(s=>/^https?:\/\//.test(s));
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }
if(!MOCKUPS.length){ console.log('Keine MOCKUPS-URLs (ENV MOCKUPS="url1,url2") → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN))return ADMIN_TOKEN; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} console.error('❌ Auth'); process.exit(0); }

const tok=await token();
const QMEDIA=`query($id:ID!){ product(id:$id){ title media(first:50){ edges{ node{ id ... on MediaImage{ image{ url } } } } } } }`;
const ADD=`mutation($id:ID!,$m:[CreateMediaInput!]!){ productCreateMedia(productId:$id, media:$m){ media{ id status } mediaUserErrors{ field message } } }`;
const DEL=`mutation($id:ID!,$mids:[ID!]!){ productDeleteMedia(productId:$id, mediaIds:$mids){ deletedMediaIds mediaUserErrors{ field message } } }`;

const r=await gql(tok,QMEDIA,{id:PRODUCT_ID}); const p=r?.data?.product;
if(!p){ console.error('❌ Produkt nicht gefunden:',PRODUCT_ID); process.exit(1); }
const oldIds=(p.media?.edges||[]).map(e=>e.node.id);
console.log(`Produkt: ${p.title} · alte Medien: ${oldIds.length} · neue Mockups: ${MOCKUPS.length}${REPLACE?' · REPLACE':''}`);
if(DRY){ console.log('DRY: würde hinzufügen:', MOCKUPS.join(' | '), REPLACE?`; alte ${oldIds.length} entfernen`:''); process.exit(0); }
// 1) neue Mockups anlegen
const media=MOCKUPS.map((u,i)=>({originalSource:u, mediaContentType:'IMAGE', alt:`Schweiz Fan-Trikot 2026 – ${i===0?'Vorderseite':'Ansicht '+(i+1)}`}));
const ar=await gql(tok,ADD,{id:PRODUCT_ID,m:media}); const ae=ar?.data?.productCreateMedia?.mediaUserErrors||[];
if(ae.length){ console.error('✗ addMedia:',JSON.stringify(ae)); process.exit(1); }
console.log(`✓ ${media.length} Mockups hinzugefügt.`);
// 2) optional alte entfernen
if(REPLACE && oldIds.length){
  const dr=await gql(tok,DEL,{id:PRODUCT_ID,mids:oldIds}); const de=dr?.data?.productDeleteMedia?.mediaUserErrors||[];
  if(de.length) console.error('✗ delMedia:',JSON.stringify(de)); else console.log(`✓ ${oldIds.length} alte (Fake-)Bilder entfernt.`);
}
console.log('Fertig. (Featured = erstes neues Mockup, sofern REPLACE.)');
