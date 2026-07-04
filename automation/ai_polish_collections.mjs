#!/usr/bin/env node
/* ai_polish_collections — poliert KATEGORIE-Seiten (Collections) mit KI-Texten.
 * Nutzt Groq (llama-3.3-70b, schnell+gratis) für premium-deutsche Beschreibung + SEO.
 * Fällt auf Gemini zurück, wenn GEMINI_API_KEY gesetzt und Groq fehlt.
 * Ziel: jede Menü-/Kategorie-Collection bekommt eine verkaufsstarke, einheitliche
 * Beschreibung (HTML) + SEO-Titel/-Description. Idempotent-freundlich: ONLY_EMPTY=1
 * poliert nur Collections mit leerer/sehr kurzer Beschreibung; sonst alle.
 * DRY-Default. LIVE=1 schreibt. ENV: SHOPIFY_*, GROQ_API_KEY (oder /tmp/groq_key.txt).
 */
import fs from 'node:fs';
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const ONLY_EMPTY=process.env.ONLY_EMPTY==='1';
const LIMIT=parseInt(process.env.LIMIT||'250',10);
const GROQ=(process.env.GROQ_API_KEY|| (fs.existsSync('/tmp/groq_key.txt')?fs.readFileSync('/tmp/groq_key.txt','utf8').trim():'')).trim();
const GEMINI=(process.env.GEMINI_API_KEY||'').trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}

// --- KI-Aufruf: Groq bevorzugt, sonst Gemini ---
async function groq(prompt){
  for(let a=0;a<4;a++){
    try{
      const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${GROQ}`,'Content-Type':'application/json'},body:JSON.stringify({model:'llama-3.3-70b-versatile',temperature:0.6,max_tokens:500,messages:[{role:'system',content:'Du bist Senior-E-Commerce-Texter für einen Schweizer Premium-Mode-/Lifestyle-Shop (LuxeStyle). Schreibst auf Deutsch, verkaufsstark, seriös, ohne Übertreibung/Clickbait. Antwortest NUR mit gültigem JSON.'},{role:'user',content:prompt}]})});
      if(r.status===429){await sleep((a+1)*3000);continue;}
      const j=await r.json();const txt=j?.choices?.[0]?.message?.content;if(txt)return txt;
    }catch{await sleep(1500);}
  }
  return null;
}
async function gemini(prompt){
  if(!GEMINI)return null;
  try{const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});const j=await r.json();return j?.candidates?.[0]?.content?.parts?.[0]?.text||null;}catch{return null;}
}
function parseJson(s){if(!s)return null;const m=s.match(/\{[\s\S]*\}/);if(!m)return null;try{return JSON.parse(m[0]);}catch{return null;}}

async function polish(title,sampleProducts){
  const prompt=`Kategorieseite: "${title}".
Beispielprodukte dieser Kategorie: ${sampleProducts.slice(0,6).join('; ')||'(keine)'}.

Schreibe:
1) "description_html": ZWEI vollständige Absätze als HTML (<p>..</p><p>..</p>). JEDER Absatz mindestens 22 und höchstens 38 Wörter, in ganzen Sätzen. Absatz 1: emotionaler Nutzen/Lifestyle. Absatz 2: konkret was es hier gibt (Marken/Stile/Qualität, falls aus den Beispielprodukten erkennbar — keine Marken erfinden). Keine Emojis.
2) "seo_title": max 60 Zeichen, enthält die Kategorie + "LuxeStyle".
3) "seo_description": max 155 Zeichen, verkaufsstark, mit Hinweis "Gratis-Versand ab CHF 50".

Antworte NUR als JSON: {"description_html":"...","seo_title":"...","seo_description":"..."}`;
  let raw=await groq(prompt);
  let j=parseJson(raw);
  if(!j){raw=await gemini(prompt);j=parseJson(raw);}
  if(!j||!j.description_html)return null;
  // Trust-Zeile einheitlich anhängen
  const trust='<p><strong>100 % Original · Gratis-Versand ab CHF 50 · 30 Tage Rückgabe · Code WELCOME10 = 10 %</strong></p>';
  return {
    descriptionHtml: j.description_html.trim()+trust,
    seoTitle: (j.seo_title||title).slice(0,70),
    seoDescription: (j.seo_description||'').slice(0,160),
  };
}

const t=await tk();if(!t){console.error('Kein Shopify-Token');process.exit(1);}
if(!GROQ&&!GEMINI){console.error('Kein GROQ_API_KEY/GEMINI_API_KEY');process.exit(1);}
// Collections sammeln (Smart + Custom), inkl. erstes Produkt für Kontext
const Q=`query($c:String){ collections(first:50, after:$c){ pageInfo{hasNextPage endCursor} edges{ node{ id title handle descriptionHtml seo{title description} products(first:6){edges{node{title}}} } } } }`;
let c=null,items=[],pages=0;
do{const r=await gql(t,Q,{c});const pg=r?.data?.collections;if(!pg){await sleep(2000);continue;}
 for(const e of pg.edges)items.push(e.node);
 c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null;pages++;
}while(c&&items.length<LIMIT);
console.log(`${items.length} Collections geladen.`);

let done=0,skip=0;
for(const col of items){
  const cur=(col.descriptionHtml||'').replace(/<[^>]+>/g,'').trim();
  if(ONLY_EMPTY && cur.length>=80){skip++;continue;}
  const samples=(col.products?.edges||[]).map(e=>e.node.title);
  if(samples.length===0){skip++;continue;} // leere Collection überspringen
  const res=await polish(col.title,samples);
  if(!res){console.log(' ⚠️ KI ohne Ergebnis:',col.title);skip++;continue;}
  if(LIVE){
    const r=await gql(t,`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}`,{i:{id:col.id,descriptionHtml:res.descriptionHtml,seo:{title:res.seoTitle,description:res.seoDescription}}});
    const e=r?.data?.collectionUpdate?.userErrors||[];if(e.length){console.log(' ⚠️',col.title,JSON.stringify(e).slice(0,120));skip++;continue;}
  }
  done++;console.log(` ✅ ${col.title} ${LIVE?'':'(DRY)'} → ${res.seoTitle}`);
  await sleep(400);
}
console.log(`\nFertig. Poliert: ${done} · übersprungen: ${skip} ${LIVE?'':'(DRY)'}`);
