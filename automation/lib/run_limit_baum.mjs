// run_limit_baum.mjs — Hilfsdatei für run_limit_test.mjs («E Kanarienvogel»): legt einen Prüfbaum aus {relativer Pfad: Inhalt} an (19.10.2026).
// Eigene Datei, damit run_limit_test.mjs selbst keine Schreibaufrufe enthält: automation/queue_schreiber_wache.py meldet jede Datei, die eine
// Queue-CSV nennt (die Poster-Tabelle im Test tut das) UND roh schreibt — GEMESSEN 19.10. mit der ersten Fassung des Tests («1 Roh-Schreiber»).
// Diese Datei nennt keine Queue-Datei. Sie schreibt nur unterhalb von «basis»; ein Pfad, der herausführt (absolut, «..»), ist ein Fehler.
import fs from 'node:fs';
import path from 'node:path';

export function baumSchreiben(basis, dateien) {
  const wurzel = path.resolve(basis);
  for (const [rel, inhalt] of Object.entries(dateien)) {
    const ziel = path.resolve(wurzel, rel);
    if (path.isAbsolute(rel) || (ziel !== wurzel && !ziel.startsWith(wurzel + path.sep))) throw new Error(`baumSchreiben: ${rel} liegt nicht unter ${wurzel}`);
    fs.mkdirSync(path.dirname(ziel), { recursive: true });
    fs.writeFileSync(ziel, inhalt);
  }
}
