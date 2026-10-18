/** Test für die Titel-Korrektur. Alle Titel unten sind ECHT, am 2026-10-18 im Shop gelesen.
 *  Lauf: node automation/lib/titel_deutsch_test.mjs                                        */
import { titelDeutsch, brauchtKorrektur } from './titel_deutsch.mjs';

let fehler = 0;
const pruef = (name, ist, soll) => {
  if (ist !== soll) { fehler++; console.log(`FAIL ${name}\n     ist  ${ist}\n     soll ${soll}`); }
  else console.log(`ok   ${name}`);
};

// ── 1. Echte Titel aus dem Katalog ──
const ECHT = {
  'Mannlicher Lederrucksack aus Rinderhaut': 'Herren-Lederrucksack aus Rinderhaut',
  'Mannliche Reisetasche Crossbody, grosse Kapazität': 'Herren-Reisetasche Crossbody, grosse Kapazität',
  'Mannlicher Leder-Rucksack – Mittelgross, schwarz': 'Herren-Leder-Rucksack – Mittelgross, schwarz',
  'Mannlicher Schultertasche PU Leder 10"': 'Herren-Schultertasche PU Leder 10"',
  // Adjektiv danach → die Zielgruppe wandert ans Ende, sonst „Herren-Wasserdichter"
  'Mannlicher wasserdichter Rucksack 20-35L': 'Wasserdichter Rucksack 20-35L für Herren',
  'Mannlicher wasserdichter Laptop-Rucksack 20-35L': 'Wasserdichter Laptop-Rucksack 20-35L für Herren',
  'Weibliche dünne Sommerjacke': 'Dünne Sommerjacke für Damen',
  'Weibliche Bluse mit V-Ausschnitt': 'Damen-Bluse mit V-Ausschnitt',
  'Weibliches Lederportemonnaie mit Doppelkordel': 'Damen-Lederportemonnaie mit Doppelkordel',
  'Weiblicher PU-Rucksack mit Webmuster': 'Damen-PU-Rucksack mit Webmuster',
  'Weiblicher Unifarben Hoodie fuer Herbst/Winter': 'Damen-Unifarben Hoodie für Herbst/Winter',
};
for (const [vorher, nachher] of Object.entries(ECHT)) pruef(vorher.slice(0, 42), titelDeutsch(vorher), nachher);

// ── 2. GEGENPROBE: der Fachbegriff bleibt. „Weiblicher Stecker" ist die Buchse, keine Damenware ──
pruef('Steckverbinder bleibt', titelDeutsch('Weiblicher Stecker mit USB & Audio'), 'Weiblicher Stecker mit USB & Audio');
pruef('Anschluss bleibt', titelDeutsch('Männlicher Anschluss 3,5 mm'), 'Männlicher Anschluss 3,5 mm');
pruef('Adapter bleibt', titelDeutsch('Weibliche Adapter-Buchse'), 'Weibliche Adapter-Buchse');
pruef('Wort nur am Anfang', titelDeutsch('VGA zu HDMI-Weiblicher Stecker'), 'VGA zu HDMI-Weiblicher Stecker');

// ── 3. GEGENPROBE: saubere Titel bleiben unberührt, und zweimal laufen ändert nichts ──
for (const t of ['Herren-Lederrucksack aus Rinderhaut', 'Damen-Bluse mit V-Ausschnitt',
                 'Feuerzeug mit Sturmflamme', 'Männerparfüm 50 ml', 'Mannlichkeit']) {
  pruef(`unberührt: ${t.slice(0, 34)}`, titelDeutsch(t), t);
}
pruef('idempotent', titelDeutsch(titelDeutsch('Mannlicher Canvas-Backpack')), 'Herren-Canvas-Backpack');
pruef('idempotent auch beim Anhang', titelDeutsch(titelDeutsch('Mannlicher wasserdichter Rucksack')),
  'Wasserdichter Rucksack für Herren');
pruef('Zahl am Anfang bleibt Zusammensetzung', titelDeutsch('Mannlicher 3-teiliger Satz'), '3-teiliger Satz für Herren');
pruef('„Feuer" bleibt', titelDeutsch('Feuerschale aus Stahl'), 'Feuerschale aus Stahl');
pruef('„fuer" mitten im Titel', titelDeutsch('Tasche fuer Laptop'), 'Tasche für Laptop');
pruef('„Fuer" gross bleibt gross', titelDeutsch('Fuer Reisen gedacht'), 'Für Reisen gedacht');

// ── 4. Melder ──
pruef('braucht Korrektur', brauchtKorrektur('Mannlicher Canvas-Backpack'), true);
pruef('braucht keine Korrektur', brauchtKorrektur('Herren-Canvas-Backpack'), false);
pruef('Steckverbinder braucht keine', brauchtKorrektur('Weiblicher Stecker'), false);
pruef('leer bleibt leer', titelDeutsch(''), '');
pruef('null bleibt leer', titelDeutsch(null), '');

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Prüfungen grün');
process.exit(fehler ? 1 : 0);
