import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { buildNonceRequest, createMemoryDraftStore, createNonceService } from '../server/nonce-service.mjs';
import { compileProductManifest } from '../server/product-manifest.mjs';
import { initialiseDesigner } from '../client/edm.mjs';
import { mountDesignerHost } from '../client/host.mjs';
import { buildRuntimeArtifacts } from '../tools/build-product-manifest.mjs';

const TIME = Date.parse('2026-11-08T10:00:00Z');
const SECRET = 'offline-private-test-token';
const CONTEXT = Object.freeze({
  origin: 'https://luxestyle.ch',
  subjectId: 'server-signed-session-a',
  shopifyHandle: 'test-tasse-selbst-gestalten',
  shopifyVariantId: 'gid://shopify/ProductVariant/123',
});
const PRODUCT_MANIFEST = Object.freeze({
  schemaVersion: 2,
  shop: 'luxestyle.ch',
  products: [{
    shopifyProductId: 'gid://shopify/Product/321',
    shopifyHandle: CONTEXT.shopifyHandle,
    shopifyStatus: 'ACTIVE',
    blockers: [],
    variants: [{
      shopifyVariantId: CONTEXT.shopifyVariantId,
      printfulProductId: 390,
      printfulVariantId: 10877,
      technique: 'SUBLIMATION',
      knownPlacements: ['front', 'back'],
      eligiblePlacements: ['front'],
      evidence: { verifiedAt: '2026-11-08T09:00:00Z', sources: ['synthetic-test-fixture'] },
    }],
  }],
});

function setup(extra = {}) {
  const requests = [];
  const draftStore = createMemoryDraftStore();
  const service = createNonceService({
    edmAccessConfirmed: true,
    allowedOrigins: ['https://luxestyle.ch'],
    productManifest: PRODUCT_MANIFEST,
    tokenProvider: async () => SECRET,
    now: () => TIME,
    draftStore,
    transport: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, json: async () => ({ code: 200, result: { nonce: {
        nonce: 'offline-nonce', template_id: null, expires_at: TIME / 1000 + 300,
      } } }) };
    },
    ...extra,
  });
  return { service, requests, draftStore };
}

async function open(setupResult) {
  const draft = await setupResult.service.createDraft(CONTEXT);
  const session = await setupResult.service.openDraft({ ...CONTEXT, draftId: draft.draftId });
  return { draft, session };
}

test('access confirmation is mandatory; no wildcard or foreign origins', () => {
  assert.throws(() => createNonceService(), /EDM_ACCESS_NOT_CONFIRMED/);
  for (const origin of ['*', 'https://evil.test', 'https://luxestyle.ch.evil.test', 'http://luxestyle.ch', 'https://luxestyle.ch/']) {
    assert.throws(() => setup({ allowedOrigins: [origin] }), /INVALID_ALLOWED_ORIGINS/);
  }
});

test('unknown Shopify handle or exact variant, session and origin fail before transport', async () => {
  const ctx = setup();
  const patches = [
    { shopifyHandle: 'another-product' },
    { shopifyHandle: '' },
    { shopifyVariantId: 'gid://shopify/ProductVariant/999' },
    { shopifyVariantId: '123' },
    { origin: 'https://evil.test' },
    { subjectId: '' },
  ];
  for (const patch of patches) await assert.rejects(ctx.service.createDraft({ ...CONTEXT, ...patch }));
  assert.equal(ctx.requests.length, 0);
});

test('parallel drafts have unique external IDs even for the same exact Shopify variant', async () => {
  const ctx = setup();
  const drafts = await Promise.all(Array.from({ length: 100 }, () => ctx.service.createDraft(CONTEXT)));
  assert.equal(new Set(drafts.map(draft => draft.draftId)).size, 100);
  assert.ok(drafts.every(draft => draft.shopifyVariantId === CONTEXT.shopifyVariantId));
  assert.equal(ctx.requests.length, 0);
});

test('request builder is fixed-target, unsigned and contains only the draft ID', () => {
  const req = buildNonceRequest('luxe-edm-00000000-0000-4000-8000-000000000000');
  assert.equal(req.url, 'https://api.printful.com/embedded-designer/nonces');
  assert.deepEqual(Object.keys(JSON.parse(req.body)), ['external_product_id']);
  assert.equal('headers' in req, false);
  assert.throws(() => buildNonceRequest('https://evil.test'), /INVALID_DRAFT_ID/);
});

test('one nonce POST for concurrent opens; client receives only resolved variant policy', async () => {
  const ctx = setup();
  const draft = await ctx.service.createDraft(CONTEXT);
  const results = await Promise.allSettled([
    ctx.service.openDraft({ ...CONTEXT, draftId: draft.draftId }),
    ctx.service.openDraft({ ...CONTEXT, draftId: draft.draftId }),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(ctx.requests.length, 1);
  assert.equal(ctx.requests[0].options.headers.Authorization, `Bearer ${SECRET}`);
  assert.equal(ctx.requests[0].options.redirect, 'error');
  const session = results.find(result => result.status === 'fulfilled').value;
  assert.equal(JSON.stringify(session).includes(SECRET), false);
  assert.deepEqual(Object.keys(session).sort(),
    ['expiresAt', 'externalProductId', 'initProduct', 'nonce', 'productPolicy']);
  assert.equal(session.initProduct.productId, 390);
  assert.equal(session.initProduct.technique, 'SUBLIMATION');
  assert.deepEqual(session.productPolicy.eligibleVariantIds, [10877]);
  assert.deepEqual(session.productPolicy.eligiblePlacements, ['front']);
  assert.deepEqual(session.productPolicy.disabledPlacements, ['back']);
  assert.equal(JSON.stringify(await ctx.draftStore.get(draft.draftId)).includes(SECRET), false);
});

test('another session cannot open a draft and does not consume it', async () => {
  const ctx = setup();
  const draft = await ctx.service.createDraft(CONTEXT);
  await assert.rejects(ctx.service.openDraft({
    ...CONTEXT, subjectId: 'server-signed-session-b', draftId: draft.draftId,
  }), /DRAFT_NOT_FOUND/);
  assert.equal(ctx.requests.length, 0);
  assert.equal((await ctx.draftStore.get(draft.draftId)).state, 'reserved');
});

test('uncertain upstream response is sanitised and cannot trigger another POST', async () => {
  let calls = 0;
  const ctx = setup({ transport: async () => { calls += 1; throw new Error(`headers: Bearer ${SECRET}`); } });
  const draft = await ctx.service.createDraft(CONTEXT);
  await assert.rejects(ctx.service.openDraft({ ...CONTEXT, draftId: draft.draftId }), error => {
    assert.equal(error.message, 'NONCE_RESULT_UNKNOWN');
    assert.equal(String(error.stack).includes(SECRET), false);
    return true;
  });
  await assert.rejects(ctx.service.openDraft({ ...CONTEXT, draftId: draft.draftId }), /NONCE_ALREADY_ATTEMPTED/);
  assert.equal(calls, 1);
  assert.equal((await ctx.draftStore.get(draft.draftId)).state, 'unknown');
});

test('expired nonce or existing-template response cannot start a blank session', async () => {
  for (const patch of [{ expires_at: TIME / 1000 }, { template_id: 123 }]) {
    const ctx = setup({ transport: async () => ({ ok: true, json: async () => ({ code: 200, result: { nonce: {
      nonce: 'offline-nonce', template_id: null, expires_at: TIME / 1000 + 300, ...patch,
    } } }) }) });
    const draft = await ctx.service.createDraft(CONTEXT);
    await assert.rejects(ctx.service.openDraft({ ...CONTEXT, draftId: draft.draftId }), /NONCE_RESULT_UNKNOWN/);
  }
});

test('official SDK config starts in product view and only saves an eligible variant and placement', async () => {
  const ctx = setup();
  const { session } = await open(ctx);
  let config;
  const messages = [];
  const saved = [];
  const statuses = [];
  class SDK {
    constructor(value) { config = value; }
    sendMessage(message) { messages.push(message); }
  }
  const editor = initialiseDesigner({
    PFDesignMaker: SDK,
    elemId: 'luxe-edm',
    session,
    now: () => TIME,
    onSaved: value => saved.push(value),
    onStatus: value => statuses.push(value),
  });
  assert.equal(config.locale, 'de_DE');
  assert.equal(config.featureConfig.initial_open_view, 'product_view');
  assert.equal(config.featureConfig.file_layers, true);
  assert.equal(config.featureConfig.text_layers, true);
  assert.equal(config.allowOnlyOneColorToBeSelected, true);
  assert.equal(config.allowOnlyOneSizeToBeSelected, true);
  assert.deepEqual(config.disabledPlacements, ['back']);
  assert.deepEqual(config.livePricingConfig, {
    useLivePricing: false,
    useAccountBasedPricing: false,
    showPricesInPlacementsTabs: false,
    livePricingCurrency: 'CHF',
  });
  for (const absent of ['applyImageFromUrl', 'disabledColors', 'disabledSizes', 'isVariantSelectionDisabled']) {
    assert.equal(absent in config, false);
  }
  assert.equal(JSON.stringify(config).includes(SECRET), false);
  assert.throws(() => editor.save(), /DESIGN_NOT_READY_TO_SAVE/);
  config.onTemplateSaved(554);
  assert.equal(saved.length, 0);

  config.onDesignStatusUpdate({ designValid: true, selectedVariantIds: [10878], usedPlacements: ['front'] });
  assert.equal(editor.canSave, false);
  assert.equal(statuses.at(-1).variantSelectionValid, false);
  config.onDesignStatusUpdate({ designValid: true, selectedVariantIds: [10877, 'bad'], usedPlacements: ['front'] });
  assert.equal(editor.canSave, false);
  assert.equal(statuses.at(-1).variantSelectionValid, false);
  config.onDesignStatusUpdate({ designValid: true, selectedVariantIds: [10877], usedPlacements: ['back'] });
  assert.equal(editor.canSave, false);
  assert.equal(statuses.at(-1).placementSelectionValid, false);
  config.onDesignStatusUpdate({ designValid: true, selectedVariantIds: [10877], usedPlacements: ['front', 7] });
  assert.equal(editor.canSave, false);
  assert.equal(statuses.at(-1).placementSelectionValid, false);
  config.onDesignStatusUpdate({ designValid: true, selectedVariantIds: [10877], usedPlacements: ['front'] });
  assert.equal(editor.canSave, true);
  editor.save();
  assert.deepEqual(messages, [{ event: 'saveDesign' }]);
  assert.throws(() => editor.save(), /DESIGN_NOT_READY_TO_SAVE/);
  config.onTemplateSaved(555);
  assert.equal(editor.canSave, false);
  assert.deepEqual(saved[0], {
    externalProductId: session.externalProductId,
    templateId: 555,
    selectedVariantId: 10877,
    usedPlacements: ['front'],
    shopifyProductId: 'gid://shopify/Product/321',
    shopifyHandle: CONTEXT.shopifyHandle,
    shopifyVariantId: CONTEXT.shopifyVariantId,
    checkoutReady: false,
  });
});

test('shared host renders safe Swiss price/status chrome around the official editor', async () => {
  class Element {
    constructor(ownerDocument, name) {
      this.ownerDocument = ownerDocument;
      this.name = name;
      this.children = [];
      this.listeners = new Map();
      this.dataset = {};
      this.attributes = {};
      this.textContent = '';
      this.disabled = false;
    }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, listener) { this.listeners.set(name, listener); }
    click() { this.listeners.get('click')?.(); }
  }
  const document = { createElement(name) { return new Element(document, name); } };
  const root = new Element(document, 'root');
  const ctx = setup();
  const { session } = await open(ctx);
  let config;
  const messages = [];
  const saved = [];
  const closes = [];
  class SDK {
    constructor(value) { config = value; }
    sendMessage(value) { messages.push(value); }
  }
  const host = mountDesignerHost({
    root,
    PFDesignMaker: SDK,
    session,
    now: () => TIME,
    productTitle: 'Keramik-Tasse – Selbst gestalten',
    variantTitle: '325 ml',
    retailPriceCHF: 22.9,
    onSaved: value => saved.push(value),
    onClose: value => closes.push(value),
  });
  assert.equal(root.children[0], host.shell);
  const [header, container, footer] = host.shell.children;
  assert.equal(header.children[0].children[0].textContent, 'Keramik-Tasse – Selbst gestalten');
  assert.match(header.children[0].children[2].textContent, /CHF/);
  assert.equal(container.id, config.elemId);
  const [status, save] = footer.children;
  assert.equal(save.disabled, true);
  config.onDesignStatusUpdate({ designValid: true, selectedVariantIds: [10877], usedPlacements: ['front'] });
  assert.equal(save.disabled, false);
  assert.equal(status.dataset.state, 'ready');
  save.click();
  assert.deepEqual(messages, [{ event: 'saveDesign' }]);
  config.onTemplateSaved(901);
  assert.equal(saved[0].templateId, 901);
  assert.equal(status.dataset.state, 'saved');
  header.children[1].click();
  assert.deepEqual(closes, [{ hasUnsavedChanges: false }]);
  host.dispose();
  assert.deepEqual(root.children, []);
});

test('client save report stays unverified until server checks exact variant and placement', async () => {
  const ctx = setup();
  const { draft } = await open(ctx);
  await assert.rejects(ctx.service.markSaveReported({
    ...CONTEXT, draftId: draft.draftId, templateId: 555,
    selectedVariantId: 10878, usedPlacements: ['front'],
  }), /VARIANT_NOT_ALLOWED/);
  await assert.rejects(ctx.service.markSaveReported({
    ...CONTEXT, draftId: draft.draftId, templateId: 555,
    selectedVariantId: 10877, usedPlacements: ['back'],
  }), /PLACEMENT_NOT_ALLOWED/);
  assert.deepEqual(await ctx.service.markSaveReported({
    ...CONTEXT, draftId: draft.draftId, templateId: 555,
    selectedVariantId: 10877, usedPlacements: ['front'],
  }), { state: 'save-reported', checkoutReady: false });
  assert.equal((await ctx.draftStore.get(draft.draftId)).state, 'save-reported');
  await assert.rejects(ctx.service.openDraft({ ...CONTEXT, draftId: draft.draftId }), /NONCE_ALREADY_ATTEMPTED/);
});

test('manifest is exact-variant only, keeps DRAFT blocked and rejects eligible DRAFT rules', () => {
  const manifest = compileProductManifest({
    schemaVersion: 2,
    shop: 'luxestyle.ch',
    products: [
      ...PRODUCT_MANIFEST.products,
      {
        shopifyProductId: 'gid://shopify/Product/322',
        shopifyHandle: 'entwurf-selbst-gestalten',
        shopifyStatus: 'DRAFT',
        variants: [],
        blockers: ['SHOPIFY_DRAFT'],
      },
    ],
  });
  assert.equal(manifest.productCount, 2);
  assert.equal(manifest.eligibleVariantCount, 1);
  assert.equal(manifest.resolve(CONTEXT).printfulVariantId, 10877);
  assert.equal(manifest.resolve({ ...CONTEXT, shopifyVariantId: 'gid://shopify/ProductVariant/124' }), null);
  assert.equal(manifest.resolve({
    shopifyHandle: 'entwurf-selbst-gestalten',
    shopifyVariantId: 'gid://shopify/ProductVariant/124',
  }), null);

  const invalid = structuredClone(PRODUCT_MANIFEST);
  invalid.products[0].shopifyStatus = 'DRAFT';
  assert.throws(() => compileProductManifest(invalid), /DRAFT_PRODUCT_CANNOT_BE_ELIGIBLE/);

  const duplicateAcrossProducts = structuredClone(PRODUCT_MANIFEST);
  duplicateAcrossProducts.products.push({
    ...structuredClone(duplicateAcrossProducts.products[0]),
    shopifyProductId: 'gid://shopify/Product/323',
    shopifyHandle: 'zweites-testprodukt-selbst-gestalten',
  });
  assert.throws(() => compileProductManifest(duplicateAcrossProducts), /DUPLICATE_VARIANT_RULE/);
});

test('same handle can resolve different Printful models only through different Shopify variants', () => {
  const base = structuredClone(PRODUCT_MANIFEST.products[0]);
  base.shopifyHandle = 'mehrmodell-t-shirt-selbst-gestalten';
  base.variants = [
    { ...base.variants[0], shopifyVariantId: 'gid://shopify/ProductVariant/201', printfulProductId: 71, printfulVariantId: 401 },
    { ...base.variants[0], shopifyVariantId: 'gid://shopify/ProductVariant/202', printfulProductId: 456, printfulVariantId: 402 },
  ];
  const manifest = compileProductManifest({ schemaVersion: 2, shop: 'luxestyle.ch', products: [base] });
  assert.equal(manifest.resolve({ shopifyHandle: base.shopifyHandle, shopifyVariantId: base.variants[0].shopifyVariantId }).printfulProductId, 71);
  assert.equal(manifest.resolve({ shopifyHandle: base.shopifyHandle, shopifyVariantId: base.variants[1].shopifyVariantId }).printfulProductId, 456);
  assert.equal(manifest.resolve({ shopifyHandle: base.shopifyHandle, shopifyVariantId: 'gid://shopify/ProductVariant/203' }), null);
});

test('generated 41-product allowlist matches evidence and keeps unresolved products closed', async () => {
  const load = async relative => JSON.parse(await readFile(new URL(relative, import.meta.url), 'utf8'));
  const catalogRaw = await readFile(new URL('../data/catalog-manifest.json', import.meta.url));
  const catalog = JSON.parse(catalogRaw);
  const catalogSha256 = createHash('sha256').update(catalogRaw).digest('hex');
  const [mappings, generated] = await Promise.all([
    load('../data/verified-variant-mappings.json'),
    load('../data/product-manifest.json'),
  ]);
  const rebuilt = buildRuntimeArtifacts({ catalog, catalogSha256 });
  assert.deepEqual(rebuilt.manifest, generated);
  assert.deepEqual(rebuilt.verifiedMappings, mappings);
  const compiled = compileProductManifest(generated);
  assert.equal(compiled.productCount, 41);
  assert.equal(compiled.eligibleVariantCount, 244);
  assert.equal(generated.products.filter(product => product.variants.length > 0).length, 18);
  assert.equal(generated.products.filter(product => product.shopifyStatus === 'DRAFT').length, 22);
  assert.ok(generated.products.filter(product => product.shopifyStatus === 'DRAFT')
    .every(product => product.variants.length === 0));
  const transfer = generated.products.find(product => product.shopifyHandle === 'buegeltransfer-selbst-gestalten');
  assert.deepEqual(transfer.variants, []);
  assert.deepEqual(transfer.blockers, ['NON_PRINTFUL_FULFILLMENT']);
  const jersey = generated.products.find(product => product.shopifyHandle === 'wm-trikot-selbst-gestalten');
  assert.deepEqual(jersey.variants, []);
  assert.deepEqual(jersey.blockers, ['SHOPIFY_DRAFT', 'PRINTFUL_VARIANT_MAPPING_UNVERIFIED']);
  const phone = generated.products.find(product =>
    product.shopifyHandle === 'transparente-iphone®-hulle-selbst-gestalten');
  assert.equal(phone.variants.length, 31);
  assert.deepEqual(phone.blockers, []);
  assert.equal(compiled.resolve({
    shopifyHandle: phone.shopifyHandle,
    shopifyVariantId: phone.variants[0].shopifyVariantId,
  }).printfulProductId, 181);
  assert.equal(compiled.resolve({
    shopifyHandle: phone.shopifyHandle,
    shopifyVariantId: 'gid://shopify/ProductVariant/999999',
  }), null);
  assert.equal(new Set(mappings.mappings.map(item => item.shopifyVariantId)).size, 244);
  assert.ok(mappings.mappings.every(item => item.eligiblePlacements.length === 1 &&
    item.eligiblePlacements[0] === 'default'));
  const repeatedPrintfulVariant = mappings.mappings.filter(item => item.printfulVariantId === 1320);
  assert.equal(repeatedPrintfulVariant.length, 2);
  assert.equal(new Set(repeatedPrintfulVariant.map(item => item.shopifyVariantId)).size, 2);
  assert.deepEqual(new Set(repeatedPrintfulVariant.map(item => item.printfulProductId)), new Set([19]));

  const duplicateShopifyVariant = structuredClone(catalog);
  const variants = duplicateShopifyVariant.products.flatMap(product => product.variants);
  variants[1].shopifyVariantGid = variants[0].shopifyVariantGid;
  variants[1].shopifyVariantId = variants[0].shopifyVariantId;
  assert.throws(() => buildRuntimeArtifacts({ catalog: duplicateShopifyVariant, catalogSha256 }),
    /INVALID_OR_DUPLICATE_SHOPIFY_VARIANT/);
});

test('client module has no server import, secret dependency, fetch or logging', async () => {
  const source = await readFile(new URL('../client/edm.mjs', import.meta.url), 'utf8');
  assert.equal(/\bimport\b|\bfetch\s*\(|\bprocess\.env\b|\bAuthorization\b|\bconsole\./.test(source), false);
  const server = await readFile(new URL('../server/nonce-service.mjs', import.meta.url), 'utf8');
  assert.equal(/\bconsole\./.test(server), false);
});
