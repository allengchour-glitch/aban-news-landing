#!/usr/bin/env node
/* build_winter_kaelte — Saisonal-Evergreen Smart-Collection "❄️ Winter & Kälte".
 * Disjunktive TITLE-CONTAINS auf verifiziert saubere Terme, PRICE_ASC, alle Kanäle, DE Desc+SEO+Hero.
 * Idempotent: Handle existiert → Update statt Create. LIVE via ENV SHOPIFY_*.
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const tk=async()=>{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;};
const t=await tk();
async function gql(q,v){for(let a=0;a<6;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}const j=await r.json();if((j?.data==null)&&Array.isArray(j?.errors)&&j.errors.some(e=>/THROTTLED/i.test(e?.extensions?.code||e?.message||''))){await sleep((a+1)*2500);continue;}return j;}return null;}

const pubs=(await gql(`{publications(first:20){edges{node{id name}}}}`))?.data?.publications?.edges?.map(e=>e.node)||[];
console.log('Kanäle:',pubs.map(p=>p.name).join(', '));

const c={
  h:'winter-kaelte',
  t:'❄️ Winter & Kälte',
  terms:['heizung','heizdecke','handschuhe','handwärmer','beheizbar','winter'],
  d:'Warm durch die kalte Jahreszeit: elektrische Heizungen & Heizdecken, warme Winterhandschuhe, beheizbare Kleidung und Handwärmer. Alles gegen Kälte an einem Ort – wohlige Wärme für Zuhause und unterwegs.'
};

const rules=c.terms.map(term=>({column:'TITLE',relation:'CONTAINS',condition:term}));
const seo={title:('Winter & Kälte · Heizung, Heizdecke, Handschuhe | LuxeStyle').slice(0,70), description:(c.d+' Gratis-Versand ab CHF 50, 30 Tage Rückgabe.').slice(0,160)};

const ex=(await gql(`{collectionByHandle(handle:"${c.h}"){id}}`))?.data?.collectionByHandle;
let id;
if(ex){ id=ex.id;
  const u=await gql(`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}`,{i:{id, descriptionHtml:`<p>${c.d}</p>`, seo, ruleSet:{appliedDisjunctively:true, rules}, sortOrder:'PRICE_ASC'}});
  console.log(`~ Update ${c.h}`, JSON.stringify(u?.data?.collectionUpdate?.userErrors||[]).slice(0,120));
} else {
  const cr=await gql(`mutation($i:CollectionInput!){collectionCreate(input:$i){collection{id}userErrors{message}}}`,{i:{title:c.t, handle:c.h, descriptionHtml:`<p>${c.d}</p>`, seo, ruleSet:{appliedDisjunctively:true, rules}, sortOrder:'PRICE_ASC'}});
  id=cr?.data?.collectionCreate?.collection?.id;
  console.log(`+ Create ${c.h}`, id?'ok '+id:JSON.stringify(cr?.data?.collectionCreate?.userErrors||cr).slice(0,200));
}
if(!id){console.log('FAIL no id');process.exit(1);}
await sleep(1500);

// Hero aus erstem aktivem Produkt mit Bild
const cd=await gql(`{collection(id:"${id}"){image{url} productsCount{count} products(first:20){edges{node{title status featuredImage{url}}}}}}`);
const cn=cd?.data?.collection;
if(cn && !cn.image){ const pi=(cn.products?.edges||[]).map(e=>e.node).find(n=>n.status==='ACTIVE'&&n.featuredImage?.url)?.featuredImage?.url; if(pi){ await gql(`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}`,{i:{id, image:{src:pi, altText:c.t}}}); console.log('Hero gesetzt'); } }

// publish auf alle Kanäle
for(const p of pubs){ await gql(`mutation($id:ID!,$pid:ID!){publishablePublish(id:$id,input:[{publicationId:$pid}]){userErrors{message}}}`,{id, pid:p.id}); }
console.log(`→ ${cn?.productsCount?.count} Produkte, publiziert auf ${pubs.length} Kanäle`);
console.log('Sample-Titel:');
(cn?.products?.edges||[]).slice(0,15).forEach(e=>console.log(`  [${e.node.status}] ${e.node.title}`));
console.log('\nFertig — Winter & Kälte gebaut. Handle: /collections/'+c.h);
