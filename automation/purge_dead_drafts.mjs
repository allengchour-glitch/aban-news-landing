/* purge_dead_drafts.mjs — löscht endgültig tote Draft-Produkte (User 2026-07-12: «checke, bearbeite
 * und lösche, habe alle angesehen, 24/7 auto»). NUR DRAFTs mit Junk-Tags (nie aktive/verkäufliche Ware):
 *   nicht-lieferbar-ch (nie CH-lieferbar) · duplikat-auto-draft (redundant) ·
 *   ausverkauft-lieferant (BigBuy ausverkauft, Import deaktiviert) · nicht-fit-auto-draft (off-brand).
 * Selbst-resümierend: löscht die ersten N Treffer, wiederholt bis 0 (gelöschte verschwinden aus der Menge).
 * Sicherheits-Guard: query erzwingt status:draft — ein aktives Produkt kann NIE gelöscht werden.
 * ENV: SHOPIFY_CLIENT_ID/SECRET · [GAP=450] · [MAX=100000]
 */
import fs from 'node:fs';
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const SHOP='au3j0y-hq.myshopify.com';
const GAP=parseInt(process.env.GAP||'450',10);
const MAX=parseInt(process.env.MAX||'100000',10);
const Q='status:draft AND (tag:nicht-lieferbar-ch OR tag:duplikat-auto-draft OR tag:ausverkauft-lieferant OR tag:nicht-fit-auto-draft)';
const LEDGER='dropship/_purged_count.txt';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function scc(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
let TOK=await scc();
async function gql(q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(JSON.stringify(j.errors||'').includes('Throttled')){await sleep(3000);continue;}TOK=await scc();await sleep(1000);}return{};}
const LIST=`query($q:String!){products(first:50,query:$q){edges{node{id title}}}}`;
const DEL=`mutation($id:ID!){productDelete(input:{id:$id}){deletedProductId userErrors{message}}}`;
let total=fs.existsSync(LEDGER)?parseInt(fs.readFileSync(LEDGER,'utf8').trim()||'0',10):0;
console.log('Purge-Start. bisher gelöscht (Ledger):',total);
let round=0;
while(total<MAX){
  const j=await gql(LIST,{q:Q});
  const edges=j.data?.products?.edges||[];
  if(edges.length===0){console.log('✅ FERTIG — keine toten Drafts mehr. Gesamt gelöscht:',total);break;}
  for(const e of edges){
    const r=await gql(DEL,{id:e.node.id});
    const err=r.data?.productDelete?.userErrors||[];
    if(err.length){console.log('✗',e.node.title?.slice(0,30),JSON.stringify(err).slice(0,80));}
    else{total++;}
    await sleep(GAP);
  }
  round++;
  fs.writeFileSync(LEDGER,String(total));
  if(round%2===0)console.log(`  ...${total} gelöscht`);
}
fs.writeFileSync(LEDGER,String(total));
console.log('Purge-Ende. Gesamt gelöscht:',total);
