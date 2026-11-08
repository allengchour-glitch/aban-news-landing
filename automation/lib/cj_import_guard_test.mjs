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
  ['Leichte Strickjacke', '<p>Luxury lightweight cardigan mit wrinkle resistant finish and everyday wear.</p>'],
  ['Alltagstasche', '<p>Modern design mit durable material and easy care.</p>'],
  ['Sommerkleid', '<p>Beautiful fit mit soft fabric for daily comfort.</p>'],
  ['Handyhalterung', '<p>Designed for your car mit easy use and durable finish.</p>'],
  ['Kissenbezug', '<p>Premium material mit elegant style for your home.</p>'],
  ['Jacke', '<p>Exclusive jacket mit ultraflex texture und sophisticated appeal.</p>'],
  ['Tasche', '<p>Fashionable pouch mit ergonomic silhouette und exceptional craftsmanship.</p>'],
  ['Kleidungsstück', '<p>Chic garment mit flattering drape und timeless aesthetic.</p>'],
  ['Dekoration', '<p>Artisan decor mit sculptural texture und refined ambience.</p>'],
  ['Schuhe', '<p>Contemporary footwear mit cushioned footbed und elevated aesthetic.</p>'],
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
  assert.match(quelle, /uebersetzeCjFarbe/, `${rel}: sichtbare CJ-Farbwerte brauchen ein Deutsch-Gate`);
  assert.match(quelle, /COPY_(?:STATUS|AUTH|QUOTA)_UNKNOWN/, `${rel}: Copy-Providerfehler muessen UNKNOWN bleiben`);
  assert.match(quelle, /productSet[\s\S]*?versuche\s*:\s*1/, `${rel}: nicht idempotentes productSet darf nicht automatisch wiederholt werden`);
  assert.match(quelle, /pruefeCjProduktNachWrite/, `${rel}: Produktwrite braucht einen frischen Sicherheits-Readback`);
}

const lueckenQuelle = readFileSync(new URL('../cj_gaps_import.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(lueckenQuelle, /titles\[i\]\s*\|\|\s*p\.nameEn/, 'kein Rueckfall auf englischen Originaltitel');
assert.doesNotMatch(lueckenQuelle, /return\s+names\s*;/, 'Uebersetzungsfehler darf Originaltitel nicht zurueckgeben');
assert.doesNotMatch(lueckenQuelle, /collectionCreate/, 'Lueckenimport darf vor Produktfreigabe keine Collection schreiben');
assert.match(lueckenQuelle, /shopifyProduktVorhanden\s*\(/,
  'Lueckenimport braucht vor jedem Write eine Shopify-Dubletten-Gegenprobe');
assert.match(lueckenQuelle, /cj-pid-/,
  'Lueckenimport braucht einen stabilen CJ-Quellschluessel fuer Retry-Dedupe');
assert.match(lueckenQuelle, /fs\.fsyncSync\s*\(/,
  'lokale Ledger-Checkpoints muessen vor dem naechsten Produkt dauerhaft geschrieben werden');

for (const rel of ['../../dropship/cj_full_create.mjs', '../../dropship/cj_variants_new.mjs']) {
  const quelle = readFileSync(new URL(rel, import.meta.url), 'utf8');
  assert.match(quelle, /pruefeCjImportText\s*\(/, `${rel}: Altwerkzeug braucht Sprachwaechter`);
  assert.match(quelle, /cjImportSicherheitsdaten\s*\(/, `${rel}: Altwerkzeug braucht DRAFT-/Sperrtag-Waechter`);
  assert.match(quelle, /uebersetzeCjFarbe/, `${rel}: Altwerkzeug darf englische Farbwerte nicht durchreichen`);
  assert.doesNotMatch(quelle, /status\s*:\s*['"]ACTIVE['"]/, `${rel}: Altwerkzeug darf kein ACTIVE-Payload bauen`);
}

const dauerQuelle = readFileSync(new URL('../cj_perpetual.mjs', import.meta.url), 'utf8');
assert.match(dauerQuelle, /CJ_IMPORT_PERPETUAL_APPROVED/, 'Dauerlauf braucht eigenen Endlosschalter');
assert.match(dauerQuelle, /cjImportWriteFreigegeben/, 'Dauerlauf braucht doppeltes Write-Gate');
assert.doesNotMatch(dauerQuelle, /async function waitForPoints\(\)\s*\{\s*while\s*\(true\)/,
  'Punkteprobe darf nicht unbegrenzt auf einen Reset warten');
assert.match(dauerQuelle, /CJ_CHILD_FAILED/, 'fehlgeschlagene Kindprozesse muessen den Dauerlauf abbrechen');
assert.match(dauerQuelle, /Punkteprobe ohne vollstaendige pointsInfo/,
  'fehlende CJ-Punktefelder muessen UNKNOWN bleiben');

const autopilotQuelle = readFileSync(new URL('../../dropship/cj_autopilot.mjs', import.meta.url), 'utf8');
assert.match(autopilotQuelle, /grind_dubletten\.mjs/, 'Autopilot muss den kanonischen Dublettenhelfer nutzen');
assert.match(autopilotQuelle, /sku:\$\{JSON\.stringify\(k\.pid\)\}/,
  'Dublettenabfrage muss auch die blanke PID-SKU pruefen');
assert.match(autopilotQuelle, /CJ-\$\{k\.pid\}/,
  'Dublettenabfrage muss auch die CJ-PID-SKU pruefen');
assert.match(autopilotQuelle, /sku:\$\{k\.productSku\}\*/, 'productSku braucht die belegte Praefixsuche');
assert.match(autopilotQuelle, /pageInfo\{hasNextPage\}/, 'begrenzte Dublettenabfrage muss Unvollstaendigkeit erkennen');
assert.doesNotMatch(autopilotQuelle, /variantSkus\.slice\(0,\s*4\)/,
  'Dublettenabfrage darf nicht nur die ersten vier Varianten pruefen');
assert.doesNotMatch(autopilotQuelle, /productSet[\s\S]{0,300}\.catch\s*\(/,
  'Shopify-Transportfehler beim Produktwrite duerfen nicht geschluckt werden');
assert.doesNotMatch(autopilotQuelle, /catch\s*\{\s*continue;\s*\}/, 'CJ-Fehler duerfen nicht als leere Kandidaten weiterlaufen');

const gapsWorkflow = readFileSync(new URL('../../.github/workflows/cj-gaps.yml', import.meta.url), 'utf8');
assert.match(gapsWorkflow, /if:\s*\$\{\{\s*always\(\)/,
  'Ledger-Checkpoint muss auch nach einem spaeteren Importfehler versucht werden');

console.log('cj_import_guard_test: OK');
