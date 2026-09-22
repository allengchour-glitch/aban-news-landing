---
tags: [system]
quelle: Journal 2026-09-21 · 🚪 Das Tor fragt nach dem Log-Alter; 🫀
gelernt: 2026-09-22
---
# Erst claimen, dann handeln — der Prüfer setzt selbst den Zustand, den er prüft

49 Tages-Tore fragten «Log älter als 24 h?», aber der Lauf schreibt minutenlang nichts (Prio-Liste zuerst, oder Warten an der Schranke); nach dem 120-s-Schlaf des Aufsehers war das Tor noch offen → cj_reviews_import.mjs lief doppelt (822 s / 696 s, gleiche SID = Forks EINES Aufsehers), doppelte CJ-Punkte. Die Schranke gegen Gleichzeitigkeit erzeugte so selbst Doppelstarts: eine Reparatur an einer Stelle verändert die Annahmen der Nachbarn. Regel: touch "$LOG" unmittelbar nach dem Tor, vor jeder Nebenwirkung (wortgleich Regel 10 der IG-Poster) — ein Rennen gewinnt man nicht mit einer besseren Prüfung, sondern damit, dass der Prüfer den Zustand selbst setzt. Prozesse zählt man wie der Keepalive: pid==sid, echte Kommandozeile im richtigen awk-Feld; Forks mit gleicher SID sind kein Doppelstart.

Verwandt: [[Hypothese-mit-Datum]]
