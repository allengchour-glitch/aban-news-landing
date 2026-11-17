/** Test für die Silber-Feingehalts-Regel (automation/lib/silber_feingehalt.mjs). Reine Funktion, kein Netz.
 *  Die Beispiele unten sind gebaut wie die echten Texte (Titel, Beschreibungen und Optionen aus dem Katalog vom 17.11.2026); die echten Urteile
 *  stehen in dropship/silber-bazg-1711/urteile.json und werden im Abgleichstest (silber_abgleich_test.mjs) gegen die Regel gehalten.
 *  Lauf: /opt/node22/bin/node automation/lib/silber_feingehalt_test.mjs   */
import { silberFeingehalt, istSilberFeingehalt, fundstellen, bereinige, belegText, optionsText } from './silber_feingehalt.mjs';

let n = 0, fehler = 0;
const pruef = (name, ist, soll) => {
  n++;
  const ok = JSON.stringify(ist) === JSON.stringify(soll);
  if (!ok) { fehler++; console.log(`FAIL ${name}\n     ist  ${JSON.stringify(ist)}\n     soll ${JSON.stringify(soll)}`); }
};
const treffer = (name, p) => pruef(name, istSilberFeingehalt(p), true);
const keiner = (name, p) => pruef(name, istSilberFeingehalt(p), false);

// ── 1. Titel ──
treffer('925 im Titel', { title: '925 Silber Ring «Luna»' });
treffer('S925 im Titel', { title: 'S925 Ohrstecker Herz' });
treffer('Ag925 im Titel', { title: 'Ag925 Armband' });
treffer('Ag 925 mit Leerzeichen', { title: 'Armband Ag 925 Kette' });
treffer('Sterling im Titel', { title: 'Sterlingsilber Kette «Wave»' });
treffer('Sterling Silver englisch', { title: 'Sterling Silver Anhänger' });
treffer('999 Silber im Titel', { title: '999 Silber-Anhänger «Fortuna»' });
for (const z of ['999', '990', '958', '950', '900', '835', '800']) treffer(`Silber ${z}`, { title: `Silber ${z} Armreif` });
treffer('Silber 999 (umgekehrte Reihenfolge)', { title: 'Silber 999 Münze' });
treffer('990 Silber', { title: 'Kette aus 990 Silber' });
treffer('Feinsilber', { title: 'Feinsilber Armreif' });
treffer('Echtsilber', { title: 'Ring aus Echtsilber' });
treffer('925er', { title: '925er Silberring' });
treffer('«925» mit Anführungszeichen', { title: 'Ring «925» Zirkonia' });
treffer('Komma ohne Leerzeichen davor', { title: 'Ring', description: 'Material: Kupfer,925 Silber' });
treffer('Punkt ohne Leerzeichen davor', { title: 'Ring', description: 'Material:Silber.925' });

// ── 2. Beschreibung (Text und HTML) ──
treffer('Material: 925 Sterling Silber', { title: 'Zirkonia Ohrringe', description: 'Material: 925 Sterling Silber, hypoallergen.' });
treffer('im HTML-Absatz', { title: 'Armband', description: '<p>Hochwertiges <strong>S925</strong> Silber.</p>' });
treffer('HTML-Entität nbsp', { title: 'Kette', description: 'Material:&nbsp;925&nbsp;Silber' });
treffer('92,5 % Silber', { title: 'Ring', description: 'Legierung: 92,5 % Silber, 7,5 % Kupfer' });
treffer('Silber 92.5%', { title: 'Ring', description: 'Silber 92.5% Feingehalt' });
treffer('Nur ein Teil: S925-Nadel', { title: 'Perlenohrringe', description: 'Ohrstecker-Nadel S925, Körper Legierung.' });
treffer('Satz mit Komma davor ist KEINE Verneinung', { title: 'Ring', description: 'Nicht rostend, aus 925 Silber gefertigt.' });
treffer('Verneinung des Gegenteils bleibt Treffer', { title: 'Ring', description: 'Nicht aus Plastik, sondern 925 Sterlingsilber.' });
treffer('Verneinung weiter als drei Wörter davor gilt nicht', { title: 'Ring', description: 'Das ist nicht aus Metall gefertigt aber 925 Silber trägt' });
treffer('descriptionHtml als Feld (Shopify-Name)', { title: 'Ring', descriptionHtml: '<p>S925</p>' });
treffer('Silberwort «Ag» neben 999', { title: 'Ag 999 Barren Anhänger' });
treffer('Satzzeichen beendet die Verneinung (Komma)', { title: 'Ring', description: 'Kein Plastik, 925 Silber' });
treffer('Satzzeichen beendet die Verneinung (Punkt)', { title: 'Ring', description: 'Das ist kein Plastik. 925 Silber.' });
treffer('Satzzeichen beendet die Verneinung (Zeilenumbruch)', { title: 'Ring', description: 'Nicht rostend\n925 Silber' });
treffer('Aufzählung: «Ohne Nickel» davor, 925 in der nächsten Zeile', { title: 'Ring', description: 'Ohne Nickel\n925 Silber' });
treffer('Aufzählung als HTML-Liste', { title: 'Ring', description: '<ul><li>Ohne Nickel</li><li>925 Silber</li></ul>' });
treffer('Absatzgrenze <p>', { title: 'Ring', description: '<p>Kein Nickel</p><p>S925 Silber</p>' });
treffer('Zeilenumbruch <br>', { title: 'Ring', description: 'Kein Nickel<br>S925 Silber' });
keiner('Verneinung im selben Absatz bleibt Verneinung', { title: 'Ring', description: '<p>Edelstahl, kein Sterlingsilber</p>' });

// ── 3. Optionen ──
treffer('Option Material 925 Silber', { title: 'Ring', options: [{ name: 'Material', values: ['925 Silber', 'Gold'] }] });
treffer('Option als Text', { title: 'Ring', options: 'Material: Sterling Silver / Roségold' });
treffer('Option 925 als Wert', { title: 'Ring', options: [{ name: 'Feingehalt', values: ['925'] }] });

// ── 4. Keine Feingehaltsangabe ──
keiner('leer', {});
keiner('nur Silberfarbe', { title: 'Armband silberfarben', description: 'Edelstahl, silberfarben, wasserfest.' });
keiner('Silber-Optik', { title: 'Kette Silber-Optik', description: 'Legierung in Silber-Optik.' });
keiner('versilbert ohne Zahl', { title: 'Ring versilbert', description: 'Messing versilbert.' });
keiner('925 mAh', { title: 'Akku', description: 'Kapazität 925 mAh.' });
keiner('925 mm', { title: 'Seil', description: 'Länge 925 mm.' });
keiner('925 g', { title: 'Beutel', description: 'Gewicht 925 g.' });
keiner('925 Stück', { title: 'Perlen', description: '925 Stück im Set.' });
keiner('19250 ist keine 925', { title: 'Artikel 19250' });
keiner('9250 ist keine 925 (Zahl geht weiter)', { title: 'Artikel 9250' });
keiner('925000 ist keine 925', { title: 'Artikel 925000' });
keiner('Baujahr 1925', { title: 'Uhr Baujahr 1925' });
keiner('Dezimalzahl 9.25', { title: 'Länge 9.25 cm' });
keiner('Tausenderzahl 1,925', { title: 'Preis 1,925' });
keiner('Tausenderzahl 1.925', { title: 'Preis 1.925' });
keiner('800 Stück neben Silber', { title: 'Silber Perlen', description: '800 Stück im Beutel.' });
keiner('Edelstahl 800 ohne Silberwort', { title: 'Edelstahl 800 Schleifpapier' });

// ── 5. Verneinung unmittelbar vor der Angabe ──
keiner('kein Sterlingsilber', { title: 'Ring', description: 'Edelstahl, kein Sterlingsilber.' });
keiner('nicht aus Sterlingsilber', { title: 'Ring', description: 'Silberfarben, nicht aus Sterlingsilber.' });
keiner('ohne 925 Stempel', { title: 'Ring', description: 'Messing, ohne 925 Stempel.' });
keiner('statt Sterling Silber', { title: 'Ring', description: 'Edelstahl statt Sterling Silber.' });
keiner('nicht um Edelstahl- oder Sterlingsilber-Schmuck (drei Wörter dazwischen)', { title: 'Ohrstecker', description: 'Es handelt sich um modischen Schmuck, nicht um Edelstahl- oder Sterlingsilber-Schmuck.' });
keiner('Vergleich: Anders als 925er Silber', { title: 'Set', description: 'Anders als 925er Silber läuft dieser Edelstahl nicht an.' });
keiner('Vergleich: im Gegensatz zu Sterlingsilber', { title: 'Set', description: 'Im Gegensatz zu Sterlingsilber ist dieses Metall nickelfrei.' });
keiner('Vergleich: im Vergleich zu 925 Silber', { title: 'Set', description: 'Im Vergleich zu 925 Silber ist Edelstahl robuster.' });
keiner('Vergleich: gegenüber Sterling Silber', { title: 'Set', description: 'Gegenüber Sterling Silber hat Edelstahl Vorteile.' });
keiner('Vergleich: compared to', { title: 'Set', description: 'Compared to sterling silver this steel is harder.' });
keiner('English not sterling', { title: 'Ring', description: 'Stainless steel, not sterling silver.' });
{
  const r = silberFeingehalt({ title: 'Ring', description: 'Edelstahl, kein Sterlingsilber.' });
  pruef('Verneinung wird als verneint gemeldet', [r.treffer, r.verneint.length, r.belege.length], [false, 1, 0]);
}

// ── 6. Belege ──
{
  const r = silberFeingehalt({ title: '925 Ring', description: 'Sterlingsilber.', options: [{ name: 'Material', values: ['925 Silber'] }] });
  pruef('Felder der Belege', [...new Set(r.belege.map((b) => b.feld))].sort(), ['beschreibung', 'option', 'titel']);
  pruef('Belegtext hat höchstens drei Teile', belegText(r).split(' | ').length <= 3, true);
  pruef('Belegtext nennt Feld und Art', /titel\/925/.test(belegText(r)), true);
}
pruef('fundstellen: Umgebung höchstens 100 Zeichen', fundstellen('x'.repeat(100) + ' 925 silber ' + 'y'.repeat(100) + ' silber ' + 'z'.repeat(20) + ' 999').treffer.every((t) => t.text.length <= 100), true);
{
  const r = silberFeingehalt({ title: 'S925 Ring', description: 'Sterling 925 Sterling Silver 925', options: 'Material: 925' });
  pruef('Belegtext: auch bei vielen Fundstellen höchstens drei Teile', [r.belege.length > 3, belegText(r).split(' | ').length], [true, 3]);
  pruef('Umgebung höchstens 100 Zeichen im ungünstigsten Fall (92,5 neben Silber)', fundstellen('silber' + 'x'.repeat(30) + ' 92,5 ' + 'y'.repeat(30) + ' silber 92,5 ' + 'z'.repeat(60)).treffer.every((t) => t.text.length <= 100), true);
}
pruef('bereinige: HTML, Entität, Grossschreibung', bereinige('<span>S925&nbsp;Silber</span>'), 's925 silber');
pruef('Stabil bei undefined und null', [istSilberFeingehalt(undefined), istSilberFeingehalt(null), istSilberFeingehalt({ title: null, description: null, options: null })], [false, false, false]);


// ── 7. Nachtrag 17.11.2026 (drei unabhängige Prüfer, jeder Fund nachgestellt) ──
// 7a. Titel tragen keine Satzzeichen: «ohne Nickel», «no allergy» verneinen die 925 danach NICHT (das war ein Blocker).
treffer('Titel: Ohne Nickel 925 Sterling Silber', { title: 'Ohne Nickel 925 Sterling Silber Ohrringe' });
treffer('Titel: No Allergy 925 Sterling Silver', { title: 'No Allergy 925 Sterling Silver Earrings' });
treffer('Titel: Not Fade 925 Silver', { title: 'Not Fade 925 Silver Necklace Women' });
treffer('Titel: Keine Allergie Keine Verblassen 925', { title: 'Keine Allergie Keine Verblassen 925 Silber Halskette' });
treffer('Titel: No 1 Bestseller 925', { title: 'No 1 Bestseller 925 Sterling Silver Ring' });
treffer('Text: Nicht rostend und allergiefrei 925 Silber', { title: 'Ring', description: 'Nicht rostend und allergiefrei 925 Silber' });
treffer('Text: Hypoallergen, ohne Nickel und Blei 925 Silber', { title: 'Ring', description: 'Hypoallergen, ohne Nickel und Blei 925 Silber' });
treffer('Text: Without Nickel 925 Sterling Silver', { title: 'Ring', description: 'Without Nickel 925 Sterling Silver, 18 mm' });
treffer('Text: Not plated Fine Silver S999', { title: 'Ring', description: 'Not plated Fine Silver S999' });
keiner('Verneinung mit Füllwörtern bleibt Verneinung: nicht aus echtem 925 Silber', { title: 'Ring', description: 'Das ist nicht aus echtem 925 Silber.' });
keiner('Verneinung: weder … noch bleibt bei direkter Angabe', { title: 'Ring', description: 'Ring ohne 925 Stempel' });
// 7b. Schmuck-Schreibweisen ohne Silberwort
treffer('Ag999', { title: 'Ag999 Anhänger Glück' });
treffer('S999', { title: 'S999 Armreif Damen' });
treffer('S990', { title: 'S990 Fusskettchen' });
treffer('Silber 9999', { title: 'Silber 9999 Armreif' });
treffer('Ag9999', { title: 'Ag9999 Armreif' });
treffer('Ag950 ohne Trenner', { title: 'Ag950 Ring' });
treffer('Silber 935 und 875', { title: 'Ring', description: 'Silber 935' });
treffer('Silber 875', { title: 'Ring', description: 'Feingehalt Silber 875' });
keiner('Firma «Rubie AG 800 Zürich» ist kein Silber', { title: 'Kostüm', description: 'Importeur Rubie AG 800 Zürich' });
keiner('Firma «Müller AG, Bahnhofstrasse 900»', { title: 'Kostüm', description: 'Hersteller: Müller AG, Bahnhofstrasse 900' });
keiner('S900 ist ein Modell, kein Feingehalt', { title: 'S900 Smartwatch' });
// 7c. Beugungsformen und andere Sprachen
treffer('aus echtem Silber', { title: 'Ring aus echtem Silber' });
treffer('aus reinem Silber', { title: 'Ring aus reinem Silber' });
treffer('Reinsilber', { title: 'Reinsilber Anhänger' });
treffer('aus massivem Silber', { title: 'Anhänger aus massivem Silber' });
treffer('Silber massiv', { title: 'Silber massiv, handgefertigt' });
treffer('Plata de ley', { title: 'Anillo', description: 'Plata de ley' });
treffer('Argent massif', { title: 'Bague', description: 'Argent massif' });
treffer('Argentium', { title: 'Argentium Ring' });
// 7d. Prozent und Dezimalschreibweise
treffer('99,9 % Silber', { title: 'Ring', description: 'Silber 99,9 % rein' });
treffer('100 % Silber', { title: 'Ring', description: 'Besteht zu 100% aus Silber' });
treffer('90 % Silber', { title: 'Ring', description: 'Besteht zu 90% aus Silber' });
treffer('Silberanteil 80 %', { title: 'Ring', description: 'Silberanteil 80 %' });
treffer('0.925 Silber', { title: 'Ring', description: 'Silver Fineness 0.925' });
treffer('92,50 Prozent', { title: 'Ring', description: 'Silber 92.50 %' });
// 7e. Mengen, Preise, Nummern: keine Feingehaltsangabe
for (const [n2, t] of [['Modellnummer GT925', 'Kopfhörer GT925 Bluetooth'], ['Art.-Nr. 925', 'Art.-Nr. 925'], ['Preis CHF 925.00', 'Preis: CHF 925.00'], ['Preis 925,50 CHF', 'Preis: 925,50 CHF'],
  ['Länge 925.5 mm', 'Länge 925.5 mm'], ['Höhe 925-1050 mm', 'Höhe 925-1050 mm verstellbar'], ['Grösse 925x600 mm', 'Grösse: 925x600 mm'], ['925 Grad', 'Bis 925 Grad Celsius'],
  ['925 Bewertungen', '925 Bewertungen, 4,8 Sterne'], ['925 Stunden', 'Laufzeit bis 925 Stunden'], ['Hex-Farbcode', 'Farbe: #925fff Violett'], ['SKU CJ925', 'SKU CJ925'],
  ['925 Ohm', '925 Ohm'], ['925 l/h', 'Durchfluss 925 l/h'], ['Telefon', 'Tel. 044 925 11 22'], ['Bild-URL', 'Bild-Link https://cdn.example.com/img/925/produkt.jpg'],
  ['925 Watt', '925 Watt Staubsauger'], ['925 Pixel', '925 Pixel breit'], ['925 Euro', '925 Euro'], ['925 Teile', '925 Teile im Set'], ['925 Perlen', '925 Perlen im Beutel']]) {
  keiner(`Kein Feingehalt: ${n2}`, { title: 'Artikel', description: t });
}
keiner('FM 92.5 MHz mit Farbe Silber', { title: 'Radio', description: 'FM 92.5 MHz, Gehäuse silber' });
keiner('Diagonale 92.5 cm mit Farbe Silber', { title: 'Bildschirm', description: 'Farbe: Silber, Diagonale 92.5 cm' });
keiner('Silver 900 RPM', { title: 'Ventilator', description: 'Ventilator silver 900 RPM' });
keiner('Silver 900 Series', { title: 'Smartphone', description: 'Silver 900 Series Smartphone' });
keiner('Farbe Silver, Size 800*600mm', { title: 'Monitor', description: 'Farbe: Silver, Size: 800*600mm' });
treffer('«925» als eigenes Wort bleibt Treffer: Ring 925 Zirkonia', { title: 'Ring 925 Zirkonia' });
treffer('«S925» und «Ag925» bleiben Treffer', { title: 'S925 Ohrstecker Ag925 Anhänger' });
// 7f. Eingabeformen: Optionen aus dem Freigabe-Tor (optionValues), Zeichenketten, Einzelobjekt, value; description leer, descriptionHtml gefüllt
treffer('Option optionValues (Freigabe-Tor)', { title: 'Ring', description: '', options: [{ id: 'gid://shopify/ProductOption/1', name: 'Material', optionValues: [{ id: 'x', name: '925 Silver' }] }] });
treffer('Option als Liste von Zeichenketten', { title: 'Ring', options: ['925 Silber'] });
treffer('Option als Einzelobjekt', { title: 'Ring', options: { name: 'Material', values: ['925 Silber'] } });
treffer('Option mit value', { title: 'Ring', options: [{ name: 'Material', value: '925 Silber' }] });
treffer('description leer, descriptionHtml gefüllt', { title: 'Ring', description: '', descriptionHtml: '<p>S925 Silber</p>' });
keiner('Optionen ohne Angabe', { title: 'Ring', options: [{ name: 'Grösse', optionValues: [{ name: '17' }, { name: '18' }] }] });
pruef('optionsText: null und leer', [optionsText(null), optionsText([]), optionsText([null])], ['', '', '']);
// 7g. bereinige: «<» als Vergleichszeichen, unsichtbare Zeichen, Laufzeit
treffer('«<5 g» frisst keinen Text', { title: 'Ring', description: 'Gewicht <5 g, aus 925 Silber, Grösse >17' });
treffer('Soft-Hyphen mitten im Wort', { title: 'Ster­ling Ring' });
treffer('&shy; mitten im Wort', { title: 'Ring', description: 'Ster&shy;ling' });
treffer('Nullbreitenzeichen mitten im Wort', { title: 'Ster​ling Ring' });
{
  const t0 = performance.now(); const r = istSilberFeingehalt({ title: 'Ring', description: '<'.repeat(60000) + ' 925 silber' }); const ms = performance.now() - t0;
  pruef('Viele «<» ohne «>»: Treffer und nicht quadratisch (unter 1 s)', [r, ms < 1000], [true, true]);
}
{
  const t0 = performance.now(); const r = istSilberFeingehalt({ title: 'Ring', description: 'silber 925 '.repeat(130000) });
  pruef('Über 120000 Fundstellen: kein RangeError', [r, performance.now() - t0 < 30000], [true, true]);
}
{
  const t0 = performance.now(); istSilberFeingehalt({ title: 'Ring', description: 'x'.repeat(200000) }); const ms = performance.now() - t0;
  pruef('200000 Zeichen ohne Fundstelle in unter 2 s', ms < 2000, true);
}


// 7h. Wortgrenzen, Farbnamen, Textilien (erste Messung am echten Katalog 17.11.: 12 Treffer, davon 9 Fehltreffer durch diese Fälle)
keiner('«geeignet für beide Geschlechter Silber» ist kein «echter Silber»', { title: 'Strassring', description: 'Design, geeignet für beide Geschlechter silber mit goldener Electroplating-Oberfläche' });
keiner('«rein silber» getrennt ist ein Farbname (Uhr: rein gold oder rein silber)', { title: 'Quarzuhr', description: 'Voll gold, silber schwarz und rein silber. Das zeichnet es aus.' });
treffer('«reines Silber» im Text', { title: 'Ring', description: 'Der Ring besteht aus reines Silber? Nein: aus reinem Silber gefertigt' });
treffer('«Reinsilber» im Text', { title: 'Armreif', description: 'Design aus gebürstetem Reinsilber mit Vintage-Finish' });
keiner('Optionen: Farbname «Reines Silber» zählt nicht', { title: 'Video-Türklingel', options: [{ name: 'Farbe', values: ['Silber', 'Schwarz', 'Reines Silber'] }] });
keiner('Optionen: Farbname «Pure Silver» zählt nicht', { title: 'Hülle', options: [{ name: 'Color', values: ['Pure Silver'] }] });
treffer('Titel: «Pure Silver» zählt im Titel (Schmuck)', { title: 'Pure Silver Ring' });
keiner('Textil: «100% Polyester» neben Farbe silbergrau', { title: 'Langarmshirt', description: 'In Blau, Schwarz und Silbergrau hergestellt aus 100% Polyester, veredelt mit Sandwäsche' });
keiner('Textil: Pailletten Silber und 100% Polyester', { title: 'Pailletten-Top', description: 'Champagner, Grün, Hellrot und Silber. Es besteht zu 100% aus Polyester.' });
treffer('Prozent: «zu 100 % aus Silber»', { title: 'Ring', description: 'Besteht zu 100 % aus Silber' });
treffer('Prozent: «Silberanteil 80 %»', { title: 'Ring', description: 'Silberanteil: 80 %' });
keiner('«Silber massivholz Rahmen» ist Holz', { title: 'Deko-Set', options: [{ name: 'Farbe', values: ['hellwalnuss vintage Rahmen', 'silber massivholz Rahmen'] }] });
keiner('«Silber massivholz» auch in der Beschreibung', { title: 'Deko-Set', description: 'Rahmen in Silber massivholz' });
treffer('«Silber massiv» bleibt Treffer', { title: 'Anhänger', description: 'Silber massiv, handgefertigt' });
keiner('«nicht um Edelstahl oder massives Silber» ist verneint', { title: 'Armreif', description: 'Da es sich nicht um Edelstahl oder massives Silber handelt, ist der Armreif nicht wasserfest.' });
treffer('Verneinung mit «oder»-Kette endet am Satzzeichen', { title: 'Armreif', description: 'Nicht aus Edelstahl oder Messing, aus massivem Silber.' });

// 7i. Ränder der Regel: jeder Teil hat einen Test, der ohne ihn rot wird (Mutationsprobe 17.11.; die ersten Tests stellten die Verneinung nie auf die Probe)
// Blockgrenzen beenden die Verneinung («Nicht aus» + Ende + «925 Silber»)
for (const g of ['<br>', '<br/>', '<br />', '<br class="x">', '</p>', '</li>', '</div>', '</h2>', '</tr>', '</td>', '</ul>', '</ol>', '\n', '\r\n', '\n\n'])
  treffer(`Blockgrenze ${JSON.stringify(g)} beendet die Verneinung`, { title: 'Ring', description: `Nicht aus${g}925 Silber` });
keiner('<breadcrumb> ist keine Blockgrenze (nur <br>)', { title: 'Ring', description: 'Nicht aus<breadcrumb>925 Silber' });
keiner('Tag ohne Blockgrenze (<span>) lässt die Verneinung stehen', { title: 'Ring', description: 'Nicht aus <span>925</span> Silber' });
treffer('description und descriptionHtml sind getrennte Sätze', { title: 'Ring', description: 'Ohne', descriptionHtml: '925 Silber' });
treffer('Optionen sind getrennte Einträge', { title: 'Ring', options: ['Ohne', '925 Silber'] });
treffer('Optionsname trennt: «Nicht aus: 925 Silber»', { title: 'Ring', options: [{ name: 'Nicht aus', values: ['925 Silber'] }] });
treffer('optionValues als Zeichenketten', { title: 'Ring', options: [{ name: 'Material', optionValues: ['925 Silber'] }] });
treffer('optionValues mit leerem Eintrag', { title: 'Ring', options: [{ name: 'Material', optionValues: [null, { name: '925 Silber' }] }] });
treffer('Optionsliste mit leerem Eintrag', { title: 'Ring', options: [null, { name: 'Material', values: ['925 Silber'] }] });
// HTML-Entitäten und Zeichen
keiner('&nbsp; vor der Zahl: Preis CHF&nbsp;925', { title: 'Artikel', description: 'Preis CHF&nbsp;925' });
keiner('&#160; vor der Zahl: Preis CHF&#160;925', { title: 'Artikel', description: 'Preis CHF&#160;925' });
keiner('doppelt kodiert: Preis CHF&amp;nbsp;925', { title: 'Artikel', description: 'Preis CHF&amp;nbsp;925' });
keiner('mehrere Leerzeichen werden eins: Preis CHF   925', { title: 'Artikel', description: 'Preis CHF   925' });
treffer('weicher Trenner &shy; in S9&shy;25', { title: 'Ring S9&shy;25' });
treffer('weicher Trenner &#173; in S9&#173;25', { title: 'Ring S9&#173;25' });
treffer('weicher Trenner &#xad; in S9&#xad;25', { title: 'Ring S9&#xad;25' });
treffer('Zeichen U+00AD in S9­25', { title: 'Ring S9­25' });
treffer('Zeichen U+200B in S9​25', { title: 'Ring S9​25' });
treffer('Zeichen U+2060 in S9⁠25', { title: 'Ring S9⁠25' });
treffer('Zeichen U+FEFF in S9﻿25', { title: 'Ring S9﻿25' });
treffer('Vollbreite Ziffern S９２５', { title: 'Ring S９２５' });
treffer('Grossbuchstaben STERLING SILVER', { title: 'RING STERLING SILVER' });
// «925» in Nummern und Preisen: jedes Präfix einzeln
for (const pre of ['CHF', 'EUR', 'USD', '€', '$', 'Nr', 'Nr.', 'Tel', 'Tel.', 'SKU', 'Seite', 'Preis', 'Preis:', 'Price', 'Price:']) {
  keiner(`Präfix «${pre}» vor 925`, { title: 'Artikel', description: `Wert ${pre} 925 total` });
}
keiner('€925 ohne Leerzeichen', { title: 'Artikel', description: 'Preis €925 total' });
keiner('$925 ohne Leerzeichen', { title: 'Artikel', description: 'Preis $925 total' });
keiner('#925 ist eine Nummer', { title: 'Artikel', description: 'Bestellnummer #925' });
keiner('/925 im Pfad', { title: 'Artikel', description: 'Pfad a/925 hier' });
keiner('Faktor 0,925 ohne Silber', { title: 'Artikel', description: 'Faktor 0,925 total' });
treffer('«S-925» mit Bindestrich', { title: 'S-925 Anhänger' });
treffer('«Ag-925» mit Bindestrich', { title: 'Ag-925 Anhänger' });
treffer('«Ag 925» mit Leerzeichen', { title: 'Ag 925 Anhänger' });
treffer('«S 925» mit Leerzeichen', { title: 'S 925 Anhänger' });
// Zahlenränder
keiner('925,5 ist eine Dezimalzahl', { title: 'Artikel', description: 'Wert 925,5 total' });
keiner('925.50 ist eine Dezimalzahl', { title: 'Artikel', description: 'Wert 925.50 total' });
keiner('925×600', { title: 'Artikel', description: 'Mass 925×600 total' });
keiner('925*600', { title: 'Artikel', description: 'Mass 925*600 total' });
keiner('925 x 600', { title: 'Artikel', description: 'Mass 925 x 600 total' });
keiner('925 12 34 (Rufnummer)', { title: 'Artikel', description: 'Hotline 925 12 34 erreichbar' });
treffer('«925 Münze»: m + Umlaut ist keine Einheit', { title: 'Ring 925 Münze' });
treffer('«925 Mädchen»: m + Umlaut ist keine Einheit', { title: 'Ring 925 Mädchen' });
treffer('«925 Gold»: g + Buchstabe ist keine Einheit', { title: 'Armband 925 Gold plattiert' });
keiner('Prozentzeichen hinter der Zahl: 99,9 % Kupfer, Armband in Silberfarbe', { title: 'Armband', description: 'Kupfer 99,9 % rein, Armband in Silberfarbe' });
// alle Einheiten einzeln
for (const u of ['mah', 'mm', 'cm', 'ml', 'kg', 'gr', 'gramm', 'g', 'v', 'w', 'kw', 'watt', 'hz', 'khz', 'mhz', 'ghz', 'pa', 'hpa', 'kpa', 'lumen', 'lm', 'px', 'pixel', 'pcs', 'stk', 'stück', 'stueck', 'pieces', 'teile', 'perlen', 'blatt', 'steine', 'euro', 'eur', 'chf', 'usd', 'grad', 'ohm', 'stunden', 'std', 'min', 'minuten', 'tage', 'jahre', 'bewertungen', 'bewertung', 'kunden', 'sterne', 'mal', 'tvl', 'rpm', 'series', 'serie', 'millimeter', 'zentimeter', 'l', 'l/h', 'meter', 'm']) {
  keiner(`Einheit «${u}» nach 925`, { title: 'Artikel', description: `Wert 925 ${u} total` });
}
// Abstand zum Silberwort und alle Feingehalte
treffer('Silber … 999 mit Abstand', { title: 'Silber Ring Zertifikat 999' });
treffer('999 … Silber mit Abstand', { title: '999 Stempel Ring Silber' });
keiner('Silber weit weg von 999 (mehr als 25 Zeichen)', { title: 'Ring', description: 'silber' + ' x'.repeat(20) + ' 999' });
keiner('999 weit weg von Silber (mehr als 25 Zeichen)', { title: 'Ring', description: '999' + ' x'.repeat(20) + ' silber' });
for (const z of ['9999', '999', '990', '958', '950', '935', '900', '875', '835', '800']) {
  treffer(`Feingehalt ${z} nach Silber`, { title: 'Ring', description: `Silber ${z}` });
  treffer(`Feingehalt ${z} vor Silber`, { title: 'Ring', description: `${z} Silber` });
}
keiner('Silber 9990 (Zahl geht weiter)', { title: 'Ring', description: 'Silber 9990' });
keiner('Silber 999 mm', { title: 'Ring', description: 'Silber 999 mm' });
// S999 / Ag999 und Verwandte
treffer('S999', { title: 'S999 Ring' });
treffer('S990', { title: 'S990 Ring' });
treffer('S 999', { title: 'S 999 Ring' });
treffer('Ag 990', { title: 'Ag 990 Ring' });
treffer('Ag9999', { title: 'Ag9999 Ring' });
for (const z of ['958', '950', '935', '900', '875', '835', '800']) treffer(`Ag${z}`, { title: `Ag${z} Ring` });
keiner('Tags999: kein Feingehalt (Buchstabe davor)', { title: 'Kollektion Tags999' });
keiner('S9990 (Zahl geht weiter)', { title: 'Typ S9990 Ring' });
keiner('S999 mAh', { title: 'Akku S999 mAh' });
// Dezimalschreibweisen neben Silber
for (const z of ['92,5', '92.5', '92,50', '92.50', '99,9', '99.9', '0,925', '0.925', '0,999', '0.999']) {
  treffer(`Silber ${z}`, { title: 'Ring', description: `Silber ${z} Legierung` });
  treffer(`${z} Silber`, { title: 'Ring', description: `Legierung ${z} Silber` });
}
keiner('92,5 weit weg von Silber', { title: 'Ring', description: '92,5' + ' x'.repeat(20) + ' silber' });
keiner('Silber weit weg von 92,5', { title: 'Ring', description: 'silber' + ' x'.repeat(20) + ' 92,5' });
// Prozent
for (const v of ['100', '99,9', '99.9', '99', '95', '92,5', '92.5', '92,50', '90', '80']) {
  treffer(`Prozent «zu ${v} % aus Silber»`, { title: 'Ring', description: `Besteht zu ${v} % aus Silber` });
  treffer(`Prozent «Silber ${v} %»`, { title: 'Ring', description: `Material Silber ${v} %` });
}
treffer('Prozent «von Silber»', { title: 'Ring', description: 'Anteil 95 % von Silber' });
treffer('Prozent ohne Füllwort: 95 % Silber', { title: 'Ring', description: 'Anteil 95 % Silber' });
treffer('Silbergehalt 90 %', { title: 'Ring', description: 'Silbergehalt 90 %' });
treffer('Silberfeingehalt: 99 %', { title: 'Ring', description: 'Silberfeingehalt: 99 %' });
treffer('Silber: 99 %', { title: 'Ring', description: 'Silber: 99 %' });
keiner('Prozent vor «Silbergrau» ist eine Farbe', { title: 'Hemd', description: 'Gewebe 100 % Silbergrau' });
keiner('50 % Silber ist keine Feingehaltsangabe der Liste', { title: 'Ring', description: 'Teil 50 % Silber' });
// «fein»-Wörter
for (const w of ['fine', 'pure', 'real', 'genuine', 'solid', 'true']) {
  treffer(`${w} silver`, { title: 'Ring', description: `${w} silver ring` });
  treffer(`${w}-silver mit Bindestrich`, { title: 'Ring', description: `${w}-silver ring` });
}
for (const st of ['echt', 'rein', 'massiv']) {
  for (const e of ['e', 'er', 'em', 'en', 'es']) treffer(`${st}${e} Silber`, { title: 'Ring', description: `aus ${st}${e} Silber` });
  treffer(`${st}silber ohne Endung`, { title: 'Ring', description: `${st}silber ring` });
}
treffer('echtes-silber mit Bindestrich', { title: 'Ring', description: 'aus echtes-silber' });
treffer('Feinsilber', { title: 'Ring', description: 'Armreif aus Feinsilber' });
keiner('«Geschlechter Silber»: Buchstabe vor «echter»', { title: 'Ring', description: 'beide Geschlechter Silber' });
keiner('Silber massiv + Buchstabe: «Silber massivholz»', { title: 'Ring', description: 'Rahmen in Silber massivholz' });
// Verneinung: jedes Wort einzeln
for (const w of ['kein', 'keine', 'keinen', 'keinem', 'keiner', 'keines', 'nicht', 'ohne', 'statt', 'anstelle', 'anstelle von', 'anstatt', 'nie', 'weder', 'anders als', 'im gegensatz zu', 'im vergleich zu', 'im unterschied zu', 'gegenüber', 'versus', 'vs', 'compared to', 'no', 'not', 'without', 'instead of', 'unlike']) {
  keiner(`Verneinung «${w}»`, { title: 'Ring', description: `Dieser Ring ${w} 925 Stempel` });
}
keiner('Verneinung am Textanfang', { title: 'Ohne 925 Stempel Ring' });
keiner('Verneinung nach Klammer', { title: 'Ring', description: 'Ring (ohne 925) hier' });
treffer('«Genie 925»: «nie» mitten im Wort verneint nicht', { title: 'Genie 925 Armband' });
treffer('«Anno 925»: «no» am Wortende verneint nicht', { title: 'Anno 925 Armband' });
// Füllwörter zwischen Verneinung und Angabe: jedes einzeln
for (const f of ['aus', 'um', 'von', 'vom', 'mit', 'für', 'fuer', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines', 'der', 'die', 'das', 'dem', 'den', 'des', 'echtes', 'reines', 'massives', 'pures', 'solid', 'real', 'genuine', 'pure', 'any', 'a', 'an', 'the', 'to', 'als', 'zu', 'oder', 'und', 'or', 'and', 'of', 'from', 'silber', 'silver', 'sterling', 'Edelstahl-', 'Edelstahl oder', 'Stahl or']) {
  keiner(`Füllwort «${f}» zwischen Verneinung und 925`, { title: 'Ring', description: `Dieser Ring ohne ${f} 925 Stempel` });
}
treffer('fünf Füllwörter reichen nicht', { title: 'Ring', description: 'Nicht aus von mit für der 925 Silber' });
treffer('Nickel ist kein Füllwort', { title: 'Ring', description: 'Ohne Nickel 925' });

// 7j. Nachtrag zur Mutationsprobe
keiner('«GTS925»: «s» mitten in einer Modellnummer ist kein Feingehalt', { title: 'Modell GTS925 Kopfhörer' });
keiner('«XAg925»: «ag» mitten in einer Modellnummer ist kein Feingehalt', { title: 'Modell XAg925 Kopfhörer' });
keiner('«4S999»: Ziffer vor «S» ist eine Modellnummer', { title: 'Modell 4S999 Lautsprecher' });
for (const z of ['92,5', '92.5', '92,50', '99,9', '0,925', '0.999']) {
  treffer(`Silber … Feingehalt ${z} (Abstand)`, { title: 'Ring', description: `Silber Legierung Feingehalt ${z}` });
  treffer(`${z} Feingehalt Legierung … Silber (Abstand)`, { title: 'Ring', description: `${z} Feingehalt Legierung Silber` });
}
treffer('Füllwort muss ein ganzes Wort sein: «ohne Einsterling»', { title: 'Ring', description: 'Ring ohne Einsterling' });
for (const g of ['\r', ' ', ' ', '\n']) treffer(`Zeilenende ${JSON.stringify(g)} beendet die Verneinung`, { title: 'Ring', description: `Nicht aus${g}925 Silber` });

console.log(fehler ? `\n${fehler} FEHLER von ${n}` : `${n} Prüfungen bestanden, 0 Fehler`);
process.exit(fehler ? 1 : 0);
