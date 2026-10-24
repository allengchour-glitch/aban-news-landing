#!/usr/bin/env node
/* LuxeStyle — fortura_preis_kandidaten.mjs
 * LIEST NUR. Geht durch die aktiven Fortura-Produkte, liest die Marke aus der
 * Beschreibung und schreibt die Widmann-Artikel mit Suchschluessel als CSV.
 * Grundlage fuer den Preisvergleich gegen Schweizer Haendler (Galaxus/Toppreise),
 * der die Frage aus dropship/PREIS-STICHPROBE-FORTURA.md beantworten soll.
 *
 * Schreibt NICHTS im Shop. ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET
 *   [MARKE=Widmann] [SCAN=3000] [AUS=dropship/fortura_preis_kandidaten.csv]
 */
import fs from 'node:fs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { marke, suchschluessel } from './lib/fortura_marke.mjs';

const SHOP=(process.env.SHOPIFY_SHOP||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim();
const CSEC=(shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET)||'').trim();
const API='2025-01';
const ZIEL=(process.env.MARKE||'Widmann').trim();
const SCAN=Math.min(parseInt(process.env.SCAN||'3000',10),5000);
const AUS=process.env.AUS||'dropship/fortura_preis_kandidaten.csv';
if(!SHOP||!CID||!CSEC){ console.log('Kein Shopify-Cred → No-op (Grund: SHOPIFY_SHOP/CLIENT_ID/CLIENT_SECRET fehlt oder ist unlesbar).'); process.exit(0); }

async function token(){
  const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});
  const j=await r.json().catch(()=>({}));
  if(!j.access_token) throw new Error(`kein Token (HTTP ${r.status})`);
  return j.access_token;
}
async function gql(tok,q,v){
  for(let i=0;i<5;i++){
    const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',
      headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})});
    const j=await r.json().catch(()=>({}));
    const gedrosselt=(j.errors||[]).some(e=>/throttl/i.test(e.message||''));
    if(r.status===429||r.status>=500||gedrosselt){ await new Promise(s=>setTimeout(s,1000*2**i)); continue; }
    if(j.errors) throw new Error(JSON.stringify(j.errors));
    return j.data;
  }
  throw new Error('dauerhaft gedrosselt');
}

// Billigste Abfrage, die reicht: keine Medien, keine Metafelder (geteilter Punkte-Eimer).
const Q=`query($c:String){ products(first:50, after:$c, query:"tag:fortura AND status:active"){
  pageInfo{ hasNextPage endCursor }
  nodes{ handle title descriptionHtml
    variants(first:1){ nodes{ price sku barcode inventoryQuantity inventoryPolicy } } } } }`;

const tok=await token();
const marken=new Map(); const treffer=[];
let gelesen=0, c=null, ohneMarke=0, ohneSchluessel=0;
while(gelesen<SCAN){
  const d=await gql(tok,Q,{c});
  const p=d.products;
  for(const n of p.nodes){
    gelesen++;
    const m=marke(n.descriptionHtml);
    const k=m||'(keine Angabe)';
    marken.set(k,(marken.get(k)||0)+1);
    if(!m) ohneMarke++;
    if(m==null||m.toLowerCase()!==ZIEL.toLowerCase()) continue;
    const v=n.variants.nodes[0]; if(!v) continue;
    const s=suchschluessel({barcode:v.barcode,sku:v.sku});
    if(!s){ ohneSchluessel++; continue; }
    treffer.push({handle:n.handle,titel:n.title,preis:v.price,sku:v.sku,
      schluesselArt:s.art,schluessel:s.wert,lager:v.inventoryQuantity,politik:v.inventoryPolicy});
  }
  if(!p.pageInfo.hasNextPage) break;
  c=p.pageInfo.endCursor;
}

const top=[...marken.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12);
console.log(`\ngelesen: ${gelesen} aktive Fortura-Produkte`);
console.log(`ohne Marke-Feld: ${ohneMarke}`);
console.log('\nMarken (die 12 häufigsten):');
for(const [m,z] of top) console.log(`  ${String(z).padStart(5)}  ${m}`);
console.log(`\n${ZIEL}: ${marken.get([...marken.keys()].find(k=>k.toLowerCase()===ZIEL.toLowerCase())||ZIEL)||0} Artikel`);
console.log(`davon mit Suchschlüssel: ${treffer.length}  ·  ohne (kein Barcode, keine numerische Nr.): ${ohneSchluessel}`);
const perBarcode=treffer.filter(t=>t.schluesselArt==='barcode').length;
console.log(`  Schlüssel Barcode: ${perBarcode}  ·  Artikelnummer: ${treffer.length-perBarcode}`);

const kopf='handle,titel,preis,sku,schluesselArt,schluessel,lager,politik';
const zeile=t=>[t.handle,`"${t.titel.replace(/"/g,'""')}"`,t.preis,t.sku,t.schluesselArt,t.schluessel,t.lager,t.politik].join(',');
fs.writeFileSync(AUS,[kopf,...treffer.map(zeile)].join('\n')+'\n');
console.log(`\nCSV: ${AUS} (${treffer.length} Zeilen)`);

// Zehn Testartikel ueber die Preisbaender - fuer den Gratis-Test mit wenigen Credits.
const sort=[...treffer].sort((a,b)=>parseFloat(a.preis)-parseFloat(b.preis));
if(sort.length){
  console.log('\nZehn Testartikel über die Preisbänder:');
  for(let i=0;i<10 && i<sort.length;i++){
    const t=sort[Math.floor(i*(sort.length-1)/9)];
    console.log(`  CHF ${String(t.preis).padStart(7)}  ${t.schluesselArt.padEnd(14)} ${String(t.schluessel).padEnd(14)} ${t.titel.slice(0,44)}`);
  }
}
