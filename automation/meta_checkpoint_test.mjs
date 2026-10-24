import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const LIVE = { DRY_RUN:'0', APPROVE_PUBLISH:'1', IG_USER_ID:'ig', IG_ACCESS_TOKEN:'fake-token',
  FB_PAGE_ID:'fb', FB_PAGE_ACCESS_TOKEN:'fake-token', THREADS_USER_ID:'th', THREADS_ACCESS_TOKEN:'fake-token' };
const esc = value => '"' + String(value).replaceAll('"', '""') + '"';

function fixture(t, platforms = 'instagram', results = {}, status = 'ready') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'luxe-meta-checkpoint-'));
  t.after(() => fs.rmSync(root, { recursive:true, force:true }));
  fs.mkdirSync(path.join(root, 'automation'));
  fs.cpSync(new URL('lib/', import.meta.url),path.join(root,'automation/lib'),{recursive:true});
  fs.mkdirSync(path.join(root, 'social'));
  const script = path.join(root, 'automation/video-autopost-meta.mjs');
  fs.copyFileSync(new URL('video-autopost-meta.mjs', import.meta.url), script);
  const csv = path.join(root, 'social/video_queue.csv');
  fs.writeFileSync(csv, 'id,scheduled_date,video_url,caption,platforms,status,posted_at,post_url,platform_results\n' +
    `one,,https://example.invalid/master.mp4,Test,${platforms},${status},,,${esc(JSON.stringify(results))}\n`);
  return { root, script, csv, lock:csv + '.lock' };
}

function readQueue(csv) {
  const rows=[]; let row=[], field='', quoted=false;
  const text=fs.readFileSync(csv,'utf8');
  for(let i=0;i<text.length;i++) {
    const char=text[i];
    if(quoted) {
      if(char==='"' && text[i+1]==='"'){field+='"';i++;}
      else if(char==='"')quoted=false;
      else field+=char;
    } else if(char==='"')quoted=true;
    else if(char===','){row.push(field);field='';}
    else if(char==='\n'){row.push(field);rows.push(row);row=[];field='';}
    else if(char!=='\r')field+=char;
  }
  if(field||row.length){row.push(field);rows.push(row);}
  const [header,record]=rows;
  return Object.fromEntries(header.map((name,i)=>[name,record[i]]));
}

function record(f) {
  const row=readQueue(f.csv);
  return {...row, results:JSON.parse(row.platform_results)};
}

function run(f, fake, env=LIVE) {
  const preload=path.join(f.root,'fake.mjs');
  fs.writeFileSync(preload, `import fs from 'node:fs';
    console.log=(...args)=>fs.writeSync(1,args.join(' ')+'\\n');
    console.error=(...args)=>fs.writeSync(2,args.join(' ')+'\\n');
    globalThis.setTimeout=(fn)=>{fn();return 0;};
    globalThis.fetch=async()=>{throw new Error('UNEXPECTED NETWORK');};
    const readQueue=${readQueue.toString()};
    const ledger=()=>JSON.parse(readQueue('social/video_queue.csv').platform_results);
    ${fake}`);
  return spawnSync(process.execPath,['--import',preload,f.script],{
    cwd:f.root,encoding:'utf8',timeout:10000,env:{PATH:process.env.PATH,...env}
  });
}

const PREPARE = `
  if(url.includes('/me/accounts'))return {ok:true,json:async()=>({data:[]})};
  if(url.includes('/me?'))return {ok:true,json:async()=>({id:'th'})};
  if(url.includes('/container?'))return {ok:true,json:async()=>({status_code:'FINISHED',status:'FINISHED'})};
  if(url.endsWith('/media')||url.endsWith('/threads'))return {ok:true,json:async()=>({id:'container'})};
`;

test('alle finalen Publish-Endpunkte speichern inflight vor dem POST und sperren verlorene Antworten', async t => {
  for (const [platform, name, endpoint] of [['instagram','IG','/media_publish'],['facebook','FB','/fb/videos'],['threads','Threads','/threads_publish']]) {
    await t.test(name, t => {
      const f=fixture(t,platform);
      const r=run(f,`globalThis.fetch=async(url,opts={})=>{
        ${PREPARE}
        if(url.endsWith(${JSON.stringify(endpoint)})){
          const entry=ledger()[${JSON.stringify(name)}];
          if(entry?.status!=='inflight')throw new Error('INFLIGHT NOT PERSISTED');
          fs.writeFileSync('inflight-observed',JSON.stringify(entry));
          fs.writeFileSync('remote-created','once');
          throw new TypeError('fake-token reflected by upstream');
        }
        throw new Error('UNEXPECTED REQUEST');
      };`);
      assert.equal(r.status,1,r.stdout+r.stderr);
      assert.equal(fs.existsSync(path.join(f.root,'inflight-observed')),true);
      assert.equal(record(f).results[name].status,'uncertain');
      assert.equal(record(f).status,'uncertain');
      assert.equal(record(f).post_url,'');
      assert.doesNotMatch(r.stdout+r.stderr,/fake-token/);
      assert.equal(fs.existsSync(f.lock),false);
      const second=run(f,`globalThis.fetch=async()=>{fs.writeFileSync('unexpected-retry','bad');throw new Error('DUPLICATE');};`);
      assert.equal(second.status,1);
      assert.equal(fs.existsSync(path.join(f.root,'unexpected-retry')),false);
      assert.equal(record(f).results[name].status,'uncertain');
    });
  }
});

test('IG-Erfolg bleibt bestätigt, wenn FB mit mehrdeutigem HTTP500 antwortet', t => {
  const f=fixture(t,'instagram facebook');
  const first=run(f,`globalThis.fetch=async(url)=>{
    ${PREPARE}
    if(url.endsWith('/media_publish'))return {ok:true,status:200,json:async()=>({id:'published-ig'})};
    if(url.endsWith('/fb/videos')){
      if(ledger().IG!=='published-ig')throw new Error('IG CHECKPOINT MISSING');
      return {ok:false,status:500,json:async()=>({error:{code:1}})};
    }
    throw new Error('UNEXPECTED REQUEST');
  };`);
  assert.equal(first.status,1);
  assert.equal(record(f).results.IG,'published-ig');
  assert.equal(record(f).results.FB.status,'uncertain');
  assert.equal(record(f).post_url,'published-ig');
  const second=run(f,`globalThis.fetch=async()=>{fs.writeFileSync('unexpected-retry','bad');throw new Error('DUPLICATE');};`);
  assert.equal(second.status,1);
  assert.equal(fs.existsSync(path.join(f.root,'unexpected-retry')),false);
});

test('eindeutige Graph-API-Ablehnung wird ohne Doppelpost des bestätigten Kanals wiederholt', t => {
  const f=fixture(t,'instagram facebook');
  const first=run(f,`globalThis.fetch=async(url)=>{
    ${PREPARE}
    if(url.endsWith('/media_publish'))return {ok:true,status:200,json:async()=>({id:'published-ig'})};
    if(url.endsWith('/fb/videos'))return {ok:false,status:400,json:async()=>({error:{code:190}})};
    throw new Error('UNEXPECTED REQUEST');
  };`);
  assert.equal(first.status,1);
  assert.equal(record(f).status,'partial');
  assert.equal(record(f).results.FB.status,'failed');
  assert.equal(record(f).results.FB.retryable,true);
  const second=run(f,`globalThis.fetch=async(url)=>{
    if(url.includes('/me/accounts'))return {ok:true,json:async()=>({data:[]})};
    if(url.endsWith('/fb/videos'))return {ok:true,status:200,json:async()=>({id:'published-fb'})};
    fs.writeFileSync('unexpected-ig','bad');throw new Error('IG MUST NOT REPEAT');
  };`);
  assert.equal(second.status,0,second.stdout+second.stderr);
  assert.equal(record(f).status,'posted');
  assert.deepEqual(record(f).results,{IG:'published-ig',FB:'published-fb'});
  assert.equal(fs.existsSync(path.join(f.root,'unexpected-ig')),false);
});

test('fehlgeschlagene Verarbeitung vor Publish bleibt wiederholbar', t => {
  const f=fixture(t);
  const first=run(f,`globalThis.fetch=async(url)=>{
    if(url.endsWith('/media'))return {ok:true,json:async()=>({id:'container'})};
    if(url.includes('/container?'))return {ok:true,json:async()=>({status_code:'ERROR'})};
    fs.writeFileSync('unexpected-publish','bad');throw new Error('MUST NOT PUBLISH');
  };`);
  assert.equal(first.status,1);
  assert.equal(fs.existsSync(path.join(f.root,'unexpected-publish')),false);
  assert.equal(record(f).results.IG.status,'failed');
  assert.equal(record(f).results.IG.reason,'processing_failed');
  const second=run(f,`globalThis.fetch=async(url)=>{
    ${PREPARE}
    if(url.endsWith('/media_publish'))return {ok:true,status:200,json:async()=>({id:'published-ig'})};
    throw new Error('UNEXPECTED REQUEST');
  };`);
  assert.equal(second.status,0,second.stdout+second.stderr);
  assert.equal(record(f).status,'posted');
});

test('harter Abbruch beim finalen POST bleibt nach Neustart gesperrt', t => {
  const f=fixture(t);
  const r=run(f,`globalThis.fetch=async(url)=>{
    ${PREPARE}
    if(url.endsWith('/media_publish')){fs.writeFileSync('remote-created','once');process.exit(88);}
    throw new Error('UNEXPECTED REQUEST');
  };`);
  assert.equal(r.status,88);
  assert.equal(record(f).results.IG.status,'inflight');
  assert.equal(record(f).results.IG.container_id,'container');
  assert.equal(fs.existsSync(f.lock),true);
  fs.unlinkSync(f.lock); // Operator has confirmed the previous process has stopped.
  const second=run(f,`globalThis.fetch=async()=>{fs.writeFileSync('unexpected-retry','bad');throw new Error('DUPLICATE');};`);
  assert.equal(second.status,1);
  assert.equal(fs.existsSync(path.join(f.root,'unexpected-retry')),false);
  assert.equal(record(f).status,'uncertain');
});

test('HTTP200 ohne Post-ID oder mit unlesbarer Antwort gilt niemals als veröffentlicht', async t => {
  for (const json of ['async()=>({})',"async()=>{throw new TypeError('response reset');}"]) {
    await t.test(json,t=>{
      const f=fixture(t,'facebook');
      const r=run(f,`globalThis.fetch=async(url)=>{
        ${PREPARE}
        if(url.endsWith('/fb/videos'))return {ok:true,status:200,json:${json}};
        throw new Error('UNEXPECTED REQUEST');
      };`);
      assert.equal(r.status,1);
      assert.equal(record(f).status,'uncertain');
      assert.equal(record(f).posted_at,'');
    });
  }
});

test('erster Checkpoint-Fehler verhindert den finalen Publish-Request', t => {
  const f=fixture(t);
  const before=fs.readFileSync(f.csv,'utf8');
  const r=run(f,`fs.renameSync=()=>{throw Object.assign(new Error('disk full'),{code:'ENOSPC'});};
    globalThis.fetch=async(url)=>{
      ${PREPARE}
      fs.writeFileSync('unexpected-publish','bad');throw new Error('MUST NOT PUBLISH');
    };`);
  assert.equal(r.status,1);
  assert.equal(fs.existsSync(path.join(f.root,'unexpected-publish')),false);
  assert.equal(fs.readFileSync(f.csv,'utf8'),before);
  assert.equal(fs.readdirSync(path.dirname(f.csv)).some(name=>name.endsWith('.tmp')),false);
});

test('Checkpoint-Fehler nach erfolgreichem POST bewahrt den inflight-Zustand', t => {
  const f=fixture(t);
  const r=run(f,`const rename=fs.renameSync;let count=0;
    fs.renameSync=(...args)=>{if(++count===2)throw Object.assign(new Error('disk full'),{code:'ENOSPC'});return rename(...args);};
    globalThis.fetch=async(url)=>{
      ${PREPARE}
      if(url.endsWith('/media_publish'))return {ok:true,status:200,json:async()=>({id:'published-ig'})};
      throw new Error('UNEXPECTED REQUEST');
    };`);
  assert.equal(r.status,1);
  assert.equal(record(f).results.IG.status,'inflight');
  assert.equal(fs.existsSync(f.lock),false);
});

test('bestehende bestätigte String-Ledger bleiben ohne API-Aufruf kompatibel', t => {
  const f=fixture(t,'instagram',{IG:'already-published'},'partial');
  const r=run(f,`globalThis.fetch=async()=>{fs.writeFileSync('unexpected-request','bad');throw new Error('DUPLICATE');};`);
  assert.equal(r.status,0,r.stdout+r.stderr);
  assert.equal(record(f).status,'posted');
  assert.equal(record(f).results.IG,'already-published');
  assert.equal(fs.existsSync(path.join(f.root,'unexpected-request')),false);
});

test('paralleler Publisher wird vor jedem API-Aufruf blockiert', t => {
  const f=fixture(t);
  fs.writeFileSync(f.lock,'other-process');
  const r=run(f,`globalThis.fetch=async()=>{fs.writeFileSync('unexpected-request','bad');throw new Error('DUPLICATE');};`);
  assert.equal(r.status,1);
  assert.equal(fs.readFileSync(f.lock,'utf8'),'other-process');
  assert.equal(fs.existsSync(path.join(f.root,'unexpected-request')),false);
});

test('Dry-Run bleibt ohne Queue-Mutation und ohne Netzwerkzugriff', t => {
  const f=fixture(t);
  const before=fs.readFileSync(f.csv,'utf8');
  const r=run(f,'',{});
  assert.equal(r.status,0,r.stderr);
  assert.equal(fs.readFileSync(f.csv,'utf8'),before);
  assert.equal(fs.existsSync(f.lock),false);
});
