import fs from 'node:fs';
const SHOP=(process.env.SHOPIFY_SHOP||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim();
const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const API='2025-01';
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
const Q_COL=`query($q:String!){collections(first:1,query:$q){edges{node{handle title}}}}`;
const HANDLES=['beauty-geraete','auto-kfz-zubehoer','hightech-gadgets','basteln-diy','laptop-tablet-zubehoer','angebote'];

const tok=await token();
const themeId=(await gql(tok,Q_THEME)).themes.edges[0].node.id;
console.log('themeId:',themeId);
const raw=(await gql(tok,Q_FILE,{id:themeId})).theme.files.edges[0].node.body.content;
const i=raw.indexOf('{'); const data=JSON.parse(raw.slice(i));
fs.writeFileSync('/tmp/claude-0/index_live_raw.json', raw);
console.log('raw bytes:',raw.length,' saved to /tmp/claude-0/index_live_raw.json');
console.log('--- order ('+data.order.length+') ---');
console.log(JSON.stringify(data.order));
console.log('--- collection-list sections ---');
for(const k of data.order){
  const s=data.sections[k];
  if(s?.type==='collection-list'){
    console.log(k,'| max:',s.settings?.max_collections,'| list:',JSON.stringify(s.settings?.collection_list));
  }
}
console.log('--- has cl_trends already:', data.order.includes('cl_trends'));
console.log('--- collection handle check ---');
for(const h of HANDLES){
  const d=await gql(tok,Q_COL,{q:`handle:${h}`});
  const n=d.collections.edges[0]?.node;
  console.log(h, n && n.handle===h ? `OK (${n.title})` : 'MISSING');
}
