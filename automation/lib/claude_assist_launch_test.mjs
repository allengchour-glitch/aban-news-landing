import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { MCP_LAUNCHER } from './claude_assist_launch.mjs';

const ORIGIN = 'https://github.com/allengchour-glitch/aban-news-landing.git';
const ERROR = 'LuxeStyle Assist konnte nicht sicher gestartet werden.\n';
const environment = () => ({ PATH: process.env.PATH || '/usr/bin:/bin', LANG: 'C.UTF-8',
  GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: os.devNull, GIT_TERMINAL_PROMPT: '0',
  NODE_OPTIONS: '', NODE_PATH: '' });
function git(cwd, args) {
  const run = spawnSync('git', ['--no-optional-locks', '-C', cwd, '-c', 'core.fsmonitor=false', ...args],
    { env: environment(), encoding: 'utf8', timeout: 3000, maxBuffer: 4096 });
  assert.equal(run.status, 0, run.stderr); assert.ifError(run.error); return run.stdout;
}
function script(root, body = 'process.stdout.write(JSON.stringify({argv:process.argv.slice(1),cwd:process.cwd()}));') {
  fs.mkdirSync(path.join(root, 'automation'), { recursive: true });
  fs.writeFileSync(path.join(root, 'automation/claude-assist.mjs'), body);
}
function fixture(t, origin = ORIGIN) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'luxe launch '));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const root = path.join(parent, 'repo with spaces'); fs.mkdirSync(root);
  git(root, ['init', '-q']); git(root, ['remote', 'add', 'origin', origin]); script(root);
  return { root, parent };
}
function launch(cwd, extraEnv = {}) {
  return spawnSync(process.execPath, ['-e', MCP_LAUNCHER], { cwd, env: { ...environment(), ...extraEnv },
    encoding: 'utf8', timeout: 5000, maxBuffer: 8192 });
}
function rejected(run) {
  assert.ifError(run.error); assert.equal(run.status, 1);
  assert.equal(run.stdout, ''); assert.equal(run.stderr, ERROR);
}

test('fixed launcher imports the intended MCP entry point from the repository root', t => {
  const { root } = fixture(t), run = launch(root);
  assert.ifError(run.error); assert.equal(run.status, 0, run.stderr); assert.equal(run.stderr, '');
  assert.deepEqual(JSON.parse(run.stdout), { argv: [path.join(root, 'automation/claude-assist.mjs'), 'mcp'], cwd: root });
});

test('nested working directories with spaces resolve the same entry point', t => {
  const { root } = fixture(t), nested = path.join(root, 'nested with spaces', 'deeper');
  fs.mkdirSync(nested, { recursive: true }); const run = launch(nested);
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(run.stdout), { argv: [path.join(root, 'automation/claude-assist.mjs'), 'mcp'], cwd: nested });
});

test('a genuine Git worktree with a .git file is supported', t => {
  const { root, parent } = fixture(t);
  git(root, ['-c', 'user.name=LuxeStyle fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-q', '--allow-empty', '-m', 'fixture']);
  const linked = path.join(parent, 'linked worktree'); git(root, ['worktree', 'add', '-q', '--detach', linked, 'HEAD']);
  assert(fs.lstatSync(path.join(linked, '.git')).isFile()); script(linked);
  const run = launch(linked); assert.equal(run.status, 0, run.stderr);
  assert.equal(JSON.parse(run.stdout).argv[0], path.join(linked, 'automation/claude-assist.mjs'));
});

test('only the expected credential-free GitHub HTTPS or SSH origin is accepted', t => {
  const { root } = fixture(t);
  for (const origin of ['git@github.com:allengchour-glitch/aban-news-landing.git', 'ssh://git@github.com/allengchour-glitch/aban-news-landing.git']) {
    git(root, ['remote', 'set-url', 'origin', origin]); const run = launch(root);
    assert.equal(run.status, 0, run.stderr);
  }
  for (const origin of ['https://github.com/other/repo.git', 'https://github.com.evil.invalid/allengchour-glitch/aban-news-landing',
    'https://private-token@github.com/allengchour-glitch/aban-news-landing.git',
    'https://user:private-password@github.com/allengchour-glitch/aban-news-landing.git']) {
    git(root, ['remote', 'set-url', 'origin', origin]); rejected(launch(root));
  }
});

test('an origin cannot be replaced by inherited Git configuration variables', t => {
  const { root } = fixture(t, 'https://github.com/other/repo.git');
  rejected(launch(root, { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'remote.origin.url', GIT_CONFIG_VALUE_0: ORIGIN }));
});

test('a directory outside a Git repository is rejected without leaking paths', t => {
  const { parent } = fixture(t), outside = path.join(parent, 'outside'); fs.mkdirSync(outside);
  rejected(launch(outside));
});

test('a symbolic-link automation directory is rejected', t => {
  const { root, parent } = fixture(t), directory = path.join(root, 'automation'), real = path.join(parent, 'elsewhere');
  fs.renameSync(directory, real); fs.symlinkSync(real, directory, 'dir'); rejected(launch(root));
});

test('a symbolic-link or missing entry point is rejected', t => {
  const { root, parent } = fixture(t), entry = path.join(root, 'automation/claude-assist.mjs'), real = path.join(parent, 'elsewhere.mjs');
  fs.renameSync(entry, real); fs.symlinkSync(real, entry); rejected(launch(root));
  fs.unlinkSync(entry); rejected(launch(root));
});

test('failed dynamic imports expose only a generic stderr error', t => {
  const { root } = fixture(t); script(root, 'throw Error("private-import-detail");'); rejected(launch(root));
});

test('oversized Git output remains a generic failure', t => {
  const { root } = fixture(t); git(root, ['remote', 'set-url', 'origin', 'https://invalid.example/' + 'x'.repeat(5000)]);
  rejected(launch(root));
});
