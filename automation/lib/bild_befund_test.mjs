/** Test für die Bild-Befunde. Lauf: node automation/lib/bild_befund_test.mjs */
import { istSchwach, istBessereAlternative, grund, MERKMALE } from './bild_befund.mjs';

let fehler = 0;
const pruef = (name, ist, soll) => {
  if (ist !== soll) { fehler++; console.log(`FAIL ${name}\n     ist  ${ist}\n     soll ${soll}`); }
  else console.log(`ok   ${name}`);
};
const bild = (o = {}) => ({ zeigt_produkt: true, unscharf: false, wasserzeichen: false, text_overlay: false, collage: false, ...o });

// ── 1. Echte Mängel werden erkannt ──
pruef('unscharf ist schwach',        istSchwach(bild({ unscharf: true })), true);
pruef('Wasserzeichen ist schwach',   istSchwach(bild({ wasserzeichen: true })), true);
pruef('Text im Bild ist schwach',    istSchwach(bild({ text_overlay: true })), true);
pruef('Collage ist schwach',         istSchwach(bild({ collage: true })), true);
pruef('zeigt das Produkt nicht',     istSchwach(bild({ zeigt_produkt: false })), true);
pruef('sauberes Bild ist nicht schwach', istSchwach(bild()), false);

// ── 2. GEGENPROBE: das Aussehen eines Models ist KEIN Mangel ──
// Das war der Fehler: `(person && asian)` hat das Hauptbild nach hinten sortiert.
for (const zusatz of [{ person: true }, { person: true, asian: true }, { asian: true }, { model: 'asiatisch' }]) {
  pruef(`Model-Merkmal ${JSON.stringify(zusatz)} ist kein Mangel`, istSchwach(bild(zusatz)), false);
  pruef(`Model-Merkmal ${JSON.stringify(zusatz)} bleibt Alternative`, istBessereAlternative(bild(zusatz)), true);
}
pruef('Model-Merkmal taucht im Grund nicht auf', grund(bild({ person: true, asian: true }), false), 'ok');

// ── 3. Alternative nur, wenn sie wirklich besser ist ──
pruef('schwache Alternative zählt nicht', istBessereAlternative(bild({ collage: true })), false);
pruef('Alternative ohne Produkt zählt nicht', istBessereAlternative(bild({ zeigt_produkt: false })), false);
pruef('fehlende Bewertung zählt nicht', istBessereAlternative(null), false);
pruef('fehlende Bewertung ist nicht schwach', istSchwach(null), false);

// ── 4. Grund nennt den ersten Mangel, Auflösung hat Vorrang ──
pruef('zu klein schlägt alles', grund(bild({ unscharf: true }), true), 'zu-kleine-aufloesung');
pruef('unscharf vor Collage', grund(bild({ unscharf: true, collage: true }), false), 'unscharf');
pruef('nicht bewertbar', grund(null, false), 'nicht-bewertbar');
pruef('Merkmalsliste ohne Herkunft', MERKMALE.some(m => /asia|herkunft|ethn/i.test(m)), false);

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Prüfungen grün');
process.exit(fehler ? 1 : 0);
