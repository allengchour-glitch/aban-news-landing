#!/usr/bin/env node
/**
 * update_bestsellers.mjs — hält die Collection "🔥 Hero-Favoriten" (handle: bestseller)
 * automatisch aktuell.
 *
 * Logik (in dieser Reihenfolge):
 *   1) ECHTE VERKÄUFE: aggregiert verkaufte Stückzahlen je Produkt aus den Bestellungen
 *      der letzten WINDOW_DAYS Tage. Sobald es Verkäufe gibt, sind DAS die Bestseller.
 *   2) FALLBACK bei 0 Verkäufen (aktueller Shop-Stand): bewertete Produkte
 *      (judge.me-Metafelder reviews.rating / rating_count) mit rating>=MIN_RATING und
 *      count>=MIN_COUNT, sortiert nach rating, dann Anzahl Reviews.
 *   3) AUFFÜLLEN auf TARGET mit den beworbenen Premium-Produkten aus
 *      automation/good_products.csv (in Datei-Reihenfolge), ohne Dubletten.
 *   Danach: Mitgliedschaft der Collection per Diff syncen + nach Rang sortieren.
 *
 * Kandidaten-Pool (für Rating/Fallback) = aktuelle Mitglieder ∪ good_products.csv.
 * Dadurch werden NEUE Reviews und neue Werbe-Sieger bei jedem Lauf automatisch berücksichtigt.
 *
 * No-op-sicher: ohne gültigen Shopify-Token passiert nichts.
 * DRY ist Default — mit LIVE=1 werden Änderungen geschrieben.
 *
 * ENV: SHOPIFY_SHOP=au3j0y-hq.myshopify.com
 *      + SHOPIFY_ADMIN_TOKEN=shpat_/shpca_…   ODER   SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET
 *      (Client-Credentials-Grant; Custom-App muss 1× im Shop installiert sein, Scope write_products.)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SHOP    = process.env.SHOPIFY_SHOP || '';
const TOK_ST  = process.env.SHOPIFY_ADMIN_TOKEN || '';
const CID     = process.env.SHOPIFY_CLIENT_ID || '';
const CSECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
const LIVE    = process.env.LIVE === '1';
// Ziel = die auf der STARTSEITE sichtbare Collection "⭐ Top 10 Bestseller" (handle bestseller-premium-heroes).
const COLL    = process.env.BESTSELLER_COLLECTION_GID || 'gid://shopify/Collection/687774499201';
const TARGET      = parseInt(process.env.TARGET || '10', 10);
const WINDOW_DAYS = parseInt(process.env.WINDOW_DAYS || '60', 10);
const MIN_RATING  = parseFloat(process.env.MIN_RATING || '4.3');
// Seed: bekannte Review-Sieger — immer im Kandidaten-Pool, falls nicht via Mitglieder/CSV erfasst.
const SEED_IDS = (process.env.SEED_IDS ? process.env.SEED_IDS.split(',') : [
  '15396249960833','15396249502081','15412915339649','15397247385985','15413025145217','15403009704321'
]).map(x=>x.trim().startsWith('gid://')?x.trim():`gid://shopify/Product/${x.trim()}`);
const MIN_COUNT   = parseInt(process.env.MIN_COUNT || '3', 10);
const API = '2025-01';

const __dir = path.dirname(fileURLToPath(import.meta.url));

async function getToken(){
  if(!(CID && CSECRET) && TOK_ST) return TOK_ST;
  if(SHOP && CID && CSECRET){
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({client_id:CID,client_secret:CSECRET,grant_type:'client_credentials'})});
    const j = await r.json(); return j.access_token || '';
  }
  return TOK_ST || '';
}
async function gql(token, query, variables){
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',
    headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},
    body:JSON.stringify({query, variables})});
  const j = await r.json();
  if(j.errors) throw new Error('GraphQL: '+JSON.stringify(j.errors));
  return j.data;
}
const numId = gid => String(gid).split('/').pop();

// good_products.csv → Liste der Handles (Spalte 1), in Datei-Reihenfolge
function goodHandles(){
  const f = path.join(__dir,'good_products.csv');
  if(!fs.existsSync(f)) return [];
  return fs.readFileSync(f,'utf8').split('\n').slice(1)
    .map(l=>l.split(',')[0].trim()).filter(Boolean);
}

// aktuelle Mitglieder der Collection
async function currentMembers(token){
  const out=[]; let cur=null, more=true;
  while(more){
    const d = await gql(token, `query($id:ID!,$c:String){ collection(id:$id){ products(first:100,after:$c){ pageInfo{hasNextPage endCursor} nodes{ id handle } } } }`, {id:COLL, c:cur});
    const p = d.collection.products; out.push(...p.nodes);
    more = p.pageInfo.hasNextPage; cur = p.pageInfo.endCursor;
  }
  return out;
}

// Verkäufe je Produkt aus Bestellungen der letzten WINDOW_DAYS Tage
async function salesUnits(token){
  const since = new Date(Date.now()-WINDOW_DAYS*864e5).toISOString().slice(0,10);
  const units = new Map(); let cur=null, more=true;
  while(more){
    const d = await gql(token, `query($q:String!,$c:String){ orders(first:100,after:$c,query:$q){ pageInfo{hasNextPage endCursor} nodes{ lineItems(first:50){ nodes{ quantity product{ id } } } } } }`, {q:`created_at:>=${since}`, c:cur});
    for(const o of d.orders.nodes) for(const li of o.lineItems.nodes){
      if(!li.product) continue;
      units.set(li.product.id, (units.get(li.product.id)||0)+(li.quantity||0));
    }
    more = d.orders.pageInfo.hasNextPage; cur = d.orders.pageInfo.endCursor;
  }
  return units; // Map<gid, units>
}

// Rating-Metafelder für eine Kandidatenliste (gids) laden
async function ratings(token, gids){
  const map = new Map();
  for(let i=0;i<gids.length;i+=50){
    const chunk = gids.slice(i,i+50);
    const d = await gql(token, `query($ids:[ID!]!){ nodes(ids:$ids){ ... on Product { id title r:metafield(namespace:"reviews",key:"rating"){value} c:metafield(namespace:"reviews",key:"rating_count"){value} } } }`, {ids:chunk});
    for(const n of d.nodes){ if(!n) continue;
      let rating=0; try{ rating=parseFloat(JSON.parse(n.r?.value||'{}').value||0); }catch{}
      map.set(n.id,{title:n.title, rating, count:parseInt(n.c?.value||'0',10)});
    }
  }
  return map;
}
async function resolveHandles(token, handles){
  const map = new Map();
  for(const h of handles){
    try{ const d = await gql(token, `query($h:String!){ productByHandle(handle:$h){ id } }`, {h});
      if(d.productByHandle) map.set(h, d.productByHandle.id);
    }catch{}
  }
  return map;
}

async function main(){
  if(!SHOP){ console.log('no-op: kein SHOPIFY_SHOP gesetzt.'); return; }
  const token = await getToken();
  if(!token){ console.log('no-op: kein gültiger Shopify-Token (App installiert? Scope write_products?).'); return; }

  const members = await currentMembers(token);
  const memberIds = members.map(m=>m.id);
  const handles = goodHandles();
  const handleMap = await resolveHandles(token, handles);
  const goodIds = handles.map(h=>handleMap.get(h)).filter(Boolean);

  // Kandidaten-Pool = Mitglieder ∪ good_products ∪ Seed (bekannte Review-Sieger)
  const pool = Array.from(new Set([...memberIds, ...goodIds, ...SEED_IDS]));

  let ranked, mode;
  const units = await salesUnits(token);
  if(units.size > 0){
    mode = `Verkäufe (${WINDOW_DAYS}d)`;
    ranked = Array.from(units.entries()).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
    // mit Pool auffüllen
    for(const id of pool) if(!ranked.includes(id)) ranked.push(id);
  } else {
    mode = `Reviews (0 Verkäufe → Fallback, ≥${MIN_RATING}★/${MIN_COUNT})`;
    const rmap = await ratings(token, pool);
    const rated = pool.filter(id=>{ const r=rmap.get(id); return r && r.rating>=MIN_RATING && r.count>=MIN_COUNT; })
      .sort((a,b)=>{ const A=rmap.get(a),B=rmap.get(b); return (B.rating-A.rating)||(B.count-A.count); });
    // dann beworbene Premium-Produkte (good_products-Reihenfolge), dann restliche Mitglieder
    const rest = [...goodIds, ...memberIds].filter(id=>!rated.includes(id));
    ranked = [...rated, ...rest.filter((v,i,a)=>a.indexOf(v)===i)];
  }
  const desired = ranked.slice(0, TARGET);

  const toAdd = desired.filter(id=>!memberIds.includes(id));
  const toRemove = memberIds.filter(id=>!desired.includes(id));

  console.log(`Modus: ${mode}`);
  console.log(`Aktuell: ${memberIds.length} · Ziel: ${desired.length} · +${toAdd.length} / -${toRemove.length}`);
  console.log('Reihenfolge:', desired.map(numId).join(', '));
  if(!LIVE){ console.log('DRY-RUN — mit LIVE=1 anwenden.'); return; }

  if(toAdd.length){
    const d = await gql(token, `mutation($id:ID!,$p:[ID!]!){ collectionAddProducts(id:$id,productIds:$p){ userErrors{message} } }`, {id:COLL,p:toAdd});
    const e=d.collectionAddProducts.userErrors; if(e.length) console.log('add errors:',e);
  }
  if(toRemove.length){
    const d = await gql(token, `mutation($id:ID!,$p:[ID!]!){ collectionRemoveProducts(id:$id,productIds:$p){ userErrors{message} } }`, {id:COLL,p:toRemove});
    const e=d.collectionRemoveProducts.userErrors; if(e.length) console.log('remove errors:',e);
  }
  const moves = desired.map((id,i)=>({id, newPosition:String(i)}));
  const d = await gql(token, `mutation($id:ID!,$m:[MoveInput!]!){ collectionReorderProducts(id:$id,moves:$m){ userErrors{message} } }`, {id:COLL,m:moves});
  const e=d.collectionReorderProducts.userErrors; if(e.length) console.log('reorder errors:',e);
  console.log('✅ Bestseller aktualisiert (LIVE).');
}
main().catch(e=>{ console.error('Fehler:', e.message); process.exit(0); });
