import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createAssistant, boundedRun, cleanEnv, redact } from './claude_assist.mjs';

const remote = 'https://github.com/allengchour-glitch/aban-news-landing.git';
function fixture(t, runner) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'luxe-assist-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const calls = [];
  const run = async (cmd, args, options) => {
    calls.push({ cmd, args, options });
    return runner ? runner(cmd, args, options) : { status: 'passed', output: remote };
  };
  return { root, calls, app: createAssistant(root, { runner: run }) };
}
function write(root, file, content) { const p = path.join(root, file); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); }
const note = { summary: 'SEO geprüft; keine Shopänderung.', nextStep: 'Diff prüfen.', blockers: ['Freigabe des Texts fehlt.'] };

test('doctor uses only local metadata and reports missing evidence as unknown', async t => {
  const f = fixture(t), result = await f.app.doctor();
  assert.equal(result.repository.state, 'matched'); assert.equal(result.handoff.state, 'unknown');
  assert.equal(result.handoff.records, null); assert.equal(result.liveAccountChecks, 'unknown');
  assert.equal(result.publications, 'unknown'); assert.equal(result.revenue, 'unknown');
  assert.equal(result.references.every(r => r.state === 'unknown'), true);
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].cmd, 'git');
  assert.equal(fs.existsSync(path.join(f.root, 'dropship')), false);
});
test('wrong, unavailable and credential-bearing origin fail closed without echoing URL', async t => {
  for (const url of ['https://github.com/other/repo.git', 'https://github.com/allengchour-glitch/aban-news-landing.evil', 'https://name:password@github.com/allengchour-glitch/aban-news-landing.git']) {
    const f = fixture(t, () => ({ status: 'passed', output: url }));
    assert.equal((await f.app.doctor()).repository.state, 'mismatch');
    await assert.rejects(f.app.save(note), /identity/);
    assert.equal(JSON.stringify(await f.app.doctor()).includes('name:password'), false);
  }
  const f = fixture(t, () => ({ status: 'unknown' }));
  assert.equal((await f.app.doctor()).repository.state, 'unknown');
});
test('handoff is saved, chained, read back and explicitly local', async t => {
  const f = fixture(t), first = await f.app.save(note);
  assert.equal(first.state, 'saved_local'); assert.equal(first.modelCalled, false);
  assert.equal(first.requiresCommitAndPushForOtherCheckouts, true);
  await f.app.save({ ...note, summary: 'Zweiter belegter Stand.' });
  const read = f.app.read(); assert.equal(read.records, 2); assert.equal(read.historyBeforeFirstRecord, 'unknown');
  assert.equal(read.latest[1].prevHash, read.latest[0].hash);
  assert.equal(fs.existsSync(path.join(f.root, 'dropship/assistant/.handoff.lock')), false);
});
test('corrupt or truncated journal remains unknown and unchanged', async t => {
  for (const raw of ['broken\n', '{}\n', '{"seq":1}', '']) {
    const f = fixture(t); write(f.root, 'dropship/assistant/handoff.jsonl', raw);
    assert.equal(f.app.read().state, 'unknown');
    await assert.rejects(f.app.save(note), /handoff_unknown/);
    assert.equal(fs.readFileSync(path.join(f.root, 'dropship/assistant/handoff.jsonl'), 'utf8'), raw);
  }
});
test('tampered hash is detected instead of resetting history', async t => {
  const f = fixture(t); await f.app.save(note);
  const file = path.join(f.root, 'dropship/assistant/handoff.jsonl');
  const raw = fs.readFileSync(file, 'utf8').replace('SEO geprüft', 'SEO verändert'); fs.writeFileSync(file, raw);
  assert.equal(f.app.read().state, 'unknown'); await assert.rejects(f.app.save(note), /handoff_unknown/);
  assert.equal(fs.readFileSync(file, 'utf8'), raw);
});
test('existing lock blocks and is never removed by another writer', async t => {
  const f = fixture(t); write(f.root, 'dropship/assistant/.handoff.lock', 'other process');
  await assert.rejects(f.app.save(note), /handoff_locked/);
  assert.equal(fs.readFileSync(path.join(f.root, 'dropship/assistant/.handoff.lock'), 'utf8'), 'other process');
});
test('symlink directory or journal cannot redirect a write', async t => {
  const f = fixture(t); fs.mkdirSync(path.join(f.root, 'dropship'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'luxe-outside-')); t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.symlinkSync(outside, path.join(f.root, 'dropship/assistant'));
  await assert.rejects(f.app.save(note), /symlink/); assert.deepEqual(fs.readdirSync(outside), []);
});
test('extra arguments, oversized notes and likely secrets are rejected', async t => {
  const f = fixture(t);
  for (const bad of [{ ...note, command: 'publish' }, { ...note, summary: 'x'.repeat(4001) }, { ...note, blockers: 'bad' }, { ...note, summary: 'Authorization=Bearer-secret' }, { ...note, summary: 'ghp_' + 'x'.repeat(32) }]) await assert.rejects(f.app.save(bad));
  assert.equal(f.app.read().state, 'unknown');
});
test('review queue records a request, never a fabricated model answer', async t => {
  const f = fixture(t); write(f.root, 'automation/seo-optimizer.mjs', 'export const value=1;');
  const r = await f.app.reviewRequest({ question: 'Bitte diesen Diff prüfen.', files: ['automation/seo-optimizer.mjs'] });
  assert.equal(r.modelCalled, false);
  const row = f.app.read().latest[0]; assert.equal(row.state, 'awaiting_codex'); assert.match(row.files[0].sha256, /^[a-f0-9]{64}$/);
  for (const file of ['../secret', '/tmp/secret', 'automation/../../secret', 'automation/../example.mjs', 'tools/abanctl.py', 'automation/pinterest_aban/post.mjs']) await assert.rejects(f.app.reviewRequest({ question: 'Prüfen', files: [file] }));
  assert.equal(f.app.read().records, 1);
});
test('fixed checks report missing suite files as unknown, not passed', async t => {
  const f = fixture(t), result = await f.app.checks({ suite: 'seo' });
  assert.equal(result.status, 'unknown'); assert.equal(f.calls.length, 1);
  await assert.rejects(f.app.checks({ suite: '../../publisher' }), /unknown_suite/);
  await assert.rejects(f.app.checks({ suite: 'core', args: ['--publish'] }), /invalid_arguments/);
});
test('runner receives only fixed arguments and no inherited credentials', async t => {
  const f = fixture(t, (cmd) => ({ status: 'passed', output: cmd === 'git' ? remote : 'ok' }));
  for (const file of ['automation/lib/shopify_gql_test.mjs', 'automation/lib/shopify_secret_test.mjs', 'automation/lib/kanal_sperren_test.mjs', 'automation/lib/claude_assist_offline.mjs']) write(f.root, file, '');
  const result = await f.app.checks({ suite: 'core' }); assert.equal(result.status, 'passed');
  const runs = f.calls.filter(c => c.cmd !== 'git'); assert.equal(runs.length, 3);
  assert.equal(runs.every(c => c.args[0] === '--import' && c.options.timeoutMs === 15000), true);
  assert.deepEqual(Object.keys(cleanEnv({ PATH: '/usr/bin', SHOPIFY_ADMIN_TOKEN: 'secret', NODE_OPTIONS: '--import evil', TELEGRAM_BOT_TOKEN: 'secret', OPENAI_API_KEY: 'secret' })).sort(), ['APPLY_SEO_APPROVED','DRY_RUN','GIT_CONFIG_GLOBAL','GIT_CONFIG_NOSYSTEM','GIT_TERMINAL_PROMPT','LANG','LIVE','PATH','TMPDIR','TZ'].sort());
});
test('subprocess failures, timeout and output overflow are distinct from passing', async () => {
  assert.equal((await boundedRun(process.execPath, ['-e', 'process.exit(3)'])).status, 'failed');
  const timeout = await boundedRun(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { timeoutMs: 50 });
  assert.equal(timeout.status, 'unknown'); assert.equal(timeout.timedOut, true);
  const flood = await boundedRun(process.execPath, ['-e', 'console.log("x".repeat(100000))'], { maxBytes: 100 });
  assert.equal(flood.status, 'unknown'); assert.equal(flood.truncated, true); assert.ok(flood.output.length <= 100);
  assert.equal((await boundedRun('/missing/luxe-assist-command', [])).status, 'unknown');
});
test('redaction removes standard token and URL credential forms', () => {
  const raw = 'ghp_' + 'x'.repeat(32) + ' Authorization: Bearer abc https://user:pass@example.org';
  const clean = redact(raw); assert.doesNotMatch(clean, /xxxxx|Bearer abc|user:pass/);
});
test('offline preload blocks ordinary fetch, sockets and child processes', () => {
  const preload = new URL('claude_assist_offline.mjs', import.meta.url).pathname;
  const r = spawnSync(process.execPath, ['--import', preload, '--input-type=module', '-e', `import net from 'node:net';import {spawn} from 'node:child_process';for(const fn of [()=>fetch('https://example.org'),()=>net.connect(443,'example.org'),()=>spawn('echo',['unsafe'])]){let blocked=false;try{await fn()}catch(e){blocked=e.message.includes('LUXESTYLE_OFFLINE_CHECK')}if(!blocked)process.exit(2)}`], { encoding: 'utf8', env: cleanEnv(), timeout: 5000 });
  assert.equal(r.status, 0, r.stderr);
});

function checkout(t) {
  const f = fixture(t);
  const here = path.dirname(fileURLToPath(import.meta.url));
  fs.mkdirSync(path.join(f.root, 'automation/lib'), { recursive: true });
  for (const file of ['claude_assist.mjs','claude_assist_mcp.mjs','claude_assist_offline.mjs']) fs.copyFileSync(path.join(here, file), path.join(f.root, 'automation/lib', file));
  fs.copyFileSync(path.join(here, '../claude-assist.mjs'), path.join(f.root, 'automation/claude-assist.mjs'));
  for (const args of [['-c','init.templateDir=','init','--quiet',f.root], ['-C',f.root,'config','--local','remote.origin.url',remote]]) {
    const r = spawnSync('git', args, { env: cleanEnv(), encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr);
  }
  return f;
}
test('CLI and stdio MCP work against a real checkout and share the same handoff', t => {
  const f = checkout(t), cli = path.join(f.root, 'automation/claude-assist.mjs');
  const run = (args, input) => spawnSync(process.execPath, [cli, ...args], { cwd: f.root, input, encoding: 'utf8', env: cleanEnv(), timeout: 5000 });
  const d = run(['doctor']); assert.equal(d.status, 0, d.stderr); assert.equal(JSON.parse(d.stdout).repository.state, 'matched');
  const s = run(['handoff-save'], JSON.stringify(note)); assert.equal(s.status, 0, s.stderr);
  const read = run(['handoff-read']); assert.equal(JSON.parse(read.stdout).records, 1);
  const lines = [{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'test',version:'1'}}}, {jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'luxe_handoff_read',arguments:{}}}].map(JSON.stringify).join('\n')+'\n';
  const m = run(['mcp'], lines); assert.equal(m.status, 0, m.stderr); assert.equal(m.stderr, '');
  const replies = m.stdout.trim().split('\n').map(JSON.parse); assert.equal(replies.length, 2);
  assert.equal(JSON.parse(replies[1].result.content[0].text).records, 1);
  const bad = run(['mcp'], JSON.stringify({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'luxe_review_request',arguments:{question:'Prüfen',files:['automation/ghp_'+'x'.repeat(32)]}}})+'\n');
  assert.doesNotMatch(bad.stdout, /xxxxxxxxxxxx/);
});
test('parallel processes preserve every acknowledged record without blind retries', async t => {
  const f = checkout(t); const cli = path.join(f.root, 'automation/claude-assist.mjs');
  const { spawn: start } = await import('node:child_process');
  const attempts = await Promise.all(Array.from({length:6}, (_,i) => new Promise(resolve => {
    const p = start(process.execPath, [cli,'handoff-save'], {cwd:f.root,env:cleanEnv(),stdio:['pipe','pipe','pipe']});
    let stdout='',stderr='';p.stdout.on('data', c=>stdout+=c);p.stderr.on('data', c=>stderr+=c);
    p.on('close', code=>resolve({code,stdout,stderr}));p.stdin.end(JSON.stringify({...note,summary:'parallel '+i}));
  })));
  const ok=attempts.filter(r=>r.code===0), blocked=attempts.filter(r=>r.code!==0);
  assert.ok(ok.length>=1);assert.ok(blocked.every(r=>r.stderr.includes('handoff_locked')));
  const rows=f.app.read();assert.equal(rows.state,'available');assert.equal(rows.records,ok.length);
  assert.equal(new Set(rows.latest.map(r=>r.id)).size,ok.length);
});
