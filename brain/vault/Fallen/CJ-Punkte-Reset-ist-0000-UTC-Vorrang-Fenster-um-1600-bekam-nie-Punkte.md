---
tags: [falle, teuer-gelernt]
quelle: dropship/CJ-VORRANG-FENSTER-2026-10-06.md
gelernt: 2026-10-06
---
# CJ-Punkte-Reset ist 00:00 UTC — Vorrang-Fenster um 16:00 bekam nie Punkte

Das Vorrang-Fenster (Grind ruht, Videos/Kosten/Bewertungen) stand seit 15.08. auf 16:00 UTC wegen einer Annahme. Gemessen 06.10.: Reset 00:00 UTC (20/37 Wechsel leer→gelesen in Stunde 00, 0 in Stunde 16), Topf leer ab ~04:00. Video-Nachfüller fand 16:14 sofort 16900500. Fix: cj_vorrang_fenster.sh (eine Stelle, Stunde aus Datei) + cj_reset_wache.py (misst den Reset). Lehre: Zeitfenster an einer GEMESSENEN Grenze ausrichten und die Messung als Wächter behalten.

Verwandt: [[Hypothese-mit-Datum]]
