// Tests der Tassen-Regel — Gegenproben an echten Titeln aus dem Shop (25.10.2026). Zusammenfassung am ENDE.
import { istTasseOderBecher } from './tassen_regel.mjs';
let ok = 0, fehl = 0;
const soll = (titel, erwartet) => { const ist = istTasseOderBecher(titel); if (ist === erwartet) ok++; else { fehl++; console.log('FEHLER', JSON.stringify(titel), 'ist', ist, 'soll', erwartet); } };

// echte Trinkgefässe
for (const t of ['Tasse «Alphorn»', 'Keramik-Tasse 400 ml Retro-Stil', 'Edelstahl Coffee-to-go Becher · auslaufsicher', 'Katzen-Tasse', 'Kaffeebecher Edelstahl',
  'Isolierter Becher mit Henkel', 'King & Queen Tassen-Set · 2 Tassen für Paare 👑', 'Bone China Tassenset «European»', 'Tee-Tassenset mit 4 Tassen',
  'Old Time Keramik-Becher – handbemalt, 410 ml', 'Thermos Becher 316L Edelstahl, 0-6-Stunden-Isolierung', 'Kristallglas Tasse', 'Tassen für heissen Tee',
  'Keramikkaffee-Tasse & Untertasse Set', 'Tasse bedrucken & selbst gestalten · dein Foto', 'Selbst-rührende Tasse für Kaffee & mehr · 400 ml', 'Keramiktasse mit Schmetterlingsmuster'])
  soll(t, true);

// GEGENPROBEN: Fransen, Quasten, Beifuss
for (const t of ['Tassel-Tanktop im Off-Shoulder-Stil', 'Patchwork Tassel Fransen T-Shirt', 'Tasseli-Ohrhänger', 'Silberner Tassel-Schmuck', 'Kleides mit Tasseln',
  'Western-Stil Tief-V-Ausschnitt Mini-Kleid mit Tasseln', 'Tasseled Crewneck Strickpullover', 'Halskette «Coquille» – Muschel-Anhänger mit Tassel',
  'Gaze-Badehandtuch mit Tasseln · 80 × 160 cm', 'SouthMoon Mugwort Bein-Patches'])
  soll(t, false);

// GEGENPROBEN: Zubehör und Becher mit anderem Zweck
for (const t of ['Tassen-Organizer für Getränkemaschinen', 'Tassen-Organizer aus Massivholz', 'Tassenhalterung für die Küche', 'Tassen-Abtropfgestell, 2-stufig', 'Tassen- und Gläserreiniger für die Küche',
  'Heiz- und Kühluntersetzer für Tassen', 'Beheizbares Tassenpad', 'Induktions-Ladegerät mit Tassenwärmer', 'Milchtee Tassenunterlage', 'Multifunktionaler Becherhalter',
  'Drehbarer Becherhalter für Einwegbecher', 'Tassenhalter für Tischkante', 'Abnehmbarer Shisha-Becher – Tragbare Wasserpfeife', 'LED Shisha Becher mit Licht', 'Hundefutter-Becher',
  'Scheinwerfer-Vernebler-Becher', 'Portabler USB-Becher-Mixer', 'Elektrischer Entsafter-Becher', 'WORTHBUY Messlöffel & -becher Set', '2-in-1 Auto Becherwärmer & Kühler',
  'Aufbewahrungskorb im Becher-Design', 'Kuschel-Kissen Cola-Becher', 'Becher-Lunchbox für Büro-Damen', 'Grosse Sport-Becher-Dose', 'Keramik Bad-Set: Lotion, Zahnbürstenhalter, Becher',
  'Glas-Kaffeekanne mit Becher – hitzebeständig', 'Ablageregal mit Becherhalter für den Tisch', 'Tasse mit Heizplatte & Wireless Charger'])
  soll(t, false);

// Ein Tee-Set, das Tassen ENTHÄLT, bleibt drin
soll('Tee-Set mit Tasse und Teetablett', true);
soll('Tragbares Teeservice mit Teekanne und zwei Tassen', true);
// Fälle, die die erste Fassung FÄLSCHLICH ausschloss (beim Lesen der Gesamtliste gefunden, nicht von den Tests)
for (const t of ['Tasse «Postauto Horn»', '3D Dachshund Tasse', 'Keramik-Set: Tasse, Schale & Tablett – handbemalt', 'Retro-Oktagonalblumenkeramik Tasse & Untersetzer']) soll(t, true);
// ...und die Gegenprobe dazu: das Wort Auto/Hund als eigenes Wort schliesst weiter aus
soll('2-in-1 Auto Becherwärmer & Kühler', false); soll('Hundefutter-Becher', false); soll('Taktischer Becher mit Magazin-Design', false);

// Teegeschirr ohne Tasse/Becher im Titel gehört NICHT in die Tassen-Kategorie
for (const t of ['Kung Fu Tee-Set', 'Teeset für unterwegs', 'Panda Tee-Set Geschenkbox', 'Britisches Teeservice «Luxury»', 'Kokosnuss Matcha Tee Set mit Eierschläger', 'Tee-Set mit Filter']) soll(t, false);
soll('', false);
soll(undefined, false);

// ── 26.10.2026: «…becher» ist nicht immer ein Trinkgefäss (Aschenbecher stand unter «Tassen & Becher») ──
for (const titel of ['Einweg-Aschenbecher mit Schaumsand', 'Kristall-Aschenbecher für Zigarren', 'Stilvoller Tragbarer Zigarrenaschenbecher', 'Zahnputzbecher aus Bambus',
  'Mundspülbecher', 'Würfelbecher aus Leder', 'Eisbecher Glas 6er Set', 'Stiftebecher aus Holz', 'Pflanzenbecher Kunststoff']) soll(titel, false);
for (const titel of ['Keramik-Tasse 400 ml', 'Kaffeebecher to go', 'Thermobecher 500 ml', 'Reisebecher mit Deckel', 'Teetasse mit Untersetzer', 'Isolierbecher 350 ml']) soll(titel, true);
console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);

