#!/usr/bin/env node
/* ratgeber_gemini — generiert original deutsche SEO-Kaufratgeber (Gemini) für Lücken-Themen und
 * publiziert sie im Ratgeber-Blog, mit internem Link zur passenden Collection. Content-Marketing
 * wie die grossen Shops → organischer Traffic. Idempotent (Titel-Check + Ledger). LIVE=1 schreibt.
 */
import fs from 'node:fs';
const SHOP=process.env.SHOPIFY_SHOP,API='2025-01',CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const GK=(fs.existsSync('/tmp/gemini_key')?fs.readFileSync('/tmp/gemini_key','utf8'):process.env.GEMINI_API_KEY||'').trim();
const LIVE=process.env.LIVE==='1';
const LEDGER='dropship/ratgeber_done.txt';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchT(u,o={},ms=45000){const ac=new AbortController();const to=setTimeout(()=>ac.abort(),ms);try{return await fetch(u,{...o,signal:ac.signal});}finally{clearTimeout(to);}}
const tok=async()=>{const r=await fetchT(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;};
let T=await tok();
const gql=async(q,v)=>{for(let a=0;a<5;a++){let r;try{r=await fetchT(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':T},body:JSON.stringify({query:q,variables:v})},30000);}catch{await sleep(1500);continue;}if(r.status===401){T=await tok();continue;}if(r.status===429||r.status>=500){await sleep((a+1)*1500);continue;}return r.json();}return null;};

// Ziel-Themen (Lücken) → Titel, Keyword, Collection
const TOPICS=[
 ['3D-Drucker kaufen: der grosse Einsteiger-Ratgeber 2026','3d-drucker','3d-druck','3D-Druck & Filament'],
 ['PLA, PETG oder Resin? Das richtige Filament finden','filament','3d-druck','3D-Druck & Filament'],
 ['3D-Stifte für Kinder & Kreative: worauf achten?','3d-stift','3d-druck','3D-Druck & Filament'],
 ['KNIPEX & Profi-Zangen: welche brauchst du wirklich?','knipex zange','elektriker-werkzeug','Werkzeug'],
 ['Akkuschrauber & Bohrmaschine kaufen: der Werkzeug-Guide','akkuschrauber','elektriker-werkzeug','Werkzeug'],
 ['Werkzeug-Grundausstattung: das gehört in jeden Haushalt','werkzeug grundausstattung','elektriker-werkzeug','Werkzeug'],
 ['Kopfhörer-Kaufberatung: In-Ear, Over-Ear oder True Wireless?','kopfhörer','elektronik-technik','Elektronik & Technik'],
 ['Smartwatch & Fitness-Tracker: welcher passt zu dir?','smartwatch','elektronik-technik','Elektronik & Technik'],
 ['Powerbank-Guide: die richtige Kapazität für unterwegs','powerbank','elektronik-technik','Elektronik & Technik'],
 ['Action-Cam & Kamera-Drohne für Einsteiger','action-cam drohne','elektronik-technik','Elektronik & Technik'],
 ['Damenmode-Grössen richtig messen: der Grössen-Guide','damen grössen','damen-mode','Damen-Mode'],
 ['Herren-Basics: die wichtigsten Kleidungsstücke im Schrank','herren basics','fur-ihn','Herren-Mode'],
 ['Haustier-Erstausstattung: Checkliste für Hund & Katze','haustier erstausstattung','sub-haustier','Haustierbedarf'],
 ['Edelstahl-Schmuck: langlebig, hautfreundlich & günstig','edelstahl schmuck','premium-schmuck','Schmuck'],
 ['Gaming-Zubehör-Guide: Controller, Headset & mehr','gaming zubehör','gaming','Gaming'],
 ['Beauty-Tools zuhause: Glätteisen, Lockenstab & Gesichtspflege','beauty tools','premium-beauty','Beauty'],
 ['Die richtige Armbanduhr: Quarz, Automatik oder Digital?','armbanduhr','uhren','Uhren'],
 ['Kaffeevollautomat, Siebträger oder Kapsel? Der Kaffee-Guide','kaffeemaschine','kaffee-maschinen','Kaffee & Espresso'],
];
const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
async function gemini(title,coll,collName){
 const prompt=`Schreibe einen hochwertigen, original deutschen SEO-Kaufratgeber-Blogartikel für den Schweizer Online-Shop LuxeStyle.
Titel: "${title}"
Anforderungen:
- 600–850 Wörter, du-Ansprache, natürlich & hilfreich (kein Marketing-Blabla, kein Denglisch).
- Struktur mit 4–6 Zwischenüberschriften als <h2>, kurze Absätze <p>, wo sinnvoll eine <ul>-Liste.
- Praktische Kauf-Tipps, worauf man achtet, typische Fehler, kurze Kaufberatung.
- Baue GENAU EINEN internen Link ein: <a href="/collections/${coll}">${collName} bei LuxeStyle entdecken</a> (natürlich im Text).
- Erfinde keine falschen technischen Fakten/Marken. Keine Preise nennen.
- Reines HTML (nur <h2>,<p>,<ul>,<li>,<strong>,<a>). KEIN <html>/<head>, kein Markdown, keine Code-Fences.
Gib NUR das Artikel-HTML zurück.`;
 const r=await fetchT(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GK}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.6,thinkingConfig:{thinkingBudget:0}}})},45000);
 const j=await r.json();let t=(j?.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('').trim().replace(/^```(html)?/i,'').replace(/```$/,'').trim();
 return t.length>400?t:null;
}

const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.trim()).filter(Boolean):[]);
const blog=(await gql(`{blogs(first:5,query:"handle:ratgeber"){edges{node{id}}}}`))?.data?.blogs?.edges?.[0]?.node?.id;
if(!blog){console.error('Kein Ratgeber-Blog');process.exit(1);}
// bestehende Titel (Dedupe)
const ex=new Set();
{const a=await gql(`{blog(id:"${blog}"){articles(first:200){edges{node{title}}}}}`);(a?.data?.blog?.articles?.edges||[]).forEach(e=>ex.add(e.node.title.toLowerCase()));}
const CREATE=`mutation($a:ArticleCreateInput!){articleCreate(article:$a){article{id handle}userErrors{field message}}}`;
let made=0;
for(const [title,kw,coll,collName] of TOPICS){
 if(done.has(title)||ex.has(title.toLowerCase())){continue;}
 const html=await gemini(title,coll,collName); await sleep(1500);
 if(!html){console.log(' skip(gemini)',title.slice(0,40));continue;}
 const summary=`${title} – der praktische Ratgeber von LuxeStyle: worauf du beim Kauf achten solltest.`;
 if(LIVE){
  const r=await gql(CREATE,{a:{blogId:blog,title,body:html,summary,isPublished:true,tags:['ratgeber','kaufberatung',kw],author:{name:'LuxeStyle Redaktion'}}});
  const e=r?.data?.articleCreate?.userErrors||[];
  if(e.length){console.log(' ⚠️',title.slice(0,30),JSON.stringify(e).slice(0,120));continue;}
  done.add(title);fs.writeFileSync(LEDGER,[...done].join('\n')+'\n');made++;console.log(`✅ ${title}`);
  await sleep(500);
 } else {console.log(`[DRY] ${title} (${html.length} Zeichen)`);made++;}
}
console.log(`\nFERTIG${LIVE?'':' [DRY]'}: ${made} Ratgeber-Artikel.`);
