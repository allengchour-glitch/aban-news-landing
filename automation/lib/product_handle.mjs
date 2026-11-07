import { createHash } from 'node:crypto';

export const DEFAULT_PRODUCT_HANDLE_MAX_LENGTH = 72;

const GERMAN_ASCII = new Map([
  ['ä', 'ae'], ['ö', 'oe'], ['ü', 'ue'], ['ß', 'ss'],
  ['Ä', 'Ae'], ['Ö', 'Oe'], ['Ü', 'Ue'], ['ẞ', 'SS'],
]);

function asciiSlugPart(value) {
  const german = [...String(value ?? '')]
    .map((char) => GERMAN_ASCII.get(char) ?? char)
    .join('');

  return german
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function cjSuffix(providerId) {
  const raw = String(providerId ?? '').trim();
  if (!raw) throw new TypeError('providerId is required for a collision-safe product handle');

  const readable = asciiSlugPart(raw).replace(/^cj-/, '').slice(-12);
  const digest = createHash('sha256').update(raw, 'utf8').digest('hex').slice(0, 8);
  return `cj-${readable ? `${readable}-` : ''}${digest}`;
}

/**
 * Build a deterministic Shopify handle for a CJ/provider product.
 *
 * The title portion is strictly ASCII, while the provider-derived suffix keeps
 * equal or empty generated titles from colliding. The digest is derived only
 * from the original provider ID and therefore stays stable across runs.
 */
export function productHandle(title, providerId, { maxLength = DEFAULT_PRODUCT_HANDLE_MAX_LENGTH } = {}) {
  if (!Number.isSafeInteger(maxLength) || maxLength < 32 || maxLength > 255) {
    throw new RangeError('maxLength must be an integer between 32 and 255');
  }

  const suffix = cjSuffix(providerId);
  const maxTitleLength = maxLength - suffix.length - 1;
  if (maxTitleLength < 7) throw new RangeError('maxLength is too small for the provider suffix');

  const titlePart = (asciiSlugPart(title) || 'produkt')
    .slice(0, maxTitleLength)
    .replace(/-+$/g, '');

  return `${titlePart || 'produkt'}-${suffix}`;
}
