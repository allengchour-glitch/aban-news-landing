/**
 * LuxeStyle cart shipping progress.
 *
 * The public promise is CHF 50 merchandise value. Shopify's active Swiss
 * shipping rate becomes free at CHF 45 after discounts. WELCOME10 turns
 * CHF 50 into CHF 45, so those values must stay separate.
 *
 * This module has no network or Shopify write path. `patchThemeSource` only
 * creates a candidate from a freshly downloaded theme source and refuses an
 * unknown or already changed input.
 */
export const PUBLIC_MERCHANDISE_CENTS = 5000;
export const INTERNAL_AFTER_DISCOUNT_CENTS = 4500;
export const STANDARD_SHIPPING_CENTS = 700;

function cents(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative integer number of cents`);
  }
  return value;
}

export function shippingProgress({
  itemsSubtotalPrice,
  totalPrice,
  allSwissWarehouse = false,
}) {
  const subtotal = cents(itemsSubtotalPrice, 'itemsSubtotalPrice');
  const total = cents(totalPrice, 'totalPrice');
  if (total > subtotal) throw new RangeError('totalPrice must not exceed itemsSubtotalPrice');

  const free = Boolean(allSwissWarehouse) || total >= INTERNAL_AFTER_DISCOUNT_CENTS;
  const publicGap = Math.max(0, PUBLIC_MERCHANDISE_CENTS - subtotal);
  // WELCOME10 is the advertised 10 % code. Convert the remaining post-discount
  // tariff gap back to merchandise value, rounding up to whole cents.
  const tariffGapAtTenPercent = Math.max(
    0,
    Math.ceil((INTERNAL_AFTER_DISCOUNT_CENTS - total) * 10 / 9),
  );
  const remainingCents = free ? 0 : Math.max(publicGap, tariffGapAtTenPercent);

  return {
    free,
    remainingCents,
    fillPercent: Math.min(100, Math.round(subtotal / PUBLIC_MERCHANDISE_CENTS * 100)),
    estimatedTotalCents: total + (free ? 0 : STANDARD_SHIPPING_CENTS),
  };
}

const LIVE_DECLARATION = 'var SCHWELLE=5000, VERSAND=700, letzt=null;';
const FIXED_DECLARATION = 'var WARENWERT=5000, TARIF=4500, VERSAND=700, letzt=null;';
const LIVE_CALCULATION = 'var gratis=chl||tot>=5000, rest=gratis?0:Math.max(5556-sub, Math.floor(((5000-tot)*10+8)/9));';
const FIXED_CALCULATION = 'var gratis=chl||tot>=TARIF, rest=gratis?0:Math.max(WARENWERT-sub, Math.floor(((TARIF-tot)*10+8)/9));';
const LIVE_LABEL = 'bis zum Gratis-Versand (ab CHF 50 nach Rabatt)';
const FIXED_LABEL = 'bis zum Gratis-Versand (ab CHF 50 Warenwert)';
const LIVE_FILL = 'Math.round(sub/5000*100)';
const FIXED_FILL = 'Math.round(sub/WARENWERT*100)';

function replaceExactlyOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`THEME_SOURCE_MISMATCH: ${label} missing`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`THEME_SOURCE_MISMATCH: ${label} occurs more than once`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

export function patchThemeSource(source) {
  if (typeof source !== 'string' || !source.length) {
    throw new TypeError('theme source must be a non-empty string');
  }
  let candidate = replaceExactlyOnce(source, LIVE_DECLARATION, FIXED_DECLARATION, 'declaration');
  candidate = replaceExactlyOnce(candidate, LIVE_CALCULATION, FIXED_CALCULATION, 'calculation');
  candidate = replaceExactlyOnce(candidate, LIVE_LABEL, FIXED_LABEL, 'label');
  candidate = replaceExactlyOnce(candidate, LIVE_FILL, FIXED_FILL, 'progress fill');
  return candidate;
}
