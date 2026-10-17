#!/usr/bin/env node
/* 🔍 gmc_audit.mjs — NUR LESEN: Wie steht der Shop im Google Merchant Center?
 *
 * Beantwortet drei Fragen, die bisher nur in Einzelberichten standen:
 *   1. Wie viele aktive Produkte liegen NICHT auf dem Kanal „Google & YouTube"?
 *      Und wie viele davon haben dafür einen Grund (Sperrtag)?
 *   2. Wie viele tragen das Feed-Metafeld `excluded_destination: ["Shopping_ads"]`
 *      (= erscheinen nicht in Shopping, auch nicht in den kostenlosen Einträgen)?
 *   3. Wie gut sind die Feed-Pflichtfelder gefüllt (GTIN, google_product_category)?
 *
 * Ändert NICHTS. Der Grund: der Ausschluss betrifft Tausende Artikel und hat Aussenwirkung
 * (Werbekosten, Google-Policy) — das ist ein Entscheid des Users, kein Wächter-Job.
 *
 * REGEL: Dieser Lauf darf aussteigen, aber er muss den Grund nennen.
 * ENV: SHOPIFY_CLIENT_ID+SECRET (+SHOPIFY_SHOP) ODER SHOPIFY_ADMIN_TOKEN · PQUERY · SCAN
 */
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { sperrTags } from './lib/kanal_sperren.mjs';

const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const API = '2025-01';
const GOOGLE = '302872297857';
const PQUERY = process.env.PQUERY || 'status:active';
const SCAN = +(process.env.SCAN || 600);

async function holeToken() {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
  const id = process.env.SHOPIFY_CLIENT_ID;
  const sec = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  if (!id || !sec) { console.log('ABBRUCH: SHOPIFY_CLIENT_ID oder _SECRET fehlt.'); return null; }
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: id, client_secret: sec, grant_type: 'client_credentials' }) });
  const txt = await r.text();
  let j = {}; try { j = JSON.parse(txt); } catch {}
  if (!j.access_token) { console.log(`ABBRUCH: Token HTTP ${r.status} · ${txt.slice(0, 200)} · Secret-Länge ${sec.length}`); return null; }
  return j.access_token;
}
const TOKEN = await holeToken();
if (!TOKEN) process.exit(1);

const zahl = async q => (await shopifyGql(SHOP, API, TOKEN,
  `query($q:String!){ productsCount(query:$q){ count } }`, { q }))?.productsCount?.count;

const basis = PQUERY;
const kanal = {
  aktiv: await zahl(basis),
  ohneGoogle: await zahl(`${basis} AND -publication_ids:${GOOGLE}`),
};

// Metafelder lassen sich in der Produktsuche NICHT filtern (geprüft 17.10.: der Filter wird
// stillschweigend ignoriert und liefert die Gesamtzahl) → Stichprobe statt Zählung.
const SEITE = `query($q:String!,$after:String){ products(first:50, query:$q, after:$after){
  pageInfo{ hasNextPage endCursor }
  edges{ node{ tags
    mf: metafields(first:12, namespace:"mm-google-shopping"){ edges{ node{ key value } } }
    variants(first:1){ edges{ node{ barcode } } } } } } }`;

async function stichprobe(q, max) {
  let cursor = null, n = 0, aus = 0, kat = 0, gtin = 0, gesperrt = 0;
  while (n < max) {
    const d = await shopifyGql(SHOP, API, TOKEN, SEITE, { q, after: cursor });
    const p = d?.products;
    if (!p) { console.log(`ABBRUCH: keine Produktdaten für ${q}`); process.exit(1); }
    for (const e of p.edges) {
      const x = e.node; n++;
      const mf = Object.fromEntries(x.mf.edges.map(m => [m.node.key, m.node.value]));
      if (/Shopping_ads/.test(mf.excluded_destination || '')) aus++;
      if (mf.google_product_category) kat++;
      if (x.variants.edges[0]?.node?.barcode) gtin++;
      if (sperrTags(x.tags || []).length) gesperrt++;
    }
    if (!p.pageInfo.hasNextPage) break;
    cursor = p.pageInfo.endCursor;
  }
  return { n, aus, kat, gtin, gesperrt };
}

const anteil = (a, b) => (b ? `${a} (${(100 * a / b).toFixed(1)} %)` : '–');
const s = await stichprobe(PQUERY, SCAN);
// Die Kanal-Lücke wird VOLLZÄHLIG ausgewertet, nicht per Stichprobe. Grund (am 17.10. passiert):
// eine Stichprobe über die ersten 200 Produkte meldete 67 % mit Sperrtag — die Vollzählung über
// alle 1890 ergab 10,6 %. Die Standard-Sortierung schiebt die zuletzt geänderten (und das waren
// gerade die Adult-/Policy-Fälle) nach vorn. Für eine Frage mit Aussenwirkung reicht das nicht.
const ohne = await stichprobe(`${PQUERY} AND -publication_ids:${GOOGLE}`, kanal.ohneGoogle || SCAN);

console.log(`\n🔍 Google Merchant — Stand für „${PQUERY}"`);
console.log(`\n1. Kanal „Google & YouTube"`);
console.log(`   aktive Produkte            ${kanal.aktiv}${kanal.aktiv >= 10000 ? ' (Zähler deckelt bei 10000)' : ''}`);
console.log(`   NICHT auf dem Kanal        ${kanal.ohneGoogle}`);
console.log(`   davon mit Sperrtag (${ohne.n} ausgewertet): ${anteil(ohne.gesperrt, ohne.n)}`);
console.log(`   → ohne Sperrtag = Lücke ohne dokumentierten Grund. Freigeben ist ein User-Entscheid.`);
console.log(`\n2. Feed-Metafeld (Stichprobe ${s.n})`);
console.log(`   excluded_destination = Shopping_ads   ${anteil(s.aus, s.n)}`);
console.log(`\n3. Feed-Pflichtfelder (Stichprobe ${s.n})`);
console.log(`   mit GTIN (Barcode)                    ${anteil(s.gtin, s.n)}`);
console.log(`   mit google_product_category           ${anteil(s.kat, s.n)}`);
if (s.n >= SCAN) console.log(`\n   (Teilmessung — SCAN-Deckel ${SCAN} erreicht.)`);
