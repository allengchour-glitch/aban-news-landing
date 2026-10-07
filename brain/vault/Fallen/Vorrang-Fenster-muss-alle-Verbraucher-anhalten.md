---
tags: [falle, teuer-gelernt]
quelle: dropship/VIDEO-VORRANG-2026-10-07.md
gelernt: 2026-10-07
---
# Vorrang-Fenster muss alle Verbraucher anhalten

Das CJ-Vorrangfenster 00:00-01:30 pausierte nur die Grind-Runner 2-5; cj_category_fill (377 Aufrufe), cj_perpetual und cj_sku_import liefen weiter und leerten das Budget, der Video-Nachtrag kam auf 0-27 statt 250. Vorrang gehört in cj_takt (VORRANG_SKRIPTE), Kundenschutz in IMMER_FREI, beides in .py UND .mjs. Wer im Fenster Aufrufe macht, im Takt-Log zählen.

Verwandt: [[Hypothese-mit-Datum]]
