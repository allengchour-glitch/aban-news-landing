---
tags: [falle, teuer-gelernt]
quelle: GEDAECHTNIS-JOURNAL.md Nachtrag 44
gelernt: 2026-09-23
---
# add -A nach gescheitertem Merge committet die Konfliktmarker

autocommit.sh: git merge scheiterte an einer von Server und Cloud geschriebenen Zustandsdatei, der Merge blieb offen, der naechste Durchlauf (add -A dropship/ + commit) schloss ihn mit Markern ab und pushte. Regel: offenen Merge (MERGE_HEAD) vor dem naechsten add erkennen und je Dateiart aufloesen (Ledger Union, Zustand eigene Fassung, Code Abbruch), vor jedem Push auf Marker pruefen.

Verwandt: [[Hypothese-mit-Datum]]
