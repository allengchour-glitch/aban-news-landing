/**
 * Zähler-Datei und Ablauf des Schreibzähler-Hooks (PostToolUse und SessionStart).
 *
 * Der Zähler liegt je Sitzung in einer eigenen Datei im Zustandsordner (nie im Repo). Er wird nur ANGEHÄNGT:
 * jeder Treffer hängt eine Zeile mit dem Gruppennamen an («\nshop\n» in einem einzigen Schreibaufruf). Codex kann
 * mehrere Hooks gleichzeitig starten; ein Lesen-Ändern-Schreiben würde dabei Zähler verlieren, das Anhängen
 * (O_APPEND, wenige Bytes) nicht. Gelesen wird durch Zählen der Zeilen; jede Zeile, die kein Gruppenname ist
 * (halbe Zeile, Binärmüll, altes Format), wird ignoriert, eine kaputte Datei kostet also höchstens eine Zeile.
 */
import { appendFileSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { gruppeFuer, GRUPPEN, leererZaehler, statusText, zaehleHoch } from './gruppen.mjs';
import { meldung, sichereOrdner, zustandsOrdner } from './hook_io.mjs';

/** Sitzungskennung → sicherer Dateiname (kein Pfadtrenner, kein «..»); ein veränderter Name bekommt eine Prüfsumme gegen Verwechslung. */
export function sichererName(sitzung) {
  const roh = String(sitzung ?? '');
  if (roh === '') return 'ohne-sitzung';
  const glatt = roh.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64);
  return glatt === roh ? glatt : `${glatt}-${createHash('sha1').update(roh).digest('hex').slice(0, 8)}`;
}

export const zaehlerDatei = (ordner, sitzung) => join(ordner, `zaehler-${sichererName(sitzung)}.log`);

/**
 * Liest den Stand. Fehlende Datei = Nullstand ohne Warnung; unlesbare Datei (z. B. ein Ordner an der Stelle)
 * = Nullstand MIT Warnung, nie eine Ausnahme.
 */
export function leseStand(datei) {
  let text;
  try {
    text = readFileSync(datei, 'utf8');
  } catch (fehler) {
    if (fehler?.code === 'ENOENT') return { stand: leererZaehler(), warnung: '' };
    return { stand: leererZaehler(), warnung: ` (Zähler unlesbar: ${fehler?.code ?? 'Fehler'})` };
  }
  let stand = leererZaehler();
  for (const zeile of text.split('\n')) if (GRUPPEN.includes(zeile.trim())) stand = zaehleHoch(stand, zeile.trim());
  return { stand, warnung: '' };
}

/** Ein Aufruf mehr in `gruppe`. Wirft bei einem Schreibfehler (der Hook meldet ihn dann sichtbar). */
export function haengeAn(datei, gruppe) {
  appendFileSync(datei, `\n${gruppe}\n`);
}

/** Löscht Zählerdateien, die älter als `tage` sind (ausser `behalte`); gibt die Zahl der gelöschten zurück. Fehler stören nie. */
export function raeumeAuf(ordner, { jetzt = Date.now(), tage = 14, behalte = '' } = {}) {
  let weg = 0;
  try {
    for (const name of readdirSync(ordner)) {
      if (!/^zaehler-.+\.log$/.test(name) || join(ordner, name) === behalte) continue;
      try {
        if (jetzt - statSync(join(ordner, name)).mtimeMs > tage * 86_400_000) { rmSync(join(ordner, name), { force: true }); weg += 1; }
      } catch { /* diese Datei überspringen */ }
    }
  } catch { /* Ordner fehlt noch: nichts aufzuräumen */ }
  return weg;
}

/**
 * Der Hook. `start`: Aufruf mit Argument «start» (SessionStart). Das Ereignis aus hook_event_name gewinnt:
 *  - SessionStart → zeigt den Stand der Sitzung (bei neuer Sitzung «keine», bei Wiederaufnahme die alten Zahlen).
 *  - PostToolUse → zählt, wenn der Aufruf in eine Gruppe gehört und gelungen ist; sonst KEINE Ausgabe (kostet nichts).
 * Ausgabe nur als systemMessage; additionalContext wird bewusst nicht benutzt (kostet Token in jedem Gespräch).
 */
export async function behandle(e, env = process.env, start = false) {
  const ereignis = e.hook_event_name;
  const istStart = ereignis === 'SessionStart' || (start && ereignis === undefined);
  if (!istStart && ereignis !== 'PostToolUse') return undefined;

  const ordner = zustandsOrdner(env);
  const datei = zaehlerDatei(ordner, e.session_id);

  if (istStart) {
    raeumeAuf(ordner, { behalte: datei });
    const { stand, warnung } = leseStand(datei);
    return meldung(`${statusText(stand)}${warnung}`);
  }

  const gruppe = gruppeFuer(e.tool_name, e.tool_input, e.tool_response);
  if (gruppe === undefined) return undefined;
  sichereOrdner(ordner);
  haengeAn(datei, gruppe);
  const { stand, warnung } = leseStand(datei);
  return meldung(`${statusText(stand)}${warnung}`);
}
