// Public module: no private token, API authentication or direct Printful fetch.
const DRAFT_ID = /^luxe-edm-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validId = value => Number.isSafeInteger(value) && value > 0;
const SHOPIFY_PRODUCT = /^gid:\/\/shopify\/Product\/[1-9][0-9]{0,19}$/;
const SHOPIFY_VARIANT = /^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]{0,19}$/;
const validList = (value, predicate) => Array.isArray(value) && value.length > 0 &&
  value.every(predicate) && new Set(value).size === value.length;
const validPlacement = value => typeof value === 'string' && /^[a-z][a-z0-9_-]{0,63}$/.test(value);

/** SDK injection makes this testable offline; use official embed.js in the host. */
export function initialiseDesigner({
  PFDesignMaker, elemId, session, onSaved, onStatus = () => {}, onError = () => {},
  now = () => Date.now(),
}) {
  if (typeof PFDesignMaker !== 'function') throw new Error('EDM_SDK_NOT_LOADED');
  if (typeof elemId !== 'string' || !/^[A-Za-z][\w-]*$/.test(elemId)) throw new Error('INVALID_CONTAINER');
  if (!session || typeof session.externalProductId !== 'string' || !DRAFT_ID.test(session.externalProductId) ||
      typeof session.nonce !== 'string' || !session.nonce ||
      !Number.isSafeInteger(session.expiresAt) || session.expiresAt * 1000 <= now() ||
      !validId(session.initProduct?.productId) ||
      typeof session.initProduct?.technique !== 'string' || !/^[A-Z][A-Z0-9_-]{0,60}$/.test(session.initProduct.technique) ||
      !SHOPIFY_PRODUCT.test(session.productPolicy?.shopifyProductId || '') ||
      !SHOPIFY_VARIANT.test(session.productPolicy?.shopifyVariantId || '') ||
      typeof session.productPolicy?.shopifyHandle !== 'string' || !session.productPolicy.shopifyHandle ||
      !validList(session.productPolicy?.eligibleVariantIds, validId) ||
      !validList(session.productPolicy?.eligiblePlacements, validPlacement) ||
      !Array.isArray(session.productPolicy?.disabledPlacements) ||
      session.productPolicy.disabledPlacements.some(value => !validPlacement(value) || session.productPolicy.eligiblePlacements.includes(value))) {
    throw new Error('INVALID_EDM_SESSION');
  }
  if ([onSaved, onStatus, onError].some(fn => typeof fn !== 'function')) throw new Error('CALLBACK_REQUIRED');
  let saved = false;
  let saving = false;
  let valid = false;
  let selectedVariantId = null;
  let usedPlacements = [];
  const eligibleVariants = new Set(session.productPolicy.eligibleVariantIds);
  const eligiblePlacements = new Set(session.productPolicy.eligiblePlacements);
  const designer = new PFDesignMaker({
    elemId,
    nonce: session.nonce,
    externalProductId: session.externalProductId,
    initProduct: { productId: session.initProduct.productId, technique: session.initProduct.technique },
    locale: 'de_DE',
    iframeClassName: 'luxe-edm-frame',
    featureConfig: {
      initial_open_view: 'product_view',
      show_unavailability_info: true,
      clipart_layers: true,
      file_layers: true,
      text_layers: true,
    },
    ...(session.productPolicy.disabledPlacements.length
      ? { disabledPlacements: [...session.productPolicy.disabledPlacements] } : {}),
    // A Shopify line item must resolve to exactly one Printful variant. These
    // documented EDM switches keep the official colour/size picker visible,
    // but prevent a multi-variant template from entering the purchase flow.
    allowOnlyOneColorToBeSelected: true,
    allowOnlyOneSizeToBeSelected: true,
    // Printful live pricing is supplier pricing. The host must show the
    // verified Shopify retail price in CHF outside the iframe instead.
    livePricingConfig: {
      useLivePricing: false,
      useAccountBasedPricing: false,
      showPricesInPlacementsTabs: false,
      livePricingCurrency: 'CHF',
    },
    useUserConfirmationErrors: true,
    style: { variables: { '--pf-sys-background': '#fcfaf7' } },
    // No image/design prefill; all supported colours/sizes/placements remain selectable.
    onTemplateSaved(templateId) {
      if (!validId(templateId)) { onError('INVALID_TEMPLATE_ID'); return; }
      if (!saving || !validId(selectedVariantId) || !usedPlacements.length ||
          usedPlacements.some(value => !eligiblePlacements.has(value))) {
        onError('INVALID_SAVE_CALLBACK'); return;
      }
      saved = true; valid = false;
      onSaved({
        externalProductId: session.externalProductId,
        templateId,
        selectedVariantId,
        usedPlacements: [...usedPlacements],
        shopifyProductId: session.productPolicy.shopifyProductId,
        shopifyHandle: session.productPolicy.shopifyHandle,
        shopifyVariantId: session.productPolicy.shopifyVariantId,
        checkoutReady: false,
      });
    },
    onDesignStatusUpdate(status) {
      const rawVariantIds = Array.isArray(status?.selectedVariantIds) ? status.selectedVariantIds : [];
      const variantListValid = rawVariantIds.length === 1 && rawVariantIds.every(validId);
      const selectedVariantIds = variantListValid ? [...rawVariantIds] : [];
      const variantSelectionValid = variantListValid && eligibleVariants.has(selectedVariantIds[0]);
      selectedVariantId = variantSelectionValid ? selectedVariantIds[0] : null;
      const rawPlacements = Array.isArray(status?.usedPlacements) ? status.usedPlacements : [];
      const placementListValid = rawPlacements.length > 0 && rawPlacements.every(validPlacement) &&
        new Set(rawPlacements).size === rawPlacements.length;
      usedPlacements = placementListValid ? [...rawPlacements] : [];
      const placementSelectionValid = placementListValid &&
        usedPlacements.every(value => eligiblePlacements.has(value));
      valid = !saved && !saving && status?.designValid === true &&
        variantSelectionValid && placementSelectionValid;
      onStatus({
        designValid: valid,
        variantSelectionValid,
        placementSelectionValid,
        selectedVariantIds,
        usedPlacements: [...usedPlacements],
        errors: Array.isArray(status?.errors)
          ? status.errors.filter(value => typeof value === 'string').slice(0, 20) : [],
      });
    },
    // Do not forward arbitrary SDK objects to logs/telemetry.
    onError() { valid = false; onError('EDM_ERROR'); },
  });
  return Object.freeze({
    designer,
    get canSave() { return valid && !saved && !saving; },
    save() {
      if (!valid || saved || saving) throw new Error('DESIGN_NOT_READY_TO_SAVE');
      saving = true;
      designer.sendMessage({ event: 'saveDesign' });
    },
  });
}
