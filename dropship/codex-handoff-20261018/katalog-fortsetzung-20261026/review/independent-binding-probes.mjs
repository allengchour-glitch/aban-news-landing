import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { reviewVariantBinding } from '../cj/variant_binding_review.mjs';

// Reviewer-created synthetic data, never supplier/product evidence.
const hash = s => createHash('sha256').update(s).digest('hex');
const freeze = o => { if (o && typeof o === 'object') { for (const v of Object.values(o)) freeze(v); Object.freeze(o); } return o; };
function fixture(overrides = {}) {
  const payload = { result: true, code: 200, data: { pid: 'synthetic-product', variants: [{ vid: 'synthetic-variant', variantSku: 'synthetic-sku', variantKey: 'synthetic-key', variantImage: 'https://example.invalid/synthetic.jpg', ...overrides }] } };
  const rawBody = JSON.stringify(payload);
  const capturedAt = '2026-10-26T20:00:00+01:00';
  return {
    shopify: { productId: 'gid://shopify/Product/999', variantId: 'gid://shopify/ProductVariant/888', sku: 'synthetic-shopify-sku' },
    capture: { httpStatus: 200, rawBody, sha256: hash(rawBody), capturedAt, source: 'synthetic-source' },
    mapping: { shopifyProductId: 'gid://shopify/Product/999', shopifyVariantId: 'gid://shopify/ProductVariant/888', cjPid: 'synthetic-product', cjVid: 'synthetic-variant', cjVariantSku: 'synthetic-sku', cjResponseSha256: hash(rawBody), assignmentSource: { reference: 'synthetic-only', capturedAt, sha256: 'e'.repeat(64), reviewedBy: 'synthetic-reviewer' } },
  };
}
test('function is referentially safe for deeply frozen records and does not change input', () => {
  const input = freeze(fixture());
  const before = JSON.stringify(input);
  assert.equal(reviewVariantBinding(input).status, 'matchedForReview');
  assert.equal(JSON.stringify(input), before);
});
test('JSON scalar and array inputs produce unknown rather than crashes', () => {
  for (const value of [null, 0, false, true, 'text', [], [1], {}, { capture: [] }, { mapping: 1 }]) {
    assert.equal(reviewVariantBinding(value).status, 'unknown');
  }
});
test('credential-bearing image URL is rejected without any URL request', () => {
  const r = reviewVariantBinding(fixture({ variantImage: 'https://u:p@example.invalid/synthetic.jpg' }));
  assert.equal(r.status, 'unknown'); assert.equal(r.reason, 'VARIANT_IMAGE_URL_INVALID');
});
test('non-HTTPS image schemes remain unknown', () => {
  for (const variantImage of ['ftp://example.invalid/a.jpg', 'data:image/png;base64,a', 'file:///tmp/a.jpg']) {
    assert.equal(reviewVariantBinding(fixture({ variantImage })).status, 'unknown');
  }
});
test('syntactically complete provenance does not grant actual source verification', () => {
  const r = reviewVariantBinding(fixture());
  assert.equal(r.status, 'matchedForReview');
  assert(r.unresolved.includes('Independent assignment-source verification'));
  assert.equal(r.publicationReady, false); assert.equal(r.mutationReady, false);
});
test('reported current Shopify SKU is not an independently verified mapping source', () => {
  const f = fixture(); f.shopify.sku = 'different-synthetic-current-sku';
  const r = reviewVariantBinding(f);
  assert.equal(r.status, 'matchedForReview');
  assert.equal(r.shopifySku, f.shopify.sku);
  assert.equal(r.publicationReady, false); assert.equal(r.mutationReady, false);
});
test('undefined response versus genuine zero/empty values never becomes approved', () => {
  for (const value of [null, false, 0, '', [], {}]) {
    const f = fixture(); f.capture.rawBody = JSON.stringify(value); f.capture.sha256 = hash(f.capture.rawBody);
    const r = reviewVariantBinding(f); assert.equal(r.status, 'unknown');
    assert.equal(r.publicationReady, false); assert.equal(r.mutationReady, false);
  }
});
