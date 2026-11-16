// Mutationsprobe 2.0: jede Mutation (test/mutanten.json) in eine Kopie des Theme-Ordners, dann test/buehne_test.cjs gegen die Kopie.
// Erkannt = Test endet nicht mit 0. Ausgangslage muss grün sein (wird zuerst geprüft). Zu jedem Mutanten werden die
// fehlgeschlagenen Prüfungen ausgegeben, damit ein zufälliger Fehlschlag nicht als «erkannt» durchgeht.
// Aufruf: node test/mutationsprobe.mjs [nur=M13,M14]
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
const HIER = path.dirname(new URL(import.meta.url).pathname), BASIS = path.join(HIER, '..');
const THEME = path.join(BASIS, 'theme'), TMP = process.env.MUT_TMP || path.join(BASIS, 'probe', 'mutant');
const M = JSON.parse(fs.readFileSync(path.join(HIER, 'mutanten.json'), 'utf8'));
const nur = (process.argv.find((a) => a.startsWith('nur=')) || '').slice(4).split(',').filter(Boolean);
function lauf(theme) { const r = spawnSync(process.execPath, [path.join(HIER, 'buehne_test.cjs'), theme], { encoding: 'utf8', timeout: 900000, env: process.env }); return { code: r.status, aus: (r.stdout || '').split('\n').filter((l) => /FEHLER|buehne_test|ABBRUCH/.test(l)).map((l) => l.replace(/ \{.*$/, '').slice(0, 110)).slice(0, 5).join(' | ') }; }
if (!process.argv.includes('--ohne-basis')) {
  const basis = lauf(THEME);
  console.log('Ausgangslage:', basis.code, basis.aus);
  if (basis.code !== 0) { console.log('Ausgangslage nicht grün, Abbruch'); process.exit(3); }
}
let erkannt = 0, ueber = 0, na = 0;
for (const [name, datei, a, b] of M) {
  if (nur.length && !nur.includes(name.split(' ')[0])) continue;
  fs.rmSync(TMP, { recursive: true, force: true }); fs.cpSync(THEME, TMP, { recursive: true });
  const f = path.join(TMP, datei); let s = fs.readFileSync(f, 'utf8');
  const paare = Array.isArray(a) ? a : [[a, b]];
  let ok = true; for (const [x, y] of paare) { if (s.split(x).length !== 2) ok = false; s = s.split(x).join(y); }
  if (!ok) { na++; console.log(name, '=> NICHT ANWENDBAR (Muster nicht genau einmal)'); continue; }
  fs.writeFileSync(f, s);
  const r = lauf(TMP);
  if (r.code !== 0) erkannt++; else ueber++;
  console.log(new Date().toISOString().slice(11, 19), name, '=>', r.code !== 0 ? 'erkannt' : 'ÜBERLEBT', '|', r.aus);
}
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`Mutationsprobe: ${erkannt} erkannt, ${ueber} überlebt, ${na} nicht anwendbar, von ${nur.length || M.length}`);
