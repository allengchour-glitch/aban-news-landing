---
tags: [falle, teuer-gelernt]
quelle: Journal 2026-09-18 · 🤖; 2026-09-17 · `; 🔢; 🩺
gelernt: 2026-09-22
---
# Ein Häkchen ohne gelesene Ausgabe ist keine Prüfung

In anmelde_erkennung.test.mjs stand process.exit() mitten in der Datei — der vierte Testblock lief nie, der Lauf meldete grün; gefangen nur, weil die neuen Zeilen in der Ausgabe fehlten. git commit -m mit Backticks: die Shell führte `return {}` als Befehlsersetzung aus, die Commit-Meldung landete ohne die entscheidenden Wörter im Repo. Eine Vorlage schrieb «4 Versuche» fest, eine Datei schleift range(5). Ein Massen-Patch war zweimal selbst kaputt, nur der ast.parse-Torwächter verhinderte 19 kaputte Dateien. Regel: Testausgabe auf die eigenen neuen Fälle lesen und den Test sabotieren, bis er rot wird; Commit-Meldungen mit Code über -F oder Here-Dokument; Zahlen in Meldungen zählen statt behaupten; Massen-Eingriffe mit Tor, das die Erzeugung prüft.

Verwandt: [[Hypothese-mit-Datum]]
