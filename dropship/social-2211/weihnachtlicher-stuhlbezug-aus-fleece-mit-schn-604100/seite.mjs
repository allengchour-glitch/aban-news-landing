// Weihnachtlicher Stuhlbezug aus Fleece (weihnachtlicher-stuhlbezug-aus-fleece-mit-schn-604100): Seitenkorrektur, Fassung 2 (11.11.2026).
// Fassung 1 liegt daneben als seite.mjs.vor_nachbesserung (Bilder per productDeleteMedia, Rücknahme unsicher).
//
// Funde (Admin-API und Bilder am 11.11.2026 frisch gelesen bzw. selbst gesichtet, zuletzt 15:31 UTC):
//  1. Auswahl heisst «Farbe», die Werte sind Motive; «Alter Mann» zeigt einen Weihnachtsmann (Variantenbild 415244a0…jpg:
//     weisser Bart, rote Mütze, Tannenbaum). Neu: Option «Motiv», Wert «Weihnachtsmann». SKUs, Preise, Varianten-IDs bleiben.
//  2. Fliesstext «Er misst 52 cm in der Breite und 46 cm in der Höhe.» widerspricht dem Foto (frontal, Bild 8: Höhe zu Breite
//     1,15 bis 1,23; bei 52 breit × 46 hoch wären es 0,88). Neu: «Er misst 52 cm × 46 cm.» (nur die Richtung fällt weg).
//  3. Galeriebilder mit lesbarer Fremdmarke «McKenzie» auf einer Weinflasche werden vom Produkt gelöst: Bild 2 (5322595c…)
//     und Bild 7 (94514a60…) zeigen die Flasche gross, Bild 3 (e6f50d01…) hinter den Stühlen, in voller Auflösung ebenfalls
//     lesbar (Ausschnitt _gegen/img/m3_crop.jpg). Keines ist ein Variantenbild. Danach 5 Bilder in dieser Reihenfolge:
//     415244a0 (Weihnachtsmann), 6f63288f (Elch), a3712049 (Szenenbild: alle drei Motive auf Barhockern, ohne lesbare
//     Fremdschrift), 1045598e (Schneemann), 88e467dc (alle drei frontal). Alle drei Variantenbilder bleiben.
//  4. SEO-Titel mitten im Wort abgeschnitten («…Schneemann-Des… | LuxeStyle»). Neu: «Weihnachtlicher Stuhlbezug aus Fleece,
//     3 Motive | LuxeStyle» (drei Varianten belegt).
//  5. SEO-Beschreibung abgeschnitten, nennt «Partydeko & Ballone», «Gratis-Versand ab CHF 50» ohne «nach Rabatt» und ein
//     Rückgabeversprechen. Neu (159 Zeichen): SEO_BESCHR_NEU, nur Belegtes (Stuhlbezug, drei Motive, 52 × 46 cm) und der
//     Versandsatz in der festen Form.
// CJ-Datenblatt (product/query?productSku=CJYS2631121, nur lesend, vom Gegenprüfer am 11.11. ca. 14:55 UTC gelesen,
//  Rohdaten _gegen/cj_roh.json): «Product Name: Fleece Elderly Snowman Elk Chair Cover», «Material: Fabric»
//  (materialNameEn «Cloth»), «Dimensions: 52 cm * 46 cm» ohne Richtung, «Packing list: 1* Chair Cover»; Varianten
//  Old Man, Snowman, Elk mit denselben drei Variantenbildern wie im Shop.
// Weg für die Bilder: fileUpdate mit referencesToRemove (productDeleteMedia ist in 2026-01 abgekündigt, «Use fileUpdate
//  instead», und löscht die Datei). Die Dateien bleiben unter Inhalt > Dateien mit derselben ID (am Vorbild 617400 am
//  11.11. 15:33 UTC gemessen: Galerie 5, gelöste Dateien READY). Die Rücknahme hängt sie mit referencesToAdd wieder an und
//  stellt die gesicherte Reihenfolge mit productReorderMedia her. Vor dem Schreiben: md5 jeder Datei gegen den gesichteten
//  Inhalt, Bildkopien und Sicherung (flag 'wx', nie überschreiben). Nach dem Schreiben frisch lesen: jedes Medium READY,
//  Variantenbilder, Kanäle (resourcePublicationsV2), Sammlungen, Tags und Varianten unverändert; sonst Exit 1.
// Nicht angefasst: Preise, Status, Kanäle, Sammlungen, Tags, Lager, Handle, Produkttitel, Variantenreihenfolge, Produktart,
//  Judge.me-Metafelder (review_widget_data nennt die Datei 5322595c…; sie bleibt unter Dateien und damit erreichbar).
//
// Aufruf: node seite.mjs                   Trockenlauf (Vorgabe): liest nur, prüft, zeigt den Plan
//         LIVE=1 node seite.mjs            schreibt
//         ZURUECK=1 node seite.mjs         zeigt die Rücknahme
//         ZURUECK=1 LIVE=1 node seite.mjs  nimmt zurück
// Exit 0 = alles stimmt, 1 = Abweichung nach dem Schreiben oder teilweise geschrieben, 2 = Abbruch vor dem Schreiben.
// Zugang: SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, SHOPIFY_SHOP (Client-Credentials), Admin-API 2026-01.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const SICHERUNG = join(HIER, 'seite_sicherung.json');
const SICHERUNG_FASSUNG = 2;
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const WARTE_MS = Number(process.env.WARTE_MS || 4000), VERSUCHE = Number(process.env.VERSUCHE || 8);
const HANDLE = 'weihnachtlicher-stuhlbezug-aus-fleece-mit-schn-604100', PRODUKT_ID = 'gid://shopify/Product/16603897692551';
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com', API = '2026-01';
const MI = (n) => `gid://shopify/MediaImage/${n}`, PV = (n) => `gid://shopify/ProductVariant/${n}`;

const OPT_ALT = 'Farbe', OPT_NEU = 'Motiv';
const WERT_ALT = 'Alter Mann', WERT_NEU = 'Weihnachtsmann';
const WERT_BILD = '415244a0-feda-47da-9267-6b330e85d9a1'; // Variantenbild «Alter Mann» = Weihnachtsmann (gesichtet)
// Zwischen Zahl und «cm» steht auf der Seite ein schmales geschütztes Leerzeichen (U+202F), gemessen 11.11. 14:16 UTC.
const SATZ_ALT = 'Er misst 52 cm in der Breite und 46 cm in der Höhe.';
const SATZ_NEU = 'Er misst 52 cm × 46 cm.';
const SEO_TITEL_ALT = 'Weihnachtlicher Stuhlbezug aus Fleece mit Schneemann-Des… | LuxeStyle';
const SEO_TITEL_NEU = 'Weihnachtlicher Stuhlbezug aus Fleece, 3 Motive | LuxeStyle';
const SEO_BESCHR_ALT = 'Weihnachtlicher Stuhlbezug aus Fleece mit Schneemann-Design – jetzt bei LuxeStyle Schweiz (Partydeko & Ballone). Gratis-Versand ab CHF 50, 30 Tage Rückgabe…';
const SEO_BESCHR_NEU = 'Weihnachtlicher Stuhlbezug in drei Motiven: Weihnachtsmann, Schneemann oder Elch. Masse 52 × 46 cm. Versand in der Schweiz CHF 7, ab CHF 50 gratis nach Rabatt.';
const VERSANDSATZ = 'Versand in der Schweiz CHF 7, ab CHF 50 gratis nach Rabatt.';

// Galerie heute (Admin-API 11.11.2026 15:31 UTC), in dieser Reihenfolge
const MEDIEN_VOR = [MI('77437871489415'), MI('77437871423879'), MI('77437871260039'), MI('77437871456647'),
  MI('77437871522183'), MI('77437871554951'), MI('77437871587719'), MI('77437871620487')];
const ENTFERNEN = [
  { id: MI('77437871423879'), datei: '5322595c-56a6-47ab-8d43-62d6249ec3d0', md5: 'ced821266c0707436f84ad33271a5efb',
    grund: 'Bild 2: Weinflasche gross im Bild, Etikett «McKenzie, Barossa Valley» lesbar (Fremdmarke)' },
  { id: MI('77437871260039'), datei: 'e6f50d01-eea9-44e0-8f32-b56d9b17e78b', md5: '0bdc7416b269a8af39f39b8747661c28',
    grund: 'Bild 3: Weinflasche hinter den Stühlen, Etikett «McKenzie» in voller Auflösung lesbar (Fremdmarke); die drei Motive auf Stühlen zeigt auch Bild 5 (a3712049) ohne lesbare Fremdschrift' },
  { id: MI('77437871587719'), datei: '94514a60-5c3a-4955-8541-75133ff404d3', md5: 'b13d90ecb7aa0594d5987b330604464b',
    grund: 'Bild 7: Weinflasche gross im Bild, Etikett «McKenzie, Barossa Valley» lesbar (Fremdmarke)' },
];
const VARIANTEN = {
  [PV('67844134896007')]: { wert: WERT_ALT, sku: 'CJYS263112101AZ', preis: '21.90', bild: MI('77437871489415') },
  [PV('67844134928775')]: { wert: 'Schneemann', sku: 'CJYS263112102BY', preis: '21.90', bild: MI('77437871554951') },
  [PV('67844134961543')]: { wert: 'Elch', sku: 'CJYS263112103CX', preis: '21.90', bild: MI('77437871456647') },
};
const MIN_BILDER = 3;

let schreibenBegonnen = false;
const abbruch = (m) => { console.log('ABBRUCH: ' + m); process.exit(2); };
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const kurz = (id) => String(id).split('/').pop();
const umbenannt = (w) => (w === WERT_ALT ? WERT_NEU : w);

let token = null;
async function gql(query, variables = {}, lesend = true) {
  if (!token) {
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) });
    token = (await r.json().catch(() => ({}))).access_token;
    if (!token) throw new Error(`kein Admin-Token (HTTP ${r.status})`);
  }
  for (let versuch = 1; ; versuch++) {
    const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }) });
    const j = await r.json().catch(() => null);
    if (!j) throw new Error(`Admin-API HTTP ${r.status} ohne JSON`);
    const gedrosselt = r.status === 429 || (j.errors || []).some((e) => e?.extensions?.code === 'THROTTLED');
    // Nur Lesen wird wiederholt; ein Schreibaufruf nie (er könnte trotz Fehler angekommen sein).
    if (gedrosselt && lesend && versuch < 4) { await warte(2000 * versuch); continue; }
    if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 400));
    if (!r.ok) throw new Error(`Admin-API HTTP ${r.status}`);
    return j.data;
  }
}
async function mut(query, variables, feld, fehlerFeld = 'userErrors') {
  const d = await gql(query, variables, false);
  const e = d?.[feld]?.[fehlerFeld] || [];
  if (!d?.[feld]) throw new Error(`${feld}: keine Antwort`);
  if (e.length) throw new Error(`${feld}: ${JSON.stringify(e)}`);
  return d[feld];
}

const LESEN = `query($h:String!){ productByIdentifier(identifier:{handle:$h}){
  id handle title status productType tags descriptionHtml seo{title description}
  options{id name position optionValues{id name}}
  variants(first:20){nodes{id title sku price compareAtPrice position inventoryPolicy availableForSale selectedOptions{name value} media(first:10){nodes{id}}}}
  media(first:30){nodes{id alt mediaContentType status ... on MediaImage{fileStatus image{url}}}}
  collections(first:50){nodes{handle}}
  resourcePublicationsV2(first:30, onlyPublished:false){nodes{isPublished publication{id}}} } }`;
const lesen = async () => (await gql(LESEN, { h: HANDLE })).productByIdentifier;
const dateien = async (ids) => (ids.length ? (await gql(`query($i:[ID!]!){ nodes(ids:$i){ ... on MediaImage{ id fileStatus alt image{url} } } }`, { i: ids })).nodes : []);
const M_OPTION = `mutation($p:ID!,$o:OptionUpdateInput!,$v:[OptionValueUpdateInput!]){ productOptionUpdate(productId:$p, option:$o, optionValuesToUpdate:$v){ userErrors{field message} } }`;
const M_PRODUKT = `mutation($i:ProductUpdateInput!){ productUpdate(product:$i){ userErrors{field message} } }`;
const M_DATEI = `mutation($f:[FileUpdateInput!]!){ fileUpdate(files:$f){ files{id} userErrors{field message code} } }`;
const M_REIHE = `mutation($id:ID!,$m:[MoveInput!]!){ productReorderMedia(id:$id, moves:$m){ job{id} mediaUserErrors{field message} } }`;

const medienIds = (p) => p.media.nodes.map((m) => m.id);
const varMedien = (p) => Object.fromEntries(p.variants.nodes.map((v) => [v.id, v.media.nodes.map((m) => m.id)]));
const kanaele = (p) => p.resourcePublicationsV2.nodes.map((n) => `${kurz(n.publication.id)}=${n.isPublished ? 'an' : 'aus'}`).sort();
const sammlungen = (p) => p.collections.nodes.map((c) => c.handle).sort();
const variantenKern = (p) => p.variants.nodes.map((v) => [v.id, v.sku, v.price, v.compareAtPrice, v.position, v.inventoryPolicy, v.availableForSale]);
const teile = (p) => ({ produkt: [p.title, p.handle, p.status, p.productType], tags: [...p.tags].sort(), sammlungen: sammlungen(p), kanaele: kanaele(p), varianten: variantenKern(p) });
const kernFest = (p) => JSON.stringify(teile(p));
const kernUnterschiede = (a, b) => { const x = teile(a), y = teile(b); return Object.keys(x).filter((k) => !gleich(x[k], y[k])); };
const dateiName = (m) => (m?.image?.url || '').split('/').pop().split('?')[0];
const nichtBereit = (p) => p.media.nodes.filter((m) => m.status !== 'READY' || (m.fileStatus !== undefined && m.fileStatus !== 'READY'));
async function holeBild(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Bild HTTP ${r.status}: ${url}`);
  const b = Buffer.from(await r.arrayBuffer());
  return { bytes: b, md5: createHash('md5').update(b).digest('hex') };
}

async function main() {
  if (!process.env.SHOPIFY_CLIENT_ID || !process.env.SHOPIFY_CLIENT_SECRET) abbruch('SHOPIFY_CLIENT_ID/SHOPIFY_CLIENT_SECRET fehlen');
  // Selbstprüfung der neuen Texte (Hausregeln)
  if (SEO_BESCHR_NEU.length > 160) abbruch(`SEO-Beschreibung ${SEO_BESCHR_NEU.length} Zeichen`);
  for (const t of [SEO_BESCHR_NEU, SEO_TITEL_NEU, SATZ_NEU, WERT_NEU, OPT_NEU]) if (/[–—ß]|Rückgabe|%/.test(t)) abbruch(`Text verletzt die Hausregeln: «${t}»`);
  if (/Versand/.test(SEO_BESCHR_NEU) && !SEO_BESCHR_NEU.endsWith(VERSANDSATZ)) abbruch('Versandsatz nicht in der festen Form');

  // ---------- gemeinsamer Anfang: frisch lesen und prüfen ----------
  const p = await lesen();
  if (!p || p.id !== PRODUKT_ID) abbruch(`Produkt nicht gefunden oder andere ID: ${p?.id}`);
  if (p.options.length !== 1 || ![OPT_ALT, OPT_NEU].includes(p.options[0].name)) abbruch(`Option nicht eindeutig: ${p.options.map((o) => o.name).join(', ')}`);
  const opt = p.options[0];
  if (p.variants.nodes.length !== Object.keys(VARIANTEN).length) abbruch(`erwartet 3 Varianten, gefunden ${p.variants.nodes.length}`);
  const vm = varMedien(p);
  const nachId = Object.fromEntries(p.media.nodes.map((m) => [m.id, m]));
  const ids = medienIds(p);
  for (const [vid, s] of Object.entries(VARIANTEN)) {
    const v = p.variants.nodes.find((x) => x.id === vid);
    if (!v) abbruch(`Variante ${s.wert} (${vid}) fehlt`);
    if (v.sku !== s.sku || v.price !== s.preis || v.compareAtPrice !== null) abbruch(`Variante ${kurz(vid)}: SKU ${v.sku}, Preis ${v.price}, Vergleichspreis ${v.compareAtPrice}`);
    if (!gleich(vm[vid], [s.bild])) abbruch(`Variante ${s.wert} hat nicht ihr erwartetes Bild: ${vm[vid].map(kurz).join(',')}`);
    if (!nachId[s.bild]) abbruch(`Variantenbild ${kurz(s.bild)} nicht in der Galerie`);
  }
  if (!dateiName(nachId[VARIANTEN[PV('67844134896007')].bild]).includes(WERT_BILD)) abbruch('Variantenbild des Weihnachtsmanns ist nicht mehr das gesichtete Bild');
  const nb = nichtBereit(p);
  const nbText = nb.map((m) => `${kurz(m.id)} ${m.status}/${m.fileStatus}`).join(', ');
  // Vorwärts nur auf einer sauberen Galerie; die Rücknahme läuft trotzdem (sie prüft am Ende wieder jedes Bild auf READY).
  if (nb.length && !ZURUECK) abbruch(`nicht alle Bilder READY: ${nbText}`);
  if (nb.length) console.log(`  Hinweis:           schon vor der Rücknahme nicht READY: ${nbText}`);
  // Werkzeug vorhanden? (Schema 2026-01 und Berechtigung, nur lesend)
  const sch = await gql(`{ i:__type(name:"FileUpdateInput"){ inputFields{name} } m:__type(name:"Mutation"){ fields{name} } a: currentAppInstallation{ accessScopes{handle} } }`);
  const felder = sch.i.inputFields.map((f) => f.name), muts = sch.m.fields.map((f) => f.name), rechte = sch.a.accessScopes.map((s) => s.handle);
  if (!felder.includes('referencesToRemove') || !felder.includes('referencesToAdd')) abbruch('fileUpdate kennt referencesToRemove/referencesToAdd nicht');
  for (const m of ['fileUpdate', 'productReorderMedia', 'productUpdate', 'productOptionUpdate']) if (!muts.includes(m)) abbruch(`Mutation ${m} fehlt im Schema`);
  for (const r of ['write_files', 'write_products', 'read_publications']) if (!rechte.includes(r)) abbruch(`Berechtigung ${r} fehlt`);

  console.log(`${ZURUECK ? 'RÜCKNAHME' : 'PLAN'} für ${HANDLE} (${p.status}, gelesen ${new Date().toISOString()})`);
  console.log(`  Titel bleibt:      «${p.title}»`);
  console.log(`  Varianten:         ${p.variants.nodes.map((v) => `${v.selectedOptions[0].value} ${v.sku} CHF ${v.price} Bild ${dateiName(nachId[vm[v.id][0]]).slice(0, 8)} ${v.availableForSale ? 'kaufbar' : 'NICHT kaufbar'}`).join(' | ')}`);
  console.log(`  Kanäle:            ${kanaele(p).length} (${kanaele(p).join(', ')})`);
  console.log(`  Galerie heute:     ${ids.length} Bilder: ${p.media.nodes.map((m) => dateiName(m).slice(0, 8)).join(', ')}`);
  console.log('  Werkzeug:          fileUpdate (referencesToRemove/referencesToAdd), productReorderMedia vorhanden; write_files, write_products erteilt');

  if (!ZURUECK) return vorwaerts(p, opt, vm, nachId, ids);
  return zurueck(p, opt, vm, ids);
}

async function vorwaerts(p, opt, vm, nachId, ids) {
  if (p.status !== 'ACTIVE') abbruch(`Status ${p.status}`);
  for (const v of p.variants.nodes) if (!v.availableForSale) abbruch(`Variante ${v.selectedOptions[0].value} nicht kaufbar`);
  // 1 Option und Wert (ganz oder schon erledigt; alles andere ist eine fremde Änderung)
  const wAlt = opt.optionValues.find((v) => v.name === WERT_ALT), wNeu = opt.optionValues.find((v) => v.name === WERT_NEU);
  if (!!wAlt === !!wNeu) abbruch(`Wert «${WERT_ALT}»/«${WERT_NEU}» nicht eindeutig: ${opt.optionValues.map((v) => v.name).join(', ')}`);
  if (!gleich(opt.optionValues.filter((v) => v !== wAlt && v !== wNeu).map((v) => v.name), ['Schneemann', 'Elch'])) abbruch(`andere Werte unerwartet: ${opt.optionValues.map((v) => v.name).join(', ')}`);
  const optAendern = opt.name === OPT_ALT, wertAendern = !!wAlt;
  for (const [vid, s] of Object.entries(VARIANTEN)) {
    const so = p.variants.nodes.find((x) => x.id === vid).selectedOptions[0];
    const soll = s.wert === WERT_ALT && !wertAendern ? WERT_NEU : s.wert;
    if (so.name !== opt.name || so.value !== soll) abbruch(`Variante ${kurz(vid)}: «${so.name}: ${so.value}» passt nicht zur Option`);
  }
  // 2 Masssatz
  const nAlt = p.descriptionHtml.split(SATZ_ALT).length - 1, nNeu = p.descriptionHtml.split(SATZ_NEU).length - 1;
  let textAendern = false;
  if (nAlt === 1 && nNeu === 0) textAendern = true; else if (!(nAlt === 0 && nNeu === 1)) abbruch(`Masssatz nicht eindeutig (alt ${nAlt}×, neu ${nNeu}×)`);
  const descSoll = textAendern ? p.descriptionHtml.replace(SATZ_ALT, SATZ_NEU) : p.descriptionHtml;
  // 3 SEO-Titel und 4 SEO-Beschreibung
  let seoTitelAendern = false, seoBeschrAendern = false;
  if (p.seo.title === SEO_TITEL_ALT) seoTitelAendern = true; else if (p.seo.title !== SEO_TITEL_NEU) abbruch(`SEO-Titel unerwartet: «${p.seo.title}»`);
  if (p.seo.description === SEO_BESCHR_ALT) seoBeschrAendern = true; else if (p.seo.description !== SEO_BESCHR_NEU) abbruch(`SEO-Beschreibung unerwartet: «${p.seo.description}»`);
  // 5 Bilder: Galerie unverändert oder (teilweise) schon erledigt
  const sollNach = MEDIEN_VOR.filter((id) => !ENTFERNEN.some((e) => e.id === id));
  const erwartbar = ids.every((id) => MEDIEN_VOR.includes(id)) && sollNach.every((id) => ids.includes(id)) && gleich(ids, MEDIEN_VOR.filter((id) => ids.includes(id)));
  if (!erwartbar) abbruch(`Galerie weicht vom gelesenen Stand ab (Reihenfolge oder neue Bilder): ${ids.map(kurz).join(',')}`);
  const weg = ENTFERNEN.filter((e) => ids.includes(e.id));
  for (const e of weg) {
    const m = nachId[e.id];
    if (dateiName(m) !== `${e.datei}.jpg`) abbruch(`${kurz(e.id)}: Datei ${dateiName(m)} ≠ ${e.datei}.jpg`);
    if (Object.values(vm).some((l) => l.includes(e.id))) abbruch(`${kurz(e.id)} ist ein Variantenbild`);
    const b = await holeBild(m.image.url);
    if (b.md5 !== e.md5) abbruch(`${kurz(e.id)}: Inhalt geändert (md5 ${b.md5}, gesichtet wurde ${e.md5})`);
    e.bytes = b.bytes;
  }
  const bleiben = ids.filter((id) => !weg.some((e) => e.id === id));
  if (bleiben.length < MIN_BILDER) abbruch(`nach dem Entfernen blieben nur ${bleiben.length} Bilder`);
  for (const s of Object.values(VARIANTEN)) if (!bleiben.includes(s.bild)) abbruch(`Variantenbild von ${s.wert} würde fehlen`);
  const vorDat = await dateien(weg.map((e) => e.id));
  const datOk = vorDat.filter((f) => f?.id && f.fileStatus === 'READY').length;
  if (datOk !== weg.length) abbruch(`nur ${datOk} von ${weg.length} Dateien unter Inhalt > Dateien READY`);

  console.log(`  Option:            «${opt.name}» → «${OPT_NEU}» ${optAendern ? '(ändern)' : '(schon erledigt)'}`);
  console.log(`  Wert:              «${wAlt ? WERT_ALT : WERT_NEU}» → «${WERT_NEU}» ${wertAendern ? '(ändern)' : '(schon erledigt)'}`);
  console.log(`  Beschreibung:      «${SATZ_ALT}» → «${SATZ_NEU}» ${textAendern ? '(ändern)' : '(schon erledigt)'}`);
  console.log(`  SEO-Titel:         «${p.seo.title}» → «${SEO_TITEL_NEU}» ${seoTitelAendern ? '(ändern)' : '(schon erledigt)'}`);
  console.log(`  SEO-Beschreibung:  «${p.seo.description}» → «${SEO_BESCHR_NEU}» (${SEO_BESCHR_NEU.length} Zeichen) ${seoBeschrAendern ? '(ändern)' : '(schon erledigt)'}`);
  for (const e of ENTFERNEN) console.log(`  Bild lösen:        ${kurz(e.id)} ${e.datei.slice(0, 8)} ${ids.includes(e.id) ? `(Position ${ids.indexOf(e.id) + 1}, md5 geprüft, Datei READY) Grund: ${e.grund}` : '(schon gelöst)'}`);
  console.log(`  Danach:            ${bleiben.length} Bilder: ${bleiben.map((id) => dateiName(nachId[id]).slice(0, 8)).join(', ')}; Variantenbilder unverändert (${Object.keys(vm).length})`);
  if (!optAendern && !wertAendern && !textAendern && !seoTitelAendern && !seoBeschrAendern && !weg.length) { console.log('Nichts zu tun.'); process.exit(0); }
  if (!LIVE) { console.log('Trockenlauf: nichts geschrieben. LIVE=1 schreibt.'); process.exit(0); }

  // ---------- Sicherung vor dem ersten Schreiben (nie überschreiben) ----------
  if (existsSync(SICHERUNG)) {
    const s = JSON.parse(readFileSync(SICHERUNG, 'utf8'));
    if (s.fassung !== SICHERUNG_FASSUNG || s.produkt !== p.id) abbruch('vorhandene seite_sicherung.json hat eine andere Fassung oder gehört zu einem anderen Produkt; erst von Hand prüfen');
    const ungesichert = weg.filter((e) => !(s.entfernen || []).some((x) => x.id === e.id));
    if (ungesichert.length) abbruch(`vorhandene Sicherung kennt ${ungesichert.map((e) => kurz(e.id)).join(', ')} nicht; die Rücknahme könnte sie nicht wieder anhängen`);
    for (const e of weg) { const kopie = join(HIER, `seite_sicherung_${e.datei}.jpg`); if (!existsSync(kopie)) writeFileSync(kopie, e.bytes, { flag: 'wx' }); }
    console.log('Sicherung besteht schon, bleibt unverändert: ' + SICHERUNG);
  } else {
    for (const e of weg) { const kopie = join(HIER, `seite_sicherung_${e.datei}.jpg`); if (!existsSync(kopie)) writeFileSync(kopie, e.bytes, { flag: 'wx' }); }
    writeFileSync(SICHERUNG, JSON.stringify({
      fassung: SICHERUNG_FASSUNG, gelesen: new Date().toISOString(), produkt: p.id, handle: p.handle,
      option: { id: opt.id, name: opt.name, werte: opt.optionValues.map((v) => ({ id: v.id, name: v.name })) },
      variantenWerte: Object.fromEntries(p.variants.nodes.map((v) => [v.id, v.selectedOptions[0].value])),
      descriptionHtml: p.descriptionHtml, seo: p.seo,
      medien: p.media.nodes.map((m, i) => ({ id: m.id, position: i, alt: m.alt, url: m.image?.url })),
      variantenMedien: vm,
      entfernen: weg.map((e) => ({ id: e.id, datei: e.datei, md5: e.md5, alt: nachId[e.id].alt, url: nachId[e.id].image.url, position: ids.indexOf(e.id), grund: e.grund,
        kopie: join(HIER, `seite_sicherung_${e.datei}.jpg`), cj_url: `https://cf.cjdropshipping.com/quick/product/${e.datei}.jpg` })),
      kernFest: kernFest(p),
    }, null, 1), { flag: 'wx' });
    console.log('Sicherung geschrieben: ' + SICHERUNG);
  }

  // ---------- Schreiben ----------
  schreibenBegonnen = true;
  const erledigt = [];
  try {
    if (optAendern || wertAendern) {
      await mut(M_OPTION, { p: p.id, o: optAendern ? { id: opt.id, name: OPT_NEU } : { id: opt.id }, v: wertAendern ? [{ id: wAlt.id, name: WERT_NEU }] : [] }, 'productOptionUpdate');
      erledigt.push('Option/Wert');
    }
    if (textAendern || seoTitelAendern || seoBeschrAendern) {
      const eingabe = { id: p.id };
      if (textAendern) eingabe.descriptionHtml = descSoll;
      if (seoTitelAendern || seoBeschrAendern) eingabe.seo = { title: SEO_TITEL_NEU, description: SEO_BESCHR_NEU };
      await mut(M_PRODUKT, { i: eingabe }, 'productUpdate');
      erledigt.push('Beschreibung/SEO');
    }
    if (weg.length) {
      const r = await mut(M_DATEI, { f: weg.map((e) => ({ id: e.id, referencesToRemove: [p.id] })) }, 'fileUpdate');
      if ((r.files || []).length !== weg.length) throw new Error(`fileUpdate meldet ${(r.files || []).length} von ${weg.length} Dateien`);
      erledigt.push(`${weg.length} Bilder gelöst`);
    }
  } catch (err) {
    console.log(`FEHLER beim Schreiben: ${err.message}`);
    console.log(`Laut Antwort schon geschrieben: ${erledigt.join(', ') || 'nichts'}. Stand prüfen mit «node seite.mjs», Rücknahme mit «ZURUECK=1 LIVE=1 node seite.mjs».`);
    process.exit(1);
  }
  console.log('Geschrieben: ' + erledigt.join(', '));

  // ---------- Frisch nachlesen: Soll gegen Ist (das Lösen kann verzögert ankommen) ----------
  const werteSoll = opt.optionValues.map((v) => ({ id: v.id, name: umbenannt(v.name) }));
  let n, fehler;
  for (let i = 0; i < VERSUCHE; i++) {
    await warte(WARTE_MS);
    n = await lesen();
    fehler = [];
    if (!n) { fehler.push('Produkt nicht lesbar'); continue; }
    const no = n.options[0];
    if (n.options.length !== 1 || no.name !== OPT_NEU) fehler.push(`Optionsname ${no?.name}`);
    if (!gleich(no?.optionValues.map((v) => ({ id: v.id, name: v.name })), werteSoll)) fehler.push(`Werte ${no?.optionValues.map((v) => v.name).join(', ')}`);
    for (const a of p.variants.nodes) {
      const b = n.variants.nodes.find((x) => x.id === a.id);
      if (!b) { fehler.push(`Variante fehlt ${kurz(a.id)}`); continue; }
      const w = umbenannt(a.selectedOptions[0].value);
      if (b.selectedOptions[0]?.name !== OPT_NEU || b.selectedOptions[0]?.value !== w || b.title !== w) fehler.push(`Variante ${kurz(a.id)} heisst «${b.selectedOptions[0]?.name}: ${b.selectedOptions[0]?.value}»`);
    }
    if (!gleich(varMedien(n), vm)) fehler.push(`Variantenbilder ${JSON.stringify(varMedien(n))} ≠ vorher`);
    if (n.descriptionHtml !== descSoll) fehler.push(`Beschreibung weicht ab (Länge Ist ${n.descriptionHtml.length}, Soll ${descSoll.length})`);
    if (n.seo.title !== SEO_TITEL_NEU) fehler.push(`SEO-Titel «${n.seo.title}»`);
    if (n.seo.description !== SEO_BESCHR_NEU) fehler.push(`SEO-Beschreibung «${n.seo.description}»`);
    if (!gleich(medienIds(n), bleiben)) fehler.push(`Galerie ${medienIds(n).map(kurz).join(',')} ≠ Soll ${bleiben.map(kurz).join(',')}`);
    const nbn = nichtBereit(n);
    if (nbn.length) fehler.push(`nicht READY: ${nbn.map((m) => `${kurz(m.id)} ${m.status}/${m.fileStatus}`).join(', ')}`);
    const ku = kernUnterschiede(p, n);
    if (ku.length) fehler.push(`verändert: ${ku.join(', ')}${ku.includes('kanaele') ? ` (Kanäle Ist ${kanaele(n).join(', ')})` : ''}`);
    if (!fehler.length) break;
  }
  const geblieben = await dateien(weg.map((e) => e.id));
  const da = geblieben.filter((f) => f?.id && f.fileStatus === 'READY').length;
  if (da !== weg.length) fehler.push(`nur ${da} von ${weg.length} Dateien noch READY unter Inhalt > Dateien (Rücknahme dann aus den Bildkopien)`);
  console.log(`NACHGELESEN ${fehler.length ? 'ABWEICHUNG: ' + fehler.join(' | ') : 'OK'} | ${n?.options[0]?.name}: ${n?.options[0]?.optionValues.map((v) => v.name).join(', ')} | Galerie ${n?.media.nodes.length} Bilder: ${n?.media.nodes.map((m) => `${dateiName(m).slice(0, 8)} ${m.status}`).join(', ')} | Kanäle ${n ? kanaele(n).length : '?'} | Dateien behalten ${da}/${weg.length} | SEO «${n?.seo.title}»`);
  process.exit(fehler.length ? 1 : 0);
}

async function zurueck(p, opt, vm, ids) {
  if (!existsSync(SICHERUNG)) abbruch('keine Sicherung seite_sicherung.json');
  const s = JSON.parse(readFileSync(SICHERUNG, 'utf8'));
  if (s.fassung !== SICHERUNG_FASSUNG || s.produkt !== p.id) abbruch('Sicherung hat eine andere Fassung oder gehört zu einem anderen Produkt');
  // Option und Werte zurück auf den gesicherten Stand (nur die Umbenennung dieses Skripts wird zurückgenommen)
  if (opt.id !== s.option.id) abbruch(`Option hat eine andere ID (${opt.id}, gesichert ${s.option.id})`);
  let optZurueck = false;
  if (opt.name !== s.option.name) { if (opt.name === OPT_NEU) optZurueck = true; else abbruch(`Optionsname «${opt.name}» seit dem Schreiben anders verändert`); }
  if (opt.optionValues.length !== s.option.werte.length) abbruch('Zahl der Optionswerte hat sich geändert');
  const werteZurueck = [];
  for (const w of s.option.werte) {
    const c = opt.optionValues.find((v) => v.id === w.id);
    if (!c) abbruch(`Optionswert ${w.name} (${kurz(w.id)}) fehlt`);
    if (c.name === w.name) continue;
    if (c.name === umbenannt(w.name)) werteZurueck.push({ id: w.id, name: w.name }); else abbruch(`Optionswert «${c.name}» seit dem Schreiben anders verändert`);
  }
  // Beschreibung und SEO
  const descVor = s.descriptionHtml.replace(SATZ_ALT, SATZ_NEU);
  let textZurueck = false;
  if (p.descriptionHtml !== s.descriptionHtml) { if (p.descriptionHtml === descVor) textZurueck = true; else abbruch('Beschreibung wurde seit dem LIVE-Lauf anders verändert, nicht blind zurückschreiben'); }
  let seoTZ = false, seoBZ = false;
  if (p.seo.title !== s.seo.title) { if (p.seo.title === SEO_TITEL_NEU) seoTZ = true; else abbruch(`SEO-Titel seit dem LIVE-Lauf anders verändert: «${p.seo.title}»`); }
  if (p.seo.description !== s.seo.description) { if (p.seo.description === SEO_BESCHR_NEU) seoBZ = true; else abbruch(`SEO-Beschreibung seit dem LIVE-Lauf anders verändert: «${p.seo.description}»`); }
  // Bilder
  const sollMedien = s.medien.map((m) => m.id);
  const extra = ids.filter((id) => !sollMedien.includes(id));
  if (extra.length) abbruch(`seit dem Schreiben neue Bilder in der Galerie: ${extra.map(kurz).join(', ')}`);
  if (!gleich(vm, s.variantenMedien)) abbruch(`Variantenbilder seit dem Schreiben geändert: ${JSON.stringify(vm)}`);
  const fehlend = sollMedien.filter((id) => !ids.includes(id));
  const fremd = fehlend.filter((id) => !s.entfernen.some((e) => e.id === id));
  if (fremd.length) abbruch(`es fehlen Bilder, die dieses Skript nicht gelöst hat: ${fremd.map(kurz).join(', ')}`);
  const vorhanden = await dateien(fehlend);
  const weg = fehlend.filter((id, i) => !(vorhanden[i]?.id === id && vorhanden[i].fileStatus === 'READY'));
  if (weg.length) abbruch(`Dateien nicht mehr READY unter Inhalt > Dateien (${weg.map(kurz).join(', ')}); von Hand neu hochladen aus ${s.entfernen.filter((e) => weg.includes(e.id)).map((e) => `${e.kopie} oder ${e.cj_url}`).join('; ')}`);
  if (kernFest(p) !== s.kernFest) console.log(`  Hinweis:           seit dem Schreiben verändert: ${Object.keys(teile(p)).filter((k) => !gleich(teile(p)[k], JSON.parse(s.kernFest)[k])).join(', ')}; die Rücknahme lässt das stehen`);

  console.log(`  Option:            ${optZurueck ? `«${opt.name}» → «${s.option.name}»` : 'schon so'}`);
  console.log(`  Werte:             ${werteZurueck.length ? werteZurueck.map((w) => `«${umbenannt(w.name)}» → «${w.name}»`).join(', ') : 'schon so'}`);
  console.log(`  Beschreibung:      ${textZurueck ? `«${SATZ_NEU}» → «${SATZ_ALT}»` : 'schon so'}`);
  console.log(`  SEO-Titel:         ${seoTZ ? `«${p.seo.title}» → «${s.seo.title}»` : 'schon so'}`);
  console.log(`  SEO-Beschreibung:  ${seoBZ ? `«${p.seo.description}» → «${s.seo.description}»` : 'schon so'}`);
  console.log(`  Wieder anhängen:   ${fehlend.length} (${fehlend.map(kurz).join(', ') || 'keins'}, Dateien READY), danach Reihenfolge wie gesichert (${sollMedien.length} Bilder)`);
  if (!optZurueck && !werteZurueck.length && !textZurueck && !seoTZ && !seoBZ && !fehlend.length && gleich(ids, sollMedien)) { console.log('Nichts zu tun.'); process.exit(0); }
  if (!LIVE) { console.log('ZURÜCK-Trockenlauf: nichts geschrieben. ZURUECK=1 LIVE=1 schreibt.'); process.exit(0); }

  schreibenBegonnen = true;
  const erledigt = [];
  try {
    if (optZurueck || werteZurueck.length) {
      await mut(M_OPTION, { p: p.id, o: optZurueck ? { id: opt.id, name: s.option.name } : { id: opt.id }, v: werteZurueck }, 'productOptionUpdate');
      erledigt.push('Option/Werte');
    }
    if (textZurueck || seoTZ || seoBZ) {
      const e = { id: p.id };
      if (textZurueck) e.descriptionHtml = s.descriptionHtml;
      if (seoTZ || seoBZ) e.seo = { title: s.seo.title, description: s.seo.description };
      await mut(M_PRODUKT, { i: e }, 'productUpdate');
      erledigt.push('Beschreibung/SEO');
    }
    if (fehlend.length) {
      const r = await mut(M_DATEI, { f: fehlend.map((id) => ({ id, referencesToAdd: [p.id] })) }, 'fileUpdate');
      if ((r.files || []).length !== fehlend.length) throw new Error(`fileUpdate meldet ${(r.files || []).length} von ${fehlend.length} Dateien`);
      erledigt.push(`${fehlend.length} Bilder angehängt`);
      let da = false;
      for (let i = 0; i < VERSUCHE; i++) { await warte(WARTE_MS); const z = await lesen(); if (fehlend.every((id) => medienIds(z).includes(id))) { da = true; break; } }
      if (!da) throw new Error('angehängte Bilder erscheinen nicht in der Galerie');
    }
    const z = await lesen();
    if (!gleich(medienIds(z), sollMedien)) {
      if (!gleich([...medienIds(z)].sort(), [...sollMedien].sort())) throw new Error(`Galerie ${medienIds(z).map(kurz).join(',')} passt nicht zur Sicherung`);
      await mut(M_REIHE, { id: p.id, m: sollMedien.map((id, i) => ({ id, newPosition: String(i) })) }, 'productReorderMedia', 'mediaUserErrors');
      erledigt.push('Reihenfolge');
    }
  } catch (err) {
    console.log(`FEHLER bei der Rücknahme: ${err.message}`);
    console.log(`Laut Antwort schon geschrieben: ${erledigt.join(', ') || 'nichts'}. Stand prüfen mit «ZURUECK=1 node seite.mjs».`);
    process.exit(1);
  }
  console.log('Geschrieben: ' + (erledigt.join(', ') || 'nichts'));

  let z, fehler;
  for (let i = 0; i < VERSUCHE; i++) {
    await warte(WARTE_MS);
    z = await lesen();
    fehler = [];
    if (!z) { fehler.push('Produkt nicht lesbar'); continue; }
    const zo = z.options[0];
    if (z.options.length !== 1 || zo.name !== s.option.name) fehler.push(`Optionsname ${zo?.name}`);
    if (!gleich(zo?.optionValues.map((v) => ({ id: v.id, name: v.name })), s.option.werte)) fehler.push(`Werte ${zo?.optionValues.map((v) => v.name).join(', ')}`);
    for (const [vid, w] of Object.entries(s.variantenWerte)) {
      const b = z.variants.nodes.find((x) => x.id === vid);
      if (!b || b.selectedOptions[0]?.name !== s.option.name || b.selectedOptions[0]?.value !== w || b.title !== w) fehler.push(`Variante ${kurz(vid)}`);
    }
    if (z.descriptionHtml !== s.descriptionHtml) fehler.push('Beschreibung');
    if (z.seo.title !== s.seo.title) fehler.push(`SEO-Titel «${z.seo.title}»`);
    if (z.seo.description !== s.seo.description) fehler.push('SEO-Beschreibung');
    if (!gleich(medienIds(z), sollMedien)) fehler.push(`Galerie ${medienIds(z).map(kurz).join(',')} ≠ gesichert ${sollMedien.map(kurz).join(',')}`);
    const nbz = nichtBereit(z);
    if (nbz.length) fehler.push(`nicht READY: ${nbz.map((m) => `${kurz(m.id)} ${m.status}/${m.fileStatus}`).join(', ')}`);
    if (!gleich(varMedien(z), s.variantenMedien)) fehler.push('Variantenbilder ≠ gesichert');
    const ku = kernUnterschiede(p, z);
    if (ku.length) fehler.push(`während der Rücknahme verändert: ${ku.join(', ')}${ku.includes('kanaele') ? ` (Kanäle Ist ${kanaele(z).join(', ')})` : ''}`);
    for (const e of s.entfernen) { const m = z.media.nodes.find((x) => x.id === e.id); if (m && m.alt !== e.alt) fehler.push(`Alt-Text ${kurz(e.id)} «${m.alt}» ≠ «${e.alt}»`); }
    if (!fehler.length) break;
  }
  console.log(`ZURÜCK NACHGELESEN ${fehler.length ? 'ABWEICHUNG: ' + fehler.join(' | ') : 'OK'} | ${z?.options[0]?.name}: ${z?.options[0]?.optionValues.map((v) => v.name).join(', ')} | Galerie ${z?.media.nodes.length} Bilder: ${z?.media.nodes.map((m) => `${dateiName(m).slice(0, 8)} ${m.status}`).join(', ')} | Kanäle ${z ? kanaele(z).length : '?'}`);
  process.exit(fehler.length ? 1 : 0);
}

main().catch((e) => { console.log(`FEHLER: ${e.message}`); process.exit(schreibenBegonnen ? 1 : 2); });
