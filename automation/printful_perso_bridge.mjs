#!/usr/bin/env node
/* LuxeStyle — printful_perso_bridge.mjs
 * PERSONALISIERTE Trikot-Bestellungen (Name/Nummer) automatisch an Printful geben.
 * Das personalisierte Produkt (15433948070273) ist NICHT nativ Printful-synced (eigener Designer). Diese Brücke:
 *   1. liest offene Shopify-Bestellungen mit diesem Produkt,
 *   2. holt pro Position die Druckdatei(en) aus den Line-Item-Properties ("🖼️ Druckdatei" bzw. "Vorne/Hinten · 🖼️ Druckdatei")
 *      + die Grösse (aus dem Variantentitel, z. B. "XL / Rot"),
 *   3. erstellt via Printful-API eine Order mit genau diesen Druckdateien (custom print files auf dem AOP-Trikot).
 *
 * ⚠️ SICHERHEIT (Default = harmlos): ohne GO=1 wird NUR geplant/geloggt (DRY). Mit GO=1 wird eine Printful-ORDER als
 *    ENTWURF (confirm=0) angelegt → löst NOCH KEINE Zahlung aus; Bestätigen/Bezahlen bleibt bewusst manuell, bis der Flow
 *    verifiziert ist. Später AUTO_CONFIRM=1 für Vollautomatik.
 * ⚠️ ZU VERIFIZIEREN vor Live: Sind die PF_VARIANT-IDs unten die Printful-KATALOG-Variant-IDs des Recyceltes-Unisex-Trikot-AOP?
 *    (Die vom Browser gemeldeten IDs könnten Sync-Variant-IDs sein. Für custom print files braucht die v1-Order die CATALOG
 *    variant_id. Im Printful-Katalog gegenprüfen, sonst schlägt die Order fehl.)
 * Idempotent über Ledger reports/perso-orders-done.json (Shopify-Order-ID). No-op ohne Creds.
 * ENV: PRINTFUL_API_KEY [+ PRINTFUL_STORE_ID] · SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [GO=1] [AUTO_CONFIRM=1]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const PF_KEY=(process.env.PRINTFUL_API_KEY||'').trim();
const PF_STORE=(process.env.PRINTFUL_STORE_ID||'').trim();
const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const GO=process.env.GO==='1'; const AUTO_CONFIRM=process.env.AUTO_CONFIRM==='1'; const API='2025-01';
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
const PERSO_PRODUCT_ID='gid://shopify/Product/15433948070273';
// Printful-Katalog-Variant-IDs je Grösse (⚠️ VOR LIVE gegen Printful-Katalog verifizieren — siehe Kopf):
const PF_VARIANT={ S:55872510919041, M:55872510951809, L:55872510984577, XL:55872511017345, '2XL':55872511050113 };
const LEDGER='reports/perso-orders-done.json';

if(!PF_KEY){ console.log('Kein PRINTFUL_API_KEY → No-op (Brücke wartet auf Key).'); process.exit(0); }
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }

async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN))return ADMIN_TOKEN; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} console.error('❌ Shopify-Auth'); process.exit(0); }

function loadLedger(){ try{ return new Set(JSON.parse(readFileSync(LEDGER,'utf8'))); }catch{ return new Set(); } }
function saveLedger(s){ try{ mkdirSync('reports',{recursive:true}); }catch{} writeFileSync(LEDGER, JSON.stringify([...s],null,0)); }
function sizeFrom(variantTitle){ const m=String(variantTitle||'').match(/\b(2XL|XL|L|M|S)\b/i); return m?m[1].toUpperCase():null; }
function printFiles(attrs){ // liefert {front,back} aus den Line-Item-Properties
  const out={}; for(const a of (attrs||[])){ const k=String(a.key||''); if(!/druckdatei|print file/i.test(k)) continue;
    const url=String(a.value||''); if(!/^https?:\/\//.test(url)) continue;
    if(/hinten|back/i.test(k)) out.back=url; else out.front=url; }
  return out;
}

async function pf(path,method,body){ const h={'Authorization':`Bearer ${PF_KEY}`,'Content-Type':'application/json'}; if(PF_STORE) h['X-PF-Store-Id']=PF_STORE;
  const r=await fetch(`https://api.printful.com${path}`,{method,headers:h,body:body?JSON.stringify(body):undefined}); const j=await r.json().catch(()=>({})); return {status:r.status,j}; }

const tok=await token();
const Q=`query($after:String){ orders(first:25, after:$after, query:"fulfillment_status:unfulfilled AND financial_status:paid"){ pageInfo{hasNextPage endCursor} edges{ node{ id name shippingAddress{ name address1 address2 city provinceCode countryCodeV2 zip phone } email lineItems(first:20){ edges{ node{ quantity variantTitle customAttributes{ key value } product{ id } } } } } } } }`;

const done=loadLedger(); let after=null, planned=0, created=0, skipped=0, fails=[];
outer:
while(true){
  const r=await gql(tok,Q,{after}); const conn=r?.data?.orders; if(!conn) break;
  for(const {node:o} of conn.edges){
    if(done.has(o.id)){ skipped++; continue; }
    const items=[];
    for(const {node:li} of (o.lineItems?.edges||[])){
      if(li.product?.id!==PERSO_PRODUCT_ID) continue;
      const size=sizeFrom(li.variantTitle); const files=printFiles(li.customAttributes);
      if(!size || !PF_VARIANT[size]){ fails.push(`${o.name}: Grösse unklar (${li.variantTitle})`); continue; }
      if(!files.front && !files.back){ fails.push(`${o.name}: keine Druckdatei in Properties → Kunde ohne Design? (nicht auto)`); continue; }
      const f=[]; if(files.front) f.push({type:'front',url:files.front}); if(files.back) f.push({type:'back',url:files.back});
      items.push({ variant_id:PF_VARIANT[size], quantity:li.quantity||1, files:f });
    }
    if(!items.length) continue;
    const a=o.shippingAddress||{};
    const payload={ recipient:{ name:a.name, address1:a.address1, address2:a.address2||'', city:a.city, state_code:a.provinceCode||'', country_code:a.countryCodeV2, zip:a.zip, phone:a.phone||'', email:o.email||'' }, items };
    planned++;
    if(!GO){ console.log(`DRY ${o.name}: würde Printful-Order anlegen →`, JSON.stringify(payload)); continue; }
    const {status,j}=await pf(`/orders?confirm=${AUTO_CONFIRM?1:0}`,'POST',payload);
    if(status>=200 && status<300 && j?.result?.id){ created++; done.add(o.id); saveLedger(done);
      console.log(`✓ ${o.name}: Printful-Order ${j.result.id} (${AUTO_CONFIRM?'bestätigt':'ENTWURF'})`); }
    else { fails.push(`${o.name}: Printful ${status} ${JSON.stringify(j?.error||j).slice(0,140)}`); }
    await new Promise(x=>setTimeout(x,400));
  }
  if(!conn.pageInfo?.hasNextPage) break; after=conn.pageInfo.endCursor;
}
if(fails.length) fails.slice(0,20).forEach(f=>console.error('✗',f));
console.log(`\nFertig: ${planned} geplant, ${created} ${GO?'angelegt':'(DRY)'}, ${skipped} schon erledigt${fails.length?`, ${fails.length} Hinweise/Fehler`:''}.`);
