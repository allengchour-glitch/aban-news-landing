/* make_subcollections.mjs — legt selbst-füllende Smart-Sub-Collections an (Titel-Regeln, kein Re-Tagging)
 * und publiziert sie in alle Kanäle (Publish-Falle!). Erst Preview der Treffer, nur >0 anlegen. Idempotent
 * (existierendes Handle → skip). ENV: SHOPIFY_CLIENT_ID/SECRET [DRY=1]
 */
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const SHOP='au3j0y-hq.myshopify.com';
const DRY=process.env.DRY==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const PUBS=['301970915713','301971014017','302032716161','302566834561','302872297857','302994456961'].map(i=>`gid://shopify/Publication/${i}`);
async function scc(){for(let a=0;a<5;a++){try{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});const t=JSON.parse(await r.text()).access_token;if(t)return t;}catch{}await sleep(2000*(a+1));}throw new Error('scc');}
let TOK; async function gql(q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(JSON.stringify(j.errors||'').includes('Throttled')){await sleep(4000);continue;}TOK=await scc();await sleep(1000);}return{};}

// column TITLE, relation CONTAINS. appliedDisjunctively=true (OR).
const SPEC=[
  // 🐾 Haustier feiner
  {handle:'haustier-hund', title:'🐕 Für den Hund', terms:['Hund','Hunde','Leine','Hundegeschirr','Hundebett','Hundenapf'], desc:'Alles für den Hund — von Leine bis Napf.'},
  {handle:'haustier-katze', title:'🐈 Für die Katze', terms:['Katze','Katzen','Kratzbaum','Katzenklo','Katzennetz'], desc:'Zubehör für Samtpfoten — Spiel, Pflege & Komfort.'},
  {handle:'haustier-napf-futter', title:'🍽️ Näpfe & Futter-Zubehör', terms:['Napf','Fressnapf','Futternapf','Trinkbrunnen','Futterspender'], desc:'Näpfe, Trinkbrunnen & Futterhelfer.'},
  // 💡 Beleuchtung feiner
  {handle:'licht-led-strip', title:'🌈 LED-Strips & Lichterketten', terms:['LED-Strip','LED Streifen','LED-Band','Lichtband','Lichterkette','Lichtschlauch'], desc:'Stimmungslicht: LED-Bänder, Strips & Lichterketten.'},
  {handle:'licht-tischlampe', title:'🛋️ Tisch- & Schreibtischlampen', terms:['Tischlampe','Schreibtischlampe','Nachttischlampe','Tischleuchte'], desc:'Lampen für Schreibtisch, Nachttisch & Wohnzimmer.'},
  {handle:'licht-decken-steh', title:'🏛️ Steh- & Deckenlampen', terms:['Stehlampe','Stehleuchte','Deckenlampe','Deckenleuchte','Hängelampe','Pendelleuchte'], desc:'Grosse Lichtquellen für den Raum.'},
  {handle:'licht-nachtlicht-projektor', title:'🌙 Nachtlicht & Projektoren', terms:['Nachtlicht','Sternenhimmel','Sternenprojektor','Galaxie-Projektor','Projektionslampe'], desc:'Sanftes Licht & Sternenhimmel fürs Kinderzimmer.'},
  {handle:'licht-solar-aussen', title:'☀️ Solar- & Aussenleuchten', terms:['Solarlampe','Solarleuchte','Solar-','Aussenleuchte','Gartenleuchte','Wegleuchte'], desc:'Solar & Aussenbeleuchtung für Garten & Balkon.'},
];

async function previewCount(terms){
  const q='('+terms.map(t=>`title:*${t}*`).join(' OR ')+') AND status:active';
  const r=await gql(`query($q:String!){productsCount(query:$q){count}}`,{q});
  return r.data?.productsCount?.count ?? 0;
}
async function exists(handle){ const r=await gql(`query($q:String!){collections(first:5,query:$q){edges{node{id handle}}}}`,{q:'handle:'+handle}); return r.data?.collections?.edges?.find(e=>e.node.handle===handle)?.node?.id||null; }  // exakt, kein Fuzzy

TOK=await scc();
for(const s of SPEC){
  const cnt=await previewCount(s.terms);
  const ex=await exists(s.handle);
  console.log(`${s.handle.padEnd(28)} Treffer≈${String(cnt).padStart(4)}  ${ex?'(existiert → skip)':''}`);
  if(ex||DRY||cnt<3) continue;
  const rules=s.terms.map(t=>({column:'TITLE',relation:'CONTAINS',condition:t}));
  const cr=await gql(`mutation($in:CollectionInput!){collectionCreate(input:$in){collection{id handle}userErrors{field message}}}`,
    {in:{title:s.title, handle:s.handle, descriptionHtml:`<p>${s.desc}</p>`, ruleSet:{appliedDisjunctively:true, rules}}});
  const col=cr.data?.collectionCreate?.collection;
  const errs=cr.data?.collectionCreate?.userErrors||[];
  if(!col){ console.log('   FEHLER:',JSON.stringify(errs).slice(0,140)); continue; }
  // publizieren (Publish-Falle!)
  for(const pid of PUBS){ await gql(`mutation($id:ID!,$pid:ID!){publishablePublish(id:$id,input:{publicationId:$pid}){userErrors{message}}}`,{id:col.id,pid}); await sleep(150); }
  console.log('   ✅ angelegt + publiziert:',col.handle);
  await sleep(400);
}
console.log('FERTIG.');
