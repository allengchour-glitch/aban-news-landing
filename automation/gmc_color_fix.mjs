#!/usr/bin/env node
/* gmc_color_fix — setzt das Google/Microsoft-Attribut `color` (mm-google-shopping.color)
 * aus dem Produkttitel (deutsche Farbwörter). Behebt die Merchant-Empfehlung „Farbe ergänzen".
 * Nur wo eine klare Farbe im Titel steht. Zwei-Phasen + Stall-Guard. LIVE=1 schreibt.
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}
// Reihenfolge: längere/spezifische zuerst
const COLORS=[['marineblau','Marineblau'],['türkis','Türkis'],['hellblau','Hellblau'],['dunkelblau','Dunkelblau'],['hellgrau','Hellgrau'],['dunkelgrau','Dunkelgrau'],['silberfarben','Silber'],['gold','Gold'],['silber','Silber'],['schwarz','Schwarz'],['weiß','Weiß'],['weiss','Weiß'],['blau','Blau'],['rot','Rot'],['grün','Grün'],['gelb','Gelb'],['rosa','Rosa'],['pink','Pink'],['lila','Lila'],['violett','Violett'],['grau','Grau'],['braun','Braun'],['beige','Beige'],['orange','Orange'],['bunt','Mehrfarbig'],['navy','Marineblau'],['creme','Creme']];
function colorOf(title){const s=(title||'').toLowerCase();for(const [k,v] of COLORS){if(s.includes(k))return v;}return null;}

const t=await tk();if(!t){console.error('Kein Token');process.exit(1);}
const Q=`query($c:String){ products(first:50, query:"tag:bigbuy status:active", after:$c){ pageInfo{hasNextPage endCursor} edges{ node{ id title col:metafield(namespace:"mm-google-shopping",key:"color"){value} } } } }`;
let c=null,items=[],seen=new Set(),stall=0,pages=0;
do{const r=await gql(t,Q,{c});const pg=r?.data?.products;if(!pg){await sleep(2500);continue;}const b=items.length;
 for(const e of pg.edges){if(seen.has(e.node.id))continue;seen.add(e.node.id);items.push(e.node);}
 if(items.length===b){if(++stall>=4)break;}else stall=0;
 c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null;pages++;if(pages%20===0)console.log('  Phase1 …',items.length);
}while(c);
console.log(`Phase 1: ${items.length} Produkte.`);
let set=0,skip=0,batch=[];
async function flush(){if(!batch.length)return;const r=await gql(t,`mutation($mf:[MetafieldsSetInput!]!){metafieldsSet(metafields:$mf){userErrors{message}}}`,{mf:batch});const e=r?.data?.metafieldsSet?.userErrors||[];if(e.length)console.log(' ⚠️',JSON.stringify(e).slice(0,140));batch=[];}
for(const n of items){ if(n.col?.value){skip++;continue;} const col=colorOf(n.title); if(!col){skip++;continue;}
 if(LIVE){batch.push({ownerId:n.id,namespace:'mm-google-shopping',key:'color',type:'single_line_text_field',value:col});if(batch.length>=20)await flush();}
 set++; }
if(LIVE)await flush();
console.log(`Fertig. color gesetzt: ${set} · ohne Farbwort/schon gesetzt: ${skip} ${LIVE?'':'(DRY)'}`);
