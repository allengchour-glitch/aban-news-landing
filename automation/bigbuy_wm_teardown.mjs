#!/usr/bin/env node
/*
 * WM-2026-TEARDOWN — „wenn WM fertig, dann alles weg".
 * Macht in EINEM Lauf:
 *   1) alle Produkte mit Tag `wm-2026` ARCHIVIEREN (reversibel, nicht gelöscht),
 *   2) den Menüpunkt „⚽ WM 2026" aus dem Hauptmenü entfernen,
 *   3) die Collection `wm-fussball-2026` aus allen Kanälen depublizieren.
 * Aufruf (nach der WM):
 *   set -a; . /tmp/shopify_creds.env; set +a
 *   LIVE=1 /opt/node22/bin/node automation/bigbuy_wm_teardown.mjs
 * Ohne LIVE=1 = DRY (zeigt nur, was passieren würde).
 */
const SHOP = process.env.SHOPIFY_SHOP, CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET, API = '2025-01';
const LIVE = process.env.LIVE === '1';
const MENU_ID = 'gid://shopify/Menu/310224093569';
const COLL_HANDLE = 'wm-fussball-2026', WM_URL = '/collections/wm-fussball-2026', TAG = 'wm-2026';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function token() { const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) }); return (await r.json()).access_token; }
async function gql(t, q, v) { const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': t }, body: JSON.stringify({ query: q, variables: v }) }); return r.json(); }
const map = (it) => ({ id: it.id, title: it.title, type: it.type, url: it.url, resourceId: it.resourceId, tags: it.tags || [], items: (it.items || []).map(map) });

const t = await token();
if (!t) { console.error('Kein Shopify-Token.'); process.exit(1); }
console.log(`WM-Teardown [${LIVE ? 'LIVE' : 'DRY'}]`);

// 1) Produkte archivieren
let archived = 0, scanned = 0;
const Q = `query($q:String!,$cursor:String){ products(first:50, query:$q, after:$cursor){ pageInfo{ hasNextPage endCursor } edges{ node{ id title } } } }`;
let cursor = null;
do {
  const r = await gql(t, Q, { q: `tag:${TAG} status:active`, cursor });
  const pg = r.data?.products; if (!pg) break;
  for (const e of pg.edges) {
    scanned++;
    if (LIVE) { await gql(t, `mutation($id:ID!){ productUpdate(input:{id:$id, status:ARCHIVED}){ userErrors{ message } } }`, { id: e.node.id }); archived++; await sleep(120); }
    else console.log(`  würde archivieren: ${e.node.title}`);
  }
  cursor = pg.pageInfo.hasNextPage ? pg.pageInfo.endCursor : null;
} while (cursor);
console.log(LIVE ? `✅ ${archived} Produkte archiviert.` : `DRY: ${scanned} Produkte hätten archiviert.`);

// 2) Menüpunkt entfernen
const mq = (await gql(t, `{ menu(id:"${MENU_ID}"){ title handle items{ id title url type resourceId tags items{ id title url type resourceId tags items{ id title url type resourceId tags } } } } }`)).data.menu;
if (mq && mq.items.some(i => i.url === WM_URL)) {
  if (LIVE) {
    const items = mq.items.filter(i => i.url !== WM_URL).map(map);
    const r = await gql(t, `mutation($id:ID!,$title:String!,$handle:String!,$items:[MenuItemUpdateInput!]!){ menuUpdate(id:$id,title:$title,handle:$handle,items:$items){ userErrors{ message } } }`, { id: MENU_ID, title: mq.title, handle: mq.handle, items });
    const e = r.data?.menuUpdate?.userErrors || [];
    console.log(e.length ? `⚠️ Menü-Fehler: ${JSON.stringify(e)}` : '✅ Menüpunkt „⚽ WM 2026" entfernt.');
  } else console.log('DRY: würde Menüpunkt „⚽ WM 2026" entfernen.');
} else console.log('Menüpunkt nicht (mehr) vorhanden.');

// 3) Collection depublizieren
const c = (await gql(t, `{ collectionByHandle(handle:"${COLL_HANDLE}"){ id } }`)).data?.collectionByHandle;
if (c) {
  if (LIVE) {
    const pubs = ((await gql(t, `{ publications(first:10){ edges{ node{ id } } } }`)).data?.publications?.edges || []).map(e => ({ publicationId: e.node.id }));
    const r = await gql(t, `mutation($id:ID!,$pubs:[PublicationInput!]!){ publishableUnpublish(id:$id, input:$pubs){ userErrors{ message } } }`, { id: c.id, pubs });
    const e = r.data?.publishableUnpublish?.userErrors || [];
    console.log(e.length ? `⚠️ Collection-Fehler: ${JSON.stringify(e)}` : '✅ Collection wm-fussball-2026 depubliziert.');
  } else console.log('DRY: würde Collection wm-fussball-2026 depublizieren.');
} else console.log('Collection nicht gefunden.');
console.log('Fertig.');
