#!/usr/bin/env node
/* LuxeStyle — reel-analytics.mjs  (täglicher Telegram-Report + Tagesreel als Video)
 * Läuft via .github/workflows/reel-analytics.yml (täglich).
 *  1) Shop-Kennzahlen (Bestellungen heute + letzte N Tage + Umsatz) via Shopify Admin GraphQL.
 *  2) Reel-Queue-Status aus reels_seed.csv.
 *  3) Schickt den Text-Report per Telegram (sendMessage).
 *  4) Schickt zusätzlich EIN Reel als Video (sendVideo, rotiert täglich) — „nebst video reels".
 * Alles no-op-safe: fehlende Secrets => nur Konsolen-Log, kein harter Fehler.
 *
 * ENV (alle optional):
 *   SHOPIFY_SHOP=...myshopify.com
 *   Entweder direkter Token:  SHOPIFY_ADMIN_TOKEN=shpat_/shpca_...
 *   ODER (Shopify 2026, empfohlen) Client-Credentials der Custom-App:
 *       SHOPIFY_CLIENT_ID=...   SHOPIFY_CLIENT_SECRET=shpss_...
 *     -> der Token wird pro Lauf frisch geholt (gültig ~24h), kein manuelles shpat_ mehr nötig.
 *   TELEGRAM_BOT_TOKEN=...  TELEGRAM_CHAT_ID=...
 *   DAYS=7  (Vergleichszeitraum)  ·  BASEURL=https://abannews.com/reels
 */
import fs from 'node:fs';

const DAYS = parseInt(process.env.DAYS || '7', 10);
const SHOP = process.env.SHOPIFY_SHOP || '';
const TOK_STATIC = process.env.SHOPIFY_ADMIN_TOKEN || '';
const CID = process.env.SHOPIFY_CLIENT_ID || '';
const CSECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
const TG_T = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_C = process.env.TELEGRAM_CHAT_ID || '';
const BASE = (process.env.BASEURL || 'https://abannews.com/reels').replace(/\/$/, '');
const today = new Date().toISOString().slice(0, 10);

// --- CSV parse ---
function parse(t){const rows=[];let row=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];
  if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
  else{if(c==='"')q=true;else if(c===','){row.push(f);f='';}else if(c==='\n'){row.push(f);rows.push(row);row=[];f='';}else if(c!=='\r')f+=c;}}
  if(f.length||row.length){row.push(f);rows.push(row);}return rows.filter(r=>r.length>1);}

// --- 1) Queue-Status + Reel-Auswahl (täglich rotierend) ---
let qLine='Reels-Queue: (reels_seed.csv nicht gefunden)';
let pickUrl='', pickCap='';
try{
  const rows=parse(fs.readFileSync(new URL('./reels_seed.csv',import.meta.url).pathname,'utf8'));
  const h=rows[0], si=h.indexOf('status'), vi=h.indexOf('video_url'), ci=h.indexOf('caption');
  const c={posted:0,ready:0,pending:0};
  const vids=[];
  rows.slice(1).forEach(r=>{const s=(r[si]||'').trim();if(s in c)c[s]++; if((r[vi]||'').trim())vids.push({u:r[vi].trim(),cap:r[ci]||''});});
  qLine=`Reels-Queue: ${c.posted} gepostet · ${c.ready} bereit · ${c.pending} in Vorbereitung`;
  if(vids.length){ const doy=Math.floor((Date.now()-Date.UTC(new Date().getUTCFullYear(),0,0))/864e5);
    const p=vids[doy%vids.length]; pickUrl=p.u; pickCap=p.cap; }
}catch(e){}

// --- 2) Shop-Kennzahlen via Admin GraphQL (Bestellungen heute + N Tage) ---
// Token: entweder statisch (SHOPIFY_ADMIN_TOKEN) ODER pro Lauf frisch aus Client-Credentials
// (Shopify 2026: kein shpat_-Knopf mehr → POST /admin/oauth/access_token, grant_type=client_credentials).
async function getToken(){
  if(TOK_STATIC) return TOK_STATIC;
  if(SHOP && CID && CSECRET){
    const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({client_id:CID,client_secret:CSECRET,grant_type:'client_credentials'})});
    const j=await r.json(); return j.access_token||'';
  }
  return '';
}
async function orders(token,sinceDate){
  const query=`{ orders(first:250, query:"created_at:>=${sinceDate}") { edges { node { totalPriceSet { shopMoney { amount currencyCode } } } } } }`;
  const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',
    headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query})});
  const j=await r.json(); const edges=j?.data?.orders?.edges||[];
  let sum=0,cur='CHF'; edges.forEach(e=>{const m=e.node.totalPriceSet.shopMoney;sum+=parseFloat(m.amount||0);cur=m.currencyCode||cur;});
  return {n:edges.length,sum,cur};
}
let shopLines=['Shop-Zahlen: übersprungen (kein SHOPIFY_SHOP + Token/Client-Credentials).'];
if(SHOP){
  try{
    const token=await getToken();
    if(!token){ shopLines=['Shop-Zahlen: übersprungen (kein gültiger Token aus Client-Credentials).']; }
    else{
      const sinceN=new Date(Date.now()-DAYS*864e5).toISOString().slice(0,10);
      const [t,n]=await Promise.all([orders(token,today),orders(token,sinceN)]);
      shopLines=[`🛒 Heute: ${t.n} Bestellungen · ${t.sum.toFixed(2)} ${t.cur}`,
                 `📈 ${DAYS} Tage: ${n.n} Bestellungen · ${n.sum.toFixed(2)} ${n.cur} Umsatz`];
    }
  }catch(e){ shopLines=['Shop-Zahlen: Abruf-Fehler ('+e.message+').']; }
}

const msg=[`📊 LuxeStyle — Tagesreport ${today}`,...shopLines,qLine,
  `ℹ️ TikTok-Ads-Zahlen (Impressionen/CTR/ATC) im TikTok Ads Manager; Reel-Views in den App-Insights.`].join('\n');
console.log(msg);
if(pickUrl) console.log('Tagesreel:',pickUrl);

// --- 3) + 4) Telegram: Report + ein Reel als Video ---
if(TG_T && TG_C){
  try{
    await fetch(`https://api.telegram.org/bot${TG_T}/sendMessage`,{method:'POST',
      headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:TG_C,text:msg,disable_web_page_preview:true})});
    console.log('Telegram-Report gesendet.');
  }catch(e){ console.error('Telegram sendMessage-Fehler:',e.message); }
  if(pickUrl){
    try{
      const cap=(pickCap?pickCap+'\n':'')+'🎬 Reel des Tages';
      const res=await fetch(`https://api.telegram.org/bot${TG_T}/sendVideo`,{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:TG_C,video:pickUrl,caption:cap.slice(0,1000)})});
      console.log(res.ok?'Telegram-Reel gesendet.':'Telegram sendVideo HTTP '+res.status);
    }catch(e){ console.error('Telegram sendVideo-Fehler:',e.message); }
  }
} else { console.log('(Kein Telegram-Secret → Report nur im Log.)'); }
