import test from 'node:test';
import assert from 'node:assert/strict';
import { createCjReadOnlyClient, CJ_READ_LIMITS } from './cj_readonly.mjs';

const KEY = 'CJUserNum@api@OFFLINE_TEST_KEY_1234567890';
const TOKEN = 'OFFLINE_ACCESS_TOKEN_1234567890';
const REFRESH = 'OFFLINE_REFRESH_TOKEN_1234567890';
const NOW = Date.parse('2026-11-05T08:00:00Z');
const LOOKUP = { pid: '1477820492730732544' };
const authBody = (extra = {}) => ({ result: true, code: 200, data: {
  accessToken: TOKEN, refreshToken: REFRESH, accessTokenExpiryDate: '2027-04-22T22:33:41+08:00'
}, ...extra });
const productData = (extra = {}) => ({ pid: LOOKUP.pid, productSku: 'CJ-PROJECTOR', productNameEn: 'Supplier projector',
  bigImage: 'https://cf.cjdropshipping.com/main.jpg',
  productImageSet: ['https://cf.cjdropshipping.com/detail.jpg'],
  variants: [{ vid: '9876543210123456789', pid: LOOKUP.pid, variantSku: 'CJ-VARIANT',
    variantKey: 'Dark, EU', variantImage: 'https://cf.cjdropshipping.com/variant.jpg' }], ...extra });
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const authResponse = (extra = {}) => response(authBody(extra));
const productResponse = (extra = {}) => response({ result: true, code: 200, data: productData(extra) });
const inventoryResponse = (variantInventories = [], pointsInfo = { total: 70000, usedToday: 10, remaining: 69990 }, extra = {}) =>
  response({ success: true, code: 200, data: { inventories: [{ must: 'stay ignored' }], variantInventories },
    pointsInfo, ...extra });

function client(fetchImpl, extra = {}) {
  return createCjReadOnlyClient({ env: { CJ_API_KEY: KEY }, fetchImpl, wait: async () => {}, now: () => NOW, ...extra });
}

function assertNoSecrets(value) {
  const text = JSON.stringify(value);
  for (const secret of [KEY, TOKEN, REFRESH]) {
    assert.ok(!text.includes(secret));
    assert.ok(!text.includes(JSON.stringify(secret).slice(1, -1)));
    assert.ok(!text.toLowerCase().includes(encodeURIComponent(secret).toLowerCase()));
  }
}

test('status is local and distinguishes missing, invalid and bound-unverified bindings', () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; throw new Error('must not run'); };
  const missing = createCjReadOnlyClient({ env: {}, fetchImpl, now: () => NOW }).status();
  const invalid = createCjReadOnlyClient({ env: { CJ_API_KEY: ' short ' }, fetchImpl, now: () => NOW }).status();
  const bound = createCjReadOnlyClient({ env: { CJ_API_KEY: KEY }, fetchImpl, now: () => NOW }).status();
  assert.equal(calls, 0);
  assert.equal(missing.credentialBinding, 'missing');
  assert.equal(invalid.credentialBinding, 'invalid');
  assert.equal(bound.credentialBinding, 'bound_unverified');
  assert.equal(bound.connection, 'unknown_until_product_read');
  assert.equal(bound.credentialsPersisted, false);
  assertNoSecrets(bound);
});

test('missing and malformed keys never reach the network', async t => {
  for (const key of [undefined, '', 'short', ` ${KEY}`, `${KEY}\n`, `${KEY}\tinside`, 'x'.repeat(201)]) {
    await t.test(String(key?.length), async () => {
      let calls = 0;
      const c = createCjReadOnlyClient({ env: key === undefined ? {} : { CJ_API_KEY: key },
        fetchImpl: async () => { calls++; throw new Error('must not run'); }, now: () => NOW });
      const report = await c.readProduct(LOOKUP);
      assert.equal(calls, 0); assert.equal(report.state, 'unknown');
      assert.match(report.reason, /^credential_binding_(?:missing|invalid)$/); assertNoSecrets(report);
    });
  }
});

test('success sends apiKey auth then exactly one paced product GET and whitelists output', async () => {
  const calls = [], waits = [];
  const c = createCjReadOnlyClient({ env: { CJ_API_KEY: KEY }, now: () => NOW,
    wait: async ms => { waits.push(ms); }, fetchImpl: async (url, init) => {
      calls.push({ url, init }); return calls.length === 1 ? authResponse() : productResponse();
    } });
  const report = await c.readProduct(LOOKUP);
  assert.equal(calls.length, 2);
  assert.equal(new URL(calls[0].url).pathname, '/api2.0/v1/authentication/getAccessToken');
  assert.deepEqual(JSON.parse(calls[0].init.body), { apiKey: KEY });
  assert.equal(calls[0].init.method, 'POST'); assert.equal(calls[0].init.redirect, 'error');
  const productUrl = new URL(calls[1].url);
  assert.equal(productUrl.pathname, '/api2.0/v1/product/query');
  assert.equal(productUrl.search, `?pid=${LOOKUP.pid}`);
  assert.equal(calls[1].init.method, 'GET');
  assert.equal(calls[1].init.headers['CJ-Access-Token'], TOKEN);
  assert.equal(calls[1].init.body, undefined); assert.equal(calls[1].init.redirect, 'error');
  assert.deepEqual(waits, [CJ_READ_LIMITS.REQUEST_GAP_MS]);
  assert.equal(report.state, 'product_identity_verified');
  assert.deepEqual(report.requests, { authentication: 1, product: 1 });
  assert.equal(report.product.product.pid, LOOKUP.pid);
  assert.equal(report.product.product.variants.returned, 1);
  assert.equal(report.product.commercialMediaRights, 'unknown');
  assertNoSecrets(report);
  const status = c.status();
  assert.equal(status.connection, 'verified_by_product_read');
  assert.equal(status.accessTokenCachedInProcess, true);
  assert.ok(status.lastAuthenticationAt); assert.ok(status.lastVerifiedReadAt);
});

test('a second read reuses only the in-memory access token', async () => {
  const calls = [];
  const c = client(async (url, init) => {
    calls.push({ url, init });
    if (calls.length === 1) return authResponse();
    return productResponse();
  });
  const first = await c.readProduct(LOOKUP);
  const second = await c.readProduct(LOOKUP);
  assert.equal(first.requests.authentication, 1);
  assert.equal(second.requests.authentication, 0);
  assert.equal(calls.length, 3);
  assert.equal(calls.filter(call => call.init.method === 'POST').length, 1);
  assert.equal(calls.filter(call => call.init.method === 'GET').length, 2);
});

test('auth HTTP and protocol failures remain unknown and never call product', async t => {
  const cases = [
    ['401', async () => new Response('', { status: 401 }), 'authentication_rejected'],
    ['403', async () => new Response('', { status: 403 }), 'authentication_rejected'],
    ['429', async () => new Response('', { status: 429 }), 'throttled'],
    ['500', async () => new Response('', { status: 500 }), 'upstream_unavailable'],
    ['quota', async () => response({ result: false, code: 1600200, message: 'Insufficient API points' }), 'quota'],
    ['malformed', async () => new Response('not-json'), 'response_invalid_json'],
    ['token', async () => authResponse({ data: { accessToken: KEY, accessTokenExpiryDate: '2027-01-01T00:00:00Z' } }), 'authentication_token_invalid']
  ];
  for (const [name, fetchImpl, reason] of cases) await t.test(name, async () => {
    let calls = 0;
    const report = await client(async (...args) => { calls++; return fetchImpl(...args); }).readProduct(LOOKUP);
    assert.equal(calls, 1); assert.equal(report.state, 'unknown'); assert.equal(report.reason, reason);
    assert.deepEqual(report.requests, { authentication: 1, product: 0 }); assertNoSecrets(report);
  });
});

test('product errors and soft CJ codes are explicit unknown states, never empty products', async t => {
  const cases = [
    ['401', new Response('', { status: 401 }), 'authentication_rejected'],
    ['403', new Response('', { status: 403 }), 'authentication_rejected'],
    ['429', new Response('', { status: 429 }), 'throttled'],
    ['500', new Response('', { status: 500 }), 'upstream_unavailable'],
    ['1602001', response({ result: false, code: 1602001, data: null }), 'product_not_found'],
    ['1602002', response({ result: false, code: 1602002, data: null }), 'product_removed'],
    ['1602003', response({ result: false, code: 1602003, data: null }), 'variant_removed']
  ];
  for (const [name, product, reason] of cases) await t.test(name, async () => {
    let calls = 0;
    const report = await client(async () => ++calls === 1 ? authResponse() : product).readProduct(LOOKUP);
    assert.equal(calls, 2); assert.equal(report.state, 'unknown'); assert.equal(report.reason, reason);
    assert.equal(report.product, null); assert.deepEqual(report.requests, { authentication: 1, product: 1 });
  });
});

test('a rejected error-body cancel cannot bypass auth or product unknown reports', async t => {
  const rejectedBody = status => ({ status, body: { cancel: async () => { throw new Error('synthetic cancel failure'); } } });
  await t.test('authentication 429', async () => {
    const c = client(async () => rejectedBody(429));
    const report = await c.readProduct(LOOKUP);
    assert.equal(report.state, 'unknown');
    assert.equal(report.reason, 'throttled');
    assert.deepEqual(report.requests, { authentication: 1, product: 0 });
    assert.equal(c.status().lastProductReadState, 'unknown');
  });
  await t.test('product 429', async () => {
    let calls = 0;
    const c = client(async () => {
      calls++;
      if (calls === 1) return authResponse();
      if (calls === 2) return productResponse();
      return rejectedBody(429);
    });
    assert.equal((await c.readProduct(LOOKUP)).state, 'product_identity_verified');
    assert.equal(c.status().connection, 'verified_by_product_read');
    const report = await c.readProduct(LOOKUP);
    assert.equal(report.state, 'unknown');
    assert.equal(report.reason, 'throttled');
    assert.deepEqual(report.requests, { authentication: 0, product: 1 });
    assert.equal(c.status().lastProductReadState, 'unknown');
    assert.equal(c.status().connection, 'unknown_until_product_read');
  });
});

test('identity mismatch and raw or encoded credential echoes block product output', async t => {
  const extras = [
    ['identity', { pid: '1477820492730732545' }, 'product_identity_mismatch', 'mismatch'],
    ['raw-key', { productNameEn: `echo ${KEY}` }, 'credential_echo_blocked', 'unknown'],
    ['encoded-token', { bigImage: `https://example.invalid/?x=${encodeURIComponent(TOKEN)}` }, 'credential_echo_blocked', 'unknown'],
    ['refresh', { productNameEn: REFRESH }, 'credential_echo_blocked', 'unknown']
  ];
  for (const [name, extra, reason, state] of extras) await t.test(name, async () => {
    let calls = 0;
    const report = await client(async () => ++calls === 1 ? authResponse() : productResponse(extra)).readProduct(LOOKUP);
    assert.equal(report.state, state); assert.equal(report.reason, reason); assert.equal(report.product, null); assertNoSecrets(report);
  });
});

test('variant and image output is visibly bounded below MCP response limits', async () => {
  const variants = Array.from({ length: 140 }, (_, index) => ({ vid: String(9000000000000000000n + BigInt(index)),
    pid: LOOKUP.pid, variantSku: `CJ-VARIANT-${index}`, variantKey: `Option ${index}`,
    variantImage: `https://cf.cjdropshipping.com/${index}.jpg` }));
  const images = Array.from({ length: 140 }, (_, index) => `https://cf.cjdropshipping.com/image-${index}.jpg`);
  let calls = 0;
  const report = await client(async () => ++calls === 1 ? authResponse() : productResponse({ variants, productImageSet: images })).readProduct(LOOKUP);
  assert.equal(report.state, 'product_identity_verified');
  assert.equal(report.product.product.variants.reported, 140);
  assert.equal(report.product.product.variants.returned, 50);
  assert.equal(report.product.product.variants.partial, true);
  assert.equal(report.product.product.imageSet.returned, 25);
  assert.equal(report.product.product.imageSet.partial, true);
  assert.ok(Buffer.byteLength(JSON.stringify(report)) < 256 * 1024);
});

test('oversized streamed product response is unknown and is not retried', async () => {
  let calls = 0;
  const huge = new Response('x'.repeat(CJ_READ_LIMITS.BODY_LIMIT + 1));
  const report = await client(async () => ++calls === 1 ? authResponse() : huge).readProduct(LOOKUP);
  assert.equal(calls, 2); assert.equal(report.state, 'unknown'); assert.equal(report.reason, 'response_too_large');
  assert.equal(report.product, null);
});

test('rotating the API key discards the previous account token before another product read', async () => {
  const KEY2 = 'CJUserNum@api@OFFLINE_ROTATED_KEY_0987654321';
  const TOKEN2 = 'OFFLINE_ROTATED_ACCESS_TOKEN_0987654321';
  const REFRESH2 = 'OFFLINE_ROTATED_REFRESH_TOKEN_0987654321';
  const env = { CJ_API_KEY: KEY };
  const calls = [];
  const c = createCjReadOnlyClient({ env, wait: async () => {}, now: () => NOW,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      if (calls.length === 1) return authResponse();
      if (calls.length === 2) return productResponse();
      if (calls.length === 3) return response({ result: true, code: 200, data: {
        accessToken: TOKEN2, refreshToken: REFRESH2, accessTokenExpiryDate: '2027-04-22T22:33:41+08:00'
      } });
      return productResponse();
    } });
  const first = await c.readProduct(LOOKUP);
  env.CJ_API_KEY = KEY2;
  assert.equal(c.status().connection, 'unknown_until_product_read');
  assert.equal(c.status().accessTokenCachedInProcess, false);
  const second = await c.readProduct(LOOKUP);
  assert.equal(first.state, 'product_identity_verified');
  assert.equal(second.state, 'product_identity_verified');
  assert.deepEqual(second.requests, { authentication: 1, product: 1 });
  assert.deepEqual(calls.map(call => call.init.method), ['POST', 'GET', 'POST', 'GET']);
  assert.deepEqual(JSON.parse(calls[0].init.body), { apiKey: KEY });
  assert.deepEqual(JSON.parse(calls[2].init.body), { apiKey: KEY2 });
  assert.equal(calls[1].init.headers['CJ-Access-Token'], TOKEN);
  assert.equal(calls[3].init.headers['CJ-Access-Token'], TOKEN2);
  const serialized = JSON.stringify(second);
  for (const secret of [KEY, TOKEN, REFRESH, KEY2, TOKEN2, REFRESH2]) assert.ok(!serialized.includes(secret));
});

test('cached authentication continues to block a refresh-token echo on the next read', async () => {
  let calls = 0;
  const c = client(async () => {
    calls++;
    if (calls === 1) return authResponse();
    if (calls === 2) return productResponse();
    return productResponse({ productNameEn: `supplier echo ${REFRESH}` });
  });
  assert.equal((await c.readProduct(LOOKUP)).state, 'product_identity_verified');
  const blocked = await c.readProduct(LOOKUP);
  assert.equal(calls, 3);
  assert.deepEqual(blocked.requests, { authentication: 0, product: 1 });
  assert.equal(blocked.state, 'unknown');
  assert.equal(blocked.reason, 'credential_echo_blocked');
  assert.equal(blocked.product, null);
  assertNoSecrets(blocked);
});

test('mixed-case URI encoding of an access token is treated as a credential echo', async () => {
  const SPECIAL_TOKEN = 'OFFLINE_ACCESS_TOKEN_abcdefghijklmnop/+=';
  const encoded = encodeURIComponent(SPECIAL_TOKEN)
    .replace('%2F', '%2f').replace('%2B', '%2b').replace('%3D', '%3d');
  assert.notEqual(encoded, encodeURIComponent(SPECIAL_TOKEN));
  let calls = 0;
  const c = client(async () => {
    calls++;
    if (calls === 1) return response({ result: true, code: 200, data: {
      accessToken: SPECIAL_TOKEN, refreshToken: REFRESH, accessTokenExpiryDate: '2027-04-22T22:33:41+08:00'
    } });
    return productResponse({ productNameEn: `supplier echo ${encoded}` });
  });
  const report = await c.readProduct(LOOKUP);
  assert.equal(calls, 2);
  assert.equal(report.state, 'unknown');
  assert.equal(report.reason, 'credential_echo_blocked');
  assert.equal(report.product, null);
  const serialized = JSON.stringify(report);
  assert.ok(!serialized.includes(SPECIAL_TOKEN));
  assert.ok(!serialized.includes(encoded));
});

test('JSON-escaped quote and backslash in an access token cannot bypass echo blocking', async () => {
  const SPECIAL_TOKEN = 'OFFLINE_ACCESS_"_TOKEN_\\_1234567890';
  let calls = 0;
  const c = client(async () => {
    calls++;
    if (calls === 1) return response({ result: true, code: 200, data: {
      accessToken: SPECIAL_TOKEN, refreshToken: REFRESH, accessTokenExpiryDate: '2027-04-22T22:33:41+08:00'
    } });
    return productResponse({ productNameEn: `supplier echo ${SPECIAL_TOKEN}` });
  });
  const report = await c.readProduct(LOOKUP);
  assert.equal(calls, 2);
  assert.equal(report.state, 'unknown');
  assert.equal(report.reason, 'credential_echo_blocked');
  assert.equal(report.product, null);
  const serialized = JSON.stringify(report);
  assert.ok(!serialized.includes(JSON.stringify(SPECIAL_TOKEN).slice(1, -1)));
});

test('very long whitelisted supplier fields are bounded below the MCP output ceiling', async () => {
  // Long enough to exceed every returned-field limit while the synthetic raw
  // CJ response itself remains below the independent 2 MiB transport limit.
  const long = 'Ä'.repeat(5_000);
  const variants = Array.from({ length: 60 }, (_, index) => ({
    vid: String(8000000000000000000n + BigInt(index)), pid: LOOKUP.pid, variantSku: `CJ-VARIANT-${index}`,
    variantKey: long, variantStandard: long, variantImage: `https://cf.cjdropshipping.com/${index}.jpg`
  }));
  let calls = 0;
  const report = await client(async () => ++calls === 1 ? authResponse() : productResponse({
    productSku: long, productNameEn: long, bigImage: `https://example.invalid/${'x'.repeat(2_000)}`,
    productImageSet: [`https://example.invalid/${'y'.repeat(2_000)}`], variants
  })).readProduct(LOOKUP);
  assert.equal(report.state, 'product_identity_verified');
  assert.equal(report.product.product.productSkuState, 'truncated');
  assert.equal(report.product.product.productNameEnState, 'truncated');
  assert.equal(report.product.product.mainImage.state, 'unknown');
  assert.equal(report.product.product.imageSet.state, 'unknown');
  assert.equal(report.product.product.variants.returned, 50);
  assert.equal(report.product.product.variants.partial, true);
  assert.ok(report.product.product.variants.records.every(record => record.variantKeyState === 'truncated'
    && record.variantStandardState === 'truncated'));
  assert.ok(Buffer.byteLength(JSON.stringify(report), 'utf8') < 256 * 1024);
});

test('a later failed read makes current connection unknown while preserving historical verification time', async () => {
  let calls = 0;
  const c = client(async () => {
    calls++;
    if (calls === 1) return authResponse();
    if (calls === 2) return productResponse();
    return new Response('', { status: 429 });
  });
  assert.equal((await c.readProduct(LOOKUP)).state, 'product_identity_verified');
  const before = c.status();
  assert.equal(before.connection, 'verified_by_product_read');
  assert.equal(before.lastProductReadState, 'verified');
  const failed = await c.readProduct(LOOKUP);
  assert.equal(failed.state, 'unknown');
  assert.equal(failed.reason, 'throttled');
  assert.deepEqual(failed.requests, { authentication: 0, product: 1 });
  const after = c.status();
  assert.equal(after.connection, 'unknown_until_product_read');
  assert.equal(after.lastProductReadState, 'unknown');
  assert.ok(after.lastProductReadAt);
  assert.equal(after.lastVerifiedReadAt, before.lastVerifiedReadAt);
});

test('product then inventory share one auth token and preserve zero while invalid stock stays unknown', async () => {
  const calls = [], waits = [];
  const c = createCjReadOnlyClient({ env: { CJ_API_KEY: KEY }, now: () => NOW,
    wait: async ms => { waits.push(ms); }, fetchImpl: async (url, init) => {
      calls.push({ url, init });
      if (calls.length === 1) return authResponse();
      if (calls.length === 2) return productResponse();
      return inventoryResponse([{ vid: '9876543210123456789', inventory: [
        { countryCode: 'CN', totalInventory: 0, cjInventory: 0, factoryInventory: 0, verifiedWarehouse: 1 },
        { countryCode: 'DE', totalInventory: null, cjInventory: -1, factoryInventory: '0', verifiedWarehouse: 3 },
        { countryCode: 'ch', totalInventory: 1.5, cjInventory: Number.MAX_SAFE_INTEGER + 1 }
      ] }], { total: 70000, usedToday: 70000, remaining: 0 });
    } });
  const product = await c.readProduct(LOOKUP);
  const inventory = await c.readInventory(LOOKUP);
  assert.equal(product.state, 'product_identity_verified');
  assert.equal(inventory.state, 'inventory_returned');
  assert.deepEqual(inventory.requests, { authentication: 0, inventory: 1 });
  assert.equal(calls.length, 3);
  assert.deepEqual(waits, [CJ_READ_LIMITS.REQUEST_GAP_MS, CJ_READ_LIMITS.REQUEST_GAP_MS]);
  const url = new URL(calls[2].url);
  assert.equal(url.pathname, '/api2.0/v1/product/stock/getInventoryByPid');
  assert.equal(url.search, `?pid=${LOOKUP.pid}`);
  assert.equal(calls[2].init.method, 'GET');
  assert.equal(calls[2].init.body, undefined);
  assert.equal(calls[2].init.headers['CJ-Access-Token'], TOKEN);
  const rows = inventory.inventory.variants.records[0].countries.records;
  assert.deepEqual(rows[0], { countryCode: 'CN', totalInventory: 0, cjInventory: 0,
    factoryInventory: 0, verifiedWarehouse: 1 });
  assert.deepEqual(rows[1], { countryCode: 'DE', totalInventory: null, cjInventory: null,
    factoryInventory: null, verifiedWarehouse: null });
  assert.deepEqual(rows[2], { countryCode: null, totalInventory: null, cjInventory: null,
    factoryInventory: null, verifiedWarehouse: null });
  assert.deepEqual(inventory.inventory.pointsInfo,
    { state: 'returned', total: 70000, usedToday: 70000, remaining: 0 });
  assert.equal(inventory.inventory.countryAggregation, false);
  assert.equal(inventory.inventory.deliveryToSwitzerland, 'unknown');
  assert.equal(c.status().lastInventoryReadState, 'returned');
  assertNoSecrets(inventory);
});

test('inventory fails closed after missing, throttled or mismatched product prerequisites', async t => {
  await t.test('missing product read', async () => {
    let calls = 0;
    const c = client(async () => { calls++; throw new Error('must not run'); });
    const inventory = await c.readInventory(LOOKUP);
    assert.equal(calls, 0);
    assert.equal(inventory.state, 'unknown');
    assert.equal(inventory.reason, 'product_prerequisite_not_verified');
    assert.deepEqual(inventory.requests, { authentication: 0, inventory: 0 });
  });
  await t.test('authentication 429', async () => {
    let calls = 0;
    const c = client(async () => { calls++; return new Response('', { status: 429 }); });
    const product = await c.readProduct(LOOKUP);
    const inventory = await c.readInventory(LOOKUP);
    assert.equal(calls, 1);
    assert.equal(product.reason, 'throttled');
    assert.equal(inventory.reason, 'product_prerequisite_not_verified');
    assert.deepEqual(inventory.requests, { authentication: 0, inventory: 0 });
  });
  await t.test('product 429', async () => {
    let calls = 0;
    const c = client(async () => ++calls === 1 ? authResponse() : new Response('', { status: 429 }));
    const product = await c.readProduct(LOOKUP);
    const inventory = await c.readInventory(LOOKUP);
    assert.equal(calls, 2);
    assert.equal(product.reason, 'throttled');
    assert.equal(inventory.reason, 'product_prerequisite_not_verified');
    assert.deepEqual(inventory.requests, { authentication: 0, inventory: 0 });
  });
  await t.test('different PID', async () => {
    let calls = 0;
    const c = client(async () => ++calls === 1 ? authResponse() : productResponse());
    assert.equal((await c.readProduct(LOOKUP)).state, 'product_identity_verified');
    const inventory = await c.readInventory({ pid: '1477820492730739999' });
    assert.equal(calls, 2);
    assert.equal(inventory.reason, 'product_prerequisite_not_verified');
    assert.deepEqual(inventory.requests, { authentication: 0, inventory: 0 });
  });
  await t.test('missing variant mapping', async () => {
    let calls = 0;
    const c = client(async () => ++calls === 1 ? authResponse() : productResponse({ variants: null }));
    const product = await c.readProduct(LOOKUP);
    const inventory = await c.readInventory(LOOKUP);
    assert.equal(product.state, 'product_identity_verified');
    assert.equal(product.product.product.variants.state, 'unknown');
    assert.equal(calls, 2);
    assert.equal(inventory.reason, 'product_prerequisite_not_verified');
    assert.deepEqual(inventory.requests, { authentication: 0, inventory: 0 });
  });
  for (const [name, second] of [
    ['duplicate VID', { vid: '9876543210123456789', variantSku: 'CJ-VARIANT-B' }],
    ['duplicate SKU', { vid: '9876543210123456790', variantSku: 'CJ-VARIANT' }],
    ['normalised duplicate SKU', { vid: '9876543210123456790', variantSku: 'CJ-CJ-VARIANT' }],
    ['noncanonical VID', { vid: '9876543210123456790 ', variantSku: 'CJ-VARIANT-B' }]
  ]) await t.test(name, async () => {
    let calls = 0;
    const variants = [productData().variants[0], {
      pid: LOOKUP.pid, variantKey: 'Light, EU', variantImage: 'https://cf.cjdropshipping.com/variant-b.jpg',
      ...second
    }];
    const c = client(async () => ++calls === 1 ? authResponse() : productResponse({ variants }));
    const product = await c.readProduct(LOOKUP);
    const inventory = await c.readInventory(LOOKUP);
    assert.equal(product.state, 'product_identity_verified');
    assert.equal(product.product.product.variants.state, 'unknown');
    assert.equal(product.product.product.variants.reason, 'variant_identity_missing_or_inconsistent');
    assert.equal(calls, 2);
    assert.equal(inventory.reason, 'product_prerequisite_not_verified');
    assert.deepEqual(inventory.requests, { authentication: 0, inventory: 0 });
  });
});

test('inventory accepts only strict success true and numeric code 200, with no retry', async t => {
  const cases = [
    ['result-only', response({ result: true, code: 200, data: { variantInventories: [] } }), 'inventory_api_response_rejected'],
    ['string-code', response({ success: true, code: '200', data: { variantInventories: [] } }), 'inventory_api_response_rejected'],
    ['false-success', response({ success: false, code: 200, data: { variantInventories: [] } }), 'inventory_api_response_rejected'],
    ['malformed', response({ success: true, code: 200, data: { variantInventories: null } }), 'malformed_inventory_data'],
    ['quota', response({ success: false, code: 1600200, message: 'Insufficient API points' }), 'quota'],
    ['401', new Response('', { status: 401 }), 'authentication_rejected'],
    ['403', new Response('', { status: 403 }), 'authentication_rejected'],
    ['429', new Response('', { status: 429 }), 'throttled'],
    ['500', new Response('', { status: 500 }), 'upstream_unavailable']
  ];
  for (const [name, stock, reason] of cases) await t.test(name, async () => {
    let calls = 0;
    const c = client(async () => ++calls === 1 ? authResponse() : calls === 2 ? productResponse() : stock);
    assert.equal((await c.readProduct(LOOKUP)).state, 'product_identity_verified');
    const report = await c.readInventory(LOOKUP);
    assert.equal(calls, 3);
    assert.equal(report.state, 'unknown');
    assert.equal(report.reason, reason);
    assert.deepEqual(report.requests, { authentication: 0, inventory: 1 });
    assert.equal(report.inventory, null);
  });
});

test('inventory PID input, variants, country rows and total report bytes are bounded', async () => {
  let calls = 0;
  const invalid = await client(async () => { calls++; throw new Error('must not run'); })
    .readInventory({ productSku: 'CJSN1392391' });
  assert.equal(calls, 0);
  assert.equal(invalid.reason, 'invalid_pid_lookup');

  const variants = Array.from({ length: 60 }, (_, variantIndex) => ({
    vid: String(8000000000000000000n + BigInt(variantIndex)),
    inventory: Array.from({ length: 30 }, (_, countryIndex) => ({
      countryCode: countryIndex % 2 ? 'CN' : 'DE', totalInventory: countryIndex,
      cjInventory: countryIndex, factoryInventory: countryIndex, verifiedWarehouse: 2
    }))
  }));
  calls = 0;
  const c = client(async () => ++calls === 1 ? authResponse()
    : calls === 2 ? productResponse() : inventoryResponse(variants));
  assert.equal((await c.readProduct(LOOKUP)).state, 'product_identity_verified');
  const report = await c.readInventory(LOOKUP);
  assert.equal(calls, 3);
  assert.equal(report.state, 'inventory_returned');
  assert.equal(report.inventory.variants.reported, 60);
  assert.equal(report.inventory.variants.returned, 50);
  assert.equal(report.inventory.variants.partial, true);
  assert.ok(report.inventory.variants.countryRowsReturned <= CJ_READ_LIMITS.MAX_INVENTORY_COUNTRY_ROWS);
  assert.ok(report.inventory.variants.records.every(record => record.countries.returned
    <= CJ_READ_LIMITS.MAX_COUNTRIES_PER_VARIANT));
  assert.ok(Buffer.byteLength(JSON.stringify(report), 'utf8') <= CJ_READ_LIMITS.MAX_INVENTORY_REPORT_BYTES);

  const duplicateAfterLimit = Array.from({ length: 51 }, (_, index) => ({
    vid: index === 50 ? '8000000000000000000' : String(8000000000000000000n + BigInt(index)),
    inventory: [{ countryCode: 'CN', totalInventory: index, cjInventory: 0,
      factoryInventory: index, verifiedWarehouse: 1 }]
  }));
  calls = 0;
  const duplicateClient = client(async () => ++calls === 1 ? authResponse()
    : calls === 2 ? productResponse() : inventoryResponse(duplicateAfterLimit));
  assert.equal((await duplicateClient.readProduct(LOOKUP)).state, 'product_identity_verified');
  const duplicateReport = await duplicateClient.readInventory(LOOKUP);
  assert.equal(calls, 3);
  assert.equal(duplicateReport.state, 'unknown');
  assert.equal(duplicateReport.reason, 'malformed_inventory_data');
  assert.equal(duplicateReport.inventory, null);
});

test('inventory points fields are independently numbers or unknown and countries are never added', async () => {
  let calls = 0;
  const c = client(async () => ++calls === 1 ? authResponse() : calls === 2 ? productResponse()
    : inventoryResponse([{ vid: '9876543210123456789', inventory: [
      { countryCode: 'CN', totalInventory: 2, cjInventory: 1, factoryInventory: 1, verifiedWarehouse: 1 },
      { countryCode: 'CN', totalInventory: 3, cjInventory: 1, factoryInventory: 2, verifiedWarehouse: 2 }
    ] }], { total: 70000, usedToday: '1', remaining: 0 }));
  assert.equal((await c.readProduct(LOOKUP)).state, 'product_identity_verified');
  const report = await c.readInventory(LOOKUP);
  assert.equal(report.inventory.variants.records[0].countries.records.length, 2);
  assert.deepEqual(report.inventory.variants.records[0].countries.records.map(row => row.totalInventory), [2, 3]);
  assert.deepEqual(report.inventory.pointsInfo,
    { state: 'partial', total: 70000, usedToday: null, remaining: 0 });
});

test('inventory timeout and oversized response stay unknown without retry', async t => {
  await t.test('timeout', async () => {
    let calls = 0;
    const c = client(async () => {
      calls++;
      if (calls === 1) return authResponse();
      if (calls === 2) return productResponse();
      const error = new Error('synthetic timeout'); error.name = 'TimeoutError'; throw error;
    });
    assert.equal((await c.readProduct(LOOKUP)).state, 'product_identity_verified');
    const report = await c.readInventory(LOOKUP);
    assert.equal(calls, 3);
    assert.equal(report.reason, 'timeout');
    assert.deepEqual(report.requests, { authentication: 0, inventory: 1 });
  });
  await t.test('oversized', async () => {
    let calls = 0;
    const c = client(async () => ++calls === 1 ? authResponse() : calls === 2 ? productResponse()
      : new Response('x'.repeat(CJ_READ_LIMITS.BODY_LIMIT + 1)));
    assert.equal((await c.readProduct(LOOKUP)).state, 'product_identity_verified');
    const report = await c.readInventory(LOOKUP);
    assert.equal(calls, 3);
    assert.equal(report.reason, 'response_too_large');
    assert.deepEqual(report.requests, { authentication: 0, inventory: 1 });
  });
});
