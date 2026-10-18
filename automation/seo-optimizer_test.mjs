import test from 'node:test';
import assert from 'node:assert/strict';
import { configuration, suggestion, mediaSample, runOptimizer, cli, READ, UPDATE, EXPECTED_SHOP } from './seo-optimizer.mjs';

// Any accidental use of the real network fails every test; transports below are injected stubs.
globalThis.fetch = async () => { throw new Error('NETWORK_FORBIDDEN_IN_TEST'); };
const id = n => `gid://shopify/Product/${n}`;
const shop = { name: 'LuxeStyle', myshopifyDomain: EXPECTED_SHOP, currencyCode: 'CHF', primaryDomain: { host: 'luxestyle.ch' } };
const product = (n = 1, seo = { title: null, description: null }) => ({ id: id(n), title: 'Gaming-Controller mit USB-C', status: 'ACTIVE', seo,
  media: { nodes: [{ status: 'READY' }], pageInfo: { hasNextPage: false } } });
const env = (extra = {}) => ({ SHOPIFY_SHOP: EXPECTED_SHOP, PRODUCT_IDS: '1', SHOPIFY_ADMIN_TOKEN: 'fake-token', ...extra });
const config = (extra = {}) => configuration(env(extra));
function transport(initial, mutations = []) {
  const current = structuredClone(initial), calls = [];
  return { calls, current, gql: async (query, variables, options) => {
    calls.push({ query, variables: structuredClone(variables), options });
    if (query === READ) return { shop: structuredClone(shop), nodes: variables.ids.map(wanted => structuredClone(current.find(p => p?.id === wanted) ?? null)) };
    assert.equal(query, UPDATE);
    const response = mutations.length ? mutations.shift() : { productUpdate: { product: { id: variables.product.id }, userErrors: [] } };
    if (response instanceof Error) throw response;
    if (response?.productUpdate?.product?.id === variables.product.id && response.productUpdate.userErrors?.length === 0) {
      const p = current.find(p => p.id === variables.product.id); Object.assign(p.seo, variables.product.seo);
    }
    return response;
  } };
}

test('explicit scope and independent budgets are required before any network call', async () => {
  for (const overrides of [{ PRODUCT_IDS: '' }, { PRODUCT_IDS: '1,2,3,4,5,6,7' }, { PRODUCT_IDS: '1,gid://shopify/Order/2' },
    { PRODUCT_IDS: '1,gid://shopify/Product/1' }, { LIMIT: '150' }, { SCAN_LIMIT: '0' }, { SCAN_LIMIT: '3oops' }]) {
    let requests = 0;
    assert.equal(await cli(env(overrides), { fetchFn: async () => { requests++; throw new Error('unexpected'); }, output: () => {} }), 1);
    assert.equal(requests, 0);
  }
});
test('malformed or other Shopify hosts never receive credentials', async () => {
  for (const host of ['evil-myshopify.com', 'au3j0y-hq.myshopify.com.evil.test', 'other.myshopify.com',
    'https://user:pass@au3j0y-hq.myshopify.com/', 'https://au3j0y-hq.myshopify.com/admin']) {
    let requests = 0;
    assert.equal(await cli(env({ SHOPIFY_SHOP: host }), { fetchFn: async () => { requests++; }, output: () => {} }), 1);
    assert.equal(requests, 0);
  }
  assert.equal(config({ SHOPIFY_SHOP: 'https://AU3J0Y-HQ.myshopify.com/' }).shop, EXPECTED_SHOP);
});
test('review is the default and explicit DRY overrides the apply switch', () => {
  assert.equal(config().mode, 'review');
  assert.equal(config({ APPLY_SEO_APPROVED: '1' }).mode, 'apply');
  assert.equal(config({ APPLY_SEO_APPROVED: '1', DRY_RUN: '1' }).mode, 'review');
});
test('scan budget is independent of LIMIT and there is no pagination', async () => {
  const t = transport([product(1), product(2), product(3)]);
  const r = await runOptimizer(config({ PRODUCT_IDS: '1,2,3', SCAN_LIMIT: '2', LIMIT: '1' }), t);
  assert.equal(r.requested, 3); assert.equal(r.scanned, 2); assert.equal(r.proposed, 1);
  assert.equal(t.calls.length, 1); assert.deepEqual(t.calls[0].variables.ids, [id(1), id(2)]);
  assert.equal(r.products[1].state, 'proposal_limit');
});
test('existing title or description is preserved byte-for-byte and excluded from the patch', () => {
  let s = suggestion(product(1, { title: ' Eigener SEO-Titel ', description: null }));
  assert.deepEqual(Object.keys(s.patch), ['description']); assert.equal(s.after.title, ' Eigener SEO-Titel ');
  s = suggestion(product(1, { title: '', description: 'Original-Beschreibung.' }));
  assert.deepEqual(Object.keys(s.patch), ['title']); assert.equal(s.after.description, 'Original-Beschreibung.');
});
test('missing SEO object or fields are unknown, never blank fields to overwrite', async () => {
  for (const seo of [undefined, {}, { title: null }, { title: 7, description: '' }]) {
    const t = transport([product(1, seo)]); // product default parameter needs explicit deletion for undefined
    if (seo === undefined) delete t.current[0].seo;
    const r = await runOptimizer(config({ APPLY_SEO_APPROVED: '1' }), t);
    assert.equal(r.products[0].state, 'unknown'); assert.equal(r.mutationAttempts, 0);
  }
});
test('uses existing title normalisation and length limits, without copied commercial promises', () => {
  const s = suggestion(product());
  assert.match(s.patch.title, /Gaming-Controller mit USB-C/);
  assert.doesNotMatch(s.patch.description, /CHF|WELCOME|Rückgabe|Gratis|Swiss|Liefer|Schweizer|%/i);
  const long = suggestion({ ...product(), title: 'Ein sehr langes Produkt mit vielen weiteren Wörtern '.repeat(6) });
  assert.ok(long.patch.title.length <= 60); assert.ok(long.patch.description.length <= 155);
});
test('default review with Telegram credentials performs reads only', async () => {
  const calls = [], outputs = [];
  const code = await cli(env({ TELEGRAM_BOT_TOKEN: 'fake-tg', TELEGRAM_CHAT_ID: 'fake-chat' }), {
    fetchFn: async (url, options) => { calls.push({ url, options });
      return { status: 200, json: async () => ({ data: { shop, nodes: [product()] } }) }; }, output: s => outputs.push(JSON.parse(s))
  });
  assert.equal(code, 0); assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/admin\/api\/2026-10\/graphql.json$/);
  assert.equal(JSON.parse(calls[0].options.body).query, READ);
  assert.equal(calls[0].options.redirect, 'error'); assert.equal(outputs[0].updated, 0);
});
test('DRY_RUN prevents writes even when apply is set', async () => {
  const t = transport([product()]); const r = await runOptimizer(config({ DRY_RUN: '1', APPLY_SEO_APPROVED: '1' }), t);
  assert.equal(r.mode, 'review'); assert.equal(r.proposed, 1); assert.equal(r.updated, 0); assert.equal(t.calls.length, 1);
});
test('live mode rechecks shop and fields, sends only missing SEO, and confirms by readback', async () => {
  const t = transport([product(1, { title: 'Titel bleibt', description: null })]);
  const r = await runOptimizer(config({ APPLY_SEO_APPROVED: '1' }), t);
  assert.equal(r.updated, 1); assert.equal(r.products[0].state, 'confirmed_updated');
  assert.deepEqual(t.calls.map(c => c.query), [READ, READ, UPDATE, READ]);
  assert.deepEqual(Object.keys(t.calls[2].variables.product.seo), ['description']);
  assert.deepEqual(t.calls[2].options, { mutation: true });
});
test('fresh title or SEO changes prevent mutation', async () => {
  for (const change of [p => p.title = 'Neuer Titel', p => p.seo.title = 'Jemand war schneller']) {
    const t = transport([product()]); let reads = 0;
    const original = t.gql; t.gql = async (...args) => { if (args[0] === READ && ++reads === 2) change(t.current[0]); return original(...args); };
    const r = await runOptimizer(config({ APPLY_SEO_APPROVED: '1' }), t);
    assert.equal(r.mutationAttempts, 0); assert.equal(r.products[0].state, 'blocked');
  }
});
test('fresh identity mismatch prevents mutation', async () => {
  const t = transport([product()]); let reads = 0; const original = t.gql;
  t.gql = async (...args) => { const out = await original(...args); if (args[0] === READ && ++reads === 2) out.shop.currencyCode = 'USD'; return out; };
  const r = await runOptimizer(config({ APPLY_SEO_APPROVED: '1' }), t);
  assert.equal(r.mutationAttempts, 0); assert.equal(r.products[0].state, 'blocked');
});
test('inactive and unknown product statuses never receive a mutation', async () => {
  for (const status of ['DRAFT', 'ARCHIVED', 'UNLISTED', undefined, 'SOMETHING_NEW']) {
    const p = product(); p.status = status; const t = transport([p]);
    const r = await runOptimizer(config({ APPLY_SEO_APPROVED: '1' }), t);
    assert.equal(r.mutationAttempts, 0); assert.equal(r.products[0].state, ['DRAFT', 'ARCHIVED', 'UNLISTED'].includes(status) ? 'skipped_inactive' : 'unknown');
  }
});
test('read/auth/rate-limit failures and missing data are unknown, not an empty shop or zero result', async () => {
  for (const result of [null, {}, { errors: [{ message: 'Unauthorized' }] }, { shop, nodes: [] }, new Error('HTTP 429')]) {
    const r = await runOptimizer(config(), { gql: async () => { if (result instanceof Error) throw result; return result; } });
    assert.equal(r.state, 'unknown'); assert.equal(r.scanned, null); assert.equal(r.proposed, null); assert.equal(r.updated, null);
  }
});
test('missing or mismatched product ID never becomes a valid product', async () => {
  const r = await runOptimizer(config(), { gql: async () => ({ shop, nodes: [product(2)] }) });
  assert.equal(r.state, 'unknown');
  const t = transport([]); const n = await runOptimizer(config(), t);
  assert.equal(n.products[0].state, 'unknown'); assert.equal(n.proposed, 0);
});
test('mutation missing data, missing ID, wrong ID or missing userErrors never increments success', async () => {
  for (const response of [null, {}, { errors: [{ message: 'API failure' }] }, { productUpdate: { product: null, userErrors: [] } },
    { productUpdate: { product: { id: id(2) }, userErrors: [] } }, { productUpdate: { product: { id: id(1) } } }]) {
    const t = transport([product()], [response]); const r = await runOptimizer(config({ APPLY_SEO_APPROVED: '1' }), t);
    assert.equal(r.updated, 0); assert.equal(r.products[0].state, 'unknown'); assert.equal(r.state, 'partial_unknown');
  }
});
test('all mutation userErrors are reported, with no false successful write', async () => {
  const errors = [{ field: ['seo', 'title'], message: 'Fehler eins' }, { field: ['seo', 'description'], message: 'Fehler zwei' }];
  const t = transport([product()], [{ productUpdate: { product: null, userErrors: errors } }]);
  const r = await runOptimizer(config({ APPLY_SEO_APPROVED: '1' }), t);
  assert.equal(r.updated, 0); assert.equal(r.products[0].state, 'rejected'); assert.deepEqual(r.products[0].errors, errors);
  assert.equal(r.state, 'partial_rejected');
});
test('ambiguous mutation stops further writes and is not retried', async () => {
  const t = transport([product(1), product(2)], [new Error('connection lost after write')]);
  const r = await runOptimizer(config({ PRODUCT_IDS: '1,2', APPLY_SEO_APPROVED: '1' }), t);
  assert.equal(r.updated, 0); assert.equal(r.mutationAttempts, 1); assert.equal(t.calls.filter(c => c.query === UPDATE).length, 1);
});
test('a successful mutation response still requires successful SEO readback', async () => {
  const t = transport([product()]); let reads = 0; const original = t.gql;
  t.gql = async (...args) => { const out = await original(...args); if (args[0] === READ && ++reads === 3) out.nodes[0].seo.description = 'Anderer Wert'; return out; };
  const r = await runOptimizer(config({ APPLY_SEO_APPROVED: '1' }), t);
  assert.equal(r.updated, 0); assert.equal(r.products[0].state, 'unknown');
});
test('media sample distinguishes processing, failed, unknown and truncated coverage', () => {
  const p = product(); p.media.nodes = [{ status: 'PROCESSING' }]; p.media.pageInfo.hasNextPage = true;
  assert.deepEqual(mediaSample(p), { state: 'processing_in_sample', sampled: 1, complete: false });
  p.media.nodes = [{ status: 'FAILED' }]; assert.equal(mediaSample(p).state, 'failed_in_sample');
  p.media.nodes = [{}]; assert.equal(mediaSample(p).state, 'unknown');
  delete p.media; assert.deepEqual(mediaSample(p), { state: 'unknown', sampled: null, complete: null });
});
test('no credentials and rejected OAuth are unknown and never leak token response bodies', async () => {
  const outputs = []; let calls = 0;
  assert.equal(await cli(env({ SHOPIFY_ADMIN_TOKEN: '' }), { fetchFn: async () => { calls++; }, output: s => outputs.push(s) }), 1);
  assert.equal(calls, 0); assert.match(outputs[0], /unknown/);
  outputs.length = 0;
  assert.equal(await cli(env({ SHOPIFY_CLIENT_ID: 'fake', SHOPIFY_CLIENT_SECRET: 'fake' }), {
    fetchFn: async () => ({ ok: false, status: 401, json: async () => ({ secret: 'MUST_NOT_LOG' }) }), output: s => outputs.push(s)
  }), 1);
  assert.match(outputs[0], /HTTP 401/); assert.doesNotMatch(outputs[0], /MUST_NOT_LOG/);
});
test('actual transport disables automatic retries for an ambiguous write (HTTP 429)', async () => {
  const calls = [], outputs = [];
  const exit = await cli(env({ APPLY_SEO_APPROVED: '1' }), {
    fetchFn: async (url, options) => { const q = JSON.parse(options.body).query; calls.push(q);
      if (q === UPDATE) return { status: 429 };
      return { status: 200, json: async () => ({ data: { shop, nodes: [product()] } }) };
    }, output: text => outputs.push(JSON.parse(text))
  });
  assert.equal(exit, 1); assert.equal(calls.filter(q => q === UPDATE).length, 1);
  assert.equal(outputs[0].products[0].state, 'unknown');
});
