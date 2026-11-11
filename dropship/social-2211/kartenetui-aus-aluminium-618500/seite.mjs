// Kartenetui aus Aluminium (kartenetui-aus-aluminium-618500): Produktseite nachbessern (11.11.2026, Paket sw2211,
// Nachbesserung nach der Gegenprüfung am 11.11.).
//  1) Variante «Blau» zeigt heute ein SCHWARZES Etui mit eingesteckter blauer Karte, darauf chinesischer Text und ein
//     QR-Code (MediaImage 77777625383303). Ein eigenes scharfes Bild nur vom blauen Etui gibt es in der Galerie nicht
//     (einzig das 368-px-Pfeilbild 2f033c74). Neu bekommt Blau das scharfe Bild mit allen fünf Farben
//     (MediaImage 70238889968001, c69ac0fa, 1500 px), darauf ist das blaue Etui zu sehen.
//     Reihenfolge: ZUERST wird das alte Bild gelöst, DANN das neue angehängt. Shopify erlaubt je Variante nur ein Bild
//     (MediaUserErrorCode PRODUCT_VARIANT_ALREADY_HAS_MEDIA, per Introspektion 11.11. gelesen). Zwischen den beiden
//     Schritten ist Blau einen Augenblick ohne Bild. Scheitert das Anhängen (Fehlermeldung, Netz- oder HTTP-Fehler),
//     hängt das Skript das alte Bild wieder an, prüft die Fehlermeldungen dieses Aufrufs und liest Blau frisch. Es meldet
//     «altes Bild wieder angehängt» nur, wenn die Lesung das zeigt, sonst ausdrücklich «Blau ohne Bild,
//     ZURUECK=1 LIVE=1 fahren». Beides endet mit Exit 2; Galerie und SEO-Beschreibung sind dann noch nicht angefasst.
//  2) Aus der Galerie entfernt (nur die Verknüpfung mit dem Produkt, per fileUpdate referencesToRemove; die Dateien
//     bleiben unter Inhalt > Dateien, damit die Rücknahme dieselben Bilder wieder anhängen kann):
//     - 77777625383303 und 70238890000769: dieselbe Aufnahme mit chinesischem Text und QR-Code (Fremdschrift, falsche
//       Farbe für Blau).
//     - 70238889935233, 70238890033537, 70238890066305, 70238890131841, 70238890197377: 362 bis 379 px kleine,
//       unscharfe Doppel der Fünffarben-Aufnahme mit rotem Lieferanten-Pfeil (Blau, Silber, Rot, Grau, Schwarz).
//       Dieselbe Aufnahme bleibt scharf in 1500 px (c69ac0fa). Keine Variante verweist auf sie. Die Entfernung dieser
//       fünf hat der Auftraggeber am 11.11. bestätigt (niedrig aufgelöste Doppel mit Lieferanten-Pfeil).
//     Es bleiben 4 Bilder: b34dedba (Seitenansicht Rot und Schwarz), c69ac0fa (fünf Farben), 40e1fce7 (Seitenansicht
//     mit Band), 68c8b3c0 (schwarzes Etui mit Karten und Band), Reihenfolge unverändert.
//     Warum nicht productDeleteMedia: am 11.11. gemessen, dass productDeleteMedia die Datei ganz löscht (node null,
//     CDN-Adresse HTTP 404); eine Rücknahme aus der gesicherten Adresse ginge dann nicht mehr. fileUpdate ist der von
//     Shopify genannte Nachfolger (productDeleteMedia: «Use `fileUpdate` instead»).
//  3) SEO-Beschreibung (auch og:description und twitter:description der Linkvorschau): die Vorlage mit Rabattcode
//     «Jetzt -10% mit Code WELCOME10.» und Gedankenstrich wird ersetzt durch «Kartenetui aus Aluminiumlegierung in Rot,
//     Blau, Schwarz, Dunkelgrau und Silber. Versand in der Schweiz CHF 7, ab CHF 50 gratis nach Rabatt. 30 Tage
//     Rückgabe.» (157 Zeichen, gezählt; Wortlaut vom Auftraggeber am 11.11. festgelegt). SEO-Titel bleibt.
//  Nicht angefasst: Titel, Handle, Beschreibung (auch nicht der Block ls-xsell-v1), Produktart, Optionen, Varianten,
//  Preise, Status, Kanäle, Sammlungen, Tags, Lager, Reihenfolge der übrigen Bilder.
//
//  Netz: Lesen wird bei Netz- oder HTTP-Fehler oder THROTTLED bis zu zweimal mit Pause wiederholt (PAUSE_MS, Vorgabe
//  3000 ms, beim zweiten Mal doppelt). Schreiben wird NIE blind wiederholt: nach einem solchen Fehler liest das Skript
//  frisch (bis zu drei Lesungen im Abstand WARTE_MS), ob die Änderung gewirkt hat. Hat sie gewirkt, geht es ohne
//  Wiederholung weiter. Hat sie frisch gelesen nicht gewirkt, höchstens zwei Wiederholungen; fileUpdate dann nur mit den
//  Bildern, die frisch gelesen noch in der Galerie sind. Lässt sich die Wirkung nicht lesen, bricht das Skript ab.
//
// Aufruf: node seite.mjs                  Trockenlauf (Vorgabe): liest nur, zeigt den Plan
//         LIVE=1 node seite.mjs           schreibt (Sicherung seite_sicherung.json und Bildkopien vor dem ersten
//                                         Schreiben, flag 'wx')
//         ZURUECK=1 node seite.mjs        zeigt die Rücknahme
//         ZURUECK=1 LIVE=1 node seite.mjs nimmt zurück (Bilder wieder anhängen, alte Reihenfolge, altes Variantenbild,
//                                         alte SEO-Beschreibung, alles aus der Sicherung)
// Exit 0 nur, wenn der Plan stimmig ist (Trockenlauf) bzw. frisch nachgelesen Soll = Ist (LIVE). 1 = Abweichung beim
// Nachlesen, 2 = Abbruch (auch bei jedem unerwarteten Fehler; die Meldung sagt, ob schon geschrieben wurde).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const SICHERUNG = join(HIER, 'seite_sicherung.json');
const BILDKOPIEN = join(HIER, 'seite_sicherung_bilder');
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HANDLE = 'kartenetui-aus-aluminium-618500', PRODUKT_ID = 'gid://shopify/Product/15473085514113';
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com', API = '2026-01';
const WARTE_MS = Number(process.env.WARTE_MS || 4000);
const PAUSE_MS = Number(process.env.PAUSE_MS || 3000);
const ZEIT_MS = Number(process.env.ZEIT_MS || 60000);

const BLAU = 'gid://shopify/ProductVariant/56069774705025';
const BILD_BLAU_ALT = 'gid://shopify/MediaImage/77777625383303';
const BILD_BLAU_NEU = { id: 'gid://shopify/MediaImage/70238889968001', datei: 'c69ac0fa-26f3-48e3-a37b-0ab90caade62.jpg' };
const ENTFERNEN = [
  { id: 'gid://shopify/MediaImage/77777625383303', datei: '8da5f1ed-bf5b-4ff9-8155-dd487d18e54b_3ba39fe3-073f-4402-a928-ca8630d66ae0.jpg', grund: 'Variantenbild Blau: schwarzes Etui, Karte mit chinesischem Text und QR-Code' },
  { id: 'gid://shopify/MediaImage/70238890000769', datei: '8da5f1ed-bf5b-4ff9-8155-dd487d18e54b.jpg', grund: 'dieselbe Aufnahme in der Galerie (chinesischer Text, QR-Code)' },
  { id: 'gid://shopify/MediaImage/70238889935233', datei: '2f033c74-88f6-4e60-9baf-cab33f0fa015.jpg', grund: '368 px, unscharfes Doppel mit rotem Pfeil (Blau)' },
  { id: 'gid://shopify/MediaImage/70238890033537', datei: '3badeec0-897c-4970-b18e-6fec2848c6d7.jpg', grund: '379 px, unscharfes Doppel mit rotem Pfeil (Silber)' },
  { id: 'gid://shopify/MediaImage/70238890066305', datei: 'bd52b11e-d210-4427-b0e4-74d0dd03b4a9.jpg', grund: '364 px, unscharfes Doppel mit rotem Pfeil (Rot)' },
  { id: 'gid://shopify/MediaImage/70238890131841', datei: '62226e92-6c1d-4212-886f-4d2343a50d18.jpg', grund: '362 px, unscharfes Doppel mit rotem Pfeil (Grau)' },
  { id: 'gid://shopify/MediaImage/70238890197377', datei: 'bc5f4fc6-a45b-4059-9343-c5fb78287628.jpg', grund: '377 px, unscharfes Doppel mit rotem Pfeil (Schwarz)' },
];
const BLEIBEN = [
  { id: 'gid://shopify/MediaImage/70238889869697', datei: 'b34dedba-189d-46a0-9d16-728d93ec3b05.jpg' },
  BILD_BLAU_NEU,
  { id: 'gid://shopify/MediaImage/70238890099073', datei: '40e1fce7-606e-4c35-9b64-af1a4b793ed1.jpg' },
  { id: 'gid://shopify/MediaImage/70238890164609', datei: '68c8b3c0-e4d2-4b67-88ce-b4e40558e789.jpg' },
];
// SEO_ALT ist der heutige Wortlaut im Shop (mit Gedankenstrich und Rabattcode); er wird genau so gesucht und ersetzt.
const SEO_ALT = 'Kartenetui aus Aluminium bei LuxeStyle – Schweizer Online-Shop. Gratis-Versand ab CHF 50, 30 Tage Rückgabe. Jetzt –10% mit Code WELCOME10.';
const SEO_NEU = 'Kartenetui aus Aluminiumlegierung in Rot, Blau, Schwarz, Dunkelgrau und Silber. Versand in der Schweiz CHF 7, ab CHF 50 gratis nach Rabatt. 30 Tage Rückgabe.';

const M_DETACH = `mutation($p:ID!,$v:[ProductVariantDetachMediaInput!]!){ productVariantDetachMedia(productId:$p, variantMedia:$v){ userErrors{field message} } }`;
const M_APPEND = `mutation($p:ID!,$v:[ProductVariantAppendMediaInput!]!){ productVariantAppendMedia(productId:$p, variantMedia:$v){ userErrors{field message} } }`;
const M_FILE = `mutation($f:[FileUpdateInput!]!){ fileUpdate(files:$f){ files{id} userErrors{field message code} } }`;
const M_SEO = `mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{id} userErrors{field message} } }`;
const M_REORDER = `mutation($id:ID!,$m:[MoveInput!]!){ productReorderMedia(id:$id, moves:$m){ job{id} mediaUserErrors{field message} } }`;

let geschrieben = false; // wird vor dem ersten Schreibversuch gesetzt (auch wenn der Versuch scheitert)
const HINWEIS = () => geschrieben
  ? ' | Es wurde schon geschrieben oder ein Schreibversuch lief: Stand mit «node seite.mjs» (Trockenlauf) lesen, Rücknahme mit ZURUECK=1 LIVE=1.'
  : ' | Nichts geschrieben.';
const abbruch = (m, ohneHinweis = false) => { console.log('ABBRUCH: ' + m + (ohneHinweis ? '' : HINWEIS())); process.exit(2); };
// Jeder unerwartete Fehler (auch aus top-level await) endet als ABBRUCH mit Exit 2, nicht mit Stacktrace und Exit 1.
process.on('uncaughtException', (e) => abbruch(String(e?.message || e)));
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Admin-API ----------
class Uebertragungsfehler extends Error {} // Netz, HTTP-Status ausser 2xx, keine JSON-Antwort, THROTTLED, Zeitlimit
let token = null;
async function holeToken() {
  let r;
  try {
    r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(ZEIT_MS),
      body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) });
  } catch (e) { throw new Uebertragungsfehler('Token: Netzfehler ' + (e?.cause?.code || e?.name || e?.message)); }
  if (!r.ok) throw new Uebertragungsfehler('Token: HTTP ' + r.status);
  let j;
  try { j = await r.json(); } catch { throw new Uebertragungsfehler('Token: Antwort ist kein JSON'); }
  if (!j.access_token) throw new Error('kein Admin-Token in der Antwort');
  return j.access_token;
}
// Ein einzelner Aufruf ohne Wiederholung. Übertragungsfehler → Uebertragungsfehler, andere GraphQL-Fehler → Error.
async function rohGql(query, variables = {}) {
  if (!token) token = await holeToken();
  let r, j;
  try {
    r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(ZEIT_MS) });
  } catch (e) { throw new Uebertragungsfehler('Netzfehler ' + (e?.cause?.code || e?.name || e?.message)); }
  if (r.status === 401) token = null; // beim nächsten Versuch neues Token holen
  if (!r.ok) throw new Uebertragungsfehler('HTTP ' + r.status);
  try { j = await r.json(); } catch { throw new Uebertragungsfehler('Antwort ist kein JSON'); }
  if (j.errors) {
    if (j.errors.some((x) => x?.extensions?.code === 'THROTTLED')) throw new Uebertragungsfehler('THROTTLED');
    throw new Error(JSON.stringify(j.errors).slice(0, 400));
  }
  return j.data;
}
// Lesen: bei Übertragungsfehler bis zu zweimal mit Pause wiederholen.
async function gql(query, variables = {}) {
  for (let versuch = 0; ; versuch++) {
    try { return await rohGql(query, variables); }
    catch (e) {
      if (!(e instanceof Uebertragungsfehler) || versuch >= 2) throw new Error(`Lesen: ${e.message}${e instanceof Uebertragungsfehler ? ' (nach 2 Wiederholungen)' : ''}`);
      console.log(`  Hinweis: Lesen: ${e.message}, Wiederholung ${versuch + 1} von 2 in ${PAUSE_MS * (versuch + 1)} ms`);
      await warte(PAUSE_MS * (versuch + 1));
    }
  }
}
// Schreiben: nie blind wiederholen. Nach einem Übertragungsfehler frisch lesen (pruefen), ob es gewirkt hat.
// pruefen() liefert { gewirkt: true } oder { gewirkt: false, variablen?, notiz? } (variablen = Rest für die Wiederholung).
// Rückgabe: die Daten der Antwort, oder null, wenn die Antwort fehlte, die frische Lesung aber die Wirkung zeigt.
async function schreibe(name, query, variablen, pruefen) {
  let vars = variablen;
  for (let versuch = 0; ; versuch++) {
    geschrieben = true;
    try { return await rohGql(query, vars); }
    catch (e) {
      if (!(e instanceof Uebertragungsfehler)) throw new Error(`${name}: ${e.message}`);
      let stand = null;
      for (let i = 0; i < 3; i++) {
        await warte(WARTE_MS);
        try { stand = await pruefen(); } catch (e2) { stand = { fehler: e2.message }; continue; }
        if (stand.gewirkt) break;
      }
      if (stand?.gewirkt) { console.log(`  Hinweis: ${name}: ${e.message}; frisch gelesen hat es gewirkt, keine Wiederholung`); return null; }
      if (!stand || stand.fehler) throw new Error(`${name}: ${e.message}; ob es gewirkt hat, ist nicht lesbar (${stand?.fehler})`);
      if (versuch >= 2) throw new Error(`${name}: ${e.message}; ${stand.notiz || 'frisch gelesen ohne Wirkung'}, nach 2 Wiederholungen aufgegeben`);
      if (stand.variablen) vars = stand.variablen;
      console.log(`  Hinweis: ${name}: ${e.message}; ${stand.notiz || 'frisch gelesen ohne Wirkung'}, Wiederholung ${versuch + 1} von 2`);
      await warte(PAUSE_MS * (versuch + 1));
    }
  }
}
async function holeBild(url) { // Lesen vom CDN, zweimal wiederholen
  for (let versuch = 0; ; versuch++) {
    let fehler;
    try { const r = await fetch(url, { signal: AbortSignal.timeout(ZEIT_MS) }); if (r.ok) return Buffer.from(await r.arrayBuffer()); fehler = 'HTTP ' + r.status; }
    catch (e) { fehler = 'Netzfehler ' + (e?.cause?.code || e?.name || e?.message); }
    if (versuch >= 2) abbruch(`Bildkopie ${url}: ${fehler} (nach 2 Wiederholungen)`);
    await warte(PAUSE_MS * (versuch + 1));
  }
}

const lesen = async () => (await gql(`query($h:String!){ productByIdentifier(identifier:{handle:$h}){
  id handle title status productType descriptionHtml tags seo{title description}
  options{id name position optionValues{id name}}
  variants(first:50){nodes{id title sku price compareAtPrice inventoryPolicy selectedOptions{name value} media(first:5){nodes{id}}}}
  media(first:50){nodes{id alt mediaContentType status ... on MediaImage{image{url width height}}}}
  collections(first:50){nodes{id}} } }`, { h: HANDLE })).productByIdentifier;
const dateien = async (ids) => (await gql(`query($ids:[ID!]!){ nodes(ids:$ids){ id ... on MediaImage{ fileStatus } } }`, { ids })).nodes;

const dateiName = (m) => (m?.image?.url || '').split('?')[0].split('/').pop();
const zaehle = (s, t) => (s || '').split(t).length - 1;
const medienIds = (p) => p.media.nodes.map((m) => m.id);
const varMedien = (p) => Object.fromEntries(p.variants.nodes.map((v) => [v.id, v.media.nodes.map((m) => m.id)]));
const kurz = (ids) => ids.map((id) => id.split('/').pop()).join(',');
// Was sich nie ändern darf (Medien, Variantenbilder und SEO-Beschreibung werden getrennt geprüft)
const kern = (p) => JSON.stringify({
  title: p.title, handle: p.handle, status: p.status, productType: p.productType, descriptionHtml: p.descriptionHtml, tags: p.tags,
  seoTitle: p.seo?.title ?? null, optionen: p.options.map((o) => [o.id, o.name, o.optionValues.map((v) => [v.id, v.name])]),
  varianten: p.variants.nodes.map((v) => [v.id, v.title, v.sku, v.price, v.compareAtPrice, v.inventoryPolicy, v.selectedOptions.map((s) => s.value)]),
  sammlungen: p.collections.nodes.map((c) => c.id).sort(),
});
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const blauIst = async () => { const x = await lesen(); return varMedien(x)[BLAU]; };

// Bild der Variante Blau von «vorher» auf «nachher» tauschen (Listen von Medien-IDs). Zuerst lösen, dann anhängen
// (nur ein Bild je Variante). Scheitert das Anhängen: «vorher» wieder anhängen, dessen Fehlermeldungen prüfen, Blau
// frisch lesen und nur nach dieser Lesung melden; immer Exit 2.
async function blauTauschen(vorher, nachher, vorherName) {
  const loesen = vorher.filter((id) => !nachher.includes(id));
  const neu = nachher.filter((id) => !vorher.includes(id));
  if (loesen.length) {
    const r = await schreibe('productVariantDetachMedia', M_DETACH, { p: PRODUKT_ID, v: [{ variantId: BLAU, mediaIds: loesen }] },
      async () => ({ gewirkt: !(await blauIst()).some((id) => loesen.includes(id)) }));
    const ue = r?.productVariantDetachMedia.userErrors || [];
    if (ue.length) {
      let ist = 'nicht lesbar';
      try { const b = await blauIst(); ist = b.length ? kurz(b) : 'ohne Bild'; } catch { /* bleibt «nicht lesbar» */ }
      abbruch(`productVariantDetachMedia: ${JSON.stringify(ue)} | Blau frisch gelesen: ${ist}`);
    }
  }
  if (!neu.length) return;
  let fehler = null;
  try {
    const r = await schreibe('productVariantAppendMedia', M_APPEND, { p: PRODUKT_ID, v: [{ variantId: BLAU, mediaIds: neu }] },
      async () => ({ gewirkt: gleich(await blauIst(), nachher) }));
    const ue = r?.productVariantAppendMedia.userErrors || [];
    if (ue.length) fehler = 'productVariantAppendMedia: ' + JSON.stringify(ue);
  } catch (e) { fehler = e.message.startsWith('productVariantAppendMedia') ? e.message : 'productVariantAppendMedia: ' + e.message; }
  if (!fehler) return;
  let wieder = `nichts wieder anzuhängen (Blau hatte vor diesem Lauf kein Bild)`;
  if (loesen.length) {
    try {
      const r = await schreibe('productVariantAppendMedia (wieder anhängen)', M_APPEND, { p: PRODUKT_ID, v: [{ variantId: BLAU, mediaIds: loesen }] },
        async () => ({ gewirkt: gleich(await blauIst(), vorher) }));
      const ue = r?.productVariantAppendMedia.userErrors || [];
      wieder = ue.length ? `Wiederanhängen meldet ${JSON.stringify(ue)}` : 'Wiederanhängen ohne Fehlermeldung';
    } catch (e) { wieder = 'Wiederanhängen gescheitert: ' + e.message; }
  }
  let ist = null;
  try { ist = await blauIst(); } catch { /* ist bleibt null */ }
  let lage;
  if (ist === null) lage = 'Blau ist nicht lesbar und möglicherweise ohne Bild: Stand mit «node seite.mjs» lesen, dann ZURUECK=1 LIVE=1 fahren';
  else if (ist.length && gleich(ist, vorher)) lage = `${vorherName} wieder angehängt (frisch gelesen: Blau ${kurz(ist)})`;
  else if (!ist.length) lage = 'Blau ohne Bild, ZURUECK=1 LIVE=1 fahren';
  else if (gleich(ist, nachher)) lage = `Blau hat frisch gelesen doch das Zielbild ${kurz(ist)}; die übrigen Schritte liefen nicht: Trockenlauf fahren, dann LIVE erneut oder ZURUECK=1 LIVE=1`;
  else lage = `Blau hat frisch gelesen ${kurz(ist)}: Stand mit «node seite.mjs» lesen, dann ZURUECK=1 LIVE=1 fahren`;
  abbruch(`${fehler} | ${wieder} | ${lage}`, true);
}

const p = await lesen();
if (!p || p.id !== PRODUKT_ID) abbruch(`Produkt nicht gefunden oder andere ID: ${p?.id}`);
const blau = p.variants.nodes.find((v) => v.id === BLAU);
if (!blau || blau.selectedOptions[0]?.value !== 'Blau') abbruch('Variante Blau nicht gefunden');
const nachId = Object.fromEntries(p.media.nodes.map((m) => [m.id, m]));
const vm = varMedien(p);
console.log(`${ZURUECK ? 'RÜCKNAHME' : 'PLAN'} für ${HANDLE} (${p.status}, ${p.variants.nodes.length} Varianten, ${p.media.nodes.length} Bilder, gelesen ${new Date().toISOString()})`);

if (!ZURUECK) {
  // Prüfen, dass jede Kennung noch die erwartete Datei ist (Schutz gegen veränderte Galerie)
  for (const b of BLEIBEN) {
    if (!nachId[b.id]) abbruch(`Bild ${b.id} (${b.datei}) fehlt in der Galerie`);
    if (dateiName(nachId[b.id]) !== b.datei) abbruch(`Bild ${b.id} ist heute ${dateiName(nachId[b.id])}, erwartet ${b.datei}`);
  }
  const weg = ENTFERNEN.filter((e) => nachId[e.id]);
  for (const e of weg) if (dateiName(nachId[e.id]) !== e.datei) abbruch(`Bild ${e.id} ist heute ${dateiName(nachId[e.id])}, erwartet ${e.datei}`);
  const fremd = p.media.nodes.filter((m) => !BLEIBEN.some((b) => b.id === m.id) && !ENTFERNEN.some((e) => e.id === m.id));
  if (fremd.length) abbruch(`unbekannte Bilder in der Galerie: ${fremd.map((m) => m.id + ' ' + dateiName(m)).join(', ')}`);
  for (const v of p.variants.nodes) {
    if (v.id === BLAU) continue;
    if (vm[v.id].some((id) => ENTFERNEN.some((e) => e.id === id))) abbruch(`Variante ${v.title} verweist auf ein Bild, das entfernt werden soll`);
  }
  // Variantenbild Blau: erlaubt sind heute nur das alte Bild, kein Bild (nach einem gescheiterten Lauf) oder schon das neue
  let tausch = true;
  if (gleich(vm[BLAU], [BILD_BLAU_NEU.id])) tausch = false;
  else if (!gleich(vm[BLAU], [BILD_BLAU_ALT]) && !gleich(vm[BLAU], [])) abbruch(`Variante Blau hat heute ein anderes Bild: ${vm[BLAU].join(', ')}`);
  if (tausch && gleich(vm[BLAU], [BILD_BLAU_ALT]) && !nachId[BILD_BLAU_ALT]) abbruch('altes Bild von Blau ist nicht mehr in der Galerie');
  // SEO-Beschreibung: exakter Ersatz, alte Zeichenkette genau einmal
  const d = p.seo?.description || '';
  let zielSeo;
  if (zaehle(d, SEO_ALT) === 1) zielSeo = d.replace(SEO_ALT, SEO_NEU);
  else if (d === SEO_NEU) zielSeo = null;
  else abbruch(`SEO-Beschreibung: alte Zeichenkette kommt ${zaehle(d, SEO_ALT)}-mal vor (verlangt genau 1), heute «${d}»`);
  if (zielSeo !== null && zielSeo !== SEO_NEU) abbruch('SEO-Beschreibung enthält mehr als die alte Zeichenkette');

  console.log(`  Variante Blau:   heute ${vm[BLAU].length ? vm[BLAU].map((id) => dateiName(nachId[id])).join(', ') : 'ohne Bild'}`);
  console.log(`                   → ${tausch ? `${vm[BLAU].length ? 'zuerst altes Bild lösen, dann ' : ''}neu ${BILD_BLAU_NEU.datei} anhängen (alle fünf Farben, 1500 px)` : 'unverändert'}`);
  console.log(`  Galerie entfernen (${weg.length} von ${ENTFERNEN.length}, Dateien bleiben in Inhalt > Dateien):`);
  for (const e of weg) console.log(`    - ${e.id.split('/').pop()} ${e.datei.slice(0, 8)} ${nachId[e.id].image?.width}x${nachId[e.id].image?.height}: ${e.grund}`);
  console.log(`  Galerie danach:  ${p.media.nodes.filter((m) => !weg.some((e) => e.id === m.id)).map((m) => dateiName(m).slice(0, 8)).join(', ')} (Reihenfolge wie heute)`);
  console.log(`  SEO-Titel bleibt: «${p.seo?.title}»`);
  console.log(`  SEO-Beschreibung: «${d}»`);
  console.log(`                   → ${zielSeo === null ? 'unverändert' : `«${zielSeo}» (${[...zielSeo].length} Zeichen)`}`);
  console.log(`  Varianten bleiben: ${p.variants.nodes.map((v) => `${v.selectedOptions[0]?.value} ${v.sku}=${v.price}`).join(', ')}`);
  if (!tausch && !weg.length && zielSeo === null) { console.log('Nichts zu tun.'); process.exit(0); }
  if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }

  // Sicherung vor dem ersten Schreiben (nie überschreiben) und Kopien der Bilder, die entfernt werden
  if (!existsSync(SICHERUNG)) {
    mkdirSync(BILDKOPIEN, { recursive: true });
    const kopien = [];
    for (const e of weg) {
      const url = nachId[e.id].image.url.split('?')[0];
      const bytes = await holeBild(url);
      const ziel = join(BILDKOPIEN, e.id.split('/').pop() + '_' + e.datei);
      if (existsSync(ziel)) { if (!readFileSync(ziel).equals(bytes)) abbruch(`Bildkopie ${ziel} liegt schon und weicht ab`); }
      else writeFileSync(ziel, bytes, { flag: 'wx' });
      kopien.push({ id: e.id, url, alt: nachId[e.id].alt, datei: ziel });
    }
    writeFileSync(SICHERUNG, JSON.stringify({ gelesen: new Date().toISOString(), produkt: p.id, handle: p.handle,
      seo: { title: p.seo?.title ?? null, description: p.seo?.description ?? null },
      medien: p.media.nodes.map((m) => ({ id: m.id, url: m.image?.url?.split('?')[0] ?? null, alt: m.alt })),
      variantenMedien: vm, kopien, kern: kern(p) }, null, 1), { flag: 'wx' });
    console.log('Sicherung geschrieben: ' + SICHERUNG + ` (${kopien.length} Bildkopien in ${BILDKOPIEN})`);
  }

  if (tausch) await blauTauschen(vm[BLAU], [BILD_BLAU_NEU.id], 'altes Bild');
  if (weg.length) {
    const ids = weg.map((e) => e.id);
    const r = await schreibe('fileUpdate (entfernen)', M_FILE, { f: ids.map((id) => ({ id, referencesToRemove: [p.id] })) },
      async () => { const jetzt = medienIds(await lesen()); const rest = ids.filter((id) => jetzt.includes(id));
        return rest.length ? { gewirkt: false, notiz: `frisch gelesen ${rest.length} von ${ids.length} noch in der Galerie`, variablen: { f: rest.map((id) => ({ id, referencesToRemove: [p.id] })) } } : { gewirkt: true }; });
    if (r?.fileUpdate.userErrors.length) abbruch('fileUpdate: ' + JSON.stringify(r.fileUpdate.userErrors));
  }
  if (zielSeo !== null) {
    const r = await schreibe('productUpdate (SEO)', M_SEO, { p: { id: p.id, seo: { title: p.seo?.title ?? null, description: zielSeo } } },
      async () => ({ gewirkt: ((await lesen()).seo?.description || '') === zielSeo }));
    if (r?.productUpdate.userErrors.length) abbruch('productUpdate: ' + JSON.stringify(r.productUpdate.userErrors));
  }

  // Frisch nachlesen: Soll gegen Ist (Medien werden teils verzögert gelöst: bis zu 6 Versuche)
  const sollMedien = medienIds(p).filter((id) => !weg.some((e) => e.id === id));
  const sollVar = { ...vm, [BLAU]: [BILD_BLAU_NEU.id] };
  const sollSeo = zielSeo ?? d;
  let n, fehler;
  for (let i = 0; i < 6; i++) {
    await warte(WARTE_MS);
    n = await lesen();
    fehler = [];
    if (!gleich(medienIds(n), sollMedien)) fehler.push(`Galerie ${kurz(medienIds(n))} ≠ Soll ${kurz(sollMedien)}`);
    if (!gleich(varMedien(n), sollVar)) fehler.push(`Variantenbilder ${JSON.stringify(varMedien(n))} ≠ Soll ${JSON.stringify(sollVar)}`);
    if ((n.seo?.description || '') !== sollSeo) fehler.push(`SEO-Beschreibung «${n.seo?.description}» ≠ «${sollSeo}»`);
    if (kern(n) !== kern(p)) fehler.push('Titel, Text, Tags, Optionen, Varianten, Preise oder Sammlungen haben sich verändert');
    if (!fehler.length) break;
  }
  const geblieben = weg.length ? await dateien(weg.map((e) => e.id)) : [];
  const verloren = weg.filter((e, i) => !geblieben[i]);
  console.log(`  Dateien der entfernten Bilder noch vorhanden: ${geblieben.filter(Boolean).length} von ${weg.length}${verloren.length ? ' (WARNUNG: gelöscht: ' + verloren.map((e) => e.id).join(', ') + '; Rücknahme dann nur aus den Bildkopien)' : ''}`);
  console.log(`NACHGELESEN ${fehler.length ? 'ABWEICHUNG: ' + fehler.join('; ') : 'OK'} | Galerie ${n.media.nodes.length} Bilder | Blau ${varMedien(n)[BLAU].map((id) => dateiName(n.media.nodes.find((m) => m.id === id))).join(',')} | SEO «${n.seo?.description}»`);
  process.exit(fehler.length ? 1 : 0);
}

// ---------- Rücknahme ----------
if (!existsSync(SICHERUNG)) abbruch('keine Sicherung seite_sicherung.json');
const s = JSON.parse(readFileSync(SICHERUNG, 'utf8'));
if (s.produkt !== p.id) abbruch('Sicherung gehört zu einem anderen Produkt');
const sollMedien = s.medien.map((m) => m.id);
const fehlend = sollMedien.filter((id) => !nachId[id]);
const extra = medienIds(p).filter((id) => !sollMedien.includes(id));
if (extra.length) abbruch(`seit dem Schreiben neue Bilder in der Galerie: ${extra.join(', ')}`);
const vorhanden = fehlend.length ? await dateien(fehlend) : [];
const unwiederbringlich = fehlend.filter((id, i) => !vorhanden[i]);
if (unwiederbringlich.length) abbruch(`Dateien nicht mehr vorhanden (${unwiederbringlich.join(', ')}); Bildkopien in ${BILDKOPIEN}, von Hand hochladen`);
const blauSoll = s.variantenMedien[BLAU];
const blauTausch = !gleich(vm[BLAU], blauSoll);
if (blauTausch && !gleich(vm[BLAU], [BILD_BLAU_NEU.id]) && !gleich(vm[BLAU], [])) abbruch(`Variante Blau hat seit dem Schreiben ein anderes Bild: ${vm[BLAU].join(', ')}`);
const d = p.seo?.description || '';
const seoZurueck = d !== (s.seo.description || '');
if (seoZurueck && d !== SEO_NEU) abbruch(`SEO-Beschreibung wurde seit dem Schreiben geändert: «${d}»`);
console.log(`  Bilder wieder anhängen: ${fehlend.length} (${kurz(fehlend)}), danach Reihenfolge wie gesichert`);
console.log(`  Variante Blau: ${blauTausch ? `${vm[BLAU].join(',') || 'ohne Bild'} → ${blauSoll.join(',') || 'ohne Bild'}` : 'unverändert'}`);
console.log(`  SEO-Beschreibung: ${seoZurueck ? `→ «${s.seo.description}»` : 'unverändert'}`);
if (!fehlend.length && !blauTausch && !seoZurueck && gleich(medienIds(p), sollMedien)) { console.log('Nichts zu tun.'); process.exit(0); }
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }

if (fehlend.length) {
  const r = await schreibe('fileUpdate (anhängen)', M_FILE, { f: fehlend.map((id) => ({ id, referencesToAdd: [p.id] })) },
    async () => { const jetzt = medienIds(await lesen()); const rest = fehlend.filter((id) => !jetzt.includes(id));
      return rest.length ? { gewirkt: false, notiz: `frisch gelesen ${rest.length} von ${fehlend.length} noch nicht in der Galerie`, variablen: { f: rest.map((id) => ({ id, referencesToAdd: [p.id] })) } } : { gewirkt: true }; });
  if (r?.fileUpdate.userErrors.length) abbruch('fileUpdate (anhängen): ' + JSON.stringify(r.fileUpdate.userErrors));
  for (let i = 0; i < 6; i++) { await warte(WARTE_MS); const z = await lesen(); if (fehlend.every((id) => medienIds(z).includes(id))) break; }
}
const z = await lesen();
if (!gleich(medienIds(z), sollMedien)) {
  const moves = sollMedien.map((id, i) => ({ id, newPosition: String(i) })); // alle Bilder der Reihe nach an ihren gesicherten Platz
  const r = await schreibe('productReorderMedia', M_REORDER, { id: p.id, m: moves },
    async () => ({ gewirkt: gleich(medienIds(await lesen()), sollMedien) }));
  if (r?.productReorderMedia.mediaUserErrors.length) abbruch('productReorderMedia: ' + JSON.stringify(r.productReorderMedia.mediaUserErrors));
}
if (blauTausch) await blauTauschen(vm[BLAU], blauSoll, 'Bild von vor der Rücknahme');
if (seoZurueck) {
  const r = await schreibe('productUpdate (SEO zurück)', M_SEO, { p: { id: p.id, seo: { title: p.seo?.title ?? null, description: s.seo.description } } },
    async () => ({ gewirkt: ((await lesen()).seo?.description || '') === (s.seo.description || '') }));
  if (r?.productUpdate.userErrors.length) abbruch('productUpdate: ' + JSON.stringify(r.productUpdate.userErrors));
}
let n, fehler;
for (let i = 0; i < 6; i++) {
  await warte(WARTE_MS);
  n = await lesen();
  fehler = [];
  if (!gleich(medienIds(n), sollMedien)) fehler.push(`Galerie ${kurz(medienIds(n))} ≠ gesichert ${kurz(sollMedien)}`);
  if (!gleich(varMedien(n), s.variantenMedien)) fehler.push(`Variantenbilder ${JSON.stringify(varMedien(n))} ≠ gesichert`);
  if ((n.seo?.description || '') !== (s.seo.description || '')) fehler.push('SEO-Beschreibung ≠ gesichert');
  if (kern(n) !== kern(p)) fehler.push('Titel, Text, Tags, Optionen, Varianten, Preise oder Sammlungen haben sich verändert');
  if (!fehler.length) break;
}
console.log(`NACHGELESEN ${fehler.length ? 'ABWEICHUNG: ' + fehler.join('; ') : 'OK'} | Galerie ${n.media.nodes.length} Bilder | SEO «${n.seo?.description}»`);
process.exit(fehler.length ? 1 : 0);
