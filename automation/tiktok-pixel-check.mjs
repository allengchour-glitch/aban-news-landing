#!/usr/bin/env node
/* LuxeStyle - tiktok-pixel-check.mjs : PIXEL-AUTONOMIE, prueft ALLE Varianten auf mehreren Seiten.
 * Variante 1 Browser-Pixel(Theme ttq) - 2 Shopify-TikTok-App WebPixel - 3 server Events API(Fallback).
 * Prueft home + collection + product. No-op-sicher. ENV SHOP_URL / TIKTOK_PIXEL_ID. */
const BASE = (process.env.SHOP_URL || 'https://luxestyle.ch').replace(/\/$/, '');
const PIXEL = process.env.TIKTOK_PIXEL_ID || 'D8EKVR3C77U6KT5BTBD0';
const PAGES = ['/', '/collections/all', '/products/blazer-roma-tailliert-mit-bindegurtel-revers'];
const log = (...a) => console.log(...a);
async function get(u){const c=new AbortController();const t=setTimeout(()=>c.abort(),25000);try{const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0'},signal:c.signal});return r.ok?await r.text():'';}catch{return'';}finally{clearTimeout(t);}}
(async()=>{
  log('TikTok-Pixel-Check', new Date().toISOString().slice(0,16), '· Pixel', PIXEL);
  let anyOk=false, reachable=false;
  for(const p of PAGES){
    const html=await get(BASE+p); if(!html){log('  ',p,'- nicht erreichbar'); continue;} reachable=true;
    const v1 = html.includes(PIXEL) && /TiktokAnalyticsObject|analytics\.tiktok\.com\/i18n\/pixel/.test(html);
    const v2 = /web-pixel/i.test(html) && /tiktok/i.test(html);
    const consent = /loadTikTokPixel|lx-consent-granted|cookie_consent/.test(html);
    if(v1||v2) anyOk=true;
    log('  ', p.padEnd(60), 'Browser:'+(v1?'OK':'-'), 'ShopifyApp:'+(v2?'OK':'-'), consent?'(consent-gated)':'');
  }
  if(!reachable){log('Storefront nicht erreichbar - No-op.'); process.exit(0);}
  log('Variante 3 (server Events API):', process.env.TT_ACCESS_TOKEN?'Token da - aktivierbar':'kein Token (Fallback, optional)');
  if(anyOk) log('PIXEL OK - feuert (Browser/Theme + Shopify-App). Consent-Banner muss aktiv sein, sonst wenig Daten.');
  else log('PIXEL FEHLT auf allen Seiten -> Fallback-Kette: dropship/TIKTOK-PIXEL.md');
  process.exit(0);
})();
