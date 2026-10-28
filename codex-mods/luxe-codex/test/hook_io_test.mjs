/** Test des Grundgerüsts: Hook-Ein-/Ausgabe, Schema-Prüfer (beide Richtungen), Fehlerverhalten. */
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { eingabe, fertig, gueltig, ist } from './kern.mjs';
import { kontext, laufe, liesJson, lerne, meldung, sichereOrdner, texteIn, verbinde, verbot, zustandsOrdner } from '../lib/hook_io.mjs';

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

// --- F11: das Messgerät ist() unterscheidet undefined, null, NaN, Infinity und fehlende Felder -------------------------
{
  const KERN = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), 'kern.mjs')).href;
  const messe = code => spawnSync(process.execPath, ['--input-type=module', '-e', `import { ist, fertig } from ${JSON.stringify(KERN)};\n${code}\nfertig();`], { encoding: 'utf8' });
  for (const [titel, code] of [
    ['[undefined] gegen [null]', "ist('t', [undefined], [null]);"],
    ['{a: undefined} gegen {}', "ist('t', { a: undefined }, {});"],
    ['{} gegen {a: undefined}', "ist('t', {}, { a: undefined });"],
    ['NaN gegen null', "ist('t', Number.NaN, null);"],
    ['Infinity gegen null', "ist('t', Infinity, null);"],
    ['undefined gegen null', "ist('t', undefined, null);"],
    ['[1, 2] gegen [1, 2, 3]', "ist('t', [1, 2], [1, 2, 3]);"],
    ['{a: 1} gegen {a: "1"}', "ist('t', { a: 1 }, { a: '1' });"],
    ['Schlüsselreihenfolge zählt weiter (wie bisher, nie lockerer als vorher)', "ist('t', { a: 1, b: 2 }, { b: 2, a: 1 });"],
    ['verschachtelt: {a: [undefined]} gegen {a: [null]}', "ist('t', { a: [undefined] }, { a: [null] });"],
  ]) {
    const r = messe(code);
    ist(`F11 Messgerät meldet einen Unterschied: ${titel}`, [r.status, r.stdout.includes('FEHLER t'), r.stdout.trim().endsWith('0 ok, 1 Fehler')], [1, true, true]);
  }
  for (const [titel, code] of [
    ['gleiche verschachtelte Werte', "ist('t', { a: [1, { b: 'x' }], c: null, d: undefined }, { a: [1, { b: 'x' }], c: null, d: undefined });"],
    ['NaN gegen NaN', "ist('t', Number.NaN, Number.NaN);"],
    ['undefined gegen undefined', "ist('t', undefined, undefined);"],
    ['leere Liste und leeres Objekt', "ist('t', [], []); ist('t', {}, {});"],
    ['Text', "ist('t', 'text', 'text');"],
  ]) {
    const r = messe(code);
    ist(`F11 Messgerät (Gegenprobe) lässt Gleiches durch: ${titel}`, [r.status, r.stdout.includes('FEHLER')], [0, false]);
  }
}

// --- F7: der Zustandsordner darf mehrere neue Ebenen haben -------------------------------------------------------
{
  const basis = mkdtempSync(join(tmpdir(), 'luxe-codex-'));
  const tief = join(basis, 'a', 'b', 'c');
  ist('F7 sichereOrdner legt mehrere neue Ebenen an und gibt den Pfad zurück', [sichereOrdner(tief), existsSync(tief)], [tief, true]);
  ist('F7 sichereOrdner ein zweites Mal (Ordner da): nichts passiert, kein Fehler', [sichereOrdner(tief), existsSync(tief)], [tief, true]);
  if (process.platform !== 'win32') ist('F6 sichereOrdner: ein neu angelegter Zustandsordner ist nur für den Besitzer lesbar (0700)', statSync(join(basis, 'a')).mode & 0o777, 0o700);
  rmSync(basis, { recursive: true, force: true });
}

// --- F6 / F20: das Lernprotokoll schreibt keine Zugangsdaten, ist nur für den Besitzer lesbar und bleibt klein ------------
{
  const basis = mkdtempSync(join(tmpdir(), 'luxe-codex-'));
  const ordner = join(basis, 'neu', 'zustand');
  const env = { LUXE_CODEX_ZUSTAND: ordner, LUXE_CODEX_LERNEN: '1' };
  const datei = join(ordner, 'gesehen.jsonl');
  const protokoll = () => readFileSync(datei, 'utf8');
  const merke = (werkzeugEingabe, name = 'exec_command') => lerne('t', eingabe('PreToolUse', { tool_name: name, tool_input: werkzeugEingabe }), env);

  // Die Fake-Zugangsdaten entstehen erst zur Laufzeit aus Teilen (sonst schlägt die Push-Protection von GitHub an).
  const shpss = `sh${'pss_'}${'0123456789abcdef'.repeat(2)}`;
  const shpat = `sh${'pat_'}${'0123456789abcdef'.repeat(2)}`;
  const ghp = `gh${'p_'}${'abcdefghijklmnopqrstuvwxyz0123456789'}`;
  const sk = `sk${'-'}${'abcdefghijklmnopqrstuvwxyz0123456789'}`;
  const xoxb = `xo${'xb-'}123456789012-abcdefghijklmnop`;
  const akia = `AK${'IA'}ABCDEFGHIJKLMNOP`;
  const pem = `-----BEGIN ${'PRIVATE'} KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7\n-----END ${'PRIVATE'} KEY-----`;
  const GEHEIM = [
    ['Shopify-Schlüssel in einer Umgebungsvariablen', { cmd: `LIVE=1 SHOPIFY_CLIENT_SECRET=${shpss} node automation/x.mjs` }, shpss.slice(0, 22)],
    ['Shopify-Zugriffstoken im Kopf eines curl-Aufrufs', { cmd: `curl -s -H "X-Shopify-Access-Token: ${shpat}" https://au3j0y-hq.myshopify.com/admin/api/2025-01/products.json` }, shpat.slice(0, 22)],
    ['GitHub-Token in einer Variablen', { cmd: `export GITHUB_TOKEN=${ghp} && git push` }, ghp.slice(0, 30)],
    ['GitHub-Token in der Adresse', { cmd: `git push https://user:${ghp}@github.com/x/y.git` }, ghp.slice(0, 30)],
    ['Bearer-Token', { cmd: 'curl -H "Authorization: Bearer abcdefghijklmnopqrstuvwxyz012345" https://api.example.org' }, 'abcdefghijklmnopqrstuvwxyz012345'],
    ['Schlüssel mit sk-', { cmd: `OPENAI_API_KEY=${sk} codex exec` }, sk.slice(0, 30)],
    ['Slack-Token', { cmd: `curl -d token=${xoxb} https://slack.com/api/x` }, xoxb.slice(0, 18)],
    ['AWS-Schlüssel', { cmd: `aws configure set aws_access_key_id ${akia}` }, akia],
    ['Passwort mit Gleichheitszeichen', { cmd: 'mysql --password=hunter2hunter2 -u root' }, 'hunter2hunter2'],
    ['Passwort in Anführungszeichen', { cmd: 'PASSWORD="mein geheimes wort" ./start.sh' }, 'mein geheimes wort'],
    ['privater Schlüssel', { content: pem }, 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7'],
    ['Wert unter einem Schlüssel mit «token» im Namen', { env: { SHOPIFY_TOKEN: 'nur-der-wert-allein-123456' } }, 'nur-der-wert-allein-123456'],
    ['Wert unter dem Schlüssel «password»', { password: 'hunter2hunter2' }, 'hunter2hunter2'],
    ['Wert unter dem Schlüssel «api_key» (Zahl)', { api_key: 987654321012345 }, '987654321012345'],
    ['Geheimnis, das über die Kürzungsgrenze von 120 Zeichen hinausragt', { cmd: `${'a'.repeat(110)} ${shpat}` }, shpat.slice(0, 10)],
  ];
  for (const [titel, form, geheim] of GEHEIM) {
    rmSync(datei, { force: true });
    merke(form);
    const text = protokoll();
    ist(`F6 Lernprotokoll ohne Geheimnis: ${titel}`, [text.includes(geheim), text.includes('[geheim]')], [false, true]);
  }
  rmSync(datei, { force: true });
  merke({ cmd: 'LIVE=1 node automation/x.mjs --phase tags --token-count 5', workdir: '/repo', env: { LANG: 'de', harmlos: 'x' } });
  const zeile = JSON.parse(protokoll().trim());
  ist('F6 Gegenprobe: Harmloses bleibt lesbar (Befehl, Arbeitsordner, Umgebungswerte)', [zeile.form.cmd, zeile.form.workdir, zeile.form.env], ['LIVE=1 node automation/x.mjs --phase tags --token-count 5', '/repo', { LANG: 'de', harmlos: 'x' }]);
  ist('F6 Gegenprobe: der Werkzeugname steht weiter im Protokoll', zeile.werkzeug, 'exec_command');

  if (process.platform !== 'win32') {
    ist('F20 gesehen.jsonl und ihr Ordner sind nur für den Besitzer lesbar (0600 / 0700)', [statSync(datei).mode & 0o777, statSync(ordner).mode & 0o777], [0o600, 0o700]);
    rmSync(datei, { force: true });
    writeFileSync(datei, '');
    chmodSync(datei, 0o644);
    ist('F20 (Vorbedingung) die vorbereitete Datei hat tatsächlich Rechte 0644', statSync(datei).mode & 0o777, 0o644);
    merke({ cmd: 'ls' });
    ist('F20 eine schon vorhandene Datei mit Rechten 0644 wird auf 0600 gesetzt', statSync(datei).mode & 0o777, 0o600);
  }
  // Begrenzung: über 1 MiB wird die Datei zur Seite gelegt, das Protokoll beginnt neu (höchstens zwei Dateien)
  writeFileSync(datei, `${'x'.repeat(1024 * 1024 + 10)}\n`);
  merke({ cmd: 'ls' });
  ist('F20 Lernprotokoll über 1 MiB wird zur Seite gelegt und beginnt neu', [existsSync(`${datei}.alt`), statSync(datei).size < 2000, readdirSync(ordner).sort()], [true, true, ['gesehen.jsonl', 'gesehen.jsonl.alt']]);
  merke({ cmd: 'ls' });
  ist('F20 …die neue Datei wächst normal weiter (zwei Zeilen)', protokoll().trim().split('\n').length, 2);
  rmSync(basis, { recursive: true, force: true });
}

fertig();
