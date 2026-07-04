#!/usr/bin/env node
/* collection_polish — füllt Lücken bei Collections (mit Produkten):
 *   - fehlendes Hero-Bild  -> erstes Produktbild der Collection
 *   - fehlender SEO-Titel   -> "<Titel> kaufen | LuxeStyle Schweiz"
 *   - dünne/keine Beschreibung -> Premium-Standardtext + USPs
 * Idempotent (füllt nur Lücken). LIVE=1 schreibt. ENV: SHOPIFY_*.
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<7;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}const j=await r.json();
  // GraphQL-Level-Throttling (HTTP 200 + data:null + THROTTLED) ebenfalls erneut versuchen
  if((j?.data==null)&&Array.isArray(j?.errors)&&j.errors.some(e=>/THROTTLED/i.test(e?.extensions?.code||e?.message||''))){await sleep((a+1)*2500);continue;}
  return j;}return null;}
const clean=s=>s.replace(/[^\p{L}\p{N}\s&·.,'-]/gu,'').replace(/\s+/g,' ').trim();
const cut=(s,n)=>s.length<=n?s:s.slice(0,n-1).trim()+'…';

const t=await tk(); if(!t){console.error('Kein Token');process.exit(1);}
// products(first:30) + Status: Draft-/bildlose Produkte sortieren teils zuerst → erstes AKTIVES mit Bild nehmen
const Q=`query($c:String){ collections(first:25, after:$c){ pageInfo{hasNextPage endCursor} edges{ node{ id handle title productsCount{count} image{url} descriptionHtml seo{title description} products(first:20){edges{node{status featuredImage{url}}}} } } } }`;
let c=null, scanned=0, fImg=0, fSeo=0, fDesc=0;
do{
  const r=await gql(t,Q,{c}); const pg=r?.data?.collections; if(!pg) break;
  for(const e of pg.edges){
    const x=e.node; if(x.productsCount.count<1) continue; scanned++;
    const ct=clean(x.title)||x.handle;
    const input={id:x.id}; let touch=false;
    if(!x.image){ const cand=(x.products?.edges||[]).map(e=>e.node).filter(n=>n.status==='ACTIVE'&&n.featuredImage?.url); const pi=(cand[0]||x.products?.edges?.find(e=>e.node.featuredImage?.url)?.node)?.featuredImage?.url; if(pi){ input.image={src:pi, altText:ct}; fImg++; touch=true; } }
    if(!x.seo?.title){ input.seo={title:cut(`${ct} kaufen | LuxeStyle Schweiz`,70), description:cut(`${ct} online kaufen bei LuxeStyle: kuratierte Premium-Auswahl, Gratis-Versand ab CHF 65, 30 Tage Rückgabe, schnelle Lieferung in die Schweiz.`,160)}; fSeo++; touch=true; }
    const txt=(x.descriptionHtml||'').replace(/<[^>]*>/g,'').trim();
    if(txt.length<40){ input.descriptionHtml=`<p><strong>${ct}</strong> bei LuxeStyle – kuratierte Auswahl für die Schweiz.</p><ul><li>✓ Premium-Qualität, sorgfältig ausgewählt</li><li>🚚 Gratis-Versand ab CHF 65</li><li>↩️ 30 Tage Rückgabe · TWINT, Karte &amp; PayPal</li><li>🇨🇭 Schweizer Shop · schnelle Lieferung</li></ul>`; fDesc++; touch=true; }
    if(touch && LIVE){ const u=await gql(t,`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}`,{i:input}); const er=u?.data?.collectionUpdate?.userErrors||[]; if(er.length) console.log('  ⚠️',x.handle,JSON.stringify(er).slice(0,120)); await sleep(120); }
  }
  c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null;
  if(scanned%100===0) console.log(`  … ${scanned} gescannt`);
}while(c);
console.log(`Fertig. Gescannt ${scanned} · Hero gesetzt ${fImg} · SEO gesetzt ${fSeo} · Beschreibung gesetzt ${fDesc} ${LIVE?'':'(DRY)'}`);
