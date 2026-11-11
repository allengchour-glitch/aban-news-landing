// Weihnachtsbaum-Anhänger Alpaka-Set (weihnachtsbaum-anhanger-alpaka-set-617100): Seitenprüfung (11.11.2026, Paket sw2211).
//
// Ergebnis der Prüfung: KEIN Seitenfund, der eine Änderung belegt. Darum ist die Änderungsliste leer und das Skript
// schreibt in keinem Modus etwas. Es liest frisch und prüft die Fakten, auf denen die Beitragstexte stehen:
//   ACTIVE und im Onlineshop, Titel, eine Variante «Default Title» zu CHF 16.90 ohne Vergleichspreis und kaufbar,
//   5 Galeriebilder READY (die vier Einzelfiguren und das Gruppenbild der Texte), Masszeile in der Beschreibung,
//   Wegweiser-Sammlung aus-tiktok-und-instagram (Aufnahme durch den Auftraggeber).
// Nur benannt, nicht geändert (Auftrag): Kategorie «Partydeko» (Shopify-Kategorie Party Supplies, Produktart
//   «Partydeko & Ballone», Google-Kategorie im Metafeld Party Supplies, Tags party/partydeko). Gehört zu kategorien-nach-google.
// Bewusst nicht geändert (kein Fund, ausserhalb der erlaubten Felder): Beschreibung «aus robustem Material gefertigt»
//   (Material unbelegt), «8.5» mit Punkt, Kasten «Lieferung 10–20 Werktage / 30 Tage Rückgabe», Alt-Texte «Bild 2 …».
//
// Aufruf: node seite.mjs                  Trockenlauf (Vorgabe): liest, prüft, zeigt den (leeren) Plan
//         LIVE=1 node seite.mjs           schreibt nichts, weil der Plan leer ist (keine Sicherung nötig)
//         ZURUECK=1 [LIVE=1] node seite.mjs  nichts zurückzunehmen; gibt es doch eine seite_sicherung.json, Abbruch
// Exit 0 nur, wenn alle Prüfungen stimmen und der Plan leer ist. 1 = Abweichung, 2 = Abbruch.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const SICHERUNG = join(HIER, 'seite_sicherung.json');
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HANDLE = 'weihnachtsbaum-anhanger-alpaka-set-617100', PRODUKT_ID = 'gid://shopify/Product/16615820624263';
const VARIANTE_ID = 'gid://shopify/ProductVariant/67668304429447';
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com', API = '2026-01';
const SOLL = {
  titel: 'Weihnachtsbaum-Anhänger Alpaka-Set', preis: '16.90', wegweiser: 'aus-tiktok-und-instagram',
  bilder: ['4a026e96-ec81-4953-9593-ea4ff8f8fabb', 'c793ed62-e2f7-4f9c-8e5c-8a121105345e', 'd334041b-67de-4ea5-a963-f33828bd4c74',
    'f0597534-b50c-4b80-ac54-be7add64d684', 'd48f0789-31f8-40e1-be2e-bc9f9acb8d83'],
  textstellen: ['4-teilige Set mit Alpaka-Anhängern', 'ca. 11x15x1 cm oder 8.5x15x1 cm', 'leicht am Baum anzubringen',
    'an deinem Weihnachtsbaum oder als charmantes Detail in deinem Zuhause'],
};
// Änderungsliste: leer. Jede künftige Textänderung müsste hier als {feld, alt, neu} stehen und alt genau einmal vorkommen.
const AENDERUNGEN = [];

const abbruch = (m) => { console.log('ABBRUCH: ' + m); process.exit(2); };
let token = null;
async function gql(query, variables = {}) {
  if (!token) {
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) });
    token = (await r.json()).access_token;
    if (!token) abbruch('kein Admin-Token');
  }
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }) });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 400));
  return j.data;
}

const p = (await gql(`query($h:String!){ productByIdentifier(identifier:{handle:$h}){
  id handle title status updatedAt onlineStoreUrl productType tags descriptionHtml seo{title description} category{fullName}
  options{name optionValues{name}}
  variants(first:20){nodes{id title sku price compareAtPrice availableForSale inventoryPolicy}}
  media(first:30){nodes{id status ... on MediaImage{image{url}}}}
  collections(first:50){nodes{handle}}
  google: metafield(namespace:"mm-google-shopping", key:"google_product_category"){value} } }`, { h: HANDLE })).productByIdentifier;
if (!p || p.id !== PRODUKT_ID) abbruch(`Produkt nicht gefunden oder andere ID: ${p?.id}`);

const zaehle = (s, t) => (s || '').split(t).length - 1;
const fehler = [];
const v = p.variants.nodes;
if (p.status !== 'ACTIVE' || !p.onlineStoreUrl) fehler.push(`Status ${p.status}, onlineStoreUrl ${p.onlineStoreUrl}`);
if (p.title !== SOLL.titel) fehler.push(`Titel «${p.title}»`);
if (v.length !== 1 || v[0].id !== VARIANTE_ID || v[0].title !== 'Default Title') fehler.push(`Varianten: ${v.map((x) => x.title).join(', ')}`);
if (v[0]?.price !== SOLL.preis || v[0]?.compareAtPrice !== null || !v[0]?.availableForSale) fehler.push(`Preis ${v[0]?.price}, Vergleichspreis ${v[0]?.compareAtPrice}, kaufbar ${v[0]?.availableForSale}`);
const urls = p.media.nodes.map((m) => m.image?.url || '');
for (const b of SOLL.bilder) if (!urls.some((u) => u.includes(b))) fehler.push(`Bild ${b} fehlt`);
if (p.media.nodes.length !== SOLL.bilder.length || p.media.nodes.some((m) => m.status !== 'READY')) fehler.push(`Bilder: ${p.media.nodes.length}, nicht READY: ${p.media.nodes.filter((m) => m.status !== 'READY').length}`);
for (const s of SOLL.textstellen) if (zaehle(p.descriptionHtml, s) !== 1) fehler.push(`Beschreibung: «${s}» kommt ${zaehle(p.descriptionHtml, s)}-mal vor`);
if (!p.collections.nodes.some((c) => c.handle === SOLL.wegweiser)) fehler.push(`nicht in ${SOLL.wegweiser}`);
if (p.tags.some((t) => /sperr|gesperrt|gehalten|nicht-bewerben/i.test(t))) fehler.push(`Sperrtag: ${p.tags.join(', ')}`);

console.log(`${ZURUECK ? 'RÜCKNAHME' : 'PLAN'} für ${HANDLE} (${p.status}, gelesen ${new Date().toISOString()}, Produkt zuletzt geändert ${p.updatedAt})`);
console.log(`  Titel:        «${p.title}» (bleibt)`);
console.log(`  Variante:     ${v.map((x) => `${x.title} ${x.sku} CHF ${x.price}, Vergleichspreis ${x.compareAtPrice}, kaufbar ${x.availableForSale}`).join(' | ')}`);
console.log(`  Bilder:       ${p.media.nodes.length} (${p.media.nodes.filter((m) => m.status === 'READY').length} READY), keine Entfernung`);
console.log(`  SEO:          «${p.seo?.title}» / «${p.seo?.description}» (bleibt)`);
console.log(`  Wegweiser:    ${p.collections.nodes.some((c) => c.handle === SOLL.wegweiser) ? 'ja' : 'NEIN'} (${p.collections.nodes.length} Sammlungen)`);
console.log(`  NUR BENANNT:  Kategorie «${p.category?.fullName}», Produktart «${p.productType}», Google-Kategorie «${p.google?.value}», Tags ${p.tags.filter((t) => /party/.test(t)).join('/')}`);
console.log(`  Änderungen:   ${AENDERUNGEN.length} (kein Seitenfund mit Schreibbedarf)`);
if (fehler.length) { console.log('ABWEICHUNG: ' + fehler.join('; ')); process.exit(1); }
console.log('  Prüfungen:    alle in Ordnung');

if (ZURUECK) {
  if (existsSync(SICHERUNG)) abbruch('seite_sicherung.json existiert, obwohl dieses Skript nie schreibt: von Hand prüfen');
  console.log('Nichts zurückzunehmen: dieses Skript hat nie geschrieben.');
  process.exit(0);
}
if (AENDERUNGEN.length === 0) { console.log(LIVE ? 'LIVE: nichts zu tun, nichts geschrieben.' : 'Trockenlauf: nichts zu tun, nichts geschrieben.'); process.exit(0); }
abbruch('Änderungsliste nicht leer, aber kein Schreibweg in diesem Skript');
