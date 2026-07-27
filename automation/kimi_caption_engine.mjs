/* kimi_caption_engine.mjs — verbrennt Kimi-Guthaben PRODUKTIV: Schweizer IG/FB-Captions für Produkte quer
 * durch den GANZEN Katalog (persistenter Cursor → jeder Neustart macht vorwärts weiter, überlebt Reaps).
 * Dedup-sicher (Ledger + Caption-Signatur). Stoppt bei leerem Guthaben (3× null). Retry gegen k3-Reasoning.
 * ENV: SHOPIFY_CLIENT_ID/SECRET, KIMI_KEY. [KCAP_MAX=2000] [SLEEP=400]
 */
import fs from 'node:fs';
import { kimi } from '/home/user/aban-news-landing/automation/kimi.mjs';
const CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,SHOP='au3j0y-hq.myshopify.com';
const MAX=parseInt(process.env.KCAP_MAX||'2000',10);
const SLEEP=parseInt(process.env.SLEEP||'400',10);
const CSV='social/posts_image.csv';
const LEDGER='/tmp/kimi_cap_ledger.txt';
const CURSOR='/tmp/kimi_cap_cursor.txt';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9äöü ]/g,'').slice(0,45);
async function scc(){for(let a=0;a<5;a++){try{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});const t=JSON.parse(await r.text()).access_token;if(t)return t;}catch{}await sleep(2000*(a+1));}throw new Error('scc');}
let TOK=await scc();
const g=async(q,v)=>{for(let a=0;a<6;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(JSON.stringify(j.errors||'').includes('Throttled')){await sleep(4000);continue;}TOK=await scc();await sleep(1000);}return null;};

const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').filter(Boolean):[]);
const qsig=new Set();
if(fs.existsSync(CSV)){ for(const m of fs.readFileSync(CSV,'utf8').matchAll(/,"([^"]{10,})"/g)) qsig.add(norm(m[1])); }
function appendRow(id,img,cap){
  const lock=CSV+'.lock';
  for(let i=0;i<50;i++){ try{ fs.writeFileSync(lock,'1',{flag:'wx'}); break; }catch{ if(i===49)return false; } }
  try{ let csv=fs.readFileSync(CSV,'utf8'); if(!csv.endsWith('\n'))csv+='\n';
    const esc=x=>'"'+String(x).replace(/"/g,'""')+'"';
    const slug=(cap.split('\n')[0]||'p').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,32);
    csv+=['kimi-'+slug+'-'+id.split('/').pop(),'2026-08-01',img,esc(cap),esc('instagram,facebook'),'ready','',''].join(',')+'\n';
    fs.writeFileSync(CSV,csv);
  } finally { try{fs.unlinkSync(lock);}catch{} }
  return true;
}
const SYS='WICHTIG: Denke NICHT, keine Analyse, keine Anführungszeichen. Gib direkt die Caption. Schweizer Social-Copywriter für luxestyle.ch. Max 2 kurze Sätze mit 1-2 Emojis, dann Leerzeile, dann GENAU 6 Hashtags (Produkt + #schweiz #luxestyle). Hochdeutsch, kein Preis.';

let cursor = fs.existsSync(CURSOR) ? (fs.readFileSync(CURSOR,'utf8').trim()||null) : null;
let made=0, nulls=0, scanned=0;
outer:
while(made<MAX){
  const r=await g(`query($c:String){products(first:5,query:"status:active",after:$c){pageInfo{hasNextPage endCursor}edges{cursor node{id title featuredImage{url}}}}}`,{c:cursor});
  if(!r){ await sleep(3000); continue; }
  const edges=r.data.products.edges;
  for(const e of edges){
    const n=e.node; scanned++;
    if(!n.featuredImage?.url || done.has(n.id)){ continue; }
    done.add(n.id); fs.appendFileSync(LEDGER,n.id+'\n');
    let cap=null;
    for(let att=0; att<3; att++){
      const c=await kimi(SYS, `Produkt: "${n.title}". Vorteil: Blitzversand aus der Schweiz, Kauf auf Rechnung. Schreibe NUR die Caption, beginne direkt mit dem Text.`, {max_tokens:280,timeout:30000});
      if(c===null){ nulls++; break; }
      nulls=0;
      const metaLeak=/\b(the user|der user|we need|i need|caption for|social media caption|sentences with|hochdeutsch|want(s)? (a|me)|let'?s craft|begin directly|advantages?\b)\b/i.test(c);
      if(c.includes('#') && !metaLeak && c.split('#').length>=4){ cap=c; break; }
    }
    if(nulls>=3){ console.log('### Kimi 3x null → Guthaben leer. STOPP. gemacht='+made); break outer; }
    if(!cap) continue;
    const sig=norm(cap); if(qsig.has(sig)) continue; qsig.add(sig);
    if(appendRow(n.id,n.featuredImage.url,cap.trim())){ made++; if(made%10===0)console.log('  '+made+' Captions | gescannt '+scanned); }
    await sleep(SLEEP);
  }
  // Cursor NACH jeder Seite persistieren → Neustart macht vorwärts weiter
  cursor=r.data.products.pageInfo.endCursor;
  fs.writeFileSync(CURSOR, cursor||'');
  if(!r.data.products.pageInfo.hasNextPage){ console.log('### Katalog-Ende erreicht bei '+made+' Captions. Cursor-Reset.'); fs.writeFileSync(CURSOR,''); break; }
}
console.log('FERTIG. neue Captions:',made,'| gescannt:',scanned);
