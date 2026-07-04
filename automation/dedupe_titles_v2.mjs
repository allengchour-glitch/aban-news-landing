#!/usr/bin/env node
/* dedupe_titles_v2 — CONTINUE duplicate-title differentiation.
 * Paginates ALL active products, groups by EXACT title. For groups of 2+, keeps one
 * canonical member and appends a distinguisher suffix to the rest:
 *   preferred: variant color  → " – {Farbe}"
 *   else short SKU            → " – Ref. {sku}"
 *   else barcode              → " – Ref. {barcode}"
 * Collision-safe: every new title checked against the FULL catalog title set AND other
 * new titles. Only differentiates when a real distinguisher yields a unique title; else
 * the member is reported as manual-review.
 * Idempotent: skips products already in ledger. Cap 500 edits. DRY default · LIVE=1.
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const CAP=parseInt(process.env.CAP||'500',10);
const LEDGER='/tmp/dup_title2_done.txt';
import fs from 'node:fs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<6;a++){let r;try{r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});}catch(e){await sleep((a+1)*2000);continue;}if(r.status===429||r.status>=500){await sleep((a+1)*2500);continue;}const j=await r.json();if(j.errors&&JSON.stringify(j.errors).includes('THROTTLED')){await sleep((a+1)*2500);continue;}return j;}return null;}

const COLOR_KEYS=/^(farbe|color|colour|couleur|colore|kleur)$/i;
const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.trim()).filter(Boolean):[]);

function colorOf(p){
  for(const vn of (p.variants?.nodes||[])){
    for(const o of (vn.selectedOptions||[])){
      if(COLOR_KEYS.test((o.name||'').trim()) && o.value && !/^(default title|standard|einheitsgr|one size|uni)/i.test(o.value.trim())) return o.value.trim();
    }
  }
  return null;
}
function shortSku(p){
  for(const vn of (p.variants?.nodes||[])){
    const s=(vn.sku||'').trim();
    if(s && s.length<=24 && !/^(default|n\/?a|null|-)$/i.test(s)) return s;
  }
  return null;
}
function barcodeOf(p){
  for(const vn of (p.variants?.nodes||[])){
    const b=(vn.barcode||'').trim();
    if(b && b.length<=24 && !/^(0+|n\/?a|null)$/i.test(b)) return b;
  }
  return null;
}
const clip=t=>t.length>255?t.slice(0,255):t;

const t=await tk();if(!t){console.error('Kein Token');process.exit(1);}

// 1) Paginate ALL active products
let c=null,all=[],pages=0;
do{
  let pg=null;
  for(let attempt=0;attempt<8 && !pg;attempt++){
    const r=await gql(t,`query($c:String){products(first:100,after:$c,query:"status:active",sortKey:CREATED_AT){pageInfo{hasNextPage endCursor}nodes{id title variants(first:8){nodes{sku barcode selectedOptions{name value}}}}}}`,{c});
    pg=r?.data?.products;
    if(!pg){process.stderr.write(`\n  Seite-Retry ${attempt+1} (cursor ${c?c.slice(-8):'start'})\n`);await sleep((attempt+1)*3000);}
  }
  if(!pg){console.error('\nFetch endgültig abgebrochen bei cursor',c);break;}
  all.push(...pg.nodes);pages++;
  c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null;
  process.stderr.write(`\rgeladen: ${all.length}`);
  await sleep(150);
}while(c);
process.stderr.write(`\n`);
console.log(`Aktive Produkte gescannt: ${all.length}`);

// 2) Full catalog title set (normalize by exact string) + groups
const titleSet=new Set(all.map(p=>p.title));
const groups={};
for(const p of all)(groups[p.title]=groups[p.title]||[]).push(p);
const dupGroups=Object.entries(groups).filter(([,a])=>a.length>1);
console.log(`Duplikat-Gruppen (Titel ≥2): ${dupGroups.length} (betroffene Produkte: ${dupGroups.reduce((s,[,a])=>s+a.length,0)})`);

// used = every title currently live + every new title we assign this run
const used=new Set(titleSet);
let edits=0, manual=[], differentiated=0, skippedDone=0;
const ledgerOut=[];

for(const [title,arr] of dupGroups){
  arr.sort((a,b)=>a.id.localeCompare(b.id)); // deterministic canonical = first
  // canonical keeps title; remaining differentiated
  for(let i=1;i<arr.length;i++){
    const p=arr[i];
    if(done.has(p.id)){skippedDone++;continue;}
    if(edits>=CAP){manual.push({id:p.id,title,reason:'cap-reached'});continue;}
    // candidate distinguishers in order
    const cands=[];
    const col=colorOf(p); if(col) cands.push(` – ${col}`);
    const sku=shortSku(p); if(sku) cands.push(` – Ref. ${sku}`);
    const bc=barcodeOf(p); if(bc) cands.push(` – Ref. ${bc}`);
    let applied=null;
    for(const suf of cands){
      const nt=clip(title+suf);
      if(nt!==title && !used.has(nt)){applied=nt;break;}
    }
    if(!applied){manual.push({id:p.id,title,reason:cands.length?'collision-no-unique':'no-distinguisher'});continue;}
    // apply
    if(LIVE){
      const u=await gql(t,`mutation($id:ID!,$ti:String!){productUpdate(input:{id:$id,title:$ti}){userErrors{message}}}`,{id:p.id,ti:applied});
      const e=u?.data?.productUpdate?.userErrors||[];
      if(e.length){console.log('  ⚠️',p.id,JSON.stringify(e).slice(0,100));manual.push({id:p.id,title,reason:'update-error'});continue;}
      ledgerOut.push(p.id);
      await sleep(200);
    }
    used.add(applied);
    differentiated++; edits++;
    console.log(`  ${LIVE?'✅':'(DRY)'} „${title.slice(0,40)}" → „${applied.slice(0,60)}"`);
  }
}

if(LIVE&&ledgerOut.length) fs.appendFileSync(LEDGER,ledgerOut.map(x=>x).join('\n')+'\n');

console.log(`\n===== REPORT =====`);
console.log(`Duplikat-Gruppen: ${dupGroups.length}`);
console.log(`Differenziert (${LIVE?'LIVE':'DRY'}): ${differentiated}`);
console.log(`Schon erledigt (Ledger, übersprungen): ${skippedDone}`);
console.log(`Manual-Review: ${manual.length}`);
const byReason={};for(const m of manual)byReason[m.reason]=(byReason[m.reason]||0)+1;
console.log(`  Gründe:`,JSON.stringify(byReason));
if(manual.length){console.log('  Beispiele:');for(const m of manual.slice(0,25))console.log(`   - [${m.reason}] ${m.id.split('/').pop()} „${m.title.slice(0,50)}"`);}
