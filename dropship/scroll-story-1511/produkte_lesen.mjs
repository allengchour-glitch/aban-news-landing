import fs from 'node:fs';
import { gql } from './shop.mjs';
const H = ['led-tulpen-planet-nachtlicht-fur-tisch-618400','dreifachklinken-tennisarmband-mit-zirkon-613400','weihnachtskugeln-beflockt-9-stuck-625300','reisebeutel-aus-rindsleder-44x20x28-cm-01ba7c','elegante-umhangetasche-in-lack-optik-crossbody-kompakt-3-farben','gusseisen-teekanne-sandguss-unbeschichtet-609800','retro-vogel-keramikbecher-mit-ballgriff-637200','ewige-rose-mit-led-licht-718080','kristallspitzen-set-8-teilig-holzbox','acryl-ohrringe-ambre-karamell-ton-statement','weihnachtsstrumpf-mit-samt-optik-639700'];
const pub = (await gql(`{publications(first:20){nodes{id name}}}`)).publications.nodes;
const os = pub.find(p => p.name === 'Online Store');
const out = {};
for (const h of H) {
  const d = await gql(`query($h:String!,$p:ID!){productByHandle(handle:$h){id title handle status tags onlineStoreUrl publishedOnPublication(publicationId:$p) featuredImage{url width height} images(first:12){nodes{url width height}} variants(first:30){nodes{id title availableForSale price inventoryPolicy inventoryQuantity selectedOptions{name value} image{url}}}}}`, { h, p: os.id });
  const p = d.productByHandle;
  out[h] = p;
  if (!p) { console.log('FEHLT', h); continue; }
  console.log(p.status, p.publishedOnPublication, p.onlineStoreUrl ? 'url' : 'keine-url', h, '|', p.title);
  for (const v of p.variants.nodes) console.log('   ', v.id.split('/').pop(), v.availableForSale, v.price, v.inventoryPolicy, v.inventoryQuantity, v.title, v.image ? 'bild' : '-');
  const sperr = p.tags.filter(t => /sperr|gehalten|nicht|merchant|google-bild|kein/i.test(t));
  if (sperr.length) console.log('    TAGS:', sperr.join(', '));
}
fs.writeFileSync('produkte_admin.json', JSON.stringify(out, null, 1));
