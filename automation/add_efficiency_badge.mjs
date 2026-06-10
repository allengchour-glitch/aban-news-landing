#!/usr/bin/env node
/* LuxeStyle — add_efficiency_badge.mjs
 * Setzt einen RECHTSSICHEREN Effizienz-Hinweis (KEIN EU-Energielabel A–F) bei energiesparenden Produkten:
 *   • Solar-Produkte → „☀️ Solarbetrieben · keine Stromkosten"
 *   • USB/Akku-LED (in der Beleuchtungs-Collection) → „🔌 USB/Akku-LED · energieeffizient"
 * Stellt das Badge der Produktbeschreibung voran. Idempotent (Marker class="ls-eff" → kein Doppeln).
 * KEINE erfundene Energieklasse. No-op ohne Creds. DRY_RUN=1 = Vorschau.
 * ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET · [DRY_RUN=1]
 */
const SHOP=(process.env.SHOPIFY_SHOP||'').trim(); const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1'; const API='2025-01';
if(!SHOP||!CID||!CSEC){ console.log('Kein Shopify-Cred → No-op.'); process.exit(0); }

async function token(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); if(!j.access_token) throw new Error('kein Token'); return j.access_token; }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); const j=await r.json(); if(j.errors) throw new Error(JSON.stringify(j.errors)); return j.data; }

const BADGE=(t)=>`<p class="ls-eff" style="display:inline-block;background:#edf6ee;color:#1c6b3a;border:1px solid #cfe6cf;border-radius:999px;padding:7px 16px;font-size:13px;font-weight:700;margin:0 0 14px;">${t}</p>`;
const SOLAR='☀️ Solarbetrieben · keine Stromkosten';
const USBLED='🔌 USB/Akku-LED · energieeffizient';

const Q_COLL=`query{ collectionByHandle(handle:"beleuchtung-lampen"){ products(first:50){ edges{ node{ id title descriptionHtml } } } } }`;
const Q_SOLAR=`query{ products(first:50, query:"title:Solar*"){ edges{ node{ id title descriptionHtml } } } }`;
const M=`mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{ id } userErrors{ field message } } }`;

const tok=DRY?(process.env._DRYTOK||await token()):await token();
const coll=(await gql(tok,Q_COLL)).collectionByHandle?.products?.edges?.map(e=>e.node)||[];
const solar=(await gql(tok,Q_SOLAR)).products?.edges?.map(e=>e.node)||[];
const collIds=new Set(coll.map(p=>p.id));
const byId=new Map(); for(const p of [...coll,...solar]) byId.set(p.id,p);

let changed=0, skipped=0;
for(const p of byId.values()){
  const desc=p.descriptionHtml||'';
  if(/class="ls-eff"/.test(desc)){ console.log(`= ${p.title}: Badge schon da`); skipped++; continue; }
  const isSolar=/solar/i.test(p.title)||/solar/i.test(desc);
  const inLamps=collIds.has(p.id);
  const isUsb=/usb|akku|aufladbar|wiederaufladbar/i.test(p.title+desc);
  let txt=null;
  if(isSolar) txt=SOLAR;
  else if(inLamps && isUsb) txt=USBLED;
  if(!txt){ console.log(`– ${p.title}: kein Effizienz-Claim → übersprungen`); skipped++; continue; }
  const newDesc=BADGE(txt)+'\n'+desc;
  if(DRY){ console.log(`DRY ${p.title}: ${txt}`); changed++; continue; }
  const r=await gql(tok,M,{p:{id:p.id,descriptionHtml:newDesc}});
  const ue=r.productUpdate?.userErrors||[];
  if(ue.length){ console.error(`✗ ${p.title}:`,JSON.stringify(ue)); continue; }
  console.log(`✓ ${p.title}: ${txt}`); changed++;
  await new Promise(x=>setTimeout(x,300));
}
console.log(`\nFertig: ${changed} ${DRY?'(DRY) ':''}mit Badge, ${skipped} übersprungen.`);
