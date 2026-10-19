// run_limit_spur_probe.mjs — Prüfling für run_limit_test.mjs (Teil D0): tut absichtlich genau das, was die Spur erkennen und ablehnen muss.
// NUR mit  node --import ./run_limit_spur.mjs run_limit_spur_probe.mjs <lock|effekte>  starten — ohne Spur würde «effekte» wirklich schreiben.
// Eigene Datei, damit run_limit_test.mjs selbst keine Schreibaufrufe enthält (automation/queue_schreiber_wache.py meldet jede Datei, die
// eine Queue-CSV nennt UND roh schreibt; die Tests nennen Queue-Dateien, dieser Prüfling nennt keine).
//   lock     post_guard.lock() aufrufen → Spur muss den Versuch auf /tmp/ig_post.lock sehen (und ablehnen)
//   effekte  Schreiben (default-Import und benannter Import), Umbenennen, Prozessstart (beide Importarten), fetch
//            Ziele aus $PROBE_ZIEL und $PROBE_ZIEL2 (Pfade, die NICHT entstehen dürfen)
import fs from 'node:fs';
import cp from 'node:child_process';
import { writeFileSync, renameSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';

const art = process.argv[2];
if (globalThis.__runLimitSpur !== true) { console.error('Prüfling ohne Spur gestartet — Abbruch'); process.exit(2); }

if (art === 'lock') {
  const { lock } = await import(new URL('../post_guard.mjs', import.meta.url).href);
  try { lock(); } catch {}
} else if (art === 'effekte') {
  const ziel = process.env.PROBE_ZIEL, ziel2 = process.env.PROBE_ZIEL2;
  try { fs.writeFileSync(ziel, 'x'); } catch {}
  try { fs.appendFileSync(ziel, 'x'); } catch {}
  try { cp.execFileSync('python3', ['-c', '1']); } catch {}
  try { writeFileSync(ziel2, 'x'); } catch {}
  try { renameSync(ziel2, ziel2 + '.neu'); } catch {}
  try { execFileSync('python3', ['-c', '2']); } catch {}
  try { spawnSync('python3', ['-c', '3']); } catch {}
  await fetch('https://example.invalid/probe').catch(() => {});
} else {
  console.error('Aufruf: run_limit_spur_probe.mjs <lock|effekte>'); process.exit(2);
}
