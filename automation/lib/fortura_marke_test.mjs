/* Test zu fortura_marke.mjs — echte Fälle aus dem Shop, am 24.10.2026 gelesen. */
import assert from 'node:assert/strict';
import { marke, istWidmann, artikelnummer, suchschluessel } from './fortura_marke.mjs';

let n = 0; const t = (name, fn) => { fn(); n++; };

// --- echte Beschreibung: Widmann (Kurzes Schneewittchenkostüm, fortura-93624-2) ---
const SCHNEEWITTCHEN = '<p>Hei Zwerge</p><h4>Details</h4><ul>\n<li>\n<strong>Marke:</strong> Widmann</li>\n<li>\n<strong>Farbe:</strong> mehrfarbig</li>\n</ul>';
// --- echte Beschreibung OHNE Marke-Feld (Engelsflügel BO52816, Harry Potter Besen RU9700) ---
const OHNE_MARKE = '<p>Engelsflügel schwarz 87x72 cm – hochwertige Qualität ab Schweizer Lager.</p><h4>Details</h4><h4>Warum bei LuxeStyle kaufen?</h4>';

t('Marke wird gelesen', () => assert.equal(marke(SCHNEEWITTCHEN), 'Widmann'));
t('fehlendes Marke-Feld ist null, nicht ""', () => assert.equal(marke(OHNE_MARKE), null));
t('leere Eingabe stuerzt nicht ab', () => { assert.equal(marke(''), null); assert.equal(marke(null), null); assert.equal(marke(undefined), null); assert.equal(marke(42), null); });
t('Marke mit Entity', () => assert.equal(marke('<strong>Marke:</strong> Haus &amp; Huberts</li>'), 'Haus & Huberts'));
t('Gross-/Kleinschreibung im Feldnamen', () => assert.equal(marke('<STRONG>marke:</STRONG> Widmann<'), 'Widmann'));

t('istWidmann trifft', () => assert.equal(istWidmann(SCHNEEWITTCHEN), true));
// GEGENPROBE in die andere Richtung: fremde Marken duerfen NICHT als Widmann gelten.
for (const fremd of ['Bruder Spielwaren', 'BOLAND', 'CHAKS', 'Orlob', 'Unitoys', 'Eulenspiegel', 'Rubie’s'])
  t(`istWidmann lehnt ${fremd} ab`, () => assert.equal(istWidmann(`<strong>Marke:</strong> ${fremd}</li>`), false));
t('ohne Marke-Feld NICHT Widmann', () => assert.equal(istWidmann(OHNE_MARKE), false));
// Eine Marke, die Widmann nur ENTHAELT, ist nicht Widmann.
t('Teiltreffer zaehlt nicht', () => assert.equal(istWidmann('<strong>Marke:</strong> Widmann-Vertrieb AG</li>'), false));
// Widmann im Fliesstext (nicht im Feld) darf nicht zaehlen.
t('Widmann im Text zaehlt nicht', () => assert.equal(istWidmann('<p>wie bei Widmann</p><strong>Marke:</strong> BOLAND</li>'), false));

// M5: ein LEERES Marke-Feld ist "unbekannt", nicht die Marke "" - sonst zaehlt es als Treffer.
t('leeres Marke-Feld ist null', () => { assert.equal(marke('<strong>Marke:</strong> </li>'), null); assert.equal(marke('<strong>Marke:</strong></li>'), null); });
// M2: NUR das strukturierte Feld zaehlt. Steht "Marke: X" bloss im Fliesstext, ist das
// keine Angabe des Lieferanten - ein lockereres Muster wuerde Prosa als Marke lesen.
t('Marke nur aus dem Feld, nicht aus Prosa', () => {
  assert.equal(marke('<p>Qualitaet wie Marke: Widmann</p><h4>Details</h4>'), null);
  assert.equal(istWidmann('<p>Vergleichbar mit Marke: Widmann</p><strong>Marke:</strong> BOLAND</li>'), false);
});

t('numerische Artikelnummer mit Variante', () => assert.deepEqual(artikelnummer('fortura-93624-2'), { nummer: '93624', suffix: '2', numerisch: true }));
t('numerisch ohne Variante', () => assert.deepEqual(artikelnummer('fortura-907797'), { nummer: '907797', suffix: null, numerisch: true }));
// Der Buchstabenvorsatz ist die MARKE - BO52816 ist BOLAND, nicht Widmann 52816.
t('Buchstabenvorsatz bleibt dran', () => assert.deepEqual(artikelnummer('fortura-BO52816'), { nummer: 'BO52816', suffix: null, numerisch: false }));
t('Groessen-Suffix ist Variante', () => assert.deepEqual(artikelnummer('fortura-84888-XL'), { nummer: '84888', suffix: 'XL', numerisch: true }));
t('fremdes SKU-Schema ist null', () => { assert.equal(artikelnummer('bb-S3414715'), null); assert.equal(artikelnummer('CJYD181444603CX'), null); assert.equal(artikelnummer('fortura-'), null); assert.equal(artikelnummer(''), null); assert.equal(artikelnummer(null), null); });

t('Barcode schlaegt Artikelnummer', () => assert.deepEqual(suchschluessel({ barcode: '8003558362424', sku: 'fortura-93624-2' }), { art: 'barcode', wert: '8003558362424' }));
t('ohne Barcode die Artikelnummer', () => assert.deepEqual(suchschluessel({ barcode: null, sku: 'fortura-907797' }), { art: 'artikelnummer', wert: '907797' }));
// GEGENPROBE: ein kaputter Barcode darf nicht als Barcode durchgehen.
// M6: ein Barcode hat 8-14 Stellen. Eine laengere Ziffernfolge ist keine GTIN, sondern
// z.B. eine CJ-pid (15+ Stellen) - die darf nicht als Barcode durchgehen.
t('zu lange Ziffernfolge ist kein Barcode', () => assert.deepEqual(suchschluessel({ barcode: '1687282481562652672', sku: 'fortura-907797' }), { art: 'artikelnummer', wert: '907797' }));
t('kurzer/krummer Barcode faellt zurueck', () => { assert.deepEqual(suchschluessel({ barcode: '123', sku: 'fortura-907797' }), { art: 'artikelnummer', wert: '907797' }); assert.deepEqual(suchschluessel({ barcode: 'n/a', sku: 'fortura-907797' }), { art: 'artikelnummer', wert: '907797' }); });
// Ohne beides lieber NICHTS als ein geratener Produktname.
t('ohne beides null', () => { assert.equal(suchschluessel({ barcode: null, sku: 'fortura-BO52816' }), null); assert.equal(suchschluessel({}), null); });

console.log(`fortura_marke: ${n} Tests gruen`);
