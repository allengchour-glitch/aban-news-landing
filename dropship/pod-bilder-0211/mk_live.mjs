import fs from 'node:fs';import { g } from './sh.mjs';
const LIVE=process.env.LIVE==='1',NUR=process.env.NUR?process.env.NUR.split(','):null;
const SKIP=/^(magnet-zum|strandtuch)/;
const LEDGER='/tmp/cm/mock_ledger.json';const led=fs.existsSync(LEDGER)?JSON.parse(fs.readFileSync(LEDGER)):{};
for(const f of fs.readdirSync('/tmp/cm/mock').filter(f=>/(gestalten|selbstgestalten)\.json$/.test(f))){
  const h=f.replace('.json','');if(SKIP.test(h)||(NUR&&!NUR.includes(h)))continue;
  const o=JSON.parse(fs.readFileSync('/tmp/cm/mock/'+f));
  const pr=(await g(`query($h:String!){productByHandle(handle:$h){id title mediaCount{count}}}`,{h})).productByHandle;
  if(!pr){console.log('FEHLT',h);continue}
  if(led[h]){console.log('schon',h);continue}
  console.log(h.slice(0,44).padEnd(44),'vorhanden',pr.mediaCount.count,'neu',o.length);
  if(!LIVE)continue;
  const media=o.map((m,i)=>({originalSource:m.url,mediaContentType:'IMAGE',alt:`${pr.title} – Beispiel mit Design${m.farbe?' ('+m.farbe+')':''}`}));
  const r=(await g(`mutation($p:ProductUpdateInput!,$m:[CreateMediaInput!]){productUpdate(product:$p,media:$m){product{mediaCount{count}} userErrors{field message}}}`,{p:{id:pr.id},m:media})).productUpdate;
  if(r.userErrors.length){console.log('  FEHLER',JSON.stringify(r.userErrors).slice(0,200));continue}
  led[h]=o.map(m=>m.url.slice(-40));fs.writeFileSync(LEDGER,JSON.stringify(led));console.log('  → jetzt',r.product.mediaCount.count);
  await new Promise(r=>setTimeout(r,1500));
}
