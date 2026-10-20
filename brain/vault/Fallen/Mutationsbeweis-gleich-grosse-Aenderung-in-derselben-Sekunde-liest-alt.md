---
tags: [falle, teuer-gelernt]
quelle: Fortura-Härtung 20.10.2026, Journal 🛡️
gelernt: 2026-10-20
---
# Mutationsbeweis: gleich grosse Änderung in derselben Sekunde liest alten Python-Bytecode

Beim Mutationsbeweis der Fortura-Engine (20.10.2026) schrieb das Skript nacheinander zwei Mutanten gleicher Dateigrösse innerhalb einer Sekunde; Python validiert pyc nach mtime+Grösse und lud die ALTE Fassung. Nachfolgende Mutanten fielen aus dem falschen Grund. Regel: Mutationsläufe mit python3 -B und PYTHONDONTWRITEBYTECODE=1, __pycache__ vor jedem Lauf löschen; ausserdem Saat-Daten alt wählen (sonst besteht ein Datumsvergleich auch ohne die Änderung) und Szenarien mit einem Ledger NUR aus der geprüften Zeile bauen (andere Zeilen triggern sonst stufe2 und maskieren den fehlenden Auslöser).

Verwandt: [[Hypothese-mit-Datum]]
