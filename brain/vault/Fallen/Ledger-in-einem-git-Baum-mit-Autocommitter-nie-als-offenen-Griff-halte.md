---
tags: [falle, teuer-gelernt]
quelle: dropship/CJ-LAGER-PID-2026-10-14.md
gelernt: 2026-10-14
---
# Ledger in einem git-Baum mit Autocommitter nie als offenen Griff halten

14.10.2026 (Prüfung cj_lager_abgleich): Das Skript öffnete dropship/_cj_lager.tsv einmal und schrieb den ganzen Lauf über in denselben Griff. Ein git-Merge (Autocommitter, Zeilen vom Server) ersetzt die Datei durch eine neue (neues Inode) — alle weiteren Zeilen landen in der gelöschten alten Datei. Eine gesetzte Sperre steht dann in keinem Ledger und wird nie mehr freigegeben. Regel: Ledger-Zeilen je Zeile öffnen-anhängen-schliessen (ledger_zeile()). Gilt für jeden Langläufer, der in dropship/ protokolliert.

Verwandt: [[Hypothese-mit-Datum]]
