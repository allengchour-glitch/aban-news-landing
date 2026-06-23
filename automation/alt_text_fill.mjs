#!/usr/bin/env node
/* alt_text_fill — füllt fehlende Bild-Alt-Texte (SEO/Google-Bilder/Accessibility) bei AKTIVEN Produkten.
 * Alt = Produkttitel (1. Bild) bzw. "Titel – Ansicht N" (Folgebilder) → beschreibend + variiert.
 * Setzt nur LEERE Alt-Texte (idempotent, vorhandene nie überschreiben). Nutzt fileUpdate auf MediaImage-IDs.
 * DRY-Default · LIVE=1 schreibt · ENV: SHOPIFY_* (Client-Credentials). Batch via LIMIT (default 99999).
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const LIMIT=parseInt(process.env.LIMIT||'99999',10);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}
const clean=s=>(s||'').replace(/\s*[|·–-]\s*$/,'').replace(/\s+/g,' ').trim().slice(0,120);

if(!SHOP||!CID||!CSEC){console.log('Keine Creds → No-op');process.exit(0);}
const t=await tk();if(!t){console.error('Kein Token');process.exit(1);}
let c=null,scanned=0,fixedImgs=0,fixedProds=0,batch=[];
async function flush(){ if(!batch.length)return; const r=await gql(t,`mutation($files:[FileUpdateInput!]!){fileUpdate(files:$files){userErrors{message}}}`,{files:batch}); const e=r?.data?.fileUpdate?.userErrors||[]; if(e.length)console.log(' ⚠️',JSON.stringify(e).slice(0,200)); batch=[]; await sleep(300); }
do{
  const r=await gql(t,`query($c:String){products(first:40,after:$c,query:"status:active"){pageInfo{hasNextPage endCursor}nodes{id title media(first:20){nodes{... on MediaImage{id image{altText}}}}}}}`,{c});
  const pg=r?.data?.products; if(!pg){await sleep(1500);continue;}
  for(const p of pg.nodes){
    scanned++; const base=clean(p.title); let idx=0, touched=false;
    for(const m of (p.media?.nodes||[])){
      if(!m||!m.id)continue; idx++;
      const cur=m.image?.altText;
      if(cur&&cur.trim())continue;                       // vorhandenen Alt nie überschreiben
      const alt = idx===1 ? base : `${base} – Ansicht ${idx}`;
      if(LIVE) batch.push({id:m.id,alt});
      fixedImgs++; touched=true;
      if(batch.length>=25) await flush();
    }
    if(touched)fixedProds++;
  }
  c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null;
  if(scanned%400===0) console.log(`  … ${scanned} Produkte · Alt gesetzt ${fixedImgs} (auf ${fixedProds} Produkten)`);
}while(c && scanned<LIMIT);
if(LIVE) await flush();
console.log(`Fertig. Gescannt ${scanned} Produkte · Alt-Texte gesetzt ${fixedImgs} auf ${fixedProds} Produkten ${LIVE?'':'(DRY)'}`);
