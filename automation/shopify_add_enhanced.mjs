#!/usr/bin/env node
/* LuxeStyle — shopify_add_enhanced.mjs
 *
 * Hängt die KI-veredelten Bilder (social/enhanced/<name>.jpg, öffentlich via GitHub Pages) ZUSÄTZLICH
 * als Produktbild an das jeweilige Shopify-Produkt (productCreateMedia). Quelle: social/enhanced/_manifest.csv.
 * Ledger social/enhanced/_added.txt verhindert Doppel-Anhängen.
 *
 * Auth: BEVORZUGT Client-Credentials-Grant (SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET → frischer Admin-Token),
 * sonst statischer SHOPIFY_ADMIN_TOKEN. No-op-safe ohne Creds.
 * Der Custom-App-Token braucht Scopes read_products + write_products (App danach neu installieren).
 *
 * ENV: SHOPIFY_SHOP (myshopify-Domain; Custom-Domain → Fallback) · SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET
 *      (empfohlen) ODER SHOPIFY_ADMIN_TOKEN · OUT_BASE_URL · DRY_RUN=1
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SHOP_FALLBACK = 'au3j0y-hq.myshopify.com';
let SHOP = (process.env.SHOPIFY_SHOP || '').trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/\s+/g, '');
if(!/\.myshopify\.com$/i.test(SHOP)){
  if(SHOP) console.log(`Hinweis: SHOPIFY_SHOP="${SHOP}" ist keine .myshopify.com-Domain → nutze bekannten Shop ${SHOP_FALLBACK}.`);
  SHOP = SHOP_FALLBACK;
}
const TOK_STATIC = (process.env.SHOPIFY_ADMIN_TOKEN || '').trim();
const CID = (process.env.SHOPIFY_CLIENT_ID || '').trim();
const CSECRET = (process.env.SHOPIFY_CLIENT_SECRET || '').trim();
const OUT_BASE = (process.env.OUT_BASE_URL || 'https://abannews.com').replace(/\/$/, '');
const DRY = process.env.DRY_RUN === '1';

const HERE = path.dirname(fileURLToPath(new URL(import.meta.url)));
const ROOT = path.dirname(HERE);
const MANIFEST = path.join(ROOT, 'social', 'enhanced', '_manifest.csv');
const LEDGER = path.join(ROOT, 'social', 'enhanced', '_added.txt');

if(!TOK_STATIC && !(CID && CSECRET)){
  console.log('Keine Shopify-Creds (CLIENT_ID/SECRET oder ADMIN_TOKEN) → No-op. Bilder bleiben in social/enhanced + auf Social.');
  process.exit(0);
}
if(!fs.existsSync(MANIFEST)){ console.log('Kein _manifest.csv → nichts hinzuzufügen.'); process.exit(0); }

async function fetchRetry(url, opts, tries=3){
  let lastErr;
  for(let i=0;i<tries;i++){
    try{ return await fetch(url, opts); }
    catch(e){ lastErr=e; console.error(`   Netz-Fehler (${i+1}/${tries}): ${e.message} — retry…`); await new Promise(r=>setTimeout(r, 2000*(i+1))); }
  }
  throw lastErr;
}
async function getToken(){
  // Bevorzugt Client-Credentials (frischer, gültiger Token mit den App-Scopes); ADMIN_TOKEN nur als Fallback.
  if(CID && CSECRET){
    try{
      const r = await fetchRetry(`https://${SHOP}/admin/oauth/access_token`, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ client_id:CID, client_secret:CSECRET, grant_type:'client_credentials' }) });
      const j = await r.json().catch(()=>({}));
      if(j.access_token){ console.log('Token via Client-Credentials geholt.'); return j.access_token; }
      console.error('Client-Credentials-Endpoint:', r.status, JSON.stringify(j).slice(0,200), '→ Fallback auf ADMIN_TOKEN (falls gesetzt).');
    }catch(e){ console.error('Client-Credentials-Fehler:', e.message); }
  }
  if(TOK_STATIC){ console.log('Nutze statischen SHOPIFY_ADMIN_TOKEN.'); return TOK_STATIC; }
  return '';
}
async function gql(token, query, variables){
  const r = await fetchRetry(`https://${SHOP}/admin/api/2025-01/graphql.json`, { method:'POST',
    headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token}, body: JSON.stringify({ query, variables }) });
  return r.json().catch(()=>({}));
}

const Q_PRODUCT = `query($q:String!){ products(first:1, query:$q){ edges{ node{ id title } } } }`;
const M_ADD = `mutation($id:ID!,$media:[CreateMediaInput!]!){ productCreateMedia(productId:$id, media:$media){ media{ status } mediaUserErrors{ field message } } }`;

function readManifest(){
  return fs.readFileSync(MANIFEST,'utf8').split('\n').filter(Boolean).slice(1)
    .map(l => { const [name,handle,label] = l.split(','); return { name:(name||'').trim(), handle:(handle||'').replace(/^"|"$/g,'').trim(), label:(label||'').replace(/^"|"$/g,'').trim() }; })
    .filter(m => m.name && m.handle);
}
function ledger(){ try{ return new Set(fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.trim()).filter(Boolean)); }catch{ return new Set(); } }

console.log(`Shop: ${SHOP}`);
const done = ledger();
const items = readManifest().filter(m => !done.has(m.name));
const uniq = [...new Map(items.map(m=>[m.name,m])).values()];
if(uniq.length===0){ console.log('Alle veredelten Bilder bereits hinterlegt → nichts zu tun.'); process.exit(0); }

const token = await getToken();
if(!token){ console.error('Kein Admin-Token erhalten → Abbruch.'); process.exit(0); }

let added = 0;
for(const m of uniq){
  const imgUrl = `${OUT_BASE}/social/enhanced/${m.name}.jpg`;
  console.log(`→ ${m.name} (${m.handle}) ← ${imgUrl}`);
  if(DRY){ console.log('   DRY_RUN: würde productCreateMedia ausführen.'); added++; continue; }
  try{
    const pr = await gql(token, Q_PRODUCT, { q: `handle:${m.handle}` });
    if(pr?.errors){ console.error('   ⚠️  GraphQL-Fehler (Scope/Token?):', JSON.stringify(pr.errors).slice(0,200)); continue; }
    const pid = pr?.data?.products?.edges?.[0]?.node?.id;
    if(!pid){ console.error('   ⚠️  Produkt nicht gefunden:', m.handle); continue; }
    const res = await gql(token, M_ADD, { id: pid, media: [{ originalSource: imgUrl, mediaContentType: 'IMAGE', alt: `${m.label} – LuxeStyle` }] });
    if(res?.errors){ console.error('   ⚠️  write_products-Scope fehlt?', JSON.stringify(res.errors).slice(0,200)); continue; }
    const errs = res?.data?.productCreateMedia?.mediaUserErrors || [];
    if(errs.length){ console.error('   ⚠️  mediaUserErrors:', JSON.stringify(errs)); continue; }
    fs.appendFileSync(LEDGER, m.name + '\n');
    console.log('   ✅ als Produktbild hinzugefügt');
    added++;
    await new Promise(r=>setTimeout(r, 600));
  }catch(e){ console.error('   Fehler:', e.message); }
}
console.log(`Fertig: ${added} veredelte Bilder an Shopify-Produkte gehängt${DRY?' (DRY)':''}.`);
