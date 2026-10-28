/**
 * Kleines Prüfgerüst für die Tests von luxe-codex (kein Fremdpaket, wie im übrigen Repo): `ist` vergleicht
 * tief, `gegenSchema` prüft eine Hook-Ausgabe gegen die Schemas aus der Codex-Binärdatei (test/schemas).
 * Die Zusammenfassung steht am ENDE jeder Testdatei: `fertig()`; sonst laufen neu angehängte Prüfungen nie.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspect, isDeepStrictEqual } from 'node:util';

const HIER = dirname(fileURLToPath(import.meta.url));
let ok = 0, fehler = 0;

/**
 * Gleich heisst: tief UND streng gleich (undefined ≠ null, NaN ≠ null, ein fehlendes Feld ≠ ein Feld mit undefined)
 * UND dieselbe JSON-Schreibweise wie bisher (auch die Schlüsselreihenfolge): nie lockerer als der alte Vergleich.
 * Der alte Vergleich allein über JSON.stringify hielt [undefined] und [null], {a: undefined} und {}, NaN, Infinity und null
 * für gleich, so dass Mutanten mit null statt undefined unbemerkt blieben.
 */
function gleich(a, b) {
  return isDeepStrictEqual(a, b) && JSON.stringify(a) === JSON.stringify(b);
}

export function ist(name, ist_, soll) {
  if (gleich(ist_, soll)) ok += 1;
  else { fehler += 1; console.log(`FEHLER ${name}\n   ist:  ${inspect(ist_, { depth: 6, breakLength: Infinity })}\n   soll: ${inspect(soll, { depth: 6, breakLength: Infinity })}`); }
}

export function schema(name) {
  return JSON.parse(readFileSync(join(HIER, 'schemas', `${name}.json`), 'utf8'));
}

/**
 * Prüft `wert` gegen ein JSON-Schema (draft-07, nur was die Hook-Schemas brauchen): type, const, enum,
 * required, properties, additionalProperties:false, $ref auf #/definitions, allOf, items.
 * Gibt die Liste der Verstösse zurück (leer = gültig).
 */
export function gegenSchema(wert, wurzel, s = wurzel, pfad = '$') {
  const f = [];
  if (s === true || s === undefined) return f;
  if (s === false) return [`${pfad}: nicht erlaubt`];
  if (s.$ref) {
    const ziel = s.$ref.replace('#/definitions/', '');
    return gegenSchema(wert, wurzel, wurzel.definitions?.[ziel], pfad);
  }
  for (const t of s.allOf ?? []) f.push(...gegenSchema(wert, wurzel, t, pfad));
  if ('const' in s && JSON.stringify(wert) !== JSON.stringify(s.const)) f.push(`${pfad}: erwartet ${JSON.stringify(s.const)}`);
  if (s.enum && !s.enum.some(e => JSON.stringify(e) === JSON.stringify(wert))) f.push(`${pfad}: ${JSON.stringify(wert)} nicht in ${JSON.stringify(s.enum)}`);
  if (s.type) {
    const arten = [].concat(s.type);
    const art = wert === null ? 'null' : Array.isArray(wert) ? 'array' : typeof wert === 'number' && Number.isInteger(wert) ? 'integer' : typeof wert;
    const passt = arten.some(a => a === art || (a === 'number' && art === 'integer'));
    if (!passt) { f.push(`${pfad}: Typ ${art}, erwartet ${arten.join('|')}`); return f; }
  }
  if (wert && typeof wert === 'object' && !Array.isArray(wert)) {
    for (const r of s.required ?? []) if (!(r in wert)) f.push(`${pfad}: Pflichtfeld ${r} fehlt`);
    for (const [k, v] of Object.entries(wert)) {
      if (s.properties && k in s.properties) f.push(...gegenSchema(v, wurzel, s.properties[k], `${pfad}.${k}`));
      else if (s.additionalProperties === false) f.push(`${pfad}: unbekanntes Feld ${k}`);
    }
  }
  if (Array.isArray(wert) && s.items) wert.forEach((x, i) => f.push(...gegenSchema(x, wurzel, s.items, `${pfad}[${i}]`)));
  return f;
}

/** Ist `wert` eine gültige Ausgabe bzw. Eingabe des Hooks `name` (z. B. 'pre-tool-use.command.output')? */
export const gueltig = (wert, name) => gegenSchema(wert, schema(name));

/** Eine Eingabe, wie Codex sie liefert; `rest` überschreibt. */
export function eingabe(ereignis, rest = {}) {
  const basis = { cwd: '/tmp/luxe', hook_event_name: ereignis, model: 'gpt-6.1-sol', permission_mode: 'default', session_id: 's-1', transcript_path: null };
  const je = {
    PreToolUse: { tool_name: 'exec_command', tool_input: {}, tool_use_id: 't-1', turn_id: 'u-1' },
    PostToolUse: { tool_name: 'exec_command', tool_input: {}, tool_response: {}, tool_use_id: 't-1', turn_id: 'u-1' },
    SessionStart: { source: 'startup' },
    UserPromptSubmit: { prompt: 'hallo', turn_id: 'u-1' },
    Stop: { turn_id: 'u-1', stop_hook_active: false, last_assistant_message: null },
  };
  return { ...basis, ...(je[ereignis] ?? {}), ...rest };
}

export function fertig() {
  console.log(`${ok} ok, ${fehler} Fehler`);
  process.exit(fehler ? 1 : 0);
}
