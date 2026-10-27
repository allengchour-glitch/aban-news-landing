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

// Schuhgrössen mit englischem «To» (Abzug vom 26.10.): «36 To 37» → «36–37»
ist('Grösse «36 To 37» → «36–37»', planeOption('Grösse', ['36 To 37', '38 To 39', '40']), { art: 'groesse', werte: { '36 To 37': '36–37', '38 To 39': '38–39' } });
ist('Größe (ß) und Size werden erkannt', planeOption('Größe', ['36 to 37', '38']), { art: 'groesse', werte: { '36 to 37': '36–37' } });
ist('Option «Size» wird erkannt', planeOption('Size', ['40 To 41', '42']), { art: 'groesse', werte: { '40 To 41': '40–41' } });
ist('Halbgrössen mit Komma', planeOption('Grösse', ['36,5 To 37,5', '38']), { art: 'groesse', werte: { '36,5 To 37,5': '36.5–37.5' } });
ist('Gegenprobe: schon richtig → nichts', planeOption('Grösse', ['36–37', '38–39']), null);
ist('Gegenprobe: «S», «M», «One Size» bleiben (nur das To-Muster)', planeOption('Grösse', ['s', 'M', 'One Size']), null);
ist('Gegenprobe: Kollision mit vorhandenem «36–37» → nichts', planeOption('Grösse', ['36 To 37', '36–37']), null);
ist('Gegenprobe: «To» in Wörtern (Tommy, Top) bleibt', planeOption('Grösse', ['Top 36', 'Tommy 37', '36 Top']), null);
ist('Gegenprobe: «36 bis 37» ist schon deutsch → nichts', planeOption('Grösse', ['36 bis 37', '38']), null);
ist('Gegenprobe: Farbe mit «To»-Wert wird nicht als Grösse behandelt', planeOption('Farbe', ['36 To 37', '38 To 39']), null);
ist('Gegenprobe: unbekannte Option (Material) → nichts', planeOption('Material', ['36 To 37']), null);
ist('Gegenprobe: Option «Modell» besteht schon (A/B-Codes daneben) → nichts, nicht raten', planeOption('Farbe', ['A', 'B'], ['Farbe', 'Modell']), null);
ist('Modell-Kürzel mit anderer zweiter Option (Material) bleibt', planeOption('Farbe', ['A', 'B', 'C'], ['Farbe', 'Material']), { art: 'modell', neuerName: 'Modell', werte: { A: 'Modell A', B: 'Modell B', C: 'Modell C' } });

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
