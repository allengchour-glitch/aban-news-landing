/* fortura_enrich_live.mjs — backfillt reiche Beschreibungen (Spec-Tabelle + Trust) auf bereits live
 * gegangene Fortura-Produkte. Matcht per SKU fortura-<ArtNr> gegen den Feed. Idempotent (überspringt
 * bereits angereicherte = enthalten "<h4>Warum bei LuxeStyle"). ENV: SHOPIFY_CLIENT_ID/SECRET, FORTURA_CSV.
 */
import fs from 'node:fs';
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const SHOP='au3j0y-hq.myshopify.com';
const CSVPATH=process.env.FORTURA_CSV||'/tmp/fortura_feed.csv';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pick=(o,ks)=>{for(const k of ks)if(o[k]!=null&&String(o[k]).trim()!=='')return String(o[k]).trim();return '';};

function parseCSV(text){const rows=[];let row=[],f='',q=false;const delim='|';
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
    else{if(c==='"')q=true;else if(c===delim){row.push(f);f='';}else if(c==='\n'){row.push(f);rows.push(row);row=[];f='';}else if(c==='\r'){}else f+=c;}}
  if(f.length||row.length){row.push(f);rows.push(row);}return rows;}

const COL={marke:['Marke'],farbe:['FarbeDE'],groesse:['GrösseDE'],dimension:['DimensionDE'],
  anlass:['Anlass1DE','Thema1DE'],lieferumfangDE:['ArtikelLieferumfangDE'],
  descDE:['InternetTextDE','ArtikelLieferumfangDE'],zusatzDE:['ArtikelTitelZusatzDE'],ve:['Internet_VE']};

function buildDesc(rec,art,title){
  const marketing=pick(rec,COL.descDE)||pick(rec,COL.zusatzDE)||`${title} – hochwertige Qualität ab Schweizer Lager.`;
  const ve=Math.max(1,Math.round(parseFloat(String(pick(rec,COL.ve)).replace(',','.'))||1));
  const specs=[['Marke',pick(rec,COL.marke)],['Farbe',pick(rec,COL.farbe)],['Grösse',pick(rec,COL.groesse)],
    ['Masse',pick(rec,COL.dimension)],['Anlass',pick(rec,COL.anlass)],['Lieferumfang',pick(rec,COL.lieferumfangDE)],
    ['Artikel-Nr.',String(art)]].filter(([,v])=>v&&v.length);
  const specTable=specs.length?`<h4>Details</h4><ul>${specs.map(([k,v])=>`<li><strong>${k}:</strong> ${v}</li>`).join('')}</ul>`:'';
  const veNote=ve>1?`<p>📦 Verkauf in praktischen Bündeln zu ${ve} Stück.</p>`:'';
  return `<p>${marketing}</p>${specTable}${veNote}`
    +`<h4>Warum bei LuxeStyle kaufen?</h4><ul>`
    +`<li>🇨🇭 <strong>Versand aus der Schweiz</strong> – Lieferung in nur 1–2 Werktagen (DPD)</li>`
    +`<li>📦 Gratis-Versand ab CHF 50</li><li>↩️ 30 Tage Rückgaberecht</li>`
    +`<li>🔒 Kauf auf Rechnung mit Klarna · TWINT · Karten · PayPal · Apple Pay</li>`
    +`<li>💬 Schweizer Support: info@luxestyle.ch</li></ul>`;
}

async function scc(){for(let a=0;a<5;a++){try{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});const t=JSON.parse(await r.text()).access_token;if(t)return t;}catch{}await sleep(2000*(a+1));}throw new Error('scc');}
let TOK;
async function gql(q,v){for(let a=0;a<4;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(JSON.stringify(j.errors||'').includes('Throttled')){await sleep(3000);continue;}TOK=await scc();await sleep(1000);}return{};}

// Feed-Map ArtNr → record
const rows=parseCSV(fs.readFileSync(CSVPATH,'latin1'));
const hdr=rows[0].map(h=>h.trim());
const feed={};
for(const r of rows.slice(1)){const o=Object.fromEntries(hdr.map((h,i)=>[h,r[i]]));const a=(o['ArtNr']||'').trim();if(a)feed[a]=o;}
console.log('Feed-Artikel:',Object.keys(feed).length);

TOK=await scc();
let cursor=null,updated=0,skip=0,nofeed=0,scanned=0;
for(let p=0;p<40;p++){
  const q=`query($c:String){products(first:100,query:"tag:fortura",after:$c){pageInfo{hasNextPage endCursor}edges{node{id title descriptionHtml variants(first:1){edges{node{sku}}}}}}}`;
  const r=await gql(q,{c:cursor}); if(!r.data)break;
  for(const {node:n} of r.data.products.edges){scanned++;
    if((n.descriptionHtml||'').includes('Warum bei LuxeStyle')){skip++;continue;}
    const sku=n.variants.edges[0]?.node.sku||'';const art=sku.replace(/^fortura-/,'');
    const rec=feed[art]; if(!rec){nofeed++;continue;}
    const desc=buildDesc(rec,art,n.title);
    const m=await gql(`mutation($id:ID!,$d:String!){productUpdate(input:{id:$id,descriptionHtml:$d}){userErrors{message}}}`,{id:n.id,d:desc});
    if(!m.data?.productUpdate?.userErrors?.length){updated++;}
    if(updated%100===0&&updated)console.log('  angereichert:',updated);
    await sleep(200);
  }
  if(!r.data.products.pageInfo.hasNextPage)break; cursor=r.data.products.pageInfo.endCursor;
}
console.log(`FERTIG. gescannt=${scanned} angereichert=${updated} schon-reich=${skip} ohne-feed=${nofeed}`);
