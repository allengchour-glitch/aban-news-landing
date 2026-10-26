import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { reviewVariantBinding } from './variant_binding_review.mjs';
const sha = s => createHash('sha256').update(s).digest('hex');
// All supplier records below are synthetic; no actual CJ variant is asserted.
function fixture() {
  const body = { result: true, code: 200, data: { pid: '1477820492730732544', variants: [
    { vid: 'SYNTHETIC-VID-A', variantSku: 'SYNTHETIC-SKU-A', variantKey: 'Synthetic A', variantImage: 'https://example.invalid/a.jpg' },
    { vid: 'SYNTHETIC-VID-B', variantSku: 'SYNTHETIC-SKU-B', variantKey: 'Synthetic B', variantImage: 'https://example.invalid/b.jpg' },
  ] } };
  const rawBody = JSON.stringify(body);
  const shopify = { productId: 'gid://shopify/Product/15521256604033', variantId: 'gid://shopify/ProductVariant/56197916361089', sku: 'CJ-1477820492730732544' };
  const capture = { httpStatus: 200, rawBody, sha256: sha(rawBody), capturedAt: '2026-10-26T20:00:00+01:00', source: 'synthetic-fixture-only' };
  const mapping = { shopifyProductId: shopify.productId, shopifyVariantId: shopify.variantId, cjPid: body.data.pid,
    cjVid: 'SYNTHETIC-VID-B', cjVariantSku: 'SYNTHETIC-SKU-B', cjResponseSha256: capture.sha256,
    assignmentSource: { reference: 'synthetic-assignment-only', capturedAt: capture.capturedAt, sha256: 'a'.repeat(64), reviewedBy: 'synthetic-reviewer' } };
  return { shopify, capture, mapping };
}
function bodyChange(input, change) { const b = JSON.parse(input.capture.rawBody); change(b); input.capture.rawBody = JSON.stringify(b); input.capture.sha256 = sha(input.capture.rawBody); input.mapping.cjResponseSha256 = input.capture.sha256; }
test('synthetic exact second variant matches, without any approval', () => {
  const r = reviewVariantBinding(fixture()); assert.equal(r.status, 'matchedForReview'); assert.equal(r.cjVid, 'SYNTHETIC-VID-B');
  assert.equal(r.publicationReady, false); assert.equal(r.mutationReady, false);
});
const cases = [
  ['missing assignment never picks first variant', x => delete x.mapping, 'unknown', 'EXACT_VARIANT_ASSIGNMENT_MISSING'],
  ['product pid is not vid', x => x.mapping.cjVid = x.mapping.cjPid, 'unknown', 'PRODUCT_PID_IS_NOT_VARIANT_PROOF'],
  ['rounded numeric pid', x => bodyChange(x, b => b.data.pid = Number(b.data.pid)), 'unknown', 'CJ_PRODUCT_ID_OR_VARIANTS_NOT_EXACT_STRINGS'],
  ['numeric vid', x => bodyChange(x, b => b.data.variants[0].vid = 123), 'unknown', 'RETURNED_VARIANT_IDENTIFIERS_INVALID'],
  ['mapping numeric vid', x => x.mapping.cjVid = 123, 'unknown', 'MAPPING_IDENTIFIERS_MUST_BE_EXACT_STRINGS'],
  ['wrong product', x => x.mapping.cjPid = 'other', 'conflict', 'MAPPING_PRODUCT_OR_SHOPIFY_VARIANT_MISMATCH'],
  ['wrong Shopify variant', x => x.mapping.shopifyVariantId = 'gid://shopify/ProductVariant/99', 'conflict', 'MAPPING_PRODUCT_OR_SHOPIFY_VARIANT_MISMATCH'],
  ['missing variant', x => x.mapping.cjVid = 'not-returned', 'unknown', 'ASSIGNED_CJ_VID_NOT_RETURNED'],
  ['SKU conflict', x => x.mapping.cjVariantSku = 'wrong', 'conflict', 'ASSIGNED_CJ_SKU_MISMATCH'],
  ['ambiguous SKU', x => bodyChange(x, b => b.data.variants[0].variantSku = b.data.variants[1].variantSku), 'conflict', 'AMBIGUOUS_RETURNED_CJ_SKU'],
  ['duplicate vid', x => bodyChange(x, b => b.data.variants[0].vid = b.data.variants[1].vid), 'conflict', 'DUPLICATE_RETURNED_CJ_VID'],
  ['bad parent', x => bodyChange(x, b => b.data.variants[1].pid = 'other'), 'conflict', 'VARIANT_PARENT_PID_MISMATCH'],
  ['missing variant image', x => bodyChange(x, b => delete b.data.variants[1].variantImage), 'unknown', 'VARIANT_KEY_OR_IMAGE_MISSING'],
  ['bad image scheme', x => bodyChange(x, b => b.data.variants[1].variantImage = 'http://example.invalid/b.jpg'), 'unknown', 'VARIANT_IMAGE_URL_INVALID'],
  ['missing source', x => delete x.mapping.assignmentSource, 'unknown', 'MAPPING_PROVENANCE_NOT_BOUND_TO_CAPTURE'],
  ['unbound response hash', x => x.mapping.cjResponseSha256 = 'b'.repeat(64), 'unknown', 'MAPPING_PROVENANCE_NOT_BOUND_TO_CAPTURE'],
  ['tampered raw data', x => x.capture.rawBody += ' ', 'unknown', 'CAPTURE_PROVENANCE_OR_HASH_INVALID'],
  ['date without timezone', x => x.capture.capturedAt = '2026-10-26T20:00:00', 'unknown', 'CAPTURE_PROVENANCE_OR_HASH_INVALID'],
  ['HTTP403 unknown', x => x.capture.httpStatus = 403, 'unknown', 'CJ_HTTP_OR_BODY_UNAVAILABLE'],
  ['HTTP429 unknown', x => x.capture.httpStatus = 429, 'unknown', 'CJ_HTTP_OR_BODY_UNAVAILABLE'],
  ['quota envelope unknown', x => bodyChange(x, b => { b.result = false; b.code = 1600100; }), 'unknown', 'CJ_SUCCESS_ENVELOPE_NOT_CONFIRMED'],
  ['string result not success', x => bodyChange(x, b => b.result = 'true'), 'unknown', 'CJ_SUCCESS_ENVELOPE_NOT_CONFIRMED'],
  ['empty variants not available match', x => bodyChange(x, b => b.data.variants = []), 'unknown', 'ASSIGNED_CJ_VID_NOT_RETURNED'],
  ['whitespace vid not normalized', x => x.mapping.cjVid += ' ', 'unknown', 'MAPPING_IDENTIFIERS_MUST_BE_EXACT_STRINGS'],
];
for (const [name, mutate, status, reason] of cases) test(name, () => { const x = fixture(); mutate(x); const r = reviewVariantBinding(x); assert.equal(r.status, status); assert.equal(r.reason, reason); assert.equal(r.publicationReady, false); assert.equal(r.mutationReady, false); });
test('undefined input remains unknown', () => assert.equal(reviewVariantBinding().status, 'unknown'));
for (const capturedAt of [
  '2026-02-30T20:00:00+01:00', '2026-02-29T20:00:00Z',
  '1900-02-29T20:00:00Z', '2026-04-31T20:00:00Z',
  '2026-00-10T20:00:00Z', '2026-12-00T20:00:00Z',
  '2026-10-26T24:00:00Z', '2026-10-26T20:60:00Z',
  '2026-10-26T20:00:60Z', '2026-10-26T20:00:00+24:00',
  '2026-10-26T20:00:00+01:60', '2026-10-26T20:00:00junkZ',
]) test(`impossible capture instant remains unknown: ${capturedAt}`, () => {
  const x = fixture(); x.capture.capturedAt = capturedAt;
  assert.equal(reviewVariantBinding(x).reason, 'CAPTURE_PROVENANCE_OR_HASH_INVALID');
});
for (const capturedAt of ['2024-02-29T20:00:00Z', '2000-02-29T20:00:00.123+01:00', '2026-10-26T23:30:00-03:30'])
  test(`real calendar instant allowed structurally: ${capturedAt}`, () => {
    const x = fixture(); x.capture.capturedAt = capturedAt;
    assert.equal(reviewVariantBinding(x).status, 'matchedForReview');
  });
test('impossible assignment-source instant remains unknown', () => {
  const x = fixture(); x.mapping.assignmentSource.capturedAt = '2026-02-30T20:00:00+01:00';
  assert.equal(reviewVariantBinding(x).reason, 'MAPPING_PROVENANCE_NOT_BOUND_TO_CAPTURE');
});
