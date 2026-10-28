/**
 * Gemeinsame Ein- und Ausgabe der Codex-Hooks von luxe-codex.
 *
 * Das Protokoll steht NICHT in einer Dokumentation, die wir lesen konnten, sondern ist aus der
 * installierten Codex-Binärdatei (0.165.0) gelesen: die JSON-Schemas liegen unter test/schemas/ und
 * jeder Test prüft die Ausgabe der Hooks gegen sie. Was die Schemas nicht sagen, steht als
 * «laut Binärdatei» da und ist im Live-Test mit einem echten Lauf zu bestätigen:
 *   - PreToolUse: Ablehnen = hookSpecificOutput.permissionDecision "deny" MIT nicht leerem
 *     permissionDecisionReason (sonst verwirft Codex die Ausgabe); "allow" wird abgelehnt; alternativ
 *     Exit-Code 2 mit dem Grund auf stderr.
 *   - Ein Hook ohne Ausgabe und mit Exit 0 ändert nichts.
 *
 * Eine Leitplanke ist eine Gedächtnisstütze, keine Sicherheitsgrenze: ein Fehler im Hook darf die Arbeit
 * nie blockieren (Exit 0), aber er darf auch nie stumm bleiben: er erscheint als systemMessage.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Wohin der Mod Zustand schreibt: Schalter, Zähler, Lernprotokoll. Nie ins Repo. */
export function zustandsOrdner(env = process.env) {
  if (env.LUXE_CODEX_ZUSTAND) return env.LUXE_CODEX_ZUSTAND;
  if (env.CLAUDE_PLUGIN_DATA) return env.CLAUDE_PLUGIN_DATA;
  return join(env.CODEX_HOME || join(homedir(), '.codex'), 'luxe-codex');
}

export function sichereOrdner(ordner) {
  if (!existsSync(ordner)) mkdirSync(ordner, { recursive: true });
  return ordner;
}

/** Liest JSON; alles andere (leer, kaputt, kein Objekt) ist `undefined`, nie eine Ausnahme. */
export function liesJson(text) {
  try {
    const wert = JSON.parse(String(text ?? ''));
    return wert !== null && typeof wert === 'object' && !Array.isArray(wert) ? wert : undefined;
  } catch {
    return undefined;
  }
}

/** Alle Zeichenketten in einem beliebig verschachtelten Wert (Werkzeugeingaben haben keine feste Form). */
export function texteIn(wert, tiefe = 0, aus = []) {
  if (tiefe > 8 || aus.length > 400) return aus;
  if (typeof wert === 'string') aus.push(wert);
  else if (Array.isArray(wert)) for (const x of wert) texteIn(x, tiefe + 1, aus);
  else if (wert && typeof wert === 'object') for (const x of Object.values(wert)) texteIn(x, tiefe + 1, aus);
  return aus;
}

/** PreToolUse ablehnen. Der Grund muss einen Inhalt haben, sonst verwirft Codex die Ausgabe. */
export function verbot(grund) {
  const g = String(grund ?? '').trim() || 'luxe-codex: gesperrt (ohne Angabe eines Grundes)';
  return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: g } };
}

/** Zusatztext fürs Modell (SessionStart, UserPromptSubmit, PostToolUse, PreToolUse). */
export function kontext(ereignis, text) {
  return { hookSpecificOutput: { hookEventName: ereignis, additionalContext: String(text) } };
}

/** Meldung an den Menschen (Statuszeile des Clients), das Modell sieht sie nicht. */
export function meldung(text) {
  return { systemMessage: String(text) };
}

/** Beide Teile in einer Ausgabe. */
export function verbinde(...teile) {
  const aus = {};
  for (const t of teile) if (t) Object.assign(aus, t);
  return aus;
}

/** Hängt eine Zeile ans Lernprotokoll (nur wenn LUXE_CODEX_LERNEN=1); kürzt lange Texte, damit nichts Grosses oder Geheimes liegt. */
export function lerne(hook, eingabe, env = process.env) {
  if (env.LUXE_CODEX_LERNEN !== '1') return;
  const kurz = (w, n = 0) => (typeof w === 'string' ? (w.length > 120 ? `${w.slice(0, 120)}…[${w.length}]` : w)
    : Array.isArray(w) ? (n > 3 ? '[…]' : w.slice(0, 8).map(x => kurz(x, n + 1)))
      : w && typeof w === 'object' ? (n > 3 ? '{…}' : Object.fromEntries(Object.entries(w).slice(0, 12).map(([k, v]) => [k, kurz(v, n + 1)]))) : w);
  try {
    const ordner = sichereOrdner(zustandsOrdner(env));
    appendFileSync(join(ordner, 'gesehen.jsonl'), `${JSON.stringify({ hook, ereignis: eingabe.hook_event_name, werkzeug: eingabe.tool_name, form: kurz(eingabe.tool_input) })}\n`);
  } catch { /* das Lernprotokoll darf nie stören */ }
}

/**
 * Startet einen Hook: liest stdin, ruft `handler(eingabe, env)` und schreibt dessen Ergebnis als JSON.
 * Ausnahme im Handler → Exit 0 und eine systemMessage mit dem Grund (nie stumm, nie blockierend).
 * Kaputtes oder leeres stdin → keine Ausgabe, Exit 0.
 */
export async function laufe(name, handler, { stdin = () => readFileSync(0, 'utf8'), env = process.env, schreibe = t => process.stdout.write(t) } = {}) {
  let eingabe;
  try { eingabe = liesJson(stdin()); } catch { eingabe = undefined; }
  if (!eingabe) return 0;
  try {
    lerne(name, eingabe, env);
    const aus = await handler(eingabe, env);
    if (aus && Object.keys(aus).length > 0) schreibe(`${JSON.stringify(aus)}\n`);
  } catch (fehler) {
    schreibe(`${JSON.stringify(meldung(`luxe-codex/${name}: Fehler im Hook, die Arbeit läuft weiter (${fehler instanceof Error ? fehler.message : String(fehler)})`))}\n`);
  }
  return 0;
}
