#!/usr/bin/env node
// Fügt die neuen Nischen-Collections als Menüpunkte hinzu (Velo/Angeln/Tauchen/Fitness/Anime).
// menuUpdate ist ein FULL-REPLACE → wir lesen das Live-Menü, bauen den Input 1:1 nach,
// erhalten ALLE bestehenden IDs und fügen nur neue Kinder unter "Trends & Gadgets" ein.
import fs from 'node:fs';

const env = Object.fromEntries(fs.readFileSync('/tmp/shopify_creds.env','utf8')
  .split('\n').filter(Boolean).map(l => l.replace(/^export /,'').split('=').map(s=>s.trim().replace(/^["']|["']$/g,''))));
const SHOP = env.SHOPIFY_SHOP, ID = env.SHOPIFY_CLIENT_ID, SECRET = env.SHOPIFY_CLIENT_SECRET;
const API = `https://${SHOP}/admin/api/2025-01/graphql.json`;

async function token() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({client_id:ID, client_secret:SECRET, grant_type:'client_credentials'})
  });
  const j = await r.json();
  if(!j.access_token) throw new Error('token: '+JSON.stringify(j));
  return j.access_token;
}
async function gql(tok, query, variables={}) {
  const r = await fetch(API, {method:'POST',
    headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},
    body: JSON.stringify({query, variables})});
  const j = await r.json();
  if(j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}

const MENU_ID = 'gid://shopify/Menu/310224093569';

// Neue Nischen-Links (Collection-Handles existieren + sind publiziert)
const NEW = [
  { title:'🏅 Sport & Outdoor', url:'/collections/sport-outdoor' }, // sicherstellen vorhanden (Dedup unten)
  { title:'💪 Fitness & Training', url:'/collections/fitness' },
  { title:'🚲 Velo & Radsport', url:'/collections/velo' },
  { title:'🎣 Angeln', url:'/collections/angeln' },
  { title:'🤿 Tauchen & Schnorcheln', url:'/collections/tauchen' },
  { title:'🎌 Anime & Manga', url:'/collections/anime' },
];

// Item → MenuItemUpdateInput (rekursiv, IDs erhalten)
function toInput(it){
  const o = { id: it.id, title: it.title, type: it.type || 'HTTP', url: it.url };
  if(it.resourceId) o.resourceId = it.resourceId;
  if(it.items && it.items.length) o.items = it.items.map(toInput);
  return o;
}

const tok = await token();
const data = await gql(tok, `{ menu(id:"${MENU_ID}"){ id title handle items {
  id title type url resourceId
  items { id title type url resourceId
    items { id title type url resourceId } } } } }`);
const menu = data.menu;
const items = menu.items.map(toInput);

// "Trends & Gadgets" finden
const trends = items.find(i => /Trends & Gadgets/i.test(i.title));
if(!trends) throw new Error('Trends-&-Gadgets-Sektion nicht gefunden');
trends.items = trends.items || [];

const have = new Set(trends.items.map(c => (c.url||'').toLowerCase()));
let added = 0;
// Vor "Neuheiten" einfügen, sonst ans Ende
let insertAt = trends.items.findIndex(c => /neuheiten/i.test(c.title));
if(insertAt < 0) insertAt = trends.items.length;
for(const n of NEW){
  if(have.has(n.url.toLowerCase())) continue; // Dedup (z.B. Sport schon da)
  trends.items.splice(insertAt++, 0, { title:n.title, type:'HTTP', url:n.url });
  have.add(n.url.toLowerCase());
  added++;
  console.log('  + ', n.title, n.url);
}

if(added === 0){ console.log('Keine neuen Links nötig (alles schon im Menü).'); process.exit(0); }

const res = await gql(tok, `mutation($id:ID!,$title:String!,$handle:String!,$items:[MenuItemUpdateInput!]!){
  menuUpdate(id:$id,title:$title,handle:$handle,items:$items){ menu{ id } userErrors{ field message } } }`,
  { id: MENU_ID, title: menu.title, handle: menu.handle, items });

const ue = res.menuUpdate.userErrors;
if(ue && ue.length){ console.error('userErrors:', JSON.stringify(ue)); process.exit(1); }
console.log(`✅ Menü aktualisiert — ${added} neue Nischen-Links unter "Trends & Gadgets".`);
