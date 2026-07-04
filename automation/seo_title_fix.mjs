#!/usr/bin/env node
/* seo_title_fix — repariert defekte seo.title bei AKTIVEN Produkten (reset-fest: Ledger im Repo).
 * Defekt: eine Auto-SEO-App schnitt Titel mit "…" ab (oft Marke weg) oder > 70 Zeichen (Google kürzt).
 * Fix: seo.title = "<sauberer Produkttitel> | LuxeStyle", ≤70 Zeichen, an Wortgrenze gekürzt.
 * KONSERVATIV: nur echte Defekte (endet auf …, oder >70), nie legitime Titel anfassen; keine Doppelwort-Kollaps
 * (würde "Hugo Boss Boss"/"Moshi Moshi" zerstören). Idempotent via Ledger + Re-Check.
 * ENV: SHOPIFY_*. CAP (Default 100000), MAX pro Lauf, LIVE=1.
 */
import fs from 'node:fs';
const SHOP=process.env.SHOPIFY_SHOP,API='2025-01',CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const LIVE=process.env.LIVE==='1', MAX=Number(process.env.MAX||0);
const LEDGER=process.env.LEDGER||'dropship/seo_title_fix_done.txt';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchT(u,o={},ms=30000){const ac=new AbortController();const to=setTimeout(()=>ac.abort(),ms);try{return await fetch(u,{...o,signal:ac.signal});}finally{clearTimeout(to);}}
const tok=async()=>{const r=await fetchT(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;};
let T=await tok();
const gql=async(q,v)=>{for(let a=0;a<6;a++){let r;try{r=await fetchT(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':T},body:JSON.stringify({query:q,variables:v})},30000);}catch{await sleep(1500);continue;}if(r.status===401){T=await tok();continue;}if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}const j=await r.json();if((j?.data==null)&&Array.isArray(j?.errors)&&j.errors.some(e=>/THROTTLED/i.test(e?.extensions?.code||e?.message||''))){await sleep((a+1)*2500);continue;}return j;}return null;};

const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.trim()).filter(Boolean):[]);
// Titel säubern: hängende Trenner/Whitespace weg, aber KEINE Doppelwörter kollabieren.
const cleanTitle=s=>s.replace(/\s*[–—-]\s*$/,'').replace(/[·|]\s*$/,'').replace(/\s+/g,' ').trim();
function cut70(s){ if(s.length<=70) return s; const base=s.slice(0,70); const i=base.lastIndexOf(' '); return (i>40?base.slice(0,i):base).replace(/\s*[–—·|,-]\s*$/,'').trim(); }
function buildSeo(title){ const t=cleanTitle(title); const suffix=' | LuxeStyle'; const room=70-suffix.length; const head = t.length<=room? t : (()=>{const b=t.slice(0,room);const i=b.lastIndexOf(' ');return (i>30?b.slice(0,i):b).replace(/\s*[–—·|,-]\s*$/,'').trim();})(); return (head+suffix); }
// Defekt-Erkennung: nur UNZWEIDEUTIG — seo.title endet auf … (abgeschnitten) ODER > 70 Zeichen (Google kürzt).
// KEINE " – "-Heuristik: würde legitime Masse/Zahlbereiche wie "1,5 - 2,5 - 4 mm" zerstören (Fehltreffer).
function isDefect(seoT){ if(!seoT) return false; const s=seoT.trim(); if(/[…]$/.test(s)) return true; if(s.length>70) return true; return false; }

const Q=`query($c:String){products(first:80,query:"status:active",after:$c){pageInfo{hasNextPage endCursor}edges{node{id title seo{title}}}}}`;
const SET=`mutation($id:ID!,$t:String){productUpdate(input:{id:$id,seo:{title:$t}}){userErrors{message}}}`;
let cur=null,fixed=0,seen=0,skip=0;
do{
 const r=await gql(Q,{c:cur}); const pg=r?.data?.products; if(!pg){await sleep(2000);continue;}
 let stop=false;
 for(const {node} of pg.edges){
  seen++; if(done.has(node.id)){skip++;continue;}
  const st=node.seo?.title||'';
  // Nur GEFIXTE ins Ledger (schlank + reset-fest); saubere Titel matchen isDefect ohnehin nie → kein Re-Fix.
  if(!isDefect(st)){ skip++; continue; }
  const nt=buildSeo(node.title||st);
  if(!nt||nt.length<8||nt.length>70||/[…]$/.test(nt)){ skip++; continue; } // Safety
  if(LIVE){ const u=await gql(SET,{id:node.id,t:nt}); if(!(u?.data?.productUpdate?.userErrors||[]).length){fixed++;done.add(node.id);} await sleep(90); }
  else{ fixed++; if(fixed<=10)console.log(`  «${st.slice(0,45)}» -> «${nt}»`); }
  if(LIVE&&fixed%40===0){fs.writeFileSync(LEDGER,[...done].join('\n')+'\n');console.log(`  … ${fixed} gefixt`);}
  if(MAX&&fixed>=MAX){stop=true;break;}
 }
 cur=stop?null:(pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null);
}while(cur);
if(LIVE)fs.writeFileSync(LEDGER,[...done].join('\n')+'\n');
console.log(`\nFERTIG${LIVE?'':' [DRY]'}: ${fixed} seo.title repariert · ${skip} übersprungen (von ${seen}).`);
