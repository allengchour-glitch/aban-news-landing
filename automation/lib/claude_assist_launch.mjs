/** Fixed Node -e entry point. No shell, template expansion or model call. */
export const MCP_LAUNCHER = String.raw`(async () => {
  try {
    const fs = require('node:fs');
    const path = require('node:path');
    const { pathToFileURL } = require('node:url');
    const { spawnSync } = require('node:child_process');
    const env = {
      PATH: process.env.PATH || '/usr/bin:/bin', LANG: 'C.UTF-8', TZ: 'Europe/Zurich',
      GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
      GIT_TERMINAL_PROMPT: '0'
    };
    const git = args => {
      const result = spawnSync('git', ['--no-optional-locks', '-C', process.cwd(),
        '-c', 'core.fsmonitor=false', ...args],
        { env, encoding: 'utf8', timeout: 3000, maxBuffer: 4096, windowsHide: true });
      if (result.error || result.status !== 0 || result.signal || typeof result.stdout !== 'string') throw Error();
      const value = result.stdout.replace(/\r?\n$/, '');
      if (!value || /[\r\n\0]/.test(value)) throw Error();
      return value;
    };
    const root = fs.realpathSync(git(['rev-parse', '--show-toplevel']));
    const origin = git(['config', '--local', '--get', 'remote.origin.url']);
    if (!/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)allengchour-glitch\/aban-news-landing(?:\.git)?\/?$/i.test(origin)) throw Error();
    const directory = path.join(root, 'automation');
    const target = path.join(directory, 'claude-assist.mjs');
    const parent = fs.lstatSync(directory), script = fs.lstatSync(target);
    if (!parent.isDirectory() || parent.isSymbolicLink() || !script.isFile() || script.isSymbolicLink()) throw Error();
    process.argv = [process.execPath, target, 'mcp'];
    await import(pathToFileURL(target).href);
  } catch {
    process.stderr.write('LuxeStyle Assist konnte nicht sicher gestartet werden.\n');
    process.exitCode = 1;
  }
})();`;
