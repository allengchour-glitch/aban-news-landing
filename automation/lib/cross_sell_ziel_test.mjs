/** Test für die Ziel-Collection der Querverweis-Box.
 *  Alle Tag-Sätze unten sind ECHT, am 2026-10-18 aus dem Live-Katalog gelesen.
 *  Lauf: node automation/lib/cross_sell_ziel_test.mjs                                */
import { zielFinden, themenTags, ZIELE, NICHT_THEMA } from './cross_sell_ziel.mjs';

let fehler = 0;
const pruef = (name, ist, soll) => {
  if (ist !== soll) { fehler++; console.log(`FAIL ${name}\n     ist  ${ist}\n     soll ${soll}`); }
  else console.log(`ok   ${name}`);
};

// ── 1. Der behobene Fehler: der Versand-Tag darf NICHT nach „Schweiz-Edition" führen ──
const VERSAND_FALLE = {
  'Smartwatch (CH-Lager)':      ['cj-real', 'kategorie-uhr', 'schweiz-versand'],
  'Aromadiffusor (CH-Lager)':   ['cj-real', 'kat-aroma', 'schweiz-versand'],
  'Taschenradio (CH-Lager)':    ['cj-real', 'elektronik', 'schweiz-versand'],
  'Damenkleid (CH-Lager)':      ['cj-real', 'damen', 'kleid', 'schweiz-versand'],
};
const ERWARTET = { 'Smartwatch (CH-Lager)': 'schmuck', 'Aromadiffusor (CH-Lager)': 'wohnen',
  'Taschenradio (CH-Lager)': 'gadget', 'Damenkleid (CH-Lager)': 'damen' };
for (const [name, tags] of Object.entries(VERSAND_FALLE)) {
  const z = zielFinden(tags, '');
  pruef(`${name} → nicht Schweiz-Edition`, z.schluessel, ERWARTET[name]);
}

// ── 2. GEGENPROBE in die andere Richtung: echte Schweiz-Ware MUSS weiter dorthin ──
const ECHT_SCHWEIZ = {
  'Edelweiss-Sticker':       ['schweiz-edition', 'edelweiss', 'sticker'],
  'Matterhorn-Poster':       ['matterhorn', 'poster'],
  'Fondue-Set 1. August':    ['schweiz-edition', 'fondue'],
  'Alphorn-Mauspad (CH-Lager)': ['alphorn', 'mauspad', 'schweiz-versand'],
};
for (const [name, tags] of Object.entries(ECHT_SCHWEIZ)) {
  pruef(`${name} → Schweiz-Edition`, zielFinden(tags, '').schluessel, 'schweiz');
}

// ── 2b. Die Form ist kein Thema (gemessen 2026-10-23: 265 Fehlzuordnungen allein über `sticker`) ──
// Gegenprobe in die andere Richtung zum Block darüber: dort entscheidet das Schweiz-Wort, hier
// darf die blosse Darreichungsform NICHT entscheiden. Beide Richtungen zusammen halten die Regel.
const NUR_FORM = {
  'Blanko-Aufkleber zum Selbstgestalten': ['printful_personalized_product', 'sg-accessoires', 'wunschdesign'],
  'Poster ohne Motivangabe':              ['poster', 'kunstdruck'],
  'Mauspad ohne Motivangabe':             ['mauspad'],
  'Sticker-Set ohne Motivangabe':         ['sticker', 'bild-ok'],
};
for (const [name, tags] of Object.entries(NUR_FORM)) {
  pruef(`${name} → NICHT Schweiz-Edition`, zielFinden(tags, '').schluessel !== 'schweiz', true);
}
// Und das Gegenstück: mit Schweiz-Wort bleibt es ein Thema, auch wenn die Form dabeisteht.
pruef('Edelweiss-Poster bleibt Schweiz-Edition', zielFinden(['poster', 'edelweiss'], '').schluessel, 'schweiz');
pruef('Grüezi-Mundart-Druck ist Schweiz-Edition', zielFinden(['grueezi', 'mundart'], '').schluessel, 'schweiz');

// ── 3. Die richtigen Treffer mitten im Wort dürfen nicht verlorengehen ──
pruef('kategorie-uhr bleibt Schmuck & Uhren', zielFinden(['kategorie-uhr'], '').schluessel, 'schmuck');
pruef('kat-aroma bleibt Wohnen & Deko',       zielFinden(['kat-aroma'], '').schluessel, 'wohnen');
pruef('kat-halsketten bleibt Schmuck',        zielFinden(['kat-halsketten'], '').schluessel, 'schmuck');

// ── 4. Der Versand-Filter bleibt eng ──
pruef('schweiz-versand ist kein Thema', NICHT_THEMA.test('schweiz-versand'), true);
pruef('gratis-versand ist kein Thema',  NICHT_THEMA.test('gratis-versand'), true);
pruef('versand-express ist kein Thema', NICHT_THEMA.test('versand-express'), true);
pruef('cj-nicht-versendbar-ch BLEIBT',  NICHT_THEMA.test('cj-nicht-versendbar-ch'), false);
pruef('versandkosten-frei BLEIBT (ein Wort)', NICHT_THEMA.test('versandkosten-frei'), false);
pruef('Versand-Tag fliegt aus dem Heuhaufen',
  themenTags(['damen', 'schweiz-versand'], ''), 'damen');

// ── 5. Jedes Ziel hat Handle und Label, der Rückfall greift ──
for (const [k, v] of Object.entries(ZIELE)) {
  pruef(`Ziel ${k} vollständig`, Boolean(v[0] && v[1]), true);
}
const rest = zielFinden(['cj-real', 'rueckhol-0907'], '');
pruef('ohne Thema → Geschenkideen', rest.schluessel, 'geschenk');
pruef('ohne Thema nennt den Grund', rest.grund, 'kein Thema erkannt');
pruef('Treffer nennt das entscheidende Wort', zielFinden(['damen', 'kleid'], '').grund, 'damen');
pruef('leere Eingabe fällt zurück', zielFinden([], null).schluessel, 'geschenk');

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Prüfungen grün');
process.exit(fehler ? 1 : 0);
