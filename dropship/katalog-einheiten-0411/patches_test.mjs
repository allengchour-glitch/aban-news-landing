// Tests für das Katalogfenster-Paket (EU-Grössen, ml/g, Knopf «Jetzt selbst gestalten», Sprung-Skript).
//   node dropship/katalog-einheiten-0411/patches_test.mjs
// Läuft ohne Netz auf den gesicherten Live-Dateien (sicherung/*.vor) und daten/etiketten.json.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { DATEIEN, MD5_VOR, MARKE, TEXTE, CSS_NEU, SPRUNG_SKRIPT, anwenden, ohneKommentar } from './patches.mjs';
import { bauen, herstellerWerte, ozKind, ozTextErsetzen, ozUmrechnen, schuhLabel, inGalerieEinfuegen, titelMitEinheit, UNSICHER } from './etiketten.mjs';

const HIER = new URL('.', import.meta.url).pathname;
let n = 0, fehler = 0;
const ok = (bed, text) => { n++; if (!bed) { fehler++; console.log('  ✗', text); } };
const gleich = (a, b, text) => ok(JSON.stringify(a) === JSON.stringify(b), `${text}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
const wirft = (f, teil, text) => { n++; try { f(); fehler++; console.log('  ✗', text, '(kein Fehler)'); } catch (e) { if (teil && !String(e.message).includes(teil)) { fehler++; console.log('  ✗', text, '- falsche Meldung:', e.message); } } };
const md5 = (s) => createHash('md5').update(s).digest('hex');

const sich = Object.fromEntries(Object.values(DATEIEN).map((d) => [d, readFileSync(HIER + 'sicherung/' + d.replace('/', '__') + '.vor', 'utf8')]));
const ET = JSON.parse(readFileSync(HIER + 'daten/etiketten.json', 'utf8'));
const TAB = JSON.parse(readFileSync(HIER + 'daten/schuh_eu_tabellen.json', 'utf8')).tabellen;

// ---------- Ausgangsstand ----------
for (const d of Object.values(DATEIEN)) ok(md5(sich[d]) === MD5_VOR[d], `Sicherung ${d}: MD5 ${md5(sich[d])} ≠ ${MD5_VOR[d]}`);

// ---------- Etiketten: Einzelregeln ----------
const K = { productType: { categoryPath: [{ title: 'Home & living' }, { title: 'Drinkware & coasters' }, { title: 'Mugs' }] } };
const Kerze = { productType: { categoryPath: [{ title: 'Home & living' }, { title: 'Home decor' }, { title: 'Candles' }] } };
const Napf = { productType: { categoryPath: [{ title: 'Home & living' }, { title: 'Pet products' }] } };
gleich(ozKind(K), 'ml', 'Tasse ist ml'); gleich(ozKind(Kerze), 'g', 'Kerze ist g'); gleich(ozKind(Napf), null, 'Tiernapf ist unbekannt'); gleich(ozKind({}), null, 'ohne Kategorie unbekannt');
gleich(ozTextErsetzen('11 oz', 'ml').text, '325 ml', '11 oz');
gleich(ozTextErsetzen('15 oz', 'ml').text, '444 ml', '15 oz');
gleich(ozTextErsetzen('20 oz', 'ml').text, '591 ml', '20 oz gerechnet');
gleich(ozTextErsetzen('9oz', 'g').text, '255 g', '9oz ohne Leerzeichen (Kerze)');
gleich(ozTextErsetzen('4oz', 'g').text, '113 g', '4oz');
gleich(ozTextErsetzen('Regular 12 oz', 'ml').text, 'Regular 355 ml', 'Präfix bleibt');
gleich(ozTextErsetzen('16 oz With Lid & Straw', 'ml').text, '473 ml mit Deckel und Strohhalm', 'englischer Zusatz wird übersetzt');
gleich(ozTextErsetzen('16 oz Foo Bar', 'ml').text, '473 ml Foo Bar', 'anderer Zusatz bleibt');
gleich(ozTextErsetzen('10.5 oz', 'ml').text, '311 ml', '10.5 oz');
gleich(titelMitEinheit('Can-Shaped Glass (16 oz)', 'ml', []), 'Can-Shaped Glass (473 ml)', 'Titel mit oz');
gleich(titelMitEinheit('Scented Soy Candle, 9oz', 'g', []), 'Scented Soy Candle, 255 g', 'Titel mit 9oz (Kerze)');
gleich(titelMitEinheit('Tumbler (16 oz)', 'ml', [{ oz: 16, wert: 590, einheit: 'ml' }]), null, 'Titel bei Herstellerwiderspruch bleibt');
gleich(titelMitEinheit('Hoodie', 'ml', []), null, 'Titel ohne oz');
gleich(titelMitEinheit('Fabric 4.2 oz./yd²', 'ml', []), null, 'Stoffgewicht im Titel bleibt');
gleich(titelMitEinheit('Bowl 18 oz', null, []), null, 'unbekannte Art: kein Titel');
gleich(ozTextErsetzen('18 oz', null).art, 'unbekannt', 'Tiernapf bleibt unverändert (unbekannte Art)');
gleich(ozTextErsetzen('4.2 oz./yd²', 'ml'), null, 'Stoffgewicht wird nie angefasst');
gleich(ozTextErsetzen('9 oz/yd²', 'ml'), null, 'Stoffgewicht ohne Punkt');
gleich(ozTextErsetzen('M', 'ml'), null, 'Buchstabengrösse');
const H = herstellerWerte('<p>Capacity 20 oz. (600 ml), also 17oz (500ml) and 9 oz (255 g)</p>');
gleich(H.map((h) => `${h.oz}${h.einheit}${h.wert}`), ['20ml600', '17ml500', '9g255'], 'Herstellerwerte lesen');
gleich(ozTextErsetzen('20 oz', 'ml', H).text, '600 ml', 'Herstellerwert gewinnt (innerhalb 3 %)');
gleich(ozTextErsetzen('20 oz', 'ml', H).quelle, 'hersteller', 'Quelle Hersteller');
gleich(ozTextErsetzen('16 oz', 'ml', [{ oz: 16, wert: 590, einheit: 'ml' }]).art, 'konflikt', 'Widerspruch beim Hersteller (751): nicht umrechnen');
gleich(ozTextErsetzen('20 oz', 'ml', [{ oz: 20, wert: 608, einheit: 'ml' }]).text, '608 ml', 'knapp unter 3 % Abweichung: Hersteller');
gleich(ozTextErsetzen('20 oz', 'ml', [{ oz: 20, wert: 700, einheit: 'ml' }]).art, 'konflikt', 'über 3 %: Widerspruch');
gleich(ozUmrechnen(16, 'ml', [{ oz: 16, wert: 590, einheit: 'g' }]).wert, 473, 'Herstellerwert in anderer Einheit zählt nicht');
gleich(ozUmrechnen(20, 'ml', [{ oz: 16, wert: 590, einheit: 'ml' }]).wert, 591, 'Herstellerwert zu anderer oz-Zahl zählt nicht (kein Widerspruch)');
gleich(ozUmrechnen(20, 'ml', [{ oz: 16, wert: 473, einheit: 'ml' }, { oz: 20, wert: 600, einheit: 'ml' }]).wert, 600, 'passender Herstellerwert wird unter mehreren gefunden');
gleich(schuhLabel('574', '10', TAB), 'EU 44', 'Herren 10');
gleich(schuhLabel('575', '10', TAB), 'EU 42', 'Damen 10');
gleich(schuhLabel('574', '5.5', TAB), 'EU 38', 'Herren 5.5');
gleich(schuhLabel('574', '11.5', TAB), 'EU 46 (ca.)', 'unsicherer Wert trägt (ca.)');
gleich(schuhLabel('598', '6.5', TAB), 'EU 37 (ca.)', 'Slides Damen 6.5 unsicher');
gleich(schuhLabel('575', '11.5', TAB), 'EU 44', 'Damen 11.5 ist NICHT unsicher');
gleich(schuhLabel('597', '11.5', TAB), 'EU 46 (ca.)', 'Slides Herren 11.5 unsicher');
gleich(schuhLabel('597', '12.5', TAB), 'EU 47', 'Slides Herren 12.5 sicher');
gleich(schuhLabel('574', '99', TAB), null, 'unbekannte Grösse: kein Etikett');
gleich(schuhLabel('19', '11 oz', TAB), null, 'Tasse hat keine Schuhtabelle');
gleich(schuhLabel('574', '37.5', { 574: { '37.5': '37.5' } }), 'EU 37,5', 'Dezimalkomma');
for (const [pid, raws] of Object.entries(UNSICHER)) for (const r of raws) ok(TAB[pid]?.[r] != null, `UNSICHER ${pid}/${r} steht nicht in der Tabelle`);

// bauen(): Mini-Katalog
const mini = [
  { id: 19, title: 'Mug', productType: K.productType, description: '', variants: [{ id: 1, size: '11 oz' }, { id: 2, size: '15 oz' }] },
  { id: 751, title: 'Tumbler', productType: K.productType, description: '<p>16 oz. (590 ml)</p>', variants: [{ id: 3, size: '16 oz' }] },
  { id: 678, title: 'Bowl', productType: Napf.productType, description: '', variants: [{ id: 4, size: '18 oz' }] },
  { id: 574, title: 'Shoe', productType: {}, description: '', variants: [{ id: 5, size: '10' }, { id: 6, size: '99' }] },
  { id: 7, title: 'Shirt', productType: {}, description: '<p>fabric 4.2 oz./yd²</p>', variants: [{ id: 7, size: 'M' }, { id: 8, size: '4.2 oz./yd²' }] },
];
mini.push({ id: 764, title: 'Can Cooler', productType: { categoryPath: [{ title: 'Home & living' }, { title: 'Drinkware & coasters' }] }, description: '', variants: [{ id: 9, size: 'Regular 12 oz' }, { id: 10, size: 'Slim 12 oz' }] });
mini.push({ id: 690, title: 'Can-Shaped Glass (16 oz)', productType: K.productType, description: '', variants: [{ id: 11, size: '16 oz With Lid & Straw' }, { id: 12, size: '16 oz' }] });
const b = bauen(mini, TAB);
gleich(Object.keys(b.produkte).sort(), ['19', '574', '690', '764'], 'bauen: nur Produkte mit Etikett');
gleich(b.produkte['764'].map((e) => e.displaySizeCh), ['Regular (für Dosen à 355 ml)', 'Slim (für Dosen à 355 ml)'], 'bauen: Can Cooler nennt die Dosengrösse, kein Fassungsvermögen');
gleich(b.produkte['690'].map((e) => e.displaySizeCh), ['473 ml mit Deckel und Strohhalm', '473 ml'], 'bauen: Deckel-Zusatz übersetzt');
gleich(b.titel, { 690: 'Can-Shaped Glass (473 ml)' }, 'bauen: Titel mit ml nur wo oz im Titel steht');
gleich(b.produkte['19'].map((e) => e.displaySizeCh), ['325 ml', '444 ml'], 'bauen: Tasse');
gleich(b.protokoll.map((p) => p.art).sort(), ['konflikt', 'schuh-ohne-eu', 'unbekannt'], 'bauen: Protokoll nennt Konflikt, unbekannte Art und Schuh ohne EU');

// ---------- Etiketten: erzeugte Daten ----------
const alle = Object.entries(ET.produkte);
gleich([alle.length, alle.reduce((a, [, v]) => a + v.length, 0)], [31, 365], 'etiketten.json: 31 Produkte, 365 Varianten');
const schuhIds = Object.keys(TAB);
gleich(alle.filter(([pid]) => schuhIds.includes(pid)).reduce((a, [, v]) => a + v.length, 0), 292, 'alle 292 Schuhvarianten haben ein EU-Etikett');
ok(!alle.some(([pid]) => pid === '751' || pid === '678'), '751 und 678 sind nicht umgerechnet');
for (const [pid, v] of alle) for (const e of v) {
  if (schuhIds.includes(pid)) ok(/^EU \d+(,5)?( \(ca\.\))?$/.test(e.displaySizeCh), `Schuh-Etikett ${pid}/${e.id}: ${e.displaySizeCh}`);
  else ok(/\d+ (ml|g)\b/.test(e.displaySizeCh) && !/\boz\b/i.test(e.displaySizeCh), `Mengen-Etikett ${pid}/${e.id}: ${e.displaySizeCh}`);
  ok(e.displaySizeCh !== e.originalSize, `Etikett gleich Rohwert ${pid}/${e.id}`);
}
const ids = alle.flatMap(([, v]) => v.map((e) => e.id)); ok(new Set(ids).size === ids.length, 'Varianten-IDs eindeutig');
gleich(alle.flatMap(([, v]) => v).filter((e) => e.displaySizeCh.includes('(ca.)')).length, 20, '20 Schuhvarianten mit (ca.)');
gleich(ET.produkte['19'].map((e) => e.displaySizeCh), ['325 ml', '444 ml', '591 ml'], 'Tasse 19');
gleich(Object.keys(ET.titel).sort(), ['653', '690', '691', '861', '909', '935'], 'Titel mit ml/g für sechs Produkte (751 nicht)');
ok(!/\boz\b/i.test(Object.values(ET.titel).join(' ')), 'kein oz in den neuen Titeln');
gleich(ET.produkte['585'].map((e) => e.displaySizeCh), ['600 ml', '600 ml'], 'Tumbler 585: Herstellerwert 600 ml');

// ---------- Galerie ----------
const gal = JSON.parse(sich[DATEIEN.GALERIE]);
ok(JSON.stringify(gal, null, 2) + '\n' === sich[DATEIEN.GALERIE], 'Galerie: Rundreise byte-gleich (2 Leerzeichen + Zeilenumbruch)');
const neu = anwenden(sich, ET);
const gneu = JSON.parse(neu[DATEIEN.GALERIE]);
ok(JSON.stringify(gneu, null, 2) + '\n' === neu[DATEIEN.GALERIE], 'Galerie neu: gleiches Format');
const vorhandeneIds = new Set(gal.products.map((z) => String(z.productId)));
const etIds = Object.keys(ET.produkte);
gleich(gneu.products.length, gal.products.length + etIds.filter((p) => !vorhandeneIds.has(p)).length, 'Galerie: nur fehlende Produkte kommen als Zeilen dazu');
ok(new Set(gneu.products.map((z) => String(z.productId))).size === gneu.products.length, 'Galerie: keine doppelte productId');
for (const z of gal.products) {
  const zn = gneu.products.find((x) => String(x.productId) === String(z.productId));
  ok(!!zn, `Zeile ${z.productId} fehlt`);
  const { variants: _a, ...restAlt } = z; const { variants: _b, ...restNeu0 } = zn;
  const restNeu = { ...restNeu0 }; if (!('titleDe' in z) && 'titleDe' in restNeu) delete restNeu.titleDe;   // titleDe darf nur NEU dazukommen, nie geändert werden
  ok(JSON.stringify(restAlt) === JSON.stringify(restNeu), `Zeile ${z.productId}: Felder ausser variants (und neuem titleDe) verändert`);
  if (z.titleDe) ok(zn.titleDe === z.titleDe, `Zeile ${z.productId}: vorhandener titleDe überschrieben`);
  for (const v of z.variants || []) {
    const vn = (zn.variants || []).find((x) => String(x.id) === String(v.id));
    ok(!!vn, `Variante ${z.productId}/${v.id} fehlt`);
    const { displaySizeCh: _c, ...ra } = v; const { displaySizeCh: _d, ...rn } = vn || {};
    ok(JSON.stringify(ra) === JSON.stringify(rn), `Variante ${z.productId}/${v.id}: Bild oder anderes Feld verändert`);
  }
}
for (const [pid, v] of alle) {
  const zn = gneu.products.find((x) => String(x.productId) === pid);
  for (const e of v) { const x = zn.variants.find((y) => String(y.id) === String(e.id)); ok(x && x.displaySizeCh === e.displaySizeCh && x.originalSize === e.originalSize, `Galerie ${pid}/${e.id}: Etikett fehlt oder falsch`); }
}
for (const [pid, t] of Object.entries(ET.titel)) { const zn = gneu.products.find((x) => String(x.productId) === pid); const z = gal.products.find((x) => String(x.productId) === pid); ok(zn && zn.titleDe === (z?.titleDe || t), `Galerie ${pid}: titleDe ${zn?.titleDe}`); }
gleich(gneu.products.find((x) => String(x.productId) === '653').titleDe, 'Pint-Glas (473 ml)', 'vorhandener deutscher Titel von 653 bleibt');
// Bestehende Herstellerbilder bleiben: Zeilen mit reference.approved
gleich(gneu.products.filter((z) => z.reference?.approved === true).length, gal.products.filter((z) => z.reference?.approved === true).length, 'freigegebene Herstellerbilder bleiben alle erhalten');
// Idempotenz und Widerspruchsschutz
const doppelt = inGalerieEinfuegen(gneu, ET.produkte); gleich(doppelt.galerie, gneu, 'zweites Einfügen ändert nichts');
wirft(() => inGalerieEinfuegen(gal, { 653: [{ id: 16359, originalSize: '99 oz', displaySizeCh: 'x' }] }), 'Rohwert weicht ab', 'abweichender Rohwert wird abgelehnt');
wirft(() => anwenden({ ...sich, [DATEIEN.GALERIE]: sich[DATEIEN.GALERIE].replace('"schemaVersion": 1', '"schemaVersion": 2') }, ET), 'erwartete Format', 'falsche Schemaversion wird abgelehnt');
wirft(() => anwenden({ ...sich, [DATEIEN.GALERIE]: JSON.stringify(gal) }, ET), 'Rundreise', 'Galerie in anderem Format (kompakt) wird abgelehnt statt umformatiert');
wirft(() => anwenden({ ...sich, [DATEIEN.GALERIE]: sich[DATEIEN.GALERIE].replace(/\n$/, '') }, ET), 'Rundreise', 'Galerie ohne Schlusszeilenumbruch wird abgelehnt');

// ---------- Sprachdateien ----------
for (const [d, sp] of [[DATEIEN.DE, 'de'], [DATEIEN.EN, 'en']]) {
  const a = JSON.parse(ohneKommentar(sich[d])), nn = JSON.parse(ohneKommentar(neu[d]));
  const { luxe_clothing: la, ...ra } = a; const { luxe_clothing: ln, ...rn } = nn;
  ok(JSON.stringify(ra) === JSON.stringify(rn), `${d}: ausserhalb luxe_clothing verändert`);
  const geaendert = Object.keys(ln).filter((k) => k in la && JSON.stringify(la[k]) !== JSON.stringify(ln[k])).sort();
  gleich(geaendert, ['notice', 'shop_price_note'], `${d}: geänderte Schlüssel`);
  const neuK = Object.keys(ln).filter((k) => !(k in la)).sort();
  gleich(neuK, ['design_cta', 'not_orderable', 'offer_unavailable', 'switch_orderable', 'variant_not_orderable'], `${d}: neue Schlüssel`);
  for (const k of [...geaendert, ...neuK]) ok(ln[k] === TEXTE[sp][k], `${d}: Text ${k}`);
  ok(neu[d].startsWith('/*'), `${d}: Kopfkommentar bleibt erhalten`);
  ok(!/\bß\b|ß/.test(Object.values(TEXTE[sp]).join(' ')), `${d}: kein ß (Schweizer Rechtschreibung)`);
}
ok(TEXTE.de.design_cta !== 'Jetzt gestalten', 'Wortlaut unterscheidet sich vom Knopf der Vorschau-Seite («Jetzt gestalten»)');
ok(!/noch nicht verknüpft/i.test(TEXTE.de.notice + TEXTE.de.shop_price_note), 'alter Satz «noch nicht verknüpft» ist weg');

// ---------- Section ----------
{
  const a = sich[DATEIEN.SECTION].split('\n'), nn = neu[DATEIEN.SECTION].split('\n');
  const dazu = nn.filter((l) => !a.includes(l)); gleich(dazu.length, 5, 'Section: 5 neue Zeilen');
  ok(a.every((l) => nn.includes(l)), 'Section: keine Zeile entfernt');
  for (const k of ['design_cta', 'not_orderable', 'variant_not_orderable', 'switch_orderable', 'offer_unavailable']) ok(dazu.some((l) => l.includes(`'luxe_clothing.${k}'`)), `Section: Label ${k}`);
}

// ---------- CSS ----------
ok(neu[DATEIEN.CSS] === sich[DATEIEN.CSS].replace(/\s*$/, '\n') + CSS_NEU, 'CSS: Original plus angehängter Block');
ok(neu[DATEIEN.CSS].includes('.lcl-design-cta') && neu[DATEIEN.CSS].includes('.lcl-not-orderable'), 'CSS: Klassen vorhanden');
ok(neu[DATEIEN.CSS].includes('.lcl-design-switch:hover') && neu[DATEIEN.CSS].includes('border:1px solid #7a6a50'), 'CSS: Wechselknopf mit Hover und kräftigem Rand');

// ---------- JS ----------
{
  const jsAlt = sich[DATEIEN.JS], jsNeu = neu[DATEIEN.JS];
  const dir = mkdtempSync(join(tmpdir(), 'lxjs-')); writeFileSync(join(dir, 'a.js'), jsNeu);
  let syntaxOk = true; try { execFileSync(process.execPath, ['--check', join(dir, 'a.js')], { stdio: 'pipe' }); } catch { syntaxOk = false; }
  ok(syntaxOk, 'JS: Syntax');
  const altZ = jsAlt.split('\n'), neuZ = jsNeu.split('\n');
  const entfernt = altZ.filter((l) => !neuZ.includes(l));
  gleich(entfernt.length, 4, 'JS: genau 4 Originalzeilen verändert (Filter-Option, Filter-Chip, Preis-Zweig, Hinweis)');
  ok(entfernt.some((l) => l.includes('sizeFilter.replaceChildren')), 'JS: Filter-Option-Zeile');
  ok(entfernt.some((l) => l.includes('chosenFilters')), 'JS: Filter-Chip-Zeile');
  ok(entfernt.some((l) => l.includes("if(offer){priceBox.append")), 'JS: Preis-Zweig-Zeile');
  ok(entfernt.some((l) => l.includes("t('shop_price_note')")), 'JS: Hinweis-Zeile');
  ok(jsNeu.trimEnd().endsWith(`/* ${MARKE} */`), 'JS: Marke am Ende');
  for (const s of ['displaySize', 'originalSize', 'presentation.set', 'sizesFor', 'sortSizes']) ok(jsNeu.includes(s), `JS: ${s} unverändert vorhanden`);
  // joinSizeLabels aus dem neuen JS herauslösen und prüfen (metricText ersetzt durch einen Platzhalter)
  const m = jsNeu.match(/const joinSizeLabels = (\(labels, value\) => \{[^\n]*\});\n/); ok(!!m, 'JS: joinSizeLabels gefunden');
  if (m) {
    const f = new Function('config', 'metricText', `return (${m[1]});`)({ locale: 'de-CH' }, (v) => 'ROH:' + v);
    gleich(f(['EU 44', 'EU 42', '10'], '10'), 'EU 42 / EU 44', 'Filter: EU zuerst, Rohwert ohne EU (Kindergrösse) entfällt');
    gleich(f(['EU 37,5'], 'x'), 'EU 37,5', 'Filter: ein Etikett bleibt');
    gleich(f([], '7'), 'ROH:7', 'Filter: leer fällt auf den bisherigen Rohwert zurück');
    gleich(f(['10', 'EU 44', 'EU 42 (ca.)'], '10'), 'EU 42 (ca.) / EU 44', 'Filter: ca. bleibt sichtbar');
    gleich(f(['EU 36', 'EU 38'], '5.5'), 'EU 36 / EU 38', 'Filter: zwei EU-Etiketten');
    gleich(f(['EU 100', 'EU 9'], 'x'), 'EU 9 / EU 100', 'Filter: Etiketten werden numerisch sortiert (9 vor 100)');
    gleich(f(['EU 42,5', 'EU 42'], 'x'), 'EU 42 / EU 42,5', 'Filter: Dezimalkomma sortiert hinter der ganzen Zahl');
    gleich(f(['443 ml', '444 ml'], '15 oz'), '443–444 ml', 'Filter: ml als Bereich');
    gleich(f(['591 ml', '600 ml'], '20 oz'), '591–600 ml', 'Filter: ml als Bereich (20 oz)');
    gleich(f(['255 g', '113 g'], '9oz'), '113–255 g', 'Filter: g als Bereich');
    gleich(f(['1,5 ml', '2 ml'], 'x'), '1,5–2 ml', 'Filter: Dezimalkomma im Bereich');
    gleich(f(['16 oz', '473 ml'], '16 oz'), 'ROH:16 oz', 'Filter: Mischung mit Rest-oz bleibt beim bisherigen Verhalten');
    gleich(f(['355 ml', '12 g'], 'x'), 'ROH:x', 'Filter: verschiedene Einheiten bleiben beim bisherigen Verhalten');
    gleich(f(['12,7 × 17,8 cm', '12,7 × 17,78 cm'], 'x'), 'ROH:x', 'Filter: cm-Beinahe-Doppelungen bleiben beim bisherigen Verhalten (Prüferfund)');
    gleich(f(['Heart', 'Herz'], 'Heart'), 'ROH:Heart', 'Filter: Sprachmix bleibt beim bisherigen Verhalten (Prüferfund)');
  }
  ok(jsNeu.includes('joinSizeLabels(labels,value)') && jsNeu.includes('joinSizeLabels(sizeLabels,sizeFilter.value)'), 'JS: beide Filterstellen benutzen den Helfer');
  ok(jsNeu.includes('const switchBtn=') && (jsNeu.match(/switchBtn\(\)/g) || []).length === 2, 'JS: Wechselknopf in beiden Zweigen (nicht bestellbar und nicht lieferbar)');
  ok(jsNeu.includes("c.focus()"), 'JS: nach dem Wechsel geht der Fokus auf den Knopf');
  ok(jsNeu.includes('!known||!variants.length||data.requiresChoice'), 'JS: «kein Produkt» nur bei geladenen Details und eindeutigem Ergebnis (Prüferfund)');
  ok(jsNeu.includes("cta.dataset.lclDesignCta=''"), 'JS: Knopf trägt data-lcl-design-cta');
  ok(jsNeu.includes("offer.available===false"), 'JS: nicht lieferbare Angebote bekommen keinen Knopf');
}

// ---------- Produktseite: Sprung-Skript ----------
{
  const a = sich[DATEIEN.BUY], nn = neu[DATEIEN.BUY];
  ok(nn.split(SPRUNG_SKRIPT).length === 2, 'buy-buttons: Sprung-Skript genau einmal');
  ok(nn.replace(SPRUNG_SKRIPT, '') === a, 'buy-buttons: ohne das Skript identisch mit dem Original');
  ok(!/\{%|\{\{/.test(SPRUNG_SKRIPT), 'Sprung-Skript enthält kein Liquid');
  ok(SPRUNG_SKRIPT.includes("d.focus({ preventScroll: true })") && SPRUNG_SKRIPT.includes("'tabindex', '-1'"), 'Sprung-Skript setzt den Fokus auf den Editor (Tastatur, Screenreader)');
  ok(SPRUNG_SKRIPT.includes('e.ctrlKey || e.metaKey || e.shiftKey') && SPRUNG_SKRIPT.includes('e.button'), 'Sprung-Skript lässt Strg/Cmd/Umschalt- und Mittelklick durch');
  ok(SPRUNG_SKRIPT.includes('history.replaceState(history.state'), 'Sprung-Skript lässt history.state stehen');
  const i = nn.indexOf(MARKE), j = nn.indexOf('{% else %}', i); ok(i > 0 && j > i, 'Skript steht vor {% else %} (nur im Zweig lspod_designzwang)');
  const skript = SPRUNG_SKRIPT.replace(/<\/?script>/g, '');
  const dir = mkdtempSync(join(tmpdir(), 'lxsp-')); writeFileSync(join(dir, 's.js'), skript);
  let sOk = true; try { execFileSync(process.execPath, ['--check', join(dir, 's.js')], { stdio: 'pipe' }); } catch { sOk = false; }
  ok(sOk, 'Sprung-Skript: Syntax');

  // Verhalten in einer Attrappe (vm): Klick auf den Anker → scrollt 100 px über den Editor, setzt den Fokus, verhindert den nativen Sprung
  const lauf = (opt) => {
    const log = { scrollTo: [], opts: [], focus: [], timeouts: 0, replaced: [], listeners: {}, gesetzt: {} };
    const editor = { getBoundingClientRect: () => ({ top: 500 }), hasAttribute: (k) => k in log.gesetzt, setAttribute: (k, v) => { log.gesetzt[k] = v; }, style: {}, focus: (o) => log.focus.push(o) };
    const dok = { getElementById: (id) => (id === 'lspod-start' ? editor : null), addEventListener: (t, f) => { log.listeners['doc:' + t] = f; } };
    const fenster = { scrollY: 1000, scrollTo: (a, b) => { log.opts.push(a); log.scrollTo.push(typeof a === 'object' ? a.top : b); }, addEventListener: (t, f) => { log.listeners['win:' + t] = f; } };
    const ctx = { document: dok, window: fenster, location: { hash: opt.hash || '' }, history: { state: { x: 1 }, replaceState: (...a) => log.replaced.push(a) }, setTimeout: () => { log.timeouts++; } };
    vm.createContext(ctx); vm.runInContext(skript, ctx);
    return { log, ctx };
  };
  {
    const { log } = lauf({});
    const ev = { defaultPrevented: false, button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, prevented: false, preventDefault() { this.prevented = true; }, target: { closest: (sel) => (sel === 'a[href="#lspod-start"]' ? {} : null) } };
    log.listeners['doc:click'](ev);
    ok(ev.prevented, 'Sprung-Skript (Verhalten): Klick auf den Anker wird abgefangen');
    ok(log.scrollTo.length === 1 && log.scrollTo[0] === 500 + 1000 - 100, 'Sprung-Skript (Verhalten): scrollt 100 px über den Editor (' + log.scrollTo + ')');
    ok(log.opts[0] && log.opts[0].behavior === 'instant', 'Sprung-Skript (Verhalten): springt sofort (nicht animiert)');
    ok(log.focus.length === 1 && log.focus[0] && log.focus[0].preventScroll === true, 'Sprung-Skript (Verhalten): setzt den Fokus auf den Editor ohne Scrollen');
    ok(log.gesetzt.tabindex === '-1', 'Sprung-Skript (Verhalten): tabindex -1 gesetzt');
    ok(log.timeouts === 2, 'Sprung-Skript (Verhalten): zwei Nach-Korrekturen (' + log.timeouts + ')');
    ok(log.replaced.length === 1 && log.replaced[0][0].x === 1 && log.replaced[0][2] === '#lspod-start', 'Sprung-Skript (Verhalten): history.state bleibt erhalten');
    const ev2 = { ...ev, prevented: false, ctrlKey: true, preventDefault() { this.prevented = true; } };
    log.listeners['doc:click'](ev2);
    ok(!ev2.prevented && log.scrollTo.length === 1, 'Sprung-Skript (Verhalten): Strg-Klick bleibt nativ');
    const ev3 = { ...ev, prevented: false, target: { closest: () => null }, preventDefault() { this.prevented = true; } };
    log.listeners['doc:click'](ev3);
    ok(!ev3.prevented && log.scrollTo.length === 1, 'Sprung-Skript (Verhalten): fremder Klick bleibt unberührt');
  }
  {
    const { log } = lauf({ hash: '#lspod-start' });
    ok(typeof log.listeners['win:load'] === 'function', 'Sprung-Skript (Verhalten): mit #lspod-start in der Adresse wird beim Laden gesprungen');
    log.listeners['win:load']();
    ok(log.scrollTo.length === 1 && log.focus.length === 1, 'Sprung-Skript (Verhalten): Laden mit Anker scrollt und fokussiert');
    const { log: l2 } = lauf({ hash: '' });
    ok(!l2.listeners['win:load'], 'Sprung-Skript (Verhalten): ohne Anker in der Adresse kein Sprung beim Laden');
  }
}

// ---------- Doppelte Anwendung wird abgelehnt ----------
for (const [d, text] of Object.entries(neu)) {
  const andere = { ...sich, [d]: text };
  if (d === DATEIEN.GALERIE) { gleich(anwenden(andere, ET)[d], text, 'Galerie: zweites Anwenden ändert nichts (idempotent)'); continue; }
  wirft(() => anwenden(andere, ET), '', `zweites Anwenden auf ${d} wird abgelehnt`);
}
wirft(() => anwenden({ ...sich, [DATEIEN.JS]: sich[DATEIEN.JS].replace('const titleForProduct = product => {', 'const titleForProduct2 = product => {') }, ET), 'Anker', 'fehlender JS-Anker bricht ab');
wirft(() => anwenden({ ...sich, [DATEIEN.SECTION]: sich[DATEIEN.SECTION].replace(`"shop_product_link"`, `"x_link"`) }, ET), 'Anker', 'fehlender Section-Anker bricht ab');
wirft(() => anwenden({ ...sich, [DATEIEN.JS]: sich[DATEIEN.JS] + "\nreturn new Option(labels.length===1?labels[0]:metricText(value),value);" }, ET), 'kommt 2×', 'doppelt vorhandener JS-Anker bricht ab (nicht eindeutig)');
wirft(() => anwenden({ ...sich, [DATEIEN.BUY]: sich[DATEIEN.BUY] + "\n                if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setzen);\n                else setzen();\n              })();\n            </script>" }, ET), 'kommt 2×', 'buy-buttons-Anker doppelt: Skript wird nicht angehängt');
wirft(() => anwenden({ ...sich, [DATEIEN.BUY]: sich[DATEIEN.BUY].replace('else setzen();', 'else setzen2();') }, ET), 'Anker', 'fehlender buy-buttons-Anker bricht ab');


// ---------- Soll-Stand: gleich dem im Browser geprüften Stand ----------
{
  const gold = JSON.parse(readFileSync(new URL('./daten/pruefstand.json', import.meta.url), 'utf8'));
  for (const d of Object.values(DATEIEN)) gleich(createHash('md5').update(neu[d]).digest('hex'), gold.md5[d], `Soll-Stand ${d} (Browser-geprüfter Stand; bei bewusster Änderung Browsertest wiederholen und daten/pruefstand.json nachführen)`);
}

// ---------- Section, Produktseite, CSS, Texte: Verhalten statt Zeichenketten ----------
{
  // Section: jede neue Zeile ist ein gültiges Liquid-Paar «"schluessel": {{ 'luxe_clothing.schluessel' | t | json }},»
  const zeilen = neu[DATEIEN.SECTION].split('\n').filter((l) => !sich[DATEIEN.SECTION].split('\n').includes(l));
  gleich(zeilen.length, 5, 'Section: genau 5 neue Zeilen');
  for (const l of zeilen) ok(/^ {6}"(\w+)": \{\{ 'luxe_clothing\.\1' \| t \| json \}\},$/.test(l), `Section: Zeile gültig (json-Filter, gleicher Schlüssel): ${l}`);
  // Produktseite: Skript direkt hinter dem Skript des Ankers, Tags ausgeglichen, genau ein Skript mehr
  const a = sich[DATEIEN.BUY], nn = neu[DATEIEN.BUY];
  const zaehl = (t, re) => (t.match(re) || []).length;
  gleich(zaehl(nn, /<script>/g), zaehl(a, /<script>/g) + 1, 'buy-buttons: ein <script> mehr');
  gleich(zaehl(nn, /<\/script>/g), zaehl(a, /<\/script>/g) + 1, 'buy-buttons: ein </script> mehr');
  const ende = nn.indexOf(SPRUNG_SKRIPT);
  ok(ende > 0 && /<\/script>\s*$/.test(nn.slice(0, ende).replace(/[ \t]+$/, '')), 'buy-buttons: das neue Skript beginnt hinter dem </script> des vorhandenen (nicht mitten darin)');
  // CSS: Kontrast und Mindesthöhen
  const voll = (h) => (h && h.length === 4 ? '#' + h.slice(1).split('').map((c) => c + c).join('') : h);
  const lum = (hex) => { hex = voll(hex); const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const kontrast = (x, y) => { const [p, q] = [lum(x), lum(y)].sort((u, v) => v - u); return (p + 0.05) / (q + 0.05); };
  const regel = (sel) => { const m = CSS_NEU.match(new RegExp(sel.replace(/[.:]/g, '\\$&') + '\\{([^}]*)\\}')); return m ? m[1] : ''; };
  const cta = regel('.lcl-design-cta'), sw = regel('.lcl-design-switch');
  const bg = (cta.match(/background:(#[0-9a-f]{6})/i) || [])[1], fg = (cta.match(/(?:^|;)color:(#[0-9a-f]{3,6})/i) || [])[1] === '#fff' ? '#ffffff' : null;
  ok(bg && fg && kontrast(bg, fg) >= 4.5, `CSS: Knopf Kontrast >= 4,5 (${bg} auf ${fg})`);
  ok(Number((cta.match(/min-height:(\d+)px/) || [])[1]) >= 44, 'CSS: Knopf mindestens 44 px hoch');
  ok(Number((sw.match(/min-height:(\d+)px/) || [])[1]) >= 44, 'CSS: Wechselknopf mindestens 44 px hoch');
  const swBg = (sw.match(/background:(#[0-9a-f]{3,6})/i) || [])[1], swFg = (sw.match(/(?:^|;)color:(#[0-9a-f]{3,6})/i) || [])[1];
  ok(swBg && swFg && kontrast(swBg, swFg) >= 4.5, `CSS: Wechselknopf Kontrast >= 4,5 (${swFg} auf ${swBg})`);
  const swRand = (sw.match(/border:1px solid (#[0-9a-f]{6})/i) || [])[1];
  ok(swRand && kontrast(swRand, '#ffffff') >= 3, `CSS: Rand des Wechselknopfs Kontrast >= 3:1 (${swRand} auf weiss)`);
  ok(/\.lcl-design-cta:focus-visible\{outline:2px/.test(CSS_NEU) && /\.lcl-design-switch:focus-visible\{outline:2px/.test(CSS_NEU), 'CSS: sichtbarer Fokusring an beiden Knöpfen');
  // Texte: feste Erwartungswerte (nicht gegen dieselbe Konstante)
  const lies = (d) => JSON.parse(ohneKommentar(neu[d])).luxe_clothing;
  const de = lies(DATEIEN.DE), en = lies(DATEIEN.EN);
  gleich(de.design_cta, 'Jetzt selbst gestalten', 'Text de design_cta');
  gleich(en.design_cta, 'Design it yourself now', 'Text en design_cta');
  gleich(de.not_orderable, 'Noch nicht bestellbar: Für dieses Modell gibt es bei LuxeStyle noch kein Produkt zum Selbstgestalten.', 'Text de not_orderable');
  gleich(de.variant_not_orderable, 'Diese Ausführung ist noch nicht bestellbar. Andere Ausführungen dieses Modells kannst du gestalten.', 'Text de variant_not_orderable');
  gleich(de.switch_orderable, 'Zu einer bestellbaren Ausführung wechseln', 'Text de switch_orderable');
  gleich(de.offer_unavailable, 'Diese Ausführung ist derzeit nicht lieferbar.', 'Text de offer_unavailable');
  gleich(de.shop_price_note, 'Gestaltet und bestellt wird auf der Produktseite im Shop.', 'Text de shop_price_note');
  ok(/Europa-Tabelle/.test(de.notice) && /«Jetzt selbst gestalten»/.test(de.notice) && !/Gestaltung und Bestellung sind hier noch nicht verknüpft/.test(de.notice), 'Text de notice: Europa-Tabelle, Knopfname, alter Satz weg');
  ok(/European chart/.test(en.notice) && /«Design it yourself now»/.test(en.notice), 'Text en notice: englisch, Knopfname');
  for (const k of ['design_cta', 'not_orderable', 'variant_not_orderable', 'switch_orderable', 'offer_unavailable']) ok(typeof en[k] === 'string' && /^[A-Z]/.test(en[k]) && !/[äöüÄÖÜ]|\b(noch|nicht|Ausführung|Jetzt)\b/.test(en[k]), `Text en ${k}: englisch`);
  // Filterhelfer: Duplikate
  const m = neu[DATEIEN.JS].match(/const joinSizeLabels = (\(labels, value\) => \{[^\n]*\});\n/);
  const f = new Function('config', 'metricText', `return (${m[1]});`)({ locale: 'de-CH' }, (v) => 'ROH:' + v);
  gleich(f(['EU 44', 'EU 44'], 'x'), 'EU 44', 'Filter: gleiche Etiketten werden nicht verdoppelt');
  gleich(f(['EU 44', 'EU 42', 'EU 44'], 'x'), 'EU 42 / EU 44', 'Filter: Duplikate neben anderen Etiketten');
  gleich(f(['444 ml', '444 ml'], 'x'), '444 ml', 'Filter: gleiche ml-Etiketten bleiben ein Etikett');
  // Kaufbox: Bestellbarkeit zählt nur lieferbare Angebote, im Wechselknopf wird die erste bestellbare Ausführung gewählt
  ok(neu[DATEIEN.JS].includes("if(offer&&offer.available!==false)priceBox.append(el('p','lcl-small',t('shop_price_note')))"), 'JS: «Gestaltet und bestellt …» nur, wenn der Knopf steht (nicht bei nicht lieferbaren Ausführungen)');
  ok(/\.lcl-filters select\{text-overflow:ellipsis/.test(CSS_NEU), 'CSS: Grössenfilter kürzt lange Etiketten mit Auslassungszeichen');
  ok(de.notice.length <= 250 && en.notice.length <= 250, `Hinweis im festen Kopf bleibt kurz (de ${de.notice.length}, en ${en.notice.length} Zeichen)`);
  ok(neu[DATEIEN.JS].includes('const orderableVariants=variants.filter(v=>offersFor(v).offers.some(o=>o.available!==false));'), 'JS: bestellbar = mindestens ein Angebot mit available !== false');
  ok(neu[DATEIEN.JS].includes('orderableVariants.find(v=>colorKey(v)===selectedColor)||orderableVariants[0]'), 'JS: Wechsel wählt die bestellbare Ausführung der gleichen Farbe, sonst die erste');
}

// ---------- Daten: Etiketten gegen Tabelle und Rechnung ----------
{
  const tab = JSON.parse(readFileSync(new URL('./daten/schuh_eu_tabellen.json', import.meta.url), 'utf8'));
  const tabellen = tab.tabellen || tab;
  let schuhe = 0, oz = 0;
  for (const [pid, eintraege] of Object.entries(ET.produkte)) {
    for (const e of eintraege) {
      if (tabellen[pid]) { schuhe++; gleich(e.displaySizeCh, schuhLabel(pid, e.originalSize, tabellen), `Schuh-Etikett ${pid}/${e.originalSize}`); }
      else if (/\d (ml|g)\b/.test(e.displaySizeCh)) {
        oz++;
        const mm = /(\d[\d,]*) (ml|g)\b/.exec(e.displaySizeCh), ozWert = Number((/(\d+(?:\.\d+)?)\s*oz/i.exec(e.originalSize) || [])[1]);
        const rechnung = ozWert * (mm[2] === 'ml' ? 29.5735295625 : 28.349523125), wert = Number(mm[1].replace(',', '.'));
        ok(ozWert > 0 && Math.abs(wert - rechnung) / rechnung <= 0.03 + 1e-9, `oz-Etikett ${pid}/${e.originalSize} → ${e.displaySizeCh} weicht höchstens 3 % von der Rechnung ab`);
      }
    }
  }
  gleich(schuhe, 292, 'Daten: 292 Schuh-Etiketten gegen die Tabelle geprüft'); gleich(oz, 73, 'Daten: 73 oz-Etiketten gegen die Rechnung geprüft');
  for (const [pid, roh] of [['513', '11.5'], ['513', '12'], ['578', '11.5'], ['578', '12'], ['657', '11.5'], ['657', '12'], ['574', '11.5'], ['597', '11.5'], ['598', '6.5']]) ok(/\(ca\.\)/.test(schuhLabel(pid, roh, tabellen) || ''), `«(ca.)» bei ${pid}/${roh}`);
  // Herstellerwert deutlich UNTER der Rechnung ist ein Widerspruch, nicht Übernahme
  const unter = ozUmrechnen(20, 'ml', [{ oz: 20, wert: 473, einheit: 'ml' }]); ok(unter && unter.konflikt, 'Hersteller 473 ml bei 20 oz (Rechnung 591): Konflikt');
  const ueber = ozUmrechnen(20, 'ml', [{ oz: 20, wert: 709, einheit: 'ml' }]); ok(ueber && ueber.konflikt, 'Hersteller 709 ml bei 20 oz (Rechnung 591): Konflikt');
  const nahe = ozUmrechnen(20, 'ml', [{ oz: 20, wert: 600, einheit: 'ml' }]); ok(nahe && !nahe.konflikt && nahe.wert === 600, 'Hersteller 600 ml bei 20 oz (1,5 % ab): Herstellerwert gilt');
}

console.log(`${n} Prüfungen, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
