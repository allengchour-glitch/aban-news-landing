---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-10-14
---
# Gemeinsamer Ordner braucht Besitzer je Datei

klassen_kontrolle.py leerte am Rundenbeginn jede *.txt in dropship/_klassen/ und löschte so die 2G/3G-Kandidatenliste eines anderen Werkzeugs (14.10.2026); der Nachtlauf brach mit FileNotFoundError ab. Regel: nur eigene Dateien löschen, Unbekanntes melden, nie löschen; Listen, die ein Lauf braucht, baut er selbst nach.

Verwandt: [[Hypothese-mit-Datum]]
