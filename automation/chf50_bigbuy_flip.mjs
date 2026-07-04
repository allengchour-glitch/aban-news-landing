#!/usr/bin/env node
/* chf50_bigbuy_flip — flips free-shipping trust line "CHF 65" → "CHF 50" in
 * descriptionHtml of all tag:bigbuy status:active products. Idempotent (skips
 * descriptions without "CHF 65"). Ledger at /tmp/chf50_bigbuy_done.txt. Cap 6000.
 * Cost-aware backoff (429 + GraphQL THROTTLED). Start:
 *   /opt/node22/bin/node automation/chf50_bigbuy_flip.mjs
 */
import fs from 'fs';
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LEDGER='/tmp/chf50_bigbuy_done.txt';
const CAP=6000;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}

// cost-aware GraphQL: honors throttleStatus, backs off on 429/5xx/THROTTLED
async function gql(t,q,v){
  for(let a=0;a<8;a++){
    let r;
    try{ r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})}); }
    catch(e){ await sleep((a+1)*2000); continue; }
    if(r.status===429||r.status>=500){ await sleep((a+1)*2500); continue; }
    const j=await r.json();
    const throttled=(j.errors||[]).some(e=>String(e?.extensions?.code||e?.message||'').toUpperCase().includes('THROTTLED'));
    if(throttled){ await sleep((a+1)*2500); continue; }
    // proactive backoff when bucket is low
    const cost=j?.extensions?.cost?.throttleStatus;
    if(cost && cost.currentlyAvailable < 200){
      const need=Math.min(2000, Math.ceil((300-cost.currentlyAvailable)/Math.max(cost.restoreRate||50,1)*1000));
      await sleep(need>0?need:400);
    }
    return j;
  }
  return null;
}

const done=new Set();
if(fs.existsSync(LEDGER)) for(const l of fs.readFileSync(LEDGER,'utf8').split('\n')) if(l.trim()) done.add(l.trim());
const ledgerFd=fs.openSync(LEDGER,'a');

const t=await tk(); if(!t){console.error('No token');process.exit(1);}

// PHASE 1 — read-only collect (sortKey:ID = stable; reads don't move items).
const Q=`query($c:String){ products(first:100, sortKey:ID, query:"tag:bigbuy AND status:active", after:$c){ pageInfo{hasNextPage endCursor} edges{ node{ id descriptionHtml } } } }`;
const M=`mutation($id:ID!,$d:String!){ productUpdate(input:{id:$id, descriptionHtml:$d}){ userErrors{message} } }`;

let cursor=null, pages=0, seen=new Map(), stall=0;
do{
  const r=await gql(t,Q,{c:cursor}); const pg=r?.data?.products;
  if(!pg){ await sleep(3000); continue; }
  const before=seen.size;
  for(const e of pg.edges) if(!seen.has(e.node.id)) seen.set(e.node.id, e.node.descriptionHtml||'');
  if(seen.size===before){ if(++stall>=4){ console.log('STALL in collect — stopping'); break; } } else stall=0;
  cursor=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null; pages++;
  if(pages%10===0) console.log(`  collect … page ${pages} · ${seen.size} products`);
}while(cursor);
console.log(`Phase 1: collected ${seen.size} bigbuy/active products (${pages} pages).`);

// PHASE 2 — flip only those containing "CHF 65".
let flipped=0, noHit=0, alreadyDone=0, errs=0;
for(const [id, html] of seen){
  if(!html.includes('CHF 65')){ noHit++; continue; }
  if(done.has(id)){ alreadyDone++; continue; }
  const nu=html.split('CHF 65').join('CHF 50');
  const mr=await gql(t,M,{id, d:nu});
  const ue=mr?.data?.productUpdate?.userErrors||[];
  if(mr && ue.length===0){
    flipped++; done.add(id); fs.writeSync(ledgerFd, id+'\n');
  }else{
    errs++; console.log('  ⚠️ update fail', id, JSON.stringify(ue).slice(0,140));
  }
  if(flipped>=CAP){ console.log('CAP reached'); break; }
  if(flipped%100===0 && flipped) console.log(`  … flipped ${flipped}`);
}

fs.closeSync(ledgerFd);
console.log(`DONE. collected=${seen.size} flipped=${flipped} noCHF65=${noHit} alreadyInLedger=${alreadyDone} errors=${errs}`);
