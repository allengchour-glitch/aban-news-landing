#!/usr/bin/env node
/**
 * Test des Workflows .github/workflows/gmc-schaufenster.yml: nicht das YAML, sondern die Regeln, die es durchsetzen muss.
 * Der Schritt «Modus und Freigabe festlegen» wird aus der Datei gelesen und in bash mit Attrappen-Dateien ausgeführt.
 *
 *   - Zeitplan ohne Dauerfreigabe: nur prüfen, nie schreiben.
 *   - Zeitplan schreibt nur, wenn BEIDE Dateien liegen (GMC-SCHAUFENSTER-FREI.txt und GMC-SCHAUFENSTER-TAEGLICH-FREI.txt).
 *   - Von Hand: jeder schreibende Modus braucht GMC-SCHAUFENSTER-FREI.txt.
 *   - Eingaben nur aus der Liste, die Höchstzahl nur «alle» oder Ziffern; nichts landet ungeprüft in einem Befehl.
 *   - LIVE kommt nur aus dem Modus-Schritt, nie als feste Einstellung.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

let ok = 0, fehl = 0;
const wahr = (name, bed, info = '') => { if (bed) ok++; else { fehl++; console.log(`✗ ${name}${info ? ' · ' + info : ''}`); } };

const WF = readFileSync(fileURLToPath(new URL('../.github/workflows/gmc-schaufenster.yml', import.meta.url)), 'utf8');

/** Der Text (run: |) eines Schritts, eingerückt entfernt. */
function schritt(name) {
  const m = WF.split(/^      - /m).find(b => b.startsWith(`name: ${name}`));
  if (!m) return null;
  const lines = m.split('\n');
  const i = lines.findIndex(l => /^        run: \|\s*$/.test(l));
  if (i < 0) return null;
  const body = [];
  for (const l of lines.slice(i + 1)) { if (l && !l.startsWith('          ')) break; body.push(l.replace(/^ {10}/, '')); }
  return body.join('\n');
}

const SKRIPT = schritt('Modus und Freigabe festlegen');
wahr('Schritt «Modus und Freigabe festlegen» mit run-Block gefunden', typeof SKRIPT === 'string' && SKRIPT.length > 300, String(SKRIPT?.length));

/** Führt den Modus-Schritt aus. dateien: welche Freigabedateien liegen. */
function lauf({ ereignis, modus = '', max = '', frei = false, taeglich = false }) {
  const d = mkdtempSync(join(tmpdir(), 'gmcwf-'));
  try {
    mkdirSync(join(d, 'dropship'));
    if (frei) writeFileSync(join(d, 'dropship/GMC-SCHAUFENSTER-FREI.txt'), 'x');
    if (taeglich) writeFileSync(join(d, 'dropship/GMC-SCHAUFENSTER-TAEGLICH-FREI.txt'), 'x');
    const out = join(d, 'out.txt'), env = join(d, 'env.txt');
    writeFileSync(out, ''); writeFileSync(env, '');
    const r = spawnSync('bash', ['-eo', 'pipefail', '-c', SKRIPT], {
      cwd: d, encoding: 'utf8', timeout: 20000,
      env: { PATH: process.env.PATH, EREIGNIS: ereignis, MODUS_EINGABE: modus, MAX_EINGABE: max, GITHUB_OUTPUT: out, GITHUB_ENV: env },
    });
    const o = Object.fromEntries(readFileSync(out, 'utf8').split('\n').filter(Boolean).map(z => z.split(/=(.*)/s).slice(0, 2)));
    return { rc: r.status, o, text: (r.stdout || '') + (r.stderr || '') };
  } finally { rmSync(d, { recursive: true, force: true }); }
}

if (SKRIPT) {
  // Zeitplan
  let r = lauf({ ereignis: 'schedule' });
  wahr('Zeitplan ohne Freigabedateien: prüfen, schreibt nicht', r.rc === 0 && r.o.modus === 'pruefen' && r.o.live === '0', JSON.stringify(r.o));
  wahr('Zeitplan ohne Dauerfreigabe nennt den Grund als Hinweis', /Zeitplan liest nur/.test(r.text));
  r = lauf({ ereignis: 'schedule', frei: true });
  wahr('Zeitplan mit nur FREI.txt (Einmalfreigabe): prüfen, schreibt nicht', r.rc === 0 && r.o.modus === 'pruefen' && r.o.live === '0', JSON.stringify(r.o));
  r = lauf({ ereignis: 'schedule', taeglich: true });
  wahr('Zeitplan mit nur TAEGLICH-FREI.txt (ohne FREI.txt): prüfen, schreibt nicht', r.rc === 0 && r.o.modus === 'pruefen' && r.o.live === '0', JSON.stringify(r.o));
  r = lauf({ ereignis: 'schedule', frei: true, taeglich: true });
  wahr('Zeitplan mit beiden Dateien: abwählen, schreibt', r.rc === 0 && r.o.modus === 'abwaehlen' && r.o.live === '1' && r.o.max === 'alle', JSON.stringify(r.o));
  r = lauf({ ereignis: 'schedule', frei: true, taeglich: true, modus: 'zuruecksetzen', max: '5' });
  wahr('Zeitplan ignoriert Eingaben (nie «zuruecksetzen» aus dem Zeitplan)', r.o.modus === 'abwaehlen', JSON.stringify(r.o));

  // Von Hand
  for (const m of ['plan', 'pruefen']) {
    r = lauf({ ereignis: 'workflow_dispatch', modus: m });
    wahr(`Hand: ${m} liest nur und braucht keine Freigabe`, r.rc === 0 && r.o.modus === m && r.o.live === '0', JSON.stringify(r.o));
  }
  for (const m of ['abwaehlen', 'aufnehmen', 'zuruecksetzen']) {
    r = lauf({ ereignis: 'workflow_dispatch', modus: m });
    wahr(`Hand: ${m} ohne FREI.txt bricht ab, schreibt nichts`, r.rc === 1 && !r.o.live && /Nicht freigegeben/.test(r.text), `rc ${r.rc} ${JSON.stringify(r.o)}`);
    r = lauf({ ereignis: 'workflow_dispatch', modus: m, frei: true });
    wahr(`Hand: ${m} mit FREI.txt schreibt`, r.rc === 0 && r.o.modus === m && r.o.live === '1', JSON.stringify(r.o));
  }
  r = lauf({ ereignis: 'workflow_dispatch', modus: 'abwaehlen', frei: true, max: '50' });
  wahr('Hand: Höchstzahl als Ziffern wird übernommen', r.rc === 0 && r.o.max === '50', JSON.stringify(r.o));
  r = lauf({ ereignis: 'workflow_dispatch', modus: 'plan' });
  wahr('Hand: leere Höchstzahl wird zu «alle»', r.o.max === 'alle', JSON.stringify(r.o));

  // Eingaben
  for (const bose of ['', 'loeschen', 'abwaehlen; echo x', '$(id)', 'plan\nabwaehlen', 'ABWAEHLEN']) {
    r = lauf({ ereignis: 'workflow_dispatch', modus: bose, frei: true });
    wahr(`Hand: unzulässiger Modus «${bose.replace(/\n/g, '\\n')}» bricht ab`, r.rc === 1 && !r.o.live, `rc ${r.rc} ${JSON.stringify(r.o)}`);
  }
  for (const bose of ['5; echo x', '-1', '1e3', 'ALLE', '$(id)', '5 6', 'unbegrenzt']) {
    r = lauf({ ereignis: 'workflow_dispatch', modus: 'plan', max: bose });
    wahr(`Hand: unzulässige Höchstzahl «${bose}» bricht ab`, r.rc === 1 && !r.o.max, `rc ${r.rc} ${JSON.stringify(r.o)}`);
  }
}

// Aufbau des Workflows
wahr('Zeitplan vorhanden (täglich 04:41 UTC, nicht beim Auswahl-Lauf um 21:50)', /schedule:\s*\n\s*- cron: '41 4 \* \* \*'/.test(WF));
wahr('LIVE ist nirgends fest auf 1 gesetzt (kommt nur aus dem Modus-Schritt)', !/LIVE:\s*['"]?1['"]?\s*$/m.test(WF) && /LIVE: \$\{\{ steps\.modus\.outputs\.live \}\}/.test(WF));
wahr('Nachprüfung läuft ohne LIVE', /PHASE: pruefen\n\s+LIVE: '0'/.test(WF));
wahr('Eingaben gelangen nur über env in den Job (jede Zeile mit inputs.* ist MODUS_EINGABE oder MAX_EINGABE)', WF.split('\n').filter(l => /\$\{\{\s*inputs\./.test(l) && !/^\s+(MODUS_EINGABE|MAX_EINGABE):/.test(l)).length === 0);
wahr('Sparse-Checkout enthält Manifest, Fehlerliste und beide Freigabedateien', ['gmc_schaufenster_manifest.jsonl', 'gmc_schaufenster_fehler.txt', 'GMC-SCHAUFENSTER-FREI.txt', 'GMC-SCHAUFENSTER-TAEGLICH-FREI.txt'].every(n => WF.includes('/dropship/' + n)));
wahr('Nur ein Lauf zugleich (concurrency), ohne Abbruch eines laufenden', /concurrency:\s*\n\s*group: gmc-schaufenster\s*\n\s*cancel-in-progress: false/.test(WF));
wahr('Exit 0 und 4 (Drosselung) sind keine Fehler, alles andere macht den Job rot', /\[ "\$rc" != "0" \] && \[ "\$rc" != "4" \]; then exit "\$rc"/.test(WF));
wahr('Manifest und Fehlerliste werden mit Union-Merge zurückgelegt', /gmc_schaufenster_manifest\.jsonl merge=union/.test(WF) && /gmc_schaufenster_fehler\.txt merge=union/.test(WF));
wahr('Manifest wird auch nach Teilfehlern committet (always) und nur wenn der Lauf schrieb', /name: Manifest committen[^\n]*\n\s+if: \$\{\{ always\(\) && steps\.modus\.outputs\.live == '1' \}\}/.test(WF));
wahr('Commit trägt [skip ci] (kein Test-Lauf für Manifest-Zeilen)', /\[skip ci\]/.test(WF));

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
