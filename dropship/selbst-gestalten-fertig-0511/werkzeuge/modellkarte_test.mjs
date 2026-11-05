// Tests für modellkarte.mjs (kein Netz). Lauf: /opt/node22/bin/node dropship/selbst-gestalten-fertig-0511/werkzeuge/modellkarte_test.mjs
// Echte Beispiele: die Katalogdateien liegen unverändert in testdaten/katalog/ (Printful-API, geholt 05.11.2026):
//   71 T-Shirt · 19 Tasse · 268 Poster (cm) · 798 iPhone-Hülle · 206 Dad-Cap · 388 Allover-Hoodie (die sechs der Aufgabe)
//   574 Schuh · 861 Kerze · 764 Dosenkühler · 769 Strickpullover (Randfälle: Schuh, nur USA, Strick)
// Erwartete Werte sind aus den Katalogdaten VON HAND gerechnet (Pixel / dpi × 2,54 = cm; Rechnung im Kommentar), nicht aus dem Code abgeleitet.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { modellkarteBauen, klassifizieren, unterstuetzungEintrag, platzierungTitelDe, KLASSEN, SCHEMA } from './modellkarte.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const lade = (id) => JSON.parse(readFileSync(join(HIER, 'testdaten', 'katalog', `${id}.json`), 'utf8'));
const karten = {};
for (const id of [71, 19, 268, 798, 206, 388, 574, 861, 764, 769]) karten[id] = modellkarteBauen(lade(id));

let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)}\n   soll: ${JSON.stringify(b)}`); } };
const wirft = (n, f, teil) => { let m = ''; try { f(); } catch (e) { m = String(e.message); } ist(n, m.includes(teil), true); };
const pl = (k, id) => k.platzierungen.find((p) => p.id === id);
const codes = (k) => k.hinweise.map((h) => (h.art === 'einschraenkung' ? '!' : '') + h.code);

// ── Schema: jede der zehn Karten hat alle Felder in der richtigen Form
const KOPF = ['schema', 'erzeugtAus', 'printfulProductId', 'typ', 'typName', 'titelEn', 'titelDe', 'titelDeStatus', 'marke', 'modell', 'bildUrl', 'klasse', 'klasseGrund', 'klasseGrundCode', 'technischeKlasse', 'technischerGrund', 'technischerGrundCode', 'panelAnzahl', 'techniken', 'standardTechnik', 'platzierungen', 'nichtImEditor', 'druckdateien', 'druckdateiGruppen', 'optionen', 'varianten', 'groessentabelle', 'produktMasse', 'beschreibung', 'lieferbarkeit', 'kosten', 'hinweise'];
for (const [id, k] of Object.entries(karten)) {
  ist(`${id}: alle Felder der Karte`, KOPF.filter((f) => !(f in k)), []);
  ist(`${id}: schema 1, ID, keine internen Felder`, [k.schema, k.printfulProductId, '_intern' in k], [SCHEMA, Number(id), false]);
  ist(`${id}: titelDe ist Platzhalter (null), titelEn gesetzt`, [k.titelDe, k.titelDeStatus, typeof k.titelEn], [null, 'platzhalter', 'string']);
  ist(`${id}: Klasse ist eine der vier`, [KLASSEN.includes(k.klasse), KLASSEN.includes(k.technischeKlasse)], [true, true]);
  ist(`${id}: Varianten = Katalog (${lade(id).varianten.length})`, k.varianten.length, lade(id).varianten.length);
  ist(`${id}: Summe der Druckdatei-Gruppen = Varianten`, k.druckdateiGruppen.reduce((s, g) => s + g.anzahlVarianten, 0), k.varianten.length);
  ist(`${id}: jede Variante zeigt auf eine vorhandene Druckdatei-Gruppe`, k.varianten.every((v) => Number.isInteger(v.druckdateiGruppe) && v.druckdateiGruppe >= 0 && v.druckdateiGruppe < k.druckdateiGruppen.length), true);
  ist(`${id}: jede Gruppe nennt nur vorhandene Druckdateien`, k.druckdateiGruppen.every((g) => Object.values(g.platzierungen).every((p) => p in k.druckdateien)), true);
  ist(`${id}: Platzierungen: Druckdatei und Vorlage sind Zahlen`, k.platzierungen.every((p) => ['breitePx', 'hoehePx', 'dpi'].every((f) => typeof p.printfile[f] === 'number' && p.printfile[f] > 0)
    && ['vorlageBreite', 'vorlageHoehe', 'flaecheLinks', 'flaecheOben', 'flaecheBreite', 'flaecheHoehe'].every((f) => typeof p.vorlage[f] === 'number')), true);
  ist(`${id}: Standard-Druckdatei steht in der Registerliste und ist gleich`, k.platzierungen.every((p) => JSON.stringify(k.druckdateien[p.printfile.printfileId]) === JSON.stringify(p.printfile)), true);
  ist(`${id}: jede Platzierung hat mindestens eine Geometrie, die Standardgeometrie ist darunter`, k.platzierungen.every((p) => p.geometrien.length >= 1 && p.geometrien.some((g) => g.vorlage.vorlageId === p.vorlage.vorlageId)), true);
  ist(`${id}: kollidiertMitImEditor ist Teilmenge von kollidiertMit und der Platzierungen`, k.platzierungen.every((p) => p.kollidiertMitImEditor.every((x) => p.kollidiertMit.includes(x) && k.platzierungen.some((q) => q.id === x))), true);
  ist(`${id}: Platzierungs-Art und Technik gesetzt`, k.platzierungen.every((p) => ['flaeche', 'etikett'].includes(p.art) && typeof p.technik === 'string'), true);
  ist(`${id}: Hinweise haben Code, Art, Text, Quelle`, k.hinweise.every((h) => h.code && ['einschraenkung', 'info'].includes(h.art) && h.text && ['katalog', 'annahme'].includes(h.quelle)), true);
  ist(`${id}: Farben und Grössen vorhanden`, [k.optionen.farbe.length > 0, k.optionen.groesse.length > 0], [true, true]);
  ist(`${id}: Anzahl Varianten je Farbe und je Grösse ergibt die Variantenzahl`, [k.optionen.farbe.reduce((s, f) => s + f.anzahlVarianten, 0), k.optionen.groesse.reduce((s, f) => s + f.anzahlVarianten, 0)], [k.varianten.length, k.varianten.length]);
  ist(`${id}: Lieferbarkeit stimmt mit den Varianten`, [k.lieferbarkeit.euInStock, k.lieferbarkeit.euBestellbar], [k.varianten.filter((v) => v.lieferbarEU).length, k.varianten.filter((v) => v.lieferbarEU || v.lieferbarEUAufAnfrage).length]);
}
// Zweimal bauen ergibt dasselbe (kein Zufall, keine Uhr)
ist('Bauen ist deterministisch', JSON.stringify(modellkarteBauen(lade(388))), JSON.stringify(karten[388]));
// Die Eingabe wird nicht verändert
{ const a = lade(206); const vorher = JSON.stringify(a); modellkarteBauen(a); ist('Eingabe bleibt unverändert', JSON.stringify(a), vorher); }
wirft('keine Katalogdatei → Fehler', () => modellkarteBauen({}), 'keine Katalogdatei');
wirft('null → Fehler', () => modellkarteBauen(null), 'keine Katalogdatei');

// ═══ 71 T-Shirt (Bella + Canvas 3001, DTG) ═══
{
  const k = karten[71];
  ist('71: FLACH', [k.klasse, k.klasseGrundCode, k.technischeKlasse, k.panelAnzahl], ['FLACH', 'flach', 'FLACH', null]);
  ist('71: Standardtechnik DTG, drei Techniken (DTG, Stickerei, DTF)', [k.standardTechnik, k.techniken.map((t) => t.key)], ['DTG', ['DTG', 'EMBROIDERY', 'DTFILM']]);
  ist('71: Platzierungen mit Druckdatei und Vorlage', k.platzierungen.map((p) => p.id), ['front', 'front_large', 'back', 'sleeve_left', 'sleeve_right', 'label_inside', 'label_outside', 'label_inside_dtf']);
  ist('71: 5 Flächen und 3 Etiketten', [k.platzierungen.filter((p) => p.art === 'flaeche').length, k.platzierungen.filter((p) => p.art === 'etikett').length], [5, 3]);
  ist('71: deutsche Titel', k.platzierungen.map((p) => p.titelDe), ['Vorderseite', 'Vorderseite gross', 'Rückseite', 'Ärmel links', 'Ärmel rechts', 'Etikett innen', 'Etikett aussen', 'Etikett innen (DTF)']);
  ist('71: Auftragsschlüssel der Vorderseite ist «default», der Rückseite «back»', [pl(k, 'front').dateiTyp, pl(k, 'back').dateiTyp], ['default', 'back']);
  // Vorderseite: Druckdatei 1 = 1800 × 2400 px bei 150 dpi = 12″ × 16″ = 30,48 × 40,64 cm → 30,5 × 40,6
  ist('71: Vorderseite Druckdatei 1800×2400 @150 dpi = 30,5 × 40,6 cm', pl(k, 'front').printfile, { printfileId: 1, breitePx: 1800, hoehePx: 2400, dpi: 150, fillMode: 'fit', kannDrehen: false, groesseCm: { breite: 30.5, hoehe: 40.6 } });
  ist('71: Vorderseite Vorlage: Fläche 1010×1346 bei (1006, 530) im 3000×3000-Bild', [pl(k, 'front').vorlage.vorlageBreite, pl(k, 'front').vorlage.vorlageHoehe, pl(k, 'front').vorlage.flaecheLinks, pl(k, 'front').vorlage.flaecheOben, pl(k, 'front').vorlage.flaecheBreite, pl(k, 'front').vorlage.flaecheHoehe], [3000, 3000, 1006, 530, 1010, 1346]);
  ist('71: Vorderseite hat ein Vorlagenbild (eine Geometrie)', [typeof pl(k, 'front').vorlage.bildUrl, pl(k, 'front').geometrien.length], ['string', 1]);
  ist('71: grosse Vorderseite 2250×2700 (45,7 × 38,1 cm: 2250/150 = 15″ = 38,1; 2700/150 = 18″ = 45,72)', pl(k, 'front_large').printfile.groesseCm, { breite: 38.1, hoehe: 45.7 });
  ist('71: Ärmel 600×525 @150 = 10,2 × 8,9 cm', pl(k, 'sleeve_left').printfile.groesseCm, { breite: 10.2, hoehe: 8.9 });
  ist('71: Aufpreise USD: Vorderseite –, gross 5.95, hinten 5.95, Ärmel 2.49', [pl(k, 'front').aufpreisUsd, pl(k, 'front_large').aufpreisUsd, pl(k, 'back').aufpreisUsd, pl(k, 'sleeve_left').aufpreisUsd, pl(k, 'sleeve_right').aufpreisUsd], [null, 5.95, 5.95, 2.49, 2.49]);
  ist('71: Etiketten-Aufpreise 0.99 innen, 2.49 aussen', [pl(k, 'label_inside').aufpreisUsd, pl(k, 'label_outside').aufpreisUsd], [0.99, 2.49]);
  ist('71: Konflikt: Vorderseite schliesst «front_large» aus', pl(k, 'front').kollidiertMit.includes('front_large'), true);
  ist('71: Konflikt im Editor: Vorderseite ↔ Vorderseite gross', pl(k, 'front').kollidiertMitImEditor, ['front_large']);
  ist('71: nicht im Editor (ohne Druckdatei/Vorlage): 4 Stickereien und 4 DTF-Platzierungen', k.nichtImEditor.map((x) => x.platzierung), ['embroidery_chest_left', 'embroidery_chest_center', 'embroidery_sleeve_left_top', 'embroidery_sleeve_right_top', 'front_dtf', 'back_dtf', 'short_sleeve_left_dtf', 'short_sleeve_right_dtf']);
  ist('71: Stickerei-Aufpreis 2.95 steht bei den nicht gezeichneten Dateien', k.nichtImEditor.find((x) => x.platzierung === 'embroidery_chest_left').aufpreisUsd, 2.95);
  ist('71: das Mockup («preview») ist keine Platzierung', k.nichtImEditor.some((x) => x.platzierung === 'mockup'), false);
  ist('71: 628 Varianten, 84 Farben, 1 Druckdatei-Gruppe, 5 Druckdateien', [k.varianten.length, k.optionen.farbe.length, k.druckdateiGruppen.length, Object.keys(k.druckdateien).length], [628, 84, 1, 5]);
  ist('71: Grössen in der Reihenfolge des Katalogs XS…5XL, unverändert', k.optionen.groesse.map((x) => x.anzeige), ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']);
  ist('71: Variante 4025 (Aqua, 2XL): Preis 13.92 USD, Hex, EU in_stock', (({ printfulVariantId, farbe, farbeHex, groesse, groesseAnzeige, kostenUsd, lieferbarEU, statusEU, druckdateiGruppe }) => ({ printfulVariantId, farbe, farbeHex, groesse, groesseAnzeige, kostenUsd, lieferbarEU, statusEU, druckdateiGruppe }))(k.varianten.find((v) => v.printfulVariantId === 4025)),
    { printfulVariantId: 4025, farbe: 'Aqua', farbeHex: '#008db5', groesse: '2XL', groesseAnzeige: '2XL', kostenUsd: 13.92, lieferbarEU: true, statusEU: 'in_stock', druckdateiGruppe: 0 });
  ist('71: Kosten 11.92 bis 19.92 USD', [k.kosten.min, k.kosten.max], [11.92, 19.92]);
  ist('71: EU teilweise: 329 von 628 Varianten bestellbar, USA 626', [k.lieferbarkeit.euBestellbar, k.lieferbarkeit.varianten, k.lieferbarkeit.usInStock, k.lieferbarkeit.nurUs, k.lieferbarkeit.keinEu], [329, 628, 626, false, false]);
  ist('71: Hinweise', codes(k), ['aufpreis', 'stickerei_nicht_im_editor', 'eu_teilweise']);
  ist('71: Beschreibung in Schweizer Mass: Stoffgewicht 142 g/m², kein oz/yd² mehr', [k.beschreibung.metrisch.includes('142 g/m²'), /oz\.?\/yd/.test(k.beschreibung.metrisch), k.beschreibung.original.includes('oz./yd.')], [true, false, true]);
  const my = k.groessentabelle.tabellen.find((t) => t.typ === 'measure_yourself');
  ist('71: Grössentabelle in cm: Länge XS 27″ = 68,6 cm', my.messungen.find((m) => m.label === 'Length').werte.find((w) => w.groesse === 'XS').anzeige, '68,6 cm');
  ist('71: Vorlagenbild der Rückseite ist die Rückansicht mit anderer Fläche (987, 224, 1031×1375)', [pl(k, 'back').vorlage.flaecheLinks, pl(k, 'back').vorlage.flaecheOben, pl(k, 'back').vorlage.flaecheBreite, pl(k, 'back').vorlage.flaecheHoehe], [987, 224, 1031, 1375]);
}

// ═══ 19 Tasse (11/15/20 oz, Sublimation) ═══
{
  const k = karten[19];
  ist('19: FLACH, 1 Platzierung «default» / Druckfläche', [k.klasse, k.platzierungen.map((p) => p.id), k.platzierungen[0].titelDe], ['FLACH', ['default'], 'Druckfläche']);
  // Druckdatei 43: 2700 × 1050 px bei 300 dpi = 9″ × 3,5″ = 22,86 × 8,89 cm → 22,9 × 8,9
  ist('19: Standard-Druckdatei 2700×1050 @300 = 22,9 × 8,9 cm', pl(k, 'default').printfile, { printfileId: 43, breitePx: 2700, hoehePx: 1050, dpi: 300, fillMode: 'fit', kannDrehen: false, groesseCm: { breite: 22.9, hoehe: 8.9 } });
  ist('19: Vorlage: Fläche 671×261 bei (29, 163) im 728×728-Bild', (({ vorlageBreite, vorlageHoehe, flaecheLinks, flaecheOben, flaecheBreite, flaecheHoehe }) => [vorlageBreite, vorlageHoehe, flaecheLinks, flaecheOben, flaecheBreite, flaecheHoehe])(pl(k, 'default').vorlage), [728, 728, 29, 163, 671, 261]);
  ist('19: drei Druckdateien (43, 44, 426), je Variante eine Gruppe, drei Geometrien', [Object.keys(k.druckdateien).sort(), k.druckdateiGruppen.length, pl(k, 'default').geometrien.length], [['426', '43', '44'], 3, 3]);
  ist('19: Grössen in ml (11/15/20 oz = 325/444/591 ml)', k.optionen.groesse.map((x) => [x.wert, x.anzeige, x.geaendert, x.markiert]), [['11 oz', '325 ml', true, false], ['15 oz', '444 ml', true, false], ['20 oz', '591 ml', true, false]]);
  ist('19: Variantenbezeichnung in ml, Preis 6.07', (({ groesse, groesseAnzeige, kostenUsd }) => [groesse, groesseAnzeige, kostenUsd])(k.varianten.find((v) => v.printfulVariantId === 1320)), ['11 oz', '325 ml', 6.07]);
  ist('19: Kosten 6.07 bis 9.69 USD', [k.kosten.min, k.kosten.max], [6.07, 9.69]);
  ist('19: Masse des Katalogs in Schweizer Mass («11oz» 9x3.5″ = 22,9 × 8,9 cm)', k.produktMasse.map((m) => [m.schluesselAnzeige, m.cm, m.anzeige]), [['325 ml', [22.9, 8.9], '22,9 × 8,9 cm'], ['444 ml', [22.9, 9.7], '22,9 × 9,7 cm']]);
  ist('19: Beschreibung: kein «oz» und kein Zoll mehr; Höhe 9,6 cm vom Hersteller', [/\boz\b/.test(k.beschreibung.metrisch), /″/.test(k.beschreibung.metrisch), k.beschreibung.metrisch.includes('9,6 cm in height')], [false, false, true]);
  ist('19: Hinweise: Druckdatei je Variante, Rundumdruck (Annahme)', [codes(k), k.hinweise.find((h) => h.code === 'rundumdruck').quelle], [['druckdatei_je_variante', 'rundumdruck'], 'annahme']);
  ist('19: Farbe «White» ohne Hex bleibt null', [k.optionen.farbe.length, k.optionen.farbe[0].name, k.optionen.farbe[0].hex], [1, 'White', null]);
  ist('19: alle drei EU-bestellbar', [k.lieferbarkeit.euBestellbar, k.lieferbarkeit.varianten, k.lieferbarkeit.regionen.includes('EU')], [3, 3, true]);
  ist('19: Variante → Gruppe → Druckdatei: 15 oz hat die Datei 44 (2700×1140)', (() => { const v = k.varianten.find((x) => x.groesse === '15 oz'); const pf = k.druckdateien[k.druckdateiGruppen[v.druckdateiGruppe].platzierungen.default]; return [pf.printfileId, pf.breitePx, pf.hoehePx]; })(), [44, 2700, 1140]);
}

// ═══ 268 Poster (cm) ═══
{
  const k = karten[268];
  ist('268: FLACH, eine Platzierung', [k.klasse, k.platzierungen.length], ['FLACH', 1]);
  ist('268: 7 Varianten, 7 Druckdateien, 7 Gruppen, 7 Geometrien', [k.varianten.length, Object.keys(k.druckdateien).length, k.druckdateiGruppen.length, pl(k, 'default').geometrien.length], [7, 7, 7, 7]);
  ist('268: Hinweis: Druckdatei hängt von der Variante ab', codes(k), ['druckdatei_je_variante']);
  ist('268: Grössen schon metrisch und unverändert', k.optionen.groesse.map((x) => [x.anzeige, x.geaendert]), [['A1 (59.4×84.1 cm)', false], ['A2 (42×59.4 cm)', false], ['21×30 cm', false], ['30×40 cm', false], ['50×70 cm', false], ['61×91 cm', false], ['70×100 cm', false]]);
  // Die Druckdatei jeder Variante passt zur Grösse in der Bezeichnung (Pixel / 300 dpi × 2,54 = cm): beweist die Verknüpfung Variante → Gruppe → Druckdatei
  const bezeichnungen = k.varianten.map((v) => {
    const m = v.groesse.match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)/);
    const pf = k.druckdateien[k.druckdateiGruppen[v.druckdateiGruppe].platzierungen.default];
    const soll = [Number(m[1]), Number(m[2])].sort((a, b) => a - b);
    const hat = [pf.breitePx / pf.dpi * 2.54, pf.hoehePx / pf.dpi * 2.54].sort((a, b) => a - b);
    return Math.abs(hat[0] - soll[0]) / soll[0] < 0.01 && Math.abs(hat[1] - soll[1]) / soll[1] < 0.01;
  });
  ist('268: bei allen 7 Varianten passt die Druckdatei zur Grösse in der Bezeichnung (±1 %)', bezeichnungen, [true, true, true, true, true, true, true]);
  // A1: 9933 × 7016 px bei 300 dpi = 33,11″ × 23,39″ = 84,1 × 59,4 cm
  ist('268: Variante A1 (19515) → Druckdatei 621 = 84,1 × 59,4 cm', (() => { const v = k.varianten.find((x) => x.printfulVariantId === 19515); const pf = k.druckdateien[k.druckdateiGruppen[v.druckdateiGruppe].platzierungen.default]; return [pf.printfileId, pf.groesseCm]; })(), [621, { breite: 84.1, hoehe: 59.4 }]);
  ist('268: Druckdatei darf gedreht werden (can_rotate), Füllung «cover»', [pl(k, 'default').printfile.kannDrehen, pl(k, 'default').printfile.fillMode], [true, 'cover']);
  ist('268: kein Aufpreis, keine nicht gezeichneten Dateien', [pl(k, 'default').aufpreisUsd, k.nichtImEditor.length], [null, 0]);
  ist('268: Kosten 8.32 bis 20.76 USD, alle 7 EU', [k.kosten.min, k.kosten.max, k.lieferbarkeit.euBestellbar], [8.32, 20.76, 7]);
  ist('268: keine Farbe im Katalog (null) → eine Farbgruppe ohne Namen', [k.optionen.farbe.length, k.optionen.farbe[0].name], [1, null]);
}

// ═══ 798 MagSafe-Hülle für iPhone ═══
{
  const k = karten[798];
  ist('798: FLACH ohne Hinweise', [k.klasse, codes(k)], ['FLACH', []]);
  // Druckdatei 331: 1392 × 2220 px bei 300 dpi = 4,64″ × 7,4″ = 11,79 × 18,80 cm
  ist('798: Druckdatei 1392×2220 @300 = 11,8 × 18,8 cm', pl(k, 'default').printfile.groesseCm, { breite: 11.8, hoehe: 18.8 });
  ist('798: 36 Varianten teilen EINE Druckdatei, 2 Oberflächen (Glossy/Matte), 18 Modelle je Oberfläche', [k.varianten.length, k.druckdateiGruppen.length, k.optionen.farbe.map((f) => `${f.name}:${f.anzahlVarianten}`)], [36, 1, ['Glossy:18', 'Matte:18']]);
  ist('798: Gerätenamen bleiben unverändert', k.optionen.groesse.every((x) => !x.geaendert && !x.markiert && /^iPhone /.test(x.anzeige)), true);
  ist('798: Standardvorlage: Fläche 1377×2200 bei (812, 400)', [pl(k, 'default').vorlage.flaecheBreite, pl(k, 'default').vorlage.flaecheHoehe, pl(k, 'default').vorlage.flaecheLinks, pl(k, 'default').vorlage.flaecheOben], [1377, 2200, 812, 400]);
  ist('798: fünf Vorlagen-Geometrien (je Modellgruppe), Standard = die häufigste (24 Varianten)', [pl(k, 'default').geometrien.map((g) => g.anzahlVarianten), pl(k, 'default').vorlageBeispielVarianteId], [[24, 2, 2, 4, 4], 20687]);
  ist('798: verdichtete Katalogdatei: Vorlagenbild nur für die Beispielvariante der Standardgeometrie', pl(k, 'default').geometrien.map((g) => typeof g.vorlage.bildUrl), ['string', 'object', 'object', 'object', 'object']);
  ist('798: alle 36 in der EU bestellbar', [k.lieferbarkeit.euBestellbar, k.lieferbarkeit.nurUs], [36, false]);
  ist('798: Kosten 16.27 USD', [k.kosten.min, k.kosten.max], [16.27, 16.27]);
}

// ═══ 206 Dad-Cap (Stickerei) ═══
{
  const k = karten[206];
  ist('206: FLACH_MIT_HINWEIS (Stickerei, Kappe)', [k.klasse, k.klasseGrundCode, k.technischeKlasse, k.standardTechnik], ['FLACH_MIT_HINWEIS', 'stickerei+kappe', 'FLACH_MIT_HINWEIS', 'EMBROIDERY']);
  ist('206: vier Stick-Flächen mit Druckdatei', k.platzierungen.map((p) => [p.id, p.dateiTyp, p.technik]), [['embroidery_front_large', 'embroidery_front_large', 'EMBROIDERY'], ['embroidery_back', 'back', 'EMBROIDERY'], ['embroidery_right', 'right', 'EMBROIDERY'], ['embroidery_left', 'left', 'EMBROIDERY']]);
  // Druckdatei 75: 1650 × 600 px bei 300 dpi = 5,5″ × 2″ = 13,97 × 5,08 cm; Druckdatei 76: 600 × 300 = 2″ × 1″ = 5,08 × 2,54 cm
  ist('206: Front gross 1650×600 @300 = 14 × 5,1 cm', pl(k, 'embroidery_front_large').printfile.groesseCm, { breite: 14, hoehe: 5.1 });
  ist('206: hinten/rechts/links 600×300 @300 = 5,1 × 2,5 cm', ['embroidery_back', 'embroidery_right', 'embroidery_left'].map((i) => pl(k, i).printfile.groesseCm), [{ breite: 5.1, hoehe: 2.5 }, { breite: 5.1, hoehe: 2.5 }, { breite: 5.1, hoehe: 2.5 }]);
  ist('206: Aufpreis 2.95 USD je Fläche', k.platzierungen.map((p) => p.aufpreisUsd), [2.95, 2.95, 2.95, 2.95]);
  ist('206: Standard-Vorderseite «embroidery_front» hat KEINE Druckdatei: steht unter nichtImEditor, dazu DTF-Mütze 2.95', k.nichtImEditor.map((x) => [x.platzierung, x.aufpreisUsd]), [['embroidery_front', null], ['front_dtf_hat', 2.95]]);
  ist('206: Hinweise', codes(k), ['aufpreis', 'stickerei_nicht_im_editor', 'standardflaeche_ohne_druckdatei', 'eu_teilweise', '!stickerei', '!kappe']);
  const st = k.hinweise.find((h) => h.code === 'stickerei');
  ist('206: Stickerei-Hinweis nennt 15 Garnfarben (aus den Produktoptionen) und «Unlimited color» (aus den Dateioptionen)', [st.text.includes('15 Garnfarben'), st.text.includes('Unlimited color'), st.quelle], [true, true, 'katalog']);
  ist('206: Kappen-Hinweis ist eine Annahme', k.hinweise.find((h) => h.code === 'kappe').quelle, 'annahme');
  ist('206: 11 Varianten in 11 Farben, «One size», 10 davon in der EU', [k.varianten.length, k.optionen.farbe.length, k.optionen.groesse[0].anzeige, k.lieferbarkeit.euBestellbar], [11, 11, 'One size', 10]);
  ist('206: Kappen-Masse A–D (Zoll) in cm', k.groessentabelle.tabellen[0].messungen.map((m) => m.einheit), ['cm', 'cm', 'cm', 'cm']);
}

// ═══ 388 Allover-Hoodie (Cut & Sew) ═══
{
  const k = karten[388];
  ist('388: PANEL mit 6 Schnittteilen', [k.klasse, k.klasseGrundCode, k.technischeKlasse, k.panelAnzahl], ['PANEL', 'schnittteile', 'PANEL', 6]);
  ist('388: Flächen (Schnittteile)', k.platzierungen.filter((p) => p.art === 'flaeche').map((p) => p.id), ['front', 'back', 'sleeve_right', 'sleeve_left', 'pocket', 'hood']);
  ist('388: Etiketten zählen nicht als Schnittteil', k.platzierungen.filter((p) => p.art === 'etikett').map((p) => p.id), ['label_panel', 'label_inside']);
  ist('388: Standardtechnik CUT-SEW', k.standardTechnik, 'CUT-SEW');
  // Jedes Schnittteil hat dieselbe Druckdatei 200: 6000 × 6000 px bei 150 dpi = 40″ = 101,6 cm (Datei, nicht Teilgrösse)
  ist('388: alle sechs Schnittteile nutzen Druckdatei 200 = 6000×6000 @150 (101,6 cm Datei)', k.platzierungen.filter((p) => p.art === 'flaeche').map((p) => [p.printfile.printfileId, p.printfile.breitePx, p.printfile.hoehePx, p.printfile.groesseCm.breite]), Array(6).fill([200, 6000, 6000, 101.6]));
  ist('388: Innenetikett 375×150 @150 = 6,4 × 2,5 cm', pl(k, 'label_inside').printfile.groesseCm, { breite: 6.4, hoehe: 2.5 });
  ist('388: Vorderteil: Fläche 2636×2636 bei (182, −14) im 3000×3000-Bild', [pl(k, 'front').vorlage.flaecheBreite, pl(k, 'front').vorlage.flaecheHoehe, pl(k, 'front').vorlage.flaecheLinks, pl(k, 'front').vorlage.flaecheOben], [2636, 2636, 182, -14]);
  ist('388: Ärmel: Fläche = ganzes Vorlagenbild 3000×3000', [pl(k, 'sleeve_left').vorlage.flaecheBreite, pl(k, 'sleeve_left').vorlage.flaecheHoehe], [3000, 3000]);
  ist('388: kein Aufpreis, nichts ausserhalb des Editors', [k.platzierungen.every((p) => p.aufpreisUsd === null), k.nichtImEditor.length], [true, 0]);
  ist('388: Taschen- und Kapuzenteil schliessen nur ihre Stoffdruck-Entsprechung aus (nicht im Editor)', [pl(k, 'pocket').kollidiertMit, pl(k, 'pocket').kollidiertMitImEditor], [['pocket_dtfabric'], []]);
  ist('388: 11 Varianten (2XS…6XL), eine Farbe, eine Druckdatei-Gruppe, alle in der EU', [k.varianten.length, k.optionen.farbe.length, k.druckdateiGruppen.length, k.lieferbarkeit.euBestellbar], [11, 1, 1, 11]);
  ist('388: Kosten 40.75 bis 51.56 USD', [k.kosten.min, k.kosten.max], [40.75, 51.56]);
  ist('388: Begründung nennt 6 Schnittteile und 2 Etiketten', [k.klasseGrund.includes('6 Schnittteile'), k.klasseGrund.includes('2 Etikett')], [true, true]);
  ist('388: keine Hinweise', codes(k), []);
}

// ═══ Randfälle aus echten Daten ═══
{
  const sch = karten[574];
  ist('574 Schuh: technisch UNGEEIGNET (3D-Leisten), endgültig UNGEEIGNET (nicht in der EU)', [sch.technischeKlasse, sch.technischerGrundCode, sch.klasse, sch.klasseGrundCode], ['UNGEEIGNET', 'schuh_3d_leisten', 'UNGEEIGNET', 'schuh_3d_leisten+nicht_in_eu']);
  ist('574 Schuh: Grössen als EU aus der Printful-Tabelle (US 5 → EU 37,5, 9 → 42,5, 11.5 → 46 (ca.))', ['5', '9', '11.5'].map((s) => sch.optionen.groesse.find((x) => x.wert === s).anzeige), ['EU 37,5', 'EU 42,5', 'EU 46 (ca.)']);
  ist('574 Schuh: Region nur CN, nicht USA', [sch.lieferbarkeit.regionen, sch.lieferbarkeit.nurUs, sch.lieferbarkeit.keinEu], [['CN'], false, true]);
  ist('574 Schuh: Platzierungen links/rechts + Etikett', sch.platzierungen.map((p) => p.id), ['shoe_left', 'shoe_right', 'label_inside']);
  ist('574 Schuh: Grössentabelle hat «Europe» als EU, «US Men» als markiertes US', (() => { const t = sch.groessentabelle.tabellen[0]; return [t.messungen.find((m) => m.label === 'Europe').markiert, t.messungen.find((m) => m.label === 'US Men').markiert]; })(), [false, true]);
  const ker = karten[861];
  ist('861 Kerze: technisch FLACH, endgültig UNGEEIGNET «nur_us»', [ker.technischeKlasse, ker.klasse, ker.klasseGrundCode, ker.lieferbarkeit.nurUs, ker.lieferbarkeit.usInStock], ['FLACH', 'UNGEEIGNET', 'nur_us', true, 9]);
  ist('861 Kerze: «9oz» = 255 g', ker.optionen.groesse.map((x) => x.anzeige), ['255 g']);
  const dose = karten[764];
  ist('764 Dosenkühler: technisch FLACH (vorne/hinten), nur USA', [dose.technischeKlasse, dose.klasse, dose.lieferbarkeit.nurUs], ['FLACH', 'UNGEEIGNET', true]);
  ist('764 Dosenkühler: die 12 oz sind die Dosengrösse (355 ml)', dose.optionen.groesse.map((x) => x.anzeige), ['Regular (für Dosen à 355 ml)', 'Slim (für Dosen à 355 ml)']);
  const str = karten[769];
  ist('769 Strick: technisch FLACH_MIT_HINWEIS «gestrickt», endgültig UNGEEIGNET «nicht_in_eu» (auch nicht USA)', [str.technischeKlasse, str.technischerGrundCode, str.klasse, str.klasseGrundCode, str.lieferbarkeit.nurUs], ['FLACH_MIT_HINWEIS', 'gestrickt', 'UNGEEIGNET', 'nicht_in_eu', false]);
  ist('769 Strick: Druckdatei ist ein Maschenraster 340×517 @1 dpi, keine cm-Grösse', [pl(str, 'front').printfile.breitePx, pl(str, 'front').printfile.hoehePx, pl(str, 'front').printfile.dpi, pl(str, 'front').printfile.groesseCm], [340, 517, 1, null]);
  ist('769 Strick: Hinweis nennt das Maschenraster und 36 Garnfarben', (() => { const h = str.hinweise.find((x) => x.code === 'gestrickt'); return [h.text.includes('Maschenraster'), h.text.includes('340×517'), h.text.includes('36 Garnfarben')]; })(), [true, true, true]);
}

// ═══ Kurzeintrag für unterstuetzung.json ═══
{
  const e = unterstuetzungEintrag(karten[388]);
  ist('Eintrag 388', [e.id, e.klasse, e.grundCode, e.anzahlPlatzierungen, e.anzahlFlaechen, e.anzahlEtiketten, e.panelAnzahl, e.hatTemplates, e.hatDruckdateien, e.nurUs, e.keinEu], [388, 'PANEL', 'schnittteile', 8, 6, 2, 6, true, true, false, false]);
  const f = unterstuetzungEintrag(karten[861]);
  ist('Eintrag 861 (nur USA)', [f.klasse, f.technischeKlasse, f.nurUs, f.keinEu, f.euVarianten], ['UNGEEIGNET', 'FLACH', true, true, { gesamt: 9, inStock: 0, aufAnfrage: 0, usInStock: 9 }]);
  ist('Eintrag 206: Hinweiscodes mit «!» für Einschränkungen', unterstuetzungEintrag(karten[206]).hinweisCodes.filter((c) => c.startsWith('!')), ['!stickerei', '!kappe']);
}

// ═══ Regeln der Klassifizierung (kleine, erfundene Karten: je Regel ein Fall) ═══
const flaeche = (id, technik = 'DTG', art = 'flaeche') => ({ id, art, technik, printfile: { breitePx: 1000, hoehePx: 1000, dpi: 150 }, aufpreisUsd: null });
const mini = (o) => ({
  typ: 'T-SHIRT', titelEn: 'Test Product', standardTechnik: 'DTG', platzierungen: [flaeche('front')], nichtImEditor: [], druckdateiGruppen: [{}],
  lieferbarkeit: { varianten: 4, euInStock: 4, euAufAnfrage: 0, euBestellbar: 4, usInStock: 4, nurUs: false, keinEu: false }, ...o,
  _intern: { hatTemplates: true, hatDruckdateien: true, minDpi: 150, produktOptionen: [], dateien: [], ...(o._intern ?? {}) },
});
const kl = (o) => klassifizieren(mini(o)).felder;
const cut = (n, extra = []) => [...Array.from({ length: n }, (_, i) => flaeche(['front', 'back', 'sleeve_left', 'sleeve_right', 'hood'][i], 'CUT-SEW')), ...extra];
ist('Regel: eine DTG-Fläche → FLACH', [kl({}).klasse, kl({}).klasseGrundCode], ['FLACH', 'flach']);
ist('Regel: vier unabhängige DTG-Flächen → FLACH (Vorne/Hinten/Ärmel sind keine Schnittteile)', kl({ platzierungen: [flaeche('front'), flaeche('back'), flaeche('sleeve_left'), flaeche('sleeve_right')] }).klasse, 'FLACH');
ist('Regel: CUT-SEW mit 2 Flächen → PANEL', [kl({ standardTechnik: 'CUT-SEW', platzierungen: cut(2) }).klasse, kl({ standardTechnik: 'CUT-SEW', platzierungen: cut(2) }).panelAnzahl], ['PANEL', 2]);
ist('Regel: CUT-SEW mit 1 Fläche + Etikett → FLACH_MIT_HINWEIS «allover_einzeldatei» (Etikett zählt nicht)', kl({ standardTechnik: 'CUT-SEW', platzierungen: cut(1, [flaeche('label_inside', 'CUT-SEW', 'etikett')]) }).klasseGrundCode, 'allover_einzeldatei');
ist('Regel: CUT-SEW mit 2 Flächen + 2 Etiketten bleibt PANEL mit panelAnzahl 2', kl({ standardTechnik: 'CUT-SEW', platzierungen: cut(2, [flaeche('label_inside', 'CUT-SEW', 'etikett'), flaeche('label_outside', 'CUT-SEW', 'etikett')]) }).panelAnzahl, 2);
ist('Regel: DIRECT-TO-FABRIC mit 4 Flächen → PANEL', kl({ standardTechnik: 'DIRECT-TO-FABRIC', platzierungen: [flaeche('front_dtfabric', 'DIRECT-TO-FABRIC'), flaeche('back_dtfabric', 'DIRECT-TO-FABRIC'), flaeche('sleeve_left_dtfabric', 'DIRECT-TO-FABRIC'), flaeche('sleeve_right_dtfabric', 'DIRECT-TO-FABRIC')] }).klasse, 'PANEL');
ist('Regel: Stickerei als Standardtechnik → FLACH_MIT_HINWEIS «stickerei»', kl({ standardTechnik: 'EMBROIDERY', platzierungen: [flaeche('embroidery_chest_left', 'EMBROIDERY')] }).klasseGrundCode, 'stickerei');
ist('Regel: nur Stick-Flächen bei anderer Standardtechnik → ebenfalls «stickerei»', kl({ standardTechnik: 'DTFILM', platzierungen: [flaeche('embroidery_chest_left', 'EMBROIDERY'), flaeche('embroidery_chest_center', 'EMBROIDERY')] }).klasseGrundCode, 'stickerei');
ist('Regel: Stickerei NEBEN einer DTG-Fläche macht noch keine Einschränkung', kl({ platzierungen: [flaeche('front'), flaeche('embroidery_chest_left', 'EMBROIDERY')] }).klasse, 'FLACH');
ist('Regel: Strick → FLACH_MIT_HINWEIS «gestrickt»', kl({ standardTechnik: 'KNITWEAR', platzierungen: [flaeche('front', 'KNITWEAR'), flaeche('back', 'KNITWEAR')] }).klasseGrundCode, 'gestrickt');
ist('Regel: Titel «Snapback Cap» → kappe', kl({ titelEn: 'Snapback Cap' }).klasseGrundCode, 'kappe');
ist('Regel: Titel «Bucket Hat» / «Beanie» → kappe', [kl({ titelEn: 'Bucket Hat' }).klasseGrundCode, kl({ titelEn: 'Knit Beanie' }).klasseGrundCode], ['kappe', 'kappe']);
ist('Regel: Titel «Eco Tote Bag» → tasche', kl({ titelEn: 'Eco Tote Bag' }).klasseGrundCode, 'tasche');
ist('Regel: Titel «Backpack» (DTG, 1 Fläche) → tasche', kl({ titelEn: 'Backpack' }).klasseGrundCode, 'tasche');
ist('Regel: Wortgrenzen: «Hatchback Sticker» und «Baggy Hoodie» sind weder Kappe noch Tasche', [kl({ titelEn: 'Hatchback Sticker' }).klasse, kl({ titelEn: 'Baggy Hoodie' }).klasse], ['FLACH', 'FLACH']);
ist('Regel: Kappe UND Stickerei → beide Codes', kl({ titelEn: 'Dad Hat', standardTechnik: 'EMBROIDERY', platzierungen: [flaeche('embroidery_front_large', 'EMBROIDERY')] }).klasseGrundCode, 'stickerei+kappe');
ist('Regel: PANEL schlägt Hinweis (CUT-SEW-Rucksack mit 3 Flächen)', kl({ titelEn: 'All-Over Print Backpack', standardTechnik: 'CUT-SEW', platzierungen: cut(3) }).klasse, 'PANEL');
// Mehrseitig
const monate = ['cover', 'january', 'february', 'march'].map((i) => flaeche(i, 'DIGITAL'));
ist('Regel: Kalender (Umschlag + Monate, POSTCARD) → PANEL «mehrseitig»', kl({ typ: 'POSTCARD', standardTechnik: 'DIGITAL', platzierungen: monate }).klasseGrundCode, 'mehrseitig');
ist('Regel: Postkarte vorne/hinten (POSTCARD) bleibt FLACH', kl({ typ: 'POSTCARD', standardTechnik: 'DIGITAL', platzierungen: [flaeche('front', 'DIGITAL'), flaeche('back', 'DIGITAL')] }).klasse, 'FLACH');
ist('Regel: Grusskarte mit nur 2 Seiten (cover, inside1) bleibt FLACH, ab 3 Seiten PANEL', [kl({ typ: 'POSTCARD', standardTechnik: 'DIGITAL', platzierungen: [flaeche('cover', 'DIGITAL'), flaeche('inside1', 'DIGITAL')] }).klasse, kl({ typ: 'POSTCARD', standardTechnik: 'DIGITAL', platzierungen: [flaeche('cover', 'DIGITAL'), flaeche('inside1', 'DIGITAL'), flaeche('inside2', 'DIGITAL')] }).klasse], ['FLACH', 'PANEL']);
// Sets und Segmente
ist('Regel: first/second/third/fourth → PANEL «set»', kl({ standardTechnik: 'SUBLIMATION', platzierungen: ['first', 'second', 'third', 'fourth'].map((i) => flaeche(i, 'SUBLIMATION')) }).klasseGrundCode, 'set');
ist('Regel: nur «first» allein ist kein Set', kl({ standardTechnik: 'SUBLIMATION', platzierungen: [flaeche('first', 'SUBLIMATION')] }).klasse, 'FLACH');
ist('Regel: Sublimation mit Beinteilen → PANEL «segmentiert»', kl({ standardTechnik: 'SUBLIMATION', platzierungen: ['leg_front_left', 'leg_front_right', 'leg_back_left', 'leg_back_right'].map((i) => flaeche(i, 'SUBLIMATION')) }).klasseGrundCode, 'segmentiert');
ist('Regel: DTG mit Beinteilen bleibt FLACH (je Bein optional)', kl({ platzierungen: [flaeche('leg_left'), flaeche('leg_right')] }).klasse, 'FLACH');
ist('Regel: Sublimation vorne/hinten (Fahne) bleibt FLACH', kl({ standardTechnik: 'SUBLIMATION', platzierungen: [flaeche('front', 'SUBLIMATION'), flaeche('back', 'SUBLIMATION')] }).klasse, 'FLACH');
// UNGEEIGNET
ist('Regel: Schuh (Typ) → UNGEEIGNET «schuh_3d_leisten»', [kl({ typ: 'SHOES' }).klasse, kl({ typ: 'SHOES' }).klasseGrundCode], ['UNGEEIGNET', 'schuh_3d_leisten']);
ist('Regel: Schuh an den Platzierungsnamen erkannt (shoe_left)', kl({ platzierungen: [flaeche('shoe_left', 'SUBLIMATION'), flaeche('shoe_right', 'SUBLIMATION')] }).klasseGrundCode, 'schuh_3d_leisten');
ist('Regel: keine Platzierung → UNGEEIGNET «kein_template_oder_druckdatei»', kl({ platzierungen: [], _intern: { hatTemplates: false, hatDruckdateien: false } }).klasseGrundCode, 'kein_template_oder_druckdatei');
ist('Regel: Druckdateien ohne Vorlagen → UNGEEIGNET', kl({ platzierungen: [], _intern: { hatTemplates: false, hatDruckdateien: true } }).klasse, 'UNGEEIGNET');
ist('Regel: nur Etiketten → UNGEEIGNET «nur_etiketten»', kl({ platzierungen: [flaeche('label_inside', 'DTG', 'etikett'), flaeche('label_outside', 'DTG', 'etikett')] }).klasseGrundCode, 'nur_etiketten');
ist('Regel: Gutschein/Muster im Titel → UNGEEIGNET «kein_gestaltbares_produkt»', [kl({ titelEn: 'Gift Card' }).klasseGrundCode, kl({ titelEn: 'Fabric Sample' }).klasseGrundCode], ['kein_gestaltbares_produkt', 'kein_gestaltbares_produkt']);
const nurUs = { varianten: 4, euInStock: 0, euAufAnfrage: 0, euBestellbar: 0, usInStock: 4, nurUs: true, keinEu: true };
const keinEu = { varianten: 4, euInStock: 0, euAufAnfrage: 0, euBestellbar: 0, usInStock: 0, nurUs: false, keinEu: true };
ist('Regel: nur USA lieferbar → UNGEEIGNET «nur_us», technische Klasse bleibt erhalten', (({ klasse, klasseGrundCode, technischeKlasse }) => [klasse, klasseGrundCode, technischeKlasse])(kl({ lieferbarkeit: nurUs })), ['UNGEEIGNET', 'nur_us', 'FLACH']);
ist('Regel: in keiner EU-Variante und nicht in den USA → UNGEEIGNET «nicht_in_eu»', kl({ lieferbarkeit: keinEu }).klasseGrundCode, 'nicht_in_eu');
ist('Regel: nur USA und technisch PANEL → endgültig UNGEEIGNET, technisch PANEL', (({ klasse, technischeKlasse }) => [klasse, technischeKlasse])(kl({ standardTechnik: 'CUT-SEW', platzierungen: cut(3), lieferbarkeit: nurUs })), ['UNGEEIGNET', 'PANEL']);
ist('Regel: Schuh und nur USA → beide Gründe im Code', kl({ typ: 'SHOES', lieferbarkeit: nurUs }).klasseGrundCode, 'schuh_3d_leisten+nur_us');
ist('Regel: «stocked_on_demand» zählt als bestellbar (nicht UNGEEIGNET)', kl({ lieferbarkeit: { varianten: 2, euInStock: 0, euAufAnfrage: 2, euBestellbar: 2, usInStock: 0, nurUs: false, keinEu: false } }).klasse, 'FLACH');
ist('Regel: nur ein Teil der Varianten in der EU → Klasse bleibt, Hinweis «eu_teilweise»', (() => { const r = klassifizieren(mini({ lieferbarkeit: { varianten: 4, euInStock: 1, euAufAnfrage: 0, euBestellbar: 1, usInStock: 4, nurUs: false, keinEu: false } })); return [r.felder.klasse, r.hinweise.map((h) => h.code)]; })(), ['FLACH', ['eu_teilweise']]);
// Hinweise
ist('Hinweis: Aufpreis wird mit USD je Fläche genannt', (() => { const r = klassifizieren(mini({ platzierungen: [flaeche('front'), { ...flaeche('back'), titelDe: 'Rückseite', aufpreisUsd: 5.95 }] })); return r.hinweise.find((h) => h.code === 'aufpreis').text.includes('Rückseite 5.95'); })(), true);
ist('Hinweis: Mindestauflösung unter 72 dpi (nicht Strick) wird genannt', klassifizieren(mini({ _intern: { minDpi: 48 } })).hinweise.some((h) => h.code === 'niedrige_aufloesung'), true);
ist('Hinweis: 75 dpi ist nichts Besonderes', klassifizieren(mini({ _intern: { minDpi: 75 } })).hinweise.some((h) => h.code === 'niedrige_aufloesung'), false);
ist('Hinweis: mehrere Druckdatei-Gruppen', klassifizieren(mini({ druckdateiGruppen: [{}, {}, {}] })).hinweise.some((h) => h.code === 'druckdatei_je_variante'), true);
ist('Hinweis: Rundumdruck nur bei breiten Gefässen (Tasse 2,6:1 ja, Hülle 0,6:1 nein)', [klassifizieren(mini({ typ: 'MUG', platzierungen: [{ ...flaeche('default'), printfile: { breitePx: 2700, hoehePx: 1050, dpi: 300 } }] })).hinweise.some((h) => h.code === 'rundumdruck'), klassifizieren(mini({ typ: 'PHONE-CASE', platzierungen: [{ ...flaeche('default'), printfile: { breitePx: 1392, hoehePx: 2220, dpi: 300 } }] })).hinweise.some((h) => h.code === 'rundumdruck')], [true, false]);
ist('Klassen sind immer eine der vier', [kl({}), kl({ typ: 'SHOES' }), kl({ lieferbarkeit: keinEu }), kl({ standardTechnik: 'CUT-SEW', platzierungen: cut(2) })].every((f) => KLASSEN.includes(f.klasse) && KLASSEN.includes(f.technischeKlasse)), true);
ist('Die vier Klassen', KLASSEN, ['FLACH', 'FLACH_MIT_HINWEIS', 'PANEL', 'UNGEEIGNET']);

// ═══ Deutsche Platzierungstitel ═══
ist('Titel: bekannte Schlüssel', ['front', 'back', 'sleeve_left', 'label_inside', 'default', 'front_large'].map(platzierungTitelDe), ['Vorderseite', 'Rückseite', 'Ärmel links', 'Etikett innen', 'Druckfläche', 'Vorderseite gross']);
ist('Titel: zusammengesetzt', ['embroidery_chest_left', 'leg_front_left', 'label_inside_dtf', 'belt_front', 'page_3', 'shoe_quarters_left', 'sleeve_right_dtfabric'].map(platzierungTitelDe), ['Stickerei Brust links', 'Bein vorne links', 'Etikett innen (DTF)', 'Bund vorne', 'Seite 3', 'Schuh Seitenteile links', 'Ärmel rechts (Stoffdruck)']);
ist('Titel: unbekanntes Wort → null (Platzhalter, nicht geraten)', [platzierungTitelDe('fancy_zone'), platzierungTitelDe('')], [null, null]);
ist('Titel: unbekannter Schlüssel in der Karte → Platzhalter-Status', (() => { const k = JSON.parse(JSON.stringify(lade(19))); k.printfiles.available_placements = { default: 'Print file' }; return modellkarteBauen(k).platzierungen[0].titelDeStatus; })(), 'tabelle');

console.log(`${ok} bestanden, ${fehl} fehlgeschlagen`);
if (fehl) process.exit(1);
