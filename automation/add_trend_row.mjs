/* LuxeStyle — add_trend_row.mjs
 * Fügt der Startseite (templates/index.json, LIVE-Theme) EINE neue collection-list-Sektion
 * "cl_trends" ("🔥 Trend-Kategorien 2026") hinzu. Klont eine bestehende collection-list-Sektion
 * VERBATIM, ändert nur Header-Text + collection_list + max_collections + name.
 * Sicher: Backup, JSON.parse-Check, nur ADD. No-op ohne Creds. VERIFY=1 = nur lesen/prüfen.
 */
import fs from 'node:fs';
const SHOP=(process.env.SHOPIFY_SHOP||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim();
const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const API='2025-01';
const VERIFY=process.env.VERIFY==='1';
const BACKUP='dropship/theme-backups/index.json.trendrow.bak';
const KEY='cl_trends';
const TITLE='🔥 Trend-Kategorien 2026';
const HANDLES=['beauty-geraete','auto-kfz-zubehoer','hightech-gadgets','smart-home-gadgets','kuechen-gadgets','nachhaltig-eco','basteln-diy','laptop-tablet-zubehoer','angebote'];
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

// verify handles exist; drop any missing
console.log('--- collection handle check ---');
const finalHandles=[];
for(const h of HANDLES){
  const d=await gql(tok,Q_COL,{q:`handle:${h}`});
  const n=d.collections.edges[0]?.node;
  const ok=n && n.handle===h;
  console.log(h, ok ? `OK (${n.title})` : 'MISSING → dropped');
  if(ok) finalHandles.push(h);
}
if(!finalHandles.length) throw new Error('no valid handles');

const raw=(await gql(tok,Q_FILE,{id:themeId})).theme.files.edges[0].node.body.content;
const i=raw.indexOf('{'); const header=raw.slice(0,i); const data=JSON.parse(raw.slice(i));

if(VERIFY){
  const s=data.sections[KEY];
  console.log('--- VERIFY ---');
  console.log('present in order:', data.order.includes(KEY));
  console.log('section exists:', !!s, 'type:', s?.type);
  console.log('collection_list:', JSON.stringify(s?.settings?.collection_list));
  console.log('order ('+data.order.length+'):', JSON.stringify(data.order));
  process.exit(0);
}

// clone an existing collection-list section verbatim (prefer cl_tech, else first)
const srcKey = data.sections['cl_tech']?.type==='collection-list'
  ? 'cl_tech'
  : data.order.find(k=>data.sections[k]?.type==='collection-list');
if(!srcKey) throw new Error('no collection-list section to clone');
const clone=JSON.parse(JSON.stringify(data.sections[srcKey]));

// change ONLY: header text + collection_list + max_collections + name
const grp=Object.values(clone.blocks||{}).find(b=>b.type==='group');
if(grp){ const txt=Object.values(grp.blocks||{}).find(b=>b.type==='text');
  if(txt) txt.settings.text=`<h3>${TITLE}</h3>`; }
clone.settings.collection_list=[...finalHandles];
clone.settings.max_collections=Math.max(finalHandles.length, clone.settings.max_collections||0);
clone.name=TITLE;

data.sections[KEY]=clone;
// insert after cl_tech (upper-middle) — else after budget row, else middle
data.order=data.order.filter(k=>k!==KEY);
let anchor=data.order.indexOf('cl_tech');
if(anchor<0) anchor=data.order.indexOf('budget_unter25');
const at = anchor>=0 ? anchor+1 : Math.floor(data.order.length/2);
data.order.splice(at,0,KEY);
console.log(`inserting ${KEY} at index ${at} (after ${data.order[at-1]}), cloned from ${srcKey}`);

const outJson=JSON.stringify(data,null,2);
JSON.parse(outJson); // validate
fs.mkdirSync('dropship/theme-backups',{recursive:true});
fs.writeFileSync(BACKUP, raw);
console.log('backup written:', BACKUP);

const res=await gql(tok,M_UPSERT,{id:themeId,files:[{filename:'templates/index.json',body:{type:'TEXT',value:header+outJson}}]});
const errs=res.themeFilesUpsert.userErrors||[];
if(errs.length){ console.error('userErrors:',JSON.stringify(errs)); process.exit(1); }
console.log('✅ index.json updated. handles:', finalHandles.join(', '));
console.log('order ('+data.order.length+'):', data.order.join(', '));
