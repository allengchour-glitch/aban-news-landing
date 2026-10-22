import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { MCP_LAUNCHER } from './claude_assist_launch.mjs';
import { createAssistant, boundedRun, cleanEnv, redact, CHECK_INPUTS } from './claude_assist.mjs';

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
function checkInputs(root, suite) { for (const file of CHECK_INPUTS[suite]) write(root, file, '// fixed fixture input\n'); }
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
  checkInputs(f.root, 'core');
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
  for (const file of ['claude_assist.mjs','claude_assist_mcp.mjs','claude_assist_offline.mjs','claude_assist_changes.mjs','claude_assist_readiness.mjs','claude_assist_launch.mjs','claude_assist_runner.mjs','claude_assist_commits.mjs','claude_assist_evidence.mjs']) fs.copyFileSync(path.join(here, file), path.join(f.root, 'automation/lib', file));
  fs.copyFileSync(path.join(here, '../claude-assist.mjs'), path.join(f.root, 'automation/claude-assist.mjs'));
  for (const args of [['-c','init.templateDir=','init','--quiet',f.root], ['-C',f.root,'config','--local','remote.origin.url',remote]]) {
    const r = spawnSync('git', args, { env: cleanEnv(), encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr);
  }
  return f;
}
test('CLI and stdio MCP work against a real checkout and share the same handoff', t => {
  const f = checkout(t), cli = path.join(f.root, 'automation/claude-assist.mjs');
  const run = (args, input) => spawnSync(process.execPath, [cli, ...args], { cwd: f.root, input, encoding: 'utf8', env: cleanEnv(), timeout: 5000 });
  const d = run(['doctor']); assert.equal(d.status, 1, d.stderr); assert.equal(JSON.parse(d.stdout).repository.state, 'matched');
  assert.equal(JSON.parse(d.stdout).localReadiness.state,'unknown');
  const s = run(['handoff-save'], JSON.stringify(note)); assert.equal(s.status, 0, s.stderr);
  const read = run(['handoff-read']); assert.equal(JSON.parse(read.stdout).records, 1);
  const request = run(['review-request'], JSON.stringify({question:'CLI-Integration prüfen.',files:['automation/claude-assist.mjs']}));
  assert.equal(request.status,0,request.stderr);const requestId=JSON.parse(request.stdout).id;
  const lines = [{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'test',version:'1'}}}, {jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'luxe_handoff_read',arguments:{}}}].map(JSON.stringify).join('\n')+'\n';
  const m = run(['mcp'], lines); assert.equal(m.status, 0, m.stderr); assert.equal(m.stderr, '');
  const replies = m.stdout.trim().split('\n').map(JSON.parse); assert.equal(replies.length, 2);
  assert.equal(JSON.parse(replies[1].result.content[0].text).records, 2);
  const v2=[['luxe_review_get',{requestId}],['luxe_context',{question:'Prüfen.',files:['automation/claude-assist.mjs']}],['luxe_review_answer',{requestId,verdict:'no_findings',summary:'Belegter manueller Prüfstand.',nextStep:'Nur für diese Bytes gültig.'}],['luxe_review_list',{}]].map(([name,arguments_],i)=>JSON.stringify({jsonrpc:'2.0',id:10+i,method:'tools/call',params:{name,arguments:arguments_}})).join('\n')+'\n';
  const endToEnd=run(['mcp'],v2);assert.equal(endToEnd.status,0,endToEnd.stderr);
  const responses=endToEnd.stdout.trim().split('\n').map(JSON.parse);assert.equal(responses.every(r=>r.result.isError===false),true);
  assert.equal(JSON.parse(responses[0].result.content[0].text).request.id,requestId);
  assert.equal(JSON.parse(responses[1].result.content[0].text).files[0].state,'included');
  assert.equal(JSON.parse(responses[3].result.content[0].text).requests[0].status,'answered');
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

test('review answers link to current byte hashes and are explicitly manual', async t => {
  const f=fixture(t), file='automation/seo-optimizer.mjs';write(f.root,file,'export const x=1;');
  const request=await f.app.reviewRequest({question:'Fehlerbehandlung prüfen.',files:[file]});
  const duplicate=await f.app.reviewRequest({question:'Fehlerbehandlung prüfen.',files:[file,file]});
  assert.equal(duplicate.state,'existing_request');assert.equal(duplicate.id,request.id);assert.equal(f.app.read().records,1);
  await f.app.reviewAnswer({requestId:request.id,verdict:'findings',summary:'Ein belegter Fehler im geprüften Stand.',nextStep:'Fehler lokal korrigieren.',blockers:['Patch fehlt.']});
  const list=f.app.reviewList();assert.equal(list.open,0);assert.equal(list.requests[0].status,'answered');
  assert.equal(list.requests[0].evidence.state,'current');assert.equal(list.requests[0].answer.source,'manual');
  assert.deepEqual(list.requests[0].answer.blockers,['Patch fehlt.']);
  assert.equal(f.app.reviewGet({requestId:request.id}).answer.requestId,request.id);
  const original=fs.readFileSync(path.join(f.root,'dropship/assistant/handoff.jsonl'),'utf8');
  await assert.rejects(f.app.reviewAnswer({requestId:request.id,verdict:'no_findings',summary:'Kein weiterer Fehler.',nextStep:'Prüfen.'}),/already_answered/);
  assert.equal(fs.readFileSync(path.join(f.root,'dropship/assistant/handoff.jsonl'),'utf8'),original);
});
test('changed or missing files prevent an answer from masquerading as current', async t => {
  const f=fixture(t),file='automation/seo-optimizer.mjs';write(f.root,file,'before');
  const request=await f.app.reviewRequest({question:'Prüfen.',files:[file]});write(f.root,file,'after');
  const answer={requestId:request.id,verdict:'no_findings',summary:'Keine Befunde.',nextStep:'Weiter prüfen.'};
  await assert.rejects(f.app.reviewAnswer(answer),/context_stale/);
  assert.equal(f.app.reviewList().requests[0].evidence.state,'stale');
  fs.unlinkSync(path.join(f.root,file));await assert.rejects(f.app.reviewAnswer(answer),/context_unknown/);
  await f.app.reviewAnswer({...answer,verdict:'blocked',blockers:['Quelldatei fehlt.']});
  assert.equal(f.app.reviewList().requests[0].status,'blocked');assert.equal(f.app.read().records,2);
  await assert.rejects(f.app.reviewAnswer({...answer,requestId:'unknown'}),/unknown_review_request/);
});
test('an answered review becomes stale without erasing its historical answer', async t => {
  const f=fixture(t),file='automation/seo-optimizer.mjs';write(f.root,file,'before');
  const request=await f.app.reviewRequest({question:'Prüfen.',files:[file]});
  await f.app.reviewAnswer({requestId:request.id,verdict:'no_findings',summary:'Keine Befunde im Original.',nextStep:'Nur für diesen Stand.'});
  write(f.root,file,'after');const r=f.app.reviewGet({requestId:request.id});
  assert.equal(r.evidence.state,'stale');assert.equal(r.answer.summary,'Keine Befunde im Original.');
  const fresh=await f.app.reviewRequest({question:'Prüfen.',files:[file]});assert.notEqual(fresh.id,request.id);
});
test('unscoped reviews cannot close as a positive code review', async t => {
  const f=fixture(t),r=await f.app.reviewRequest({question:'Allgemeine Frage.'});
  await assert.rejects(f.app.reviewAnswer({requestId:r.id,verdict:'no_findings',summary:'Alles in Ordnung.',nextStep:'Weiter.'}),/context_unknown/);
  assert.equal(f.app.reviewList().requests[0].evidence.reason,'no_pinned_files');
});
test('full-journal review listing is paged and detail preserves older long questions', async t => {
  const f=fixture(t),file='automation/seo-optimizer.mjs';write(f.root,file,'original');
  const ids=[];const long='Frage '.repeat(600);
  for(let i=0;i<12;i++)ids.push((await f.app.reviewRequest({question:i===0?long:'Frage '+i,files:[file]})).id);
  for(let i=0;i<12;i++)await f.app.save({...note,summary:'Neuer Stand '+i});
  assert.equal(f.app.read().latest.some(r=>r.id===ids[0]),false);
  const first=f.app.reviewList();assert.equal(first.total,12);assert.equal(first.open,12);assert.equal(first.requests.length,5);
  assert.equal(first.requests[0].questionTruncated,true);assert.equal(f.app.reviewGet({requestId:ids[0]}).request.summary,long.trim());
  const second=f.app.reviewList({after:first.nextCursor});assert.equal(second.requests.length,5);
  const third=f.app.reviewList({after:second.nextCursor});assert.equal(third.requests.length,2);assert.equal(third.nextCursor,null);
  assert.equal(f.app.reviewList({after:'not-found'}).state,'unknown');
});
test('review hashes use original UTF-8 bytes and reject malformed UTF-8', async t => {
  const f=fixture(t),file='automation/seo-optimizer.mjs',body=Buffer.from('Grösse: 你好\n');write(f.root,file,body);
  const r=await f.app.reviewRequest({question:'Prüfen.',files:[file]});
  const expected=createHash('sha256').update(body).digest('hex');assert.equal(f.app.reviewGet({requestId:r.id}).request.files[0].sha256,expected);
  write(f.root,file,Buffer.from([0xff,0xfe]));await assert.rejects(f.app.reviewRequest({question:'Ungültig.',files:[file]}));
});
test('context caps original-byte excerpts and keeps independent good files', async t => {
  const f=fixture(t),files=Array.from({length:6},(_,i)=>'dropship/luxe-'+i+'.md');
  for(const file of files)write(f.root,file,'清'.repeat(9000));
  const result=await f.app.context({question:'Diese Entwürfe vergleichen.',files});
  assert.equal(result.modelCalled,false);assert.equal(result.complete,false);
  assert.ok(result.files.reduce((sum,r)=>sum+(r.excerptBytes??0),0)<=48*1024);
  assert.ok(result.files.every(r=>!r.excerpt.includes('\ufffd')));
  assert.ok(result.files.some(r=>r.excerptBytes===0));
  const single=await f.app.context({question:'Fehlende Quelle benennen.',files:['dropship/missing.md',files[0]]});
  assert.equal(single.files[0].state,'unknown');assert.equal(single.files[1].state,'included');
});
test('context blocks likely secrets before truncation and rejects other-brand/data paths', async t => {
  const f=fixture(t);write(f.root,'dropship/source.md','x'.repeat(16000)+'\n'+'ghp_'+'x'.repeat(32));
  const result=await f.app.context({question:'Quelle prüfen.',files:['dropship/source.md']});
  assert.equal(result.files[0].state,'blocked');assert.equal('excerpt' in result.files[0],false);
  for(const file of ['dropship/ABAN-PLAN.md','dropship/secret.json','dropship/assistant/handoff.jsonl','dropship/.env','automation/pinterest_aban/test.mjs']) {
    await assert.rejects(f.app.context({question:'Prüfen.',files:[file]}),/outside_luxestyle/);
    await assert.rejects(f.app.reviewRequest({question:'Prüfen.',files:[file]}),/outside_luxestyle/);
  }
});
test('change plan reads index, worktree and untracked paths using fixed NUL commands', async t => {
  const f=fixture(t,(cmd,args)=>({status:'passed',output:args.includes('config')?remote:args.includes('--cached')?'automation/lib/shopify_gql.mjs\0':args.includes('diff')?'automation/seo-optimizer.mjs\0':'dropship/notes.md\0'}));
  const plan=await f.app.changePlan();assert.equal(plan.state,'planned');assert.deepEqual(plan.suites,['core','seo']);
  const reads=f.calls.slice(1);assert.equal(reads.length,3);assert.equal(reads.every(r=>r.args.includes('-z')),true);
  assert.equal(reads.filter(r=>r.args.includes('diff')).every(r=>r.args.includes('--no-ext-diff')&&r.args.includes('--no-textconv')),true);
  assert.equal(reads.every(r=>r.args.includes('core.fsmonitor=false')),true);
});
test('partial Git data stays unknown and never becomes a clean plan', async t => {
  for(const response of [{status:'passed',output:'missing-nul'}, {status:'unknown',reason:'quota'}, {status:'failed',output:''}]) {
    const f=fixture(t,(cmd,args)=>args.includes('config')?{status:'passed',output:remote}:response);
    const plan=await f.app.changePlan();assert.equal(plan.state,'unknown');assert.equal(plan.files,null);
  }
});
test('uncovered changes remain unknown while real test failures take precedence', async t => {
  for(const testStatus of ['passed','failed']) {
    const f=fixture(t,(cmd,args)=>cmd!=='git'?{status:testStatus,output:'offline'}:{status:'passed',output:args.includes('config')?remote:args.includes('--cached')?'automation/lib/shopify_gql.mjs\0automation/new-live.mjs\0':''});
    checkInputs(f.root, 'core');
    const run=await f.app.checks({suite:'changed'});assert.equal(run.status,testStatus==='failed'?'failed':'unknown');
    assert.deepEqual(run.plan.uncovered,['automation/new-live.mjs']);
  }
});
test('assist profile runs only its fixed integration files without claiming a network sandbox', async t => {
  const f=fixture(t,(cmd,args)=>({status:'passed',output:cmd==='git'?remote:'ok'}));
  checkInputs(f.root, 'assist');
  const run=await f.app.checks({suite:'assist'});assert.equal(run.status,'passed');
  const call=f.calls.find(c=>c.cmd!=='git');assert.equal(call.args[0],'--test');assert.equal(call.args[1],'--test-reporter=spec');assert.equal(call.args.length,10);assert.match(run.caveat,/no network preload/);
});
test('native Git change plan sees a staged change even when the worktree returns to HEAD', async t => {
  const f=checkout(t),file='automation/lib/shopify_gql.mjs';write(f.root,file,'original');
  const git=args=>{const r=spawnSync('git',['-C',f.root,'-c','core.hooksPath='+path.join(f.root,'.git/no-hooks'),...args],{env:cleanEnv(),encoding:'utf8',timeout:5000});assert.equal(r.status,0,r.stderr);};
  git(['add','--','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','fixture']);
  write(f.root,file,'staged');git(['add','--',file]);write(f.root,file,'original');write(f.root,'dropship/new-notes.md','local draft');
  const result=await createAssistant(f.root).changePlan();assert.equal(result.state,'planned');assert.deepEqual(result.suites,['core']);
  assert.deepEqual(result.files,[file,'dropship/new-notes.md']);assert.equal(result.committedHistory,'not_scanned');
});
test('a recomputed chain cannot make an invalid answer reference semantically valid', async t => {
  const f=fixture(t),file='automation/seo-optimizer.mjs';write(f.root,file,'source');
  const r=await f.app.reviewRequest({question:'Prüfen.',files:[file]});
  await f.app.reviewAnswer({requestId:r.id,verdict:'no_findings',summary:'Keine Befunde.',nextStep:'Weiter prüfen.'});
  const journal=path.join(f.root,'dropship/assistant/handoff.jsonl'),lines=fs.readFileSync(journal,'utf8').trim().split('\n').map(JSON.parse);
  const {hash,...bad}=lines[1];bad.requestId='not-a-request';lines[1]={...bad,hash:createHash('sha256').update(JSON.stringify(bad)).digest('hex')};
  const raw=lines.map(JSON.stringify).join('\n')+'\n';fs.writeFileSync(journal,raw);
  assert.equal(f.app.reviewList().state,'unknown');assert.equal(f.app.reviewGet({requestId:r.id}).state,'unknown');
  await assert.rejects(f.app.save(note),/handoff_unknown/);assert.equal(fs.readFileSync(journal,'utf8'),raw);
});
test('legitimate large Unicode handoffs remain readable within the MCP byte budget', async t => {
  const f=fixture(t),large={summary:'日'.repeat(4000),nextStep:'日'.repeat(2000),blockers:Array.from({length:12},()=> '日'.repeat(500))};
  for(let i=0;i<10;i++)await f.app.save(large);
  const read=f.app.read();assert.equal(read.state,'available');assert.equal(read.records,10);assert.equal(read.latestTruncated,true);
  assert.ok(read.latestReturned>0);assert.ok(read.latestReturned<10);assert.ok(Buffer.byteLength(JSON.stringify(read.latest))<=128*1024);
  assert.ok(Buffer.byteLength(JSON.stringify({content:[{type:'text',text:JSON.stringify(read)}]}))<256*1024);
  const original=fs.readFileSync(path.join(f.root,'dropship/assistant/handoff.jsonl'),'utf8');
  assert.equal(original.trim().split('\n').length,10);
});

function localSetup(root) {
  write(root,'.mcp.json',JSON.stringify({mcpServers:{'luxestyle-assist':{type:'stdio',command:'node',args:['-e',MCP_LAUNCHER],env:{NODE_OPTIONS:'',NODE_PATH:''}},'other-service':{env:{example:'private_value_not_to_report'}}}}));
  write(root,'.claude/commands/luxestyle-assist.md','Local reviewed command.');
  if(!fs.existsSync(path.join(root,'automation/claude-assist.mjs')))write(root,'automation/claude-assist.mjs','// fixed helper');
}
test('doctor reports local readiness separately from a connected Claude client', async t => {
  const f=fixture(t);localSetup(f.root);await f.app.save(note);
  const d=await f.app.doctor();assert.equal(d.localReadiness.state,'ready');assert.match(d.claudeClient,/unknown/);
  assert.equal(d.nextWork.kind,'resume_handoff');assert.equal(d.nextWork.nextStep,note.nextStep);
  assert.equal(JSON.stringify(d).includes('private_value_not_to_report'),false);
  assert.equal(d.liveAccountChecks,'unknown');assert.equal(d.publications,'unknown');
});
test('handoffs pin sorted unique original-byte sources and resume in a later session', async t => {
  const f=fixture(t);localSetup(f.root);await f.app.save(note);
  const journal=path.join(f.root,'dropship/assistant/handoff.jsonl'),previous=fs.readFileSync(journal);
  const file='automation/seo-optimizer.mjs',other='dropship/luxe-source.md';
  const body=Buffer.from('\ufeff// Grösse: 你好\r\n');write(f.root,file,body);write(f.root,other,'Second original source.');
  const saved=await f.app.save({...note,files:[other,file,file]});
  const rows=f.app.read();assert.equal(rows.state,'available');assert.equal(rows.records,2);
  assert.deepEqual(rows.latest[1].files.map(r=>r.file),[file,other]);
  assert.equal(rows.latest[1].files[0].sha256,createHash('sha256').update(body).digest('hex'));
  const after=fs.readFileSync(journal);assert.deepEqual(after.subarray(0,previous.length),previous);
  assert.equal(rows.latest[1].prevHash,rows.latest[0].hash);
  const later=createAssistant(f.root,{runner:async()=>({status:'passed',output:remote})});
  const next=(await later.doctor()).nextWork;
  assert.equal(next.kind,'resume_handoff');assert.equal(next.id,saved.id);assert.equal(next.evidence.state,'current');
  assert.deepEqual(next.evidence.files.map(r=>r.state),['unchanged','unchanged']);
  assert.equal(next.nextStep,note.nextStep);assert.deepEqual(next.blockers,note.blockers);
  assert.match(next.note,/not permission for live actions/);assert.deepEqual(fs.readFileSync(journal),after);
});
test('handoff resume rechecks changed or missing sources without changing recorded work', async t => {
  for(const expected of ['stale','unknown']){
    const f=fixture(t);localSetup(f.root);const file='automation/seo-optimizer.mjs';write(f.root,file,'Original source.');
    const saved=await f.app.save({...note,files:[file]});
    const journal=path.join(f.root,'dropship/assistant/handoff.jsonl'),before=fs.readFileSync(journal);
    const pin=f.app.read().latest[0].files[0].sha256;
    if(expected==='stale')write(f.root,file,'Changed source.');else fs.unlinkSync(path.join(f.root,file));
    const next=(await f.app.doctor()).nextWork;
    assert.equal(next.kind,'verify_handoff_sources');assert.equal(next.evidence.state,expected);
    assert.equal(next.id,saved.id);assert.equal(next.nextStep,note.nextStep);assert.deepEqual(next.blockers,note.blockers);
    assert.equal(next.evidence.files[0].expectedSha256,pin);
    assert.deepEqual(fs.readFileSync(journal),before);assert.equal(f.app.read().state,'available');
  }
});
test('legacy and explicitly empty handoff sources remain unknown manual suggestions', async t => {
  const f=fixture(t);localSetup(f.root);
  for(const explicit of [false,true]){
    const saved=await f.app.save({...note,...(explicit?{files:[]}:{} )});
    const row=f.app.read().latest.at(-1);assert.equal(Object.hasOwn(row,'files'),explicit);
    if(explicit)assert.deepEqual(row.files,[]);
    const journal=path.join(f.root,'dropship/assistant/handoff.jsonl'),before=fs.readFileSync(journal);
    const next=(await f.app.doctor()).nextWork;
    assert.equal(next.kind,'resume_handoff');assert.equal(next.id,saved.id);
    assert.deepEqual(next.evidence,{state:'unknown',reason:'no_pinned_files',files:[]});
    assert.equal(next.nextStep,note.nextStep);assert.deepEqual(next.blockers,note.blockers);
    assert.deepEqual(fs.readFileSync(journal),before);
  }
});
test('invalid handoff source lists or out-of-scope paths never change existing history', async t => {
  const f=fixture(t);localSetup(f.root);await f.app.save(note);
  const journal=path.join(f.root,'dropship/assistant/handoff.jsonl'),before=fs.readFileSync(journal);
  for(const files of [null,undefined,'automation/seo-optimizer.mjs',{},Array(7).fill('automation/seo-optimizer.mjs'),[42],['../secret'],['/tmp/secret'],['automation/../secret'],['dropship/ABAN-PLAN.md'],['.claude/settings.json']]){
    await assert.rejects(f.app.save({...note,files}));
    assert.deepEqual(fs.readFileSync(journal),before);
  }
  assert.equal(fs.existsSync(path.join(f.root,'dropship/assistant/.handoff.lock')),false);
});
test('missing, symlinked and invalid-UTF8 handoff sources never append a partial record', async t => {
  const f=fixture(t);localSetup(f.root);await f.app.save(note);
  const journal=path.join(f.root,'dropship/assistant/handoff.jsonl'),before=fs.readFileSync(journal);
  const file='dropship/luxe-source.md';write(f.root,file,'Original source.');
  fs.symlinkSync(path.join(f.root,file),path.join(f.root,'dropship/luxe-symlink.md'));
  fs.symlinkSync(path.join(f.root,'dropship'),path.join(f.root,'dropship/luxe-parent'));
  write(f.root,'dropship/luxe-invalid.md',Buffer.from([0xff,0xfe]));
  for(const ref of ['dropship/luxe-missing.md','dropship/luxe-symlink.md','dropship/luxe-parent/luxe-source.md','dropship/luxe-invalid.md']){
    await assert.rejects(f.app.save({...note,files:[file,ref]}));
    assert.deepEqual(fs.readFileSync(journal),before);
  }
  assert.equal(f.app.read().state,'available');assert.equal(f.app.read().records,1);
  assert.equal(fs.existsSync(path.join(f.root,'dropship/assistant/.handoff.lock')),false);
});
test('setup, locks and broken history prevent resume without resetting anything', async t => {
  const f=fixture(t);localSetup(f.root);await f.app.save(note);
  write(f.root,'dropship/assistant/.handoff.lock','another writer');
  const locked=await f.app.doctor();assert.equal(locked.localReadiness.state,'blocked');assert.equal(locked.nextWork.kind,'resolve_setup');
  assert.equal(fs.readFileSync(path.join(f.root,'dropship/assistant/.handoff.lock'),'utf8'),'another writer');
  fs.unlinkSync(path.join(f.root,'dropship/assistant/.handoff.lock'));write(f.root,'dropship/assistant/handoff.jsonl','broken\n');
  const bad=await f.app.doctor();assert.equal(bad.localReadiness.state,'unknown');assert.equal(bad.nextWork.kind,'resolve_setup');
  assert.equal(fs.readFileSync(path.join(f.root,'dropship/assistant/handoff.jsonl'),'utf8'),'broken\n');
  write(f.root,'.mcp.json','invalid');assert.equal((await f.app.doctor()).localReadiness.state,'unknown');
});
test('resume finds the oldest open review behind an answered first page', async t => {
  const f=fixture(t);localSetup(f.root);const file='automation/seo-optimizer.mjs';write(f.root,file,'original');
  let last;
  for(let i=0;i<6;i++){
    last=await f.app.reviewRequest({question:'Review '+i,files:[file]});
    if(i<5)await f.app.reviewAnswer({requestId:last.id,verdict:'no_findings',summary:'Manueller Prüfstand.',nextStep:'Nur für diesen Stand.'});
  }
  await f.app.save({...note,nextStep:'Ein späterer separater Handoff.'});
  assert.equal(f.app.reviewList().requests.every(r=>r.status==='answered'),true);
  let d=await f.app.doctor();assert.equal(d.nextWork.kind,'review_request');assert.equal(d.nextWork.requestId,last.id);
  write(f.root,file,'changed');d=await f.app.doctor();assert.equal(d.nextWork.kind,'verify_review_sources');assert.equal(d.nextWork.evidence.state,'stale');
});
test('a newer findings or blocked answer preserves its next step and blockers on resume', async t => {
  for(const verdict of ['findings','blocked']){
    const f=fixture(t);localSetup(f.root);const file='automation/seo-optimizer.mjs';write(f.root,file,'reviewed source');
    await f.app.save({...note,nextStep:'An älterem Entwurf weiterarbeiten.',blockers:[]});
    const request=await f.app.reviewRequest({question:'Diesen Stand prüfen.',files:[file]});
    const answer=await f.app.reviewAnswer({requestId:request.id,verdict,summary:'Manuell erfasster neuer Prüfstand.',nextStep:'Zuerst den bestätigten Befund klären.',blockers:['Die Klärung ist offen.']});
    const before=fs.readFileSync(path.join(f.root,'dropship/assistant/handoff.jsonl'),'utf8');
    const d=await f.app.doctor(),next=d.nextWork;
    assert.equal(d.localReadiness.state,'ready');assert.equal(next.kind,'resume_review_answer');
    assert.equal(next.id,answer.id);assert.equal(next.requestId,request.id);assert.equal(next.verdict,verdict);
    assert.equal(next.source,'manual');assert.equal(next.modelCalled,false);assert.equal(next.evidence.state,'current');
    assert.equal(next.nextStep,'Zuerst den bestätigten Befund klären.');assert.deepEqual(next.blockers,['Die Klärung ist offen.']);
    assert.deepEqual(next.command,['node','automation/claude-assist.mjs','review-get',request.id]);
    assert.match(next.note,/not an authenticated model response or permission for live actions/);
    assert.equal(fs.readFileSync(path.join(f.root,'dropship/assistant/handoff.jsonl'),'utf8'),before);
  }
});
test('a later handoff supersedes an answered review by journal sequence', async t => {
  const f=fixture(t);localSetup(f.root);const file='automation/seo-optimizer.mjs';write(f.root,file,'reviewed source');
  const request=await f.app.reviewRequest({question:'Diesen Stand prüfen.',files:[file]});
  await f.app.reviewAnswer({requestId:request.id,verdict:'findings',summary:'Befund erfasst.',nextStep:'Befund beheben.',blockers:['Behebung offen.']});
  const latest=await f.app.save({...note,nextStep:'Der spätere Übergabestand gilt.',blockers:['Neuer Blocker.']});
  write(f.root,file,'later source');
  const next=(await f.app.doctor()).nextWork;
  assert.equal(next.kind,'resume_handoff');assert.equal(next.id,latest.id);
  assert.equal(next.nextStep,'Der spätere Übergabestand gilt.');assert.deepEqual(next.blockers,['Neuer Blocker.']);
});
test('resuming an answer rechecks changed and missing review sources', async t => {
  for(const expected of ['stale','unknown']){
    const f=fixture(t);localSetup(f.root);const file='automation/seo-optimizer.mjs';write(f.root,file,'reviewed source');
    await f.app.save(note);
    const request=await f.app.reviewRequest({question:'Diesen Stand prüfen.',files:[file]});
    const answer=await f.app.reviewAnswer({requestId:request.id,verdict:'no_findings',summary:'Nur die ursprünglichen Bytes geprüft.',nextStep:'Quellen vor Fortsetzung gegenprüfen.',blockers:['Neue Änderungen ungeprüft.']});
    if(expected==='stale')write(f.root,file,'changed source');else fs.unlinkSync(path.join(f.root,file));
    const next=(await f.app.doctor()).nextWork;
    assert.equal(next.kind,'verify_review_sources');assert.equal(next.evidence.state,expected);
    assert.equal(next.id,answer.id);assert.equal(next.requestId,request.id);assert.equal(next.verdict,'no_findings');
    assert.equal(next.source,'manual');assert.equal(next.modelCalled,false);
    assert.equal(next.nextStep,'Quellen vor Fortsetzung gegenprüfen.');assert.deepEqual(next.blockers,['Neue Änderungen ungeprüft.']);
  }
});
test('the latest review answer supplies a resume step even without a handoff', async t => {
  const f=fixture(t);localSetup(f.root);const file='automation/seo-optimizer.mjs';write(f.root,file,'reviewed source');
  let latestRequest,latestAnswer;
  for(let i=0;i<2;i++){
    latestRequest=await f.app.reviewRequest({question:'Diesen Stand prüfen '+i,files:[file]});
    latestAnswer=await f.app.reviewAnswer({requestId:latestRequest.id,verdict:'no_findings',summary:'Manuell geprüfter Stand '+i,nextStep:'Nächster Schritt '+i});
  }
  const next=(await f.app.doctor()).nextWork;
  assert.equal(next.kind,'resume_review_answer');assert.equal(next.id,latestAnswer.id);assert.equal(next.requestId,latestRequest.id);
  assert.equal(next.nextStep,'Nächster Schritt 1');assert.equal(next.evidence.state,'current');
});
test('the oldest open request still takes priority over a newer review answer', async t => {
  const f=fixture(t);localSetup(f.root);const file='automation/seo-optimizer.mjs';write(f.root,file,'reviewed source');
  const oldest=await f.app.reviewRequest({question:'Älteste offene Prüfung.',files:[file]});
  const newer=await f.app.reviewRequest({question:'Neuere Prüfung.',files:[file]});
  await f.app.reviewAnswer({requestId:newer.id,verdict:'findings',summary:'Neuerer Befund.',nextStep:'Neueren Befund klären.'});
  const next=(await f.app.doctor()).nextWork;
  assert.equal(next.kind,'review_request');assert.equal(next.requestId,oldest.id);
});
test('fixed stdin runner keeps Unicode chunks and stderr separate without echoing input', async () => {
  const r=await boundedRun(process.execPath,['-e',`process.stdin.on('data',x=>{process.stdout.write(x.subarray(0,1));setTimeout(()=>{process.stdout.write(x.subarray(1));process.stderr.write('diagnostic')},10)})`],{input:'Grösse: 你好'});
  assert.equal(r.status,'passed');assert.equal(r.stdout,'Grösse: 你好');assert.equal(r.stderr,'diagnostic');
  const rejected=await boundedRun('/must/not/be/launched',[],{input:'x'.repeat(65537)});assert.equal(rejected.reason,'invalid_or_oversized_stdin');
});
test('self-check launches the real local stdio server without writing history or claiming a client', async t => {
  const f=checkout(t);localSetup(f.root);const app=createAssistant(f.root);await app.save(note);
  const before=fs.readFileSync(path.join(f.root,'dropship/assistant/handoff.jsonl'),'utf8');
  const result=await app.selfCheck();assert.equal(result.status,'passed');assert.equal(result.protocol.state,'passed');assert.equal(result.protocol.tools,10);
  assert.equal(result.historyWritten,false);assert.equal(result.modelCalled,false);assert.match(result.claudeClient,/unknown/);
  assert.equal(fs.readFileSync(path.join(f.root,'dropship/assistant/handoff.jsonl'),'utf8'),before);
  fs.unlinkSync(path.join(f.root,'dropship/assistant/handoff.jsonl'));
  const firstRun=await app.selfCheck();assert.equal(firstRun.status,'unknown');assert.equal(firstRun.protocol.state,'passed');
  assert.equal(fs.existsSync(path.join(f.root,'dropship/assistant/handoff.jsonl')),false);
});
test('self-check does not run an unexpected config command and detects protocol errors', async t => {
  const f=fixture(t,(cmd,args)=>cmd==='git'?{status:'passed',output:remote}:{status:'passed',stdout:'not-json\n'});
  localSetup(f.root);write(f.root,'automation/lib/claude_assist_offline.mjs','// preload');await f.app.save(note);
  write(f.root,'.mcp.json',JSON.stringify({mcpServers:{'luxestyle-assist':{type:'stdio',command:'unapproved-program',args:['--write']}}}));
  const result=await f.app.selfCheck();assert.equal(result.status,'failed');assert.equal(result.protocol.reason,'invalid_or_incomplete_protocol');
  const launch=f.calls.find(c=>c.cmd!=='git');assert.equal(launch.cmd,process.execPath);assert.equal(launch.args.at(-1),'mcp');
  assert.ok(!launch.args.includes('--write'));
  const frames=launch.options.input.trim().split('\n').map(JSON.parse);
  for(const method of ['initialize','ping','tools/list','tools/call']) assert.ok(frames.find(r=>r.method===method).params._meta);
  const call=frames.find(r=>r.method==='tools/call');assert.equal(call.params.name,'luxe_handoff_read');assert.deepEqual(call.params.arguments,{});
  assert.ok(frames.some(r=>!r.method&&Object.hasOwn(r,'result')));assert.ok(frames.some(r=>!r.method&&Object.hasOwn(r,'error')));
});
test('doctor CLI fails for active locks and self-check CLI validates the real server', t => {
  const f=checkout(t);localSetup(f.root);const cli=path.join(f.root,'automation/claude-assist.mjs');
  const run=(args,input)=>spawnSync(process.execPath,[cli,...args],{cwd:f.root,input,encoding:'utf8',env:cleanEnv(),timeout:10000});
  assert.equal(run(['handoff-save'],JSON.stringify(note)).status,0);
  const self=run(['self-check']);assert.equal(self.status,0,self.stderr);assert.equal(JSON.parse(self.stdout).protocol.tools,10);
  write(f.root,'dropship/assistant/.handoff.lock','owned elsewhere');const d=run(['doctor']);assert.equal(d.status,1);assert.equal(JSON.parse(d.stdout).localReadiness.state,'blocked');
});
test('integration config can be pinned without exporting raw MCP secrets', async t => {
  const f=fixture(t);localSetup(f.root);
  const request=await f.app.reviewRequest({question:'Konfiguration prüfen.',files:['.mcp.json','.claude/commands/luxestyle-assist.md']});
  assert.equal(f.app.reviewGet({requestId:request.id}).evidence.state,'current');
  const pack=await f.app.context({question:'Konfiguration prüfen.',files:['.mcp.json','.claude/commands/luxestyle-assist.md']});
  assert.equal(pack.files[0].reason,'raw_config_not_exported_use_doctor');assert.equal(pack.files[1].state,'included');
  assert.equal(JSON.stringify(pack).includes('private_value_not_to_report'),false);
  assert.equal(f.app.reviewList({after:'wrong'}).reason,'unknown_review_cursor');assert.equal(f.app.read().state,'available');
});
test('the actual configured MCP launch clears inherited Node preloads before JSON-RPC', t => {
  const f=checkout(t);localSetup(f.root);
  const server=JSON.parse(fs.readFileSync(path.join(f.root,'.mcp.json'),'utf8')).mcpServers['luxestyle-assist'];
  const parent={...cleanEnv(),NODE_OPTIONS:'--import=data:text/javascript,console.log(12345)',NODE_PATH:'/unreviewed-parent-path'};
  const input=JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'probe',version:'1'}}})+'\n';
  const control=spawnSync(process.execPath,server.args,{cwd:f.root,input,encoding:'utf8',env:parent,timeout:5000});
  assert.equal(control.status,0,control.stderr);assert.equal(control.stdout.split('\n')[0],'12345');
  const configured=spawnSync(process.execPath,server.args,{cwd:f.root,input,encoding:'utf8',env:{...parent,...server.env},timeout:5000});
  assert.equal(configured.status,0,configured.stderr);
  const responses=configured.stdout.trim().split('\n').map(JSON.parse);assert.equal(responses.length,1);assert.equal(responses[0].id,1);
  assert.equal(responses[0].result.serverInfo.name,'luxestyle-claude-assist');assert.equal(configured.stderr,'');
});

test('commit planning validates immutable paired pins before any Git call', async t => {
  const f=fixture(t),pin='a'.repeat(40);
  for(const args of [{baseCommit:pin},{headCommit:pin},{baseCommit:'HEAD',headCommit:pin},
    {baseCommit:pin+'\n',headCommit:pin},{baseCommit:pin,headCommit:3},
    {baseCommit:pin,headCommit:pin,fetch:true}]) await assert.rejects(f.app.changePlan(args));
  assert.equal(f.calls.length,0);
  await assert.rejects(f.app.checks({suite:'changed',baseCommit:pin,headCommit:pin}),/invalid_arguments/);
  assert.equal(f.calls.length,0);
});

test('commit planning uses isolated local Git reads and never launches a test', async t => {
  const f=fixture(t,(command,args)=>{
    assert.equal(command,'git');
    if(args.includes('config'))return {status:'passed',output:remote};
    const stdout=args.includes('cat-file')?'commit\n':args.includes('rev-parse')?'false\n':
      args.includes('diff')?'automation/lib/claude_assist.mjs\0':'';
    return {status:'passed',exitCode:0,stdout,stderr:'',output:stdout};
  });
  const baseCommit='A'.repeat(40),headCommit='B'.repeat(40);
  const result=await f.app.changePlan({baseCommit,headCommit});
  assert.equal(result.source,'local_pinned_commits');assert.equal(result.state,'planned');
  assert.equal(result.baseCommit,baseCommit.toLowerCase());assert.equal(result.headCommit,headCommit.toLowerCase());
  assert.deepEqual(result.suites,['assist']);assert.equal(result.executedTests,false);
  assert.equal(result.worktreeChanges,'not_scanned');assert.equal(result.testScope,'current_checkout_only');
  for(const call of f.calls.slice(1)){
    assert.ok(call.args.includes('--no-replace-objects'));assert.ok(call.args.includes('--no-lazy-fetch'));
    assert.ok(call.args.includes('protocol.allow=never'));assert.ok(call.args.includes('core.fsmonitor=false'));
    assert.equal(call.options.env.GIT_NO_LAZY_FETCH,'1');assert.equal(call.options.env.GIT_NO_REPLACE_OBJECTS,'1');
    assert.equal(call.options.env.GIT_ALLOW_PROTOCOL,'');assert.equal(call.options.env.OPENAI_API_KEY,undefined);
    assert.equal(call.options.timeoutMs,5000);assert.ok(call.options.maxBytes<=32768);
    assert.equal(call.args.some(x=>['fetch','checkout','switch','reset'].includes(x)),false);
  }
});

test('a clean checkout exposes committed changes through both CLI and MCP without testing or writing history', async t => {
  const f=checkout(t),file='automation/lib/shopify_gql.mjs';write(f.root,file,'export const fixture=1;');
  const git=args=>{const r=spawnSync('git',['-C',f.root,'-c','core.hooksPath='+path.join(f.root,'.git/no-hooks'),...args],{env:cleanEnv(),encoding:'utf8',timeout:5000});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
  const commit=()=>{git(['add','--','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','fixture']);return git(['rev-parse','HEAD']);};
  const baseCommit=commit();write(f.root,file,'export const fixture=2;');const headCommit=commit();
  const app=createAssistant(f.root);assert.equal((await app.changePlan()).state,'no_changes');
  const expected=await app.changePlan({baseCommit,headCommit});assert.equal(expected.state,'planned');
  assert.deepEqual(expected.files,[file]);assert.deepEqual(expected.suites,['core']);assert.equal(expected.executedTests,false);
  const cli=path.join(f.root,'automation/claude-assist.mjs');
  const run=(args,input)=>spawnSync(process.execPath,[cli,...args],{cwd:f.root,input,encoding:'utf8',env:cleanEnv(),timeout:10000});
  const c=run(['change-plan',baseCommit,headCommit]);assert.equal(c.status,0,c.stderr);
  const planned=JSON.parse(c.stdout);assert.deepEqual(planned.files,[file]);assert.equal(planned.baseCommit,baseCommit);assert.equal(planned.headCommit,headCommit);
  const input=[{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'commit-integration',version:'1'}}},
    {jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'luxe_change_plan',arguments:{baseCommit,headCommit}}}].map(JSON.stringify).join('\n')+'\n';
  const m=run(['mcp'],input);assert.equal(m.status,0,m.stderr);
  const response=m.stdout.trim().split('\n').map(JSON.parse)[1];assert.equal(response.result.isError,false);
  const content=JSON.parse(response.result.content[0].text);assert.deepEqual(content.files,[file]);assert.equal(content.executedTests,false);
  write(f.root,'automation/local-uncommitted.mjs','// not in the pinned snapshots');
  assert.deepEqual((await app.changePlan({baseCommit,headCommit})).files,[file]);
  assert.equal((await app.changePlan()).state,'unmapped');
  assert.equal(fs.existsSync(path.join(f.root,'dropship/assistant/handoff.jsonl')),false);
});

test('fixed checks bind passing observations to unchanged known source bytes', async t => {
  const f=fixture(t,cmd=>({status:'passed',output:cmd==='git'?remote:'ok'}));checkInputs(f.root,'core');
  const run=await f.app.checks({suite:'core'});
  assert.equal(run.status,'passed');assert.equal(run.evidence.state,'current');
  assert.equal(run.evidence.before.fingerprint,run.evidence.after.fingerprint);
  assert.match(run.evidence.before.fingerprint,/^[a-f0-9]{64}$/);
  assert.equal(run.nodeVersion,process.versions.node);assert.ok(Date.parse(run.finishedAt)>=Date.parse(run.startedAt));
  assert.equal(run.evidence.before.files.find(r=>r.file==='package.json').state,'absent');
  assert.ok(run.evidence.before.files.some(r=>r.file==='automation/lib/shopify_gql.mjs'&&r.state==='present'));
  assert.match(run.caveat,/not a frozen snapshot/);
});

test('source, test and preload changes during a run invalidate a passing result', async t => {
  for(const file of ['automation/lib/shopify_gql.mjs','automation/lib/shopify_gql_test.mjs','automation/lib/claude_assist_offline.mjs']){
    let changed=false;
    const f=fixture(t,cmd=>{
      if(cmd==='git')return {status:'passed',output:remote};
      if(!changed){write(f.root,file,'// changed while tests were running\n');changed=true;}
      return {status:'passed',output:'ok'};
    });checkInputs(f.root,'core');
    const run=await f.app.checks({suite:'core'});
    assert.equal(run.status,'unknown');assert.equal(run.evidence.state,'stale');
    assert.ok(run.evidence.changedFiles.includes(file));assert.notEqual(run.evidence.before.fingerprint,run.evidence.after.fingerprint);
  }
});

test('unavailable source inputs skip tests without claiming a passing profile', async t => {
  for(const variant of ['missing','symlink','directory','oversized']){
    const f=fixture(t);checkInputs(f.root,'core');const file=path.join(f.root,'automation/lib/shopify_gql.mjs');fs.unlinkSync(file);
    if(variant==='symlink')fs.symlinkSync(path.join(f.root,'automation/lib/shopify_secret.mjs'),file);
    if(variant==='directory')fs.mkdirSync(file);
    if(variant==='oversized')fs.writeFileSync(file,Buffer.alloc(1024*1024+1));
    const run=await f.app.checks({suite:'core'});
    assert.equal(run.status,'unknown');assert.equal(run.reason,'check_inputs_unavailable');assert.equal(run.evidence.state,'unknown');
    assert.deepEqual(run.results,[]);assert.equal(f.calls.some(c=>c.cmd!=='git'),false);
  }
});

test('a source deleted during checks stays unknown and a real failure still takes precedence', async t => {
  for(const status of ['passed','failed']){
    let changed=false;
    const f=fixture(t,cmd=>{
      if(cmd==='git')return {status:'passed',output:remote};
      if(!changed){fs.unlinkSync(path.join(f.root,'automation/lib/shopify_gql.mjs'));changed=true;}
      return {status,output:'fixture result'};
    });checkInputs(f.root,'core');const run=await f.app.checks({suite:'core'});
    assert.equal(run.status,status==='failed'?'failed':'unknown');assert.equal(run.evidence.state,'unknown');
    assert.equal(run.evidence.after.fingerprint,null);
  }
});

test('package metadata appearing during checks is a detected input change', async t => {
  const f=fixture(t,cmd=>{
    if(cmd==='git')return {status:'passed',output:remote};
    write(f.root,'package.json','{"type":"module"}\n');return {status:'passed',output:'ok'};
  });checkInputs(f.root,'core');const run=await f.app.checks({suite:'core'});
  assert.equal(run.status,'unknown');assert.equal(run.evidence.state,'stale');assert.deepEqual(run.evidence.changedFiles,['package.json']);
});

test('changed checks reread coverage and never hide a new uncovered path or a failed test', async t => {
  for(const testStatus of ['passed','failed']){
    let phase=0;
    const f=fixture(t,(cmd,args)=>{
      if(cmd!=='git')return {status:testStatus,output:'result'};
      if(args.includes('config'))return {status:'passed',output:remote};
      if(args.includes('--cached')){phase++;return {status:'passed',output:'automation/lib/shopify_gql.mjs\0'};}
      return {status:'passed',output:phase>1&&args.includes('ls-files')?'automation/new-live.mjs\0':''};
    });checkInputs(f.root,'core');const run=await f.app.checks({suite:'changed'});
    assert.equal(run.status,testStatus==='failed'?'failed':'unknown');assert.equal(run.changeCoverage.state,'stale');
    assert.deepEqual(run.plan.uncovered,[]);assert.deepEqual(run.planAfter.uncovered,['automation/new-live.mjs']);
  }
});

test('an unreadable post-test change list remains unknown rather than an empty plan', async t => {
  let phase=0;
  const f=fixture(t,(cmd,args)=>{
    if(cmd!=='git')return {status:'passed',output:'ok'};
    if(args.includes('config'))return {status:'passed',output:remote};
    if(args.includes('--cached'))phase++;
    if(phase>1)return {status:'unknown',reason:'read unavailable'};
    return {status:'passed',output:args.includes('--cached')?'automation/lib/shopify_gql.mjs\0':''};
  });checkInputs(f.root,'core');const run=await f.app.checks({suite:'changed'});
  assert.equal(run.status,'unknown');assert.equal(run.changeCoverage.state,'unknown');assert.equal(run.planAfter.files,null);
});

test('CLI rejects malformed UTF-8 without changing history and preserves valid Unicode', t => {
  const f=checkout(t),cli=path.join(f.root,'automation/claude-assist.mjs');
  const run=(args,input)=>spawnSync(process.execPath,[cli,...args],{cwd:f.root,input,encoding:'utf8',env:cleanEnv(),timeout:5000});
  const valid={...note,summary:'Grösse: 你好. Geprüfter Stand.'};
  assert.equal(run(['handoff-save'],JSON.stringify(valid)).status,0);
  const journal=path.join(f.root,'dropship/assistant/handoff.jsonl'),before=fs.readFileSync(journal);
  const bad=Buffer.concat([Buffer.from('{"summary":"'),Buffer.from([0xff]),Buffer.from('","nextStep":"Prüfen."}')]);
  assert.equal(run(['handoff-save'],bad).status,1);assert.deepEqual(fs.readFileSync(journal),before);
  const context=Buffer.concat([Buffer.from('{"question":"'),Buffer.from([0xff]),Buffer.from('","files":[]}')]);
  assert.equal(run(['context'],context).status,1);assert.deepEqual(fs.readFileSync(journal),before);
  assert.equal(JSON.parse(run(['handoff-read']).stdout).latest[0].summary,valid.summary);
});

test('real MCP handoff pins reach the shared journal and are rechecked by a later CLI process', t => {
  const f=checkout(t);localSetup(f.root);const file='automation/seo-optimizer.mjs';write(f.root,file,'// original source\n');
  const cli=path.join(f.root,'automation/claude-assist.mjs');
  const run=(args,input)=>spawnSync(process.execPath,[cli,...args],{cwd:f.root,input,encoding:'utf8',env:cleanEnv(),timeout:5000});
  const input=JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'luxe_handoff_save',arguments:{...note,files:[file]}}})+'\n';
  const saved=run(['mcp'],input);assert.equal(saved.status,0,saved.stderr);assert.equal(JSON.parse(saved.stdout).result.isError,false);
  const current=JSON.parse(run(['doctor']).stdout);assert.equal(current.nextWork.evidence.state,'current');
  write(f.root,file,'// changed source\n');const stale=JSON.parse(run(['doctor']).stdout);
  assert.equal(stale.nextWork.kind,'verify_handoff_sources');assert.equal(stale.nextWork.evidence.state,'stale');
  assert.equal(JSON.parse(run(['handoff-read']).stdout).records,1);
});
