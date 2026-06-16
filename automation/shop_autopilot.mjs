#!/usr/bin/env node
/**
 * shop_autopilot.mjs — autonome Shop-Wartung in EINEM Lauf.
 *
 * Automatisiert die wiederkehrenden Aufgaben, die sonst jede Session von Hand laufen:
 *   1) SEO-AUTOFIX     — neue/aktive Produkte ohne seo.title bekommen Titel + Meta-Description
 *                        (der bekannte Import-Defekt). Gebatcht, idempotent.
 *   2) BILD-QA         — meldet Produkte mit FAILED-Medien (kein Auto-Fix, nur Report).
 *   3) HEALTH-REPORT   — Kennzahlen (aktive Produkte, ohne SEO, FAILED-Bilder, Bestellungen 30 T).
 *   4) DIGEST          — optionaler Telegram-Tagesreport (wenn TELEGRAM_BOT_TOKEN/CHAT_ID gesetzt).
 *
 * No-op-sicher: ohne gültigen Shopify-Token passiert nichts. DRY ist Default, LIVE=1 schreibt.
 *
 * ENV: SHOPIFY_SHOP=au3j0y-hq.myshopify.com
 *      + SHOPIFY_ADMIN_TOKEN   ODER   SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET
 *      TASK=all|seo|images|health   (Default all)
 *      SCAN=250            (wie viele zuletzt geänderte Produkte gescannt werden)
 *      LIVE=1             (schreibt; sonst Trockenlauf)
 *      TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID  (optional, für Digest)
 */
const SHOP    = process.env.SHOPIFY_SHOP || '';
const TOK_ST  = process.env.SHOPIFY_ADMIN_TOKEN || '';
const CID     = process.env.SHOPIFY_CLIENT_ID || '';
const CSECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
const LIVE    = process.env.LIVE === '1';
const TASK    = (process.env.TASK || 'all').toLowerCase();
const SCAN    = Math.min(parseInt(process.env.SCAN || '250', 10), 2000);
const API     = '2025-01';

async function getToken(){
  if(!(CID && CSECRET) && TOK_ST) return TOK_ST;
  if(SHOP && CID && CSECRET){
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({client_id:CID,client_secret:CSECRET,grant_type:'client_credentials'})});
    const j = await r.json().catch(()=>({})); return j.access_token || '';
  }
  return TOK_ST || '';
}
async function gql(token, query, variables){
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',
    headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},
    body:JSON.stringify({query, variables})});
  const j = await r.json();
  if(j.errors) throw new Error('GraphQL: '+JSON.stringify(j.errors).slice(0,300));
  return j.data;
}
const clip=(s,n)=>s.length>n?s.slice(0,n-1).replace(/[\s\-–,:]+$/,'')+'…':s;
const gqstr=s=>String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,' ');
const stripE=s=>String(s).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️‍]/gu,'').replace(/\s{2,}/g,' ').trim();

// SEO aus Titel + Typ/Marke generieren
function seoFor(p){
  const t = stripE(p.title);
  const title = clip(t,57)+' | LuxeStyle';
  const what = [p.vendor && p.vendor!=='LuxeStyle' ? p.vendor : '', p.productType].filter(Boolean).join(' ');
  const ctx = what ? ` (${what})` : '';
  const desc = clip(`${t} – jetzt bei LuxeStyle Schweiz${ctx}. Gratis-Versand ab CHF 65, 30 Tage Rückgabe, sichere Zahlung. Code WELCOME10 für –10 %.`,158);
  return { title, desc };
}

// zuletzt geänderte Produkte scannen
async function scanProducts(token, n){
  const out=[]; let cur=null;
  while(out.length<n){
    const d = await gql(token, `query($c:String){ products(first:100, after:$c, sortKey:UPDATED_AT, reverse:true, query:"status:active"){ pageInfo{hasNextPage endCursor} nodes{ id title vendor productType seo{title description} media(first:10){ nodes{ status } } } } }`, {c:cur});
    out.push(...d.products.nodes);
    if(!d.products.pageInfo.hasNextPage) break;
    cur = d.products.pageInfo.endCursor;
  }
  return out.slice(0,n);
}

async function main(){
  const report = { ts:new Date().toISOString(), shop:SHOP, live:LIVE, task:TASK };
  if(!SHOP){ console.log('no-op: kein SHOPIFY_SHOP gesetzt.'); return report; }
  const token = await getToken();
  if(!token){ console.log('no-op: kein gültiger Shopify-Token (App installiert? Scope write_products?).'); return report; }

  // Health-Basiszahlen
  if(TASK==='all'||TASK==='health'){
    const d = await gql(token, `{ active: productsCount(query:"status:active"){count} orders: ordersCount(query:"created_at:>${new Date(Date.now()-30*864e5).toISOString().slice(0,10)}"){count} }`);
    report.activeProducts = d.active.count;
    report.orders30d = d.orders.count;
  }

  // Produkt-Scan (für SEO + Bild-QA)
  let prods=[];
  if(TASK==='all'||TASK==='seo'||TASK==='images'){ prods = await scanProducts(token, SCAN); report.scanned = prods.length; }

  // 1) SEO-Autofix
  if(TASK==='all'||TASK==='seo'){
    const missing = prods.filter(p=>!(p.seo&&p.seo.title));
    report.missingSeo = missing.length;
    if(LIVE && missing.length){
      let fixed=0;
      for(let i=0;i<missing.length;i+=25){
        const chunk=missing.slice(i,i+25);
        const parts=chunk.map((p,j)=>{ const s=seoFor(p);
          return `p${j}: productUpdate(input:{id:"${p.id}", seo:{title:"${gqstr(s.title)}", description:"${gqstr(s.desc)}"}}){ product{id} userErrors{message} }`; });
        const d=await gql(token, `mutation{ ${parts.join(' ')} }`);
        fixed += Object.values(d).filter(v=>v.product).length;
      }
      report.seoFixed = fixed;
    }
  }

  // 2) Bild-QA (nur Report)
  if(TASK==='all'||TASK==='images'){
    const failed = prods.filter(p=>p.media&&p.media.nodes.some(m=>m.status==='FAILED'));
    report.failedImages = failed.length;
    report.failedImageIds = failed.slice(0,20).map(p=>p.id.split('/').pop());
  }

  console.log(JSON.stringify(report,null,2));

  // 4) Telegram-Digest (optional)
  const TG=process.env.TELEGRAM_BOT_TOKEN, CH=process.env.TELEGRAM_CHAT_ID;
  if(TG&&CH){
    const msg=[`🤖 LuxeStyle Autopilot ${report.ts.slice(0,16).replace('T',' ')}`,
      report.activeProducts!=null?`📦 ${report.activeProducts} aktive Produkte · 🛒 ${report.orders30d} Bestellungen/30T`:'',
      report.missingSeo!=null?`🔎 SEO fehlte: ${report.missingSeo}${report.seoFixed!=null?` → ${report.seoFixed} gefixt`:' (DRY)'}`:'',
      report.failedImages!=null?`🖼️ FAILED-Bilder: ${report.failedImages}`:''].filter(Boolean).join('\n');
    await fetch(`https://api.telegram.org/bot${TG}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({chat_id:CH,text:msg})}).catch(()=>{});
  }
  return report;
}
main().catch(e=>{ console.error('Fehler:', e.message); process.exit(0); });
