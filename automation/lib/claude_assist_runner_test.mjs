import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createBoundedRunner } from './claude_assist_runner.mjs';

const cleanEnv = () => ({ PATH: process.env.PATH || '/usr/bin:/bin', LANG: 'C.UTF-8',
  NODE_OPTIONS: '', NODE_PATH: '' });
const run = createBoundedRunner({ cleanEnv, redact: value => value.replaceAll('private-marker', '[REDACTED]') });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function executing(pid) {
  if (process.platform === 'linux') {
    try {
      // A killed orphan can briefly remain a zombie until its external reaper
      // runs. It is terminated and cannot execute or hold open pipes.
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      return !['Z', 'X'].includes(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[0]);
    } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  }
  try { process.kill(pid, 0); return true; }
  catch (error) { if (error.code === 'ESRCH') return false; throw error; }
}

async function assertTerminated(pid) {
  for (let attempt = 0; attempt < 40 && executing(pid); attempt++) await delay(25);
  assert.equal(executing(pid), false, `Process ${pid} must have terminated`);
}

function descendantFixture(t, { escaped = false } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'luxe-runner-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const marker = path.join(directory, 'child-pid');
  // Write the PID from the child itself, proving it has started and inherited
  // the pipes. The watchdog limits even a broken implementation's fixture.
  const child = `require('node:fs').writeFileSync(${JSON.stringify(marker)},String(process.pid));setTimeout(()=>{},4000);`;
  t.after(() => {
    try { const pid = Number(fs.readFileSync(marker, 'utf8')); if (executing(pid)) process.kill(pid, 'SIGKILL'); }
    catch (error) { if (!['ENOENT', 'ESRCH'].includes(error.code)) throw error; }
  });
  const prefix = `const {spawn}=require('node:child_process');const fs=require('node:fs');spawn(process.execPath,['-e',${JSON.stringify(child)}],{detached:${escaped},stdio:['ignore','inherit','inherit']});const wait=setInterval(()=>{if(fs.existsSync(${JSON.stringify(marker)})){clearInterval(wait);`;
  return { marker, script: suffix => prefix + suffix + `}},5);`,
    pid: () => Number(fs.readFileSync(marker, 'utf8')) };
}

test('runner factory requires explicit environment and redaction policy', () => {
  assert.throws(() => createBoundedRunner(), /required/);
  assert.throws(() => createBoundedRunner({ cleanEnv }), /required/);
});

test('normal execution preserves separate streams, Unicode, exit status and caller redaction', async () => {
  const result = await run(process.execPath, ['-e', `process.stdin.on('data',b=>{process.stdout.write(b);process.stderr.write('private-marker')});`],
    { input: 'Grösse: 你好', timeoutMs: 3000 });
  assert.equal(result.status, 'passed'); assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, 'Grösse: 你好'); assert.equal(result.stderr, '[REDACTED]');
  assert.equal(result.timedOut, false); assert.equal(result.truncated, false);
});

test('nonzero exit and an unavailable command cannot become passed', async () => {
  const result = await run(process.execPath, ['-e', 'process.exit(7)']);
  assert.equal(result.status, 'failed'); assert.equal(result.exitCode, 7);
  assert.equal((await run('/missing/luxe-runner-command', [])).reason, 'process_unavailable');
});

test('invalid limits and oversized stdin fail before launching anything', async () => {
  for (const options of [{ timeoutMs: NaN }, { timeoutMs: 0 }, { timeoutMs: 2147483648 },
    { maxBytes: -1 }, { maxBytes: Infinity }]) {
    assert.equal((await run('/must/not/start', [], options)).reason, 'invalid_run_limits');
  }
  assert.equal((await run('/must/not/start', [], { input: 'x'.repeat(65537) })).reason, 'invalid_or_oversized_stdin');
});

test('timeout is bounded when a real descendant retains inherited stdout and stderr',
  { skip: process.platform === 'win32', timeout: 6000 }, async t => {
    const fixture = descendantFixture(t), started = performance.now();
    const result = await run(process.execPath, ['-e', fixture.script(`process.stdout.write('descendant-started');setInterval(()=>{},1000);`)],
      { timeoutMs: 700, maxBytes: 1000 });
    assert.equal(result.stdout, 'descendant-started');
    assert.equal(result.status, 'unknown'); assert.equal(result.timedOut, true);
    assert.ok(performance.now() - started < 2000, 'Timeout must not await the descendant watchdog');
    await assertTerminated(fixture.pid());
  });

test('output limit aborts the owned process group while retaining the captured byte budget',
  { skip: process.platform === 'win32', timeout: 6000 }, async t => {
    const fixture = descendantFixture(t), started = performance.now();
    const result = await run(process.execPath, ['-e', fixture.script(`process.stdout.write('x'.repeat(20000));setInterval(()=>{},1000);`)],
      { timeoutMs: 3000, maxBytes: 64 });
    assert.equal(result.status, 'unknown'); assert.equal(result.truncated, true);
    assert.equal(result.timedOut, false); assert.equal(result.stdout, 'x'.repeat(64));
    assert.equal(Buffer.byteLength(result.output), 64);
    assert.ok(performance.now() - started < 2000, 'Overflow must not await the descendant watchdog');
    await assertTerminated(fixture.pid());
  });

test('known zero exit remains recorded when descendant pipes require a later timeout',
  { skip: process.platform === 'win32', timeout: 6000 }, async t => {
    const fixture = descendantFixture(t);
    const result = await run(process.execPath, ['-e', fixture.script(`process.stdout.write('parent-done');process.exit(0);`)],
      { timeoutMs: 700, maxBytes: 1000 });
    assert.equal(result.status, 'unknown'); assert.equal(result.timedOut, true);
    assert.equal(result.exitCode, 0); assert.equal(result.signal, null);
    assert.equal(result.stdout, 'parent-done');
    await assertTerminated(fixture.pid());
  });

test('an escaped descendant cannot hold the result indefinitely and is never killed as an unrelated group',
  { skip: process.platform === 'win32', timeout: 6000 }, async t => {
    const fixture = descendantFixture(t, { escaped: true }), started = performance.now();
    const result = await run(process.execPath, ['-e', fixture.script(`process.stdout.write('escaped-pipes');setInterval(()=>{},1000);`)],
      { timeoutMs: 700, maxBytes: 1000 });
    assert.equal(result.status, 'unknown'); assert.equal(result.timedOut, true);
    assert.equal(result.reason, 'abort_cleanup_incomplete');
    assert.equal(result.stdout, 'escaped-pipes');
    assert.ok(performance.now() - started < 2000, 'Fallback must not await the escaped descendant watchdog');
    const pid = fixture.pid();
    assert.equal(executing(pid), true, 'Runner must not kill an escaped foreign process group');
    // Only this test owns the explicitly escaped fixture and its cleanup.
    process.kill(pid, 'SIGKILL'); await assertTerminated(pid);
  });

test('aborting the owned group leaves an unrelated sibling process running',
  { skip: process.platform === 'win32', timeout: 6000 }, async t => {
    const sibling = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000);'], { env: cleanEnv(), stdio: 'ignore' });
    t.after(async () => {
      if (sibling.exitCode === null && sibling.signalCode === null) sibling.kill('SIGKILL');
      if (sibling.exitCode === null && sibling.signalCode === null) await new Promise(resolve => sibling.once('close', resolve));
    });
    await new Promise((resolve, reject) => { sibling.once('spawn', resolve); sibling.once('error', reject); });
    const result = await run(process.execPath, ['-e', 'setInterval(()=>{},1000);'], { timeoutMs: 100 });
    assert.equal(result.timedOut, true); assert.equal(executing(sibling.pid), true);
  });
