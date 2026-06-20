#!/usr/bin/env node
/* ai_blog_writer — autonomer SEO-Content-Motor: Groq schreibt Kaufberater-Artikel mit
 * Buyer-Intent-Keywords und VORGEGEBENEN internen Links (Collection/Produkt) → publiziert
 * live in einen Shop-Blog (articleCreate). Treibt KOSTENLOSEN organischen Such-Traffic.
 * Idempotent: überspringt Artikel, deren Handle schon existiert (kein Doppel-Posten).
 * DRY-Default. LIVE=1 publiziert. ENV: SHOPIFY_*, GROQ_API_KEY (oder /tmp/groq_key.txt).
 * Aufruf:  SPEC=/tmp/articles.json LIVE=1 node automation/ai_blog_writer.mjs
 */
import fs from 'node:fs';
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const GROQ=(process.env.GROQ_API_KEY||(fs.existsSync('/tmp/groq_key.txt')?fs.readFileSync('/tmp/groq_key.txt','utf8').trim():'')).trim();
const GEMINI=(process.env.GEMINI_API_KEY||(fs.existsSync('/tmp/gemini_key')?fs.readFileSync('/tmp/gemini_key','utf8').trim():'')).trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const slug=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}
const SYS='Du bist ein erfahrener Schweizer E-Commerce-Redakteur für LuxeStyle. Du schreibst hilfreiche, ehrliche, SEO-starke Kaufberater auf Deutsch (Schweizer Tonalität, „CHF"). Sachlich, kein Clickbait, kein Keyword-Stuffing. Antwortest NUR mit gültigem HTML (keine Markdown-Zäune).';
async function gemini(prompt){if(!GEMINI)return null;for(let a=0;a<3;a++){try{const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:SYS+'\n\n'+prompt}]}],generationConfig:{temperature:0.7,maxOutputTokens:2600}})});if(r.status===429||r.status>=500){await sleep((a+1)*3000);continue;}const j=await r.json();const txt=j?.candidates?.[0]?.content?.parts?.[0]?.text;if(txt)return txt;}catch{await sleep(1500);}}return null;}
async function groqGen(prompt){if(!GROQ)return null;for(let a=0;a<3;a++){try{const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${GROQ}`,'Content-Type':'application/json'},body:JSON.stringify({model:'llama-3.3-70b-versatile',temperature:0.7,max_tokens:2200,messages:[{role:'system',content:SYS},{role:'user',content:prompt}]})});if(r.status===429){return null;}const j=await r.json();const txt=j?.choices?.[0]?.message?.content;if(txt)return txt;}catch{await sleep(1500);}}return null;}
// Gemini primär (besser für Langtext + höheres Limit), Groq als Fallback
async function groq(prompt){return (await gemini(prompt)) || (await groqGen(prompt));}

const t=await tk();if(!t){console.error('Kein Shopify-Token');process.exit(1);}
if(!GROQ){console.error('Kein GROQ_API_KEY');process.exit(1);}
const spec=JSON.parse(fs.readFileSync(process.env.SPEC||'/tmp/articles.json','utf8'));

// vorhandene Handles je Blog sammeln (Idempotenz)
const existing=new Set();
const br=await gql(t,`{blogs(first:5){edges{node{handle id articles(first:70){edges{node{handle}}}}}}}`);
const blogByHandle={};
for(const e of br.data.blogs.edges){blogByHandle[e.node.handle]=e.node.id;for(const a of e.node.articles.edges)existing.add(e.node.handle+'/'+a.node.handle);}

let done=0,skip=0;
for(const art of spec.articles){
  const blogId=blogByHandle[art.blog]; if(!blogId){console.log('⚠️ Blog nicht gefunden:',art.blog);continue;}
  const h=art.handle||slug(art.title);
  if(existing.has(art.blog+'/'+h)){console.log('↩︎ existiert schon:',h);skip++;continue;}
  const linksTxt=(art.links||[]).map(l=>`- ${l.label}: ${l.url}`).join('\n');
  const prompt=`Schreibe einen SEO-Kaufberater-Artikel als HTML.
Titel (H1 NICHT wiederholen, kommt separat): "${art.title}"
Haupt-Keyword: ${art.keyword}
Kontext/Angle: ${art.angle}

Pflicht:
- 550–750 Wörter, 4–6 <h2>-Abschnitte mit konkreten, ehrlichen Kauf-Tipps (Schweizer Bezug, CHF).
- Baue diese internen Links als <a href="URL">Anker</a> natürlich in den Fliesstext ein (mindestens je 1×):
${linksTxt}
- Ein <h2>Häufige Fragen</h2> mit 3 kurzen Q&A (jeweils <h3>Frage</h3><p>Antwort</p>).
- Schliesse mit einem CTA-Absatz, der auf den wichtigsten Link verweist.
- KEINE erfundenen Fakten/Preise/Marken. Kein Markdown, NUR sauberes HTML (<p>,<h2>,<h3>,<ul>,<li>,<strong>,<a>).
Antworte NUR mit dem HTML-Body (ohne <html>/<body>-Wrapper).`;
  let body=null;
  for(let attempt=0;attempt<3;attempt++){ const b=await groq(prompt); if(b){const c=b.replace(/^```html?\s*/i,'').replace(/```\s*$/,'').trim(); if(c.length>=1800){body=c;break;} } await sleep(1500); }
  if(!body){console.log('⚠️ kein ausreichend langer Text:',h);skip++;continue;}
  // Sicherheits-Fallback: falls ein Pflicht-Link fehlt, hinten anhängen
  for(const l of (art.links||[])){ if(!body.includes(l.url)) body+=`\n<p>➡️ <a href="${l.url}">${l.label}</a></p>`; }
  const summary=art.summary||`${art.title} – ehrlicher Kaufratgeber von LuxeStyle Schweiz.`;
  if(LIVE){
    const r=await gql(t,`mutation($a:ArticleCreateInput!){articleCreate(article:$a){article{handle} userErrors{field message}}}`,
      {a:{blogId,title:art.title,handle:h,body,summary,tags:art.tags||['Ratgeber'],isPublished:true,author:{name:'LuxeStyle Redaktion'}}});
    const e=r?.data?.articleCreate?.userErrors||[];
    if(e.length){console.log('⚠️',h,JSON.stringify(e).slice(0,160));skip++;continue;}
    console.log('✅ publiziert:',art.blog+'/'+(r.data.articleCreate.article.handle));
  } else console.log('✅ (DRY) würde publizieren:',art.blog+'/'+h,'·',body.length,'Zeichen');
  done++; await sleep(500);
}
console.log(`\nFertig. Publiziert: ${done} · übersprungen: ${skip} ${LIVE?'':'(DRY)'}`);
