/* fortura_google.mjs — Google-Merchant-Optimierung für Fortura-Produkte.
 * Setzt: (1) GTIN = EAN als variant.barcode (grösster Hebel — Produkt-Identifikation),
 * (2) mm-google-shopping-Metafelder: age_group, gender, color, brand, google_product_category.
 * Matcht per SKU fortura-<ArtNr> gegen den Feed. Idempotent. ENV: SHOPIFY_CLIENT_ID/SECRET, FORTURA_CSV.
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

// Ableitungen
function ageGroup(blob){ return /\b(kind|kinder|baby|kids|kleinkind|jahre|monate|\d{2,3}\s?cm)\b/i.test(blob) && /kind|kinder|baby|kids|kleinkind/i.test(blob) ? 'kids' : 'adult'; }
function gender(blob){ if(/\b(frau|frauen|damen|women|mädchen|weiblich)\b/i.test(blob))return 'female';
  if(/\b(mann|männer|herren|men|knabe|jungen|männlich)\b/i.test(blob))return 'male'; return 'unisex'; }
// Google Product Category (Taxonomie-IDs)
function gpc(blob){
  if(/kostüm|verkleidung|perücke|maske|fasnacht/i.test(blob))return '5192';       // Costumes & Accessories
  if(/bruder|traktor|spielzeug|plüsch|playmobil|schleich|lego/i.test(blob))return '1253'; // Toys
  if(/deko|kerze|ballon|girlande|party|tischdeck/i.test(blob))return '2559';       // Party Supplies
  if(/hemd|hose|kleid|bluse|jacke|shirt/i.test(blob))return '1604';                // Apparel
  return '';
}

async function scc(){for(let a=0;a<5;a++){try{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});const t=JSON.parse(await r.text()).access_token;if(t)return t;}catch{}await sleep(2000*(a+1));}throw new Error('scc');}
let TOK;
async function gql(q,v){for(let a=0;a<4;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(JSON.stringify(j.errors||'').includes('Throttled')){await sleep(3000);continue;}TOK=await scc();await sleep(1000);}return{};}

const rows=parseCSV(fs.readFileSync(CSVPATH,'latin1'));
const hdr=rows[0].map(h=>h.trim());
const feed={};
for(const r of rows.slice(1)){const o=Object.fromEntries(hdr.map((h,i)=>[h,r[i]]));const a=(o['ArtNr']||'').trim();if(a)feed[a]=o;}
console.log('Feed-Artikel:',Object.keys(feed).length);

TOK=await scc();
let cursor=null,gtin=0,meta=0,scanned=0,nofeed=0;
for(let p=0;p<40;p++){
  const q=`query($c:String){products(first:60,query:"tag:fortura",after:$c){pageInfo{hasNextPage endCursor}edges{node{id title vendor variants(first:1){edges{node{id sku barcode}}}}}}}`;
  const r=await gql(q,{c:cursor}); if(!r.data)break;
  for(const {node:n} of r.data.products.edges){scanned++;
    const v=n.variants.edges[0]?.node; if(!v){continue;}
    const art=(v.sku||'').replace(/^fortura-/,''); const rec=feed[art]; if(!rec){nofeed++;continue;}
    const ean=pick(rec,['EAN']); const marke=pick(rec,['Marke']); const farbe=pick(rec,['FarbeDE']);
    const blob=[rec['Grp-Bez'],n.title,rec['Bez1DE']].filter(Boolean).join(' ');
    // 1) GTIN = EAN als barcode (nur gültige 8-14-stellige, nicht "0")
    if(ean && /^\d{8,14}$/.test(ean) && ean!=='0' && v.barcode!==ean){
      await gql(`mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$pid,variants:$v){userErrors{message}}}`,{pid:n.id,v:[{id:v.id,barcode:ean}]});
      gtin++;
    }
    // 2) Metafelder mm-google-shopping
    const mfs=[
      {namespace:'mm-google-shopping',key:'age_group',type:'single_line_text_field',value:ageGroup(blob)},
      {namespace:'mm-google-shopping',key:'gender',type:'single_line_text_field',value:gender(blob)},
    ];
    if(farbe)mfs.push({namespace:'mm-google-shopping',key:'color',type:'single_line_text_field',value:farbe});
    if(marke)mfs.push({namespace:'mm-google-shopping',key:'brand',type:'single_line_text_field',value:marke});
    const cat=gpc(blob); if(cat)mfs.push({namespace:'mm-google-shopping',key:'google_product_category',type:'single_line_text_field',value:cat});
    const mm=await gql(`mutation($mf:[MetafieldsSetInput!]!){metafieldsSet(metafields:$mf){userErrors{message}}}`,{mf:mfs.map(m=>({ownerId:n.id,...m}))});
    if(!mm.data?.metafieldsSet?.userErrors?.length)meta++;
    if(meta%100===0&&meta)console.log(`  GTIN=${gtin} Meta=${meta}`);
    await sleep(220);
  }
  if(!r.data.products.pageInfo.hasNextPage)break; cursor=r.data.products.pageInfo.endCursor;
}
console.log(`FERTIG. gescannt=${scanned} GTIN-gesetzt=${gtin} Metafelder-Produkte=${meta} ohne-feed=${nofeed}`);
