// Mutationsprobe für den Schalter NUR= in sperr_verfuegbar.mjs: jede Mutante ist eine Kopie des Skripts mit EINER absichtlich
// falschen Stelle. Der Test (sperr_verfuegbar_test.mjs) muss jede erkennen (Exit != 0). Kein Netz, das Original bleibt unberührt.
//   node dropship/sperre-verfuegbar-1111/sperr_verfuegbar_mutation.mjs
// Exit 0 nur, wenn die Ausgangslage grün ist, jedes Muster genau einmal passt und keine Mutante überlebt.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const QUELLE = readFileSync(join(HIER, 'sperr_verfuegbar.mjs'), 'utf8');
const TEST = join(HIER, 'sperr_verfuegbar_test.mjs');

const MUTANTEN = [
  ['N01 NUR wird ignoriert (alle Produkte gewählt)', 'const gewaehlt = (p) => !NUR.length || NUR.includes(p.handle);', 'const gewaehlt = () => true;'],
  ['N02 NUR wählt das Gegenteil', '!NUR.length || NUR.includes(p.handle)', '!NUR.length || !NUR.includes(p.handle)'],
  ['N03 ohne NUR ist nichts gewählt', '!NUR.length || NUR.includes(p.handle)', 'NUR.includes(p.handle)'],
  ['N04 die Umgebungsvariable wird nicht gelesen', "const NUR_ROH = process.env.NUR ?? '';", "const NUR_ROH = '';"],
  ['N05 Bearbeitung läuft über alle Produkte', 'const ist = alle.filter(gewaehlt);', 'const ist = alle;'],
  ['N06 erstes Rücklesen über alle Produkte', 'let neu = (await lesen()).filter(gewaehlt); let felder = 0;', 'let neu = await lesen(); let felder = 0;'],
  ['N07 wiederholtes Rücklesen über alle Produkte', 'await warte(6000); neu = (await lesen()).filter(gewaehlt);', 'await warte(6000); neu = await lesen();'],
  ['N08 unbekanntes Handle wird hingenommen', 'if (fremd.length || (NUR_ROH', 'if (false || (NUR_ROH'],
  ['N09 «NUR=,» wird zu «alle drei»', "(NUR_ROH.trim() !== '' && !NUR.length)", 'false'],
  ['N10 doppeltes Handle wird hingenommen', 'new Set(NUR).size !== NUR.length', 'false'],
  ['N11 unbrauchbares NUR endet mit Exit 0', "Nichts gelesen, nichts geschrieben.`);\n    process.exit(1);", "Nichts gelesen, nichts geschrieben.`);\n    process.exit(0);"],
  ['N12 unbrauchbares NUR bricht nicht ab', "Nichts gelesen, nichts geschrieben.`);\n    process.exit(1);", 'Nichts gelesen, nichts geschrieben.`);'],
  ['N13 Leerzeichen um das Handle werden nicht entfernt', "NUR_ROH.split(',').map((s) => s.trim()).filter(Boolean)", "NUR_ROH.split(',').filter(Boolean)"],
  ['N14 Ausgangsstand-Vergleich nur über die gewählten Produkte', 'const wieAusgang = alle.every(', 'const wieAusgang = ist.every('],
  ['N15 Sicherung nur mit den gewählten Produkten', 'produkte: alle.map(({ gesperrt, ...p }) => p)', 'produkte: ist.map(({ gesperrt, ...p }) => p)'],
  ['N16 PRUEFEN läuft über alle Produkte', 'for (const p of ist) for (const v of p.varianten) {\n    const kaufbarTrotzSperre', 'for (const p of alle) for (const v of p.varianten) {\n    const kaufbarTrotzSperre'],
  ['N17 Schreibschleife läuft über alle Produkte', 'for (const p of ist) {\n  for (const v of p.varianten) {\n    const ziel = zielFuer(p, v);', 'for (const p of alle) {\n  for (const v of p.varianten) {\n    const ziel = zielFuer(p, v);'],
  ['N18 der Hinweis auf die ausgelassenen Produkte fehlt', 'if (NUR.length) console.log(`NUR ${NUR.join', 'if (false) console.log(`NUR ${NUR.join'],
  // Bestehende Schutzregeln, die der Test mit abdeckt (nicht neu, aber für die Freischaltung wichtig)
  ['A01 Rücknahme ohne Sicherung läuft weiter', "if (ZURUECK) { console.error('keine Sicherung vorhanden: ' + SICHERUNG); process.exit(1); }", "if (ZURUECK) { console.error('keine Sicherung vorhanden: ' + SICHERUNG); }"],
  ['A02 Sperren überspringt entsperrte Produkte nicht', 'if (!ZURUECK && !p.gesperrt) {', 'if (false) {'],
  ['A03 Sicherung entsteht auch aus einem fremden Stand', 'if (!wieAusgang) {', 'if (false) {'],
  ['A04 bekannte Lücke zählt doch', 'const schlecht = kaufbarTrotzSperre && !bekannt;', 'const schlecht = kaufbarTrotzSperre;'],
];

const lauf = (skript) => spawnSync(process.execPath, [TEST], { encoding: 'utf8', timeout: 300000, env: { PATH: process.env.PATH || '', HOME: tmpdir(), ...(process.env.TMPDIR ? { TMPDIR: process.env.TMPDIR } : {}), ...(skript ? { SPERR_SKRIPT: skript } : {}) } });

const basis = lauf(null);
if (basis.status !== 0) { console.error('Ausgangslage ist nicht grün: die Probe wäre wertlos.\n' + (basis.stdout + basis.stderr).slice(0, 600)); process.exit(1); }
console.log('Ausgangslage: ' + basis.stdout.trim().split('\n').pop());

const T = mkdtempSync(join(tmpdir(), 'sperr-mutation-'));
let erkannt = 0; const ueberlebt = []; const unpassend = [];
for (const [name, alt, neu] of MUTANTEN) {
  const n = QUELLE.split(alt).length - 1;
  if (n !== 1) { unpassend.push(`${name} (Muster ${n}-mal)`); console.log(`?  ${name}: Muster passt ${n}-mal`); continue; }
  const pfad = join(T, `${name.split(' ')[0]}.mjs`);
  writeFileSync(pfad, QUELLE.replace(alt, neu));
  const r = lauf(pfad);
  // «erkannt» nur, wenn der Test selbst geurteilt hat (seine Schlusszeile steht da); ein Absturz der Umgebung zählt nicht
  const geurteilt = /^\d+ Tests bestanden, \d+ Fehler$/m.test(r.stdout || '');
  if (geurteilt && r.status !== 0) { erkannt++; console.log(`ok ${name}`); } else if (!geurteilt) { unpassend.push(`${name} (Test ohne Urteil)`); console.log(`?  ${name}: Test ohne Urteil`); } else { ueberlebt.push(name); console.log(`ÜBERLEBT ${name}`); }
}
rmSync(T, { recursive: true, force: true });
console.log(`${erkannt} von ${MUTANTEN.length} Mutanten erkannt, ${ueberlebt.length} überlebt, ${unpassend.length} ungeklärt`);
if (ueberlebt.length || unpassend.length) process.exitCode = 1;
