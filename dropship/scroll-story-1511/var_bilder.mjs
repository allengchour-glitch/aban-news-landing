import { gql } from './shop.mjs';
for (const h of process.argv.slice(2)) {
  const d = await gql(`query($h:String!){productByHandle(handle:$h){featuredImage{url} variants(first:20){nodes{id title image{url}}}}}`, { h });
  console.log(h, d.productByHandle.featuredImage.url);
  for (const v of d.productByHandle.variants.nodes) console.log(v.id.split('/').pop(), v.title, v.image ? v.image.url : '-');
}
