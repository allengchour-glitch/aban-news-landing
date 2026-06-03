#!/usr/bin/env node
/* LuxeStyle — site-health.mjs  (alle 4h via .github/workflows/site-health.yml)
 * Kontrolliert die Live-Seite luxestyle.ch wie ein Mensch:
 *   1) Alle wichtigen URLs liefern 200 (keine 404-Kollektionen → sonst Demo-Platzhalter auf der Startseite).
 *   2) Startseite enthält KEINE Theme-Platzhalter ("Produkttitel", "19.99", "Vorgestellte Produkte").
 *   3) Kein fremder Admin-Link-Leak (admin.shopify.com/store/aban-192).
 * AUTO-FIX: Eine Homepage-Kollektion, die 404 ist, wird automatisch im Onlineshop veröffentlicht
 *   (publishablePublish) — genau der Bug, der die Platzhalter verursacht.
 * Meldet das Ergebnis per Telegram (nur bei Problemen/Fixes, sonst still + Log).
 * No-op-safe: fehlen Secrets, läuft die URL-Prüfung trotzdem; Auto-Fix nur mit Shopify-Credentials.
 *
 * ENV: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET (oder SHOPIFY_ADMIN_TOKEN),
 *      TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, BASEURL(=https://luxestyle.ch), ALWAYS_NOTIFY=1(optional)
 */
const SHOP = process.env.SHOPIFY_SHOP || '';
const TOK_STATIC = process.env.SHOPIFY_ADMIN_TOKEN || '';
const CID = process.env.SHOPIFY_CLIENT_ID || '';
const CSECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
const TG_T = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_C = process.env.TELEGRAM_CHAT_ID || '';
const BASE = (process.env.BASEURL || 'https://luxestyle.ch').replace(/\/$/, '');
const ALWAYS = process.env.ALWAYS_NOTIFY === '1';

// Homepage-gebundene Kollektionen (Handle → GID) für Auto-Publish bei 404.
const HOMEPAGE = {
  'bestseller-premium-heroes': 'gid://shopify/Collection/687774499201',
  'neu-eingetroffen':          'gid://shopify/Collection/687980052865',
  'highlights':                'gid://shopify/Collection/688005775745',
  'bestseller-shop':           'gid://shopify/Collection/687522054529',
};
const ONLINESHOP_PUB = 'gid://shopify/Publication/301970915713';
const CHECK = ['/', '/collections/sommer', '/collections/damen-mode', ...Object.keys(HOMEPAGE).map(h => '/collections/' + h)];

const problems = [], fixes = [];

async function status(path){
  try{ const r = await fetch(BASE + path + '?_=' + Date.now(), { headers:{'Cache-Control':'no-cache'} }); return r.status; }
  catch(e){ return 0; }
}
async function getToken(){
  if(TOK_STATIC) return TOK_STATIC;
  if(SHOP && CID && CSECRET){
    try{ const r = await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({client_id:CID,client_secret:CSECRET,grant_type:'client_credentials'})}); const j=await r.json(); return j.access_token||''; }
    catch(e){ return ''; }
  }
  return '';
}
async function publish(gid, token){
  const q = `mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,input:$p){userErrors{message}}}`;
  const r = await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',
    headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},
    body:JSON.stringify({query:q, variables:{id:gid, p:[{publicationId:ONLINESHOP_PUB}]}})});
  const j = await r.json(); return j?.data?.publishablePublish?.userErrors?.length ? j.data.publishablePublish.userErrors[0].message : '';
}

// 1) URL-Status (+ Auto-Fix 404-Homepage-Kollektionen)
let token = '';
for(const path of CHECK){
  const s = await status(path);
  if(s !== 200){
    const handle = path.startsWith('/collections/') ? path.split('/').pop() : '';
    if(s === 404 && HOMEPAGE[handle]){
      if(!token) token = await getToken();
      if(token){ const err = await publish(HOMEPAGE[handle], token);
        if(err) problems.push(`❌ ${path} → 404, Auto-Publish-Fehler: ${err}`);
        else fixes.push(`🔧 ${path} war 404 → automatisch im Onlineshop veröffentlicht`);
      } else problems.push(`❌ ${path} → 404 (kein Token zum Auto-Fix)`);
    } else problems.push(`❌ ${path} → HTTP ${s||'Fehler'}`);
  }
}

// 2) Startseiten-Platzhalter + 3) Admin-Leak
try{
  const html = await (await fetch(BASE + '/?_=' + Date.now(), { headers:{'Cache-Control':'no-cache'} })).text();
  const ph = ['Produkttitel','Vorgestellte Produkte'].filter(m => html.includes(m));
  if(ph.length) problems.push(`⚠️ Startseite zeigt Theme-Platzhalter (${ph.join(', ')}) — Sektion zeigt auf leere/unveröffentlichte Kollektion.`);
  if(html.includes('admin.shopify.com/store/aban-192')) problems.push('⚠️ Fremder Admin-Link (aban-192) im Markup — Ankündigungsleisten-Link im Customizer fixen.');
}catch(e){ problems.push('⚠️ Startseite nicht abrufbar: ' + e.message); }

const ok = problems.length === 0;
const lines = [`🩺 LuxeStyle Site-Check ${new Date().toISOString().slice(0,16).replace('T',' ')}`];
if(fixes.length) lines.push(...fixes);
if(ok && !fixes.length) lines.push('✅ Alles in Ordnung — alle Seiten 200, keine Platzhalter, kein Leak.');
else if(ok) lines.push('✅ Rest in Ordnung.');
else lines.push(...problems);
const msg = lines.join('\n');
console.log(msg);

// Telegram nur bei Problemen/Fixes (oder ALWAYS_NOTIFY)
if(TG_T && TG_C && (!ok || fixes.length || ALWAYS)){
  try{ await fetch(`https://api.telegram.org/bot${TG_T}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({chat_id:TG_C,text:msg,disable_web_page_preview:true})}); console.log('Telegram gesendet.'); }
  catch(e){ console.error('Telegram-Fehler:', e.message); }
}
process.exit(0);
