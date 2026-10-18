import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectReadiness } from './claude_assist_readiness.mjs';

function readyInput() {
  return {
    nodeVersion: 'v22.16.0', configState: 'available',
    config: { mcpServers: { 'luxestyle-assist': { type: 'stdio', command: 'node', args: ['automation/claude-assist.mjs', 'mcp'] } } },
    cliPresent: true, commandPresent: true, lockState: 'absent', repoState: 'matched', historyState: 'available',
  };
}
const check = (result, id) => result.checks.find(item => item.id === id);

test('ready means verified local prerequisites only, with stable ordered checks', () => {
  const result = inspectReadiness(readyInput());
  assert.equal(result.state, 'ready');
  assert.deepEqual(result.checks.map(item => item.id), ['node', 'mcp_config', 'cli', 'slash_command', 'lock', 'repository', 'history']);
  assert(result.checks.every(item => item.state === 'passed'));
  assert.deepEqual(result.nextSteps, []);
  assert.match(check(result, 'mcp_config').reason, /Client-Start ist damit nicht bestätigt/);
});

test('missing input and malformed evidence remain unknown instead of claiming installation', () => {
  for (const input of [undefined, null, [], 'ready', 1, {}]) {
    const result = inspectReadiness(input);
    assert.equal(result.state, 'unknown');
    assert(result.checks.every(item => item.state === 'unknown'));
    assert.equal(result.nextSteps.length, 7);
  }
});

test('supported complete stable Node versions pass and Node below 22 blocks', () => {
  for (const version of ['v22.0.0', '22.12.0', 'v24.1.9', '30.0.0']) {
    assert.equal(inspectReadiness({ ...readyInput(), nodeVersion: version }).state, 'ready', version);
  }
  for (const version of ['v21.7.3', '20.19.0', '0.0.0']) {
    const result = inspectReadiness({ ...readyInput(), nodeVersion: version });
    assert.equal(result.state, 'blocked', version);
    assert.equal(check(result, 'node').state, 'failed');
  }
});

test('invalid, partial, overflowing or prerelease Node versions never pass', () => {
  for (const version of ['v???', 'v22junk', '22', '22.0', 'v022.0.0', 'v22.0.0-rc.1', 'v22.0.0+build', ' v22.0.0', 'v22.0.0\n', '9007199254740992.0.0', '', null, 22, {}, []]) {
    const result = inspectReadiness({ ...readyInput(), nodeVersion: version });
    assert.equal(result.state, 'unknown', String(version));
    assert.equal(check(result, 'node').state, 'unknown');
  }
});

test('config must be currently available even when stale correct data is supplied', () => {
  for (const state of ['missing', 'unreadable', 'invalid', 'unknown', undefined, true]) {
    const result = inspectReadiness({ ...readyInput(), configState: state });
    assert.equal(result.state, 'unknown', String(state));
    assert.equal(check(result, 'mcp_config').state, 'unknown');
  }
});

test('missing configuration and missing helper entries remain unknown', () => {
  for (const config of [undefined, null, {}, { mcpServers: {} }, { mcpServers: { unrelated: { command: 'unrelated' } } }]) {
    const result = inspectReadiness({ ...readyInput(), config });
    assert.equal(result.state, 'unknown');
    assert.equal(check(result, 'mcp_config').state, 'unknown');
  }
});

test('present incorrect helper commands and malformed configuration block', () => {
  const badServers = [null, [], {}, { type: 'http', command: 'node', args: ['automation/claude-assist.mjs', 'mcp'] }, { type: 'stdio', command: 'npx', args: ['automation/claude-assist.mjs', 'mcp'] }, { type: 'stdio', command: 'node', args: ['automation/other.mjs', 'mcp'] }, { type: 'stdio', command: 'node', args: ['automation/claude-assist.mjs', 'doctor'] }, { type: 'stdio', command: 'node', args: ['automation/claude-assist.mjs', 'mcp', '--unsafe'] }, { type: 'stdio', command: 'node', args: 'automation/claude-assist.mjs mcp' }];
  for (const server of badServers) {
    const result = inspectReadiness({ ...readyInput(), config: { mcpServers: { 'luxestyle-assist': server } } });
    assert.equal(result.state, 'blocked');
    assert.equal(check(result, 'mcp_config').state, 'failed');
  }
  for (const config of [[], 'json', 2, { mcpServers: [] }, { mcpServers: 'bad' }]) {
    assert.equal(inspectReadiness({ ...readyInput(), config }).state, 'blocked');
  }
});

test('unrelated MCP servers are preserved without exposing their data', () => {
  const input = readyInput();
  input.config.mcpServers.other = { type: 'http', url: 'https://example.invalid/mcp', env: { PRIVATE_TOKEN: 'never-echo-this-value' } };
  const before = structuredClone(input);
  const result = inspectReadiness(input);
  assert.equal(result.state, 'ready');
  assert.deepEqual(input, before);
  assert(!JSON.stringify(result).includes('never-echo-this-value'));
});
test('unreviewed helper startup options cannot silently make setup ready', () => {
  for (const extra of [{ env: { NODE_OPTIONS: '--import unreviewed' } }, { cwd: '/other/project' }, { disabled: true }]) {
    const input=readyInput();Object.assign(input.config.mcpServers['luxestyle-assist'],extra);
    const result=inspectReadiness(input);assert.equal(result.state,'unknown');assert.equal(check(result,'mcp_config').state,'unknown');
    assert.equal(JSON.stringify(result).includes('unreviewed'),false);
  }
});

test('missing CLI or slash command is unknown, not a claim that a client is installed', () => {
  for (const key of ['cliPresent', 'commandPresent']) {
    for (const value of [false, undefined, 'true', 1]) {
      const result = inspectReadiness({ ...readyInput(), [key]: value });
      assert.equal(result.state, 'unknown');
      assert.equal(check(result, key === 'cliPresent' ? 'cli' : 'slash_command').state, 'unknown');
    }
  }
});

test('present lock blocks without recommending blind deletion; unknown lock remains unknown', () => {
  const blocked = inspectReadiness({ ...readyInput(), lockState: 'present' });
  assert.equal(blocked.state, 'blocked');
  assert.match(blocked.nextSteps.join(' '), /nicht blind löschen/);
  for (const state of ['unknown', 'stale', undefined, true, false]) {
    assert.equal(inspectReadiness({ ...readyInput(), lockState: state }).state, 'unknown');
  }
});

test('repository mismatch blocks while unverified history never becomes an empty past', () => {
  assert.equal(inspectReadiness({ ...readyInput(), repoState: 'mismatch' }).state, 'blocked');
  for (const state of ['unknown', undefined, 'different']) {
    assert.equal(inspectReadiness({ ...readyInput(), repoState: state }).state, 'unknown');
  }
  for (const state of ['unknown', 'missing', 'unreadable', 'corrupt', undefined, true]) {
    const result = inspectReadiness({ ...readyInput(), historyState: state });
    assert.equal(result.state, 'unknown');
    assert.match(result.nextSteps.join(' '), /keine.*leeres Journal ersetzen/);
  }
});

test('failed evidence takes precedence without hiding unknown evidence or next steps', () => {
  const result = inspectReadiness({ ...readyInput(), lockState: 'present', historyState: 'unknown', commandPresent: false });
  assert.equal(result.state, 'blocked');
  assert.equal(check(result, 'lock').state, 'failed');
  assert.equal(check(result, 'history').state, 'unknown');
  assert.equal(check(result, 'slash_command').state, 'unknown');
  assert.equal(result.nextSteps.length, 3);
});

test('results do not alias caller configuration or reuse mutable result arrays', () => {
  const input = readyInput(), first = inspectReadiness(input), second = inspectReadiness(input);
  first.checks[0].state = 'failed';
  first.nextSteps.push('caller edit');
  assert.equal(second.state, 'ready');
  assert.equal(second.checks[0].state, 'passed');
  assert.deepEqual(second.nextSteps, []);
  assert.deepEqual(inspectReadiness(input), second);
});
