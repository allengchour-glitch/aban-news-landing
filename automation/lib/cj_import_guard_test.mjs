import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CJ_IMPORT_SPERRTAG,
  CJ_IMPORT_STATUS,
  cjImportSicherheitsdaten,
  pruefeCjImportText,
  sichereCjImportTags,
} from './cj_import_guard.mjs';

const deutsch = {
  sourceTitle: 'Magnetic Car Phone Holder for Dashboard',
  title: 'Magnetische Handyhalterung fürs Auto',
  html: '<p>Die kompakte Halterung befestigt das Smartphone am Armaturenbrett.</p><ul><li>Verstellbare Halterung</li></ul>',
};

assert.equal(pruefeCjImportText(deutsch).status, 'OK');

for (const titel of [
  'Magnetic Car Phone Holder for Dashboard',
  'Magnetic-Car Phone Holder for Dashboard',
  'Elegant Halterneck Dress for Women',
]) {
  const result = pruefeCjImportText({ ...deutsch, sourceTitle: titel, title: titel });
  assert.equal(result.status, 'BLOCKED', `englischer Titel muss blockieren: ${titel}`);
}

assert.equal(pruefeCjImportText({ ...deutsch, title: '' }).status, 'BLOCKED');
assert.equal(pruefeCjImportText({ ...deutsch, sourceTitle: '' }).status, 'BLOCKED');
assert.equal(pruefeCjImportText({ ...deutsch, html: '' }).status, 'BLOCKED');
assert.equal(pruefeCjImportText({
  ...deutsch,
  html: '<p>This product is soft and comfortable for your home.</p>',
}).status, 'BLOCKED');

assert.deepEqual(
  sichereCjImportTags(['cj-real', 'adult-nicht-bewerben', 'CJ-REAL', '']),
  ['cj-real', 'adult-nicht-bewerben', CJ_IMPORT_SPERRTAG],
  'bestehende Sperrtags bleiben erhalten; Pflicht-Sperrtag kommt genau einmal dazu',
);

const sicherheit = cjImportSicherheitsdaten(['cj-real', 'dropship']);
assert.equal(sicherheit.status, CJ_IMPORT_STATUS);
assert.equal(sicherheit.status, 'DRAFT');
assert.equal(sicherheit.publikationsbereit, false);
assert.ok(sicherheit.tags.includes(CJ_IMPORT_SPERRTAG));
assert.ok(sicherheit.sperrTags.includes(CJ_IMPORT_SPERRTAG));
const mehrfachGesperrt = cjImportSicherheitsdaten(['cj-real', 'adult-nicht-bewerben']);
assert.ok(mehrfachGesperrt.tags.includes('adult-nicht-bewerben'));
assert.ok(mehrfachGesperrt.sperrTags.includes('adult-nicht-bewerben'));
assert.ok(mehrfachGesperrt.sperrTags.includes(CJ_IMPORT_SPERRTAG));

for (const rel of [
  '../cj_gaps_import.mjs',
  '../cj_category_fill.mjs',
  '../cj_trending_import.mjs',
  '../../dropship/cj_autopilot.mjs',
]) {
  const quelle = readFileSync(new URL(rel, import.meta.url), 'utf8');
  assert.match(quelle, /pruefeCjImportText\s*\(/, `${rel}: Sprachwaechter fehlt`);
  assert.match(quelle, /cjImportSicherheitsdaten\s*\(/, `${rel}: DRAFT-/Sperrtag-Waechter fehlt`);
  assert.doesNotMatch(quelle, /publishablePublish/, `${rel}: Importer darf nicht direkt publizieren`);
  assert.doesNotMatch(quelle, /status\s*:\s*['"]ACTIVE['"]/, `${rel}: Importer darf nicht ACTIVE anlegen`);
}

const lueckenQuelle = readFileSync(new URL('../cj_gaps_import.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(lueckenQuelle, /titles\[i\]\s*\|\|\s*p\.nameEn/, 'kein Rueckfall auf englischen Originaltitel');
assert.doesNotMatch(lueckenQuelle, /return\s+names\s*;/, 'Uebersetzungsfehler darf Originaltitel nicht zurueckgeben');

console.log('cj_import_guard_test: OK');
