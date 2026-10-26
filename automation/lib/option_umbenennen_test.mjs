import assert from 'node:assert/strict';
import { plane } from './option_umbenennen.mjs';
let n = 0; const t = (name, f) => { try { f(); n++; } catch (e) { console.error('✗', name, '\n  ', e.message); process.exitCode = 1; } };
const O = [{ id: 'o1', name: 'Farbe', optionValues: [{ id: 'v1', name: 'Gold black skin white' }, { id: 'v2', name: 'Rose brown skin' }, { id: 'v3', name: 'Schwarz' }] }, { id: 'o2', name: 'Grösse', optionValues: [{ id: 'v4', name: 'Large Size 190to210 Cm' }] }];

t('gültige Umbenennung', () => { const r = plane(O, { Farbe: { 'Gold black skin white': 'Gold, schwarzes Band, weisses Zifferblatt' } }); assert.equal(r.aenderungen.length, 1); assert.equal(r.aenderungen[0].valueId, 'v1'); });
t('ß wird zu ss', () => assert.equal(plane(O, { Farbe: { 'Rose brown skin': 'Rosé, braunes Band, weiß' } }).aenderungen[0].neu, 'Rosé, braunes Band, weiss'));
t('unbekannter alter Wert wird abgelehnt', () => assert.equal(plane(O, { Farbe: { 'Nicht da': 'X' } }).abgelehnt.length, 1));
t('unbekannte Option wird abgelehnt', () => assert.equal(plane(O, { Stil: { a: 'b' } }).abgelehnt.length, 1));
t('gleicher Name wie ein vorhandener Wert verschmilzt Varianten → abgelehnt', () => { const r = plane(O, { Farbe: { 'Rose brown skin': 'Schwarz' } }); assert.equal(r.aenderungen.length, 0); assert.match(r.abgelehnt[0], /verschmelzen/); });
t('zwei Werte auf denselben neuen Namen → beide abgelehnt', () => { const r = plane(O, { Farbe: { 'Gold black skin white': 'Gold', 'Rose brown skin': 'Gold' } }); assert.equal(r.aenderungen.length, 0); assert.equal(r.abgelehnt.length, 2); });
t('erfundene Zahl wird abgelehnt', () => assert.match(plane(O, { Grösse: { 'Large Size 190to210 Cm': 'Gross, 220–240 cm' } }).abgelehnt[0], /Zahl 220/));
t('Gegenprobe: Zahlen aus dem alten Wert sind erlaubt', () => assert.equal(plane(O, { Grösse: { 'Large Size 190to210 Cm': 'Gross, 190–210 cm' } }).aenderungen.length, 1));
t('Marke wird abgelehnt', () => assert.equal(plane(O, { Farbe: { 'Gold black skin white': 'Rolex-Gold' } }).aenderungen.length, 0));
t('zu langer Name wird abgelehnt', () => assert.equal(plane(O, { Farbe: { 'Gold black skin white': 'x'.repeat(61) } }).aenderungen.length, 0));
t('unverändert oder leer erzeugt nichts', () => { assert.equal(plane(O, { Farbe: { Schwarz: 'Schwarz' } }).aenderungen.length, 0); assert.equal(plane(O, { Farbe: { Schwarz: '' } }).aenderungen.length, 0); });
t('leerer Wunsch stürzt nicht ab', () => { assert.deepEqual(plane(O, null).aenderungen, []); assert.deepEqual(plane(O, {}).abgelehnt, []); });
console.log(`option_umbenennen_test: ${n} ok`);
