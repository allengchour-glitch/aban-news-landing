// fake_fetch_lauf.mjs — Testhelfer zu fake_fetch_preload.mjs: Skript im Wegwerf-Ordner starten, env nur mit PATH (19.10.2026).
//
//   import { wegwerfOrdner, lauf, aufrufe } from './lib/fake_fetch_lauf.mjs';
//   const dir = wegwerfOrdner(t);                       // t = node:test-Kontext (räumt nach dem Test auf) oder weglassen
//   const r = lauf({ dir, skript: '/pfad/zum/skript.mjs', szenario: { hosts: [...], routes: [...] },
//                    env: { SHOPIFY_SHOP: 'test.myshopify.com' }, args: ['--zeile'] });
//   r.status · r.stdout · r.stderr · r.aufrufe (calls.jsonl als Liste) · r.roh (alles, was ein Geheimnis verraten könnte)
//
// Die Umgebung des Kindprozesses ist LEER bis auf PATH, FAKE_FETCH_SCENARIO, FAKE_FETCH_CALLS und das, was der Test in «env» angibt —
// keine geerbten Schlüssel, kein LIVE, kein Proxy. Ein Test, der ein Geheimnis braucht, übergibt ein ERFUNDENES.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const PRELOAD = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fake_fetch_preload.mjs');

export function wegwerfOrdner(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'luxe-fakefetch-'));
  t?.after?.(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

export function aufrufe(dir) {
  const f = path.join(dir, 'calls.jsonl');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(z => JSON.parse(z)) : [];
}

export function lauf({ dir, skript, szenario, env = {}, args = [], timeout = 20000 }) {
  const sz = path.join(dir, 'szenario.json');
  fs.writeFileSync(sz, JSON.stringify(szenario));
  const r = spawnSync(process.execPath, ['--import', PRELOAD, skript, ...args], {
    cwd: dir, encoding: 'utf8', timeout,
    env: { PATH: process.env.PATH, FAKE_FETCH_SCENARIO: sz, FAKE_FETCH_CALLS: path.join(dir, 'calls.jsonl'), ...env },
  });
  if (r.error) throw r.error;
  const log = path.join(dir, 'calls.jsonl');
  return { status: r.status, signal: r.signal, stdout: r.stdout, stderr: r.stderr, aufrufe: aufrufe(dir),
    roh: r.stdout + '\n' + r.stderr + '\n' + (fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '') };
}
