import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { operationFromValue, lookupFromValues, probeInput, summariseProbe,
  runConfiguredProbe } from '../cj-read-mcp-probe.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const sha256 = file => createHash('sha256').update(readFileSync(new URL(`../../${file}`, import.meta.url))).digest('hex');

const response = (id, value) => ({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(value) }], isError: false } });
const successOutput = ({ secretText = 'MUST_NOT_LEAK' } = {}) => [
  { jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-06-18', capabilities: { tools: {} },
    serverInfo: { name: 'luxestyle-cj-read', version: '1.1.0' } } },
  { jsonrpc: '2.0', id: 2, result: { tools: [{ name: 'luxe_cj_status' },
    { name: 'luxe_cj_product_read' }, { name: 'luxe_cj_inventory_read' }] } },
  response(3, { credentialBinding: 'bound_unverified', connection: 'unknown_until_product_read' }),
  response(4, { state: 'product_identity_verified', reason: null, requests: { authentication: 1, product: 1 },
    product: { product: { pid: '2601010101010101001', productSku: 'CJSN1392391',
      productNameEn: secretText, bigImage: `https://example.invalid/${secretText}` } } }),
  response(5, { connection: 'verified_by_product_read', lastProductReadState: 'verified' })
].map(JSON.stringify).join('\n') + '\n';

const inventoryOutput = ({ marker = 'MUST_NOT_LEAK' } = {}) => [
  { jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-06-18', capabilities: { tools: {} },
    serverInfo: { name: 'luxestyle-cj-read', version: '1.1.0' } } },
  { jsonrpc: '2.0', id: 2, result: { tools: [{ name: 'luxe_cj_status' },
    { name: 'luxe_cj_product_read' }, { name: 'luxe_cj_inventory_read' }] } },
  response(3, { credentialBinding: 'bound_unverified', connection: 'unknown_until_product_read' }),
  response(4, { state: 'product_identity_verified', reason: null,
    requests: { authentication: 1, product: 1 }, product: { product: {
      pid: '2601010101010101001', productSku: 'CJSN1392391', productNameEn: marker,
      mainImage: { url: `https://example.invalid/${marker}` }, variants: {
        state: 'supplier_metadata_returned', reported: 2, returned: 2, partial: false, records: [
        { vid: '2601010101010101002', variantSku: 'CJSN1392391-A', variantKey: marker },
        { vid: '2601010101010101003', variantSku: 'CJSN1392391-B' }
      ] } } } }),
  response(5, { state: 'inventory_returned', reason: null,
    requests: { authentication: 0, inventory: 1 }, raw: marker, inventory: {
      pid: '2601010101010101001', variants: {
        state: 'supplier_inventory_returned', reported: 2, returned: 2, partial: false, records: [
        { vid: '2601010101010101002', countries: {
          state: 'supplier_inventory_returned', reported: 2, returned: 2, partial: false, records: [
          { countryCode: 'CN', totalInventory: 0, cjInventory: 0, factoryInventory: 0,
            verifiedWarehouse: 1, supplierNote: marker },
          { countryCode: 'DE', totalInventory: 7, cjInventory: null, factoryInventory: 7,
            verifiedWarehouse: 2 }
        ] } },
        { vid: '2601010101010101003', countries: {
          state: 'unknown', reported: null, returned: 0, partial: false, records: null } }
      ] }, pointsInfo: { remaining: 0, raw: marker } } }),
  response(6, { connection: 'verified_by_product_read', lastProductReadState: 'verified',
    lastInventoryReadState: 'returned' })
].map(JSON.stringify).join('\n') + '\n';

test('probe lookup requires exactly one bounded pid or productSku', () => {
  assert.equal(operationFromValue('inventory'), 'inventory');
  assert.throws(() => operationFromValue('stock'));
  assert.deepEqual(lookupFromValues('2601010101010101001', ''), { pid: '2601010101010101001' });
  assert.deepEqual(lookupFromValues('', 'CJSN1392391'), { productSku: 'CJSN1392391' });
  assert.deepEqual(lookupFromValues('2601010101010101001', '', 'inventory'), { pid: '2601010101010101001' });
  assert.deepEqual(lookupFromValues('0fcca35a-2f9e-4cb3-90ad-8ad9158884e7', ''),
    { pid: '0fcca35a-2f9e-4cb3-90ad-8ad9158884e7' });
  assert.deepEqual(lookupFromValues('0fcca35a-2f9e-4cb3-90ad-8ad9158884e7', '', 'inventory'),
    { pid: '0fcca35a-2f9e-4cb3-90ad-8ad9158884e7' });
  assert.throws(() => lookupFromValues('', 'CJSN1392391', 'inventory'));
  assert.throws(() => lookupFromValues('2601010101010101001', 'CJSN1392391', 'inventory'));
  for (const values of [['', ''], ['123', ''], ['', '../bad'], ['2601010101010101001', 'CJSN1392391']]) {
    assert.throws(() => lookupFromValues(...values));
  }
});

test('inventory probe sends status, one product read, one inventory read and status in one stream', () => {
  const lookup = { pid: '2601010101010101001' };
  const frames = probeInput(lookup, 'inventory').trim().split('\n').map(JSON.parse);
  assert.deepEqual(frames.map(frame => frame.id), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(frames.filter(frame => frame.params?.name === 'luxe_cj_product_read')
    .map(frame => frame.params.arguments), [lookup]);
  assert.deepEqual(frames.filter(frame => frame.params?.name === 'luxe_cj_inventory_read')
    .map(frame => frame.params.arguments), [lookup]);
  assert.equal(frames.filter(frame => frame.params?.name === 'luxe_cj_status').length, 2);
});

test('probe sends one status, exactly one product read, then the status in the same stream', () => {
  const frames = probeInput({ productSku: 'CJSN1392391' }).trim().split('\n').map(JSON.parse);
  assert.equal(frames.length, 5);
  assert.deepEqual(frames.map(frame => frame.id), [1, 2, 3, 4, 5]);
  assert.deepEqual(frames.filter(frame => frame.params?.name === 'luxe_cj_product_read')
    .map(frame => frame.params.arguments), [{ productSku: 'CJSN1392391' }]);
  assert.deepEqual(frames.filter(frame => frame.params?.name === 'luxe_cj_status').length, 2);
});

test('successful output is reduced to the fixed summary without names, urls or raw fields', () => {
  const marker = 'SECRET_OR_SUPPLIER_TEXT_MUST_NOT_LEAK';
  const result = summariseProbe(successOutput({ secretText: marker }), { productSku: 'CJSN1392391' });
  assert.equal(result.verified, true);
  assert.equal(result.operation, 'product');
  assert.equal(result.credentialBinding, 'bound_unverified');
  assert.equal(result.authenticationRequests, 1);
  assert.equal(result.productRequests, 1);
  assert.equal(result.returnedPid, '2601010101010101001');
  assert.equal(result.returnedProductSku, 'CJSN1392391');
  assert.ok(!JSON.stringify(result).includes(marker));
  assert.ok(!JSON.stringify(result).includes('example.invalid'));
});

test('product verification independently binds returned PID and productSku to the requested lookup', () => {
  assert.equal(summariseProbe(successOutput(), { productSku: 'DIFFERENT-SKU' }).verified, false);
  assert.equal(summariseProbe(successOutput(), { pid: '2601010101010101999' }).verified, false);
  const lines = successOutput().trim().split('\n').map(JSON.parse);
  const read = JSON.parse(lines[3].result.content[0].text);
  read.product.product.pid = 'invalid';
  lines[3] = response(4, read);
  const missingPid = summariseProbe(lines.map(JSON.stringify).join('\n') + '\n',
    { productSku: 'CJSN1392391' });
  assert.equal(missingPid.returnedPid, null);
  assert.equal(missingPid.verified, false);
});

test('inventory summary maps SKU to VID, keeps zero and redacts names, URLs and raw data', () => {
  const marker = 'SECRET_OR_SUPPLIER_TEXT_MUST_NOT_LEAK';
  const result = summariseProbe(inventoryOutput({ marker }), { pid: '2601010101010101001' }, 'inventory');
  assert.equal(result.verified, true);
  assert.equal(result.authenticationRequests, 1);
  assert.equal(result.productRequests, 1);
  assert.equal(result.inventoryRequests, 1);
  assert.deepEqual(result.variants, [
    { vid: '2601010101010101002', variantSku: 'CJSN1392391-A', inventoryState: 'returned',
      countries: [
        { countryCode: 'CN', totalInventory: 0, cjInventory: 0, factoryInventory: 0,
          verifiedWarehouse: 1 },
        { countryCode: 'DE', totalInventory: 7, cjInventory: null, factoryInventory: 7,
          verifiedWarehouse: 2 }
      ] },
    { vid: '2601010101010101003', variantSku: 'CJSN1392391-B',
      inventoryState: 'unknown', countries: null }
  ]);
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes(marker));
  assert.ok(!serialized.includes('example.invalid'));
  assert.ok(!serialized.includes('pointsInfo'));
  assert.equal(result.countryAggregation, false);
  assert.equal(result.deliveryToSwitzerland, 'unknown');
});

test('inventory verification requires a complete nonempty exact VID set with a mapped record', () => {
  const base = () => inventoryOutput().trim().split('\n').map(JSON.parse);
  const mutate = change => {
    const lines = base();
    const product = JSON.parse(lines[3].result.content[0].text);
    const inventory = JSON.parse(lines[4].result.content[0].text);
    change(product.product.product.variants, inventory.inventory.variants);
    lines[3] = response(4, product);
    lines[4] = response(5, inventory);
    return summariseProbe(lines.map(JSON.stringify).join('\n') + '\n',
      { pid: '2601010101010101001' }, 'inventory');
  };
  const cases = {
    empty: (product, inventory) => {
      product.reported = 0; product.returned = 0; product.records = [];
      inventory.reported = 0; inventory.returned = 0; inventory.records = [];
    },
    partial: product => {
      product.state = 'partial_supplier_metadata_returned'; product.partial = true;
    },
    foreign: (_product, inventory) => {
      inventory.records[1].vid = '2601010101010101999';
    },
    duplicate: (_product, inventory) => {
      inventory.records[1].vid = inventory.records[0].vid;
    },
    countMismatch: (_product, inventory) => {
      inventory.reported = 1; inventory.returned = 1; inventory.records.pop();
    },
    allUnknown: (_product, inventory) => {
      for (const record of inventory.records) record.countries = {
        state: 'unknown', reported: null, returned: 0, partial: false, records: null };
    },
    emptyMappings: (_product, inventory) => {
      for (const record of inventory.records) record.countries = {
        state: 'supplier_inventory_returned', reported: 0, returned: 0,
        partial: false, records: [] };
    },
    valuesUnknown: (_product, inventory) => {
      for (const record of inventory.records) record.countries = {
        state: 'supplier_inventory_returned', reported: 1, returned: 1,
        partial: false, records: [{ countryCode: 'CN', totalInventory: null,
          cjInventory: null, factoryInventory: null, verifiedWarehouse: 1 }] };
    }
  };
  for (const [name, change] of Object.entries(cases)) {
    const result = mutate(change);
    assert.equal(result.verified, false, name);
  }
});

test('unknown responses stay bounded and cannot turn into a verified connection', () => {
  const lines = successOutput().trim().split('\n').map(JSON.parse);
  lines[3] = response(4, { state: 'unknown', reason: 'authentication_rejected',
    requests: { authentication: 1, product: 0 }, product: null, upstream: 'DO_NOT_PRINT' });
  lines[4] = response(5, { connection: 'unknown_until_product_read', lastProductReadState: 'unknown' });
  const result = summariseProbe(lines.map(JSON.stringify).join('\n') + '\n', { productSku: 'CJSN1392391' });
  assert.equal(result.verified, false);
  assert.equal(result.readReason, 'authentication_rejected');
  assert.equal(result.productRequests, 0);
  assert.ok(!JSON.stringify(result).includes('DO_NOT_PRINT'));
});

test('configured probe uses the exact command and args while returning no key material', () => {
  const key = 'synthetic-key-that-must-never-appear';
  const config = { mcpServers: { 'luxestyle-cj-read': { type: 'stdio', command: 'node',
    args: ['-e', 'safe launcher'], env: { NODE_OPTIONS: '', NODE_PATH: '', NODE_USE_ENV_PROXY: '1' } } } };
  let seen;
  const result = runConfiguredProbe({ root: '/repo', env: { CJ_API_KEY: key,
    CJ_MCP_OPERATION: 'product', CJ_MCP_PRODUCT_SKU: 'CJSN1392391' },
    read: () => JSON.stringify(config), spawn: (command, args, options) => {
      seen = { command, args, options }; return { status: 0, signal: null, stdout: successOutput(), stderr: '' };
    } });
  assert.equal(seen.command, 'node');
  assert.deepEqual(seen.args, ['-e', 'safe launcher']);
  assert.equal(seen.options.cwd, '/repo');
  assert.equal(seen.options.env.CJ_API_KEY, key);
  assert.ok(!JSON.stringify(result).includes(key));
  assert.equal(result.verified, true);
});

test('configured inventory probe passes only PID to one product and one inventory call', () => {
  const config = { mcpServers: { 'luxestyle-cj-read': { type: 'stdio', command: 'node',
    args: ['-e', 'safe launcher'], env: { NODE_OPTIONS: '', NODE_PATH: '', NODE_USE_ENV_PROXY: '1' } } } };
  let frames;
  const result = runConfiguredProbe({ root: '/repo', env: { CJ_API_KEY: 'synthetic-key-that-must-never-appear',
    CJ_MCP_OPERATION: 'inventory', CJ_MCP_PID: '2601010101010101001' },
    read: () => JSON.stringify(config), spawn: (_command, _args, options) => {
      frames = options.input.trim().split('\n').map(JSON.parse);
      return { status: 0, signal: null, stdout: inventoryOutput(), stderr: '' };
    } });
  assert.equal(result.verified, true);
  assert.deepEqual(frames.filter(frame => frame.params?.name === 'luxe_cj_product_read')
    .map(frame => frame.params.arguments), [{ pid: '2601010101010101001' }]);
  assert.deepEqual(frames.filter(frame => frame.params?.name === 'luxe_cj_inventory_read')
    .map(frame => frame.params.arguments), [{ pid: '2601010101010101001' }]);
});

test('configuration cannot inject CJ credentials outside the secret-bound probe process', () => {
  const config = { mcpServers: { 'luxestyle-cj-read': { type: 'stdio', command: 'node', args: ['x'],
    env: { CJ_API_KEY: 'embedded-secret' } } } };
  assert.throws(() => runConfiguredProbe({ root: '/repo', env: { CJ_MCP_PRODUCT_SKU: 'CJSN1392391' },
    read: () => JSON.stringify(config), spawn: () => assert.fail('must not spawn') }), /invalid_mcp_config/);
});

test('real probe process fails closed for a missing or malformed binding without exposing it', () => {
  const script = fileURLToPath(new URL('../cj-read-mcp-probe.mjs', import.meta.url));
  for (const key of [undefined, 'too-short']) {
    const env = { ...process.env, CJ_MCP_PRODUCT_SKU: 'CJSN1392391' };
    if (key === undefined) delete env.CJ_API_KEY; else env.CJ_API_KEY = key;
    const child = spawnSync(process.execPath, [script], { cwd: root, env, encoding: 'utf8', timeout: 10_000 });
    assert.equal(child.status, 1, child.stderr);
    assert.equal(child.stderr, '');
    assert.match(child.stdout, /^CJ_MCP_PROBE=/);
    assert.ok(!child.stdout.includes(String(key)));
    const summary = JSON.parse(child.stdout.trim().slice('CJ_MCP_PROBE='.length));
    assert.equal(summary.verified, false);
    assert.equal(summary.authenticationRequests, 0);
    assert.equal(summary.productRequests, 0);
    assert.match(summary.readReason, /^credential_binding_(?:missing|invalid)$/);
  }
});

test('manual workflow isolates the secret-bound MCP job and pins all executable inputs by hash', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/cj-read-mcp-diagnose.yml', import.meta.url), 'utf8');
  const ci = readFileSync(new URL('../../.github/workflows/luxestyle-assist-tests.yml', import.meta.url), 'utf8');
  assert.match(ci, /sparse-checkout:[\s\S]*\.github\/workflows\/cj-read-mcp-diagnose\.yml/);
  const checkoutPin = 'actions/checkout@11d5960a326750d5838078e36cf38b85af677262';
  const nodePin = 'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020';
  const actionUses = text => [...text.matchAll(/^\s*(?:-\s*)?uses:\s+(\S+)/gm)].map(match => match[1]);
  const expectedActions = [checkoutPin, nodePin].sort();
  assert.ok(ci.includes(checkoutPin));
  assert.ok(ci.includes(nodePin));
  assert.match(ci, /persist-credentials: false/);
  assert.deepEqual(actionUses(ci).sort(), expectedActions);
  assert.ok(actionUses(ci).every(value => /@[0-9a-f]{40}$/.test(value)));
  const start = workflow.indexOf('  cj_mcp:');
  assert.ok(start > 0);
  const job = workflow.slice(start);
  assert.ok(workflow.includes(checkoutPin));
  assert.ok(workflow.includes(nodePin));
  assert.deepEqual(actionUses(workflow).sort(), expectedActions);
  assert.ok(actionUses(workflow).every(value => /@[0-9a-f]{40}$/.test(value)));
  assert.ok(!/\blegacy\b|SHOPIFY_|CJ_EMAIL/.test(workflow));
  assert.match(job, /github\.repository|GITHUB_REPOSITORY/);
  assert.match(job, /test "\$APPROVED_COMMIT" = "\$GITHUB_SHA"/);
  assert.match(job, /persist-credentials: false/);
  assert.match(job, /timeout-minutes: 3/);
  assert.match(job, /CJ_API_KEY: \$\{\{ secrets\.CJ_API_KEY \}\}/);
  assert.equal((job.match(/secrets\.CJ_API_KEY/g) || []).length, 1);
  assert.ok(job.indexOf('Commit und geprüfte Dateien gegenlesen') < job.indexOf('secrets.CJ_API_KEY'));
  assert.ok(!/SHOPIFY_|CJ_EMAIL|upload-artifact|retry/i.test(job));
  assert.match(job, /sha256sum -c -/);
  assert.match(workflow, /operation:[\s\S]*- product[\s\S]*- inventory/);
  assert.match(workflow, /approved_commit:[\s\S]*required: true/);
  assert.match(job, /CJ_MCP_OPERATION: \$\{\{ inputs\.operation \}\}/);
  assert.match(job, /inventory verlangt genau eine PID und kein productSku/);
  assert.match(job, /import \{ isValidCjPid \} from '\.\/automation\/lib\/cj_identity\.mjs'/);
  assert.match(job, /run: node automation\/cj-read-mcp-probe\.mjs/);
  for (const file of ['.mcp.json', 'automation/cj-read-mcp.mjs', 'automation/cj-read-mcp-probe.mjs',
    'automation/lib/claude_assist_mcp.mjs', 'automation/lib/cj_identity.mjs',
    'automation/lib/cj_read_mcp.mjs', 'automation/lib/cj_readonly.mjs']) {
    assert.ok(job.includes(`${sha256(file)}  ${file}`), file);
  }
});

test('the existing Shopify access diagnostic remains a separate workflow', () => {
  const legacy = readFileSync(new URL('../../.github/workflows/diagnose-actions-zugang.yml', import.meta.url), 'utf8');
  const ci = readFileSync(new URL('../../.github/workflows/luxestyle-assist-tests.yml', import.meta.url), 'utf8');
  assert.match(legacy, /name: "Diagnose Actions-Zugang \(Shopify \+ CJ, nur lesen\)"/);
  assert.match(legacy, /SHOPIFY_SHOP/);
  assert.match(legacy, /automation\/diagnose_actions_zugang\.mjs/);
  assert.match(ci, /sparse-checkout:[\s\S]*\.github\/workflows\/diagnose-actions-zugang\.yml/);
});
