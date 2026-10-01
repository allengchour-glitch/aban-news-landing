---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-19
---
# Preisfilter werden von allen drei Abfragen still ignoriert

Gemessen am 2026-09-19 mit Gegenprobe in derselben Abfrage: productVariants(query: price:<=22.90) liefert 199.90, price:>=9000 liefert dieselbe Liste, price:zzzgibtesnicht liefert Treffer statt leer. Dasselbe fuer products(query: variants.price:…). Das Gedaechtnis kannte den Fall bisher nur fuer productsCount. Folge: es gibt keinen serverseitigen Weg zu den Verlustfaellen, jede Suche muss den ganzen Katalog blaettern. Ohne die Gegenprobe haette ich das Risikoband durchsucht gemeldet und in Wirklichkeit den Katalog von vorn gelesen. Quelle: dropship/LERNEN-PREIS-SKRIPT-2026-09-19.md

Verwandt: [[Hypothese-mit-Datum]]
