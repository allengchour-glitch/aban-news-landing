#!/usr/bin/env node
// Cross-sell footer appender for LuxeStyle. GraphQL Admin API 2025-01.
const SHOP = process.env.SHOPIFY_SHOP;
const CID = process.env.SHOPIFY_CLIENT_ID;
const CSECRET = process.env.SHOPIFY_CLIENT_SECRET;
const API = `https://${SHOP}/admin/api/2025-01/graphql.json`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getToken() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CSECRET, grant_type: 'client_credentials' })
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('no token: ' + JSON.stringify(j));
  return j.access_token;
}

let TOKEN;
async function gql(query, variables, tries = 6) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
      body: JSON.stringify({ query, variables })
    });
    if (r.status === 429) { await sleep(2000 * (i + 1)); continue; }
    const j = await r.json();
    const throttled = (j.errors || []).some(e => (e.extensions?.code === 'THROTTLED') || /throttl/i.test(e.message || ''));
    if (throttled) { await sleep(2000 * (i + 1)); continue; }
    if (j.errors) throw new Error(JSON.stringify(j.errors));
    return j.data;
  }
  throw new Error('giving up after retries');
}

// tag -> [ {handle}, {handle} ]
const PLAN = {
  gaming:     ['gaming', 'hightech-gadgets'],
  schmuck:    ['premium-schmuck', 'sub-ringe'],
  uhren:      ['uhren', 'smartwatches-wearables'],
  parfum:     ['parfum-duefte', 'premium-beauty'],
  beautytech: ['beauty-geraete', 'premium-beauty'],
  auto:       ['auto-kfz-zubehoer', 'hightech-gadgets'],
};

async function resolveCollection(handle) {
  const d = await gql(`query($h:String!){ collectionByHandle(handle:$h){ id handle title } }`, { h: handle });
  return d.collectionByHandle; // null if not exist
}

async function main() {
  TOKEN = await getToken();

  // Resolve & verify all handles once
  const handleCache = {};
  const allHandles = [...new Set(Object.values(PLAN).flat())];
  for (const h of allHandles) {
    handleCache[h] = await resolveCollection(h);
    console.error(`collection ${h}: ${handleCache[h] ? 'OK ('+handleCache[h].title+')' : 'MISSING'}`);
  }

  // Build footer per tag; if a handle missing, skip that tag entirely (can't link 2)
  const footerByTag = {};
  for (const [tag, hs] of Object.entries(PLAN)) {
    const cols = hs.map(h => handleCache[h]);
    if (cols.some(c => !c)) { footerByTag[tag] = null; continue; }
    const links = cols.map(c => `<a href="/collections/${c.handle}">${c.title}</a>`).join(' · ');
    footerByTag[tag] = `<!--xsell--><p>👉 Passt dazu: ${links}</p>`;
  }

  const CAP = 500;
  const added = {}; const scanned = {}; const skippedMarker = {};
  for (const t of Object.keys(PLAN)) { added[t] = 0; scanned[t] = 0; skippedMarker[t] = 0; }
  let totalUpdates = 0;

  for (const [tag, footer] of Object.entries(footerByTag)) {
    if (totalUpdates >= CAP) break;
    if (!footer) { console.error(`tag ${tag}: SKIPPED (a target collection missing)`); continue; }

    let cursor = null;
    outer:
    while (true) {
      const d = await gql(`
        query($q:String!,$after:String){
          products(first:50, query:$q, after:$after){
            pageInfo{ hasNextPage endCursor }
            edges{ node{ id status descriptionHtml } }
          }
        }`, { q: `tag:${tag} status:active`, after: cursor });
      const conn = d.products;
      for (const e of conn.edges) {
        const p = e.node;
        if (p.status !== 'ACTIVE') continue;
        scanned[tag]++;
        const html = p.descriptionHtml || '';
        if (html.includes('<!--xsell-->')) { skippedMarker[tag]++; continue; }
        if (totalUpdates >= CAP) break outer;
        const newHtml = html + footer;
        const up = await gql(`
          mutation($input:ProductInput!){
            productUpdate(input:$input){ product{ id } userErrors{ field message } }
          }`, { input: { id: p.id, descriptionHtml: newHtml } });
        const errs = up.productUpdate.userErrors;
        if (errs && errs.length) { console.error(`ERR ${p.id}: ${JSON.stringify(errs)}`); continue; }
        added[tag]++; totalUpdates++;
        await sleep(120);
      }
      if (!conn.pageInfo.hasNextPage) break;
      cursor = conn.pageInfo.endCursor;
    }
    console.error(`tag ${tag}: scanned=${scanned[tag]} added=${added[tag]} skipped(marker)=${skippedMarker[tag]}`);
  }

  console.log(JSON.stringify({ totalUpdates, added, scanned, skippedMarker,
    collections: Object.fromEntries(Object.entries(handleCache).map(([h,v])=>[h, v?v.title:null])) }, null, 2));
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
