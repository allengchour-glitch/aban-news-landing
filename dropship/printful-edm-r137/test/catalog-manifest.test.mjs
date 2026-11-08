import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { isDeepStrictEqual } from 'node:util';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const manifestPath = resolve(root, 'data/catalog-manifest.json');
const ownershipPath = resolve(root, 'evidence/printful-variant-ownership-all-20261108.json');
const printfulCatalogPath = resolve(root, 'evidence/printful-relevant-products-20261108.json');
const fullShopifyPath = resolve(root, 'evidence/shopify-selfdesign-products-full-20261108.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const ownership = JSON.parse(await readFile(ownershipPath, 'utf8'));
const printfulCatalog = JSON.parse(await readFile(printfulCatalogPath, 'utf8'));

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

test('catalog is reproducible and covers the exact 41-product/398-variant scope', async () => {
  execFileSync('python3', [resolve(root, 'tools/build-catalog-manifest.py'), '--check'], { stdio: 'pipe' });
  assert.equal(manifest.schema, 1);
  assert.equal(manifest.schemaId, 'luxestyle-printful-edm-audit-catalog/1');
  assert.equal(manifest.policy.mode, 'fail_closed');
  assert.equal(manifest.policy.auditCatalogOnly, true);
  assert.equal(manifest.policy.runtimeAllowlist, false);
  assert.equal(manifest.products.length, 41);
  assert.equal(manifest.coverage.expectedVariants, 398);
  assert.equal(manifest.coverage.listedVariantSlots, 398);
  assert.deepEqual(
    [manifest.coverage.activeProducts, manifest.coverage.activeVariants, manifest.coverage.draftProducts, manifest.coverage.draftVariants],
    [19, 245, 22, 153],
  );
  assert.deepEqual(
    [manifest.coverage.activePrintfulProducts, manifest.coverage.activePrintfulVariants, manifest.coverage.draftPrintfulProducts, manifest.coverage.draftPrintfulVariants],
    [18, 244, 21, 133],
  );

  const fullHash = sha256(await readFile(fullShopifyPath));
  const ownershipHash = sha256(await readFile(ownershipPath));
  assert.equal(manifest.scope.shopifyFullSnapshotSha256, fullHash);
  assert.equal(manifest.scope.printfulVariantOwnershipSha256, ownershipHash);
});

test('Shopify identities are positive, complete and globally unique', () => {
  const productIds = manifest.products.map(product => product.shopifyProductId);
  const variants = manifest.products.flatMap(product => product.variants);
  const variantIds = variants.map(variant => variant.shopifyVariantId);
  assert.equal(new Set(productIds).size, 41);
  assert.equal(variants.length, 398);
  assert.equal(new Set(variantIds).size, 398);
  assert.ok(productIds.every(Number.isSafeInteger));
  assert.ok(variantIds.every(Number.isSafeInteger));
  assert.ok(productIds.every(id => id > 0));
  assert.ok(variantIds.every(id => id > 0));
  assert.ok(manifest.products.every(product => product.handle.normalize('NFC') === product.handle));
  assert.ok(manifest.products.some(product => product.handle === 'transparente-iphone®-hulle-selbst-gestalten'));
  assert.ok(manifest.products.some(product => product.handle === 'hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten'));
  for (const product of manifest.products) {
    assert.equal(product.expectedVariantCount, product.variants.length);
    assert.match(product.shopifyProductGid, /^gid:\/\/shopify\/Product\/[1-9][0-9]*$/);
    for (const variant of product.variants) {
      assert.match(variant.shopifyVariantGid, /^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]*$/);
    }
  }
});

test('every claimed Printful variant belongs to its claimed current model', () => {
  const owned = new Map(ownership.products.map(product => [
    product.printfulProductId,
    new Set(product.variants.map(variant => variant.printfulVariantId)),
  ]));
  const printfulProducts = manifest.products.filter(product => product.provider === 'printful');
  const exactVariants = printfulProducts.flatMap(product => product.variants);
  assert.equal(printfulProducts.length, 39);
  assert.equal(exactVariants.length, 377);
  for (const variant of exactVariants) {
    assert.ok(Number.isSafeInteger(variant.printfulProductId) && variant.printfulProductId > 0);
    assert.ok(Number.isSafeInteger(variant.printfulVariantId) && variant.printfulVariantId > 0);
    assert.equal(owned.get(variant.printfulProductId)?.has(variant.printfulVariantId), true);
    assert.ok(typeof variant.technique === 'string' && variant.technique.length > 0);
    assert.ok(variant.knownPlacements.length > 0);
    assert.equal(variant.mappingStatus, 'exact');
  }
  assert.equal(manifest.coverage.exactShopifyPrintfulVariantPairs, 377);

  const ownershipIds = ownership.products.flatMap(product => product.variants.map(variant => variant.printfulVariantId));
  assert.equal(ownershipIds.length, 2257);
  assert.equal(new Set(ownershipIds).size, 2257);

  const byPrintfulVariant = new Map();
  for (const variant of exactVariants) {
    const rows = byPrintfulVariant.get(variant.printfulVariantId) || [];
    rows.push(variant);
    byPrintfulVariant.set(variant.printfulVariantId, rows);
    assert.equal(Number(variant.sku.split('_').at(-1)), variant.printfulVariantId);
  }
  const reused = [...byPrintfulVariant.values()].filter(rows => rows.length > 1);
  assert.equal(reused.length, 23);
  assert.ok(reused.every(rows => new Set(rows.map(row => row.printfulProductId)).size === 1));
  assert.ok(reused.every(rows => new Set(rows.map(row => row.shopifyVariantId)).size === rows.length));
});

test('technique and known placements come from the current Printful model evidence', () => {
  const current = new Map(printfulCatalog.products.map(product => [product.printfulProductId, product]));
  for (const product of manifest.products.filter(item => item.provider === 'printful')) {
    for (const model of product.models) {
      const evidence = current.get(model.printfulProductId);
      const defaults = evidence.techniques.filter(technique => technique.is_default === true).map(technique => technique.key);
      const placements = evidence.files.filter(file => file.type !== 'mockup').map(file => String(file.id));
      assert.equal(defaults.length, 1);
      assert.equal(model.defaultTechnique, defaults[0]);
      assert.ok(isDeepStrictEqual(model.knownPlacements, placements));
    }
    for (const variant of product.variants) {
      const evidence = current.get(variant.printfulProductId);
      const defaults = evidence.techniques.filter(technique => technique.is_default === true).map(technique => technique.key);
      const placements = evidence.files.filter(file => file.type !== 'mockup').map(file => String(file.id));
      assert.equal(variant.technique, defaults[0]);
      assert.ok(isDeepStrictEqual(variant.knownPlacements, placements));
    }
  }
});

test('DRAFT, unknown and non-Printful products remain fail closed', () => {
  assert.ok(manifest.products.every(product => product.edmEligible === false && product.eligible === false));
  assert.ok(manifest.products.flatMap(product => product.variants).every(variant => variant.edmEligible === false && variant.eligible === false));
  for (const product of manifest.products.filter(product => product.shopifyStatus === 'DRAFT')) {
    assert.equal(product.mockupEligible, false);
    assert.ok(product.blockers.includes('SHOPIFY_DRAFT'));
  }

  const transfer = manifest.products.find(product => product.handle === 'buegeltransfer-selbst-gestalten');
  assert.equal(transfer.provider, 'mister-dtf');
  assert.equal(transfer.mappingStatus, 'non_printful');
  assert.ok(transfer.blockers.includes('NON_PRINTFUL_FULFILLMENT'));
  assert.equal(transfer.variants[0].printfulProductId, null);

  const jersey = manifest.products.find(product => product.handle === 'wm-trikot-selbst-gestalten');
  assert.equal(jersey.provider, 'unknown');
  assert.equal(jersey.variants.length, 20);
  assert.equal(jersey.exactPairedVariantCount, 0);
  assert.ok(jersey.variants.every(variant => variant.printfulProductId === null && variant.printfulVariantId === null));
});

test('documented handle exceptions resolve exactly while mockup relay exposure stays narrow', () => {
  const clearCase = manifest.products.find(product => product.handle === 'transparente-iphone®-hulle-selbst-gestalten');
  assert.equal(clearCase.provider, 'printful');
  assert.equal(clearCase.printfulProductId, 181);
  assert.equal(clearCase.exactPairedVariantCount, 31);
  assert.deepEqual(clearCase.printfulProductIds, [181]);

  const colorMug = manifest.products.find(product => product.handle === 'keramik-tasse-farbige-innenseite-selbst-gestalten');
  assert.equal(colorMug.printfulProductId, 403);
  assert.equal(colorMug.exactPairedVariantCount, 11);
  assert.equal(colorMug.shopifyStatus, 'DRAFT');

  const eligibleProducts = manifest.products.filter(product => product.mockupEligible);
  const eligibleVariants = manifest.products.flatMap(product => product.variants).filter(variant => variant.mockupEligible);
  assert.deepEqual(eligibleProducts.map(product => product.handle), ['keramik-tasse-selbst-gestalten']);
  assert.deepEqual(eligibleVariants.map(variant => variant.printfulVariantId), [1320, 4830, 16586]);
  for (const variant of eligibleVariants) {
    assert.ok(variant.placements.length > 0);
    assert.ok(variant.placements.every(placement => placement.width > 0 && placement.height > 0 && placement.dpi > 0));
  }
});
