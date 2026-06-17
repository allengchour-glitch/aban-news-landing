/* enrich_stickers.mjs — füllt fehlende Feed-Details bei Stickern (Google-Merchant „missing details").
 * Setzt pro Sticker eine REICHERE, EINZIGARTIGE Beschreibung (Motiv-bezogen) + seo.description (war null).
 * Token via Client-Credentials (SHOPIFY_CLIENT_ID/SECRET/SHOPIFY_SHOP aus Env). No-op ohne Creds.
 * Lauf: set -a; . /tmp/shopify_creds.env; set +a; node automation/enrich_stickers.mjs
 */
const SHOP=(process.env.SHOPIFY_SHOP||'au3j0y-hq.myshopify.com').replace(/^https?:\/\//,'').replace(/\/.*$/,'');
const CID=process.env.SHOPIFY_CLIENT_ID||'', CSEC=process.env.SHOPIFY_CLIENT_SECRET||'';
const API='2025-01';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function token(){ if(!CID||!CSEC){console.log('Keine Creds → No-op');return null;} const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }

const motifOf=(t)=>{ const m=t.match(/[«»"]([^«»"]+)[«»"]/); return (m?m[1]:t.replace(/Sticker|Schweiz-|·.*/gi,'').trim())||'Motiv'; };
function desc(title){
  const mo=motifOf(title);
  return `<p class="ls-liefer" style="background:#f4f6fb;border:1px solid #dde3ef;border-radius:10px;padding:10px 14px;font-size:13px;margin:0 0 14px;">📦 <strong>Lieferzeit</strong>: 🇨🇭 CH / 🇪🇺 EU <strong>3–7 Tage</strong> · 🇺🇸 USA 5–9 Tage · on-demand in Europa gedruckt</p>`
  +`<p><strong>${mo} – wetterfester Vinyl-Sticker von LuxeStyle.</strong> Hol dir das Motiv «${mo}» als hochwertigen Kiss-Cut-Aufkleber: kratz-, wasser- &amp; UV-beständig, mit sauber konturgeschnittenem Rand. Hält drinnen wie draussen und lässt sich rückstandsarm wieder ablösen.</p>`
  +`<p><strong>✨ Highlights</strong></p><ul>`
  +`<li>🛡️ Wetterfestes Premium-Vinyl – kratz-, UV- &amp; wasserbeständig</li>`
  +`<li>✂️ Kiss-Cut, exakt um das Motiv «${mo}» geschnitten</li>`
  +`<li>📏 3 Grössen: 7,6 cm · 10 cm · 14 cm</li>`
  +`<li>💻 Perfekt für Laptop, Trinkflasche, Auto, Handy, Notizbuch, Koffer &amp; Helm</li>`
  +`<li>🇨🇭 Schönes Schweizer Souvenir &amp; kleines Geschenk</li>`
  +`<li>♻️ Rückstandsarm ablösbar, langlebige Farben</li></ul>`
  +`<p><strong>📦 Service:</strong> 🇨🇭 Schweizer Shop · Gratis-Versand ab CHF 65 · 30 Tage Rückgabe · TWINT/Karte/PayPal · Code <strong>WELCOME10</strong> = –10%</p>`;
}
const seoDesc=(title)=>{ const mo=motifOf(title); return `Vinyl-Sticker «${mo}» – wetterfest, UV- & kratzbeständig, Kiss-Cut in 3 Grössen (7,6–14 cm). Für Laptop, Flasche, Auto & mehr. Schweizer Shop, Gratis-Versand ab CHF 65, –10% mit WELCOME10.`.slice(0,320); };

const M=`mutation($id:ID!,$d:String!,$s:SEOInput!){ productUpdate(input:{id:$id,descriptionHtml:$d,seo:$s}){ userErrors{message} } }`;

const tok=await token(); if(!tok){ process.exit(0); }
let cursor=null, done=0, updated=0, page=0;
while(true){
  const q=`query($c:String){ products(first:50,after:$c,query:"status:active AND product_type:Sticker"){ pageInfo{hasNextPage endCursor} nodes{ id title seo{description} } } }`;
  const r=await gql(tok,q,{c:cursor}); const pg=r?.data?.products; if(!pg){ console.log('query err',JSON.stringify(r).slice(0,200)); break; }
  page++;
  for(const p of pg.nodes){
    done++;
    const ur=await gql(tok,M,{id:p.id,d:desc(p.title),s:{title:`${p.title.replace(/\s*\|.*/,'')} · wetterfest`.slice(0,70),description:seoDesc(p.title)}});
    const e=ur?.data?.productUpdate?.userErrors||[];
    if(!e.length) updated++; else if(updated<3) console.log('err',p.title,JSON.stringify(e));
    await sleep(250);
  }
  console.log(`Seite ${page}: total ${done}, aktualisiert ${updated}`);
  if(!pg.pageInfo.hasNextPage) break; cursor=pg.pageInfo.endCursor;
}
console.log(`FERTIG: ${updated}/${done} Sticker angereichert (Beschreibung + seo.description).`);
