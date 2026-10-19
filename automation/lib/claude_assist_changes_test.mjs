import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyChanges } from './claude_assist_changes.mjs';

test('only an actually empty change list reports no_changes', () => {
  assert.deepEqual(classifyChanges([]), { state: 'no_changes', files: [], suites: [], uncovered: [], ignored: [] });
  const docs = classifyChanges(['dropship/assistant/README.md', 'dropship/assistant/handoff.jsonl']);
  assert.equal(docs.state, 'planned');
  assert.deepEqual(docs.suites, []);
  assert.equal(docs.ignored.length, 2);
});

test('fixed Shopify and channel helpers select core, including their existing tests', () => {
  for (const base of ['shopify_gql', 'shopify_secret', 'kanal_sperren']) {
    for (const suffix of ['', '_test']) {
      const file = 'automation/lib/' + base + suffix + '.mjs';
      const plan = classifyChanges([file]);
      assert.deepEqual(plan.suites, ['core'], file);
      assert.equal(plan.state, 'planned');
    }
  }
});

test('SEO scripts and title helpers select the fixed seo suite', () => {
  for (const file of ['automation/seo-optimizer.mjs', 'automation/seo-optimizer_test.mjs', 'automation/lib/seo_titel.mjs', 'automation/lib/seo_titel_test.mjs']) {
    assert.deepEqual(classifyChanges([file]).suites, ['seo'], file);
  }
});

test('Assist implementation, transport, preload, configuration and tests select assist', () => {
  for (const file of [
    'automation/claude-assist.mjs', 'automation/lib/claude_assist.mjs',
    'automation/lib/claude_assist_mcp.mjs', 'automation/lib/claude_assist_offline.mjs',
    'automation/lib/claude_assist_changes.mjs', 'automation/lib/claude_assist_changes_test.mjs',
    'automation/lib/claude_assist_readiness.mjs', 'automation/lib/claude_assist_readiness_test.mjs',
    'automation/lib/claude_assist_launch.mjs', 'automation/lib/claude_assist_launch_test.mjs',
    'automation/lib/claude_assist_runner.mjs', 'automation/lib/claude_assist_runner_test.mjs',
    'automation/lib/claude_assist_commits.mjs', 'automation/lib/claude_assist_commits_test.mjs',
    'automation/lib/claude_assist_evidence.mjs', 'automation/lib/claude_assist_evidence_test.mjs',
    '.mcp.json', '.claude/commands/luxestyle-assist.md', '.github/workflows/luxestyle-assist-tests.yml',
  ]) {
    assert.deepEqual(classifyChanges([file]).suites, ['assist'], file);
  }
});

test('plans are deterministically deduplicated and do not mutate caller data', () => {
  const files = ['automation/lib/shopify_gql.mjs', 'automation/seo-optimizer.mjs', 'automation/lib/claude_assist.mjs', 'automation/lib/shopify_gql.mjs'];
  const before = [...files], result = classifyChanges(files);
  assert.deepEqual(result.suites, ['assist', 'core', 'seo']);
  assert.deepEqual(result.files, [...new Set(files)].sort());
  assert.deepEqual(files, before);
});

test('unreviewed executable files never acquire an arbitrary test or passing coverage', () => {
  for (const file of ['automation/metricool-schedule.mjs', 'automation/lib/cj_video.mjs', 'automation/new-helper.mjs', 'dropship/cj_enrich.mjs', 'dropship/helper.py', 'dropship/deploy.sh']) {
    const result = classifyChanges([file]);
    assert.equal(result.state, 'unmapped', file);
    assert.deepEqual(result.uncovered, [file]);
    assert.deepEqual(result.suites, []);
  }
});

test('known coverage does not hide additional unknown changes', () => {
  const result = classifyChanges(['automation/lib/shopify_secret.mjs', 'automation/lib/future_helper.mjs']);
  assert.equal(result.state, 'unmapped');
  assert.deepEqual(result.suites, ['core']);
  assert.deepEqual(result.uncovered, ['automation/lib/future_helper.mjs']);
});

test('known non-executable project documents are explicit ignored entries', () => {
  for (const file of ['README.md', 'CLAUDE.md', 'SHARED-MEMORY.md', 'AGENTS.md', 'dropship/seo-review/VORSCHAU.html', 'dropship/assistant/README.md', 'dropship/assistant/handoff.jsonl']) {
    const result = classifyChanges([file]);
    assert.equal(result.state, 'planned');
    assert.deepEqual(result.ignored, [file]);
    assert.deepEqual(result.suites, []);
  }
});

test('other brands and unknown configuration stay uncovered', () => {
  for (const file of ['automation/pinterest_aban/post.mjs', 'dropship/ABAN-PLAN.md', 'dropship/aban/index.html', 'src/aban/app.js', '.github/workflows/deploy.yml', '.claude/settings.json', 'package.json', 'dropship/product-config.json', 'unknown-file.md']) {
    const result = classifyChanges([file]);
    assert.equal(result.state, 'unmapped', file);
    assert.deepEqual(result.uncovered, [file]);
    assert.deepEqual(result.ignored, []);
  }
});

test('similar filenames and untested host helpers cannot impersonate covered files', () => {
  for (const file of [
    'automation/lib/shopify_gql_backup.mjs', 'automation/lib/shopify_gql.mjs.sh',
    'automation/lib/shopify_host.mjs', 'automation/lib/shopify_host_test.mjs',
    'automation/seo-optimizer.mjs.sh', 'automation/seo-optimizer-live.mjs',
    'automation/seo-optimizer_future.mjs', 'automation/lib/seo_titel_live.mjs',
    'automation/lib/claude_assist_live.mjs', 'automation/lib/claude_assist_new_test.mjs',
    'other/automation/lib/claude_assist.mjs', 'automation/lib/CLAUDE_ASSIST.mjs',
  ]) {
    assert.equal(classifyChanges([file]).state, 'unmapped', file);
    assert.deepEqual(classifyChanges([file]).suites, [], file);
  }
});

test('invalid, absolute, traversal, control-byte and Windows paths are rejected', () => {
  for (const file of ['', null, 3, {}, '/etc/passwd', '../secret', 'automation/../secret', './CLAUDE.md', 'automation//test.mjs', 'automation/', 'automation\\test.mjs', 'C:/secret', 'C:\\secret', 'automation/zero\0.mjs', 'automation/new\nline.mjs', 'automation/tab\tfile.mjs', 'x'.repeat(1025)]) {
    assert.throws(() => classifyChanges([file]), /invalid_changed_path/);
  }
});

test('input count and type limits apply before deduplication', () => {
  for (const input of [null, {}, 'README.md', Array(201).fill('README.md')]) {
    assert.throws(() => classifyChanges(input), /invalid_changed_files/);
  }
  assert.equal(classifyChanges(Array(200).fill('README.md')).files.length, 1);
  assert.throws(() => classifyChanges(Array(1)), /invalid_changed_path/);
});
