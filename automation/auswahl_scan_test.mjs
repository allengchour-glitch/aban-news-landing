// Tests für die Prüflogik des Auswahl-Scans. Gegenproben in beide Richtungen; Zusammenfassung am ENDE.
import { pruefeAuswahl } from './auswahl_scan.mjs';
let ok = 0, fehl = 0;
const ist = (name, wert, soll) => { const a = JSON.stringify(wert), b = JSON.stringify(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); } };
const v = (preis, bildId, werte) => ({ preis, bildId, werte });
const farben = (namen, bilder) => ({ options: [{ name: 'Farbe', values: namen }], varianten: namen.map((n, i) => v('19.90', bilder[i], { Farbe: n })) });

ist('sauber: 3 Farben, 3 eigene Bilder', pruefeAuswahl(farben(['Rot', 'Blau', 'Grün'], ['a', 'b', 'c'])), []);
ist('Farben ohne Bild', pruefeAuswahl(farben(['Rot', 'Blau', 'Grün'], [null, null, null])), ['OHNE_BILD']);
ist('Gegenprobe: nur eine von drei ohne Bild bleibt sauber', pruefeAuswahl(farben(['Rot', 'Blau', 'Grün'], ['a', 'b', null])), []);
ist('zwei Farben, dasselbe Bild', pruefeAuswahl(farben(['Rot', 'Blau', 'Grün'], ['a', 'a', 'c'])), ['BILD_DOPPELT']);
// Gegenprobe: eine Farbe mit mehreren Grössen darf dasselbe Bild mehrfach haben (kein Fehler)
ist('Gegenprobe: Farbe × Grösse teilt Bilder je Farbe', pruefeAuswahl({
  options: [{ name: 'Farbe', values: ['Rot', 'Blau'] }, { name: 'Grösse', values: ['S', 'M'] }],
  varianten: [v('9.9', 'a', { Farbe: 'Rot', Grösse: 'S' }), v('9.9', 'a', { Farbe: 'Rot', Grösse: 'M' }), v('9.9', 'b', { Farbe: 'Blau', Grösse: 'S' }), v('9.9', 'b', { Farbe: 'Blau', Grösse: 'M' })] }), []);
ist('Abmessung unter «Grösse»', pruefeAuswahl({ options: [{ name: 'Grösse', values: ['140 × 183 cm', '140 × 114 cm'] }], varianten: [v('9', 'a', { Grösse: '140 × 183 cm' }), v('9', 'b', { Grösse: '140 × 114 cm' })] }), ['GROESSE_MASS']);
ist('Gegenprobe: echte Kleidergrössen', pruefeAuswahl({ options: [{ name: 'Grösse', values: ['S', 'M', 'L'] }], varianten: [v('9', 'a', { Grösse: 'S' }), v('9', 'b', { Grösse: 'M' }), v('9', 'c', { Grösse: 'L' })] }), []);
ist('Gegenprobe: Schuhgrössen', pruefeAuswahl({ options: [{ name: 'Grösse', values: ['38', '39', '40'] }], varianten: [v('9', 'a', { Grösse: '38' }), v('9', 'a', { Grösse: '39' }), v('9', 'a', { Grösse: '40' })] }), []);
ist('Gegenprobe: Abmessung heisst «Abmessung»', pruefeAuswahl({ options: [{ name: 'Abmessung', values: ['140 × 183 cm', '140 × 114 cm'] }], varianten: [v('9', 'a', { Abmessung: '140 × 183 cm' }), v('9', 'b', { Abmessung: '140 × 114 cm' })] }), []);
ist('Englisch', pruefeAuswahl(farben(['Light Green', 'Dark Blue'], ['a', 'b'])), ['ENGLISCH']);
ist('Gegenprobe: Beige/Gold/Orange', pruefeAuswahl(farben(['Beige', 'Gold', 'Orange'], ['a', 'b', 'c'])), []);
ist('Einzelwert', pruefeAuswahl({ options: [{ name: 'Farbe', values: ['Rosa'] }, { name: 'Grösse', values: ['S', 'M'] }], varianten: [v('9', 'a', { Farbe: 'Rosa', Grösse: 'S' }), v('9', 'a', { Farbe: 'Rosa', Grösse: 'M' })] }), ['EINZELWERT']);
ist('Title bei mehreren Varianten', pruefeAuswahl({ options: [{ name: 'Title', values: ['A', 'B'] }], varianten: [v('9', 'a', { Title: 'A' }), v('9', 'b', { Title: 'B' })] }), ['TITLE_MEHRERE']);
ist('Preis 0', pruefeAuswahl({ options: [{ name: 'Farbe', values: ['Rot', 'Blau'] }], varianten: [v('0.00', 'a', { Farbe: 'Rot' }), v('9.00', 'b', { Farbe: 'Blau' })] }), ['PREIS_NULL']);
ist('Einzelvariante wird nie geprüft', pruefeAuswahl({ options: [{ name: 'Title', values: ['Default Title'] }], varianten: [v('0.00', null, { Title: 'Default Title' })] }), []);
ist('leer', pruefeAuswahl({}), []);

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
