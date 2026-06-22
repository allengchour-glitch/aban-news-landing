#!/usr/bin/env node
/* ai_product_descriptions — veredelt dünne/generische Produktbeschreibungen mit einzigartigem,
 * benefit-getriebenem Text. MULTI-KI-FALLBACK: Gemini → Groq → DeepSeek (wenn eine kein Kontingent hat).
 * Behält Spec-Detail-Block (ls-feed-details) + Trust-Zeile. Markiert veredelte Produkte mit TAG `ls-ai-desc`
 * → schneller Re-Run (Query `-tag:ls-ai-desc`), kein Pagination-Overhead.
 * DRY-Default. LIVE=1 schreibt. Batch via LIMIT (default 100). ENV: SHOPIFY_*, /tmp/{gemini_key,groq_key.txt,deepseek.key}.
 */
import fs from 'node:fs';
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const LIMIT=parseInt(process.env.LIMIT||'100',10);
const rd=p=>{try{return fs.readFileSync(p,'utf8').trim();}catch{return '';}};
const GEMINI=(process.env.GEMINI_API_KEY||rd('/tmp/gemini_key')).trim();
const GROQ=(process.env.GROQ_API_KEY||rd('/tmp/groq_key.txt')).trim();
const DEEPSEEK=(process.env.DEEPSEEK_API_KEY||rd('/tmp/deepseek.key')).trim();
const OPENAI=(process.env.OPENAI_API_KEY||rd('/tmp/openai.key')).trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const TRUST='<p>🇨🇭 Schweizer Shop · 🚚 Gratis-Versand ab CHF 65 · ↩️ 30 Tage Rückgabe · Code <strong>WELCOME10</strong> = –10%</p>';
const SYS='Du bist Senior-Produkttexter für den Schweizer Shop LuxeStyle. Schreibst einzigartige, verkaufsstarke, ehrliche deutsche Produktbeschreibungen. Antwortest NUR mit HTML (<p>/<ul>/<li>), nichts davor/danach.';
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}

// ── Multi-Provider AI (Reihenfolge: Gemini → Groq → DeepSeek), liefert das erste brauchbare Ergebnis ──
let quotaHit={gemini:false,groq:false,deepseek:false,openai:false};
async function gemini(p){if(!GEMINI||quotaHit.gemini)return null;try{const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:SYS+'\n\n'+p}]}],generationConfig:{temperature:0.7,maxOutputTokens:600}})});if(r.status===429){quotaHit.gemini=true;return null;}const j=await r.json();return j?.candidates?.[0]?.content?.parts?.[0]?.text||null;}catch{return null;}}
async function openaiLike(url,key,model,p,flag){if(!key||quotaHit[flag])return null;try{const r=await fetch(url,{method:'POST',headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,temperature:0.7,max_tokens:600,messages:[{role:'system',content:SYS},{role:'user',content:p}]})});if(r.status===429){quotaHit[flag]=true;return null;}const j=await r.json();return j?.choices?.[0]?.message?.content||null;}catch{return null;}}
async function gen(p){return (await gemini(p)) || (await openaiLike('https://api.groq.com/openai/v1/chat/completions',GROQ,'llama-3.3-70b-versatile',p,'groq')) || (await openaiLike('https://api.deepseek.com/chat/completions',DEEPSEEK,'deepseek-chat',p,'deepseek')) || (await openaiLike('https://api.openai.com/v1/chat/completions',OPENAI,'gpt-4o-mini',p,'openai'));}

const t=await tk();if(!t){console.error('Kein Token');process.exit(1);}
if(!GEMINI&&!GROQ&&!DEEPSEEK&&!OPENAI){console.error('Keine KI-Keys');process.exit(1);}
console.log('KI-Fallback-Kette:',[GEMINI&&'Gemini',GROQ&&'Groq',DEEPSEEK&&'DeepSeek',OPENAI&&'OpenAI'].filter(Boolean).join(' → '));
// Nur NICHT-veredelte holen (Tag-Filter = schnell)
const Q=`query($c:String){products(first:50,query:"tag:bigbuy status:active -tag:ls-ai-desc",sortKey:CREATED_AT,reverse:true,after:$c){pageInfo{hasNextPage endCursor}edges{node{id title productType descriptionHtml}}}}`;
let c=null,items=[],stall=0;
do{const r=await gql(t,Q,{c});const pg=r?.data?.products;if(!pg){await sleep(2000);continue;}const b=items.length;
 for(const e of pg.edges)items.push(e.node);
 if(items.length===b){if(++stall>=4)break;}else stall=0;
 c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null;
}while(c && items.length<LIMIT);
console.log(`${items.length} Produkte ohne KI-Beschreibung (Batch, LIMIT ${LIMIT}).`);

let done=0,skip=0;
let tagOnly=0;
for(const n of items){
 // Schon veredelt (Kommentar-Marker, aber noch nicht getaggt) → nur taggen, KEIN KI-Call (spart Kontingent)
 if((n.descriptionHtml||'').includes('ls-ai-desc')){ if(LIVE)await gql(t,`mutation($id:ID!){tagsAdd(id:$id,tags:["ls-ai-desc"]){userErrors{message}}}`,{id:n.id}); tagOnly++; continue; }
 const m=(n.descriptionHtml||'').match(/<div class="ls-feed-details">[\s\S]*?<\/div>/);
 const spec=m?m[0]:'';
 const prompt=`Schreibe eine verkaufsstarke, EINZIGARTIGE deutsche Produktbeschreibung für:
Produkt: "${n.title}"${n.productType?` (Kategorie: ${n.productType})`:''}
Format als HTML:
1) <p>…</p> — 2–3 ganze Sätze, benefit-getrieben (Nutzen/Anwendung/Gefühl), spezifisch auf DIESES Produkt, KEINE generischen Floskeln, kein Preis.
2) <ul> mit 3–4 <li> — konkrete Vorteile/Eigenschaften (kurz).
Antworte NUR mit dem HTML (<p>…</p><ul>…</ul>).`;
 let body=await gen(prompt);
 if(!body){skip++;if(quotaHit.gemini&&quotaHit.groq&&quotaHit.deepseek&&quotaHit.openai){console.log('⛔ Alle KI-Kontingente erschöpft → Stopp.');break;}continue;}
 body=body.replace(/^```html?\s*/i,'').replace(/```\s*$/,'').trim();
 if(body.length<80){skip++;continue;}
 const full=`${body}\n${spec}\n${TRUST}\n<!--ls-ai-desc-->`;
 if(LIVE){
   const r=await gql(t,`mutation($id:ID!,$d:String!){productUpdate(input:{id:$id,descriptionHtml:$d}){userErrors{message}} tagsAdd(id:$id,tags:["ls-ai-desc"]){userErrors{message}}}`,{id:n.id,d:full});
   const e=[...(r?.data?.productUpdate?.userErrors||[]),...(r?.data?.tagsAdd?.userErrors||[])];if(e.length){console.log(' ⚠️',JSON.stringify(e).slice(0,100));skip++;continue;}
 }
 done++; if(done%25===0)console.log(`  … ${done}/${items.length}`);
 await sleep(200);
}
console.log(`\nFertig. Veredelt: ${done} · nur-getaggt(schon ok): ${tagOnly} · übersprungen: ${skip} · Kontingent: ${JSON.stringify(quotaHit)} ${LIVE?'':'(DRY)'}`);
