import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shopifyClientSecret } from '../lib/shopify_secret.mjs';

export const HANDLE = 'herren-fleece-sport-freizeitschuhe-483776';
export const RENAMES = Object.freeze({'Beige Hot Sale':'Beige – Modell 3','Grau Hot Sale':'Grau – Modell 3','Weiss Hot Sale':'Weiss – Modell 3'});
export function plan(product, renames=RENAMES) {
  if (!product || product.handle !== HANDLE || product.status !== 'ACTIVE') throw new Error('Unerwartetes Produkt oder nicht ACTIVE');
  if (product.variants.pageInfo.hasNextPage) throw new Error('Variantenliste unvollständig');
  const option = product.options.find(o=>o.name==='Farbe');
  if (!option) throw new Error('Farboption fehlt');
  const changes=option.optionValues.filter(v=>Object.hasOwn(renames,v.name)).map(v=>({id:v.id,old:v.name,name:renames[v.name]}));
  const names=option.optionValues.map(v=>renames[v.name] ?? v.name);
  if(new Set(names).size!==names.length) throw new Error('Umbenennung würde Variantenwerte zusammenführen');
  if(changes.length && changes.length!==3) throw new Error('Nur ein Teil der drei erwarteten Werte vorhanden');
  return {productId:product.id,optionId:option.id,changes};
}
export function verify(before,after,renames=RENAMES) {
  if(before.id!==after.id || before.title!==after.title || before.handle!==after.handle || before.status!==after.status) throw new Error('Produktidentität/Titel/Status verändert');
  if(after.variants.pageInfo.hasNextPage || before.variants.nodes.length!==after.variants.nodes.length) throw new Error('Variantenanzahl verändert/unvollständig');
  const map=new Map(after.variants.nodes.map(v=>[v.id,v]));
  for(const b of before.variants.nodes){
    const a=map.get(b.id);
    if(!a || a.sku!==b.sku || a.price!==b.price || a.compareAtPrice!==b.compareAtPrice)throw new Error('Varianten-ID, SKU oder Preis verändert');
    const expected=b.selectedOptions.map(o=>({name:o.name,value:o.name==='Farbe'?(renames[o.value]??o.value):o.value}));
    if(JSON.stringify(a.selectedOptions)!==JSON.stringify(expected))throw new Error('Unerwartete Variantenzuordnung');
  }
  const c=plan(after,renames);if(c.changes.length)throw new Error('Alte Werte weiterhin vorhanden');
  return true;
}
const fields=`id title handle status updatedAt options{id name position optionValues{id name hasVariants}} variants(first:100){nodes{id title sku price compareAtPrice selectedOptions{name value}} pageInfo{hasNextPage}}`;
async function main(){
  const dir='merchant-fix-result';fs.mkdirSync(dir,{recursive:true});
  const live=process.env.LIVE==='1';
  const renames=process.env.ROLLBACK==='1'?Object.fromEntries(Object.entries(RENAMES).map(([a,b])=>[b,a])):RENAMES;
  const shop=(process.env.SHOPIFY_SHOP||'au3j0y-hq.myshopify.com').replace(/^https?:\/\//,'').replace(/\/$/,'');
  if(!/^[a-z0-9-]+\.myshopify\.com$/i.test(shop))throw new Error('Ungültige Shop-Domain');
  // Statische Admin-Tokens können abgelaufen sein; eingerichteten Client-Grant bevorzugen.
  let token=(process.env.SHOPIFY_CLIENT_ID && shopifyClientSecret())?undefined:process.env.SHOPIFY_ADMIN_TOKEN;
  if(!token){
    const id=process.env.SHOPIFY_CLIENT_ID,secret=shopifyClientSecret();
    if(!id||!secret)throw new Error('Shopify-Zugang fehlt');
    const r=await fetch(`https://${shop}/admin/oauth/access_token`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:id,client_secret:secret,grant_type:'client_credentials'})});
    if(!r.ok)throw new Error(`Token HTTP ${r.status}`);
    token=(await r.json()).access_token;if(!token)throw new Error('Kein Token erhalten');
  }
  async function gql(query,variables={}){
    const r=await fetch(`https://${shop}/admin/api/2026-10/graphql.json`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(45000),headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query,variables})});
    if(!r.ok)throw new Error(`GraphQL HTTP ${r.status}; keine automatische Wiederholung`);
    const j=await r.json();if(j.errors?.length)throw new Error('GraphQL: '+j.errors.map(e=>e.message).join('; '));
    if(!j.data)throw new Error('GraphQL ohne Daten');return j.data;
  }
  const read=async()=> (await gql(`query($handle:String!){productByIdentifier(identifier:{handle:$handle}){${fields}}}`,{handle:HANDLE})).productByIdentifier;
  const before=await read();const work=plan(before,renames);fs.writeFileSync(path.join(dir,'before.json'),JSON.stringify(before,null,2));fs.writeFileSync(path.join(dir,'plan.json'),JSON.stringify(work,null,2));
  console.log(`Produkt ${HANDLE}: ${before.variants.nodes.length} Varianten, ${work.changes.length} Farbwerte zu ändern`);
  for(const c of work.changes)console.log(`${c.old} → ${c.name}`);
  // Zusätzliche Versanddiagnose bleibt lesend, auch im Live-Modus.
  try{
    const shipping=await gql(`{deliveryProfiles(first:10){pageInfo{hasNextPage} nodes{name default profileLocationGroups{locationGroupZones(first:25){pageInfo{hasNextPage} nodes{zone{name countries{code{countryCode}}} methodDefinitions(first:25){pageInfo{hasNextPage} nodes{name active rateProvider{__typename ... on DeliveryRateDefinition{price{amount currencyCode}}} methodConditions{field operator conditionCriteria{__typename ... on MoneyV2{amount currencyCode}}}}}}}}}}}`);
    fs.writeFileSync(path.join(dir,'shopify-shipping.json'),JSON.stringify(shipping,null,2));console.log('Shopify-Versandprofile frisch gesichert (nur lesen)');
  }catch(e){console.log('Versanddiagnose nicht messbar: '+e.message);}
  const smallImageProducts=[];
  for(const id of ['15491103850881','15478787834241','15448667783553','16615807156615','15469962789249','15493873893761']){
    const d=await gql(`query($id:ID!){product(id:$id){id handle title status updatedAt featuredMedia{... on MediaImage{id image{url width height}}} media(first:50){pageInfo{hasNextPage} nodes{... on MediaImage{id image{url width height}}}} variants(first:100){pageInfo{hasNextPage} nodes{id sku selectedOptions{name value} image{url width height}}}}}`,{id:'gid://shopify/Product/'+id});
    smallImageProducts.push(d.product);
  }
  fs.writeFileSync(path.join(dir,'small-image-products.json'),JSON.stringify(smallImageProducts,null,2));
  console.log('Sechs Produktgruppen der kleinen Google-Bilder frisch gelesen (nur lesen)');
  if(!live){console.log('TROCKENLAUF: keine Änderung');return;}
  if(!work.changes.length){console.log('Keine Änderung erforderlich');return;}
  const fresh=await read();if(JSON.stringify(fresh)!==JSON.stringify(before))throw new Error('Produkt seit Planung geändert; Stopp');
  fs.writeFileSync(path.join(dir,'inflight.json'),JSON.stringify({productId:work.productId,updatedAt:before.updatedAt,changes:work.changes},null,2));
  const d=await gql(`mutation($productId:ID!,$option:OptionUpdateInput!,$values:[OptionValueUpdateInput!]){productOptionUpdate(productId:$productId,option:$option,optionValuesToUpdate:$values,variantStrategy:LEAVE_AS_IS){userErrors{field message code} product{id}}}`,{productId:work.productId,option:{id:work.optionId},values:work.changes.map(({id,name})=>({id,name}))});
  if(d.productOptionUpdate.userErrors.length)throw new Error('Mutation: '+JSON.stringify(d.productOptionUpdate.userErrors));
  const after=await read();fs.writeFileSync(path.join(dir,'after.json'),JSON.stringify(after,null,2));verify(before,after,renames);
  fs.writeFileSync(path.join(dir,'verified.json'),JSON.stringify({verified:true,handle:HANDLE,optionValuesChanged:work.changes.length,variantsPreserved:after.variants.nodes.length},null,2));console.log('BESTÄTIGT: 3 Farbwerte neutralisiert; Varianten-IDs, SKUs, Preise und Zuordnungen unverändert');
}
if(process.argv[1] && fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main().catch(e=>{console.error(e.message);process.exitCode=1;});
