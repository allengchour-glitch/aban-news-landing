#!/usr/bin/env node
/* LuxeStyle — prodigi_check.mjs
 * Verbindungs-/Key-Test für den POD-Druckanbieter PRODIGI (echte REST-API, EU/Global-Labs).
 * Prüft NUR (legt nichts an): ist der Key gültig + listet echte Katalog-SKUs (Preis, Asset-Anforderung,
 * Druckbereiche) → daraus wird die SKU-Map in create_prodigi_products.mjs final bestätigt.
 * No-op-safe: ohne PRODIGI_API_KEY wird übersprungen.
 * ENV: PRODIGI_API_KEY · [PRODIGI_SANDBOX=1 → api.sandbox.prodigi.com] · [PRODIGI_SKUS=komma-getrennt]
 */
const KEY=(process.env.PRODIGI_API_KEY||'').trim();
const BASE=process.env.PRODIGI_SANDBOX==='1' ? 'https://api.sandbox.prodigi.com/v4.0' : 'https://api.prodigi.com/v4.0';
// Referenz-SKUs (Global-Katalog): Fine-Art-Poster A4/A3/A2 + Tasse. Per ENV überschreibbar.
const SKUS=(process.env.PRODIGI_SKUS||'GLOBAL-FAP-A4,GLOBAL-FAP-A3,GLOBAL-FAP-A2,GLOBAL-MUG-11OZ').split(',').map(s=>s.trim()).filter(Boolean);

async function pf(path){ const r=await fetch(BASE+path,{headers:{'X-API-Key':KEY,'Content-Type':'application/json'}}); const t=await r.text(); let j; try{j=JSON.parse(t);}catch{j=t;} return {ok:r.ok,status:r.status,j}; }

console.log('=== PRODIGI-Anbieter-Check ===');
if(!KEY){ console.log('Kein PRODIGI_API_KEY → No-op (Connector noch nicht scharf). Setze den Key als GitHub-Secret, dann läuft alles.'); process.exit(0); }
console.log(`Key gesetzt (Länge ${KEY.length}). Endpoint: ${BASE}`);

let okCount=0;
for(const sku of SKUS){
  const r=await pf('/products/'+encodeURIComponent(sku));
  if(!r.ok){ console.error(`  ❌ ${sku}: HTTP ${r.status} ${JSON.stringify(r.j).slice(0,160)}`); continue; }
  const p=r.j&&r.j.product;
  if(!p){ console.error(`  ⚠️ ${sku}: keine Produktdaten (${JSON.stringify(r.j).slice(0,120)})`); continue; }
  okCount++;
  const areas=p.printAreas?Object.keys(p.printAreas).join('/'):'?';
  const dims=p.productDimensions?`${p.productDimensions.width}×${p.productDimensions.height} ${p.productDimensions.units||''}`:'';
  const attrs=p.attributes?Object.keys(p.attributes).join(','):'—';
  console.log(`  ✅ ${sku} | ${p.description||''} | Druckbereiche: ${areas} | Dim: ${dims} | Attribute: ${attrs}`);
}
if(!okCount){ console.error('  🔴 Kein einziges SKU gültig → Key prüfen (oder PRODIGI_SANDBOX=1 für Sandbox-Key).'); }
else console.log(`\n${okCount}/${SKUS.length} Referenz-SKU(s) gültig. Key funktioniert → create_prodigi_products kann diese SKUs nutzen.`);
console.log('=== Ende ===');
