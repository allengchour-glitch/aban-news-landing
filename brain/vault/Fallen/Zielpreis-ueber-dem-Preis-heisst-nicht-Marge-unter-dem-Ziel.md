---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-20
---
# Zielpreis ueber dem Preis heisst nicht Marge unter dem Ziel

GEMESSEN 2026-09-20 an den Fahrradhelmen: zielpreis() liefert die kleinste Sprosse der Leiter x4.90/x9.90, bei der nach WELCOME10 38 Prozent bleiben. Ein Preis unterhalb dieser Sprosse kann das Ziel trotzdem erfuellen: 45.90 bei EK 25.50 ergibt 38,3 Prozent, zielpreis() sagt 49.90. Vier Produkte waeren fuer 0,3 bis 5 Prozentpunkte angehoben worden. Entscheidend ist die gemessene Marge, nicht die Sprossenlage. automation/preis_korrektur.mjs benutzt noch das Sprossen-Kriterium und muss nachgezogen werden, bevor es ueber den ganzen Katalog laeuft.

Verwandt: [[Hypothese-mit-Datum]]
