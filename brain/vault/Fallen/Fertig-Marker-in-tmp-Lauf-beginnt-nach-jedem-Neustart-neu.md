---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-27
---
# Fertig-Marker in /tmp = Lauf beginnt nach jedem Neustart neu

schulstart_lauf.sh (Saison-Import 15.08.) trug seine FERTIG-Marker in /tmp; nach dem Container-Neustart 27.09. startete fixer_keepalive ihn neu und er importierte 2 h über cj_sku_import, obwohl der Grind pausiert war (_GRIND_PAUSE_BIS) — die Pause prüften nur autostart/queue_runner. Regel: jede Import-Schleife prüft die Pause SELBST (nicht nur der Starter); Geschwister cj_runner_template ebenfalls nachgerüstet.

Verwandt: [[Hypothese-mit-Datum]]
