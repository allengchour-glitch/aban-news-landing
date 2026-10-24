/* Test zu chf_preis.mjs */
import assert from 'node:assert/strict';
import { chfPreise, tiefsterPreis, vergleich } from './chf_preis.mjs';
let n=0; const t=(name,fn)=>{fn();n++;};

t('CHF vorangestellt', () => assert.deepEqual(chfPreise('CHF 14.90'), [14.90]));
t('CHF nachgestellt', () => assert.deepEqual(chfPreise('14.90 CHF'), [14.90]));
t('Fr. Schreibweise', () => assert.deepEqual(chfPreise('Fr. 33.90'), [33.90]));
t('Schweizer Tausendertrennung', () => assert.deepEqual(chfPreise("CHF 1'249.00"), [1249]));
t('Komma als Dezimaltrenner', () => assert.deepEqual(chfPreise('CHF 14,90'), [14.90]));
t('mehrere, sortiert und ohne Dubletten', () => assert.deepEqual(chfPreise('CHF 33.90 CHF 14.90 CHF 14.90 CHF 16.80'), [14.90,16.80,33.90]));
t('leer/kaputt stuerzt nicht ab', () => { assert.deepEqual(chfPreise(''),[]); assert.deepEqual(chfPreise(null),[]); assert.deepEqual(chfPreise(undefined),[]); assert.deepEqual(chfPreise(7),[]); });

// GEGENPROBEN: was KEIN Preis ist, darf nicht als Preis gelten.
t('Zahl ohne Waehrung zaehlt nicht', () => assert.deepEqual(chfPreise('Zauberstab 122 cm, Art. 52815'), []));
t('EUR zaehlt nicht', () => assert.deepEqual(chfPreise('EUR 9.99'), []));
t('Groesse im Namen zaehlt nicht', () => assert.deepEqual(chfPreise('Kostuem 86x31 cm Gr. 152'), []));
t('zu klein/zu gross faellt weg', () => assert.deepEqual(chfPreise('CHF 0.50 CHF 9999.00 CHF 20.90'), [20.90]));

t('Versandpauschale ist nicht der Preis', () => assert.equal(tiefsterPreis('Versand CHF 7.00 · Artikel CHF 16.80'), 16.80));
// M5: es muss der TIEFSTE Haendlerpreis sein - der hoechste waere der Streichpreis
// und wuerde den eigenen Aufschlag kleinrechnen.
t('nimmt den tiefsten, nicht den hoechsten', () => {
  assert.equal(tiefsterPreis('Statt CHF 33.90 nur CHF 16.80 · auch CHF 24.50'), 16.80);
  assert.equal(tiefsterPreis('CHF 11.90 CHF 16.80 CHF 33.90'), 11.90);
});
t('ohne Preis null', () => assert.equal(tiefsterPreis('Keine Treffer gefunden'), null));
t('nur Versand auf der Seite = null', () => assert.equal(tiefsterPreis('Versand CHF 7.00'), null));

t('teurer wird erkannt', () => { const r=vergleich(33.90,14.90); assert.equal(r.faktor,2.28); assert.equal(r.urteil,'teurer'); assert.equal(r.differenz,19); });
t('im Rahmen', () => assert.equal(vergleich(63.90,61.65).urteil,'im_rahmen'));
t('guenstiger', () => assert.equal(vergleich(20,30).urteil,'guenstiger'));
// Die wichtigste Gegenprobe: eine fehlgeschlagene Messung ist UNBEKANNT, keine Freigabe.
t('ohne Marktpreis unbekannt, nicht im_rahmen', () => { for(const m of [null,undefined,0,-5,'n/a',NaN]) assert.equal(vergleich(33.90,m).urteil,'unbekannt'); });
t('ohne eigenen Preis unbekannt', () => { assert.equal(vergleich(0,14.90).urteil,'unbekannt'); assert.equal(vergleich('',14.90).urteil,'unbekannt'); });
t('Grenze 1.25 genau', () => { assert.equal(vergleich(125,100).urteil,'teurer'); assert.equal(vergleich(124,100).urteil,'im_rahmen'); });

console.log(`chf_preis: ${n} Tests gruen`);
