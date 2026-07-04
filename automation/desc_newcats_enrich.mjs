#!/usr/bin/env node
/* desc_newcats_enrich — veredelt DÜNNE Beschreibungen (plain-text < 120 Zeichen) für die NEUEN
 * Kategorie-Tags: beautytech, auto, hightech, basteln, maker. Deutsch, du-Ansprache, kurze Intro +
 * 3–4 konkrete Benefit-Bullets, faktisch (KEINE erfundenen Specs/Claims). Gemini gemini-2.5-flash
 * (thinkingBudget:0). Idempotent via Ledger /tmp/desc_newcats_done.txt. Cap 250. DRY default, LIVE=1 schreibt.
 * ENV: SHOPIFY_SHOP/CLIENT_ID/CLIENT_SECRET, GEMINI_API_KEY.
 */
import fs from 'node:fs';
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const CAP=parseInt(process.env.CAP||'250',10);
const TAGS=['beautytech','auto','hightech','basteln','maker'];
const LEDGER='/tmp/desc_newcats_done.txt';
const GEMINI=(process.env.GEMINI_API_KEY||'').trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const TRUST='<p>🇨🇭 Schweizer Shop · 🚚 Gratis-Versand ab CHF 65 · ↩️ 30 Tage Rückgabe · Code <strong>WELCOME10</strong> = –10%</p>';
const SYS='Du bist Senior-Produkttexter für den Schweizer Shop LuxeStyle. Du schreibst einzigartige, ehrliche deutsche Produktbeschreibungen in Du-Ansprache. Du erfindest KEINE technischen Daten, Masse, Materialien oder Claims — nur was aus Titel/Kategorie sicher hervorgeht. Antwortest NUR mit HTML (<p>/<ul>/<li>), nichts davor/danach.';

if(!GEMINI){console.error('Kein GEMINI_API_KEY');process.exit(1);}
const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.trim()).filter(Boolean):[]);
const markDone=id=>{done.add(id);try{fs.appendFileSync(LEDGER,id+'\n');}catch{}};

// plain-text length of HTML/description
const plain=s=>(s||'').replace(/<[^>]*>/g,' ').replace(/&[a-z]+;/gi,' ').replace(/\s+/g,' ').trim();

async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<6;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}const j=await r.json();if(j?.errors&&JSON.stringify(j.errors).includes('THROTTLED')){await sleep((a+1)*2000);continue;}return j;}return null;}

let geminiFails=0;
async function gemini(p){
 for(let a=0;a<4;a++){
  try{
   const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:SYS+'\n\n'+p}]}],generationConfig:{temperature:0.7,maxOutputTokens:1000,thinkingConfig:{thinkingBudget:0}}})});
   if(r.status===429||r.status>=500){await sleep((a+1)*4000);continue;}
   const j=await r.json();
   const txt=j?.candidates?.[0]?.content?.parts?.[0]?.text;
   if(txt){geminiFails=0;return txt;}
   return null;
  }catch{await sleep((a+1)*2000);}
 }
 geminiFails++;return null;
}

const t=await tk();if(!t){console.error('Kein Token');process.exit(1);}

// Sammle dünne Produkte über alle Tags (dedup per ID)
const Q=`query($q:String!,$c:String){products(first:50,query:$q,sortKey:CREATED_AT,after:$c){pageInfo{hasNextPage endCursor}edges{node{id title productType descriptionHtml}}}}`;
const seen=new Set(),thin=[];
for(const tag of TAGS){
 let c=null;
 do{
  const r=await gql(t,Q,{q:`tag:${tag} AND status:active`,c});
  const pg=r?.data?.products;if(!pg){await sleep(2000);break;}
  for(const e of pg.edges){const n=e.node;if(seen.has(n.id))continue;seen.add(n.id);
   if(plain(n.descriptionHtml).length<120)thin.push(n);}
  c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null;
 }while(c);
}
console.log(`Dünne Produkte (plain<120) in [${TAGS.join(',')}]: ${thin.length} · schon im Ledger: ${thin.filter(n=>done.has(n.id)).length}`);

let enriched=0,skip=0,processed=0;
for(const n of thin){
 if(done.has(n.id))continue;
 if(processed>=CAP)break;
 processed++;
 const prompt=`Schreibe eine kurze, EINZIGARTIGE deutsche Produktbeschreibung (Du-Ansprache) für:
Produkt: "${n.title}"${n.productType?` (Kategorie: ${n.productType})`:''}
Format als HTML:
1) <p>…</p> — kurze Intro, 1–2 ganze Sätze, benefit-getrieben (Nutzen/Anwendung), spezifisch auf DIESES Produkt.
2) <ul> mit 3–4 <li> — konkrete Vorteile, KEINE erfundenen Masse/Materialien/Specs, nur was aus Titel/Kategorie klar ist.
Kein Preis, keine Superlative ohne Grundlage. Antworte NUR mit dem HTML (<p>…</p><ul>…</ul>).`;
 let body=await gemini(prompt);
 if(!body){
  skip++;
  if(geminiFails>=3){console.log('⛔ Gemini wiederholt fehlgeschlagen → Stopp.');break;}
  continue;
 }
 body=body.replace(/^```html?\s*/i,'').replace(/```\s*$/,'').trim();
 if(body.length<60){skip++;continue;}
 const full=`${body}\n${TRUST}\n<!--ls-newcat-desc-->`;
 if(LIVE){
  const r=await gql(t,`mutation($id:ID!,$d:String!){productUpdate(input:{id:$id,descriptionHtml:$d}){userErrors{message}}}`,{id:n.id,d:full});
  const e=r?.data?.productUpdate?.userErrors||[];
  if(e.length){console.log(' ⚠️',n.id,JSON.stringify(e).slice(0,120));skip++;continue;}
  markDone(n.id);
 }
 enriched++;
 if(enriched%20===0)console.log(`  … ${enriched} veredelt`);
 await sleep(250);
}
console.log(`\nFertig. Veredelt: ${enriched} · übersprungen: ${skip} · verarbeitet: ${processed}/${CAP} ${LIVE?'(LIVE)':'(DRY)'}`);
