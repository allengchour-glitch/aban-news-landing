import fs from 'node:fs';import { g } from './sh.mjs';
const plan=JSON.parse(fs.readFileSync('/tmp/cm/legacy_fix_plan.json','utf8'));let bad=0,tot=0;
for(const r of plan){let rest=0;for(let i=0;i<r.ids.length;i+=50){const ids=r.ids.slice(i,i+50);
 const res=await g(`query($i:[ID!]!){nodes(ids:$i){... on Product{id tags}}}`,{i:ids});
 for(const n of res.nodes){tot++;if(n.tags.includes(r.tag)){rest++;bad++}}}
 console.log(r.id.padEnd(22),'geprüft',r.ids.length,'Tag noch drauf',rest)}
console.log('gesamt',tot,'noch mit Tag',bad);
const hs=['sub-taschen','hautpflege-skincare','jacken-outdoor','sub-aroma-diffuser','sub-deko','spielzeug'];
for(const h of hs){const c=(await g(`query($h:String!){collectionByHandle(handle:$h){productsCount{count}}}`,{h})).collectionByHandle;console.log('Sammlung',h,c.productsCount.count)}
