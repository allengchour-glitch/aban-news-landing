import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createReadPlan, assertLuxeStyleShop } from './LUXESTYLE-READONLY-GATE-20261114-R204.mjs';

const dir = path.dirname(new URL(import.meta.url).pathname);
const cli = path.join(dir, 'LUXESTYLE-READONLY-GATE-20261114-R204.mjs');
const sourceRoot = path.resolve(process.argv[2] || path.join(dir, '../..'));
const diagnosisPath = path.join(sourceRoot, 'automation/diagnose_actions_zugang.mjs');
const helperPath = path.join(sourceRoot, 'automation/lib/shopify_secret.mjs');
const diagnosis = await readFile(diagnosisPath);
const helper = await readFile(helperPath);
const env = { PATH: process.env.PATH, SHOPIFY_SHOP: 'au3j0y-hq.myshopify.com' };
const passed = [];
for (const bad of ['attacker.myshopify.com', 'https://au3j0y-hq.myshopify.com', 'au3j0y-hq.myshopify.com.evil', 'au3j0y-hq.myshopify.com/', undefined, new String('au3j0y-hq.myshopify.com')]) {
  assert.throws(() => assertLuxeStyleShop(bad), { message: 'Shop configuration rejected.' });
}
assert.equal(assertLuxeStyleShop('  AU3J0Y-HQ.MYSHOPIFY.COM  '), 'au3j0y-hq.myshopify.com');
passed.push('strict string host allowlist rejects missing, boxed string, URL, foreign, suffix and path variants; accepts trim/case normalization');

const reads = [];
const proxy = new Proxy({}, { get(_target, key) { reads.push(key); return key === 'SHOPIFY_SHOP' ? 'au3j0y-hq.myshopify.com' : undefined; } });
const plan = createReadPlan(proxy);
assert.deepEqual(reads, ['SHOPIFY_SHOP']);
assert.equal(plan.runtimeIdentityVerified, false);
assert.equal(plan.networkStarted, false);
passed.push('plan reads only SHOPIFY_SHOP and marks identity/network false');

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'r204-fixture-'));
  await mkdir(path.join(root, 'automation/lib'), { recursive: true });
  await writeFile(path.join(root, 'automation/diagnose_actions_zugang.mjs'), diagnosis);
  await writeFile(path.join(root, 'automation/lib/shopify_secret.mjs'), helper);
  return root;
}
const validRoot = await fixture();
try {
  const valid = spawnSync(process.execPath, [cli, '--repo-root', validRoot], { encoding: 'utf8', env, timeout: 5000 });
  assert.equal(valid.status, 0, valid.stderr);
  const output = JSON.parse(valid.stdout);
  assert.equal(output.mode, 'preflight-only');
  assert.equal(output.runtimeIdentityVerified, false);
  assert.equal(output.networkStarted, false);
  assert.equal(output.sourceSha256['automation/diagnose_actions_zugang.mjs'], '86fe9eac9d08b1664503ca93d887fb427ed5f0505eb13ef855c3b363b9eba506');
  assert.equal(output.sourceSha256['automation/lib/shopify_secret.mjs'], '2d9da92ebe5b50a489a516baf089289f204fd8411a53e1f52af3b44c59e1273c');
  passed.push('valid canonical fixture preflight validates and reports both pins');
} finally { await rm(validRoot, { recursive: true, force: true }); }

const missing = path.join(os.tmpdir(), 'r204-definitely-missing-root');
const foreign = spawnSync(process.execPath, [cli, '--repo-root', missing], { encoding: 'utf8', env: { ...env, SHOPIFY_SHOP: 'foreign.myshopify.com' }, timeout: 5000 });
assert.equal(foreign.status, 3);
assert.match(foreign.stderr, /Shop configuration rejected/);
assert.doesNotMatch(foreign.stderr, /Pinned diagnosis/);
passed.push('foreign host rejected before missing-file access');

for (const [label, alter] of [
  ['missing diagnosis', async root => { await rm(path.join(root, 'automation/diagnose_actions_zugang.mjs')); }],
  ['tampered diagnosis', async root => { await writeFile(path.join(root, 'automation/diagnose_actions_zugang.mjs'), Buffer.concat([diagnosis, Buffer.from('\n// changed\n')])); }],
  ['tampered helper', async root => { await writeFile(path.join(root, 'automation/lib/shopify_secret.mjs'), Buffer.concat([helper, Buffer.from('\n// changed\n')])); }],
]) {
  const root = await fixture();
  try {
    await alter(root);
    const res = spawnSync(process.execPath, [cli, '--repo-root', root], { encoding: 'utf8', env, timeout: 5000 });
    assert.equal(res.status, 4, label + ': ' + res.stderr);
    assert.match(res.stderr, /Pinned diagnosis source validation failed/);
    passed.push(`${label} fails closed`);
  } finally { await rm(root, { recursive: true, force: true }); }
}

for (const args of [['--execute-existing-diagnose'], ['--unknown']]) {
  const res = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', env, timeout: 5000 });
  assert.equal(res.status, 2);
  assert.match(res.stderr, /Unsupported argument/);
}
passed.push('execution and unknown flags rejected without import or execution');

const report = { task: 'LUXESTYLE-READONLY-GATE-20261114-R204', command: `${process.execPath} ${process.argv[1]} ${sourceRoot}`, sourceRoot, sourceSha256: { 'automation/diagnose_actions_zugang.mjs': '86fe9eac9d08b1664503ca93d887fb427ed5f0505eb13ef855c3b363b9eba506', 'automation/lib/shopify_secret.mjs': '2d9da92ebe5b50a489a516baf089289f204fd8411a53e1f52af3b44c59e1273c' }, networkUsed: false, credentialsRead: false, diagnosisImported: false, workflowExecuted: false, testsPassed: passed };
await writeFile(path.join(dir, 'LUXESTYLE-READONLY-GATE-20261114-R204.report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
