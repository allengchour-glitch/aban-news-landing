---
tags: [falle, teuer-gelernt]
quelle: dropship/QUEUE-DOPPELZEILEN-2026-09-29.md
gelernt: 2026-09-29
---
# ID-Regex muss jede ID-Form kennen

reels_seed.csv: inCsv=/^cjreel-(\d+)/ übersah UUID-IDs, der Nachtrag hängte sie doppelt an (5 IDs doppelt, 2 beide ready). Bei jedem ID-Muster zählen, wie viele echte IDs NICHT passen; Anhänger prüfen die Datei direkt vor dem Schreiben.

Verwandt: [[Hypothese-mit-Datum]]
