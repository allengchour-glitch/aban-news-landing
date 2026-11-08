import fs from 'node:fs';
const shop = process.env.SHOPIFY_SHOP; const tok = fs.readFileSync('/tmp/cj_shop_token.txt','utf8').trim();
const gql = async (q,v)=> (await (await fetch(`https://${shop}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})})).json());
const [datei, ziel, modus] = process.argv.slice(2); // modus: neu|zurueck
const t = await gql(`{themes(first:30){nodes{id name role}}}`);
const main = t.data.themes.nodes.find(x=>x.role==='MAIN');
const inhalt = fs.readFileSync(datei,'utf8');
const r = await gql(`mutation($id:ID!,$f:[OnlineStoreThemeFilesUpsertFileInput!]!){ themeFilesUpsert(themeId:$id,files:$f){ upsertedThemeFiles{filename} userErrors{field message code} } }`,{id:main.id,f:[{filename:ziel,body:{type:'TEXT',value:inhalt}}]});
console.log(modus, JSON.stringify(r.data?.themeFilesUpsert ?? r));
