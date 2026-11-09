#!/usr/bin/env node
// Mutationsprobe für den 6.4.0-Rollout (Planer, Eingaben, Bestätigungen, Canary-Tabelle, Bauskript, Skript-Verdrahtung,
// Workflow, _headers, editor-release.json, README). Sie baut Kopien des Ordners in einem Wegwerfverzeichnis
// (pod/, automation/ und rollout-v63/ nur als Verknüpfung, nie verändert), setzt je Mutant EINE kleine Änderung ein und
// startet direct_rollout_test.mjs. Ein Mutant gilt als erkannt, wenn der Test mit Exit != 0 endet.
// Vorher muss die unveränderte Kopie grün sein («Ausgangslage»); nicht anwendbare Muster zählen als Fehler (nie als erkannt).
//   node direct_rollout_mutationsprobe.mjs            alle Mutanten (rund 3 bis 5 Minuten)
//   node direct_rollout_mutationsprobe.mjs P05 W03    nur diese Kennungen
//   PARALLEL=2 node …                                 Anzahl gleichzeitiger Kopien (Vorgabe 4)
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = resolve(HIER, '../../..');
const REL = 'dropship/selbst-gestalten-fertig-0511/rollout-v63-direct';
const DATEI = {
  lib: `${REL}/direct_rollout_lib.mjs`,
  skript: `${REL}/direct_rollout.mjs`,
  bau: `${REL}/editor_release_bauen.mjs`,
  json: `${REL}/editor-release.json`,
  readme: `${REL}/README.md`,
  w64: '.github/workflows/pod-v64-description-rollout.yml',
  headers: '_headers',
};

// Bausteine für Änderungen: zeile = die EINE Zeile, die den Text enthält (ersatz: Text, Funktion(Original) oder null = Zeile löschen);
// suche = Text oder RegExp mit genau einem Treffer (alle: true ersetzt jeden Treffer); transform = Funktion über den ganzen Text.
const z = (datei, zeile, ersatz) => ({ datei, zeile, ersatz });
const s = (datei, suche, ersatz, extra = {}) => ({ datei, suche, ersatz, ...extra });
const t = (datei, transform) => ({ datei, transform });
const zeileErsetzt = (von, nach) => (orig) => orig.replace(von, nach);
const jsonAendern = (f) => (text) => { const o = JSON.parse(text); f(o); return `${JSON.stringify(o, null, 2)}\n`; };

const MUTANTEN = [
  // ---- Planer: Lockerung zu weit / Schutz weg ---------------------------------------------------------------
  { id: 'P01', was: 'data-produkttitel ebenfalls frei', edits: [z('lib', String.raw`\bdata-vorschau-url="[^"?]*`, (o) => `    .replace(/\\bdata-produkttitel="[^"]*"/g, 'T')\n${o}`)] },
  { id: 'P02', was: 'Pfad der Karte frei', edits: [z('lib', String.raw`\bdata-karte-url="[^"?]*`, `    .replace(/\\bdata-karte-url="[^"]*"/g, 'data-karte-url="K"')`)] },
  { id: 'P03', was: 'Pfad der Vorschau frei', edits: [z('lib', String.raw`\bdata-vorschau-url="[^"?]*`, `    .replace(/\\bdata-vorschau-url="[^"]*"/g, 'data-vorschau-url="V"');`)] },
  { id: 'P04', was: 'Karten-?v= beliebig lang statt genau 16 Zeichen', edits: [z('lib', String.raw`\bdata-karte-url="[^"?]*`, zeileErsetzt('{16}"/g', '+"/g'))] },
  { id: 'P05', was: 'card= im Marker nicht normalisiert (Lockerung aus)', edits: [z('lib', 'lx-v63-editor:start product=gid', null)] },
  { id: 'P06', was: 'Karten-?v= nicht normalisiert (Lockerung aus)', edits: [z('lib', String.raw`\bdata-karte-url="[^"?]*`, null)] },
  { id: 'P07', was: 'Vorschau-?v= nicht normalisiert (Lockerung aus)', edits: [z('lib', String.raw`\bdata-vorschau-url="[^"?]*`, null)] },
  { id: 'P08', was: 'Produkt-ID im Marker frei', edits: [z('lib', 'lx-v63-editor:start product=gid', '    .replace(/(<!-- lx-v63-editor:start product=)\\S+( card=)[a-f0-9]{64}( -->)/g, `$1${PH}p${PH}$2${PH}card${PH}$3`)')] },
  { id: 'P09', was: 'Vergleich der normalisierten Texte ausgeschaltet', edits: [z('lib', 'if (editorBlockNormalisieren(text, [istScript]) !==', '    if (false) {')] },
  { id: 'P10', was: 'Ziel schon da, Rest geändert wird akzeptiert', edits: [z('lib', 'if (zielAnzahl === 1 && vorgSumme === 0 &&', '  if (zielAnzahl === 1 && vorgSumme === 0) return geplant;')] },
  { id: 'P11', was: 'nur der erste Vorgänger (6.3.0) zulässig', edits: [z('lib', 'const vorgScripts = vorgaenger.map(editorScript);', '  const vorgScripts = vorgaenger.slice(0, 1).map(editorScript);')] },
  { id: 'P12', was: 'mehrere Vorgänger-Scripts zulässig', edits: [z('lib', 'if (zielAnzahl === 0 && vorgSumme === 1) {', '  if (zielAnzahl === 0 && vorgSumme >= 1) {')] },
  { id: 'P13', was: 'Prüfung «neuer Baustein trägt das Ziel-Release» aus', edits: [z('lib', 'geplant.nachher.split(ziel).length - 1 !== 1', "  if (false) throw new Error('x');")] },
  { id: 'P14', was: 'mehr als ein Marker wird schon im ersten Schritt nicht mehr abgewiesen', edits: [z('lib', 'if (marker.length !== 1) throw new Error(`Editor-Release braucht', zeileErsetzt('!== 1', '< 1'))] },
  { id: 'P15', was: 'Steuerzeichen-Falle des Platzhalters nicht geprüft', edits: [z('lib', 'if (t.includes(PH)) throw', null)] },
  { id: 'P16', was: 'Ziel-Script-Vergleich ohne SRI (editorScript ohne integrity)', edits: [z('lib', 'return `<script src="${attr(assetUrl(editor.url', '  return `<script src="${attr(assetUrl(editor.url, editor.sha256))}" crossorigin="anonymous" defer></script>`;')] },
  { id: 'P17', was: 'Baustein schreibt eine falsche SRI', edits: [z('lib', 'return `<!-- lx-v63-editor:start product=${releaseProduct.id}', zeileErsetzt('integritySha256(editor.sha256)', "integritySha256('0'.repeat(64))"))] },
  { id: 'P18', was: 'Asset-Version nur 15 statt 16 Zeichen', edits: [z('lib', "u.searchParams.set('v', hash.slice(0, 16));", "  u.searchParams.set('v', hash.slice(0, 15));")] },
  { id: 'P19', was: 'Release-Prüfung bleibt fest auf dem 6.3.1-Pfad', edits: [z('lib', '!assetPfad(release.editor.url, editorPfad)', zeileErsetzt('assetPfad(release.editor.url, editorPfad)', "assetPfad(release.editor.url, '/pod/v6/lspod-designer-v6-6.3.1.js')"))] },
  { id: 'P20', was: 'Release-Prüfung prüft den Editor-Pfad gar nicht', edits: [z('lib', '!assetPfad(release.editor.url, editorPfad)', zeileErsetzt('!assetPfad(release.editor.url, editorPfad)', 'false'))] },
  { id: 'P21', was: 'Allowlist-Editor-SHA wird im 6.4.0-Modus nicht mehr gegen Ziel/Vorgänger geprüft', edits: [z('lib', 'if (![editor.sha256, ...vorgaengerSha256].includes(allowlist.editorSha256))', null)] },
  { id: 'P40', was: 'Ziel-Editor aus editor-release.json wird nicht auf URL und SHA geprüft', edits: [z('lib', "if (!HASH64.test(editor.sha256 || '') || !/^https", null)] },
  // ---- Bestätigungen, Scopes, Canary-Tabelle ----------------------------------------------------------------
  { id: 'K01', was: 'Stufe A akzeptiert die alte V63-Bestätigung', edits: [z('lib', "apply: Object.freeze({ 'canary-tasse': 'V64_CANARY_TASSE'", zeileErsetzt("'V64_CANARY_TASSE'", "'V63_CANARY_TASSE'"))] },
  { id: 'K02', was: 'Rollback Stufe A nimmt die Apply-Bestätigung', edits: [z('lib', "rollback: Object.freeze({ 'canary-tasse': 'V64_ROLLBACK_TASSE'", zeileErsetzt("'V64_ROLLBACK_TASSE'", "'V64_CANARY_TASSE'"))] },
  { id: 'K03', was: 'Full akzeptiert die alte V63-Bestätigung', edits: [z('lib', "apply: Object.freeze({ 'canary-tasse': 'V64_CANARY_TASSE'", zeileErsetzt("'V64_FULL_16_EDITOR'", "'V63_FULL_19_SAFE'"))] },
  { id: 'K04', was: 'LIVE=1 wird für Schreiben nicht verlangt', edits: [z('lib', "if (m !== 'plan' && live !== true)", null)] },
  { id: 'K05', was: 'Scope-Liste nicht geprüft (freie Scopes)', edits: [z('lib', 'if (!erlaubt.includes(s)) throw', null)] },
  { id: 'K06', was: '6.4.0 bekommt einen Vorgabe-Scope', edits: [z('lib', "const s = String(scope || (v64 ? '' : 'canary'))", zeileErsetzt("(v64 ? '' : 'canary')", "(v64 ? 'canary-tasse' : 'canary')"))] },
  { id: 'K07', was: 'Jutebeutel-Canary zeigt auf die Tasse', edits: [z('lib', "'canary-jutebeutel': canaryEintrag('canary-jutebeutel',", "  'canary-jutebeutel': canaryEintrag('canary-jutebeutel', '15422823465345', 'keramik-tasse-selbst-gestalten'),")] },
  { id: 'K08', was: 'Canary-Produkt per Umgebungsvariable wählbar', edits: [z('lib', "const canary = s === 'full' ? null", "  const canary = s === 'full' ? null : (v64 ? (process.env.CANARY ? { ...CANARY_V64[s], handle: process.env.CANARY } : CANARY_V64[s]) : CANARY_V63);")] },
  { id: 'K09', was: 'Full prüft die Sperrprodukte nicht mehr zuerst', edits: [z('lib', "return [...alle.filter((x) => x.kind === 'blocked')", '  return alle;')] },
  { id: 'K10', was: 'Canary-Auswahl lässt mehrere Treffer zu', edits: [z('lib', 'if (p.length !== 1) throw new Error(`Canary nicht genau', zeileErsetzt('!== 1', '< 1'))] },
  { id: 'K11', was: 'Canary-Ledger: Anzahl der Produkte nicht geprüft', edits: [z('lib', 'if (konf.canary && (s.size !== 1 ||', zeileErsetzt('s.size !== 1 || ', ''))] },
  { id: 'K12', was: 'Canary-Ledger: Produkt nicht geprüft', edits: [z('lib', 'if (konf.canary && (s.size !== 1 ||', zeileErsetzt(' || !s.has(konf.canary.id)', ''))] },
  { id: 'K13', was: 'alter Pfad: Bestätigung V63_CANARY_TASSE verändert', edits: [z('lib', "apply: Object.freeze({ canary: 'V63_CANARY_TASSE'", zeileErsetzt("'V63_CANARY_TASSE'", "'V63_CANARY_TASSE_X'"))] },
  { id: 'K14', was: 'alter Pfad: Full prüft jetzt auch die Sperrprodukte zuerst', edits: [z('lib', 'if (konf.editorVersion === ROLLOUT_V63) return alle;', null)] },
  { id: 'K15', was: 'Vorgänger darf neuer sein als das Ziel (Vergleich gedreht)', edits: [z('lib', 'for (let i = 0; i < 3; i++) if (x[i] !== y[i])', zeileErsetzt('return x[i] < y[i]', 'return x[i] > y[i]'))] },
  { id: 'K16', was: 'Form: doppelter Vorgänger oder Vorgänger gleich Ziel wird nicht abgewiesen', edits: [z('lib', 'if (versionen.has(v.version) || hashes.has(v.sha256))', null)] },
  { id: 'K17', was: 'Form: Dateiname muss nicht zur Version passen', edits: [z('lib', 'if (e.file !== `pod/v6/${editorDateiname(e.version)}`)', null)] },
  { id: 'K18', was: 'alter Pfad: Canary zeigt auf den Jutebeutel statt die Tasse', edits: [z('lib', "export const CANARY_V63 = canaryEintrag('canary',", "export const CANARY_V63 = canaryEintrag('canary', '15422819991937', 'bio-jutebeutel-selbst-gestalten');")] },
  { id: 'K19', was: 'Full (6.4.0) bekommt einen Canary', edits: [z('lib', "const canary = s === 'full' ? null", zeileErsetzt("s === 'full' ? null", "s === 'full' ? CANARY_V64['canary-tasse']"))] },
  { id: 'K20', was: 'Bestätigung gilt, wenn sie die richtige nur enthält', edits: [z('lib', "if (String(ack || '') !== soll) {", "    if (!String(ack || '').includes(soll)) {")] },
  { id: 'K21', was: 'Plan verlangt ebenfalls eine Bestätigung', edits: [z('lib', "if (m !== 'plan') {", '  if (true) {')] },
  { id: 'K22', was: 'LIVE wird nur auf «nicht gesetzt» geprüft', edits: [z('lib', "if (m !== 'plan' && live !== true)", zeileErsetzt('live !== true', 'live === undefined'))] },
  // ---- Bauskript editor_release_bauen.mjs --------------------------------------------------------------------
  { id: 'B01', was: 'Bauskript rechnet den Hash über etwas anderes als die Dateibytes', edits: [z('bau', "sha256: createHash('sha256').update(bytes)", zeileErsetzt('.update(bytes)', '.update(String(bytes.length))'))] },
  { id: 'B02', was: 'Abgleich ignoriert die Byteanzahl', edits: [z('bau', 'if (bytes.length !== e.bytes) abw.push', null)] },
  { id: 'B03', was: 'Abgleich ignoriert den SHA-256', edits: [z('bau', 'if (sha !== e.sha256) abw.push', null)] },
  { id: 'B04', was: '--pruefen endet auch bei Abweichung mit Exit 0', edits: [z('bau', 'if (abw.length) { console.error(', '      if (false) { }')] },
  { id: 'B05', was: 'Standard-Vorgänger nur 6.3.0', edits: [z('bau', 'export const STANDARD_VORGAENGER', "export const STANDARD_VORGAENGER = Object.freeze(['6.3.0']);")] },
  { id: 'B06', was: 'Standard-Ziel 6.3.1 statt 6.4.0', edits: [z('bau', 'export function editorReleaseErzeugen(', zeileErsetzt('version = ROLLOUT_V64', "version = '6.3.1'"))] },
  { id: 'B07', was: 'JSON ohne abschliessenden Zeilenumbruch', edits: [z('bau', 'export const editorReleaseText', zeileErsetzt('}\\n`', '}`'))] },
  // ---- direct_rollout.mjs (Kindprozess-Tests) ----------------------------------------------------------------
  { id: 'S01', was: 'Skript reicht die Bestätigung nicht an die Prüfung weiter', edits: [z('skript', "ack: process.env.ACK || process.env.ACK_FULL || '',", null)] },
  { id: 'S02', was: 'Skript behandelt LIVE immer als gesetzt', edits: [z('skript', "live: process.env.LIVE === '1',", '  live: true,')] },
  { id: 'S03', was: 'Skript-Vorgabe ist 6.4.0 statt 6.3.1', edits: [z('skript', 'editorVersion: process.env.EDITOR_VERSION || ROLLOUT_V63,', zeileErsetzt('ROLLOUT_V63', 'ROLLOUT_V64'))] },
  { id: 'S04', was: 'editor-release.json wird nicht gegen die Dateibytes geprüft', edits: [z('skript', 'if (sha256(bytes) !== e.sha256 || bytes.length !== e.bytes) throw', null)] },
  { id: 'S05', was: 'Vorgänger-Dateien werden nicht gegen editor-release.json geprüft', edits: [z('skript', 'for (const e of [er, ...er.vorgaenger]) {', '  for (const e of [er]) {')] },
  { id: 'S06', was: 'Plan-Artefakt: Editor-Version/Scope/Canary-Zugehörigkeit nicht geprüft', edits: [z('skript', 'if ((ALT_PFAD ? meta.editorVersion !== undefined', null)] },
  { id: 'S07', was: 'Plan-Artefakt: Canary-Handle nicht geprüft', edits: [z('skript', 'if ((ALT_PFAD ? meta.editorVersion !== undefined', zeileErsetzt('|| meta.canary !== (KONF.canary ? KONF.canary.handle : null) ', ''))] },
  { id: 'S08', was: 'Plan-Artefakt: Scope nicht geprüft', edits: [z('skript', 'if ((ALT_PFAD ? meta.editorVersion !== undefined', zeileErsetzt('|| meta.scope !== SCOPE) throw', ') throw'))] },
  { id: 'S09', was: 'Release-Sicherung wird im Rollback nicht gegen den Editor-Pfad geprüft', edits: [z('skript', "releasePruefen(JSON.parse(readFileSync(releasePfad, 'utf8')), { editorPfad: KONF.editorUrlPfad });", '  true;')] },
  { id: 'S10', was: 'Release-Sicherung wird gegen den 6.3.1-Pfad statt den Lauf-Pfad geprüft', edits: [z('skript', "releasePruefen(JSON.parse(readFileSync(releasePfad, 'utf8')), { editorPfad: KONF.editorUrlPfad });", "  releasePruefen(JSON.parse(readFileSync(releasePfad, 'utf8')));")] },
  { id: 'S11', was: 'Canary-Ledger wird im Rollback nicht geprüft', edits: [z('skript', 'canaryLedgerPruefen(KONF, ids);', null)] },
  { id: 'S12', was: 'Ledger-Scope wird im Rollback nicht geprüft', edits: [z('skript', "if (ledger?.schema !== 1 || ledger.mode !== 'apply'", zeileErsetzt('|| ledger.scope !== SCOPE ', ''))] },
  { id: 'S14', was: 'Version in editor-release.json wird nicht gegen EDITOR_VERSION geprüft', gleichwertig: 'Der Pfad editor-release.json ist im Skript fest, und der Test «editor-release.json: Form, Ziel 6.4.0» sowie der Konsistenztest weisen jede andere Version ab, bevor ein Lauf startet; im Kindprozess lässt sich die Datei nicht austauschen.', edits: [z('skript', 'if (er.version !== EDITOR_VERSION) throw', null)] },
  { id: 'S13', was: 'Rollback-Artefakt wird erst nach dem Zugang geprüft (nicht mehr vor jedem Netzzugriff)', edits: [z('skript', "const lokal = MODE === 'rollback' ? rollbackLokalLaden()", "const lokal = MODE === 'rollback' ? null : releaseLokalBauen();")] },
  // ---- Workflow, Header, editor-release.json, README ---------------------------------------------------------
  { id: 'W01', was: 'Workflow: Default-Branch-Prüfung entfernt', edits: [z('w64', 'test "$REF_NAME" = "$DEFAULT_BRANCH"', '          true')] },
  { id: 'W02', was: 'Workflow: apply:full verlangt die alte V63-Bestätigung', edits: [z('w64', 'apply:full) test', zeileErsetzt('V64_FULL_16_EDITOR', 'V63_FULL_19_SAFE'))] },
  { id: 'W03', was: "Workflow: EDITOR_VERSION auf '6.3.1'", edits: [z('w64', "EDITOR_VERSION: '6.4.0'", "          EDITOR_VERSION: '6.3.1'")] },
  { id: 'W04', was: 'Workflow: EDITOR_VERSION aus einer Eingabe', edits: [z('w64', "EDITOR_VERSION: '6.4.0'", '          EDITOR_VERSION: ${{ inputs.scope }}')] },
  { id: 'W05', was: 'Workflow: Zeitplan-Auslöser hinzugefügt', edits: [s('w64', '  workflow_dispatch:\n', "  schedule:\n    - cron: '0 3 * * *'\n  workflow_dispatch:\n")] },
  { id: 'W06', was: 'Workflow: eigene Concurrency-Gruppe (nicht mehr mit v63 geteilt)', edits: [z('w64', 'group: pod-v63-description-rollout', '  group: pod-v64-description-rollout')] },
  { id: 'W07', was: 'Workflow: Artefaktname der v63-Läufe', edits: [z('w64', 'name: pod-v64-rollout-${{ github.run_id }}', '          name: pod-v63-rollout-${{ github.run_id }}')] },
  { id: 'W08', was: 'Workflow: Eingabe direkt in das Shell-Skript eingesetzt', edits: [z('w64', 'plan) MODE=plan SCOPE="$SCOPE" node "$SCRIPT" ;;', '            plan) MODE=plan SCOPE="${{ inputs.scope }}" node "$SCRIPT" ;;')] },
  { id: 'W09', was: 'Workflow: checkout nicht auf den aufgezeichneten Commit', edits: [z('w64', 'ref: ${{ github.sha }}', '          ref: ${{ github.event.repository.default_branch }}')] },
  { id: 'W10', was: 'Workflow: Scope-Auswahl mit zusätzlichem freien Wert', edits: [z('w64', 'options: [canary-tasse, canary-jutebeutel, full]', '        options: [canary-tasse, canary-jutebeutel, full, canary]')] },
  { id: 'W11', was: 'Workflow: Rollback Jutebeutel verlangt die Apply-Bestätigung', edits: [z('w64', 'rollback:canary-jutebeutel)', zeileErsetzt('V64_ROLLBACK_JUTEBEUTEL', 'V64_CANARY_JUTEBEUTEL'))] },
  { id: 'W12', was: 'Workflow: Rollback full ohne Pflicht-Run-ID', edits: [z('w64', 'rollback:full)', zeileErsetzt('; [[ "$SOURCE_RUN_ID" =~ ^[0-9]+$ ]]', ''))] },
  { id: 'W13', was: 'Workflow: editor-release.json wird nicht mehr gegen die Dateien geprüft', edits: [z('w64', 'editor_release_bauen.mjs --pruefen', '        run: echo übersprungen')] },
  { id: 'W14', was: 'Workflow: apply:canary-tasse nimmt auch eine Run-ID an (Verhalten, nicht Wortlaut)', edits: [z('w64', 'apply:canary-tasse) test', zeileErsetzt('test -z "$SOURCE_RUN_ID"', 'true'))] },
  { id: 'H01', was: '_headers: 6.4.0-Dateiname nicht mehr unveränderlich', edits: [z('headers', '/pod/v6/lspod-designer-v6-*.js', '/pod/v6/lspod-designer-v6-6.3.*.js')] },
  { id: 'H02', was: '_headers: Cross-Origin-Resource-Policy für /pod/v6/* geschlossen', edits: [s('headers', '  Access-Control-Allow-Origin: *\n  Cross-Origin-Resource-Policy: cross-origin\n  Cache-Control: public, max-age=86400, must-revalidate', '  Access-Control-Allow-Origin: *\n  Cross-Origin-Resource-Policy: same-site\n  Cache-Control: public, max-age=86400, must-revalidate')] },
  { id: 'J01', was: 'editor-release.json: ein Zeichen im Hash des Ziels geändert', edits: [t('json', jsonAendern((o) => { o.sha256 = (o.sha256[0] === 'a' ? 'b' : 'a') + o.sha256.slice(1); }))] },
  { id: 'J02', was: 'editor-release.json: Byteanzahl des Ziels um 1 verändert', edits: [t('json', jsonAendern((o) => { o.bytes += 1; }))] },
  { id: 'J03', was: 'editor-release.json: Vorgänger 6.3.1 fehlt', edits: [t('json', jsonAendern((o) => { o.vorgaenger = o.vorgaenger.filter((v) => v.version !== '6.3.1'); }))] },
  { id: 'J04', was: 'editor-release.json: Hash des eingefrorenen Vorgängers 6.3.0 geändert', edits: [t('json', jsonAendern((o) => { const h = o.vorgaenger[0].sha256; o.vorgaenger[0].sha256 = (h[0] === 'a' ? 'b' : 'a') + h.slice(1); }))] },
  { id: 'R01', was: 'README nennt V64_ROLLBACK_16_EDITOR nicht mehr', edits: [s('readme', /V64_ROLLBACK_16_EDITOR/g, 'V64_ROLLBACK_ENTFERNT', { alle: true })] },
];

function mutieren(text, e) {
  if (e.zeile !== undefined) {
    const zeilen = text.split('\n');
    const idx = zeilen.map((l, i) => (l.includes(e.zeile) ? i : -1)).filter((i) => i >= 0);
    if (idx.length !== 1) return { fehler: `Zeile nicht eindeutig (${idx.length} Treffer): ${e.zeile}` };
    const orig = zeilen[idx[0]];
    const neu = typeof e.ersatz === 'function' ? e.ersatz(orig) : e.ersatz;
    if (neu === orig) return { fehler: `Ersatz ändert nichts: ${e.zeile}` };
    if (neu === null) zeilen.splice(idx[0], 1); else zeilen[idx[0]] = neu;
    return { text: zeilen.join('\n') };
  }
  if (e.transform) {
    const neu = e.transform(text);
    return neu === text ? { fehler: 'Transformation ändert nichts' } : { text: neu };
  }
  const treffer = typeof e.suche === 'string' ? text.split(e.suche).length - 1 : (text.match(new RegExp(e.suche.source, e.suche.flags.includes('g') ? e.suche.flags : `${e.suche.flags}g`)) || []).length;
  if (treffer < 1 || (!e.alle && treffer !== 1)) return { fehler: `Muster nicht eindeutig anwendbar (${treffer} Treffer): ${String(e.suche).slice(0, 80)}` };
  const neu = typeof e.suche === 'string' ? text.replace(e.suche, () => e.ersatz) : text.replace(e.suche, e.ersatz);
  return { text: neu };
}

function kopieAnlegen() {
  const dir = mkdtempSync(join(tmpdir(), 'v64-mutation-'));
  const ordner = join(dir, REL);
  mkdirSync(ordner, { recursive: true });
  for (const name of ['direct_rollout_lib.mjs', 'direct_rollout.mjs', 'editor_release_bauen.mjs', 'direct_rollout_test.mjs', 'editor-release.json', 'README.md']) cpSync(join(WURZEL, REL, name), join(ordner, name));
  cpSync(join(WURZEL, REL, 'fixtures'), join(ordner, 'fixtures'), { recursive: true });
  mkdirSync(join(dir, '.github/workflows'), { recursive: true });
  for (const w of ['pod-v63-description-rollout.yml', 'pod-v64-description-rollout.yml']) cpSync(join(WURZEL, '.github/workflows', w), join(dir, '.github/workflows', w));
  cpSync(join(WURZEL, '_headers'), join(dir, '_headers'));
  symlinkSync(join(WURZEL, 'pod'), join(dir, 'pod'));
  symlinkSync(join(WURZEL, 'automation'), join(dir, 'automation'));
  mkdirSync(join(dir, 'dropship/selbst-gestalten-fertig-0511'), { recursive: true });
  symlinkSync(join(WURZEL, 'dropship/selbst-gestalten-fertig-0511/rollout-v63'), join(dir, 'dropship/selbst-gestalten-fertig-0511/rollout-v63'));
  return dir;
}
const pfad = (dir, art) => join(dir, DATEI[art]);

function testLaufen(dir) {
  return new Promise((fertig) => {
    const p = spawn(process.execPath, [join(dir, REL, 'direct_rollout_test.mjs')], { stdio: ['ignore', 'pipe', 'pipe'] });
    let aus = ''; let fehl = '';
    const timer = setTimeout(() => p.kill('SIGKILL'), 240000);
    p.stdout.on('data', (d) => { aus += d; }); p.stderr.on('data', (d) => { fehl += d; });
    p.on('close', (code, signal) => { clearTimeout(timer); fertig({ code, signal, aus, fehl }); });
  });
}

const gewaehlt = process.argv.slice(2);
const liste = gewaehlt.length ? MUTANTEN.filter((m) => gewaehlt.includes(m.id)) : MUTANTEN;
if (gewaehlt.length && liste.length !== gewaehlt.length) { console.error(`Unbekannte Kennung in: ${gewaehlt.join(' ')}`); process.exit(2); }
const ids = MUTANTEN.map((m) => m.id);
if (new Set(ids).size !== ids.length) { console.error('Doppelte Mutanten-Kennung'); process.exit(2); }
const parallel = Math.max(1, Number(process.env.PARALLEL || 4));
const kopien = Array.from({ length: Math.min(parallel, liste.length || 1) }, kopieAnlegen);
const ergebnisse = [];
try {
  // Ausgangslage: die unveränderten Kopien müssen grün sein, sonst ist jede «Erkennung» wertlos.
  const basis = await Promise.all(kopien.map(testLaufen));
  if (basis.some((b) => b.code !== 0)) {
    console.error(`AUSGANGSLAGE NICHT GRÜN, Probe abgebrochen:\n${basis.find((b) => b.code !== 0).fehl.slice(0, 1500)}`);
    process.exitCode = 2;
  } else {
    console.log(`Ausgangslage grün (${basis[0].aus.trim()}), ${liste.length} Mutanten, ${kopien.length} parallele Kopien`);
    let naechster = 0;
    const arbeiter = async (dir) => {
      while (naechster < liste.length) {
        const m = liste[naechster++];
        const originale = new Map(); const fehler = [];
        for (const e of m.edits) {
          const p = pfad(dir, e.datei);
          if (!originale.has(p)) originale.set(p, readFileSync(p, 'utf8'));
          const r = mutieren(readFileSync(p, 'utf8'), e);
          if (r.fehler) { fehler.push(r.fehler); break; }
          writeFileSync(p, r.text);
        }
        let res;
        if (fehler.length) res = { m, status: 'NICHT ANWENDBAR', detail: fehler[0] };
        else {
          const lauf = await testLaufen(dir);
          const erster = (lauf.fehl.match(/^FEHLER ([^\n]*)/m) || [])[1];
          res = lauf.code === 0 ? { m, status: 'ÜBERLEBT', detail: lauf.aus.trim() } : { m, status: 'erkannt', detail: (erster || lauf.fehl.split('\n').find((x) => x.trim()) || `Exit ${lauf.code}${lauf.signal ? ` ${lauf.signal}` : ''}`).slice(0, 150) };
        }
        for (const [p, text] of originale) writeFileSync(p, text);
        ergebnisse.push(res);
        console.log(`${res.status === 'erkannt' ? 'ok  ' : 'FEHL'} ${m.id} ${m.was} -> ${res.status}: ${res.detail}`);
      }
    };
    await Promise.all(kopien.map(arbeiter));
    const erkannt = ergebnisse.filter((r) => r.status === 'erkannt').length;
    const gleich = ergebnisse.filter((r) => r.status === 'ÜBERLEBT' && r.m.gleichwertig);
    const schlecht = ergebnisse.filter((r) => r.status !== 'erkannt' && !(r.status === 'ÜBERLEBT' && r.m.gleichwertig));
    console.log(`\nMutationsprobe: ${erkannt} von ${ergebnisse.length} erkannt, ${gleich.length} als gleichwertig begründet`);
    for (const r of gleich) console.log(`  gleichwertig ${r.m.id}: ${r.m.gleichwertig}`);
    if (schlecht.length) { console.log(`Nicht erkannt oder nicht anwendbar: ${schlecht.map((r) => `${r.m.id} (${r.status})`).join(', ')}`); process.exitCode = 1; }
  }
} finally {
  for (const d of kopien) rmSync(d, { recursive: true, force: true });
}
