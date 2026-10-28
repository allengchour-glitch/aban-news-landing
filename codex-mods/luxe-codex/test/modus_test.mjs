/**
 * Test des Sparmodus und des Kontext-Hooks: Stil-Text, Schalter-Datei (Vorgabe AUS), Ausgaben gegen die Schemas,
 * der Kontext-Hook als Prozess, der Skill sparmodus (SKILL.md) und sein Skript schalten.mjs als Prozess.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eingabe, fertig, gueltig, ist } from './kern.mjs';
import {
  AUFRUF, ERINNERUNG, hilfeText, istAn, kontextAusgabe, PROJEKTREGELN, schalterDatei, schalterOrdner, statusText, stelleSchalter, STIL_TEXT,
  umgeschaltetText, wunschVon,
} from '../lib/modus.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, '..');
const KONTEXT = join(WURZEL, 'hooks', 'kontext.mjs');
const SKILL = join(WURZEL, 'skills', 'sparmodus');
const tmp = () => mkdtempSync(join(tmpdir(), 'luxe-modus-'));

// === 1. Texte ===================================================================================================
{
  const zeilen = STIL_TEXT.split('\n');
  ist('Stil-Text: sechs nicht leere Zeilen', [zeilen.length, zeilen.every(z => z.trim().length > 0)], [6, true]);
  for (const teil of ['kurz', 'acht Zeilen', 'Workflow', 'Unteragenten', 'ausdrücklich', 'Wiederhole keine Fakten', 'bestätigt', 'Frage nur zurück', 'Zahlen und Befunde zuerst']) {
    ist(`Stil-Text nennt «${teil}»`, STIL_TEXT.includes(teil), true);
  }
  ist('Erinnerung: höchstens 200 Zeichen (kein Token verschwenden), nicht leer', [ERINNERUNG.length <= 200, ERINNERUNG.length > 50], [true, true]);
  for (const teil of ['Sparmodus AN', 'kurz', 'Unteragenten', 'Zahlen und Befunde zuerst']) ist(`Erinnerung nennt «${teil}»`, ERINNERUNG.includes(teil), true);
  ist('Erinnerung ist eine Zeile', ERINNERUNG.includes('\n'), false);

  ist('Projektregeln: höchstens 900 Zeichen', PROJEKTREGELN.length <= 900, true);
  ist('Projektregeln + Stil-Text (Sparmodus AN): zusammen immer noch höchstens 900 Zeichen', `${PROJEKTREGELN}\n\n${STIL_TEXT}`.length <= 900, true);
  const regeln = PROJEKTREGELN.split('\n');
  ist('Projektregeln: eine Kopfzeile und genau fünf nummerierte Regeln', [regeln.length, regeln.slice(1).map((z, i) => z.startsWith(`${i + 1}. `))], [6, [true, true, true, true, true]]);
  for (const teil of ['Force-Push', 'git add -A', 'git add .', 'git status', 'Trockenlauf', 'LIVE=1', 'Fake-Bewertungen', 'Preise', 'Recht', 'Veröffentlichung', 'Kundenkontakt', 'Besitzer', 'Zweitmeinungs-Fund', 'Behauptung', 'nachstellen']) {
    ist(`Projektregeln nennen «${teil}»`, PROJEKTREGELN.includes(teil), true);
  }
}

// === 2. Argument und Antworttexte (Gegenproben) =================================================================
ist('wunschVon: an, aus, status in jeder Schreibung', [wunschVon('an'), wunschVon(' AN '), wunschVon('Aus'), wunschVon('status')], ['an', 'an', 'aus', 'status']);
for (const schlecht of ['', '  ', 'ein', 'on', 'off', 'anaus', 'an aus', 'an,', 'true', '1', 'status?', undefined, null]) {
  ist(`wunschVon: «${schlecht}» ist kein Wunsch`, wunschVon(schlecht), undefined);
}
ist('statusText: nennt den Stand', [statusText(true).includes('AN'), statusText(false).includes('AUS'), statusText(false).includes('AN')], [true, true, false]);
ist('umgeschaltetText nennt den Stand', [umgeschaltetText(true).startsWith('Sparmodus: AN'), umgeschaltetText(false).startsWith('Sparmodus: AUS')], [true, true]);
{
  const h = hilfeText('vielleicht', false);
  ist('hilfeText: nennt Argument, Aufruf und den unveränderten Stand', [h.includes('Unbekanntes Argument «vielleicht»'), h.includes(AUFRUF), h.includes('an | aus | status'), h.includes('Stand unverändert: AUS')], [true, true, true, true]);
  ist('hilfeText: ohne Argument', [hilfeText('', true).includes('Kein Argument'), hilfeText('', true).includes('Stand unverändert: AN')], [true, true]);
  ist('hilfeText: kürzt Langes und entfernt Zeilenumbrüche', [hilfeText('x'.repeat(500), false).length < 250, hilfeText('a\nb\nc', false).split('\n').length], [true, 2]);
}

// === 3. Schalter-Datei ============================================================================================
{
  ist('schalterOrdner: eigener Schalter vor CODEX_HOME', [schalterOrdner({ LUXE_CODEX_ZUSTAND: '/a', CODEX_HOME: '/c' }), schalterOrdner({ CODEX_HOME: '/c' })], ['/a', '/c/luxe-codex']);
  ist('schalterOrdner: CLAUDE_PLUGIN_DATA gilt bewusst NICHT (die Shell des Modells sähe es nicht)', schalterOrdner({ CLAUDE_PLUGIN_DATA: '/b', CODEX_HOME: '/c' }), '/c/luxe-codex');
  ist('schalterDatei liegt im Ordner', schalterDatei({ LUXE_CODEX_ZUSTAND: '/a' }), '/a/sparmodus');

  const z = tmp();
  const env = { LUXE_CODEX_ZUSTAND: join(z, 'unten', 'zustand') };
  ist('Schalter: Vorgabe AUS (keine Datei, auch kein Ordner)', istAn(env), false);
  stelleSchalter(env, true);
  ist('Schalter: an → Datei mit «an», Modus AN', [istAn(env), readFileSync(schalterDatei(env), 'utf8')], [true, 'an\n']);
  stelleSchalter(env, true);
  ist('Schalter: zweimal an ist nicht schlimm', istAn(env), true);
  stelleSchalter(env, false);
  ist('Schalter: aus → Datei weg, Modus AUS', [istAn(env), existsSync(schalterDatei(env))], [false, false]);
  stelleSchalter(env, false);
  ist('Schalter: aus ohne Datei ist nicht schlimm', istAn(env), false);
  for (const inhalt of ['', 'aus', 'ja', 'true', '1', 'an aus', 'ann', 'a']) {
    writeFileSync(schalterDatei(env), inhalt);
    ist(`Schalter: Inhalt «${inhalt}» schaltet nicht ein (Gegenprobe)`, istAn(env), false);
  }
  for (const inhalt of ['an', ' AN \n', 'An\r\n']) {
    writeFileSync(schalterDatei(env), inhalt);
    ist(`Schalter: Inhalt ${JSON.stringify(inhalt)} schaltet ein`, istAn(env), true);
  }
  rmSync(schalterDatei(env));
  mkdirSync(schalterDatei(env));
  ist('Schalter: ein Ordner an der Stelle → AUS, keine Ausnahme', istAn(env), false);
  let wirft = false; try { stelleSchalter(env, false); } catch { wirft = true; }
  ist('Schalter: aus wirft, wenn es nicht gelingt (kein stilles Scheitern)', wirft, true);
  const datei = join(z, 'datei');
  writeFileSync(datei, 'x');
  wirft = false; try { stelleSchalter({ LUXE_CODEX_ZUSTAND: join(datei, 'unten') }, true); } catch { wirft = true; }
  ist('Schalter: an wirft, wenn der Ordner nicht anzulegen ist', wirft, true);
  rmSync(z, { recursive: true, force: true });
}

// === 4. Kontext-Ausgabe (in-process) =============================================================================
{
  const z = tmp();
  const aus = { LUXE_CODEX_ZUSTAND: z };
  const an = { LUXE_CODEX_ZUSTAND: join(z, 'an') };
  stelleSchalter(an, true);

  const s0 = kontextAusgabe(eingabe('SessionStart'), aus);
  ist('SessionStart AUS: nur die Projektregeln, gültige Ausgabe', [s0.hookSpecificOutput.additionalContext, gueltig(s0, 'session-start.command.output')], [PROJEKTREGELN, []]);
  ist('SessionStart AUS: höchstens 900 Zeichen', s0.hookSpecificOutput.additionalContext.length <= 900, true);
  const s1 = kontextAusgabe(eingabe('SessionStart'), an);
  ist('SessionStart AN: auch mit Stil-Text höchstens 900 Zeichen', s1.hookSpecificOutput.additionalContext.length <= 900, true);
  ist('SessionStart AN: Projektregeln und Stil-Text, gültige Ausgabe', [s1.hookSpecificOutput.additionalContext, gueltig(s1, 'session-start.command.output')], [`${PROJEKTREGELN}\n\n${STIL_TEXT}`, []]);
  ist('SessionStart: hookEventName passt zum Ereignis', [s0.hookSpecificOutput.hookEventName, s1.hookSpecificOutput.hookEventName], ['SessionStart', 'SessionStart']);
  for (const quelle of ['startup', 'resume', 'clear', 'compact', 'fork']) {
    ist(`SessionStart (${quelle}): Regeln sind immer dabei`, kontextAusgabe(eingabe('SessionStart', { source: quelle }), aus).hookSpecificOutput.additionalContext.startsWith('LuxeStyle-Projektregeln'), true);
  }
  ist('UserPromptSubmit AUS: gar nichts', kontextAusgabe(eingabe('UserPromptSubmit'), aus), undefined);
  const p1 = kontextAusgabe(eingabe('UserPromptSubmit', { prompt: 'Mach den Check' }), an);
  ist('UserPromptSubmit AN: nur die kurze Erinnerung (≤ 200 Zeichen), gültige Ausgabe', [p1.hookSpecificOutput.additionalContext, p1.hookSpecificOutput.additionalContext.length <= 200, p1.hookSpecificOutput.hookEventName, gueltig(p1, 'user-prompt-submit.command.output')], [ERINNERUNG, true, 'UserPromptSubmit', []]);
  ist('Der Prompt-Text ändert die Ausgabe nicht (kein Token für lange Prompts)', kontextAusgabe(eingabe('UserPromptSubmit', { prompt: 'x'.repeat(5000) }), an), p1);
  for (const ev of ['PreToolUse', 'PostToolUse', 'Stop']) ist(`Ereignis ${ev}: nichts, auch bei AN`, kontextAusgabe(eingabe(ev), an), undefined);
  ist('Ohne Ereignisname / ohne Eingabe: nichts', [kontextAusgabe({}, an), kontextAusgabe(undefined, an), kontextAusgabe(null, an)], [undefined, undefined, undefined]);
  ist('Eingaben der Tests sind laut Eingabe-Schema gültig', [gueltig(eingabe('SessionStart'), 'session-start.command.input'), gueltig(eingabe('UserPromptSubmit'), 'user-prompt-submit.command.input')], [[], []]);
  rmSync(z, { recursive: true, force: true });
}

// === 5. Der Kontext-Hook als Prozess ==============================================================================
const proz = (z, wert, extraEnv = {}) => {
  const r = spawnSync(process.execPath, [KONTEXT], { input: typeof wert === 'string' ? wert : JSON.stringify(wert), env: { PATH: process.env.PATH, HOME: z, LUXE_CODEX_ZUSTAND: join(z, 'zustand'), ...extraEnv }, encoding: 'utf8', timeout: 15_000 });
  let json; try { json = r.stdout.trim() ? JSON.parse(r.stdout) : undefined; } catch { json = 'KEIN JSON'; }
  return { code: r.status, out: r.stdout, json };
};
const schalten = (z, arg) => spawnSync(process.execPath, [join(SKILL, 'scripts', 'schalten.mjs'), ...arg], { env: { PATH: process.env.PATH, HOME: z, LUXE_CODEX_ZUSTAND: join(z, 'zustand') }, encoding: 'utf8', timeout: 15_000 });
{
  const z = tmp();
  let r = proz(z, eingabe('SessionStart'));
  ist('Prozess 1: SessionStart AUS → die fünf Regeln, Exit 0, gültig', [r.code, r.json.hookSpecificOutput.additionalContext, gueltig(r.json, 'session-start.command.output')], [0, PROJEKTREGELN, []]);
  r = proz(z, eingabe('UserPromptSubmit'));
  ist('Prozess 2: UserPromptSubmit AUS → keine Ausgabe, Exit 0', [r.code, r.out], [0, '']);
  r = proz(z, eingabe('Stop'));
  ist('Prozess 3: fremdes Ereignis (Stop) → keine Ausgabe', [r.code, r.out], [0, '']);
  r = proz(z, 'kein json');
  ist('Prozess 4: kaputtes stdin → Exit 0, keine Ausgabe', [r.code, r.out], [0, '']);
  r = proz(z, '');
  ist('Prozess 5: leeres stdin → Exit 0, keine Ausgabe', [r.code, r.out], [0, '']);
  const s = schalten(z, ['an']);
  ist('Prozess 6: schalten.mjs an → Exit 0, «Sparmodus: AN»', [s.status, s.stdout.startsWith('Sparmodus: AN')], [0, true]);
  r = proz(z, eingabe('SessionStart'));
  ist('Prozess 7: SessionStart AN → Regeln und Stil-Text', [r.code, r.json.hookSpecificOutput.additionalContext, gueltig(r.json, 'session-start.command.output')], [0, `${PROJEKTREGELN}\n\n${STIL_TEXT}`, []]);
  r = proz(z, eingabe('UserPromptSubmit'));
  ist('Prozess 8: UserPromptSubmit AN → nur die Erinnerung, gültig', [r.code, r.json.hookSpecificOutput.additionalContext, gueltig(r.json, 'user-prompt-submit.command.output')], [0, ERINNERUNG, []]);
  r = proz(z, eingabe('PostToolUse'));
  ist('Prozess 9: PostToolUse → keine Ausgabe, auch bei AN', [r.code, r.out], [0, '']);
  const t = schalten(z, ['aus']);
  r = proz(z, eingabe('UserPromptSubmit'));
  ist('Prozess 10: schalten.mjs aus → danach wieder keine Ausgabe beim Prompt', [t.status, r.out], [0, '']);
  r = proz(z, eingabe('SessionStart'));
  ist('Prozess 11: SessionStart nach «aus» wieder nur die Regeln', r.json.hookSpecificOutput.additionalContext, PROJEKTREGELN);
  mkdirSync(join(z, 'zustand', 'sparmodus'), { recursive: true });
  r = proz(z, eingabe('UserPromptSubmit'));
  ist('Prozess 12: unlesbarer Schalter (Ordner an der Stelle) → wie AUS, Exit 0, keine Ausgabe', [r.code, r.out], [0, '']);
  rmSync(z, { recursive: true, force: true });
}
{
  // Das Ereignis kommt aus hook_event_name, nicht aus einem Argument
  const z = tmp();
  const r = spawnSync(process.execPath, [KONTEXT, 'UserPromptSubmit'], { input: JSON.stringify(eingabe('SessionStart')), env: { PATH: process.env.PATH, HOME: z, LUXE_CODEX_ZUSTAND: z }, encoding: 'utf8' });
  ist('Ereignis kommt aus hook_event_name: ein falsches Argument ändert nichts', JSON.parse(r.stdout).hookSpecificOutput.hookEventName, 'SessionStart');
  rmSync(z, { recursive: true, force: true });
}
{
  // hooks.json verweist auf die Datei
  const hooks = JSON.parse(readFileSync(join(WURZEL, 'hooks', 'hooks.json'), 'utf8')).hooks;
  const befehle = ev => (hooks[ev] ?? []).flatMap(g => g.hooks.map(h => h.command));
  ist('hooks.json: SessionStart und UserPromptSubmit rufen kontext.mjs ohne Argument', [befehle('SessionStart').some(c => /kontext\.mjs"?$/.test(c)), befehle('UserPromptSubmit').some(c => /kontext\.mjs"?$/.test(c))], [true, true]);
  ist('hooks.json: die Hook-Datei gibt es', existsSync(KONTEXT), true);
}

// === 6. Skill sparmodus: SKILL.md =================================================================================
{
  const text = readFileSync(join(SKILL, 'SKILL.md'), 'utf8');
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  ist('SKILL.md beginnt mit Frontmatter', Boolean(m), true);
  const kopf = Object.fromEntries((m?.[1] ?? '').split('\n').map(z => { const i = z.indexOf(':'); return [z.slice(0, i).trim(), z.slice(i + 1).trim()]; }));
  ist('SKILL.md: name ist «sparmodus» und gleich dem Ordnernamen', [kopf.name, kopf.name === 'sparmodus'], ['sparmodus', true]);
  ist('SKILL.md: description ist eine Zeile, nicht leer, höchstens 500 Zeichen', [kopf.description.length > 40, kopf.description.length <= 500, /\n/.test(kopf.description)], [true, true, false]);
  for (const w of ['Sparmodus an', 'Sparmodus aus', 'Sparmodus status']) ist(`SKILL.md: description nennt «${w}» (damit das Modell den Skill wählt)`, kopf.description.includes(w), true);
  ist('SKILL.md: nur name und description im Kopf', Object.keys(kopf).sort(), ['description', 'name']);
  ist('SKILL.md: verweist auf scripts/schalten.mjs und den Skill-Ordner', [text.includes('scripts/schalten.mjs'), text.includes('<Skill-Ordner>')], [true, true]);
  ist('SKILL.md: kein fest eingebauter Pfad (kein /home, /root, /Users, /opt, /tmp, kein Laufwerk)', /(?:^|[\s"'`(])(?:\/home\/|\/root\/|\/Users\/|\/opt\/|\/tmp\/|[A-Za-z]:\\)/.test(text), false);
  ist('SKILL.md nennt alle drei Ausgänge des Skripts (Exit 0, 1, 2)', ['Exit 0', 'Exit 1', 'Exit 2'].map(w => text.includes(w)), [true, true, true]);
  ist('SKILL.md ist deutsch und kurz', [text.includes('Ablauf'), text.length < 2500], [true, true]);
  ist('Skript schalten.mjs gibt es', existsSync(join(SKILL, 'scripts', 'schalten.mjs')), true);
}

// === 7. schalten.mjs als Prozess ==================================================================================
{
  const z = tmp();
  const lies = () => (existsSync(join(z, 'zustand', 'sparmodus')) ? readFileSync(join(z, 'zustand', 'sparmodus'), 'utf8') : null);
  let r = schalten(z, ['status']);
  ist('schalten status (Vorgabe): AUS, Exit 0', [r.status, r.stdout.trim()], [0, statusText(false)]);
  r = schalten(z, ['an']);
  ist('schalten an: Exit 0, Text, Datei steht', [r.status, r.stdout.trim(), lies()], [0, umgeschaltetText(true), 'an\n']);
  r = schalten(z, ['status']);
  ist('schalten status nach an: AN', [r.status, r.stdout.trim()], [0, statusText(true)]);
  r = schalten(z, ['AN']);
  ist('schalten AN (Grossbuchstaben): Exit 0', [r.status, lies()], [0, 'an\n']);
  r = schalten(z, ['vielleicht']);
  ist('schalten vielleicht: Exit 2, Hilfe auf stderr, Stand unverändert (AN)', [r.status, r.stderr.includes('Unbekanntes Argument «vielleicht»'), r.stderr.includes('Stand unverändert: AN'), r.stderr.includes(AUFRUF), r.stdout, lies()], [2, true, true, true, '', 'an\n']);
  r = schalten(z, []);
  ist('schalten ohne Argument: Exit 2, «Kein Argument», Stand unverändert', [r.status, r.stderr.includes('Kein Argument'), lies()], [2, true, 'an\n']);
  r = schalten(z, ['an', 'aus']);
  ist('schalten an aus (zwei Argumente): Exit 2, nichts geändert', [r.status, lies()], [2, 'an\n']);
  r = schalten(z, ['--hilfe']);
  ist('schalten --hilfe: Exit 2', r.status, 2);
  r = schalten(z, ['aus']);
  ist('schalten aus: Exit 0, Text, Datei weg', [r.status, r.stdout.trim(), lies()], [0, umgeschaltetText(false), null]);
  r = schalten(z, ['vielleicht']);
  ist('schalten vielleicht bei AUS: Exit 2, Stand unverändert AUS', [r.status, r.stderr.includes('Stand unverändert: AUS'), lies()], [2, true, null]);
  rmSync(z, { recursive: true, force: true });
}
{
  // Speichern scheitert: Exit 1, Stand unverändert, keine Ausnahmespur
  const z = tmp();
  writeFileSync(join(z, 'datei'), 'x');
  const r = spawnSync(process.execPath, [join(SKILL, 'scripts', 'schalten.mjs'), 'an'], { env: { PATH: process.env.PATH, HOME: z, LUXE_CODEX_ZUSTAND: join(z, 'datei', 'unten') }, encoding: 'utf8' });
  ist('schalten an bei unbeschreibbarem Ordner: Exit 1, klare Meldung, kein Stacktrace', [r.status, r.stderr.includes('Speichern fehlgeschlagen'), r.stderr.includes('Stand unverändert: AUS'), r.stderr.includes('    at ')], [1, true, true, false]);
  rmSync(z, { recursive: true, force: true });
}
{
  // Kein fest eingebauter Pfad: das ganze Plugin an einen anderen Ort kopieren, Skript von dort starten
  const z = tmp();
  const kopie = join(z, 'weit', 'weg', 'luxe-codex-kopie');
  mkdirSync(kopie, { recursive: true });
  for (const d of ['lib', 'skills', 'hooks']) cpSync(join(WURZEL, d), join(kopie, d), { recursive: true });
  const env = { PATH: process.env.PATH, HOME: z, LUXE_CODEX_ZUSTAND: join(z, 'zustand') };
  const r = spawnSync(process.execPath, [join(kopie, 'skills', 'sparmodus', 'scripts', 'schalten.mjs'), 'an'], { env, encoding: 'utf8' });
  ist('Kopie an anderem Ort: das Skript findet seine Bibliothek vom eigenen Ort und schaltet', [r.status, readFileSync(join(z, 'zustand', 'sparmodus'), 'utf8')], [0, 'an\n']);
  const h = spawnSync(process.execPath, [join(kopie, 'hooks', 'kontext.mjs')], { input: JSON.stringify(eingabe('UserPromptSubmit')), env, encoding: 'utf8' });
  ist('Kopie an anderem Ort: der Kontext-Hook liest denselben Schalter', JSON.parse(h.stdout).hookSpecificOutput.additionalContext, ERINNERUNG);
  rmSync(z, { recursive: true, force: true });
}
{
  // Skript und Hook teilen sich den Schalter auch, wenn nur der Hook CLAUDE_PLUGIN_DATA sieht (die Shell des Modells nicht)
  const z = tmp();
  const nurShell = { PATH: process.env.PATH, HOME: z, CODEX_HOME: join(z, 'codex') };
  const r = spawnSync(process.execPath, [join(SKILL, 'scripts', 'schalten.mjs'), 'an'], { env: nurShell, encoding: 'utf8' });
  const h = spawnSync(process.execPath, [KONTEXT], { input: JSON.stringify(eingabe('UserPromptSubmit')), env: { ...nurShell, CLAUDE_PLUGIN_DATA: join(z, 'plugin-daten'), CLAUDE_PLUGIN_ROOT: WURZEL }, encoding: 'utf8' });
  ist('Hook mit CLAUDE_PLUGIN_DATA und Skript ohne lesen/schreiben denselben Schalter (CODEX_HOME/luxe-codex)', [r.status, existsSync(join(z, 'codex', 'luxe-codex', 'sparmodus')), JSON.parse(h.stdout).hookSpecificOutput.additionalContext], [0, true, ERINNERUNG]);
  rmSync(z, { recursive: true, force: true });
}

// === 8. Nachprüfung vom 28.10.: bestätigte Funde F1, F2, F9, F21 (rot gegen den Stand vor der Behebung) ===============
const VERBOTEN = ['continue', 'decision', 'reason', 'stopReason', 'suppressOutput'];

// --- F1: der Kontext-Hook gibt nie blockierende Felder aus (die Schemas erlauben sie, darum prüft das Schema es nicht) ----
{
  const z = tmp();
  const aus = { LUXE_CODEX_ZUSTAND: z };
  const an = { LUXE_CODEX_ZUSTAND: join(z, 'an') };
  stelleSchalter(an, true);
  const s0 = kontextAusgabe(eingabe('SessionStart'), aus);
  const s1 = kontextAusgabe(eingabe('SessionStart'), an);
  const p1 = kontextAusgabe(eingabe('UserPromptSubmit'), an);
  ist('F1 SessionStart AUS: genau {hookSpecificOutput: {hookEventName, additionalContext}}', s0, { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: PROJEKTREGELN } });
  ist('F1 SessionStart AN: genau {hookSpecificOutput: {hookEventName, additionalContext}}', s1, { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: `${PROJEKTREGELN}\n\n${STIL_TEXT}` } });
  ist('F1 UserPromptSubmit AN: genau {hookSpecificOutput: {hookEventName, additionalContext}}', p1, { hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: ERINNERUNG } });
  ist('F1 keine Kontext-Ausgabe trägt ein blockierendes Feld (continue, decision, reason, stopReason, suppressOutput)', [s0, s1, p1].map(a => VERBOTEN.filter(k => k in a)), [[], [], []]);
  ist('F1 keine Kontext-Ausgabe trägt systemMessage (nur der Zähler spricht den Menschen an)', [s0, s1, p1].map(a => 'systemMessage' in a), [false, false, false]);
  const r0 = proz(z, eingabe('SessionStart'));
  stelleSchalter({ LUXE_CODEX_ZUSTAND: join(z, 'zustand') }, true);
  const r1 = proz(z, eingabe('SessionStart'));
  const r2 = proz(z, eingabe('UserPromptSubmit'));
  ist('F1 Prozess SessionStart AUS: genau das Objekt, nichts sonst', r0.json, s0);
  ist('F1 Prozess SessionStart AN: genau das Objekt, nichts sonst', r1.json, s1);
  ist('F1 Prozess UserPromptSubmit AN: genau das Objekt, nichts sonst', r2.json, p1);
  ist('F1 Prozess: kein blockierendes Feld, Exit 0', [r0, r1, r2].map(r => [r.code, VERBOTEN.filter(k => k in r.json)]), [[0, []], [0, []], [0, []]]);
  rmSync(z, { recursive: true, force: true });
}

// --- F2: die Kontext-Befehle aus hooks.json selbst ausführen, mit Leerzeichen im Plugin-Pfad ---------------------------
{
  const hooks = JSON.parse(readFileSync(join(WURZEL, 'hooks', 'hooks.json'), 'utf8')).hooks;
  const kontextBefehle = ev => (hooks[ev] ?? []).flatMap(g => g.hooks).filter(h => /\/kontext\.mjs"/.test(h.command));
  ist('F2 hooks.json: kontext.mjs hängt an SessionStart und UserPromptSubmit, je genau einmal, mit ganzzahligem Zeitlimit 1 bis 60', [
    kontextBefehle('SessionStart').length, kontextBefehle('UserPromptSubmit').length,
    [...kontextBefehle('SessionStart'), ...kontextBefehle('UserPromptSubmit')].every(h => h.type === 'command' && Number.isInteger(h.timeout) && h.timeout >= 1 && h.timeout <= 60 && !('async' in h)),
  ], [1, 1, true]);
  const shDa = spawnSync('sh', ['-c', 'exit 0']);
  if (shDa.error || shDa.status !== 0) console.log('ÜBERSPRUNGEN: sh fehlt, die Kontext-Befehle aus hooks.json laufen nicht');
  else {
    const z = tmp();
    const wurzel = join(z, 'a b', 'luxe-codex');
    mkdirSync(wurzel, { recursive: true });
    for (const teil of ['lib', 'hooks']) cpSync(join(WURZEL, teil), join(wurzel, teil), { recursive: true });
    const lauf = (befehl, wert) => spawnSync('sh', ['-c', befehl], { input: JSON.stringify(wert), encoding: 'utf8', timeout: 15_000, env: { PATH: `${dirname(process.execPath)}:${process.env.PATH}`, HOME: z, CLAUDE_PLUGIN_ROOT: wurzel, LUXE_CODEX_ZUSTAND: join(z, 'zustand') } });
    const a = lauf(kontextBefehle('SessionStart')[0].command, eingabe('SessionStart'));
    ist('F2 Befehlszeile SessionStart bei Leerzeichen im Plugin-Pfad: Exit 0, keine Fehlermeldung, Projektregeln', [a.status, a.stderr, JSON.parse(a.stdout || '{}').hookSpecificOutput?.additionalContext], [0, '', PROJEKTREGELN]);
    schalten(z, ['an']);
    const b = lauf(kontextBefehle('UserPromptSubmit')[0].command, eingabe('UserPromptSubmit'));
    ist('F2 Befehlszeile UserPromptSubmit bei Leerzeichen im Plugin-Pfad (Sparmodus AN): Exit 0, Erinnerung', [b.status, b.stderr, JSON.parse(b.stdout || '{}').hookSpecificOutput?.additionalContext], [0, '', ERINNERUNG]);
    rmSync(z, { recursive: true, force: true });
  }
}

// --- F9 / F21: ein gescheitertes Umbenennen lässt keine .tmp-Datei im Zustandsordner liegen -------------------------------
{
  const z = tmp();
  const ordner = join(z, 'zustand');
  mkdirSync(join(ordner, 'sparmodus'), { recursive: true }); // ein Ordner an der Stelle des Schalters
  const env = { LUXE_CODEX_ZUSTAND: ordner };
  let meldung = '';
  try { stelleSchalter(env, true); } catch (fehler) { meldung = String(fehler?.code ?? fehler); }
  ist('F21 stelleSchalter(an) scheitert am Ordner, der Stand bleibt AUS und es bleibt kein *.tmp liegen', [meldung !== '', istAn(env), readdirSync(ordner)], [true, false, ['sparmodus']]);
  const e1 = schalten(z, ['an']);
  const e2 = schalten(z, ['an']);
  ist('F9 schalten.mjs an (zweimal) bei einem Ordner an der Stelle: Exit 1, «Stand unverändert», kein *.tmp', [e1.status, e2.status, e1.stderr.includes('Stand unverändert: AUS'), readdirSync(ordner)], [1, 1, true, ['sparmodus']]);
  const aus = schalten(z, ['aus']);
  ist('F9 schalten.mjs aus bei einem Ordner an der Stelle: Exit 1, kein *.tmp', [aus.status, readdirSync(ordner)], [1, ['sparmodus']]);
  rmSync(join(ordner, 'sparmodus'), { recursive: true });
  stelleSchalter(env, true);
  ist('F21 Gegenprobe: gelingt das Schreiben, liegt nur der Schalter selbst im Ordner (kein *.tmp)', [istAn(env), readdirSync(ordner)], [true, ['sparmodus']]);
  stelleSchalter(env, true);
  ist('F21 …auch beim zweiten Einschalten', readdirSync(ordner), ['sparmodus']);
  rmSync(z, { recursive: true, force: true });
}

fertig();
