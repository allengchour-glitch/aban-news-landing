// Nur synthetische Belege. Kein Gerät, kein rechtlicher Konformitätsnachweis.
import assert from 'node:assert/strict';
import { fremdSteckerKey, euroSteckerKey, steckerUrteil, stromversorgungsReview } from './stecker_cj.mjs';
const clone = x => JSON.parse(JSON.stringify(x));
const ids = { shopifyVariantID: 'gid://shopify/ProductVariant/1', supplierVariantID: 'FIXTURE-VID-1' };
const ref = { ...ids, source: 'fixture://synthetic-do-not-use-as-evidence', capturedAt: '2026-10-26T12:00:00Z', sha256: 'a'.repeat(64) };
const evidence = Object.fromEntries(['identity', 'contents', 'plug', 'ratings', 'protection', 'conformity', 'deviceInput', 'adapterOutput', 'usbRequirements'].map(k => [k, clone(ref)]));
const base = { schemaVersion: 1, ...ids, configuration: 'single', power: 'includedAdapter', suppliedPlug: 'Europlug', adapterSolution: 'none',
  evidence, electrical: { input: 'AC', voltageV: { min: 100, max: 240 }, frequencyHz: { min: 50, max: 60 } },
  deviceInputMarking: 'Fixture: 5 V DC, 2 A', adapterOutputMarking: 'Fixture: 5 V DC, 2 A',
  checks: { plugRatingAndProtection: true, supplyConformityEvidence: true, outputMatchesDevice: true },
  reviewedBy: 'fixture-reviewer', reviewedAt: '2026-10-26T12:01:00Z' };
let count = 0;
function test(name, mutate, expected) {
  const x = clone(base); mutate(x);
  assert.equal(stromversorgungsReview(x).status, expected, name); count++;
}
test('vollständiger manueller Nachweissatz ist keine approved-Entscheidung', () => {}, 'evidenceComplete');
test('EU/CE/USB-Labels ohne Belege bleiben unknown', x => { x.sourceOptionLabel = 'EU CE USB'; x.evidence = {}; }, 'unknown');
test('supplierVariantID fehlt', x => { delete x.supplierVariantID; }, 'unknown');
test('Netzteil-Lieferumfang fehlt', x => { delete x.evidence.contents; }, 'unknown');
test('50-Hz-Angabe fehlt', x => { delete x.electrical.frequencyHz; }, 'unknown');
test('EU-Label darf belegte 110 V nicht überstimmen', x => { x.sourceOptionLabel = 'European Standard'; x.electrical.voltageV = { min: 110, max: 120 }; }, 'reject');
test('konkret bestätigter US/UK-Stecker ohne mitgelieferte Lösung', x => { x.suppliedPlug = 'foreign'; }, 'reject');
test('Fremdstecker-Angabe ohne Steckerbild/Beleg bleibt unknown', x => { x.suppliedPlug = 'foreign'; delete x.evidence.plug; }, 'unknown');
test('gemischte Ausführungen', x => { x.configuration = 'mixed'; }, 'needsReview');
test('falsche Supplier-Variantenzuordnung im Beleg', x => { x.evidence.plug.supplierVariantID = 'OTHER-VID'; }, 'needsReview');
test('Fixadapter niemals pauschal freigeben', x => { x.suppliedPlug = 'foreign'; x.adapterSolution = 'fixedAdapter'; }, 'needsReview');
test('USB nur als Wort ist kein Nachweis', x => { x.power = 'usbOnly'; x.suppliedPlug = 'none'; delete x.usbSourceRequirements; }, 'unknown');
test('USB-only mit belegtem Lieferumfang und Anforderungen hat begrenzten Scope', x => {
  x.power = 'usbOnly'; x.suppliedPlug = 'none'; x.usbConnector = 'Fixture USB-C';
  x.usbSourceRequirements = 'Fixture 5 V DC / mindestens 2 A, kein Netzteil mitgeliefert';
  x.checks.usbRequirementsReviewed = true;
}, 'evidenceComplete');
const usb = clone(base); usb.power = 'usbOnly'; usb.suppliedPlug = 'none'; usb.usbConnector = 'Fixture USB-C';
usb.usbSourceRequirements = 'Fixture 5 V / 2 A'; usb.checks.usbRequirementsReviewed = true;
assert.equal(stromversorgungsReview(usb).scope, 'usb-package-and-source-requirements-only'); count++;
test('falscher Hash ist kein belastbarer Snapshot', x => { x.evidence.identity.sha256 = 'not-a-hash'; }, 'unknown');
test('Netzteil passt nicht nachgewiesen zum Gerät', x => { x.checks.outputMatchesDevice = false; }, 'unknown');

// Reproduziert die bestehenden Grenzen, statt sie als Konformitätsprüfung auszugeben.
assert.equal(fremdSteckerKey('European Standard 110V'), false); count++;
assert.equal(euroSteckerKey('Black-EU'), true); count++;
assert.equal(steckerUrteil([{ id: 'v', sku: 'unmapped' }], { sibling: 'Black-UK' }).draft, true); count++;
console.log(count + ' lokale Evidenz-/Grenzfallprüfungen bestanden; keine externen Aufrufe.');

