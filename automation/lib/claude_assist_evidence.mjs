/** Bounded, injected local reads only. This is evidence of two observations, not a snapshot. */
import { createHash } from 'node:crypto';

const MAX_PATHS = 40;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/;
const NOTE = 'Only the listed file bytes were compared before and after the checks. This is not an immutable snapshot; a temporary change restored between observations can remain undetected. Other files, live accounts and publishing approval are unverified.';
const hash = value => createHash('sha256').update(value).digest('hex');

function validPath(file) {
  return typeof file === 'string' && file.length > 0 && file.length <= 1024
    && !/[\x00-\x1f\x7f\\]/.test(file) && !file.startsWith('/') && !/^[A-Za-z]:/.test(file)
    && file.split('/').every(piece => piece && piece !== '.' && piece !== '..')
    && Buffer.from(file, 'utf8').toString('utf8') === file;
}

function manifest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || Object.keys(input).some(key => !['paths', 'optionalPaths'].includes(key))
    || !Array.isArray(input.paths)) return null;
  const optionalPaths = input.optionalPaths === undefined ? ['package.json'] : input.optionalPaths;
  if (!Array.isArray(optionalPaths)) return null;
  const paths = new Map();
  for (const [values, optional] of [[optionalPaths, true], [input.paths, false]]) {
    for (const file of values) {
      if (!validPath(file)) return null;
      paths.set(file, optional);
      if (paths.size > MAX_PATHS) return null;
    }
  }
  if (!input.paths.length) return null;
  return [...paths].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([file, optional]) => ({ file, ...(optional ? { optional: true } : {}) }));
}

function fingerprint(files) {
  return hash(JSON.stringify({ version: 1, files: files.map(row => ({
    file: row.file, state: row.state, sha256: row.sha256, bytes: row.bytes,
    optional: row.optional === true,
  })) }));
}

/** readFile must synchronously return a Buffer and honour the provided maximum byte count. */
export function captureCheckEvidence(input, options = {}) {
  let capturedAt = null;
  try {
    const value = (options?.now ?? (() => new Date().toISOString()))();
    if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw Error('invalid_timestamp');
    capturedAt = new Date(value).toISOString();
  } catch { return { capturedAt, state: 'unknown', files: [], fingerprint: null, reason: 'invalid_timestamp' }; }
  const unknown = reason => ({ capturedAt, state: 'unknown', files: [], fingerprint: null, reason });
  let paths;
  try { paths = manifest(input); } catch { return unknown('invalid_paths_or_limits'); }
  if (!paths) return unknown('invalid_paths_or_limits');
  if (typeof options?.readFile !== 'function') return unknown('file_reader_unavailable');
  let used = 0, blocked = false;
  const files = paths.map(entry => {
    const unavailable = reason => ({ ...entry, state: 'unknown', sha256: null, bytes: null, reason });
    if (blocked) return unavailable('total_byte_limit');
    let raw;
    try { raw = options.readFile(entry.file, Math.min(MAX_FILE_BYTES, MAX_TOTAL_BYTES - used)); }
    catch (error) {
      if (entry.optional && error?.code === 'ENOENT') return { ...entry, state: 'absent', sha256: null, bytes: null };
      return unavailable('unreadable_or_unsafe_file');
    }
    if (!Buffer.isBuffer(raw)) return unavailable('buffer_required');
    if (raw.length > MAX_FILE_BYTES) return unavailable('file_byte_limit');
    if (raw.length > MAX_TOTAL_BYTES - used) { blocked = true; return unavailable('total_byte_limit'); }
    used += raw.length;
    return { ...entry, state: 'present', sha256: hash(raw), bytes: raw.length };
  });
  const available = files.every(row => row.state !== 'unknown');
  return { capturedAt, state: available ? 'available' : 'unknown', files,
    fingerprint: available ? fingerprint(files) : null,
    ...(!available ? { reason: 'file_evidence_incomplete' } : {}) };
}

function validateEvidence(evidence) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)
    || !['available', 'unknown'].includes(evidence.state)
    || !Array.isArray(evidence.files) || evidence.files.length > MAX_PATHS
    || typeof evidence.capturedAt !== 'string' || !Number.isFinite(Date.parse(evidence.capturedAt))) return false;
  let previous = '', used = 0;
  for (const row of evidence.files) {
    if (!row || !validPath(row.file) || row.file <= previous
      || (row.optional !== undefined && row.optional !== true)) return false;
    previous = row.file;
    if (row.state === 'present') {
      if (!SHA256.test(row.sha256) || !Number.isSafeInteger(row.bytes) || row.bytes < 0 || row.bytes > MAX_FILE_BYTES) return false;
      used += row.bytes;
      if (used > MAX_TOTAL_BYTES) return false;
    } else if (row.state === 'absent') {
      if (row.optional !== true || row.sha256 !== null || row.bytes !== null) return false;
    } else if (row.state === 'unknown') {
      if (evidence.state !== 'unknown' || row.sha256 !== null || row.bytes !== null) return false;
    } else return false;
  }
  if (evidence.state === 'available') return evidence.files.length > 0
    && SHA256.test(evidence.fingerprint) && evidence.fingerprint === fingerprint(evidence.files);
  return evidence.fingerprint === null;
}

/** Missing/invalid observations remain unknown; known optional absence is comparable. */
export function compareCheckEvidence(before, after) {
  if (!validateEvidence(before) || !validateEvidence(after)) {
    return { state: 'unknown', changedFiles: [], reason: 'invalid_or_missing_evidence', note: NOTE };
  }
  const left = new Map(before.files.map(row => [row.file, row]));
  const right = new Map(after.files.map(row => [row.file, row]));
  const changedFiles = [...new Set([...left.keys(), ...right.keys()])].sort().filter(file => {
    const a = left.get(file), b = right.get(file);
    return !a || !b || a.state !== b.state || a.sha256 !== b.sha256
      || a.bytes !== b.bytes || a.optional !== b.optional;
  });
  return { state: before.state !== 'available' || after.state !== 'available' ? 'unknown'
    : changedFiles.length ? 'stale' : 'current', changedFiles,
    ...(before.state !== 'available' || after.state !== 'available' ? { reason: 'file_evidence_incomplete' } : {}), note: NOTE };
}
