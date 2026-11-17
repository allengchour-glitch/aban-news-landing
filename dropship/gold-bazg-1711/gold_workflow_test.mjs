// Statische Prüfung des Gold-Wächter-Workflows (.github/workflows/gold-waechter.yml). Kein Netz, kein YAML-Paket nötig.
// Anlass: GitHub lehnte den Workflow beim ersten Handstart ab («Unrecognized named-value: 'runner'» im Job-`env`), obwohl alle Tests grün waren:
// GitHub prüft die Ausdrücke erst beim Laden. Dieser Test hält die bekannten Fallen offline fest:
//   1. Im Job-`env` nur erlaubte Contexts (github, inputs, secrets, vars, needs, matrix, strategy), kein `runner`, `env`, `steps`.
//   2. Alle Dateien, die die Skripte (über import-Ketten) laden, stehen in der sparse-checkout-Liste.
//   3. Die Schreibfreigabe hängt an der Datei im Repo, der Job hat ein Zeitlimit, die Pfade kommen aus $RUNNER_TEMP.
// Lauf: node dropship/gold-bazg-1711/gold_workflow_test.mjs
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = resolve(HIER, '..', '..');
let ok = 0, schlecht = 0;
const pruefe = (name, bed, info = '') => { if (bed) ok++; else { schlecht++; console.error('FEHLER:', name, info); } };

const text = readFileSync(join(WURZEL, '.github', 'workflows', 'gold-waechter.yml'), 'utf8');
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
for (const start of ['gold_liste.mjs', 'gold_entwurf.mjs', 'gold_melden.mjs']) sammle(join(HIER, start));
for (const d of gesehen) {
  pruefe(`Importkette: ${d} existiert`, !/FEHLT/.test(d), d);
  if (!/FEHLT/.test(d)) pruefe(`Importkette: ${d} steht in sparse-checkout`, sparse.includes(d), d);
}
for (const d of ['dropship/gold-bazg-1711/gold-ausnahmen.json', 'dropship/GOLD-WAECHTER-FREI.txt']) pruefe(`sparse-checkout nennt ${d}`, sparse.includes(d));
// Dateien, die der Workflow selbst als `node dropship/...` aufruft
for (const m of text.matchAll(/node\s+((?:dropship|automation)\/[\w./-]+\.mjs)/g)) pruefe(`Aufgerufenes Skript ${m[1]} steht in sparse-checkout`, sparse.includes(m[1]), m[1]);

// 3. Freigabe, Zeitlimit, Pfade
pruefe('Ausnahmeliste liegt im Repo und ist gültiges JSON mit Feld handles', Array.isArray(JSON.parse(readFileSync(join(HIER, 'gold-ausnahmen.json'), 'utf8')).handles));
pruefe('Schreiben nur mit Freigabedatei: Test auf die Datei im Schritt «Schreiben oder nur lesen?»', /if \[ -f dropship\/GOLD-WAECHTER-FREI\.txt \]/.test(text));
pruefe('Zeitlimit gesetzt', /timeout-minutes:\s*\d+/.test(text));
pruefe('Pfade aus RUNNER_TEMP in $GITHUB_ENV', /RUNNER_TEMP\/gold-liste\.json/.test(text) && /GITHUB_ENV/.test(text));
pruefe('Höchstens 12 Produkte je Lauf', /MAX_ANZAHL:\s*'12'/.test(text));
pruefe('Checkout ohne alle Blobs (filter: blob:none, wie lager-waechter.yml)', /filter:\s*blob:none/.test(text));
pruefe('Zeitlimit des Jobs deckt Warten (8 min) und Lesen (20 min): mindestens 35 Minuten', Number((text.match(/timeout-minutes:\s*(\d+)/) || [])[1]) >= 35);
pruefe('Artefakt wird bei Wiederholung überschrieben (overwrite: true)', /overwrite:\s*true/.test(text));
pruefe('Artefakt auch nach Fehlern hochgeladen (if: always())', /if:\s*always\(\)/.test(text));
pruefe('Melden-Schritt kennt die Freigabe (FREIGABE)', /FREIGABE:/.test(text));
pruefe('Zeitplan einmal täglich', /cron:\s*'37 5 \* \* \*'/.test(text));
pruefe('Telegram-Zugangsdaten nur im Melden-Schritt (secrets)', (text.match(/secrets\.TELEGRAM_BOT_TOKEN/g) || []).length === 1);

// 4. Gold-Besonderheiten
const iSetzen = text.indexOf('- name: Treffer auf Entwurf setzen'), iMelden = text.indexOf('- name: Melden');
const setzen = text.slice(iSetzen, iMelden);
pruefe('Schritt «Treffer auf Entwurf setzen» gefunden', iSetzen > 0 && iMelden > iSetzen);
pruefe('Sicherung wird VOR dem Schreiben angelegt (SICHERN=1 steht vor LIVE=1 im Schreibschritt)', setzen.indexOf('SICHERN=1 node dropship/gold-bazg-1711/gold_entwurf.mjs') > 0 && setzen.indexOf('SICHERN=1 node') < setzen.indexOf('LIVE=1 node dropship/gold-bazg-1711/gold_entwurf.mjs'));
pruefe('Schlägt die Sicherung fehl, wird nicht geschrieben', /Sicherung fehlgeschlagen[^\n]*es wird nichts geschrieben/.test(text) && /if \[ "\$rc" != "0" \]/.test(text));
pruefe('Über der Obergrenze oder ohne Treffer wird nicht geschrieben', /\[ "\$zuviele" = "true" \] \|\| \[ "\$anzahl" = "0" \]/.test(text));
pruefe('Nur lesen: gold_entwurf.mjs läuft ohne LIVE (Trockenlauf)', /else\n\s+node dropship\/gold-bazg-1711\/gold_entwurf\.mjs/.test(text));
pruefe('LIVE=1 steht nur im Schreibzweig (ein Aufruf im Schritt, nur nach Sicherung)', (setzen.match(/LIVE=1 node/g) || []).length === 1 && setzen.indexOf('LIVE=1 node') > setzen.indexOf('if [ "$LIVE_MODUS" = "1" ]'));
pruefe('Artefakt trägt Liste, Sicherung und Ledger', /gold-liste\.json/.test(text) && /gold-sicherung\.json/.test(text) && /gold-ledger\.txt/.test(text) && /name:\s*gold-waechter-protokoll/.test(text));
pruefe('Gleichzeitige Läufe werden hintereinander gestellt, nicht abgebrochen', /group:\s*gold-waechter/.test(text) && /cancel-in-progress:\s*false/.test(text));
pruefe('Zeitplan kollidiert nicht mit dem Silber-Wächter (05:29)', !/cron:\s*'29 5 /.test(text));
// Der Silber-Wächter bleibt unverändert und kennt das Gold nicht (zwei getrennte Wächter, zwei getrennte Freigabedateien)
const silber = readFileSync(join(WURZEL, '.github', 'workflows', 'silber-waechter.yml'), 'utf8');
pruefe('Silber-Wächter bleibt ein eigener Workflow mit eigener Freigabedatei', /SILBER-WAECHTER-FREI\.txt/.test(silber) && !/GOLD-WAECHTER/.test(silber));

console.log(`${ok} Prüfungen bestanden, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
