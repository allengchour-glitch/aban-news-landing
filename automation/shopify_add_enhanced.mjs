#!/usr/bin/env node
/* LuxeStyle — shopify_add_enhanced.mjs
 *
 * Hängt die KI-veredelten Bilder (social/enhanced/<name>.jpg, öffentlich via GitHub Pages) ZUSÄTZLICH
 * als Produktbild an das jeweilige Shopify-Produkt (productCreateMedia). So bekommt jedes veredelte
 * Produkt sein Editorial-Bild auch im Shop. Quelle: social/enhanced/_manifest.csv (name,handle,label,date).
 * Ledger social/enhanced/_added.txt verhindert Doppel-Anhängen.
 *
 * Login wie automation/site-health.mjs: Client-Credentials-Grant ODER statischer Admin-Token.
 * No-op-safe: ohne Shopify-Creds (SHOPIFY_SHOP + CLIENT_ID/SECRET oder ADMIN_TOKEN) sauberer Leerlauf.
 *
 * ENV: SHOPIFY_SHOP (z.B. au3j0y-hq.myshopify.com) · SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET
 *      (oder SHOPIFY_ADMIN_TOKEN) · OUT_BASE_URL (Default https://abannews.com) · DRY_RUN=1
 */
import fs from 'node:fs';
import path from 'node:path';

const SHOP = process.env.SHOPIFY_SHOP || '';
const TOK_STATIC = process.env.SHOPIFY_ADMIN_TOKEN || '';
const CID = process.env.SHOPIFY_CLIENT_ID || '';
const CSECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
const OUT_BASE = (process.env.OUT_BASE_URL || 'https://abannews.com').replace(/\/$/, '');
const DRY = process.env.DRY_RUN === '1';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.dirname(HERE);
const MANIFEST = path.join(ROOT, 'social', 'enhanced', '_manifest.csv');
const LEDGER = path.join(ROOT, 'social', 'enhanced', '_added.txt');

if(!SHOP || (!TOK_STATIC && !(CID && CSECRET))){
  console.log('Keine Shopify-Creds (SHOPIFY_SHOP + CLIENT_ID/SECRET oder ADMIN_TOKEN) → No-op. Bilder bleiben in social/enhanced + auf Social.');
  process.exit(0);
}
if(!fs.existsSync(MANIFEST)){ console.log('Kein _manifest.csv → nichts hinzuzufügen.'); process.exit(0); }

async function getToken(){
  if(TOK_STATIC) return TOK_STATIC;
  try{
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ client_id:CID, client_secret:CSECRET, grant_type:'client_credentials' }) });
    const j = await r.json().catch(()=>({}));
    return j.access_token || '';
  }catch(e){ console.error('Token-Fehler:', e.message); return ''; }
}
async function gql(token, query, variables){
  const r = await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`, { method:'POST',
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

const done = ledger();
const items = readManifest().filter(m => !done.has(m.name));
// Dedupe nach name (jüngster Manifest-Eintrag reicht)
const uniq = [...new Map(items.map(m=>[m.name,m])).values()];
if(uniq.length===0){ console.log('Alle veredelten Bilder bereits hinterlegt → nichts zu tun.'); process.exit(0); }

const token = await getToken();
if(!token){ console.error('Kein Admin-Token erhalten → Abbruch.'); process.exit(0); }

let added = 0;
for(const m of uniq){
  const imgUrl = `${OUT_BASE}/social/enhanced/${m.name}.jpg`;
  console.log(`→ ${m.name} (${m.handle}) ← ${imgUrl}`);
  if(DRY){ console.log('   DRY_RUN: würde productCreateMedia ausführen.'); added++; continue; }
  const pr = await gql(token, Q_PRODUCT, { q: `handle:${m.handle}` });
  const pid = pr?.data?.products?.edges?.[0]?.node?.id;
  if(!pid){ console.error('   ⚠️  Produkt nicht gefunden:', m.handle); continue; }
  const res = await gql(token, M_ADD, { id: pid, media: [{ originalSource: imgUrl, mediaContentType: 'IMAGE', alt: `${m.label} – LuxeStyle` }] });
  const errs = res?.data?.productCreateMedia?.mediaUserErrors || [];
  if(errs.length){ console.error('   ⚠️  mediaUserErrors:', JSON.stringify(errs)); continue; }
  fs.appendFileSync(LEDGER, m.name + '\n');
  console.log('   ✅ als Produktbild hinzugefügt');
  added++;
  await new Promise(r=>setTimeout(r, 600)); // sanftes Rate-Limit
}
console.log(`Fertig: ${added} veredelte Bilder an Shopify-Produkte gehängt${DRY?' (DRY)':''}.`);
