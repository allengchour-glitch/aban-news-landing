// Produkte in die Wegweiser-Sammlung `aus-tiktok-und-instagram` aufnehmen (11.11.2026).
//
// Warum: Die Kurzadressen luxestyle.ch/ig, /tt und /yt führen auf diese Sammlung; die tägliche Metricool-Freigabe
// (automation/metricool_freigabe.py, Tor 4) plant nur Beiträge ein, deren Produkt dort steht. Aufgenommen wird nur,
// was ACTIVE, im Onlineshop veröffentlicht und kaufbar ist und kein Sperr-Tag trägt. Neue Produkte kommen ans Ende.
//
// Aufruf:  HANDLES=a,b node wegweiser_aufnehmen.mjs                     Trockenlauf (Vorgabe)
//          HANDLES=a,b LIVE=1 node wegweiser_aufnehmen.mjs              nimmt auf, liest zurück, schreibt aufgenommen.json
//          HANDLES=a,b ZURUECK=1 LIVE=1 node wegweiser_aufnehmen.mjs    nimmt genau diese Produkte wieder heraus
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const MERK = process.env.MERK || join(HIER, 'aufgenommen.json');
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HANDLES = (process.env.HANDLES || '').split(',').map((s) => s.trim()).filter(Boolean);
const SAMMLUNG = 'aus-tiktok-und-instagram';
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const API = '2026-01';
const SPERRE = /nicht-live|nicht-bewerben|gesperrt|adult|18plus|compliance|lizenz|rueckhol|stecker-nicht-ch|grind-gehalten|google-bild-abgelehnt/i;
if (!HANDLES.length) { console.error('HANDLES=a,b fehlt'); process.exit(1); }

let token = null;
async function gql(query, variables = {}) {
  if (!token) {
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) });
    const j = await r.json(); if (!j.access_token) throw new Error('kein Zugang (Client-Credentials)'); token = j.access_token;
  }
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }) });
  const j = await r.json(); if (j.errors) throw new Error('GraphQL: ' + JSON.stringify(j.errors).slice(0, 400));
  return j.data;
}
async function sammlung() {
  const ids = []; let after = null, id = null, regel = null;
  for (;;) {
    const d = await gql(`query($h:String!,$a:String){ collectionByHandle(handle:$h){ id ruleSet{ appliedDisjunctively } products(first:100, after:$a){ pageInfo{ hasNextPage endCursor } nodes{ id handle } } } }`, { h: SAMMLUNG, a: after });
    const c = d.collectionByHandle; if (!c) throw new Error('Sammlung fehlt');
    id = c.id; regel = c.ruleSet; ids.push(...c.products.nodes);
    if (!c.products.pageInfo.hasNextPage) break; after = c.products.pageInfo.endCursor;
  }
  if (regel) throw new Error('Sammlung ist automatisch (Regel): nichts von Hand aufnehmen');
  return { id, produkte: ids };
}
async function produkt(handle) {
  const d = await gql(`query($h:String!){ productByHandle(handle:$h){ id handle title status tags onlineStoreUrl variants(first:100){ nodes{ availableForSale } } } }`, { h: handle });
  return d.productByHandle;
}

const vorher = await sammlung();
console.log(`Sammlung ${SAMMLUNG}: ${vorher.produkte.length} Produkte`);
const plan = [];
for (const h of HANDLES) {
  const p = await produkt(h);
  if (!p) { console.log(`  FEHLT   ${h}: Produkt nicht gefunden`); continue; }
  const drin = vorher.produkte.some((x) => x.id === p.id);
  if (ZURUECK) { if (drin) plan.push(p); console.log(`  ${drin ? 'RAUS   ' : 'NICHT DRIN'} ${h}`); continue; }
  const kaufbar = p.variants.nodes.some((v) => v.availableForSale);
  const sperre = p.tags.find((t) => SPERRE.test(t));
  const grund = p.status !== 'ACTIVE' ? 'Status ' + p.status : !p.onlineStoreUrl ? 'nicht im Onlineshop' : !kaufbar ? 'keine kaufbare Variante' : sperre ? 'Sperr-Tag ' + sperre : null;
  if (grund) { console.log(`  HALTEN  ${h}: ${grund}`); continue; }
  if (drin) { console.log(`  SCHON   ${h}`); continue; }
  plan.push(p); console.log(`  AUFNEHMEN ${h} | ${p.title}`);
}
if (!LIVE) { console.log(`Trockenlauf: ${plan.length} ${ZURUECK ? 'herauszunehmen' : 'aufzunehmen'}, nichts geschrieben.`); process.exit(0); }
if (!plan.length) { console.log('Nichts zu tun.'); process.exit(0); }
const mut = ZURUECK ? 'collectionRemoveProducts' : 'collectionAddProducts';
const d = await gql(`mutation($id:ID!,$p:[ID!]!){ ${mut}(id:$id, productIds:$p){ userErrors{ field message } } }`, { id: vorher.id, p: plan.map((p) => p.id) });
if (d[mut].userErrors.length) { console.error('FEHLER ' + JSON.stringify(d[mut].userErrors)); process.exit(1); }
let ok = false, nachher = null;
for (let i = 0; i < 6 && !ok; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  nachher = await sammlung();
  ok = plan.every((p) => nachher.produkte.some((x) => x.id === p.id) !== ZURUECK);
}
const alt = existsSync(MERK) ? JSON.parse(readFileSync(MERK, 'utf8')) : [];
writeFileSync(MERK, JSON.stringify([...alt, { zeit: new Date().toISOString(), art: ZURUECK ? 'heraus' : 'aufgenommen', produkte: plan.map((p) => ({ id: p.id, handle: p.handle })), vorher: vorher.produkte.length, nachher: nachher.produkte.length }], null, 1));
console.log(`NACHGELESEN ${SAMMLUNG}: ${vorher.produkte.length} → ${nachher.produkte.length} Produkte | ${ok ? 'OK' : 'ABWEICHUNG'}`);
process.exit(ok ? 0 : 1);
