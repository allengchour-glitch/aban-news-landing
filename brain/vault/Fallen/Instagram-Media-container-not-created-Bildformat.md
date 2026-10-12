---
tags: [falle, teuer-gelernt]
quelle: Verbesserungsrunde 12.10.2026
gelernt: 2026-10-12
---
# Instagram Media container not created = Bildformat

Bild 209x666 (0,31) scheiterte bei Instagram über Metricool mit «Media container not created by unknown cause». Feed nimmt 0,8 bis 1,91 und Breite ab 320 px. Poster hatte elf Schichten, keine fürs Format. Fix: automation/ig_bildformat.py (Regel, Wächter, Selbsttest), zwölfte Schicht im Poster, Aufseher alle 6 h. Falle: csv.DictWriter schreibt CRLF, die Queue hat LF — lineterminator setzen.


**Traegt der Skill `messgeraet-zuerst`** — dort gehoert die Regel hinein, damit sie
sich beim naechsten passenden Auftrag von selbst laedt.

Verwandt: [[Hypothese-mit-Datum]]
