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
    assert.deepEqual(response.result.serverInfo, { name: 'luxestyle-claude-assist', version: '2.4.0' });
  }
  const [response] = await exchange([request(2, 'initialize', { protocolVersion: 'unknown' })]);
  assert.equal(response.result.protocolVersion, '2025-06-18');
});

test('tool catalog is bounded, advertises local writes, and ping is empty', async () => {
  const responses = await exchange([request('list', 'tools/list') + '\n' + request('ping', 'ping') + '\n']);
  const tools = responses[0].result.tools;
  assert.equal(tools.length, 10);
  assert.deepEqual(tools.map(tool => tool.name), ['luxe_doctor', 'luxe_checks', 'luxe_handoff_read', 'luxe_handoff_save', 'luxe_review_request',
    'luxe_change_plan', 'luxe_review_list', 'luxe_review_get', 'luxe_review_answer', 'luxe_context']);
  for (const tool of tools) assert.equal(tool.inputSchema.additionalProperties, false);
  for (const name of ['luxe_handoff_save', 'luxe_review_request', 'luxe_review_answer']) assert.equal(tools.find(tool => tool.name === name).annotations.readOnlyHint, false);
  for (const name of ['luxe_change_plan', 'luxe_review_list', 'luxe_review_get', 'luxe_context']) assert.equal(tools.find(tool => tool.name === name).annotations.readOnlyHint, true);
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

test('handoff source pins are optional, bounded and forwarded without widening arguments', async () => {
  const [catalog]=await exchange([request(1,'tools/list')+'\n']);
  const schema=catalog.result.tools.find(t=>t.name==='luxe_handoff_save').inputSchema;
  assert.equal(schema.properties.files.maxItems,6);assert.equal(schema.properties.files.items.maxLength,512);
  assert.deepEqual(schema.required,['summary','nextStep']);
  const note={summary:'Geprüfter Stand.',nextStep:'Weiter prüfen.'},seen=[];
  const valid=[note,{...note,files:[]},{...note,files:['automation/lib/claude_assist.mjs']}];
  const invalid=[{files:null},{files:'file'},{files:Array(7).fill('file')},{files:[' ']},{files:[3]},
    {files:['x'.repeat(513)]},{files:[],publish:true}].map(p=>({...note,...p}));
  const responses=await exchange([...valid,...invalid].map((arguments_,id)=>request(id,'tools/call',{name:'luxe_handoff_save',arguments:arguments_})+'\n'),{
    luxe_handoff_save:args=>{seen.push(args);return {saved:true};}
  });
  assert.deepEqual(seen,valid);assert.ok(responses.slice(0,valid.length).every(r=>r.result.isError===false));
  assert.ok(responses.slice(valid.length).every(r=>r.error?.code===-32602));
});

test('commit planning schema requires exactly an empty input or a complete pinned pair', async () => {
  const [response] = await exchange([request(1, 'tools/list') + '\n']);
  const tools = response.result.tools;
  const planner = tools.find(tool => tool.name === 'luxe_change_plan');
  assert.equal(tools.length, 10);
  assert.deepEqual(planner.inputSchema, {
    type: 'object',
    properties: {
      baseCommit: { type: 'string', minLength: 40, maxLength: 40, pattern: '^[a-fA-F0-9]{40}$' },
      headCommit: { type: 'string', minLength: 40, maxLength: 40, pattern: '^[a-fA-F0-9]{40}$' }
    },
    additionalProperties: false,
    oneOf: [{ maxProperties: 0 }, { required: ['baseCommit', 'headCommit'] }]
  });
  assert.deepEqual(planner.annotations, { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });
  assert.match(planner.description, /keine Tests, kein Checkout und kein Fetch/);
  const checks = tools.find(tool => tool.name === 'luxe_checks');
  assert.deepEqual(checks.inputSchema, { type: 'object', properties: { suite: { type: 'string', enum: ['core', 'seo', 'assist', 'changed'] } }, required: ['suite'], additionalProperties: false });
  assert.deepEqual(checks.annotations, planner.annotations);
});

test('commit planning forwards empty and full immutable pins exactly once without altering checks', async () => {
  const pair = { baseCommit: 'a1'.repeat(20), headCommit: 'B2'.repeat(20) };
  const cases = [
    { name: 'luxe_change_plan' },
    { name: 'luxe_change_plan', arguments: {} },
    { name: 'luxe_change_plan', arguments: pair },
    { name: 'luxe_checks', arguments: { suite: 'changed' } }
  ];
  const seen = [];
  const handlers = Object.fromEntries(['luxe_change_plan', 'luxe_checks'].map(name => [name, args => {
    seen.push({ name, args }); return { local: true, args };
  }]));
  const responses = await exchange(cases.map((params, id) => request(id, 'tools/call', params) + '\n'), handlers);
  assert.deepEqual(seen, [
    { name: 'luxe_change_plan', args: {} },
    { name: 'luxe_change_plan', args: {} },
    { name: 'luxe_change_plan', args: pair },
    { name: 'luxe_checks', args: { suite: 'changed' } }
  ]);
  assert.ok(responses.every(response => response.result.isError === false));
  assert.deepEqual(JSON.parse(responses[2].result.content[0].text).args, pair);
});

test('partial, mutable, short, malformed and additional commit pins never reach a handler', async () => {
  const pair = { baseCommit: 'a'.repeat(40), headCommit: 'b'.repeat(40) };
  const badPins = ['', ' ', 'HEAD', 'main', 'origin/main', 'HEAD~1', 'a'.repeat(39), 'a'.repeat(41),
    'a'.repeat(64), 'g'.repeat(40), 'a'.repeat(39) + '\n', 'a'.repeat(40) + '\n', '--help', 'a'.repeat(40) + '^{commit}',
    null, 42, true, [], {}];
  const invalid = [
    { baseCommit: pair.baseCommit }, { headCommit: pair.headCommit }, { ...pair, extra: true },
    { ...pair, suite: 'changed' }, { ...pair, fetch: true }, { files: [] },
    ...badPins.flatMap(value => [{ ...pair, baseCommit: value }, { ...pair, headCommit: value }]),
    null, [], true
  ];
  let calls = 0;
  const responses = await exchange([
    ...invalid.map((args, id) => request(id, 'tools/call', { name: 'luxe_change_plan', arguments: args }) + '\n'),
    request('checks-reject-pins', 'tools/call', { name: 'luxe_checks', arguments: { suite: 'changed', ...pair } }) + '\n',
    request('after', 'ping') + '\n'
  ], { luxe_change_plan: () => { calls++; }, luxe_checks: () => { calls++; } });
  assert.equal(calls, 0);
  assert.equal(responses.length, invalid.length + 2);
  assert.ok(responses.slice(0, -1).every(response => response.error?.code === -32602));
  assert.equal(responses.at(-1).id, 'after');
  assert.deepEqual(responses.at(-1).result, {});
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
  for (const event of ['drain', 'close', 'error']) assert.equal(output.listenerCount(event), 0);
});

test('output closing before drain rejects promptly and removes transport listeners', { timeout: 1000 }, async () => {
  const input = new PassThrough();
  const output = new Writable({ highWaterMark: 1, write() { this.destroy(); } });
  const done = serveMcp({ input, output });
  const rejected = assert.rejects(done, { message: 'MCP-Ausgabe geschlossen oder fehlgeschlagen.' });
  input.end(request(1, 'ping') + '\n');
  await rejected;
  for (const event of ['drain', 'close', 'error']) assert.equal(output.listenerCount(event), 0);
});

test('already destroyed or ended output is rejected before handlers or writes', { timeout: 1000 }, async () => {
  for (const close of [output => output.destroy(), output => output.end()]) {
    const input = new PassThrough();
    let calls = 0, writes = 0;
    const output = new Writable({ write(chunk, encoding, callback) { writes++; callback(); } });
    close(output);
    input.end(request(1, 'tools/call', { name: 'luxe_doctor' }) + '\n');
    await assert.rejects(serveMcp({ input, output, handlers: { luxe_doctor: () => { calls++; } } }),
      { message: 'MCP-Ausgabe geschlossen oder fehlgeschlagen.' });
    assert.equal(calls, 0); assert.equal(writes, 0);
    for (const event of ['drain', 'close', 'error']) assert.equal(output.listenerCount(event), 0);
  }
});

test('asynchronous write errors reject with a static error and no retained listeners', { timeout: 1000 }, async () => {
  for (const highWaterMark of [1, 65536]) {
    const input = new PassThrough();
    const output = new Writable({ highWaterMark, write(chunk, encoding, callback) {
      setImmediate(() => callback(Error('sensitive transport diagnostic')));
    } });
    const done = serveMcp({ input, output });
    const rejected = assert.rejects(done, { message: 'MCP-Ausgabe geschlossen oder fehlgeschlagen.' });
    input.end(request(1, 'ping') + '\n');
    await rejected;
    for (const event of ['drain', 'close', 'error']) assert.equal(output.listenerCount(event), 0);
  }
});

test('destroy with an error during write is handled without a late uncaught error', { timeout: 1000 }, async () => {
  const input = new PassThrough();
  const output = new Writable({ highWaterMark: 1, write() { this.destroy(Error('private disconnect')); } });
  const done = serveMcp({ input, output });
  const rejected = assert.rejects(done, { message: 'MCP-Ausgabe geschlossen oder fehlgeschlagen.' });
  input.end(request(1, 'ping') + '\n');
  await rejected;
  await new Promise(resolve => setImmediate(resolve));
  for (const event of ['drain', 'close', 'error']) assert.equal(output.listenerCount(event), 0);
});

test('a disconnect while a handler yields prevents writing a response', { timeout: 1000 }, async () => {
  const input = new PassThrough();
  let writes = 0;
  const output = new Writable({ write(chunk, encoding, callback) { writes++; callback(); } });
  const done = serveMcp({ input, output, handlers: { luxe_doctor: async () => {
    output.destroy(Error('private disconnect'));
    await new Promise(resolve => setImmediate(resolve));
    return { done: true };
  } } });
  const rejected = assert.rejects(done, { message: 'MCP-Ausgabe geschlossen oder fehlgeschlagen.' });
  input.end(request(1, 'tools/call', { name: 'luxe_doctor' }) + '\n');
  await rejected;
  assert.equal(writes, 0);
  for (const event of ['drain', 'close', 'error']) assert.equal(output.listenerCount(event), 0);
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

test('v2 advertises strict bounded schemas and preserves existing check profiles', async () => {
  const [response] = await exchange([request(1, 'tools/list') + '\n']);
  const byName = Object.fromEntries(response.result.tools.map(tool => [tool.name, tool]));
  assert.deepEqual(byName.luxe_checks.inputSchema.properties.suite.enum, ['core', 'seo', 'assist', 'changed']);
  assert.deepEqual(byName.luxe_review_answer.inputSchema.required, ['requestId', 'verdict', 'summary', 'nextStep']);
  assert.deepEqual(byName.luxe_review_answer.inputSchema.properties.verdict.enum, ['findings', 'no_findings', 'blocked']);
  assert.equal(byName.luxe_review_answer.inputSchema.properties.requestId.maxLength, 80);
  assert.equal(byName.luxe_review_answer.inputSchema.properties.summary.maxLength, 4000);
  assert.equal(byName.luxe_review_answer.inputSchema.properties.nextStep.maxLength, 2000);
  assert.equal(byName.luxe_review_answer.inputSchema.properties.blockers.maxItems, 12);
  assert.equal(byName.luxe_review_answer.inputSchema.properties.blockers.items.maxLength, 500);
  assert.deepEqual(byName.luxe_context.inputSchema.required, ['files', 'question']);
  assert.equal(byName.luxe_context.inputSchema.properties.question.maxLength, 2000);
  assert.equal(byName.luxe_context.inputSchema.properties.files.maxItems, 6);
  assert.equal(byName.luxe_context.inputSchema.properties.files.items.maxLength, 512);
  assert.equal(byName.luxe_review_list.inputSchema.properties.after.maxLength, 80);
  assert.equal(byName.luxe_review_list.inputSchema.required, undefined);
  assert.deepEqual(byName.luxe_review_get.inputSchema.required, ['requestId']);
  assert.equal(byName.luxe_review_get.inputSchema.properties.requestId.maxLength, 80);
});

test('v2 tools dispatch exactly once to their injected handler including changed checks', async () => {
  const cases = [
    ['luxe_change_plan', {}], ['luxe_review_list', {}], ['luxe_review_get', { requestId: 'review-1' }],
    ['luxe_review_answer', { requestId: 'review-1', verdict: 'findings', summary: 'Fehler gefunden', nextStep: 'Korrigieren', blockers: [] }],
    ['luxe_context', { files: ['automation/lib/example.mjs'], question: 'Welche Prüfungen passen?' }],
    ['luxe_checks', { suite: 'assist' }],
    ['luxe_checks', { suite: 'changed' }]
  ];
  const seen = [];
  const handlers = Object.fromEntries(cases.map(([name]) => [name, args => { seen.push({ name, args }); return { name, local: true }; }]));
  const responses = await exchange(cases.map(([name, args], id) => request(id, 'tools/call', { name, arguments: args }) + '\n'), handlers);
  assert.deepEqual(seen, cases.map(([name, args]) => ({ name, args })));
  assert.deepEqual(responses.map(response => JSON.parse(response.result.content[0].text).name), cases.map(([name]) => name));
  assert.ok(responses.every(response => response.result.isError === false));
});

test('v2 arguments accept documented limits and all three review verdicts', async () => {
  const answer = { requestId: 'r'.repeat(80), summary: 's'.repeat(4000), nextStep: 'n'.repeat(2000), blockers: Array(12).fill('b'.repeat(500)) };
  const context = { files: Array(6).fill('f'.repeat(512)), question: 'q'.repeat(2000) };
  const cases = ['findings', 'no_findings', 'blocked'].map(verdict => ({ name: 'luxe_review_answer', arguments: { ...answer, verdict } }));
  cases.push({ name: 'luxe_context', arguments: context }, { name: 'luxe_context', arguments: { files: [], question: 'Kontext ohne Dateien' } });
  let calls = 0;
  const responses = await exchange(cases.map((params, id) => request(id, 'tools/call', params) + '\n'), {
    luxe_review_answer: args => { calls++; return args; }, luxe_context: args => { calls++; return args; }
  });
  assert.equal(calls, cases.length);
  assert.ok(responses.every(response => response.result.isError === false));
});

test('v2 rejects missing, oversized, blank and additional arguments before dispatch, then recovers', async () => {
  const answer = { requestId: 'review-1', verdict: 'no_findings', summary: 'Geprüft', nextStep: 'Zur Freigabe' };
  const invalid = [
    { name: 'luxe_change_plan', arguments: { files: [] } },
    { name: 'luxe_review_list', arguments: { status: 'open' } },
    ...Object.keys(answer).map(key => ({ name: 'luxe_review_answer', arguments: Object.fromEntries(Object.entries(answer).filter(([name]) => name !== key)) })),
    ...[
      { requestId: 'r'.repeat(81) }, { requestId: ' ' }, { verdict: 'approved' }, { verdict: 1 },
      { summary: 's'.repeat(4001) }, { summary: '' }, { nextStep: 'n'.repeat(2001) },
      { blockers: Array(13).fill('b') }, { blockers: ['b'.repeat(501)] }, { blockers: [' '] }, { blockers: [false] },
      { extra: true }
    ].map(patch => ({ name: 'luxe_review_answer', arguments: { ...answer, ...patch } })),
    ...[
      { question: 'Frage' }, { files: [] }, { files: 'file', question: 'Frage' },
      { files: Array(7).fill('f'), question: 'Frage' }, { files: ['f'.repeat(513)], question: 'Frage' },
      { files: [' '], question: 'Frage' }, { files: [null], question: 'Frage' },
      { files: [], question: 'q'.repeat(2001) }, { files: [], question: ' ' },
      { files: [], question: 'Frage', exec: 'anything' }
    ].map(args => ({ name: 'luxe_context', arguments: args }))
  ];
  let calls = 0;
  const handlers = Object.fromEntries(['luxe_change_plan', 'luxe_review_list', 'luxe_review_answer', 'luxe_context'].map(name => [name, () => { calls++; }]));
  const responses = await exchange([...invalid.map((params, id) => request(id, 'tools/call', params) + '\n'), request('after', 'ping') + '\n'], handlers);
  assert.equal(calls, 0);
  assert.equal(responses.length, invalid.length + 1);
  assert.ok(responses.slice(0, -1).every(response => response.error?.code === -32602));
  assert.equal(responses.at(-1).id, 'after');
  assert.deepEqual(responses.at(-1).result, {});
});

test('v2 failures remain tool errors and do not interrupt a later context request', async () => {
  const cases = [
    { name: 'luxe_change_plan' },
    { name: 'luxe_review_answer', arguments: { requestId: 'missing', verdict: 'blocked', summary: 'Nicht zuordenbar', nextStep: 'Aufgabe prüfen' } },
    { name: 'luxe_context', arguments: { files: [], question: 'Nächster Schritt?' } }
  ];
  const responses = await exchange(cases.map((params, id) => request(id, 'tools/call', params) + '\n'), {
    luxe_review_answer: () => { throw new Error('Prüfaufgabe nicht gefunden'); },
    luxe_context: () => ({ status: 'ready' })
  });
  assert.deepEqual(responses.map(response => response.result.isError), [true, true, false]);
  assert.match(responses[1].result.content[0].text, /Prüfaufgabe nicht gefunden/);
  assert.deepEqual(JSON.parse(responses[2].result.content[0].text), { status: 'ready' });
});

test('v2 context output is bounded by serialized UTF-8 bytes and does not poison the next request', async () => {
  const params = { name: 'luxe_context', arguments: { files: [], question: 'Kontext' } };
  let calls = 0;
  const responses = await exchange([request(1, 'tools/call', params) + '\n' + request(2, 'tools/call', params) + '\n'], {
    luxe_context: () => ++calls === 1 ? 'ä'.repeat(140000) : { ready: true }
  });
  assert.equal(responses[0].result.isError, true);
  assert.match(responses[0].result.content[0].text, /Ausgabelimit/);
  assert.equal(responses[1].result.isError, false);
  assert.deepEqual(JSON.parse(responses[1].result.content[0].text), { ready: true });
});

test('review list passes a bounded optional cursor and rejects malformed cursors before dispatch', async () => {
  const seen = [];
  const valid = [{}, { after: 'r'.repeat(80) }];
  const invalid = [{ after: '' }, { after: ' ' }, { after: 'r'.repeat(81) }, { after: 2 },
    { after: null }, { after: [], next: true }, { before: 'r' }];
  const responses = await exchange([...valid, ...invalid].map((args, id) => request(id, 'tools/call', { name: 'luxe_review_list', arguments: args }) + '\n'), {
    luxe_review_list: args => { seen.push(args); return { requests: [], nextCursor: null }; }
  });
  assert.deepEqual(seen, valid);
  assert.ok(responses.slice(0, valid.length).every(response => response.result.isError === false));
  assert.ok(responses.slice(valid.length).every(response => response.error?.code === -32602));
});

test('review detail validates its required bounded identity and returns full injected content', async () => {
  const requestId = 'r'.repeat(80), summary = 's'.repeat(4000), nextStep = 'n'.repeat(2000);
  const invalid = [{}, { requestId: '' }, { requestId: ' ' }, { requestId: 'r'.repeat(81) },
    { requestId: null }, { requestId: 7 }, { requestId, file: 'elsewhere' }];
  let calls = 0;
  const responses = await exchange([
    ...invalid.map((args, id) => request(id, 'tools/call', { name: 'luxe_review_get', arguments: args }) + '\n'),
    request('valid', 'tools/call', { name: 'luxe_review_get', arguments: { requestId } }) + '\n'
  ], { luxe_review_get: args => { calls++; return { requestId: args.requestId, question: summary, answer: { summary, nextStep } }; } });
  assert.equal(calls, 1);
  assert.ok(responses.slice(0, invalid.length).every(response => response.error?.code === -32602));
  const last = responses.at(-1);
  assert.equal(last.result.isError, false);
  assert.deepEqual(JSON.parse(last.result.content[0].text), { requestId, question: summary, answer: { summary, nextStep } });
});
