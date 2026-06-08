#!/usr/bin/env node
/* LuxeStyle — update_pod_page.mjs
 * Schreibt dropship/pod/page_body.html in die Shopify-Seite "Selbst gestalten" (Print-on-Demand).
 * Auth: Client-Credentials-Grant (Shopify hat shpat_-Tokens abgeschafft) → X-Shopify-Access-Token.
 * ENV: SHOPIFY_SHOP (z.B. au3j0y-hq.myshopify.com) · SHOPIFY_CLIENT_ID · SHOPIFY_CLIENT_SECRET
 *      POD_PAGE_ID (Default gid://shopify/Page/698444710273) · POD_BODY_FILE (Default dropship/pod/page_body.html)
 * No-op-safe: ohne Creds sauberer Exit 0.
 */
import fs from 'node:fs';

const SHOP = process.env.SHOPIFY_SHOP || '';
const CID = process.env.SHOPIFY_CLIENT_ID || '';
const SECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
const PAGE_ID = process.env.POD_PAGE_ID || 'gid://shopify/Page/698444710273';
const BODY_FILE = process.env.POD_BODY_FILE || 'dropship/pod/page_body.html';
const API = '2024-10';

if(!SHOP || !CID || !SECRET){ console.log('Shopify-Creds fehlen (SHOPIFY_SHOP/CLIENT_ID/CLIENT_SECRET) → No-op.'); process.exit(0); }
if(!fs.existsSync(BODY_FILE)){ console.error('Body-Datei fehlt:', BODY_FILE); process.exit(1); }
const body = fs.readFileSync(BODY_FILE,'utf8');

async function token(){
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ client_id:CID, client_secret:SECRET, grant_type:'client_credentials' }) });
  const j = await r.json().catch(()=>({}));
  if(!r.ok || !j.access_token){ console.error('Token-Fehler:', r.status, JSON.stringify(j).slice(0,300)); process.exit(1); }
  return j.access_token;
}
async function gql(tok, query, variables){
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
    method:'POST', headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},
    body: JSON.stringify({ query, variables }) });
  const j = await r.json().catch(()=>({}));
  return { ok:r.ok, status:r.status, j };
}

const tok = await token();
const M = `mutation($id: ID!, $page: PageUpdateInput!){
  pageUpdate(id:$id, page:$page){ page{ id title handle } userErrors{ field message } }
}`;
const res = await gql(tok, M, { id: PAGE_ID, page: { body } });
const ue = res.j?.data?.pageUpdate?.userErrors || [];
if(!res.ok || res.j.errors || ue.length){
  console.error('pageUpdate-Fehler:', res.status, JSON.stringify(res.j.errors||ue).slice(0,400)); process.exit(1);
}
console.log('✅ Seite aktualisiert:', JSON.stringify(res.j.data.pageUpdate.page), `(${body.length} Zeichen)`);
