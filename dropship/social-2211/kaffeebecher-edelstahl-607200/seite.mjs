// Kaffeebecher Edelstahl (kaffeebecher-edelstahl-607200): Produktseite nachbessern (11.11.2026, Paket sw2211).
//  1) Option «Volumen» heisst «Ausführung». Die Werte («300 ml · Edelstahl natur», «300 ml · Mattgelb» …) sind
//     Farben/Oberflächen, kein Volumen (alle sechs sind 300 ml). Werte, Varianten-IDs, SKUs, Preise bleiben.
//  2) SEO-Beschreibung ohne die unbelegte Werbeaussage «der Trend-Hit» (und ohne Gedankenstrich); neue Beschreibung nur
//     mit Belegtem: Edelstahl und 300 ml (Beschreibung), ohne Henkel (alle 7 Galeriebilder), schlicht (Beschreibung
//     «einfaches, minimalistisches Design»), sechs Ausführungen (6 Varianten). SEO-Titel bleibt.
//  Nicht angefasst: Titel, Handle, Beschreibung, Bilder, Preise, Status, Kanäle, Sammlungen, Tags, Lager.
//
// Aufruf: node seite.mjs                 Trockenlauf (Vorgabe): liest nur, zeigt den Plan
//         LIVE=1 node seite.mjs          schreibt (Sicherung seite_sicherung.json vor dem ersten Schreiben, flag 'wx')
//         ZURUECK=1 node seite.mjs       zeigt die Rücknahme
//         ZURUECK=1 LIVE=1 node seite.mjs nimmt zurück (Optionsname und SEO-Beschreibung aus der Sicherung)
// Exit 0 nur, wenn Plan stimmig (Trockenlauf) bzw. frisch nachgelesen Soll = Ist (LIVE). Sonst 1 (Abweichung) oder 2 (Abbruch).
// Nachbesserung 11.11.2026 (Gegenprüfung): das Rücklesen vergleicht zusätzlich das Bild jeder Variante (variants.media,
// in Reihenfolge) und die Kanäle (resourcePublicationsV2 mit onlyPublished:false, je Kanal-ID und isPublished).
// Jede gelesene Liste muss vollständig sein (hasNextPage false), sonst Abbruch.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const SICHERUNG = join(HIER, 'seite_sicherung.json');
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HANDLE = 'kaffeebecher-edelstahl-607200', PRODUKT_ID = 'gid://shopify/Product/15458603336065';
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com', API = '2026-01';

const OPT_ALT = 'Volumen', OPT_NEU = 'Ausführung';
const SEO_ALT = 'Kaffeebecher Edelstahl – der Trend-Hit bei LuxeStyle Schweiz.';
const SEO_NEU = 'Kaffeebecher aus Edelstahl, 300 ml, ohne Henkel, schlichtes Design, in sechs Ausführungen. Bei LuxeStyle Schweiz.';

const abbruch = (m) => { console.log('ABBRUCH: ' + m); process.exit(2); };
let token = null;
// Netzfehler, unlesbare Antwort und GraphQL-Fehler sind ein Abbruch (Exit 2, Zustand unbekannt), keine «Abweichung» (Exit 1).
async function gql(query, variables = {}) {
  let r, j;
  try {
    if (!token) {
      const t = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) });
      token = (await t.json()).access_token;
    }
  } catch (e) { abbruch('Admin-Token: ' + String(e?.message || e).slice(0, 200)); }
  if (!token) abbruch('kein Admin-Token');
  try {
    r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }) });
    j = await r.json();
  } catch (e) { abbruch(`Anfrage oder Antwort nicht lesbar (HTTP ${r?.status ?? '-'}): ` + String(e?.message || e).slice(0, 200)); }
  if (j.errors) abbruch('GraphQL-Fehler: ' + JSON.stringify(j.errors).slice(0, 400));
  if (!j.data) abbruch(`Antwort ohne data (HTTP ${r.status})`);
  return j.data;
}

const lesen = async () => {
  const p = (await gql(`query($h:String!){ productByIdentifier(identifier:{handle:$h}){
  id handle title status descriptionHtml tags seo{title description}
  options{id name position optionValues{id name}}
  variants(first:50){pageInfo{hasNextPage} nodes{id sku price compareAtPrice inventoryPolicy selectedOptions{name value}
    media(first:10){pageInfo{hasNextPage} nodes{id}}}}
  media(first:50){pageInfo{hasNextPage} nodes{id}} collections(first:50){pageInfo{hasNextPage} nodes{id}}
  resourcePublicationsV2(first:50, onlyPublished:false){pageInfo{hasNextPage} nodes{isPublished publication{id}}} } }`, { h: HANDLE })).productByIdentifier;
  if (!p) return p;
  const offen = [['variants', p.variants], ['media', p.media], ['collections', p.collections], ['resourcePublicationsV2', p.resourcePublicationsV2],
    ...p.variants.nodes.map((v) => [`variants.media ${v.sku}`, v.media])].filter(([, c]) => !c || !c.pageInfo || c.pageInfo.hasNextPage !== false);
  if (offen.length) abbruch('Lesung unvollständig (hasNextPage nicht false): ' + offen.map(([n]) => n).join(', '));
  return p;
};

const zaehle = (s, t) => (s || '').split(t).length - 1;
const kern = (p) => JSON.stringify({
  title: p.title, handle: p.handle, status: p.status, descriptionHtml: p.descriptionHtml, tags: p.tags, seoTitle: p.seo?.title,
  werte: p.options.map((o) => o.optionValues.map((v) => [v.id, v.name])),
  varianten: p.variants.nodes.map((v) => [v.id, v.sku, v.price, v.compareAtPrice, v.inventoryPolicy, v.selectedOptions.map((s) => s.value)]),
  variantenbilder: p.variants.nodes.map((v) => [v.id, v.media.nodes.map((m) => m.id)]),
  medien: p.media.nodes.map((m) => m.id), sammlungen: p.collections.nodes.map((c) => c.id).sort(),
  kanaele: p.resourcePublicationsV2.nodes.map((r) => [r.publication.id, r.isPublished]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
});

const p = await lesen();
if (!p || p.id !== PRODUKT_ID) abbruch(`Produkt nicht gefunden oder andere ID: ${p?.id}`);
if (p.options.length !== 1) abbruch(`erwartet genau eine Option, gefunden ${p.options.length}`);
const opt = p.options[0];

// Plan: Ziel je Feld, aus dem heutigen Stand oder aus der Sicherung
let zielOpt, zielSeo;
if (!ZURUECK) {
  if (opt.name === OPT_ALT) zielOpt = OPT_NEU;
  else if (opt.name === OPT_NEU) zielOpt = null;
  else abbruch(`Optionsname «${opt.name}» weder «${OPT_ALT}» noch «${OPT_NEU}»`);
  const d = p.seo?.description || '';
  const nAlt = zaehle(d, SEO_ALT);
  if (nAlt === 1) zielSeo = d.replace(SEO_ALT, SEO_NEU);
  else if (nAlt === 0 && d === SEO_NEU) zielSeo = null;
  else abbruch(`SEO-Beschreibung: alte Zeichenkette kommt ${nAlt}-mal vor (verlangt genau 1), heute «${d}»`);
} else {
  if (!existsSync(SICHERUNG)) abbruch('keine Sicherung seite_sicherung.json');
  const s = JSON.parse(readFileSync(SICHERUNG, 'utf8'));
  if (s.produkt !== p.id) abbruch('Sicherung gehört zu einem anderen Produkt');
  zielOpt = opt.name === s.option.name ? null : s.option.name;
  zielSeo = (p.seo?.description || '') === s.seo.description ? null : s.seo.description;
  if (zielSeo !== null && (p.seo?.description || '') !== SEO_NEU) abbruch(`SEO-Beschreibung wurde seit dem Schreiben geändert: «${p.seo?.description}»`);
  if (zielOpt !== null && opt.name !== OPT_NEU) abbruch(`Optionsname wurde seit dem Schreiben geändert: «${opt.name}»`);
}

console.log(`${ZURUECK ? 'RÜCKNAHME' : 'PLAN'} für ${HANDLE} (${p.status}, ${p.variants.nodes.length} Varianten, gelesen ${new Date().toISOString()})`);
console.log(`  Option:          «${opt.name}» → ${zielOpt === null ? 'unverändert' : `«${zielOpt}»`}`);
console.log(`  Werte bleiben:   ${opt.optionValues.map((v) => v.name).join(' | ')}`);
console.log(`  SEO-Titel bleibt: «${p.seo?.title}»`);
console.log(`  SEO-Beschreibung: «${p.seo?.description}» → ${zielSeo === null ? 'unverändert' : `«${zielSeo}» (${zielSeo.length} Zeichen)`}`);
console.log(`  Varianten bleiben: ${p.variants.nodes.map((v) => `${v.sku}=${v.price}`).join(', ')}`);
console.log(`  Variantenbilder bleiben: ${p.variants.nodes.filter((v) => v.media.nodes.length).length} von ${p.variants.nodes.length} Varianten mit Bild (${p.variants.nodes.map((v) => `${v.sku}:${v.media.nodes.map((m) => m.id.split('/').pop()).join('+') || '-'}`).join(', ')})`);
console.log(`  Kanäle bleiben: ${p.resourcePublicationsV2.nodes.filter((r) => r.isPublished).length} veröffentlicht von ${p.resourcePublicationsV2.nodes.length} (${p.resourcePublicationsV2.nodes.map((r) => r.publication.id.split('/').pop() + (r.isPublished ? '' : '(aus)')).join(', ')})`);
if (zielOpt === null && zielSeo === null) { console.log('Nichts zu tun.'); process.exit(0); }
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }

// Sicherung vor dem ersten Schreiben (nie überschreiben)
if (!ZURUECK && !existsSync(SICHERUNG)) {
  writeFileSync(SICHERUNG, JSON.stringify({ gelesen: new Date().toISOString(), produkt: p.id, handle: p.handle, title: p.title,
    option: { id: opt.id, name: opt.name, werte: opt.optionValues }, seo: { title: p.seo?.title ?? null, description: p.seo?.description ?? null },
    varianten: p.variants.nodes, kern: kern(p) }, null, 1), { flag: 'wx' });
  console.log('Sicherung geschrieben: ' + SICHERUNG);
}

if (zielOpt !== null) {
  const d = await gql(`mutation($p:ID!,$o:OptionUpdateInput!){ productOptionUpdate(productId:$p, option:$o){ userErrors{field message code} } }`,
    { p: p.id, o: { id: opt.id, name: zielOpt } });
  if (d.productOptionUpdate.userErrors.length) abbruch('productOptionUpdate: ' + JSON.stringify(d.productOptionUpdate.userErrors));
}
if (zielSeo !== null) {
  const d = await gql(`mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{id} userErrors{field message} } }`,
    { p: { id: p.id, seo: { title: p.seo?.title ?? null, description: zielSeo } } });
  if (d.productUpdate.userErrors.length) abbruch('productUpdate: ' + JSON.stringify(d.productUpdate.userErrors));
}

// Frisch nachlesen: Soll gegen Ist
await new Promise((r) => setTimeout(r, 4000));
const n = await lesen();
const sollOpt = zielOpt ?? opt.name, sollSeo = zielSeo ?? p.seo?.description;
const vor = JSON.parse(kern(p)), nach = JSON.parse(kern(n));
// Erwartete Änderung herausrechnen: der Optionsname steckt nicht in kern(); selectedOptions-Werte bleiben gleich.
const fehler = [];
if (n.options.length !== 1 || n.options[0].name !== sollOpt) fehler.push(`Optionsname «${n.options[0]?.name}» ≠ «${sollOpt}»`);
if ((n.seo?.description || '') !== sollSeo) fehler.push(`SEO-Beschreibung «${n.seo?.description}» ≠ «${sollSeo}»`);
for (const k of Object.keys(vor)) if (JSON.stringify(vor[k]) !== JSON.stringify(nach[k])) fehler.push(`${k} hat sich verändert`);
if (n.variants.nodes.some((v) => v.selectedOptions[0]?.name !== sollOpt)) fehler.push('selectedOptions tragen nicht den neuen Optionsnamen');
console.log(`NACHGELESEN ${fehler.length ? 'ABWEICHUNG: ' + fehler.join('; ') : 'OK'} | Option «${n.options[0]?.name}» | SEO «${n.seo?.description}»`);
process.exit(fehler.length ? 1 : 0);
