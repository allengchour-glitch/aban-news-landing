---
tags: [falle, teuer-gelernt]
quelle: dropship/MERKLISTE-2026-10-18.md
gelernt: 2026-10-18
---
# Zwei Theme-Stücke, die nur ein Speicherschlüssel verbindet (Merkliste), brauchen einen Wächter für beide Seiten

18.10.2026: Herz-Skript in layout/theme.liquid und Merkliste-Seite sections/lux-merkliste.liquid kennen sich nur über localStorage lux_wish; wird eines geändert, bleibt die Seite still leer. Seite überarbeitet (tote Produkte raus mit Hinweis, Ausverkauft, Warenkorb nur Ein-Varianten ohne selbst-gestalten-Tag, Zähler, Alle entfernen), im echten Browser mit gespieltem Fetch getestet (tools/merkliste_test.mjs, alte Fassung fällt durch), Wächter automation/merkliste_wache.py. Theme-JS testet man lokal im Browser statt gegen die Live-Seite, die von unserer IP aus nicht prüfbar ist.

Verwandt: [[Hypothese-mit-Datum]]
