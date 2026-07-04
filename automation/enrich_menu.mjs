#!/usr/bin/env node
/* enrich_menu — erweitert bestehende Main-Menu-Punkte zu Browse-by-Typ-Dropdowns (Departements).
 * Bewahrt ALLE Top-Level-Items; ersetzt nur die children der Ziel-Items durch geprüfte Sub-Collections.
 * Verifiziert jeden child-Handle (collectionByHandle) — droppt fehlende. Idempotent.
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const MENU='gid://shopify/Menu/310224093569';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const tk=async()=>{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;};
const t=await tk();
async function gql(q,v){for(let a=0;a<6;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}

async function exists(h){const r=await gql(`{collectionByHandle(handle:"${h}"){id productsCount{count}}}`);return !!r?.data?.collectionByHandle && r.data.collectionByHandle.productsCount.count>0;}
const link=(title,h)=>({title,type:'HTTP',url:'/collections/'+h});

// Ziel-Erweiterungen: bestehender Top-Level-Titel (Teilstring) → neue children
const ENRICH=[
 {match:/^Frauen/, children:[['👗 Kleider','sub-kleider'],['👚 Blusen & Tops','damen-blusen'],['👖 Hosen & Leggings','damen-hosen'],['👗 Röcke','sub-roecke'],['🧥 Jacken & Mäntel','damen-jacken-maentel'],['🧶 Strick & Pullover','damen-strick-pullover'],['👟 Damen-Schuhe','damen-schuhe']]},
 {match:/^Herren/, children:[['🧔 Grooming & Bartpflege','herren-grooming'],['👟 Herren-Schuhe','herren-schuhe'],['⌚ Herren-Uhren','herren-uhren']]},
 {match:/^Schmuck/, children:[['💍 Ringe','sub-ringe'],['📿 Halsketten','sub-halsketten'],['💎 Ohrringe','sub-ohrringe'],['💫 Armbänder','sub-armbaender'],['🎁 Schmuck-Sets','schmuck-sets'],['⌚ Uhren','uhren']]},
 {match:/Werkzeug & Garten/, children:[['🔨 Handwerkzeug','handwerkzeug'],['⚡ Elektrowerkzeug','elektrowerkzeug'],['📏 Messwerkzeug','messwerkzeug'],['🧰 Werkzeugkoffer & Sets','werkzeugkoffer-sets'],['🦺 Arbeitskleidung','arbeitskleidung']]},
 {match:/Wohnen & Wellness/, children:[['🧘 Wellness & Selfcare','wellness-selfcare'],['💡 LED & Ambiente','led-ambiente'],['🍳 Küchen-Gadgets','kuechen-gadgets'],['🐾 Haustier-Gadgets','haustier-gadgets'],['🌿 Nachhaltig & Eco','nachhaltig-eco'],['🖥️ Home-Office','home-office-setup']]},
 {match:/Trends & Gadgets/, children:[['⚡ Hightech & Gadgets','hightech-gadgets'],['🤖 Smart Home','smart-home-gadgets'],['🧳 Reise-Gadgets','reise-gadgets'],['🎨 Basteln & DIY','basteln-diy'],['💆 Beauty-Geräte','beauty-geraete']]},
];

const cur=(await gql(`{menu(id:"${MENU}"){title handle items{title url items{title url}}}}`))?.data?.menu;
if(!cur){console.error('Menu weg');process.exit(1);}

const out=[];
for(const it of cur.items){
  const e=ENRICH.find(x=>x.match.test(it.title));
  if(e){
    const kids=[];
    for(const [ti,h] of e.children){ if(await exists(h)) kids.push(link(ti,h)); else console.log('  (fehlt, übersprungen):',h); }
    out.push({title:it.title,type:'HTTP',url:it.url,items:kids});
    console.log(`~ ${it.title}: ${kids.length} Unterpunkte`);
  } else {
    out.push({title:it.title,type:'HTTP',url:it.url,items:(it.items||[]).map(s=>({title:s.title,type:'HTTP',url:s.url}))});
  }
}
const u=await gql(`mutation($id:ID!,$title:String!,$handle:String!,$items:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$title,handle:$handle,items:$items){menu{items{title items{title}}}userErrors{message field}}}`,
 {id:MENU,title:cur.title,handle:cur.handle,items:out});
const res=u?.data?.menuUpdate;
if(res?.userErrors?.length){console.error('FEHLER:',JSON.stringify(res.userErrors));process.exit(1);}
console.log('✅ Menü aktualisiert. Top-Level:',res?.menu?.items?.length);
res?.menu?.items?.filter(i=>i.items?.length).forEach(i=>console.log('  •',i.title,'→',i.items.length,'Unterpunkte'));
