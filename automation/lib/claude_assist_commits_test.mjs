import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateCommitPins, planCommitRange } from './claude_assist_commits.mjs';

const pins = { baseCommit: 'a'.repeat(40), headCommit: 'b'.repeat(40) };
const good = stdout => ({ status: 'passed', exitCode: 0, stdout, stderr: '', timedOut: false, truncated: false });
function fake(change) {
  const calls = [];
  return { calls, runGit: async (args, limits) => {
    calls.push({ args, limits });
    const fallback = args[0] === 'cat-file' ? good('commit\n')
      : args[0] === 'rev-parse' ? good('false\n') : good('');
    return change ? change(args, fallback) : fallback;
  } };
}
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'luxe-commit-plan-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const env = { PATH: process.env.PATH || '/usr/bin:/bin', LANG: 'C.UTF-8',
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: os.devNull,
    GIT_TERMINAL_PROMPT: '0', GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1' };
  const runGit = (args, limits = {}) => {
    const r = spawnSync('git', ['--no-pager', '--no-optional-locks', '-C', root,
      '-c', 'core.fsmonitor=false', '-c', 'protocol.allow=never', ...args], {
      env, encoding: 'utf8', timeout: limits.timeoutMs ?? 5000,
      maxBuffer: limits.maxBytes ?? 32768, input: limits.input,
    });
    return { status: r.error ? 'unknown' : r.status === 0 ? 'passed' : 'failed',
      exitCode: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', signal: r.signal,
      timedOut: r.error?.code === 'ETIMEDOUT', truncated: r.error?.code === 'ENOBUFS' };
  };
  const git = (...args) => { const r = runGit(args); assert.equal(r.status, 'passed', r.stderr); return r.stdout.trim(); };
  const write = (file, value) => { const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value); };
  const commit = message => { git('add', '--all', '--'); git('commit', '-qm', message); return git('rev-parse', 'HEAD'); };
  git('init', '-q'); git('config', 'user.name', 'Local fixture'); git('config', 'user.email', 'fixture@example.invalid');
  write('automation/lib/claude_assist.mjs', 'first\n');
  const baseCommit = commit('base');
  write('automation/lib/claude_assist.mjs', 'second\n');
  const headCommit = commit('head');
  return { root, runGit, git, write, commit, baseCommit, headCommit };
}
function unknown(result) {
  assert.equal(result.state, 'unknown'); assert.equal(result.files, null);
  assert.deepEqual(result.suites, []); assert.equal(result.uncovered, null);
  assert.equal(result.executedTests, false); assert.equal(result.worktreeChanges, 'not_scanned');
}

test('commit pins require exactly two full SHA-1 strings and normalize case', () => {
  assert.deepEqual(validateCommitPins({ baseCommit: 'A'.repeat(40), headCommit: 'B'.repeat(40) }), pins);
  const bad = [undefined, null, [], {}, { baseCommit: pins.baseCommit }, { headCommit: pins.headCommit },
    { ...pins, extra: true }, { ...pins, baseCommit: 'HEAD' }, { ...pins, headCommit: 'main' },
    { ...pins, baseCommit: 'a'.repeat(39) }, { ...pins, baseCommit: 'a'.repeat(41) },
    { ...pins, baseCommit: pins.baseCommit + '^{}' }, { ...pins, headCommit: '--help' },
    { ...pins, baseCommit: ' ' + pins.baseCommit }, { ...pins, baseCommit: 'g'.repeat(40) },
    { ...pins, baseCommit: pins.baseCommit + '\n' }, { ...pins, headCommit: pins.headCommit + '\r\n' },
    { ...pins, headCommit: 1 }, Object.create(pins), { ...pins, [Symbol('extra')]: true }];
  for (const value of bad) assert.throws(() => validateCommitPins(value), /invalid_commit_pins/);
});

test('invalid pins are rejected before the injected Git reader is invoked', async () => {
  let calls = 0;
  await assert.rejects(planCommitRange({ ...pins, headCommit: 'HEAD' }, { runGit: () => { calls++; } }), /invalid_commit_pins/);
  assert.equal(calls, 0);
  await assert.rejects(planCommitRange(pins), /invalid_git_reader/);
});

test('pinned plan uses only bounded fixed Git reads and direct commit snapshots', async () => {
  const reader = fake(); const result = await planCommitRange(pins, reader);
  assert.equal(result.state, 'no_changes'); assert.equal(result.source, 'local_pinned_commits');
  assert.equal(result.baseCommit, pins.baseCommit); assert.equal(result.headCommit, pins.headCommit);
  assert.equal(result.testScope, 'current_checkout_only'); assert.equal(result.executedTests, false);
  assert.deepEqual(reader.calls.map(c => c.args), [
    ['cat-file', '-t', pins.baseCommit], ['cat-file', '-t', pins.headCommit], ['rev-parse', '--is-shallow-repository'],
    ['merge-base', '--is-ancestor', pins.baseCommit, pins.headCommit],
    ['diff', '--no-ext-diff', '--no-textconv', '--no-color', '--name-only', '--no-renames', '--ignore-submodules=none', '-z', pins.baseCommit, pins.headCommit, '--'],
  ]);
  for (const call of reader.calls) assert.deepEqual(call.limits, { maxBytes: 32768, timeoutMs: 5000 });
});

test('a clean real checkout exposes freshly committed Assist changes without scanning local changes', async t => {
  const f = fixture(t);
  assert.equal(f.git('status', '--porcelain'), '');
  f.write('automation/local-untracked-helper.mjs', 'not part of commit diff\n');
  const result = await planCommitRange({ baseCommit: f.baseCommit, headCommit: f.headCommit }, f);
  assert.equal(result.state, 'planned'); assert.deepEqual(result.files, ['automation/lib/claude_assist.mjs']);
  assert.deepEqual(result.suites, ['assist']); assert.equal(result.worktreeChanges, 'not_scanned');
});

test('real identical commit pins confirm only an empty snapshot comparison', async t => {
  const f = fixture(t), result = await planCommitRange({ baseCommit: f.headCommit, headCommit: f.headCommit }, f);
  assert.equal(result.state, 'no_changes'); assert.deepEqual(result.files, []); assert.equal(result.executedTests, false);
});

test('real annotated tags and tree objects are not silently peeled into commits', async t => {
  const f = fixture(t); f.git('tag', '-a', 'fixture-tag', '-m', 'tag');
  for (const headCommit of [f.git('rev-parse', 'fixture-tag'), f.git('rev-parse', 'HEAD^{tree}')]) {
    const result = await planCommitRange({ baseCommit: f.baseCommit, headCommit }, f);
    unknown(result); assert.equal(result.reason, 'commit_object_required');
  }
});

test('real absent local commit objects remain unknown without a fetch', async t => {
  const f = fixture(t); const result = await planCommitRange({ baseCommit: f.baseCommit, headCommit: 'f'.repeat(40) }, f);
  unknown(result); assert.equal(result.reason, 'git_commit_read_incomplete');
});

test('real shallow repositories are not treated as a complete comparison history', async t => {
  const f = fixture(t); fs.writeFileSync(path.join(f.root, '.git', 'shallow'), f.headCommit + '\n');
  const result = await planCommitRange({ baseCommit: f.baseCommit, headCommit: f.headCommit }, f);
  unknown(result); assert.equal(result.reason, 'shallow_history');
});

test('real reversed and unrelated commits do not acquire an automatic mergebase', async t => {
  const f = fixture(t);
  const unrelated = f.git('commit-tree', f.git('rev-parse', 'HEAD^{tree}'), '-m', 'unrelated');
  for (const [baseCommit, headCommit] of [[f.headCommit, f.baseCommit], [f.baseCommit, unrelated]]) {
    const result = await planCommitRange({ baseCommit, headCommit }, f);
    unknown(result); assert.equal(result.reason, 'ancestry_not_confirmed');
  }
});

test('real renames retain both paths and deleted mapped files still select their suite', async t => {
  const f = fixture(t); f.write('automation/lib/shopify_gql.mjs', 'deleted later\n');
  const baseCommit = f.commit('before rename');
  fs.renameSync(path.join(f.root, 'automation/lib/claude_assist.mjs'), path.join(f.root, 'automation/lib/claude_assist_runner.mjs'));
  fs.unlinkSync(path.join(f.root, 'automation/lib/shopify_gql.mjs'));
  const headCommit = f.commit('rename and delete');
  const result = await planCommitRange({ baseCommit, headCommit }, f);
  assert.equal(result.state, 'planned');
  assert.deepEqual(result.files, ['automation/lib/claude_assist.mjs', 'automation/lib/claude_assist_runner.mjs', 'automation/lib/shopify_gql.mjs']);
  assert.deepEqual(result.suites, ['assist', 'core']);
});

test('real unfamiliar executable and submodule paths remain explicitly uncovered', async t => {
  const f = fixture(t); f.write('automation/unmapped-helper.mjs', 'unreviewed\n');
  f.git('update-index', '--add', '--cacheinfo', '160000,' + f.baseCommit + ',vendor/module');
  // Do not add-all here: it would remove the index-only gitlink fixture.
  f.git('add', '--', 'automation/unmapped-helper.mjs'); f.git('commit', '-qm', 'unknown and submodule');
  const result = await planCommitRange({ baseCommit: f.headCommit, headCommit: f.git('rev-parse', 'HEAD') }, f);
  assert.equal(result.state, 'unmapped');
  assert.deepEqual(result.uncovered, ['automation/unmapped-helper.mjs', 'vendor/module']);
  assert.deepEqual(result.suites, []);
});

test('every failed, timed out, truncated or malformed preliminary read stays unknown', async () => {
  const failures = [undefined, { ...good('commit\n'), status: 'failed', exitCode: 128 },
    { ...good('commit\n'), timedOut: true }, { ...good('commit\n'), truncated: true },
    { ...good('commit\n'), signal: 'SIGTERM' }, { ...good('commit\n'), stderr: 'warning\n' },
    { ...good('commit\n'), stdout: undefined }, good('commit\n\ufffd'), good('commit\n' + 'x'.repeat(32768))];
  for (const failure of failures) {
    const reader = fake((args, fallback) => args[0] === 'cat-file' ? failure : fallback);
    unknown(await planCommitRange(pins, reader));
    assert.equal(reader.calls.some(c => c.args[0] === 'diff'), false);
  }
  unknown(await planCommitRange(pins, { runGit: async () => { throw Error('unavailable'); } }));
});

test('unrecognised shallow output and ancestry failures never proceed to a diff', async () => {
  for (const [stage, output] of [['rev-parse', 'false'], ['rev-parse', 'unknown\n'], ['merge-base', 'unexpected\n']]) {
    const reader = fake((args, fallback) => args[0] === stage ? good(output) : fallback);
    unknown(await planCommitRange(pins, reader)); assert.equal(reader.calls.some(c => c.args[0] === 'diff'), false);
  }
  for (const exitCode of [1, 128]) {
    const reader = fake((args, fallback) => args[0] === 'merge-base' ? { ...good(''), status: 'failed', exitCode } : fallback);
    unknown(await planCommitRange(pins, reader)); assert.equal(reader.calls.some(c => c.args[0] === 'diff'), false);
  }
});

test('diff failures, missing NULs, invalid paths and excessive output never imply empty changes', async () => {
  const badDiffs = [good('README.md'), good('README.md\0\0'), good('../escape\0'), good('/absolute\0'),
    good('automation/invalid\npath\0'), good('\ufffd\0'), good('\ud800\0'), good('x'.repeat(32769)),
    { ...good(''), status: 'unknown', timedOut: true }, { ...good(''), truncated: true },
    { ...good(''), stderr: 'object error\n' }, { ...good(''), exitCode: 128, status: 'failed' }];
  for (const result of badDiffs) unknown(await planCommitRange(pins, fake((args, fallback) => args[0] === 'diff' ? result : fallback)));
});

test('the two hundred path limit applies before deduplication', async () => {
  const reader = count => fake((args, fallback) => args[0] === 'diff' ? good('README.md\0'.repeat(count)) : fallback);
  const limit = await planCommitRange(pins, reader(200)); assert.equal(limit.state, 'planned'); assert.deepEqual(limit.ignored, ['README.md']);
  const excess = await planCommitRange(pins, reader(201)); unknown(excess); assert.equal(excess.reason, 'invalid_or_excessive_git_paths');
});
