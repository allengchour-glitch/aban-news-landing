# Lager-Wächter: ausverkaufte Ware nach hinten, täglich (04.11.2026)

Auslöser: Besitzer 04.11. abends, «ausverkaufte lager aufpassen». Auslegung (meine, nicht bestätigt): ausverkaufte Ware soll auf den Kategorieseiten nicht vorn stehen und das Aufpassen soll von selbst laufen, nicht nur an dem Tag, an dem jemand daran denkt.

## Messung (GEMESSEN 04.11. ca. 21:50 UTC, nur lesend, Admin-API; Skript im Scratch `lager_messen.mjs`)
Ausverkauft heisst: Produkt aktiv UND `tracksInventory` UND `totalInventory <= 0` (CJ-Ware mit Bestand 0 ist nicht ausverkauft, siehe CLAUDE.md «Bestand 0 ≠ ausverkauft»).

| Sammlung | aktiv | ausverkauft | mit Bestand | Stückzahl |
|---|---|---|---|---|
| `kostueme-ch-lager` | 1 521 | 555 | 966 | 38 240 |
| `kostueme-fasnacht` | 1 538 | 577 | 956 | 38 473 |
| `spielzeug-ch-lager` | 457 | 32 | 425 | 29 848 |
| `blitzversand-schweiz` | 2 371 | 718 | 1 653 | 95 430 |
| `eu-lager-schnell` | 25 | 0 (nicht getrackt) | | |

Alle getrackten Produkte dieser Sammlungen sind Fortura-Ware (Tag `fortura`), die 718 Ausverkauften sind dieselben wie im Autonomie-Audit vom 28.10. Unter den ersten 48 aktiven Produkten stand heute in `kostueme-ch-lager` 0, in `blitzversand-schweiz` 1 Ausverkauftes: die Reihenfolge vom 03.11. hält noch. Sie veraltet aber mit jedem Verkauf und jedem Abgleich; der Fasnacht-Start am 11.11. ist der Zeitpunkt, an dem das auffallen würde.

## Was der Wächter tut
Workflow `.github/workflows/lager-waechter.yml`, einmal täglich 05:17 UTC (06:17 Schweizer Winterzeit), von Hand startbar. Er ruft das vorhandene, getestete Werkzeug `automation/verfuegbar_zuerst.mjs` auf:
1. Alle Sammlungen des Hauptmenüs (`MENUE=1`, Schwelle 0.1: umsortiert wird erst, wenn mehr als 10 % der ersten 48 aktiven Produkte ausverkauft sind).
2. Sechs Lager-/Kostüm-Sammlungen ausserhalb des Menüs (`ft-kostuem-accessoire`, `ft-kostuem-hut`, `spielzeug-ch-lager`, `blitzversand-schweiz`, `kostueme-ch-lager`, `kostueme-fasnacht`).
   **Seit 10.11.2026 elf statt sechs:** dazu `ft-kinderkostuem`, `ft-damenkostuem`, `ft-herrenkostuem`, `ft-unisexkostuem`, `ft-peruecke` und `ft-maske` (SEO-Push, `dropship/seo-push-1011/README.md`). Das ist eine Ausdehnung der Freigabe vom 04.11. («ausverkaufte lager aufpassen») auf sechs weitere Sammlungen derselben Art; Rücknahme je Sammlung wie oben, `vorher=CREATED_DESC` (gemessen 10.11.).
Umsortiert wird mit `collectionReorderProducts` (stabile Teilung: Verfügbares vorn, die bisherige Reihenfolge bleibt in beiden Gruppen). **Es wird nichts versteckt, gelöscht oder auf Entwurf gesetzt.** Jede Sammlung wird danach nachgelesen; ohne bestätigte Nachlese zählt sie als Fehler (Lauf rot).

## Freigabe (zwei Stufen)
- **Ohne** Datei `dropship/LAGER-WAECHTER-FREI.txt` im Repo liest der Lauf nur (Trockenlauf) und zeigt in der Zusammenfassung, was er ändern würde.
- **Mit** der Datei sortiert er im Zeitplan LIVE um. **Datei löschen = Stopp.** Von Hand (`workflow_dispatch`, Eingabe «schreiben») schreibt er nur mit derselben Datei.

## Protokoll und Rücknahme
Das Protokoll (`dropship/kategorien_ledger.txt` mit `vorher=`, dazu die Lauf-Ausgaben) bleibt als Artefakt `lager-waechter-protokoll` am Lauf (90 Tage), es wird nicht ins Repo geschrieben. Rücknahme je Sammlung: `HANDLES=<handle> ZURUECK=1 LIVE=1 node automation/verfuegbar_zuerst.mjs` mit dem `vorher=`-Wert aus dem Protokoll des jeweiligen Laufs (war die Sammlung vorher MANUAL, bleibt sie MANUAL; die alte Handreihenfolge wird nicht gespeichert).

## Was der Wächter NICHT löst
- Die 718 ausverkauften Fortura-Produkte bleiben ACTIVE und sind auf ihrer Produktseite weiter als «Ausverkauft» sichtbar (Entscheid ACTIVE oder DRAFT beim Besitzer, Autonomie-Audit Punkt 11). Sie stehen nur am Ende der Kategorieseiten.
- Die Ankündigungsleiste «Kostüme ab Schweizer Lager … Fasnacht ab 11.11.» verspricht keine Stückzahl; 36 % der Ware in `kostueme-ch-lager` sind aber derzeit ausverkauft. Wenn Fortura vor dem 11.11. nicht nachliefert, bleibt es so.
- Die Merchant-Center-Verfügbarkeit (Google) läuft über den Feed und wird hier nicht angefasst.

## Prüfung nach dem Einbau
Erster Lauf von Hand im Trockenlauf (workflow_dispatch ohne «schreiben»): Zusammenfassung lesen (Anzahl Sammlungen, Schwelle, Fehler), Laufzeit notieren. Erst danach die Freigabedatei legen.

## Probelauf 04.11.2026 (GEMESSEN, Actions-Lauf 41918646390)
- Modus «nur lesen (Trockenlauf)», Dauer 21:42:53 bis 21:53:54 UTC (11 Minuten, davon Menü-Teil 10:35 min, Lager-Teil 12 s).
- Menü: 742 Collections, Schwelle 0.1, vier über der Schwelle (`herren-jacken-jeans` 13 von 48, `pool-sonnenschutz-gartenmoebel` 4 von 28, `tier-toilette-hygiene` 2 von 20, `kuschel-heizdecken` 3 von 17), bei allen vier **Züge 0** (die Reihenfolge von 03./04.11. hält), 738 unter der Schwelle, zu klein 0, fehlt 0, Fehler 0.
- Lager-/Kostüm-Sammlungen: 6 Collections, alle unter der Schwelle, Fehler 0.
- **Anzeigefehler im Trockenlauf:** die Schlusszeile «ÄNDERN WÜRDE: 4» zählt die Sammlungen über der Schwelle, nicht die tatsächlichen Änderungen. Im Live-Modus überspringt das Skript Sammlungen ohne Züge (`if (!LIVE || !moves.length) continue;`, `automation/verfuegbar_zuerst.mjs` Zeile 80) und schreibt für sie nichts; «GEÄNDERT» wäre hier 0.
- Der Menü-Teil dauert wegen der Pausen zwischen den Abfragen rund 10 Minuten; der Job hat ein Zeitlimit von 150 Minuten.
- **Freigabedatei `dropship/LAGER-WAECHTER-FREI.txt` am 04.11.2026 gelegt.** Erster Lauf mit Schreibrecht: Zeitplan 05.11. 05:17 UTC; danach Zusammenfassung und Artefakt lesen (Anzahl «GEÄNDERT», Fehler, Ledger-Zeilen «vorher=»). Bis zum Fasnacht-Start (11.11.) täglich ansehen, danach wöchentlich.
