---
tags: [falle, teuer-gelernt]
quelle: dropship/REEL-TOR-MOTOR-2026-09-30.md
gelernt: 2026-09-30
---
# Äusseres timeout erzeugt Waisen

30.09.2026: bildtext_pruefen.py rief pytesseract ohne timeout; die Aufrufer liefen unter 'timeout N', das beendet nur Python — tesseract lief als Waise weiter (11 Stück, bis 826 s, Load 50/4 Kerne). Folge: Meisterwerk-Tor 'nicht messbar', 5/6 Reels verworfen. Regel: Zeitgrenze in den Aufruf selbst (pytesseract timeout=, subprocess timeout=), OMP_THREAD_LIMIT=1, Abräumer nur mit engem Kriterium (Eltern-PID 1).

Verwandt: [[Hypothese-mit-Datum]]
