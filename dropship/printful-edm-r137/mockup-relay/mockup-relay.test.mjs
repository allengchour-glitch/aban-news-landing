import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockupRelay, RelayError, WindowLimiter } from './mockup-relay.mjs';

const rule = { provider: 'printful', mockupEligible: true,
  shopifyHandle: 'keramik-tasse-selbst-gestalten', shopifyVariantId: 101,
  printfulProductId: 19, printfulVariantId: 1320,
  placements: [{ id: 'default', width: 2700, height: 1050 }] };
const base = { requestId: 'luxe-mockup-12345678', subjectId: 'session-1',
  origin: 'https://luxestyle.ch', handle: 'keramik-tasse-selbst-gestalten', shopifyVariantId: 101,
  files: [{ placement: 'default', imageUrl: 'https://cdn.shopify.com/design.png',
    sha256: 'a'.repeat(64), uploadReceipt: 'signed-upload-receipt',
    position: { area_width: 2700, area_height: 1050, width: 900, height: 900, top: 75, left: 900 } }] };

function setup({ responses = [], limiter, pollLimiter, persistPreview,
  customRule = rule, storeId = 18288470, verifyUploadReceipt } = {}) {
  let now = 1_800_000_000_000;
  const calls = [];
  const relay = createMockupRelay({
    resolveVariant: async ({ shopifyHandle, shopifyVariantId }) =>
      customRule?.shopifyHandle === shopifyHandle && customRule?.shopifyVariantId === shopifyVariantId ? customRule : null,
    transport: async request => { calls.push(structuredClone(request)); const response = responses.shift();
      if (response instanceof Error) throw response; return response; },
    credentialProvider: async () => ({ accessToken: 'secret-token', storeId }),
    verifyUploadReceipt: verifyUploadReceipt ?? (async ({ imageUrl, sha256 }) => ({ imageUrl, sha256 })),
    limiter, pollLimiter, persistPreview, clock: () => now });
  return { relay, calls, tick: ms => { now += ms; } };
}
async function hasCode(promise, wanted) {
  await assert.rejects(promise, error => error instanceof RelayError && error.code === wanted);
}

test('Serveradapter sind Pflicht', () => {
  assert.throws(() => createMockupRelay({}), error => error.code === 'SERVER_ADAPTER_MISSING');
});

test('Produkt, Variante und Druckfläche brauchen eine positive Freigabe', async () => {
  const one = setup(); await hasCode(one.relay.create({ ...base, handle: 'fremd' }), 'PRODUCT_MAPPING_BLOCKED');
  const two = setup(); await hasCode(two.relay.create({ ...base, shopifyVariantId: 999 }), 'PRODUCT_MAPPING_BLOCKED');
  const three = setup(); await hasCode(three.relay.create({ ...base,
    files: [{ ...base.files[0], placement: 'front' }] }), 'PLACEMENT_BLOCKED');
  assert.equal(one.calls.length + two.calls.length + three.calls.length, 0);
});

test('fehlende Resolver-Zuordnung bleibt begrenzt und ruft Upstream nicht auf', async () => {
  const { relay, calls } = setup({ customRule: null });
  await hasCode(relay.create(base), 'PRODUCT_MAPPING_BLOCKED');
  assert.equal(calls.length, 0);
});

test('Designhost und Geometrie werden serverseitig begrenzt', async () => {
  const one = setup(); await hasCode(one.relay.create({ ...base,
    files: [{ ...base.files[0], imageUrl: 'https://example.org/a.png' }] }), 'DESIGN_URL_INVALID');
  const two = setup(); await hasCode(two.relay.create({ ...base,
    files: [{ ...base.files[0], position: { ...base.files[0].position, left: 2000 } }] }), 'PRINT_POSITION_INVALID');
});

test('Upload-Quittung bindet Adresse und SHA-256', async () => {
  const one = setup();
  await hasCode(one.relay.create({ ...base, files: [{ ...base.files[0], sha256: 'x' }] }), 'UPLOAD_RECEIPT_INVALID');
  const two = setup({ verifyUploadReceipt: async ({ sha256 }) => ({
    imageUrl: 'https://cdn.shopify.com/anderes.png', sha256 }) });
  await hasCode(two.relay.create(base), 'UPLOAD_RECEIPT_INVALID');
  assert.equal(one.calls.length + two.calls.length, 0);
});

test('Create nutzt festen Printful-Endpunkt und gibt kein Token aus', async () => {
  const { relay, calls } = setup({ responses: [{ status: 200, data: { result: { task_key: 'task_12345678' } } }] });
  const out = await relay.create(base);
  assert.equal(out.status, 'submitted'); assert.equal(out.checkoutReady, false);
  assert.equal(calls[0].url, 'https://api.printful.com/mockup-generator/create-task/19');
  assert.deepEqual(calls[0].body.variant_ids, [1320]);
  assert.equal(calls[0].headers['X-PF-Store-Id'], '18288470');
  assert.equal(JSON.stringify(out).includes('secret-token'), false);
});

test('identischer Request ist idempotent; anderer Inhalt kollidiert', async () => {
  const { relay, calls } = setup({ responses: [{ status: 200, result: { task_key: 'task_12345678' } }] });
  const first = await relay.create(base); assert.deepEqual(await relay.create(base), first);
  await hasCode(relay.create({ ...base, files: [{ ...base.files[0], position: {
    ...base.files[0].position, left: 901 } }] }), 'REQUEST_CONFLICT');
  assert.equal(calls.length, 1);
});

test('gleicher Design-SHA und gleiche Variante werden auch mit neuer Request-ID dedupliziert', async () => {
  const { relay, calls } = setup({ responses: [{ status: 200, result: { task_key: 'task_12345678' } }] });
  const first = await relay.create(base);
  const duplicate = await relay.create({ ...base, requestId: 'luxe-mockup-87654321' });
  assert.equal(duplicate.requestId, first.requestId);
  assert.equal(calls.length, 1);
});

test('Printful-Store-Identität wird vor jedem Upstream-Aufruf gegengeprüft', async () => {
  const { relay, calls } = setup({ storeId: 999 });
  await hasCode(relay.create(base), 'CREATE_UNCERTAIN');
  assert.equal(calls.length, 0);
});

test('Unicode-Markenhandle wird nicht pauschal abgewiesen', async () => {
  const marked = { ...rule, shopifyHandle: 'hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten' };
  const { relay, calls } = setup({ customRule: marked,
    responses: [{ status: 200, result: { task_key: 'task_12345678' } }] });
  await relay.create({ ...base, handle: marked.shopifyHandle });
  assert.equal(calls.length, 1);
});

test('unklarer Create-Ausgang wird nie blind wiederholt', async () => {
  const { relay, calls } = setup({ responses: [new Error('network')] });
  await hasCode(relay.create(base), 'CREATE_UNCERTAIN');
  await hasCode(relay.create(base), 'REQUEST_UNCERTAIN');
  assert.equal(calls.length, 1);
});

test('Herkunft wird exakt geprüft', async () => {
  const { relay, calls } = setup();
  await hasCode(relay.create({ ...base, origin: 'https://www.luxestyle.ch' }), 'ORIGIN_BLOCKED');
  assert.equal(calls.length, 0);
});

test('globale und sitzungsbezogene Drosselung greifen vor POST', async () => {
  const session = setup({ responses: [{ status: 200, result: { task_key: 'task_12345678' } }],
    limiter: new WindowLimiter({ globalMax: 6, subjectMax: 1 }) });
  await session.relay.create(base);
  await hasCode(session.relay.create({ ...base, requestId: 'luxe-mockup-87654321',
    files: [{ ...base.files[0], sha256: 'b'.repeat(64) }] }), 'LIMIT_SESSION');
  assert.equal(session.calls.length, 1);
  const global = setup({ responses: [{ status: 200, result: { task_key: 'task_12345678' } }],
    limiter: new WindowLimiter({ globalMax: 1, subjectMax: 5 }) });
  await global.relay.create(base);
  await hasCode(global.relay.create({ ...base, requestId: 'luxe-mockup-87654321', subjectId: 'session-2',
    files: [{ ...base.files[0], sha256: 'b'.repeat(64) }] }), 'LIMIT_GLOBAL');
  assert.equal(global.calls.length, 1);
});

test('vor zehn Sekunden wird nicht gepollt', async () => {
  const { relay, calls } = setup({ responses: [{ status: 200, result: { task_key: 'task_12345678' } }] });
  await relay.create(base); const out = await relay.poll(base);
  assert.equal(out.status, 'submitted'); assert.equal(calls.length, 1);
});

test('pending plant nur eine spätere GET-Abfrage', async () => {
  const { relay, calls, tick } = setup({ responses: [
    { status: 200, result: { task_key: 'task_12345678' } },
    { status: 200, result: { status: 'pending' } }] });
  await relay.create(base); tick(10_000); const out = await relay.poll(base);
  assert.equal(out.status, 'submitted'); assert.equal(calls[1].method, 'GET');
  assert.match(calls[1].url, /task\?task_key=task_12345678$/);
});

test('Poll-Gesamtfrist beendet eine hängende Aufgabe ohne weiteres GET', async () => {
  const { relay, calls, tick } = setup({ responses: [
    { status: 200, result: { task_key: 'task_12345678' } }] });
  await relay.create(base); tick(120_001);
  await hasCode(relay.poll(base), 'POLL_DEADLINE');
  assert.equal(calls.length, 1);
});

test('GET-Drosselung schützt den geteilten Store', async () => {
  const { relay, calls, tick } = setup({ responses: [
    { status: 200, result: { task_key: 'task_12345678' } },
    { status: 200, result: { status: 'pending' } }],
    pollLimiter: new WindowLimiter({ globalMax: 1, subjectMax: 1, subjectWindowMs: 60_000 }) });
  await relay.create(base); tick(10_000); await relay.poll(base); tick(3_000);
  await hasCode(relay.poll(base), 'LIMIT_GLOBAL');
  assert.equal(calls.length, 2);
});

test('fertiges Ergebnis ohne Persistenz bleibt ausdrücklich temporär', async () => {
  const { relay, tick } = setup({ responses: [
    { status: 200, result: { task_key: 'task_12345678' } },
    { status: 200, result: { status: 'completed', mockups: [{ placement: 'default',
      variant_ids: [1320], mockup_url: 'https://files.cdn.printful.com/a.jpg' }] } }] });
  await relay.create(base); tick(10_000); const out = await relay.poll(base);
  assert.equal(out.status, 'completed-temporary'); assert.equal(out.temporary, true);
  assert.equal(out.persistenceRequired, true); assert.equal(out.preview.sourceExpiresAt, 'unknown');
});

test('Persistenzadapter liefert erst den dauerhaften Zustand', async () => {
  const { relay, tick } = setup({ responses: [
    { status: 200, result: { task_key: 'task_12345678' } },
    { status: 200, result: { status: 'completed', mockups: [{ placement: 'default',
      variant_ids: [1320], mockup_url: 'https://files.cdn.printful.com/a.jpg' }] } }],
    persistPreview: async ({ preview }) => ({ mockups: preview.mockups.map(item => ({ ...item,
      url: 'https://cdn.shopify.com/dauerhaft.jpg' })) }) });
  await relay.create(base); tick(10_000); const out = await relay.poll(base);
  assert.equal(out.status, 'completed'); assert.equal(out.temporary, false);
  assert.equal(out.preview.mockups[0].url, 'https://cdn.shopify.com/dauerhaft.jpg');
});

test('Persistenzadapter darf keinen fremden Zielhost einschleusen', async () => {
  const { relay, tick } = setup({ responses: [
    { status: 200, result: { task_key: 'task_12345678' } },
    { status: 200, result: { status: 'completed', mockups: [{ placement: 'default',
      variant_ids: [1320], mockup_url: 'https://files.cdn.printful.com/a.jpg' }] } }],
    persistPreview: async () => ({ mockups: [{ url: 'https://example.org/fremd.jpg' }] }) });
  await relay.create(base); tick(10_000);
  await hasCode(relay.poll(base), 'POLL_UNCERTAIN');
});

test('unklarer Poll-Ausgang wird nicht nochmals abgefragt', async () => {
  const { relay, calls, tick } = setup({ responses: [
    { status: 200, result: { task_key: 'task_12345678' } }, new Error('network')] });
  await relay.create(base); tick(10_000);
  await hasCode(relay.poll(base), 'POLL_UNCERTAIN');
  await hasCode(relay.poll(base), 'REQUEST_UNCERTAIN');
  assert.equal(calls.length, 2);
});
