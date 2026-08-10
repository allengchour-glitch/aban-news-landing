/* cj_video_reel_engine.mjs — AUTOMATIK: CJ-Produktvideos → gebrandete 9:16-Reels → Shopify-CDN
 * → Reel-Queue (reels_seed.csv, status=ready) für IG/FB/TikTok-Autopost. Idempotent (Ledger),
 * rotierende Musik, On-Screen-Text (kein Voiceover). Verarbeitet BATCH Produkte pro Lauf.
 * ENV: SHOPIFY_CLIENT_ID/SECRET · [BATCH=3] · Quelle: Shopify tag:video-hit mit echtem VIDEO-media.
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET, SHOP='au3j0y-hq.myshopify.com';
const BATCH=parseInt(process.env.BATCH||'3',10);
const LEDGER='dropship/_cj_reel_done.txt';
const CURSOR='/tmp/cj_reel_cursor.txt';
const CSV='automation/reels_seed.csv';
const MUSIC=['luxe-cinematic-house.wav','luxe-lounge-sax.wav','luxe-house1.wav','luxe-hype-pro.mp3','luxe-liquid-dnb.wav','luxe-orchestra.wav'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function scc(){for(let a=0;a<5;a++){try{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});const t=JSON.parse(await r.text()).access_token;if(t)return t;}catch{}await sleep(2000);}throw new Error('scc');}
let TOK=await scc();
const gql=async(q,v)=>{for(let a=0;a<5;a++){try{const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(JSON.stringify(j.errors||'').includes('hrottl')){await sleep(4000);continue;}}catch{await sleep(2000);}TOK=await scc();}return null;};
const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').filter(Boolean):[]);
const esc=x=>/[",\n]/.test(x)?'"'+String(x).replace(/"/g,'""')+'"':x;
function appendReel(id,url,cap,tags,platforms){
  let csv=fs.readFileSync(CSV,'utf8'); if(!csv.endsWith('\n'))csv+='\n';
  csv+=[id,new Date().toISOString().slice(0,10),url,esc(cap),esc(tags),esc(platforms),'ready','',''].join(',')+'\n';
  fs.writeFileSync(CSV,csv);
}
function catTags(title){ const t=title.toLowerCase(); const m=[];
  if(/uhr|watch/.test(t))m.push('#uhren'); if(/schmuck|kette|ring|armband|ohrring/.test(t))m.push('#schmuck');
  if(/diffuser|aroma|duft|lampe|licht|led/.test(t))m.push('#homedecor','#ambiente'); if(/hund|katze|haustier|pet/.test(t))m.push('#haustier');
  if(/beauty|wimper|nagel|augenbraue|makeup|make-up|serum/.test(t))m.push('#beauty'); if(/fitness|band|training|yoga/.test(t))m.push('#fitness');
  if(/kabel|lade|gadget|usb|bluetooth/.test(t))m.push('#gadget'); if(!m.length)m.push('#trend'); return m.slice(0,3); }

let cursor=fs.existsSync(CURSOR)?(fs.readFileSync(CURSOR,'utf8').trim()||null):null;
let made=0, scanned=0;
outer:
while(made<BATCH){
  const r=await gql(`query($c:String){products(first:15,query:"tag:video-hit status:active",after:$c){pageInfo{hasNextPage endCursor}edges{node{id title handle variants(first:1){edges{node{price}}} media(first:8){edges{node{mediaContentType ... on Video{sources{url height width}}}}}}}}}`,{c:cursor});
  if(!r){await sleep(3000);continue;}
  for(const e of r.data.products.edges){
    const n=e.node; scanned++;
    if(done.has(n.id))continue;
    const vid=n.media.edges.map(m=>m.node).find(m=>m.mediaContentType==='VIDEO'&&m.sources&&m.sources.length);
    if(!vid){ continue; }
    done.add(n.id); fs.appendFileSync(LEDGER,n.id+'\n');
    const price=n.variants.edges[0]?.node.price||''; const title=n.title.trim();
    const shortT=title.length>30?title.slice(0,29)+'…':title;
    const src=vid.sources.sort((a,b)=>(b.height||0)-(a.height||0))[0].url;
    const pid=n.id.split('/').pop();
    try{
      execFileSync('curl',['-s','--max-time','90','-o',`/tmp/reelbuild/src_${pid}.mp4`,src],{stdio:'ignore'});
      if(!fs.existsSync(`/tmp/reelbuild/src_${pid}.mp4`)||fs.statSync(`/tmp/reelbuild/src_${pid}.mp4`).size<20000){ console.log('  Video zu klein/leer, skip',pid); continue; }
      const music='automation/music/'+MUSIC[made%MUSIC.length];
      const out=`/tmp/reelbuild/reel_${pid}.mp4`;
      execFileSync('bash',['automation/reel/make_reel.sh',`/tmp/reelbuild/src_${pid}.mp4`,out,shortT,price?('CHF '+price):'',music],{stdio:'ignore'});
      if(!fs.existsSync(out)){ console.log('  Render fehlgeschlagen',pid); continue; }
      const url=execFileSync('/opt/node22/bin/node',['automation/upload_to_shopify_cdn.mjs',out,title],{env:{...process.env,SHOPIFY_SHOP:SHOP},encoding:'utf8'}).trim().split('\n').pop().trim();
      if(!/^https/.test(url)){ console.log('  CDN-Upload fehlgeschlagen',pid,url.slice(0,60)); continue; }
      const link=`luxestyle.ch/products/${n.handle}`;
      // ⚠️ KEIN «Blitzversand aus der Schweiz» für CJ-Ware. Diese Engine verarbeitet
      // ausschliesslich CJ-Produkte, und die kommen aus China (8–16 Tage). Die alte Caption
      // versprach öffentlich Schweizer Lagerversand — bei 13 fertigen Reels in der Warteschlange
      // nachgewiesen (2026-08-10). Was stimmt: der Shop IST schweizerisch, liefert in die ganze
      // Schweiz und bietet Rechnungskauf. Genau das steht jetzt da.
      const cap=`«${title}» ✨ Jetzt bei LuxeStyle${price?` — CHF ${price}`:''}. Schweizer Online-Shop · Kauf auf Rechnung mit Klarna & TWINT · −10% mit Code WELCOME10 🇨🇭\n🔗 ${link} (Link in Bio)`;
      const tags=[...catTags(title),'#schweiz','#luxestyle','#reels'].join(' ');
      appendReel(`cjreel-${pid}`,url,cap,tags,'instagram,facebook');
      made++; console.log(`  ✅ Reel ${made}/${BATCH}: ${shortT} → queue`);
      fs.rmSync(`/tmp/reelbuild/src_${pid}.mp4`,{force:true}); fs.rmSync(out,{force:true});
    }catch(err){ console.log('  Fehler bei',pid,String(err).slice(0,80)); }
    if(made>=BATCH)break outer;
  }
  cursor=r.data.products.pageInfo.endCursor; fs.writeFileSync(CURSOR,cursor||'');
  if(!r.data.products.pageInfo.hasNextPage){ console.log('### Video-Katalog-Ende. Cursor-Reset.'); fs.writeFileSync(CURSOR,''); break; }
}
console.log(`FERTIG. neue Reels: ${made} | gescannt: ${scanned}`);
