#!/usr/bin/env node
/* build_baby_departement — Parent Smart-Collection "👶 Baby & Kleinkind".
 * Rule (disjunktiv): TAG=baby OR TAG=kinder OR TITLE CONTAINS baby/kleinkind/säugling.
 * PRICE_ASC, alle Kanäle, DE-Beschreibung+SEO+Hero. Idempotent (Handle existiert → Update).
 * Sub-Collections (Pflege/Spielzeug/Ausstattung) sind zu dünn (<12 saubere Treffer) → NICHT erstellt.
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const tk=async()=>{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;};
const t=await tk();
async function gql(q,v){for(let a=0;a<6;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}const j=await r.json();if((j?.data==null)&&Array.isArray(j?.errors)&&j.errors.some(e=>/THROTTLED/i.test(e?.extensions?.code||e?.message||''))){await sleep((a+1)*2500);continue;}return j;}return null;}

const pubs=(await gql(`{publications(first:20){edges{node{id name}}}}`))?.data?.publications?.edges?.map(e=>e.node)||[];
console.log('Kanäle:',pubs.map(p=>p.name).join(', '));

const h='baby-kleinkind', title='👶 Baby & Kleinkind';
const d='Alles für Baby & Kleinkind: von Spielzeug, Plüsch & Motorik über Body, Lätzchen & Pflege bis Nachtlicht und Ausstattung. Liebevoll ausgewählt für die Kleinsten – sicher, praktisch und niedlich.';
const rules=[
 {column:'TAG',relation:'EQUALS',condition:'baby'},
 {column:'TAG',relation:'EQUALS',condition:'kinder'},
 {column:'TITLE',relation:'CONTAINS',condition:'baby'},
 {column:'TITLE',relation:'CONTAINS',condition:'kleinkind'},
 {column:'TITLE',relation:'CONTAINS',condition:'säugling'},
];
const seo={title:'Baby & Kleinkind kaufen | LuxeStyle Schweiz', description:('Baby & Kleinkind: Spielzeug, Plüsch, Body, Lätzchen, Pflege & Ausstattung für die Kleinsten. '+'Gratis-Versand ab CHF 65, 30 Tage Rückgabe.').slice(0,160)};

const ex=(await gql(`{collectionByHandle(handle:"${h}"){id}}`))?.data?.collectionByHandle;
let id;
if(ex){ id=ex.id;
  const u=await gql(`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{field message}}}`,{i:{id,descriptionHtml:`<p>${d}</p>`,seo,ruleSet:{appliedDisjunctively:true,rules},sortOrder:'PRICE_ASC'}});
  console.log(`~ Update ${h}`, JSON.stringify(u?.data?.collectionUpdate?.userErrors||[]));
} else {
  const cr=await gql(`mutation($i:CollectionInput!){collectionCreate(input:$i){collection{id}userErrors{field message}}}`,{i:{title,handle:h,descriptionHtml:`<p>${d}</p>`,seo,ruleSet:{appliedDisjunctively:true,rules},sortOrder:'PRICE_ASC'}});
  id=cr?.data?.collectionCreate?.collection?.id;
  console.log(`+ Create ${h}`, id?'ok':JSON.stringify(cr?.data?.collectionCreate?.userErrors||cr));
}
if(id){
  await sleep(1500);
  const cd=await gql(`{collection(id:"${id}"){image{url}productsCount{count}products(first:10){edges{node{status featuredImage{url}}}}}}`);
  const cn=cd?.data?.collection;
  if(cn&&!cn.image){const pi=(cn.products?.edges||[]).map(e=>e.node).find(n=>n.status==='ACTIVE'&&n.featuredImage?.url)?.featuredImage?.url;if(pi){await gql(`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}`,{i:{id,image:{src:pi,altText:title}}});console.log('  Hero gesetzt');}}
  for(const p of pubs){await gql(`mutation($id:ID!,$pid:ID!){publishablePublish(id:$id,input:[{publicationId:$pid}]){userErrors{message}}}`,{id,pid:p.id});}
  console.log(`→ ${cn?.productsCount?.count} Produkte, publiziert auf ${pubs.length} Kanäle`);
}
console.log('Fertig.');
