#!/usr/bin/env node
/* build_tech_departement — Interdiscount-style Elektronik-Untergliederung als Smart-Collections.
 * Produkte liegen bereits im Katalog, aber ohne Browse-by-Typ. Erstellt saubere Typ-Collections
 * (disjunktive TITLE-CONTAINS, PRICE_ASC), publiziert auf alle Kanäle, DE-Beschreibung+SEO+Hero.
 * Idempotent: existiert Handle → Update statt Create. LIVE via ENV SHOPIFY_*.
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const tk=async()=>{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;};
const t=await tk();
async function gql(q,v){for(let a=0;a<6;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}const j=await r.json();if((j?.data==null)&&Array.isArray(j?.errors)&&j.errors.some(e=>/THROTTLED/i.test(e?.extensions?.code||e?.message||''))){await sleep((a+1)*2500);continue;}return j;}return null;}

// alle Publications (Kanäle)
const pubs=(await gql(`{publications(first:20){edges{node{id name}}}}`))?.data?.publications?.edges?.map(e=>e.node)||[];
console.log('Kanäle:',pubs.map(p=>p.name).join(', '));

const CATS=[
 {h:'kopfhoerer-audio', t:'🎧 Kopfhörer & Audio', terms:['kopfhörer','headset','earbuds','ohrhörer','lautsprecher','soundbar','bluetooth-box'], d:'Kabellose Kopfhörer, In-Ears, Gaming-Headsets, Bluetooth-Lautsprecher & Soundbars – starker Sound zum fairen Preis.'},
 {h:'handy-zubehoer', t:'📱 Handy-Zubehör', terms:['handyhülle','panzerglas','ladekabel','ladegerät','powerbank','handyhalter','wireless charger'], d:'Powerbanks, Ladegeräte, Panzerglas, Hüllen & Halter für dein Smartphone – alles fürs Handy an einem Ort.'},
 {h:'computer-zubehoer', t:'🖥️ Computer & Zubehör', terms:['tastatur','gaming-maus','mauspad','webcam','usb-hub','dockingstation','monitor'], d:'Tastaturen, Mäuse, Webcams, USB-Hubs, Docking-Stations & Monitor-Zubehör für Büro und Gaming.'},
 {h:'speicher-datentraeger', t:'💾 Speicher & Datenträger', terms:['ssd','usb-stick','speicherkarte','sd-karte','externe festplatte'], d:'SSDs, externe Festplatten, USB-Sticks & Speicherkarten – schneller, zuverlässiger Speicher für alles.'},
 {h:'smartwatches-wearables', t:'⌚ Smartwatches & Wearables', terms:['smartwatch','fitness-tracker','fitnessarmband','fitnessuhr','smart-band'], d:'Smartwatches, Fitness-Tracker & Wearables – Gesundheit, Sport und Benachrichtigungen am Handgelenk.'},
 {h:'drohnen-fpv', t:'🚁 Drohnen & FPV', terms:['drohne','drone','quadrocopter'], d:'Falt-Drohnen mit HD-Kamera, Mini-Drohnen & FPV – abheben leicht gemacht, für Einsteiger und Profis.'},
 {h:'beamer-heimkino', t:'📽️ Beamer & Heimkino', terms:['beamer','heimkino','tv-stick','streaming-stick'], d:'Mini-Beamer, 4K-Heimkino-Projektoren, TV- & Streaming-Sticks – grosses Kino für zuhause.'},
];

for(const c of CATS){
  const rules=c.terms.map(term=>({column:'TITLE',relation:'CONTAINS',condition:term}));
  const seo={title:(c.t.replace(/^[^\p{L}]+/u,'')+' kaufen | LuxeStyle Schweiz').slice(0,70), description:(c.d+' Gratis-Versand ab CHF 65, 30 Tage Rückgabe.').slice(0,160)};
  // existiert?
  const ex=(await gql(`{collectionByHandle(handle:"${c.h}"){id}}`))?.data?.collectionByHandle;
  let id;
  if(ex){ id=ex.id;
    const u=await gql(`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}`,{i:{id, descriptionHtml:`<p>${c.d}</p>`, seo, ruleSet:{appliedDisjunctively:true, rules}, sortOrder:'PRICE_ASC'}});
    console.log(`~ Update ${c.h}`, JSON.stringify(u?.data?.collectionUpdate?.userErrors||[]).slice(0,80));
  } else {
    const cr=await gql(`mutation($i:CollectionInput!){collectionCreate(input:$i){collection{id}userErrors{message}}}`,{i:{title:c.t, handle:c.h, descriptionHtml:`<p>${c.d}</p>`, seo, ruleSet:{appliedDisjunctively:true, rules}, sortOrder:'PRICE_ASC'}});
    id=cr?.data?.collectionCreate?.collection?.id;
    console.log(`+ Create ${c.h}`, id?'ok':JSON.stringify(cr?.data?.collectionCreate?.userErrors||cr).slice(0,100));
  }
  if(!id) continue;
  await sleep(800);
  // Hero aus erstem aktivem Produkt
  const cd=await gql(`{collection(id:"${id}"){image{url} productsCount{count} products(first:5){edges{node{status featuredImage{url}}}}}}`);
  const cn=cd?.data?.collection;
  if(cn && !cn.image){ const pi=(cn.products?.edges||[]).map(e=>e.node).find(n=>n.status==='ACTIVE'&&n.featuredImage?.url)?.featuredImage?.url; if(pi){ await gql(`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}`,{i:{id, image:{src:pi, altText:c.t}}}); } }
  // publish auf alle Kanäle
  for(const p of pubs){ await gql(`mutation($id:ID!,$pid:ID!){publishablePublish(id:$id,input:[{publicationId:$pid}]){userErrors{message}}}`,{id, pid:p.id}); }
  console.log(`   → ${cn?.productsCount?.count} Produkte, publiziert auf ${pubs.length} Kanäle`);
  await sleep(500);
}
console.log('\nFertig — Elektronik-Departement gebaut.');
