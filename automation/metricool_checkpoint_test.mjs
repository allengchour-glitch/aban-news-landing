import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const LIVE = { DRY_RUN: '0', APPROVE_PUBLISH: '1', METRICOOL_USER_TOKEN: 'fake-token',
  METRICOOL_USER_ID: '1', METRICOOL_BLOG_ID: '2' };

function fixture(t, count = 1) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'luxe-metricool-checkpoint-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'automation'));
  fs.mkdirSync(path.join(root, 'social'));
  const script = path.join(root, 'automation/metricool-schedule.mjs');
  fs.copyFileSync(new URL('metricool-schedule.mjs', import.meta.url), script);
  const csv = path.join(root, 'social/metricool_queue.csv');
  fs.writeFileSync(csv, 'id,publish_date,media_url,text,networks,status,scheduled_at,note\n' +
    Array.from({ length: count }, (_, i) =>
      `post-${i + 1},2026-12-01T10:00:00,https://example.invalid/${i + 1}.mp4,Text,instagram,ready,,existing-note\n`).join(''));
  return { root, script, csv, lock: csv + '.lock' };
}

function run(f, fake, env = LIVE) {
  const preload = path.join(f.root, 'fake.mjs');
  fs.writeFileSync(preload, `import fs from 'node:fs';
    console.log=(...args)=>fs.writeSync(1,args.join(' ')+'\\n');
    console.error=(...args)=>fs.writeSync(2,args.join(' ')+'\\n');
    globalThis.fetch=async()=>{throw new Error('UNEXPECTED NETWORK');};
    ${fake}`);
  return spawnSync(process.execPath, ['--import', preload, f.script], {
    cwd: f.root, encoding: 'utf8', timeout: 10000,
    env: { PATH: process.env.PATH, ...env }
  });
}

function records(f) {
  const rows = []; let row = [], field = '', quoted = false;
  const text = fs.readFileSync(f.csv, 'utf8');
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (char !== '\r') field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows.map(row => Object.fromEntries(header.map((name, i) => [name, row[i]])));
}

const NORMALIZE = `if (!opts.method) return {ok:true,text:async()=>JSON.stringify({url:'https://example.invalid/normalized.mp4'})};`;

test('bestätigte Post-ID wird vor dem nächsten POST atomar gespeichert', t => {
  const f = fixture(t, 2);
  const r = run(f, `let posts=0;
    globalThis.fetch=async(url,opts={})=>{
      ${NORMALIZE}
      const queue=fs.readFileSync('social/metricool_queue.csv','utf8');
      if (++posts===1) {
        if (!queue.includes(',inflight,')) throw new Error('MISSING INFLIGHT CHECKPOINT');
        return {ok:true,status:200,text:async()=>JSON.stringify({id:123,uuid:'-456'})};
      }
      if (!queue.includes(',scheduled,') || !queue.includes('123,-456')) throw new Error('SUCCESS CHECKPOINT MISSING');
      throw new Error('CONNECTION RESET');
    };`);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  const [one, two] = records(f);
  assert.equal(one.status, 'scheduled');
  assert.equal(one.metricool_post_id, '123');
  assert.equal(one.metricool_post_uuid, '-456');
  assert.ok(one.scheduled_at);
  assert.equal(two.status, 'uncertain');
  assert.ok(two.request_started_at);
  assert.match(two.note, /existing-note.*POST unbestätigt/);
  assert.equal(fs.existsSync(f.lock), false);
  assert.equal(fs.readdirSync(path.dirname(f.csv)).some(name => name.endsWith('.tmp')), false);
});

test('unbestätigter POST wird beim nächsten Lauf nicht wiederholt', t => {
  const f = fixture(t);
  const first = run(f, `globalThis.fetch=async(url,opts={})=>{
    ${NORMALIZE}
    throw new TypeError('fake-token must never be logged');
  };`);
  assert.equal(first.status, 1);
  assert.equal(records(f)[0].status, 'uncertain');
  assert.doesNotMatch(first.stdout + first.stderr, /fake-token/);
  const second = run(f, `globalThis.fetch=async()=>{fs.writeFileSync('unexpected-network','bad');throw new Error('RETRY');};`);
  assert.equal(second.status, 1);
  assert.equal(fs.existsSync(path.join(f.root, 'unexpected-network')), false);
  assert.match(second.stderr, /unbestätigte Zeile.*gesperrt/);
});

test('harter Abbruch nach POST lässt inflight stehen und bewahrt frühere Erfolge', t => {
  const f = fixture(t, 2);
  const r = run(f, `let posts=0;
    globalThis.fetch=async(url,opts={})=>{
      ${NORMALIZE}
      if (++posts===2) process.exit(88);
      return {ok:true,status:200,text:async()=>JSON.stringify({id:123})};
    };`);
  assert.equal(r.status, 88);
  assert.deepEqual(records(f).map(row => row.status), ['scheduled', 'inflight']);
  assert.equal(fs.existsSync(f.lock), true);
  // Simulate the operator confirming the original process has stopped.
  fs.unlinkSync(f.lock);
  const second = run(f, `globalThis.fetch=async()=>{fs.writeFileSync('unexpected-network','bad');throw new Error('RETRY');};`);
  assert.equal(second.status, 1);
  assert.equal(fs.existsSync(path.join(f.root, 'unexpected-network')), false);
});

test('HTTP200-Fachfehler, fehlende ID und HTTP500 bleiben uncertain', async t => {
  for (const response of [
    { ok: true, status: 200, body: { success: false, error: 'unsupported network' } },
    { ok: true, status: 200, body: {} },
    { ok: true, status: 200, body: { id: 123, draft: true } },
    { ok: false, status: 500, body: { error: 'server failed after write' } }
  ]) {
    await t.test(JSON.stringify(response), t => {
      const f = fixture(t);
      const r = run(f, `globalThis.fetch=async(url,opts={})=>{
        ${NORMALIZE}
        return {ok:${response.ok},status:${response.status},text:async()=>${JSON.stringify(JSON.stringify(response.body))}};
      };`);
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.equal(records(f)[0].status, 'uncertain');
      assert.equal(records(f)[0].metricool_post_id, '');
      assert.match(r.stderr, /keine sichere Post-ID/);
    });
  }
});

test('Fehler beim Lesen der POST-Antwort bleibt uncertain', t => {
  const f = fixture(t);
  const r = run(f, `globalThis.fetch=async(url,opts={})=>{
    ${NORMALIZE}
    return {ok:true,status:200,text:async()=>{throw new TypeError('body reset');}};
  };`);
  assert.equal(r.status, 1);
  assert.equal(records(f)[0].status, 'uncertain');
});

test('Normalisierungs-Netzwerkfehler lässt die ungesendete Zeile ready', t => {
  const f = fixture(t);
  const before = fs.readFileSync(f.csv, 'utf8');
  const r = run(f, `globalThis.fetch=async(url,opts={})=>{
    if (opts.method) fs.writeFileSync('unexpected-post','bad');
    throw new TypeError('normalization unavailable');
  };`);
  assert.equal(r.status, 1);
  assert.equal(fs.readFileSync(f.csv, 'utf8'), before);
  assert.equal(fs.existsSync(path.join(f.root, 'unexpected-post')), false);
  assert.match(r.stderr, /kein POST gesendet/);
});

test('Checkpoint-Fehler nach bestätigtem POST bewahrt atomar den inflight-Zustand', t => {
  const f = fixture(t);
  const r = run(f, `const originalRename=fs.renameSync;let renames=0;
    fs.renameSync=(...args)=>{if(++renames===2)throw Object.assign(new Error('disk full'),{code:'ENOSPC'});return originalRename(...args);};
    globalThis.fetch=async(url,opts={})=>{
      ${NORMALIZE}
      return {ok:true,status:200,text:async()=>JSON.stringify({id:123})};
    };`);
  assert.equal(r.status, 1);
  assert.equal(records(f)[0].status, 'inflight');
  assert.equal(fs.existsSync(f.lock), false);
  assert.equal(fs.readdirSync(path.dirname(f.csv)).some(name => name.endsWith('.tmp')), false);
});

test('Fehler im ersten Checkpoint verhindert den POST vollständig', t => {
  const f = fixture(t);
  const before = fs.readFileSync(f.csv, 'utf8');
  const r = run(f, `fs.renameSync=()=>{throw Object.assign(new Error('disk full'),{code:'ENOSPC'});};
    globalThis.fetch=async(url,opts={})=>{
      ${NORMALIZE}
      fs.writeFileSync('unexpected-post','bad');
      return {ok:true,status:200,text:async()=>JSON.stringify({id:123})};
    };`);
  assert.equal(r.status, 1);
  assert.equal(fs.readFileSync(f.csv, 'utf8'), before);
  assert.equal(fs.existsSync(path.join(f.root, 'unexpected-post')), false);
});

test('vorhandene Queue-Sperre verhindert einen parallelen Publisher', t => {
  const f = fixture(t);
  fs.writeFileSync(f.lock, 'another-process');
  const r = run(f, `globalThis.fetch=async()=>{fs.writeFileSync('unexpected-network','bad');throw new Error('CONCURRENT POST');};`);
  assert.equal(r.status, 1);
  assert.equal(fs.readFileSync(f.lock, 'utf8'), 'another-process');
  assert.equal(fs.existsSync(path.join(f.root, 'unexpected-network')), false);
  assert.match(r.stderr, /gesperrt/);
});

test('Dry-Run ändert weder Queue noch Sperrdatei', t => {
  const f = fixture(t);
  const before = fs.readFileSync(f.csv, 'utf8');
  const r = run(f, '', {});
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(f.csv, 'utf8'), before);
  assert.equal(fs.existsSync(f.lock), false);
});

// --- Pinterest: Metricool verlangt pinterestData{boardId,pinTitle} (HTTP 400 ohne) ---

function pinFixture(t, row) {
  const f = fixture(t, 0);
  fs.writeFileSync(f.csv,
    'id,publish_date,media_url,text,networks,status,scheduled_at,note,pin_board_id,pin_title,pin_link\n' + row);
  return f;
}

const PIN_BODY = `let body=null;
  globalThis.fetch=async(url,opts={})=>{
    ${NORMALIZE}
    body=JSON.parse(opts.body);
    fs.writeFileSync('body.json', opts.body);
    return {ok:true,status:200,text:async()=>JSON.stringify({id:7,uuid:'-7'})};
  };`;

test('Pinterest-Zeile sendet boardId und pinTitle mit', t => {
  const f = pinFixture(t,
    'pin-1,2026-12-01T10:00:00,https://example.invalid/1.jpg,Text,pinterest,ready,,,B123,Mein Pin,https://luxestyle.ch/p\n');
  const r = run(f, PIN_BODY);
  assert.equal(r.status, 0, r.stderr);
  const body = JSON.parse(fs.readFileSync(path.join(f.root, 'body.json'), 'utf8'));
  assert.deepEqual(body.pinterestData,
    { boardId: 'B123', pinTitle: 'Mein Pin', pinNewFormat: true, pinLink: 'https://luxestyle.ch/p' });
  assert.equal(records(f)[0].status, 'scheduled');
});

test('Pinterest ohne Board oder Titel wird laut NICHT gesendet und bleibt ready', t => {
  for (const [board, title] of [['', 'Titel'], ['B123', ''], ['', '']]) {
    const f = pinFixture(t,
      `pin-x,2026-12-01T10:00:00,https://example.invalid/1.jpg,Text,pinterest,ready,,,${board},${title},\n`);
    const r = run(f, `globalThis.fetch=async(url,opts={})=>{
      ${NORMALIZE}
      throw new Error('POST DARF NICHT PASSIEREN');
    };`);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /pin_board_id\/pin_title/);
    assert.equal(records(f)[0].status, 'ready');
  }
});

// Gegenprobe in die andere Richtung: andere Kanäle brauchen die Spalten nicht,
// und eine Queue ohne die Pinterest-Spalten muss weiterlaufen.
test('Nicht-Pinterest-Zeile setzt kein pinterestData', t => {
  const f = pinFixture(t,
    'ig-1,2026-12-01T10:00:00,https://example.invalid/1.jpg,Text,instagram,ready,,,,,\n');
  const r = run(f, PIN_BODY);
  assert.equal(r.status, 0, r.stderr);
  const body = JSON.parse(fs.readFileSync(path.join(f.root, 'body.json'), 'utf8'));
  assert.equal(body.pinterestData, undefined);
  assert.deepEqual(body.instagramData, { autoPublish: true });
});

test('Queue ohne Pinterest-Spalten plant andere Kanäle unverändert', t => {
  const f = fixture(t, 1);
  const r = run(f, PIN_BODY);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(records(f)[0].status, 'scheduled');
});
