import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CJ_IMPORT_SPERRTAG,
  CJ_IMPORT_STATUS,
  cjImportWriteFreigegeben,
  cjImportSicherheitsdaten,
  pruefeCjShopIdentitaet,
  pruefeCjImportText,
  sichereCjImportTags,
} from './cj_import_guard.mjs';

const deutsch = {
  sourceTitle: 'Magnetic Car Phone Holder for Dashboard',
  title: 'Magnetische Handyhalterung fürs Auto',
  html: '<p>Die kompakte Halterung befestigt das Smartphone am Armaturenbrett.</p><ul><li>Verstellbare Halterung</li></ul>',
};

assert.equal(pruefeCjImportText(deutsch).status, 'OK');

for (const [title, html] of [
  ['Magnetische Handyhalterung fürs Auto', '<p>Elegant silhouette. Breathable linen fabric. Summer comfort. Versatile styling.</p>'],
  ['Elegant Summer Linen Blouse', deutsch.html],
  ['Sommerbluse', '<p>Soft breathable linen fabric for summer comfort.</p>'],
]) {
  assert.equal(pruefeCjImportText({ ...deutsch, title, html }).status, 'BLOCKED',
    `fluessige englische Ausgabe muss blockieren: ${title} / ${html}`);
}

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

assert.equal(cjImportWriteFreigegeben({ DRY_RUN: '0', CJ_IMPORT_WRITE_APPROVED: '1' }), true);
for (const env of [
  {},
  { DRY_RUN: '1', CJ_IMPORT_WRITE_APPROVED: '1' },
  { DRY_RUN: '0' },
  { DRY_RUN: '', CJ_IMPORT_WRITE_APPROVED: '1' },
  { DRY_RUN: 'false', CJ_IMPORT_WRITE_APPROVED: '1' },
]) assert.equal(cjImportWriteFreigegeben(env), false, `Write muss fail-closed bleiben: ${JSON.stringify(env)}`);

const echteIdentitaet = { name: 'LuxeStyle', myshopifyDomain: 'au3j0y-hq.myshopify.com', primaryDomain: { host: 'luxestyle.ch' }, currencyCode: 'CHF' };
assert.equal(pruefeCjShopIdentitaet(echteIdentitaet, 'au3j0y-hq.myshopify.com').status, 'OK');
for (const [shop, host] of [
  [{ ...echteIdentitaet, name: 'Andere Marke' }, 'au3j0y-hq.myshopify.com'],
  [{ ...echteIdentitaet, myshopifyDomain: 'fremd.myshopify.com' }, 'au3j0y-hq.myshopify.com'],
  [{ ...echteIdentitaet, primaryDomain: { host: 'fremd.ch' } }, 'au3j0y-hq.myshopify.com'],
  [{ ...echteIdentitaet, currencyCode: 'USD' }, 'au3j0y-hq.myshopify.com'],
  [echteIdentitaet, 'fremd.myshopify.com'],
  [{}, 'au3j0y-hq.myshopify.com'],
]) assert.equal(pruefeCjShopIdentitaet(shop, host).status, 'BLOCKED');

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
  assert.match(quelle, /CJ_IMPORT_WRITE_APPROVED|cjImportWriteFreigegeben/, `${rel}: doppeltes Write-Gate fehlt`);
  assert.match(quelle, /pruefeCjShopIdentitaet/, `${rel}: Live-Shop-Identitaetsgate fehlt`);
}

const lueckenQuelle = readFileSync(new URL('../cj_gaps_import.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(lueckenQuelle, /titles\[i\]\s*\|\|\s*p\.nameEn/, 'kein Rueckfall auf englischen Originaltitel');
assert.doesNotMatch(lueckenQuelle, /return\s+names\s*;/, 'Uebersetzungsfehler darf Originaltitel nicht zurueckgeben');
assert.doesNotMatch(lueckenQuelle, /collectionCreate/, 'Lueckenimport darf vor Produktfreigabe keine Collection schreiben');

for (const rel of ['../../dropship/cj_full_create.mjs', '../../dropship/cj_variants_new.mjs']) {
  const quelle = readFileSync(new URL(rel, import.meta.url), 'utf8');
  assert.match(quelle, /pruefeCjImportText\s*\(/, `${rel}: Altwerkzeug braucht Sprachwaechter`);
  assert.match(quelle, /cjImportSicherheitsdaten\s*\(/, `${rel}: Altwerkzeug braucht DRAFT-/Sperrtag-Waechter`);
  assert.doesNotMatch(quelle, /status\s*:\s*['"]ACTIVE['"]/, `${rel}: Altwerkzeug darf kein ACTIVE-Payload bauen`);
}

const dauerQuelle = readFileSync(new URL('../cj_perpetual.mjs', import.meta.url), 'utf8');
assert.match(dauerQuelle, /CJ_IMPORT_PERPETUAL_APPROVED/, 'Dauerlauf braucht eigenen Endlosschalter');
assert.match(dauerQuelle, /cjImportWriteFreigegeben/, 'Dauerlauf braucht doppeltes Write-Gate');

const autopilotQuelle = readFileSync(new URL('../../dropship/cj_autopilot.mjs', import.meta.url), 'utf8');
assert.match(autopilotQuelle, /grind_dubletten\.mjs/, 'Autopilot muss den kanonischen Dublettenhelfer nutzen');
assert.match(autopilotQuelle, /sku:\$\{k\.productSku\}\*/, 'productSku braucht die belegte Praefixsuche');
assert.match(autopilotQuelle, /pageInfo\{hasNextPage\}/, 'begrenzte Dublettenabfrage muss Unvollstaendigkeit erkennen');
assert.doesNotMatch(autopilotQuelle, /catch\s*\{\s*continue;\s*\}/, 'CJ-Fehler duerfen nicht als leere Kandidaten weiterlaufen');

console.log('cj_import_guard_test: OK');
