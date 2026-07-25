import fs from 'node:fs';
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const SHOP='au3j0y-hq.myshopify.com';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function scc(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return JSON.parse(await r.text()).access_token;}
const TOK=await scc();
const gql=async(q,v)=>{for(let a=0;a<6;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;await sleep(3000);}return null;};
const th=await gql(`{themes(first:20){edges{node{id role}}}}`);
const id=th.data.themes.edges.find(e=>e.node.role==='MAIN').node.id;
const fk=await gql(`query($id:ID!){theme(id:$id){files(filenames:["templates/index.json"]){edges{node{body{...on OnlineStoreThemeFileBodyText{content}}}}}}}`,{id});
const raw=fk.data.theme.files.edges[0].node.body.content;
fs.writeFileSync('/tmp/index.backup3.json',raw);
const j=JSON.parse(raw.replace(/\/\*[\s\S]*?\*\//g,''));
const liquid=fs.readFileSync('/tmp/cat_rotate.liquid','utf8');
const key='collection_list_hREdj9';
if(!j.sections[key]){ console.log('Ziel-Sektion fehlt'); process.exit(1); }
// Native collection-list → custom-liquid ersetzen, Position im order bleibt (gleicher Key)
j.sections[key] = { type:'custom-liquid', settings:{ custom_liquid: liquid, 'padding-block-start':28, 'padding-block-end':28 } };
const out=JSON.stringify(j,null,2); JSON.parse(out);
const up=await gql(`mutation($themeId:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$themeId,files:$files){userErrors{message}}}`,{themeId:id,files:[{filename:'templates/index.json',body:{type:'TEXT',value:out}}]});
console.log('Sektion getauscht → rotierende Kacheln | upsert:', JSON.stringify(up.data?.themeFilesUpsert?.userErrors||'OK'));
console.log('order Position bleibt:', j.order.indexOf(key), '/ Sektionen gesamt:', j.order.length);
