---
tags: [falle, teuer-gelernt]
quelle: auswahl_nachruesten.py 08.10.2026
gelernt: 2026-10-08
---
# timeout um einen mehrstufigen Schreiber hinterlässt halbe Produkte

SIGTERM zwischen productOptionsCreate und productVariantsBulkUpdate hinterlässt Optionen ohne SKU/Preis, und der Rückbau läuft nie. Zeitbudget IM Programm (ZEIT_S: kein neues Produkt mehr beginnen), das äussere timeout nur als ferne Notbremse (doppelt so lang).

Verwandt: [[Hypothese-mit-Datum]]
