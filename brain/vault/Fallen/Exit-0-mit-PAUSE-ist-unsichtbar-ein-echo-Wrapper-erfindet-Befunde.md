---
tags: [falle, teuer-gelernt]
quelle: Journal 2026-09-21 · 🧾 Kosten-Kette; 🔁 Fünf sinnlose Läufe pro Stunde
gelernt: 2026-09-22
---
# Exit 0 mit «PAUSE» ist unsichtbar; ein «|| echo»-Wrapper erfindet Befunde

Drei Klassen desselben Fehlers: (1) kosten_export_bauen.py erkannte den abgebrochenen Bulk-Download, gab aber Exit 0, und die Aufseher-Kette ohne && liess den Verbraucher jede Nacht am JSON sterben; (2) versandschwelle_rabatt meldete seit 10.09. täglich «⚠️ Versandschwelle passt nicht», weil fixer_keepalive.sh bei JEDEM Exit≠0 den Fachbefund druckte — live rc=0, Tarif 45 = Soll 45; (3) preisboden/farbwerte_zusammengesetzt/umlaut_suchtags liefen 1'850/1'829/615-mal, weil «0 Kandidaten» ohne FERTIG endete. Regel: Exit 3 = Fachbefund, Exit 0 = ok/FERTIG (auch bei nichts-zu-tun), jeder andere Exit = «NICHT MESSBAR»; Ketten mit &&. Und «FERTIG: 58'905 Zeilen» war ein Export, der bei 12 % abriss — Vollständigkeit prüft man gegen Shopifys objectCount und die letzte Zeile als JSON, nie über die Zeilenzahl.

Verwandt: [[Hypothese-mit-Datum]]
