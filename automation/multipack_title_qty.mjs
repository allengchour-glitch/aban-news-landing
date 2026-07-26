const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET, SHOP='au3j0y-hq.myshopify.com';
const DRY=process.env.DRY==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function scc(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return JSON.parse(await r.text()).access_token;}
const TOK=await scc();
const gql=async(q,v)=>{for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;await sleep(3000);}return null;};
let after=null, all=[];
for(let p=0;p<6;p++){
  const r=await gql(`query($c:String){products(first:50,query:"(title:*Luftballon* OR title:*Ballon* OR title:*Ballons*) AND status:active",after:$c){pageInfo{hasNextPage endCursor}edges{node{id title descriptionHtml}}}}`,{c:after});
  all.push(...r.data.products.edges.map(e=>e.node));
  if(!r.data.products.pageInfo.hasNextPage)break; after=r.data.products.pageInfo.endCursor;
}
function qtyOf(desc){
  const t=(desc||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ');
  let m=t.match(/Beutel à\s*(\d{2,4})\s*St(?:ü|ue)ck/i) || t.match(/(\d{2,4})er[- ]?Pack/i) || t.match(/à\s*(\d{2,4})\s*St(?:k|ück)/i) || t.match(/Set à\s*(\d{2,4})\s*St/i) || t.match(/(\d{2,4})\s*St(?:ü|ue)ck\b/i);
  return m?parseInt(m[1],10):null;
}
let changed=0, skipped=0;
for(const n of all){
  // Nur echte Ballon-Deko (kein Ballonärmel-Kleid, keine Ballonhose, kein Weinglas)
  if(/ärmel|kleid|shirt|bluse|top|pullover|hose|weinglas|glas|hai|rc /i.test(n.title)) { continue; }
  if(/·\s*\d+\s*St/i.test(n.title)) { skipped++; continue; } // schon dran
  const q=qtyOf(n.descriptionHtml);
  if(!q || q<10) { continue; }
  const nt=`${n.title} · ${q} Stück`;
  console.log((DRY?'[DRY] ':'')+nt);
  if(!DRY){ await gql(`mutation($in:ProductInput!){productUpdate(input:$in){userErrors{message}}}`,{in:{id:n.id,title:nt}}); await sleep(300); }
  changed++;
}
console.log(`\n${DRY?'WÜRDE ändern':'GEÄNDERT'}: ${changed} | schon-dran: ${skipped} | gescannt: ${all.length}`);
