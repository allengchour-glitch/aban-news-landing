#!/usr/bin/env node
/* LuxeStyle — printful_reprice.mjs
 * Setzt die POD-Preise auf gesunde Marge: holt je Variante die ECHTEN Printful-Katalog-Kosten
 * (SKU "<sync>_<printfulVariantId>" → GET /products/variant/{id} → price USD), rechnet
 *   Retail = max(Kosten×MARKUP, Kosten+MIN_MARGE), aufgerundet auf X.90 (CHF)
 * und aktualisiert die Shopify-Variantenpreise. DRY_RUN=1 → nur Vorschau-Tabelle, keine Änderung.
 *
 * ENV: PRINTFUL_API_KEY (Pflicht) · [PRINTFUL_STORE_ID] · SHOPIFY_SHOP · SHOPIFY_CLIENT_ID/SECRET (oder _ADMIN_TOKEN)
 *      [PF_USD_CHF=0.90] · [MARKUP=2.3] · [MIN_MARGE=12] · [TAG=printful_personalized_product] · [MAX=300] · [DRY_RUN=1]
 *      [HANDLE=a,b] → nur diese Produkte (13.10.2026: NIE ohne HANDLE scharf laufen lassen — gemessen 13.10.: der Volllauf
 *      würde 890 Variantenpreise ändern, darunter jeden Sticker 4.90 → 14.90 wegen MIN_MARGE; die Formel taugt für Textil).
 *
 * --pruefen (13.10.2026, Kauf-Strecke Klasse 8): GLEICHER ROHLING, ANDERER PREIS. shirt-zum-selbstgestalten (9000001_4011…)
 *   kostete CHF 32.90, unisex-t-shirt-selbst-gestalten (5599797_4011…) 24.90 — derselbe Printful-Rohling, und das billigere
 *   stand auf Platz 1 der «Ähnlichen Produkte». Der Modus liest ALLE aktiven Editor-Produkte (Tag + data-img-front/back im
 *   Text, wie pod_editor_qa.mjs), gruppiert die Varianten nach Rohling-Endung (SKU-Teil nach dem «_» = Printful-Variante)
 *   und meldet jede Endung, die in mehreren Produkten mit mehr als 10 % Preisabstand vorkommt. Schreibt nichts; braucht keinen
 *   Printful-Schlüssel. Ausgabe endet mit «POD-PREIS: n Rohlinge mit > 10 % Abstand».
 * Preisänderungen schreiben den alten Preis nach dropship/_printful_reprice.tsv (Rückweg).
 */
const SHOPraw=process.env.SHOPIFY_SHOP||'';
import fs from 'fs';
let ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
if(!ADMIN_TOKEN){ try{ ADMIN_TOKEN=fs.readFileSync('/tmp/cj_shop_token.txt','utf8').trim(); }catch{} }   // Aufseher-Token (13.10.)
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim();
const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const PF_KEY=(process.env.PRINTFUL_API_KEY||'').trim();
const PF_STORE=(process.env.PRINTFUL_STORE_ID||'').trim();
const RATE=parseFloat(process.env.PF_USD_CHF||'0.90')||0.90;
const MARKUP=parseFloat(process.env.MARKUP||'2.3')||2.3;
const MIN_MARGE=parseFloat(process.env.MIN_MARGE||'12')||12;
const TAG=process.env.TAG||'printful_personalized_product';
const MAXP=Math.max(1,parseInt(process.env.MAX||'300',10)||300);
const DRY=process.env.DRY_RUN==='1';
const API='2026-01';
const PRUEFEN=process.argv.includes('--pruefen');
const HANDLES=(process.env.HANDLE||'').split(',').map(x=>x.trim()).filter(Boolean);
const ABSTAND=parseFloat(process.env.ABSTAND||'0.10')||0.10;
const LEDGER=new URL('../dropship/_printful_reprice.tsv', import.meta.url);
let SHOP=SHOPraw.replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim();
if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!PF_KEY && !PRUEFEN){ console.log('Kein PRINTFUL_API_KEY → No-op.'); process.exit(0); }
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }

async function gql(tok,query,variables){   // 13.10.2026: Drossel/Netz-Wiederholung (der Prüflauf meldete sonst «unklar»)
  let j={};
  for(let v=0; v<8; v++){
    try{ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query,variables})});
      j=await r.json().catch(()=>({}));
      if(r.status!==429 && !JSON.stringify(j.errors||'').includes('THROTTLED')) return j; }catch{}
    await new Promise(z=>setTimeout(z,2000*(v+1))); }
  return j; }
async function works(tok){ try{ const r=await gql(tok,'{ shop { name } }'); return r?.data?.shop?.name||null; }catch{ return null; } }
async function clientCred(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN)) return ADMIN_TOKEN; if(CID&&CSEC){ const t=await clientCred(); if(t&&await works(t)) return t; } console.error('❌ Shopify-Auth fehlgeschlagen'); process.exit(0); }

const costCache=new Map();
async function pfCost(vid){ if(costCache.has(vid)) return costCache.get(vid);
  const headers={'Authorization':'Bearer '+PF_KEY}; if(PF_STORE) headers['X-PF-Store-Id']=PF_STORE;
  let cost=null;
  for(let versuch=0; versuch<4 && cost==null; versuch++){   // 13.10.2026: 429 ergab still «Kosten unbekannt» (Schwarz S/M)
    try{ const r=await fetch('https://api.printful.com/products/variant/'+vid,{headers}); const j=await r.json().catch(()=>({}));
      const p=j?.result?.variant?.price; if(p!=null) cost=parseFloat(p);
      else if(r.status===429 || r.status>=500) await new Promise(z=>setTimeout(z,3000*(versuch+1)));
      else break; }catch{ await new Promise(z=>setTimeout(z,2000)); } }
  costCache.set(vid,cost); return cost; }

function variantId(sku){ const m=String(sku||'').match(/_(\d+)\s*$/); return m?m[1]:null; }
function priced(costChf){ const target=Math.max(costChf*MARKUP, costChf+MIN_MARGE); return (Math.ceil(target)-0.10); }

const Q=`query($q:String!,$cursor:String){ products(first:50, query:$q, after:$cursor){ pageInfo{hasNextPage endCursor} edges{ node{ id handle title variants(first:100){ edges{ node{ id sku price } } } } } } }`;

async function pruefen(tok){
  const QP=`query($c:String){ products(first:50,after:$c,query:"tag:${TAG} status:active"){ pageInfo{hasNextPage endCursor}
    nodes{ id handle title descriptionHtml variants(first:100){ nodes{ sku price } } } } }`;
  let c=null, editor=0; const roh=new Map();
  do{ const d=await gql(tok,QP,{c}); const p=d?.data?.products; if(!p){ console.log('POD-PREIS: unklar (Query-Fehler)'); return; }
    for(const n of p.nodes){
      if(!/data-img-(front|back)/.test(n.descriptionHtml||'')) continue;      // Fertigdesign ohne Editor-Canvas
      editor++;
      for(const v of n.variants.nodes){ const e=variantId(v.sku); if(!e) continue;
        if(!roh.has(e)) roh.set(e,new Map());
        const m=roh.get(e), pr=parseFloat(v.price);
        if(!m.has(n.handle) || pr<m.get(n.handle)) m.set(n.handle,pr); }
    }
    c=p.pageInfo.hasNextPage?p.pageInfo.endCursor:null;
  } while(c);
  const befunde=[];
  for(const [e,m] of roh){ if(m.size<2) continue;
    const l=[...m.entries()].sort((a,b)=>a[1]-b[1]); const lo=l[0], hi=l[l.length-1];
    if(hi[1]>lo[1]*(1+ABSTAND)) befunde.push({e, lo, hi, n:m.size}); }
  befunde.sort((a,b)=>(b.hi[1]/b.lo[1])-(a.hi[1]/a.lo[1]));
  for(const b of befunde) console.log(`  Rohling _${b.e.padEnd(6)} in ${b.n} Editor-Produkten: ${b.lo[0]} ${b.lo[1].toFixed(2)} ↔ ${b.hi[0]} ${b.hi[1].toFixed(2)} (+${Math.round((b.hi[1]/b.lo[1]-1)*100)} %)`);
  console.log(`POD-PREIS: ${befunde.length} Rohlinge mit > ${Math.round(ABSTAND*100)} % Abstand · ${editor} Editor-Produkte geprüft`);
}

(async()=>{
  const tok=await token();
  if(PRUEFEN){ await pruefen(tok); return; }
  let cursor=null, products=[];
  const qBasis=`tag:${TAG}`+(HANDLES.length?` AND (${HANDLES.map(h=>'handle:'+h).join(' OR ')})`:'');
  do{ const d=await gql(tok,Q,{q:qBasis,cursor}); const c=d?.data?.products; if(!c){ console.error('Query-Fehler',JSON.stringify(d).slice(0,200)); break; }
      products.push(...c.edges.map(e=>e.node)); cursor=c.pageInfo.hasNextPage?c.pageInfo.endCursor:null;
  } while(cursor && products.length<MAXP);
  console.log(`Produkte: ${products.length} (Tag ${TAG}) · MARKUP ${MARKUP} · MIN_MARGE ${MIN_MARGE} · USD→CHF ${RATE} · ${DRY?'DRY-VORSCHAU':'ANWENDEN'}\n`);

  let changes=0, unknown=0;
  for(const p of products){
    const updates=[];
    for(const {node:v} of p.variants.edges){
      const vid=variantId(v.sku); if(!vid){ unknown++; continue; }
      const costUsd=await pfCost(vid);
      if(costUsd==null){ unknown++; console.log(`  ? ${p.title} | ${v.sku} → Printful-Kosten unbekannt`); continue; }
      const costChf=costUsd*RATE;
      const np=priced(costChf).toFixed(2);
      const cur=parseFloat(v.price).toFixed(2);
      if(HANDLES.length && !HANDLES.includes(p.handle)) continue;        // Suche «handle:x» kann Präfix-Treffer liefern
      if(np!==cur){ updates.push({id:v.id,price:np,_alt:cur,_sku:v.sku,_kost:costChf.toFixed(2)});
        console.log(`  ${p.title.slice(0,34).padEnd(34)} | ${v.sku.padEnd(14)} Kost ~${costChf.toFixed(2)} | ${cur} → ${np}`);
      }
    }
    if(updates.length && !DRY){
      const ts=new Date().toISOString().slice(0,16)+'Z';
      fs.appendFileSync(LEDGER, updates.map(u=>[ts,p.id,p.handle,u.id,u._sku,u._alt,u.price,u._kost,'vorher→nachher'].join('\t')).join('\n')+'\n');
      const m=await gql(tok,`mutation($pid:ID!,$variants:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$pid,variants:$variants){ productVariants{ id price } userErrors{ field message } } }`,{pid:p.id,variants:updates.map(u=>({id:u.id,price:u.price}))});
      const errs=m?.data?.productVariantsBulkUpdate?.userErrors||[]; if(errs.length) console.error('   ⚠️',JSON.stringify(errs).slice(0,160));
      const live=new Map((m?.data?.productVariantsBulkUpdate?.productVariants||[]).map(v=>[v.id,parseFloat(v.price).toFixed(2)]));
      const falsch=updates.filter(u=>live.get(u.id)!==u.price);
      console.log(`   Rücklesen ${p.handle}: ${updates.length-falsch.length}/${updates.length} ok`);
    }
    changes+=updates.length;
  }
  console.log(`\nFertig: ${changes} Variantenpreise ${DRY?'WÜRDEN angepasst (Vorschau)':'angepasst'} · ${unknown} ohne Printful-Kosten.`);
})().catch(e=>{ console.error('Fehler:',e); process.exit(0); });
