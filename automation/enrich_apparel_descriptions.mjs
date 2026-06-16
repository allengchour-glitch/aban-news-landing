#!/usr/bin/env node
/**
 * enrich_apparel_descriptions.mjs — füllt katalogweit die von Google geforderten
 * „Key details" (Farbe · Grösse · Material · Muster) in die Produktbeschreibung.
 *
 * Hintergrund (Merchant Center „Update product descriptions to include details
 * customers are looking for", User 2026-06-16): Kleider/Mode-Artikel ohne diese
 * Attribute werden im Feed schlechter/nicht ausgespielt. Dieses Skript hängt einen
 * sauberen, idempotenten <div class="ls-feed-details">-Block an die descriptionHtml an:
 *   Farbe   ← Varianten-Option „Farbe/Color" ODER aus Titel geparst
 *   Grösse  ← Varianten-Option „Grösse/Größe/Size" ODER Default XS–XL
 *   Material← aus Titel + Tags geparst (Seide/Satin/Leinen/Baumwolle/Spitze …)
 *   Muster  ← aus Titel geparst (Blumen/Streifen/Karo/Punkte …) sonst „Unifarben"
 *   Schnitt ← Midi/Maxi/Mini/… (Bonus)
 *
 * NUR Mode/Schuhe (productType/Titel-Erkennung) — andere Kategorien werden übersprungen.
 * Idempotent: Produkte mit dem Marker `ls-feed-details` werden nicht doppelt bearbeitet.
 * Resümierbar (einfach neu starten), THROTTLED-Backoff, MAX/Lauf, DRY=1.
 *
 * ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET  (ODER SHOPIFY_TOKEN)
 *      DRY=1   MAX=400   DELAY=300
 * Lauf:  node automation/enrich_apparel_descriptions.mjs
 */
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const CID = process.env.SHOPIFY_CLIENT_ID, SEC = process.env.SHOPIFY_CLIENT_SECRET;
const DRY = process.env.DRY === '1';
const MAX = parseInt(process.env.MAX || '0', 10);
const DELAY = parseInt(process.env.DELAY || '300', 10);
const API = '2025-01';
const MARKER = 'ls-feed-details';

// Mode/Schuhe erkennen (sonst skip)
const APPAREL_RE = /kleid|bluse|\btop\b|shirt|t-shirt|tshirt|oberteil|pullover|\bpulli\b|cardigan|sweatshirt|hoodie|strickjacke|tunika|\bhose\b|hosen|jeans|leggings|shorts|\brock\b|röcke|jacke|mantel|blazer|lederjacke|fleece|\bparka\b|\bweste\b|bikini|bademode|badeanzug|badehose|dessous|unterwäsche|negligee|bademantel|nachthemd|pyjama|jumpsuit|overall|\bschuh|sandale|sneaker|ballerina|stiefel|\bboots\b|pumps|loafer|espadrille|set\b/i;

const COLORS = { 'schwarz':'Schwarz','weiss':'Weiss','weiß':'Weiss','rot':'Rot','blau':'Blau','grün':'Grün','gruen':'Grün','gelb':'Gelb','rosa':'Rosa','pink':'Pink','lila':'Lila','violett':'Violett','grau':'Grau','braun':'Braun','beige':'Beige','creme':'Creme','khaki':'Khaki','gold':'Gold','silber':'Silber','türkis':'Türkis','tuerkis':'Türkis','marine':'Marineblau','navy':'Marineblau','bordeaux':'Bordeaux','orange':'Orange','nude':'Nude','apricot':'Apricot' };
const MATERIALS = [
  [/seide|maulbeerseide|silk/i,'Seide'],[/satin/i,'Satin'],[/leinen|linen/i,'Leinen'],
  [/baumwolle|cotton/i,'Baumwolle'],[/spitze|lace/i,'Spitze'],[/chiffon/i,'Chiffon'],
  [/samt|velvet/i,'Samt'],[/\bdenim\b|jeans/i,'Denim'],[/strick|knit|gestrickt/i,'Strick'],
  [/viskose|viscose/i,'Viskose'],[/plissee/i,'Plissee (Polyester)'],[/leder|leather/i,'Leder'],
  [/wolle|wool/i,'Wolle'],[/tüll|tulle/i,'Tüll'],[/jersey/i,'Jersey'],[/fleece/i,'Fleece'],
  [/cord|cordura/i,'Cord'],[/polyester/i,'Polyester'],[/elasthan|stretch|elastisch/i,'elastischer Stoff'],
];
const PATTERNS = [
  [/blumen|floral|blüten|flower/i,'Blumen'],[/gestreift|streifen|stripe/i,'Streifen'],
  [/kariert|\bkaro\b|plaid|check/i,'Karo'],[/punkte|dots|polka/i,'Punkte'],
  [/leo|leopard|animal/i,'Animal-Print'],[/paisley/i,'Paisley'],[/batik|tie.?dye/i,'Batik'],
  [/grafisch|graphic|print/i,'Print'],[/spitze|lace/i,'Spitzen-Muster'],
];
const CUTS = [[/maxi/i,'Maxi'],[/midi/i,'Midi'],[/\bmini\b/i,'Mini'],[/a-linie|a-line/i,'A-Linie'],
  [/etui/i,'Etui'],[/wickel/i,'Wickel'],[/oversize/i,'Oversized'],[/tailliert|figurbetont/i,'tailliert'],
  [/high.?waist/i,'High-Waist'],[/slim|skinny/i,'Slim']];

function pick(rules, hay, def){ for(const [re,v] of rules) if(re.test(hay)) return v; return def; }
function colorFrom(options, hay){
  const o = options.find(o=>/farbe|color|colour/i.test(o.name));
  if(o && o.values.length) return o.values.join(', ');
  const found=[]; for(const k in COLORS) if(new RegExp('\\b'+k+'\\b','i').test(hay)) if(!found.includes(COLORS[k])) found.push(COLORS[k]);
  return found.length ? found.join(', ') : 'verschiedene Farben';
}
function sizeFrom(options){
  const o = options.find(o=>/grösse|größe|grosse|size|weite/i.test(o.name));
  if(o && o.values.length) return o.values.join(', ');
  return 'XS, S, M, L, XL';
}
function buildBlock(p){
  const hay = (p.title+' '+p.tags.join(' ')).toLowerCase();
  const farbe = colorFrom(p.options, hay);
  const groesse = sizeFrom(p.options);
  const material = pick(MATERIALS, hay, 'hochwertiges Material');
  const muster = pick(PATTERNS, hay, 'Unifarben');
  const schnitt = pick(CUTS, hay, null);
  let li = `<li><strong>Farbe:</strong> ${farbe}</li>`
    + `<li><strong>Grösse:</strong> ${groesse}</li>`
    + `<li><strong>Material:</strong> ${material}</li>`
    + `<li><strong>Muster:</strong> ${muster}</li>`;
  if(schnitt) li += `<li><strong>Schnitt:</strong> ${schnitt}</li>`;
  return `<div class="${MARKER}"><h4>Produktdetails</h4><ul>${li}</ul></div>`;
}

async function shToken(){
  if(process.env.SHOPIFY_TOKEN) return process.env.SHOPIFY_TOKEN;
  if(!(SHOP && CID && SEC)) throw new Error('Keine Shopify-Creds.');
  const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:SEC,grant_type:'client_credentials'})});
  if(!r.ok) throw new Error('Token-Grant: '+r.status); return (await r.json()).access_token;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function gql(tok,query,variables){
  for(let a=0;a<6;a++){
    const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'X-Shopify-Access-Token':tok,'Content-Type':'application/json'},body:JSON.stringify({query,variables})});
    const j=await r.json();
    if((j.errors && JSON.stringify(j.errors).includes('THROTTLED'))||r.status===429){await sleep(2000*(a+1));continue;}
    if(j.errors) throw new Error(JSON.stringify(j.errors)); return j.data;
  } throw new Error('THROTTLED');
}

export { buildBlock, colorFrom, sizeFrom, MARKER, APPAREL_RE };

if (process.env.FEED_TEST === '1') { /* nur Logik */ }
else await (async()=>{
  const tok=await shToken();
  console.log(`enrich_apparel ${DRY?'[DRY] ':''}— ${SHOP}, MAX=${MAX||'∞'}`);
  let cursor=null, seen=0, done=0, skip=0, nonAppar=0;
  outer:
  do{
    const d=await gql(tok,`query($c:String){ products(first:50, after:$c){
      pageInfo{hasNextPage endCursor}
      nodes{ id title productType tags descriptionHtml options{name values} } } }`,{c:cursor});
    for(const p of d.products.nodes){
      seen++;
      const hay=(p.productType+' '+p.title).toLowerCase();
      if(!APPAREL_RE.test(hay)){ nonAppar++; continue; }
      if((p.descriptionHtml||'').includes(MARKER)){ skip++; continue; }
      const block=buildBlock(p);
      const html=(p.descriptionHtml||'')+'\n'+block;
      if(!DRY){ await gql(tok,`mutation($id:ID!,$h:String!){ productUpdate(input:{id:$id,descriptionHtml:$h}){ userErrors{message} } }`,{id:p.id,h:html}); await sleep(DELAY); }
      done++;
      if(MAX && done>=MAX){ console.log('MAX erreicht — nächster Lauf macht weiter.'); break outer; }
    }
    cursor=d.products.pageInfo.hasNextPage?d.products.pageInfo.endCursor:null;
    if(seen%500===0) console.log(`… ${seen} gesehen · ${done} ergänzt · ${skip} schon ok`);
  }while(cursor);
  console.log(`\n✅ ${DRY?'[DRY] ':''}Fertig: ${seen} gesehen · Beschriebig ergänzt ${done} · schon ok ${skip} · keine Mode ${nonAppar}`);
})().catch(e=>{console.error('❌',e.message);process.exit(1);});
