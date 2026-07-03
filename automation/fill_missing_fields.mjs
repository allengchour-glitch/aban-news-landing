#!/usr/bin/env node
/* fill_missing_fields — scannt ALLE aktiven Produkte und füllt NUR echte Lücken:
 *   • fehlender seo.title / seo.description  → Template aus dem Produkttitel
 *   • fehlende/triviale descriptionHtml      → sauberer Basis-Block + Trust-Box (KEINE erfundenen Specs)
 * Idempotent: vorhandene Felder werden NIE überschrieben. Zwei-Phasen + Stall-Guard.
 * LIVE=1 schreibt. ENV: SHOPIFY_SHOP / SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET.
 * Optional: QUERY="..." (Default "status:active"), MAX=Zahl (Test-Limit).
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const QUERY=process.env.QUERY||'status:active';
const MAX=Number(process.env.MAX||0);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<6;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}
const clean=s=>(s||'').replace(/^[^\p{L}\p{N}]+/u,'').replace(/\s+/g,' ').trim();
const cut=(s,n)=>s.length<=n?s:s.slice(0,n-1).trim()+'…';
const textLen=h=>(h||'').replace(/<[^>]+>/g,'').replace(/&[a-z]+;/g,' ').trim().length;

const TRUST='<div style="background:#f7faf7;border:1px solid #d9e7d9;border-radius:10px;padding:11px 14px;margin:12px 0;font-size:14px;line-height:1.5;"><strong>🛡️ Sorglos shoppen:</strong> ✅ 100 % Original-Markenware · 🚚 EU-Lager – Lieferung ca. 3–7 Tage · 🔄 30 Tage Rückgabe · 🇨🇭 Schweizer Shop · 💳 TWINT, Karte &amp; Klarna.</div><p>Gratis-Versand ab CHF 65 · <strong>–10 % mit Code WELCOME10</strong></p>';
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

const t=await tk(); if(!t){console.error('Kein Token');process.exit(1);}

// Phase 1: alle Kandidaten mit ihren aktuellen Feldern sammeln
const Q=`query($c:String){ products(first:50, query:"${QUERY}", after:$c){ pageInfo{hasNextPage endCursor} edges{ node{ id title productType vendor status descriptionHtml seo{title description} featuredMedia{id} } } } }`;
let c=null, items=[], seen=new Set(), stall=0, pages=0;
do{
  const r=await gql(t,Q,{c}); const pg=r?.data?.products;
  if(!pg){await sleep(2500);continue;}
  const before=items.length;
  for(const e of pg.edges){ if(seen.has(e.node.id))continue; seen.add(e.node.id); items.push(e.node); }
  if(items.length===before){ if(++stall>=5){console.log(`  ⚠️ STALL bei ${items.length}`);break;} } else stall=0;
  c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null; pages++;
  if(pages%20===0)console.log(`  Phase1 … ${items.length}`);
  if(MAX&&items.length>=MAX)break;
}while(c);
console.log(`Phase 1: ${items.length} Produkte gescannt.`);

// Bild-Lücken: aktive Produkte ohne Bild sind Verkaufs-Defekte → auf DRAFT setzen
const DRAFT_NOIMG=process.env.DRAFT_NOIMG==='1';
const noImg=items.filter(n=>n.status==='ACTIVE' && !n.featuredMedia);
console.log(`Bild-Lücken (aktiv, ohne Bild): ${noImg.length}`);
for(const n of noImg)console.log(`   • ${n.id}  ${n.title}`);

// Phase 2: nur echte Lücken füllen
let seoN=0, descN=0, imgN=0, batch=[];
async function flush(){
  if(!batch.length)return;
  const al=batch.map((b,i)=>`u${i}:productUpdate(input:$i${i}){userErrors{message}}`).join('\n');
  const vars=`(${batch.map((b,i)=>`$i${i}:ProductInput!`).join(',')})`;
  const r=await gql(t,`mutation${vars}{${al}}`,Object.fromEntries(batch.map((b,i)=>[`i${i}`,b])));
  const e=Object.values(r?.data||{}).flatMap(x=>x.userErrors||[]); if(e.length)console.log(' ⚠️',JSON.stringify(e).slice(0,200));
  batch=[];
}
for(const n of items){
  const ct=clean(n.title); if(!ct)continue;
  const input={id:n.id}; let touch=false;
  const seo={};
  if(!n.seo?.title||!n.seo.title.trim()){ seo.title=cut(`${ct} kaufen | LuxeStyle CH`,70); seoN++; touch=true; }
  if(!n.seo?.description||!n.seo.description.trim()){ seo.description=cut(`${ct} online kaufen bei LuxeStyle Schweiz – Original-Qualität, schnelle EU-Lieferung, Gratis-Versand ab CHF 65.`,160); if(!('title'in seo))seoN++; touch=true; }
  if(Object.keys(seo).length)input.seo=seo;
  // Beschreibung nur bei ECHTER Leere/Trivialität (Enrichment-Loop macht die Langtexte separat)
  if(textLen(n.descriptionHtml)<40){
    const kat=n.productType?` aus der Kategorie ${esc(n.productType)}`:'';
    input.descriptionHtml=`<p><strong>${esc(ct)}</strong> — Qualitätsprodukt${kat} bei LuxeStyle Schweiz. Sorgfältig ausgewählt, schnell geliefert.</p>${TRUST}`;
    descN++; touch=true;
  }
  if(touch&&LIVE){ batch.push(input); if(batch.length>=10)await flush(); }
}
if(LIVE)await flush();
// Bildlose aktive Produkte auf DRAFT (nur mit DRAFT_NOIMG=1 & LIVE=1)
if(DRAFT_NOIMG&&LIVE&&noImg.length){
  let db=[];
  async function dflush(){ if(!db.length)return; const al=db.map((b,i)=>`u${i}:productUpdate(input:$i${i}){userErrors{message}}`).join('\n'); const vars=`(${db.map((b,i)=>`$i${i}:ProductInput!`).join(',')})`; const r=await gql(t,`mutation${vars}{${al}}`,Object.fromEntries(db.map((b,i)=>[`i${i}`,b]))); const e=Object.values(r?.data||{}).flatMap(x=>x.userErrors||[]); if(e.length)console.log(' ⚠️',JSON.stringify(e).slice(0,160)); db=[]; }
  for(const n of noImg){ db.push({id:n.id,status:'DRAFT'}); imgN++; if(db.length>=10)await dflush(); }
  await dflush();
}
console.log(`Fertig. SEO-Lücken gefüllt: ${seoN} · Beschreibungs-Lücken gefüllt: ${descN} · bildlose aktive→DRAFT: ${imgN} ${LIVE?'':'(DRY — nichts geschrieben)'}`);
