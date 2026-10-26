// Offline review only. No network, filesystem, credentials, mutations or imports.
import { createHash } from 'node:crypto';

const sha = s => createHash('sha256').update(s, 'utf8').digest('hex');
const text = v => typeof v === 'string' && v.length > 0 && v === v.trim();
const digest = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const instant = value => {
  if (typeof value !== 'string') return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!m) return false;
  const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > monthDays[month - 1] ||
      hour > 23 || minute > 59 || second > 59) return false;
  if (m[8] !== 'Z' && (Number(m[10]) > 23 || Number(m[11]) > 59)) return false;
  return Number.isFinite(Date.parse(value));
};
const gid = (value, kind) => typeof value === 'string' && new RegExp(`^gid://shopify/${kind}/[0-9]+$`).test(value);

/**
 * Compare one known Shopify variant with one exact CJ variant from a captured
 * product/query response. Mapping provenance is supplied by the reviewer;
 * this function checks structure and exact equality, never its truth or rights.
 */
export function reviewVariantBinding(input) {
  const result = (status, reason, extra = {}) => ({
    status, reason, publicationReady: false, mutationReady: false,
    assurance: 'Structural comparison only; no supplier, power, rights or fulfilment approval.',
    ...extra,
  });
  if (!input || typeof input !== 'object') return result('unknown', 'INPUT_MISSING');
  const { shopify: s, capture: c, mapping: m } = input;
  if (!s || !gid(s.productId, 'Product') || !gid(s.variantId, 'ProductVariant') || !text(s.sku))
    return result('unknown', 'SHOPIFY_IDENTITY_MISSING_OR_INVALID');
  if (!c || c.httpStatus !== 200 || typeof c.rawBody !== 'string')
    return result('unknown', 'CJ_HTTP_OR_BODY_UNAVAILABLE');
  if (!instant(c.capturedAt) || !text(c.source) || !digest(c.sha256) || sha(c.rawBody) !== c.sha256)
    return result('unknown', 'CAPTURE_PROVENANCE_OR_HASH_INVALID');
  let body;
  try { body = JSON.parse(c.rawBody); } catch { return result('unknown', 'CJ_BODY_NOT_JSON'); }
  if (!body || body.result !== true || body.code !== 200 || !body.data || Array.isArray(body.data))
    return result('unknown', 'CJ_SUCCESS_ENVELOPE_NOT_CONFIRMED');
  const p = body.data;
  if (!text(p.pid) || !Array.isArray(p.variants))
    return result('unknown', 'CJ_PRODUCT_ID_OR_VARIANTS_NOT_EXACT_STRINGS');
  if (!m) return result('unknown', 'EXACT_VARIANT_ASSIGNMENT_MISSING', { cjPid: p.pid });
  if (!gid(m.shopifyProductId, 'Product') || !gid(m.shopifyVariantId, 'ProductVariant') ||
      !text(m.cjPid) || !text(m.cjVid) || !text(m.cjVariantSku))
    return result('unknown', 'MAPPING_IDENTIFIERS_MUST_BE_EXACT_STRINGS');
  if (m.shopifyProductId !== s.productId || m.shopifyVariantId !== s.variantId || m.cjPid !== p.pid)
    return result('conflict', 'MAPPING_PRODUCT_OR_SHOPIFY_VARIANT_MISMATCH');
  if (m.cjVid === p.pid) return result('unknown', 'PRODUCT_PID_IS_NOT_VARIANT_PROOF');
  if (!m.assignmentSource || !text(m.assignmentSource.reference) ||
      !instant(m.assignmentSource.capturedAt) || !digest(m.assignmentSource.sha256) ||
      !text(m.assignmentSource.reviewedBy) || m.cjResponseSha256 !== c.sha256)
    return result('unknown', 'MAPPING_PROVENANCE_NOT_BOUND_TO_CAPTURE');
  if (p.variants.some(v => !v || !text(v.vid) || !text(v.variantSku)))
    return result('unknown', 'RETURNED_VARIANT_IDENTIFIERS_INVALID');
  if (new Set(p.variants.map(v => v.vid)).size !== p.variants.length)
    return result('conflict', 'DUPLICATE_RETURNED_CJ_VID');
  const matches = p.variants.filter(v => v.vid === m.cjVid);
  if (matches.length !== 1) return result('unknown', 'ASSIGNED_CJ_VID_NOT_RETURNED');
  const v = matches[0];
  if (v.variantSku !== m.cjVariantSku) return result('conflict', 'ASSIGNED_CJ_SKU_MISMATCH');
  if (p.variants.filter(x => x.variantSku === m.cjVariantSku).length !== 1)
    return result('conflict', 'AMBIGUOUS_RETURNED_CJ_SKU');
  if (v.pid !== undefined && (!text(v.pid) || v.pid !== p.pid))
    return result('conflict', 'VARIANT_PARENT_PID_MISMATCH');
  if (!text(v.variantKey) || !text(v.variantImage))
    return result('unknown', 'VARIANT_KEY_OR_IMAGE_MISSING');
  let image;
  try { image = new URL(v.variantImage); } catch { return result('unknown', 'VARIANT_IMAGE_URL_INVALID'); }
  if (image.protocol !== 'https:' || image.username || image.password)
    return result('unknown', 'VARIANT_IMAGE_URL_INVALID');
  return result('matchedForReview', 'EXACT_CAPTURE_MAPPING_MATCH', {
    shopifyProductId: s.productId, shopifyVariantId: s.variantId, shopifySku: s.sku,
    cjPid: p.pid, cjVid: v.vid, cjVariantSku: v.variantSku,
    variantKey: v.variantKey, variantImage: v.variantImage,
    captureSha256: c.sha256, assignmentSource: { ...m.assignmentSource },
    unresolved: ['Independent assignment-source verification', 'Actual supplied contents/motifs',
      'Exact device/adapter power and Swiss connection evidence', 'Media rights and finished-film QA'],
  });
}
