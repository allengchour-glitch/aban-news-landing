import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { captureCheckEvidence, compareCheckEvidence } from './claude_assist_evidence.mjs';

const FILE = 'automation/lib/example.mjs';
const NOW = '2026-10-19T08:00:00.000Z';
const sha = raw => createHash('sha256').update(raw).digest('hex');
function reader(files, calls = []) {
  return (file, maxBytes) => {
    calls.push({ file, maxBytes });
    if (!Object.hasOwn(files, file)) throw Object.assign(Error('private path must not escape'), { code: 'ENOENT' });
    if (files[file] instanceof Error) throw files[file];
    return files[file];
  };
}
const capture = (files, input = { paths: [FILE] }, extra = {}) => captureCheckEvidence(input, { readFile: reader(files), now: () => NOW, ...extra });

test('unchanged raw inputs yield deterministic fingerprints independent of observation time', () => {
  const raw = Buffer.from('export const value=1;\n');
  const first = capture({ [FILE]: raw });
  const second = capture({ [FILE]: raw }, undefined, { now: () => '2026-10-19T08:01:00Z' });
  assert.equal(first.state, 'available'); assert.equal(first.capturedAt, NOW);
  assert.equal(first.files[0].sha256, sha(raw)); assert.equal(first.files[0].bytes, raw.length);
  assert.equal(first.fingerprint, second.fingerprint);
  const compared = compareCheckEvidence(first, second);
  assert.equal(compared.state, 'current'); assert.deepEqual(compared.changedFiles, []);
  assert.match(compared.note, /not an immutable snapshot/);
  assert.doesNotMatch(JSON.stringify(first), /export const/);
});

test('same-length source changes are stale and identify the affected file', () => {
  const first = capture({ [FILE]: Buffer.from('one') });
  const second = capture({ [FILE]: Buffer.from('two') });
  assert.equal(compareCheckEvidence(first, second).state, 'stale');
  assert.deepEqual(compareCheckEvidence(first, second).changedFiles, [FILE]);
});

test('deleted required files produce unknown, never a passing comparison', () => {
  const first = capture({ [FILE]: Buffer.from('one') });
  const second = capture({});
  assert.equal(second.state, 'unknown'); assert.equal(second.fingerprint, null);
  assert.equal(compareCheckEvidence(first, second).state, 'unknown');
  assert.deepEqual(compareCheckEvidence(first, second).changedFiles, [FILE]);
  assert.doesNotMatch(JSON.stringify(second), /private path/);
});

test('optional ENOENT is explicit absence; appearance and disappearance are stale', () => {
  const absent = capture({ [FILE]: Buffer.alloc(0) });
  const present = capture({ [FILE]: Buffer.alloc(0), 'package.json': Buffer.from('{}') });
  assert.deepEqual(absent.files.find(row => row.file === 'package.json'), {
    file: 'package.json', optional: true, state: 'absent', sha256: null, bytes: null,
  });
  assert.equal(compareCheckEvidence(absent, absent).state, 'current');
  for (const [before, after] of [[absent, present], [present, absent]]) {
    assert.equal(compareCheckEvidence(before, after).state, 'stale');
    assert.deepEqual(compareCheckEvidence(before, after).changedFiles, ['package.json']);
  }
});

test('optional permission/unsafe failures remain unknown rather than absent', () => {
  for (const code of ['EACCES', 'ELOOP', undefined]) {
    const value = capture({ [FILE]: Buffer.alloc(0), 'package.json': Object.assign(Error('sensitive diagnostics'), { code }) });
    assert.equal(value.state, 'unknown'); assert.equal(value.fingerprint, null);
    assert.equal(value.files.find(row => row.file === 'package.json').state, 'unknown');
    assert.doesNotMatch(JSON.stringify(value), /sensitive diagnostics/);
  }
});

test('hashes preserve invalid UTF-8 and all original binary bytes', () => {
  const raw = Buffer.from([0xff, 0xfe, 0x00, 0x80]);
  const value = capture({ [FILE]: raw }, { paths: [FILE], optionalPaths: [] });
  assert.equal(value.state, 'available'); assert.equal(value.files[0].sha256, sha(raw));
  assert.notEqual(value.files[0].sha256, sha(Buffer.from(raw.toString('utf8'))));
  assert.equal(value.files[0].bytes, 4);
});

test('at most forty distinct safe paths are read, sorted and deduplicated', () => {
  const names = Array.from({ length: 40 }, (_, i) => `automation/source-${String(i).padStart(2, '0')}.mjs`);
  const files = Object.fromEntries(names.map(file => [file, Buffer.alloc(0)])), calls = [];
  const value = capture(files, { paths: [...names].reverse().concat(names[0]), optionalPaths: [] }, { readFile: reader(files, calls) });
  assert.equal(value.state, 'available'); assert.equal(calls.length, 40);
  assert.deepEqual(value.files.map(row => row.file), names);
  const overflowCalls = [];
  const overflow = capture(files, { paths: names }, { readFile: reader(files, overflowCalls) });
  assert.equal(overflow.state, 'unknown'); assert.equal(overflow.fingerprint, null); assert.equal(overflowCalls.length, 0);
});

test('required wins over optional when a path is listed in both', () => {
  const value = capture({}, { paths: ['package.json'], optionalPaths: ['package.json'] });
  assert.equal(value.state, 'unknown'); assert.equal(value.files[0].state, 'unknown');
  assert.equal(value.files[0].optional, undefined);
});

test('unsafe paths and invalid manifests fail before any reads', () => {
  for (const paths of [[null], ['../secret'], ['/etc/passwd'], ['C:/secret'], ['one\\two'], ['a//b'], ['a/./b'], ['a/../b'], ['new\nline'], ['\ud800'], [], Array(1)]) {
    const calls = [];
    const value = capture({}, { paths, optionalPaths: [] }, { readFile: reader({}, calls) });
    assert.equal(value.state, 'unknown'); assert.equal(value.fingerprint, null); assert.equal(calls.length, 0);
  }
  for (const input of [null, {}, { paths: FILE }, { paths: [FILE], optionalPaths: null }, { paths: [FILE], maxBytes: Infinity }]) {
    assert.equal(capture({}, input).state, 'unknown');
  }
});

test('individual file limit is enforced even when a reader ignores its bound', () => {
  const calls = [];
  const value = capture({ [FILE]: Buffer.alloc(1024 * 1024 + 1) }, { paths: [FILE], optionalPaths: [] }, {
    readFile: reader({ [FILE]: Buffer.alloc(1024 * 1024 + 1) }, calls),
  });
  assert.equal(calls[0].maxBytes, 1024 * 1024);
  assert.equal(value.state, 'unknown'); assert.equal(value.fingerprint, null);
  assert.equal(value.files[0].reason, 'file_byte_limit');
});

test('four MiB total boundary permits exact size and limits later reads', () => {
  const names = ['a.mjs', 'b.mjs', 'c.mjs', 'd.mjs'];
  const files = Object.fromEntries(names.map(file => [file, Buffer.alloc(1024 * 1024)]));
  const exact = capture(files, { paths: names });
  assert.equal(exact.state, 'available');
  const calls = [];
  const overflow = capture({ ...files, 'e.mjs': Buffer.from('x') }, { paths: [...names, 'e.mjs', 'f.mjs'], optionalPaths: [] }, {
    readFile: reader({ ...files, 'e.mjs': Buffer.from('x'), 'f.mjs': Buffer.from('x') }, calls),
  });
  assert.equal(overflow.state, 'unknown'); assert.equal(overflow.fingerprint, null);
  assert.equal(calls.at(-1).file, 'e.mjs'); assert.equal(calls.at(-1).maxBytes, 0);
  assert.equal(overflow.files.find(row => row.file === 'e.mjs').reason, 'total_byte_limit');
  assert.equal(overflow.files.find(row => row.file === 'f.mjs').state, 'unknown');
});

test('missing/non-buffer/async readers and invalid clocks remain unknown', () => {
  assert.equal(captureCheckEvidence({ paths: [FILE] }, { now: () => NOW }).state, 'unknown');
  for (const raw of ['content', new Uint8Array([1, 2]), null, Promise.resolve(Buffer.alloc(0))]) {
    assert.equal(capture({}, { paths: [FILE], optionalPaths: [] }, { readFile: () => raw }).state, 'unknown');
  }
  for (const now of [() => 'invalid', () => null, () => { throw Error('private'); }, 123]) {
    const value = capture({}, undefined, { now });
    assert.equal(value.state, 'unknown'); assert.equal(value.capturedAt, null);
    assert.equal(value.fingerprint, null);
  }
});

test('missing, malformed or tampered evidence never compares as current', () => {
  const valid = capture({ [FILE]: Buffer.from('one') });
  for (const bad of [null, {}, { ...valid, fingerprint: '0'.repeat(64) }, { ...valid, files: [] },
    { ...valid, files: [{ ...valid.files[0], bytes: 2 ** 32 }] },
    { ...valid, files: [{ ...valid.files[0], file: '../secret' }] },
    { ...valid, files: [valid.files[0], valid.files[0]] }]) {
    const compared = compareCheckEvidence(valid, bad);
    assert.equal(compared.state, 'unknown');
    assert.deepEqual(compared.changedFiles, []);
  }
});

test('a changed manifest is stale even when its overlapping bytes match', () => {
  const before = capture({ [FILE]: Buffer.from('one') });
  const after = capture({ [FILE]: Buffer.from('one') }, { paths: [FILE], optionalPaths: [] });
  assert.equal(compareCheckEvidence(before, after).state, 'stale');
  assert.deepEqual(compareCheckEvidence(before, after).changedFiles, ['package.json']);
});
