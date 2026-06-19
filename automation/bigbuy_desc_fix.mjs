#!/usr/bin/env node
/* bigbuy_desc_fix — baut für jedes tag:bigbuy-Produkt eine vollständige, einzigartige
 * Beschreibung: Intro + echte BigBuy-Spec-Liste (Material/Art/Farbe/Maße/…) + Trust + Detail-Block.
 * Ersetzt die generischen 4-Bullet-Beschreibungen. Deterministisch/re-runnable. LIVE=1 schreibt.
 * Start mit: /opt/node22/bin/node --max-old-space-size=4096 automation/bigbuy_desc_fix.mjs
 */
import fs from 'fs';
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1'; const MAXP=parseInt(process.env.MAXP||'0',10);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}

console.log('Lade Caches …');
const specs=JSON.parse(fs.readFileSync('/tmp/bb_specs.json','utf8'));      // id -> <ul>specs</ul>
const prod=new Map(), bySku=new Map();
for(const p of JSON.parse(fs.readFileSync('/tmp/bb_products.json','utf8'))){ prod.set(String(p.id),p); if(p.sku) bySku.set(String(p.sku).toUpperCase(),p); }
const mans=new Map(); for(const m of JSON.parse(fs.readFileSync('/tmp/bb_mans.json','utf8'))) mans.set(String(m.id),m.name);
console.log(`  specs ${Object.keys(specs).length} · prod ${prod.size} · mans ${mans.size}`);

function recOf(handle,sku){ const m=handle.match(/-(\d{4,})$/); if(m&&prod.has(m[1])) return {id:m[1],p:prod.get(m[1])};
  if(sku){ const s=String(sku).toUpperCase().replace(/^BB-/,'').replace(/-(XS|S|M|L|XL|XXL|2XL|3XL|4XL|5XL|\d{1,2})$/,''); if(bySku.has(s)){ const p=bySku.get(s); return {id:String(p.id),p}; } } return null; }
function details(p){ const li=[]; const b=mans.get(String(p.manufacturer)); if(b) li.push(`<li><strong>Marke:</strong> ${b}</li>`);
  const w=+p.width,h=+p.height,d=+p.depth; if(w>0&&h>0&&d>0) li.push(`<li><strong>Abmessungen (ca.):</strong> ${w} × ${h} × ${d} cm</li>`);
  if(+p.weight>0) li.push(`<li><strong>Gewicht:</strong> ${(+p.weight).toLocaleString('de-CH')} kg</li>`);
  if(p.ean13&&/^\d{8,14}$/.test(String(p.ean13))) li.push(`<li><strong>EAN:</strong> ${p.ean13}</li>`);
  li.push('<li><strong>Versand:</strong> aus EU-Lager · 3–7 Tage · gratis ab CHF 65</li>','<li><strong>Rückgabe:</strong> 30 Tage</li>');
  return `<div class="ls-feed-details">\n<h4>Produktdetails</h4>\n<ul>\n${li.join('\n')}\n</ul>\n</div>`; }
const titleClean=s=>s.replace(/^[^\p{L}\p{N}]+/u,'').trim();

const t=await tk(); if(!t){console.error('Kein Token');process.exit(1);}
// PHASE 1: bigbuy-IDs via Such-Filter sammeln (mit Stall-Guard gegen instabilen Index).
const Q=`query($c:String){ products(first:50, query:"tag:bigbuy status:active", after:$c){ pageInfo{hasNextPage endCursor} edges{ node{ id title handle variants(first:1){edges{node{sku}}} } } } }`;
let cursor=null, items=[], seen=new Set(), pages=0, stall=0;
do{
  const r=await gql(t,Q,{cursor}); const pg=r?.data?.products;
  if(!pg){ await sleep(3000); const r2=await gql(t,Q,{cursor}); if(!r2?.data?.products){ console.log('  ⚠️ Abbruch Phase 1'); break; } var pg2=r2.data.products; }
  const cur=pg||pg2; const before=items.length;
  for(const e of cur.edges){ if(seen.has(e.node.id)) continue; seen.add(e.node.id); items.push(e.node); }
  if(items.length===before){ if(++stall>=4){ console.log(`  ⚠️ STALL bei ${items.length} (Index instabil) → später erneut laufen`); break; } } else stall=0;
  cursor=cur.pageInfo.hasNextPage?cur.pageInfo.endCursor:null; pages++;
  if(pages%20===0) console.log(`  Phase1 … ${items.length} gesammelt (Seite ${pages})`);
}while(cursor);
console.log(`Phase 1: ${items.length} eindeutige BigBuy-Produkte gesammelt (${pages} Seiten).`);

// PHASE 2: Beschreibungen bauen + updaten
let scanned=0, done=0, withSpec=0, batch=[];
async function flush(){ if(!batch.length)return; const al=batch.map((b,i)=>`u${i}:productUpdate(input:$i${i}){userErrors{message}}`).join('\n'); const vars=`(${batch.map((b,i)=>`$i${i}:ProductInput!`).join(',')})`; const r=await gql(t,`mutation${vars}{${al}}`,Object.fromEntries(batch.map((b,i)=>[`i${i}`,b]))); const e=Object.values(r?.data||{}).flatMap(x=>x.userErrors||[]); if(e.length)console.log(' ⚠️',JSON.stringify(e).slice(0,160)); batch=[]; }
for(const node of items){
  scanned++; const rec=recOf(node.handle, node.variants?.edges?.[0]?.node?.sku); if(!rec) continue;
  const ttl=titleClean(node.title||''); const ul=specs[rec.id]; if(ul) withSpec++;
  const html=`<p><strong>${ttl}</strong> – Premium-Qualität bei LuxeStyle, sorgfältig für die Schweiz ausgewählt.</p>`
    +(ul?`<p><strong>✨ Eigenschaften</strong></p>\n${ul}`:'')
    +`<p>🇨🇭 Schweizer Shop · 🚚 Gratis-Versand ab CHF 65 · ↩️ 30 Tage Rückgabe · Code <strong>WELCOME10</strong> = –10%</p>\n`
    +details(rec.p);
  if(LIVE){ batch.push({id:node.id, descriptionHtml:html}); if(batch.length>=10) await flush(); }
  done++; if(MAXP&&done>=MAXP) break;
  if(scanned%200===0) console.log(`  … ${scanned}/${items.length} · ${done} beschrieben (${withSpec} mit Specs)`);
}
if(LIVE) await flush();
console.log(`Fertig. ${items.length} gesammelt · beschrieben ${done} · davon mit Spec-Liste ${withSpec} ${LIVE?'':'(DRY)'}`);
