import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lookupFromValues, probeInput, summariseProbe, runConfiguredProbe } from '../cj-read-mcp-probe.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const sha256 = file => createHash('sha256').update(readFileSync(new URL(`../../${file}`, import.meta.url))).digest('hex');

const response = (id, value) => ({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(value) }], isError: false } });
const successOutput = ({ secretText = 'MUST_NOT_LEAK' } = {}) => [
  { jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-06-18', capabilities: { tools: {} },
    serverInfo: { name: 'luxestyle-cj-read', version: '1.0.0' } } },
  { jsonrpc: '2.0', id: 2, result: { tools: [{ name: 'luxe_cj_status' }, { name: 'luxe_cj_product_read' }] } },
  response(3, { credentialBinding: 'bound_unverified', connection: 'unknown_until_product_read' }),
  response(4, { state: 'product_identity_verified', reason: null, requests: { authentication: 1, product: 1 },
    product: { product: { pid: '2601010101010101001', productSku: 'CJSN1392391',
      productNameEn: secretText, bigImage: `https://example.invalid/${secretText}` } } }),
  response(5, { connection: 'verified_by_product_read', lastProductReadState: 'verified' })
].map(JSON.stringify).join('\n') + '\n';

test('probe lookup requires exactly one bounded pid or productSku', () => {
  assert.deepEqual(lookupFromValues('2601010101010101001', ''), { pid: '2601010101010101001' });
  assert.deepEqual(lookupFromValues('', 'CJSN1392391'), { productSku: 'CJSN1392391' });
  for (const values of [['', ''], ['123', ''], ['', '../bad'], ['2601010101010101001', 'CJSN1392391']]) {
    assert.throws(() => lookupFromValues(...values));
  }
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
  assert.equal(result.credentialBinding, 'bound_unverified');
  assert.equal(result.authenticationRequests, 1);
  assert.equal(result.productRequests, 1);
  assert.equal(result.returnedPid, '2601010101010101001');
  assert.equal(result.returnedProductSku, 'CJSN1392391');
  assert.ok(!JSON.stringify(result).includes(marker));
  assert.ok(!JSON.stringify(result).includes('example.invalid'));
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
  const result = runConfiguredProbe({ root: '/repo', env: { CJ_API_KEY: key, CJ_MCP_PRODUCT_SKU: 'CJSN1392391' },
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
  const workflow = readFileSync(new URL('../../.github/workflows/diagnose-actions-zugang.yml', import.meta.url), 'utf8');
  const ci = readFileSync(new URL('../../.github/workflows/luxestyle-assist-tests.yml', import.meta.url), 'utf8');
  assert.match(ci, /sparse-checkout:[\s\S]*\.github\/workflows\/diagnose-actions-zugang\.yml/);
  const start = workflow.indexOf('  cj_mcp:');
  const end = workflow.indexOf('\n  legacy:', start);
  assert.ok(start > 0 && end > start);
  const job = workflow.slice(start, end);
  assert.match(job, /github\.repository|GITHUB_REPOSITORY/);
  assert.match(job, /test "\$APPROVED_COMMIT" = "\$GITHUB_SHA"/);
  assert.match(job, /persist-credentials: false/);
  assert.match(job, /timeout-minutes: 3/);
  assert.match(job, /CJ_API_KEY: \$\{\{ secrets\.CJ_API_KEY \}\}/);
  assert.equal((job.match(/secrets\.CJ_API_KEY/g) || []).length, 1);
  assert.ok(job.indexOf('Commit und geprüfte Dateien gegenlesen') < job.indexOf('secrets.CJ_API_KEY'));
  assert.ok(!/SHOPIFY_|CJ_EMAIL|upload-artifact|retry/i.test(job));
  assert.match(job, /run: node automation\/cj-read-mcp-probe\.mjs/);
  for (const file of ['.mcp.json', 'automation/cj-read-mcp.mjs', 'automation/cj-read-mcp-probe.mjs',
    'automation/lib/claude_assist_mcp.mjs', 'automation/lib/cj_read_mcp.mjs', 'automation/lib/cj_readonly.mjs']) {
    assert.ok(job.includes(`${sha256(file)}  ${file}`), file);
  }
});
