#!/usr/bin/env node
/* collection_desc_gemini — wertet Collection-Beschreibungen mit Gemini auf.
 * Gegroundet: nutzt echte Beispiel-Produkttitel der Collection → keine Erfindungen.
 * Idempotent: HTML-Marker <!--gd2--> + Ledger. LIVE=1 schreibt. ENV: SHOPIFY_*, /tmp/gemini_key.
 * MINP=3 (min Produkte), MAX=Zahl (Test).
 */
import fs from 'node:fs';
const SHOP=process.env.SHOPIFY_SHOP,API='2025-01',CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const GK=(fs.existsSync('/tmp/gemini_key')?fs.readFileSync('/tmp/gemini_key','utf8'):process.env.GEMINI_API_KEY||'').trim();
const LIVE=process.env.LIVE==='1';
const MINP=Number(process.env.MINP||3);
const MAX=Number(process.env.MAX||0);
const LEDGER=process.env.LEDGER||'dropship/coll_desc_done.txt';
const MARK='<!--gd2-->';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchT(u,o={},ms=25000){const ac=new AbortController();const to=setTimeout(()=>ac.abort(),ms);try{return await fetch(u,{...o,signal:ac.signal});}finally{clearTimeout(to);}}
const tok=async()=>{const r=await fetchT(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;};
let T=await tok();
const gql=async(q,v)=>{for(let a=0;a<5;a++){let r;try{r=await fetchT(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':T},body:JSON.stringify({query:q,variables:v})},30000);}catch{await sleep(1500);continue;}if(r.status===401){T=await tok();continue;}if(r.status===429||r.status>=500){await sleep((a+1)*1500);continue;}return r.json();}return null;};
const clean=s=>(s||'').replace(/^[^\p{L}\p{N}]+/u,'').trim();
const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const USP='<p>✔ Geprüfte Qualität · 🚚 Schnelle Lieferung · Gratis-Versand ab CHF 50 · ↩️ 30 Tage Rückgabe · –10 % mit Code WELCOME10</p>';

async function gemini(title,samples){
  if(!GK)return null;
  const prompt=`Schreibe eine kurze, natürliche DEUTSCHE Kategorie-Beschreibung (2-3 Sätze, 40-65 Wörter) für die Shop-Kategorie "${title}" eines Schweizer Online-Shops. Beispiel-Produkte aus der Kategorie: ${samples.join(' · ')}. Beschreibe konkret, was man hier findet, und wecke Kauflust. Sprich die Kundschaft locker mit "du" an (nicht "Sie"). NUR aus diesen Fakten – nichts erfinden, keine Preise nennen, kein Denglisch, keine leeren Floskeln. Gib NUR den reinen Beschreibungstext zurück (kein Markdown, keine Anführungszeichen).`;
  try{
    const url=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GK}`;
    const r=await fetchT(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.6,thinkingConfig:{thinkingBudget:0}}})},30000);
    const j=await r.json();
    let t=(j?.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('').trim().replace(/^["'`]+|["'`]+$/g,'');
    if(t.length>40&&t.length<800)return t;
  }catch{}
  return null;
}

const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.trim()).filter(Boolean):[]);
const Q=`query($c:String){collections(first:50,after:$c){pageInfo{hasNextPage endCursor}nodes{id handle title descriptionHtml productsCount{count} products(first:6){nodes{title}}}}}`;
const UP=`mutation($id:ID!,$d:String!){collectionUpdate(input:{id:$id,descriptionHtml:$d}){userErrors{message}}}`;
let cur=null, set=0, skip=0, seen=0;
do{
  const r=await gql(Q,{c:cur}); const pg=r?.data?.collections; if(!pg){await sleep(2000);continue;}
  for(const c of pg.nodes){
    seen++;
    if(done.has(c.handle)){skip++;continue;}
    if(c.productsCount.count<MINP){done.add(c.handle);continue;}
    if((c.descriptionHtml||'').includes(MARK)){done.add(c.handle);skip++;continue;}
    const samples=(c.products?.nodes||[]).map(n=>clean(n.title)).filter(Boolean).slice(0,6);
    if(samples.length<2){done.add(c.handle);continue;}
    const t=clean(c.title);
    const g=await gemini(t,samples); await sleep(1100);
    if(!g){continue;}
    const html=`<p>${esc(g)}</p>${USP}${MARK}`;
    if(LIVE){const u=await gql(UP,{id:c.id,d:html});if(!(u?.data?.collectionUpdate?.userErrors||[]).length){set++;done.add(c.handle);}}
    else {set++;console.log(`  [${t}] ${g.slice(0,90)}`);}
    if(LIVE&&set%15===0){fs.writeFileSync(LEDGER,[...done].join('\n')+'\n');console.log(`  … ${set} aufgewertet`);}
    if(MAX&&set>=MAX)break;
  }
  cur=(MAX&&set>=MAX)?null:(pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null);
}while(cur);
if(LIVE)fs.writeFileSync(LEDGER,[...done].join('\n')+'\n');
console.log(`\nFERTIG${LIVE?'':' [DRY]'}: ${set} Collections aufgewertet · ${skip} übersprungen (von ${seen}).`);
