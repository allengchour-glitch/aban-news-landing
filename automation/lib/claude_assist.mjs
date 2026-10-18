/** Local assistance only. Never imports a publisher or connects to business APIs. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

const REPO = 'allengchour-glitch/aban-news-landing';
const JOURNAL = 'dropship/assistant/handoff.jsonl';
const MAX_JOURNAL = 1024 * 1024;
const SHA = s => createHash('sha256').update(s).digest('hex');
const secret = /\b(?:shpat_|shpss_|ghp_|github_pat_|sk-ant-|sk-proj-)[A-Za-z0-9_-]{12,}|(?:api[_ -]?key|client[_ -]?secret|password|authorization)\s*[:=]\s*\S+/i;
export const SUITES = Object.freeze({
  core: ['automation/lib/shopify_gql_test.mjs', 'automation/lib/shopify_secret_test.mjs', 'automation/lib/kanal_sperren_test.mjs'],
  seo: ['automation/seo-optimizer_test.mjs', 'automation/lib/seo_titel_test.mjs'],
});
export const POLICY = Object.freeze({
  scope: 'LuxeStyle / luxestyle.ch only', brandId: 6227837, timezone: 'Europe/Zurich',
  liveIdentity: 'unknown; this local helper does not verify connected accounts',
  externalWrites: false, automaticModelCalls: false,
  shipping: { publicCHF: 50, internalAfterDiscountCHF: 45, liveRates: 'unknown' },
  customerDomain: 'account.luxestyle.com.co',
  social: 'Only approved, rendered, professional and rights-checked masters through Metricool; fresh account/product/channel/ledger checks required separately. Empty tags and every rueckhol block new social use.',
  forbidden: ['customer messages', 'discount/budget/shop/flow activation', 'paid video renders', 'unapproved DNS changes', 'other brands'],
  dnsException: 'Only the four previously approved Klaviyo additions; authenticated access and full-zone preservation still required separately.',
  film: 'One professional master first; no voiceover; only automation/music/luxe-premium.wav after fresh file/rights checks. A green test is not creative, rights or publishing approval.',
});

export function cleanEnv(env = process.env) {
  return { PATH: env.PATH || '/usr/bin:/bin', LANG: 'C.UTF-8', TZ: 'Europe/Zurich',
    TMPDIR: os.tmpdir(), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: os.devNull,
    GIT_TERMINAL_PROMPT: '0', DRY_RUN: '1', APPLY_SEO_APPROVED: '0', LIVE: '0' };
}
export function redact(s) {
  return String(s).replace(/\b(?:shpat_|shpss_|ghp_|github_pat_|sk-ant-|sk-proj-)[A-Za-z0-9_-]{12,}/g, '[REDACTED]')
    .replace(/(authorization\s*[:=]\s*)(?:Bearer\s+)?\S+/gi, '$1[REDACTED]')
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/g, '$1[REDACTED]@');
}
export function boundedRun(command, args, { cwd, env = cleanEnv(), timeoutMs = 15000, maxBytes = 16384 } = {}) {
  return new Promise(resolve => {
    let child, output = '', used = 0, timedOut = false, truncated = false, spawnError = false;
    try { child = spawn(command, args, { cwd, env, shell: false, stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch { resolve({ status: 'unknown', reason: 'process_unavailable' }); return; }
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
    const capture = chunk => {
      const room = maxBytes - used;
      if (room > 0) { const part = chunk.subarray(0, room); output += part.toString('utf8'); used += part.length; }
      if (chunk.length > room) { truncated = true; child.kill('SIGKILL'); }
    };
    child.stdout.on('data', capture); child.stderr.on('data', capture);
    child.on('error', () => { spawnError = true; });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ status: spawnError || timedOut || truncated ? 'unknown' : code === 0 ? 'passed' : 'failed',
        exitCode: code, signal, timedOut, truncated, output: redact(output),
        ...(spawnError ? { reason: 'process_unavailable' } : {}) });
    });
  });
}

function safePath(root, relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').some(p => !p || p === '..' || p === '.')) throw Error('invalid_relative_path');
  let current = root;
  for (const piece of relative.split('/')) {
    current = path.join(current, piece);
    try { if (fs.lstatSync(current).isSymbolicLink()) throw Error('symlink_blocked'); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  return current;
}
function readSmall(root, relative, max = MAX_JOURNAL) {
  const file = safePath(root, relative);
  const st = fs.statSync(file);
  if (!st.isFile() || st.size > max) throw Error('invalid_or_oversized_file');
  return fs.readFileSync(file, 'utf8');
}
function text(value, max, name) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /\x00/.test(value)) throw Error('invalid_' + name);
  if (secret.test(value)) throw Error('possible_secret_blocked');
  return value.trim();
}
function keys(args, allowed) {
  if (!args || typeof args !== 'object' || Array.isArray(args) || Object.keys(args).some(k => !allowed.includes(k))) throw Error('invalid_arguments');
}
function luxeReference(file) {
  return typeof file === 'string' && (file.startsWith('dropship/')
    || ['CLAUDE.md', 'SHARED-MEMORY.md', 'automation/claude-assist.mjs', 'automation/seo-optimizer.mjs', 'automation/seo-optimizer_test.mjs', 'automation/metricool-schedule.mjs', 'automation/publish_guard.mjs', 'automation/price_guard.mjs', 'automation/cj_reviews_import.mjs', 'automation/video-autopost-meta.mjs'].includes(file)
    || /^automation\/lib\/(?:claude_assist|shopify_|kanal_sperren|seo_titel|cj_|social_queue|judgeme_|bewertung_|review_)[a-z0-9_]*\.mjs$/.test(file));
}
function parseJournal(raw) {
  if (!raw || !raw.endsWith('\n')) throw Error('journal_corrupt');
  const lines = raw.slice(0, -1).split('\n');
  if (lines.length > 1000) throw Error('journal_limit');
  let prevHash = null;
  return lines.map((line, i) => {
    const row = JSON.parse(line), { hash, ...payload } = row;
    if (payload.version !== 1 || payload.scope !== REPO + ':luxestyle' || payload.seq !== i + 1 || payload.prevHash !== prevHash || hash !== SHA(JSON.stringify(payload)) || typeof payload.id !== 'string' || typeof payload.summary !== 'string' || typeof payload.nextStep !== 'string' || !Array.isArray(payload.blockers) || !['handoff', 'review_request'].includes(payload.kind) || !Number.isFinite(Date.parse(payload.at))) throw Error('journal_corrupt');
    prevHash = hash; return row;
  });
}

export function createAssistant(root, { runner = boundedRun } = {}) {
  root = fs.realpathSync(root);
  async function identity() {
    const r = await runner('git', ['--no-optional-locks', '-C', root, 'config', '--local', '--get', 'remote.origin.url'], { cwd: root, env: cleanEnv(), timeoutMs: 3000, maxBytes: 2048 });
    if (r.status !== 'passed') return { state: 'unknown', expected: REPO };
    const url = r.output.trim();
    const match = /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)allengchour-glitch\/aban-news-landing(?:\.git)?\/?$/i.test(url);
    return { state: match ? 'matched' : 'mismatch', expected: REPO };
  }
  async function requireRepo() {
    if ((await identity()).state !== 'matched') throw Error('repository_identity_unknown_or_mismatch');
  }
  function journal() {
    try {
      const rows = parseJournal(readSmall(root, JOURNAL));
      return { state: 'available', historyBeforeFirstRecord: 'unknown', records: rows.length, latest: rows.slice(-10), note: 'Local checkout only; commit and push to share with another checkout.' };
    } catch (e) { return { state: 'unknown', reason: e.code === 'ENOENT' ? 'missing' : 'unreadable_or_corrupt', records: null, latest: null }; }
  }
  async function doctor() {
    const files = ['CLAUDE.md', 'SHARED-MEMORY.md', 'automation/lib/kanal_sperren.mjs', 'automation/music/luxe-premium.wav'];
    const references = files.map(file => {
      try {
        const location = safePath(root, file), st = fs.statSync(location);
        if (!st.isFile() || st.size > 16 * 1024 * 1024) throw Error('invalid_file');
        return { file, state: 'present', bytes: st.size, sha256: SHA(fs.readFileSync(location)), modifiedAt: st.mtime.toISOString() };
      } catch { return { file, state: 'unknown' }; }
    });
    return { observedAt: new Date().toISOString(), source: 'local_files_only', repository: await identity(), node: process.versions.node,
      references, handoff: journal(), policy: POLICY, liveAccountChecks: 'unknown', publications: 'unknown', revenue: 'unknown',
      codexLink: 'Review requests are saved for a future Codex/Claude session. No background ChatGPT connection or model invocation.' };
  }
  async function checks(args = {}) {
    keys(args, ['suite']); const suite = args.suite ?? 'core';
    if (!Object.hasOwn(SUITES, suite)) throw Error('unknown_suite');
    await requireRepo();
    const results = [];
    for (const file of SUITES[suite]) {
      try { readSmall(root, file); readSmall(root, 'automation/lib/claude_assist_offline.mjs'); }
      catch { results.push({ file, status: 'unknown', reason: 'missing_unreadable_or_unsafe_test' }); continue; }
      const r = await runner(process.execPath, ['--import', path.join(root, 'automation/lib/claude_assist_offline.mjs'), path.join(root, file)], { cwd: root, env: cleanEnv(), timeoutMs: 15000, maxBytes: 16384 });
      results.push({ file, ...r });
    }
    return { suite, source: 'local_offline_tests', status: results.every(r => r.status === 'passed') ? 'passed' : results.some(r => r.status === 'failed') ? 'failed' : 'unknown', results,
      caveat: 'Fixed reviewed test paths; credentials removed and ordinary Node networking blocked. This is not a sandbox for hostile repository code, live account verification or publishing approval.' };
  }
  async function append(input, kind) {
    await requireRepo();
    const dir = safePath(root, 'dropship/assistant'); fs.mkdirSync(dir, { recursive: true });
    const lock = safePath(root, 'dropship/assistant/.handoff.lock');
    let fd;
    try { fd = fs.openSync(lock, 'wx', 0o600); }
    catch (e) { if (e.code === 'EEXIST') throw Error('handoff_locked; inspect existing writer, never auto-delete a lock'); throw e; }
    let tmp;
    try {
      let raw = '', rows = [];
      try { raw = readSmall(root, JOURNAL); rows = parseJournal(raw); }
      catch (e) { if (e.code !== 'ENOENT') throw Error('handoff_unknown; existing journal was not changed'); }
      const payload = { version: 1, scope: REPO + ':luxestyle', seq: rows.length + 1, id: randomUUID(), at: new Date().toISOString(),
        kind, state: kind === 'review_request' ? 'awaiting_codex' : 'recorded', summary: input.summary, nextStep: input.nextStep, blockers: input.blockers,
        ...(input.files ? { files: input.files } : {}), historyBeforeFirstRecord: 'unknown', prevHash: rows.at(-1)?.hash ?? null };
      const row = { ...payload, hash: SHA(JSON.stringify(payload)) }, next = raw + JSON.stringify(row) + '\n';
      if (Buffer.byteLength(next) > MAX_JOURNAL || rows.length >= 1000) throw Error('handoff_limit; archive explicitly without deleting history');
      tmp = safePath(root, 'dropship/assistant/.handoff-' + randomUUID() + '.tmp');
      const out = fs.openSync(tmp, 'wx', 0o600);
      try { fs.writeFileSync(out, next); fs.fsyncSync(out); } finally { fs.closeSync(out); }
      fs.renameSync(tmp, safePath(root, JOURNAL)); tmp = undefined;
      const directory = fs.openSync(dir, 'r'); try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
      return { state: 'saved_local', id: row.id, kind, file: JOURNAL, historyBeforeFirstRecord: 'unknown', requiresCommitAndPushForOtherCheckouts: true, modelCalled: false };
    } finally { if (tmp) fs.rmSync(tmp, { force: true }); fs.closeSync(fd); fs.unlinkSync(lock); }
  }
  async function save(args) {
    keys(args, ['summary', 'nextStep', 'blockers']);
    const summary = text(args.summary, 4000, 'summary'), nextStep = text(args.nextStep, 2000, 'nextStep');
    const blockers = args.blockers ?? [];
    if (!Array.isArray(blockers) || blockers.length > 12) throw Error('invalid_blockers');
    return append({ summary, nextStep, blockers: blockers.map(s => text(s, 500, 'blocker')) }, 'handoff');
  }
  async function reviewRequest(args) {
    keys(args, ['question', 'files']);
    const summary = text(args.question, 4000, 'question'), files = args.files ?? [];
    if (!Array.isArray(files) || files.length > 6) throw Error('invalid_files');
    const refs = files.map(file => {
      if (!luxeReference(file)) throw Error('file_outside_luxestyle_scope');
      const body = readSmall(root, file);
      return { file, sha256: SHA(body) };
    });
    return append({ summary, nextStep: 'Codex: inspect this question and referenced file hashes; prepare a review or patch. No model has answered yet.', blockers: [], files: refs }, 'review_request');
  }
  return { doctor, checks, read: journal, save, reviewRequest };
}
