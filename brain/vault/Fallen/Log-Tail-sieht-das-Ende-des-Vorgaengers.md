---
tags: [falle, teuer-gelernt]
quelle: Keepalive 29.09. 15:26
gelernt: 2026-09-29
---
# Log-Tail sieht das Ende des Vorgängers

still_gestorben() prüfte tail -n 3 auf FERTIG; ein nach einer Zeile gestorbener Lauf galt wegen des Vortags-FERTIG als fertig (Fortura-Bestand 11 h eingefroren). Läufe schreiben START-Marke, Prüfung nur danach.

Verwandt: [[Hypothese-mit-Datum]]
