#!/usr/bin/env node
/* tag_backfill — ergänzt fehlende Tags bei AKTIVEN Produkten OHNE Tags (nur ADD, nie entfernen).
 * Leitet Gender + Kategorie konservativ aus productType + Titel ab. Lässt Mehrdeutiges ungetaggt.
 * Ziel: untagged Produkte in Gender-/Kategorie-Smart-Collections sichtbar machen. DRY-Default · LIVE=1. ENV: SHOPIFY_*.
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}

// Kategorie-Tags aus productType/Titel (konservativ, nur klare Fälle)
const CAT=[
 [/schmuck|ohrring|halskette|armband|armreif|\banhänger\b|\bring\b/i,'schmuck'],
 [/uhr/i,'uhren'],
 [/sonnenbrill|brillen/i,'sonnenbrille'],
 [/beauty|pflege|wellness|tools|maske|creme|serum|deodorant|body lotion/i,'beauty'],
 [/tasche|portemonnaie|wallet|rucksack/i,'taschen'],
 [/schuh|sneaker|sandale|stiefel|tennisschuh/i,'schuhe'],
 [/parfum|\bduft\b|eau de/i,'parfum'],
 [/elektronik|charger|powerbank|beamer|phone|kopfhörer|audio/i,'tech'],
 [/smart home|heizdecke|lampe|leuchte/i,'wohnen'],
 [/küche|kochen|french press/i,'kueche'],
 [/reise/i,'reise'],
 [/recovery|fitness|massage|yoga|hantel|widerstandsband/i,'fitness'],
];
function tagsFor(p){
  const s=`${p.title} ${p.productType}`;
  if(/schlüsselanhänger/i.test(s)) return [];   // Keychain ≠ Schmuck → ungetaggt lassen
  const out=new Set();
  for(const [re,tag] of CAT) if(re.test(s)){ out.add(tag); break; } // 1 Kategorie
  if(/\bherren\b|\bmann\b|männer|\bfür ihn\b/i.test(s)) out.add('herren');
  else if(/\bdamen\b|\bfrau\b|frauen|\bfür sie\b/i.test(s)) out.add('damen');
  return [...out];
}

const t=await tk();if(!t){console.error('Kein Token');process.exit(1);}
let c=null,scanned=0,tagged=0,skip=0;
do{
  const r=await gql(t,`query($c:String){products(first:80,after:$c,query:"status:active"){pageInfo{hasNextPage endCursor}nodes{id title productType tags}}}`,{c});
  const pg=r?.data?.products; if(!pg){await sleep(1500);continue;}
  for(const p of pg.nodes){
    if(p.tags&&p.tags.length) continue;  // nur völlig untagged
    scanned++;
    const tg=tagsFor(p);
    if(!tg.length){skip++;continue;}     // nichts Sicheres ableitbar → ungetaggt lassen
    if(LIVE){ const u=await gql(t,`mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}`,{id:p.id,t:tg}); const e=u?.data?.tagsAdd?.userErrors||[]; if(e.length){console.log(' ⚠️',JSON.stringify(e).slice(0,100));skip++;continue;} }
    console.log(`${LIVE?'✅':'(DRY)'} [${p.productType}] ${p.title.slice(0,40)} → ${tg.join(',')}`);
    tagged++; await sleep(150);
  }
  c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null;
}while(c);
console.log(`\nFertig. Untagged ${scanned} · getaggt ${tagged} · ohne sichere Ableitung gelassen ${skip} ${LIVE?'':'(DRY)'}`);
