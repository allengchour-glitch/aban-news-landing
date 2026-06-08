#!/usr/bin/env node
/* LuxeStyle — desc_block.mjs
 * Hängt bei FASHION-Produkten unten einen Block an: Styling-Text + Bemerkung + DIREKTER LINK zur
 * PASSENDEN Kollektion (automatisch aus den eigenen Collections des Produkts gewählt).
 * IDEMPOTENT: überspringt Produkte, die den Block schon haben (Marker "Styling &amp; Bemerkung").
 * No-op ohne Shopify-Creds. Scope = eine Kollektion (Default 'damen-mode' = Fashion), via COLLECTION.
 *
 * ENV: SHOPIFY_SHOP (z.B. au3j0y-hq.myshopify.com), SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET
 *      (Client-Credentials-Grant) · COLLECTION (Default 'damen-mode') · MAX (Default 60/Lauf) · DRY_RUN=1
 */
const SHOPraw = process.env.SHOPIFY_SHOP || '';
const CID = process.env.SHOPIFY_CLIENT_ID || '';
const CSEC = process.env.SHOPIFY_CLIENT_SECRET || '';
const COLLECTION = process.env.COLLECTION || 'damen-mode';
const MAX = Math.max(1, parseInt(process.env.MAX || '60', 10) || 60);
const DRY = process.env.DRY_RUN === '1';
const API = '2025-01';

// Shop-Domain auf *.myshopify.com normalisieren
let SHOP = SHOPraw.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
if (!/myshopify\.com$/.test(SHOP)) SHOP = 'au3j0y-hq.myshopify.com';

if (!CID || !CSEC) { console.log('Keine SHOPIFY_CLIENT_ID/SECRET → No-op (Creds in CI setzen).'); process.exit(0); }

// passende Kollektion: Priorität spezifisch -> generisch; Link-Text je Kategorie
const PRIO = [
  ['kleider', 'Mehr Kleider entdecken'],
  ['taschen-sub', 'Mehr Taschen entdecken'],
  ['sonnenbrillen-eyewear', 'Mehr Sonnenbrillen entdecken'],
  ['schuhe', 'Mehr Schuhe entdecken'],
  ['damen-schmuck-sub', 'Mehr Schmuck entdecken'],
  ['premium-beauty', 'Mehr Beauty entdecken'],
  ['wohnen-dekoration', 'Mehr fürs Zuhause entdecken'],
  ['damen-mode', 'Mehr Damen-Mode entdecken'],
];
const MARKER = 'Styling &amp; Bemerkung';

async function token() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' })
  });
  const j = await r.json().catch(() => ({}));
  if (!j.access_token) { console.error('Token-Fehler:', r.status, JSON.stringify(j).slice(0, 300)); process.exit(0); }
  return j.access_token;
}
async function gql(tok, query, variables) {
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok },
    body: JSON.stringify({ query, variables })
  });
  return r.json();
}
function shortName(title) {
  // bis zum ersten Trenner (·, –, |) kürzen, sonst voller Titel
  return String(title).split(/\s[·–|]\s/)[0].trim();
}
function matchLink(handles) {
  for (const [h, label] of PRIO) if (handles.includes(h)) return { handle: h, label };
  return { handle: 'sommer', label: 'Mehr Sommer-Looks entdecken' };
}
function block(name, link) {
  return `<h4>✨ Styling &amp; Bemerkung</h4>`
    + `<p>${name} ist ein vielseitiger Premium-Liebling für deinen Sommer 2026 – mühelos kombinierbar und zu einem fairen Preis.</p>`
    + `<p><strong>Bemerkung:</strong> Beliebte Modelle &amp; Farben sind oft schnell vergriffen – sichere dir deinen Look rechtzeitig.</p>`
    + `<p>👉 <strong><a href="https://luxestyle.ch/collections/${link.handle}">${link.label} →</a></strong></p>`;
}

const Q = `query($handle:String!,$after:String){ collectionByHandle(handle:$handle){ products(first:25, after:$after){ pageInfo{hasNextPage endCursor} nodes{ id title descriptionHtml collections(first:25){ nodes{ handle } } } } } }`;
const M = `mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ userErrors{field message} } }`;

(async () => {
  const tok = await token();
  let after = null, done = 0, skipped = 0, updated = 0;
  outer: while (true) {
    const res = await gql(tok, Q, { handle: COLLECTION, after });
    const conn = res?.data?.collectionByHandle?.products;
    if (!conn) { console.error('Kollektion nicht gefunden:', COLLECTION, JSON.stringify(res).slice(0,300)); break; }
    for (const p of conn.nodes) {
      done++;
      if ((p.descriptionHtml || '').includes(MARKER)) { skipped++; continue; }
      const handles = (p.collections?.nodes || []).map(c => c.handle);
      const link = matchLink(handles);
      const html = (p.descriptionHtml || '') + block(shortName(p.title), link);
      if (DRY) { console.log('DRY +', p.title, '->', link.handle); updated++; }
      else {
        const u = await gql(tok, M, { p: { id: p.id, descriptionHtml: html } });
        const errs = u?.data?.productUpdate?.userErrors || [];
        if (errs.length) console.error('userError', p.title, JSON.stringify(errs));
        else { updated++; console.log('+', p.title, '->', link.handle); }
        await new Promise(r => setTimeout(r, 350)); // throttle
      }
      if (updated >= MAX) break outer;
    }
    if (!conn.pageInfo.hasNextPage) break;
    after = conn.pageInfo.endCursor;
  }
  console.log(`\nFertig: geprüft ${done}, schon vorhanden ${skipped}, ${DRY ? 'würde ergänzen' : 'ergänzt'} ${updated} (MAX ${MAX}).`);
})().catch(e => { console.error('Fehler:', e.message); process.exit(0); });
