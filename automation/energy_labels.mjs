#!/usr/bin/env node
/* energy_labels.mjs — EU-Energieeffizienzklasse (A–G) bei Leuchtmitteln sichtbar machen.
 * QUELLE: BigBuy kodiert die Klasse als einzelnen Buchstaben im Produktnamen direkt vor der Wattzahl
 *   ("LED-Lampe Philips E 6,5 W …" → Klasse E) — bestätigt == "Energieklassifizierung: E" in der BigBuy-Beschreibung.
 *   → KEINE Erfindung: nur Produkte mit eindeutigem Klassen-Buchstaben bekommen ein Badge.
 * Nur echte Lichtquellen (LED-Lampe/Glühbirne/Leuchtmittel) — Leuchten/Taschenlampen/Ventilatoren haben kein EU-Label.
 * Fügt ein A–G-Skala-Badge in die Beschreibung ein + Tag "energie-<X>". Dedup über Tag "energielabel".
 * ENV: SHOPIFY_CLIENT_ID/SECRET · QUERY (Default beleuchtung) · LIMIT=1000 · DRY=1
 */
const SHOP='au3j0y-hq.myshopify.com',API='2025-01';
const CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const QUERY=process.env.QUERY||'tag:bigbuy tag:beleuchtung -tag:energielabel';
const LIMIT=parseInt(process.env.LIMIT||'1000',10), DRY=process.env.DRY==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// EU-rescaled Farbskala A(grün)→G(rot)
const COL={A:'#00a651',B:'#50b848',C:'#bfd730',D:'#fff200',E:'#fdb913',F:'#f37021',G:'#ed1c24'};
const CLASSES=['A','B','C','D','E','F','G'];

// Klasse aus Titel: einzelner Buchstabe A–G direkt vor Wattzahl, nur bei Lichtquellen
function extractClass(title){
 if(!/led-?lampe|glühbirne|glühlampe|leuchtmittel/i.test(title)) return null;
 const m=title.match(/\b([A-G])\s+\d+(?:[.,]\d+)?\s*W\b/);
 return m?m[1]:null;
}
function badge(cls){
 const rows=CLASSES.map(c=>{
  const on=c===cls;
  return `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:24px;margin:0 2px;border-radius:4px;background:${COL[c]};color:${['A','B','C','D'].includes(c)?'#222':'#fff'};font-weight:${on?'800':'600'};font-size:${on?'15px':'12px'};${on?'outline:3px solid #222;transform:scale(1.18);box-shadow:0 2px 6px rgba(0,0,0,.25);':'opacity:.55;'}">${c}</span>`;
 }).join('');
 return `<div style="margin:14px 0;padding:12px 14px;border:1px solid #e4e4e4;border-radius:10px;background:#fafafa;">`
  +`<div style="font-size:13px;font-weight:700;color:#333;margin-bottom:8px;">⚡ Energieeffizienzklasse: <span style="color:${COL[cls]==='#fff200'?'#b8a400':COL[cls]};">${cls}</span> <span style="font-weight:400;color:#888;">(EU-Skala A–G)</span></div>`
  +`<div style="display:flex;flex-wrap:wrap;align-items:center;">${rows}</div>`
  +`<div style="font-size:11px;color:#999;margin-top:7px;">Angabe des Herstellers. Datenblatt/EPREL auf Anfrage.</div></div>`;
}

async function tok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
async function gql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}
const Q=`query($c:String){products(first:60,after:$c,query:${JSON.stringify(QUERY)}){pageInfo{hasNextPage endCursor}nodes{id title descriptionHtml}}}`;
const UP=`mutation($id:ID!,$d:String!){productUpdate(input:{id:$id,descriptionHtml:$d}){userErrors{message}}}`;
const TAG=`mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}`;

const T=await tok();
let cursor=null,seen=0,done=0,byClass={};
outer: while(true){
 const r=await gql(T,Q,{c:cursor}); const conn=r.data?.products; if(!conn){console.log('q fail',JSON.stringify(r).slice(0,200));break;}
 for(const p of conn.nodes){
  if(done>=LIMIT)break outer; seen++;
  if(/Energieeffizienzklasse/i.test(p.descriptionHtml||''))continue; // schon vorhanden
  const cls=extractClass(p.title); if(!cls)continue;
  byClass[cls]=(byClass[cls]||0)+1;
  if(DRY){if(done<12)console.log(`  [DRY] ${cls} ← ${p.title.slice(0,60)}`);done++;continue;}
  // Badge nach dem ersten </p> (Intro) einfügen, sonst voranstellen
  let html=p.descriptionHtml||'';
  const b=badge(cls);
  html = html.includes('</p>') ? html.replace('</p>','</p>\n'+b) : (b+'\n'+html);
  const ur=await gql(T,UP,{id:p.id,d:html});
  if((ur.data?.productUpdate?.userErrors||[]).length){console.log('  ✗',p.title.slice(0,30),JSON.stringify(ur.data.productUpdate.userErrors).slice(0,80));continue;}
  await gql(T,TAG,{id:p.id,t:['energielabel','energie-'+cls]}); // additiv, ersetzt NICHT
  done++; await sleep(150);
  if(done%25===0)console.log(`  ${done} Energielabels…`);
 }
 if(!conn.pageInfo.hasNextPage)break; cursor=conn.pageInfo.endCursor;
}
console.log(`\nFERTIG: ${done}/${seen} Produkte mit Energielabel${DRY?' [DRY]':''}. Verteilung:`,JSON.stringify(byClass));
