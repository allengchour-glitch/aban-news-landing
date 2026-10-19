/** Explicit local commit-snapshot planning. No refs, fetches, checkouts or tests. */
import { classifyChanges } from './claude_assist_changes.mjs';

const FULL_COMMIT = /^[a-fA-F0-9]{40}$/;
const READ_LIMITS = Object.freeze({ maxBytes: 32768, timeoutMs: 5000 });

/** Validate before any Git access. Names, abbreviations and revision syntax are forbidden. */
export function validateCommitPins(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw Error('invalid_commit_pins');
  const keys = Reflect.ownKeys(args);
  if (keys.length !== 2 || !keys.includes('baseCommit') || !keys.includes('headCommit')
    || typeof args.baseCommit !== 'string' || args.baseCommit.length !== 40 || !FULL_COMMIT.test(args.baseCommit)
    || typeof args.headCommit !== 'string' || args.headCommit.length !== 40 || !FULL_COMMIT.test(args.headCommit)) {
    throw Error('invalid_commit_pins');
  }
  return { baseCommit: args.baseCommit.toLowerCase(), headCommit: args.headCommit.toLowerCase() };
}

/** runGit owns the reviewed global flags, sanitized environment and repository cwd. */
export async function planCommitRange(args, { runGit } = {}) {
  const pins = validateCommitPins(args);
  if (typeof runGit !== 'function') throw Error('invalid_git_reader');
  const scope = { source: 'local_pinned_commits', ...pins,
    worktreeChanges: 'not_scanned', executedTests: false, testScope: 'current_checkout_only',
    testNote: 'Planning only; neither commit was checked out or tested. Tests execute in the current checkout.' };
  const unknown = reason => ({ ...scope, state: 'unknown', reason,
    files: null, suites: [], uncovered: null, ignored: null });

  async function read(argv) {
    try {
      const result = await runGit(argv, { ...READ_LIMITS });
      if (!result || result.status !== 'passed' || result.exitCode !== 0
        || result.timedOut || result.truncated || result.signal
        || typeof result.stdout !== 'string' || result.stderr !== ''
        || result.stdout.includes('\ufffd')
        || Buffer.byteLength(result.stdout) > READ_LIMITS.maxBytes
        || Buffer.from(result.stdout, 'utf8').toString('utf8') !== result.stdout) return null;
      return result.stdout;
    } catch { return null; }
  }

  const [baseType, headType, shallow] = await Promise.all([
    read(['cat-file', '-t', pins.baseCommit]),
    read(['cat-file', '-t', pins.headCommit]),
    read(['rev-parse', '--is-shallow-repository']),
  ]);
  if (baseType === null || headType === null || shallow === null) return unknown('git_commit_read_incomplete');
  if (baseType !== 'commit\n' || headType !== 'commit\n') return unknown('commit_object_required');
  if (shallow === 'true\n') return unknown('shallow_history');
  if (shallow !== 'false\n') return unknown('git_history_read_incomplete');

  // Use ancestry only as a guard. The caller's explicit base is never replaced.
  const ancestry = await read(['merge-base', '--is-ancestor', pins.baseCommit, pins.headCommit]);
  if (ancestry === null || ancestry !== '') return unknown('ancestry_not_confirmed');
  const diff = await read(['diff', '--no-ext-diff', '--no-textconv', '--no-color',
    '--name-only', '--no-renames', '--ignore-submodules=none', '-z',
    pins.baseCommit, pins.headCommit, '--']);
  if (diff === null || (diff && !diff.endsWith('\0'))) return unknown('git_commit_diff_incomplete');
  try {
    return { ...scope, ...classifyChanges(diff ? diff.slice(0, -1).split('\0') : []) };
  } catch { return unknown('invalid_or_excessive_git_paths'); }
}
