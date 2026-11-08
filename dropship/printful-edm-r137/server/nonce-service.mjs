// SERVER ONLY. Never bundle this module or token providers into a Shopify asset.
import { randomUUID } from 'node:crypto';
import { compileProductManifest } from './product-manifest.mjs';

const NONCE_URL = 'https://api.printful.com/embedded-designer/nonces';
const OWN_ORIGINS = new Set(['https://luxestyle.ch', 'https://www.luxestyle.ch']);
const DRAFT_ID = /^luxe-edm-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class EdmError extends Error {
  constructor(code) { super(code); this.name = 'EdmError'; this.code = code; }
}
const fail = code => { throw new EdmError(code); };
const validId = value => Number.isSafeInteger(value) && value > 0;
const copy = value => structuredClone(value);

/** Pure unsigned request builder. It cannot contain credentials or arbitrary URLs. */
export function buildNonceRequest(externalProductId) {
  if (typeof externalProductId !== 'string' || !DRAFT_ID.test(externalProductId)) fail('INVALID_DRAFT_ID');
  return Object.freeze({
    url: NONCE_URL,
    method: 'POST',
    body: JSON.stringify({ external_product_id: externalProductId }),
  });
}

/** Offline/single-process review adapter only. Production needs durable atomic storage. */
export function createMemoryDraftStore() {
  const records = new Map();
  return Object.freeze({
    async create(record) {
      if (records.has(record.id)) return false;
      records.set(record.id, copy(record)); return true;
    },
    async get(id) { return records.has(id) ? copy(records.get(id)) : null; },
    async transition(id, expected, patch) {
      const previous = records.get(id);
      if (!previous || previous.state !== expected) return false;
      records.set(id, { ...previous, ...copy(patch) }); return true;
    },
  });
}

/**
 * No default fetch/transport: nothing sends without explicit server-side wiring.
 * The caller must first authenticate the session and enforce CSRF protection.
 * subjectId must come from that trusted server session, never request JSON.
 */
export function createNonceService({
  edmAccessConfirmed = false, allowedOrigins, productManifest,
  tokenProvider, transport, draftStore, now = () => Date.now(), newId = randomUUID,
} = {}) {
  if (edmAccessConfirmed !== true) fail('EDM_ACCESS_NOT_CONFIRMED');
  if (!Array.isArray(allowedOrigins) || !allowedOrigins.length ||
      allowedOrigins.some(origin => !OWN_ORIGINS.has(origin))) fail('INVALID_ALLOWED_ORIGINS');
  const origins = new Set(allowedOrigins);
  let manifest;
  try { manifest = compileProductManifest(productManifest); }
  catch { fail('INVALID_PRODUCT_MANIFEST'); }
  if (typeof tokenProvider !== 'function' || typeof transport !== 'function' ||
      !draftStore || ['create', 'get', 'transition'].some(key => typeof draftStore[key] !== 'function')) {
    fail('SERVER_DEPENDENCIES_REQUIRED');
  }

  function validateContext({ origin, subjectId } = {}) {
    if (!origins.has(origin)) fail('ORIGIN_NOT_ALLOWED');
    if (typeof subjectId !== 'string' || subjectId.length < 16 || subjectId.length > 256) fail('SESSION_REQUIRED');
  }
  function resolveProduct(shopifyHandle, shopifyVariantId) {
    const rule = manifest.resolve({ shopifyHandle, shopifyVariantId });
    if (!rule) fail('PRODUCT_RULE_NOT_ALLOWED');
    return rule;
  }
  async function ownedDraft(context) {
    validateContext(context);
    if (!DRAFT_ID.test(context.draftId || '')) fail('INVALID_DRAFT_ID');
    const record = await draftStore.get(context.draftId);
    if (!record || record.subjectId !== context.subjectId || record.origin !== context.origin) fail('DRAFT_NOT_FOUND');
    resolveProduct(record.shopifyHandle, record.shopifyVariantId);
    return record;
  }

  return Object.freeze({
    async createDraft(context) {
      validateContext(context);
      const rule = resolveProduct(context.shopifyHandle, context.shopifyVariantId);
      const id = `luxe-edm-${newId()}`;
      buildNonceRequest(id); // Reject an invalid injected ID generator before persistence.
      const record = {
        id, subjectId: context.subjectId, origin: context.origin,
        shopifyProductId: rule.shopifyProductId,
        shopifyHandle: rule.shopifyHandle,
        shopifyVariantId: rule.shopifyVariantId,
        productId: rule.printfulProductId, technique: rule.technique,
        eligibleVariantIds: [rule.printfulVariantId],
        eligiblePlacements: rule.eligiblePlacements,
        disabledPlacements: rule.disabledPlacements,
        state: 'reserved', createdAt: now(),
      };
      if (!await draftStore.create(record)) fail('DRAFT_ID_COLLISION');
      return Object.freeze({
        draftId: id,
        shopifyProductId: record.shopifyProductId,
        shopifyHandle: record.shopifyHandle,
        shopifyVariantId: record.shopifyVariantId,
        productId: record.productId,
        state: 'reserved',
      });
    },

    async openDraft(context) {
      const record = await ownedDraft(context);
      if (record.state !== 'reserved') fail('NONCE_ALREADY_ATTEMPTED');
      // Validate secret access before claiming an outbound operation.
      let token;
      try { token = await tokenProvider(); } catch { fail('TOKEN_UNAVAILABLE'); }
      if (typeof token !== 'string' || token.length < 8 || /[\r\n]/.test(token)) fail('TOKEN_UNAVAILABLE');
      if (!await draftStore.transition(record.id, 'reserved', { state: 'inflight', attemptedAt: now() })) {
        fail('NONCE_ALREADY_ATTEMPTED');
      }
      const request = buildNonceRequest(record.id);
      let response;
      try {
        response = await transport(request.url, {
          method: request.method,
          redirect: 'error',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: request.body,
          signal: AbortSignal.timeout(15000),
        });
      } catch {
        await draftStore.transition(record.id, 'inflight', { state: 'unknown' });
        // Never forward an upstream exception: it could contain headers or tokens.
        fail('NONCE_RESULT_UNKNOWN');
      } finally { token = undefined; }
      if (!response?.ok) {
        await draftStore.transition(record.id, 'inflight', { state: 'unknown' });
        fail('NONCE_RESULT_UNKNOWN');
      }
      let body;
      try { body = await response.json(); } catch { /* Kept unknown below. */ }
      const nonce = body?.result?.nonce;
      if (body?.code !== 200 || !nonce || typeof nonce.nonce !== 'string' || !nonce.nonce.length ||
          nonce.nonce.length > 4096 || !Number.isSafeInteger(nonce.expires_at) ||
          nonce.expires_at * 1000 <= now() || nonce.template_id !== null) {
        await draftStore.transition(record.id, 'inflight', { state: 'unknown' });
        fail('NONCE_RESULT_UNKNOWN');
      }
      if (!await draftStore.transition(record.id, 'inflight', {
        state: 'open', nonceExpiresAt: nonce.expires_at,
      })) fail('NONCE_RESULT_UNKNOWN');
      // This is the ONLY client payload. Nonce is ephemeral; private token is absent.
      // Route adapter must send Cache-Control: no-store and redact response logging.
      return Object.freeze({
        externalProductId: record.id, nonce: nonce.nonce, expiresAt: nonce.expires_at,
        initProduct: Object.freeze({ productId: record.productId, technique: record.technique }),
        productPolicy: Object.freeze({
          shopifyProductId: record.shopifyProductId,
          shopifyHandle: record.shopifyHandle,
          shopifyVariantId: record.shopifyVariantId,
          eligibleVariantIds: Object.freeze([...record.eligibleVariantIds]),
          eligiblePlacements: Object.freeze([...record.eligiblePlacements]),
          disabledPlacements: Object.freeze([...record.disabledPlacements]),
        }),
      });
    },

    async markSaveReported(context) {
      const record = await ownedDraft(context);
      if (!validId(context.templateId)) fail('INVALID_TEMPLATE_ID');
      if (!validId(context.selectedVariantId) || !record.eligibleVariantIds.includes(context.selectedVariantId)) {
        fail('VARIANT_NOT_ALLOWED');
      }
      if (!Array.isArray(context.usedPlacements) || !context.usedPlacements.length ||
          context.usedPlacements.length > record.eligiblePlacements.length ||
          new Set(context.usedPlacements).size !== context.usedPlacements.length ||
          context.usedPlacements.some(value => typeof value !== 'string' || !record.eligiblePlacements.includes(value))) {
        fail('PLACEMENT_NOT_ALLOWED');
      }
      if (!await draftStore.transition(record.id, 'open', {
        state: 'save-reported', reportedTemplateId: context.templateId,
        reportedVariantId: context.selectedVariantId,
        reportedPlacements: [...context.usedPlacements],
      })) fail('INVALID_DRAFT_STATE');
      // Client callbacks are not trusted production/order verification.
      return { state: 'save-reported', checkoutReady: false };
    },
  });
}
