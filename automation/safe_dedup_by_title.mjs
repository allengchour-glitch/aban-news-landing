import fs from 'node:fs';
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET, SHOP='au3j0y-hq.myshopify.com';
const DRY=process.env.DRY==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function scc(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return JSON.parse(await r.text()).access_token;}
let TOK; const gql=async(q,v)=>{for(let a=0;a<6;a++){try{const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(JSON.stringify(j.errors||'').includes('hrottl')){await sleep(4000);continue;}}catch(e){await sleep(3000);}TOK=await scc();}return null;};
const specific=t=>{const x=(t||'').trim();
  if(/(·|Gr\.|Grösse|Größe|\bcm\b|«|»|\bModell\b|\d{2,})/.test(x)) return true;   // Grösse/Modell/Name-Marker
  const words=x.split(/\s+/).filter(Boolean);
  return words.length>=4 && x.length>=24;   // lange, spezifische Titel
};
const norm=t=>(t||'').trim().toLowerCase().replace(/\s+/g,' ');
const realOpts=d=>(d.options||[]).some(o=>!/^(titel|title)$/i.test(o.name)&&(o.values||[]).filter(v=>!/^(default|standard)$/i.test(v)).length>0);
const prods=fs.readFileSync('/tmp/products_full.jsonl','utf8').split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(d=>d&&d.status==='ACTIVE'&&(d.id||'').includes('/Product/'));
const groups=new Map();
for(const d of prods){ const k=norm(d.title); if(!groups.has(k))groups.set(k,[]); groups.get(k).push(d); }
let drafts=[];
for(const [k,g] of groups){
  if(g.length<2)continue;
  // Keeper = variantenreichstes, sonst ältestes
  g.sort((a,b)=>(realOpts(b)-realOpts(a))|| new Date(a.createdAt)-new Date(b.createdAt));
  const keeper=g[0];
  for(const d of g.slice(1)){
    // DRAFT nur wenn OHNE echte Varianten-Option = reines redundantes Listing
    if(!realOpts(d) && specific(d.title)) drafts.push({id:d.id,title:d.title});
  }
}
console.log(`Dubletten-Kandidaten (Titel gleich + KEINE echte Variante) → DRAFT: ${drafts.length}`);
drafts.slice(0,12).forEach(d=>console.log('  '+d.title.slice(0,60)));
fs.writeFileSync('/tmp/safe_draft_ids.json', JSON.stringify(drafts));
if(DRY){ console.log('(DRY — nichts geändert)'); process.exit(0); }
TOK=await scc();
let done=0, rep=[];
for(const d of drafts){
  const u=await gql(`mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}`,{i:{id:d.id,status:'DRAFT',tags:['duplikat-auto-draft']}});
  if(u&&!(u.data?.productUpdate?.userErrors||[]).length){ done++; rep.push(d.id.split('/').pop()+' | '+d.title); }
  if(done%50===0&&done)console.log('  ...gedraftet '+done);
  await sleep(250);
}
fs.writeFileSync('dropship/dedup_safe_report.txt', rep.join('\n')+'\n');
console.log('✅ gedraftet:',done,'| Report: dropship/dedup_safe_report.txt');
