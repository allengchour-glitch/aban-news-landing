/**
 * Zustand «gesehene Trockenläufe» je Sitzung: eine Datei `trocken-<sitzung>.jsonl` im Zustandsordner,
 * je Zeile ein JSON-Text (der Skriptpfad).
 *
 * Gleichzeitige Hooks: Es wird nur ANGEHÄNGT (ein einziger Schreibaufruf mit O_APPEND je Merkvorgang),
 * nie die Datei neu geschrieben; so überschreiben sich zwei Hooks nicht. Jeder Anhang beginnt mit einem
 * Zeilenumbruch, damit eine abgebrochene Halbzeile die nächste nicht mitreisst. Beim Lesen wird jede
 * kaputte Zeile einzeln übersprungen; eine fehlende oder unlesbare Datei ist «nichts gesehen» (die
 * sichere Seite: dann bleibt LIVE=1 gesperrt).
 */
import { appendFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { sichereOrdner, zustandsOrdner } from './hook_io.mjs';

/** Sitzungsname als sicherer Dateiname: nur [A-Za-z0-9_-], gekürzt, mit Kurzprüfsumme des Originals
 *  (damit `a/b` und `a_b` nicht dieselbe Datei teilen). Kein Pfad-Ausbruch möglich. */
export function sitzungsName(sitzung) {
  const roh = typeof sitzung === 'string' || typeof sitzung === 'number' ? String(sitzung) : '';
  const grundlage = roh || 'ohne-sitzung';
  const sauber = grundlage.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 60);
  const summe = createHash('sha256').update(grundlage).digest('hex').slice(0, 10);
  return `${sauber}-${summe}`;
}

export function trockenDatei(env, sitzung) {
  return join(zustandsOrdner(env), `trocken-${sitzungsName(sitzung)}.jsonl`);
}

/** Alle in dieser Sitzung als Trockenlauf gesehenen Skripte (nie eine Ausnahme). */
export function leseTrocken(env, sitzung) {
  let text;
  try { text = readFileSync(trockenDatei(env, sitzung), 'utf8'); } catch { return []; }
  const aus = new Set();
  for (const zeile of text.split('\n')) {
    try {
      const wert = JSON.parse(zeile);
      if (typeof wert === 'string' && wert) aus.add(wert);
    } catch { /* kaputte Zeile: überspringen, die übrigen gelten weiter */ }
  }
  return [...aus].slice(0, 1000);
}

/** Merkt Trockenläufe (hängt an). Wirft, wenn der Zustandsordner nicht beschreibbar ist; der Aufrufer meldet das. */
export function merkeTrocken(env, sitzung, skripte) {
  const liste = [...new Set(skripte)].filter(s => typeof s === 'string' && s);
  if (liste.length === 0) return;
  sichereOrdner(zustandsOrdner(env));
  appendFileSync(trockenDatei(env, sitzung), liste.map(s => `\n${JSON.stringify(s)}\n`).join(''), { mode: 0o600 });
}
