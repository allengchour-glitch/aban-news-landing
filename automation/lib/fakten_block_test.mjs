import assert from 'node:assert/strict';
import { MARKER, schonDa, strategien, htmlZuText, quelleAus, zahlen, zahlenBelegt, saeubern, genug, renderBlock, einsetzen, wissenFuer, auftrag, VERBOTEN } from './fakten_block.mjs';

let n = 0; const t = (name, f) => { try { f(); n++; } catch (e) { console.error('✗', name, '\n  ', e.message); process.exitCode = 1; } };

// ---- Pfad zum CJ-Produkt
t('reine Ziffern-SKU ist die pid', () => assert.deepEqual(strategien('2606150957291601400'), [['pid', '2606150957291601400']]));
t('pid steckt mitten in der SKU', () => assert.deepEqual(strategien('cj-2606150957291601400-x'), [['pid', '2606150957291601400']]));
t('CJ-UUID wird pid (Grossschrift)', () => assert.deepEqual(strategien('CJ-faac573a-b745-4533-827a-52dc76654304'), [['pid', 'FAAC573A-B745-4533-827A-52DC76654304']]));
t('Produkt-SKU mit cj-Vorsatz: erst Variante, dann Produkt', () => assert.deepEqual(strategien('cj-CJSL2935487'), [['variantSku', 'CJSL2935487'], ['productSku', 'CJSL2935487']]));
t('blanke Varianten-SKU behält ihr CJ (sonst 18 von 25 Treffern verloren, gemessen 25.10.)', () => assert.deepEqual(strategien('CJLY291617301AZ'), [['variantSku', 'CJLY291617301AZ'], ['productSku', 'CJLY291617301AZ']]));
t('leere SKU gibt nichts', () => assert.deepEqual(strategien(''), []));
t('Gegenprobe: kurze Ziffern sind keine pid', () => assert.equal(strategien('12345')[0][0], 'variantSku'));

// ---- Text aus HTML
t('Bilder und Tags fallen weg, Zeilen bleiben', () => assert.equal(htmlZuText('<p><b>Packing list:</b></p><p>1* Bracelet</p><p><img src="x.jpg"/></p>'), 'Packing list:\n1* Bracelet'));
t('Entitäten werden gelesen', () => assert.equal(htmlZuText('<p>Size&nbsp;10 &amp; 12</p>'), 'Size 10 & 12'));

const CJ = { productNameEn: 'Engraved Stainless Steel Double-layer Bracelet', materialNameEnSet: ['Metal'], packingNameEn: '["Plastic bags"]', productWeight: '16.00',
  description: '<p><b>Product information:</b></p><p>Material: Stainless steel<br/>Processing technology: Electroplating<br/>Target audience: Women</p><p><b>Packing list:</b></p><p>1* Bracelet</p><p><img src="a.jpg"/></p>',
  variants: [{ variantKey: 'Steel color-1 doll' }, { variantKey: 'Steel color-2 dolls' }, { variantKey: 'Steel color-1 doll' }], categoryName: 'Jewelry > Bracelets' };
t('Quelltext enthält Material, Gewicht, Beschreibung, Varianten (einmalig)', () => {
  const q = quelleAus(CJ);
  assert.match(q.text, /Material \(supplier field\): Metal/); assert.match(q.text, /Product weight: 16 g/); assert.match(q.text, /Packing list:\n1\* Bracelet/);
  assert.equal((q.text.match(/Steel color-1 doll/g) || []).length, 1); assert.equal(q.gewicht, 16);
});
t('dünne Quelle: nur Name → keine Beschreibungszeilen', () => assert.equal(quelleAus({ productNameEn: 'X', description: '<p>1</p>' }).beschreibungZeilen, 0));

// ---- Zahlen-Gegenprobe
t('Zahlen: Komma wie Punkt', () => assert.deepEqual(zahlen('2,5 cm und 10 mm'), ['2.5', '10']));
t('belegte Zahl besteht', () => assert.equal(zahlenBelegt('16 g', zahlen('Product weight: 16 g')), true));
t('«16.00» in der Quelle belegt «16»', () => assert.equal(zahlenBelegt('16 g', new Set(['16.00', '16'])), true));
t('erfundene Zahl fällt durch', () => assert.equal(zahlenBelegt('Länge 45 cm', zahlen('Product weight: 16 g')), false));
t('Wert ohne Zahl besteht immer', () => assert.equal(zahlenBelegt('Edelstahl', []), true));

// ---- Säubern
const Q = quelleAus(CJ).text;
t('gute Einträge bleiben, erfundene Zahl und Marke fliegen einzeln raus', () => {
  const s = saeubern({ daten: [{ label: 'Material', wert: 'Edelstahl' }, { label: 'Länge', wert: '45 cm' }, { label: 'Stil', wert: 'wie Rolex' }, { label: 'Gewicht', wert: '16 g' }],
    lieferumfang: ['1 Armband', '3 Ersatzteile'], hinweise: [] }, Q);
  assert.deepEqual(s.daten.map(d => d.label), ['Material', 'Gewicht']); assert.deepEqual(s.lieferumfang, ['1 Armband']);
  assert.equal(s.verworfen.length, 3);
});
t('ß wird zu ss (Schweizer Schreibweise)', () => assert.equal(saeubern({ daten: [{ label: 'Farbe', wert: 'Weiß' }] }, Q).daten[0].wert, 'Weiss'));
t('erfundene Beschriftung fliegt raus', () => assert.equal(saeubern({ daten: [{ label: 'Lieblingsort', wert: 'Strand' }] }, Q).daten.length, 0));
t('zwei Angaben in einem Wert fliegen raus («Ärmelstil: Ärmellos»)', () => assert.equal(saeubern({ daten: [{ label: 'Material', wert: 'Ärmelstil: Ärmellos' }] }, Q).daten.length, 0));
t('Verarbeitung ohne Verfahren fliegt raus, mit Verfahren bleibt sie', () => {
  assert.equal(saeubern({ daten: [{ label: 'Verarbeitung', wert: 'Einfarbig, Bodycon-Rock' }] }, Q).daten.length, 0);
  assert.equal(saeubern({ daten: [{ label: 'Verarbeitung', wert: 'Galvanisiert' }] }, Q).daten.length, 1);
});
t('Mass ohne Zahl fliegt raus («Volle Länge, Grössen: S, M»)', () => assert.equal(saeubern({ daten: [{ label: 'Masse', wert: 'Volle Länge' }] }, Q).daten.length, 0));
t('schonDa: gleicher Sinn wird erkannt, anderer nicht', () => {
  assert.equal(schonDa('Bitte überprüfen Sie die Grössentabelle sorgfältig vor dem Kauf', 'Bitte überprüfen Sie die Grössentabelle sorgfältig, bevor Sie bestellen'), true);
  assert.equal(schonDa('Farbe kann am Bildschirm abweichen', 'Material: Edelstahl, Pflege mit weichem Tuch'), false);
});
t('Hinweis, der schon auf der Seite steht, wird nicht doppelt gesetzt', () => assert.equal(saeubern({ hinweise: ['Grössentabelle vor dem Kauf sorgfältig überprüfen, Abweichungen möglich'] }, 'size chart check carefully 2', 'Bitte Grössentabelle vor dem Kauf sorgfältig überprüfen, Abweichungen sind möglich').hinweise.length, 0));
t('chinesische Zeichen fliegen raus', () => assert.equal(saeubern({ daten: [{ label: 'Material', wert: '不锈钢' }] }, Q).daten.length, 0));
t('Heilversprechen fliegt raus', () => assert.equal(saeubern({ hinweise: ['Heilt Schmerzen'] }, Q).hinweise.length, 0));
t('Gegenprobe: normaler Hinweis mit «heilig» ist kein Heilversprechen', () => assert.equal(saeubern({ hinweise: ['Nicht in der Heiligen Nacht tragen'] }, Q).hinweise.length, 1));
t('Mass ohne Einheit fliegt raus (160x48 kann cm, mm oder Steine sein)', () => assert.equal(saeubern({ daten: [{ label: 'Masse', wert: '160x48' }] }, 'Size: 160x48').daten.length, 0));
t('Gegenprobe: Mass mit Einheit bleibt', () => assert.equal(saeubern({ daten: [{ label: 'Masse', wert: '160 x 48 cm' }] }, 'Size: 160 x 48 cm').daten.length, 1));
t('Gegenprobe: Material mit Zahl im Label wird nicht als Mass gewertet', () => assert.equal(saeubern({ daten: [{ label: 'Material', wert: '925 Silber' }] }, 'Material: 925 Silver').daten.length, 1));
t('Doppelte Labels werden einmal geführt', () => assert.equal(saeubern({ daten: [{ label: 'Material', wert: 'Edelstahl' }, { label: 'material', wert: 'Metall' }] }, Q).daten.length, 1));
t('steht auf der Seite schon «Gewicht:», wird es nicht doppelt gesetzt', () => assert.deepEqual(saeubern({ daten: [{ label: 'Gewicht', wert: '16 g' }, { label: 'Material', wert: 'Edelstahl' }] }, Q, 'Produktdetails Gewicht: ca. 16 g').daten.map(d => d.label), ['Material']));
t('kaputte Antwort stürzt nicht ab', () => { const s = saeubern(null, Q); assert.equal(s.belegt, 0); assert.equal(genug(s), false); });
t('Höchstmengen werden eingehalten', () => assert.equal(saeubern({ lieferumfang: Array.from({ length: 12 }, (_, i) => `Teil ${i}`) }, 'Teil 0 1 2 3 4 5 6 7 8 9 10 11').lieferumfang.length, 6));

// ---- genug
t('zwei Daten + ein Hinweis reichen', () => assert.equal(genug({ belegt: 3, daten: [1, 2], lieferumfang: [] }), true));
t('Gegenprobe: drei Hinweise ohne Daten reichen nicht', () => assert.equal(genug({ belegt: 3, daten: [], lieferumfang: [] }), false));
t('Gegenprobe: zwei Angaben reichen nicht', () => assert.equal(genug({ belegt: 2, daten: [1, 2], lieferumfang: [] }), false));

// ---- Block & Einsetzen
const S = { daten: [{ label: 'Material', wert: 'Edelstahl' }, { label: 'Zielgruppe', wert: 'Frauen' }], lieferumfang: ['1 Armband'], anleitung: [], hinweise: ['Farbe kann am Bildschirm abweichen'] };
t('Block trägt Marker, Tabelle, Liste und Quellenhinweis', () => { const b = renderBlock(S); assert.ok(b.startsWith(MARKER)); assert.match(b, /<table/); assert.match(b, /Lieferumfang/); assert.match(b, /Datenblatt/); assert.match(b, /<h4>Technische Daten/); });
t('HTML in Werten wird maskiert', () => assert.match(renderBlock({ ...S, daten: [{ label: 'A', wert: '<b>x</b>' }] }), /&lt;b&gt;x&lt;\/b&gt;/));
t('leere Teile erzeugen keine leeren Überschriften', () => assert.doesNotMatch(renderBlock({ ...S, anleitung: [], lieferumfang: [] }), /Lieferumfang|So geht/));
t('Einsetzen vor den Querverweisen', () => { const h = einsetzen('<p>Text</p><!-- ls-xsell-v1 --><p>mehr</p>', renderBlock(S)); assert.ok(h.indexOf(MARKER) < h.indexOf('ls-xsell-v1')); });
t('Ohne Querverweise ans Ende', () => assert.ok(einsetzen('<p>Text</p>', renderBlock(S)).endsWith('<!-- /ls-fakten-v1 -->')));
t('Neuer Block ersetzt den alten, ohne zu verdoppeln, und lässt den Rest der Seite stehen', () => {
  const a = einsetzen('<p>T</p><!-- ls-xsell-v1 --><p>X</p>', renderBlock(S));
  const b = einsetzen(a, renderBlock({ ...S, daten: [{ label: 'Farbe', wert: 'Rot' }, { label: 'Material', wert: 'Holz' }] }));
  assert.equal((b.match(/ls-fakten-v1 -->/g) || []).length, 2); assert.match(b, /Holz/); assert.doesNotMatch(b, /Edelstahl/); assert.ok(b.startsWith('<p>T</p>')); assert.ok(b.endsWith('<p>X</p>'));
});
t('Block ohne Endmarke (beschädigt) bleibt unangetastet', () => assert.equal(einsetzen('<p>T</p><!-- ls-fakten-v1 -->kaputt', renderBlock(S)), '<p>T</p><!-- ls-fakten-v1 -->kaputt'));
t('Zweiter Lauf ändert nichts (idempotent)', () => { const a = einsetzen('<p>T</p>', renderBlock(S)); assert.equal(einsetzen(a, renderBlock(S)), a); });

// ---- Wissen
t('Diamond Painting bekommt die allgemeine Anleitung', () => assert.ok(wissenFuer('Diamond Painting Weisser Tiger', '')));
t('Gegenprobe: Armband bekommt keine', () => assert.equal(wissenFuer('Edelstahl-Armband', 'Jewelry'), null));
t('Anleitung wird als «allgemein» gekennzeichnet', () => assert.match(renderBlock(S, { wissen: wissenFuer('Diamond Painting', '') }), /allgemein/));

// ---- Auftrag
t('Auftrag verbietet Ergänzen, Umrechnen, Marken', () => { const a = auftrag('Q', 'T'); assert.match(a, /Nichts ergänzen/); assert.match(a, /Nichts umrechnen/); assert.match(a, /Keine Marken/); });
t('VERBOTEN trifft Marke, nicht Alltagswort', () => { assert.ok(VERBOTEN.test('Disney Motiv')); assert.ok(!VERBOTEN.test('Edelstahl, nickelarm')); });

console.log(`fakten_block_test: ${n} ok`);
