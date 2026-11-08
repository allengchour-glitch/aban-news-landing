import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ERWARTETER_BLOCK, MARKER, rolloutBlock, patchThemeLayout } from './theme_patch.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const allowlist = JSON.parse(readFileSync(resolve(hier, 'allowlist.json'), 'utf8'));
const basis = `<!doctype html>\n<head>\n${ERWARTETER_BLOCK}\n</head>`;
function caseSegment(text, handle) {
  const start = text.indexOf(`{%- when '${handle}' -%}`);
  assert.ok(start >= 0, `${handle}: Case fehlt`);
  const next = text.indexOf('{%- when ', start + 1);
  const endcase = text.indexOf('{%- endcase -%}', start + 1);
  return text.slice(start, next >= 0 && next < endcase ? next : endcase);
}
const patched = patchThemeLayout(basis, allowlist);

assert.notEqual(patched, basis, 'der bekannte Basisblock muss ersetzt werden');
assert.equal(patched.split(MARKER).length - 1, 1, 'stabiler Marker genau einmal');
assert.equal(patched.split("'lspod-designer-v6-6.3.0.js' | asset_url").length - 1, 1, 'v6.3 genau einmal');
assert.equal(patched.split("'lspod-designer-v5-safe.js' | asset_url").length - 1, 1, 'v5 bleibt genau einmal als Fallback');
assert.match(patched, /case product\.handle/);
assert.match(patched, /if request\.page_type == 'product'/);
assert.doesNotMatch(patched, /if request\.page_type == 'product' and product\.description contains/);
assert.match(patched, /if lspod_v63_karte != blank/);
assert.match(patched, /window\.__lspodDesignerLoaded = true/);
assert.match(patched, /knoten\.length !== 1/);
assert.match(patched, /__lspodV63Blockieren\('container-count-'/);
assert.match(patched, /editor-nicht-initialisiert/);
assert.match(patched, /button:not\(\[type\]\)/);
assert.match(patched, /classList\.remove\('lspod-designer'\)/);
assert.match(patched, /classList\.add\('lspod-designer-v6'\)/);
assert.match(patched, /setAttribute\('data-karte-pflicht', '1'\)/);
assert.match(patched, /setAttribute\('data-karte-url'/);
assert.match(patched, /removeAttribute\('data-vorschau-url'\)/);
assert.match(patched, /if lspod_v63_vorschau != blank/);
assert.match(patched, /setAttribute\('data-vorschau-url'/);
assert.ok(patched.indexOf("removeAttribute('data-vorschau-url')") < patched.indexOf("setAttribute('data-vorschau-url',"), 'alte Vorschau wird vor einer belegten Vorschau entfernt');
for (const product of allowlist.products) {
  assert.equal(patched.split(`when '${product.handle}'`).length - 1, 1, `${product.handle}: Handle genau einmal`);
  assert.equal(patched.split(`= '${product.asset}'`).length - 1, 1, `${product.handle}: Asset genau einmal`);
  if (product.previewAsset) assert.equal(patched.split(`= '${product.previewAsset}'`).length - 1, 1, `${product.handle}: Vorschau-Asset genau einmal`);
}
assert.equal((patched.match(/assign lspod_v63_vorschau = 'lspod-[^']+\.json'/g) || []).length,
  allowlist.products.filter((product) => product.previewAsset).length, 'nur belegte Vorschau-Assets werden zugeordnet');
assert.equal(allowlist.products.filter((product) => product.rolloutStatus === 'ready-preview').length, 9, 'neun final belegte Produktvorschauen');
assert.equal(allowlist.products.filter((product) => product.rolloutStatus === 'ready-binding').length, 7, 'sieben Karten-only-Produkte');
assert.equal(allowlist.products.filter((product) => product.rolloutStatus === 'blocked').length, 2, 'zwei fail-closed Blocker-Mappings');
for (const product of allowlist.products.filter((entry) => entry.rolloutStatus !== 'ready-preview')) {
  assert.doesNotMatch(caseSegment(patched, product.handle), /lspod_v63_vorschau/, `${product.handle}: ohne belegte Vorschau keine Projektion`);
}

assert.equal(patchThemeLayout(patched, allowlist), patched, 'vollstaendiger Patch ist idempotent');
assert.throws(() => patchThemeLayout('<head></head>', allowlist), /V63_THEME_BASE_MISMATCH/);
assert.throws(() => patchThemeLayout(`${basis}\n${ERWARTETER_BLOCK}`, allowlist), /V63_THEME_BASE_MISMATCH/);
assert.throws(() => patchThemeLayout(patched.replace("'lspod-designer-v6-6.3.0.js'", "'kaputt.js'"), allowlist), /V63_PATCH_AMBIGUOUS/);
assert.throws(() => patchThemeLayout(`${patched}\n${MARKER}`, allowlist), /V63_PATCH_AMBIGUOUS/);

const invalid = structuredClone(allowlist);
invalid.products[0].handle = "kaputt'handle";
assert.throws(() => rolloutBlock(invalid), /V63_ALLOWLIST_INVALID/);
for (const badHandle of ['kaputt handle', 'kaputt/handle', 'kaputt{{handle}}', '<script>', '-kaputt']) {
  const bad = structuredClone(allowlist);
  bad.products[0].handle = badHandle;
  assert.throws(() => rolloutBlock(bad), /V63_ALLOWLIST_INVALID/, `${badHandle}: Injection-/Pfadzeichen muessen blockieren`);
}
const unicodeHandles = {
  schema: 1,
  products: [
    { handle: 'hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten', asset: 'hardcase.json', status: 'ACTIVE' },
    { handle: 'transparente-iphone®-hulle-selbst-gestalten', asset: 'transparent.json', status: 'ACTIVE' },
  ],
};
const unicodeBlock = rolloutBlock(unicodeHandles);
assert.match(unicodeBlock, /when 'hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten'/);
assert.match(unicodeBlock, /when 'transparente-iphone®-hulle-selbst-gestalten'/);
const draft = structuredClone(allowlist);
draft.products[0].status = 'DRAFT';
assert.throws(() => patchThemeLayout(basis, draft), /V63_ALLOWLIST_INVALID/);
const duplicate = structuredClone(allowlist);
duplicate.products[1].asset = duplicate.products[0].asset;
assert.throws(() => patchThemeLayout(basis, duplicate), /V63_ALLOWLIST_INVALID/);
const duplicatePreview = structuredClone(allowlist);
duplicatePreview.products[0].previewAsset = duplicatePreview.products[1].asset;
assert.throws(() => patchThemeLayout(basis, duplicatePreview), /V63_ALLOWLIST_INVALID/);
const invalidPreview = structuredClone(allowlist);
invalidPreview.products[0].previewAsset = "kaputt'vorschau.json";
assert.throws(() => patchThemeLayout(basis, invalidPreview), /V63_ALLOWLIST_INVALID/);
const empty = { schema: 1, products: [] };
assert.throws(() => patchThemeLayout(basis, empty), /V63_ALLOWLIST_INVALID/);

const synthetic18 = {
  schema: 1,
  products: [
    ...Array.from({ length: 9 }, (_, i) => ({
      handle: `vorschau-produkt-${i + 1}`,
      asset: `lspod-karte-vorschau-produkt-${i + 1}.json`,
      previewAsset: `lspod-vorschau-produkt-${i + 1}.json`,
      rolloutStatus: 'READY',
      status: 'ACTIVE',
    })),
    ...Array.from({ length: 7 }, (_, i) => ({
      handle: `karten-produkt-${i + 1}`,
      asset: `lspod-karte-ohne-vorschau-produkt-${i + 1}.json`,
      previewAsset: null,
      rolloutStatus: 'READY',
      status: 'ACTIVE',
    })),
    {
      handle: 'dad-cap-selbst-gestalten',
      asset: 'lspod-blockiert-dad-cap.json',
      previewAsset: null,
      rolloutStatus: 'BLOCKED',
      status: 'ACTIVE',
    },
    {
      handle: 'magnet-zum-selbstgestalten',
      asset: 'lspod-blockiert-magnet.json',
      previewAsset: null,
      rolloutStatus: 'BLOCKED',
      status: 'ACTIVE',
    },
  ],
};
const block18 = rolloutBlock(synthetic18);
assert.equal(block18.split('{%- when ').length - 1, 18, '18 Produkte werden exakt abgebildet');
assert.equal(block18.split("setAttribute('data-karte-pflicht', '1')").length - 1, 1, 'Kartenpflicht wird einmal fuer jeden erlaubten Seitenaufruf gesetzt');
assert.equal(block18.split("'lspod-designer-v6-6.3.0.js' | asset_url").length - 1, 1, 'ein gemeinsamer v6-Loader');
assert.equal((block18.match(/assign lspod_v63_vorschau = 'lspod-[^']+\.json'/g) || []).length, 9, 'neun Produkte erhalten eine belegte Produktvorschau');
for (const product of synthetic18.products.filter((entry) => entry.rolloutStatus === 'READY' && !entry.previewAsset)) {
  const segment = caseSegment(block18, product.handle);
  assert.doesNotMatch(segment, /lspod_v63_vorschau/, `${product.handle}: Karten-only darf keine Produktprojektion erhalten`);
}
for (const product of synthetic18.products.filter((entry) => entry.rolloutStatus === 'BLOCKED')) {
  const segment = caseSegment(block18, product.handle);
  assert.match(segment, new RegExp(product.asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${product.handle}: Blocker-Karte bleibt zwingend zugeordnet`);
  assert.doesNotMatch(segment, /lspod_v63_vorschau/, `${product.handle}: blockiert ohne Produktprojektion`);
}
const patched18 = patchThemeLayout(basis, synthetic18);
assert.equal(patched18.split('{%- when ').length - 1, 18, 'vollstaendige Theme-Transformation behaelt alle 18 Zuordnungen');
assert.equal(patchThemeLayout(patched18, synthetic18), patched18, '18-Produkte-Patch ist idempotent');

function containerBlockerAusfuehren(containerCount) {
  const firstScript = rolloutBlock(synthetic18).match(/<script>\s*([\s\S]*?)<\/script>/)[1]
    .replace(/\{\{ lspod_v63_karte \| asset_url \| json \}\}/g, '"/karte.json"')
    .replace(/\{\{ product\.title \| json \}\}/g, '"Testprodukt"')
    .replace(/\{\{ lspod_v63_vorschau \| asset_url \| json \}\}/g, '"/vorschau.json"')
    .replace(/\{%[-]?[\s\S]*?[-]?%\}/g, '');
  const buttons = [{ disabled: false, setAttribute() {} }, { disabled: false, setAttribute() {} }];
  const form = {
    tagName: 'FORM', parentNode: null, attrs: { action: '/cart/add' },
    getAttribute(name) { return this.attrs[name] || null; }, setAttribute(name, value) { this.attrs[name] = value; },
    querySelectorAll() { return buttons; },
  };
  const blockerHost = { firstChild: null, insertBefore(node) { this.blocker = node; } };
  const document = {
    documentElement: { attrs: {}, setAttribute(name, value) { this.attrs[name] = value; } }, body: blockerHost,
    querySelectorAll(selector) {
      if (selector === '.lspod-designer') return Array.from({ length: containerCount }, () => ({}));
      if (selector === 'form[action]') return [form];
      return [];
    },
    querySelector(selector) { return selector === 'main' ? blockerHost : null; },
    getElementById() { return null; }, addEventListener() {},
    createElement() { return { style: {}, setAttribute() {} }; },
  };
  const window = { __lspodDesignerLoaded: false };
  vm.runInContext(firstScript, vm.createContext({ window, document, console }));
  return { document, form, buttons, blockerHost };
}
for (const count of [0, 2]) {
  const result = containerBlockerAusfuehren(count);
  assert.equal(result.document.documentElement.attrs['data-lspod-v63-error'], `container-count-${count}`, `${count} Container: Fehlerstatus`);
  assert.equal(result.form.attrs['data-lspod-v63-blockiert'], '1', `${count} Container: Warenkorb-Formular blockiert`);
  assert.ok(result.buttons.every((button) => button.disabled), `${count} Container: alle Kaufknöpfe blockiert`);
  assert.equal(result.blockerHost.blocker?.id, 'lspod-v63-blocker', `${count} Container: sichtbarer Blocker`);
}

console.log(`THEME_PATCH_OK products=${allowlist.products.length} synthetic_products=18 preview=9 card_only=7 blocked_maps=2 tests=76`);
