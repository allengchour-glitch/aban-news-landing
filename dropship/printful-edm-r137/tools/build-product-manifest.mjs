import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { compileProductManifest } from '../server/product-manifest.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const CATALOG_PATH = resolve(root, 'data/catalog-manifest.json');
const PRODUCT_GID = /^gid:\/\/shopify\/Product\/([1-9][0-9]{0,19})$/;
const VARIANT_GID = /^gid:\/\/shopify\/ProductVariant\/([1-9][0-9]{0,19})$/;
const TECHNIQUE = /^[A-Z][A-Z0-9_-]{0,60}$/;
const PLACEMENT = /^[a-z][a-z0-9_-]{0,63}$/;
const fail = code => { throw new Error(code); };
const positive = value => Number.isSafeInteger(value) && value > 0;
const hash = value => createHash('sha256').update(value).digest('hex');

function uniqueStrings(value, pattern) {
  return Array.isArray(value) && value.length > 0 && value.length <= 100 &&
    value.every(item => typeof item === 'string' && pattern.test(item)) &&
    new Set(value).size === value.length;
}

function verifyCatalog(catalog) {
  if (!catalog || catalog.schema !== 1 || catalog.schemaVersion !== 1 ||
      catalog.schemaId !== 'luxestyle-printful-edm-audit-catalog/1' ||
      catalog.shop?.domain !== 'luxestyle.ch' || catalog.policy?.mode !== 'fail_closed' ||
      catalog.policy?.auditCatalogOnly !== true || catalog.policy?.runtimeAllowlist !== false ||
      catalog.scope?.fullProductAndVariantSnapshotComplete !== true ||
      catalog.scope?.shopifyVariantGidsGloballyUnique !== true ||
      !Array.isArray(catalog.products) || !catalog.products.length ||
      catalog.coverage?.products !== catalog.products.length) {
    fail('INVALID_AUDIT_CATALOG');
  }
  const productIds = new Set();
  const handles = new Set();
  const shopifyVariantIds = new Set();
  const printfulVariantOwners = new Map();
  let activeProducts = 0;
  let draftProducts = 0;
  let activeVariants = 0;
  let draftVariants = 0;
  let activePrintfulProducts = 0;
  let activePrintfulVariants = 0;
  let exactPairs = 0;
  let unresolvedPairs = 0;

  for (const product of catalog.products) {
    const productGid = PRODUCT_GID.exec(product.shopifyProductGid || '');
    if (!productGid || Number(productGid[1]) !== product.shopifyProductId ||
        typeof product.shopifyHandle !== 'string' || !product.shopifyHandle ||
        !['ACTIVE', 'DRAFT'].includes(product.shopifyStatus) ||
        !['printful', 'mister-dtf', 'unknown'].includes(product.provider) ||
        !Array.isArray(product.variants) || product.expectedVariantCount !== product.variants.length ||
        product.listedVariantCount !== product.variants.length ||
        productIds.has(product.shopifyProductGid) || handles.has(product.shopifyHandle)) {
      fail('INVALID_AUDIT_PRODUCT');
    }
    productIds.add(product.shopifyProductGid);
    handles.add(product.shopifyHandle);
    if (product.shopifyStatus === 'ACTIVE') {
      activeProducts += 1;
      activeVariants += product.variants.length;
    } else {
      draftProducts += 1;
      draftVariants += product.variants.length;
    }
    const models = new Map((product.models || []).map(model => [model.printfulProductId, model]));
    if (models.size !== (product.models || []).length) fail('DUPLICATE_PRODUCT_MODEL');

    if (product.shopifyStatus === 'ACTIVE' && product.provider === 'printful') {
      if (product.mappingStatus !== 'complete' || product.variants.some(variant => variant.mappingStatus !== 'exact')) {
        fail('ACTIVE_PRINTFUL_MAPPING_INCOMPLETE');
      }
      activePrintfulProducts += 1;
      activePrintfulVariants += product.variants.length;
    }

    for (const variant of product.variants) {
      const variantGid = VARIANT_GID.exec(variant.shopifyVariantGid || '');
      if (!variantGid || Number(variantGid[1]) !== variant.shopifyVariantId ||
          shopifyVariantIds.has(variant.shopifyVariantGid) || typeof variant.sku !== 'string' || !variant.sku) {
        fail('INVALID_OR_DUPLICATE_SHOPIFY_VARIANT');
      }
      shopifyVariantIds.add(variant.shopifyVariantGid);
      if (variant.mappingStatus === 'exact') {
        const model = models.get(variant.printfulProductId);
        const defaults = model?.techniques?.filter(item => item.is_default === true) || [];
        if (!positive(variant.printfulProductId) || !positive(variant.printfulVariantId) ||
            !model || model.isDiscontinued !== false || defaults.length !== 1 ||
            defaults[0].key !== variant.technique || !TECHNIQUE.test(variant.technique || '') ||
            variant.sku.split('_').at(-1) !== String(variant.printfulVariantId) ||
            !uniqueStrings(model.knownPlacements, PLACEMENT) ||
            (product.shopifyStatus === 'ACTIVE' && product.provider === 'printful' &&
              !model.knownPlacements.includes('default')) ||
            !uniqueStrings(variant.knownPlacements, PLACEMENT) ||
            !isDeepStrictEqual(variant.knownPlacements, model.knownPlacements)) {
          fail('INVALID_EXACT_PRINTFUL_MAPPING');
        }
        const previousOwner = printfulVariantOwners.get(variant.printfulVariantId);
        if (previousOwner !== undefined && previousOwner !== variant.printfulProductId) {
          fail('PRINTFUL_VARIANT_OWNER_CONFLICT');
        }
        printfulVariantOwners.set(variant.printfulVariantId, variant.printfulProductId);
        exactPairs += 1;
      } else {
        if (positive(variant.printfulProductId) || positive(variant.printfulVariantId)) {
          fail('UNRESOLVED_VARIANT_HAS_PRINTFUL_ID');
        }
        unresolvedPairs += 1;
      }
    }
  }

  const coverage = catalog.coverage;
  if (productIds.size !== catalog.products.length || shopifyVariantIds.size !== coverage.expectedVariants ||
      coverage.listedVariantSlots !== shopifyVariantIds.size ||
      coverage.knownShopifyVariantIds !== shopifyVariantIds.size ||
      coverage.activeProducts !== activeProducts || coverage.draftProducts !== draftProducts ||
      coverage.activeVariants !== activeVariants || coverage.draftVariants !== draftVariants ||
      coverage.activePrintfulProducts !== activePrintfulProducts ||
      coverage.activePrintfulVariants !== activePrintfulVariants ||
      coverage.exactShopifyPrintfulVariantPairs !== exactPairs ||
      coverage.unresolvedVariantPairings !== unresolvedPairs) {
    fail('AUDIT_COVERAGE_MISMATCH');
  }
  return { activePrintfulProducts, activePrintfulVariants };
}

function runtimeRule(catalog, product, variant) {
  const model = product.models.find(item => item.printfulProductId === variant.printfulProductId);
  return {
    shopifyProductId: product.shopifyProductGid,
    shopifyHandle: product.shopifyHandle,
    shopifyVariantId: variant.shopifyVariantGid,
    printfulProductId: variant.printfulProductId,
    printfulVariantId: variant.printfulVariantId,
    technique: variant.technique,
    knownPlacements: [...model.knownPlacements],
    // The catalog proves `default` for the current default technique. Other
    // technique-specific surfaces remain closed until separately mapped.
    eligiblePlacements: ['default'],
    evidence: {
      verifiedAt: catalog.scope.printfulMeasuredAt,
      sources: [
        `data/catalog-manifest.json#${product.shopifyHandle}/${variant.shopifyVariantGid}`,
      ],
    },
  };
}

export function buildRuntimeArtifacts({ catalog, catalogSha256 }) {
  if (typeof catalogSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(catalogSha256)) {
    fail('INVALID_CATALOG_HASH');
  }
  const coverage = verifyCatalog(catalog);
  const mappings = [];
  const products = catalog.products.map(product => {
    let variants = [];
    const blockers = [];
    if (product.shopifyStatus === 'DRAFT') {
      blockers.push('SHOPIFY_DRAFT');
      if (product.provider === 'unknown' || product.mappingStatus !== 'complete') {
        blockers.push('PRINTFUL_VARIANT_MAPPING_UNVERIFIED');
      }
    } else if (product.provider === 'mister-dtf') {
      blockers.push('NON_PRINTFUL_FULFILLMENT');
    } else if (product.provider !== 'printful' || product.mappingStatus !== 'complete') {
      blockers.push('PRINTFUL_VARIANT_MAPPING_UNVERIFIED');
    } else {
      variants = product.variants.map(variant => runtimeRule(catalog, product, variant));
      mappings.push(...variants);
    }
    return {
      shopifyProductId: product.shopifyProductGid,
      shopifyHandle: product.shopifyHandle,
      shopifyStatus: product.shopifyStatus,
      variants: variants.map(({ shopifyProductId, shopifyHandle, ...variant }) => variant),
      blockers,
    };
  });

  if (mappings.length !== coverage.activePrintfulVariants ||
      new Set(mappings.map(item => item.shopifyVariantId)).size !== mappings.length ||
      products.filter(item => item.variants.length > 0).length !== coverage.activePrintfulProducts ||
      products.some(item => item.shopifyStatus === 'DRAFT' && item.variants.length > 0)) {
    fail('RUNTIME_COVERAGE_MISMATCH');
  }

  const manifest = {
    schemaVersion: 2,
    shop: 'luxestyle.ch',
    generatedAt: catalog.generatedAt,
    sources: { catalog: 'data/catalog-manifest.json', catalogSha256 },
    runtimeBlockers: [...catalog.globalBlockers],
    products,
  };
  const verifiedMappings = {
    schemaVersion: 2,
    generatedAt: catalog.generatedAt,
    source: { path: 'data/catalog-manifest.json', sha256: catalogSha256 },
    policy: {
      exactShopifyVariantGidRequired: true,
      defaultPlacementOnly: true,
      draftProductsBlocked: true,
      nonPrintfulProductsBlocked: true,
    },
    coverage: {
      activePrintfulProducts: coverage.activePrintfulProducts,
      mappedVariants: mappings.length,
    },
    mappings,
  };
  const compiled = compileProductManifest(manifest);
  if (compiled.productCount !== products.length || compiled.eligibleVariantCount !== mappings.length) {
    fail('COMPILED_RUNTIME_COVERAGE_MISMATCH');
  }
  return { manifest, verifiedMappings };
}

export function buildManifest(input) {
  return buildRuntimeArtifacts(input).manifest;
}

async function loadCatalog() {
  const raw = await readFile(CATALOG_PATH);
  return { catalog: JSON.parse(raw), catalogSha256: hash(raw) };
}

const serialise = value => `${JSON.stringify(value, null, 2)}\n`;

async function run() {
  const artifacts = buildRuntimeArtifacts(await loadCatalog());
  const check = process.argv.includes('--check');
  const kindArg = process.argv.indexOf('--kind');
  const kind = kindArg >= 0 ? process.argv[kindArg + 1] : 'manifest';
  if (!['manifest', 'mappings'].includes(kind)) fail('INVALID_OUTPUT_KIND');
  if (check) {
    const [manifest, mappings] = await Promise.all([
      readFile(resolve(root, 'data/product-manifest.json'), 'utf8').then(JSON.parse),
      readFile(resolve(root, 'data/verified-variant-mappings.json'), 'utf8').then(JSON.parse),
    ]);
    if (!isDeepStrictEqual(manifest, artifacts.manifest) ||
        !isDeepStrictEqual(mappings, artifacts.verifiedMappings)) {
      fail('RUNTIME_ARTIFACTS_OUT_OF_DATE');
    }
    process.stdout.write(`RUNTIME_MANIFEST_OK products=${manifest.products.length} variants=${mappings.mappings.length}\n`);
    return;
  }
  process.stdout.write(serialise(kind === 'manifest' ? artifacts.manifest : artifacts.verifiedMappings));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
