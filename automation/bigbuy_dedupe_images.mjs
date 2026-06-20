#!/usr/bin/env node
/* bigbuy_dedupe_images — entfernt aus tag:bigbuy-Produkten Bilder, die „nicht in den Shop passen":
 *   (1) Spanische GRÖSSENTABELLEN-Bilder (Dateiname enthält tallas/size-chart/guia-talla/tabla-talla)
 *   (2) exakte DOPPELTE Bilder im selben Produkt (gleiche CDN-Datei mehrfach) → nur erstes behalten
 * Schutz: löscht NIE das letzte/einzige Bild — es bleibt immer mind. 1 echtes Produktfoto übrig.
 * Zwei-Phasen (sammeln, dann löschen) + Stall-Guard gegen instabilen Such-Index.
 * DRY-Default. LIVE=1 löscht. ENV: SHOPIFY_*.
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const JUNK=/tallas|size.?chart|guia.?talla|tabla.?talla|gruppe?n.?bild|grossentab/i;
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}

const t=await tk();if(!t){console.error('Kein Token');process.exit(1);}
const Q=`query($c:String){ products(first:50, query:"tag:bigbuy status:active", after:$c){ pageInfo{hasNextPage endCursor} edges{ node{ id title media(first:25){ edges{ node{ ... on MediaImage{ id image{ url } } } } } } } } }`;
let c=null,items=[],seen=new Set(),stall=0,pages=0;
do{const r=await gql(t,Q,{c});const pg=r?.data?.products;if(!pg){await sleep(2500);continue;}const b=items.length;
 for(const e of pg.edges){if(seen.has(e.node.id))continue;seen.add(e.node.id);items.push(e.node);}
 if(items.length===b){if(++stall>=5){console.log('  ⚠️ STALL bei',items.length);break;}}else stall=0;
 c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null;pages++;if(pages%20===0)console.log('  Phase1 …',items.length);
}while(c);
console.log(`Phase 1: ${items.length} bigbuy-Produkte.`);

let prodsTouched=0, delJunk=0, delDup=0, protectedLast=0;
for(const n of items){
 const imgs=(n.media?.edges||[]).map(e=>e.node).filter(x=>x&&x.id&&x.image?.url);
 if(imgs.length<=1) continue;
 const toDelete=new Set();
 // (1) Junk (Grössentabellen)
 const junk=imgs.filter(x=>JUNK.test(x.image.url.split('/').pop().split('?')[0]));
 for(const j of junk) toDelete.add(j.id);
 // (2) exakte Doppel: gleiche Datei mehrfach → erstes behalten
 const byFile=new Map();
 for(const x of imgs){const f=x.image.url.split('/').pop().split('?')[0];if(byFile.has(f))toDelete.add(x.id);else byFile.set(f,x.id);}
 if(!toDelete.size) continue;
 // Schutz: nie alle Bilder löschen — mind. 1 muss bleiben
 const keep=imgs.filter(x=>!toDelete.has(x.id));
 if(keep.length===0){ // alle wären weg → das erste behalten
   const first=imgs[0].id; if(toDelete.has(first)){toDelete.delete(first);protectedLast++;}
 }
 const ids=[...toDelete];
 const nJunk=ids.filter(id=>junk.some(j=>j.id===id)).length;
 delJunk+=nJunk; delDup+=ids.length-nJunk; prodsTouched++;
 if(LIVE){
   const r=await gql(t,`mutation($pid:ID!,$ids:[ID!]!){ productDeleteMedia(productId:$pid, mediaIds:$ids){ deletedMediaIds userErrors{ message } } }`,{pid:n.id,ids});
   const e=r?.data?.productDeleteMedia?.userErrors||[];if(e.length)console.log(' ⚠️',n.title.slice(0,30),JSON.stringify(e).slice(0,100));
   await sleep(350);
 }
 if(prodsTouched%50===0)console.log(`  … ${prodsTouched} Produkte bereinigt`);
}
console.log(`\nFertig. Produkte bereinigt: ${prodsTouched} · Grössentabellen entfernt: ${delJunk} · exakte Doppel entfernt: ${delDup} · letztes Bild geschützt: ${protectedLast} ${LIVE?'':'(DRY)'}`);
