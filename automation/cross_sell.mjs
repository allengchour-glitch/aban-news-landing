#!/usr/bin/env node
/**
 * cross_sell.mjs — hängt aktiven Produkten OHNE internen Collection-Link eine themen-passende
 * „🛍️ Das könnte dir auch gefallen"-Box an (interne Verlinkung = SEO + AOV).
 *
 * Wählt die Ziel-Collection deterministisch aus Tags/Produkttyp (nur VERIFIZIERTE Handles).
 * Idempotent: überspringt Produkte, deren Beschreibung schon einen /collections/-Link enthält.
 * Body wird per GraphQL-Variable gesetzt (kein Escaping/Timeout-Risiko), 1 productUpdate/Produkt.
 *
 * No-op-sicher · DRY-Default · LIVE=1 · SCAN=Anzahl zuletzt geänderter Produkte (Default 300, max 3000).
 * ENV: SHOPIFY_SHOP + (SHOPIFY_ADMIN_TOKEN | SHOPIFY_CLIENT_ID+SHOPIFY_CLIENT_SECRET)
 */
const SHOP=process.env.SHOPIFY_SHOP||'', TOK_ST=process.env.SHOPIFY_ADMIN_TOKEN||'',
  CID=process.env.SHOPIFY_CLIENT_ID||'', CS=process.env.SHOPIFY_CLIENT_SECRET||'',
  LIVE=process.env.LIVE==='1', SCAN=Math.min(parseInt(process.env.SCAN||'300',10),3000),
  MAXFIX=Math.min(parseInt(process.env.MAXFIX||'150',10),1000), API='2025-01';

async function getToken(){
  if(!(CID&&CS)&&TOK_ST) return TOK_ST;
  if(SHOP&&CID&&CS){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CS,grant_type:'client_credentials'})});
    const j=await r.json().catch(()=>({})); return j.access_token||''; }
  return TOK_ST||'';
}
async function gql(token,query,variables){
  const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',
    headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query,variables})});
  const j=await r.json(); if(j.errors) throw new Error('GraphQL: '+JSON.stringify(j.errors).slice(0,300)); return j.data;
}
// verifizierte Collection-Handles → Label
const C={schmuck:['premium-schmuck','Schmuck & Uhren'],herren:['fur-ihn','Für Ihn'],damen:['damen-mode','Damenmode'],
  premium:['luxestyle-premium','Premium-Marken'],wohnen:['wohnen-dekoration','Wohnen & Deko'],gadget:['trends-gadgets','Trends & Gadgets'],
  schweiz:['erste-august','Schweiz-Edition'],sommer:['sommer','Sommer'],geschenk:['premium-geschenke','Geschenkideen']};
function target(tags,type){
  const t=(tags.join(' ')+' '+(type||'')).toLowerCase();
  if(/schmuck|ring|kette|armband|ohrring|halskette|uhr/.test(t)) return C.schmuck;
  if(/herren|männer|manner|mann\b/.test(t)) return C.herren;
  if(/schweiz|sticker|poster|mauspad|edelweiss|matterhorn/.test(t)) return C.schweiz;
  if(/diffuser|aroma|wohnen|deko|kissen|lampe|beleuchtung|kerze/.test(t)) return C.wohnen;
  if(/gadget|tech|auto|elektronik|haushalt|küche|kueche/.test(t)) return C.gadget;
  if(/sommer|bikini|bademode|strand/.test(t)) return C.sommer;
  if(/damen|kleid|rock|bluse|mode/.test(t)) return C.damen;
  if(/highend|premium|luxus|bigbuy/.test(t)) return C.premium;
  return C.geschenk;
}
const box=(h,l)=>`<p><strong>🛍️ Das könnte dir auch gefallen:</strong> <a href="/collections/${h}">${l}</a> · <a href="/collections/bestseller-premium-heroes">Bestseller</a></p>`;

async function main(){
  const report={ ts:new Date().toISOString(), live:LIVE };
  if(!SHOP){ console.log('no-op: kein SHOPIFY_SHOP.'); return; }
  const token=await getToken(); if(!token){ console.log('no-op: kein Token.'); return; }

  let prods=[], cur=null;
  while(prods.length<SCAN){
    const d=await gql(token,`query($c:String){ products(first:100, after:$c, sortKey:UPDATED_AT, reverse:true, query:"status:active"){ pageInfo{hasNextPage endCursor} nodes{ id tags productType descriptionHtml } } }`,{c:cur});
    prods.push(...d.products.nodes);
    if(!d.products.pageInfo.hasNextPage) break; cur=d.products.pageInfo.endCursor;
  }
  prods=prods.slice(0,SCAN); report.scanned=prods.length;

  const todo=prods.filter(p=>!(p.descriptionHtml||'').includes('/collections/'));
  report.missingCrossSell=todo.length;

  if(LIVE && todo.length){
    let fixed=0;
    for(const p of todo.slice(0,MAXFIX)){
      const [h,l]=target(p.tags||[], p.productType);
      const html=(p.descriptionHtml||'')+box(h,l);
      const d=await gql(token,`mutation($id:ID!,$html:String!){ productUpdate(input:{id:$id, descriptionHtml:$html}){ product{id} userErrors{message} } }`,{id:p.id,html});
      if(!d.productUpdate.userErrors.length) fixed++;
    }
    report.crossSellAdded=fixed;
  }
  console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{ console.error('Fehler:',e.message); process.exit(0); });
