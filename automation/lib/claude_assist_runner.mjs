/** Bounded local subprocesses. No shell, network, model calls or repo access. */
import { spawn } from 'node:child_process';

const ABORT_GRACE_MS = 100;
const MAX_STDIN_BYTES = 65536;

/** Keep environment/redaction policy in the caller without a circular import. */
export function createBoundedRunner({ cleanEnv, redact } = {}) {
  if (typeof cleanEnv !== 'function' || typeof redact !== 'function') {
    throw new TypeError('cleanEnv and redact functions are required');
  }
  return function boundedRun(command, args, {
    cwd, env = cleanEnv(), timeoutMs = 15000, maxBytes = 16384, input,
  } = {}) {
    if (input !== undefined && ((typeof input !== 'string' && !Buffer.isBuffer(input))
      || Buffer.byteLength(input) > MAX_STDIN_BYTES)) {
      return Promise.resolve({ status: 'unknown', reason: 'invalid_or_oversized_stdin' });
    }
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647
      || !Number.isSafeInteger(maxBytes) || maxBytes < 0) {
      return Promise.resolve({ status: 'unknown', reason: 'invalid_run_limits' });
    }
    return new Promise(resolve => {
      let child, used = 0, timedOut = false, truncated = false, spawnError = false, stdinError = false;
      let finished = false, aborting = false, timer, abortTimer;
      let exitCode = null, exitSignal = null;
      const combined = [], stdout = [], stderr = [];
      const ownProcessGroup = process.platform !== 'win32';

      function finish(code = exitCode, signal = exitSignal, forced = false) {
        if (finished) return;
        finished = true;
        clearTimeout(timer); clearTimeout(abortTimer);
        // Descendants may retain inherited handles after their parent exits.
        // Closing our handles prevents them from keeping the runner alive.
        child?.stdin?.destroy(); child?.stdout?.destroy(); child?.stderr?.destroy();
        if (forced) child?.unref();
        resolve({
          status: spawnError || stdinError || timedOut || truncated || forced ? 'unknown'
            : code === 0 ? 'passed' : 'failed',
          exitCode: code, signal, timedOut, truncated,
          output: redact(Buffer.concat(combined).toString('utf8')),
          stdout: redact(Buffer.concat(stdout).toString('utf8')),
          stderr: redact(Buffer.concat(stderr).toString('utf8')),
          ...(spawnError ? { reason: 'process_unavailable' }
            : stdinError ? { reason: 'stdin_unavailable' }
              : forced ? { reason: 'abort_cleanup_incomplete' } : {}),
        });
      }

      function abort() {
        if (finished || aborting) return;
        aborting = true;
        // detached:true created this group; never target our parent group or
        // unrelated process trees. Windows has no equivalent safe group kill.
        if (ownProcessGroup && Number.isSafeInteger(child.pid) && child.pid > 0) {
          try { process.kill(-child.pid, 'SIGKILL'); } catch { /* Already gone or unavailable. */ }
        }
        try { child.kill('SIGKILL'); } catch { /* The direct child may already have exited. */ }
        // A finite fallback is required even if a descendant escaped the group
        // or Windows still has a descendant holding its inherited pipes.
        abortTimer = setTimeout(() => finish(exitCode, exitSignal, true), ABORT_GRACE_MS);
      }

      try {
        child = spawn(command, args, { cwd, env, shell: false,
          detached: ownProcessGroup,
          stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
      } catch { resolve({ status: 'unknown', reason: 'process_unavailable' }); return; }

      timer = setTimeout(() => { timedOut = true; abort(); }, timeoutMs);
      const capture = target => chunk => {
        if (finished) return;
        const room = maxBytes - used;
        if (room > 0) {
          const part = Buffer.from(chunk.subarray(0, room));
          combined.push(part); target.push(part); used += part.length;
        }
        if (chunk.length > room) { truncated = true; abort(); }
      };
      child.stdout.on('data', capture(stdout)); child.stderr.on('data', capture(stderr));
      child.on('error', () => { spawnError = true; });
      child.on('exit', (code, signal) => { exitCode = code; exitSignal = signal; });
      child.on('close', (code, signal) => finish(code, signal));
      if (input !== undefined) {
        child.stdin.on('error', () => { stdinError = true; });
        child.stdin.end(input);
      }
    });
  };
}
