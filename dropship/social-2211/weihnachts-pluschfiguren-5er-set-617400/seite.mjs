// Weihnachts-Plüschfiguren 5er-Set (weihnachts-pluschfiguren-5er-set-617400): Produktseite nachbessern (11.11.2026, Paket sw2211).
//
// Was geändert wird (nur die Verknüpfung zweier Galeriebilder mit dem Produkt; die Dateien bleiben unter Inhalt > Dateien):
//  1) Galerie-Bild 3, MediaImage 77496776950151 (cf119e32-…jpg): zehn Figuren auf Weiss mit einem über die ganze Fläche
//     gekachelten Lieferanten-Wasserzeichen (chinesische Schriftzeichen und Logo). Am 11.11. selbst angesehen, im
//     Hochpass-Bild über die ganze Fläche sichtbar. Keine Variante verweist auf das Bild.
//  2) Galerie-Bild 5, MediaImage 77496777015687 (28ac74aa-…jpg): Valentinstags-Inszenierung mit englischer Schrift
//     («All for love» auf der Tüte und auf der Schachtel, eine Karte mit englischem Text) und Requisiten (Tüte,
//     Schachtel), die nicht zum Lieferumfang gehören. Keine Variante verweist auf das Bild. Die fünf Figuren darauf
//     (ein Bommel je Mütze) zeigt Galerie-Bild 2 sauber; es ist das Variantenbild von Modell 2 und bleibt.
//  Danach 5 Bilder: 0344d6f0 (Hauptbild), c503be0d (Modell 2), 29b3a07d (Einzelfigur), 4282720b (Modell 1),
//  b38310b8 (beide Modelle nebeneinander), Reihenfolge unverändert. Beide Varianten behalten ihr eigenes Bild.
//  Weg: fileUpdate referencesToRemove (von Shopify für das Lösen eines Bildes vom Produkt genannt; productDeleteMedia ist
//  abgekündigt und löscht die Datei ganz). So kann die Rücknahme dieselben Dateien wieder anhängen; zur Sicherheit
//  werden vor dem Schreiben Bildkopien abgelegt.
//
// Nicht angefasst: Titel (Gedankenstrich und «Weihnachts-» bleiben, das CJ-Datenblatt war am 11.11. nicht lesbar),
//  Handle, Beschreibung, SEO, Optionsnamen und Werte («Modell 1», «Modell 2»), Varianten, SKUs, Preise, Status, Kanäle,
//  Sammlungen, Tags, Lager, Produktart, Kategorie, Hauptbild (Valentinstags-Szene ohne Schrift: nur benannt).
//
// Aufruf: node seite.mjs                  Trockenlauf (Vorgabe): liest nur, prüft, zeigt den Plan
//         LIVE=1 node seite.mjs           schreibt (Sicherung seite_sicherung.json und Bildkopien vorher, flag 'wx')
//         ZURUECK=1 node seite.mjs        zeigt die Rücknahme
//         ZURUECK=1 LIVE=1 node seite.mjs nimmt zurück (beide Dateien wieder anhängen, gesicherte Reihenfolge)
// Exit 0 nur, wenn alle Prüfungen stimmen (Trockenlauf) bzw. frisch nachgelesen Soll = Ist (LIVE). 1 = Abweichung, 2 = Abbruch.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const SICHERUNG = join(HIER, 'seite_sicherung.json');
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const WARTE_MS = Number(process.env.WARTE_MS || 4000);
const HANDLE = 'weihnachts-pluschfiguren-5er-set-617400', PRODUKT_ID = 'gid://shopify/Product/16615813972359';
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com', API = '2026-01';
const MI = (n) => `gid://shopify/MediaImage/${n}`;

// Galerie heute (Admin-API 11.11.2026 14:32 UTC), in dieser Reihenfolge
const MEDIEN_VOR = [MI('77496776884615'), MI('77496776917383'), MI('77496776950151'), MI('77496776982919'),
  MI('77496777015687'), MI('77496777048455'), MI('77496777081223')];
const ENTFERNEN = [
  { id: MI('77496776950151'), datei: 'cf119e32-dfed-4be2-815c-1f973f5087d9', md5: 'b9ceaab73c0a046f6a9a17c6e46fa200',
    grund: 'gekacheltes Lieferanten-Wasserzeichen (chinesische Schriftzeichen und Logo) über die ganze Fläche' },
  { id: MI('77496777015687'), datei: '28ac74aa-3706-4e6e-9ace-a74fc62cb1e7', md5: '7dc34b4308fb2534bccbafde440da4bf',
    grund: 'englische Schrift «All for love» (Tüte, Schachtel) und Karte mit englischem Text; Valentinstags-Requisiten ausserhalb des Lieferumfangs' },
];
const VARIANTEN = {
  'gid://shopify/ProductVariant/67843732177287': { titel: 'Modell 1', sku: 'CJYS227268601AZ', preis: '16.90', bild: MI('77496777048455') },
  'gid://shopify/ProductVariant/67843732210055': { titel: 'Modell 2', sku: 'CJYS227268602BY', preis: '16.90', bild: MI('77496776917383') },
};
const MIN_BILDER = 3;

const abbruch = (m) => { console.log('ABBRUCH: ' + m); process.exit(2); };
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const kurz = (id) => id.split('/').pop();
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

const lesen = async () => (await gql(`query($h:String!){ productByIdentifier(identifier:{handle:$h}){
  id handle title status productType descriptionHtml tags seo{title description}
  options{name optionValues{name}}
  variants(first:20){nodes{id title sku price compareAtPrice inventoryPolicy availableForSale selectedOptions{name value} media(first:10){nodes{id}}}}
  media(first:30){nodes{id alt status ... on MediaImage{fileStatus image{url}}}}
  collections(first:50){nodes{handle}} } }`, { h: HANDLE })).productByIdentifier;
const dateien = async (ids) => (await gql(`query($i:[ID!]!){ nodes(ids:$i){ ... on MediaImage{ id fileStatus alt image{url} } } }`, { i: ids })).nodes;

const medienIds = (p) => p.media.nodes.map((m) => m.id);
const varMedien = (p) => Object.fromEntries(p.variants.nodes.map((v) => [v.id, v.media.nodes.map((m) => m.id)]));
const kern = (p) => JSON.stringify({
  title: p.title, handle: p.handle, status: p.status, productType: p.productType, descriptionHtml: p.descriptionHtml, tags: p.tags,
  seo: p.seo, options: p.options,
  varianten: p.variants.nodes.map((v) => [v.id, v.title, v.sku, v.price, v.compareAtPrice, v.inventoryPolicy, v.availableForSale, v.selectedOptions]),
  sammlungen: p.collections.nodes.map((c) => c.handle).sort(),
});
const dateiName = (m) => (m?.image?.url || '').split('/').pop().split('?')[0];
async function holeBild(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Bild HTTP ${r.status}: ${url}`);
  const b = Buffer.from(await r.arrayBuffer());
  return { bytes: b, md5: createHash('md5').update(b).digest('hex') };
}

// ---------- gemeinsamer Anfang: frisch lesen und prüfen ----------
const p = await lesen();
if (!p || p.id !== PRODUKT_ID) abbruch(`Produkt nicht gefunden oder andere ID: ${p?.id}`);
if (p.status !== 'ACTIVE') abbruch(`Status ${p.status}`);
const vm = varMedien(p);
for (const [vid, s] of Object.entries(VARIANTEN)) {
  const v = p.variants.nodes.find((x) => x.id === vid);
  if (!v) abbruch(`Variante ${s.titel} (${vid}) fehlt`);
  if (v.title !== s.titel || v.sku !== s.sku || v.price !== s.preis || v.compareAtPrice !== null || !v.availableForSale)
    abbruch(`Variante ${vid}: ${v.title} ${v.sku} ${v.price} Vergleichspreis ${v.compareAtPrice} kaufbar ${v.availableForSale}`);
  if (!gleich(vm[vid], [s.bild])) abbruch(`Variante ${s.titel} hat nicht ihr erwartetes Bild: ${vm[vid].join(',')}`);
}
if (p.variants.nodes.length !== Object.keys(VARIANTEN).length) abbruch(`erwartet 2 Varianten, gefunden ${p.variants.nodes.length}`);
const nachId = Object.fromEntries(p.media.nodes.map((m) => [m.id, m]));
const ids = medienIds(p);
if (p.media.nodes.some((m) => m.status !== 'READY')) abbruch('nicht alle Bilder READY');

// Werkzeug vorhanden? (Schema 2026-01 und Berechtigung, nur lesend)
const sch = await gql(`{ i:__type(name:"FileUpdateInput"){ inputFields{name} } a: currentAppInstallation{ accessScopes{handle} } }`);
const felder = sch.i.inputFields.map((f) => f.name);
if (!felder.includes('referencesToRemove') || !felder.includes('referencesToAdd')) abbruch('fileUpdate kennt referencesToRemove/referencesToAdd nicht');
if (!sch.a.accessScopes.some((s) => s.handle === 'write_files')) abbruch('Berechtigung write_files fehlt');

console.log(`${ZURUECK ? 'RÜCKNAHME' : 'PLAN'} für ${HANDLE} (${p.status}, gelesen ${new Date().toISOString()})`);
console.log(`  Titel bleibt:     «${p.title}»`);
console.log(`  Varianten bleiben: ${p.variants.nodes.map((v) => `${v.title} ${v.sku} CHF ${v.price} Bild ${dateiName(nachId[vm[v.id][0]])}`).join(' | ')}`);
console.log(`  Galerie heute:    ${p.media.nodes.length} Bilder: ${p.media.nodes.map(dateiName).map((d) => d.slice(0, 8)).join(', ')}`);
console.log('  Werkzeug:         fileUpdate mit referencesToRemove/referencesToAdd vorhanden, write_files erteilt');

if (!ZURUECK) {
  // Zustand: unverändert oder (teilweise) schon erledigt; alles andere ist eine fremde Änderung
  const sollNach = MEDIEN_VOR.filter((id) => !ENTFERNEN.some((e) => e.id === id));
  const erwartbar = ids.every((id) => MEDIEN_VOR.includes(id)) && sollNach.every((id) => ids.includes(id))
    && gleich(ids, MEDIEN_VOR.filter((id) => ids.includes(id)));
  if (!erwartbar) abbruch(`Galerie weicht vom gelesenen Stand ab (Reihenfolge oder neue Bilder): ${ids.map(kurz).join(',')}`);
  const weg = ENTFERNEN.filter((e) => ids.includes(e.id));
  for (const e of weg) {
    const m = nachId[e.id];
    if (dateiName(m) !== `${e.datei}.jpg`) abbruch(`${kurz(e.id)}: Datei ${dateiName(m)} ≠ ${e.datei}.jpg`);
    if (Object.values(vm).some((l) => l.includes(e.id))) abbruch(`${kurz(e.id)} ist ein Variantenbild`);
    const b = await holeBild(m.image.url);
    if (b.md5 !== e.md5) abbruch(`${kurz(e.id)}: Inhalt geändert (md5 ${b.md5}, angesehen wurde ${e.md5})`);
    e.bytes = b.bytes;
  }
  const bleiben = ids.filter((id) => !weg.some((e) => e.id === id));
  if (bleiben.length < MIN_BILDER) abbruch(`nach dem Entfernen blieben nur ${bleiben.length} Bilder`);
  for (const [vid, s] of Object.entries(VARIANTEN)) if (!bleiben.includes(s.bild)) abbruch(`Variantenbild von ${s.titel} würde fehlen`);
  for (const e of ENTFERNEN) console.log(`  Entfernen:        ${kurz(e.id)} ${e.datei.slice(0, 8)} ${ids.includes(e.id) ? `(Inhalt md5 geprüft) Grund: ${e.grund}` : '(schon entfernt)'}`);
  console.log(`  Danach:           ${bleiben.length} Bilder: ${bleiben.map((id) => dateiName(nachId[id]).slice(0, 8)).join(', ')}; Varianten behalten ihr Bild`);
  console.log('  Textänderungen:   keine');
  if (!weg.length) { console.log('Nichts zu tun.'); process.exit(0); }
  if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }

  // Sicherung vor dem ersten Schreiben (nie überschreiben)
  for (const e of weg) {
    const kopie = join(HIER, `seite_sicherung_${e.datei}.jpg`);
    if (!existsSync(kopie)) writeFileSync(kopie, e.bytes, { flag: 'wx' });
  }
  if (!existsSync(SICHERUNG)) {
    writeFileSync(SICHERUNG, JSON.stringify({
      gelesen: new Date().toISOString(), produkt: p.id, handle: p.handle,
      medien: p.media.nodes.map((m, i) => ({ id: m.id, position: i, alt: m.alt, url: m.image?.url })),
      variantenMedien: vm,
      entfernen: weg.map((e) => ({ id: e.id, datei: e.datei, md5: e.md5, alt: nachId[e.id].alt, url: nachId[e.id].image.url, grund: e.grund, kopie: join(HIER, `seite_sicherung_${e.datei}.jpg`) })),
      kern: kern(p),
    }, null, 1), { flag: 'wx' });
    console.log('Sicherung geschrieben: ' + SICHERUNG);
  }
  const r = await gql(`mutation($f:[FileUpdateInput!]!){ fileUpdate(files:$f){ files{id} userErrors{field message code} } }`,
    { f: weg.map((e) => ({ id: e.id, referencesToRemove: [p.id] })) });
  if (r.fileUpdate.userErrors.length) abbruch('fileUpdate: ' + JSON.stringify(r.fileUpdate.userErrors));

  // Frisch nachlesen: Soll gegen Ist (das Lösen kann verzögert ankommen: bis zu 6 Versuche)
  const sollMedien = bleiben;
  let n, fehler;
  for (let i = 0; i < 6; i++) {
    await warte(WARTE_MS);
    n = await lesen();
    fehler = [];
    if (!gleich(medienIds(n), sollMedien)) fehler.push(`Galerie ${medienIds(n).map(kurz).join(',')} ≠ Soll ${sollMedien.map(kurz).join(',')}`);
    if (!gleich(varMedien(n), vm)) fehler.push(`Variantenbilder ${JSON.stringify(varMedien(n))} ≠ vorher`);
    if (kern(n) !== kern(p)) fehler.push('Titel, Text, SEO, Tags, Optionen, Varianten, Preise oder Sammlungen haben sich verändert');
    if (!fehler.length) break;
  }
  const geblieben = await dateien(weg.map((e) => e.id));
  const da = geblieben.filter((f) => f && f.id).length;
  if (da !== weg.length) fehler.push(`nur ${da} von ${weg.length} Dateien noch unter Inhalt > Dateien (Rücknahme dann aus den Bildkopien)`);
  console.log(`NACHGELESEN ${fehler.length ? 'ABWEICHUNG: ' + fehler.join('; ') : 'OK'} | Galerie ${n.media.nodes.length} Bilder: ${n.media.nodes.map(dateiName).map((d) => d.slice(0, 8)).join(', ')} | Dateien behalten ${da}/${weg.length}`);
  process.exit(fehler.length ? 1 : 0);
}

// ---------- Rücknahme ----------
if (!existsSync(SICHERUNG)) abbruch('keine Sicherung seite_sicherung.json');
const s = JSON.parse(readFileSync(SICHERUNG, 'utf8'));
if (s.produkt !== p.id) abbruch('Sicherung gehört zu einem anderen Produkt');
const sollMedien = s.medien.map((m) => m.id);
const extra = ids.filter((id) => !sollMedien.includes(id));
if (extra.length) abbruch(`seit dem Schreiben neue Bilder in der Galerie: ${extra.join(', ')}`);
if (!gleich(vm, s.variantenMedien)) abbruch(`Variantenbilder seit dem Schreiben geändert: ${JSON.stringify(vm)}`);
if (kern(p) !== s.kern) console.log('  Hinweis:          Titel, Text, Tags, Varianten oder Sammlungen wurden seit dem Schreiben geändert; die Rücknahme fasst nur die zwei Bilder an und lässt das stehen');
const fehlend = sollMedien.filter((id) => !ids.includes(id));
const fremd = fehlend.filter((id) => !s.entfernen.some((e) => e.id === id));
if (fremd.length) abbruch(`es fehlen Bilder, die dieses Skript nicht entfernt hat: ${fremd.join(', ')}`);
const vorhanden = fehlend.length ? await dateien(fehlend) : [];
const unwiederbringlich = fehlend.filter((id, i) => !vorhanden[i]?.id);
if (unwiederbringlich.length) abbruch(`Dateien nicht mehr vorhanden (${unwiederbringlich.join(', ')}); Bildkopien seite_sicherung_*.jpg von Hand hochladen`);
console.log(`  Wieder anhängen:  ${fehlend.length} (${fehlend.map(kurz).join(', ') || 'keins'}), danach Reihenfolge wie gesichert (${sollMedien.length} Bilder)`);
if (!fehlend.length && gleich(ids, sollMedien)) { console.log('Nichts zu tun.'); process.exit(0); }
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }

if (fehlend.length) {
  const r = await gql(`mutation($f:[FileUpdateInput!]!){ fileUpdate(files:$f){ files{id} userErrors{field message code} } }`,
    { f: fehlend.map((id) => ({ id, referencesToAdd: [p.id] })) });
  if (r.fileUpdate.userErrors.length) abbruch('fileUpdate (anhängen): ' + JSON.stringify(r.fileUpdate.userErrors));
  for (let i = 0; i < 6; i++) { await warte(WARTE_MS); const z = await lesen(); if (fehlend.every((id) => medienIds(z).includes(id))) break; }
}
let z = await lesen();
if (!gleich(medienIds(z), sollMedien)) {
  const moves = sollMedien.map((id, i) => ({ id, newPosition: String(i) }));
  const r = await gql(`mutation($id:ID!,$m:[MoveInput!]!){ productReorderMedia(id:$id, moves:$m){ job{id} mediaUserErrors{field message} } }`, { id: p.id, m: moves });
  if (r.productReorderMedia.mediaUserErrors.length) abbruch('productReorderMedia: ' + JSON.stringify(r.productReorderMedia.mediaUserErrors));
}
let fehler;
for (let i = 0; i < 6; i++) {
  await warte(WARTE_MS);
  z = await lesen();
  fehler = [];
  if (!gleich(medienIds(z), sollMedien)) fehler.push(`Galerie ${medienIds(z).map(kurz).join(',')} ≠ gesichert ${sollMedien.map(kurz).join(',')}`);
  if (!gleich(varMedien(z), s.variantenMedien)) fehler.push('Variantenbilder ≠ gesichert');
  if (kern(z) !== kern(p)) fehler.push('Titel, Text, Tags, Varianten oder Sammlungen haben sich während der Rücknahme verändert');
  for (const e of s.entfernen) { const m = z.media.nodes.find((x) => x.id === e.id); if (m && m.alt !== e.alt) fehler.push(`Alt-Text ${kurz(e.id)} «${m.alt}» ≠ «${e.alt}»`); }
  if (!fehler.length) break;
}
console.log(`NACHGELESEN ${fehler.length ? 'ABWEICHUNG: ' + fehler.join('; ') : 'OK'} | Galerie ${z.media.nodes.length} Bilder: ${z.media.nodes.map(dateiName).map((d) => d.slice(0, 8)).join(', ')}`);
process.exit(fehler.length ? 1 : 0);
