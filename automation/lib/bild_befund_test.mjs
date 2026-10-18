/** Test für die Bild-Befunde. Lauf: node automation/lib/bild_befund_test.mjs */
import { istSchwach, istBessereAlternative, grund, groesserUndSauber, MERKMALE } from './bild_befund.mjs';

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

// ── 5. Tausch wegen zu kleiner Auflösung ──
// Die echten Masse aus der Messung vom 18.10.
const m = (b, h) => ({ breite: b, hoehe: h });
pruef('539x537 wird durch sauberes 800x800 ersetzt',
  groesserUndSauber(m(539, 537), m(800, 800), bild(), 800), true);
pruef('600x800 wird durch sauberes 1080x1080 ersetzt',
  groesserUndSauber(m(600, 800), m(1080, 1080), bild(), 800), true);

// Gegenprobe 1: ein ausreichend grosses Hauptbild wird NIE getauscht, auch nicht gegen ein
// noch groesseres. Sonst wandert der Katalog bei jedem Lauf durcheinander.
pruef('grosses Hauptbild bleibt, auch bei groesserer Alternative',
  groesserUndSauber(m(1000, 1000), m(2000, 2000), bild(), 800), false);
pruef('genau an der Schwelle bleibt es',
  groesserUndSauber(m(800, 800), m(1200, 1200), bild(), 800), false);

// Gegenprobe 2 — die wichtigere Richtung: groesser allein darf nicht reichen. Ein grosses
// Verpackungs- oder Collagen-Foto nach vorn zu holen waere eine Verschlechterung, die wie
// eine Verbesserung aussieht.
pruef('grosse Collage ersetzt nicht',
  groesserUndSauber(m(539, 537), m(1500, 1500), bild({ collage: true }), 800), false);
pruef('grosses Bild ohne Produkt ersetzt nicht',
  groesserUndSauber(m(539, 537), m(1500, 1500), bild({ zeigt_produkt: false }), 800), false);
pruef('grosses Bild mit Wasserzeichen ersetzt nicht',
  groesserUndSauber(m(539, 537), m(1500, 1500), bild({ wasserzeichen: true }), 800), false);
pruef('nicht bewertete Alternative ersetzt nicht',
  groesserUndSauber(m(539, 537), m(1500, 1500), null, 800), false);

// Gegenprobe 3: eine Alternative, die selbst zu klein ist oder nicht groesser, bringt nichts.
pruef('Alternative auch unter der Schwelle ersetzt nicht',
  groesserUndSauber(m(539, 537), m(700, 700), bild(), 800), false);
pruef('gleich grosse Alternative ersetzt nicht',
  groesserUndSauber(m(600, 600), m(600, 600), bild(), 800), false);
pruef('nur eine Seite zu klein zaehlt auch als zu klein',
  groesserUndSauber(m(800, 600), m(800, 800), bild(), 800), true);

// Gegenprobe 4: fehlende Masse duerfen keinen Tausch ausloesen.
pruef('fehlende Masse am Hauptbild', groesserUndSauber(m(0, 0), m(1200, 1200), bild(), 800), false);
pruef('fehlende Masse an der Alternative', groesserUndSauber(m(539, 537), m(0, 0), bild(), 800), false);
pruef('kein Hauptbild', groesserUndSauber(null, m(1200, 1200), bild(), 800), false);
pruef('keine Schwelle', groesserUndSauber(m(539, 537), m(1200, 1200), bild(), 0), false);

// Zweimal laufen aendert nichts: nach dem Tausch ist das Hauptbild gross genug.
pruef('nach dem Tausch kein zweiter Tausch',
  groesserUndSauber(m(1080, 1080), m(1200, 1200), bild(), 800), false);

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Prüfungen grün');
process.exit(fehler ? 1 : 0);
