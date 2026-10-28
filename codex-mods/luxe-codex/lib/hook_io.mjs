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
import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, renameSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Wohin der Mod Zustand schreibt: Schalter, Zähler, Lernprotokoll. Nie ins Repo. */
export function zustandsOrdner(env = process.env) {
  if (env.LUXE_CODEX_ZUSTAND) return env.LUXE_CODEX_ZUSTAND;
  if (env.CLAUDE_PLUGIN_DATA) return env.CLAUDE_PLUGIN_DATA;
  return join(env.CODEX_HOME || join(homedir(), '.codex'), 'luxe-codex');
}

/** Legt den Ordner samt fehlender Elternordner an (nur für den Besitzer zugänglich: 0700) und gibt den Pfad zurück. */
export function sichereOrdner(ordner) {
  if (!existsSync(ordner)) mkdirSync(ordner, { recursive: true, mode: 0o700 });
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

// --- Lernprotokoll ---------------------------------------------------------------------------------------------

// Erkennbare Zugangsdaten werden geschwärzt, BEVOR gekürzt wird (sonst bliebe der Anfang eines Schlüssels stehen).
const NAMEN = '(?:secret|token|passw(?:or)?d|passwort|api[_-]?key|access[_-]?key|private[_-]?key|credential|authorization)';
const GEHEIM_MUSTER = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
  /\b(?:shp(?:at|ss|ca|pa)_[A-Za-z0-9]{8,}|gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{16,}|xox[abprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,})/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
];
// «NAME=wert», «NAME: wert», «--password=wert»: der Wert hinter einem Namen mit Geheimnis-Stichwort. Die Wiederholungen
// vor und nach dem Stichwort sind begrenzt, damit die Suche auch bei langen Wortketten schnell bleibt.
const NAME_WERT = new RegExp(`([A-Za-z0-9_-]{0,40}${NAMEN}[A-Za-z0-9_-]{0,40})(\\s*[=:]\\s*)("[^"]*"|'[^']*'|[^\\s"']+)`, 'gi');
const GEHEIMER_SCHLUESSEL = new RegExp(NAMEN, 'i');
const GRENZE_BYTES = 1024 * 1024;

/** Ersetzt erkennbare Zugangsdaten in einem Text durch «[geheim]» (Muster und Namen; kein Beweis, dass nichts übrig bleibt). */
export function schwaerze(text) {
  let t = String(text);
  for (const m of GEHEIM_MUSTER) t = t.replace(m, '[geheim]');
  return t.replace(NAME_WERT, '$1$2[geheim]');
}

/**
 * Hängt eine Zeile ans Lernprotokoll (nur wenn LUXE_CODEX_LERNEN=1): gekürzt (Texte auf 120 Zeichen, Listen auf 8, Objekte auf 12
 * Einträge), erkennbare Zugangsdaten geschwärzt (Muster wie shpat_/ghp_/sk-, Werte hinter Namen mit secret/token/password …,
 * Werte unter solchen Schlüsseln). Die Datei ist nur für den Besitzer lesbar (0600) und wird bei 1 MiB zur Seite gelegt
 * (gesehen.jsonl.alt, höchstens zwei Dateien). Der Schutz arbeitet nach Mustern: ein Geheimnis ohne erkennbares Muster und
 * ohne verräterischen Namen bleibt stehen, darum das Protokoll nur für den ersten echten Lauf einschalten.
 */
export function lerne(hook, eingabe, env = process.env) {
  if (env.LUXE_CODEX_LERNEN !== '1') return;
  const kurz = (w, n = 0) => {
    if (typeof w === 'string') {
      const rein = schwaerze(w.length > 600 ? w.slice(0, 600) : w);
      return `${rein.length > 120 ? rein.slice(0, 120) : rein}${w.length > 120 ? `…[${w.length}]` : ''}`;
    }
    if (Array.isArray(w)) return n > 3 ? '[…]' : w.slice(0, 8).map(x => kurz(x, n + 1));
    if (w && typeof w === 'object') {
      return n > 3 ? '{…}' : Object.fromEntries(Object.entries(w).slice(0, 12).map(([k, v]) => [k, GEHEIMER_SCHLUESSEL.test(k) && v !== null && v !== undefined ? '[geheim]' : kurz(v, n + 1)]));
    }
    return w;
  };
  try {
    const datei = join(sichereOrdner(zustandsOrdner(env)), 'gesehen.jsonl');
    try { if (statSync(datei).size > GRENZE_BYTES) renameSync(datei, `${datei}.alt`); } catch { /* noch keine Datei: nichts zur Seite zu legen */ }
    appendFileSync(datei, `${JSON.stringify({ hook, ereignis: eingabe.hook_event_name, werkzeug: eingabe.tool_name, form: kurz(eingabe.tool_input) })}\n`, { mode: 0o600 });
    try { chmodSync(datei, 0o600); } catch { /* unter Windows ohne Wirkung */ }
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
