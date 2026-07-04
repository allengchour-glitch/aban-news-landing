/* LuxeStyle — add_tech_row.mjs
 * Fügt der Startseite (templates/index.json, LIVE-Theme) EINE neue collection-list-Sektion
 * "cl_tech" hinzu (Elektronik/Technik nach Typ). Klont die bestehende collection-list-Sektion
 * (collection_list_hREdj9) VERBATIM, ändert nur Header-Text + collection_list.
 * Sicher: Backup, JSON.parse-Check, nur ADD. No-op ohne Creds. VERIFY=1 nur lesen/prüfen.
 */
import fs from 'node:fs';
const SHOP=(process.env.SHOPIFY_SHOP||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim();
const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const API='2025-01';
const VERIFY=process.env.VERIFY==='1';
const BACKUP='dropship/theme-backups/index.json.tech-row.bak';
const KEY='cl_tech';
const TITLE='📱 Elektronik & Technik — nach Typ shoppen';
const HANDLES=['kopfhoerer-audio','handy-zubehoer','computer-zubehoer','smartwatches-wearables','drohnen-fpv','beamer-heimkino','speicher-datentraeger'];
if(!SHOP||!CID||!CSEC){ console.log('no creds → no-op'); process.exit(0); }
async function token(){
  const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});
  const j=await r.json(); if(!j.access_token) throw new Error('no token'); return j.access_token;
}
async function gql(tok,query,variables){
  for(let a=0;a<6;a++){
    const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',
      headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query,variables})});
    if(r.status===429){ await new Promise(s=>setTimeout(s,1500*(a+1))); continue; }
    const j=await r.json();
    if(j.errors && JSON.stringify(j.errors).includes('THROTTLED')){ await new Promise(s=>setTimeout(s,1500*(a+1))); continue; }
    if(j.errors) throw new Error(JSON.stringify(j.errors));
    return j.data;
  }
  throw new Error('throttled out');
}
const Q_THEME=`query{themes(first:1,roles:[MAIN]){edges{node{id}}}}`;
const Q_FILE=`query($id:ID!){theme(id:$id){files(filenames:["templates/index.json"],first:1){edges{node{body{... on OnlineStoreThemeFileBodyText{content}}}}}}}`;
const M_UPSERT=`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){
  themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename message}}}`;
const Q_COL=`query($q:String!){collections(first:1,query:$q){edges{node{handle title}}}}`;

const tok=await token();
const themeId=(await gql(tok,Q_THEME)).themes.edges[0].node.id;

// verify handles exist
console.log('--- collection handle check ---');
for(const h of HANDLES){
  const d=await gql(tok,Q_COL,{q:`handle:${h}`});
  const n=d.collections.edges[0]?.node;
  console.log(h, n && n.handle===h ? `OK (${n.title})` : 'MISSING');
}

const raw=(await gql(tok,Q_FILE,{id:themeId})).theme.files.edges[0].node.body.content;
const i=raw.indexOf('{'); const header=raw.slice(0,i); const data=JSON.parse(raw.slice(i));

if(VERIFY){
  const s=data.sections[KEY];
  console.log('--- VERIFY ---');
  console.log('present in order:', data.order.includes(KEY));
  console.log('section exists:', !!s, 'type:', s?.type);
  console.log('collection_list:', JSON.stringify(s?.settings?.collection_list));
  console.log('order:', JSON.stringify(data.order));
  process.exit(0);
}

// clone the existing collection-list section verbatim
const srcKey=data.order.find(k=>data.sections[k]?.type==='collection-list');
if(!srcKey) throw new Error('no collection-list section to clone');
const clone=JSON.parse(JSON.stringify(data.sections[srcKey]));

// change ONLY: header text + collection_list + max_collections + name
const grp=Object.values(clone.blocks||{}).find(b=>b.type==='group');
if(grp){ const txt=Object.values(grp.blocks||{}).find(b=>b.type==='text');
  if(txt) txt.settings.text=`<h3>${TITLE}</h3>`; }
clone.settings.collection_list=[...HANDLES];
clone.settings.max_collections=Math.max(HANDLES.length, clone.settings.max_collections||0);
clone.name=TITLE;

data.sections[KEY]=clone;
// insert after pl_gaming (or elektronik_row) if present, else upper-middle
data.order=data.order.filter(k=>k!==KEY);
let anchor=data.order.indexOf('pl_gaming');
if(anchor<0) anchor=data.order.indexOf('elektronik_row');
const at = anchor>=0 ? anchor+1 : Math.floor(data.order.length/2);
data.order.splice(at,0,KEY);
console.log(`inserting ${KEY} at index ${at} (after ${data.order[at-1]})`);

const outJson=JSON.stringify(data,null,2);
JSON.parse(outJson); // validate
fs.mkdirSync('dropship/theme-backups',{recursive:true});
fs.writeFileSync(BACKUP, raw);
console.log('backup written:', BACKUP);

const res=await gql(tok,M_UPSERT,{id:themeId,files:[{filename:'templates/index.json',body:{type:'TEXT',value:header+outJson}}]});
const errs=res.themeFilesUpsert.userErrors||[];
if(errs.length){ console.error('userErrors:',JSON.stringify(errs)); process.exit(1); }
console.log('✅ index.json updated. order:', data.order.join(', '));
