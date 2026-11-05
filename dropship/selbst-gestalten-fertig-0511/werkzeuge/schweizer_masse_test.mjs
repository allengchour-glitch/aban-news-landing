// Tests für schweizer_masse.mjs (kein Netz). Lauf: /opt/node22/bin/node dropship/selbst-gestalten-fertig-0511/werkzeuge/schweizer_masse_test.mjs
// Erwartete Werte sind VON HAND gerechnet (Rechnung in den Kommentaren), nicht aus dem Code abgeleitet. Die Zeichenketten stammen aus echten Printful-Katalogdaten (05.11.2026, testdaten/katalog/*.json).
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as M from './schweizer_masse.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const lade = (id) => JSON.parse(readFileSync(join(HIER, 'testdaten', 'katalog', `${id}.json`), 'utf8'));

let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)}\n   soll: ${JSON.stringify(b)}`); } };
const nah = (n, a, b, tol = 1e-4) => { const gut = Math.abs(a - b) <= tol; if (gut) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${a}\n   soll: ${b} (±${tol})`); } };
const enthaelt = (n, text, teil) => ist(n, String(text).includes(teil), true);
const keinTeil = (n, text, re) => ist(n, !re.test(String(text)), true);

// ── Konstanten (Definitionen)
ist('Konstanten', [M.ZOLL_CM, M.FUSS_CM, M.OZ_ML, M.OZ_G, M.LB_KG, M.YD_M, M.GAL_L], [2.54, 30.48, 29.5735295625, 28.349523125, 0.45359237, 0.9144, 3.785411784]);
// 1 oz/yd² = 28.349523125 g / 0.83612736 m² = 33.90574…
nah('1 oz/yd² = 33,9057 g/m²', M.OZ_YD2_G_M2, 33.9057, 1e-4);

// ── Zahlen einlesen
ist('parseZahl ganze Zahl', M.parseZahl('7'), 7);
ist('parseZahl «.75»', M.parseZahl('.75'), 0.75);
ist('parseZahl Komma «1,5»', M.parseZahl('1,5'), 1.5);
ist('parseZahl gemischter Bruch «7 3/4»', M.parseZahl('7 3/4'), 7.75);
ist('parseZahl Bruchstrich ⁄ «7⁄8»', M.parseZahl('7⁄8'), 0.875);
ist('parseZahl «3 ⅛»', M.parseZahl('3 ⅛'), 3.125);
ist('parseZahl «½»', M.parseZahl('½'), 0.5);
ist('parseZahl mit Leerzeichen «20.47 » (Katalogwert)', M.parseZahl('20.47 '), 20.47);
ist('parseZahl Text → NaN', Number.isNaN(M.parseZahl('abc')), true);
ist('parseZahl leer → NaN', Number.isNaN(M.parseZahl('')), true);
ist('parseZahl Nenner 0 → NaN', Number.isNaN(M.parseZahl('3/0')), true);
ist('parseZahl null → NaN', Number.isNaN(M.parseZahl(null)), true);
ist('schweizerZahl 21.0 → «21»', M.schweizerZahl(21.0, 1), '21');
ist('schweizerZahl 29.7 → «29,7»', M.schweizerZahl(29.7, 1), '29,7');
ist('schweizerZahl 7.62 (1 Stelle) → «7,6»', M.schweizerZahl(7.62, 1), '7,6');
ist('schweizerZahl 42.0116 → «42»', M.schweizerZahl(42.0116, 1), '42');
ist('schweizerZahl -0.04 → «0» (kein «-0»)', M.schweizerZahl(-0.04, 1), '0');
ist('schweizerZahl 1234.5 → «1234,5» (kein Tausendertrenner)', M.schweizerZahl(1234.5, 1), '1234,5');

// ── Umrechnung (Zahlen). Handrechnung in den Kommentaren
ist('Zoll → cm: 1″ = 2,54', M.zollNachCm(1), 2.54);
nah('Zoll → cm: 10″ = 25,4', M.zollNachCm(10), 25.4);
nah('Zoll → cm: 11.69″ = 29,6926', M.zollNachCm(11.69), 29.6926);
nah('ft → cm: 6 ft = 182,88', M.fussNachCm(6), 182.88);
nah('fl oz → ml: 11 × 29,5735295625 = 325,3088', M.ozNachMl(11), 325.30882519, 1e-6);
nah('fl oz → ml: 20 = 591,4706', M.ozNachMl(20), 591.47059125, 1e-6);
nah('oz → g: 9 × 28,349523125 = 255,1457', M.ozNachG(9), 255.145708125, 1e-6);
nah('lb → kg: 44 × 0,45359237 = 19,9581', M.lbNachKg(44), 19.95806, 1e-5);
nah('oz/yd² → g/m²: 4,2 → 142,40', M.ozYd2NachGM2(4.2), 142.4, 0.01);
nah('US gal → l: 2,6 × 3,785411784 = 9,8421', M.galNachL(2.6), 9.84207, 1e-5);
ist('°F → °C: 86 → 30', Math.round(M.fahrenheitNachCelsius(86) * 1e9) / 1e9, 30);
ist('°F → °C: 32 → 0', M.fahrenheitNachCelsius(32), 0);
ist('°F → °C: 212 → 100', M.fahrenheitNachCelsius(212), 100);
ist('°F → °C: −40 → −40', M.fahrenheitNachCelsius(-40), -40);

// ── Anzeige
ist('anzeigeCm 7,62 → «7,6 cm»', M.anzeigeCm(7.62), '7,6 cm');
ist('anzeigeCm 0,3048 → «3 mm» (unter 1 cm in mm)', M.anzeigeCm(0.3048), '3 mm');
ist('anzeigeCm 25,4 → «25,4 cm»', M.anzeigeCm(25.4), '25,4 cm');
ist('anzeigeCmReihe [21, 29.7] → «21 × 29,7 cm»', M.anzeigeCmReihe([21.0058, 29.6926]), '21 × 29,7 cm');
ist('anzeigeCmReihe [1] einzeln', M.anzeigeCmReihe([2.54]), '2,5 cm');
ist('anzeigeLaenge 182,88 → «1,83 m»', M.anzeigeLaenge(182.88), '1,83 m');
ist('anzeigeLaenge 55 → «55 cm»', M.anzeigeLaenge(55), '55 cm');
ist('anzeigeMl 325,3 → «325 ml»', M.anzeigeMl(325.3), '325 ml');
ist('anzeigeMl 443,6 → «444 ml»', M.anzeigeMl(443.6), '444 ml');
ist('anzeigeMl 1182,94 → «1,18 l»', M.anzeigeMl(1182.94), '1,18 l');
ist('anzeigeG 255,1 → «255 g»', M.anzeigeG(255.1), '255 g');
ist('anzeigeG 1750 → «1,75 kg»', M.anzeigeG(1750), '1,75 kg');
ist('anzeigeKg 19,958 → «20 kg»', M.anzeigeKg(19.958), '20 kg');
ist('anzeigeKg 0,5 → «500 g»', M.anzeigeKg(0.5), '500 g');
ist('anzeigeGM2 142,4 → «142 g/m²»', M.anzeigeGM2(142.4), '142 g/m²');
ist('anzeigeC 32,2 → «32 °C»', M.anzeigeC(32.2222), '32 °C');

// ── «oz»: Volumen, Gewicht oder unklar (Kontext aus dem Produkt)
ist('ozArt Tasse (MUG)', M.ozArt({ typ: 'MUG', titel: 'White Glossy Mug' }), 'volumen');
ist('ozArt Trinkflasche (DRINKWARE)', M.ozArt({ typ: 'DRINKWARE', titel: 'Stainless Steel Tumbler' }), 'volumen');
ist('ozArt Becher mit Typ SUBLIMATION, aber «Tumbler» im Titel', M.ozArt({ typ: 'SUBLIMATION', titel: 'Tapered Stainless Steel Tumbler 20 oz' }), 'volumen');
ist('ozArt Kerze', M.ozArt({ typ: 'CANDLE', titel: 'Scented Soy Candle, 9oz' }), 'gewicht');
ist('ozArt Dosenkühler: die Zahl ist die Dosengrösse', M.ozArt({ typ: 'SUBLIMATION', titel: 'Can Cooler' }), 'dose');
ist('ozArt Tiernapf: nicht belegt → null', M.ozArt({ typ: 'SUBLIMATION', titel: 'Pet Bowl' }), null);
ist('ozArt T-Shirt: null', M.ozArt({ typ: 'T-SHIRT', titel: 'Unisex Staple T-Shirt' }), null);

// ── Grössenbezeichnungen: echte Varianten-«size»-Werte des Katalogs
const vol = { ozArt: 'volumen' };
const g = (label, k = {}) => M.groesseAnzeige(label, k).anzeige;
// Tasse 19: 11/15/20 oz → 325/444/591 ml (11 × 29,5735 = 325,3; 15 × 29,5735 = 443,6; 20 × 29,5735 = 591,5)
ist('Tasse 11 oz', g('11 oz', vol), '325 ml');
ist('Tasse 15 oz', g('15 oz', vol), '444 ml');
ist('Tasse 20 oz', g('20 oz', vol), '591 ml');
ist('Reisebecher 40 oz → 1182,9 ml = 1,18 l', g('40 oz', vol), '1,18 l');
ist('Reisebecher 25 oz → 739 ml', g('25 oz', vol), '739 ml');
ist('Becher «20oz» ohne Leerzeichen', g('20oz', vol), '591 ml');
ist('Becher «16 oz With Lid & Straw» (16 × 29,5735 = 473,2)', g('16 oz With Lid & Straw', vol), '473 ml mit Deckel und Strohhalm');
ist('Kerze «9oz» (9 × 28,3495 = 255,1)', g('9oz', { ozArt: 'gewicht' }), '255 g');
ist('Kerze «4oz» (4 × 28,3495 = 113,4)', g('4oz', { ozArt: 'gewicht' }), '113 g');
ist('Dosenkühler «Regular 12 oz» (12 × 29,5735 = 354,9)', g('Regular 12 oz', { ozArt: 'dose' }), 'Regular (für Dosen à 355 ml)');
ist('Dosenkühler «Slim 12 oz»', g('Slim 12 oz', { ozArt: 'dose' }), 'Slim (für Dosen à 355 ml)');
ist('Tiernapf «18 oz»: unverändert', g('18 oz', {}), '18 oz');
ist('Tiernapf «18 oz» ist markiert', M.groesseAnzeige('18 oz', {}).markiert, true);
ist('Tasse «11 oz» ist nicht markiert', M.groesseAnzeige('11 oz', vol).markiert, false);

// Poster/Leinwand/Sticker in Zoll (Printful-«size»)
// 11.69″ = 29,6926 → 29,7; 16.54″ = 42,0116 → 42; 8.27″ = 21,0058 → 21
ist('Poster 11.69″×16.54″ (A3)', g('11.69″×16.54″'), '29,7 × 42 cm');
ist('Poster 8.27″×11.69″ (A4)', g('8.27″×11.69″'), '21 × 29,7 cm');
ist('Poster 10″×10″ = 25,4 × 25,4', g('10″×10″'), '25,4 × 25,4 cm');
ist('Poster 18″ × 14″ (mit Leerzeichen) = 45,72 × 35,56', g('18″ × 14″'), '45,7 × 35,6 cm');
ist('Mauspad 8.7"x7.1" (gerade Anführungszeichen, x) = 22,098 × 18,034', g('8.7"x7.1"'), '22,1 × 18 cm');
ist('Tischläufer 90″×16″ = 228,6 × 40,64', g('90″×16″'), '228,6 × 40,6 cm');
ist('Puzzle «10″×8″ (110 pcs)»: Stückzahl bleibt', g('10″×8″ (110 pcs)'), '25,4 × 20,3 cm (110 pcs)');
// ISO-A: Printful rundet die Zollwerte (23.3″ = 59,18 cm), das Format ist genau 59,4 × 84,1 cm
ist('«A1 (23.3″×33.1″)» → ISO A1 59,4 × 84,1 cm', g('A1 (23.3″×33.1″)'), 'A1 (59,4 × 84,1 cm)');
ist('«A2 (16.5″×23.3″)» → ISO A2 42 × 59,4 cm', g('A2 (16.5″×23.3″)'), 'A2 (42 × 59,4 cm)');
ist('Patch «Oval 4″×2.6″» = 10,16 × 6,604', g('Oval 4″×2.6″'), 'Oval 10,2 × 6,6 cm');
ist('Patch «Circular ⌀3 in» = 7,62', g('Circular ⌀3 in'), 'Circular ⌀ 7,6 cm');
ist('Patch «Heart - 3.1″×2.8″»', g('Heart - 3.1″×2.8″'), 'Heart - 7,9 × 7,1 cm');
ist('Pin-Button «1.25″» = 3,175', g('1.25″'), '3,2 cm');
ist('Wanduhr «10″» = 25,4', g('10″'), '25,4 cm');
ist('Leine «6 ft.» = 182,88 cm → 1,83 m', g('6 ft.'), '1,83 m');
ist('Laptop-Hülle «13″»: Bildschirmgrösse bleibt Zoll, daneben cm (13 × 2,54 = 33,02)', g('13″', { geraetZoll: true }), '13 Zoll (33 cm)');
ist('Gleiche «13″» ohne Gerätekontext ist eine Länge', g('13″', {}), '33 cm');
// Schon metrisch oder kein Mass: unverändert
ist('«A1 (59.4×84.1 cm)» schon metrisch', g('A1 (59.4×84.1 cm)'), 'A1 (59.4×84.1 cm)');
ist('«21×30 cm» schon metrisch', g('21×30 cm'), '21×30 cm');
ist('Kleidergrösse «XL»', g('XL'), 'XL');
ist('Kleidergrösse «2XL»', g('2XL'), '2XL');
ist('Kindergrösse «2T»', g('2T'), '2T');
ist('Babygrösse «12-18m»', g('12-18m'), '12-18m');
ist('Gerät «iPhone 15 Pro Max»', g('iPhone 15 Pro Max'), 'iPhone 15 Pro Max');
ist('«252 pieces» (enthält «in», aber kein Zoll)', g('252 pieces'), '252 pieces');
ist('Zahl allein ohne Schuhkontext («10», Kinder-Leggings)', g('10'), '10');
ist('Zahl allein ohne Schuhkontext ist nicht markiert', M.groesseAnzeige('10').markiert, false);
ist('null bleibt null', g(null), null);
ist('«null» (Textform im Katalog) bleibt', g('null'), 'null');
// US-Bettgrössen: keine belegte Umrechnung
ist('«King» unverändert', g('King'), 'King');
ist('«King» ist markiert', M.groesseAnzeige('King').markiert, true);
ist('«Twin XL» ist markiert', M.groesseAnzeige('Twin XL').markiert, true);

// ── Schuhe: nur die belegte Printful-Tabelle «Europe» (Produkt 574, Männer-Slip-ons)
const k574 = M.kontextAusKatalog(lade(574));
ist('Kontext 574: Schuh mit EU-Tabelle', [k574.istSchuh, k574.euTabelle !== null, Object.keys(k574.euTabelle).length], [true, true, 17]);
ist('574: US 5 → EU 37,5 (Tabelle «Europe»)', g('5', k574), 'EU 37,5');
ist('574: US 9 → EU 42,5', g('9', k574), 'EU 42,5');
ist('574: US 10 → EU 44', g('10', k574), 'EU 44');
ist('574: US 5.5 → EU 38', g('5.5', k574), 'EU 38');
ist('574: US 13 → EU 47,5', g('13', k574), 'EU 47,5');
ist('574: US 11.5 → EU 46 (ca.) (Zweitquellen weichen ab)', g('11.5', k574), 'EU 46 (ca.)');
ist('574: US 12 → EU 46,5 (ca.)', g('12', k574), 'EU 46,5 (ca.)');
ist('574: UNSICHER ist markiert', M.groesseAnzeige('11.5', k574).markiert, true);
ist('574: sicherer Wert ist nicht markiert', M.groesseAnzeige('9', k574).markiert, false);
ist('574: Grösse ausserhalb der Tabelle («14») bleibt US und ist markiert', [g('14', k574), M.groesseAnzeige('14', k574).markiert], ['14', true]);
ist('Schuh OHNE Tabelle: unverändert und markiert (nie allgemein umrechnen)', [g('9', { istSchuh: true, produktId: '999' }), M.groesseAnzeige('9', { istSchuh: true, produktId: '999' }).markiert], ['9', true]);
// Gegenprobe gegen die unabhängig geprüfte Tabelle im Repo (katalog-einheiten-0411, von einem zweiten Prüfer gegen die API bestätigt: 146 von 146 Zeilen)
const alt = join(HIER, '..', '..', 'katalog-einheiten-0411', 'daten', 'schuh_eu_tabellen.json');
if (existsSync(alt)) {
  const erwartet = JSON.parse(readFileSync(alt, 'utf8')).tabellen['574'];
  const ist574 = Object.fromEntries(Object.entries(k574.euTabelle).map(([a, b]) => [a, String(b)]));
  ist('574: EU-Tabelle gleich der Tabelle aus katalog-einheiten-0411 (Zweitquelle)', ist574, erwartet);
} else console.log('(übersprungen: katalog-einheiten-0411/daten/schuh_eu_tabellen.json nicht vorhanden)');
ist('UNSICHER aus katalog-einheiten-0411 übernommen (Männer 11.5/12, Slides Damen 6.5)', [M.UNSICHER['574'], M.UNSICHER['598']], [['11.5', '12'], ['6.5']]);
ist('euTabelleAusSizes ohne Tabelle → leer', M.euTabelleAusSizes({ size_tables: [] }), {});
ist('euTabelleAusSizes ohne Zeile «Europe» → leer', M.euTabelleAusSizes(lade(71).sizes), {});

// ── Kontext aus echten Katalogdateien
ist('Kontext Tasse 19: volumen', M.kontextAusKatalog(lade(19)).ozArt, 'volumen');
ist('Kontext Kerze 861: gewicht', M.kontextAusKatalog(lade(861)).ozArt, 'gewicht');
ist('Kontext Dosenkühler 764: dose', M.kontextAusKatalog(lade(764)).ozArt, 'dose');
ist('Kontext T-Shirt 71: kein oz, kein Schuh', [M.kontextAusKatalog(lade(71)).ozArt, M.kontextAusKatalog(lade(71)).istSchuh, M.kontextAusKatalog(lade(71)).euTabelle], [null, false, null]);
ist('Kontext 19: Produkt-ID als Text', M.kontextAusKatalog(lade(19)).produktId, '19');
// Echte Variantengrössen: Kerze 861 «9oz», Dosenkühler 764
ist('861: alle Grössen in Gramm', [...new Set(lade(861).varianten.map((v) => M.groesseAnzeige(v.size, M.kontextAusKatalog(lade(861))).anzeige))].sort(), ['255 g']);
ist('764: Dosenkühler-Grössen', [...new Set(lade(764).varianten.map((v) => M.groesseAnzeige(v.size, M.kontextAusKatalog(lade(764))).anzeige))].sort(), ['Regular (für Dosen à 355 ml)', 'Slim (für Dosen à 355 ml)']);

// ── Freier Text: echte Zeilen aus Printful-Beschreibungen
const u = (t, k = {}) => M.umrechneText(t, k);
// Steht die Metrik schon dabei, gilt der Herstellerwert und die Klammer verschwindet
ist('Tasse 19: «3.8″ (9.6 cm)» → 9,6 cm', u('11 oz mug dimensions: 3.8″ (9.6 cm) in height, 3.2″ (8.2 cm) in diameter', vol).text, '325 ml mug dimensions: 9,6 cm in height, 8,2 cm in diameter');
ist('Bereich «22″–24″ (55–60 cm)»', u('Head circumference: 22″–24″ (55–60 cm)').text, 'Head circumference: 55–60 cm');
ist('Reihe «15″ × 15″ (39 × 39 cm)», Gallonen «2.6 US gal (10 l)», Pfund «44lbs (20 kg)»', u('Bag size: 15″ × 15″ (39 × 39 cm) • Capacity: 2.6 US gal (10 l) • Maximum weight limit: 44lbs (20 kg)').text, 'Bag size: 39 × 39 cm • Capacity: 10 l • Maximum weight limit: 20 kg');
ist('Stoffgewicht «4.2 oz./yd.² (142 g/m²)»', u('Fabric weight: 4.2 oz./yd.² (142 g/m²)').text, 'Fabric weight: 142 g/m²');
ist('Stoffgewicht mit Toleranz «10.15 +/- 0.74 oz./yd.² (344 g/m² +/- 25g/m²)»', u('fabric weight: 10.15 +/- 0.74 oz./yd.² (344 g/m² +/- 25g/m²) • Fade').text, 'fabric weight: 344 g/m² +/- 25 g/m² • Fade');
ist('Stoffgewicht Tippfehler «4.2 oz/y² (142 g/m²)»', u('Fabric weight: 4.2 oz/y² (142 g/m²) • Relaxed').text, 'Fabric weight: 142 g/m² • Relaxed');
ist('Stoffgewicht «7.23 oz./yd. (245 g/m²)» ohne Hochzahl', u('Fabric weight: 7.23 oz./yd. (245 g/m²) • Knit').text, 'Fabric weight: 245 g/m² • Knit');
ist('Fuss «6 ft. (1.83 m)»', u('Leash length: 6 ft. (1.83 m) • Leash width: 1″ (2.54 cm)').text, 'Leash length: 1,83 m • Leash width: 2,54 cm');
ist('Grad «86°F (30°C)»', u('Wash at 86°F (30°C) - Blank').text, 'Wash at 30 °C - Blank');
ist('Grad «90°F / 30°C»', u('cold water (max. 90°F / 30°C). Not').text, 'cold water (max. 30 °C). Not');
ist('Grad «90 °F / 30 °C » mit Leerzeichen', u('(up to 90 °F / 30 °C ) and tumble').text, '(up to 30 °C ) and tumble');
ist('Bruch «7⁄8\'\' (2.2 cm)»', u('Seamless double-needle 7⁄8\'\' (2.2 cm) collar').text, 'Seamless double-needle 2,2 cm collar');
ist('Gemischter Bruch «3 ⅛” (7.6 cm)»', u('• 3 ⅛” (7.6 cm) crown').text, '• 7,6 cm crown');
ist('Ohne Null «.75″ (1.9 cm)»', u('Ayous wood .75″ (1.9 cm) thick frame').text, 'Ayous wood 1,9 cm thick frame');
ist('Wort «1 inch (2.5 cm)»', u('Place each of the mounting hooks 1 inch (2.5 cm) from frame').text, 'Place each of the mounting hooks 2,5 cm from frame');
ist('Abkürzung «22.875 in (58.1 cm)» (in nur mit Metrik dahinter)', u('Circumference: 22.875 in (58.1 cm); bill width: 7 in (17.8 cm)').text, 'Circumference: 58,1 cm; bill width: 17,8 cm');
ist('Metrik zuerst «85 g (3 oz)»', u('Weight: 85 g (3 oz) • Pre-drilled').text, 'Weight: 85 g • Pre-drilled');
ist('Gewicht «62 oz. (1.75 kg)» ohne Kontext, mit Metrik dahinter', u('Weight: 62 oz. (1.75 kg) • Mat thickness').text, 'Weight: 1,75 kg • Mat thickness');
ist('Gewicht «0.39 oz (11 g)» ohne Kontext', u('Small: 0.39 oz (11 g) Medium: 0.6 oz (17 g)').text, 'Small: 11 g Medium: 17 g');
ist('Papierstärke «10.3 mil (0.26 mm)»', u('Paper thickness: 10.3 mil (0.26 mm)').text, 'Paper thickness: 0,26 mm');
ist('mil ohne Metrik: 10 mil = 0,254 mm', u('10 mil thick').text, '0,25 mm thick');
// Ohne Metrik daneben: Rechnung
// 12″ = 30,48 → 30,5; 4.5 oz/yd² = 152,6 → 153
ist('Zoll ohne Metrik «a 12″ knit»', u('a 12″ knit').text, 'a 30,5 cm knit');
ist('Stoffgewicht ohne Metrik «4.5 oz/yd²»', u('Fabric weight: 4.5 oz/yd² and').text, 'Fabric weight: 153 g/m² and');
ist('Pfund ohne Metrik «33 lbs» = 14,97 kg', u('Hold up to 33 lbs.').text, 'Hold up to 15 kg.');
ist('Grad ohne Metrik «104°F» = 40 °C', u('Wash at 104°F').text, 'Wash at 40 °C');
// oz-Art
ist('«fl oz» ist immer Volumen: 12 fl oz = 354,9 ml', u('Capacity 12 fl oz').text, 'Capacity 355 ml');
ist('«32 oz. bottle»: Gefäss als Wort danach = Volumen (32 × 29,5735 = 946,3)', u('fits a 32 oz. bottle •').text, 'fits a 946 ml bottle •');
ist('Becher «20-oz stainless steel tumbler» mit Produktkontext volumen', u('This 20-oz stainless steel tumbler keeps', vol).text, 'This 591 ml stainless steel tumbler keeps');
ist('Kerze «9 oz» mit Kontext gewicht', u('A 9 oz candle', { ozArt: 'gewicht' }).text, 'A 255 g candle');
ist('«10 oz fleece» ohne Kontext bleibt', u('Made from soft 10 oz fleece, it').text, 'Made from soft 10 oz fleece, it');
ist('«10 oz fleece» ist markiert', u('Made from soft 10 oz fleece, it').markiert.map((m) => m.text), ['10 oz']);
// Abweichungen zwischen Rechnung und Herstellerwert
const abw = u('Width 10″ (20 cm)');
ist('Herstellerwert gilt, auch wenn er abweicht (10″ = 25,4 gegen 20 cm)', abw.text, 'Width 20 cm');
ist('Abweichung >5 % wird gemeldet (|25,4 − 20| / 20 = 27 %)', [abw.abweichungen.length, Math.round(abw.abweichungen[0].abweichung * 100)], [1, 27]);
ist('Keine Abweichung bei «3.8″ (9.6 cm)» (9,652 gegen 9,6 = 0,5 %)', u('3.8″ (9.6 cm)').abweichungen.length, 0);
ist('Herstellerwert in mm: «4″ × 6″ (101 × 152 mm)» ist keine Abweichung (10,16 gegen 10,1 cm = 0,6 %)', u('Size 4″ × 6″ (101 × 152 mm)').abweichungen.length, 0);
ist('Herstellerwert in mm: «0.02″ (0.5 mm)» ist keine Abweichung (0,508 gegen 0,5 mm)', u('0.02″ (0.5 mm) raised bezel').abweichungen.length, 0);
ist('aenderungen nennen die Quelle', u('3.8″ (9.6 cm) and 12″').aenderungen.map((a) => a.quelle), ['hersteller', 'rechnung']);
// Markierung von US-Schuhgrössen im Text
ist('US-Schuhgrössen im Text bleiben und sind markiert', u('3 sizes: S (US women’s 6—8, US men’s 5—6.5), M').markiert.length, 2);
ist('US-Schuhgrössen im Text bleiben unverändert', u('3 sizes: S (US women’s 6—8, US men’s 5—6.5), M').text, '3 sizes: S (US women’s 6—8, US men’s 5—6.5), M');
// Nichts zu tun
ist('Text ohne US-Mass bleibt Byte für Byte', u('100% cotton • Pre-shrunk • 5 mm thick').text, '100% cotton • Pre-shrunk • 5 mm thick');
ist('Leer und null', [u('').text, u(null).text], ['', '']);
ist('Wörter mit «in»/«oz» am Rand werden nicht angefasst («mountain», «5 pieces»)', u('mountain 5 pieces, 3 sizes').text, 'mountain 5 pieces, 3 sizes');

// ── Grössentabellen
const s574 = M.masstabelleSchweiz(lade(574).sizes, k574);
const t574 = s574.tabellen[0];
const zeile = (tab, label) => tab.messungen.find((m) => m.label === label);
ist('Schuhtabelle: «Europe» ist System EU, nicht markiert', [zeile(t574, 'Europe').art, zeile(t574, 'Europe').einheit, zeile(t574, 'Europe').markiert], ['system', 'EU', false]);
ist('Schuhtabelle: «US Men» bleibt US und ist markiert', [zeile(t574, 'US Men').art, zeile(t574, 'US Men').einheit, zeile(t574, 'US Men').markiert], ['system', 'US', true]);
ist('Schuhtabelle: «UK» bleibt UK und ist markiert', [zeile(t574, 'UK').einheit, zeile(t574, 'UK').markiert], ['UK', true]);
ist('Schuhtabelle: «Japan» ist JP und markiert', [zeile(t574, 'Japan').einheit, zeile(t574, 'Japan').markiert], ['JP', true]);
ist('Schuhtabelle: Europe-Wert zu US 9 = 42,5', zeile(t574, 'Europe').werte.find((w) => w.groesse === '9').wert, 42.5);
// «Foot Length» 9.13″ (US 5) = 23,19 cm → 23,2
ist('Schuhtabelle: Fusslänge US 5: 9.13″ → 23,2 cm', zeile(t574, 'Foot Length').werte.find((w) => w.groesse === '5').anzeige, '23,2 cm');
ist('Schuhtabelle: Fusslänge ist eine Länge in cm', [zeile(t574, 'Foot Length').art, zeile(t574, 'Foot Length').einheit], ['laenge', 'cm']);
ist('Schuhtabelle: Zeilen-Grösse mit EU-Etikett («5» → «EU 37,5»)', zeile(t574, 'Europe').werte[0].groesseAnzeige, 'EU 37,5');
const s71 = M.masstabelleSchweiz(lade(71).sizes, M.kontextAusKatalog(lade(71)));
const my71 = s71.tabellen.find((t) => t.typ === 'measure_yourself');
// Länge XS 27″ = 68,58 → 68,6; Brust XS 31–34″ = 78,74–86,36 → 78,7–86,4
ist('T-Shirt: Länge XS 27″ → 68,6 cm', zeile(my71, 'Length').werte.find((w) => w.groesse === 'XS').anzeige, '68,6 cm');
ist('T-Shirt: Brust XS 31–34″ → 78,7–86,4 cm', zeile(my71, 'Chest').werte.find((w) => w.groesse === 'XS').anzeige, '78,7–86,4 cm');
ist('T-Shirt: Brust-Bereich als Zahlen', (({ min, max }) => [min, max])(zeile(my71, 'Chest').werte.find((w) => w.groesse === 'XS')), [78.7, 86.4]);
ist('Tabelle mit «Weight» in lb → kg und Bereichsform', (() => {
  const r = M.masstabelleSchweiz({ size_tables: [{ type: 'measure_yourself', unit: 'inches', measurements: [{ type_label: 'Weight', values: [{ size: '6-12m', min_value: '16', max_value: '22' }] }] }] });
  return [r.tabellen[0].messungen[0].art, r.tabellen[0].messungen[0].einheit, r.tabellen[0].messungen[0].werte[0].anzeige];
})(), ['gewicht', 'kg', '7,3–10 kg']); // 16 lb = 7,257 → 7,3; 22 lb = 9,979 → 10
ist('Tabelle mit Bruchwerten «7 3/4» → 19,7 cm', M.masstabelleSchweiz({ size_tables: [{ type: 'product_measure', unit: 'inches', measurements: [{ type_label: 'Sleeve Length', values: [{ size: 'S', value: '7 3/4' }] }] }] }).tabellen[0].messungen[0].werte[0].anzeige, '19,7 cm'); // 7,75″ = 19,685
ist('Tabelle ohne Tabellen', M.masstabelleSchweiz({ size_tables: [] }), { tabellen: [] });
ist('Tabelle mit unlesbarem Wert → null statt Fehler', M.masstabelleSchweiz({ size_tables: [{ type: 'x', unit: 'inches', measurements: [{ type_label: 'Length', values: [{ size: 'S', value: 'abc' }] }] }] }).tabellen[0].messungen[0].werte[0].wert, null);
ist('Tabelle: US/EU-Schuhzeilen mit Einheit «none» werden nicht umgerechnet', M.masstabelleSchweiz({ size_tables: [{ type: 'product_measure', unit: 'none', measurements: [{ type_label: 'US men shoe size', values: [{ size: 'M', min_value: '6', max_value: '8.5' }] }] }] }).tabellen[0].messungen[0].werte[0].anzeige, '6–8,5');

// ── Eigenschaft über alle Katalog-Fixtures: nach der Umrechnung bleibt kein US-Mass unmarkiert
const REST = /\d\s*(?:″|”|“|")|\b\d+(?:\.\d+)?\s*(?:in|inch|inches)\b|\boz\b|\blbs?\b|\bft\b|°\s*F\b|\byd\b|\bgal(?:lons?)?\b|\bmil\b/i;
const htmlZuText = (h) => String(h ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|div|h\d)>/gi, '\n').replace(/<li[^>]*>/gi, '• ').replace(/<[^>]+>/g, '');
for (const id of [71, 19, 268, 798, 206, 388, 574, 861, 764, 769]) {
  const kat = lade(id); const k = M.kontextAusKatalog(kat);
  const r = M.umrechneText(htmlZuText(kat.produkt.description), k);
  ist(`Fixture ${id}: Beschreibung ohne US-Mass nach der Umrechnung`, REST.test(r.text) ? r.markiert.length > 0 : true, true);
  for (const v of kat.varianten) {
    const a = M.groesseAnzeige(v.size, k);
    if (REST.test(String(a.anzeige))) ist(`Fixture ${id}: Grösse «${v.size}» → «${a.anzeige}» ist markiert`, a.markiert, true);
  }
}
ist('Fixture 19: Beschreibung nennt kein «oz» mehr (11/15/20 oz → ml)', htmlZuText(lade(19).produkt.description).includes('oz') && !M.umrechneText(htmlZuText(lade(19).produkt.description), M.kontextAusKatalog(lade(19))).text.includes(' oz'), true);
keinTeil('Fixture 71: kein «oz./yd.²» mehr im umgerechneten Text', M.umrechneText(htmlZuText(lade(71).produkt.description), M.kontextAusKatalog(lade(71))).text, /oz\.?\/yd/);
enthaelt('Fixture 71: Stoffgewicht 142 g/m² bleibt', M.umrechneText(htmlZuText(lade(71).produkt.description), M.kontextAusKatalog(lade(71))).text, '142 g/m²');

console.log(`${ok} bestanden, ${fehl} fehlgeschlagen`);
if (fehl) process.exit(1);
