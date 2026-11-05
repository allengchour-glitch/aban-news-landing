// Test (ohne Netz): echte Textstellen aus den «Selbst gestalten»-Produkten vom 05.11.2026
import assert from 'node:assert/strict';
import { bereinigeText, bereinigeHtml, bereinigeWert, restImperial } from './masse_bereinigen.mjs';
let n = 0; const t = (name, f) => { f(); n++; };
const T = (alt, neu) => t(alt, () => assert.equal(bereinigeText(alt).text, neu, alt));
// Klammer mit Imperial weg
T('• Stoffgewicht: 142 g/m² (4.2 oz./yd²)', '• Stoffgewicht: 142 g/m²');
T('• Stoffgewicht: 170-180 g/m² (5,0–5,3 oz/yd²) ', '• Stoffgewicht: 170-180 g/m² ');
T('• Stoffgewicht: 290 g/m² (8.55 oz/yd²) in den USA', '• Stoffgewicht: 290 g/m² in den USA');
T('• Stoffgewicht: 170 g/m² (5 oz./yd.²)', '• Stoffgewicht: 170 g/m²');
T('• Abmessungen: H 41 cm (16⅛"), B 31 cm (12¼"), T 10 cm (3⅞")', '• Abmessungen: H 41 cm, B 31 cm, T 10 cm');
T('• Stoffgewicht: 305 g/m² (9 oz./yd.²)', '• Stoffgewicht: 305 g/m²');
T('• Maximales Gewicht: 20 kg (44 lbs)', '• Maximales Gewicht: 20 kg');
T('• Taschengrösse: 39 × 39 cm (15 ″ 15 Zoll) <br> • Fassungsvermögen: 10 l (2,6 US gal)', '• Taschengrösse: 39 × 39 cm <br> • Fassungsvermögen: 10 l');
T('• Grifflänge: 67 cm (26 Zoll), Breite 2,5 cm (1 Zoll)', '• Grifflänge: 67 cm, Breite 2,5 cm');
T('7,6 × 7,6 cm (3″)', '7,6 × 7,6 cm');
T('14 × 14 cm (5,5″)', '14 × 14 cm');
// Imperial vorn
T('• 32 oz. (950 ml)', '• 950 ml');
T('• Höhe: 9,92″ (25,2 cm)', '• Höhe: 25,2 cm');
T('• Durchmesser: 3,54″ (9 cm)', '• Durchmesser: 9 cm');
T('• Stoffgewicht: 5,9 oz./yd.² (200 g/m²)', '• Stoffgewicht: 200 g/m²');
T('Format 5,5 × 8,5 Zoll (14 × 21,6 cm), 140 Seiten', 'Format 14 × 21,6 cm, 140 Seiten');
T('Zollformate: 12×16″ ≈ 30×40 cm, 20×28″ ≈ 50×70 cm, 16,5×23,3″ ≈ A2 (42×59,4 cm)', 'Formate: 30×40 cm, 50×70 cm, A2 (42×59,4 cm)');
// Tassen
T('• 11 oz: Höhe 9,6 cm, 8,2 cm Durchmesser', '• 325 ml: Höhe 9,6 cm, 8,2 cm Durchmesser');
T('• 15 oz: Höhe 11,9 cm', '• 444 ml: Höhe 11,9 cm');
T('• 20 oz: Höhe 10,9 cm', '• 591 ml: Höhe 10,9 cm');
T('Grösse: 11 oz (Standard), 15 oz (Gross)', 'Grösse: 325 ml (Standard), 444 ml (Gross)');
// Laptop
T('Grössen für 13″ und 15″ Laptops', 'Grössen für 13 Zoll und 15 Zoll Laptops');
T('Fach für ein 15"-Laptop', 'Fach für ein 15-Zoll-Laptop');
T('Die weisse „10" auf dem Bild', 'Die weisse „10" auf dem Bild');
// Unverändert
for (const s of ['Stoffgewicht: 142 g/m²', '950 ml Wasserflasche', 'Höhe 9,6 cm, 8,2 cm Durchmesser', '100 % Baumwolle', 'Grösse S, M, L, XL', 'Zoll', 'Wir liefern in 10–20 Werktagen', '20 kg']) T(s, s);
// HTML: Tags und Attribute bleiben (auch wenn dort «in»/«"» stehen)
{
  const h = '<div id="x" data-img-map=\'{"1": "https://cdn.shopify.com/s/files/a.jpg?v=1"}\' data-ratio="1.414"></div>\n• 11 oz: Höhe 9,6 cm<br>• 142 g/m² (4.2 oz./yd²)';
  const r = bereinigeHtml(h);
  assert.equal(r.html, '<div id="x" data-img-map=\'{"1": "https://cdn.shopify.com/s/files/a.jpg?v=1"}\' data-ratio="1.414"></div>\n• 325 ml: Höhe 9,6 cm<br>• 142 g/m²'); n++;
  assert.ok(r.treffer.length >= 2); n++;
  assert.deepEqual(restImperial(r.html), []); n++;
}
// Optionswerte
t('opt1', () => assert.equal(bereinigeWert('11 oz (Standard)'), '325 ml (Standard)'));
t('opt2', () => assert.equal(bereinigeWert('15 oz'), '444 ml'));
t('opt3', () => assert.equal(bereinigeWert('20 oz'), '591 ml'));
t('opt4', () => assert.equal(bereinigeWert('7,6 × 7,6 cm (3″)'), '7,6 × 7,6 cm'));
t('opt5', () => assert.equal(bereinigeWert('13″'), '13 Zoll'));
t('opt6', () => assert.equal(bereinigeWert('15″'), '15 Zoll'));
t('opt7', () => assert.equal(bereinigeWert('S'), null));
t('opt8', () => assert.equal(bereinigeWert('Weiss'), null));
t('opt9', () => assert.equal(bereinigeWert('325 ml'), null));
// Rest-Melder findet noch Imperiales
t('rest1', () => assert.ok(restImperial('Höhe 9,92″ ohne cm').length === 1));
t('rest2', () => assert.ok(restImperial('Fassungsvermögen 2,6 US gal').length >= 1));
t('rest3', () => assert.deepEqual(restImperial('Laptops mit 13 Zoll'), restImperial('Laptops mit 13 Zoll')));
t('rest5', () => assert.deepEqual(restImperial('Grössen für 13 Zoll und 15 Zoll Laptops'), []));
t('rest6', () => assert.deepEqual(restImperial('13 Zoll'), []));
t('rest7', () => assert.equal(restImperial('Höhe 9 Zoll').length, 1));
t('rest4', () => assert.deepEqual(restImperial('Die weisse „10" auf dem Bild'), []));
// Idempotenz
t('idem', () => { const a = bereinigeText('• 11 oz: Höhe 9,6 cm (3,8″)').text; assert.equal(bereinigeText(a).text, a); });
console.log(`masse_bereinigen_test: ${n} Prüfungen grün`);
