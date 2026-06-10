#!/usr/bin/env node
/* LuxeStyle — fix_policies_footer.mjs
 * (1) Policies: Domain-Konsistenz (aban-192.myshopify.com / luxestyle.com → luxestyle.ch, Telefon-Tippfehler).
 * (2) Footer-Social-Block: custom_url (abannews) entfernen, TikTok auf @luxestyle.ch, YouTube/Twitter-Platzhalter leeren.
 * Auth: Client-Credentials (raw Admin-API). No-op ohne Creds. DRY_RUN=1 = nur anzeigen.
 */
const SHOPraw=process.env.SHOPIFY_SHOP||'', CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(), SEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const ADMIN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim(); const DRY=process.env.DRY_RUN==='1'; const API='2025-01';
let SHOP=SHOPraw.replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!ADMIN && !(CID&&SEC)){ console.log('Keine Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:SEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
const tok=ADMIN&&await works(ADMIN)?ADMIN:(CID&&SEC?await cc():null);
if(!tok){ console.error('Auth fehlgeschlagen'); process.exit(0); }

// (1) Policies
function fixText(t){ let s=t;
  s=s.replace(/aban-192\.myshopify\.com/g,'luxestyle.ch');
  s=s.replace(/Telefon: info@luxestyle\.com/g,'Telefon: 0795382814');
  s=s.replace(/Schweiz, info@luxestyle\.com/g,'Schweiz, allengchour@gmail.com');
  s=s.replace(/luxestyle\.com/g,'luxestyle.ch');
  return s; }
const pol=await gql(tok,'{ shop { shopPolicies { id type body } } }');
let pchanged=0;
for(const p of (pol?.data?.shop?.shopPolicies||[])){
  const nb=fixText(p.body||'');
  if(nb!==p.body){
    console.log(`Policy ${p.type}: Domain-Fix nötig`);
    if(!DRY){ const r=await gql(tok,`mutation($p:ShopPolicyInput!){ shopPolicyUpdate(shopPolicy:$p){ userErrors{message} } }`,{p:{id:p.id,body:nb}});
      const e=r?.data?.shopPolicyUpdate?.userErrors||[]; if(e.length) console.error('  ⚠️',JSON.stringify(e)); else { console.log('  ✓ aktualisiert'); pchanged++; } }
    else pchanged++;
  }
}

// (2) Footer-Social-Block
const th=await gql(tok,'{ themes(first:1, roles:[MAIN]){ nodes{ id files(filenames:["sections/footer-group.json"]){ nodes{ body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } } }');
const node=th?.data?.themes?.nodes?.[0]; const themeId=node?.id; let content=node?.files?.nodes?.[0]?.body?.content||'';
let nc=content
  .replace(/"custom_url": "https:\/\/www\.abannews\.com"/g,'"custom_url": ""')
  .replace(/"youtube_url": "https:\/\/www\.youtube\.com\/"/g,'"youtube_url": ""')
  .replace(/"twitter_url": "https:\/\/x\.com\/"/g,'"twitter_url": ""')
  .replace(/"tiktok_url": "https:\/\/www\.tiktok\.com\/"/g,'"tiktok_url": "https://www.tiktok.com/@luxestyle.ch"');
if(nc!==content){
  console.log('Footer: Abannews-Link entfernen + TikTok/YouTube/Twitter bereinigen');
  if(!DRY){ const r=await gql(tok,`mutation($themeId:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){ themeFilesUpsert(themeId:$themeId,files:$files){ upsertedThemeFiles{ filename } userErrors{ filename code message } } }`,
      {themeId, files:[{filename:'sections/footer-group.json', body:{type:'TEXT', value:nc}}]});
    const e=r?.data?.themeFilesUpsert?.userErrors||[]; if(e.length) console.error('  ⚠️ Footer-Write:',JSON.stringify(e)); else console.log('  ✓ Footer aktualisiert'); }
} else console.log('Footer: nichts zu ändern (Abannews nicht gefunden?)');
console.log(`\nFertig${DRY?' (DRY)':''}: ${pchanged} Policy-Änderung(en) + Footer-Fix.`);
