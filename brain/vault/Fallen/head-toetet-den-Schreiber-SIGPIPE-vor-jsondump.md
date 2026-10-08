---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-10-08
---
# | head tötet den Schreiber (SIGPIPE vor json.dump)

08.10.2026: Ein Diff-Skript lief mit '| head -3' — es starb an SIGPIPE, bevor es seine JSON-Datei schrieb; die nächste Auswertung las die ALTE Datei und zeigte längst behobene Fehler. Ausgaben, die weiterverarbeitet werden, in eine Datei umleiten und danach kürzen, nie über eine abgeschnittene Pipe erzeugen.

Verwandt: [[Hypothese-mit-Datum]]
