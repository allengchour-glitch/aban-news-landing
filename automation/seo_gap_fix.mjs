/* seo_gap_fix.mjs — schliesst SEO-Lücken katalogweit: setzt fehlende seo.title / seo.description
 * bei AKTIVEN Produkten (häufiger Import-Drift). Token via Client-Credentials (Env). No-op ohne Creds.
 * Lauf: set -a; . /tmp/shopify_creds.env; set +a; node automation/seo_gap_fix.mjs
 */
const SHOP=(process.env.SHOPIFY_SHOP||'au3j0y-hq.myshopify.com').replace(/^https?:\/\//,'').replace(/\/.*$/,'');
const CID=process.env.SHOPIFY_CLIENT_ID||'', CSEC=process.env.SHOPIFY_CLIENT_SECRET||'', API='2025-01';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function gql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}
async function token(){if(!CID||!CSEC){console.log('Keine Creds → No-op');return null;}const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json().catch(()=>({}))).access_token||null;}
const clean=s=>(s||'').replace(/\s*\|.*$/,'').replace(/[«»]/g,'').trim();
const M=`mutation($id:ID!,$s:SEOInput!){ productUpdate(input:{id:$id,seo:$s}){ userErrors{message} } }`;

const tok=await token(); if(!tok) process.exit(0);
let cursor=null, scanned=0, fixed=0, page=0;
while(true){
  const q=`query($c:String){ products(first:60,after:$c,query:"status:active"){ pageInfo{hasNextPage endCursor} nodes{ id title productType seo{title description} } } }`;
  const r=await gql(tok,q,{c:cursor}); const pg=r?.data?.products; if(!pg){ console.log('query err',JSON.stringify(r).slice(0,200)); break; }
  page++;
  for(const p of pg.nodes){
    scanned++;
    const needT=!p.seo?.title || !p.seo.title.trim();
    const needD=!p.seo?.description || !p.seo.description.trim();
    if(!needT && !needD) continue;
    const base=clean(p.title);
    const s={};
    s.title = needT ? `${base} | LuxeStyle`.slice(0,70) : p.seo.title;
    s.description = needD ? `${base}${p.productType?(' – '+p.productType):''} bei LuxeStyle Schweiz. Gratis-Versand ab CHF 65, 30 Tage Rückgabe, sichere Zahlung (TWINT/Karte/PayPal), –10% mit Code WELCOME10.`.slice(0,320) : p.seo.description;
    const u=await gql(tok,M,{id:p.id,s});
    if(!(u?.data?.productUpdate?.userErrors||[]).length) fixed++; else if(fixed<3) console.log('err',base,JSON.stringify(u?.data?.productUpdate?.userErrors));
    await sleep(200);
  }
  if(page%5===0) console.log(`… ${scanned} gescannt, ${fixed} SEO-Lücken gefüllt`);
  if(!pg.pageInfo.hasNextPage) break; cursor=pg.pageInfo.endCursor;
}
console.log(`FERTIG: ${scanned} aktive Produkte gescannt, ${fixed} SEO-Lücken (Titel/Description) gefüllt.`);
