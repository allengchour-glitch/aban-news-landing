/** Pure test selection only. It never reads files, runs Git or executes a test. */
const MAX_FILES = 200;
const ROOT_DOCS = new Set(['AGENTS.md', 'CLAUDE.md', 'SHARED-MEMORY.md', 'README.md']);
const ASSIST_CONFIG = new Set([
  '.mcp.json',
  '.claude/commands/luxestyle-assist.md',
  '.github/workflows/luxestyle-assist-tests.yml',
]);
const CORE_FILES = new Set([
  'automation/lib/shopify_gql.mjs', 'automation/lib/shopify_gql_test.mjs',
  'automation/lib/shopify_secret.mjs', 'automation/lib/shopify_secret_test.mjs',
  'automation/lib/kanal_sperren.mjs', 'automation/lib/kanal_sperren_test.mjs',
]);
const SEO_FILES = new Set([
  'automation/seo-optimizer.mjs', 'automation/seo-optimizer_test.mjs',
  'automation/lib/seo_titel.mjs', 'automation/lib/seo_titel_test.mjs',
]);
const ASSIST_FILES = new Set([
  'automation/claude-assist.mjs',
  'automation/lib/claude_assist.mjs', 'automation/lib/claude_assist_test.mjs',
  'automation/lib/claude_assist_mcp.mjs', 'automation/lib/claude_assist_mcp_test.mjs',
  'automation/lib/claude_assist_offline.mjs',
  'automation/lib/claude_assist_changes.mjs', 'automation/lib/claude_assist_changes_test.mjs',
  'automation/lib/claude_assist_readiness.mjs', 'automation/lib/claude_assist_readiness_test.mjs',
  'automation/lib/claude_assist_launch.mjs', 'automation/lib/claude_assist_launch_test.mjs',
  'automation/lib/claude_assist_runner.mjs', 'automation/lib/claude_assist_runner_test.mjs',
  'automation/lib/claude_assist_commits.mjs', 'automation/lib/claude_assist_commits_test.mjs',
  'automation/lib/claude_assist_evidence.mjs', 'automation/lib/claude_assist_evidence_test.mjs',
]);

function validPath(file) {
  if (typeof file !== 'string' || !file || file.length > 1024
    || /[\x00-\x1f\x7f\\]/.test(file) || file.startsWith('/')
    || /^[A-Za-z]:/.test(file)
    || file.split('/').some(piece => !piece || piece === '.' || piece === '..')) {
    throw Error('invalid_changed_path');
  }
  return file;
}

function suiteFor(file) {
  if (CORE_FILES.has(file)) return 'core';
  if (SEO_FILES.has(file)) return 'seo';
  if (ASSIST_FILES.has(file) || ASSIST_CONFIG.has(file)) return 'assist';
  return null;
}

function ignoredDocument(file) {
  if (ROOT_DOCS.has(file)) return true;
  // Keep unrelated brands visible as uncovered, including their documentation.
  if (/(?:^|\/)(?:aban(?:[^a-z0-9]|$)|pinterest_aban(?:\/|$))/i.test(file)) return false;
  return /^dropship\/.+\.(?:md|html)$/i.test(file)
    || /^dropship\/assistant\/.+\.jsonl$/i.test(file);
}

/**
 * Classify an already collected, bounded list of repository-relative paths.
 * Mapped paths select fixed suites, never arbitrary commands or changed files.
 * Ignored documents are explicit; any unrecognised path keeps coverage unknown.
 */
export function classifyChanges(input) {
  if (!Array.isArray(input) || input.length > MAX_FILES) throw Error('invalid_changed_files');
  const files = [...new Set(Array.from(input, validPath))].sort();
  const selected = new Set(), uncovered = [], ignored = [];
  for (const file of files) {
    const suite = suiteFor(file);
    if (suite) selected.add(suite);
    else if (ignoredDocument(file)) ignored.push(file);
    else uncovered.push(file);
  }
  return {
    state: files.length === 0 ? 'no_changes' : uncovered.length ? 'unmapped' : 'planned',
    files,
    suites: [...selected].sort(),
    uncovered,
    ignored,
  };
}
