// SERVER ONLY. The public client receives only one resolved variant rule.
const SHOP = 'luxestyle.ch';
const TECHNIQUE = /^[A-Z][A-Z0-9_-]{0,60}$/;
const PLACEMENT = /^[a-z][a-z0-9_-]{0,63}$/;
const SHOPIFY_PRODUCT = /^gid:\/\/shopify\/Product\/[1-9][0-9]{0,19}$/;
const SHOPIFY_VARIANT = /^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]{0,19}$/;

const fail = code => { throw new Error(code); };
const validId = value => Number.isSafeInteger(value) && value > 0;
const copy = value => structuredClone(value);

function validHandle(value) {
  return typeof value === 'string' && value.length >= 3 && value.length <= 255 &&
    value === value.normalize('NFC') && !/[\u0000-\u0020\u007f/%\\?#]/u.test(value) &&
    !value.startsWith('.') && !value.endsWith('.');
}

function uniquePlacements(value) {
  return Array.isArray(value) && value.length > 0 && value.length <= 100 &&
    value.every(item => typeof item === 'string' && PLACEMENT.test(item)) &&
    new Set(value).size === value.length;
}

function validEvidence(value) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    typeof value.verifiedAt === 'string' && Number.isFinite(Date.parse(value.verifiedAt)) &&
    Array.isArray(value.sources) && value.sources.length > 0 && value.sources.length <= 20 &&
    value.sources.every(source => typeof source === 'string' && source.length > 3 && source.length <= 500);
}

function normaliseVariant(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
      !SHOPIFY_VARIANT.test(entry.shopifyVariantId || '') ||
      !validId(entry.printfulProductId) || !validId(entry.printfulVariantId) ||
      !TECHNIQUE.test(entry.technique || '') || !uniquePlacements(entry.knownPlacements) ||
      !uniquePlacements(entry.eligiblePlacements) || !validEvidence(entry.evidence)) {
    fail('INVALID_PRODUCT_MANIFEST');
  }
  const known = new Set(entry.knownPlacements);
  if (entry.eligiblePlacements.some(item => !known.has(item))) fail('INVALID_PRODUCT_MANIFEST');
  return Object.freeze({
    shopifyVariantId: entry.shopifyVariantId,
    printfulProductId: entry.printfulProductId,
    printfulVariantId: entry.printfulVariantId,
    technique: entry.technique,
    knownPlacements: Object.freeze([...entry.knownPlacements]),
    eligiblePlacements: Object.freeze([...entry.eligiblePlacements]),
    disabledPlacements: Object.freeze(entry.knownPlacements.filter(item => !entry.eligiblePlacements.includes(item))),
    evidence: Object.freeze({ verifiedAt: entry.evidence.verifiedAt, sources: Object.freeze([...entry.evidence.sources]) }),
  });
}

function normaliseProduct(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
      !SHOPIFY_PRODUCT.test(entry.shopifyProductId || '') || !validHandle(entry.shopifyHandle) ||
      !['ACTIVE', 'DRAFT'].includes(entry.shopifyStatus) || !Array.isArray(entry.variants) ||
      !Array.isArray(entry.blockers) || entry.blockers.some(value => typeof value !== 'string' || !value)) {
    fail('INVALID_PRODUCT_MANIFEST');
  }
  const variants = entry.variants.map(normaliseVariant);
  if (new Set(variants.map(item => item.shopifyVariantId)).size !== variants.length) fail('DUPLICATE_VARIANT_RULE');
  if (entry.shopifyStatus !== 'ACTIVE' && variants.length) fail('DRAFT_PRODUCT_CANNOT_BE_ELIGIBLE');
  if (!variants.length && !entry.blockers.length) fail('BLOCKED_PRODUCT_NEEDS_REASON');
  return Object.freeze({
    shopifyProductId: entry.shopifyProductId,
    shopifyHandle: entry.shopifyHandle,
    shopifyStatus: entry.shopifyStatus,
    variants: Object.freeze(variants),
    blockers: Object.freeze([...entry.blockers]),
  });
}

function key(handle, variantId) { return `${handle}\u0000${variantId}`; }

/**
 * Every catalogued Shopify product is represented, including blocked and draft
 * products. resolve() only exposes an exact ACTIVE handle + Shopify variant
 * mapping. Multi-model products therefore cannot fall back handle-wide.
 */
export function compileProductManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest) ||
      manifest.schemaVersion !== 2 || manifest.shop !== SHOP ||
      !Array.isArray(manifest.products) || !manifest.products.length || manifest.products.length > 1000) {
    fail('INVALID_PRODUCT_MANIFEST');
  }
  const products = manifest.products.map(normaliseProduct);
  if (new Set(products.map(item => item.shopifyProductId)).size !== products.length ||
      new Set(products.map(item => item.shopifyHandle)).size !== products.length) fail('DUPLICATE_PRODUCT_RULE');
  const shopifyVariantIds = products.flatMap(product =>
    product.variants.map(variant => variant.shopifyVariantId));
  if (new Set(shopifyVariantIds).size !== shopifyVariantIds.length) fail('DUPLICATE_VARIANT_RULE');

  const byVariant = new Map();
  for (const product of products) {
    if (product.shopifyStatus !== 'ACTIVE') continue;
    for (const variant of product.variants) {
      const rule = Object.freeze({
        shopifyProductId: product.shopifyProductId,
        shopifyHandle: product.shopifyHandle,
        shopifyVariantId: variant.shopifyVariantId,
        printfulProductId: variant.printfulProductId,
        printfulVariantId: variant.printfulVariantId,
        technique: variant.technique,
        eligiblePlacements: variant.eligiblePlacements,
        disabledPlacements: variant.disabledPlacements,
        evidence: variant.evidence,
      });
      byVariant.set(key(product.shopifyHandle, variant.shopifyVariantId), rule);
    }
  }
  return Object.freeze({
    schemaVersion: 2,
    shop: SHOP,
    productCount: products.length,
    eligibleVariantCount: byVariant.size,
    blockedProductCount: products.filter(item => !item.variants.length).length,
    resolve({ shopifyHandle, shopifyVariantId } = {}) {
      if (!validHandle(shopifyHandle) || !SHOPIFY_VARIANT.test(shopifyVariantId || '')) return null;
      const found = byVariant.get(key(shopifyHandle, shopifyVariantId));
      return found ? copy(found) : null;
    },
  });
}
