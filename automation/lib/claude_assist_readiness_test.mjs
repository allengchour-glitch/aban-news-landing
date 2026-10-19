import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectReadiness } from './claude_assist_readiness.mjs';
import { MCP_LAUNCHER } from './claude_assist_launch.mjs';

function readyInput() {
  return {
    nodeVersion: 'v22.16.0', configState: 'available',
    config: { mcpServers: { 'luxestyle-assist': { type: 'stdio', command: 'node', args: ['-e', MCP_LAUNCHER], env: { NODE_OPTIONS: '', NODE_PATH: '' } } } },
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
  const expected = readyInput().config.mcpServers['luxestyle-assist'];
  const badServers = [null, [], {}, { ...expected, type: 'http' }, { ...expected, command: 'npx' },
    { ...expected, args: ['automation/claude-assist.mjs', 'mcp'] },
    { ...expected, args: ['-e', MCP_LAUNCHER + '\n'] },
    { ...expected, args: ['-e', MCP_LAUNCHER, '--unsafe'] }, { ...expected, args: 'node -e unreviewed' }];
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
  for (const extra of [{ cwd: '/other/project' }, { disabled: true }]) {
    const input=readyInput();Object.assign(input.config.mcpServers['luxestyle-assist'],extra);
    const result=inspectReadiness(input);assert.equal(result.state,'unknown');assert.equal(check(result,'mcp_config').state,'unknown');
    assert.equal(JSON.stringify(result).includes('unreviewed'),false);
  }
});

test('missing or partial Node environment overrides remain unknown', () => {
  for (const env of [undefined, null, [], 'environment', {}, { NODE_OPTIONS: '' }, { NODE_PATH: '' }]) {
    const input = readyInput();
    if (env === undefined) delete input.config.mcpServers['luxestyle-assist'].env;
    else input.config.mcpServers['luxestyle-assist'].env = env;
    const result = inspectReadiness(input);
    assert.equal(result.state, 'unknown');
    assert.equal(check(result, 'mcp_config').state, 'unknown');
  }
});

test('nonempty or malformed Node loading overrides block without exposing values', () => {
  for (const key of ['NODE_OPTIONS', 'NODE_PATH']) {
    for (const value of ['--import private-unreviewed-loader', '/private/unreviewed-modules', ' ', null, false, 0, {}]) {
      const input = readyInput();
      input.config.mcpServers['luxestyle-assist'].env[key] = value;
      const result = inspectReadiness(input);
      assert.equal(result.state, 'blocked');
      assert.equal(check(result, 'mcp_config').state, 'failed');
      assert(!JSON.stringify(result).includes('private-unreviewed-loader'));
      assert(!JSON.stringify(result).includes('/private/unreviewed-modules'));
    }
  }
});

test('extra environment variables stay unknown and are never echoed', () => {
  const input = readyInput();
  input.config.mcpServers['luxestyle-assist'].env.PRIVATE_TOKEN = 'never-echo-extra-environment';
  const before = structuredClone(input);
  const result = inspectReadiness(input);
  assert.equal(result.state, 'unknown');
  assert.equal(check(result, 'mcp_config').state, 'unknown');
  assert.deepEqual(input, before);
  assert(!JSON.stringify(result).includes('never-echo-extra-environment'));
  assert(!JSON.stringify(result).includes('PRIVATE_TOKEN'));
});

test('a known unsafe loading override stays blocked beside unreviewed variables', () => {
  const input = readyInput();
  input.config.mcpServers['luxestyle-assist'].env = { NODE_OPTIONS: '--import hidden-loader', PRIVATE_TOKEN: 'hidden-token' };
  const result = inspectReadiness(input);
  assert.equal(result.state, 'blocked');
  assert.equal(check(result, 'mcp_config').state, 'failed');
  assert(!JSON.stringify(result).includes('hidden-loader'));
  assert(!JSON.stringify(result).includes('hidden-token'));
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
