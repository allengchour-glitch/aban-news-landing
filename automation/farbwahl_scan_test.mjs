// Tests für die Prüflogik des Farbwahl-Scans. Gegenproben in BEIDE Richtungen: ein sauberes Produkt darf nicht anschlagen.
import { pruefeFarbwahl } from './farbwahl_scan.mjs';
let ok = 0, fehl = 0;
const ist = (name, wert, soll) => {
  const a = JSON.stringify(wert), b = JSON.stringify(soll);
  if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); }
};
const einzel = { options: [{ name: 'Title', values: ['Default Title'] }], variantsCount: 1 };

// Vorhang: eine Variante, Text nennt mehrere Farben
ist('Vorhang: Text nennt Farben', pruefeFarbwahl({ ...einzel, mediaCount: 8, beschreibung: 'Erhältlich in den Farben Off-white, Hellgrün und Apricot' }), ['EINZEL_TEXT', 'EINZEL_GALERIE']);
// Schal: eine Variante, wenig Text, aber grosse Galerie
ist('Schal: nur Galerie', pruefeFarbwahl({ ...einzel, mediaCount: 12, beschreibung: 'Wärmender Schal mit Heizstufen.' }), ['EINZEL_GALERIE']);
// GEGENPROBE: eine Variante, kleine Galerie, kein Farbtext → sauber
ist('Gegenprobe: schlichtes Einzelprodukt', pruefeFarbwahl({ ...einzel, mediaCount: 3, beschreibung: 'Edelstahl-Trinkflasche, 500 ml, doppelwandig.' }), []);
// GEGENPROBE: ein Wort wie «Rotwein» oder «Grünkohl» darf keine Farbe sein (Wortgrenze)
ist('Gegenprobe: Rotweinglas', pruefeFarbwahl({ ...einzel, mediaCount: 3, beschreibung: 'Rotweinglas aus Grünglas, spülmaschinenfest.' }), []);
// GEGENPROBE: eine einzige Farbe im Text reicht nicht für einen Verdacht
ist('Gegenprobe: eine Farbe', pruefeFarbwahl({ ...einzel, mediaCount: 3, beschreibung: 'Das Kissen ist in Beige gehalten.' }), []);
// Produkt MIT sauberer Auswahl darf nie als Einzelprodukt gelten, auch bei grosser Galerie
ist('Gegenprobe: 9 Farben, 9 Varianten', pruefeFarbwahl({ options: [{ name: 'Farbe', values: ['Rosa', 'Blau', 'Gelb', 'Rot', 'Grün', 'Grau', 'Braun', 'Beige', 'Weiss'] }], variantsCount: 9, mediaCount: 11, beschreibung: 'Rosa, Blau, Gelb, Rot.' }), []);
// Farbe mit nur einem Wert und viele Bilder = Verdacht (Kuscheldecke-Fall in kleiner Form)
ist('Farbe nur ein Wert', pruefeFarbwahl({ options: [{ name: 'Farbe', values: ['Rosa'] }], variantsCount: 1, mediaCount: 7, beschreibung: '' }), ['FARBE_EINZELN']);
ist('Gegenprobe: Farbe ein Wert, 2 Bilder', pruefeFarbwahl({ options: [{ name: 'Farbe', values: ['Rosa'] }], variantsCount: 1, mediaCount: 2, beschreibung: '' }), []);
// Englische Optionswerte
ist('Englische Farbwerte', pruefeFarbwahl({ options: [{ name: 'Farbe', values: ['Light Green', 'White'] }], variantsCount: 2, mediaCount: 2, beschreibung: '' }), ['OPTION_ENGLISCH']);
ist('Gegenprobe: deutsche Farbwerte', pruefeFarbwahl({ options: [{ name: 'Farbe', values: ['Hellgrün', 'Weiss'] }], variantsCount: 2, mediaCount: 2, beschreibung: '' }), []);
// «Standard» als Variante zählt wie Default Title
ist('Variante Standard', pruefeFarbwahl({ options: [{ name: 'Variante', values: ['Standard'] }], variantsCount: 1, mediaCount: 6, beschreibung: '' }), ['EINZEL_GALERIE']);
// Schwelle ist einstellbar
ist('Schwelle 10', pruefeFarbwahl({ ...einzel, mediaCount: 8, beschreibung: '' }, { galerie: 10 }), []);
// fehlende Felder stürzen nicht ab
ist('leer', pruefeFarbwahl({}), []);

// Deutsche Farbwörter, die englisch aussehen, dürfen NICHT anschlagen (Beige, Orange, Gold, Pink, Khaki)
ist('Gegenprobe: Beige/Orange/Gold/Pink', pruefeFarbwahl({ options: [{ name: 'Farbe', values: ['Beige', 'Orange', 'Gold', 'Pink', 'Khaki'] }], variantsCount: 5, mediaCount: 2, beschreibung: '' }), []);
ist('Englisch: Grey/Dark Brown', pruefeFarbwahl({ options: [{ name: 'Farbe', values: ['Grey', 'Dark Brown'] }], variantsCount: 2, mediaCount: 2, beschreibung: '' }), ['OPTION_ENGLISCH']);
ist('Englisch: Specification', pruefeFarbwahl({ options: [{ name: 'Color', values: ['Red'] }], variantsCount: 1, mediaCount: 2, beschreibung: '' }), ['OPTION_ENGLISCH']);

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
