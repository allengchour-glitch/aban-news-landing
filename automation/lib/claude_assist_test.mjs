import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
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
  for (const file of ['claude_assist.mjs','claude_assist_mcp.mjs','claude_assist_offline.mjs','claude_assist_changes.mjs']) fs.copyFileSync(path.join(here, file), path.join(f.root, 'automation/lib', file));
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
    for(const file of ['automation/lib/shopify_gql_test.mjs','automation/lib/shopify_secret_test.mjs','automation/lib/kanal_sperren_test.mjs','automation/lib/claude_assist_offline.mjs'])write(f.root,file,'');
    const run=await f.app.checks({suite:'changed'});assert.equal(run.status,testStatus==='failed'?'failed':'unknown');
    assert.deepEqual(run.plan.uncovered,['automation/new-live.mjs']);
  }
});
test('assist profile runs only its fixed integration files without claiming a network sandbox', async t => {
  const f=fixture(t,(cmd,args)=>({status:'passed',output:cmd==='git'?remote:'ok'}));
  for(const file of ['claude_assist_test.mjs','claude_assist_mcp_test.mjs','claude_assist_changes_test.mjs'])write(f.root,'automation/lib/'+file,'');
  const run=await f.app.checks({suite:'assist'});assert.equal(run.status,'passed');
  const call=f.calls.find(c=>c.cmd!=='git');assert.equal(call.args[0],'--test');assert.equal(call.args.length,4);assert.match(run.caveat,/no network preload/);
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
