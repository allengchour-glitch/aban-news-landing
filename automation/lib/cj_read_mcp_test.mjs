import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { serveMcp } from './claude_assist_mcp.mjs';
import { CJ_MCP_TOOLS, CJ_MCP_SERVER, CJ_MCP_INSTRUCTIONS,
  validateCjMcpArguments, createCjMcpHandlers } from './cj_read_mcp.mjs';

const request = (id, method, params) => JSON.stringify({ jsonrpc: '2.0', id, method,
  ...(params === undefined ? {} : { params }) });

async function exchange(frames, handlers) {
  const input = new PassThrough();
  const output = new PassThrough();
  let text = '';
  output.on('data', chunk => { text += chunk.toString(); });
  const done = serveMcp({ input, output, handlers, tools: CJ_MCP_TOOLS,
    validateArguments: validateCjMcpArguments, serverInfo: CJ_MCP_SERVER, instructions: CJ_MCP_INSTRUCTIONS });
  for (const frame of frames) input.write(frame);
  input.end(); await done;
  return text.trim().split('\n').filter(Boolean).map(JSON.parse);
}

test('CJ server advertises exactly three bounded read-only tools', async () => {
  const responses = await exchange([
    request(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } }) + '\n',
    request(2, 'tools/list') + '\n'
  ], {});
  assert.deepEqual(responses[0].result.serverInfo, CJ_MCP_SERVER);
  assert.equal(responses[0].result.instructions, CJ_MCP_INSTRUCTIONS);
  const tools = responses[1].result.tools;
  assert.deepEqual(tools.map(tool => tool.name),
    ['luxe_cj_status', 'luxe_cj_product_read', 'luxe_cj_inventory_read']);
  assert.ok(tools.every(tool => tool.annotations.readOnlyHint === true && tool.annotations.destructiveHint === false));
  assert.equal(tools[0].annotations.openWorldHint, false);
  assert.equal(tools[1].annotations.openWorldHint, true);
  assert.equal(tools[1].inputSchema.additionalProperties, false);
  assert.deepEqual(tools[1].inputSchema.oneOf, [{ required: ['pid'] }, { required: ['productSku'] }]);
  assert.deepEqual(tools[2].inputSchema.required, ['pid']);
  assert.deepEqual(Object.keys(tools[2].inputSchema.properties), ['pid']);
  assert.equal(tools[2].inputSchema.additionalProperties, false);
});

test('valid status and product lookups reach only their selected handlers', async () => {
  const seen = [];
  const handlers = {
    luxe_cj_status: args => { seen.push(['status', args]); return { local: true }; },
    luxe_cj_product_read: args => { seen.push(['product', args]); return { state: 'unknown' }; },
    luxe_cj_inventory_read: args => { seen.push(['inventory', args]); return { state: 'unknown' }; }
  };
  const responses = await exchange([
    request(1, 'tools/call', { name: 'luxe_cj_status', arguments: {} }) + '\n',
    request(2, 'tools/call', { name: 'luxe_cj_product_read', arguments: { pid: '1477820492730732544' } }) + '\n',
    request(3, 'tools/call', { name: 'luxe_cj_product_read', arguments: { productSku: 'CJJJJTJT22925' } }) + '\n',
    request(4, 'tools/call', { name: 'luxe_cj_inventory_read', arguments: { pid: '1477820492730732544' } }) + '\n'
  ], handlers);
  assert.deepEqual(seen, [['status', {}], ['product', { pid: '1477820492730732544' }],
    ['product', { productSku: 'CJJJJTJT22925' }], ['inventory', { pid: '1477820492730732544' }]]);
  assert.ok(responses.every(response => response.result.isError === false));
});

test('missing, duplicate, malformed and additional lookup arguments never reach handlers', async () => {
  const invalid = [{}, { pid: '1477820492730732544', productSku: 'CJJJJTJT22925' },
    { pid: '123' }, { pid: '1477820492730732544 ' }, { pid: '1477820492730732544', page: 2 },
    { productSku: '' }, { productSku: '../secret' }, { productSku: 'SKU with space' },
    { productSku: 'x'.repeat(101) }, { variantSku: 'CJ-VARIANT' }, null, [], true];
  let calls = 0;
  const responses = await exchange([
    ...invalid.map((arguments_, id) => request(id, 'tools/call', { name: 'luxe_cj_product_read', arguments: arguments_ }) + '\n'),
    request('status-extra', 'tools/call', { name: 'luxe_cj_status', arguments: { connect: true } }) + '\n',
    ...[{}, { productSku: 'CJJJJTJT22925' }, { pid: '123' },
      { pid: '1477820492730732544', page: 2 }].map((arguments_, id) =>
      request(`inventory-${id}`, 'tools/call', { name: 'luxe_cj_inventory_read', arguments: arguments_ }) + '\n'),
    request('after', 'ping') + '\n'
  ], { luxe_cj_product_read: () => { calls++; }, luxe_cj_inventory_read: () => { calls++; },
    luxe_cj_status: () => { calls++; } });
  assert.equal(calls, 0);
  assert.ok(responses.slice(0, -1).every(response => response.error?.code === -32602));
  assert.deepEqual(responses.at(-1).result, {});
});

test('handler factory preserves the client boundary', async () => {
  const seen = [];
  const handlers = createCjMcpHandlers({ status: () => ({ status: 'local' }),
    readProduct: args => { seen.push(['product', args]); return { state: 'unknown', reason: 'fixture' }; },
    readInventory: args => { seen.push(['inventory', args]); return { state: 'unknown', reason: 'fixture' }; } });
  const status = await handlers.luxe_cj_status({});
  const product = await handlers.luxe_cj_product_read({ pid: '1477820492730732544' });
  const inventory = await handlers.luxe_cj_inventory_read({ pid: '1477820492730732544' });
  assert.deepEqual(status, { status: 'local' });
  assert.deepEqual(product, { state: 'unknown', reason: 'fixture' });
  assert.deepEqual(inventory, { state: 'unknown', reason: 'fixture' });
  assert.deepEqual(seen, [['product', { pid: '1477820492730732544' }],
    ['inventory', { pid: '1477820492730732544' }]]);
  assert.throws(() => createCjMcpHandlers({}), /gültiger CJ-Leseclient/);
});

test('real stdio process handshakes and reports an absent binding without networking', () => {
  const script = fileURLToPath(new URL('../cj-read-mcp.mjs', import.meta.url));
  const env = { ...process.env };
  delete env.CJ_API_KEY; delete env.CJ_EMAIL; delete env.CJ_ACCESS_TOKEN;
  const input = [
    request(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'process-test', version: '1' } }),
    request(2, 'tools/list'),
    request(3, 'tools/call', { name: 'luxe_cj_status', arguments: {} }),
    request(4, 'tools/call', { name: 'luxe_cj_product_read', arguments: { pid: '1477820492730732544' } }),
    request(5, 'tools/call', { name: 'luxe_cj_inventory_read', arguments: { pid: '1477820492730732544' } })
  ].join('\n') + '\n';
  const child = spawnSync(process.execPath, [script], { input, encoding: 'utf8', env, timeout: 10_000 });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, '');
  const responses = child.stdout.trim().split('\n').map(JSON.parse);
  assert.equal(responses.length, 5);
  assert.deepEqual(responses[0].result.serverInfo, CJ_MCP_SERVER);
  assert.equal(responses[1].result.tools.length, 3);
  const status = JSON.parse(responses[2].result.content[0].text);
  const product = JSON.parse(responses[3].result.content[0].text);
  const inventory = JSON.parse(responses[4].result.content[0].text);
  assert.equal(status.credentialBinding, 'missing');
  assert.equal(status.connection, 'unknown_until_product_read');
  assert.equal(product.reason, 'credential_binding_missing');
  assert.deepEqual(product.requests, { authentication: 0, product: 0 });
  assert.equal(inventory.reason, 'credential_binding_missing');
  assert.deepEqual(inventory.requests, { authentication: 0, inventory: 0 });
});

test('project MCP config launches both servers without storing CJ credentials', () => {
  const config = JSON.parse(readFileSync(new URL('../../.mcp.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(config.mcpServers), ['luxestyle-assist', 'luxestyle-cj-read']);
  const cj = config.mcpServers['luxestyle-cj-read'];
  assert.equal(cj.type, 'stdio'); assert.equal(cj.command, 'node');
  assert.ok(!cj.args.includes('--use-env-proxy'));
  assert.match(cj.args.at(-1), /cj-read-mcp\.mjs/);
  const serialized = JSON.stringify(cj);
  assert.ok(!/CJ_API_KEY|CJ_EMAIL|CJ_ACCESS_TOKEN/.test(serialized));
  assert.deepEqual(Object.keys(cj.env).sort(), ['NODE_OPTIONS', 'NODE_PATH', 'NODE_USE_ENV_PROXY']);
  assert.equal(cj.env.NODE_USE_ENV_PROXY, '1');
});

test('the exact configured command performs initialize, list and local status', () => {
  const config = JSON.parse(readFileSync(new URL('../../.mcp.json', import.meta.url), 'utf8'));
  const cj = config.mcpServers['luxestyle-cj-read'];
  const env = { ...process.env, ...cj.env };
  delete env.CJ_API_KEY; delete env.CJ_EMAIL; delete env.CJ_ACCESS_TOKEN;
  const input = [
    request(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'config-test', version: '1' } }),
    request(2, 'tools/list'),
    request(3, 'tools/call', { name: 'luxe_cj_status', arguments: {} })
  ].join('\n') + '\n';
  const child = spawnSync(cj.command, cj.args, { cwd: fileURLToPath(new URL('../../', import.meta.url)),
    input, encoding: 'utf8', env, timeout: 10_000 });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, '');
  const responses = child.stdout.trim().split('\n').map(JSON.parse);
  assert.equal(responses.length, 3);
  assert.deepEqual(responses[0].result.serverInfo, CJ_MCP_SERVER);
  assert.deepEqual(responses[1].result.tools.map(tool => tool.name),
    ['luxe_cj_status', 'luxe_cj_product_read', 'luxe_cj_inventory_read']);
  const status = JSON.parse(responses[2].result.content[0].text);
  assert.equal(status.credentialBinding, 'missing');
  assert.equal(status.connection, 'unknown_until_product_read');
});
