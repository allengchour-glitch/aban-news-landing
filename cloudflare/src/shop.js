// shop.js — autonome Shop-Wartung im Cloudflare-Worker (läuft per Cron, unabhängig von GitHub).
// Spiegelt automation/shop_autopilot.mjs: SEO-Autofix für Produkte ohne seo.title + Health-Report.
// No-op-sicher: ohne SHOPIFY_SHOP + (SHOPIFY_ADMIN_TOKEN | CLIENT_ID/SECRET) passiert nichts.
//
// Env (per `wrangler secret put` / [vars]):
//   SHOPIFY_SHOP=au3j0y-hq.myshopify.com
//   SHOPIFY_ADMIN_TOKEN=shpat_/shpca_…   ODER   SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET
//   SHOP_AUTOPILOT_LIVE="1"  → schreibt SEO (sonst nur Report)
//   SHOP_SCAN="200"          → wie viele zuletzt geänderte Produkte gescannt werden
const API = '2025-01';

async function getToken(env){
  const SHOP=env.SHOPIFY_SHOP, ST=env.SHOPIFY_ADMIN_TOKEN, CID=env.SHOPIFY_CLIENT_ID, CS=env.SHOPIFY_CLIENT_SECRET;
  if(!(CID&&CS)&&ST) return ST;
  if(SHOP&&CID&&CS){
    const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({client_id:CID,client_secret:CS,grant_type:'client_credentials'})});
    const j=await r.json().catch(()=>({})); return j.access_token||'';
  }
  return ST||'';
}
async function gql(env, token, query, variables){
  const r=await fetch(`https://${env.SHOPIFY_SHOP}/admin/api/${API}/graphql.json`,{method:'POST',
    headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query,variables})});
  const j=await r.json();
  if(j.errors) throw new Error('GraphQL: '+JSON.stringify(j.errors).slice(0,200));
  return j.data;
}
const clip=(s,n)=>s.length>n?s.slice(0,n-1).replace(/[\s\-–,:]+$/,'')+'…':s;
const gqstr=s=>String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,' ');
const stripE=s=>String(s).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️‍]/gu,'').replace(/\s{2,}/g,' ').trim();
function seoFor(p){
  const t=stripE(p.title);
  const what=[p.vendor&&p.vendor!=='LuxeStyle'?p.vendor:'',p.productType].filter(Boolean).join(' ');
  const ctx=what?` (${what})`:'';
  return { title:clip(t,57)+' | LuxeStyle',
    desc:clip(`${t} – jetzt bei LuxeStyle Schweiz${ctx}. Gratis-Versand ab CHF 65, 30 Tage Rückgabe, sichere Zahlung. Code WELCOME10 für –10 %.`,158) };
}

export async function runMaintenance(env, log){
  if(!env.SHOPIFY_SHOP){ log.push('shop: no-op (kein SHOPIFY_SHOP)'); return; }
  const token=await getToken(env);
  if(!token){ log.push('shop: no-op (kein Token)'); return; }
  const LIVE = env.SHOP_AUTOPILOT_LIVE==='1';
  const SCAN = Math.min(parseInt(env.SHOP_SCAN||'200',10), 1000);

  // Scan zuletzt geänderter aktiver Produkte
  let prods=[], cur=null;
  while(prods.length<SCAN){
    const d=await gql(env, token, `query($c:String){ products(first:100, after:$c, sortKey:UPDATED_AT, reverse:true, query:"status:active"){ pageInfo{hasNextPage endCursor} nodes{ id title vendor productType seo{title} media(first:8){ nodes{ status } } } } }`, {c:cur});
    prods.push(...d.products.nodes);
    if(!d.products.pageInfo.hasNextPage) break;
    cur=d.products.pageInfo.endCursor;
  }
  prods=prods.slice(0,SCAN);

  const missing=prods.filter(p=>!(p.seo&&p.seo.title));
  const failed=prods.filter(p=>p.media&&p.media.nodes.some(m=>m.status==='FAILED'));
  let fixed=0;
  if(LIVE && missing.length){
    for(let i=0;i<missing.length;i+=25){
      const chunk=missing.slice(i,i+25);
      const parts=chunk.map((p,j)=>{const s=seoFor(p);return `p${j}: productUpdate(input:{id:"${p.id}", seo:{title:"${gqstr(s.title)}", description:"${gqstr(s.desc)}"}}){ product{id} userErrors{message} }`;});
      const d=await gql(env, token, `mutation{ ${parts.join(' ')} }`);
      fixed+=Object.values(d).filter(v=>v.product).length;
    }
  }
  // Health-Zahlen + Report in KV ablegen
  const report={ ts:new Date().toISOString(), scanned:prods.length, missingSeo:missing.length, seoFixed:LIVE?fixed:0, failedImages:failed.length, live:LIVE };
  if(env.STATE) await env.STATE.put('shop_health', JSON.stringify(report)).catch(()=>{});
  log.push(`shop: scan ${prods.length} · seo-missing ${missing.length}${LIVE?` → fixed ${fixed}`:' (dry)'} · failed-img ${failed.length}`);

  // Optionaler Telegram-Digest
  if(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID){
    const msg=`🤖 LuxeStyle Autopilot\n🔎 SEO fehlte: ${missing.length}${LIVE?` → ${fixed} gefixt`:' (dry)'}\n🖼️ FAILED-Bilder: ${failed.length}\n📦 gescannt: ${prods.length}`;
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({chat_id:env.TELEGRAM_CHAT_ID,text:msg})}).catch(()=>{});
  }
  return report;
}
