---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-27
---
# Eine laufende Summe ueber mehrere Sitzungen ist erst belegt wenn sie gegen die Gesamtzahl aufgeht

GEMESSEN 2026-09-27: die Stand-Bloecke zur Katzenklasse fuehrten '500 der 806', dann 600, dann 700 gemessene Produkte. Die Blaetterung endete aber nach 6 weiteren Produkten mit hasNextPage false. Nachgerechnet deckten die Bloecke Seiten 1-3 (300), 4-5 (200), 6 (100), 7 (100), 8 (100) = 800, nicht 700 - die Zeile nach Block 3 war bereits um 100 zu niedrig und der Fehler wanderte durch drei Stand-Bloecke. Die Gegenprobe, die es entscheidet: 800 + 6 = 806 und productsCount(title:katzen* AND status:active) = 806, die Summe schliesst exakt. Zusaetzlich 806 aktiv + 330 Entwuerfe = 1136 = title:katzen* ohne Statusfilter. Schaden ohne den Fund: die naechste Sitzung haette eine Seite neu gemessen, die laengst erledigt war, oder '106 offen' gemeldet, wo 6 offen waren. Regel: wer eine laufende Summe ins Gedaechtnis schreibt, rechnet sie im selben Arbeitsgang gegen die Gesamtzahl auf.

Verwandt: [[Hypothese-mit-Datum]]
