#!/usr/bin/env node
/* aban/LuxeStyle — reel-analytics.mjs
 * Automatischer Feedback-Report (läuft via .github/workflows/reel-analytics.yml).
 * Liest die Reel-Queue (was wurde gepostet) + zieht Shop-Kennzahlen (Bestellungen/Umsatz der letzten Tage)
 * über die Shopify Admin GraphQL API und schickt eine Zusammenfassung per Telegram.
 * Alles no-op-safe: fehlende Secrets => nur Konsolen-Log, kein Fehler.
 *
 * ENV (alle optional):
 *   SHOPIFY_SHOP=luxestyle.myshopify.com  SHOPIFY_ADMIN_TOKEN=shpat_...
 *   TELEGRAM_BOT_TOKEN=...  TELEGRAM_CHAT_ID=...
 *   DAYS=3  (Betrachtungszeitraum)
 */
import fs from 'node:fs';

const DAYS = parseInt(process.env.DAYS || '3', 10);
const SHOP = process.env.SHOPIFY_SHOP || '';
const TOK  = process.env.SHOPIFY_ADMIN_TOKEN || '';
const TG_T = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_C = process.env.TELEGRAM_CHAT_ID || '';

// --- 1) Queue-Status aus der CSV ---
function parse(t){const rows=[];let row=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];
  if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
  else{if(c==='"')q=true;else if(c===','){row.push(f);f='';}else if(c==='\n'){row.push(f);rows.push(row);row=[];f='';}else if(c!=='\r')f+=c;}}
  if(f.length||row.length){row.push(f);rows.push(row);}return rows.filter(r=>r.length>1);}
let qLine='Queue: (reels_seed.csv nicht gefunden)';
try{
  const rows=parse(fs.readFileSync(new URL('./reels_seed.csv',import.meta.url).pathname,'utf8'));
  const h=rows[0], si=h.indexOf('status');
  const c={posted:0,ready:0,pending:0};
  rows.slice(1).forEach(r=>{const s=(r[si]||'').trim();if(s in c)c[s]++;});
  qLine=`Reels-Queue: ${c.posted} gepostet · ${c.ready} bereit · ${c.pending} in Vorbereitung`;
}catch(e){}

// --- 2) Shop-Kennzahlen (Bestellungen/Umsatz) via Admin GraphQL ---
let shopLine='Shop-Zahlen: übersprungen (kein SHOPIFY_ADMIN_TOKEN/SHOP).';
if(SHOP && TOK){
  const since=new Date(Date.now()-DAYS*864e5).toISOString().slice(0,10);
  const query=`{ orders(first:100, query:"created_at:>=${since}") { edges { node { totalPriceSet { shopMoney { amount currencyCode } } } } } }`;
  try{
    const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',
      headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query})});
    const j=await r.json();
    const edges=j?.data?.orders?.edges||[];
    let sum=0,cur='CHF';
    edges.forEach(e=>{const m=e.node.totalPriceSet.shopMoney;sum+=parseFloat(m.amount||0);cur=m.currencyCode||cur;});
    shopLine=`Shop (${DAYS}T): ${edges.length} Bestellungen · ${sum.toFixed(2)} ${cur} Umsatz`;
  }catch(e){ shopLine='Shop-Zahlen: Abruf-Fehler ('+e.message+').'; }
}

const msg = [
  `📊 LuxeStyle Reel-Autopost — Auto-Report`,
  qLine,
  shopLine,
  `Views/Engagement auf TikTok+Instagram: bitte in den App-Insights bzw. in Buffer Analytics prüfen (keine API-Anbindung).`
].join('\n');
console.log(msg);

// --- 3) Telegram-Report ---
if(TG_T && TG_C){
  try{
    await fetch(`https://api.telegram.org/bot${TG_T}/sendMessage`,{method:'POST',
      headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:TG_C,text:msg})});
    console.log('Telegram-Report gesendet.');
  }catch(e){ console.error('Telegram-Fehler:',e.message); }
} else { console.log('(Kein Telegram-Secret → Report nur im Log.)'); }
