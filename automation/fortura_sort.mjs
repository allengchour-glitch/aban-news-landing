/* fortura_sort.mjs — legt feinere Fortura-Collections an + sortiert den Bestand sauber ein.
 * Liest Feed (ArtNr → Grp-Bez/Kategorie), mappt via fortura_cat.mjs, taggt Live-Produkte nach.
 * ENV: SHOPIFY_CLIENT_ID/SECRET, FORTURA_CSV. Idempotent (nur fehlende Tags/Collections).
 */
import fs from 'node:fs';
import { fortCatTags, FORT_COLLECTIONS } from './fortura_cat.mjs';
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const SHOP='au3j0y-hq.myshopify.com';
const CSVPATH=process.env.FORTURA_CSV||'/tmp/fortura_feed.csv';
const PUBS=['301970915713','301971014017','302032716161','302566834561','302872297857','302994456961'].map(id=>({publicationId:`gid://shopify/Publication/${id}`}));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function parseCSV(t){const rows=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else{if(c==='"')q=true;else if(c==='|'){r.push(f);f='';}else if(c==='\n'){r.push(f);rows.push(r);r=[];f='';}else if(c!=='\r')f+=c;}}if(f||r.length){r.push(f);rows.push(r);}return rows;}

async function scc(){for(let a=0;a<5;a++){try{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});const t=JSON.parse(await r.text()).access_token;if(t)return t;}catch{}await sleep(2000*(a+1));}throw new Error('scc');}
let TOK;
async function gql(q,v){for(let a=0;a<4;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(JSON.stringify(j.errors||'').includes('Throttled')){await sleep(3000);continue;}TOK=await scc();await sleep(1000);}return{};}

TOK=await scc();
// 1) Collections anlegen (idempotent)
for(const [tag,title,desc] of Object.values(FORT_COLLECTIONS)){
  const handle='ft-'+tag;
  const ex=await gql(`{collectionByHandle(handle:"${handle}"){id}}`);
  if(ex.data?.collectionByHandle){continue;}
  const m=await gql(`mutation($input:CollectionInput!){collectionCreate(input:$input){collection{id}userErrors{message}}}`,{input:{title,handle,descriptionHtml:`<p>${desc}</p>`,ruleSet:{appliedDisjunctively:false,rules:[{column:'TAG',relation:'EQUALS',condition:tag}]},seo:{title:`${title} | LuxeStyle`,description:desc}}});
  const id=m.data?.collectionCreate?.collection?.id;
  if(id){await gql(`mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,input:$p){userErrors{message}}}`,{id,p:PUBS});console.log('Collection +',title);}
  else console.log('Collection FEHLER',title,JSON.stringify(m.data?.collectionCreate?.userErrors));
  await sleep(400);
}

// 2) Feed-Map art → {grp,kat,title}
const rows=parseCSV(fs.readFileSync(CSVPATH,'latin1'));
const hdr=rows[0].map(h=>h.trim());const ix={};hdr.forEach((h,i)=>ix[h]=i);
const feed={};
for(const r of rows.slice(1)){const a=(r[ix['ArtNr']]||'').trim();if(a)feed[a]={grp:r[ix['Grp-Bez']],kat:r[ix['Kategorie']],title:r[ix['ArtikelTitelDE']]||r[ix['Bez1DE']]};}

// 3) Live-Produkte nachtaggen
let cursor=null,scanned=0,tagged=0;
for(let p=0;p<80;p++){
  const q=`query($c:String){products(first:100,query:"tag:fortura",after:$c){pageInfo{hasNextPage endCursor}edges{node{id tags variants(first:1){edges{node{sku}}}}}}}`;
  const r=await gql(q,{c:cursor}); if(!r.data)break;
  for(const {node:n} of r.data.products.edges){scanned++;
    const art=(n.variants.edges[0]?.node.sku||'').replace(/^fortura-/,'');const rec=feed[art];if(!rec)continue;
    const want=fortCatTags(rec.grp,rec.kat,rec.title);
    const missing=want.filter(t=>!n.tags.includes(t));
    if(missing.length){
      const m=await gql(`mutation($id:ID!,$tags:[String!]!){tagsAdd(id:$id,tags:$tags){userErrors{message}}}`,{id:n.id,tags:missing});
      if(!m.data?.tagsAdd?.userErrors?.length)tagged++;
      await sleep(180);
    }
  }
  if(tagged%200===0&&tagged)console.log('  nachgetaggt:',tagged);
  if(!r.data.products.pageInfo.hasNextPage)break; cursor=r.data.products.pageInfo.endCursor;
}
console.log(`FERTIG. gescannt=${scanned} nachgetaggt=${tagged}`);
