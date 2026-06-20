#!/usr/bin/env node
/* product_trust_fill — hängt an JEDES aktive Produkt ohne Trust-Block den Standard-Trust-Block an.
 * Macht Produkte „verkaufsfertig": Gratis-Versand / 30 Tage Rückgabe / WELCOME10 in jeder Beschreibung.
 * Idempotent: überspringt Produkte, die bereits Trust-Marker haben. KEINE Fake-Reviews (Trust ≠ Bewertung).
 * Zwei-Phasen (sammeln, dann schreiben) + Stall-Guard. DRY-Default. LIVE=1 schreibt. ENV: SHOPIFY_*.
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const TRUST=`<p>🇨🇭 Schweizer Shop · 🚚 Gratis-Versand ab CHF 65 · ↩️ 30 Tage Rückgabe · Code <strong>WELCOME10</strong> = –10%</p>`;
const HAS=/Gratis-Versand ab CHF 65|30 Tage Rückgabe|WELCOME10|Sichere Bezahlung|TWINT/i;
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}

const t=await tk();if(!t){console.error('Kein Token');process.exit(1);}
const Q=`query($c:String){products(first:100,query:"status:active",after:$c){pageInfo{hasNextPage endCursor}edges{node{id descriptionHtml}}}}`;
let c=null,items=[],seen=new Set(),stall=0,pages=0;
do{const r=await gql(t,Q,{c});const pg=r?.data?.products;if(!pg){await sleep(2500);continue;}const b=items.length;
 for(const e of pg.edges){if(seen.has(e.node.id))continue;seen.add(e.node.id);items.push(e.node);}
 if(items.length===b){if(++stall>=6){console.log('  ⚠️ STALL bei',items.length);break;}}else stall=0;
 c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null;pages++;if(pages%20===0)console.log('  Phase1 …',items.length);
}while(c);
console.log(`Phase 1: ${items.length} aktive Produkte.`);

let need=items.filter(n=>!HAS.test(n.descriptionHtml||''));
console.log(`Ohne Trust-Block: ${need.length}`);
let done=0,batch=[];
async function flush(){if(!batch.length)return;const al=batch.map((b,i)=>`u${i}:productUpdate(input:$i${i}){userErrors{message}}`).join('\n');const vars=`(${batch.map((b,i)=>`$i${i}:ProductInput!`).join(',')})`;const r=await gql(t,`mutation${vars}{${al}}`,Object.fromEntries(batch.map((b,i)=>[`i${i}`,b])));const e=Object.values(r?.data||{}).flatMap(x=>x.userErrors||[]);if(e.length)console.log(' ⚠️',JSON.stringify(e).slice(0,160));batch=[];}
for(const n of need){
 const desc=(n.descriptionHtml||'')+'\n'+TRUST;
 if(LIVE){batch.push({id:n.id,descriptionHtml:desc});if(batch.length>=10)await flush();}
 done++;if(done%200===0)console.log(`  … ${done}/${need.length}`);
}
if(LIVE)await flush();
console.log(`Fertig. Trust-Block ergänzt: ${done} ${LIVE?'':'(DRY)'}`);
