import fs from 'node:fs';
import {createShopifyClient} from './shopify_client.mjs';
const PRODUCT='gid://shopify/Product/15491103850881';
async function main(){
 const gql=await createShopifyClient();const dir='merchant-ring-fix';fs.mkdirSync(dir,{recursive:true});
 const fields=`id handle status updatedAt media(first:40){nodes{id ...on MediaImage{image{url width height}}}} variants(first:100){pageInfo{hasNextPage} nodes{id sku price compareAtPrice selectedOptions{name value} image{url width height} media(first:3){nodes{id}}}}`;
 const read=async()=> (await gql(`query($id:ID!){product(id:$id){${fields}}}`,{id:PRODUCT})).product;
 const before=await read();if(before?.handle!=='geburtsstein-ring-mit-zirkonia-601500'||before.status!=='ACTIVE'||before.variants.pageInfo.hasNextPage)throw Error('Unerwartetes Produkt/unvollständige Varianten');
 const target=before.media.nodes.find(m=>m.image?.width===1920&&m.image?.height===1920&&m.image.url.includes('f5ccd331')===false&&m.id==='gid://shopify/MediaImage/70446533869953'&&m.image.url.includes('8893c6b8-30a2-4077-83e4-f23324848ae6.jpg'));
 if(!target)throw Error('Geprüftes 1920px-Original nicht gefunden');
 const vars=before.variants.nodes.filter(v=>v.selectedOptions.some(o=>o.name==='Farbe'&&o.value==='Gold')&&v.selectedOptions.some(o=>o.name==='Modell'&&o.value==='3 Steine'));
 if(vars.length!==5)throw Error('Nicht genau fünf passende Varianten');
 const changes=vars.filter(v=>v.image?.url!==target.image.url);
 fs.writeFileSync(`${dir}/before.json`,JSON.stringify(before,null,2));fs.writeFileSync(`${dir}/plan.json`,JSON.stringify({productId:PRODUCT,target,variants:changes.map(v=>({id:v.id,sku:v.sku,oldImage:v.image,newImage:target.image}))},null,2));
 console.log('Gold, drei Steine: Varianten',vars.length,'zu korrigieren',changes.length,'neues Bild',target.image.width,'x',target.image.height);
 if(process.env.LIVE!=='1'||!changes.length){console.log('Keine Änderung (Trockenlauf oder bereits korrekt)');return;}
 const fresh=await read();if(JSON.stringify(fresh)!==JSON.stringify(before))throw Error('Produkt zwischenzeitlich geändert');
 const d=await gql(`mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{field message} productVariants{id}}}`,{p:PRODUCT,v:changes.map(v=>({id:v.id,mediaId:target.id}))});
 if(d.productVariantsBulkUpdate.userErrors.length)throw Error(JSON.stringify(d.productVariantsBulkUpdate.userErrors));
 const after=await read();fs.writeFileSync(`${dir}/after.json`,JSON.stringify(after,null,2));
 if(after.variants.nodes.length!==before.variants.nodes.length||after.handle!==before.handle||after.status!==before.status)throw Error('Produkt/Variantenanzahl verändert');
 for(const b of before.variants.nodes){const a=after.variants.nodes.find(v=>v.id===b.id);if(!a||a.sku!==b.sku||a.price!==b.price||a.compareAtPrice!==b.compareAtPrice||JSON.stringify(a.selectedOptions)!==JSON.stringify(b.selectedOptions))throw Error('Variante/SKU/Preis/Auswahl verändert');if(changes.some(v=>v.id===a.id)&&a.image?.url!==target.image.url)throw Error('Bildzuordnung nicht bestätigt');if(!changes.some(v=>v.id===a.id)&&a.image?.url!==b.image?.url)throw Error('Andere Variante verändert');}
 fs.writeFileSync(`${dir}/verified.json`,JSON.stringify({verified:true,variantsChanged:changes.length,allVariantsPreserved:after.variants.nodes.length,image:target.image},null,2));console.log('BESTÄTIGT: fünf Varianten verwenden passendes 1920px-Original; SKUs/Preise unverändert');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
