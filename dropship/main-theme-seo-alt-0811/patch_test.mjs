import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  baueZiel,
  DATEIEN,
  MD5_NACH,
  MD5_VOR,
  META_ALT,
  META_NEU,
  md5,
  metaPatch,
  pruefeDateimenge,
  startseitenPatch,
} from './patch.mjs';

const hier = new URL('.', import.meta.url);
const lies = (name) => readFileSync(new URL(name, hier), 'utf8');
const metaVor = lies('sicherung/snippets__meta-tags.liquid.vor');
const homeVor = lies('sicherung/sections__luxe-edit-home.liquid.vor');
const homeZiel = lies('../startseite-wechsel-0411/theme/luxe-edit-home.liquid');
const planQuelle = lies('plan.mjs');
const workflow = lies('../../.github/workflows/luxestyle-main-theme-seo-alt.yml');

let n = 0;
function test(name, fn) {
  fn();
  n += 1;
  console.log(`ok ${String(n).padStart(2, '0')} ${name}`);
}

test('gesicherte Meta-Datei entspricht dem frisch gelesenen MAIN-Hash', () => assert.equal(md5(metaVor), MD5_VOR[DATEIEN.meta]));
test('gesicherte Startseiten-Datei entspricht dem frisch gelesenen MAIN-Hash', () => assert.equal(md5(homeVor), MD5_VOR[DATEIEN.startseite]));
test('gemergte Startseiten-Datei entspricht dem Ziel-Hash', () => assert.equal(md5(homeZiel), MD5_NACH[DATEIEN.startseite]));

const metaZiel = metaPatch(metaVor);
test('Meta-Patch hat den festgelegten Ziel-Hash', () => assert.equal(md5(metaZiel), MD5_NACH[DATEIEN.meta]));
test('Meta-Patch entfernt den alten zeitgebundenen Versandtext', () => assert.equal(metaZiel.includes(META_ALT), false));
test('Meta-Patch enthält den locale-aware Block genau einmal', () => assert.equal(metaZiel.split(META_NEU).length - 1, 1));
test('Meta-Patch setzt Französisch nur für fr', () => assert.match(metaZiel, /if request\.locale\.iso_code == 'fr'\n\s+assign og_description = 'Découvrez une sélection/));
test('Meta-Patch nutzt Deutsch als Rückfall', () => assert.match(metaZiel, /else\n\s+assign og_description = 'LuxeStyle aus Belp: Mode, Pflege, Technik und Wohnen\./));
test('Meta-Patch lässt Präfix und Suffix bytegleich', () => {
  const [vorPrefix, vorSuffix] = metaVor.split(META_ALT);
  const [nachPrefix, nachSuffix] = metaZiel.split(META_NEU);
  assert.equal(nachPrefix, vorPrefix);
  assert.equal(nachSuffix, vorSuffix);
});
test('Meta-Patch bricht ohne eindeutigen Anker ab', () => assert.throws(() => metaPatch('ohne Anker'), /0×/));
test('Meta-Patch bricht bei doppeltem Anker ab', () => assert.throws(() => metaPatch(`${META_ALT}\n${META_ALT}`), /2×/));

const homeNach = startseitenPatch(homeVor);
test('Startseiten-Patch ergibt bytegleich den gemergten Kandidaten', () => assert.equal(homeNach, homeZiel));
test('Startseiten-Patch hat den festgelegten Ziel-Hash', () => assert.equal(md5(homeNach), MD5_NACH[DATEIEN.startseite]));
test('Trends-Bild nennt den Produkttitel', () => assert.match(homeNach, /class="lx-trend-image"[^\n]+alt: lx_trend\.title/));
test('Schmuck- und Wohnbild nennt den Produkttitel', () => assert.match(homeNach, /class="lx-edit-product-image"[^\n]+alt: lx_edit_product\.title/));
test('Weiteres Produktbild nennt den Produkttitel', () => assert.match(homeNach, /class="lx-more-photo"[^\n]+alt: lx_more_product\.title/));
test('Startseiten-Patch bricht auf dem bereits gepatchten Ziel ab', () => assert.throws(() => startseitenPatch(homeZiel), /0×/));

test('baueZiel prüft API- und Ausgangshash für Meta', () => {
  const z = baueZiel(DATEIEN.meta, metaVor, MD5_VOR[DATEIEN.meta]);
  assert.equal(z.nachher, metaZiel);
  assert.equal(z.nachherMd5, MD5_NACH[DATEIEN.meta]);
});
test('baueZiel prüft API- und Ausgangshash für Startseite', () => {
  const z = baueZiel(DATEIEN.startseite, homeVor, MD5_VOR[DATEIEN.startseite]);
  assert.equal(z.nachher, homeZiel);
  assert.equal(z.nachherMd5, MD5_NACH[DATEIEN.startseite]);
});
test('baueZiel lehnt abweichende API-Prüfsumme ab', () => assert.throws(() => baueZiel(DATEIEN.meta, metaVor, '00000000000000000000000000000000'), /API-Prüfsumme/));
test('baueZiel lehnt fremde Dateien ab', () => assert.throws(() => baueZiel('layout/theme.liquid', 'x', ''), /Nicht erlaubte/));
test('Dateimenge muss genau beide erlaubten Dateien enthalten', () => {
  assert.doesNotThrow(() => pruefeDateimenge([{ filename: DATEIEN.startseite }, { filename: DATEIEN.meta }]));
  assert.throws(() => pruefeDateimenge([{ filename: DATEIEN.meta }]), /Dateimenge abweichend/);
  assert.throws(() => pruefeDateimenge([{ filename: DATEIEN.meta }, { filename: DATEIEN.meta }]), /Dateimenge abweichend/);
});

test('Offline-Plan bindet den belegten Shop und MAIN exakt', () => {
  assert.match(planQuelle, /au3j0y-hq\.myshopify\.com/);
  assert.match(planQuelle, /gid:\/\/shopify\/OnlineStoreTheme\/213013037447/);
  assert.match(planQuelle, /LuxeStyle – Schrift und Banner 02\.11\.2026/);
});
test('Offline-Plan enthält weder Netz noch Zugangsdaten oder Mutation', () => {
  assert.doesNotMatch(planQuelle, /\bfetch\b|https?:|shopifyGql|CLIENT_ID|CLIENT_SECRET|SHOPIFY_|\bmutation\b|themeFilesUpsert|themePublish|themeCreate|themeDelete|themeFilesDelete/);
  assert.match(planQuelle, /GEPLANT_NICHT_LIVE_GEPRUEFT_NICHT_GESCHRIEBEN/);
  assert.match(planQuelle, /keine Netzwerkabfrage, Mutation, Zugangsdaten oder Ausführungsroute/);
});
test('Plan-Artefakt hält das offene R144-Preview-Gate fest', () => {
  assert.match(planQuelle, /previewGate:[\s\S]+required: true,[\s\S]+satisfied: false/);
  assert.match(planQuelle, /unveröffentlichte Theme-Kopie/);
  assert.match(planQuelle, /DE- und FR-HTML/);
  assert.match(planQuelle, /Canonical und Titel/);
});
test('Workflow hat ausschliesslich den Pull-Request-Auslöser', () => {
  assert.match(workflow, /^\s+pull_request:/m);
  assert.doesNotMatch(workflow, /^\s+schedule:/m);
  assert.doesNotMatch(workflow, /^\s+push:/m);
  assert.doesNotMatch(workflow, /^\s+workflow_dispatch:/m);
});
test('Workflow führt nur Offline-Tests ohne Secrets oder Schreibweg aus', () => {
  assert.match(workflow, /node --check dropship\/main-theme-seo-alt-0811\/plan\.mjs/);
  assert.doesNotMatch(workflow, /\bsecrets\.|\bapply\b|\bLIVE\b|\bACK\b|confirmation|themeFilesUpsert|SHOPIFY_CLIENT|SHOPIFY_SHOP/);
  assert.match(workflow, /permissions:\n  contents: read/);
});

console.log(`\n${n} Prüfungen bestanden`);
