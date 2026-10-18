---
tags: [falle, teuer-gelernt]
quelle: dropship/SECRET-UMGEBUNG-2026-10-15.md
gelernt: 2026-10-18
---
# Ein Geheimnis an EINEM Startweg prüfen schützt nur diesen: gemeinsame Funktion + Wache für laufende Prozesse

15.10.2026: SHOPIFY_CLIENT_SECRET der Umgebung hatte 60 statt 38 Zeichen. engine_keepalive.sh prüfte es, der SessionStart-Hook autostart.sh nicht: cj_category_fill scheiterte 6832x ohne Token. Fix: automation/lib/shopify_secret.sh (eine Funktion, von jedem Startweg gerufen, Urteil per md5-Präfix, Werte nie ausgegeben) plus automation/secret_umgebung_wache.py, das /proc/<pid>/environ der Motoren liest. Offen: Betreiber korrigiert die Umgebungsvariable.

Verwandt: [[Hypothese-mit-Datum]]
