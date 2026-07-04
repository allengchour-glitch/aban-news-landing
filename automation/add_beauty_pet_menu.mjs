#!/usr/bin/env node
/* add_beauty_pet_menu — fügt 2 neue Top-Level-Dropdowns hinzu: 💄 Beauty & Pflege + 🐾 Haustier.
 * Bewahrt ALLE bestehenden Items+Subitems exakt. Verifiziert child-Handles (existiert + Produkte). Idempotent.
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const MENU='gid://shopify/Menu/310224093569';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const tk=async()=>{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;};
const t=await tk();
async function gql(q,v){for(let a=0;a<6;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}
async function exists(h){const r=await gql(`{collectionByHandle(handle:"${h}"){id productsCount{count}}}`);return !!r?.data?.collectionByHandle && r.data.collectionByHandle.productsCount.count>0;}
const link=(title,h)=>({title,type:'HTTP',url:'/collections/'+h});

const NEW=[
 {title:'💄 Beauty & Pflege', url:'/collections/premium-beauty', kids:[['💋 Make-up','make-up'],['🧴 Hautpflege','hautpflege'],['💇 Haarpflege','haarpflege'],['💅 Nägel & Nagellack','naegel'],['💆 Beauty-Geräte','beauty-geraete'],['✨ IPL & Haarentfernung','ipl-haarentfernung']]},
 {title:'🐾 Haustier', url:'/collections/sub-haustier', kids:[['🐶 Hunde-Zubehör','haustier-hund'],['🐱 Katzen-Zubehör','haustier-katze'],['🍖 Futter & Näpfe','haustier-futter-naepfe'],['🤖 Haustier-Gadgets','haustier-gadgets']]},
];

const cur=(await gql(`{menu(id:"${MENU}"){title handle items{title url items{title url}}}}`))?.data?.menu;
if(!cur){console.error('Menu weg');process.exit(1);}
// bestehende Items 1:1
const out=cur.items.filter(i=>!NEW.some(n=>n.title===i.title)).map(it=>({title:it.title,type:'HTTP',url:it.url,items:(it.items||[]).map(s=>({title:s.title,type:'HTTP',url:s.url}))}));
// parent-URL nur setzen wenn Collection existiert, sonst /collections/all
for(const n of NEW){
  const kids=[]; for(const [ti,h] of n.kids){ if(await exists(h)) kids.push(link(ti,h)); else console.log('  (fehlt):',h); }
  const purl = (await exists(n.url.replace('/collections/',''))) ? n.url : '/collections/all';
  // einfügen vor "📖 Ratgeber" (oder ans Ende)
  let idx=out.findIndex(i=>/Ratgeber/i.test(i.title)); if(idx<0) idx=out.length;
  out.splice(idx,0,{title:n.title,type:'HTTP',url:purl,items:kids});
  console.log(`+ ${n.title}: ${kids.length} Unterpunkte`);
}
const u=await gql(`mutation($id:ID!,$title:String!,$handle:String!,$items:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$title,handle:$handle,items:$items){menu{items{title items{title}}}userErrors{message field}}}`,
 {id:MENU,title:cur.title,handle:cur.handle,items:out});
const res=u?.data?.menuUpdate;
if(res?.userErrors?.length){console.error('FEHLER:',JSON.stringify(res.userErrors));process.exit(1);}
console.log('✅ Menü aktualisiert. Top-Level:',res?.menu?.items?.length);
res?.menu?.items?.filter(i=>/Beauty|Haustier/.test(i.title)).forEach(i=>console.log('  •',i.title,'→',i.items.map(s=>s.title).join(', ')));
