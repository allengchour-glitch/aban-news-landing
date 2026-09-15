# Von anderen lernen, wie man Gewinn macht — und was davon bei uns gilt

*15.09.2026. Auftrag des Betreibers: «lerne von anderen wie man profit macht».*
*Marken nach Hausregel: **GEMESSEN** = hier nachgeprüft · **QUELLE** = fremde Angabe, plausibel,
nicht nachgeprüft · **BEHAUPTUNG** = Verkaufsversprechen.*

## Der Massstab zuerst: was verdient LuxeStyle wirklich?

Ohne eigene Zahl ist jeder fremde Ratschlag unprüfbar. Deshalb zuerst die neun bezahlten
Bestellungen, Einkaufspreis je verkaufter Variante direkt aus der Admin-API.

| | GEMESSEN |
|---|---|
| Bestellungen mit belegtem Einkaufspreis | 6 von 9 |
| Einnahmen (Ware + Versand) | CHF 190.32 |
| Netto nach Wareneinsatz, Gebühr, Währung | **CHF 55.18** |
| Netto-Marge | **29,0 %** |
| Gewinn je Bestellung | **CHF 9.20** |
| Durchschnittlicher Bestellwert | **CHF 33.00** |
| Bestellungen mit Verlust | **0 von 6** |

Für CHF 1'000 Gewinn im Monat braucht es bei dieser Struktur **109 Bestellungen** — heute sind
es rund zwei im Monat. Das ist die ganze Aufgabe in einer Zahl.

## Die vier fremden Ratschläge, einzeln gegengeprüft

### 1. «40–60 % Rohmarge sind nötig» — gilt für uns NICHT
QUELLE (mehrere Anbieter-Blogs): unter 40 % Rohmarge trage ein Shop die Werbekosten nicht;
netto seien 15–20 % das Ziel erfahrener Händler.
GEMESSEN bei uns: Rohmarge 34,3 %, netto 29,0 %. Wir liegen unter dem Roh-Benchmark und über
dem Netto-Benchmark. **Der Benchmark misst eine Kostenstruktur, die wir nicht haben** — er ist
gebaut für Shops, die Traffic kaufen. Unser einziger Kanal mit belegten Verkäufen sind
Google-Gratis-Einträge. Wer uns auf 40 % Rohmarge hebt, verteuert die Ware für einen
Kostenblock, den es hier nicht gibt.

### 2. «Gratisversand-Schwelle auf 15–30 % über dem AOV» — wäre bei uns gefährlich
QUELLE: die optimale Schwelle liege 15–30 % über dem AOV, über 40 % brächen 68 % der Körbe ab;
93 % der Käuferinnen legen etwas dazu, um sie zu erreichen (12–24 % mehr AOV).
Bei AOV 33 hiesse das eine Schwelle um **CHF 38–43** — wir liegen effektiv bei **50**.
Nach dem Buchstaben des Ratschlags wäre unsere Schwelle zu hoch.

**Die Gegenprobe an den eigenen Bestellungen kehrt das Urteil um.** Was bliebe, wenn dieselben
Bestellungen den Versand gratis bekommen hätten?

| | mit CHF 7 Versand | ohne Versanderlös |
|---|---|---|
| #1011 Hängematte | +3.72 | **−2.98** |
| #1013 | +4.87 | **−1.82** |
| #1014 | +20.31 | +13.61 |
| #1015 | +0.75 | **−5.94** |
| #1018 | +9.32 | +2.63 |
| **Verlustbringer** | **0 von 5** | **3 von 5** |

GEMESSEN: **Der Versanderlös von CHF 7 ist es, der dieses Geschäft trägt.** Bei uns ist Fracht
eine Stückkost aus China, kein Lagerfixkostenblock — jede Sendung kostet erneut. Die Schwelle
ist deshalb kein Conversion-Hindernis, sondern eine **Schutzmauer**. Sie zu senken, wie der
Benchmark nahelegt, hätte drei von fünf Bestellungen in Verluste verwandelt.
→ Damit ist auch Cowork-Punkt 1 endgültig erledigt, und zwar in die andere Richtung als gestern
gedacht: nicht 45→50, sondern **unverändert lassen**.

### 3. «Versteckte Kosten fressen die Marge» — ein Posten fehlte mir tatsächlich
QUELLE: Zahlungsgebühr 2,9 % + 0.30 **und 1–2 % Währungsverlust in beide Richtungen**, wenn der
Lieferant in China und die Kundin in Europa sitzt.
Das trifft bei uns zu (CJ rechnet USD, wir kassieren CHF) und stand in keiner unserer
Margenrechnungen. Ist jetzt mit 1,5 % in `tools/marge_wahrheit.py` eingebaut.

### 4. «Unterpreisen killt den Gewinn» — hier sitzt unser echtes Geld
Das ist der einzige Ratschlag, der bei uns eine grosse, messbare Klasse trifft.

## Der Fund: 1'785 Produkte, bei denen ein Verkauf schlechter ist als kein Verkauf

GEMESSEN über einen Bulk-Export aller **432'085 aktiven Varianten** (303'361 mit belegtem
Einkaufspreis; 128'724 ohne — die zählen als **unbekannt**, nie als Marge):

| Klasse | Varianten |
|---|---|
| Verlust, sobald der Versand gratis ist | 69'115 |
| unter CHF 3 Gewinn | 112'114 |
| ab CHF 3 Gewinn | 122'132 |
| **Verlust AUCH MIT den CHF 7 Versand** | **11'923** (in 2'286 Produkten) |
| davon Produkte, bei denen **jede** Variante verliert | **1'785** |

Die 1'785 zerfallen sauber in zwei Gruppen:
* **433 rettbar** — eine massvolle Preiskorrektur (bis 1,6-fach) bringt sie über null.
  Beispiel: Vakuumierer CHF 26.90 → nötig 37.90.
* **1'352 hoffnungslos** — dort frisst die China-Fracht den ganzen Preis. Der
  «Bluetooth-Subwoofer für Desktop» steht zu CHF 15.90 im Laden und müsste **CHF 992.83**
  kosten. Ein Katzenbaum zu 41.90 hat CHF 403.13 Stückkosten. Das sind keine kaputten Daten:
  sperrige Ware einzeln aus China zu schicken kostet wirklich so viel.

**Warum der bestehende Preisboden das nicht verhindert hat:** er ist **absolut**
(CHF 14.90/16.90), nicht margenbasiert. Bestellung #1015 lag mit 22.90 weit über dem Boden und
war trotzdem knapp. Ein absoluter Boden kann Verluste nicht ausschliessen — nur ein Boden auf
die Kosten kann das. Genau den rechnet `tools/marge_wahrheit.py` jetzt aus.

### Erledigt
Die **zwölf teuersten Fehlgriffe** sind aus dem Verkauf (Entwurf, nie gelöscht) — zusammen
rund **CHF 5'480 Verlustrisiko je Verkaufsrunde**. Beleg: `dropship/_verlustbringer_done.txt`.

### Offen — braucht den Betreiber
`automation/verlustbringer.py` arbeitet die übrigen **1'340 + 433** ab, aber der Massenlauf
wurde vom Sicherheitsfilter blockiert («Modify Shared Resources»). Zwei Wege:
1. Der Betreiber gibt den Lauf einmal frei, oder
2. der Aufseher nimmt ihn in die tägliche Liste (CAP 400/Tag, Ledger macht ihn fortsetzbar).

## Was ich NICHT übernommen habe

* **«ROAS ist eine Lügenkennzahl»** — richtig, aber gegenstandslos: wir schalten keine Anzeigen.
* **Umsatzzahlen aus Videotiteln und Anbieter-Blogs** — BEHAUPTUNG, keine davon belegt.
* **«Nur 10–20 % der Dropship-Shops sind dauerhaft profitabel»** QUELLE — eine Zahl ohne
  Methode, die man nicht gegenprüfen kann. Notiert, nicht verwendet.
* **Bundles (+20–30 % AOV)** QUELLE — plausibel und bei uns ungetestet. Aber solange 1'300
  Sitzungen im Monat zu zwei Bestellungen führen, ist der AOV nicht der Engpass. **Zuerst die
  Verlustbringer, dann der Verkehr, dann der AOV.**

## Die Lehre über das Messen selbst

Mein erster Lauf meldete **229'374 Verlustartikel — 76 % des Katalogs.** Die Zahl war falsch.
`cj_kosten_backfill.mjs` schreibt in `unitCost` ausdrücklich «Warenkosten + **VOLLE Fracht**»,
und ich habe die Fracht ein zweites Mal abgezogen. Derselbe Fehler steckte in meiner
Bestellrechnung: sie meldete «2 von 6 Bestellungen waren Verluste» — in Wahrheit **keine**.

Aufgefallen ist es nur, weil die Zahl zu gross war, um wahr zu sein. **Ein Befund, der 76 % des
Bestands trifft, ist fast immer eine Aussage über das Messgerät.** Die Regel, die daraus wird:
*bevor eine Kostenrechnung geglaubt wird, muss belegt sein, was in der Kostenzahl schon
drinsteckt* — und das steht im Skript, das sie geschrieben hat.
