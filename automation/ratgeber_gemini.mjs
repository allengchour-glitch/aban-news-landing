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
 ['Sommerkleider 2026: welche Schnitte stehen dir?','sommerkleid','damen-mode','Damen-Mode'],
 ['Die perfekte Jeans finden: Schnitte & Passformen erklärt','jeans','damen-mode','Damen-Mode'],
 ['Herren-Hemden richtig kombinieren: Business bis Casual','herrenhemd','fur-ihn','Herren-Mode'],
 ['Bettwäsche-Ratgeber: Material, Grösse & Pflege','bettwäsche','wohnen-dekoration','Wohnen & Deko'],
 ['Wohnen gemütlich einrichten: Deko-Tipps für jeden Raum','wohndeko','wohnen-dekoration','Wohnen & Deko'],
 ['Küchenhelfer, die jeder braucht: die smarte Grundausstattung','küchenhelfer','kuche-kochen','Küche & Kochen'],
 ['Make-up-Basics für Einsteiger: das Schmink-1x1','make-up','premium-beauty','Beauty'],
 ['Hautpflege-Routine: die richtige Reihenfolge Schritt für Schritt','hautpflege','premium-beauty','Beauty'],
 ['Nageldesign zuhause: Gel, Lack & Zubehör für schöne Nägel','nageldesign','naegel-manikuere','Nageldesign'],
 ['Grill-Ratgeber: Gas, Holzkohle oder Elektro?','grill','grill-bbq','Grill & BBQ'],
 ['Garten startklar machen: Werkzeug & Pflege im Überblick','gartenpflege','garten-balkon','Garten & Balkon'],
 ['Fitness zuhause: das Home-Gym-Starter-Set','fitness zuhause','fitness-training','Fitness & Training'],
 ['Yoga für Anfänger: Matte, Zubehör & erste Übungen','yoga','yoga-pilates','Yoga & Pilates'],
 ['E-Scooter & Velo: die richtige Wahl fürs Pendeln','e-scooter','e-scooter-trottinett','E-Scooter & Trottinett'],
 ['Sonnenbrillen-Guide: Form & UV-Schutz für dein Gesicht','sonnenbrille','sonnenbrillen-eyewear','Sonnenbrillen'],
 ['Handtaschen-Ratgeber: welche Tasche für welchen Anlass?','handtasche','sub-taschen','Taschen'],
 ['Parfum finden: Dufttypen & Tipps zum Auftragen','parfum','parfum-duefte','Parfum & Düfte'],
 ['Katzen-Erstausstattung: alles für den Stubentiger','katze','sub-haustier','Haustierbedarf'],
 ['Hundezubehör: Leine, Halsband, Bett & Spielzeug richtig wählen','hund','sub-haustier','Haustierbedarf'],
 ['Geschenkideen für Männer: Treffer statt Fehlkauf','geschenk mann','premium-geschenke','Geschenke'],
 ['Geschenkideen für Frauen: von klein bis besonders','geschenk frau','premium-geschenke','Geschenke'],
 ['Reise-Gadgets & Packliste: clever unterwegs','reise gadgets','reise-outdoor','Reise & Outdoor'],
 ['Camping-Ausrüstung für Einsteiger: die Basics','camping','camping-outdoor','Camping & Outdoor'],
 ['Ventilator oder Klimagerät? Cool durch den Sommer','ventilator','klima-ventilatoren','Klima & Ventilatoren'],
 ['Luftreiniger-Ratgeber: bessere Raumluft für Allergiker','luftreiniger','klima-ventilatoren','Klima & Ventilatoren'],
 ['Drohnen-Ratgeber: Kameradrohne für Einsteiger wählen','drohne','drohnen-kameras','Drohnen & Kameras'],
 ['Beamer fürs Heimkino: Auflösung, Helligkeit & Anschluss','beamer','beamer-projektoren','Beamer & Projektoren'],
 ['LED- & Stimmungslicht: das richtige Licht für dein Zuhause','led licht','beleuchtung','Beleuchtung'],
 ['Rucksack-Guide: der passende Rucksack für Alltag & Reise','rucksack','rucksaecke','Rucksäcke'],
 ['Trinkflaschen & Thermobecher: nachhaltig & praktisch','trinkflasche','kueche-kochen','Küche & Kochen'],
 // ── Welle 2: neue Lücken-Themen ──────────────────────────────────────────────
 ['Staubsauger-Roboter & Akku-Sauger: welches Modell passt zu dir?','staubsauger roboter','staubsauger-haushalt','Staubsauger & Haushalt'],
 ['Luftbefeuchter-Ratgeber: gesunde Raumluft für Winter & Büro','luftbefeuchter','klima-ventilatoren','Klima & Ventilatoren'],
 ['Bartpflege & Rasur: alles für den perfekten Bart','bartpflege','sub-bart-rasur','Bart & Rasur'],
 ['Wander- & Trekkingrucksack: der richtige Begleiter für die Berge','wanderrucksack','rucksaecke-sport','Sport- & Wanderrucksäcke'],
 ['Küchenmaschine & Standmixer: welches Küchengerät brauchst du wirklich?','küchenmaschine standmixer','sub-kueche','Küche & Kochen'],
 ['Heizdecke & Wärmeprodukte: kuschelig durch die kalte Jahreszeit','heizdecke','waerme-komfort','Wärme & Komfort'],
 ['Massagepistole & Faszien-Tools: Muskelregeneration für zuhause','massagepistole','sub-massage','Massage & Wellness'],
 ['Fahrrad-Zubehör: Licht, Schloss, Helm & Co richtig wählen','fahrrad zubehör','velo-radsport','Velo & Radsport'],
 ['Gartenbewässerung: Schlauch, Sprinkler & smarte Systeme im Vergleich','gartenbewässerung','garten-werkzeug-pflege','Garten-Werkzeug & Pflege'],
 ['Kinderspielzeug nach Alter: das passende Spielzeug für jede Phase','kinderspielzeug alter','kinderspielzeug','Kinderspielzeug'],
 ['Widerstandsbänder & Fitnessbänder: effektiv trainieren ohne Geräte','widerstandsbänder','fitness-training','Fitness & Training'],
 ['Aroma-Diffuser & Aromatherapie: Entspannung für dein Zuhause','aroma diffuser','sub-aroma-diffuser','Aroma & Diffuser'],
 ['Backformen & Backzubehör: gelingsicher backen wie ein Profi','backformen','kuechenhelfer','Küchenhelfer & Gadgets'],
 ['Powerstation & Solargenerator: Strom für Camping & Notfall','powerstation solar','camping-outdoor','Camping & Outdoor'],
 ['Wein- & Barzubehör: das richtige Equipment für Genuss zuhause','barzubehör wein','bar-wein','Bar & Wein'],
 ['Zimmerbeleuchtung planen: die richtige Lampe für jeden Raum','zimmerbeleuchtung','beleuchtung-lampen','Beleuchtung & Lampen'],
 ['Baby-Erstausstattung: die Checkliste für die ersten Monate','baby erstausstattung','sub-baby-kids','Baby & Kids'],
 ['Sneaker-Guide: den richtigen Sneaker für jeden Anlass finden','sneaker','schuhe-sneaker','Sneaker'],
 ['Trainingsanzug & Sport-Sets: bequem, sportlich & alltagstauglich','trainingsanzug','trainingsanzuege-sets','Trainingsanzüge & Sets'],
 ['Regenjacke & Funktionskleidung: trocken bleiben bei jedem Wetter','regenjacke','sport-outdoor','Sport & Outdoor'],
 ['Loungewear & Homewear: gemütlich zuhause & im Homeoffice','loungewear','loungewear','Loungewear'],
 ['Puzzles & Gesellschaftsspiele: Spielspass für die ganze Familie','puzzle gesellschaftsspiele','spielzeug-puzzles','Puzzles'],
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
