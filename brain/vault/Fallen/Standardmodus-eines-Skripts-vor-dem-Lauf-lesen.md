---
tags: [falle, teuer-gelernt]
quelle: dropship/GOOGLE-FOKUS-2026-10-01.md
gelernt: 2026-10-01
---
# Standardmodus eines Skripts vor dem Lauf lesen

01.10.2026: google_kategorie_fein.py schreibt ohne DRY=1 sofort (SCHARF = DRY != 1). Ein als Trockenlauf gemeinter Aufruf schrieb 2049 Google-Kategorien; nachträglich per Stichprobe geprüft und 59 Fehlgriffe korrigiert. Vor jedem Lauf den Schalter im Skriptkopf lesen.

Verwandt: [[Hypothese-mit-Datum]]
