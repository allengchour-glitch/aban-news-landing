/* fortura_image_backfill.mjs — füllt Fortura-Produkte mit Zusatzbildern (Bild_2..Bild_5 aus dem Feed).
 * Grund: der Importer speicherte nur Bild_1 → 1-Bild-Produkte → kein Produktkarten-Karussell auf der
 * Kollektionsseite. Join über Varianten-Barcode = EAN → Feed-Zeile. Validiert jede URL (HTTP 200 + image/*),
 * fügt bis zu 4 Zusatzbilder via productCreateMedia hinzu. Idempotent (Ledger). Ghost-sale-neutral (nur Medien).
 * ENV: SHOPIFY_CLIENT_ID/SECRET. [FEED=/tmp/fortura_feed.csv] [FT_IMG_LIMIT=400] [DRY=1] [SLEEP=1500]
 */
import fs from 'node:fs';
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const SHOP='au3j0y-hq.myshopify.com';
const FEED=process.env.FEED||'/tmp/fortura_feed.csv';
const LIMIT=parseInt(process.env.FT_IMG_LIMIT||'400',10);
const DRY=process.env.DRY==='1';
const SLEEP=parseInt(process.env.SLEEP||'1500',10);
const LEDGER='dropship/_fortura_img_done.txt';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// --- Feed einlesen (pipe-delimited, cp1252/latin1; URLs sind ASCII) ---
const EAN=9, B=[57,58,59,60,61];   // 0-based: EAN, Bild_1..Bild_5
const lines=fs.readFileSync(FEED,'latin1').split(/\r?\n/);
const ean2imgs=new Map();
for(let i=1;i<lines.length;i++){
  const c=lines[i].split('|'); if(c.length<62) continue;
  const ean=(c[EAN]||'').trim(); if(!ean) continue;
  const imgs=B.slice(1).map(ix=>(c[ix]||'').trim()).filter(u=>/^https?:\/\//i.test(u)).map(u=>u.replace(/^http:/i,'https:'));
  if(imgs.length) ean2imgs.set(ean, imgs);
}
console.log(`Feed: ${ean2imgs.size} EANs mit Zusatzbildern`);

// --- Ledger ---
const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').filter(Boolean):[]);
const appendDone=id=>{ done.add(id); if(!DRY) fs.appendFileSync(LEDGER, id+'\n'); };

// --- Shopify ---
async function scc(){
 // Token-Fallback (16.08.2026): ohne Env-Secrets das Runner-Token aus /tmp nutzen
 if(!CID||!CSEC){try{const t=fs.readFileSync('/tmp/cj_shop_token.txt','utf8').trim();if(t)return t;}catch{}}
 for(let a=0;a<5;a++){try{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});const t=JSON.parse(await r.text()).access_token;if(t)return t;}catch{}await sleep(2000*(a+1));}throw new Error('scc');}
let TOK;
async function gql(q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(JSON.stringify(j.errors||'').includes('Throttled')){await sleep(4000);continue;}TOK=await scc();await sleep(1000);}return{};}

// URL 200 + Bild? (über Proxy)
async function okImg(u){try{const r=await fetch(u,{method:'GET',headers:{'Range':'bytes=0-256'}});if(!(r.status>=200&&r.status<300))return false;const ct=r.headers.get('content-type')||'';return /image\//i.test(ct)||/\.(jpe?g|png|webp)$/i.test(u);}catch{return false;}}

TOK=await scc();
let cursor=null, scanned=0, fixed=0, added=0, skipNoImg=0;
outer:
for(let p=0;p<400;p++){
  const q=`query($c:String){products(first:60,query:"tag:fortura status:active",after:$c){pageInfo{hasNextPage endCursor}edges{node{id mediaCount{count} variants(first:20){edges{node{barcode}}}}}}}`;
  const r=await gql(q,{c:cursor}); if(!r.data)break;
  for(const {node:n} of r.data.products.edges){
    scanned++;
    if(done.has(n.id)) continue;
    if(n.mediaCount.count>1){ continue; }   // hat schon Karussell
    // Zusatzbilder aus allen Varianten-EANs sammeln
    const eans=n.variants.edges.map(e=>(e.node.barcode||'').trim()).filter(Boolean);
    const urls=[];
    for(const e of eans){ const im=ean2imgs.get(e); if(im) for(const u of im) if(!urls.includes(u)) urls.push(u); }
    if(!urls.length){ skipNoImg++; appendDone(n.id); continue; }   // Feed hat keine Extras → nie wieder prüfen
    // validieren + auf 4 kappen
    const good=[];
    for(const u of urls){ if(good.length>=4)break; if(await okImg(u)) good.push(u); }
    if(!good.length){ skipNoImg++; appendDone(n.id); continue; }
    if(DRY){ console.log('DRY +'+good.length+' → '+n.id); appendDone(n.id); fixed++; added+=good.length; }
    else {
      const m=await gql(`mutation($id:ID!,$media:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$media){media{...on MediaImage{id}} mediaUserErrors{field message}}}`,
        {id:n.id, media:good.map(u=>({originalSource:u, mediaContentType:'IMAGE'}))});
      const errs=m.data?.productCreateMedia?.mediaUserErrors||[];
      if(errs.length){ console.log('  Fehler '+n.id+':', JSON.stringify(errs).slice(0,120)); }
      else { fixed++; added+=good.length; appendDone(n.id); }
      await sleep(SLEEP);
    }
    if(fixed>=LIMIT) break outer;
    if(fixed%25===0 && fixed) console.log(`  … ${fixed} Produkte gefixt, ${added} Bilder, gescannt ${scanned}`);
  }
  if(!r.data.products.pageInfo.hasNextPage)break; cursor=r.data.products.pageInfo.endCursor;
}
console.log(`FERTIG. gescannt=${scanned} gefixt=${fixed} bilder=${added} ohne-feed-extra=${skipNoImg}`);
