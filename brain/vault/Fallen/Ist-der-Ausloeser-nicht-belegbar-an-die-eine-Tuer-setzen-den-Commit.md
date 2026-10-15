---
tags: [falle, teuer-gelernt]
quelle: Journal 15.10. 🧾 / ledger_schrumpf_tor.py
gelernt: 2026-10-15
---
# Ist der Ausloeser nicht belegbar, an die eine Tuer setzen: den Commit

15.10.: _cj_lager.tsv 58834->198 und _cj_nachpruefung.tsv 8842->10 im Arbeitsbaum geleert und committet; Ausloeser nicht belegbar (Schreiber nur append, kein Merge/Stash/Reset im reflog). Statt die Ursache zu raten: Tor an jedem Commit (Git-Hooks pre-commit + pre-merge-commit ueber core.hooksPath, faengt auch Hand-Commits und Merges), plus stuendliche Rueckschau ueber die letzten 26 h. Heilung = Vergleichszeilen + Arbeitszeilen ab der ersten unbekannten (Mengen-Abgleich verlor wortgleich wieder angehaengte Zeilen). pre-merge-commit muss nach Heilung mit 1 enden, sonst traegt der Merge-Commit die geschrumpfte Fassung.

Verwandt: [[Hypothese-mit-Datum]]
