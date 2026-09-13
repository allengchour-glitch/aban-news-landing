---
tags: [falle, teuer-gelernt, preise]
quelle: CLAUDE.md Block 2026-09-13 «Zweites Gehirn geladen»
gelernt: 2026-09-13
---
# Ein Preis aus einer alten Kostenzahl erbt deren Fehler

GEMESSEN 2026-09-13: Das «Midikleid mit Zopfmuster» (40 Varianten, 320 g) wurde von der
Lern-Session nach der Regel EK/0,55 von 14.90 auf 39.90 gesetzt, ausgehend von
unitCost 20.37. Diese Zahl traegt den am 23.08. widerlegten Frachtboden CHF 15
(Kosten = 0,9·USD + max(15, …)); die gemessene Frachtregression gibt fuer 330 g
3.84 + 16.42·0.33 = 9.26. Wahre Kosten 14.63, nicht 20.37 — das Kleid ging bei 14.90
also nicht mit Verlust raus, sondern knapp kostendeckend, und die Regel haette 29.90
ergeben statt 39.90. Erkennbar: Produkt fehlt in dropship/_kosten_boden15_fix.txt und
wiegt unter 712 g (ueber 712 g sind alte und neue Formel identisch). Die vier schweren
Repricings (Gemueseschneider 1620 g, Lichterkette 720 g, Sattel 1250 g, Schneidebrett
1175 g) sind davon unberuehrt und richtig.

Regel: Vor jeder Preisregel, die von unitCost ausgeht, pruefen ob die Kostenzahl aus
der Boden-15-Zeit stammt (Gewicht < 712 g UND nicht im b15-Ledger) — sonst rechnet man
eine fremde Fehlformel in den Verkaufspreis hinein.

Verwandt: [[Drei-von-neun-verkauften-Posten-gingen-mit-Verlust-raus]] · [[Rohmarge-und-Netto-Marge-sind-nicht-dieselbe-Zahl]]
