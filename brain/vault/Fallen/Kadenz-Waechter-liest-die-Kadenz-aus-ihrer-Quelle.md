---
tags: [falle, teuer-gelernt]
quelle: dropship/AMPEL-KADENZ-2026-10-09.md
gelernt: 2026-10-09
---
# Kadenz-Wächter liest die Kadenz aus ihrer Quelle

09.10.2026: Die Betreiber-Ampel meldete «still: Pinterest», weil sie jeden Metricool-Kanal fest auf 24 h prüfte; der Autopilot bedient Pinterest seit 06.10. bewusst alle 48 h. Fix: metricool_takt() liest die *_ABSTAND-Standardwerte aus social_autopilot.sh, still = Takt + Spielraum (25 %, mind. 2 h). Jeder Wächter, der einen Takt, eine Grenze oder ein Fenster prüft, liest den Wert aus der Datei, die ihn festlegt — eine eigene Zahl macht jede bewusste Änderung zum Fehlalarm.

Verwandt: [[Hypothese-mit-Datum]]
