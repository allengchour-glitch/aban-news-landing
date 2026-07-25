/* kimi_caption_engine.mjs — verbrennt das Kimi-Guthaben PRODUKTIV: generiert diverse Schweizer IG/FB-Captions
 * für Produkte quer über den ganzen Katalog und hängt sie dedup-sicher an social/posts_image.csv.
 * Stoppt automatisch, wenn Kimi kein Guthaben mehr liefert (3× null in Folge). Ledger gegen Doppel-Arbeit.
 * Doppelpost-sicher: Caption-Signatur gegen bestehende Queue + Ledger. ENV: SHOPIFY_CLIENT_ID/SECRET, KIMI_KEY.
 * [KCAP_MAX=800] [SLEEP=1200]
 */
import fs from 'node:fs';
import { kimi } from '/home/user/aban-news-landing/automation/kimi.mjs';
const CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,SHOP='au3j0y-hq.myshopify.com';
const MAX=parseInt(process.env.KCAP_MAX||'800',10);
const SLEEP=parseInt(process.env.SLEEP||'1200',10);
const CSV='social/posts_image.csv';
const LEDGER='/tmp/kimi_cap_ledger.txt';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9äöü ]/g,'').slice(0,45);
async function scc(){for(let a=0;a<5;a++){try{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});const t=JSON.parse(await r.text()).access_token;if(t)return t;}catch{}await sleep(2000*(a+1));}throw new Error('scc');}
let TOK=await scc();
const g=async(q,v)=>{for(let a=0;a<6;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(JSON.stringify(j.errors||'').includes('Throttled')){await sleep(4000);continue;}TOK=await scc();await sleep(1000);}return null;};

const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').filter(Boolean):[]);
function queuedSigs(){ const s=new Set(); if(!fs.existsSync(CSV))return s; const t=fs.readFileSync(CSV,'utf8'); // grobe Signatur aus jeder Caption-Spalte
  for(const m of t.matchAll(/,"([^"]{10,})"/g)){ s.add(norm(m[1])); } return s; }
function appendRow(id,img,cap){ // mit einfachem Lock gegen Autocommitter/Parallellauf
  const lock=CSV+'.lock';
  for(let i=0;i<50;i++){ try{ fs.writeFileSync(lock,'1',{flag:'wx'}); break; }catch{ if(i===49)return false; } }
  try{ let csv=fs.readFileSync(CSV,'utf8'); if(!csv.endsWith('\n'))csv+='\n';
    const esc=x=>'"'+String(x).replace(/"/g,'""')+'"';
    const slug=(cap.split('\n')[0]||'p').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,32);
    const rid='kimi-'+slug+'-'+id.split('/').pop();
    csv+=[rid,'2026-08-01',img,esc(cap),esc('instagram,facebook'),'ready','',''].join(',')+'\n';
    fs.writeFileSync(CSV,csv);
  } finally { try{fs.unlinkSync(lock);}catch{} }
  return true;
}

const SYS='WICHTIG: Denke NICHT, keine Analyse, keine Anführungszeichen. Gib direkt die Caption. Schweizer Social-Copywriter für luxestyle.ch. Max 2 kurze Sätze mit 1-2 Emojis, dann Leerzeile, dann GENAU 6 Hashtags (Produkt + #schweiz #luxestyle). Hochdeutsch, kein Preis.';
// diverse Kollektionen rotieren für Bild-Vielfalt
const COLLS=['damen-mode','fur-ihn','premium-schmuck','uhren','premium-beauty','parfum-duefte','trends-gadgets','sub-kueche','sub-haustier','wohnen-dekoration','fitness-training','schuhe','beleuchtung-lampen','spielzeug','garten-balkon','elektronik-technik'];
let made=0, nulls=0, ci=0;
const qsig=queuedSigs();
outer:
while(made<MAX){
  const coll=COLLS[ci++%COLLS.length];
  const r=await g(`query($q:String!){products(first:20,query:$q){edges{node{id title featuredImage{url}}}}}`,{q:'collection:'+coll+' status:active'});
  if(!r){ await sleep(3000); continue; }
  const edges=(r.data?.products?.edges||[]).filter(e=>e.node.featuredImage?.url);
  for(const {node:n} of edges){
    if(made>=MAX) break outer;
    if(done.has(n.id)) continue;
    done.add(n.id); fs.appendFileSync(LEDGER,n.id+'\n');
    const cap=await kimi(SYS, `Produkt: "${n.title}". Vorteil: Blitzversand aus der Schweiz, Kauf auf Rechnung. Schreibe die Caption.`, {max_tokens:280,timeout:60000});
    if(!cap){ nulls++; if(nulls>=3){ console.log('### Kimi liefert 3× null → Guthaben vermutlich leer. STOPP. gemacht='+made); break outer; } continue; }
    nulls=0;
    if(!cap.includes('#')) continue;               // unsaubere Antwort überspringen
    const sig=norm(cap);
    if(qsig.has(sig)) continue;                     // Doppelpost-Schutz
    qsig.add(sig);
    if(appendRow(n.id,n.featuredImage.url,cap.trim())){ made++; if(made%20===0)console.log('  '+made+' Captions in Queue ('+coll+')'); }
    await sleep(SLEEP);
  }
}
console.log('FERTIG. neue Captions:',made);
