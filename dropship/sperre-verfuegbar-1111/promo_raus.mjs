// Bügeltransfer (gesperrt, seit 11.11. nicht kaufbar) aus zwei Werbe-Sammlungen nehmen: Tag `hype-jetzt` weg
// (Sammlungen hype-jetzt und viral-hits) und aus der Hand-Sammlung bestseller-premium-heroes entfernen.
// Trockenlauf ist Vorgabe; LIVE=1 schreibt; ZURUECK=1 LIVE=1 setzt beides wieder.
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com', API = '2026-01';
const PRODUKT = 'gid://shopify/Product/15423895830913', TAG = 'hype-jetzt', SAMMLUNG_HANDLE = 'bestseller-premium-heroes';
let token = null;
async function gql(query, variables = {}) {
  if (!token) { const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) }); token = (await r.json()).access_token; if (!token) throw new Error('kein Zugang'); }
  const j = await (await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }) })).json();
  if (j.errors) throw new Error('GraphQL: ' + JSON.stringify(j.errors).slice(0, 300)); return j.data;
}
const fehler = (d, f) => { const e = d?.[f]?.userErrors || []; if (e.length) throw new Error(f + ': ' + JSON.stringify(e).slice(0, 300)); };
async function lesen() {
  const d = await gql(`query($id:ID!,$h:String!){ product(id:$id){ handle tags variants(first:5){ nodes{ availableForSale } } inCollection: collections(first:50){ nodes{ handle } } } collectionByHandle(handle:$h){ id handle } }`, { id: PRODUKT, h: SAMMLUNG_HANDLE });
  return { handle: d.product.handle, tag: d.product.tags.includes(TAG), kaufbar: d.product.variants.nodes.some((v) => v.availableForSale), drin: d.product.inCollection.nodes.some((c) => c.handle === SAMMLUNG_HANDLE), sammlung: d.collectionByHandle.id };
}
const ist = await lesen();
console.log(`IST ${ist.handle} | kaufbar=${ist.kaufbar} | Tag ${TAG}: ${ist.tag} | in ${SAMMLUNG_HANDLE}: ${ist.drin}`);
if (!ZURUECK && ist.kaufbar) { console.log('Produkt ist kaufbar: nichts zu tun.'); process.exit(0); }
console.log(`${LIVE ? 'LIVE' : 'PLAN'} ${ZURUECK ? 'Tag setzen und in die Sammlung aufnehmen' : 'Tag entfernen und aus der Sammlung nehmen'}`);
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }
if (ZURUECK) {
  if (!ist.tag) fehler(await gql(`mutation($id:ID!,$t:[String!]!){ tagsAdd(id:$id, tags:$t){ userErrors{ field message } } }`, { id: PRODUKT, t: [TAG] }), 'tagsAdd');
  if (!ist.drin) fehler(await gql(`mutation($id:ID!,$p:[ID!]!){ collectionAddProducts(id:$id, productIds:$p){ userErrors{ field message } } }`, { id: ist.sammlung, p: [PRODUKT] }), 'collectionAddProducts');
} else {
  if (ist.tag) fehler(await gql(`mutation($id:ID!,$t:[String!]!){ tagsRemove(id:$id, tags:$t){ userErrors{ field message } } }`, { id: PRODUKT, t: [TAG] }), 'tagsRemove');
  if (ist.drin) fehler(await gql(`mutation($id:ID!,$p:[ID!]!){ collectionRemoveProducts(id:$id, productIds:$p){ job{ id } userErrors{ field message } } }`, { id: ist.sammlung, p: [PRODUKT] }), 'collectionRemoveProducts');
}
await new Promise((ok) => setTimeout(ok, 8000));
const neu = await lesen(); const ok = ZURUECK ? (neu.tag && neu.drin) : (!neu.tag && !neu.drin);
console.log(`NACHGELESEN Tag ${TAG}: ${neu.tag} | in ${SAMMLUNG_HANDLE}: ${neu.drin} | ${ok ? 'OK' : 'ABWEICHUNG'}`); process.exit(ok ? 0 : 1);
