---
tags: [falle, teuer-gelernt]
quelle: Journal 14.10. 🔪 / fixer_keepalive.sh still_gestorben
gelernt: 2026-10-14
---
# Tageswaechter ohne START/FERTIG stirbt beim Neustart 24 h unbemerkt

klinge_ch_wache.py endete mehrmals nach «Voll-Export gelesen» ohne Schlusszeile (Container-Neustart). absturz_nachholen sieht nur Traceback/Error, das Log-Alter-Tor (24 h) hielt den naechsten Lauf einen Tag zurueck. Fix: Skript schreibt START als erste und FERTIG rc=… als letzte Zeile (line_buffering), Aufseher fragt zusaetzlich still_gestorben. Jeder Tageslauf, der laenger als ein paar Minuten liest, braucht diesen Rahmen.

Verwandt: [[Hypothese-mit-Datum]]
