---
tags: [falle, teuer-gelernt]
quelle: dropship/QUEUE-SCHREIBER-2026-10-14.md
gelernt: 2026-10-14
---
# Vollständigkeit einer fremd geschriebenen Datei nie aus dem Inhalt raten

Mehrere Dauerläufer schrieben automation/reels_seed.csv; Poster schrieben die ganze Datei aus einer Kopie zurück, die sie Minuten vorher gelesen hatten → 13 fertige Reels nie gepostet. Fix: ein gemeinsamer Helfer (Sperre, frisch lesen, 3-Wege je Feld, atomar). Der Stresstest zeigte die zweite Falle: Eine halbe Datei (O_TRUNC-Schreiber oder git checkout pausiert ≥ 33 ms), die zufällig auf einer Satzgrenze endet, besteht jede Inhaltsprüfung (endet auf Zeilenumbruch, Anführungszeichen gerade, zweimal gleich gelesen) → 330 statt 662 Datensätze. Abhilfe: Stand-Marke des eigenen letzten Schreibens (Inode, Grösse, mtime, Zahl der Datensätze); alles andere gilt erst nach Ruhezeit, Schrumpfen einer Anhänge-Liste erst nach 10 s. Sperrdateien mit Inhalt atomar anlegen (link), sonst ist eine leere Sperre mehrdeutig.


**Traegt der Skill `messgeraet-zuerst`** — dort gehoert die Regel hinein, damit sie
sich beim naechsten passenden Auftrag von selbst laedt.

Verwandt: [[Hypothese-mit-Datum]]
