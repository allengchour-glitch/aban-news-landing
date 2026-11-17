#!/usr/bin/env node
// abgleich/messen.mjs  (NUR LESEN)
// Gleicht zwei unabhängige Messungen (messer1, messer2) des LuxeStyle-Katalogs auf Gold, Platin und plattierte Ware ab.
//
//   node messen.mjs                 startet beide Messskripte neu (eigene Ausgabeordner m1/ und m2/), gleicht ab
//   node messen.mjs --nur-auswerten nutzt vorhandene m1/ und m2/ Ergebnisse
//
// Eingabe : edel/produkte.jsonl (sha256 wird geprüft)
// Ausgabe : nur in diesem Ordner: m1/, m2/, ergebnis.json, unterschiede.tsv, handles_A.json, handles_E.json, klasse_<K>.txt
//
// Klassen (Reihenfolge A, E, B, C, D; ein Produkt in genau einer; X = kein Edelmetallbezug, nicht gezählt):
//   A massiv   B plattiert MIT Zahl   C plattiert OHNE Zahl   D nur Farbe   E Platin/Palladium
//
// Abgleich-Regeln (alle an gelesenen Volltexten belegt, siehe REGELN und MAN unten):
//   1. Beide Messer gleich -> diese Klasse (Stichproben im Volltext gelesen: B 20, C-Schmuck 20, D 30, C-Nicht-Schmuck alle 47).
//   2. Unterschied -> Entscheid je Gruppe (Regel) oder je Produkt (Tabelle MAN), jeder Fall im Volltext gelesen.
//   3. Gemeinsame Fehltreffer beider Messer (nur bei C und Nicht-Schmuck gefunden) stehen in KORR.
//   4. Karat-Restprüfung und Recall-Gegenprobe mit einem dritten, einfachen Muster über alle 56 082 Produkte.
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const BASE = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/edel';
const EINGABE = BASE + '/produkte.jsonl';
const SOLL_SHA = '9351d36f431fb8abf41d47f451e82b39adc0c8f10791a9498b77e9e0bbfc5ab7';
const NUR_AUSWERTEN = process.argv.includes('--nur-auswerten');

// ---------------------------------------------------------------- Messskripte starten
const sha = crypto.createHash('sha256').update(fs.readFileSync(EINGABE)).digest('hex');
if (sha !== SOLL_SHA) console.error('WARNUNG: produkte.jsonl hat einen anderen sha256 als beim Abgleich erwartet: ' + sha);
fs.mkdirSync(DIR + '/m1', { recursive: true });
fs.mkdirSync(DIR + '/m2', { recursive: true });
if (!NUR_AUSWERTEN) {
  execFileSync('node', [BASE + '/agenten/messer1/messen.mjs', EINGABE, DIR + '/m1/ergebnis.json'], { stdio: 'ignore' });
  fs.copyFileSync(BASE + '/agenten/messer2/messen.mjs', DIR + '/m2/messen.mjs'); // schreibt in den eigenen Ordner, nicht in messer2/
  execFileSync('node', [DIR + '/m2/messen.mjs'], { stdio: 'ignore' });
}

// ---------------------------------------------------------------- Ergebnisse lesen
const r1 = JSON.parse(fs.readFileSync(DIR + '/m1/ergebnis.json', 'utf8'));
const r2 = JSON.parse(fs.readFileSync(DIR + '/m2/ergebnis.json', 'utf8'));
const m1 = {}; // handle -> {k, u}
for (const k of Object.keys(r1.klassen)) for (const x of r1.klassen[k]) m1[x.handle] = { k: k === 'P' ? 'X' : k, u: x.unterklasse || '' };
const m2 = {};
for (const k of ['A', 'E', 'B', 'C', 'D', 'X'])
  for (const l of fs.readFileSync(`${DIR}/m2/klasse_${k}.tsv`, 'utf8').split('\n').filter(Boolean)) {
    const [h, u] = l.split('\t');
    m2[h] = { k, u: u || '' };
  }
const union = [...new Set([...Object.keys(m1), ...Object.keys(m2)])];
const KL = ['A', 'E', 'B', 'C', 'D'];
const zahl1 = Object.fromEntries(KL.map((k) => [k, r1.anzahl[k]]));
const zahl2 = Object.fromEntries(KL.map((k) => [k, r2.zaehlung[k]]));

// ---------------------------------------------------------------- Produkte der Union und Gesamtzahl lesen
const prod = {};
let gesamt = 0;
const alleRecall = []; // für die Karat-/Recall-Gegenprobe
const T1 = /\(z\. ?b\. edelstahl, vergoldet, zirkonia\)/gi; // Shop-Vorlagensatz, keine Aussage zur Ware
const T2 = /ein feines schmuckstück, das jedes outfit veredelt\./gi; // Shop-Vorlagensatz
function textVon(p) {
  let d = p.description || '';
  const i = d.indexOf('🛡️ Sorglos shoppen');
  if (i >= 0) d = d.slice(0, i);
  d = d.replace(T1, '').replace(T2, '');
  const o = (p.options || []).filter((q) => q.name !== 'Title').map((q) => q.name + ': ' + (q.values || []).join(', ')).join(' | ');
  return { t: p.title || '', d, o, alles: (p.title || '') + ' ‖ ' + d + ' ‖ ' + o };
}
{
  const rl = readline.createInterface({ input: fs.createReadStream(EINGABE) });
  for await (const l of rl) {
    if (!l) continue;
    const p = JSON.parse(l);
    gesamt++;
    const inU = m1[p.handle] || m2[p.handle];
    if (inU) prod[p.handle] = p;
    else alleRecall.push(p);
  }
}
const ws = (s) => s.replace(/\s+/g, ' ');

// ---------------------------------------------------------------- Muster für die Abgleich-Regeln
const JE = /schmuck|uhren|^ring$|halskette|ohrring|armband|accessoires|^kollier/i; // productType
const JT = /(armband|armreif|ohrring|ohrclip|ohrhaken|halskette|kette\b|ring\b|anhänger|schmuck|kollier|collier|uhr\b)/i; // Titel
const PLW = /(vergold|versilber|plattier|platiert|plated|plating|plättier|verplatt|verplät|überzog|überzug|beschicht|galvan|elektro(?!nisch|nik|n\b)|electro|pvd|vakuum|veredel|auflage|filled|gefüllt|rhodin|platinier|doublé|plaqué|vermeil|geplättet)/i;
const PLM = /(vergold|versilber|gold-?(plat|plät|verplat|über|beschicht|auflage|filled)|echtvergold|silber-?(plat|beschicht|schicht|überz|auflage)|silbergepl|platinier|platinbeschicht|rhodin|rhodium|blattgold|(elektro\w*|galvan\w*|vakuum\w*)\s+in\s+(gold|silber|platin)|(gold|silber)beschichtet|(gold|silber)-?plättiert|platin lackiert)/i;
const KARAT = /(?<![\p{L}\d.,/])(8|9|10|14|18|22|24)\s?-?(k|kt|karat|karätig\w*)(?![\p{L}\d])/giu;
const KARAT_NICHT = /(drohne|kamera|video|auflösung|projektor|nägel|nagel|hz|khz|ohm)/i;

// ---------------------------------------------------------------- Entscheide je Produkt (alle im Volltext gelesen)
// MAN[handle] = [erwartetes Paar "m1|m2" (Schutz gegen Tippfehler), Endklasse, Grund]
const MAN = {
  // --- A / E / Grenzfälle Zahl-Farbname
  'armband-mit-susswasserperlen-und-tiermotiv-626500': ['A|D', 'A', '«3D-Hartgold-Technik» nennt Gold als Verfahren, kein Feingehalt; als Goldaussage geführt, Urteil unklar'],
  'ei-formige-armbanduhr-fur-damen-602700': ['A|D', 'A', '«Material: Gold» im Text, Optionswert «Farbe: Gold»: Farbangabe einer Uhr'],
  'regenbogenring-614600': ['A|D', 'A', '«Platinum/K-Gold» nur als Inlay-Material-Etikett, Optionswert «Platinfarbe»'],
  'minimalistischer-ring-aus-silber-mit-geometris-601500': ['A|B', 'D', 'Grundmetall Silber genannt, «18K Gold oder Platin» nur Ausführung, kein Plattierungswort: Zahl im Farbnamen'],
  'armband-mit-zirkonia-edelsteinen-610800': ['D|B', 'D', 'Kupfer, «Farben Platin, Roségold und 18K Gold», kein Plattierungswort: Zahl im Farbnamen'],
  'elegantes-zirkon-armband-mit-krone-611200': ['E|C', 'E', 'Reihenfolge A,E,B,C,D: «Einlagematerial: Platin/K-Gold» ist E; ganzer Text: Kupfer mit Echtvergoldung'],
  // --- B: Zahl plus Plattierungswort, die m2 als C oder gar nicht führte (m1 stimmt) oder beide übersehen haben
  'funkelndes-quasten-armband-mit-zirkon-stern-611100': ['C|C', 'B', '«echte 18-karätige Goldplattierung»: «karätig» erkannte keiner'],
  'vergoldetes-edelstahlarmband-624700': ['C|C', 'B', '«18-karätigen Vergoldung»: «karätig» erkannte keiner'],
  'edelstahlring-mit-26-buchstaben-624500': ['D|C', 'B', 'elektroplattiert, «14-karätigen Gold- oder Stahlglanz»'],
  'vielseitige-universelle-kette-fur-damen-610100': ['D|C', 'B', '«Vakuumelegoldveredelung» plus Optionswerte «18K ...»'],
  'edles-armband-fur-die-stilvolle-frau-637800': ['-|X', 'B', '«18K-Reinheit» plus «Elektroplating-Verfahren»; m1 und m2 führten es nicht'],
  // --- D|C: Ausnahmen von der Regel (Schmuck + Plattierung = C)
  'vintage-oval-ring-mit-zirkonia-631300': ['D|C', 'D', '«veredelt mit einer schwarzen Goldoptik»: Optik, keine Plattierung'],
  'prinzessschliff-ring-mit-mozambik-diamant-silb-622300': ['D|C', 'C', '«silbergeplättet» = versilbert, Metall genannt'],
  'halskette-fur-hunde-edelstahl-14mm-528896': ['D|C', 'D', 'Hundehalsband, Oberflächenfarbe, kein Schmuck'],
  'hundehalskette-aus-edelstahl-41b253': ['D|C', 'D', 'Hundehalsband, Oberflächenfarbe, kein Schmuck'],
  'hundehalsband-aus-titanstahl-mit-strass-knopf-437376': ['D|C', 'D', 'Hundehalsband, Oberflächenfarbe, kein Schmuck'],
  'halskette-fur-hunde-edelstahl-gold-silber-546560': ['C|C', 'D', 'Hundehalsband, Vakuum-Galvanisierung nur als Oberflächenfarbe, kein Schmuck'],
  'anti-rutsch-doppelstab-aus-titan-gold-615900': ['D|C', 'D', 'Trainingsstab, «Titan-Gold-Beschichtung» ist eine Farbschicht, kein Schmuck'],
  'm8-smart-armband-mit-herzfrequenzmessung-7b9d22': ['D|C', 'D', 'Fitnessarmband (Elektronik), Gehäuse mit Vakuumplattierung: technische Oberfläche, kein Schmuck'],
  '28-teilige-weihnachtsbaumschmuck-kugel-set-602500': ['D|C', 'D', 'Weihnachtsbaumkugeln aus Kunststoff, Galvanisieren nur für Glanz'],
  'armband-drachenwirbel-aus-titanstahl-a9e787': ['D|C', 'C', 'Armband (Produktart falsch «Sport»), galvanisch behandelt, Farbe Gold'],
  'schmetterling-ohrclip-ohrhaken-486336': ['D|C', 'C', 'Ohrschmuck (Produktart falsch «Haushalt»), «Legierung mit Plattierung», goldfarbenes Paar'],
  // --- C|C: gemeinsame Fehltreffer beider Messer (Nicht-Schmuck, Farb-/Mustername, Prägung, Folie, Lack)
  'hd-schwimmbrille-fur-kinder-mit-nasenschutz-625400': ['C|C', 'D', '«Vergoldet» nur als Optionsname einer Schwimmbrille'],
  'schwimmbrille-fur-kinder-mit-nasenschutz-626300': ['C|C', 'D', '«Vergoldet» nur als Optionsname einer Schwimmbrille'],
  'seiden-kissenbezug-1-paar-einfarbig-249344': ['C|C', 'D', '«Vergoldung» nur als Farbname eines Kissenbezugs'],
  'bronzing-bedrucktes-ripsband-fur-kleideraccess-928576': ['C|C', 'D', '«Vergoldungsprozess» = Heissprägedruck auf Band'],
  'schmuckkastchen-aus-pu-leder-mit-doppelfunktio-610600': ['C|C', 'D', '«Goldprägung» auf PU-Leder'],
  'weihnachtsbaumdecke-mit-vergoldung-738496': ['C|C', 'D', 'Polyesterdecke, «Vergoldung» als Farbe/Aufdruck'],
  'ethereal-drum-8-ton-12-zoll-zungentrommel-231424': ['C|C', 'D', '«Diamant Vergoldet» nur als Farbname einer Zungentrommel'],
  'herren-langarmhemd-mit-feder-manschette-628500': ['C|C', 'D', 'Hemd, «Goldbeschichtung» als Musterfarbe auf Stoff'],
  'goldbeschichtete-kerze-mit-geburtstagsnachrich-160448': ['C|C', 'D', 'Paraffinkerze, handbemalt in Gold'],
  'etagere-fur-desserts-und-snacks-040448': ['C|C', 'D', '«handgemaltem Gold» auf Porzellan'],
  'muschel-dekotablett-fur-den-schreibtisch-605400': ['C|C', 'D', 'Dekotablett, goldene/silberne Ränder als Optik'],
  'tragbare-schmuckbox-fur-ringe-halsketten-632600': ['C|C', 'D', '«vergoldetem Grün» nur Designname einer Schmuckbox'],
  'keramik-box-fur-kosmetiktucher-618800': ['C|C', 'D', 'Keramikbox «matt versilbert» = Glasur/Farbe'],
  'wimpern-nahrlosung-fur-lange-dichte-571264': ['C|C', 'X', '«Schwarzvergoldung Modelle» nur Verpackungsname'],
  'kopfstutze-mit-lendenstutze-624600': ['C|C', 'X', '«Vergoldete Jahre Braun» nur Farbname'],
  'kurzer-rollgabelschlussel-6-75mm-190144': ['C|C', 'X', '«vergoldet» nur als Beispiel für zu schonende Rohre'],
  'mountainbike-helm-mit-led-warnlicht-484736': ['C|C', 'X', '«versilberte Brillengläser» technische Spiegelbeschichtung'],
  'usb-midi-adapterkabel-fur-elektronische-keyboa-073856': ['C|C', 'X', 'technische Kontaktbeschichtung, kein Schmuck'],
  'verdunkelndes-rollo-silberbeschichtet-610000': ['C|C', 'X', 'technische Silberbeschichtung von Textil'],
  'sport-visier-fur-kinder-444352': ['C|C', 'X', 'Visier: Rahmenfarbe «elektroplattiert in Silber ... Gold», kein Edelmetall der Ware'],
  // --- C|-: technische Silberbeschichtungen (m1) ohne Schmuckbezug -> X; Schmuck mit Silberplattierung -> C
  'strassring-mit-eiskristall-schliff-630800': ['C|-', 'C', 'Schmuck «aus Silber», «Veredelt durch Galvanisierung»: Plattierung ohne Zahl, Metall nicht klar'],
  'bohemian-perlenohrringe-leicht-elegant-639900': ['C|-', 'C', 'Kupfer, «Galvanisierung in Silber»'],
  'anpassbares-offenes-armband-mit-linearem-desig-603800': ['C|-', 'C', 'Edelstahl, «Elektroplattierung in Silber»'],
  // --- D|-: nur Farbnamen -> D, Marketingwörter (Goldkeramik, Goldpuder ...) -> X, Blattgold -> C
  'halskette-holzperlen-blattgold-anhanger-628800': ['D|-', 'C', 'Holzanhänger «mit Blattgold verziert» = Blattvergoldung, Echtheit unbekannt'],
  'keramik-teedose-luftdicht-630100': ['D|-', 'D', '«Flussgold» Farbname'],
  'sandalen-aus-kunstleder-mit-kristall-und-transparenzband-274560': ['D|-', 'D', '«Silbergoldfarbener Lack»: Farbe'],
  'outdoor-dual-display-sportuhr-mit-beleuchtung-770432': ['D|-', 'D', '«Lokalgold» Farbname'],
  'kissen-aus-hollandischem-samt-einfarbig-635900': ['D|-', 'D', '«Goldblattgelb», «Goldkaffee» Farbnamen'],
  'rechteckige-servierplatte-aus-porzellan-801280': ['D|-', 'D', '«Sesamgold» Farbname'],
  'grosse-ramen-schussel-600700': ['D|-', 'D', '«Sesamgold» Farbname'],
  '21-gitter-box-mit-nageldiamanten-360448': ['D|-', 'D', '«Minengold» Farbname'],
  // --- -|D: m2 D, m1 nichts -> D nur bei echtem Farbnamen, sonst X
  'business-casual-quarzuhr-mit-kalender-415168': ['-|D', 'D', '«Goldschuppen» Farbname einer Uhr'],
  'doppel-teesieb-aus-edelstahl-d515f3': ['-|D', 'D', '«Goldsieb» Ausführung = Farbe'],
};
// X-Entscheide in Gruppen (jeder Fall im Volltext gelesen; Grund steht in der Gruppe)
const X_GRUPPEN = {
  'Goldkeramik/Goldpuder/Iridium-Gold/Golden Hour/Goldblatt-Effekt/Goldnadeln: Marketing- oder Technikwort, kein Edelmetall der Ware': [
    'sunset-projection-lamp-16-colors-adjustable', 'keramik-dampfglatteisen-fur-schnelles-styling-428f1d', 'abstrakte-landschaft-leinwandbild-608768',
    'goldkeramik-kurzlockenburste-d5d827', 'kurzlocken-stift-8de2ba', 'japanischer-baumwollstoff-mit-goldpuder-druck-4def6e', 'iridium-gold-zundkerze-41-962-992064',
    'fluffy-splint-haarwurzel-dauerwelle-165440', 'nadel-holzbox-fur-handarbeiten-181440', 'keramik-haarglatter-mit-temperaturregelung-300992',
    'keramik-haarglatter-627900', 'tragbarer-2-in-1-styling-stab-fur-pony-74d4ba', 'automatischer-lockenstab-mit-goldkeramik-2e851e', 'handgemachte-goldpuder-nagel-mit-tulpenmuster-625800',
  ],
  'm2-Fehltreffer: Goldburg, Lippenstift-Farbnamen, Charleston, Goldmünzen-Kostüm, Goldmedaille, Goldfinch, Goldbohnen-Absatz, «elektronisch», Silberplatte-Option': [
    'mittelalterliche-goldburg-bausatz-974784', 'feuchtigkeitsspendender-matter-lippenstift-771584', 'schwebende-led-weltkarte-mit-magnetlevitation-81a2c9', 'charleston-set-fga900120',
    'goldmunzen-dollar-100-stk-fga986865', 'jcb-midi-cx-baggerlader-fga02427', 'kreative-kaffeetasse-mit-untertasse-loffel-636100', 'pumps-mit-kleinem-goldbohnen-absatz-607300',
    'smartwatch-mit-1-3-tft-display-326144',
  ],
  'technische Silberbeschichtung (Textil, Zelt, Kontakte, Gerätegehäuse, Spiegelrahmen, Duschkopf, Visier): kein Schmuck, kein Gold/Platin': [
    'schutzhulle-fur-outdoor-stuhle-schwarz-5b5d48', 'usb-a-stecker-mit-schwarzer-kunststoffabdeckun-907392', 'bento-picknick-lunchtasche-615500', 'sonnenschirm-mit-ventilator-523968',
    'wasserdichtes-dreieckiges-sonnensegel-548608', 'kontaktloses-tastatur-desinfektionsgerat-97dade', 'anti-beschlag-spiegel-mit-drehfunktion-638800', 'outdoor-hangematte-mit-sonnenschutz-629900',
    'vollautomatisches-campingzelt-fur-2-personen-637400', 'smart-hoop-abnehmbarer-fitnessreifen-016832', 'runder-duschkopf-mit-entnehmbarem-filter-606600', 'ausziehbarer-wasserhahn-fur-waschtisch-warm-ka-625400',
  ],
};
// Agreed-A: Urteil und wörtlicher Beleg (Beleg wird gegen den Originaltext geprüft)
const A_URTEIL = {
  'diy-gold-perle-fur-individuellen-schmuck-619300': ['massiv', 'Hergestellt aus 999er Feingold Polierte Oberfläche für edlen Glanz', 'Text behauptet 999er Feingold; Optionswerte «Spiegelgold, Antikgold» sprechen für Farbe; Preis/Punze unbekannt (Hypothese: eher Farbe)'],
  'armband-mit-susswasserperlen-und-tiermotiv-626500': ['unklar', 'Verarbeitung in 3D-Hartgold-Technik. Es ist mit unregelmässigen Süsswasserperlen besetzt', '«Hartgold» kann Legierung oder technische Hartvergoldung heissen; Material nicht genannt'],
  'gold-case-uhr-mit-goldteller-mediterraner-stil-602500': ['farbe', 'Das Gehäuse ist aus Gold gefertigt und kann mit einem Goldteller', 'gleicher Text: «Material: Metall», Farbe «Gold-Schwarz»; Hypothese Goldfarbe'],
  'perlen-ohrhanger-damen-1e5228': ['massiv', 'Perlen-Durchmesser: 8-9 mm 14k Gold Ohrhänger handgefertigte Verarbeitung', 'nennt 14k Gold ohne Plattierungswort und ohne Grundmetall; Echtheit ungeprüft'],
  'perlen-halskette-mit-18k-gold-5bf6ea': ['unklar', 'Edles Material: 18K Gold Pendant-Material: Perlmutt Farbe: rose gold', 'Material 18K Gold, aber «goldfarbene Ausführung» und Farbe rose gold im selben Text'],
  '18k-gold-akoya-perlen-armband-fcb661': ['massiv', 'Armband mit japanischen Akoya-Perlen aus 18 Kaltgold. Die Perlen sind in', '«Kaltgold» vermutlich Übersetzung von K-Gold; Titel «18K-Gold»; Echtheit ungeprüft'],
  'perlenarmband-aus-susswasserperlen-439a4d': ['massiv', 'sind an einer 14K-Gold-Kette mit einer Länge von 15-18cm befestigt', 'nennt 14K-Gold-Kette ohne Plattierungswort; Echtheit ungeprüft'],
  'seewasserperle-hanf-armband-14k-gold-8bf2bf': ['massiv', 'Material: 14 Karat Gold, Hanf', 'nennt 14 Karat Gold als Material ohne Plattierungswort; Echtheit ungeprüft'],
  'ei-formige-armbanduhr-fur-damen-602700': ['farbe', 'ei-förmiges Design wasserdicht Material: Gold Dicke: 10 mm', 'Optionswert «Farbe: Gold Mit Box»; Hypothese Goldfarbe'],
  'regenbogenring-614600': ['unklar', 'Inlay-Material: Platinum/K-Gold mit Edelsteinen Unisex-Design im europäischen', 'K-Gold ohne Zahl, Option «Platinfarbe»; Etikett für Einlage/Fassung, vermutlich plattiert oder Farbe'],
  'gold-pearl-halskette-631800': ['plattiert', 'Sie besteht aus Edelstahl und 18k Gold, was sie sehr robust und langlebig macht.', 'Grundmetall Edelstahl genannt, kein Plattierungswort: Plattierung erschlossen (Hypothese)'],
};
const E_URTEIL = {
  'elegantes-zirkon-armband-mit-krone-611200': ['plattiert', 'Einlagematerial: Platin/K-Gold mit Edelstein-Einlage Design: Krone', 'Kupfer mit «Echtvergoldung»; Platin/K-Gold nur als Etikett des Einlagematerials'],
  'lotpaste-fur-bga-reparaturen-625000': ['unklar', 'aus einer Mischung von 63% Zinn und 37% Palladium mit einer Partikelgrösse von 20-38 µm', 'Lötpaste, kein Schmuck; Palladium-Angabe vermutlich Datenfehler (Hypothese: Blei, Sn63/Pb37)'],
};

// ---------------------------------------------------------------- Endklasse bestimmen
const stat = { regelD_C: { gesamt: 0, template_nur: 0, schmuck_C: 0, nichtschmuck_D: 0 } };
function paar(h) {
  const a = m1[h]?.k || '-', b = m2[h]?.k || '-';
  return a + '|' + b;
}
function endklasse(h) {
  const p = prod[h];
  const pa = paar(h);
  const [a, b] = pa.split('|');
  if (MAN[h]) {
    const [erw, k, g] = MAN[h];
    if (erw !== pa) throw new Error(`MAN ${h}: erwartet ${erw}, gefunden ${pa}`);
    return { k, g: 'Einzelentscheid: ' + g };
  }
  for (const [g, liste] of Object.entries(X_GRUPPEN)) if (liste.includes(h)) return { k: 'X', g: 'Gruppenentscheid X: ' + g };
  if (a === b) return { k: a === '-' ? 'X' : a, g: 'beide Messer gleich' };
  const t = textVon(p);
  // Gruppenregeln für die übrigen Unterschiede
  if (pa === 'D|C') {
    stat.regelD_C.gesamt++;
    if (!PLW.test(t.alles)) { stat.regelD_C.template_nur++; return { k: 'D', g: 'Regel D|C: nach Entfernen der Shop-Vorlagensätze kein Plattierungswort (m2 traf «vergoldet»/«veredelt» der Vorlage)' }; }
    const schmuck = JE.test(p.productType || '') || JT.test(p.title || '');
    if (schmuck) { stat.regelD_C.schmuck_C++; return { k: 'C', g: 'Regel D|C: Schmuck/Uhr mit genanntem Plattierverfahren und Goldton, keine Zahl (m1 D wegen «Galvanik ohne Metall»)' }; }
    stat.regelD_C.nichtschmuck_D++;
    return { k: 'D', g: 'Regel D|C: kein Schmuck, Plattierverfahren nur Oberflächenfarbe (Wasserhahn, Gerät, Deko)' };
  }
  if (pa === 'B|C' || pa === 'B|-') return { k: 'B', g: 'Regel B|C und B|-: Karatzahl plus Plattier-/Veredelungsverfahren im Text (m1 stimmt, m2 verlangte Goldwort)' };
  if (pa === '-|C') return { k: 'X', g: 'Regel -|C: m2 traf nur den Shop-Vorlagensatz «vergoldet», Produkt nennt weder Gold noch Plattierung' };
  if (pa === 'C|D') return { k: 'D', g: 'Regel C|D: Lackierung, Farbname oder Option «Silberplatte» (m2 stimmt)' };
  if (pa === 'X|D' || pa === 'X|-' || pa === 'D|X' || pa === 'C|X' || pa === '-|X') return { k: 'X', g: 'Regel: Kosmetik 24K, Werkzeug oder Plattierverfahren ohne Gold/Metall (keine Edelmetallaussage)' };
  throw new Error('Unbehandelter Unterschied: ' + h + ' ' + pa);
}

const final = {};
for (const h of union) final[h] = endklasse(h);

// ---------------------------------------------------------------- Zählung
const zahl = Object.fromEntries(['A', 'E', 'B', 'C', 'D', 'X'].map((k) => [k, 0]));
const listen = { A: [], E: [], B: [], C: [], D: [], X: [] };
for (const h of union) { zahl[final[h].k]++; listen[final[h].k].push(h); }
for (const k of Object.keys(listen)) listen[k].sort();

// Untergruppen
const c1 = [], c2 = [], cTech = [];
const TECHNISCH = ['centechia-1-zu-3-rj45-ethernet-splitter-102784', 'profi-kondensator-mikrofon-fur-gaming-streamin-103296', 'ps5-controller-ladestation-fur-zwei-gamepads-140480', 'f-stecker-tv-kabeladapter-614800', 'nano-titanium-haarglatter-136384'];
for (const h of listen.C) { (PLM.test(textVon(prod[h]).alles) ? c1 : c2).push(h); if (TECHNISCH.includes(h)) cTech.push(h); }
const cSchmuck = listen.C.filter((h) => JE.test(prod[h].productType || '') || JT.test(prod[h].title || ''));
const dZahlFarbe = listen.D.filter((h) => { KARAT.lastIndex = 0; return KARAT.test(textVon(prod[h]).alles); });
const cSilber = listen.C.filter((h) => /(versilber|silber-?(plat|beschicht|schicht|überz|auflage)|silbergepl|in silber)/i.test(textVon(prod[h]).alles) && !/(gold|platin|rhodium)/i.test(textVon(prod[h]).alles));
const cSchmuckAnteil = cSchmuck.length;

// ---------------------------------------------------------------- Kreuztabelle und Unterschiede
const kreuz = {};
for (const h of union) kreuz[paar(h)] = (kreuz[paar(h)] || 0) + 1;
const unterschiede = union.filter((h) => { const [a, b] = paar(h).split('|'); return a !== b; });
const richtigM1 = unterschiede.filter((h) => (m1[h]?.k || 'X') === final[h].k || (m1[h] === undefined && final[h].k === 'X')).length;
const richtigM2 = unterschiede.filter((h) => (m2[h]?.k || 'X') === final[h].k || (m2[h] === undefined && final[h].k === 'X')).length;
const wederNoch = unterschiede.filter((h) => !((m1[h]?.k || 'X') === final[h].k) && !((m2[h]?.k || 'X') === final[h].k)).length;
// Änderungen gegen die gemeinsame Klasse (beide gleich, aber Abgleich anders)
const gemeinsamKorrigiert = union.filter((h) => { const [a, b] = paar(h).split('|'); return a === b && final[h].k !== (a === '-' ? 'X' : a); });

// ---------------------------------------------------------------- Beleg-Prüfung und Listen A/E
function belegGeprueft(h, beleg) {
  const t = textVon(prod[h]);
  const ok = ws(t.alles).includes(ws(beleg));
  if (!ok) throw new Error('Beleg nicht wörtlich gefunden bei ' + h + ': ' + beleg);
  return beleg.length;
}
const handlesA = listen.A.map((h) => {
  const u = A_URTEIL[h];
  if (!u) throw new Error('Kein Urteil für A-Handle ' + h);
  belegGeprueft(h, u[1]);
  return { handle: h, titel: prod[h].title, urteil: u[0], beleg: u[1], grund: u[2] };
});
const handlesE = listen.E.map((h) => {
  const u = E_URTEIL[h];
  if (!u) throw new Error('Kein Urteil für E-Handle ' + h);
  belegGeprueft(h, u[1]);
  return { handle: h, titel: prod[h].title, urteil: u[0], beleg: u[1], grund: u[2] };
});
const urteilA = {};
for (const x of handlesA) urteilA[x.urteil] = (urteilA[x.urteil] || 0) + 1;

// ---------------------------------------------------------------- Karat-Restprüfung (Zahl bleibt in C/D/X unbeachtet?)
const karatRest = [];
for (const h of union) {
  if (!['C', 'D', 'X'].includes(final[h].k)) continue;
  const t = textVon(prod[h]).alles;
  const ms = [...t.matchAll(KARAT)];
  if (!ms.length) continue;
  const ctx = ms.slice(0, 1).map((m) => ws(t.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40))).join(' ## ');
  if (KARAT_NICHT.test(ctx)) continue;
  karatRest.push({ handle: h, klasse: final[h].k, kontext: ctx });
}
// Recall: Karat-Zahlen bei Stahl/Kupfer/Messing/Reinheit in Produkten OHNE Klasse
const karatOhneKlasse = [];
for (const p of alleRecall) {
  const t = textVon(p).alles;
  for (const m of t.matchAll(KARAT)) {
    const ctx = ws(t.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40));
    if (KARAT_NICHT.test(ctx)) continue;
    if (/(edelstahl|stahl|kupfer|messing|reinheit|purity|purität|schmuck|kette|armband|ring)/i.test(ctx)) { karatOhneKlasse.push({ handle: p.handle, typ: p.productType, kontext: ctx }); break; }
  }
}
// Recall: Gold-/Plattier-Muster (drittes, einfaches Muster) in Produkten ohne Klasse
const RE3 = /(vergold|gold[\s-]?plat|gold[\s-]?filled|goldgef|goldauf|goldüberz|gold-?beschicht|echt ?gold|feingold|massiv\w* gold|gold massiv|palladium|plaqué|doublé|vermeil|rhodium|versilber|silberplat)/i;
const recall3 = [];
for (const p of alleRecall) { const t = textVon(p).alles; const m = t.match(RE3); if (m) recall3.push({ handle: p.handle, treffer: m[0] }); }

// ---------------------------------------------------------------- Ausgabe
fs.writeFileSync(DIR + '/handles_A.json', JSON.stringify(handlesA, null, 1));
fs.writeFileSync(DIR + '/handles_E.json', JSON.stringify(handlesE, null, 1));
for (const k of Object.keys(listen)) fs.writeFileSync(`${DIR}/klasse_${k}.txt`, listen[k].join('\n') + '\n');
fs.writeFileSync(
  DIR + '/unterschiede.tsv',
  ['handle\tm1\tm2\tendklasse\tgrund\ttitel']
    .concat(unterschiede.map((h) => [h, m1[h]?.k || '-', m2[h]?.k || '-', final[h].k, final[h].g, (prod[h].title || '').replace(/\t/g, ' ')].join('\t')))
    .join('\n') + '\n'
);
const out = {
  gelaufen_utc: new Date().toISOString(),
  eingabe: { pfad: EINGABE, sha256: sha, sha_erwartet: sha === SOLL_SHA, zeilen: gesamt },
  zahlen: Object.fromEntries(KL.map((k) => [k, { analyst1: zahl1[k], analyst2: zahl2[k], abgeglichen: zahl[k] }])),
  x_kein_edelmetallbezug: zahl.X,
  union: union.length,
  kreuztabelle_m1_m2: kreuz,
  unterschiede: { anzahl: unterschiede.length, m1_gleich_abgleich: richtigM1, m2_gleich_abgleich: richtigM2, weder_noch: wederNoch, gemeinsame_klasse_korrigiert: gemeinsamKorrigiert.length },
  regel_D_C: stat.regelD_C,
  untergruppen: {
    C1_metall_genannt: c1.length, C2_verfahren_ohne_metall: c2.length, C_schmuck_uhr: cSchmuckAnteil, C_nicht_schmuck: listen.C.length - cSchmuckAnteil,
    C_technisch_kontakte: cTech.length, C_nur_silber: cSilber.length, D_mit_karatzahl_im_farbnamen: dZahlFarbe.length,
    A_urteile: urteilA,
  },
  karat_rest_in_CDX: karatRest,
  karat_ohne_klasse_recall: karatOhneKlasse,
  recall_drittes_muster_ohne_klasse: recall3,
  gemeinsam_korrigiert: gemeinsamKorrigiert.map((h) => ({ handle: h, von: paar(h), nach: final[h].k, grund: final[h].g })),
  handles_A: handlesA,
  handles_E: handlesE,
  handles_B_anzahl: listen.B.length,
};
fs.writeFileSync(DIR + '/ergebnis.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify({ zahlen: out.zahlen, X: zahl.X, union: union.length, unterschiede: out.unterschiede, regel_D_C: stat.regelD_C, untergruppen: out.untergruppen }, null, 1));
console.log('A:', handlesA.length, 'E:', handlesE.length, 'karat_rest:', karatRest.length, 'karat_ohne_klasse:', karatOhneKlasse.length, 'recall3:', recall3.length);
