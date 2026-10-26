// Tests für den reinen Plan der Optionsreparatur (kein Netz).
import { planeOption } from './optionen_reparieren.mjs';
let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)}\n   soll: ${JSON.stringify(b)}`); } };

ist('gemischte Farbwörter', planeOption('Farbe', ['Gold black', 'Silber / Schwarz', 'Gold white', 'Silber']),
  { art: 'farbe', werte: { 'Gold black': 'Gold / Schwarz', 'Gold white': 'Gold / Weiss' } });
ist('Modell-Kürzel', planeOption('Farbe', ['A', 'B', 'C', 'Black']), { art: 'modell', neuerName: 'Modell', werte: { A: 'Modell A', B: 'Modell B', C: 'Modell C', Black: 'Schwarz' } });
ist('Gegenprobe: Zahlen (Ringgrössen 5–8) sind kein Modell', planeOption('Farbe', ['5', '6', '7', '8']), null);
ist('Gegenprobe: «Beige-Camel» bleibt', planeOption('Farbe', ['Beige-Camel', 'Camel-Grau']), null);
ist('Gegenprobe: saubere Farben → nichts', planeOption('Farbe', ['Schwarz', 'Weiss', 'Rot']), null);
ist('Gegenprobe: andere Option → nichts', planeOption('Grösse', ['A', 'B']), null);
ist('Gegenprobe: ein Code unter echten Farben → keine Modell-Option', planeOption('Farbe', ['Schwarz', 'Weiss', 'Rot', 'A']), null);
ist('Gegenprobe: unbekanntes Wort neben Codes → nicht raten', planeOption('Farbe', ['A', 'B', 'C', 'Noodles']), null);
ist('Gegenprobe: Kollision → nichts', planeOption('Farbe', ['Gold black', 'Gold / Schwarz']), null);
ist('Gegenprobe: ein einziger Wert → nichts', planeOption('Farbe', ['A']), null);

ist('Gegenprobe: «Pink» bleibt Pink', planeOption('Farbe', ['Pink', 'Schwarz']), null);
ist('Gegenprobe: «Gray» allein wird hier nicht angefasst', planeOption('Farbe', ['Gray', 'Schwarz']), null);

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
