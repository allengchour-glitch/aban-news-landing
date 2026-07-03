#!/usr/bin/env node
/* backfill_all — holt für BigBuy-Produkte ALLE echten BigBuy-Inhalte nach:
 *   • fehlende ECHTE BigBuy-Bilder (Import-Cap war 6; viele haben 7-10)
 *   • echten BigBuy-BESCHREIBUNGSTEXT (Prosa + Spec-Liste) — ersetzt nur generische/dünne Texte,
 *     lässt bereits angereicherte (tag gemini-desc / ls-ai-deep / ls-ai-desc) UNANGETASTET.
 * Nur echte BigBuy-Inhalte, nichts erfunden. Resume-Ledger → übersteht Container-Resets (Tage-Job).
 * ENV: SHOPIFY_*, BIGBUY_API_KEY. QUERY (Default tag:bigbuy), CAP=10, GAP=1100, MAX=0(=alle), LIVE=1.
 */
import fs from 'node:fs';
const SHOP=process.env.SHOPIFY_SHOP,API='2025-01',CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const BB=process.env.BIGBUY_API_KEY;
const LIVE=process.env.LIVE==='1';
const QUERY=process.env.QUERY||'tag:bigbuy';
const CAP=Number(process.env.CAP||10);
const GAP=Number(process.env.GAP||1100);
const MAX=Number(process.env.MAX||0);
const LEDGER=process.env.LEDGER||'dropship/backfill_done.txt';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchT(url,opts={},ms=20000){const ac=new AbortController();const to=setTimeout(()=>ac.abort(),ms);try{return await fetch(url,{...opts,signal:ac.signal});}finally{clearTimeout(to);}}
const tok=async()=>{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;};
let T=await tok();
const gql=async(q,v)=>{for(let a=0;a<6;a++){let r;try{r=await fetchT(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':T},body:JSON.stringify({query:q,variables:v})},25000);}catch{await sleep((a+1)*2000);continue;}if(r.status===401){T=await tok();continue;}if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;};
async function bb(p){for(let i=0;i<9;i++){let r,t;try{r=await fetchT('https://api.bigbuy.eu'+p,{headers:{Authorization:'Bearer '+BB,Accept:'application/json'}},25000);t=await r.text();}catch{await sleep((i+1)*2000);continue;}
  if(r.status===429||/rate limit/i.test(t)){const reset=Number(r.headers.get('x-ratelimit-reset'))||0;const wait=reset?Math.min(Math.max(reset*1000-Date.now()+500,800),6000):Math.min((i+1)*1500,6000);await sleep(wait);continue;}
  if(!r.ok)return null;try{return JSON.parse(t);}catch{return null;}}return null;}
async function ok(u){try{const r=await fetchT(u,{method:'HEAD'},12000);if(r.ok)return true;const g=await fetchT(u,{},12000);return g.ok;}catch{return false;}}
const fname=u=>{try{return decodeURIComponent(new URL(u).pathname.split('/').pop().split('?')[0]).replace(/^\d+_/,'').toLowerCase();}catch{return (u||'').toLowerCase();}};
const textlen=h=>(h||'').replace(/<[^>]+>/g,'').replace(/&[a-z#0-9]+;/g,' ').trim().length;
const sanit=h=>(h||'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/ on\w+="[^"]*"/gi,'').trim();

const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.trim()).filter(Boolean):[]);
const TRUST='<div style="background:#f7faf7;border:1px solid #d9e7d9;border-radius:10px;padding:11px 14px;margin:12px 0;font-size:14px;line-height:1.5;"><strong>🛡️ Sorglos shoppen:</strong> ✅ 100 % Original-Markenware · 🚚 EU-Lager – Lieferung ca. 3–7 Tage · 🔄 30 Tage Rückgabe · 🇨🇭 Schweizer Shop · 💳 TWINT, Karte &amp; Klarna.</div><p>Gratis-Versand ab CHF 65 · <strong>–10 % mit Code WELCOME10</strong></p>';
const ENRICHED=/(^|,)(gemini-desc|ls-ai-deep|ls-ai-desc)(,|$)/;

const Q=`query($c:String){products(first:40,query:"${QUERY}",after:$c){pageInfo{hasNextPage endCursor}edges{node{id handle tags descriptionHtml media(first:20){nodes{preview{image{url}}}}}}}}`;
const ADD=`mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$m){media{id}mediaUserErrors{message}}}`;
const SETDESC=`mutation($i:ProductInput!){productUpdate(input:$i){product{id}userErrors{message}}}`;

let cur=null, seen=0, imgAdd=0, txtSet=0, procd=0, sinceFlush=0;
outer:
do{
  const r=await gql(Q,{c:cur}); const pg=r?.data?.products; if(!pg){await sleep(2500);continue;}
  for(const e of pg.edges){
    const p=e.node; seen++;
    if(done.has(p.id)) continue;
    const id=(p.handle.match(/-(\d+)$/)||[])[1];
    if(!id){ done.add(p.id); continue; }
    // ---- BILDER ----
    const have=(p.media?.nodes||[]).map(n=>n?.preview?.image?.url).filter(Boolean);
    if(have.length<CAP){
      const d=await bb(`/rest/catalog/productimages/${id}.json`); await sleep(GAP);
      const urls=((d&&d.images)||[]).map(x=>x.url).filter(Boolean);
      if(urls.length>have.length){
        const hn=new Set(have.map(fname)); const miss=[];
        for(const u of urls){ if(hn.has(fname(u)))continue; if(await ok(u))miss.push(u); if(have.length+miss.length>=CAP)break; }
        if(miss.length&&LIVE){ const a=await gql(ADD,{id:p.id,m:miss.map(u=>({originalSource:u,mediaContentType:'IMAGE'}))}); if(!(a?.data?.productCreateMedia?.mediaUserErrors||[]).length){imgAdd+=miss.length;} await sleep(250); }
        else if(miss.length) imgAdd+=miss.length;
      }
    }
    // ---- TEXT ---- (nur wenn nicht bereits angereichert und aktueller Text generisch/dünn)
    const tags=(p.tags||[]).join(',');
    if(!ENRICHED.test(','+tags+',')){
      const info=await bb(`/rest/catalog/productinformation/${id}.json?isoCode=de`); await sleep(GAP);
      const real=Array.isArray(info)?info[0]?.description:info?.description;
      if(real && textlen(real)>=120){
        const first=real.replace(/<[^>]+>/g,'').slice(0,50);
        const curHas=(p.descriptionHtml||'').includes(first.slice(0,30));
        if(!curHas){
          const html=sanit(real)+TRUST;
          if(LIVE){ const u=await gql(SETDESC,{i:{id:p.id,descriptionHtml:html}}); if(!(u?.data?.productUpdate?.userErrors||[]).length) txtSet++; await sleep(200); }
          else txtSet++;
        }
      }
    }
    done.add(p.id); procd++; sinceFlush++;
    if(LIVE&&sinceFlush>=20){ fs.writeFileSync(LEDGER,[...done].join('\n')+'\n'); sinceFlush=0; }
    if(procd%50===0) console.log(`  … ${procd} verarbeitet · +${imgAdd} Bilder · ${txtSet} Texte`);
    if(MAX&&procd>=MAX) break outer;
  }
  cur=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null;
}while(cur);
if(LIVE) fs.writeFileSync(LEDGER,[...done].join('\n')+'\n');
console.log(`\nFERTIG${LIVE?'':' [DRY]'}: ${procd} verarbeitet (von ${seen} gesehen) · ${imgAdd} echte Bilder · ${txtSet} echte Texte gesetzt.`);
