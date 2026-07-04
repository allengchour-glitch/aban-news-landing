import fs from 'node:fs';
const SHOP=(process.env.SHOPIFY_SHOP||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim();
const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const API='2025-01';
if(!SHOP||!CID||!CSEC){ console.log('no creds'); process.exit(1); }
async function token(){
  const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});
  const j=await r.json(); if(!j.access_token) throw new Error('no token'); return j.access_token;
}
async function gql(tok,query,variables){
  const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',
    headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query,variables})});
  const j=await r.json(); if(j.errors) throw new Error(JSON.stringify(j.errors)); return j.data;
}
const Q_THEME=`query{themes(first:1,roles:[MAIN]){edges{node{id}}}}`;
const Q_FILE=`query($id:ID!){theme(id:$id){files(filenames:["templates/index.json"],first:1){edges{node{body{... on OnlineStoreThemeFileBodyText{content}}}}}}}`;
const tok=await token();
const themeId=(await gql(tok,Q_THEME)).themes.edges[0].node.id;
const raw=(await gql(tok,Q_FILE,{id:themeId})).theme.files.edges[0].node.body.content;
fs.mkdirSync('/tmp/claude-idx',{recursive:true});
fs.writeFileSync('/tmp/claude-idx/index.raw.json', raw);
const i=raw.indexOf('{'); const data=JSON.parse(raw.slice(i));
console.log('THEME:',themeId);
console.log('ORDER:',JSON.stringify(data.order));
console.log('--- section types ---');
for(const k of data.order){ console.log(k,'=>',data.sections[k]?.type); }
console.log('--- collection-list sections ---');
for(const [k,s] of Object.entries(data.sections)){
  if(s.type==='collection-list'||/collection.list/.test(s.type||'')){
    console.log('KEY',k); console.log(JSON.stringify(s,null,2));
  }
}
