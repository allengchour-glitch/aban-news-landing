#!/usr/bin/env node
/* LuxeStyle — list_by_rating.mjs
 * Fragt für ALLE aktiven Produkte das Judge.me-Metafeld `reviews.rating` (+ `reviews.rating_count`)
 * via Shopify Admin GraphQL ab, filtert ≥ MINRATING (Default 4.0), sortiert absteigend und schreibt
 * einen gerankten Report nach `dropship/rated_products.csv` (name,rating,count,title,handle,image).
 *
 * Das ist die Kuratierungs-Quelle für gut bewertete Produkte. Es überschreibt `good_products.csv`
 * BEWUSST NICHT automatisch (REEL-REGELN §1: nur authentische Lifestyle-Bilder, keine Freisteller →
 * Bildauswahl muss menschlich/regelkonform bleiben). Der Report dient als Vorschlagsliste.
 *
 * No-op-safe: ohne SHOPIFY-Secrets nur Konsolen-Hinweis, kein harter Fehler.
 * ENV: SHOPIFY_SHOP · (SHOPIFY_ADMIN_TOKEN | SHOPIFY_CLIENT_ID+SHOPIFY_CLIENT_SECRET) · MINRATING=4.0
 */
import fs from 'node:fs';

const SHOP = process.env.SHOPIFY_SHOP || '';
const TOK_STATIC = process.env.SHOPIFY_ADMIN_TOKEN || '';
const CID = process.env.SHOPIFY_CLIENT_ID || '';
const CSECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
const MIN = parseFloat(process.env.MINRATING || '4.0');
const OUT = new URL('../dropship/rated_products.csv', import.meta.url).pathname;

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

async function gql(token, query){
  const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',
    headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query})});
  return r.json();
}

function esc(v){ v=String(v??''); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }

if(!SHOP){ console.log('Kein SHOPIFY_SHOP gesetzt → No-op. (Report braucht Shop + Token/Client-Credentials.)'); process.exit(0); }

const token = await getToken();
if(!token){ console.log('Kein gültiger Shopify-Token (Client-Credentials/Admin-Token) → No-op.'); process.exit(0); }

const rated = [];
let cursor = null, page = 0;
while(true){
  page++;
  const after = cursor ? `, after:"${cursor}"` : '';
  const q = `{
    products(first:100, query:"status:active"${after}) {
      edges { cursor node {
        title handle
        featuredImage { url }
        rating: metafield(namespace:"reviews", key:"rating"){ value }
        count: metafield(namespace:"reviews", key:"rating_count"){ value }
      }}
      pageInfo { hasNextPage endCursor }
    }
  }`;
  const j = await gql(token, q);
  const conn = j?.data?.products;
  if(!conn){ console.error('GraphQL-Fehler:', JSON.stringify(j.errors||j).slice(0,300)); break; }
  for(const e of conn.edges){
    const n = e.node;
    let rv = n.rating?.value;
    // reviews.rating kann JSON ({"value":4.9,...}) oder Zahl sein.
    if(rv && rv.startsWith('{')){ try{ rv = JSON.parse(rv).value; }catch{} }
    const r = parseFloat(rv);
    if(!isNaN(r) && r >= MIN){
      rated.push({ rating:r, count:parseInt(n.count?.value||'0',10)||0,
        title:n.title, handle:n.handle, image:n.featuredImage?.url||'' });
    }
  }
  if(!conn.pageInfo.hasNextPage) break;
  cursor = conn.pageInfo.endCursor;
  if(page>40) break; // Sicherheitslimit
}

rated.sort((a,b)=> b.rating - a.rating || b.count - a.count);
const header = 'rating,count,title,handle,image\n';
const body = rated.map(p=>[p.rating,p.count,p.title,p.handle,p.image].map(esc).join(',')).join('\n');
fs.writeFileSync(OUT, header + body + (body?'\n':''));
console.log(`✅ ${rated.length} Produkte mit Rating ≥ ${MIN} → ${OUT}`);
rated.slice(0,15).forEach(p=> console.log(`   ${p.rating}★ (${p.count})  ${p.title}`));
if(rated.length===0) console.log('   (Aktuell haben nur wenige Produkte Reviews — Judge.me-Import füllt das, siehe reviews-import.mjs.)');
