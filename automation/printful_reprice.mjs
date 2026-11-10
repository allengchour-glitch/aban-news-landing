#!/usr/bin/env node
/* LuxeStyle — printful_reprice.mjs
 * Setzt die POD-Preise auf gesunde Marge: holt je Variante die ECHTEN Printful-Katalog-Kosten
 * (SKU "<sync>_<printfulVariantId>" → GET /products/variant/{id} → price USD), rechnet
 *   Retail = max(Kosten×MARKUP, Kosten+MIN_MARGE), aufgerundet auf X.90 (CHF)
 * und aktualisiert die Shopify-Variantenpreise. DRY_RUN=1 → nur Vorschau-Tabelle, keine Änderung.
 *
 * ENV: PRINTFUL_API_KEY (Pflicht) · [PRINTFUL_STORE_ID] · SHOPIFY_SHOP · SHOPIFY_CLIENT_ID/SECRET (oder _ADMIN_TOKEN)
 *      [PF_USD_CHF=0.90] · [MARKUP=2.3] · [MIN_MARGE=12] · [TAG=printful_personalized_product] · [MAX=300] · [DRY_RUN=1] · [AUCH_AUSWAHL=1]
 *
 * REPARIERT 09.11.2026 (Phase 1 «Bestellweg härten», Test: automation/printful_reprice_test.mjs):
 *   - Varianten werden VOLLSTÄNDIG gelesen: die Abfrage holte nur variants(first:100) und blätterte nie weiter (ein Produkt mit mehr als 100 Varianten verlor still den Rest; Farben mal Pakete können 250 erreichen).
 *   - Schreibfehler sind keine Randbemerkung mehr: userErrors, GraphQL-Fehler, HTTP-Fehler und eine fehlende Antwort zählen als Fehler (Exit 1, Zeile in der Zusammenfassung, das Produkt wird NICHT als angepasst gezählt);
 *     gedrosselte und 5xx-Antworten werden zweimal mit Pause wiederholt. Früher: Meldung auf stderr, Exit 0, Schlusszeile «angepasst».
 *   - Ein Fehler beim Lesen der Produktliste, bei der Anmeldung oder eine Ausnahme beendet mit Exit 1 (früher Exit 0). «Kein PRINTFUL_API_KEY / keine Shopify-Zugangsdaten» bleibt ein Exit 0 ohne Wirkung.
 *   Weiter unverändert: DRY_RUN=1 ist die Vorschau (nur dieser Wert), ohne DRY_RUN=1 wird geschrieben; der Workflow printful-reprice.yml setzt DRY_RUN=1, solange «Preise wirklich setzen» nicht angehakt ist.
 *
 * ACHTUNG «Selbst gestalten» (27.10.2026): die Produkte aus lib/pod_auswahl_spec.mjs (Poster, Hoodie, T-Shirt, iPhone-Hülle, Samsung-Hülle) werden hier
 * ÜBERSPRUNGEN. Ihre Preise (auch die der neuen Material-Varianten) kommen aus lib/pod_preise.mjs und berücksichtigen Printful-Versand und Zahlungsgebühr
 * (Netto ≥ 12 CHF); diese Formel kennt beides nicht, würde 43 der 165 neuen Preise senken (davon 40 unter Netto 12; gerechnet am 27.10.2026 mit dem Plan
 * von automation/pod_auswahl.mjs) und rundet auf ceil(x) − 0.10, in 3 Fällen also UNTER den Richtwert. AUCH_AUSWAHL=1 hebt die Sperre auf (nur mit Absicht).
 */
import { SPEC as AUSWAHL_SPEC } from './lib/pod_auswahl_spec.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
const SHOPraw=process.env.SHOPIFY_SHOP||'';
const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim();
const CSEC=(shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET)||'').trim();
const PF_KEY=(process.env.PRINTFUL_API_KEY||'').trim();
const PF_STORE=(process.env.PRINTFUL_STORE_ID||'').trim();
const RATE=parseFloat(process.env.PF_USD_CHF||'0.90')||0.90;
const MARKUP=parseFloat(process.env.MARKUP||'2.3')||2.3;
const MIN_MARGE=parseFloat(process.env.MIN_MARGE||'12')||12;
const TAG=process.env.TAG||'printful_personalized_product';
const MAXP=Math.max(1,parseInt(process.env.MAX||'300',10)||300);
const DRY=process.env.DRY_RUN==='1';
const AUSWAHL=new Set(AUSWAHL_SPEC.map(s=>s.handle));
const MIT_AUSWAHL=process.env.AUCH_AUSWAHL==='1';
const API='2025-01';
const PAUSE=Math.max(0,parseInt(process.env.REPRICE_PAUSE_MS||'2000',10)||0);   // Pause vor einer Wiederholung (Test: 0)
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const FEHLER=[];   // alles, was nicht gelang: {wo, text}; jeder Eintrag macht den Lauf zu Exit 1
const fehlerAdd=(wo,text)=>{ FEHLER.push({wo,text:String(text).slice(0,240)}); console.error('✗',wo+':',String(text).slice(0,240)); };
let SHOP=SHOPraw.replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim();
if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!PF_KEY){ console.log('Kein PRINTFUL_API_KEY → No-op.'); process.exit(0); }
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }

// Eine Anfrage an Shopify. Wirft bei HTTP-Fehler, nicht lesbarer Antwort und GraphQL-`errors` (ein Fehler ist nie ein leeres Ergebnis); 429, 5xx und «Throttled» werden zweimal nach einer Pause wiederholt.
async function gql(tok,query,variables){
  let letzte=null;
  for(let i=0;i<3;i++){
    try{
      const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(30000)});
      if(r.status===429||r.status>=500){ letzte=new Error('Shopify HTTP '+r.status); if(i<2) await pause(PAUSE*(i+1)); continue; }
      const j=await r.json().catch(()=>null);
      if(!j||typeof j!=='object'){ letzte=new Error('Shopify: keine lesbare Antwort (HTTP '+r.status+')'); if(i<2) await pause(PAUSE*(i+1)); continue; }
      if(j.errors){ const text=JSON.stringify(j.errors).slice(0,240); letzte=new Error('Shopify: '+text); if(/throttled/i.test(text)&&i<2){ await pause(PAUSE*(i+1)); continue; } throw letzte; }
      return j;
    }catch(e){ letzte=e; if(e&&/^Shopify: [\[{]/.test(String(e.message))) throw e; if(i<2) await pause(PAUSE*(i+1)); }
  }
  throw letzte;
}
async function works(tok){ try{ const r=await gql(tok,'{ shop { name } }'); return r?.data?.shop?.name||null; }catch{ return null; } }
async function clientCred(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN)) return ADMIN_TOKEN; if(CID&&CSEC){ const t=await clientCred(); if(t&&await works(t)) return t; } console.error('❌ Shopify-Auth fehlgeschlagen'); process.exit(1); }

const costCache=new Map();
async function pfCost(vid){ if(costCache.has(vid)) return costCache.get(vid);
  const headers={'Authorization':'Bearer '+PF_KEY}; if(PF_STORE) headers['X-PF-Store-Id']=PF_STORE;
  let cost=null;
  try{ const r=await fetch('https://api.printful.com/products/variant/'+vid,{headers}); const j=await r.json().catch(()=>({}));
    const p=j?.result?.variant?.price; if(p!=null) cost=parseFloat(p); }catch{}
  costCache.set(vid,cost); return cost; }

function variantId(sku){ const m=String(sku||'').match(/_(\d+)\s*$/); return m?m[1]:null; }
function priced(costChf){ const target=Math.max(costChf*MARKUP, costChf+MIN_MARGE); return (Math.ceil(target)-0.10); }

const Q=`query($q:String!,$cursor:String){ products(first:50, query:$q, after:$cursor){ pageInfo{hasNextPage endCursor} edges{ node{ id handle title variants(first:100){ pageInfo{ hasNextPage endCursor } edges{ node{ id sku price } } } } } } }`;
// Weitere Varianten eines Produkts mit mehr als 100 Varianten (die Produktabfrage liefert nur die ersten 100)
const QV=`query($id:ID!,$cursor:String){ node(id:$id){ ... on Product { variants(first:100, after:$cursor){ pageInfo{ hasNextPage endCursor } edges{ node{ id sku price } } } } } }`;
const MV=`mutation($pid:ID!,$variants:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$pid,variants:$variants){ userErrors{ field message } } }`;
const CHUNK=100;   // Varianten je Schreibaufruf
/** Alle Varianten des Produkts (Knoten); null, wenn das Weiterblättern scheitert (dann wird das Produkt nicht angefasst). */
async function alleVarianten(tok,p){
  const liste=(p.variants?.edges||[]).map(e=>e.node);
  let pi=p.variants?.pageInfo, seiten=0;
  while(pi?.hasNextPage){
    if(++seiten>50){ fehlerAdd(p.title,'mehr als 50 Seiten Varianten: abgebrochen'); return null; }
    try{
      const d=await gql(tok,QV,{id:p.id,cursor:pi.endCursor});
      const v=d?.data?.node?.variants;
      if(!v||!Array.isArray(v.edges)){ fehlerAdd(p.title,'weitere Varianten nicht lesbar (keine Antwort für das Produkt)'); return null; }
      liste.push(...v.edges.map(e=>e.node)); pi=v.pageInfo;
    }catch(e){ fehlerAdd(p.title,'weitere Varianten nicht lesbar: '+(e&&e.message||e)); return null; }
  }
  return liste;
}

(async()=>{
  const tok=await token();
  let cursor=null, products=[];
  do{ let d; try{ d=await gql(tok,Q,{q:`tag:${TAG}`,cursor}); }catch(e){ fehlerAdd('Produktliste',e&&e.message||e); break; }
      const c=d?.data?.products; if(!c){ fehlerAdd('Produktliste','Query-Fehler '+JSON.stringify(d).slice(0,200)); break; }
      products.push(...c.edges.map(e=>e.node)); cursor=c.pageInfo.hasNextPage?c.pageInfo.endCursor:null;
  } while(cursor && products.length<MAXP);
  console.log(`Produkte: ${products.length} (Tag ${TAG}) · MARKUP ${MARKUP} · MIN_MARGE ${MIN_MARGE} · USD→CHF ${RATE} · ${DRY?'DRY-VORSCHAU':'ANWENDEN'}\n`);

  let changes=0, unknown=0, fehlgeschlagen=0;
  for(const p of products){
    if(!MIT_AUSWAHL && AUSWAHL.has(p.handle)){ console.log(`  ⏭ ${p.title} übersprungen: «Selbst gestalten»-Preise kommen aus lib/pod_preise.mjs (Versand + Gebühr, Netto ≥ 12 CHF). AUCH_AUSWAHL=1 hebt das auf.`); continue; }
    const varianten=await alleVarianten(tok,p);
    if(!varianten){ fehlgeschlagen++; continue; }   // Varianten unvollständig gelesen: das Produkt bleibt unberührt
    const updates=[];
    for(const v of varianten){
      const vid=variantId(v.sku); if(!vid){ unknown++; continue; }
      const costUsd=await pfCost(vid);
      if(costUsd==null){ unknown++; console.log(`  ? ${p.title} | ${v.sku} → Printful-Kosten unbekannt`); continue; }
      const costChf=costUsd*RATE;
      const np=priced(costChf).toFixed(2);
      const cur=parseFloat(v.price).toFixed(2);
      if(np!==cur){ updates.push({id:v.id,price:np});
        console.log(`  ${p.title.slice(0,34).padEnd(34)} | ${v.sku.padEnd(14)} Kost ~${costChf.toFixed(2)} | ${cur} → ${np}`);
      }
    }
    if(updates.length && !DRY){
      let ok=true;
      for(let i=0;i<updates.length;i+=CHUNK){
        try{
          const m=await gql(tok,MV,{pid:p.id,variants:updates.slice(i,i+CHUNK)});
          const r=m?.data?.productVariantsBulkUpdate;
          if(!r){ fehlerAdd(p.title,'Schreibaufruf ohne Antwort (productVariantsBulkUpdate fehlt)'); ok=false; break; }
          if((r.userErrors||[]).length){ fehlerAdd(p.title,'userErrors '+JSON.stringify(r.userErrors).slice(0,200)); ok=false; break; }
        }catch(e){ fehlerAdd(p.title,'Schreibaufruf gescheitert: '+(e&&e.message||e)); ok=false; break; }
      }
      if(!ok){ fehlgeschlagen++; continue; }   // nicht als angepasst gezählt (ein Teil kann geschrieben sein: der nächste Lauf rechnet neu und holt den Rest nach)
    }
    changes+=updates.length;
  }
  console.log(`\nFertig: ${changes} Variantenpreise ${DRY?'WÜRDEN angepasst (Vorschau)':'angepasst'} · ${unknown} ohne Printful-Kosten · ${fehlgeschlagen} Produkte mit Fehler · ${FEHLER.length} Fehler.`);
  if(FEHLER.length){ process.exitCode=1; }
})().catch(e=>{ console.error('Fehler:',e); process.exit(1); });
