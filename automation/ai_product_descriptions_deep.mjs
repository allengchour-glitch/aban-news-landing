#!/usr/bin/env node
/* ai_product_descriptions_deep — VERTIEFT Produktbeschreibungen: reicher Intro + „Das macht es besonders" (5-6 Bullets)
 * + „Ideal für" (Anwendungsfälle) + „Gut zu wissen" (Pflege/Nutzung). Behält Spec-Block (ls-feed-details) + Trust-Zeile.
 * Versucht zuerst OpenAI/ChatGPT (User-Wunsch), dann Gemini (gratis, gleichwertig). Marker-TAG `ls-ai-deep` → idempotent.
 * Schweizer Rechtschreibung (ss). DRY-Default · LIVE=1 · Batch via LIMIT (default 60). ENV: SHOPIFY_*, /tmp/{openai.key,gemini_key,groq_key.txt}.
 */
import fs from 'node:fs';
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const LIMIT=parseInt(process.env.LIMIT||'60',10);
const rd=p=>{try{return fs.readFileSync(p,'utf8').trim();}catch{return '';}};
const OPENAI=(process.env.OPENAI_API_KEY||rd('/tmp/openai.key')).trim();
const GEMINI=(process.env.GEMINI_API_KEY||rd('/tmp/gemini_key')).trim();
const GROQ=(process.env.GROQ_API_KEY||rd('/tmp/groq_key.txt')).trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const TRUST='<p>🇨🇭 Schweizer Shop · 🚚 Gratis-Versand ab CHF 65 · ↩️ 30 Tage Rückgabe · Code <strong>WELCOME10</strong> = –10%</p>';
const SYS='Du bist Senior-Produkttexter für den Schweizer Premium-Shop LuxeStyle. Schreibst tiefgehende, verkaufsstarke, ehrliche deutsche Produktbeschreibungen. Schweizer Rechtschreibung: IMMER ss statt ß. Antwortest NUR mit HTML, nichts davor/danach.';
let quota={openai:false,groq:false,gemini:false};
async function openai(p){if(!OPENAI||quota.openai)return null;try{const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${OPENAI}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini',temperature:0.75,max_tokens:1500,messages:[{role:'system',content:SYS},{role:'user',content:p}]})});if(r.status===429||r.status===401){quota.openai=true;return null;}const j=await r.json();return j?.choices?.[0]?.message?.content||null;}catch{return null;}}
async function gemini(p){if(!GEMINI||quota.gemini)return null;try{const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:SYS+'\n\n'+p}]}],generationConfig:{temperature:0.75,maxOutputTokens:1500,thinkingConfig:{thinkingBudget:0}}})});if(r.status===429){quota.gemini=true;return null;}const j=await r.json();return j?.candidates?.[0]?.content?.parts?.[0]?.text||null;}catch{return null;}}
async function groq(p){if(!GROQ||quota.groq)return null;try{const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${GROQ}`,'Content-Type':'application/json'},body:JSON.stringify({model:'llama-3.3-70b-versatile',temperature:0.75,max_tokens:1500,messages:[{role:'system',content:SYS},{role:'user',content:p}]})});if(r.status===429){quota.groq=true;return null;}const j=await r.json();return j?.choices?.[0]?.message?.content||null;}catch{return null;}}
async function gen(p){return (await openai(p)) || (await gemini(p)) || (await groq(p));}
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}

const t=await tk();if(!t){console.error('Kein Token');process.exit(1);}
if(!OPENAI&&!GEMINI&&!GROQ){console.error('Keine KI-Keys');process.exit(1);}
console.log('Vertiefung-KI-Kette:',[OPENAI&&'OpenAI/ChatGPT',GEMINI&&'Gemini',GROQ&&'Groq'].filter(Boolean).join(' → '));
const Q=`query($c:String){products(first:40,query:"tag:bigbuy status:active -tag:ls-ai-deep",sortKey:CREATED_AT,reverse:false,after:$c){pageInfo{hasNextPage endCursor}edges{node{id title productType descriptionHtml}}}}`;
let c=null,items=[],stall=0;
do{const r=await gql(t,Q,{c});const pg=r?.data?.products;if(!pg){await sleep(2000);continue;}const b=items.length;for(const e of pg.edges)items.push(e.node);if(items.length===b){if(++stall>=4)break;}else stall=0;c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null;}while(c&&items.length<LIMIT);
console.log(`${items.length} Produkte zum Vertiefen (Batch, LIMIT ${LIMIT}).`);
let done=0,skip=0;
for(const n of items){
 const m=(n.descriptionHtml||'').match(/<div class="ls-feed-details">[\s\S]*?<\/div>/);const spec=m?m[0]:'';
 const prompt=`Schreibe eine VERTIEFTE, verkaufsstarke deutsche Produktbeschreibung für: "${n.title}"${n.productType?` (Kategorie: ${n.productType})`:''}.
Struktur als HTML:
1) <p> — fesselnder Intro, 3-4 ganze Sätze: Nutzen/Erlebnis/Gefühl, spezifisch auf DIESES Produkt, benefit-getrieben, kein Preis.
2) <h4>Das macht es besonders</h4><ul> mit 5-6 <li> — konkrete Features & Vorteile, jeweils mit <strong>Feature:</strong> + kurzer Nutzen-Erklärung.
3) <h4>Ideal für</h4><p> — 2-3 konkrete Anwendungsfälle/Situationen/Zielgruppen.
4) <h4>Gut zu wissen</h4><p> — kurzer ehrlicher Pflege-/Nutzungs-/Material-Hinweis.
Ton: premium, lebendig, ehrlich, KEINE leeren Floskeln. Schweizer Rechtschreibung (ss statt ß). Antworte NUR mit dem HTML.`;
 let body=await gen(prompt);
 if(!body){skip++;if(quota.openai&&quota.gemini&&quota.groq){console.log('⛔ Alle KI-Kontingente erschöpft → Stopp.');break;}continue;}
 body=body.replace(/^```html?\s*/i,'').replace(/```\s*$/,'').replace(/ß/g,'ss').trim();
 if(body.length<200){skip++;continue;}
 const full=`${body}\n${spec}\n${TRUST}\n<!--ls-ai-deep-->`;
 if(LIVE){const r=await gql(t,`mutation($id:ID!,$d:String!){productUpdate(input:{id:$id,descriptionHtml:$d}){userErrors{message}} tagsAdd(id:$id,tags:["ls-ai-deep"]){userErrors{message}}}`,{id:n.id,d:full});const e=[...(r?.data?.productUpdate?.userErrors||[]),...(r?.data?.tagsAdd?.userErrors||[])];if(e.length){console.log(' ⚠️',JSON.stringify(e).slice(0,100));skip++;continue;}}
 done++;if(done%20===0)console.log(`  … ${done}/${items.length}`);
 await sleep(200);
}
console.log(`\nFertig. Vertieft: ${done} · übersprungen: ${skip} · Kontingent: ${JSON.stringify(quota)} ${LIVE?'':'(DRY)'}`);
