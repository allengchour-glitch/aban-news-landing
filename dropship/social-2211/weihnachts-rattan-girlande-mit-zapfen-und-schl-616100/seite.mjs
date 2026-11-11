// Weihnachtsgirlande mit Zapfen und Schleife (weihnachts-rattan-girlande-mit-zapfen-und-schl-616100):
// Produktseite nachbessern (11.11.2026, Paket sw2211, Beitrag Sa 28.11.2026).
//
//  1) Titel-Wahrheit: «Weihnachts-Rattan-Girlande mit Zapfen und Schleife» → «Weihnachtsgirlande mit Zapfen und Schleife»
//     (Handle bleibt). Belege gegen «Rattan»: eigene Beschreibung «Die Girlande ist aus PVC gefertigt», Metafeld
//     mm-google-shopping.material «Kunststoff», Nahaufnahmen Bild 1 und Bild 4 zeigen flache Kunststoffnadeln
//     (gesichtet 11.11.2026 14:4x UTC). Dazu SEO-Titel und SEO-Beschreibung (beide, Shopify ersetzt den SEO-Block
//     ganz) und im ersten Satz der Beschreibung «diese Weihnachts-Rattan-Girlande.» → «diese Weihnachtsgirlande.»
//     (genau 1 Vorkommen, sonst Abbruch).
//  2) Optionswerte der Option «Ausführung»: «Zapfen · Schleife» → «Ohne Licht», «Zapfen · Schleife · Warmlicht» →
//     «Warmlicht», «Zapfen · Schleife · Farblicht» → «Farblicht» (productOptionUpdate, LEAVE_AS_IS). Beleg «ohne Licht»:
//     Variantenbild der günstigen Ausführung zeigt die Girlande ohne Lichter (CJ-Balken «Regular fit»), Bild 5 ebenso,
//     Beschreibung «Mit warmem oder farbigem Licht erhältlich». SKUs, Preise, Varianten-IDs bleiben.
//  3) Variantenbilder: alle drei tragen einen englischen Werbebalken («Regular fit» / «Warm light type (6 meters 50 heads
//     battery box warm light)» / «String lights model (6 meters, 50 bulbs, battery box, warm light)», beim Farblicht
//     sogar «warm light»). Je Variante zuerst das alte Bild lösen und sofort das saubere Galeriefoto anhängen
//     (productVariantDetachMedia + productVariantAppendMedia):
//       Ohne Licht → Bild 5 a48b567d (freigestellt, ohne Lichter) · Warmlicht → Bild 2 594dc5e7 (Kamin, warm-weiss)
//       Farblicht  → Bild 8 05b79042 (Kamin, bunt)
//     Nachbesserung 11.11.2026 (Entscheid des Auftraggebers): das Anhängen steht in try/catch. Scheitert es (Fehlermeldung
//     ODER Ausnahme, z. B. Netzfehler), wird zuerst frisch gelesen: trägt die Variante das neue Bild schon, gilt der Schritt
//     als erledigt; sonst wird das alte Bild wieder angehängt und abgebrochen (Exit 2). Eine Variante OHNE Bild (Rest eines
//     abgebrochenen Laufs) gilt im Vorwärtslauf als «zu ändern»: dort wird nur angehängt, nichts gelöst.
//     Erst wenn keine Variante mehr an einem Balkenbild hängt: die drei Balkenbilder (Bild 3, 6, 7) aus der Galerie löschen.
//     Folge (GEMESSEN 11.11. 14:41 UTC an der Storefront): das Theme blendet die Bilder der nicht gewählten Ausführungen
//     aus; danach zeigt die Seite bei «Ohne Licht» Bild 5, 1, 4 und bei Warmlicht/Farblicht ihr Kaminfoto plus Bild 1, 4.
//     ZIELKONFLIKT (bewusst hingenommen, dem Auftraggeber benannt): die Standardansicht ist «Ohne Licht» (erste Variante)
//     und zeigt danach KEIN Foto mit Licht. Die Beitragsbilder zeigen das Warmlicht am Kamin; darum führen Pinterest- und
//     Threads-Link mit ?variant=67738939621767 auf die Warmlicht-Ausführung. Die Alternative (Warmlicht und Farblicht ohne
//     Variantenbild) hätte im Warenkorb und bei Google Bild 1 gezeigt.
//  4) Alt-Texte der fünf verbleibenden Bilder ohne «Rattan» und ohne Gedankenstrich, je mit dem Bildinhalt (fileUpdate).
//  Teil 1 (erster Beschreibungssatz) und Teil 4 (fünf Alt-Texte) hat der Auftraggeber am 11.11.2026 ausdrücklich bestätigt.
//
//  Nicht angefasst: Preise, Status, Kanäle, Sammlungen, Tags, Lager, Produkttyp, Reihenfolge der übrigen Bilder, übrige
//  Beschreibung (auch «Lieferung 10–20 Werktage · 30 Tage Rückgabe» im Kasten), Judge.me-Metafelder.
//
// Aufruf: node seite.mjs                  Trockenlauf (Vorgabe): liest nur (Admin-API + 6 CDN-Bilder), zeigt den Plan
//         LIVE=1 node seite.mjs           schreibt: lokale Kopien der drei Balkenbilder (Prüfsumme muss stimmen),
//                                         Sicherung seite_sicherung.json (flag 'wx'), dann Schritte 1 bis 4, frisch nachlesen
//         ZURUECK=1 node seite.mjs        zeigt die Rücknahme
//         ZURUECK=1 LIVE=1 node seite.mjs nimmt zurück: Titel/SEO/Beschreibung/Optionen/Alt-Texte aus der Sicherung, lädt die
//                                         drei Balkenbilder aus den lokalen Kopien neu hoch (die alte CDN-Adresse stirbt mit dem
//                                         Löschen, GEMESSEN am Kaffeebecher 11.11.), setzt sie an die alten Stellen und hängt sie
//                                         wieder an die alten Varianten.
//                                         Kein doppeltes Hochladen (Nachbesserung 11.11.): jede neue Bild-ID steht sofort in
//                                         seite_sicherung_hochgeladen.json neben der Sicherung (vor dem Anlegen als «ausstehend»
//                                         mit der Galerie davor). Eine zweite Rücknahme übernimmt ein Bild, wenn (a) die Datei
//                                         seine ID nennt, (b) an der gesicherten Stelle schon ein Bild mit dem gesicherten
//                                         Alt-Text und dem Dateinamen steht, oder (c) ein «ausstehender» Upload genau ein neues
//                                         passendes Bild hinterlassen hat. Sonst lädt sie hoch.
// Exit 0 nur bei stimmigem Plan (Trockenlauf) bzw. frisch nachgelesen Soll = Ist (LIVE). 1 = Abweichung, 2 = Abbruch
// (auch jede unerwartete Ausnahme, z. B. ein Netzfehler).
// SEITE_ZEIT=<Faktor> skaliert alle Wartezeiten (Tests).
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const SICHERUNG = join(HIER, 'seite_sicherung.json');
const HOCHGELADEN = join(HIER, 'seite_sicherung_hochgeladen.json');   // neue Bild-IDs der Rücknahme (gegen doppeltes Hochladen)
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HANDLE = 'weihnachts-rattan-girlande-mit-zapfen-und-schl-616100', PRODUKT_ID = 'gid://shopify/Product/16615812956551';
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com', API = '2026-01';

const TITEL = { alt: 'Weihnachts-Rattan-Girlande mit Zapfen und Schleife', neu: 'Weihnachtsgirlande mit Zapfen und Schleife' };
const SEO = {
  alt: { title: 'Weihnachts-Rattan-Girlande mit Zapfen und Schleife | LuxeStyle CH', description: 'Für eine festliche Atmosphäre in deinem Zuhause sorgt diese Weihnachts-Rattan-Girlande.' },
  neu: { title: 'Weihnachtsgirlande mit Zapfen und Schleife | LuxeStyle CH', description: 'Weihnachtsgirlande aus PVC mit Kiefernzapfen, roten Beeren und roten Schleifen. Ohne Licht, mit Warmlicht oder mit Farblicht.' },
};
const BESCHR = { alt: 'sorgt diese Weihnachts-Rattan-Girlande.', neu: 'sorgt diese Weihnachtsgirlande.' };
const OPTION_ID = 'gid://shopify/ProductOption/19606560178567', OPTION_NAME = 'Ausführung';
const WERTE = [
  { id: 'gid://shopify/ProductOptionValue/58504200880519', alt: 'Zapfen · Schleife', neu: 'Ohne Licht' },
  { id: 'gid://shopify/ProductOptionValue/58504200913287', alt: 'Zapfen · Schleife · Warmlicht', neu: 'Warmlicht' },
  { id: 'gid://shopify/ProductOptionValue/58504200946055', alt: 'Zapfen · Schleife · Farblicht', neu: 'Farblicht' },
];
// sha256 = die Datei, die ich am 11.11.2026 um 14:3x UTC vom CDN geladen und angesehen habe (_pruef3_girlande/roh/bN.jpg)
const BALKEN = [
  { id: 'gid://shopify/MediaImage/77496769380743', datei: '4de1ad72-dd56-4acb-a500-249c67f75d3f_trans', sha: 'bec6dd4db12775304faa585cb5ba16f979e24ca30576970f75f3dadbed4a584b', kopie: 'seite_sicherung_bild3.jpg' },
  { id: 'gid://shopify/MediaImage/77496769479047', datei: '2c733214-70ef-4f0f-b880-abc97549241d_trans', sha: 'cc8d1b522c1c18b6ddbe790b6cb718b3cdd4a6729d7a712624e4bc7798967883', kopie: 'seite_sicherung_bild6.jpg' },
  { id: 'gid://shopify/MediaImage/77496769511815', datei: '08905d6c-bf09-4831-bb1b-18542e23f918_trans', sha: '23500e3c29b9f9b13546e33ce3d741ef37d38546a2bbbf5cdac857eb8202d76e', kopie: 'seite_sicherung_bild7.jpg' },
];
const ERSATZ = {
  'gid://shopify/MediaImage/77496769446279': { datei: 'a48b567d-01bf-4f2f-af09-7ce1cd3a790a', sha: 'af9d29eab221354d3905cd5c2cc3d82cef30164f7003329d9cbed2113a99c08f' },
  'gid://shopify/MediaImage/77496769347975': { datei: '594dc5e7-e424-42fa-a8de-82d6a782a921', sha: 'f7f4661fe4d53a9a26aa50e022fc8b62ebe570167d7f11ea9e765ae6c5f4da4d' },
  'gid://shopify/MediaImage/77496769544583': { datei: '05b79042-6319-4702-8591-4e2878d34969', sha: 'a1d52e90af60f5de5849bbeb60ec662379848f6e46469e12ff1e0b6e29a13403' },
};
const VARIANTEN = [
  { id: 'gid://shopify/ProductVariant/67668285718919', sku: 'CJYS246934901AZ', preis: '31.90', alt: 'gid://shopify/MediaImage/77496769479047', neu: 'gid://shopify/MediaImage/77496769446279' },
  { id: 'gid://shopify/ProductVariant/67738939621767', sku: 'CJYS246934902BY', preis: '40.90', alt: 'gid://shopify/MediaImage/77496769380743', neu: 'gid://shopify/MediaImage/77496769347975' },
  { id: 'gid://shopify/ProductVariant/67738939654535', sku: 'CJYS246934903CX', preis: '40.90', alt: 'gid://shopify/MediaImage/77496769511815', neu: 'gid://shopify/MediaImage/77496769544583' },
];
const ALT_TEXTE = [
  { id: 'gid://shopify/MediaImage/77496769315207', alt: 'Weihnachts-Rattan-Girlande mit Zapfen und Schleife | LuxeStyle', neu: 'Weihnachtsgirlande: Nahaufnahme von Schleife, Zapfen und roten Beeren | LuxeStyle' },
  { id: 'gid://shopify/MediaImage/77496769347975', alt: 'Weihnachts-Rattan-Girlande mit Zapfen und Schleife – Bild 2 | LuxeStyle', neu: 'Weihnachtsgirlande mit Warmlicht um einen weissen Kamin | LuxeStyle' },
  { id: 'gid://shopify/MediaImage/77496769413511', alt: 'Weihnachts-Rattan-Girlande mit Zapfen und Schleife – Bild 4 | LuxeStyle', neu: 'Weihnachtsgirlande: Nahaufnahme von Zapfen und roten Beeren | LuxeStyle' },
  { id: 'gid://shopify/MediaImage/77496769446279', alt: 'Weihnachts-Rattan-Girlande mit Zapfen und Schleife – Bild 5 | LuxeStyle', neu: 'Weihnachtsgirlande ohne Licht mit Zapfen und roten Schleifen | LuxeStyle' },
  { id: 'gid://shopify/MediaImage/77496769544583', alt: 'Weihnachts-Rattan-Girlande mit Zapfen und Schleife – Bild 8 | LuxeStyle', neu: 'Weihnachtsgirlande mit Farblicht um einen weissen Kamin | LuxeStyle' },
];
const GALERIE_VOR = ['77496769315207', '77496769347975', '77496769380743', '77496769413511', '77496769446279', '77496769479047', '77496769511815', '77496769544583'].map((n) => 'gid://shopify/MediaImage/' + n);
const GALERIE_SOLL = GALERIE_VOR.filter((id) => !BALKEN.some((b) => b.id === id));

const abbruch = (m) => { console.log('ABBRUCH: ' + m); process.exit(2); };
// Jede unerwartete Ausnahme (Netzfehler, Drosselung, kaputte Antwort) ist ein Abbruch (Exit 2), keine «Abweichung» (Exit 1).
process.on('uncaughtException', (e) => abbruch('Ausnahme: ' + (e?.message || e)));
process.on('unhandledRejection', (e) => abbruch('Ausnahme: ' + (e?.message || e)));
const warte = (ms) => new Promise((r) => setTimeout(r, ms * (Number(process.env.SEITE_ZEIT) || 1)));
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const kurz = (m) => (m.image?.url || '').split('/').pop().split('?')[0].slice(0, 8);
const zahl = (s, teil) => s.split(teil).length - 1;

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
const fehlerAus = (pl, feld = 'userErrors') => (pl?.[feld] || []).length ? JSON.stringify(pl[feld]) : null;

const lesen = async () => (await gql(`query($h:String!){ productByIdentifier(identifier:{handle:$h}){
  id handle title status productType vendor descriptionHtml tags tracksInventory seo{title description}
  options{id name optionValues{id name hasVariants}}
  variants(first:50){nodes{id sku price compareAtPrice inventoryPolicy availableForSale selectedOptions{name value} media(first:10){nodes{id}}}}
  media(first:50){nodes{id alt mediaContentType status ... on MediaImage{image{url width height}}}}
  collections(first:50){nodes{id}}
  metafields(first:50){nodes{namespace key value}}
  resourcePublicationsV2(first:30){nodes{isPublished publication{id}}} } }`, { h: HANDLE })).productByIdentifier;

// Alles, was sich durch diesen Lauf NICHT ändern darf. Ausgenommen: global.title_tag/description_tag (= SEO, wird
// geändert) und judgeme.* (die App schreibt dort den Produktnamen selbst nach).
const kern = (p) => JSON.stringify({
  handle: p.handle, status: p.status, productType: p.productType, vendor: p.vendor, tags: p.tags, tracksInventory: p.tracksInventory,
  option: p.options.map((o) => [o.id, o.name, o.optionValues.map((v) => v.id)]),
  varianten: p.variants.nodes.map((v) => [v.id, v.sku, v.price, v.compareAtPrice, v.inventoryPolicy, v.availableForSale]),
  sammlungen: p.collections.nodes.map((c) => c.id).sort(),
  kanaele: p.resourcePublicationsV2.nodes.map((n) => [n.publication.id, n.isPublished]).sort(),
  metafelder: p.metafields.nodes.filter((m) => m.namespace !== 'global' && m.namespace !== 'judgeme').map((m) => [m.namespace, m.key, m.value]).sort(),
});
const ids = (p) => p.media.nodes.map((m) => m.id);
const galerie = (p) => p.media.nodes.map((m, i) => `${i + 1}. ${kurz(m)}${BALKEN.some((b) => b.id === m.id) ? ' (Balken)' : ''}`).join(' | ');
const wert = (p, id) => p.options.flatMap((o) => o.optionValues).find((v) => v.id === id);
const varMedia = (p, vid) => (p.variants.nodes.find((v) => v.id === vid)?.media.nodes || []).map((m) => m.id);
const altVon = (p, mid) => p.media.nodes.find((m) => m.id === mid)?.alt;
async function laden(url) { const r = await fetch(url); if (!r.ok) return { status: r.status }; return { status: 200, buf: Buffer.from(await r.arrayBuffer()) }; }

// Eine Variante auf genau ein Bild setzen: erst die Bilder in «loesen» lösen (leer = nur anhängen), dann «nach» anhängen.
// Scheitert das Anhängen (Fehlermeldung ODER Ausnahme), wird frisch gelesen (die Antwort kann verloren sein, obwohl Shopify
// geschrieben hat): trägt die Variante dann genau «nach», ist der Schritt erledigt. Sonst wird «zurueck» (das alte Bild)
// wieder angehängt, sofern es noch in der Galerie steht, und abgebrochen (Exit 2). Ein Fehler beim Lösen bricht sofort ab
// (die Variante hat dann noch ihr Bild oder, wenn nur die Antwort verloren ging, keines; beides erkennt der nächste Lauf).
async function umhaengen(pid, vid, sku, loesen, nach, zurueck) {
  if (loesen.length) {
    let d1;
    try { d1 = await gql(`mutation($p:ID!,$vm:[ProductVariantDetachMediaInput!]!){ productVariantDetachMedia(productId:$p, variantMedia:$vm){ userErrors{field message code} } }`,
      { p: pid, vm: [{ variantId: vid, mediaIds: loesen }] }); }
    catch (e) { abbruch(`Lösen ${sku}: Ausnahme ${e.message} (Zustand frisch lesen: der nächste Lauf erkennt «altes Bild» und «ohne Bild»)`); }
    if (fehlerAus(d1.productVariantDetachMedia)) abbruch(`Lösen ${sku}: ` + fehlerAus(d1.productVariantDetachMedia));
  }
  let fehler = null;
  try {
    const d2 = await gql(`mutation($p:ID!,$vm:[ProductVariantAppendMediaInput!]!){ productVariantAppendMedia(productId:$p, variantMedia:$vm){ userErrors{field message code} } }`,
      { p: pid, vm: [{ variantId: vid, mediaIds: [nach] }] });
    fehler = fehlerAus(d2.productVariantAppendMedia);
  } catch (e) { fehler = 'Ausnahme ' + e.message; }
  if (!fehler) return 'ok';
  let ist = null;
  for (let i = 0; i < 3 && ist === null; i++) {
    await warte(i ? 4000 : 1500);
    try { ist = varMedia(await lesen(), vid); } catch { ist = null; }
  }
  if (ist && ist.length === 1 && ist[0] === nach) { console.log(`  Hinweis: Anhängen ${sku} meldete «${fehler}», die Variante trägt aber frisch gelesen das neue Bild`); return 'ok (frisch gelesen)'; }
  let wieder = 'nicht versucht';
  if (ist && ist.length) wieder = `nicht nötig, Variante trägt frisch gelesen ${JSON.stringify(ist)}`;
  else if (!zurueck) wieder = 'kein altes Bild bekannt';
  else {
    try {
      const d3 = await gql(`mutation($p:ID!,$vm:[ProductVariantAppendMediaInput!]!){ productVariantAppendMedia(productId:$p, variantMedia:$vm){ userErrors{field message code} } }`,
        { p: pid, vm: [{ variantId: vid, mediaIds: [zurueck] }] });
      wieder = fehlerAus(d3.productVariantAppendMedia) ? 'FEHLER ' + fehlerAus(d3.productVariantAppendMedia) : 'ok';
    } catch (e) { wieder = 'Ausnahme ' + e.message; }
  }
  abbruch(`Anhängen ${sku}: ${fehler}; altes Bild wieder angehängt: ${wieder}${ist === null ? ' (frisch lesen ging nicht)' : ''}`);
}

const p = await lesen();
if (!p || p.id !== PRODUKT_ID) abbruch(`Produkt nicht gefunden oder andere ID: ${p?.id}`);
console.log(`${ZURUECK ? 'RÜCKNAHME' : 'PLAN'} für ${HANDLE} (${p.status}, ${p.variants.nodes.length} Varianten, ${p.media.nodes.length} Bilder, gelesen ${new Date().toISOString()})`);
console.log(`  Galerie heute:   ${galerie(p)}`);

// Feste Bedingungen für beide Richtungen
if (p.options.length !== 1 || p.options[0].id !== OPTION_ID || p.options[0].name !== OPTION_NAME) abbruch(`Option weicht ab: ${JSON.stringify(p.options.map((o) => [o.id, o.name]))}`);
if (p.variants.nodes.length !== 3) abbruch(`erwartet 3 Varianten, gefunden ${p.variants.nodes.length}`);
for (const v of VARIANTEN) {
  const ist = p.variants.nodes.find((x) => x.id === v.id);
  if (!ist || ist.sku !== v.sku || ist.price !== v.preis) abbruch(`Variante ${v.sku} weicht ab: ${JSON.stringify(ist && [ist.id, ist.sku, ist.price])}`);
}

if (!ZURUECK) {
  // ---------- Zustand je Teil: «alt» (zu ändern), «neu» (schon erledigt), sonst Abbruch ----------
  const teil = {};
  teil.titel = p.title === TITEL.neu ? 'neu' : p.title === TITEL.alt ? 'alt' : abbruch(`Titel unerwartet: «${p.title}»`);
  const seoIst = { title: p.seo?.title ?? null, description: p.seo?.description ?? null };
  teil.seo = (seoIst.title === SEO.neu.title && seoIst.description === SEO.neu.description) ? 'neu'
    : (seoIst.title === SEO.alt.title && seoIst.description === SEO.alt.description) ? 'alt' : abbruch(`SEO unerwartet: ${JSON.stringify(seoIst)}`);
  const nA = zahl(p.descriptionHtml, BESCHR.alt), nN = zahl(p.descriptionHtml, BESCHR.neu);
  teil.beschreibung = (nA === 0 && nN === 1) ? 'neu' : (nA === 1 && nN === 0) ? 'alt' : abbruch(`Beschreibung: «${BESCHR.alt}» ${nA}-mal, «${BESCHR.neu}» ${nN}-mal (verlangt genau 1 von beiden)`);
  if (zahl(p.descriptionHtml, 'Rattan') !== (teil.beschreibung === 'alt' ? 1 : 0)) abbruch(`«Rattan» kommt ${zahl(p.descriptionHtml, 'Rattan')}-mal in der Beschreibung vor (erwartet nur im ersten Satz)`);
  const werteZu = [];
  for (const w of WERTE) {
    const ist = wert(p, w.id);
    if (!ist) abbruch(`Optionswert ${w.id} fehlt`);
    if (ist.name === w.alt) werteZu.push(w); else if (ist.name !== w.neu) abbruch(`Optionswert ${w.id} heisst «${ist.name}»`);
  }
  for (const [i, v] of VARIANTEN.entries()) {
    const sel = p.variants.nodes.find((x) => x.id === v.id).selectedOptions[0].value;
    if (sel !== WERTE[i].alt && sel !== WERTE[i].neu) abbruch(`Variante ${v.sku} hat Optionswert «${sel}» (erwartet «${WERTE[i].alt}» oder «${WERTE[i].neu}»)`);
  }
  const varZu = [], ohneBild = new Set();
  for (const v of VARIANTEN) {
    const m = varMedia(p, v.id);
    if (m.length === 1 && m[0] === v.neu) continue;
    if (m.length === 1 && m[0] === v.alt) { varZu.push(v); continue; }
    if (m.length === 0) { varZu.push(v); ohneBild.add(v.id); continue; }   // Rest eines abgebrochenen Laufs: nur anhängen
    abbruch(`Variante ${v.sku} hängt an ${JSON.stringify(m)} (erwartet ${v.alt}, ${v.neu} oder kein Bild)`);
  }
  const balkenDa = BALKEN.filter((b) => ids(p).includes(b.id));
  for (const b of balkenDa) {
    const m = p.media.nodes.find((x) => x.id === b.id);
    if (!(m.image?.url || '').includes(b.datei)) abbruch(`Bild ${b.id} zeigt auf eine andere Datei: ${m.image?.url}`);
  }
  for (const [mid, e] of Object.entries(ERSATZ)) {
    const m = p.media.nodes.find((x) => x.id === mid);
    if (!m || !(m.image?.url || '').includes(e.datei) || m.status !== 'READY' || m.mediaContentType !== 'IMAGE') abbruch(`Ersatzbild ${mid} fehlt, ist nicht READY oder zeigt eine andere Datei`);
  }
  const altZu = [];
  for (const a of ALT_TEXTE) {
    const ist = altVon(p, a.id);
    if (ist === undefined) abbruch(`Bild ${a.id} für den Alt-Text fehlt`);
    if (ist === a.alt) altZu.push(a); else if (ist !== a.neu) abbruch(`Alt-Text von ${a.id} unerwartet: «${ist}»`);
  }
  const fremd = ids(p).filter((id) => !GALERIE_VOR.includes(id));
  if (fremd.length) abbruch(`unbekannte Bilder in der Galerie: ${fremd.join(', ')}`);
  if (JSON.stringify(ids(p).filter((id) => GALERIE_SOLL.includes(id))) !== JSON.stringify(GALERIE_SOLL)) abbruch('Reihenfolge der zu behaltenden Bilder weicht ab');

  // Ersatzbilder und Balkenbilder vom CDN gegen die Prüfsumme der Sichtung (6 Abrufe, keine Storefront-Seiten)
  for (const [mid, e] of Object.entries(ERSATZ)) {
    const m = p.media.nodes.find((x) => x.id === mid);
    const d = await laden(m.image.url);
    if (d.status !== 200) abbruch(`Ersatzbild ${e.datei} nicht ladbar (HTTP ${d.status})`);
    if (sha(d.buf) !== e.sha) abbruch(`Ersatzbild ${e.datei} hat sich seit der Sichtung geändert (sha256 ${sha(d.buf)})`);
  }
  const balkenBuf = {};
  for (const b of balkenDa) {
    const m = p.media.nodes.find((x) => x.id === b.id);
    const d = await laden(m.image.url);
    if (d.status !== 200) abbruch(`Balkenbild ${b.datei} nicht ladbar (HTTP ${d.status}), keine Sicherung möglich`);
    if (sha(d.buf) !== b.sha) abbruch(`Balkenbild ${b.datei} hat sich seit der Sichtung geändert (sha256 ${sha(d.buf)}): nicht blind löschen`);
    balkenBuf[b.id] = d.buf;
  }

  console.log(`  Titel:           ${teil.titel === 'alt' ? `«${TITEL.alt}» → «${TITEL.neu}» (Handle bleibt ${p.handle})` : 'schon neu'}`);
  console.log(`  SEO-Titel:       ${teil.seo === 'alt' ? `«${SEO.alt.title}» → «${SEO.neu.title}»` : 'schon neu'}`);
  console.log(`  SEO-Beschreibung:${teil.seo === 'alt' ? ` «${SEO.alt.description}» → «${SEO.neu.description}» (${SEO.neu.description.length} Zeichen)` : ' schon neu'}`);
  console.log(`  Beschreibung:    ${teil.beschreibung === 'alt' ? `«…${BESCHR.alt}» → «…${BESCHR.neu}» (1 Vorkommen; übriger Text bytegleich)` : 'schon neu'}`);
  console.log(`  Optionswerte:    ${werteZu.length ? werteZu.map((w) => `«${w.alt}» → «${w.neu}»`).join(' · ') : 'schon neu'}`);
  for (const v of VARIANTEN) console.log(`  Variantenbild ${v.sku} (CHF ${v.preis}): ${!varZu.includes(v) ? 'schon sauber'
    : ohneBild.has(v.id) ? `ohne Bild (Rest eines abgebrochenen Laufs) → ${ERSATZ[v.neu].datei.slice(0, 8)} nur anhängen (Prüfsumme ok)`
    : `${kurz(p.media.nodes.find((m) => m.id === v.alt))} (Balken) → ${ERSATZ[v.neu].datei.slice(0, 8)} (Prüfsumme ok)`}`);
  console.log(`  Löschen:         ${balkenDa.length ? balkenDa.map((b) => `${b.datei.slice(0, 8)}_trans (Bild ${GALERIE_VOR.indexOf(b.id) + 1}, Prüfsumme ok)`).join(', ') : 'schon gelöscht'}`);
  for (const a of altZu) console.log(`  Alt-Text ${kurz(p.media.nodes.find((m) => m.id === a.id))}:   «${a.alt}» → «${a.neu}»`);
  if (!altZu.length) console.log('  Alt-Texte:       schon neu');
  console.log(`  Galerie danach:  ${GALERIE_SOLL.map((id, i) => `${i + 1}. ${kurz(p.media.nodes.find((m) => m.id === id))}`).join(' | ')} (${GALERIE_SOLL.length} Bilder)`);
  console.log('  Unverändert:     SKUs, Preise, Varianten-IDs, Status, Kanäle, Sammlungen, Tags, Lager, Produkttyp, Metafelder (ausser SEO)');
  const nichts = teil.titel === 'neu' && teil.seo === 'neu' && teil.beschreibung === 'neu' && !werteZu.length && !varZu.length && !balkenDa.length && !altZu.length;
  if (nichts) { console.log('  Alles schon im Soll-Stand. Nichts zu tun.'); process.exit(0); }
  if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }

  // ---------- Sicherung ----------
  for (const b of balkenDa) {
    const pfad = join(HIER, b.kopie);
    if (existsSync(pfad)) { if (sha(readFileSync(pfad)) !== b.sha) abbruch(`vorhandene ${pfad} passt nicht zur Prüfsumme`); }
    else writeFileSync(pfad, balkenBuf[b.id], { flag: 'wx' });
  }
  if (!existsSync(SICHERUNG)) {
    writeFileSync(SICHERUNG, JSON.stringify({
      gelesen: new Date().toISOString(), produkt: p.id, handle: p.handle, title: p.title, seo: p.seo, descriptionHtml: p.descriptionHtml,
      option: p.options[0], varianten: p.variants.nodes.map((v) => ({ id: v.id, sku: v.sku, price: v.price, media: v.media.nodes.map((m) => m.id), wert: v.selectedOptions[0].value })),
      galerie: p.media.nodes.map((m, i) => ({ id: m.id, position: i, alt: m.alt, url: m.image?.url })),
      balken: BALKEN.map((b) => ({ ...b, kopie: join(HIER, b.kopie) })), kern: kern(p) }, null, 1), { flag: 'wx' });
    console.log('Sicherung geschrieben: ' + SICHERUNG);
  } else {
    const s = JSON.parse(readFileSync(SICHERUNG, 'utf8'));
    if (s.produkt !== p.id) abbruch('vorhandene Sicherung gehört zu einem anderen Produkt');
    console.log('Sicherung vorhanden, bleibt unverändert: ' + SICHERUNG);
  }

  // ---------- 1) Titel, SEO, Beschreibung ----------
  if (teil.titel === 'alt' || teil.seo === 'alt' || teil.beschreibung === 'alt') {
    const eingabe = { id: p.id, title: TITEL.neu, seo: { title: SEO.neu.title, description: SEO.neu.description } };
    if (teil.beschreibung === 'alt') eingabe.descriptionHtml = p.descriptionHtml.replace(BESCHR.alt, BESCHR.neu);
    const d = await gql(`mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{id} userErrors{field message} } }`, { p: eingabe });
    if (fehlerAus(d.productUpdate)) abbruch('productUpdate: ' + fehlerAus(d.productUpdate));
    console.log('  geschrieben: Titel, SEO, Beschreibung');
  }
  // ---------- 2) Optionswerte ----------
  if (werteZu.length) {
    const d = await gql(`mutation($p:ID!,$o:OptionUpdateInput!,$v:[OptionValueUpdateInput!]){ productOptionUpdate(productId:$p, option:$o, optionValuesToUpdate:$v, variantStrategy:LEAVE_AS_IS){ userErrors{field message code} } }`,
      { p: p.id, o: { id: OPTION_ID }, v: werteZu.map((w) => ({ id: w.id, name: w.neu })) });
    if (fehlerAus(d.productOptionUpdate)) abbruch('productOptionUpdate: ' + fehlerAus(d.productOptionUpdate));
    console.log('  geschrieben: Optionswerte');
  }
  // ---------- 3) Variantenbilder umhängen, je Variante lösen → anhängen (ohne Bild: nur anhängen) ----------
  for (const v of varZu) {
    const r = await umhaengen(p.id, v.id, v.sku, ohneBild.has(v.id) ? [] : [v.alt], v.neu, ids(p).includes(v.alt) ? v.alt : null);
    console.log(`  ${ohneBild.has(v.id) ? 'angehängt (war ohne Bild)' : 'umgehängt'}: ${v.sku} → ${ERSATZ[v.neu].datei.slice(0, 8)}${r === 'ok' ? '' : ' [' + r + ']'}`);
  }
  // Vor dem Löschen frisch prüfen: keine Variante hängt mehr an einem Balkenbild, jede hat ihr Ersatzbild
  let zw = null, ok = false;
  for (let i = 0; i < 6 && !ok; i++) {
    await warte(i ? 4000 : 1500);
    zw = await lesen();
    ok = VARIANTEN.every((v) => JSON.stringify(varMedia(zw, v.id)) === JSON.stringify([v.neu]));
  }
  if (!ok) abbruch('Variantenbilder nach dem Umhängen nicht im Soll: ' + JSON.stringify(VARIANTEN.map((v) => [v.sku, varMedia(zw, v.id)])) + ' (Balkenbilder NICHT gelöscht)');
  // ---------- Balkenbilder löschen ----------
  const nochDa = BALKEN.filter((b) => ids(zw).includes(b.id)).map((b) => b.id);
  if (nochDa.length) {
    if (zw.variants.nodes.some((v) => v.media.nodes.some((m) => nochDa.includes(m.id)))) abbruch('ein Balkenbild hängt noch an einer Variante: nicht löschen');
    const d = await gql(`mutation($p:ID!,$m:[ID!]!){ productDeleteMedia(productId:$p, mediaIds:$m){ deletedMediaIds mediaUserErrors{field message code} } }`, { p: p.id, m: nochDa });
    if (fehlerAus(d.productDeleteMedia, 'mediaUserErrors')) abbruch('productDeleteMedia: ' + fehlerAus(d.productDeleteMedia, 'mediaUserErrors'));
    if (!nochDa.every((id) => (d.productDeleteMedia.deletedMediaIds || []).includes(id))) abbruch('productDeleteMedia meldet nicht alle als gelöscht: ' + JSON.stringify(d.productDeleteMedia.deletedMediaIds));
    console.log(`  gelöscht: ${nochDa.length} Balkenbilder`);
  }
  // ---------- 4) Alt-Texte ----------
  if (altZu.length) {
    const d = await gql(`mutation($f:[FileUpdateInput!]!){ fileUpdate(files:$f){ files{id alt} userErrors{field message code} } }`, { f: altZu.map((a) => ({ id: a.id, alt: a.neu })) });
    if (fehlerAus(d.fileUpdate)) abbruch('fileUpdate: ' + fehlerAus(d.fileUpdate));
    console.log(`  geschrieben: ${altZu.length} Alt-Texte`);
  }

  // ---------- frisch nachlesen: Soll gegen Ist ----------
  const sollBeschr = teil.beschreibung === 'alt' ? p.descriptionHtml.replace(BESCHR.alt, BESCHR.neu) : p.descriptionHtml;
  let n, fehler = [];
  for (let i = 0; i < 6; i++) {
    await warte(4000);
    n = await lesen();
    fehler = [];
    if (n.title !== TITEL.neu) fehler.push(`Titel «${n.title}»`);
    if (n.handle !== HANDLE) fehler.push(`Handle «${n.handle}»`);
    if (n.seo?.title !== SEO.neu.title || n.seo?.description !== SEO.neu.description) fehler.push(`SEO ${JSON.stringify(n.seo)}`);
    if (n.descriptionHtml !== sollBeschr) fehler.push(`Beschreibung weicht ab (Rattan ${zahl(n.descriptionHtml, 'Rattan')}-mal, neuer Satz ${zahl(n.descriptionHtml, BESCHR.neu)}-mal)`);
    for (const w of WERTE) if (wert(n, w.id)?.name !== w.neu) fehler.push(`Optionswert ${w.id} «${wert(n, w.id)?.name}»`);
    for (const v of VARIANTEN) {
      const ist = n.variants.nodes.find((x) => x.id === v.id);
      const w = WERTE[VARIANTEN.indexOf(v)];
      if (ist.selectedOptions[0].value !== w.neu) fehler.push(`Variante ${v.sku} trägt «${ist.selectedOptions[0].value}»`);
      if (JSON.stringify(varMedia(n, v.id)) !== JSON.stringify([v.neu])) fehler.push(`Variantenbild ${v.sku} ${JSON.stringify(varMedia(n, v.id))}`);
    }
    if (JSON.stringify(ids(n)) !== JSON.stringify(GALERIE_SOLL)) fehler.push(`Galerie ${JSON.stringify(ids(n))} ≠ Soll`);
    if (n.media.nodes.some((m) => BALKEN.some((b) => (m.image?.url || '').includes(b.datei)))) fehler.push('Balkenbild-Datei noch in der Galerie');
    for (const a of ALT_TEXTE) if (altVon(n, a.id) !== a.neu) fehler.push(`Alt-Text ${a.id} «${altVon(n, a.id)}»`);
    if (n.media.nodes.some((m) => /Rattan/.test(m.alt || ''))) fehler.push('«Rattan» noch in einem Alt-Text');
    if (kern(n) !== kern(p)) fehler.push('Kernfelder (SKUs, Preise, Status, Kanäle, Sammlungen, Tags, Lager, Metafelder) haben sich verändert');
    if (!fehler.length) break;
  }
  console.log(`NACHGELESEN ${fehler.length ? 'ABWEICHUNG: ' + fehler.join('; ') : 'OK'} | Titel «${n.title}» | Werte: ${n.options[0].optionValues.map((v) => v.name).join(', ')} | Galerie: ${galerie(n)}`);
  process.exit(fehler.length ? 1 : 0);
}

// ---------------- Rücknahme ----------------
if (!existsSync(SICHERUNG)) abbruch('keine Sicherung seite_sicherung.json');
const s = JSON.parse(readFileSync(SICHERUNG, 'utf8'));
if (s.produkt !== p.id) abbruch('Sicherung gehört zu einem anderen Produkt');
if (kern(p) !== s.kern) console.log('  Hinweis: Kernfelder weichen von der Sicherung ab (fremde Änderung seither); die Rücknahme betrifft nur Titel, SEO, Beschreibung, Optionswerte, Bilder und Alt-Texte.');
const gesGal = s.galerie.map((g) => g.id);
const fehltBalken = s.balken.filter((b) => !ids(p).includes(b.id));
// Schon zurückgeladene Balkenbilder erkennen (Nachbesserung 11.11.: eine zweite Rücknahme lädt nicht doppelt hoch).
// (a) die Datei neben der Sicherung nennt die neue ID, (b) an der gesicherten Stelle steht ein Bild mit dem gesicherten
// Alt-Text und dem Dateinamen, (c) ein «ausstehender» Upload hat genau ein neues passendes Bild hinterlassen.
const ladeHoch = () => (existsSync(HOCHGELADEN) ? JSON.parse(readFileSync(HOCHGELADEN, 'utf8')) : {});
const schreibeHoch = (h) => { writeFileSync(HOCHGELADEN + '.tmp', JSON.stringify(h, null, 1)); renameSync(HOCHGELADEN + '.tmp', HOCHGELADEN); };
const merke = (altId, felder) => { const h = ladeHoch(); h[altId] = { ...(h[altId] || {}), ...felder }; schreibeHoch(h); };
const passt = (m, b, g) => !!m && !gesGal.includes(m.id) && m.mediaContentType === 'IMAGE'
  && (m.alt || '') === (g.alt || '') && (m.image?.url || '').split('/').pop().split('?')[0].includes(b.datei);
const hoch = ladeHoch();
const neuIds = {};   // alte ID → ID in der Galerie
const woher = {};    // alte ID → wie ein schon zurückgeladenes Bild erkannt wurde
for (const b of s.balken) if (ids(p).includes(b.id)) neuIds[b.id] = b.id;
const vergeben = (id) => Object.values(neuIds).includes(id);
const zuLaden = [];
for (const b of fehltBalken) {
  const g = s.galerie.find((x) => x.id === b.id);
  const e = hoch[b.id];
  const ausDatei = e?.neu ? p.media.nodes.find((m) => m.id === e.neu) : null;
  if (passt(ausDatei, b, g) && !vergeben(ausDatei.id)) { neuIds[b.id] = ausDatei.id; woher[b.id] = 'ID aus seite_sicherung_hochgeladen.json'; continue; }
  const anStelle = p.media.nodes[g.position];
  if (passt(anStelle, b, g) && !vergeben(anStelle.id)) { neuIds[b.id] = anStelle.id; woher[b.id] = `an Stelle ${g.position + 1} mit gesichertem Alt-Text und Dateiname`; continue; }
  if (e?.status === 'ausstehend') {
    const kand = p.media.nodes.filter((m) => !(e.vorher || []).includes(m.id) && passt(m, b, g) && !vergeben(m.id));
    if (kand.length === 1) { neuIds[b.id] = kand[0].id; woher[b.id] = `ausstehender Upload vom ${e.zeit}`; continue; }
    abbruch(`Hochladen von ${b.datei} wurde am ${e.zeit} begonnen, in der Galerie stehen aber ${kand.length} passende neue Bilder (erwartet 1). `
      + `Im Admin von Hand prüfen. Ist das Bild wirklich nicht da, den Eintrag ${b.id} in ${HOCHGELADEN} löschen und die Rücknahme wiederholen.`);
  }
  zuLaden.push(b);
}
for (const b of zuLaden) {
  if (!existsSync(b.kopie)) abbruch(`lokale Bildkopie fehlt: ${b.kopie}`);
  if (sha(readFileSync(b.kopie)) !== b.sha) abbruch(`lokale Bildkopie ${b.kopie} passt nicht zur Prüfsumme`);
}
const zurueckBeschr = p.descriptionHtml === s.descriptionHtml ? null
  : (zahl(p.descriptionHtml, BESCHR.neu) === 1 && p.descriptionHtml.replace(BESCHR.neu, BESCHR.alt) === s.descriptionHtml) ? s.descriptionHtml
  : abbruch('Beschreibung hat sich seit dem Lauf anders verändert: von Hand prüfen');
console.log(`  Titel:           «${p.title}» → «${s.title}»`);
console.log(`  SEO:             ${JSON.stringify(p.seo)} → ${JSON.stringify(s.seo)}`);
console.log(`  Beschreibung:    ${zurueckBeschr ? `«…${BESCHR.neu}» → «…${BESCHR.alt}»` : 'schon wie gesichert'}`);
console.log(`  Optionswerte:    ${s.option.optionValues.map((w) => `«${wert(p, w.id)?.name}» → «${w.name}»`).join(' · ')}`);
console.log(`  Balkenbilder:    ${fehltBalken.length ? fehltBalken.map((b) => woher[b.id]
  ? `${b.datei.slice(0, 8)} schon zurückgeladen als ${neuIds[b.id].split('/').pop()} (${woher[b.id]}), kein Upload`
  : `${b.datei.slice(0, 8)} aus ${b.kopie} neu hochladen, an Stelle ${gesGal.indexOf(b.id) + 1}`).join(' · ') : 'noch in der Galerie'}`);
console.log(`  Variantenbilder: ${s.varianten.map((v) => `${v.sku} → Balkenbild`).join(', ')}`);
console.log(`  Alt-Texte:       ${s.galerie.filter((g) => ids(p).includes(g.id) && altVon(p, g.id) !== g.alt).length} zurück`);
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }

// 1) Titel, SEO, Beschreibung
const eing = { id: p.id, title: s.title, seo: { title: s.seo?.title ?? null, description: s.seo?.description ?? null } };
if (zurueckBeschr) eing.descriptionHtml = zurueckBeschr;
const u = await gql(`mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{id} userErrors{field message} } }`, { p: eing });
if (fehlerAus(u.productUpdate)) abbruch('productUpdate: ' + fehlerAus(u.productUpdate));
// 2) Optionswerte
const zurueckWerte = s.option.optionValues.filter((w) => wert(p, w.id) && wert(p, w.id).name !== w.name).map((w) => ({ id: w.id, name: w.name }));
if (zurueckWerte.length) {
  const d = await gql(`mutation($p:ID!,$o:OptionUpdateInput!,$v:[OptionValueUpdateInput!]){ productOptionUpdate(productId:$p, option:$o, optionValuesToUpdate:$v, variantStrategy:LEAVE_AS_IS){ userErrors{field message code} } }`,
    { p: p.id, o: { id: s.option.id }, v: zurueckWerte });
  if (fehlerAus(d.productOptionUpdate)) abbruch('productOptionUpdate: ' + fehlerAus(d.productOptionUpdate));
}
// 3) Balkenbilder neu hochladen (nur die, die nicht schon zurückgeladen sind). Jede neue ID steht sofort in HOCHGELADEN.
for (const b of zuLaden) {
  const g = s.galerie.find((x) => x.id === b.id);
  const kopie = readFileSync(b.kopie), dateiname = b.datei + '.jpg';
  const st = await gql(`mutation($i:[StagedUploadInput!]!){ stagedUploadsCreate(input:$i){ stagedTargets{url resourceUrl parameters{name value}} userErrors{field message} } }`,
    { i: [{ resource: 'IMAGE', filename: dateiname, mimeType: 'image/jpeg', httpMethod: 'POST', fileSize: String(kopie.length) }] });
  if (fehlerAus(st.stagedUploadsCreate)) abbruch('stagedUploadsCreate: ' + fehlerAus(st.stagedUploadsCreate));
  const ziel = st.stagedUploadsCreate.stagedTargets[0];
  const form = new FormData();
  for (const { name, value } of ziel.parameters) form.append(name, value);
  form.append('file', new Blob([kopie], { type: 'image/jpeg' }), dateiname);
  const up = await fetch(ziel.url, { method: 'POST', body: form });
  if (!up.ok) abbruch(`Hochladen ${dateiname} fehlgeschlagen: HTTP ${up.status}`);
  const vorher = ids(await lesen());
  merke(b.id, { status: 'ausstehend', datei: b.datei, alt: g.alt || '', stelle: g.position, vorher, neu: null, zeit: new Date().toISOString() });
  let pu = null, puFehler = null;
  try {
    pu = await gql(`mutation($p:ProductUpdateInput!,$m:[CreateMediaInput!]){ productUpdate(product:$p, media:$m){ product{id} userErrors{field message} } }`,
      { p: { id: p.id }, m: [{ originalSource: ziel.resourceUrl, alt: g.alt || '', mediaContentType: 'IMAGE' }] });
    puFehler = fehlerAus(pu.productUpdate);
  } catch (e) { puFehler = 'Ausnahme ' + e.message; }
  if (puFehler && pu) { merke(b.id, { status: 'nicht_angelegt', fehler: puFehler }); abbruch('productUpdate media: ' + puFehler + ' (nichts angelegt, vermerkt)'); }
  let neu = null, gesehen = null;
  for (let i = 0; i < 15 && !neu; i++) {
    await warte(4000);
    let n; try { n = await lesen(); } catch { continue; }
    const kand = n.media.nodes.filter((m) => !vorher.includes(m.id) && passt(m, b, g) && !vergeben(m.id));
    if (kand.length > 1) abbruch(`nach dem Hochladen von ${dateiname} stehen ${kand.length} passende neue Bilder in der Galerie: von Hand prüfen`);
    if (kand.length === 1) { if (gesehen !== kand[0].id) merke(b.id, { status: 'fertig', neu: kand[0].id }); gesehen = kand[0].id; if (kand[0].status === 'READY') neu = kand[0].id; }
    if (puFehler && !gesehen && i >= 2) break;   // Ausnahme und nach drei Lesungen kein neues Bild: nicht angelegt
  }
  if (!gesehen && puFehler) { merke(b.id, { status: 'nicht_angelegt', fehler: puFehler }); abbruch(`productUpdate media: ${puFehler}; frisch gelesen kein neues Bild, als «nicht angelegt» vermerkt`); }
  if (!neu) abbruch(`neues Bild ${dateiname} ${gesehen ? `(${gesehen}, in ${HOCHGELADEN} vermerkt) nicht READY` : 'nicht in der Galerie erschienen (Eintrag bleibt «ausstehend»)'}`);
  neuIds[b.id] = neu;
  console.log(`  hochgeladen: ${dateiname} → ${neu}${puFehler ? ` (Antwort war «${puFehler}», Bild frisch gelesen da)` : ''}`);
}
for (const b of fehltBalken) {
  if (!woher[b.id]) continue;
  if (ladeHoch()[b.id]?.neu !== neuIds[b.id] || ladeHoch()[b.id]?.status !== 'fertig') merke(b.id, { status: 'fertig', neu: neuIds[b.id], uebernommen: woher[b.id] });
  console.log(`  übernommen: ${b.datei.slice(0, 8)} → ${neuIds[b.id]} (${woher[b.id]})`);
}
// alle Bilder der Sicherung (übernommen oder neu) müssen da und READY sein, bevor umsortiert und angehängt wird
const zielReihe = s.galerie.map((g) => neuIds[g.id] || g.id);
let aktuell = null;
for (let i = 0; i < 15; i++) {
  if (i) await warte(4000);
  aktuell = await lesen();
  const fehlt = zielReihe.filter((id) => !ids(aktuell).includes(id));
  if (fehlt.length) abbruch(`Bilder der Sicherung fehlen in der Galerie: ${fehlt.join(', ')} (von Hand prüfen)`);
  if (zielReihe.every((id) => aktuell.media.nodes.find((m) => m.id === id).status === 'READY')) break;
  if (i === 14) abbruch('Bilder der Sicherung nicht READY: ' + zielReihe.filter((id) => aktuell.media.nodes.find((m) => m.id === id).status !== 'READY').join(', '));
}
// an die alten Stellen setzen (Reihenfolge der Sicherung, auf die vorhandenen IDs abgebildet), nur wenn nötig
const reiheOk = (q) => JSON.stringify(ids(q).filter((id) => zielReihe.includes(id))) === JSON.stringify(zielReihe)
  && zielReihe.every((id, i) => ids(q)[i] === id);
if (!reiheOk(aktuell)) {
  const moves = zielReihe.map((id, i) => ({ id, newPosition: String(i) }));
  const ro = await gql(`mutation($p:ID!,$mv:[MoveInput!]!){ productReorderMedia(id:$p, moves:$mv){ job{id} mediaUserErrors{field message} } }`, { p: p.id, mv: moves });
  if (fehlerAus(ro.productReorderMedia, 'mediaUserErrors')) abbruch('productReorderMedia: ' + fehlerAus(ro.productReorderMedia, 'mediaUserErrors'));
  for (let i = 0; i < 6; i++) { await warte(i ? 4000 : 1500); aktuell = await lesen(); if (reiheOk(aktuell)) break; }
}
// Variantenbilder zurück (dieselbe Absicherung wie im Vorwärtslauf: scheitert das Anhängen, kommt das vorherige Bild wieder)
for (const v of s.varianten) {
  if (!v.media.length) { console.log(`  Hinweis: ${v.sku} war beim Sichern ohne Bild, bleibt unverändert`); continue; }
  const sollId = neuIds[v.media[0]] || v.media[0];
  const ist = varMedia(aktuell, v.id);
  if (JSON.stringify(ist) === JSON.stringify([sollId])) continue;
  await umhaengen(p.id, v.id, v.sku, ist, sollId, ist.length === 1 && ids(aktuell).includes(ist[0]) ? ist[0] : null);
}
aktuell = await lesen();
// Alt-Texte zurück (nur die Bilder, die nicht neu hochgeladen wurden)
const altZurueck = s.galerie.filter((g) => !fehltBalken.some((b) => b.id === g.id) && ids(aktuell).includes(g.id) && altVon(aktuell, g.id) !== g.alt).map((g) => ({ id: g.id, alt: g.alt || '' }));
if (altZurueck.length) {
  const d = await gql(`mutation($f:[FileUpdateInput!]!){ fileUpdate(files:$f){ files{id} userErrors{field message code} } }`, { f: altZurueck });
  if (fehlerAus(d.fileUpdate)) abbruch('fileUpdate: ' + fehlerAus(d.fileUpdate));
}
let n, fehler = [];
for (let i = 0; i < 6; i++) {
  await warte(4000);
  n = await lesen();
  fehler = [];
  if (n.title !== s.title) fehler.push(`Titel «${n.title}»`);
  if ((n.seo?.title ?? null) !== (s.seo?.title ?? null) || (n.seo?.description ?? null) !== (s.seo?.description ?? null)) fehler.push(`SEO ${JSON.stringify(n.seo)}`);
  if (n.descriptionHtml !== s.descriptionHtml) fehler.push('Beschreibung weicht von der Sicherung ab');
  for (const w of s.option.optionValues) if (wert(n, w.id)?.name !== w.name) fehler.push(`Optionswert ${w.id} «${wert(n, w.id)?.name}»`);
  if (JSON.stringify(ids(n)) !== JSON.stringify(zielReihe)) fehler.push(`Galerie ${JSON.stringify(ids(n))} ≠ ${JSON.stringify(zielReihe)}`);
  for (const v of s.varianten) if (JSON.stringify(varMedia(n, v.id)) !== JSON.stringify([neuIds[v.media[0]] || v.media[0]])) fehler.push(`Variantenbild ${v.sku}`);
  for (const g of s.galerie) if (altVon(n, neuIds[g.id] || g.id) !== (g.alt || '')) fehler.push(`Alt-Text an Stelle ${g.position + 1}`);
  if (kern(n) !== kern(p)) fehler.push('Kernfelder haben sich während der Rücknahme verändert');
  if (!fehler.length) break;
}
console.log(`NACHGELESEN ${fehler.length ? 'ABWEICHUNG: ' + fehler.join('; ') : 'OK'} | Titel «${n.title}» | Galerie: ${galerie(n)}`);
process.exit(fehler.length ? 1 : 0);
