import test from 'node:test';
import assert from 'node:assert/strict';

import { createMockupRelay, RelayError } from './mockup-relay.mjs';

const origin = 'https://luxestyle.ch';
const subjectId = 'session-subject-0001';
const handle = 'keramik-tasse-selbst-gestalten';
const shopifyVariantId = 'gid://shopify/ProductVariant/56111111111111';
const requestId = 'luxe-mockup-security-0001';
const imageUrl = 'https://cdn.shopify.com/s/files/1/design.png';
const sha256 = 'a'.repeat(64);

const rule = {
  provider: 'printful',
  mockupEligible: true,
  shopifyHandle: handle,
  shopifyVariantId,
  printfulProductId: 19,
  printfulVariantId: 1320,
  placements: [
    { id: 'front', width: 1000, height: 1000 },
    { id: 'back', width: 1000, height: 1000 },
  ],
};

function file(placement) {
  return {
    placement,
    imageUrl,
    sha256,
    uploadReceipt: `receipt-${placement}`,
    position: { area_width: 1000, area_height: 1000,
      width: 900, height: 900, top: 50, left: 50 },
  };
}

function relay({ transport, credentialProvider = async () => ({
  accessToken: 'printful-test-token', storeId: 18288470,
}), allowedOrigins } = {}) {
  let now = 1_000_000;
  const instance = createMockupRelay({
    resolveVariant: async () => rule,
    transport,
    credentialProvider,
    verifyUploadReceipt: async ({ imageUrl: url, sha256: digest }) => ({ imageUrl: url, sha256: digest }),
    clock: () => now,
    ...(allowedOrigins ? { allowedOrigins } : {}),
  });
  return { instance, advance: milliseconds => { now += milliseconds; } };
}

async function submitAndPoll(mockups, files = [file('front')]) {
  const { instance, advance } = relay({ transport: async request => {
    if (request.method === 'POST') return { status: 200, result: { task_key: 'task_security_0001' } };
    return { status: 200, result: { status: 'completed', mockups } };
  } });
  await instance.create({ requestId, subjectId, origin, handle, shopifyVariantId, files });
  advance(10_000);
  return instance.poll({ requestId, subjectId, origin });
}

test('completed mockup must contain the exact requested Printful variant', async () => {
  await assert.rejects(submitAndPoll([{
    placement: 'front', variant_ids: [9999],
    mockup_url: 'https://files.cdn.printful.com/wrong.jpg',
  }]), error => error instanceof RelayError && error.code === 'POLL_UNCERTAIN');
});

test('completed mockup must cover exactly every requested placement', async () => {
  await assert.rejects(submitAndPoll([{
    placement: 'front', variant_ids: [1320],
    mockup_url: 'https://files.cdn.printful.com/front.jpg',
  }], [file('front'), file('back')]),
  error => error instanceof RelayError && error.code === 'POLL_UNCERTAIN');

  await assert.rejects(submitAndPoll([{
    placement: 'back', variant_ids: [1320],
    mockup_url: 'https://files.cdn.printful.com/back.jpg',
  }]), error => error instanceof RelayError && error.code === 'POLL_UNCERTAIN');
});

test('malformed server token never reaches the transport', async () => {
  let calls = 0;
  const { instance } = relay({
    credentialProvider: async () => ({ accessToken: 'valid-token\r\nX-Evil: yes', storeId: 18288470 }),
    transport: async () => { calls += 1; return { status: 500 }; },
  });
  await assert.rejects(instance.create({
    requestId, subjectId, origin, handle, shopifyVariantId, files: [file('front')],
  }), error => error instanceof RelayError && error.code === 'CREATE_UNCERTAIN');
  assert.equal(calls, 0);
});

test('relay configuration accepts only known LuxeStyle origins', () => {
  assert.throws(() => relay({ transport: async () => ({ status: 500 }),
    allowedOrigins: ['https://attacker.invalid'] }),
  error => error instanceof RelayError && error.code === 'ORIGIN_CONFIG_INVALID');
});
