---
tags: [falle, teuer-gelernt]
quelle: eigener Fehlalarm, 2026-09-25
gelernt: 2026-09-25
---
# Die Kundenseite kann der Aenderung um Sekunden nachhinken

Direkt nach der Preis-Mutation meldete mein Pruefgeraet beim E-Scooter-Ladegeraet 'alter Preis NOCH DA' (25.90 neben 34.90). Nachgemessen wenige Augenblicke spaeter: der Seitenquelltext enthaelt '"price":2590' GAR NICHT mehr, '"price":3490' genau einmal, und /products/<handle>.js meldet 3490 bei einer einzigen Variante. Zwei Erklaerungen kommen in Frage und beide fuehren zur selben Lehre: entweder eine zwischengespeicherte Seitenfassung, oder ein Empfehlungsblock mit FREMDEN Produkten, deren Preise mein Geraet mitgezaehlt hat. LEHRE: ein Pruefgeraet, das die GANZE Seite nach Preisen durchsucht, misst auch fremde Produkte. Die Pruefung 'alter Preis weg' gehoert an die Produktdaten selbst (/products/<handle>.js), die Pruefung 'neuer Preis sichtbar' an die gerenderte Seite. Und: vor 'Fehlschlag' melden immer ein zweites Mal messen.

Verwandt: [[Hypothese-mit-Datum]]
