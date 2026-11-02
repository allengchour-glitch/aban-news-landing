import fs from 'node:fs';import { g } from './sh.mjs';
const LIVE=process.env.LIVE==='1',NUR=process.env.NUR?process.env.NUR.split(','):null;
const raw=JSON.parse(fs.readFileSync('/tmp/cm/mock/gal3.json'));const gal={};for(const [k,v] of Object.entries(raw)){const h=k.split('|')[0];gal[h]=[...(gal[h]||[]),...v]}
const EX={'hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten':[9],'kiss-cut-aufkleber-selbst-gestalten':[4],'magnet-zum-selbstgestalten':[0]};
const LEDGER='/tmp/cm/pg2_ledger.json';const led=fs.existsSync(LEDGER)?JSON.parse(fs.readFileSync(LEDGER)):{};
let tot=0;
for(const [h,us] of Object.entries(gal)){ if(NUR&&!NUR.includes(h))continue;
  const urls=us.filter((u,i)=>!(EX[h]||[]).includes(i));
  const pr=(await g(`query($h:String!){productByHandle(handle:$h){id title mediaCount{count}}}`,{h})).productByHandle;
  if(!pr){console.log('FEHLT',h);continue}
  const neu=urls.filter(u=>!(led[h]||[]).includes(u));
  console.log(h.slice(0,46).padEnd(46),'vorhanden',String(pr.mediaCount.count).padStart(2),'neu',neu.length);
  if(!LIVE||!neu.length)continue;
  const media=neu.map((u,i)=>({originalSource:u,mediaContentType:'IMAGE',alt:`${pr.title} – Beispielfoto von Printful ${i+1}`}));
  const r=(await g(`mutation($p:ProductUpdateInput!,$m:[CreateMediaInput!]){productUpdate(product:$p,media:$m){product{mediaCount{count}} userErrors{field message}}}`,{p:{id:pr.id},m:media})).productUpdate;
  if(r.userErrors.length){console.log('  FEHLER',JSON.stringify(r.userErrors).slice(0,200));continue}
  led[h]=[...(led[h]||[]),...neu];fs.writeFileSync(LEDGER,JSON.stringify(led));tot+=neu.length;console.log('  → jetzt',r.product.mediaCount.count);
  await new Promise(r=>setTimeout(r,1500));
}
console.log('angelegt',tot);
