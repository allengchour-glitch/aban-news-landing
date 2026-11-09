#!/usr/bin/env node
// Erzeugt editor-release.json AUS DEN ECHTEN DATEIEN unter pod/v6/ (nie von Hand eintragen).
//
//   node editor_release_bauen.mjs              schreibt editor-release.json neben dieses Skript
//   node editor_release_bauen.mjs --pruefen    vergleicht die vorhandene JSON mit den Dateien (Exit 1 bei Abweichung, schreibt nichts)
//   Optionen: --version 6.4.0  --vorgaenger 6.3.0,6.3.1  --root <Repo-Wurzel>  --out <Datei>
//
// Erst NACH dem Einfrieren der Zieldatei ausführen: danach gehört sie unverändert in den Pfad (SRI). Wird
// pod/v6/lspod-designer-v6-6.4.0.js später noch geändert, schlägt der Konsistenztest in
// direct_rollout_test.mjs fehl und direct_rollout.mjs bricht vor jedem Netzzugriff ab: dann dieses Skript neu starten.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EDITOR_RELEASE_SCHEMA, ROLLOUT_V64, editorDateiname, editorReleaseFormPruefen, editorUrl } from './direct_rollout_lib.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
export const STANDARD_ROOT = resolve(HIER, '../../..');
export const STANDARD_AUSGABE = join(HIER, 'editor-release.json');
export const STANDARD_VORGAENGER = Object.freeze(['6.3.0', '6.3.1']);

function eintrag(root, version) {
  const file = `pod/v6/${editorDateiname(version)}`;
  const pfad = join(root, file);
  if (!existsSync(pfad)) throw new Error(`Editor-Datei fehlt: ${file}`);
  const bytes = readFileSync(pfad);
  return { version, file, url: editorUrl(version), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
}

/** Baut das editor-release-Objekt aus den Dateien unter `root`. Deterministisch (feste Schlüsselreihenfolge). */
export function editorReleaseErzeugen({ root = STANDARD_ROOT, version = ROLLOUT_V64, vorgaenger = STANDARD_VORGAENGER } = {}) {
  const er = { schema: EDITOR_RELEASE_SCHEMA, ...eintrag(root, version), vorgaenger: vorgaenger.map((v) => eintrag(root, v)) };
  return editorReleaseFormPruefen(er);
}

export const editorReleaseText = (er) => `${JSON.stringify(er, null, 2)}\n`;

/** Vergleicht eine vorhandene JSON mit den Dateien. Gibt eine Liste von Abweichungen zurück (leer = konsistent). */
export function editorReleaseAbgleichen(json, { root = STANDARD_ROOT } = {}) {
  const abw = [];
  let er;
  try { er = editorReleaseFormPruefen(json); } catch (e) { return [e.message]; }
  for (const e of [er, ...er.vorgaenger]) {
    const pfad = join(root, e.file);
    if (!existsSync(pfad)) { abw.push(`${e.file}: Datei fehlt`); continue; }
    const bytes = readFileSync(pfad);
    const sha = createHash('sha256').update(bytes).digest('hex');
    if (sha !== e.sha256) abw.push(`${e.file}: sha256 ${sha} statt ${e.sha256} in editor-release.json`);
    if (bytes.length !== e.bytes) abw.push(`${e.file}: ${bytes.length} Byte statt ${e.bytes} in editor-release.json`);
  }
  return abw;
}

function argumente(argv) {
  const o = { pruefen: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pruefen') o.pruefen = true;
    else if (['--version', '--vorgaenger', '--root', '--out'].includes(a)) { o[a.slice(2)] = argv[++i]; if (o[a.slice(2)] === undefined) throw new Error(`${a} braucht einen Wert`); }
    else throw new Error(`Unbekanntes Argument: ${a}`);
  }
  return o;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const o = argumente(process.argv.slice(2));
    const root = o.root ? resolve(o.root) : STANDARD_ROOT;
    const out = o.out ? resolve(o.out) : STANDARD_AUSGABE;
    const version = o.version || ROLLOUT_V64;
    const vorgaenger = o.vorgaenger ? o.vorgaenger.split(',').map((x) => x.trim()).filter(Boolean) : [...STANDARD_VORGAENGER];
    if (o.pruefen) {
      if (!existsSync(out)) throw new Error(`editor-release.json fehlt: ${out}`);
      const json = JSON.parse(readFileSync(out, 'utf8'));
      const abw = editorReleaseAbgleichen(json, { root });
      if (o.version && json.version !== o.version) abw.push(`Version ${json.version} statt ${o.version}`);
      if (abw.length) { console.error(`editor-release.json weicht von den Dateien ab:\n- ${abw.join('\n- ')}\nNeu erzeugen: node editor_release_bauen.mjs`); process.exit(1); }
      console.log(`editor-release.json ist konsistent (Ziel ${version}, ${vorgaenger.length} Vorgänger)`);
    } else {
      const er = editorReleaseErzeugen({ root, version, vorgaenger });
      writeFileSync(out, editorReleaseText(er));
      console.log(`editor-release.json geschrieben: ${er.version} ${er.sha256} (${er.bytes} Byte), Vorgänger ${er.vorgaenger.map((v) => v.version).join(', ')}`);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
