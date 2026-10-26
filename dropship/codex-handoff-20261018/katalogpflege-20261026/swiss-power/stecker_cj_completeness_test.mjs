// Ergänzende Vertrags-/Grenzfallprüfungen mit ausdrücklich synthetischen Belegen.
// Keine Produktbewertung, keine Netzaufrufe, keine Shop- oder Caller-Ausführung.
import assert from 'node:assert/strict';
import { stromversorgungsReview } from './stecker_cj.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const ids = { shopifyVariantID: 'gid://shopify/ProductVariant/101', supplierVariantID: 'SYNTHETIC-VID-101' };
const ref = { ...ids, source: 'fixture://synthetic-not-product-evidence', capturedAt: '2026-10-26T12:00:00Z', sha256: 'b'.repeat(64) };
const base = {
  schemaVersion: 1, ...ids, configuration: 'single', power: 'includedAdapter',
  suppliedPlug: 'Europlug', adapterSolution: 'none',
  evidence: Object.fromEntries(['identity', 'contents', 'plug', 'ratings', 'protection', 'conformity', 'deviceInput', 'adapterOutput'].map(role => [role, clone(ref)])),
  electrical: { input: 'AC', voltageV: { min: 100, max: 240 }, frequencyHz: { min: 50, max: 60 } },
  deviceInputMarking: 'SYNTHETIC 5 V DC, 2 A', adapterOutputMarking: 'SYNTHETIC 5 V DC, 2 A',
  checks: { plugRatingAndProtection: true, supplyConformityEvidence: true, outputMatchesDevice: true },
  reviewedBy: 'synthetic-reviewer', reviewedAt: '2026-10-26T12:01:00Z'
};
let count = 0;
const results = [];
function check(name, change, expected, scope) {
  const input = clone(base);
  change(input);
  const result = stromversorgungsReview(input);
  assert.equal(result.status, expected, name);
  assert.equal(Object.hasOwn(result, 'approved'), false, `${name}: keine approved-Freigabe`);
  if (scope) assert.equal(result.scope, scope, `${name}: begrenzter Scope`);
  results.push({ name, status: result.status });
  count++;
}

// Für jede beanspruchte Lieferrolle muss ein eigenes gebundenes Belegfeld vorliegen.
for (const role of Object.keys(base.evidence)) {
  check(`fehlender Pflichtbeleg: ${role}`, x => { delete x.evidence[role]; }, 'unknown');
}
for (const field of ['source', 'capturedAt', 'sha256']) {
  check(`fehlende Originalreferenz: ${field}`, x => { delete x.evidence.identity[field]; }, 'unknown');
}
check('unlesbares Archivdatum', x => { x.evidence.identity.capturedAt = 'kein Datum'; }, 'unknown');
check('fehlender Shopify-Variantenbezug', x => { delete x.shopifyVariantID; }, 'unknown');
check('Shopify-ID gehört zu einem Produkt, nicht einer Variante', x => { x.shopifyVariantID = 'gid://shopify/Product/101'; }, 'unknown');
for (const field of ['shopifyVariantID', 'supplierVariantID']) {
  check(`Beleg gehört zu anderer Variante: ${field}`, x => { x.evidence.plug[field] = 'ANOTHER-VARIANT'; }, 'needsReview');
}
check('EU/CE allein ersetzen auch eine fehlende Steckeraufnahme nicht', x => { x.sourceOptionLabel = 'EU CE'; delete x.evidence.plug; }, 'unknown');
check('unbekanntes Datenformat', x => { x.evidence = []; }, 'unknown');
check('unbekannte Lieferkonfiguration', x => { delete x.configuration; }, 'unknown');
check('Mischlieferung bleibt trotz vollständiger übriger Felder offen', x => { x.configuration = 'mixed'; }, 'needsReview');
check('EU-Label hebt belegte 60-Hz-only-Ausführung nicht auf', x => { x.sourceOptionLabel = 'EU'; x.electrical.frequencyHz = { min: 60, max: 60 }; }, 'reject');
check('110-V-Wert ohne Ratingsbeleg ist keine belegte Ablehnung', x => { x.electrical.voltageV = { min: 110, max: 120 }; delete x.evidence.ratings; }, 'unknown');
check('verkehrter Spannungsbereich bleibt unbelegt', x => { x.electrical.voltageV = { min: 240, max: 100 }; }, 'unknown');
check('DC-Angaben ersetzen keine AC-Netzeingangswerte', x => { x.electrical.input = 'DC'; }, 'unknown');
for (const label of ['US', 'UK']) {
  check(`belegter ${label}-Lieferfall ohne Lösung wird abgewiesen`, x => { x.sourceOptionLabel = label; x.suppliedPlug = 'foreign'; }, 'reject');
  check(`${label}-Label ohne exakten Steckerbeleg bleibt unbekannt`, x => { x.sourceOptionLabel = label; delete x.evidence.plug; }, 'unknown');
}
check('Reiseadapter bleibt fachlich offen', x => { x.suppliedPlug = 'foreign'; x.adapterSolution = 'travelAdapter'; }, 'needsReview');
check('nicht dokumentierte Adapterlösung', x => { delete x.adapterSolution; }, 'unknown');
for (const field of ['plugRatingAndProtection', 'supplyConformityEvidence', 'outputMatchesDevice']) {
  check(`manueller Abgleich fehlt: ${field}`, x => { delete x.checks[field]; }, 'unknown');
}
for (const field of ['deviceInputMarking', 'adapterOutputMarking', 'reviewedBy', 'reviewedAt']) {
  check(`Abschluss-/Typenschildangabe fehlt: ${field}`, x => { delete x[field]; }, 'unknown');
}
check('CH-Netzlieferung mit vollständig dokumentiertem Review bleibt nur evidenceComplete', x => { x.power = 'mains'; x.suppliedPlug = 'CH'; }, 'evidenceComplete', 'swiss-power-evidence');

const usbOnly = x => {
  x.power = 'usbOnly'; x.suppliedPlug = 'none'; x.adapterSolution = 'none';
  x.evidence = Object.fromEntries(['identity', 'contents', 'deviceInput', 'usbRequirements'].map(role => [role, clone(ref)]));
  delete x.electrical; delete x.adapterOutputMarking;
  x.checks = { usbRequirementsReviewed: true };
  x.usbConnector = 'SYNTHETIC USB-C';
  x.usbSourceRequirements = 'SYNTHETIC 5 V DC, mindestens 2 A; separate Stromquelle erforderlich, kein Netzteil enthalten';
};
check('USB ohne Netzteil hat nur Lieferumfang-/Stromquellen-Scope', usbOnly, 'evidenceComplete', 'usb-package-and-source-requirements-only');
for (const role of ['contents', 'deviceInput', 'usbRequirements']) {
  check(`USB-Pflichtbeleg fehlt: ${role}`, x => { usbOnly(x); delete x.evidence[role]; }, 'unknown');
}
check('USB-Anforderungen sind manuell ungeprüft', x => { usbOnly(x); delete x.checks.usbRequirementsReviewed; }, 'unknown');
check('USB-only widerspricht beigefügtem Netzstecker', x => { usbOnly(x); x.suppliedPlug = 'CH'; }, 'needsReview');
check('USB-only widerspricht dokumentiertem Adapter', x => { usbOnly(x); x.adapterSolution = 'fixedAdapter'; }, 'needsReview');

console.log(JSON.stringify({ syntheticOnly: true, externalCalls: false, assertions: count, results }, null, 2));
