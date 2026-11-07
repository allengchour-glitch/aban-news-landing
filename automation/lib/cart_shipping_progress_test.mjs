import assert from 'node:assert/strict';
import test from 'node:test';
import {
  INTERNAL_AFTER_DISCOUNT_CENTS,
  PUBLIC_MERCHANDISE_CENTS,
  patchThemeSource,
  shippingProgress,
} from './cart_shipping_progress.mjs';

test('keeps public CHF 50 and internal CHF 45 as separate constants', () => {
  assert.equal(PUBLIC_MERCHANDISE_CENTS, 5000);
  assert.equal(INTERNAL_AFTER_DISCOUNT_CENTS, 4500);
});

test('CHF 22.90 merchandise with WELCOME10 shows CHF 27.10 remaining', () => {
  assert.deepEqual(
    shippingProgress({ itemsSubtotalPrice: 2290, totalPrice: 2061 }),
    { free: false, remainingCents: 2710, fillPercent: 46, estimatedTotalCents: 2761 },
  );
});

test('CHF 27.90 merchandise with WELCOME10 shows CHF 22.10 remaining', () => {
  assert.deepEqual(
    shippingProgress({ itemsSubtotalPrice: 2790, totalPrice: 2511 }),
    { free: false, remainingCents: 2210, fillPercent: 56, estimatedTotalCents: 3211 },
  );
});

test('CHF 50 merchandise discounted to CHF 45 is free', () => {
  assert.deepEqual(
    shippingProgress({ itemsSubtotalPrice: 5000, totalPrice: 4500 }),
    { free: true, remainingCents: 0, fillPercent: 100, estimatedTotalCents: 4500 },
  );
});

test('verified all-Swiss-warehouse basket preserves its existing free path', () => {
  assert.equal(
    shippingProgress({ itemsSubtotalPrice: 2290, totalPrice: 2061, allSwissWarehouse: true }).free,
    true,
  );
});

const liveFixture = `
<script>
(function(){ var SCHWELLE=5000, VERSAND=700, letzt=null;
var gratis=chl||tot>=5000, rest=gratis?0:Math.max(5556-sub, Math.floor(((5000-tot)*10+8)/9));
el.innerHTML='Noch '+(rest/100).toFixed(2)+' bis zum Gratis-Versand (ab CHF 50 nach Rabatt)'+
'<div class="fill" style="width:'+Math.min(100,Math.round(sub/5000*100))+'%"></div>';
})();
</script>`;

test('strict candidate patch separates the two thresholds and corrects the label', () => {
  const candidate = patchThemeSource(liveFixture);
  assert.match(candidate, /WARENWERT=5000, TARIF=4500/);
  assert.match(candidate, /tot>=TARIF/);
  assert.match(candidate, /WARENWERT-sub/);
  assert.match(candidate, /ab CHF 50 Warenwert/);
  assert.match(candidate, /sub\/WARENWERT/);
  assert.doesNotMatch(candidate, /5556-sub|ab CHF 50 nach Rabatt/);
});

test('candidate patch refuses stale, partial and already patched sources', () => {
  assert.throws(() => patchThemeSource('not a theme'), /THEME_SOURCE_MISMATCH/);
  const candidate = patchThemeSource(liveFixture);
  assert.throws(() => patchThemeSource(candidate), /THEME_SOURCE_MISMATCH/);
  assert.throws(() => patchThemeSource(liveFixture + liveFixture), /occurs more than once/);
});

test('invalid money input is rejected rather than converted to zero', () => {
  assert.throws(() => shippingProgress({ itemsSubtotalPrice: 22.9, totalPrice: 20.61 }), /integer/);
  assert.throws(() => shippingProgress({ itemsSubtotalPrice: 2000, totalPrice: 2100 }), /must not exceed/);
});
