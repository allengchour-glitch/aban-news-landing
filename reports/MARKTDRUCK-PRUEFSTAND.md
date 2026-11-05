# Marktdruck-Prüfstand (Papier): bringt ein «Market Pressure»-Signal wie bei ATAS nach Kosten etwas?

Stand 05.11.2026. Anlass: Der Besitzer schickte ein TikTok-Video über das «Market Pressure»-Widget der Handelsplattform ATAS («ideal für Scalper»).
Protokoll, Rechnung und Tests: `tools/trading/krypto_bot/marktdruck_pruefung.py` und `test_marktdruck_pruefung.py`. Rohergebnis: `data/krypto-marktdruck-pruefung.json`.

## Urteil (nach dem vorab festgelegten Protokoll): DURCHGEFALLEN
- **0 von 136 Messungen liegen netto über null** (mittleres Netto −12,47 bp je Trade; die Kosten betragen 12,0 bp bei BTC und 13,0 bp bei ETH).
- Es gibt einen kleinen, echten Vorhersagewert, aber er ist 25- bis 40-mal kleiner als die Kosten: **brutto etwa +0,3 bis +0,5 bp je Trade**. Selbst im Wunschfall (zwei passive Aufträge, 4 bp, kein Schlupf) ist das beste Netto −2,50 bp.
- Das Widget ist eine Anzeige. ATAS nennt keine Handelsregel und kein Ergebnis; hier wurde gemessen, ob der gezeigte Druck die nächsten 30 bis 120 Sekunden voraussagt.

## Reihenfolge (der Git-Verlauf belegt sie)
Protokoll `6b8e761` (05.11. 16:55 UTC, noch nichts gerechnet) → Umsetzung und Tests `c0a7a42` (17:03 UTC, vor dem Lauf auf echten Daten) → Lauf 17:04 UTC → dieser Bericht. Nach dem Lauf wurde nichts am Protokoll oder an der Rechnung geändert.

## Was gerechnet wurde
- **Daten:** Binance Spot, jeder einzelne Handel (aggTrades, öffentliche Tagesdateien von data.binance.vision), BTCUSDT und ETHUSDT, 14 volle UTC-Tage vom 22.10. bis 04.11.2026 (BTC 11,9 Mio. Handel, ETH 8,0 Mio.; 284 MB). Hälfte 1 = 22.–28.10., Hälfte 2 = 29.10.–04.11.
  Plausibilität: Käufer-Anteil 54,6 % (BTC) und 48,8 % (ETH) der Handel, BTC-Kurs 75 736 bis 84 377, ETH-Kurs 2 175 bis 2 482, kein Tag unter der Mindestzahl.
- **Druck nach ATAS** (help.atas.net, «Market Pressure»): Summe aus Gewicht × 0,5^(Zeit seit dem Handel ÷ Halbwertszeit), getrennt für aggressive Käufer und Verkäufer; Modus VP = Gewicht ist die Menge, Modus POT («Pace of Tape») = jeder Handel zählt 1; Halbwertszeit 10, 30, 60 s (Short, Medium, Long bei ATAS).
- **Signal:** Anteil des Käuferdrucks ≥ 0,75 oder ≥ 0,90 (Verkäuferseite spiegelbildlich), nur bei erhöhter Aktivität (mindestens das 1,5-fache des Stundenmittels), nur zu Beginn einer neuen Druckphase.
- **Handel:** Einstieg 2 Sekunden nach dem Signal, Ausstieg nach 30 oder 120 Sekunden, ein Handel zugleich; «mit» dem Druck oder «gegen» ihn. 48 Zellen, je Markt und Hälfte gemessen (192 Messungen, 136 davon mit mindestens 200 Trades).
- **Kosten** aus dem Scalping-Labor: Marktaufträge beidseitig, 5 bp Gebühr plus Schlupf je Seite (BTC 1 bp, ETH 1,5 bp).

## Ergebnis: die acht besten Zellen (nach dem schlechtesten der vier Teile; Trades · Brutto bp · Netto bp)
| Zelle | BTC Hälfte 1 | BTC Hälfte 2 | ETH Hälfte 1 | ETH Hälfte 2 |
|---|---|---|---|---|
| POT, 10 s, 0,75, 30 s, mit | 3 896 · +0,48 · −11,52 | 3 252 · +0,36 · −11,64 | 2 780 · +0,33 · −12,67 | 2 687 · +0,33 · −12,67 |
| POT, 30 s, 0,75, 30 s, mit | 1 271 · +0,59 · −11,41 | 636 · +0,20 · −11,80 | 480 · +0,84 · −12,16 | 444 · +0,25 · −12,75 |
| POT, 10 s, 0,90, 30 s, mit | 1 930 · +0,57 · −11,43 | 654 · +0,23 · −11,77 | 800 · +0,29 · −12,71 | 825 · +0,19 · −12,81 |
| VP, 30 s, 0,90, 30 s, mit | 507 · +0,47 · −11,53 | 334 · +0,40 · −11,60 | 323 · +0,18 · −12,82 | 397 · +0,29 · −12,71 |
| POT, 10 s, 0,75, 120 s, mit | 2 263 · +0,59 · −11,41 | 1 986 · +0,36 · −11,64 | 1 694 · +0,71 · −12,29 | 1 678 · +0,15 · −12,85 |
| VP, 10 s, 0,90, 30 s, mit | 2 359 · +0,35 · −11,65 | 2 003 · +0,25 · −11,75 | 1 896 · +0,17 · −12,83 | 1 882 · +0,11 · −12,89 |
| POT, 10 s, 0,90, 120 s, mit | 1 400 · +0,77 · −11,23 | 562 · +0,33 · −11,67 | 641 · +0,70 · −12,30 | 645 · +0,09 · −12,91 |
| VP, 60 s, 0,75, 120 s, gegen | 553 · −0,32 · −12,32 | 446 · −0,40 · −12,40 | 422 · +0,04 · −12,96 | 444 · +1,27 · −11,73 |

## Einordnung
- **«Signal vorhanden, aber unter den Kosten»** (vorab definiert als Brutto über 0 und t ≥ 3 in allen vier Teilen) trifft auf genau eine Zelle zu: POT, 10 s Halbwertszeit, Schwelle 0,75, 30 s halten, mit dem Druck. Brutto +0,48 und +0,36 bp (BTC), +0,33 und +0,34 bp (ETH), t-Werte 3,5 bis 8,8, 2 687 bis 3 896 Trades je Teil.
- **Muster:** Der Handelsdruck setzt sich in den nächsten Sekunden ein winziges Stück fort. Gezählte Handel (POT) wirken stärker als die Menge (VP): POT «mit» im Mittel BTC +0,49 bp (alle 16 Messungen positiv) und ETH +0,45 bp (alle 12 positiv); VP «mit» BTC +0,35 bp, ETH −0,02 bp (12 von 20 positiv). Bestes Einzelbrutto +1,50 bp (ETH, POT, 30 s, 0,75, 120 s, Hälfte 1).
- **Was das heisst:** Ein solches Signal wäre erst handelbar, wenn ein Hin- und Rückweg weniger als rund 0,5 bp kostet. Mit Marktaufträgen sind es 12 bis 13 bp. Eine Gebührenrückvergütung für passive Aufträge gibt es in der Regel nur in Marktmacher-Programmen (nicht geprüft), und passive Aufträge werden bei einem Druck-Signal vermutlich gerade dann nicht ausgeführt, wenn der Kurs weiterläuft (Überlegung, nicht gemessen). Das ist eine Beobachtung, kein Handelsgrund.
- Passt zu den bisherigen Messungen: das Scalping-Labor (8 Bücher, alle netto im Minus bei rund 6,8 bp Kosten) und der Prüfstand vom 13.10. (alle 7 Scalping-Familien verlieren nach Kosten). Ein Anzeige-Widget ändert die Kostenrechnung nicht.

## Grenzen (offen genannt)
- 14 Tage sind eine Beobachtung, kein Beweis. Spot-Handel (nicht das Orderbuch der Perpetuals), nur ausgeführte Handel: keine Orderbuchtiefe, kein Spread. ATAS zeigt zusätzlich Tiefe, Footprint und mehr; Händler lesen Druck mit Kontext. Das wurde nicht nachgebaut und nicht widerlegt.
- Der Zerfall läuft im Sekundenraster (eine Näherung des Zerfalls im Takt der einzelnen Handel). 2 Sekunden Verzug angenommen; mit weniger Verzug wäre das Brutto vermutlich etwas grösser, wie viel, ist nicht gemessen.
- **Eigenheit des Protokolls (beim Testen entdeckt, vor dem Lauf auf echten Daten, Protokoll unverändert gelassen):** Das Stundenmittel der Aktivität ist nach der Einschwingzeit von einer Stunde erst zu 63 % eingeschwungen. In den ersten rund 6 Minuten danach (Sekunde 3 600 bis etwa 3 955 der 14 Tage) zählt gleichmässiger Handel deshalb als «Ausschlag». Das betrifft unter 0,05 % der Daten und kann das Urteil nicht kippen (der Effekt liegt bei 0,5 bp, die Kosten bei 12 bp).
- 56 der 192 Messungen haben weniger als 200 Trades (meist Schwelle 0,90 oder Halbwertszeit 60 s) und zählen für das Urteil nicht.

## Das Video
@nicholassalasn3017185 («bexka1»): 7 Follower, 56 Videos, das Video vom 05.11.2026 10:47 UTC (69 s) hatte beim Abruf 24 Aufrufe; der Text ist deutsch-maschinell und beschreibt ein echtes ATAS-Widget («Marketdruck Widget erklaert … ideal für Scalper, jetzt auf der ATAS Plattform»). Wirkung auf Gewinne wird nicht behauptet.
ATAS (QUELLE atas.net/pricing, 05.11.): Stufe START kostenlos (laut Preisseite mit Einschränkungen), PLUS 24,95 € im Monat, PRO 69,95 €, ULTRA 89,95 €, Lifetime 999 bis 1 999 €. Auf der Preisseite steht eine Nutzerstimme: «ATAS didn't make me profitable».
Wer es probieren will: nur die kostenlose Stufe, Börsenschlüssel höchstens mit Leserecht (nie mit Handels- oder Auszahlungsrecht), nichts nachzahlen.

## Nachprüfen
`python3 tools/trading/krypto_bot/test_marktdruck_pruefung.py` (66 Prüfungen mit künstlichen Daten, Mutationsprobe 31 von 32 erkannt, der eine ist gleichwertig) und `python3 tools/trading/krypto_bot/marktdruck_pruefung.py` (lädt die Tagesdateien nach `data/marktdruck-roh/`, nicht im Repo; Dauer rund 1 bis 2 Minuten).
