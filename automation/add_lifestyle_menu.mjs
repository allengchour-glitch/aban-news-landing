#!/usr/bin/env node
/* add_lifestyle_menu — fügt EIN neues Top-Level-Dropdown "✨ Lifestyle & Trends" zum Main-Menu hinzu.
 * Bewahrt ALLE bestehenden Top-Level-Items + Subitems EXAKT (3 Ebenen gemappt).
 * Verifiziert jeden child-Handle (collectionByHandle, productsCount>0) — droppt fehlende.
 * Fügt das neue Dropdown direkt nach "Trends & Gadgets" ein. Idempotent.
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const MENU='gid://shopify/Menu/310224093569';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const tk=async()=>{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;};
const t=await tk();
async function gql(q,v){for(let a=0;a<6;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}const j=await r.json();if(j?.errors&&JSON.stringify(j.errors).includes('THROTTLED')){await sleep((a+1)*2000);continue;}return j;}return null;}

async function exists(h){const r=await gql(`{collectionByHandle(handle:"${h}"){id productsCount{count}}}`);const c=r?.data?.collectionByHandle;return c?{ok:c.productsCount.count>0,count:c.productsCount.count}:{ok:false,count:0};}
const link=(title,h)=>({title,type:'HTTP',url:'/collections/'+h});

// Neues Dropdown: geprüfte children
const NEW_TITLE='✨ Lifestyle & Trends';
const NEW_CHILDREN=[
 ['🧘 Wellness','wellness-selfcare'],
 ['🧔 Herren-Grooming','herren-grooming'],
 ['🧳 Reise-Gadgets','reise-gadgets'],
 ['🖥️ Home-Office','home-office-setup'],
 ['💡 LED-Ambiente','led-ambiente'],
 ['🐾 Haustier-Gadgets','haustier-gadgets'],
 ['🎁 Geschenke für Ihn','geschenke-fuer-ihn'],
 ['🎁 Geschenke für Sie','geschenke-fuer-sie'],
];

// FULL menu, 3 Ebenen
const cur=(await gql(`{menu(id:"${MENU}"){title handle items{title url items{title url items{title url}}}}}`))?.data?.menu;
if(!cur){console.error('Menu weg');process.exit(1);}

console.log('=== VORHER: Top-Level ('+cur.items.length+') ===');
cur.items.forEach(i=>console.log(`  • ${i.title}${i.items?.length?' → '+i.items.length+' Sub':''}`));

// Guard: bereits vorhanden?
if(cur.items.some(i=>i.title===NEW_TITLE)){console.log('\n⚠️ Dropdown "'+NEW_TITLE+'" existiert bereits — überspringe (idempotent).');process.exit(0);}

// children verifizieren
console.log('\n=== Verifiziere neue children ===');
const kids=[];
for(const [ti,h] of NEW_CHILDREN){const e=await exists(h);if(e.ok){kids.push(link(ti,h));console.log(`  ✓ ${ti} → ${h} (${e.count} Produkte)`);}else{console.log(`  ✗ ${ti} → ${h} (fehlt/leer, count=${e.count}) — GEDROPPT`);}}

// bestehende Items EXAKT mappen (3 Ebenen), neues Dropdown nach "Trends & Gadgets" einfügen
const mapSub=s=>({title:s.title,type:'HTTP',url:s.url,...(s.items?.length?{items:s.items.map(x=>({title:x.title,type:'HTTP',url:x.url}))}:{})});
const newDD={title:NEW_TITLE,type:'HTTP',url:'/collections/all',items:kids};
const out=[];
for(const it of cur.items){
  out.push({title:it.title,type:'HTTP',url:it.url,...(it.items?.length?{items:it.items.map(mapSub)}:{})});
  if(/Trends & Gadgets/.test(it.title)) out.push(newDD);
}
// Falls "Trends & Gadgets" nicht gefunden: ans Ende
if(!out.some(i=>i.title===NEW_TITLE)) out.push(newDD);

const u=await gql(`mutation($id:ID!,$title:String!,$handle:String!,$items:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$title,handle:$handle,items:$items){menu{items{title items{title items{title}}}}userErrors{message field}}}`,
 {id:MENU,title:cur.title,handle:cur.handle,items:out});
const res=u?.data?.menuUpdate;
if(res?.userErrors?.length){console.error('FEHLER:',JSON.stringify(res.userErrors));process.exit(1);}

console.log('\n=== NACHHER: Top-Level ('+res.menu.items.length+') ===');
res.menu.items.forEach(i=>console.log(`  • ${i.title}${i.items?.length?' → '+i.items.length+' Sub':''}`));
const nd=res.menu.items.find(i=>i.title===NEW_TITLE);
console.log('\n=== Neues Dropdown "'+NEW_TITLE+'" children ===');
nd?.items?.forEach(c=>console.log('  - '+c.title));
console.log(`\nBilanz: vorher ${cur.items.length} → nachher ${res.menu.items.length} Top-Level (Δ ${res.menu.items.length-cur.items.length}).`);
