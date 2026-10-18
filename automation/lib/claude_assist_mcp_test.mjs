import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough, Writable } from 'node:stream';
import { serveMcp, MAX_MCP_LINE_BYTES } from './claude_assist_mcp.mjs';

const request = (id, method, params) => JSON.stringify({ jsonrpc: '2.0', id, method, ...(params === undefined ? {} : { params }) });
async function exchange(chunks, handlers = {}) {
  const input = new PassThrough();
  const output = new PassThrough();
  let data = '';
  output.on('data', chunk => { data += chunk.toString(); });
  const done = serveMcp({ input, output, handlers });
  for (const chunk of chunks) input.write(chunk);
  input.end();
  await done;
  return data.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}

test('initialize negotiates supported versions and advertises only tools', async () => {
  for (const protocolVersion of ['2024-11-05', '2025-03-26', '2025-06-18']) {
    const [response] = await exchange([request(1, 'initialize', { protocolVersion, capabilities: {}, clientInfo: { name: 'test', version: '1' } }) + '\n']);
    assert.equal(response.result.protocolVersion, protocolVersion);
    assert.deepEqual(Object.keys(response.result.capabilities), ['tools']);
  }
  const [response] = await exchange([request(2, 'initialize', { protocolVersion: 'unknown' })]);
  assert.equal(response.result.protocolVersion, '2025-06-18');
});

test('tool catalog is bounded, advertises local writes, and ping is empty', async () => {
  const responses = await exchange([request('list', 'tools/list') + '\n' + request('ping', 'ping') + '\n']);
  const tools = responses[0].result.tools;
  assert.equal(tools.length, 5);
  assert.deepEqual(tools.map(tool => tool.name), ['luxe_doctor', 'luxe_checks', 'luxe_handoff_read', 'luxe_handoff_save', 'luxe_review_request']);
  for (const tool of tools) assert.equal(tool.inputSchema.additionalProperties, false);
  for (const name of ['luxe_handoff_save', 'luxe_review_request']) assert.equal(tools.find(tool => tool.name === name).annotations.readOnlyHint, false);
  assert.deepEqual(responses[1].result, {});
});

test('validated arguments reach only the selected injected handler', async () => {
  const seen = [];
  const handlers = { luxe_checks: args => { seen.push(args); return { passed: true }; } };
  const [response] = await exchange([request(5, 'tools/call', { name: 'luxe_checks', arguments: { suite: 'seo' } }) + '\n'], handlers);
  assert.deepEqual(seen, [{ suite: 'seo' }]);
  assert.deepEqual(JSON.parse(response.result.content[0].text), { passed: true });
  assert.equal(response.result.isError, false);
});

test('save and review requests remain injected local operations', async () => {
  const seen = [];
  const handlers = Object.fromEntries(['luxe_handoff_save', 'luxe_review_request'].map(name => [name, args => { seen.push({ name, args }); return { local: true }; }]));
  const responses = await exchange([
    request(1, 'tools/call', { name: 'luxe_handoff_save', arguments: { summary: 'Entwurf', nextStep: 'Prüfen', blockers: ['Quelle offen'] } }) + '\n',
    request(2, 'tools/call', { name: 'luxe_review_request', arguments: { question: 'Bitte prüfen', files: ['automation/test.mjs'] } }) + '\n'
  ], handlers);
  assert.equal(seen.length, 2);
  assert.equal(seen[1].args.question, 'Bitte prüfen');
  assert.ok(responses.every(response => response.result.isError === false));
});

test('unknown and extra arguments cannot invoke handlers', async () => {
  let calls = 0;
  const invalid = [
    { name: 'shell', arguments: { cmd: 'anything' } },
    { name: 'luxe_checks', arguments: { suite: 'all' } },
    { name: 'luxe_checks', arguments: { suite: 'core', cmd: 'anything' } },
    { name: 'luxe_doctor', arguments: { path: '/etc' } },
    { name: 'luxe_handoff_read', arguments: [] },
    { name: 'luxe_handoff_save', arguments: { summary: '  ', nextStep: 'next' } },
    { name: 'luxe_handoff_save', arguments: { summary: 'okay', nextStep: 'next', blockers: [7] } },
    { name: 'luxe_handoff_save', arguments: { summary: 'okay', nextStep: 'next', blockers: Array(13).fill('blocker') } },
    { name: 'luxe_review_request', arguments: { question: 'okay', files: ['a'], extra: true } },
    { name: 'luxe_review_request', arguments: { question: 'okay', files: Array(7).fill('a') } },
    { name: 'luxe_review_request', arguments: { question: 'a'.repeat(4001) } },
    { name: 'luxe_doctor', arguments: {}, extra: true }
  ];
  const responses = await exchange(invalid.map((params, i) => request(i, 'tools/call', params) + '\n'), {
    luxe_checks: () => { calls++; }, luxe_doctor: () => { calls++; },
    luxe_handoff_read: () => { calls++; }, luxe_handoff_save: () => { calls++; }, luxe_review_request: () => { calls++; }
  });
  assert.equal(calls, 0);
  assert.equal(responses.length, invalid.length);
  assert.ok(responses.every(response => response.error?.code === -32602));
});

test('malformed JSON, batches, bad ids and methods return errors, then recover', async () => {
  const responses = await exchange(['{broken}\n[]\n', JSON.stringify({ jsonrpc: '2.0', id: {}, method: 'ping' }) + '\n', request(4, 'unsupported') + '\n', request(5, 'ping') + '\n']);
  assert.deepEqual(responses.map(response => response.error?.code ?? 'ok'), [-32700, -32600, -32600, -32601, 'ok']);
  assert.equal(responses.at(-1).id, 5);
});

test('notifications are silent and never invoke tools', async () => {
  let calls = 0;
  const notifications = [{ jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', method: 'tools/call', params: { name: 'luxe_doctor', arguments: {} } }];
  const responses = await exchange(notifications.map(value => JSON.stringify(value) + '\n'), { luxe_doctor: () => { calls++; } });
  assert.deepEqual(responses, []);
  assert.equal(calls, 0);
});

test('split UTF-8, split frames, CRLF and trailing request are handled', async () => {
  const frame = Buffer.from(request('ä', 'tools/call', { name: 'luxe_handoff_save', arguments: { summary: 'Grüezi', nextStep: 'Prüfen' } }) + '\r\n' + request('last', 'ping'));
  const split = frame.indexOf(Buffer.from('ü')) + 1;
  const responses = await exchange([frame.subarray(0, 7), frame.subarray(7, split), frame.subarray(split)], { luxe_handoff_save: args => args });
  assert.equal(responses[0].id, 'ä');
  assert.equal(JSON.parse(responses[0].result.content[0].text).summary, 'Grüezi');
  assert.equal(responses[1].id, 'last');
});

test('oversized requests are discarded through newline, then next request works', async () => {
  const responses = await exchange([Buffer.alloc(MAX_MCP_LINE_BYTES, 32), Buffer.alloc(200000, 32), '\n', request(7, 'ping') + '\n']);
  assert.equal(responses.length, 2);
  assert.equal(responses[0].error.code, -32600);
  assert.equal(responses[1].id, 7);
  const [atLimit] = await exchange([request(9, 'ping') + ' '.repeat(MAX_MCP_LINE_BYTES - Buffer.byteLength(request(9, 'ping'))) + '\n']);
  assert.equal(atLimit.id, 9);
  assert.deepEqual(atLimit.result, {});
});

test('invalid UTF-8 is a parse error and does not poison next line', async () => {
  const responses = await exchange([Buffer.from([0xff, 10]), request(2, 'ping') + '\n']);
  assert.equal(responses[0].error.code, -32700);
  assert.equal(responses[1].id, 2);
});

test('tool calls are serial even when handler yields', async () => {
  let active = 0;
  let peak = 0;
  const seen = [];
  const responses = await exchange([request(1, 'tools/call', { name: 'luxe_doctor' }) + '\n' + request(2, 'tools/call', { name: 'luxe_doctor' }) + '\n'], {
    luxe_doctor: async () => { active++; peak = Math.max(peak, active); await new Promise(resolve => setImmediate(resolve)); seen.push(active); active--; return { done: true }; }
  });
  assert.equal(peak, 1);
  assert.deepEqual(seen, [1, 1]);
  assert.deepEqual(responses.map(response => response.id), [1, 2]);
});

test('output backpressure is awaited without dropping responses', async () => {
  const input = new PassThrough();
  let data = '';
  const output = new Writable({ highWaterMark: 1, write(chunk, encoding, callback) {
    setImmediate(() => { data += chunk.toString(); callback(); });
  } });
  const done = serveMcp({ input, output, handlers: {} });
  input.end(request(1, 'ping') + '\n' + request(2, 'ping') + '\n');
  await done;
  assert.deepEqual(data.trim().split('\n').map(line => JSON.parse(line).id), [1, 2]);
});

test('missing, failing and unserializable handlers produce tool errors without stack traces', async () => {
  const frames = [request(1, 'tools/call', { name: 'luxe_doctor' }) + '\n'];
  const [missing] = await exchange(frames);
  assert.equal(missing.result.isError, true);
  const [failed] = await exchange(frames, { luxe_doctor: () => { throw new Error('Lokale Datei beschädigt'); } });
  assert.equal(failed.result.isError, true);
  assert.match(failed.result.content[0].text, /Lokale Datei beschädigt/);
  assert.doesNotMatch(failed.result.content[0].text, /at .*mjs/);
  const [huge] = await exchange(frames, { luxe_doctor: () => 'a'.repeat(300000) });
  assert.equal(huge.result.isError, true);
  const cyclic = {}; cyclic.self = cyclic;
  const [cycle] = await exchange(frames, { luxe_doctor: () => cyclic });
  assert.equal(cycle.result.isError, true);
});
