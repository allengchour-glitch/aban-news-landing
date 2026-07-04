#!/usr/bin/env node
/* ptype3 — normalize productType across the OLDER tail of the catalog.
 * Paginates status:active, CREATED_AT ASC (oldest first). Infers clean German
 * productType from tags/title when current type is empty/junk. Idempotent ledger.
 */
import fs from 'node:fs';

const SHOP = process.env.SHOPIFY_SHOP || '';
const CID = process.env.SHOPIFY_CLIENT_ID || '';
const CSECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
const API = '2025-01';
const LEDGER = '/tmp/ptype3_done.txt';
const CAP = 800;

const done = new Set();
try { fs.readFileSync(LEDGER, 'utf8').split('\n').forEach(l => { const id = l.trim().split('\t')[0]; if (id) done.add(id); }); } catch {}

async function getToken() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CSECRET, grant_type: 'client_credentials' })
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('no token: ' + JSON.stringify(j));
  return j.access_token;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function gql(token, query, variables) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query, variables })
    });
    if (r.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
    const j = await r.json();
    if (j.errors) {
      const throttled = JSON.stringify(j.errors).includes('THROTTLED');
      if (throttled) { await sleep(2000 * (attempt + 1)); continue; }
      throw new Error('gql errors: ' + JSON.stringify(j.errors));
    }
    // throttle status guard
    const cost = j.extensions?.cost?.throttleStatus;
    if (cost && cost.currentlyAvailable < 200) await sleep(1200);
    return j.data;
  }
  throw new Error('gql retries exhausted');
}

// ---- junk detection ----
function isJunkType(t) {
  const s = (t || '').trim();
  if (!s) return true;
  const low = s.toLowerCase();
  if (low === 'default' || low === 'default title') return true;
  if (/^\d+$/.test(s)) return true;                       // pure numeric
  if (/^cj[a-z0-9]{4,}$/i.test(s)) return true;           // CJxxxx supplier code
  if (/^[A-Z0-9]{6,}$/.test(s) && /\d/.test(s)) return true; // all-caps supplier code w/ digit
  return false;
}

// ---- inference from tags + title ----
// ordered rules: first confident match wins
function infer(title, tags) {
  const hay = (title + ' ' + tags.join(' ')).toLowerCase();
  const has = (...ks) => ks.some(k => hay.includes(k));

  // very specific first
  if (has('damenkleid', 'abendkleid', 'sommerkleid', 'maxikleid', 'cocktailkleid') ||
      (has('kleid') && has('damen', 'women', 'frauen'))) return 'Damenkleider';
  if (has('herren') && has('hemd', 'jogginghose', 'stoffhose', 'cordhose', 'anzughose', 'hose', 'shirt', 'jacke', 'pullover'))
    return 'Herrenmode';
  if (has('uhr', 'uhren', 'armbanduhr', 'watch', 'chronograph')) return 'Uhren';
  if (has('schmuck', 'halskette', 'kette', 'armband', 'ohrring', 'ring', 'anhänger', 'jewel', 'necklace', 'bracelet', 'earring')) return 'Schmuck';
  if (has('werkzeug', 'schrauben', 'bohrer', 'zange', 'säge', 'schleif', 'tool')) return 'Werkzeug';
  if (has('beautytech', 'beauty-gerät', 'beautygerät', 'gesichtsreinig', 'ipl', 'haarentferner', 'led-maske', 'mikrodermabrasion')) return 'Beauty-Gerät';
  if (has('auto-zubehör', 'auto zubehör', 'kfz', 'car', 'auto-', 'automotive') || (has('auto') && has('halter', 'ladegerät', 'zubehör'))) return 'Auto-Zubehör';
  if (has('hightech', 'high-tech', 'gadget', 'smart-home', 'smarthome', 'elektronik', 'bluetooth', 'wireless')) return 'Hightech';
  if (has('basteln', 'bastelbedarf', 'bastel', 'diy', 'kreativ-set')) return 'Bastelbedarf';
  if (has('küche', 'kueche', 'kitchen', 'küchen', 'kochen', 'backen')) return 'Küche';
  if (has('sonnenbrille', 'brille', 'eyewear', 'sunglass')) return 'Sonnenbrillen';
  if (has('tasche', 'handtasche', 'rucksack', 'bag', 'backpack')) return 'Taschen';
  if (has('schuh', 'sneaker', 'stiefel', 'sandale', 'boot')) return 'Schuhe';
  if (has('poster', 'wandbild', 'leinwand', 'print', 'kunstdruck')) return 'Poster';
  if (has('sticker', 'aufkleber')) return 'Sticker';
  if (has('magnet')) return 'Magnete';
  if (has('haustier', 'hund', 'katze', 'pet', 'dog', 'cat')) return 'Haustierbedarf';
  if (has('deko', 'dekoration', 'wohndeko', 'decor')) return 'Deko';
  return null; // not confident
}

async function main() {
  const token = await getToken();
  let cursor = null;
  let scanned = 0, considered = 0, set = 0, skippedJunkNoInfer = 0, alreadyClean = 0, ledgerSkip = 0;
  const updates = [];
  const ledgerLines = [];

  outer:
  while (true) {
    const data = await gql(token, `
      query($cursor: String) {
        products(first: 100, after: $cursor, query: "status:active", sortKey: CREATED_AT, reverse: false) {
          pageInfo { hasNextPage endCursor }
          edges { node { id title productType tags createdAt } }
        }
      }`, { cursor });
    const edges = data.products.edges;
    for (const e of edges) {
      const n = e.node;
      scanned++;
      const numId = n.id.split('/').pop();
      if (isJunkType(n.productType)) {
        considered++;
        if (done.has(n.id)) { ledgerSkip++; continue; }
        const inferred = infer(n.title, n.tags || []);
        if (inferred) {
          updates.push({ id: n.id, title: n.title, type: inferred });
          if (updates.length >= CAP) { break outer; }
        } else {
          skippedJunkNoInfer++;
        }
      } else {
        alreadyClean++;
      }
    }
    if (!data.products.pageInfo.hasNextPage) break;
    cursor = data.products.pageInfo.endCursor;
  }

  console.log(`SCAN: scanned=${scanned} junk=${considered} clean=${alreadyClean} ledgerAlreadyDone=${ledgerSkip} candidates=${updates.length} junkNoInfer=${skippedJunkNoInfer}`);

  if (process.env.DRY) {
    const byType = {};
    updates.forEach(u => { byType[u.type] = (byType[u.type]||0)+1; });
    console.log('DRY distribution:', JSON.stringify(byType, null, 2));
    updates.slice(0, 40).forEach(u => console.log(`  [${u.type}] ${u.title.slice(0,60)}`));
    return;
  }

  // apply updates
  for (const u of updates) {
    const d = await gql(token, `
      mutation($id: ID!, $type: String!) {
        productUpdate(product: { id: $id, productType: $type }) {
          product { id productType }
          userErrors { field message }
        }
      }`, { id: u.id, type: u.type });
    const errs = d.productUpdate?.userErrors || [];
    if (errs.length) {
      console.log(`ERR ${u.id} ${u.title.slice(0,40)} -> ${JSON.stringify(errs)}`);
    } else {
      set++;
      ledgerLines.push(`${u.id}\t${u.type}\t${u.title.slice(0,60)}`);
      console.log(`SET ${u.title.slice(0,50)} => ${u.type}`);
    }
    await sleep(300);
  }

  if (ledgerLines.length) fs.appendFileSync(LEDGER, ledgerLines.join('\n') + '\n');

  console.log(`\nDONE: set=${set} skippedJunkNoInfer=${skippedJunkNoInfer} alreadyClean=${alreadyClean} ledgerAlreadyDone=${ledgerSkip} scanned=${scanned}`);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
