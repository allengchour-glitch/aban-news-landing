const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET, SHOP='au3j0y-hq.myshopify.com';
const DRY=process.env.DRY==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const PUBS=['301970915713','301971014017','302032716161','302566834561','302872297857','302994456961'].map(i=>`gid://shopify/Publication/${i}`);
async function scc(){for(let a=0;a<5;a++){try{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});const t=JSON.parse(await r.text()).access_token;if(t)return t;}catch{}await sleep(2000);}throw new Error('scc');}
let TOK; async function gql(q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(JSON.stringify(j.errors||'').includes('hrottl')){await sleep(4000);continue;}TOK=await scc();await sleep(800);}return{};}
const SPEC=[
 {handle:'uhren-herren',title:'⌚ Herrenuhren',terms:['Herrenuhr','Herren-Uhr','Herren Uhr']},
 {handle:'uhren-damen',title:'⌚ Damenuhren',terms:['Damenuhr','Damen-Uhr','Damen Uhr']},
 {handle:'uhren-smart',title:'⌚ Smartwatches & Tracker',terms:['Smartwatch','Smart Watch','Fitness-Tracker','Fitnessuhr','Fitness-Uhr']},
 {handle:'schuhe-sneaker',title:'👟 Sneaker',terms:['Sneaker','Turnschuh']},
 {handle:'schuhe-sandalen',title:'👡 Sandalen',terms:['Sandale','Zehentrenner','Flip-Flop','Flip Flop']},
 {handle:'schuhe-stiefel',title:'👢 Stiefel & Boots',terms:['Stiefel','Stiefelette','Chelsea Boots']},
 {handle:'schuhe-absatz',title:'👠 High Heels & Pumps',terms:['High Heel','Pumps','Stiletto','Absatzschuh']},
 {handle:'beauty-makeup',title:'💄 Make-up',terms:['Lippenstift','Mascara','Lidschatten','Foundation','Concealer','Eyeliner','Make-up','Makeup']},
 {handle:'beauty-hautpflege',title:'🧴 Hautpflege',terms:['Gesichtsserum','Gesichtscreme','Hautpflege','Feuchtigkeitscreme','Anti-Aging','Gesichtsmaske']},
 {handle:'beauty-haar',title:'💇 Haarpflege & Styling',terms:['Haartrockner','Föhn','Glätteisen','Lockenstab','Haarbürste','Perücke']},
 {handle:'beauty-naegel',title:'💅 Nageldesign',terms:['Nagellack','Maniküre','Nageldesign','Nagelset','Gelnägel','Nagelpatch']},
 {handle:'beauty-duefte',title:'🌸 Parfum & Düfte',terms:['Parfum','Parfüm','Eau de Toilette','Eau de Parfum']},
 {handle:'wohnen-kueche',title:'🍳 Küche',terms:['Küchen','Schneidebrett','Küchenhelfer','Pfanne','Kochtopf','Küchenmaschine']},
 {handle:'wohnen-bad',title:'🛁 Badezimmer',terms:['Badezimmer','Duschkopf','Seifenspender','Handtuchhalter','Zahnputz']},
 {handle:'wohnen-aufbewahrung',title:'📦 Aufbewahrung & Ordnung',terms:['Aufbewahrung','Organizer','Aufbewahrungsbox','Ordnungssystem']},
 {handle:'elektronik-audio',title:'🎧 Kopfhörer & Lautsprecher',terms:['Kopfhörer','Ohrhörer','Earbuds','Bluetooth-Lautsprecher','Lautsprecher']},
 {handle:'elektronik-laden',title:'🔌 Ladegeräte & Powerbanks',terms:['Ladegerät','Powerbank','Ladestation','Ladekabel','Wireless Charger']},
 {handle:'elektronik-handy',title:'📱 Handy-Zubehör',terms:['Handyhülle','Handy-Hülle','Panzerglas','Handyhalter','Handy-Halter']},
 {handle:'damen-jacken',title:'🧥 Damen Jacken & Mäntel',terms:['Damenjacke','Damen-Mantel','Damen Blazer','Strickjacke','Cardigan']},
 {handle:'damen-hosen',title:'👖 Damen Hosen & Jeans',terms:['Damenhose','Leggings','Damen Jeans','Damen-Jeans','Palazzohose']},
];
async function cnt(terms){const q='('+terms.map(t=>`title:*${t}*`).join(' OR ')+') AND status:active';const r=await gql(`query($q:String!){productsCount(query:$q){count}}`,{q});return r.data?.productsCount?.count??0;}
async function exists(h){const r=await gql(`query($q:String!){collections(first:5,query:$q){edges{node{handle}}}}`,{q:'handle:'+h});return !!r.data?.collections?.edges?.find(e=>e.node.handle===h);}
TOK=await scc();
let created=0;
for(const s of SPEC){
  const c=await cnt(s.terms); const ex=await exists(s.handle);
  console.log(`${s.handle.padEnd(24)} ${String(c).padStart(5)}  ${ex?'(existiert)':(c<15?'(zu wenig)':'')}`);
  if(DRY||ex||c<15)continue;
  const rules=s.terms.map(t=>({column:'TITLE',relation:'CONTAINS',condition:t}));
  const cr=await gql(`mutation($in:CollectionInput!){collectionCreate(input:$in){collection{id handle}userErrors{message}}}`,{in:{title:s.title,handle:s.handle,descriptionHtml:`<p>${s.title} bei LuxeStyle — kuratierte Auswahl, Blitzversand aus der Schweiz.</p>`,ruleSet:{appliedDisjunctively:true,rules}}});
  const col=cr.data?.collectionCreate?.collection;
  if(!col){console.log('   FEHLER:',JSON.stringify(cr.data?.collectionCreate?.userErrors||'').slice(0,100));continue;}
  for(const pid of PUBS){await gql(`mutation($id:ID!,$pid:ID!){publishablePublish(id:$id,input:{publicationId:$pid}){userErrors{message}}}`,{id:col.id,pid});await sleep(120);}
  created++; console.log('   ✅ angelegt + publiziert');
  await sleep(300);
}
console.log(`\n${DRY?'DRY':'FERTIG'} — angelegt: ${created}`);
