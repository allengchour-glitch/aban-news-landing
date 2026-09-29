---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-27
---
# Ein Selbsttest im falschen Funktionsblock beweist gar nichts

GEMESSEN 2026-09-27: ich habe 14 neue Selbsttests in tools/varianten_preis.mjs eingebaut, und sie landeten hinter dem Ende der selbsttest-Funktion, im Berichtsblock. Der Lauf meldete weiter '24 Pruefungen bestanden, 0 gescheitert' - gruen, weil nichts geprueft wurde. Aufgefallen nur, weil ich die ZAHL nachgezaehlt habe statt '0 gescheitert' zu glauben; nach dem Verschieben waren es 38, und einer fiel sofort um. Dieselbe Klasse wie die Lehre vom 23.09. ('ein gruener Selbsttest beweist nur, dass der Code tut was der Test prueft'), nur eine Stufe schlimmer. Regel: nach dem Einbauen neuer Tests immer die Anzahl vorher und nachher vergleichen, nicht nur die Fehlerzahl.

Verwandt: [[Hypothese-mit-Datum]]
