#!/usr/bin/env node
/* ratgeber_pro — "besser als Soro": SEO-Kaufratgeber mit RICH SCHEMA (FAQPage + Article JSON-LD),
 * TL;DR-Box (die KI-Antwortmaschinen wie ChatGPT/Perplexity/AI-Overviews zitieren) und CONVERSION-CTA
 * (Artikel → kaufbare Collection + WELCOME10). Gemini schreibt grounded DE-Content, wir bauen das
 * Rich-Markup selbst. Idempotent (Titel-Check + Ledger). LIVE=1 schreibt. Handles gegen Live-Katalog geprüft.
 * ENV: SHOPIFY_CLIENT_ID/SECRET · SHOPIFY_SHOP · GEMINI(/tmp/gemini_key) · CAP · LIVE=1
 */
import fs from 'node:fs';
const SHOP=process.env.SHOPIFY_SHOP||'au3j0y-hq.myshopify.com',API='2025-01',CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const GK=(fs.existsSync('/tmp/gemini_key')?fs.readFileSync('/tmp/gemini_key','utf8'):process.env.GEMINI_API_KEY||'').trim();
const LIVE=process.env.LIVE==='1', CAP=parseInt(process.env.CAP||'20',10);
const LEDGER='dropship/ratgeber_pro_done.txt';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchT(u,o={},ms=45000){const ac=new AbortController();const to=setTimeout(()=>ac.abort(),ms);try{return await fetch(u,{...o,signal:ac.signal});}finally{clearTimeout(to);}}
const tok=async()=>{const r=await fetchT(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;};
let T=await tok();
const gql=async(q,v)=>{for(let a=0;a<5;a++){let r;try{r=await fetchT(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':T},body:JSON.stringify({query:q,variables:v})},30000);}catch{await sleep(1500);continue;}if(r.status===401){T=await tok();continue;}if(r.status===429||r.status>=500){await sleep((a+1)*1500);continue;}return r.json();}return null;};

// Hoch-kommerzielle Käufer-Intent-Themen (frisch, nicht in ratgeber_gemini). [Titel, keyword, collection-handle, collectionName]
const TOPICS=[
 ['Sommerkleider 2026: die schönsten Trends & worauf du beim Kauf achtest','sommerkleider 2026','damen-mode','Damen-Mode & Kleider'],
 ['Das perfekte Kleid für jede Figur finden: der grosse Schnitt-Guide','kleid figur schnitt','damen-mode','Damen-Mode & Kleider'],
 ['Edelstahlschmuck vs. Silber: was ist besser für Alltag & Allergiker?','edelstahlschmuck silber','premium-schmuck','Schmuck'],
 ['Damenuhr kaufen: der Guide für Stil, Grösse & Uhrwerk','damenuhr kaufen','uhren','Uhren'],
 ['Sonnenbrille nach Gesichtsform: so findest du dein Modell','sonnenbrille gesichtsform','sonnenbrillen-eyewear','Sonnenbrillen'],
 ['Parfum-Guide Schweiz: Dufttyp finden & richtig auftragen','parfum dufttyp schweiz','parfum-duefte','Parfum & Düfte'],
 ['Hautpflege-Routine 2026: die richtige Reihenfolge Schritt für Schritt','hautpflege routine 2026','premium-beauty','Beauty & Pflege'],
 ['Handtasche für jeden Anlass: der komplette Taschen-Ratgeber','handtasche anlass ratgeber','sub-taschen','Taschen & Rucksäcke'],
 ['Smartwatch kaufen 2026: welche passt zu deinem Alltag?','smartwatch kaufen 2026','elektronik-technik','Elektronik & Technik'],
 ['Kopfhörer-Kaufberatung 2026: In-Ear, Over-Ear oder ANC?','kopfhörer kaufberatung 2026','elektronik-technik','Elektronik & Technik'],
 ['Herrenmode-Basics 2026: die Kleidungsstücke für jeden Look','herrenmode basics 2026','fur-ihn','Herren-Mode'],
 ['Hundezubehör-Guide: die richtige Grundausstattung für deinen Hund','hundezubehör grundausstattung','sub-haustier','Haustierbedarf'],
 ['Katzen glücklich halten: Zubehör, Spiel & Wohlfühl-Tipps','katzen zubehör tipps','sub-haustier','Haustierbedarf'],
 ['Beauty-Geräte für zuhause: IPL, Gua Sha & Gesichtsroller im Überblick','beauty geräte zuhause','beauty-geraete','Beauty-Geräte'],
 ['Ringgrösse bestimmen & den perfekten Ring finden','ringgrösse ring finden','sub-ringe','Ringe'],
 ['Halskette richtig wählen: Länge, Material & Stil kombinieren','halskette länge material','sub-halsketten','Halsketten'],
 ['Sneaker-Guide 2026: der richtige Schuh für jeden Anlass','sneaker guide 2026','schuhe-sneaker','Sneaker'],
 ['Wohnaccessoires & Deko: so schaffst du ein gemütliches Zuhause','wohnaccessoires deko gemütlich','wohnen-dekoration','Wohnen & Deko'],
 ['Geschenkideen 2026: die passende Idee für jeden Anlass finden','geschenkideen 2026','premium-geschenke','Geschenke'],
 ['Rucksack für Alltag, Uni & Reise: der grosse Rucksack-Guide','rucksack alltag uni reise','rucksaecke','Rucksäcke'],
 ['Ohrringe-Guide: Stecker, Creolen & Hänger für jeden Typ','ohrringe stecker creolen','sub-ohrringe','Ohrringe'],
 ['Winter-Wärme zuhause: Heizdecke, Kuscheldecke & Co richtig wählen','winter wärme heizdecke','waerme-komfort','Wärme & Komfort'],
 ['Gaming-Setup für Einsteiger: die richtige Grundausstattung','gaming setup einsteiger','gaming','Gaming'],
 ['Herrenuhr-Guide: welcher Uhrentyp passt zu deinem Stil?','herrenuhr stil guide','herren-uhren','Herren-Uhren'],
];

const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const escAttr=s=>esc(s).replace(/"/g,'&quot;');

async function gemini(title,collName){
 const prompt=`Du bist SEO-Redakteur für den Schweizer Online-Shop LuxeStyle. Schreibe Rohmaterial für einen deutschen Kaufratgeber.
Titel: "${title}"
Gib NUR gültiges JSON zurück (keine Markdown-Fences), exakt dieses Schema:
{
 "meta": "SEO-Meta-Description, 140-160 Zeichen, mit Nutzen + 'bei LuxeStyle'",
 "tldr": ["3 bis 4 kurze, konkrete Kernaussagen (je max 120 Zeichen) – die Antwort auf die Kernfrage, wie sie eine KI zitieren würde"],
 "intro_html": "<p>…</p> 1 Absatz Einleitung (50-70 Wörter), du-Ansprache, natürlich",
 "body_html": "4-6 <h2>-Abschnitte mit <p> und wo sinnvoll <ul><li>. 500-700 Wörter. Praktische Kauf-Tipps, Kriterien, typische Fehler. Nur <h2>,<p>,<ul>,<li>,<strong>. KEINE Preise, keine erfundenen Marken/Fakten.",
 "faqs": [{"q":"echte Käuferfrage","a":"präzise 2-3 Satz-Antwort"}, … 4 Stück]
}
Schweizer Rechtschreibung (ss statt ß). Thema/Collection: ${collName}.`;
 const r=await fetchT(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GK}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.6,thinkingConfig:{thinkingBudget:0},responseMimeType:'application/json'}})},45000);
 const j=await r.json();
 try{const o=JSON.parse((j?.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join(''));
  if(o.body_html&&Array.isArray(o.faqs)&&o.faqs.length)return o;}catch{}
 return null;
}

// Rich-HTML-Zusammenbau: TL;DR-Box + Body + sichtbare FAQ + CTA + FAQPage/Article JSON-LD
function assemble(title,o,coll,collName){
 const tldr=(o.tldr||[]).slice(0,4).map(t=>`<li>${esc(t)}</li>`).join('');
 const faqVisible=o.faqs.map(f=>`<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('\n');
 const box=`<div style="background:#f7f4ee;border:1px solid #e7ddca;border-radius:12px;padding:14px 16px;margin:0 0 18px">
<strong>📌 Das Wichtigste in Kürze</strong><ul>${tldr}</ul></div>`;
 const cta=`<div style="background:linear-gradient(135deg,#20305a,#2b4a7a);color:#fff;border-radius:14px;padding:18px 20px;margin:22px 0 6px;text-align:center">
<div style="font-size:17px;font-weight:700;margin-bottom:6px">${esc(collName)} bei LuxeStyle entdecken</div>
<div style="opacity:.9;font-size:14px;margin-bottom:12px">🇨🇭 Schweizer Shop · Gratis-Versand ab CHF 50 · 30 Tage Rückgabe · –10 % mit Code <strong>WELCOME10</strong></div>
<a href="/collections/${coll}" style="display:inline-block;background:#c6a664;color:#1c1b19;font-weight:700;text-decoration:none;padding:12px 26px;border-radius:40px">Jetzt shoppen →</a></div>`;
 const faqLd={"@context":"https://schema.org","@type":"FAQPage","mainEntity":o.faqs.map(f=>({"@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a}}))};
 const artLd={"@context":"https://schema.org","@type":"Article","headline":title,"inLanguage":"de-CH","author":{"@type":"Organization","name":"LuxeStyle"},"publisher":{"@type":"Organization","name":"LuxeStyle","url":"https://luxestyle.ch"},"about":collName};
 const jsonld=`<script type="application/ld+json">${JSON.stringify(faqLd)}</script>\n<script type="application/ld+json">${JSON.stringify(artLd)}</script>`;
 return `${box}\n${o.intro_html||''}\n${o.body_html}\n<h2>Häufige Fragen</h2>\n${faqVisible}\n${cta}\n${jsonld}`;
}

const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.trim()).filter(Boolean):[]);
const blog=(await gql(`{blogs(first:5,query:"handle:ratgeber"){edges{node{id}}}}`))?.data?.blogs?.edges?.[0]?.node?.id;
if(!blog){console.error('Kein Ratgeber-Blog');process.exit(1);}
const ex=new Set();
{const a=await gql(`{blog(id:"${blog}"){articles(first:250){edges{node{title}}}}}`);(a?.data?.blog?.articles?.edges||[]).forEach(e=>ex.add(e.node.title.toLowerCase()));}
const CREATE=`mutation($a:ArticleCreateInput!){articleCreate(article:$a){article{id handle}userErrors{field message}}}`;
let made=0;
for(const [title,kw,coll,collName] of TOPICS){
 if(made>=CAP)break;
 if(done.has(title)||ex.has(title.toLowerCase()))continue;
 // Collection-Existenz + Produkte prüfen (kein CTA ins Leere)
 const cc=await gql(`{collectionByHandle(handle:"${coll}"){id productsCount{count}}}`);
 const okColl=cc?.data?.collectionByHandle && cc.data.collectionByHandle.productsCount.count>0;
 const useColl=okColl?coll:'all', useName=okColl?collName:'Alle Produkte';
 const o=await gemini(title,collName); await sleep(1200);
 if(!o){console.log(' skip(gemini)',title.slice(0,40));continue;}
 const html=assemble(title,o,useColl,useName);
 const summary=(o.meta||`${title} – der praktische Ratgeber von LuxeStyle.`).slice(0,300);
 if(!LIVE){console.log(`[DRY] ${title} — ${o.faqs.length} FAQ, ${html.length} Zeichen`);made++;continue;}
 const r=await gql(CREATE,{a:{blogId:blog,title,body:html,summary,isPublished:true,tags:['ratgeber','kaufberatung',kw],author:{name:'LuxeStyle Redaktion'}}});
 const e=r?.data?.articleCreate?.userErrors||[];
 if(e.length){console.log(' ⚠️',title.slice(0,30),JSON.stringify(e).slice(0,120));continue;}
 if(!r?.data?.articleCreate?.article?.id){console.log(' ⚠️',title.slice(0,30),'keine Article-ID → nicht als done markiert');continue;}
 done.add(title);fs.writeFileSync(LEDGER,[...done].join('\n')+'\n');made++;console.log(`✅ ${title}`);
 await sleep(500);
}
console.log(`\nFERTIG${LIVE?'':' [DRY]'}: ${made} Pro-Ratgeber (Rich-Schema + TL;DR + CTA).`);
