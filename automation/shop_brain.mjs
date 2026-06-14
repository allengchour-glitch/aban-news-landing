#!/usr/bin/env node
/**
 * shop_brain.mjs (v2) — LuxeStyle Shop-Brain als portables Node-Skript.
 * Gleiche Logik wie workers/shop-brain/worker.js, läuft in GitHub Actions,
 * GitLab CI oder lokal. Wartet den Shop automatisch:
 *   1) Produkt-Veredelung: neueste cj-real-Produkte → fehlende SEO (Titel + Description)
 *      + Kategorie (Google-Feed) setzen.
 *   2) Collection-Cover: Smart-/Manual-Collections ohne Titelbild bekommen ein Cover
 *      aus einem eigenen Produktbild (sieht in den Kategorie-Grids sonst unfertig aus).
 *   3) Bild-QA: aktive Produkte ohne Bild werden erkannt + gemeldet (kein Auto-Löschen).
 *
 * Env: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET
 *      [SHOPIFY_API_VERSION=2025-01] [SCAN_LIMIT=50] [TELEGRAM_BOT_TOKEN] [TELEGRAM_CHAT_ID] [DRY=1]
 * Aufruf:  node automation/shop_brain.mjs
 */
const SHOP = process.env.SHOPIFY_SHOP || "";
const CID = process.env.SHOPIFY_CLIENT_ID || "";
const SECRET = process.env.SHOPIFY_CLIENT_SECRET || "";
const API = process.env.SHOPIFY_API_VERSION || "2025-01";
const LIMIT = parseInt(process.env.SCAN_LIMIT || "50", 10);
const DRY = process.env.DRY === "1";
const COL_MAX = parseInt(process.env.COLLECTION_COVER_MAX || "30", 10); // max Cover-Fixes pro Lauf
const TC = "gid://shopify/TaxonomyCategory/";

const CAT = {
  "Schmuck":"aa-6","Damen-Schmuck":"aa-6","Halskette":"aa-6","Ohrringe":"aa-6","Armband":"aa-6","Ring":"aa-6",
  "Uhren":"aa-6-11","Sonnenbrille":"aa-2-27","Hut":"aa-2-17","Sonnenhut":"aa-2-17","Mütze":"aa-2-17","Cap":"aa-2-17",
  "Tasche":"aa-5-4","Taschen":"aa-5-4","Rucksack":"aa-5-4","Taschen & Reise":"aa-5-4","Taschen & Accessoires":"aa-5-4",
  "Schuhe":"aa-8","Sneaker":"aa-8","Sandalen":"aa-8","Sandalette":"aa-8","Pumps":"aa-8","Ballerina":"aa-8",
  "Slip-on":"aa-8","Slides":"aa-8","Herren-Schuhe":"aa-8","Damen-Schuhe":"aa-8","Damen-Sandalen":"aa-8",
  "Kleid":"aa-1-4","Damen-Kleid":"aa-1-4","Accessoires":"aa-2","Accessoire":"aa-2",
  "Damenmode":"aa-1","Damen-Mode":"aa-1","Herrenmode":"aa-1","Herren-Mode":"aa-1","Mode":"aa-1","Shirt":"aa-1",
  "Damen-Top":"aa-1","Damen-Set":"aa-1","Blazer":"aa-1","Damen-Blazer":"aa-1","Cardigan":"aa-1","Damen-Cardigan":"aa-1",
  "Jacke":"aa-1","Bluse":"aa-1","Damen-Bluse":"aa-1","Rock":"aa-1","Damen-Rock":"aa-1","Shorts":"aa-1",
  "Damen-Shorts":"aa-1","Damen-Hose":"aa-1","Weste":"aa-1","Jumpsuit":"aa-1","Damen-Jumpsuit":"aa-1",
  "Jeans":"aa-1","Set":"aa-1","Sport-Set":"aa-1","Herren-Set":"aa-1","Hose":"aa-1","Top":"aa-1","Pullover":"aa-1",
  "Hemd":"aa-1","Kurzarm-Hemd":"aa-1","Tank-Top":"aa-1","Tanktop":"aa-1","Polo":"aa-1","Poloshirt":"aa-1","T-Shirt":"aa-1",
  "Bikini":"aa-1","Badeanzug":"aa-1","Bademode":"aa-1","Badeshorts":"aa-1","Strandkleid":"aa-1","Mantel":"aa-1","Trainingsanzug":"aa-1",
  "Beauty":"hb-3-2-6","Beauty & Pflege":"hb-3-2-6","Beauty-Tool":"hb-3-2-9","Hautpflege":"hb-3-2-9",
  "Wellness & Spa":"hb-3-11-9","Wellness":"hb-3-11-9","Aroma-Diffuser":"hb-3-11-9","Massage":"hb-3-11-9","Luftbefeuchter":"hb-3-11-9",
  "Beleuchtung":"hg-13-5","Garten & Beleuchtung":"hg-13-5",
  "Küche":"hg-11-8","Küche & Haushalt":"hg-11-8","Küchenhelfer":"hg-11-8","Trinkflasche":"hg-11-8","Trinkflaschen":"hg-11-8",
  "Wohnen":"hg-3","Deko":"hg-3","Wohnaccessoire":"hg-3","Schlafen & Wohnen":"hg-3","Deko & Wohnaccessoires":"hg-3","Vase":"hg-3-67",
  "Elektronik":"el","Tech":"el","Tech-Gadget":"el","Gadget":"el","Sommer-Gadget":"el","Outdoor & Gadget":"el","Handy-Zubehör":"el","Kopfhörer":"el",
  "Audio":"el-2","Sommer & Kühlung":"hg-9-1-6","Ventilator":"hg-9-1-6",
  "Haustier":"ap-2","Haustier & Sommer":"ap-2","Auto-Zubehör":"vp-1","Spielzeug":"tg-5",
  "Bad":"hg-1","Bad & Wellness":"hg-1",
  "Outdoor":"hg-12","Outdoor & Sommer":"hg-12","Sport & Outdoor":"hg-12","Reise & Outdoor":"hg-12",
  "Reise-Zubehör":"hg-12","Garten & Pflanzen":"hg-12","Grill-Zubehör":"hg-12","Garten":"hg-12","Camping":"hg-12",
  "Grill & BBQ":"hg-12","Pool & Strand":"hg-12",
  "Haushalt":"hg","Haushalt & Hobby":"hg","Wellness & Haushalt":"hg","Aufbewahrung":"hg","Büro & Home Office":"hg","Büro":"hg",
};
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{2190}-\u{21FF}\u{2300}-\u{23FF}]/gu;
const clean = (s) => (s || "").replace(EMOJI, "").replace(/\s{2,}/g, " ").trim().replace(/[ ,;:·–-]+$/, "");
function mkTitle(name){ let n=clean(name); if(n.length>50){let c=n.slice(0,50); if(c.includes(" "))c=c.slice(0,c.lastIndexOf(" ")); n=c.replace(/[ ,;:·–-]+$/,"");} return (n+" | LuxeStyle").slice(0,70); }
const mkDesc = (name)=>`${clean(name)}: jetzt im Schweizer Online-Shop LuxeStyle. Faire Preise, schnelle Lieferung (7–14 Tage), 30 Tage Rückgabe. −10% mit Code WELCOME10.`.slice(0,320);
const esc = (s)=>s.replace(/\\/g,"\\\\").replace(/"/g,'\\"');

async function getToken(){
  const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({client_id:CID,client_secret:SECRET,grant_type:"client_credentials"})});
  const j=await r.json().catch(()=>({})); return j.access_token||"";
}
async function gql(token,query){
  const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:"POST",
    headers:{"Content-Type":"application/json","X-Shopify-Access-Token":token},body:JSON.stringify({query})});
  return r.json();
}
async function runMutations(token,items,build){
  let done=0;
  for(let i=0;i<items.length;i+=20){
    const chunk=items.slice(i,i+20);
    const m="mutation {\n"+chunk.map((f,j)=>build(f,j)).join("\n")+"\n}";
    const res=await gql(token,m);
    if(res?.data) done+=chunk.length; else console.error("mutation-fehler:",JSON.stringify(res?.errors||res).slice(0,300));
  }
  return done;
}

(async()=>{
  if(!SHOP||!CID||!SECRET){ console.error("❌ SHOPIFY_SHOP/CLIENT_ID/CLIENT_SECRET fehlen → No-op."); process.exit(SHOP?1:0); }
  const token=await getToken();
  if(!token){ console.error("❌ Kein Shopify-Token (Client-Credentials prüfen)."); process.exit(1); }

  // ---------- 1) Produkt-Veredelung (SEO + Kategorie) + Bild-QA ----------
  const pq=`{ products(first:${LIMIT}, query:"status:active tag:cj-real", sortKey:CREATED_AT, reverse:true){ nodes{ id title productType category{id} seo{title description} featuredImage{ url } } } }`;
  const pdata=await gql(token,pq);
  const nodes=pdata?.data?.products?.nodes||[];
  const prodFixes=[]; const noImage=[];
  for(const n of nodes){
    if(!n.featuredImage) noImage.push(clean(n.title).slice(0,60));
    const needSeo=!(n.seo&&n.seo.title&&n.seo.description);
    const needCat=!n.category && CAT[(n.productType||"").trim()];
    if(!needSeo&&!needCat) continue;
    let input=`id: "${n.id}"`;
    if(needCat) input+=`, category: "${TC}${CAT[n.productType.trim()]}"`;
    if(needSeo) input+=`, seo: { title: "${esc(mkTitle(n.title))}", description: "${esc(mkDesc(n.title))}" }`;
    prodFixes.push({input,title:n.title});
  }

  // ---------- 2) Collection-Cover (leere Kategorien bebildern) ----------
  const cq=`{ collections(first:250){ nodes{ id handle title image{ url } products(first:5){ nodes{ featuredImage{ url } } } } } }`;
  const cdata=await gql(token,cq);
  const colls=cdata?.data?.collections?.nodes||[];
  const colFixes=[];
  for(const c of colls){
    if(c.image) continue;
    const img=(c.products?.nodes||[]).map(p=>p.featuredImage&&p.featuredImage.url).find(Boolean);
    if(img) colFixes.push({id:c.id, handle:c.handle, src:img, alt:clean(c.title)||"LuxeStyle"});
    if(colFixes.length>=COL_MAX) break;
  }

  console.log(`🧠 Produkte: ${nodes.length} geprüft · ${prodFixes.length} zu veredeln · ${noImage.length} ohne Bild`);
  console.log(`🖼️ Collections: ${colls.length} geprüft · ${colFixes.length} Cover zu setzen${DRY?" (DRY)":""}`);

  let pDone=0, cDone=0;
  if(!DRY){
    pDone=await runMutations(token,prodFixes,(f,j)=>`  f${j}: productUpdate(input: { ${f.input} }) { product { id } userErrors { field message } }`);
    cDone=await runMutations(token,colFixes,(f,j)=>`  c${j}: collectionUpdate(input: { id: "${f.id}", image: { src: "${esc(f.src)}", altText: "${esc(f.alt)} bei LuxeStyle" } }) { collection { id } userErrors { field message } }`);
  }
  for(const f of prodFixes) console.log("  ✓ SEO/Kat:",clean(f.title).slice(0,60));
  for(const f of colFixes) console.log("  ✓ Cover:",f.handle);
  if(noImage.length) console.log("  ⚠️ Ohne Bild (prüfen):",noImage.join(" · "));

  const status=`🧠 Shop-Brain v2: ${prodFixes.length} veredelt · ${cDone} Cover · ${noImage.length} ohne Bild · ${new Date().toISOString()}`;
  console.log(status);
  if(process.env.TELEGRAM_BOT_TOKEN&&process.env.TELEGRAM_CHAT_ID&&!DRY&&(prodFixes.length||cDone||noImage.length)){
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,{method:"POST",
      headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:process.env.TELEGRAM_CHAT_ID,text:status})}).catch(()=>{});
  }
})().catch(e=>{console.error("Fehler:",e.message);process.exit(1);});
