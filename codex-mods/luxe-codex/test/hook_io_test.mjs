/** Test des Grundgerüsts: Hook-Ein-/Ausgabe, Schema-Prüfer (beide Richtungen), Fehlerverhalten. */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eingabe, fertig, gueltig, ist } from './kern.mjs';
import { kontext, laufe, liesJson, lerne, meldung, texteIn, verbinde, verbot, zustandsOrdner } from '../lib/hook_io.mjs';

// --- Das Messgerät zuerst: der Schema-Prüfer muss Gültiges durchlassen UND Ungültiges melden.
ist('Eingabe PreToolUse ist laut Schema gültig', gueltig(eingabe('PreToolUse'), 'pre-tool-use.command.input'), []);
ist('Eingabe PostToolUse ist laut Schema gültig', gueltig(eingabe('PostToolUse'), 'post-tool-use.command.input'), []);
ist('Eingabe SessionStart ist laut Schema gültig', gueltig(eingabe('SessionStart'), 'session-start.command.input'), []);
ist('Eingabe UserPromptSubmit ist laut Schema gültig', gueltig(eingabe('UserPromptSubmit'), 'user-prompt-submit.command.input'), []);
ist('Gegenprobe: Eingabe ohne Pflichtfeld tool_name wird gemeldet', gueltig({ ...eingabe('PreToolUse'), tool_name: undefined, ...{} }, 'pre-tool-use.command.input').length > 0 || (() => { const e = eingabe('PreToolUse'); delete e.tool_name; return gueltig(e, 'pre-tool-use.command.input').length > 0; })(), true);
ist('Gegenprobe: falsche hook_event_name wird gemeldet', gueltig({ ...eingabe('PreToolUse'), hook_event_name: 'PostToolUse' }, 'pre-tool-use.command.input').length > 0, true);
ist('Gegenprobe: unbekanntes Feld in hookSpecificOutput wird gemeldet', gueltig({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', bogus: 1 } }, 'pre-tool-use.command.output').length > 0, true);
ist('Gegenprobe: permissionDecision ausserhalb der Aufzählung wird gemeldet', gueltig({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'vielleicht' } }, 'pre-tool-use.command.output').length > 0, true);

// --- Ausgaben der Bausteine
ist('verbot: gültige PreToolUse-Ausgabe mit nicht leerem Grund', [gueltig(verbot('Grund'), 'pre-tool-use.command.output'), verbot('Grund').hookSpecificOutput.permissionDecisionReason], [[], 'Grund']);
ist('verbot ohne Grund bekommt trotzdem einen Grund (Codex verwirft sonst die Ausgabe)', verbot('  ').hookSpecificOutput.permissionDecisionReason.length > 0, true);
ist('kontext SessionStart ist gültig', gueltig(kontext('SessionStart', 'text'), 'session-start.command.output'), []);
ist('kontext UserPromptSubmit ist gültig', gueltig(kontext('UserPromptSubmit', 'text'), 'user-prompt-submit.command.output'), []);
ist('kontext PostToolUse ist gültig', gueltig(kontext('PostToolUse', 'text'), 'post-tool-use.command.output'), []);
ist('meldung ist an allen vier Ereignissen gültig', ['pre-tool-use', 'post-tool-use', 'session-start', 'user-prompt-submit'].map(n => gueltig(meldung('m'), `${n}.command.output`).length), [0, 0, 0, 0]);
ist('verbinde setzt Teile zusammen und lässt undefined weg', verbinde(meldung('a'), undefined, kontext('SessionStart', 'b')), { systemMessage: 'a', hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: 'b' } });

// --- Hilfen
ist('liesJson: Objekt ja, Rest nein', [liesJson('{"a":1}'), liesJson('[1]'), liesJson('kaputt'), liesJson(''), liesJson(undefined), liesJson('null')], [{ a: 1 }, undefined, undefined, undefined, undefined, undefined]);
ist('texteIn sammelt alle Zeichenketten tief verschachtelt', texteIn({ a: 'x', b: ['y', { c: 'z' }], d: 3 }), ['x', 'y', 'z']);
ist('texteIn bricht bei zu tiefer Verschachtelung ab statt zu hängen', texteIn((function t(n) { return n ? { k: t(n - 1) } : { k: 'tief' }; })(30)), []);
ist('zustandsOrdner: eigener Schalter vor Plugin-Daten vor CODEX_HOME', [
  zustandsOrdner({ LUXE_CODEX_ZUSTAND: '/a', CLAUDE_PLUGIN_DATA: '/b', CODEX_HOME: '/c' }),
  zustandsOrdner({ CLAUDE_PLUGIN_DATA: '/b', CODEX_HOME: '/c' }),
  zustandsOrdner({ CODEX_HOME: '/c' }),
], ['/a', '/b', '/c/luxe-codex']);

// --- laufe(): Fehlerverhalten
const sammle = () => { const s = []; return { s, schreibe: t => s.push(t) }; };
{
  const { s, schreibe } = sammle();
  const code = await laufe('t', () => ({ systemMessage: 'ok' }), { stdin: () => JSON.stringify(eingabe('SessionStart')), env: {}, schreibe });
  ist('laufe: Handler-Ergebnis wird als eine JSON-Zeile geschrieben, Exit 0', [code, s.length, JSON.parse(s[0])], [0, 1, { systemMessage: 'ok' }]);
}
{
  const { s, schreibe } = sammle();
  const code = await laufe('t', () => undefined, { stdin: () => JSON.stringify(eingabe('SessionStart')), env: {}, schreibe });
  ist('laufe: Handler ohne Ergebnis schreibt nichts', [code, s.length], [0, 0]);
}
{
  const { s, schreibe } = sammle();
  const code = await laufe('t', () => { throw new Error('kaputt'); }, { stdin: () => JSON.stringify(eingabe('SessionStart')), env: {}, schreibe });
  const aus = JSON.parse(s[0]);
  ist('laufe: Ausnahme im Handler → Exit 0 (blockiert nie), aber sichtbare Meldung mit dem Grund', [code, aus.systemMessage.includes('kaputt'), aus.systemMessage.includes('luxe-codex/t')], [0, true, true]);
  ist('…und die Meldung ist eine gültige Ausgabe', gueltig(aus, 'pre-tool-use.command.output'), []);
}
{
  const { s, schreibe } = sammle();
  const code = await laufe('t', () => { throw new Error('darf nicht laufen'); }, { stdin: () => 'kein json', env: {}, schreibe });
  ist('laufe: kaputtes stdin → keine Ausgabe, Exit 0, Handler läuft nicht', [code, s.length], [0, 0]);
}
{
  const { s, schreibe } = sammle();
  const code = await laufe('t', () => { throw new Error('x'); }, { stdin: () => { throw new Error('stdin weg'); }, env: {}, schreibe });
  ist('laufe: stdin wirft → Exit 0, keine Ausgabe', [code, s.length], [0, 0]);
}

// --- Lernprotokoll: nur auf Wunsch, gekürzt
{
  const ordner = mkdtempSync(join(tmpdir(), 'luxe-codex-'));
  const e = eingabe('PreToolUse', { tool_name: 'exec_command', tool_input: { command: 'x'.repeat(500), liste: Array.from({ length: 20 }, (_, i) => i) } });
  lerne('t', e, { LUXE_CODEX_ZUSTAND: ordner });
  let ohne = false; try { readFileSync(join(ordner, 'gesehen.jsonl')); } catch { ohne = true; }
  ist('Lernprotokoll: ohne LUXE_CODEX_LERNEN=1 wird nichts geschrieben', ohne, true);
  lerne('t', e, { LUXE_CODEX_ZUSTAND: ordner, LUXE_CODEX_LERNEN: '1' });
  const zeile = JSON.parse(readFileSync(join(ordner, 'gesehen.jsonl'), 'utf8').trim());
  ist('Lernprotokoll: Werkzeugname steht drin, lange Texte sind gekürzt, Listen begrenzt', [zeile.werkzeug, zeile.form.command.length < 200, zeile.form.command.includes('[500]'), zeile.form.liste.length], ['exec_command', true, true, 8]);
  rmSync(ordner, { recursive: true, force: true });
}

fertig();
