---
tags: [falle, teuer-gelernt]
quelle: PR #2514, Lauf 35925063457
gelernt: 2026-09-23
---
# Der Voice-Linter prueft fremde Dateien aus main mit

Der Check 'Brand-Voice check on changed .md files' wurde auf PR #2514 rot, obwohl keine meiner Dateien betroffen war. Ursache gemessen: der Workflow vergleicht mit git diff BASE HEAD (zwei Punkte) gegen pull_request.base.sha - den Basis-Commit vom Zeitpunkt der PR-Eroeffnung. Wenn main seither weitergelaufen ist und man main in den Branch merged, zieht dieser Vergleich ALLE .md-Dateien mit, die main seither bekommen hat. Der Drei-Punkte-Vergleich origin/main...HEAD war leer, der Zwei-Punkte-Vergleich meldete spiele-dev/RUNBOOK-TRAUMHAUS.md aus einer fremden PR. LEHRE: bevor man einen roten Voice-Linter fuer den eigenen haelt, mit dem ECHTEN Basis-Commit des CI-Laufs reproduzieren, nicht mit origin/main. Und: spiele-dev/ ist Entwickler-Doku und gehoerte laengst in die Ausnahmeliste - der Linter meldete dort nur Newsletter-Regeln (379020 Zeichen gegen die Grenze 5000, 124 'Hashtags' die Markdown-Ueberschriften sind).

Verwandt: [[Hypothese-mit-Datum]]
