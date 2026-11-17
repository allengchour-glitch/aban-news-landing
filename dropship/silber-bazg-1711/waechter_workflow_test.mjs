// Statische Prüfung des Wächter-Workflows (.github/workflows/silber-waechter.yml). Kein Netz, kein YAML-Paket nötig.
// Anlass: GitHub lehnte den Workflow beim ersten Handstart ab («Unrecognized named-value: 'runner'» im Job-`env`), obwohl alle Tests grün waren:
// GitHub prüft die Ausdrücke erst beim Laden. Dieser Test hält die bekannten Fallen offline fest:
//   1. Im Job-`env` nur erlaubte Contexts (github, inputs, secrets, vars, needs, matrix, strategy), kein `runner`, `env`, `steps`.
//   2. Alle Dateien, die die Skripte (über import-Ketten) laden, stehen in der sparse-checkout-Liste.
//   3. Die Schreibfreigabe hängt an der Datei im Repo, der Job hat ein Zeitlimit, die Pfade kommen aus $RUNNER_TEMP.
// Lauf: node dropship/silber-bazg-1711/waechter_workflow_test.mjs
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = resolve(HIER, '..', '..');
let ok = 0, schlecht = 0;
const pruefe = (name, bed, info = '') => { if (bed) ok++; else { schlecht++; console.error('FEHLER:', name, info); } };

const text = readFileSync(join(WURZEL, '.github', 'workflows', 'silber-waechter.yml'), 'utf8');
const zeilen = text.split('\n');

// 1. Job-env
const iEnv = zeilen.findIndex((z) => /^    env:\s*$/.test(z));
const iSteps = zeilen.findIndex((z) => /^    steps:\s*$/.test(z));
pruefe('Job-env und steps gefunden', iEnv > 0 && iSteps > iEnv, `${iEnv} ${iSteps}`);
const jobEnv = zeilen.slice(iEnv + 1, iSteps).join('\n');
const contexts = [...jobEnv.matchAll(/\$\{\{\s*([A-Za-z_]+)[.\s\[]/g)].map((m) => m[1]);
const erlaubt = new Set(['github', 'inputs', 'secrets', 'vars', 'needs', 'matrix', 'strategy']);
for (const c of contexts) pruefe(`Job-env: Context «${c}» ist erlaubt`, erlaubt.has(c), 'runner, env und steps sind auf Job-Ebene nicht verfügbar');
pruefe('Job-env: kein runner.', !/runner\./.test(jobEnv));
pruefe('Job-env wird tatsächlich ausgewertet (Prüfung läuft nicht ins Leere)', contexts.length >= 1, JSON.stringify(contexts));

// 2. sparse-checkout gegen die import-Ketten
const iSp = zeilen.findIndex((z) => /^\s+sparse-checkout:\s*\|\s*$/.test(z));
pruefe('sparse-checkout gefunden', iSp > 0);
const sparse = [];
for (let i = iSp + 1; i < zeilen.length && /^\s{10,}\S/.test(zeilen[i]); i++) sparse.push(zeilen[i].trim());
pruefe('sparse-checkout hat Einträge', sparse.length >= 8, String(sparse.length));
pruefe('sparse-checkout ohne Cone-Modus (Dateimuster)', /sparse-checkout-cone-mode:\s*false/.test(text));
const gesehen = new Set();
const sammle = (pfad) => {
  const rel = relative(WURZEL, pfad).split('\\').join('/');
  if (gesehen.has(rel) || !existsSync(pfad)) { if (!existsSync(pfad)) gesehen.add(rel + ' (FEHLT)'); return; }
  gesehen.add(rel);
  if (!/\.mjs$/.test(pfad)) return;
  const quelle = readFileSync(pfad, 'utf8');
  for (const m of quelle.matchAll(/(?:from\s+|import\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g)) sammle(resolve(dirname(pfad), m[1]));
};
for (const start of ['liste.mjs', 'apply.mjs', 'melden.mjs']) sammle(join(HIER, start));
for (const d of gesehen) {
  pruefe(`Importkette: ${d} existiert`, !/FEHLT/.test(d), d);
  if (!/FEHLT/.test(d)) pruefe(`Importkette: ${d} steht in sparse-checkout`, sparse.includes(d), d);
}
for (const d of ['dropship/silber-bazg-1711/ausnahmen.json', 'dropship/SILBER-WAECHTER-FREI.txt']) pruefe(`sparse-checkout nennt ${d}`, sparse.includes(d));
// Dateien, die der Workflow selbst als `node dropship/...` aufruft
for (const m of text.matchAll(/node\s+((?:dropship|automation)\/[\w./-]+\.mjs)/g)) pruefe(`Aufgerufenes Skript ${m[1]} steht in sparse-checkout`, sparse.includes(m[1]), m[1]);

// 3. Freigabe, Zeitlimit, Pfade
pruefe('Freigabedatei liegt im Repo', existsSync(join(WURZEL, 'dropship', 'SILBER-WAECHTER-FREI.txt')));
pruefe('Schreiben nur mit Freigabedatei: Test auf die Datei im Schritt «Schreiben oder nur lesen?»', /if \[ -f dropship\/SILBER-WAECHTER-FREI\.txt \]/.test(text));
pruefe('Zeitlimit gesetzt', /timeout-minutes:\s*\d+/.test(text));
pruefe('Pfade aus RUNNER_TEMP in $GITHUB_ENV', /RUNNER_TEMP\/silber-liste\.json/.test(text) && /GITHUB_ENV/.test(text));
pruefe('Höchstens 25 Produkte je Lauf', /MAX_ANZAHL:\s*'25'/.test(text));
pruefe('Zeitplan einmal täglich', /cron:\s*'29 5 \* \* \*'/.test(text));
pruefe('Telegram-Zugangsdaten nur im Melden-Schritt (secrets)', (text.match(/secrets\.TELEGRAM_BOT_TOKEN/g) || []).length === 1);

console.log(`${ok} Prüfungen bestanden, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
