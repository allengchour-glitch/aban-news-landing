---
tags: [falle, teuer-gelernt]
quelle: Runde 12:25 22.10.2026
gelernt: 2026-10-22
---
# Wiederkehrender lesender Server-Lauf: Alarm braucht Gedächtnis

Der Schliesser auftrag_haenger_schliessen.py kannte nur vier Auftragsarten; ein rein lesender Tageslauf (waechter_zustand, aendert:false) stand 12 h auf laufend und die Ampel rief BOT-AUFTRAG HAENGT, obwohl der Runner die Reihe am Folgetag selbst anlegt (Datei id-Datum, nicht der Stand). Regel: lesende Wartung (aus server/wartung.mjs geparst, Unklarheit = nichts schliessen) UND wiederkehrend wird geschlossen; ist die jüngste frühere Quittung der Reihe laufend oder abgebrochen, bleibt die Ampel rot (zweimal hintereinander = System). Selbsttest 9 Fälle + 5 Mutanten; Mutanten-Suchtexte per Verkettung teilen, sonst treffen sie doppelt. Und: Prüfer-Verdacht (aggregateRating an ProductGroup) erst an Seiten mit Daten messen — die ersten drei hatten keine Bewertungen.

Verwandt: [[Hypothese-mit-Datum]]
