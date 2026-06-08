#!/usr/bin/env node
/* LuxeStyle — rotate-collections.mjs  (alle 3h via .github/workflows/rotate-collections.yml)
 * Macht die Startseite "lebendig": rotiert die Sortierung der Homepage-Kollektionen
 * (highlights, bestseller-shop) durch → bei jedem Lauf stehen andere Produkte oben.
 * Reine Metadaten-Änderung per Admin API (collectionUpdate sortOrder) — kein Theme-Eingriff.
 * No-op-safe: ohne Shopify-Credentials passiert nichts (Exit 0).
 *
 * ENV: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET (oder SHOPIFY_ADMIN_TOKEN),
 *      NOTIFY_ROTATE=1 (optional: Telegram-Notiz), TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 */
const SHOP = process.env.SHOPIFY_SHOP || '';
const TOK_STATIC = process.env.SHOPIFY_ADMIN_TOKEN || '';
const CID = process.env.SHOPIFY_CLIENT_ID || '';
const CSECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
const TG_T = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_C = process.env.TELEGRAM_CHAT_ID || '';
const NOTIFY = process.env.NOTIFY_ROTATE === '1';

// Sortier-Varianten, die sichtbar andere Produkte nach oben bringen.
const ORDERS = ['CREATED_DESC', 'PRICE_ASC', 'ALPHA_ASC', 'PRICE_DESC', 'BEST_SELLING', 'CREATED'];
// Ziel-Kollektionen (Homepage-Sektionen). Offset, damit beide unterschiedlich aussehen.
const TARGETS = [
  { handle: 'highlights',      id: 'gid://shopify/Collection/688005775745', offset: 0 },
  { handle: 'bestseller-shop', id: 'gid://shopify/Collection/687522054529', offset: 3 },
];

if(!(SHOP && (TOK_STATIC || (CID && CSECRET)))){
  console.log('Keine Shopify-Credentials → No-op.'); process.exit(0);
}

const slot = Math.floor(Date.now() / (3 * 3600 * 1000)); // wechselt alle 3h
async function getToken(){
  if(!(CID && CSECRET) && TOK_STATIC) return TOK_STATIC;
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({client_id:CID,client_secret:CSECRET,grant_type:'client_credentials'})});
  return (await r.json()).access_token || '';
}
async function setSort(id, order, token){
  const q = `mutation($input:CollectionInput!){collectionUpdate(input:$input){collection{id sortOrder} userErrors{message}}}`;
  const r = await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',
    headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},
    body:JSON.stringify({query:q, variables:{input:{id, sortOrder:order}}})});
  const j = await r.json();
  return j?.errors?.[0]?.message || j?.data?.collectionUpdate?.userErrors?.[0]?.message || '';
}

const token = await getToken();
if(!token){ console.error('Kein Token.'); process.exit(0); }

const done = [];
for(const t of TARGETS){
  const order = ORDERS[(slot + t.offset) % ORDERS.length];
  const err = await setSort(t.id, order, token);
  if(err) console.error(`${t.handle}: ${err}`);
  else { console.log(`✓ ${t.handle} → ${order}`); done.push(`${t.handle}: ${order}`); }
}

if(NOTIFY && TG_T && TG_C && done.length){
  try{ await fetch(`https://api.telegram.org/bot${TG_T}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({chat_id:TG_C,text:'🔄 Startseite aufgefrischt — ' + done.join(' · '),disable_web_page_preview:true})}); }catch(e){}
}
process.exit(0);
