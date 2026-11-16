import fs from 'node:fs';
import { gql } from './shop.mjs';
const H = process.argv.slice(2);
const pub = (await gql(`{publications(first:20){nodes{id name}}}`)).publications.nodes;
const os = pub.find(p => p.name === 'Online Store');
const out = {};
for (const h of H) {
  const d = await gql(`query($h:String!,$p:ID!){productByHandle(handle:$h){id title handle status productType tags onlineStoreUrl publishedOnPublication(publicationId:$p) descriptionHtml images(first:10){nodes{url}} variants(first:40){nodes{id title sku availableForSale price inventoryPolicy inventoryQuantity}} metafields(first:20){nodes{namespace key value}}}}`, { h, p: os.id });
  const p = d.productByHandle; out[h] = p;
  if (!p) { console.log('FEHLT', h); continue; }
  console.log('==', p.status, p.publishedOnPublication, p.productType, h, '|', p.title);
  for (const v of p.variants.nodes) console.log('   ', v.id.split('/').pop(), v.availableForSale, v.price, v.sku, v.title);
  const txt = p.descriptionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  console.log('   TEXT:', txt.slice(0, 900));
  console.log('   MF:', p.metafields.nodes.filter(m => /material|cj|pid|quelle/i.test(m.key + m.namespace)).map(m => m.namespace + '.' + m.key + '=' + String(m.value).slice(0, 80)).join(' | '));
  console.log('   TAGS:', p.tags.join(', ').slice(0, 300));
}
fs.writeFileSync('kandidaten_' + Date.now() + '.json', JSON.stringify(out, null, 1));
