#!/usr/bin/env node
/* create_subcollections — erstellt Smart-Sub-Collections (Titel-Regeln) für grosse Collections,
 * publiziert sie in alle Kanäle. Reduziert Scrollen, gibt Kund:innen gezielte Einstiege.
 * Idempotent: überspringt existierende Handles. DRY-Default, LIVE=1 schreibt. ENV: SHOPIFY_*.
 * Wiederverwendbar — neue Sub-Definitionen unten in SUBS ergänzen.
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}

// Sub-Definitionen: handle, title, und Titel-Stichwörter (Smart-Rule TITLE CONTAINS, disjunktiv)
const SUBS=[
 // Garten & Balkon (290)
 {handle:'garten-pflanzgefaesse',title:'🪴 Pflanzgefässe & Töpfe',words:['topf','pflanz','kübel','kubel','blumen','übertopf','ubertopf','jardin','vase']},
 {handle:'garten-leuchten',title:'🔆 Gartenleuchten & Solar',words:['gartenleuchte','solarleuchte','gartenlampe','solar','aussenleuchte','wegeleuchte','laterne']},
 {handle:'garten-deko-outdoor',title:'🌸 Gartendeko',words:['gartenfigur','gartendeko','vogelhaus','windspiel','dekofigur','gartenstecker','figur']},
 {handle:'garten-werkzeug-pflege',title:'✂️ Garten-Werkzeug & Pflege',words:['gartenschere','giesskanne','gie','gartenwerkzeug','schaufel','harke','handschuh']},
 // Camping & Outdoor (173)
 {handle:'camping-schlafen',title:'⛺ Zelte & Schlafsäcke',words:['zelt','schlafsack','isomatte','feldbett','luftbett','matte']},
 {handle:'camping-kueche',title:'🍳 Camping-Küche',words:['campinggeschirr','campingkocher','kühlbox','kuhlbox','thermo','besteck','geschirr','flasche']},
 {handle:'camping-licht-outdoor',title:'🔦 Outdoor-Licht & Tools',words:['stirnlampe','campinglampe','campingleuchte','outdoor-lampe','laterne']},
 // Bar & Wein (140)
 {handle:'bar-glaeser',title:'🥃 Gläser',words:['weinglas','weingläser','sektglas','sektgläser','whiskyglas','whiskygläser','cocktailglas','biergläser','trinkglas','gläser-set']},
 {handle:'bar-cocktail',title:'🍸 Cocktail & Shaker',words:['cocktail','shaker','barzubehör','barset','bar-set','jigger','sieb']},
 {handle:'bar-wein-accessoires',title:'🍷 Wein-Accessoires',words:['dekanter','korkenzieher','weinkühler','weinkuhler','belüfter','beluefter','flaschenöffner','flaschenoffner','wein']},
 // Rucksäcke (113)
 {handle:'rucksaecke-schule',title:'🎒 Schulrucksäcke',words:['schulrucksack','schulranzen','kinderrucksack','schultasche']},
 {handle:'rucksaecke-laptop',title:'💼 Laptop- & Business-Rucksäcke',words:['laptop-rucksack','laptoprucksack','business-rucksack','notebook-rucksack']},
 {handle:'rucksaecke-sport',title:'🏔️ Sport- & Wanderrucksäcke',words:['sportrucksack','wanderrucksack','trekkingrucksack','daypack','outdoor-rucksack']},
 // Schuhe (223) — Wettbewerbs-Collection (Galaxus-Nische)
 {handle:'schuhe-sneaker',title:'👟 Sneaker',words:['sneaker','turnschuh','laufschuh']},
 {handle:'schuhe-sandalen',title:'🩴 Sandalen & Espadrilles',words:['sandale','sandalette','espadrille','zehentrenner','flip-flop','pantolette']},
 {handle:'schuhe-stiefel',title:'🥾 Stiefel & Boots',words:['stiefel','boots','stiefelette','chelsea']},
 // Beauty (325)
 {handle:'beauty-makeup',title:'💄 Make-up',words:['lippenstift','mascara','foundation','lidschatten','concealer','eyeliner','rouge','nagellack','make-up','lipgloss','highlighter']},
 // Sonnenbrillen (172)
 {handle:'sonnenbrillen-damen',title:'🕶️ Sonnenbrillen Damen',words:['damen-sonnenbrille','cat-eye','oversized','schmetterling']},
 {handle:'sonnenbrillen-herren',title:'🕶️ Sonnenbrillen Herren',words:['herren-sonnenbrille','pilotenbrille','aviator','wayfarer','sport-sonnenbrille']},
];

const t=await tk(); if(!t){console.error('Kein Token');process.exit(1);}
// Online-Store + alle Publications holen
const pr=await gql(t,`{publications(first:20){edges{node{id name}}}}`);
const pubs=pr.data.publications.edges.map(e=>({publicationId:e.node.id}));
// existierende Handles prüfen
let created=0,skipped=0;
for(const s of SUBS){
 const ex=await gql(t,`{collectionByHandle(handle:"${s.handle}"){id}}`);
 if(ex?.data?.collectionByHandle){console.log('↩︎ existiert:',s.handle);skipped++;continue;}
 const rules=s.words.map(w=>({column:'TITLE',relation:'CONTAINS',condition:w}));
 if(!LIVE){console.log('（DRY) würde anlegen:',s.handle,'·',s.title,'·',rules.length,'Regeln');created++;continue;}
 const r=await gql(t,`mutation($i:CollectionInput!){collectionCreate(input:$i){collection{id} userErrors{message}}}`,
   {i:{handle:s.handle,title:s.title,ruleSet:{appliedDisjunctively:true,rules},descriptionHtml:`<p>${s.title} bei LuxeStyle – kuratierte Auswahl. 🇨🇭 Gratis-Versand ab CHF 65 · 30 Tage Rückgabe · Code WELCOME10 = –10%.</p>`,seo:{title:`${s.title.replace(/^[^\p{L}]+/u,'')} kaufen | LuxeStyle Schweiz`,description:`${s.title.replace(/^[^\p{L}]+/u,'')} online kaufen bei LuxeStyle – Gratis-Versand ab CHF 65.`}}});
 const e=r?.data?.collectionCreate?.userErrors||[];
 if(e.length){console.log('⚠️',s.handle,JSON.stringify(e).slice(0,120));skipped++;continue;}
 const id=r.data.collectionCreate.collection.id;
 await gql(t,`mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,input:$p){userErrors{message}}}`,{id,p:pubs});
 console.log('✅ angelegt+publiziert:',s.handle,'·',s.title);created++; await sleep(400);
}
console.log(`\nFertig. Angelegt: ${created} · übersprungen: ${skipped} ${LIVE?'':'(DRY)'}`);
