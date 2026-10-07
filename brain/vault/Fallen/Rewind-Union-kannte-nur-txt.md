---
tags: [falle, teuer-gelernt]
quelle: dropship/LEDGER-UNION-TSV-2026-10-07.md
gelernt: 2026-10-07
---
# Rewind-Union kannte nur *.txt

repo_vorspulen.sh sicherte nur dropship/*.txt; 85 .tsv-Ledger verloren bei reset --hard ungepushte Zeilen → Bildtausch tauschte dieselben Produkte zweimal. Schwanz-Union (nur Anhänge nach letzter gemeinsamer Zeile) rettet sie ohne Zombies. Bei jedem neuen Ledger-Format die Rewind-Sicherung mitprüfen.

Verwandt: [[Hypothese-mit-Datum]]
