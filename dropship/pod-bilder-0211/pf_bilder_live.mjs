import fs from 'node:fs';
import { g } from './sh.mjs';
const LIVE=process.env.LIVE==='1', NUR=process.env.NUR?process.env.NUR.split(','):null;
const plan=JSON.parse(fs.readFileSync('/tmp/cm/pf_bilder_plan.json','utf8'));
const LEDGER='/tmp/cm/pf_bilder_ledger.json';const led=fs.existsSync(LEDGER)?JSON.parse(fs.readFileSync(LEDGER,'utf8')):{};
const SCHLECHT=/\/templates?\/|halloween|red-white-blue|xmas|christmas|holiday|valentine|easter|american|usa|cutline|sizeguide|size-guide|infographic/i;
const titel=h=>h.replace(/-selbst-?gestalten|-zum-selbstgestalten/,'').replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).replace(/ie®?/,'ie');
let summe=0;
for(const p of plan){ if(NUR&&!NUR.includes(p.handle))continue;
  const bilder=p.bilder.filter(b=>!SCHLECHT.test(b.url)).slice(0,8);
  const pr=(await g(`query($h:String!){productByHandle(handle:$h){id title mediaCount{count}}}`,{h:p.handle})).productByHandle;
  if(!pr){console.log('FEHLT',p.handle);continue}
  const neu=bilder.filter(b=>!(led[p.handle]||[]).includes(b.url));
  console.log(p.handle.slice(0,46).padEnd(46),'vorhanden',String(pr.mediaCount.count).padStart(2),'| geplant',bilder.length,'| neu',neu.length);
  if(!LIVE||!neu.length)continue;
  const media=neu.map((b,i)=>({originalSource:b.url,mediaContentType:'IMAGE',alt:`${pr.title} – Beispielfoto ${(led[p.handle]||[]).length+i+1}`}));
  const r=(await g(`mutation($p:ProductUpdateInput!,$m:[CreateMediaInput!]){productUpdate(product:$p,media:$m){product{id mediaCount{count}} userErrors{field message}}}`,{p:{id:pr.id},m:media})).productUpdate;
  if(r.userErrors.length){console.log('  FEHLER',JSON.stringify(r.userErrors).slice(0,200));continue}
  led[p.handle]=[...(led[p.handle]||[]),...neu.map(b=>b.url)];fs.writeFileSync(LEDGER,JSON.stringify(led));summe+=neu.length;
  console.log('  angelegt',neu.length,'→ jetzt',r.product.mediaCount.count);
  await new Promise(r=>setTimeout(r,1500));
}
console.log('Bilder angelegt',summe);
