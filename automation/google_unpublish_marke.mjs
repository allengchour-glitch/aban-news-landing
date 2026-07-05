#!/usr/bin/env node
// Depubliziert tag:marke-Produkte vom Google-Kanal (Publication 302872297857).
// Grund: Marken-Sperr-Risiko im Google Merchant Center (SHARED-MEMORY-Handoff 06-27).
// Idempotent: fragt nur Produkte ab, die NOCH auf Google publiziert sind.
const SHOP = 'au3j0y-hq.myshopify.com';
const GOOGLE_PUB = 'gid://shopify/Publication/302872297857';
const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
const QUERY = process.env.PQUERY || 'tag:marke status:active publication_ids:302872297857';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function token() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) });
  return (await r.json()).access_token;
}
async function gql(tok, query) {
  for (let a = 0; a < 5; a++) {
    const r = await fetch(`https://${SHOP}/admin/api/2024-10/graphql.json`, { method: 'POST',
      headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }) });
    const j = await r.json();
    if (j.errors && JSON.stringify(j.errors).includes('THROTTLED')) { await sleep(4000); continue; }
    return j;
  }
  throw new Error('THROTTLED nach 5 Versuchen');
}

const tok = await token();
let total = 0, round = 0;
while (true) {
  const j = await gql(tok, `{ products(first:50, query:"${QUERY}"){edges{node{id}}} }`);
  const ids = (j.data?.products?.edges || []).map(e => e.node.id);
  if (!ids.length) break;
  for (let i = 0; i < ids.length; i += 20) {
    const batch = ids.slice(i, i + 20);
    const muts = batch.map((id, k) =>
      `u${k}:publishableUnpublish(id:"${id}",input:[{publicationId:"${GOOGLE_PUB}"}]){userErrors{message}}`).join(' ');
    const r = await gql(tok, `mutation{${muts}}`);
    const errs = Object.values(r.data || {}).flatMap(v => v?.userErrors || []);
    if (errs.length) console.log('userErrors:', JSON.stringify(errs.slice(0, 2)));
    total += batch.length;
    await sleep(2500);
  }
  round++;
  if (round % 5 === 0) console.log(`Fortschritt: ${total} von Google depubliziert…`);
}
console.log(`FERTIG: ${total} Produkte vom Google-Kanal depubliziert.`);
