import test from 'node:test';
import assert from 'node:assert/strict';

import { createMemoryDraftStore, createNonceService } from '../server/nonce-service.mjs';
import { compileProductManifest } from '../server/product-manifest.mjs';

const futureSeconds = () => Math.floor(Date.now() / 1000) + 300;
const origin = 'https://luxestyle.ch';
const subjectId = 'session-subject-0001';

function variant(shopifyVariantId) {
  return {
    shopifyVariantId,
    printfulProductId: 19,
    printfulVariantId: 1320,
    technique: 'SUBLIMATION',
    knownPlacements: ['front', 'back'],
    eligiblePlacements: ['front', 'back'],
    evidence: { verifiedAt: '2026-11-08T00:00:00Z', sources: ['evidence/current.json'] },
  };
}

function product(shopifyProductId, shopifyHandle, shopifyVariantId) {
  return {
    shopifyProductId,
    shopifyHandle,
    shopifyStatus: 'ACTIVE',
    blockers: [],
    variants: [variant(shopifyVariantId)],
  };
}

test('runtime manifest rejects a Shopify variant GID reused under another product', () => {
  const reused = 'gid://shopify/ProductVariant/56111111111111';
  assert.throws(() => compileProductManifest({
    schemaVersion: 2,
    shop: 'luxestyle.ch',
    products: [
      product('gid://shopify/Product/15111111111111', 'produkt-eins', reused),
      product('gid://shopify/Product/15222222222222', 'produkt-zwei', reused),
    ],
  }), /DUPLICATE_VARIANT_RULE/);
});

test('save report rejects duplicate or oversized placement lists before state transition', async () => {
  const shopifyVariantId = 'gid://shopify/ProductVariant/56111111111111';
  const service = createNonceService({
    edmAccessConfirmed: true,
    allowedOrigins: [origin],
    productManifest: {
      schemaVersion: 2,
      shop: 'luxestyle.ch',
      products: [product('gid://shopify/Product/15111111111111', 'produkt-eins', shopifyVariantId)],
    },
    tokenProvider: async () => 'printful-test-token',
    transport: async () => ({
      ok: true,
      json: async () => ({ code: 200, result: { nonce: {
        nonce: 'ephemeral-nonce', expires_at: futureSeconds(), template_id: null,
      } } }),
    }),
    draftStore: createMemoryDraftStore(),
  });
  const draft = await service.createDraft({
    origin, subjectId, shopifyHandle: 'produkt-eins', shopifyVariantId,
  });
  await service.openDraft({ origin, subjectId, draftId: draft.draftId });
  const base = { origin, subjectId, draftId: draft.draftId,
    templateId: 12345, selectedVariantId: 1320 };

  await assert.rejects(service.markSaveReported({ ...base, usedPlacements: ['front', 'front'] }),
    /PLACEMENT_NOT_ALLOWED/);
  await assert.rejects(service.markSaveReported({ ...base, usedPlacements: ['front', 'back', 'front'] }),
    /PLACEMENT_NOT_ALLOWED/);
  assert.deepEqual(await service.markSaveReported({ ...base, usedPlacements: ['front', 'back'] }),
    { state: 'save-reported', checkoutReady: false });
});
