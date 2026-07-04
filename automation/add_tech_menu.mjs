#!/usr/bin/env node
/* add_tech_menu — fügt dem Main-Menu ein "📱 Elektronik & Technik"-Dropdown mit 7 Typ-Untercollections hinzu
 * (Interdiscount-Style Browse-by-Typ). Bewahrt ALLE bestehenden Items exakt, fügt nur das neue Dropdown ein.
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const tk=async()=>{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;};
const t=await tk();
async function gql(q,v){for(let a=0;a<6;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}

const MENU='gid://shopify/Menu/310224093569';
const cur=(await gql(`{menu(id:"${MENU}"){id title handle items{title url items{title url}}}}`))?.data?.menu;
if(!cur){console.error('Menu nicht gefunden');process.exit(1);}

// bestehende Items 1:1 als Input (type HTTP + url; Storefront löst relative URLs auf)
const toInput=it=>({title:it.title, type:'HTTP', url:it.url, items:(it.items||[]).map(s=>({title:s.title,type:'HTTP',url:s.url}))});
const items=cur.items.map(toInput);

const techItem={ title:'📱 Elektronik & Technik', type:'HTTP', url:'/collections/elektronik-technik', items:[
 {title:'⚡ Hightech & Gadgets', type:'HTTP', url:'/collections/hightech-gadgets'},
 {title:'🎧 Kopfhörer & Audio', type:'HTTP', url:'/collections/kopfhoerer-audio'},
 {title:'📱 Handy-Zubehör', type:'HTTP', url:'/collections/handy-zubehoer'},
 {title:'🖥️ Computer & Zubehör', type:'HTTP', url:'/collections/computer-zubehoer'},
 {title:'💻 Laptop- & Tablet-Zubehör', type:'HTTP', url:'/collections/laptop-tablet-zubehoer'},
 {title:'💾 Speicher & Datenträger', type:'HTTP', url:'/collections/speicher-datentraeger'},
 {title:'⌚ Smartwatches & Wearables', type:'HTTP', url:'/collections/smartwatches-wearables'},
 {title:'🚁 Drohnen & FPV', type:'HTTP', url:'/collections/drohnen-fpv'},
 {title:'📽️ Beamer & Heimkino', type:'HTTP', url:'/collections/beamer-heimkino'},
 {title:'🎮 Gaming', type:'HTTP', url:'/collections/gaming'},
]};

// bereits vorhanden? (idempotent)
if(cur.items.some(i=>i.title.includes('Elektronik & Technik'))){ console.log('Tech-Menü existiert schon → ersetze es.'); }
const filtered=items.filter(i=>!i.title.includes('Elektronik & Technik'));
// einfügen nach "Trends & Gadgets" (oder ans Ende der Produkt-Items, vor Ratgeber)
let idx=filtered.findIndex(i=>/Trends & Gadgets/i.test(i.title));
if(idx<0) idx=filtered.findIndex(i=>/Ratgeber/i.test(i.title))-1;
if(idx<0) idx=filtered.length-1;
filtered.splice(idx+1,0,techItem);

const u=await gql(`mutation($id:ID!,$title:String!,$handle:String!,$items:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$title,handle:$handle,items:$items){menu{id items{title items{title}}}userErrors{message field}}}`,
 {id:MENU, title:cur.title, handle:cur.handle, items:filtered});
const res=u?.data?.menuUpdate;
if(res?.userErrors?.length){console.error('Fehler:',JSON.stringify(res.userErrors));process.exit(1);}
console.log('✅ Menü aktualisiert. Top-Level-Items:', res?.menu?.items?.length);
const tech=res?.menu?.items?.find(i=>i.title.includes('Elektronik'));
console.log('   Tech-Dropdown Unterpunkte:', tech?.items?.map(s=>s.title).join(', '));
