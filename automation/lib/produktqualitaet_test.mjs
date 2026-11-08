import assert from 'node:assert/strict';
import { Qualitaetszaehler } from './produktqualitaet.mjs';

let tests = 0, fehler = 0;
function pruef(name, fn) {
  tests++;
  try { fn(); console.log('ok   ' + name); }
  catch (error) { fehler++; console.error('FAIL ' + name + ': ' + error.message); }
}
const pid = n => 'gid://shopify/Product/' + n;
const produkt = (n = 1) => ({ id: pid(n), title: 'Erfundenes Testprodukt', description: 'Erfundene sachliche Beschreibung.', seo: { title: null, description: 'Erfundene SEO-Beschreibung.' } });
const bild = (n = 1, p = 1) => ({ id: 'gid://shopify/MediaImage/' + n, __parentId: pid(p), alt: 'Erfundenes Produkt auf neutralem Grund', status: 'READY', mediaContentType: 'IMAGE' });
function messen(rows, extra = {}) {
  const q = new Qualitaetszaehler(); rows.forEach(r => q.add(r));
  const roots = rows.filter(r => /^gid:\/\/shopify\/Product\//.test(r.id) && !Object.hasOwn(r, '__parentId')).length;
  return q.finish({ expectedRoots: roots, expectedObjects: rows.length, activeBefore: roots, activeAfter: roots, ...extra });
}

pruef('Gegenprobe: vollständig befüllte erfundene Mindestfelder', () => {
  const r = messen([produkt(), bild()]);
  assert.equal(r.produkte, 1); assert.equal(r.objekte, 2); assert.equal(r.bilder, 1); assert.equal(r.medien, 1);
  assert.equal(r.vollstaendig, true); assert.equal(r.mindestfelder_ok, 1); assert.equal(r.technische_quote_prozent, 100);
  assert.deepEqual(r.kandidaten, []); assert.ok(Object.values(r.befunde).every(v => v === 0));
});
pruef('SEO-Titel null ist ein zulässiger Produkt-Titel-Fallback', () => {
  assert.equal(messen([produkt(), bild()]).mindestfelder_ok, 1);
});
pruef('Medien dürfen vor dem Produkt eintreffen', () => {
  assert.equal(messen([bild(), produkt()]).mindestfelder_ok, 1);
});
pruef('Titel fehlt als Inhalt, nicht als Feld', () => {
  const p = produkt(); p.title = '  ';
  const r = messen([p, bild()]); assert.equal(r.befunde.produkte_ohne_titel, 1); assert.equal(r.mindestfelder_ok, 0);
});
pruef('Klartextbeschreibung leer: Leer-HTML ist kein Inhalt', () => {
  const p = produkt(); p.description = '<p>&nbsp;<!-- leer --></p>';
  assert.equal(messen([p, bild()]).befunde.produkte_ohne_beschreibung, 1);
});
for (const value of [null, '', '  ']) pruef('SEO-Beschreibung leer: ' + JSON.stringify(value), () => {
  const p = produkt(); p.seo.description = value;
  assert.equal(messen([p, bild()]).befunde.produkte_ohne_seobeschreibung, 1);
});
pruef('Ohne Bild reicht ein Video nicht', () => {
  const m = { ...bild(), mediaContentType: 'VIDEO', alt: null };
  const r = messen([produkt(), m]); assert.equal(r.bilder, 0); assert.equal(r.medien, 1); assert.equal(r.befunde.produkte_ohne_bild, 1);
});
pruef('Jedes Medium muss READY sein, auch ein zusätzliches Video', () => {
  const m = { ...bild(2), mediaContentType: 'VIDEO', status: 'PROCESSING', alt: null };
  const r = messen([produkt(), bild(), m]); assert.equal(r.befunde.medien_nicht_ready, 1); assert.equal(r.mindestfelder_ok, 0);
});
for (const value of [null, '', '\u200B']) pruef('Fehlender Bild-Alttext: ' + JSON.stringify(value), () => {
  const m = { ...bild(), alt: value }; const r = messen([produkt(), m]);
  assert.equal(r.befunde.bilder_ohne_alttext, 1); assert.equal(r.befunde.produkte_mit_bildern_ohne_alttext, 1);
});
pruef('Mehrere fehlende Alttexte zählen Bilder und Produkt getrennt', () => {
  const r = messen([produkt(), { ...bild(), alt: null }, { ...bild(2), alt: '' }]);
  assert.equal(r.befunde.bilder_ohne_alttext, 2); assert.equal(r.befunde.produkte_mit_bildern_ohne_alttext, 1);
});
for (const key of ['expectedRoots', 'expectedObjects', 'activeBefore', 'activeAfter']) pruef('Teilabdeckung: ' + key, () => {
  const r = messen([produkt(), bild()], { [key]: 99 });
  assert.equal(r.vollstaendig, false); assert.equal(r.mindestfelder_ok, 1); assert.equal(r.technische_quote_prozent, null);
});
pruef('Vollständig leerer Auszug erfindet keine Prozentquote', () => {
  const r = messen([]); assert.equal(r.vollstaendig, true); assert.equal(r.technische_quote_prozent, null);
});
pruef('Erfundene Mischmenge: technische Quote und Kandidat betreffen nur Mindestfelder', () => {
  const p = produkt(2); p.title = '';
  const r = messen([produkt(), bild(), p, bild(2, 2)]);
  assert.equal(r.mindestfelder_ok, 1); assert.equal(r.technische_quote_prozent, 50);
  assert.equal(r.kandidaten.length, 1); assert.equal(r.kandidaten[0].id, pid(2)); assert.match(r.massstab, /SETZUNG/);
});
pruef('Höchstens 50 Kandidaten, trotzdem alle Produktbefunde zählen', () => {
  const rows = Array.from({ length: 60 }, (_, i) => produkt(i + 1));
  const r = messen(rows); assert.equal(r.kandidaten.length, 50); assert.equal(r.befunde.produkte_ohne_bild, 60);
});
pruef('Keine Preisfelder oder signierten URLs in Kandidaten', () => {
  const p = produkt(); p.title = 'Demo CHF 123.45 https://example.invalid/a?signature=GEHEIM'; p.description = '';
  p.preis = 'GEHEIM';
  const text = JSON.stringify(messen([p, bild()]));
  assert.ok(!text.includes('signature')); assert.ok(!text.includes('GEHEIM')); assert.ok(!text.includes('123.45'));
});
pruef('Doppelte Produkte sind kein sauberer Zähler', () => assert.throws(() => messen([produkt(), produkt()]), /PRODUKTQUALITAET/));
pruef('Doppelte Eltern-Medien-Paare sind ein Messfehler', () => assert.throws(() => messen([produkt(), bild(), bild()]), /PRODUKTQUALITAET/));
pruef('Verwaiste Medien sind kein Produkt ohne Befund', () => assert.throws(() => messen([bild()]), /Verwaiste/));
pruef('Gleiche Medienkennung bei zwei Eltern ist kein doppeltes Paar', () => {
  assert.equal(messen([produkt(), produkt(2), bild(), bild(1, 2)]).medien, 2);
});

const kaputteProdukte = [
  null, [], {}, { id: pid(1) }, { ...produkt(), id: 1 }, { ...produkt(), title: null },
  { ...produkt(), description: null }, { ...produkt(), seo: null },
  { ...produkt(), seo: { description: 'Text' } }, { ...produkt(), seo: { title: null } },
  { ...produkt(), seo: { title: 5, description: 'Text' } }, { ...produkt(), seo: { title: null, description: [] } },
  { ...produkt(), __parentId: pid(2) },
];
kaputteProdukte.forEach((row, i) => pruef('Defekte Produktpflichtfelder ' + i, () => assert.throws(() => messen([row]), /PRODUKTQUALITAET/)));
const kaputteMedien = [
  { ...bild(), __parentId: null }, { ...bild(), __parentId: 'fremd' }, { ...bild(), id: '' },
  { ...bild(), alt: 0 }, { ...bild(), status: null }, { ...bild(), status: '' },
  { ...bild(), mediaContentType: null }, { ...bild(), mediaContentType: '' },
];
const ohneAlt = bild(); delete ohneAlt.alt; kaputteMedien.push(ohneAlt);
kaputteMedien.forEach((row, i) => pruef('Defekte Medienpflichtfelder ' + i, () => assert.throws(() => messen([produkt(), row]), /PRODUKTQUALITAET/)));
for (const value of [null, '2', -1, 1.5, Number.NaN]) pruef('Ungültige Vollständigkeitsangabe ' + String(value), () => {
  assert.throws(() => messen([produkt(), bild()], { expectedRoots: value }), /PRODUKTQUALITAET/);
});
pruef('Nach abgefangenem Zeilenfehler bleibt die Messung abgebrochen', () => {
  const q = new Qualitaetszaehler(); q.add(produkt());
  assert.throws(() => q.add({ id: 'fremd' }), /PRODUKTQUALITAET/);
  assert.throws(() => q.add(bild()), /abgebrochen/);
  assert.throws(() => q.finish({ expectedRoots: 1, expectedObjects: 1, activeBefore: 1, activeAfter: 1 }), /abgebrochen/);
});
pruef('Nach verwaister Zeile kein nachträglich glattgebügelter Bericht', () => {
  const q = new Qualitaetszaehler(); q.add(bild());
  assert.throws(() => q.finish({ expectedRoots: 0, expectedObjects: 1, activeBefore: 0, activeAfter: 0 }), /Verwaiste/);
  assert.throws(() => q.add(produkt()), /abgebrochen/);
});
pruef('Abgeschlossene Messung nimmt keine weiteren Zeilen an', () => {
  const q = new Qualitaetszaehler(); q.add(produkt()).add(bild());
  q.finish({ expectedRoots: 1, expectedObjects: 2, activeBefore: 1, activeAfter: 1 });
  assert.throws(() => q.add(produkt(2)), /abgeschlossen/);
});

console.log(`${tests - fehler} ok, ${fehler} Fehler`);
if (fehler) process.exitCode = 1;
