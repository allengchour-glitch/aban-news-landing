---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-10-14
---
# Regex-Kopie einer Funktion bricht still

reel_neu_rendern.py kopierte zeilen()/kurzTitel() per Regex aus cj_video_reel_engine.mjs; seit zeilen() die Konstante PRAEP braucht, brach jede Reel-Reparatur mit ReferenceError ab (13./14.10.2026). Fix: gemeinsames Modul automation/lib/reel_titel.mjs, Selbsttest als Tor. Regel: Funktionen importieren, nie per Regex kopieren.

Verwandt: [[Hypothese-mit-Datum]]
