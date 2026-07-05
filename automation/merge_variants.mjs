#!/usr/bin/env node
/* merge_variants — führt Farb-/Grössen-Geschwister (dieselbe Basis, versch. Farbe/Grösse als SEPARATE
 * Produkte importiert) zu EINEM Produkt mit Auswahl zusammen. FULFILLMENT-SICHER: jede SKU bleibt pro
 * Variante erhalten. REVERSIBEL: Originale werden ARCHIVIERT (nicht gelöscht) + alte URLs → neues Produkt.
 * Pro Farbe wird das jeweilige Bild an die Variante gehängt.
 * ENV: MATCH="teilstring der normalisierten basis" · LIVE=1 · CAP-Gruppen via SCANALL=1
 * Nutzt /tmp/sh_tok.txt (Admin-Token).
 */
import fs from 'node:fs';
const SHOP='au3j0y-hq.myshopify.com',API='2025-01';
const ST=fs.readFileSync('/tmp/sh_tok.txt','utf8').trim();
const LIVE=process.env.LIVE==='1';
const MATCH=(process.env.MATCH||'').toLowerCase();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function gql(q,v){for(let a=0;a<6;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':ST},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*1500);continue;}return r.json();}return null;}

const COLORS='schwarz|weiss|weiß|rot|blau|marineblau|hellblau|dunkelblau|grün|gruen|gelb|grau|hellgrau|dunkelgrau|rosa|rosé|rose|pink|beige|braun|lila|violett|orange|türkis|tuerkis|gold|silber|creme|khaki|bordeaux|mint|navy|apricot|champagner|himbeer|weinrot|armeegrün';
const CRE=new RegExp('\\b('+COLORS+')\\b','i');
const CGL=new RegExp('\\b('+COLORS+')\\b','ig');
const SIZE=/(?<![A-Za-zÀ-ÿ])(xxs|xs|s|m|l|xl|xxl|xxxl|[2-6]xl|one size|onesize)(?![A-Za-zÀ-ÿ])/gi;
const DIM=/\d{1,3}([.,]\d)?\s?x\s?\d{1,3}([.,]\d)?(\s?x\s?\d{1,3}([.,]\d)?)?\s?(cm|mm)?/i;
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const titleCase=s=>s.replace(/\s+/g,' ').trim().split(' ').map(w=>/^[A-Za-zÀ-ÿ]/.test(w)?cap(w):w).join(' ');
const normBase=t=>t.toLowerCase().replace(CGL,'').replace(DIM,'').replace(SIZE,'').replace(/[«»"'·–\-()]/g,' ').replace(/\bcm\b|\bmm\b|\bØ\b/gi,'').replace(/\s+/g,' ').trim();
const colorOf=t=>{const m=t.match(CRE);return m?cap(m[1]):null;};
// ASCII+Umlaut-sichere Grenzen: Grössen NUR wenn nicht an Buchstaben angrenzend (sonst frisst \bL\b das L in "Lässiger")
const SZRE=/(?:\/\s*|·\s*|grösse\s*|groesse\s*|gr\.\s*)?(?<![A-Za-zÀ-ÿ])(XXS|XS|S|M|L|XL|XXL|XXXL|[2-6]XL)(?![A-Za-zÀ-ÿ])/i;
const sizeOf=t=>{const m=t.match(SZRE);return m?m[1].toUpperCase():null;};
const dimOf=t=>{const m=t.match(DIM);return m?m[0].replace(/\s+/g,' ').replace(',', '.').trim():null;};
// wählt die Achse, entlang der die Geschwister sich unterscheiden
function pickAxis(titles){
  const col=titles.map(colorOf), sz=titles.map(sizeOf), dm=titles.map(dimOf);
  const uniq=a=>[...new Set(a.filter(Boolean))];
  if(uniq(col).length>=3 && col.filter(Boolean).length>=titles.length-1) return {name:'Farbe',of:colorOf};
  if(uniq(sz).length>=3 && sz.filter(Boolean).length>=titles.length-1) return {name:'Grösse',of:sizeOf};
  if(uniq(dm).length>=3 && dm.filter(Boolean).length>=titles.length-1) return {name:'Grösse',of:dimOf};
  return null;
}

// ---- Gruppen sammeln (aktive Produkte) ----
async function collectGroups(){
  let cursor=null, groups={};
  for(let pg=0;pg<40;pg++){
    const q=`{ products(first:250${cursor?`,after:"${cursor}"`:''}, query:"status:active"){ pageInfo{hasNextPage endCursor} edges{ node{ id title vendor } } } }`;
    const j=await gql(q); const d=j?.data?.products; if(!d)break;
    for(const e of d.edges){ const key=normBase(e.node.title)+'|'+(e.node.vendor||''); (groups[key]=groups[key]||[]).push({id:e.node.id,title:e.node.title}); }
    if(!d.pageInfo.hasNextPage)break; cursor=d.pageInfo.endCursor; await sleep(200);
  }
  return groups;
}
async function full(id){
  const q=`{ product(id:"${id}"){ id title handle descriptionHtml vendor productType tags status
    featuredImage{url} media(first:10){edges{node{... on MediaImage{image{url}}}}}
    variants(first:5){edges{node{price sku inventoryPolicy}}}
    resourcePublicationsV2(first:20){edges{node{publication{id}}}} } }`;
  return (await gql(q))?.data?.product;
}
const PUB=`mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,input:$p){userErrors{message}}}`;
const SET=`mutation($i:ProductSetInput!){productSet(synchronous:true,input:$i){product{id handle variants(first:20){edges{node{id sku title image{url}}}} media(first:20){edges{node{id ... on MediaImage{image{url}}}}}}userErrors{message}}}`;
const VMEDIA=`mutation($pid:ID!,$vid:ID!,$mid:[ID!]!){productVariantAppendMedia(productId:$pid,variantMedia:[{variantId:$vid,mediaIds:$mid}]){userErrors{message}}}`;
const ARCH=`mutation($id:ID!){productUpdate(input:{id:$id,status:ARCHIVED}){userErrors{message}}}`;
const REDIR=`mutation($p:String!,$t:String!){urlRedirectCreate(urlRedirect:{path:$p,target:$t}){userErrors{message}}}`;

async function mergeGroup(members){
  const det=[]; for(const m of members){ const f=await full(m.id); if(f) det.push(f); await sleep(180); }
  const axis=pickAxis(det.map(d=>d.title));
  if(!axis){console.log('  → übersprungen (keine klare Farb-/Grössen-Achse)');return null;}
  // pro Achsenwert das erste Produkt mit Bild (Dubletten gleicher Wert = echte Doppel, eines gewinnt)
  const byVal=new Map();
  for(const d of det){ const v=axis.of(d.title); if(!v||!d.featuredImage)continue; if(!byVal.has(v)) byVal.set(v,d); }
  let sibs=[...byVal.entries()].map(([val,d])=>({val,d}));
  if(sibs.length<3){console.log(`  → übersprungen (nur ${sibs.length} eindeutige ${axis.name}-Werte)`);return null;}
  // Preis-Kohärenz-Schutz: echte Varianten kosten ähnlich; Preisausreisser = anderes Modell → raus
  const pr=s=>parseFloat(s.d.variants.edges[0]?.node.price||'0')||0;
  const sorted=sibs.map(pr).filter(x=>x>0).sort((a,b)=>a-b);
  const med=sorted[Math.floor(sorted.length/2)]||0;
  const kept=sibs.filter(s=>{const p=pr(s);return p>0 && p>=med/1.8 && p<=med*1.8;});
  if(kept.length<3){console.log(`  → übersprungen (Preise inkohärent: ${sibs.map(pr).join('/')} → nur ${kept.length} kohärent)`);return null;}
  if(kept.length<sibs.length) console.log(`  ⓘ ${sibs.length-kept.length} Preisausreisser verworfen (Median CHF ${med})`);
  sibs=kept;
  const base=det[0];
  const title=titleCase(normBase(base.title));
  const tags=[...new Set(det.flatMap(d=>d.tags))];
  const desc=det.map(d=>d.descriptionHtml||'').sort((a,b)=>b.length-a.length)[0];
  const pubs=[...new Set(base.resourcePublicationsV2.edges.map(e=>e.node.publication.id))].map(id=>({publicationId:id}));
  const input={title,vendor:base.vendor,productType:base.productType,status:'ACTIVE',tags,descriptionHtml:desc,
    seo:{title:(title+' | LuxeStyle').slice(0,70)},
    productOptions:[{name:axis.name,values:sibs.map(s=>({name:s.val}))}],
    files:sibs.map(s=>({originalSource:s.d.featuredImage.url,contentType:'IMAGE'})),
    variants:sibs.map(s=>({optionValues:[{optionName:axis.name,name:s.val}],price:s.d.variants.edges[0]?.node.price||'0',
      inventoryItem:{sku:s.d.variants.edges[0]?.node.sku||'',tracked:false},inventoryPolicy:'CONTINUE'}))};
  console.log(`  MERGE "${title}" ← ${sibs.length} ${axis.name}: ${sibs.map(s=>s.val).join(', ')}`);
  if(!LIVE){console.log('  [DRY]');return {dry:true};}
  const r=await gql(SET,{i:input}); const e=r.data?.productSet?.userErrors||[]; const prod=r.data?.productSet?.product;
  if(e.length||!prod){console.log('  ✗ productSet',JSON.stringify(e).slice(0,140));return null;}
  const mediaByUrl={}; for(const me of prod.media.edges){ if(me.node.image) mediaByUrl[me.node.image.url]=me.node.id; }
  for(let i=0;i<sibs.length;i++){ const s=sibs[i]; const vEdge=prod.variants.edges.find(v=>v.node.sku===(s.d.variants.edges[0]?.node.sku));
    const mid=mediaByUrl[s.d.featuredImage.url] || Object.values(mediaByUrl)[i];
    if(vEdge&&mid){ await gql(VMEDIA,{pid:prod.id,vid:vEdge.node.id,mid:[mid]}); await sleep(180);} }
  await gql(PUB,{id:prod.id,p:pubs});
  for(const d of det){ if(d.id===prod.id)continue; await gql(ARCH,{id:d.id}); if(d.handle) await gql(REDIR,{p:'/products/'+d.handle,t:'/products/'+prod.handle}); await sleep(160); }
  console.log(`  ✅ ${prod.handle} — ${sibs.length} Varianten (${axis.name}), ${det.length-1} Originale archiviert+umgeleitet`);
  return prod;
}

const groups=await collectGroups();
const cand=Object.entries(groups).filter(([k,v])=>v.length>=3 && k.length>14);
console.log('Kandidaten-Gruppen:',cand.length);
let targets;
if(MATCH){ targets=cand.filter(([k])=>k.includes(MATCH)); console.log('MATCH-Filter:',targets.length,'Gruppe(n)'); }
else { targets=cand; }
let done=0;
for(const [k,v] of targets){
  console.log(`\n[${v.length}x] ${v[0].title.slice(0,54)}`);
  const r=await mergeGroup(v); if(r)done++;
  if(process.env.ONE==='1')break;
}
console.log(`\nFERTIG${LIVE?'':' [DRY]'}: ${done} Gruppen zusammengeführt.`);
