---
tags: [falle, teuer-gelernt]
quelle: dropship/GEMINI-JURY-2026-09-28.md
gelernt: 2026-09-28
---
# Statusmarke in geteilter Datei braucht einen Wiederholer

23 jury-skip-Marken in reels_seed.csv gingen an einen parallelen Schreiber verloren (Lost Update). Säuberer las Zeilen, prüfte Minuten, schrieb alles zurück — gleiche Klasse. Fix: vor dem Schreiben neu lesen, nur noch-ready-Zeilen ändern, atomar; Marke im täglichen idempotenten Wächter statt Einmal-Skript.

Verwandt: [[Hypothese-mit-Datum]]
