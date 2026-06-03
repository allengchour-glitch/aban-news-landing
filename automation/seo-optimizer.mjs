#!/usr/bin/env node
/* LuxeStyle — seo-optimizer.mjs  (wöchentlich via .github/workflows/seo-optimizer.yml)
 * Findet aktive Produkte mit FEHLENDEM SEO-Titel/-Meta und füllt sie automatisch
 * (deutsch, Schweiz, Preis-Anker-Stil) — für besseren Google-Traffic.
 * Meldet ausserdem Produkte mit FAILED-Bildern (Bild-QA) per Telegram.
 * No-op-safe: ohne Shopify-Credentials passiert nichts.
 *
 * ENV: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET (oder SHOPIFY_ADMIN_TOKEN),
 *      LIMIT (max Produkte/Lauf, default 120), DRY_RUN=1,
 *      TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 */
const SHOP = process.env.SHOPIFY_SHOP || '';
const TOK_STATIC = process.env.SHOPIFY_ADMIN_TOKEN || '';
const CID = process.env.SHOPIFY_CLIENT_ID || '';
const CSECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
const TG_T = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_C = process.env.TELEGRAM_CHAT_ID || '';
const LIMIT = parseInt(process.env.LIMIT || '120', 10);
const DRY = process.env.DRY_RUN === '1';

if(!(SHOP && (TOK_STATIC || (CID && CSECRET)))){ console.log('Keine Shopify-Credentials → No-op.'); process.exit(0); }

async function getToken(){
  if(TOK_STATIC) return TOK_STATIC;
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({client_id:CID,client_secret:CSECRET,grant_type:'client_credentials'})});
  return (await r.json()).access_token || '';
}
const API = `https://${SHOP}/admin/api/2025-01/graphql.json`;
let TOKEN = '';
async function gql(query, variables){
  const r = await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOKEN},
    body:JSON.stringify({query, variables})});
  return r.json();
}
const clip = (s,n) => s.length<=n ? s : s.slice(0,n-1).replace(/\s+\S*$/,'')+'…';
function mkSeo(title){
  const base = title.replace(/\s*[·–—-]\s*/g,' – ').replace(/\s+/g,' ').trim();
  const seoTitle = clip(`${base} | LuxeStyle CH`, 60);
  const seoDesc = clip(`${base} bei LuxeStyle – Schweizer Online-Shop, schnelle Lieferung. Jetzt –10% mit Code WELCOME10.`, 155);
  return { title: seoTitle, description: seoDesc };
}

TOKEN = await getToken();
if(!TOKEN){ console.error('Kein Token.'); process.exit(0); }

let after = null, scanned = 0, updated = 0, failedImgs = [];
const Q = `query($after:String){ products(first:50, after:$after, query:"status:active", sortKey:UPDATED_AT, reverse:true){
  pageInfo{ hasNextPage endCursor }
  nodes{ id title seo{ title description } featuredMedia{ ... on MediaImage{ id alt } } media(first:3){ nodes{ status } } } } }`;
const M = `mutation($input:ProductInput!){ productUpdate(input:$input){ product{ id } userErrors{ field message } } }`;

outer:
while(true){
  const j = await gql(Q, { after });
  const conn = j?.data?.products;
  if(!conn){ console.error('Query-Fehler:', JSON.stringify(j).slice(0,300)); break; }
  for(const p of conn.nodes){
    scanned++;
    if(p.media?.nodes?.some(m => m.status && m.status !== 'READY')) failedImgs.push(p.title);
    const needs = !p.seo?.title || !p.seo?.description;
    if(needs){
      const seo = mkSeo(p.title);
      if(DRY){ console.log('würde SEO setzen:', p.title, '→', seo.title); updated++; }
      else{
        const r = await gql(M, { input: { id: p.id, seo } });
        const err = r?.data?.productUpdate?.userErrors?.[0]?.message;
        if(err) console.error('Fehler', p.title, err); else { updated++; console.log('✓ SEO', p.title); }
      }
      if(updated >= LIMIT) break outer;
    }
  }
  if(!conn.pageInfo.hasNextPage) break;
  after = conn.pageInfo.endCursor;
}

const msg = `🔎 SEO-Optimizer: ${scanned} Produkte gescannt · ${updated} SEO ${DRY?'(DRY)':'gefüllt'}`
  + (failedImgs.length ? `\n⚠️ ${failedImgs.length} Produkt(e) mit FAILED-Bild: ${failedImgs.slice(0,8).join(', ')}` : `\n✅ keine FAILED-Bilder`);
console.log(msg);
if(TG_T && TG_C && (updated>0 || failedImgs.length)){
  try{ await fetch(`https://api.telegram.org/bot${TG_T}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({chat_id:TG_C,text:msg,disable_web_page_preview:true})}); }catch(e){}
}
process.exit(0);
